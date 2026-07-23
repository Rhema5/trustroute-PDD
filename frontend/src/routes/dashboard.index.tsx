import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Search,
  Truck,
  Package,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useApp } from "@/store/app-store";
import { StatusBadge } from "@/components/trust/StatusBadge";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { DeliveryStatus } from "@/lib/mock-data";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — TrustRoute" }] }),
  component: DashboardHome,
});

const icons = [Package, ShieldCheck, Truck, AlertTriangle];

// Status group labels for the auto-sorted sections
const STATUS_GROUP_LABELS: Record<DeliveryStatus, { label: string; color: string; dotColor: string }> = {
  in_progress: { label: "In Transit", color: "text-blue-600", dotColor: "bg-blue-500" },
  assigned: { label: "Assigned & Pending Pickup", color: "text-amber-600", dotColor: "bg-amber-500" },
  failed: { label: "Attention Required", color: "text-rose-600", dotColor: "bg-rose-500" },
  delivered: { label: "Completed Deliveries", color: "text-emerald-600", dotColor: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "text-zinc-600", dotColor: "bg-zinc-500" },
};

// Valid next transitions for inline display
const NEXT_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  assigned: ["in_progress", "failed", "cancelled"],
  in_progress: ["delivered", "failed", "cancelled"],
  delivered: [],
  failed: ["assigned"],
  cancelled: [],
};

const TRANSITION_LABELS: Record<DeliveryStatus, string> = {
  assigned: "Assigned",
  in_progress: "In Transit",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
};

