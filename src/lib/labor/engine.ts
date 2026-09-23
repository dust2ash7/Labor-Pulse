import type {
  CallReason,
  CallRule,
  CustomRule,
  Flag,
  LiveWave,
  Session,
  Settings,
  SuggestedStage,
  Wave,
  WavePhase,
} from "./types";

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

export function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function recomputeIntervals(waves: Wave[]): Wave[] {
  const sorted = [...waves].sort((a, b) => a.start - b.start);
  return sorted.map((w, i) => ({
    ...w,
    interval: i === 0 ? null : w.start - sorted[i - 1]!.start,
  }));
}

export function completedLabor(waves: Wave[], resetAt: number | null): Wave[] {
  return waves
    .filter((w) => w.end != null && w.duration != null && !w.isPractice)
    .filter((w) => (resetAt ? w.start >= resetAt : true))
    .sort((a, b) => a.start - b.start);
}

export function expectedDuration(waves: Wave[], resetAt: number | null): number {
  const last5 = completedLabor(waves, resetAt)
    .slice(-5)
    .map((w) => w.duration!)
    .filter((d) => d > 0);
  if (last5.length < 3) return 60_000;
  return median(last5) ?? 60_000;
}

export function wavePhase(opts: {
  elapsed: number;
  expected: number;
  ended: boolean;
  sinceEnd?: number;
  peakHintRatio?: number | null;
}): WavePhase {
  if (opts.ended) {
    if ((opts.sinceEnd ?? 0) < 400) return "ease";
    return "rest";
  }
  if (opts.elapsed < 0) return "idle";
  const expected = Math.max(opts.expected, 8_000);
  let riseEnd = 0.35;
  let peakEnd = 0.7;
  const hint = opts.peakHintRatio;
  if (hint != null && hint > 0.15 && hint < 0.85) {
    riseEnd = hint;
    peakEnd = Math.min(0.92, hint + 0.35);
  }
  const pct = opts.elapsed / expected;
  if (pct < riseEnd) return "rise";
  if (pct < peakEnd) return "peak";
  if (pct < 1) return "ease";
  return "peak";
}

export function ringScale(phase: WavePhase, elapsed: number, expected: number): number {
  const exp = Math.max(expected, 8_000);
  const riseEnd = 0.35 * exp;
  const peakEnd = 0.7 * exp;
  const easeEnd = exp;
  if (phase === "idle" || phase === "rest") return 0.36;
  if (phase === "rise") {
    const t = Math.min(1, Math.max(0, elapsed / riseEnd));
    return 0.36 + t * 0.64;
  }
  if (phase === "peak") return 1;
  if (phase === "ease") {
    const span = Math.max(1, easeEnd - peakEnd);
    const t = Math.min(1, Math.max(0, (elapsed - peakEnd) / span));
    return 1 - t * 0.64;
  }
  return 1;
}

export function practicePhase(elapsedInCycle: number): {
  phase: WavePhase;
  scale: number;
} {
  const t = ((elapsedInCycle % 60_000) + 60_000) % 60_000;
  if (t < 15_000) {
    return { phase: "rise", scale: 0.36 + (t / 15_000) * 0.64 };
  }
  if (t < 35_000) return { phase: "peak", scale: 1 };
  if (t < 50_000) {
    const p = (t - 35_000) / 15_000;
    return { phase: "ease", scale: 1 - p * 0.64 };
  }
  return { phase: "rest", scale: 0.36 };
}

export type StageResult = {
  stage: SuggestedStage;
  windowLabel: string;
  windowMs: number;
  medianInterval: number | null;
  medianDuration: number | null;
};

export function suggestStage(
  waves: Wave[],
  session: Session,
  now: number,
): StageResult {
  const resetAt = session.phaseResetAt;
  const labor = completedLabor(waves, resetAt);
  if (labor.length < 3) {
    return {
      stage: "need-more",
      windowLabel: "Need a few more waves.",
      windowMs: 0,
      medianInterval: null,
      medianDuration: null,
    };
  }

  const hour = labor.filter((w) => w.start >= now - 60 * 60_000);
  const half = labor.filter((w) => w.start >= now - 30 * 60_000);
  const sample = hour.length >= 3 ? hour : labor.slice(-8);
  const windowMs =
    sample.length >= 2
      ? sample[sample.length - 1]!.start - sample[0]!.start
      : 0;
  const intervals = sample
    .map((w) => w.interval)
    .filter((n): n is number => n != null && n > 0);
  const durations = sample
    .map((w) => w.duration)
    .filter((n): n is number => n != null && n > 0);
  const medI = median(intervals);
  const medD = median(durations);
  const windowLabel =
    windowMs > 0
      ? `Based on last ${Math.max(1, Math.round(windowMs / 60_000))} min`
      : "Based on recent waves";

  if (!medI || !medD) {
    return {
      stage: "need-more",
      windowLabel: "Need a few more waves.",
      windowMs,
      medianInterval: medI,
      medianDuration: medD,
    };
  }

  const iMin = medI / 60_000;
  const dSec = medD / 1000;
  const meanI = mean(intervals) ?? medI;
  const variance =
    intervals.reduce((a, b) => a + (b - meanI) ** 2, 0) / intervals.length;
  const cv = meanI > 0 ? Math.sqrt(variance) / meanI : 1;
  const regular = cv < 0.38;
  const consistent30 = (half.length >= 5 || windowMs >= 28 * 60_000) && regular;

  if (iMin <= 3.2 && dSec >= 58) {
    return {
      stage: "transition",
      windowLabel,
      windowMs,
      medianInterval: medI,
      medianDuration: medD,
    };
  }
  if (iMin <= 5.2 && dSec >= 44 && (consistent30 || iMin <= 4.2)) {
    return {
      stage: "active",
      windowLabel,
      windowMs,
      medianInterval: medI,
      medianDuration: medD,
    };
  }
  if (iMin <= 7.5 && dSec >= 28 && (regular || iMin <= 6.5)) {
    return {
      stage: "early",
      windowLabel,
      windowMs,
      medianInterval: medI,
      medianDuration: medD,
    };
  }
  return {
    stage: "irregular",
    windowLabel,
    windowMs,
    medianInterval: medI,
    medianDuration: medD,
  };
}

