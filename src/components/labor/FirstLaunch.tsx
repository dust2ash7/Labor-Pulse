import { useState } from "react";
import { DISCLAIMER } from "@/lib/labor/copy";
import { useLaborStore } from "@/lib/labor/store";
import type { Role } from "@/lib/labor/types";
import { Segmented } from "./primitives";

export function FirstLaunch() {
  const onboard = useLaborStore((s) => s.onboard);
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("both");
  const [firstBaby, setFirstBaby] = useState(true);
  const [practiceOnly, setPracticeOnly] = useState(false);

  return (
    <main className="flex min-h-dvh flex-col bg-bg px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
      <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-action">
        Labor Pulse
      </p>
      {step === 1 ? (
        <>
          <h1 className="mt-6 max-w-[14ch] text-[2.15rem] font-semibold leading-[1.15] tracking-tight">
            A quiet companion for the wave.
          </h1>
          <p className="mt-6 max-w-[34ch] text-[18px] leading-relaxed text-muted">
            {DISCLAIMER}
          </p>
          <p className="mt-4 text-[15px] text-muted">Not a medical device.</p>
          <div className="mt-auto pt-10">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-action text-[18px] font-semibold text-action-fg"
            >
              I understand
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-6 text-[2rem] font-semibold tracking-tight">Who is on this phone?</h1>
          <div className="mt-8 flex flex-col gap-6">
            <Segmented
              value={role}
              onChange={setRole}
              options={[
                { id: "birthing", label: "Birthing" },
                { id: "partner", label: "Partner" },
                { id: "both", label: "Both" },
              ]}
            />
            <div>
              <p className="mb-2 text-[15px] font-medium text-muted">First baby?</p>
              <Segmented
                value={firstBaby ? "yes" : "no"}
                onChange={(v) => setFirstBaby(v === "yes")}
                options={[
                  { id: "yes", label: "Yes — 5-1-1" },
                  { id: "no", label: "No — 4-1-1" },
                ]}
              />
            </div>
            <div>
              <p className="mb-2 text-[15px] font-medium text-muted">Starting as</p>
              <Segmented
                value={practiceOnly ? "practice" : "labor"}
                onChange={(v) => setPracticeOnly(v === "practice")}
                options={[
                  { id: "labor", label: "Labor" },
                  { id: "practice", label: "Practice" },
                ]}
              />
              <p className="mt-2 text-[14px] text-muted">
                Practice never trips hospital alerts. You can switch later.
              </p>
            </div>
          </div>
          <div className="mt-auto pt-10">
            <button
              type="button"
              onClick={() =>
                onboard({
                  role,
                  firstBaby,
                  callRule: firstBaby ? "5-1-1" : "4-1-1",
                  practiceOnly,
                })
              }
              className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-action text-[18px] font-semibold text-action-fg"
            >
              Begin
            </button>
          </div>
        </>
      )}
    </main>
  );
}
