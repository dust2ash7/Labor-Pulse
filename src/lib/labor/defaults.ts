import { BAG_REVISION, defaultBagSections, defaultBags, migrateBagState } from "./copy";
import type { Settings, Session } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  role: "both",
  firstBaby: true,
  callRule: "5-1-1",
  customRule: { intervalMin: 5, durationSec: 60, sustainedMin: 60 },
  birthingName: "",
  weeks: null,
  hospitalName: "",
  hospitalAddress: "",
  parkingNote: "",
  contacts: {
    hospital: "",
    afterHours: "",
    midwife: "",
    doula: "",
    pediatrician: "",
    backupDriver: "",
  },
  goAtFirstRegular: false,
  vbac: false,
  dontEat: false,
  stayInBed: false,
  inductionMode: false,
  touchPref: "pressure",
  breathVoice: "off",
  hapticPreset: "peak",
  sensitive: false,
  reduceMotion: true,
  giantType: false,
  spokenCues: false,
  practiceDefault: false,
  units: "min-sec",
};

export const DEFAULT_SESSION: Session = {
  laborStartedAt: null,
  practiceOnly: false,
  falseAlarm: false,
  phaseResetAt: null,
  leftHomeAt: null,
  arrivedAt: null,
  bagsByDoor: false,
  bagsInCar: false,
  batteryWarnedAt: null,
  birthAt: null,
};

export { BAG_REVISION, defaultBagSections, defaultBags, migrateBagState };
