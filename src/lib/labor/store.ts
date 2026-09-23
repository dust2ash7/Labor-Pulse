import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  BAG_REVISION,
  defaultBagSections,
  defaultBags,
  migrateBagState,
  DEFAULT_SESSION,
  DEFAULT_SETTINGS,
} from "./defaults";
import { callDecision, expectedDuration, recomputeIntervals } from "./engine";
import type {
  BagItem,
  BagListId,
  BreathPattern,
  CallReason,
  CoachPane,
  FlagType,
  LaborState,
  Settings,
  SheetId,
  TabId,
  Wave,
} from "./types";

function nid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type Actions = {
  hydrateDone: boolean;
  setHydrateDone: () => void;
  onboard: (patch: Partial<Settings> & { practiceOnly?: boolean }) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  setTab: (tab: TabId) => void;
  setSheet: (sheet: SheetId) => void;
  setCoachPane: (pane: CoachPane) => void;
  setPractice: (on: boolean) => void;
  startWave: () => void;
  endWave: () => void;
  undoEnd: () => void;
  discardLast: () => void;
  skipRest: () => void;
  setIntensity: (n: 1 | 2 | 3 | 4 | 5) => void;
  markPeak: () => void;
  setTakeCharge: (on: boolean) => void;
  setCantBreathe: (on: boolean) => void;
  pinPosition: (id: string | null) => void;
  armBreath: (on: boolean) => void;
  setBreathOverride: (p: BreathPattern | "auto") => void;
  setPushMode: (on: boolean) => void;
  startPracticeBreath: () => void;
  stopPracticeBreath: () => void;
  addFlag: (type: FlagType) => void;
  removeFlag: (id: string) => void;
  toggleBag: (id: string) => void;
  addBagItem: (list: BagListId, label: string) => void;
  editBagItem: (id: string, label: string) => void;
  removeBagItem: (id: string) => void;
  renameBagSection: (id: string, label: string) => void;
  deleteBagSection: (id: string) => void;
  addBagSection: (label: string) => void;
  moveBagSection: (id: string, dir: -1 | 1) => void;
  resetBags: () => void;
  setBagsByDoor: () => void;
  setBagsInCar: () => void;
  leavingNow: () => void;
  arrived: () => void;
  falseAlarm: () => void;
  evaluateCall: () => void;
  openCall: (reason: CallReason) => void;
  dismissCall: () => void;
  closeCall: () => void;
  editWave: (id: string, patch: Partial<Wave>) => void;
  deleteWave: (id: string) => void;
  addManualWave: (start: number, durationMs: number, practice: boolean) => void;
  setEditingWave: (id: string | null) => void;
  deleteLog: () => void;
  setBirthAt: (ts: number | null) => void;
  ackBattery: () => void;
};

export type LaborStore = LaborState & Actions;

const persistStorage = createJSONStorage(() => localStorage);

