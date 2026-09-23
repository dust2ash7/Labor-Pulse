import type { HapticPreset, WavePhase } from "./types";

function isIOSWeb(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

function canVibrate(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isIOSWeb()) return false;
  return typeof navigator.vibrate === "function";
}

function buzz(pattern: number | number[], sensitive: boolean) {
  if (!canVibrate()) return;
  const scale = sensitive ? 0.6 : 1;
  if (typeof pattern === "number") {
    navigator.vibrate(Math.max(8, Math.round(pattern * scale)));
    return;
  }
  navigator.vibrate(pattern.map((n, i) => (i % 2 === 1 ? n : Math.max(8, Math.round(n * scale)))));
}

let lastPhase: WavePhase | "none" = "none";
let lastAlertAt = 0;

export function hapticStart(preset: HapticPreset, sensitive: boolean) {
  if (preset === "off" || preset === "alerts") return;
  lastPhase = "rise";
  buzz(18, sensitive);
}

export function hapticEnd(preset: HapticPreset, sensitive: boolean) {
  if (preset === "off" || preset === "alerts") return;
  lastPhase = "rest";
  buzz(12, sensitive);
}

export function hapticPhase(
  phase: WavePhase,
  preset: HapticPreset,
  sensitive: boolean,
) {
  if (preset === "off") return;
  if (phase === lastPhase) return;
  const prev = lastPhase;
  lastPhase = phase;
  if (preset === "alerts") return;
  if (phase === "peak" && (preset === "peak" || preset === "full")) {
    buzz([12, 80, 18], sensitive);
    return;
  }
  if (preset !== "full") return;
  if (phase === "rise" && prev !== "peak") buzz(16, sensitive);
  if (phase === "ease") buzz(10, sensitive);
}

export function hapticAlert(preset: HapticPreset, sensitive: boolean) {
  if (preset === "off") return;
  const now = Date.now();
  if (now - lastAlertAt < 2000) return;
  lastAlertAt = now;
  buzz([40, 160, 40, 160, 40], sensitive);
}

export function hapticSelect() {
  buzz(8, false);
}

export function resetHapticPhase() {
  lastPhase = "none";
}

export function hapticsAreVisualOnly(): boolean {
  return isIOSWeb() || !canVibrate();
}
