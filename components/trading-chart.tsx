"use client";

import { useEffect, useRef, useState } from "react";
import {
  ColorType,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time
} from "lightweight-charts";
import { cn } from "@/lib/utils";
import { type Candle, type IndicatorSeries, type Timeframe } from "@/lib/types";

function toChartTime(time: string) {
  return Math.floor(new Date(time).getTime() / 1000) as Time;
}

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  "5m": 5 * 60,
  "15m": 15 * 60,
  "30m": 30 * 60,
  "1h": 60 * 60,
  "4h": 4 * 60 * 60,
  D: 24 * 60 * 60,
  W: 7 * 24 * 60 * 60,
  M: 30 * 24 * 60 * 60
};

type LiveStatus = "connecting" | "live" | "fallback" | "off";

interface LiveConfigResponse {
  enabled: boolean;
  reason?: string;
  symbol?: string;
  websocketUrl?: string;
}

interface TwelveDataPriceMessage {
  event?: string;
  price?: number | string;
  symbol?: string;
  timestamp?: number | string;
}

function bucketStart(timestampMs: number, timeframe: Timeframe) {
  const date = new Date(timestampMs);

  if (timeframe === "M") {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0);
  }

  if (timeframe === "W") {
    const day = date.getUTCDay() || 7;
    const monday = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day + 1, 0, 0, 0, 0);
    return monday;
  }

  const seconds = TIMEFRAME_SECONDS[timeframe];
  return Math.floor(timestampMs / 1000 / seconds) * seconds * 1000;
}

function parseLiveTick(raw: string): { price: number; timestampMs: number } | null {
  try {
    const message = JSON.parse(raw) as TwelveDataPriceMessage;
    const price = Number(message.price);

    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    const timestamp = Number(message.timestamp);
    const timestampMs = Number.isFinite(timestamp) && timestamp > 0
      ? (timestamp > 10_000_000_000 ? timestamp : timestamp * 1000)
      : Date.now();

    return { price, timestampMs };
  } catch {
    return null;
  }
}