export const useLaborStore = create<LaborStore>()(
  persist(
    (set, get) => ({
      hydrateDone: false,
      onboarded: false,
      waves: [],
      flags: [],
      bags: defaultBags(),
      bagSections: defaultBagSections(),
      bagRevision: BAG_REVISION,
      settings: DEFAULT_SETTINGS,
      session: DEFAULT_SESSION,
      liveWave: null,
      closing: null,
      nextPeakHint: null,
      tab: "home",
      sheet: null,
      coachPane: "say",
      editingWaveId: null,
      breathArmed: false,
      breathOverride: "auto",
      pushMode: false,
      takeCharge: false,
      cantBreathe: false,
      pinnedPosition: null,
      lastPositionAt: null,
      practiceBreathAt: null,
      call: { open: false, reason: null, dismissedUntil: null },
      intensityPrompt: false,

      setHydrateDone: () => set({ hydrateDone: true }),

      onboard: (patch) => {
        const { practiceOnly, ...rest } = patch;
        set({
          onboarded: true,
          tab: "home",
          sheet: null,
          settings: { ...get().settings, ...rest },
          session: {
            ...get().session,
            practiceOnly: Boolean(practiceOnly),
          },
        });
      },

      patchSettings: (patch) => {
        const settings = { ...get().settings, ...patch };
        if (patch.firstBaby != null && settings.callRule !== "custom") {
          settings.callRule = patch.firstBaby ? "5-1-1" : "4-1-1";
        }
        set({ settings });
      },

      setTab: (tab) =>
        set({
          tab,
          sheet: null,
          practiceBreathAt: tab === "breath" ? get().practiceBreathAt : null,
        }),
      setSheet: (sheet) => set({ sheet }),
      setCoachPane: (coachPane) => set({ coachPane }),

      setPractice: (on) =>
        set({
          session: { ...get().session, practiceOnly: on },
        }),

      startWave: () => {
        const s = get();
        if (s.liveWave) return;
        const now = Date.now();
        const practice = s.session.practiceOnly;
        let session = s.session;
        if (!practice && !session.laborStartedAt) {
          session = {
            ...session,
            laborStartedAt: now,
            practiceOnly: false,
            falseAlarm: false,
          };
        }
        set({
          liveWave: { id: nid(), start: now, peakMarkedAt: null },
          closing: null,
          intensityPrompt: false,
          takeCharge: false,
          cantBreathe: false,
          practiceBreathAt: null,
          session,
          sheet: null,
        });
      },

      endWave: () => {
        const s = get();
        const live = s.liveWave;
        if (!live) return;
        const now = Date.now();
        const duration = Math.max(0, now - live.start);
        const expected = expectedDuration(s.waves, s.session.phaseResetAt);
        const wave: Wave = {
          id: live.id,
          start: live.start,
          end: now,
          duration,
          interval: null,
          intensity: null,
          note: "",
          position: s.pinnedPosition,
          breathPattern: s.breathArmed
            ? s.breathOverride === "auto"
              ? null
              : s.breathOverride
            : null,
          peakOffset: live.peakMarkedAt ? live.peakMarkedAt - live.start : null,
          isPractice: s.session.practiceOnly,
        };
        const waves = recomputeIntervals([...s.waves, wave]);
        set({
          waves,
          liveWave: null,
          closing: {
            waveId: wave.id,
            endedAt: now,
            duration,
            early: duration < expected * 0.7,
          },
          intensityPrompt: duration >= 12_000,
          nextPeakHint: live.peakMarkedAt ? live.peakMarkedAt - live.start : null,
          takeCharge: false,
        });
        get().evaluateCall();
      },

      undoEnd: () => {
        const s = get();
        if (!s.closing) return;
        const wave = s.waves.find((w) => w.id === s.closing!.waveId);
        if (!wave) return;
        set({
          waves: recomputeIntervals(s.waves.filter((w) => w.id !== wave.id)),
          liveWave: {
            id: wave.id,
            start: wave.start,
            peakMarkedAt: wave.peakOffset ? wave.start + wave.peakOffset : null,
          },
          closing: null,
          intensityPrompt: false,
        });
      },

      discardLast: () => {
        const s = get();
        if (!s.closing) return;
        set({
          waves: recomputeIntervals(s.waves.filter((w) => w.id !== s.closing!.waveId)),
          closing: null,
          intensityPrompt: false,
        });
      },

      skipRest: () => set({ closing: null, intensityPrompt: false, cantBreathe: false }),

      setIntensity: (n) => {
        const s = get();
        if (!s.closing) {
          set({ intensityPrompt: false });
          return;
        }
        set({
          waves: s.waves.map((w) =>
            w.id === s.closing!.waveId ? { ...w, intensity: n } : w,
          ),
          intensityPrompt: false,
          closing: null,
        });
      },

      markPeak: () => {
        const s = get();
        if (!s.liveWave) return;
        set({ liveWave: { ...s.liveWave, peakMarkedAt: Date.now() } });
      },

      setTakeCharge: (on) => set({ takeCharge: on }),
      setCantBreathe: (on) => set({ cantBreathe: on }),

      pinPosition: (id) =>
        set({
          pinnedPosition: id,
          lastPositionAt: id ? Date.now() : get().lastPositionAt,
        }),

      armBreath: (on) => set({ breathArmed: on }),
      setBreathOverride: (p) => set({ breathOverride: p }),
      setPushMode: (on) => set({ pushMode: on }),

      startPracticeBreath: () =>
        set({ practiceBreathAt: Date.now(), tab: "breath", breathArmed: true }),
      stopPracticeBreath: () => set({ practiceBreathAt: null }),

      addFlag: (type) => {
        set({
          flags: [...get().flags, { id: nid(), type, at: Date.now() }],
          sheet: null,
        });
        get().evaluateCall();
      },

      removeFlag: (id) => set({ flags: get().flags.filter((f) => f.id !== id) }),

      toggleBag: (id) =>
        set({
          bags: get().bags.map((b) => (b.id === id ? { ...b, done: !b.done } : b)),
        }),

      addBagItem: (list, label) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        const dup = get().bags.some(
          (b) => b.list === list && b.label.trim().toLowerCase() === trimmed.toLowerCase(),
        );
        if (dup) return;
        const item: BagItem = { id: nid(), list, label: trimmed, done: false };
        set({ bags: [...get().bags, item] });
      },

      editBagItem: (id, label) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        set({
          bags: get().bags.map((b) => (b.id === id ? { ...b, label: trimmed } : b)),
        });
      },

      removeBagItem: (id) => set({ bags: get().bags.filter((b) => b.id !== id) }),

      renameBagSection: (id, label) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        set({
          bagSections: get().bagSections.map((s) =>
            s.id === id ? { ...s, label: trimmed } : s,
          ),
        });
      },

      deleteBagSection: (id) =>
        set({
          bagSections: get().bagSections.filter((s) => s.id !== id),
          bags: get().bags.filter((b) => b.list !== id),
        }),

      addBagSection: (label) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        const id = `sec-${nid()}`;
        set({ bagSections: [...get().bagSections, { id, label: trimmed }] });
      },

      moveBagSection: (id, dir) => {
        const sections = [...get().bagSections];
        const i = sections.findIndex((s) => s.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= sections.length) return;
        const swap = sections[i];
        sections[i] = sections[j];
        sections[j] = swap;
        set({ bagSections: sections });
      },

      resetBags: () =>
        set({
          bags: defaultBags(),
          bagSections: defaultBagSections(),
          bagRevision: BAG_REVISION,
        }),

      setBagsByDoor: () =>
        set({ session: { ...get().session, bagsByDoor: true } }),
      setBagsInCar: () =>
        set({ session: { ...get().session, bagsByDoor: true, bagsInCar: true } }),

      leavingNow: () =>
        set({
          session: {
            ...get().session,
            leftHomeAt: Date.now(),
            bagsInCar: true,
            bagsByDoor: true,
          },
          call: { ...get().call, open: false },
          sheet: "leaving",
        }),

      arrived: () =>
        set({ session: { ...get().session, arrivedAt: Date.now() } }),

      falseAlarm: () =>
        set({
          session: {
            ...get().session,
            falseAlarm: true,
            phaseResetAt: Date.now(),
          },
          call: { open: false, reason: null, dismissedUntil: null },
          sheet: null,
        }),

      evaluateCall: () => {
        const s = get();
        if (s.liveWave) return;
        if (s.session.practiceOnly) return;
        const decision = callDecision({
          waves: s.waves,
          flags: s.flags,
          settings: s.settings,
          session: s.session,
          now: Date.now(),
          dismissedUntil: s.call.dismissedUntil,
        });
        if (!decision) return;
        if (s.call.open && s.call.reason === decision.reason) return;
        set({
          call: { ...s.call, open: true, reason: decision.reason },
        });
      },

      openCall: (reason) =>
        set({ call: { ...get().call, open: true, reason } }),

      dismissCall: () =>
        set({
          call: {
            open: false,
            reason: get().call.reason,
            dismissedUntil: Date.now() + 10 * 60_000,
          },
        }),

      closeCall: () => set({ call: { ...get().call, open: false } }),

      editWave: (id, patch) => {
        const waves = get().waves.map((w) => {
          if (w.id !== id) return w;
          const next = { ...w, ...patch };
          if (next.start && next.end) {
            next.duration = next.end - next.start;
          } else if (next.start && patch.duration != null) {
            next.end = next.start + patch.duration;
            next.duration = patch.duration;
          }
          return next;
        });
        set({ waves: recomputeIntervals(waves), sheet: null, editingWaveId: null });
      },

      deleteWave: (id) =>
        set({
          waves: recomputeIntervals(get().waves.filter((w) => w.id !== id)),
          sheet: null,
          editingWaveId: null,
        }),

      addManualWave: (start, durationMs, practice) => {
        const wave: Wave = {
          id: nid(),
          start,
          end: start + durationMs,
          duration: durationMs,
          interval: null,
          intensity: null,
          note: "",
          position: null,
          breathPattern: null,
          peakOffset: null,
          isPractice: practice,
        };
        set({ waves: recomputeIntervals([...get().waves, wave]) });
      },

      setEditingWave: (id) =>
        set({ editingWaveId: id, sheet: id ? "wave-edit" : null }),

      deleteLog: () =>
        set({
          waves: [],
          flags: [],
          liveWave: null,
          closing: null,
          nextPeakHint: null,
          session: {
            ...DEFAULT_SESSION,
            practiceOnly: get().session.practiceOnly,
          },
          call: { open: false, reason: null, dismissedUntil: null },
        }),

      setBirthAt: (ts) =>
        set({ session: { ...get().session, birthAt: ts } }),

      ackBattery: () =>
        set({ session: { ...get().session, batteryWarnedAt: Date.now() } }),
    }),
    {
      name: "labor-pulse-v1",
      storage: persistStorage,
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.liveWave && !state.closing) state.tab = "home";
        const next = migrateBagState(state.bags, state.bagSections, state.bagRevision);
        state.bags = next.bags;
        state.bagSections = next.bagSections;
        state.bagRevision = next.bagRevision;
      },
      partialize: (s) => ({
        onboarded: s.onboarded,
        waves: s.waves,
        flags: s.flags,
        bags: s.bags,
        bagSections: s.bagSections,
        bagRevision: s.bagRevision,
        settings: s.settings,
        session: s.session,
        liveWave: s.liveWave,
        nextPeakHint: s.nextPeakHint,
        breathArmed: s.breathArmed,
        breathOverride: s.breathOverride,
        pushMode: s.pushMode,
        pinnedPosition: s.pinnedPosition,
        lastPositionAt: s.lastPositionAt,
        call: {
          open: false,
          reason: null,
          dismissedUntil: s.call.dismissedUntil,
        },
      }),
    },
  ),
);
