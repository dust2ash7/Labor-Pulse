type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", fn: () => void) => void;
};

let sentinel: WakeLockSentinelLike | null = null;
let wantLock = false;

async function request() {
  if (typeof navigator === "undefined") return;
  const anyNav = navigator as Navigator & {
    wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
  };
  if (!anyNav.wakeLock) return;
  try {
    sentinel = await anyNav.wakeLock.request("screen");
    sentinel.addEventListener("release", () => {
      sentinel = null;
    });
  } catch {
    sentinel = null;
  }
}

export async function acquireWakeLock() {
  wantLock = true;
  await request();
}

export async function releaseWakeLock() {
  wantLock = false;
  try {
    await sentinel?.release();
  } catch {
    /* ignore */
  }
  sentinel = null;
}

export function installWakeLockListeners() {
  if (typeof document === "undefined") return () => undefined;
  const onVis = () => {
    if (document.visibilityState === "visible" && wantLock && !sentinel) {
      void request();
    }
  };
  document.addEventListener("visibilitychange", onVis);
  return () => document.removeEventListener("visibilitychange", onVis);
}
