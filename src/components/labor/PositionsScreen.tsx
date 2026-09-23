import {
  BREATH_FOOTER,
  GUIDE_POSITIONS,
  POSITIONS_BY_STAGE,
  SIDE_LYING_PUSH_WHEN,
  STAGE_HEADERS,
  type GuidePositionId,
} from "@/lib/labor/copy";
import { useLaborStore } from "@/lib/labor/store";
import { cn } from "@/lib/utils";

export function PositionsScreen() {
  const pinned = useLaborStore((s) => s.pinnedPosition);
  const pinPosition = useLaborStore((s) => s.pinPosition);

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-6">
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight">Positions</h1>
        <p className="mt-1 text-[16px] text-muted">
          Pick a shape for the stage you are in.
        </p>
      </header>

      {STAGE_HEADERS.map((stage) => (
        <section key={stage.id} className="flex flex-col gap-2">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-action">
            {stage.label}
          </h2>
          {POSITIONS_BY_STAGE[stage.id].map((id) => {
            const p = GUIDE_POSITIONS[id];
            const pushingSide = stage.id === "pushing" && id === "side-lying";
            return (
              <article
                key={`${stage.id}-${id}`}
                className={cn(
                  "overflow-hidden rounded-2xl bg-surface",
                  pinned === id && "ring-1 ring-action",
                )}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className="aspect-[3/4] w-full object-cover object-center"
                />
                <div className="px-4 py-3">
                  <h3 className="text-[18px] font-semibold tracking-tight">{p.name}</h3>
                  <p className="mt-2 text-[15px] leading-snug text-muted">
                    <span className="font-medium text-fg">What it is. </span>
                    {pushingSide ? "Same side-lying shape. Rest is still work." : p.what}
                  </p>
                  <p className="mt-1.5 text-[15px] leading-snug text-muted">
                    <span className="font-medium text-fg">When to use. </span>
                    {pushingSide ? SIDE_LYING_PUSH_WHEN : p.when}
                  </p>
                  <button
                    type="button"
                    onClick={() => pinPosition(pinned === id ? null : id)}
                    className={cn(
                      "mt-3 min-h-11 w-full rounded-xl text-[15px] font-medium",
                      pinned === id ? "bg-action text-action-fg" : "bg-raised",
                    )}
                  >
                    {pinned === id ? "Pinned for this wave" : "Try this"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ))}

      <p className="text-[13px] text-muted">{BREATH_FOOTER}</p>
    </div>
  );
}

export type { GuidePositionId };
