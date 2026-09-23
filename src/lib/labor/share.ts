import { FLAG_LABEL, STAGE_BLURB } from "./copy";
import {
  averages,
  hasFlag,
  lastHourStats,
  suggestStage,
} from "./engine";
import { formatClock, formatDayTime, formatDuration, formatInterval } from "./format";
import type { Flag, Session, Settings, Wave } from "./types";

export function triageScript(
  settings: Settings,
  flags: Flag[],
  waves: Wave[],
  session: Session,
  now = Date.now(),
): string {
  const who = settings.birthingName.trim() || "We're in labor";
  const weeks = settings.weeks ? `${settings.weeks} weeks` : "weeks not set";
  const baby = settings.firstBaby ? "first baby" : "not first baby";
  const water = hasFlag(flags, "water") ? "water broke" : "water intact";
  const blood = hasFlag(flags, "bleeding")
    ? "bright red bleeding"
    : hasFlag(flags, "mucus")
      ? "mucus/bloody show"
      : "no bright bleeding";
  const move = hasFlag(flags, "reduced_movement")
    ? "reduced movement"
    : "baby moving";
  const stats = lastHourStats(waves, session.phaseResetAt, now);
  const line3 = `Last hour: waves every ${formatInterval(stats.avgInterval)}, lasting ${formatDuration(stats.avgDuration)}.`;
  return `${who}, ${weeks}, ${baby}. ${water}; ${blood}; ${move}. ${line3}`;
}

export function nurseCardText(
  settings: Settings,
  flags: Flag[],
  waves: Wave[],
  session: Session,
  now = Date.now(),
): string {
  const started = session.laborStartedAt
    ? formatDayTime(session.laborStartedAt)
    : waves[0]
      ? formatDayTime(waves[0].start)
      : "not started";
  const stats = lastHourStats(waves, session.phaseResetAt, now);
  const avg = averages(waves, session.phaseResetAt, now);
  const stage = suggestStage(waves, session, now);
  const flagLine =
    flags.length === 0
      ? "none"
      : flags.map((f) => `${FLAG_LABEL[f.type]} ${formatClock(f.at)}`).join("; ");
  const left = session.leftHomeAt ? formatDayTime(session.leftHomeAt) : "still home";
  const birth = session.birthAt ? formatDayTime(session.birthAt) : null;
  const lines = [
    "Labor Pulse — nurse card",
    `Started at: ${started}`,
    `Last 60 min: avg interval ${formatInterval(stats.avgInterval)}, avg duration ${formatDuration(stats.avgDuration)} (${stats.count} waves)`,
    `Last 5: interval ${formatInterval(avg.last5.interval)}, duration ${formatDuration(avg.last5.duration)}`,
    `Longest wave: ${formatDuration(stats.longest)}`,
    `Suggested pattern: ${STAGE_BLURB[stage.stage].name} (${stage.windowLabel})`,
    `Flags: ${flagLine}`,
    `Left home: ${left}`,
  ];
  if (settings.hospitalName) lines.push(`Going to: ${settings.hospitalName}`);
  if (settings.hospitalAddress) lines.push(settings.hospitalAddress);
  if (settings.parkingNote) lines.push(`Parking: ${settings.parkingNote}`);
  if (settings.vbac) lines.push("VBAC / special instructions noted in app.");
  if (settings.inductionMode) lines.push("Induction — follow unit instructions.");
  if (birth) lines.push(`Birth (keepsake): ${birth}`);
  lines.push("Timing is a pattern guess. Not a medical device.");
  return lines.join("\n");
}

export function leavingNote(
  settings: Settings,
  bags: { label: string; done: boolean }[],
  session: Session,
): string {
  const unchecked = bags.filter((b) => !b.done).map((b) => b.label);
  const lines = [
    `Leaving now: ${session.leftHomeAt ? formatDayTime(session.leftHomeAt) : formatDayTime(Date.now())}`,
    settings.hospitalName ? `To: ${settings.hospitalName}` : "To: hospital",
    settings.hospitalAddress || "",
    settings.parkingNote ? `Parking: ${settings.parkingNote}` : "",
    unchecked.length
      ? `Still to grab: ${unchecked.join(", ")}`
      : "Bags look complete.",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function shareOrCopy(title: string, text: string): Promise<"shared" | "copied"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "shared";
    }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
