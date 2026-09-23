export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${pad2(s)}`;
}

export function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m} min` : `${m}:${pad2(rem)}`;
}

export function formatInterval(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${s}s`;
  if (rem === 0) return `${m} min`;
  return `${m}:${pad2(rem)}`;
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatClockSec(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDayTime(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function telHref(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.length < 3) return null;
  return `tel:${digits}`;
}

export function mapsHref(address: string): string | null {
  const q = address.trim();
  if (!q) return null;
  return `https://maps.apple.com/?q=${encodeURIComponent(q)}`;
}
