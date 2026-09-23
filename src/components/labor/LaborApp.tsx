import { useEffect, useState } from "react";
import { ClipboardList, Settings as SettingsIcon } from "lucide-react";
import { acquireWakeLock, installWakeLockListeners, releaseWakeLock } from "@/lib/labor/keep-awake";
import { useLaborStore } from "@/lib/labor/store";
import type { TabId } from "@/lib/labor/types";
import { useClock } from "@/lib/labor/use-peak";
import { cn } from "@/lib/utils";
import { ActiveWave } from "./ActiveWave";
import { BagsScreen } from "./BagsScreen";
import { BreathScreen } from "./BreathScreen";
import { CoachScreen } from "./CoachScreen";
import { FirstLaunch } from "./FirstLaunch";
import { HomeScreen } from "./HomeScreen";
import { LogScreen } from "./LogScreen";
import { NowScreen } from "./NowScreen";
import { PositionsScreen } from "./PositionsScreen";
import {
  CallNowModal,
  FlagSheet,
  LeavingSheet,
  NurseSheet,
  StageSheet,
  WaveEditSheet,
} from "./Overlays";
import { PhoneFrame } from "./primitives";
import { SettingsScreen } from "./SettingsScreen";

const TABS: { id: TabId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "breath", label: "Breath" },
  { id: "now", label: "Time" },
  { id: "history", label: "History" },
];

export function LaborApp() {
  const [ready, setReady] = useState(false);
  const onboarded = useLaborStore((s) => s.onboarded);
  const live = useLaborStore((s) => s.liveWave);
  const closing = useLaborStore((s) => s.closing);
  const tab = useLaborStore((s) => s.tab);
  const sheet = useLaborStore((s) => s.sheet);
  const setTab = useLaborStore((s) => s.setTab);
  const setSheet = useLaborStore((s) => s.setSheet);
  const settings = useLaborStore((s) => s.settings);
  const practiceBreathAt = useLaborStore((s) => s.practiceBreathAt);
  const now = useClock(Boolean(live || closing || practiceBreathAt || tab === "breath"));
  const waveLive = Boolean(live) || Boolean(closing);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      const s = useLaborStore.getState();
      if (!s.liveWave && !s.closing) s.setTab("home");
      setReady(true);
    };
    const unsub = useLaborStore.persist.onFinishHydration(finish);
    void Promise.resolve(useLaborStore.persist.rehydrate()).then(finish, finish);
    if (useLaborStore.persist.hasHydrated()) finish();
    const t = window.setTimeout(finish, 200);
    return () => {
      cancelled = true;
      unsub();
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.reduceMotion = settings.reduceMotion ? "on" : "off";
    document.documentElement.dataset.giant = settings.giantType ? "on" : "off";
    document.documentElement.dataset.motion = settings.reduceMotion ? "off" : "on";
  }, [settings.reduceMotion, settings.giantType]);

  useEffect(() => {
    const stop = installWakeLockListeners();
    return stop;
  }, []);

  useEffect(() => {
    if (live) void acquireWakeLock();
    else void releaseWakeLock();
  }, [live]);

  if (!ready) {
    return (
      <PhoneFrame>
        <div className="flex min-h-dvh flex-col justify-end px-6 pb-16">
          <p className="text-[13px] uppercase tracking-[0.18em] text-action">Labor Pulse</p>
          <p className="mt-3 text-[28px] font-semibold tracking-tight">Raven Flock</p>
          <p className="mt-2 text-[15px] text-muted">Consider the ravens.</p>
        </div>
      </PhoneFrame>
    );
  }

  if (!onboarded) {
    return (
      <PhoneFrame>
        <FirstLaunch />
      </PhoneFrame>
    );
  }

  const goHome = () => {
    setSheet(null);
    setTab("home");
  };

  return (
    <PhoneFrame>
      {waveLive ? (
        <ActiveWave now={now} />
      ) : (
        <>
          <header className="safe-t safe-x flex shrink-0 items-center justify-between pb-3">
            {tab === "home" && sheet !== "settings" ? (
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-action">
                  Labor Pulse
                </p>
                <p className="text-[15px] text-muted">Not a medical device</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={goHome}
                className="min-h-11 rounded-full bg-surface px-4 text-[16px] font-semibold"
              >
                Home
              </button>
            )}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setTab("history")}
                className="flex size-11 items-center justify-center rounded-full bg-surface"
                aria-label="History"
              >
                <ClipboardList className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => setSheet(sheet === "settings" ? null : "settings")}
                className="flex size-11 items-center justify-center rounded-full bg-surface"
                aria-label="Settings"
              >
                <SettingsIcon className="size-5" />
              </button>
            </div>
          </header>

          {sheet === "settings" ? (
            <SettingsScreen />
          ) : tab === "home" ? (
            <HomeScreen />
          ) : tab === "history" ? (
            <LogScreen />
          ) : tab === "now" ? (
            <NowScreen now={now} />
          ) : tab === "breath" ? (
            <BreathScreen now={now} />
          ) : tab === "positions" ? (
            <PositionsScreen />
          ) : tab === "coach" ? (
            <CoachScreen now={now} />
          ) : (
            <BagsScreen />
          )}

          {sheet === "settings" ? null : (
            <nav className="home-pad safe-x grid shrink-0 grid-cols-4 gap-1 bg-bg pt-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "min-h-12 rounded-xl text-[15px] font-medium",
                    tab === t.id ? "bg-surface text-fg" : "text-muted",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          )}
        </>
      )}

      <StageSheet now={now} />
      <FlagSheet />
      <NurseSheet now={now} />
      <WaveEditSheet />
      <LeavingSheet />
      <CallNowModal />
    </PhoneFrame>
  );
}