export function TradingChart({
  candles,
  indicatorSeries,
  symbol = "XAUUSD",
  timeframe
}: {
  candles: Candle[];
  indicatorSeries: IndicatorSeries;
  symbol?: string;
  timeframe: Timeframe;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const latestCandleRef = useRef<Candle | null>(candles.at(-1) ?? null);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("off");
  const [liveMessage, setLiveMessage] = useState("REST refresh");

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 470,
      layout: {
        background: { type: ColorType.Solid, color: "#06111f" },
        textColor: "#a5b4c8"
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.075)" },
        horzLines: { color: "rgba(148, 163, 184, 0.075)" }
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "rgba(34, 211, 238, 0.28)",
          labelBackgroundColor: "#0f172a"
        },
        horzLine: {
          color: "rgba(34, 211, 238, 0.28)",
          labelBackgroundColor: "#0f172a"
        }
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.16)",
        scaleMargins: {
          top: 0.08,
          bottom: 0.24
        }
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.16)",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        rightOffset: 4
      }
    });

    chartRef.current = chart;
    candleSeriesRef.current = chart.addCandlestickSeries({
      upColor: "#15d39a",
      downColor: "#ff4d63",
      borderUpColor: "#34d399",
      borderDownColor: "#fb7185",
      wickUpColor: "#6ee7b7",
      wickDownColor: "#fda4af"
    });

    volumeSeriesRef.current = chart.addHistogramSeries({
      color: "rgba(34, 211, 238, 0.28)",
      priceFormat: {
        type: "volume"
      },
      priceScaleId: ""
    });

    volumeSeriesRef.current.priceScale().applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0
      }
    });

    ema50SeriesRef.current = chart.addLineSeries({
      color: "#f8c14a",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });

    ema200SeriesRef.current = chart.addLineSeries({
      color: "#22d3ee",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false
    });

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        chart.applyOptions({
          width: entry.contentRect.width,
          height: Math.max(360, entry.contentRect.height)
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ema50SeriesRef.current = null;
      ema200SeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const candleData: CandlestickData[] = candles.map((candle) => ({
      time: toChartTime(candle.time),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close
    }));

    const volumeData: HistogramData[] = candles.map((candle) => ({
      time: toChartTime(candle.time),
      value: candle.volume,
      color: candle.close >= candle.open ? "rgba(52, 211, 153, 0.22)" : "rgba(251, 113, 133, 0.20)"
    }));

    const ema50Data: LineData[] = indicatorSeries.ema50.map((point) => ({
      time: toChartTime(point.time),
      value: point.value
    }));

    const ema200Data: LineData[] = indicatorSeries.ema200.map((point) => ({
      time: toChartTime(point.time),
      value: point.value
    }));

    candleSeriesRef.current?.setData(candleData);
    volumeSeriesRef.current?.setData(volumeData);
    ema50SeriesRef.current?.setData(ema50Data);
    ema200SeriesRef.current?.setData(ema200Data);
    latestCandleRef.current = candles.at(-1) ?? null;
    chartRef.current?.timeScale().scrollToRealTime();
  }, [candles, indicatorSeries]);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectAttempt = 0;

    async function connect() {
      setLiveStatus("connecting");
      setLiveMessage("Connecting live ticks");

      try {
        const response = await fetch(`/api/market-data/live-config?symbol=${encodeURIComponent(symbol)}`, {
          cache: "no-store"
        });
        const config = (await response.json()) as LiveConfigResponse;

        if (cancelled) {
          return;
        }

        if (!config.enabled || !config.websocketUrl || !config.symbol) {
          setLiveStatus("fallback");
          setLiveMessage(config.reason ?? "WebSocket unavailable");
          return;
        }

        socket = new WebSocket(config.websocketUrl);

        socket.addEventListener("open", () => {
          reconnectAttempt = 0;
          setLiveStatus("live");
          setLiveMessage("Streaming ticks");
          socket?.send(JSON.stringify({
            action: "subscribe",
            params: {
              symbols: config.symbol
            }
          }));

          heartbeatTimer = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ action: "heartbeat" }));
            }
          }, 15_000);
        });

        socket.addEventListener("message", (event) => {
          const tick = typeof event.data === "string" ? parseLiveTick(event.data) : null;

          if (!tick || !latestCandleRef.current || !candleSeriesRef.current) {
            return;
          }

          const currentBucket = bucketStart(tick.timestampMs, timeframe);
          const latestBucket = bucketStart(new Date(latestCandleRef.current.time).getTime(), timeframe);
          const currentTime = new Date(currentBucket).toISOString();
          const latest = latestCandleRef.current;
          const nextCandle: Candle =
            currentBucket > latestBucket
              ? {
                  time: currentTime,
                  open: tick.price,
                  high: tick.price,
                  low: tick.price,
                  close: tick.price,
                  volume: 0
                }
              : {
                  ...latest,
                  high: Math.max(latest.high, tick.price),
                  low: Math.min(latest.low, tick.price),
                  close: tick.price
                };

          latestCandleRef.current = nextCandle;
          candleSeriesRef.current.update({
            time: toChartTime(nextCandle.time),
            open: nextCandle.open,
            high: nextCandle.high,
            low: nextCandle.low,
            close: nextCandle.close
          });
        });

        socket.addEventListener("error", () => {
          setLiveStatus("fallback");
          setLiveMessage("Live feed error");
        });

        socket.addEventListener("close", () => {
          if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
          }

          if (cancelled) {
            return;
          }

          setLiveStatus("fallback");
          setLiveMessage("Live feed paused");
          reconnectAttempt += 1;
          reconnectTimer = setTimeout(connect, Math.max(60_000, Math.min(180_000, 30_000 * reconnectAttempt)));
        });
      } catch {
        if (!cancelled) {
          setLiveStatus("fallback");
          setLiveMessage("REST refresh fallback");
        }
      }
    }

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      socket?.close();
    };
  }, [symbol, timeframe]);

  const statusClass =
    liveStatus === "live"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : liveStatus === "connecting"
        ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-200"
        : "border-gold-400/25 bg-gold-400/10 text-gold-200";

  return (
    <div className="relative">
      <div ref={containerRef} className="chart-surface h-[430px] w-full overflow-hidden rounded-xl lg:h-[470px] 2xl:h-[510px]" />
      <div className={cn("pointer-events-none absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-panel backdrop-blur", statusClass)}>
        <span className={cn("h-2 w-2 rounded-full", liveStatus === "live" ? "animate-pulse bg-emerald-300" : liveStatus === "connecting" ? "animate-pulse bg-cyan-300" : "bg-gold-300")} />
        {liveStatus === "live" ? "Live candle" : liveMessage}
      </div>
    </div>
  );
}
