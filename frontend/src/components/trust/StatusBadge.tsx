import type { DeliveryStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const map: Record<DeliveryStatus, { label: string; cls: string; pulse?: boolean }> = {
  delivered: {
    label: "Verified",
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_20px_-6px_oklch(0.74_0.18_155/0.6)]",
  },
  in_progress: {
    label: "In Transit",
    cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    pulse: true,
  },
  assigned: { label: "Assigned", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  failed: {
    label: "Attention",
    cls: "bg-red-500/15 text-red-300 border-red-500/30 animate-pulse-glow",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  },
};

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        s.cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current", s.pulse && "animate-pulse")} />
      {s.label}
    </span>
  );
}
