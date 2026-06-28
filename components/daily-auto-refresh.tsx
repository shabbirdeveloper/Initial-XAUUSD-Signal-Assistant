"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { SITE_DATA_REFRESH_EVENT } from "@/lib/refresh-events";
import { cn } from "@/lib/utils";

const DAILY_REFRESH_DAY_KEY = "xauusd:lastDailyRefreshDay";
const DAILY_REFRESH_AT_KEY = "xauusd:lastDailyRefreshAt";
const DAY_MS = 24 * 60 * 60 * 1000;

function localDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function msUntilNextDailyRefresh(date: Date) {
  const next = new Date(date);
  next.setHours(24, 5, 0, 0);
  return Math.max(next.getTime() - date.getTime(), 60_000);
}

function formatRefreshTime(value: string | null) {
  if (!value) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function DailyAutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshLabel = useMemo(() => formatRefreshTime(lastRefreshAt), [lastRefreshAt]);

  const markRefreshed = useCallback((date: Date) => {
    const timestamp = date.toISOString();
    window.localStorage.setItem(DAILY_REFRESH_DAY_KEY, localDayKey(date));
    window.localStorage.setItem(DAILY_REFRESH_AT_KEY, timestamp);
    setLastRefreshAt(timestamp);
  }, []);

  const refreshSiteData = useCallback(
    (reason: "daily" | "manual") => {
      const now = new Date();
      markRefreshed(now);
      setRefreshing(true);
      window.dispatchEvent(
        new CustomEvent(SITE_DATA_REFRESH_EVENT, {
          detail: {
            at: now.toISOString(),
            reason
          }
        })
      );
      if (pathname !== "/" && pathname !== "/backtest") {
        router.refresh();
      }
      window.setTimeout(() => setRefreshing(false), 900);
    },
    [markRefreshed, pathname, router]
  );

  const checkDailyRefresh = useCallback(() => {
    const now = new Date();
    const today = localDayKey(now);
    const lastDay = window.localStorage.getItem(DAILY_REFRESH_DAY_KEY);

    if (!lastDay) {
      markRefreshed(now);
      return;
    }

    if (lastDay !== today) {
      refreshSiteData("daily");
    }
  }, [markRefreshed, refreshSiteData]);

  useEffect(() => {
    const storedAt = window.localStorage.getItem(DAILY_REFRESH_AT_KEY);
    if (storedAt) {
      setLastRefreshAt(storedAt);
    }

    checkDailyRefresh();

    const handleVisibility = () => {
      if (!document.hidden) {
        checkDailyRefresh();
      }
    };
    const handleFocus = () => checkDailyRefresh();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      checkDailyRefresh();
      intervalId = window.setInterval(checkDailyRefresh, DAY_MS);
    }, msUntilNextDailyRefresh(new Date()));

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.clearTimeout(timeoutId);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [checkDailyRefresh]);

  return (
    <button
      type="button"
      onClick={() => refreshSiteData("manual")}
      title="Refresh site data now"
      className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400 transition hover:text-slate-100"
    >
      <RefreshCw size={14} className={cn("text-cyan-300", refreshing && "animate-spin")} aria-hidden="true" />
      <span>Daily</span>
      <span className="hidden sm:inline">{refreshLabel}</span>
    </button>
  );
}
