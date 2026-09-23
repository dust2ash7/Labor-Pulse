import {
  HANDS_ON,
  PARTNER_ONCE,
  POSITIONS,
  R3,
} from "@/lib/labor/copy";
import { hasFlag } from "@/lib/labor/engine";
import { useLaborStore } from "@/lib/labor/store";
import { usePeakArchitect } from "@/lib/labor/use-peak";
import type { CoachPane, TouchPref } from "@/lib/labor/types";
import { cn } from "@/lib/utils";
import { Chip, Segmented } from "./primitives";

export function CoachScreen({ now }: { now: number }) {
  const pane = useLaborStore((s) => s.coachPane);
  const setCoachPane = useLaborStore((s) => s.setCoachPane);
  const settings = useLaborStore((s) => s.settings);
  const patchSettings = useLaborStore((s) => s.patchSettings);
  const pinned = useLaborStore((s) => s.pinnedPosition);
  const pinPosition = useLaborStore((s) => s.pinPosition);
  const flags = useLaborStore((s) => s.flags);
  const { stage } = usePeakArchitect(now);
  const epidural = hasFlag(flags, "epidural");

  const visible = POSITIONS.filter((p) => {
    if (settings.stayInBed && (p.hideWalk || p.hideSquat)) return false;
    if (epidural && p.hideWalk && !p.epiduralOk) return false;
    return true;
  });

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight">Coach</h1>
        <p className="mt-1 text-[16px] text-muted">
          For the partner. One job per wave.
        </p>
      </header>

      <Segmented<CoachPane>
        value={pane}
        onChange={setCoachPane}
        options={[
          { id: "say", label: "Say" },
          { id: "hands", label: "Hands" },
          { id: "positions", label: "Positions" },
        ]}
      />

      {pane === "say" ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-surface px-4 py-4">
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-action">
              Once, early
            </p>
            <p className="mt-2 text-[20px] font-semibold tracking-tight">
              {R3.join(" · ")}
            </p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[16px] text-muted">
              {PARTNER_ONCE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-surface px-4 py-4">
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted">
              Say this
            </p>
            <dl className="mt-3 space-y-2 text-[17px]">
              <div>
                <dt className="text-muted">Rise</dt>
                <dd>Here it is.</dd>
              </div>
              <div>
                <dt className="text-muted">Peak</dt>
                <dd>This is the top. Stay.</dd>
              </div>
              <div>
                <dt className="text-muted">Ease</dt>
                <dd>Going. Let it go.</dd>
              </div>
              <div>
                <dt className="text-muted">Rest</dt>
                <dd>Clear rest. Water.</dd>
              </div>
            </dl>
            <p className="mt-4 text-[15px] text-muted">
              Banned: “Relax.” “Just breathe.” “It can’t be that bad yet.” Any cm guess.
            </p>
          </div>
          <p className="text-[16px] text-muted">You eat too. Someone has to drive.</p>
        </div>
      ) : null}

      {pane === "hands" ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-[15px] text-muted">Touch — ask once</p>
            <Segmented<TouchPref>
              value={settings.touchPref}
              onChange={(v) => patchSettings({ touchPref: v })}
              options={[
                { id: "pressure", label: "Pressure" },
                { id: "light", label: "Light" },
                { id: "none", label: "None" },
              ]}
            />
          </div>
          {settings.touchPref === "none" ? (
            <p className="rounded-2xl bg-surface px-4 py-4 text-[18px]">
              Voice + timer only.
            </p>
          ) : (
            Object.values(HANDS_ON).map((h) => (
              <article key={h.name} className="rounded-2xl bg-surface px-4 py-4">
                <h2 className="text-[18px] font-semibold">{h.name}</h2>
                <p className="mt-2 text-[16px] leading-snug text-muted">{h.how}</p>
              </article>
            ))
          )}
        </div>
      ) : null}

      {pane === "positions" ? (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-muted">
            Upright and changing often beats the bed. Modest claims only.
          </p>
          {visible.map((p) => {
            const rec = p.stages.includes(stage.stage);
            return (
              <article
                key={p.id}
                className={cn(
                  "rounded-2xl px-4 py-4",
                  rec ? "bg-raised" : "bg-surface",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[18px] font-semibold">{p.name}</h2>
                  {rec ? <Chip tone="ease">Fits now</Chip> : null}
                </div>
                <p className="mt-1 text-[16px]">{p.why}</p>
                <p className="mt-2 text-[15px] text-muted">Best: {p.bestWhen}</p>
                <p className="mt-1 text-[15px] text-muted">Partner: {p.partnerJob}</p>
                <button
                  type="button"
                  onClick={() => pinPosition(pinned === p.id ? null : p.id)}
                  className={cn(
                    "mt-3 min-h-11 rounded-xl px-4 text-[15px] font-medium",
                    pinned === p.id ? "bg-action text-action-fg" : "bg-bg text-fg",
                  )}
                >
                  {pinned === p.id ? "Pinned for this wave" : "Try this"}
                </button>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
