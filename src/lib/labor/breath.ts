import type { BreathPattern, SuggestedStage } from "./types";

export function autoBreath(
  stage: SuggestedStage,
  pushMode: boolean,
  cantBreathe: boolean,
): BreathPattern {
  if (cantBreathe) return "slow-wave";
  if (pushMode) return "breath-down";
  if (stage === "transition") return "light-blow";
  if (stage === "active") return "low-and-low";
  if (stage === "early") return "counted-calm";
  return "slow-wave";
}

export function resolveBreath(
  override: BreathPattern | "auto",
  stage: SuggestedStage,
  pushMode: boolean,
  cantBreathe: boolean,
): BreathPattern {
  if (cantBreathe) return "slow-wave";
  if (override === "breath-down" && !pushMode) return autoBreath(stage, false, false);
  if (override !== "auto") return override;
  return autoBreath(stage, pushMode, cantBreathe);
}

let lastSpoken = "";
let lastAt = 0;

export function speakCue(text: string, enabled: boolean) {
  if (!enabled || !text) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const now = Date.now();
  if (text === lastSpoken && now - lastAt < 2500) return;
  lastSpoken = text;
  lastAt = now;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 0.95;
    u.volume = 0.85;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export function stopSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
