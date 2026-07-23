import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { motion } from "framer-motion";
import {
  ArrowRight,
  MapPin,
  Package,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wifi,
  Star,
  TrendingUp,
  Map,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getPendingSyncItems, type PendingSyncItem } from "@/lib/offline-store";

export const Route = createFileRoute("/agent/")({
  head: () => ({ meta: [{ title: "Agent Console — TrustRoute" }] }),
  component: AgentHome,
});

function AgentHome() {
  const deliveries = useApp((s) => s.deliveries);
  const userName = useApp((s) => s.userName) || "Field Agent";
  const userProfile = useApp((s) => s.userProfile);

  const [offlineItems, setOfflineItems] = useState<PendingSyncItem[]>([]);
  const [loadingOffline, setLoadingOffline] = useState(true);

  // Load local offline store items for sync counts
  useEffect(() => {
    getPendingSyncItems()
      .then((items) => {
        setOfflineItems(items);
        setLoadingOffline(false);
      })
      .catch((err) => {
        console.error("Error reading offline queue:", err);
        setLoadingOffline(false);
      });
  }, []);

  const active = deliveries.filter((d) => d.status !== "delivered" && d.status !== "failed" && d.status !== "cancelled");
  const completed = deliveries.filter((d) => d.status === "delivered");
  const failed = deliveries.filter((d) => d.status === "failed");
  const done = completed.length + failed.length;
  const total = deliveries.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const offlineCount = offlineItems.length;
  const failedSyncCount = offlineItems.filter((x) => x.error).length;

  const rating = userProfile?.rating ?? 5.0;
  const streak = userProfile?.streak ?? "3d";

  // Dynamic Weekly Activity Completion Calculations
  const getWeeklyCompletions = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        day: days[date.getDay()],
        dateStr: date.toDateString(),
        count: 0,
      };
    }).reverse();

    deliveries.forEach((d) => {
      if (d.status === "delivered" && d.proof?.verifiedAt) {
        const date = new Date(d.proof.verifiedAt);
        const match = last7Days.find((day) => day.dateStr === date.toDateString());
        if (match) {
          match.count += 1;
        }
      }
    });

    return last7Days;
  };

  const weeklyData = getWeeklyCompletions();
  const maxVal = Math.max(...weeklyData.map((d) => d.count), 1);

  // Get status pill class
  const getTerminalStatus = () => {
    if (!navigator.onLine) {
      return {
        label: "Offline Mode Active",
        color: "text-amber-400 border-amber-500/20 bg-amber-950/15",
      };
    }
    if (offlineCount > 0) {
      return {
        label: "Pending Synced Items",
        color: "text-blue-400 border-blue-500/20 bg-blue-950/15",
      };
    }
    return {
      label: "Operational Sync Complete",
      color: "text-green-400 border-green-500/20 bg-green-950/15",
    };
  };

  const statusUI = getTerminalStatus();

  return (
    <div className="space-y-6 text-left">
      {/* Welcome Banner */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-red-950/20 to-zinc-900/40 p-6 rounded-3xl border border-zinc-850">
        <div>
          <span className="text-[10px] text-[#FF4D4D] uppercase font-bold tracking-widest block">
            Welcome Back
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            {userName}
          </h1>
          <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
            Manage your daily route, inspect handoff certificates, and synchronize offline verifications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/agent/sync"
            className="flex items-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 px-4.5 py-2.5 text-xs font-semibold text-zinc-200 transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync Dashboard
          </Link>
          <Link
            to="/agent/scan"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B71C1C] to-red-600 hover:opacity-90 px-4.5 py-2.5 text-xs font-semibold text-white shadow-glow transition cursor-pointer"
          >
            <Package className="h-3.5 w-3.5" />
            Scan Parcel
          </Link>
        </div>
      </header>

      {/* Stats Cards Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Deliveries Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#0F1424] border border-zinc-850 p-4.5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-zinc-800 transition"
        >
          <div className="flex items-center justify-between text-zinc-450">
            <span className="text-[10px] uppercase font-bold tracking-wider">Today's Route</span>
            <Map className="h-4.5 w-4.5 text-[#FF4D4D]" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {done}/{total}
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                className="h-full bg-gradient-to-r from-[#B71C1C] to-red-500 shadow-glow"
              />
            </div>
            <div className="text-[10px] text-zinc-500 mt-2 font-medium">
              {pct}% Completed Route
            </div>
          </div>
        </motion.div>

        {/* Pending & Completed count */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-[#0F1424] border border-zinc-850 p-4.5 flex flex-col justify-between hover:border-zinc-800 transition"
        >
          <div className="flex items-center justify-between text-zinc-450">
            <span className="text-[10px] uppercase font-bold tracking-wider">Active & Pending</span>
            <Clock className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {active.length}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1 font-medium">
              Deliveries assigned to verify
            </div>
            <div className="mt-2 flex gap-4 text-xs font-semibold">
              <span className="text-emerald-400">{completed.length} Done</span>
              <span className="text-rose-400">{failed.length} Failed</span>
            </div>
          </div>
        </motion.div>

        {/* Offline Queue Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-[#0F1424] border border-zinc-850 p-4.5 flex flex-col justify-between hover:border-zinc-800 transition"
        >
          <div className="flex items-center justify-between text-zinc-450">
            <span className="text-[10px] uppercase font-bold tracking-wider">Offline Cache</span>
            <Wifi className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {offlineCount}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1 font-medium">
              Waiting in local queue
            </div>
            <div className="mt-2 text-xs font-semibold text-rose-400 flex items-center gap-1">
              {failedSyncCount > 0 && (
                <>
                  <AlertTriangle className="h-3 w-3" /> {failedSyncCount} Sync Errors
                </>
              )}
              {failedSyncCount === 0 && <span className="text-zinc-500">No sync conflicts</span>}
            </div>
          </div>
        </motion.div>

        {/* Performance & Status details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-[#0F1424] border border-zinc-850 p-4.5 flex flex-col justify-between hover:border-zinc-800 transition"
        >
          <div className="flex items-center justify-between text-zinc-450">
            <span className="text-[10px] uppercase font-bold tracking-wider">Performance</span>
            <Star className="h-4.5 w-4.5 text-yellow-500" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white flex items-center gap-1.5">
              {rating.toFixed(1)}
              <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                ★
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-1 font-medium">
              Rating (Active Streak: {streak})
            </div>
            <div className={cn("mt-2.5 inline-flex items-center border rounded-full px-2 py-0.5 text-[9px] font-bold uppercase", statusUI.color)}>
              {statusUI.label}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Grid: Route details and Weekly completions chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Route Deliveries */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-450 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[#FF4D4D]" /> Active Route Deliveries
            </h2>
            <Link
              to="/agent/deliveries"
              className="text-xs font-semibold text-[#FF4D4D] hover:underline"
            >
              View All Assigned
            </Link>
          </div>

          <div className="space-y-3">
            {active.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0F1424] border border-dashed border-zinc-800">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-3" />
                <p className="text-sm font-semibold text-zinc-300">All Assigments Verified</p>
                <p className="text-xs text-zinc-500 mt-1">
                  You have no pending deliveries assigned for your active route.
                </p>
              </div>
            ) : (
              active.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl bg-[#0F1424] border border-zinc-850 hover:border-zinc-800 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider",
                          d.priority === "Critical"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                            : d.priority === "Express"
                              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25"
                              : "bg-violet-500/10 text-violet-400 border-violet-500/25",
                        )}
                      >
                        <Zap className="h-2.5 w-2.5 fill-current" /> {d.priority}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500 font-semibold bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                        ID: {d.id}
                      </span>
                    </div>
                    <div className="font-bold text-white text-base truncate">
                      {d.customer}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 leading-normal">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{d.destination}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-3 w-3 text-zinc-500" /> {d.packageType}
                      </span>
                      <span>· {d.distanceKm} km</span>
                      <span>· ETA {d.eta}</span>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase border",
                        d.paymentStatus === "paid" || d.paymentStatus === "cod_collected"
                          ? "bg-emerald-950/30 text-emerald-450 border-emerald-500/10"
                          : "bg-red-950/30 text-[#FF4D4D] border-red-500/10"
                      )}>
                        {d.paymentType === "cod" ? "COD" : "Prepaid"} · ${d.paymentAmount || 0} · {(d.paymentStatus || "pending").replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to cancel this order?")) {
                          const promise = useApp.getState().updateStatus(d.id, "cancelled");
                          // We don't have toast imported directly here, so just use promise
                        }
                      }}
                      className="group flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-xs font-semibold text-white transition shrink-0"
                    >
                      Cancel
                    </button>
                    <Link
                      to="/agent/delivery/$id"
                      params={{ id: d.id }}
                      className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#B71C1C] to-red-600 hover:opacity-90 px-4 py-2.5 text-xs font-semibold text-white shadow-glow cursor-pointer transition shrink-0"
                    >
                      Start Verification
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Weekly activity statistics */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-450 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-[#FF4D4D]" /> Weekly Activity
          </h2>
          <div className="bg-[#0F1424] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Handoff Rate
              </p>
              <h3 className="text-2xl font-bold text-white mt-0.5">
                {completed.length} Completions
              </h3>
              <p className="text-xs text-zinc-400">Activity tracked over the past 7 days.</p>
            </div>

            {/* Custom SVG/CSS dynamic chart */}
            <div className="flex items-end justify-between gap-2 h-36 pt-6 border-b border-zinc-850 pb-2">
              {weeklyData.map((d, i) => {
                const pct = (d.count / maxVal) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full flex flex-col items-center">
                      {/* Tooltip */}
                      <span className="absolute -top-7 scale-0 group-hover:scale-100 transition-all bg-zinc-950 text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-800 pointer-events-none z-10 whitespace-nowrap">
                        {d.count} verified
                      </span>
                      <div className="w-5 sm:w-7 bg-zinc-900 rounded-md overflow-hidden h-24 flex items-end">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                          className="w-full bg-gradient-to-t from-[#B71C1C] to-red-500 rounded-t-sm shadow-glow"
                        />
                      </div>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{d.day}</span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-850/60">
                <span className="text-[9px] uppercase font-bold text-zinc-550 block">Success Rate</span>
                <span className="text-sm font-bold text-emerald-400">
                  {total > 0 ? Math.round((completed.length / total) * 100) : 100}%
                </span>
              </div>
              <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-850/60">
                <span className="text-[9px] uppercase font-bold text-zinc-550 block">Daily Average</span>
                <span className="text-sm font-bold text-blue-400">
                  {(completed.length / 7).toFixed(1)} / day
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
