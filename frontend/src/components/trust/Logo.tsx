import { ShieldCheck } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const icon = size === "lg" ? "h-9 w-9" : size === "sm" ? "h-6 w-6" : "h-8 w-8";
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${icon} rounded-xl gradient-primary grid place-items-center shadow-glow`}>
        <ShieldCheck className="h-1/2 w-1/2 text-white" strokeWidth={2.5} />
      </div>
      <span className={`${text} font-bold tracking-tight`}>
        Trust<span className="text-gradient-primary">Route</span>
      </span>
    </div>
  );
}
