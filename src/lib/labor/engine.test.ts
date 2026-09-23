import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SESSION, DEFAULT_SETTINGS } from "./defaults";
import {
  callDecision,
  expectedDuration,
  recomputeIntervals,
  ruleMet,
  suggestStage,
  wavePhase,
} from "./engine";
import type { Wave } from "./types";

function w(
  start: number,
  duration: number,
  extra: Partial<Wave> = {},
): Wave {
  return {
    id: `w-${start}`,
    start,
    end: start + duration,
    duration,
    interval: null,
    intensity: null,
    note: "",
    position: null,
    breathPattern: null,
    peakOffset: null,
    isPractice: false,
    ...extra,
  };
}

describe("wavePhase", () => {
  it("splits rise peak ease and holds peak on overrun", () => {
    assert.equal(wavePhase({ elapsed: 0, expected: 100_000, ended: false }), "rise");
    assert.equal(wavePhase({ elapsed: 34_000, expected: 100_000, ended: false }), "rise");
    assert.equal(wavePhase({ elapsed: 36_000, expected: 100_000, ended: false }), "peak");
    assert.equal(wavePhase({ elapsed: 69_000, expected: 100_000, ended: false }), "peak");
    assert.equal(wavePhase({ elapsed: 80_000, expected: 100_000, ended: false }), "ease");
    assert.equal(wavePhase({ elapsed: 120_000, expected: 100_000, ended: false }), "peak");
  });

  it("uses a short ease after END", () => {
    assert.equal(
      wavePhase({ elapsed: 40_000, expected: 100_000, ended: true, sinceEnd: 200 }),
      "ease",
    );
    assert.equal(
      wavePhase({ elapsed: 40_000, expected: 100_000, ended: true, sinceEnd: 500 }),
      "rest",
    );
  });
});

describe("expectedDuration", () => {
  it("falls back to 60s until three waves exist", () => {
    const waves = recomputeIntervals([w(0, 40_000), w(300_000, 42_000)]);
    assert.equal(expectedDuration(waves, null), 60_000);
  });
});

describe("suggestStage", () => {
  it("asks for more waves when the log is short", () => {
    const r = suggestStage([w(0, 40_000)], DEFAULT_SESSION, 40_000);
    assert.equal(r.stage, "need-more");
  });

  it("labels a tight long pattern as transition-like", () => {
    const t0 = 1_000_000;
    const waves = recomputeIntervals(
      Array.from({ length: 12 }, (_, i) => w(t0 + i * 150_000, 75_000)),
    );
    const now = t0 + 12 * 150_000;
    const r = suggestStage(waves, DEFAULT_SESSION, now);
    assert.equal(r.stage, "transition");
  });
});

describe("5-1-1", () => {
  it("fires after an hour of qualifying waves", () => {
    const t0 = 5_000_000;
    const waves = recomputeIntervals(
      Array.from({ length: 16 }, (_, i) => w(t0 + i * 4.5 * 60_000, 65_000)),
    );
    const now = t0 + 15 * 4.5 * 60_000;
    assert.equal(ruleMet(waves, DEFAULT_SETTINGS, DEFAULT_SESSION, now), true);
    const decision = callDecision({
      waves,
      flags: [],
      settings: DEFAULT_SETTINGS,
      session: { ...DEFAULT_SESSION, laborStartedAt: t0 },
      now,
      dismissedUntil: null,
    });
    assert.equal(decision?.reason, "rule");
  });

  it("never trips on practice waves", () => {
    const t0 = 5_000_000;
    const waves = recomputeIntervals(
      Array.from({ length: 14 }, (_, i) =>
        w(t0 + i * 4.5 * 60_000, 65_000, { isPractice: true }),
      ),
    );
    const now = t0 + 13 * 4.5 * 60_000;
    assert.equal(ruleMet(waves, DEFAULT_SETTINGS, DEFAULT_SESSION, now), false);
  });
});
