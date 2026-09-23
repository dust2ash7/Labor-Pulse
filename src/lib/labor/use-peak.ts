import { useEffect, useState } from "react";
import { resolveBreath } from "./breath";
import { POSITIONS, midWaveLine } from "./copy";
import {
  averages,
  expectedDuration,
  liveElapsed,
  peakHintRatio,
  ringScale,
  stackingWaves,
  suggestStage,
  wavePhase,
} from "./engine";
import { useLaborStore } from "./store";
import type { WavePhase } from "./types";

export function useClock(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      setNow(Date.now());
      return;
    }
    let frame = 0;
    const tick = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return now;
}

export function usePeakArchitect(now: number) {
  const waves = useLaborStore((s) => s.waves);
  const live = useLaborStore((s) => s.liveWave);
  const closing = useLaborStore((s) => s.closing);
  const session = useLaborStore((s) => s.session);
  const nextPeakHint = useLaborStore((s) => s.nextPeakHint);
  const settings = useLaborStore((s) => s.settings);
  const takeCharge = useLaborStore((s) => s.takeCharge);
  const cantBreathe = useLaborStore((s) => s.cantBreathe);
  const pinnedPosition = useLaborStore((s) => s.pinnedPosition);
  const breathOverride = useLaborStore((s) => s.breathOverride);
  const pushMode = useLaborStore((s) => s.pushMode);

  const expected = expectedDuration(waves, session.phaseResetAt);
  const elapsed = live
    ? liveElapsed(live, now)
    : closing
      ? closing.duration
      : 0;
  const ended = !live && Boolean(closing);
  const sinceEnd = closing ? now - closing.endedAt : 0;
  const phase: WavePhase = live || closing
    ? wavePhase({
        elapsed,
        expected,
        ended,
        sinceEnd,
        peakHintRatio: peakHintRatio(nextPeakHint, expected),
      })
    : "idle";
  const scale = ringScale(phase, elapsed, expected);
  const stage = suggestStage(waves, session, now);
  const avgs = averages(waves, session.phaseResetAt, now);
  const stacking = stackingWaves(waves, session.phaseResetAt);
  const pattern = resolveBreath(breathOverride, stage.stage, pushMode, cantBreathe);
  const pinnedCue = POSITIONS.find((p) => p.id === pinnedPosition)?.cue ?? null;
  const line = midWaveLine({
    phase,
    role: settings.role,
    takeCharge,
    cantBreathe,
    stacking,
    pinnedCue,
    pattern,
    pushMode,
  });

  return {
    expected,
    elapsed,
    phase,
    scale,
    stage,
    avgs,
    stacking,
    pattern,
    line,
    ended,
    sinceEnd,
  };
}