export function averages(waves: Wave[], resetAt: number | null, now: number) {
  const labor = completedLabor(waves, resetAt);
  const last5 = labor.slice(-5);
  const last60 = labor.filter((w) => w.start >= now - 60 * 60_000);
  const pick = (arr: Wave[]) => ({
    duration: mean(
      arr.map((w) => w.duration).filter((n): n is number => n != null),
    ),
    interval: mean(
      arr.map((w) => w.interval).filter((n): n is number => n != null && n > 0),
    ),
    count: arr.length,
  });
  return { last5: pick(last5), last60: pick(last60) };
}

export function lastHourStats(waves: Wave[], resetAt: number | null, now: number) {
  const labor = completedLabor(waves, resetAt).filter(
    (w) => w.start >= now - 60 * 60_000,
  );
  const durations = labor
    .map((w) => w.duration)
    .filter((n): n is number => n != null);
  const longest = durations.length ? Math.max(...durations) : null;
  const avg = averages(waves, resetAt, now).last60;
  return { count: labor.length, longest, avgInterval: avg.interval, avgDuration: avg.duration };
}

export function stackingWaves(waves: Wave[], resetAt: number | null): boolean {
  const last = completedLabor(waves, resetAt).at(-1);
  if (!last || last.interval == null || last.duration == null) return false;
  return last.interval < 2 * 60_000 && last.duration > 70_000;
}

export function ruleThreshold(settings: Settings): {
  intervalMax: number;
  durationMin: number;
  sustained: number;
} {
  if (settings.callRule === "custom") {
    const c: CustomRule = settings.customRule;
    return {
      intervalMax: c.intervalMin * 60_000,
      durationMin: c.durationSec * 1000,
      sustained: c.sustainedMin * 60_000,
    };
  }
  const first = settings.callRule === "5-1-1" || (settings.callRule !== "4-1-1" && settings.firstBaby);
  return {
    intervalMax: (first ? 5 : 4) * 60_000,
    durationMin: 60_000,
    sustained: 60 * 60_000,
  };
}

export function ruleMet(
  waves: Wave[],
  settings: Settings,
  session: Session,
  now: number,
): boolean {
  if (session.falseAlarm) return false;
  if (settings.inductionMode) return false;
  const labor = completedLabor(waves, session.phaseResetAt);
  if (labor.length < 4) return false;
  const { intervalMax, durationMin, sustained } = ruleThreshold(settings);
  const streak: Wave[] = [];
  for (let i = labor.length - 1; i >= 0; i--) {
    const w = labor[i]!;
    const intervalOk = w.interval == null || w.interval <= intervalMax;
    const durationOk = (w.duration ?? 0) >= durationMin;
    if (intervalOk && durationOk) streak.push(w);
    else break;
  }
  if (streak.length < 4) return false;
  const oldest = streak[streak.length - 1]!;
  const newest = streak[0]!;
  return newest.start - oldest.start >= sustained - 30_000;
}

export function hasFlag(flags: Flag[], type: Flag["type"]): boolean {
  return flags.some((f) => f.type === type);
}

export function callDecision(opts: {
  waves: Wave[];
  flags: Flag[];
  settings: Settings;
  session: Session;
  now: number;
  dismissedUntil: number | null;
}): { reason: CallReason; dismissible: boolean } | null {
  const { waves, flags, settings, session, now, dismissedUntil } = opts;
  if (session.practiceOnly && !session.laborStartedAt) return null;

  const bleeding = hasFlag(flags, "bleeding");
  const water = hasFlag(flags, "water");
  const movement = hasFlag(flags, "reduced_movement");
  const wrong = hasFlag(flags, "wrong");

  if (bleeding) return { reason: "bleeding", dismissible: false };
  if (water) return { reason: "water", dismissible: false };
  if (movement) return { reason: "movement", dismissible: false };
  if (wrong) return { reason: "wrong", dismissible: true };

  if (dismissedUntil && now < dismissedUntil) return null;
  if (session.falseAlarm) return null;

  if (settings.goAtFirstRegular) {
    const stage = suggestStage(waves, session, now).stage;
    if (stage === "early" || stage === "active" || stage === "transition") {
      return { reason: "override", dismissible: true };
    }
  }

  if (stackingWaves(waves, session.phaseResetAt)) {
    return { reason: "stacking", dismissible: true };
  }

  if (ruleMet(waves, settings, session, now)) {
    return { reason: "rule", dismissible: true };
  }

  return null;
}

export function liveElapsed(live: LiveWave | null, now: number): number {
  if (!live) return 0;
  return Math.max(0, now - live.start);
}

export function peakHintRatio(
  nextPeakHint: number | null,
  expected: number,
): number | null {
  if (nextPeakHint == null || expected <= 0) return null;
  return nextPeakHint / expected;
}

export function defaultCallRule(firstBaby: boolean): CallRule {
  return firstBaby ? "5-1-1" : "4-1-1";
}

export function cv(values: number[]): number {
  const m = mean(values);
  if (!m) return 1;
  const v = values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length;
  return Math.sqrt(v) / m;
}
