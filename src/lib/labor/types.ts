export type Role = "birthing" | "partner" | "both";
export type CallRule = "5-1-1" | "4-1-1" | "custom";
export type HapticPreset = "off" | "peak" | "full" | "alerts";
export type BreathVoice = "off" | "soft" | "count";
export type TouchPref = "pressure" | "light" | "none";
export type TabId = "home" | "now" | "breath" | "coach" | "bags" | "history" | "positions";
export type SheetId =
  | null
  | "stage"
  | "log"
  | "settings"
  | "nurse"
  | "flags"
  | "wave-edit"
  | "contacts"
  | "leaving";
export type WavePhase = "idle" | "rise" | "peak" | "ease" | "rest";
export type SuggestedStage = "need-more" | "irregular" | "early" | "active" | "transition";
export type BreathPattern =
  | "slow-wave"
  | "counted-calm"
  | "low-and-low"
  | "light-blow"
  | "breath-down"
  | "rest-between";
export type CoachPane = "say" | "hands" | "positions";
export type BagListId = string;
export type BagSection = {
  id: string;
  label: string;
};
export type FlagType =
  | "water"
  | "mucus"
  | "bleeding"
  | "reduced_movement"
  | "vomiting"
  | "epidural"
  | "pitocin"
  | "wrong";
export type CallReason =
  | "rule"
  | "water"
  | "bleeding"
  | "stacking"
  | "movement"
  | "wrong"
  | "override";

export type Wave = {
  id: string;
  start: number;
  end: number | null;
  duration: number | null;
  interval: number | null;
  intensity: 1 | 2 | 3 | 4 | 5 | null;
  note: string;
  position: string | null;
  breathPattern: BreathPattern | null;
  peakOffset: number | null;
  isPractice: boolean;
};

export type Flag = {
  id: string;
  type: FlagType;
  at: number;
};

export type BagItem = {
  id: string;
  list: BagListId;
  label: string;
  done: boolean;
};

export type Contacts = {
  hospital: string;
  afterHours: string;
  midwife: string;
  doula: string;
  pediatrician: string;
  backupDriver: string;
};

export type CustomRule = {
  intervalMin: number;
  durationSec: number;
  sustainedMin: number;
};

export type Settings = {
  role: Role;
  firstBaby: boolean;
  callRule: CallRule;
  customRule: CustomRule;
  birthingName: string;
  weeks: number | null;
  hospitalName: string;
  hospitalAddress: string;
  parkingNote: string;
  contacts: Contacts;
  goAtFirstRegular: boolean;
  vbac: boolean;
  dontEat: boolean;
  stayInBed: boolean;
  inductionMode: boolean;
  touchPref: TouchPref;
  breathVoice: BreathVoice;
  hapticPreset: HapticPreset;
  sensitive: boolean;
  reduceMotion: boolean;
  giantType: boolean;
  spokenCues: boolean;
  practiceDefault: boolean;
  units: "min-sec";
};

export type Session = {
  laborStartedAt: number | null;
  practiceOnly: boolean;
  falseAlarm: boolean;
  phaseResetAt: number | null;
  leftHomeAt: number | null;
  arrivedAt: number | null;
  bagsByDoor: boolean;
  bagsInCar: boolean;
  batteryWarnedAt: number | null;
  birthAt: number | null;
};

export type LiveWave = {
  id: string;
  start: number;
  peakMarkedAt: number | null;
};

export type ClosingWave = {
  waveId: string;
  endedAt: number;
  duration: number;
  early: boolean;
};

export type CallState = {
  open: boolean;
  reason: CallReason | null;
  dismissedUntil: number | null;
};

export type LaborState = {
  onboarded: boolean;
  waves: Wave[];
  flags: Flag[];
  bags: BagItem[];
  bagSections: BagSection[];
  bagRevision: number;
  settings: Settings;
  session: Session;
  liveWave: LiveWave | null;
  closing: ClosingWave | null;
  nextPeakHint: number | null;
  tab: TabId;
  sheet: SheetId;
  coachPane: CoachPane;
  editingWaveId: string | null;
  breathArmed: boolean;
  breathOverride: BreathPattern | "auto";
  pushMode: boolean;
  takeCharge: boolean;
  cantBreathe: boolean;
  pinnedPosition: string | null;
  lastPositionAt: number | null;
  practiceBreathAt: number | null;
  call: CallState;
  intensityPrompt: boolean;
};