function DashboardHome() {
  const deliveries = useApp((s) => s.deliveries);
  const q = useApp((s) => s.searchQuery);
  const setQ = useApp((s) => s.setSearchQuery);

  const filtered = deliveries.filter((d) =>
    [d.id, d.customer, d.destination, d.agentName || ""].some((v) =>
      v.toLowerCase().includes(q.toLowerCase()),
    ),
  );

  // Compute stats dynamically
  const total = deliveries.length;
  const delivered = deliveries.filter((d) => d.status === "delivered").length;
  const inProgress = deliveries.filter((d) => d.status === "in_progress").length;
  const failed = deliveries.filter((d) => d.status === "failed").length;

  const stats = [
    {
      label: "Total Deliveries",
      value: total,
      change: total > 0 ? "+100%" : "+0%",
      trend: "up" as const,
      color: "from-[#7F1D1D] to-[#B71C1C]",
    },
    {
      label: "Completed Handoffs",
      value: delivered,
      change: total > 0 ? `${Math.round((delivered / (total || 1)) * 100)}%` : "0%",
      trend: "up" as const,
      color: "from-emerald-500 to-teal-600",
    },
    {
      label: "In Transit",
      value: inProgress,
      change: total > 0 ? `${Math.round((inProgress / (total || 1)) * 100)}%` : "0%",
      trend: "up" as const,
      color: "from-blue-500 to-indigo-600",
    },
    {
      label: "Attention Needed",
      value: failed,
      change: total > 0 ? `${Math.round((failed / (total || 1)) * 100)}%` : "0%",
      trend: "down" as const,
      color: "from-amber-500 to-rose-600",
    },
  ];

  // Prepare trend data for Recharts (past 7 days representation)
  const getTrendData = () => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    return dates.map((date) => {
      const dayDeliveries = deliveries.filter((d) => d.createdAt && d.createdAt.startsWith(date));
      return {
        name: new Date(date).toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
        deliveries: dayDeliveries.length,
        completed: dayDeliveries.filter((d) => d.status === "delivered").length,
      };
    });
  };

  const trendData = getTrendData();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-zinc-900 font-['Poppins',sans-serif]">
              Operations console
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Real-time status of every active handoff verification route across your logistics
              network.
            </p>
          </div>
          <Link
            to="/dashboard/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#7F1D1D] hover:bg-[#6B1414] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:scale-[1.01] transition-all cursor-pointer"
          >
            Deploy New Mission
          </Link>
        </div>
      </motion.div>

      {/* Stats Cards in Light mode */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = icons[i];
          const Up = s.trend === "up";
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group relative overflow-hidden rounded-2xl bg-white border border-zinc-200/80 p-5 shadow-sm transition-all hover:bg-zinc-50/50 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br shadow-sm text-white",
                    s.color,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    Up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                  )}
                >
                  {Up ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {s.change}
                </span>
              </div>
              <div className="mt-5 text-3xl font-extrabold tracking-tight text-zinc-900 font-['Poppins',sans-serif]">
                {s.value}
              </div>
              <div className="text-xs text-zinc-400 font-medium mt-1">{s.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Chart Section in White Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="rounded-2xl bg-white border border-zinc-200/80 shadow-sm p-5 space-y-4"
      >
        <h3 className="text-sm font-bold text-zinc-800 font-['Poppins',sans-serif]">
          Delivery Volume & Verification Trend
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7F1D1D" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#7F1D1D" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
              <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  borderColor: "#e4e4e7",
                  borderRadius: 12,
                  color: "#18181b",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="deliveries"
                name="Total Dispatched"
                stroke="#7F1D1D"
                fillOpacity={1}
                fill="url(#colorDeliveries)"
                strokeWidth={2.5}
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="Verified Delivered"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#colorCompleted)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Live Operations List in Light Mode Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl bg-white border border-zinc-200/80 shadow-sm overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-5 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <h2 className="text-base font-bold text-zinc-900 font-['Poppins',sans-serif]">
              Live operations
            </h2>
            <span className="text-xs text-zinc-400 font-medium">
              — streaming {filtered.length} routes
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by ID, customer, agent..."
              className="w-64 rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-[#7F1D1D]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500 font-semibold bg-white">
              No active deliveries found matching criteria.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-zinc-400 bg-zinc-50/50 border-b border-zinc-150">
                <tr>
                  <th className="p-4 text-left font-semibold">Delivery ID / Customer</th>
                  <th className="p-4 text-left font-semibold">Destination</th>
                  <th className="p-4 text-left font-semibold">Assigned Agent</th>
                  <th className="p-4 text-left font-semibold">ETA</th>
                  <th className="p-4 text-left font-semibold">Status / Workflow</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {filtered.map((d, i) => {
                  // Show status group separator when the status changes
                  const prevStatus = i > 0 ? filtered[i - 1].status : null;
                  const showGroupHeader = d.status !== prevStatus;
                  const groupInfo = STATUS_GROUP_LABELS[d.status];
                  const nextStates = NEXT_TRANSITIONS[d.status];

                  return (
                    <>
                      {showGroupHeader && (
                        <tr key={`group-${d.status}`} className="bg-zinc-50/80">
                          <td colSpan={6} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className={cn("h-2 w-2 rounded-full", groupInfo.dotColor)} />
                              <span className={cn("text-xs font-bold uppercase tracking-wider", groupInfo.color)}>
                                {groupInfo.label}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-medium">
                                — {filtered.filter((x) => x.status === d.status).length} {filtered.filter((x) => x.status === d.status).length === 1 ? "route" : "routes"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <motion.tr
                        key={d.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="hover:bg-zinc-50/30 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-mono text-xs text-zinc-450 font-bold">{d.id}</div>
                          <div className="font-bold text-zinc-800 mt-0.5">{d.customer}</div>
                        </td>
                        <td className="p-4 text-zinc-600 font-medium">{d.destination}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 text-zinc-650 text-xs font-bold font-['Poppins',sans-serif]">
                              {(d.agentName || "Agent")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-zinc-800">
                                {d.agentName || "Assigned Agent"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-zinc-500 font-semibold">{d.eta}</td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={d.status} />
                            {nextStates.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <ArrowRight className="h-2.5 w-2.5 text-zinc-350" />
                                {nextStates.map((ns) => (
                                  <span
                                    key={ns}
                                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-150"
                                  >
                                    {TRANSITION_LABELS[ns]}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            to={
                              d.status === "delivered" ? "/dashboard/proofs/$id" : "/dashboard/history"
                            }
                            params={{ id: d.id }}
                            className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-3.5 py-2 text-xs font-bold text-zinc-750 transition cursor-pointer"
                          >
                            View <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </motion.tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
