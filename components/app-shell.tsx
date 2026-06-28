"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  BellRing,
  BrainCircuit,
  CalendarClock,
  ClipboardList,
  Clock3,
  Crown,
  Database,
  FlaskConical,
  Gauge,
  Home,
  LineChart,
  Moon,
  Newspaper,
  PlugZap,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  User
} from "lucide-react";
import { DailyAutoRefresh } from "@/components/daily-auto-refresh";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/signals", label: "Signals", icon: Activity },
  { href: "/sessions", label: "Session", icon: CalendarClock },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/backtest", label: "Backtest", icon: LineChart },
  { href: "/analytics", label: "Analytics", icon: Gauge },
  { href: "/journal", label: "Trade Journal", icon: ClipboardList },
  { href: "/ai-analysis", label: "AI Analysis Center", icon: BrainCircuit },
  { href: "/risk-management", label: "Risk Management", icon: ShieldCheck },
  { href: "/alerts", label: "Alert Center", icon: BellRing },
  { href: "/strategy-lab", label: "Strategy Lab", icon: FlaskConical },
  { href: "/ai-coach", label: "AI Coach", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [clock, setClock] = useState("");
  const [twelveDataConfigured, setTwelveDataConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const updateClock = () => {
      setClock(new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
    };

    updateClock();
    const id = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProviderStatus() {
      try {
        const response = await fetch("/api/settings/status", {
          cache: "no-store",
          signal: controller.signal
        });
        const status = (await response.json()) as { twelveDataConfigured?: boolean };
        setTwelveDataConfigured(Boolean(status.twelveDataConfigured));
      } catch {
        if (!controller.signal.aborted) {
          setTwelveDataConfigured(false);
        }
      }
    }

    loadProviderStatus();
    return () => controller.abort();
  }, []);

  const providerLabel =
    twelveDataConfigured === null ? "Checking data" : twelveDataConfigured ? "Twelve Data" : "Mock-ready";

  return (
    <div className="min-h-screen overflow-x-hidden lg:grid lg:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sidebar-shell hidden min-h-screen px-3 py-5 lg:flex lg:flex-col xl:px-4">
        <div className="mb-7 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gold-400/30 bg-gradient-to-br from-gold-400/20 to-cyan-300/10 text-gold-400 shadow-[0_0_34px_rgba(248,193,74,0.14)]">
              <BarChart3 size={25} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold leading-5 text-white">XAUUSD</p>
              <p className="mt-1 text-xs font-semibold text-gold-400">Signal Assistant</p>
            </div>
          </div>
          <Link
            href="/news"
            aria-label="Forex Factory news alerts"
            title="Forex Factory news alerts"
            className="icon-button relative shrink-0 text-slate-200"
          >
            <BellRing size={17} aria-hidden="true" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-ink-950 bg-rose-400" />
          </Link>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
                  isActive
                    ? "bg-gradient-to-r from-violet-500 to-cyan-600 text-white shadow-[0_14px_34px_rgba(37,99,235,0.24)]"
                    : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition",
                    isActive ? "bg-white/15 text-white" : "text-slate-400 group-hover:bg-white/[0.06] group-hover:text-cyan-200"
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-7 space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <ShieldAlert size={15} className="text-gold-400" aria-hidden="true" />
              Analysis Mode
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-400">
              This app does not execute live trades or connect to broker order flow.
            </p>
          </div>

          <div className="rounded-xl border border-gold-400/30 bg-gradient-to-br from-gold-400/15 to-cyan-400/10 p-4 shadow-[0_18px_46px_rgba(0,0,0,0.24)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-gold-300">
              <Crown size={17} aria-hidden="true" />
              Premium Plan
            </div>
            <p className="mt-3 text-xs font-medium text-emerald-300">Lifetime Access</p>
            <button
              type="button"
              className="mt-3 h-9 w-full rounded-lg border border-gold-400/30 bg-white/[0.035] text-xs font-semibold text-slate-100 transition hover:border-gold-300/50 hover:bg-gold-400/10"
            >
              Manage Plan
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/12 text-emerald-300">
                <PlugZap size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Data Source</p>
                <p className="mt-1 text-sm font-semibold text-white">{providerLabel}</p>
                <p className="mt-1 text-xs font-medium text-emerald-300">
                  {twelveDataConfigured ? "Connected" : "Fallback ready"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-auto pt-8 text-xs leading-6 text-slate-600">
          (c) 2026 XAUUSD Assistant
          <br />
          Institutional signal workspace
        </p>
      </aside>

      <div className="min-w-0">
        <header className="app-chrome sticky top-0 z-30 border-b border-white/10 px-4 py-3 backdrop-blur-xl md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
                <BarChart3 size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">XAUUSD Signal Assistant</p>
                <p className="text-xs text-slate-400">Gold analysis</p>
              </div>
              <Link
                href="/news"
                aria-label="Forex Factory news alerts"
                title="Forex Factory news alerts"
                className="icon-button relative"
              >
                <BellRing size={16} aria-hidden="true" />
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-ink-950 bg-rose-400" />
              </Link>
            </div>

            <div className="w-full min-w-0 max-w-full overflow-hidden [contain:paint] lg:hidden">
              <nav className="flex gap-1 overflow-x-auto [contain:paint] scrollbar-thin">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex h-9 min-w-[112px] items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2 text-xs font-medium transition sm:min-w-32 sm:px-3",
                        isActive
                          ? "bg-gradient-to-r from-violet-500 to-cyan-600 text-white"
                          : "bg-white/[0.04] text-slate-300 hover:text-white"
                      )}
                    >
                      <Icon size={15} aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="hidden min-w-0 lg:block">
              <p className="text-sm font-semibold text-white">XAUUSD Signal Assistant</p>
              <p className="text-xs text-slate-400">Rule-based Gold analysis. No live order execution.</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <DailyAutoRefresh />
              <span className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 sm:flex">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                <Database size={14} className="text-cyan-300" aria-hidden="true" />
                {providerLabel}
              </span>
              <span className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 sm:flex">
                <Clock3 size={14} className="text-slate-500" aria-hidden="true" />
                {clock || "--:--"}
              </span>
              <div className="hidden items-center rounded-full border border-white/10 bg-white/[0.045] p-1 xl:flex">
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-400/12 text-gold-300" title="Light mode preview">
                  <Sun size={15} aria-hidden="true" />
                </button>
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:text-white" title="Night mode">
                  <Moon size={15} aria-hidden="true" />
                </button>
              </div>
              <Link href="/news" className="icon-button relative hidden sm:inline-flex" title="Market alerts" aria-label="Market alerts">
                <BellRing size={16} aria-hidden="true" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  3
                </span>
              </Link>
              <div className="hidden h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] pl-2 pr-3 xl:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-100">
                  <User size={15} aria-hidden="true" />
                </span>
                <span className="relative flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 md:px-6 lg:px-7 xl:px-8">
          <div className="mx-auto max-w-[1720px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
