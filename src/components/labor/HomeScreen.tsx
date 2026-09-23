import type { ReactNode } from "react";
import { ClipboardList, Clock, PersonStanding, Wind } from "lucide-react";
import { useLaborStore } from "@/lib/labor/store";
import { cn } from "@/lib/utils";

export function HomeScreen() {
  const setTab = useLaborStore((s) => s.setTab);

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-5">
      <header className="pb-1">
        <h1 className="text-[28px] font-semibold tracking-tight">Home</h1>
        <p className="mt-1 text-[16px] text-muted">
          Choose a tool. Nothing starts until you tap.
        </p>
      </header>

      <HomeCard
        icon={<Wind className="size-6" />}
        title="Breathe"
        subtitle="Practice and live breathing"
        onClick={() => setTab("breath")}
      />
      <HomeCard
        icon={<PersonStanding className="size-6" />}
        title="Positions"
        subtitle="Labor positions by stage"
        onClick={() => setTab("positions")}
      />
      <HomeCard
        icon={<Clock className="size-6" />}
        title="Time contractions"
        subtitle="Start and stop each wave"
        onClick={() => setTab("now")}
      />
      <HomeCard
        icon={<ClipboardList className="size-6" />}
        title="History"
        subtitle="Waves, flags, and the nurse card"
        onClick={() => setTab("history")}
      />

      <div className="mt-2 grid grid-cols-2 gap-3">
        <SmallCard title="Coach" onClick={() => setTab("coach")} />
        <SmallCard title="Bags" onClick={() => setTab("bags")} />
      </div>
    </div>
  );
}

function HomeCard({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-24 items-center gap-4 rounded-2xl bg-surface px-5 py-4 text-left"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-raised text-action">
        {icon}
      </span>
      <span>
        <span className="block text-[20px] font-semibold tracking-tight">{title}</span>
        <span className="mt-0.5 block text-[15px] text-muted">{subtitle}</span>
      </span>
    </button>
  );
}

function SmallCard({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-16 items-center justify-center rounded-2xl bg-raised px-4 text-[17px] font-medium",
      )}
    >
      {title}
    </button>
  );
}
