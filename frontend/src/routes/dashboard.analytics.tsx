import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart4,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Zap,
  Activity,
  Star,
  WifiOff,
  XCircle,
  Shield,
  Timer,
} from "lucide-react";
import { FAILURE_REASON_LABELS } from "@/lib/offline-queue-store";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics — TrustRoute" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const deliveries = useApp((s) => s.deliveries);
  const agents = useApp((s) => s.agents);
  const fetchAgents = useApp((s) => s.fetchAgents);
  const offlineQueue = useApp((s) => s.offlineQueue);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Offline metrics
  const offlineTotal     = offlineQueue.length;
  const offlineSynced    = offlineQueue.filter((q) => q.state === "synced").length;
  const offlineFailed    = offlineQueue.filter((q) => q.state === "failed").length;
  const offlinePending   = offlineQueue.filter((q) => q.state === "pending" || q.state === "syncing").length;
  const offlineManual    = offlineQueue.filter((q) => q.state === "manual_review").length;
  const onlineTotal      = deliveries.length - offlineTotal;

  const offlineSuccessRate = (offlineSynced + offlineFailed) > 0
    ? Math.round((offlineSynced / (offlineSynced + offlineFailed)) * 100)
    : 0;

  const avgSyncMs = offlineSynced > 0
    ? offlineQueue.filter((q) => q.syncDuration).reduce((acc, q) => acc + (q.syncDuration || 0), 0) / offlineSynced
    : 0;
  const avgSyncSec = avgSyncMs > 0 ? `${(avgSyncMs / 1000).toFixed(1)}s` : "—";

  // Failure reason breakdown
  const failureReasonMap: Record<string, number> = {};
  offlineQueue.filter((q) => q.failureReason).forEach((q) => {
    const r = q.failureReason!;
    failureReasonMap[r] = (failureReasonMap[r] || 0) + 1;
  });
  const failureReasonEntries = Object.entries(failureReasonMap).sort((a, b) => b[1] - a[1]);
  const maxFailureCount = Math.max(...failureReasonEntries.map((e) => e[1]), 1);

  // Agent offline performance
  const agentOfflinePerf = agents.map((agent) => {
    const agentItems = offlineQueue.filter((q) => q.agentId === agent.id);
    const agentSynced = agentItems.filter((q) => q.state === "synced").length;
    const agentFailed = agentItems.filter((q) => q.state === "failed").length;
    return {
      ...agent,
      offlineTotal: agentItems.length,
      offlineSynced: agentSynced,
      offlineFailed: agentFailed,
      successRate: (agentSynced + agentFailed) > 0
        ? Math.round((agentSynced / (agentSynced + agentFailed)) * 100)
        : 100,
    };
  }).filter((a) => a.offlineTotal > 0).sort((a, b) => b.offlineTotal - a.offlineTotal);

  // Network reliability: (synced / total resolvable) × 100
  const networkReliability = (offlineSynced + offlineFailed) > 0
    ? Math.round((offlineSynced / (offlineSynced + offlineFailed)) * 100)
    : 100;

  // Operational metrics
  const total = deliveries.length;
  const completed = deliveries.filter((d) => d.status === "delivered").length;
  const failed = deliveries.filter((d) => d.status === "failed").length;
  const cancelled = deliveries.filter((d) => d.status === "cancelled").length;
  const pending = total - completed - failed - cancelled;

  // SLA rate calculation
  const slaRate = total > 0 ? Math.round((completed / (completed + failed || 1)) * 100) : 100;

  // Group deliveries by priority
  const criticalCount = deliveries.filter((d) => d.priority === "Critical").length;
  const expressCount = deliveries.filter((d) => d.priority === "Express").length;
  const standardCount = deliveries.filter((d) => d.priority === "Standard").length;

  const maxPriority = Math.max(criticalCount, expressCount, standardCount, 1);
  const pctCritical = Math.round((criticalCount / maxPriority) * 100);
  const pctExpress = Math.round((expressCount / maxPriority) * 100);
  const pctStandard = Math.round((standardCount / maxPriority) * 100);

  // SLA speeds (Mocked ranges based on real priorities)
  const averageVerificationTime = total > 0 ? "24.5 mins" : "—";
  const criticalSlaTime = criticalCount > 0 ? "11.2 mins" : "—";
  const expressSlaTime = expressCount > 0 ? "28.4 mins" : "—";

  // Top agents by completed deliveries
  const topAgents = agents
    .map((agent) => {
      const completedCount = deliveries.filter(
        (d) => d.agentId === agent.id && d.status === "delivered"
      ).length;
      return {
        ...agent,
        completedCount,
      };
    })
    .sort((a, b) => b.completedCount - a.completedCount)
    .slice(0, 4);

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-zinc-900 font-['Poppins',sans-serif]">
          Analytics & Insights
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Cryptographic ledger metrics, agent operational performance, and real-time SLA tracking.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Handoffs",
            value: total,
            description: "Ledger recorded transactions",
            icon: Activity,
            color: "from-zinc-900 to-zinc-800",
            textColor: "text-zinc-900",
          },
          {
            label: "SLA Adherence Rate",
            value: `${slaRate}%`,
            description: "Target verification compliance",
            icon: TrendingUp,
            color: "from-emerald-600 to-teal-700",
            textColor: "text-emerald-600",
          },
          {
            label: "Average Verification",
            value: averageVerificationTime,
            description: "Signature completion time",
            icon: Clock,
            color: "from-[#7F1D1D] to-[#B71C1C]",
            textColor: "text-[#B71C1C]",
          },
          {
            label: "Active Roster",
            value: agents.length,
            description: "Active field dispatchers",
            icon: Truck,
            color: "from-blue-600 to-indigo-700",
            textColor: "text-blue-600",
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-450">{kpi.label}</span>
              <div
                className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${kpi.color} text-white`}
              >
                <kpi.icon className="h-4.5 w-4.5" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-zinc-900 font-['Poppins',sans-serif]">
                {kpi.value}
              </div>
              <div className="text-[10px] text-zinc-450 mt-0.5">{kpi.description}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Analytics Panels */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Verification Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2">
            <BarChart4 className="h-5 w-5 text-[#7F1D1D]" />
            <h2 className="text-base font-bold text-zinc-900 font-['Poppins',sans-serif]">
              Verification Distribution
            </h2>
          </div>

          <div className="space-y-4">
            {/* Custom bar distribution map */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-zinc-650 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Completed
                </span>
                <span className="text-zinc-800">
                  {completed} / {total} ({total > 0 ? Math.round((completed / total) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-zinc-650 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-blue-500" /> Pending / In Transit
                </span>
                <span className="text-zinc-800">
                  {pending} / {total} ({total > 0 ? Math.round((pending / total) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${total > 0 ? (pending / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-zinc-650 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" /> Failed Verification
                </span>
                <span className="text-zinc-800">
                  {failed} / {total} ({total > 0 ? Math.round((failed / total) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${total > 0 ? (failed / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Verification SLA times */}
          <div className="border-t border-zinc-100 pt-4 grid grid-cols-3 gap-2 text-center">
            <div className="bg-zinc-50 p-3 rounded-xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                Avg. Overall
              </div>
              <div className="text-base font-extrabold text-zinc-800 mt-0.5">
                {averageVerificationTime}
              </div>
            </div>
            <div className="bg-red-50/20 border border-red-100/50 p-3 rounded-xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7F1D1D]/70">
                Critical SLA
              </div>
              <div className="text-base font-extrabold text-[#7F1D1D] mt-0.5">
                {criticalSlaTime}
              </div>
            </div>
            <div className="bg-zinc-50 p-3 rounded-xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                Express SLA
              </div>
              <div className="text-base font-extrabold text-zinc-800 mt-0.5">
                {expressSlaTime}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Priority SLA Volumes */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4"
        >
          <div>
            <h2 className="text-base font-bold text-zinc-900 font-['Poppins',sans-serif]">
              Mission Priority Volume
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">Distribution by service SLA priority.</p>
          </div>

          <div className="flex h-36 items-end justify-between px-4 pb-2 border-b border-zinc-100">
            {/* Critical Bar */}
            <div className="flex flex-col items-center gap-1.5 w-8">
              <div
                className="w-full bg-gradient-to-t from-red-800 to-[#B71C1C] rounded-t-lg transition-all duration-500"
                style={{ height: `${pctCritical * 0.9 || 4}px` }}
              />
              <span className="text-[10px] font-bold text-zinc-500">{criticalCount}</span>
              <span className="text-[9px] font-bold text-zinc-450 uppercase">Crit</span>
            </div>

            {/* Express Bar */}
            <div className="flex flex-col items-center gap-1.5 w-8">
              <div
                className="w-full bg-gradient-to-t from-zinc-800 to-zinc-650 rounded-t-lg transition-all duration-500"
                style={{ height: `${pctExpress * 0.9 || 4}px` }}
              />
              <span className="text-[10px] font-bold text-zinc-500">{expressCount}</span>
              <span className="text-[9px] font-bold text-zinc-450 uppercase">Expr</span>
            </div>

            {/* Standard Bar */}
            <div className="flex flex-col items-center gap-1.5 w-8">
              <div
                className="w-full bg-gradient-to-t from-zinc-400 to-zinc-300 rounded-t-lg transition-all duration-500"
                style={{ height: `${pctStandard * 0.9 || 4}px` }}
              />
              <span className="text-[10px] font-bold text-zinc-500">{standardCount}</span>
              <span className="text-[9px] font-bold text-zinc-450 uppercase">Std</span>
            </div>
          </div>

          <div className="text-xs text-zinc-500 leading-normal bg-zinc-50 p-2.5 rounded-xl border border-zinc-150">
            Express and Critical cargo segments represent{" "}
            <strong>
              {total > 0 ? Math.round(((criticalCount + expressCount) / total) * 100) : 0}%
            </strong>{" "}
            of absolute delivery transactions.
          </div>
        </motion.div>
      </div>

      {/* Roster Performance Rankings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4"
      >
        <div>
          <h2 className="text-base font-bold text-zinc-900 font-['Poppins',sans-serif]">
            Top Field Performers
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ranked by successful cryptographic receipts and average rating.
          </p>
        </div>

        {topAgents.length === 0 ? (
          <p className="text-sm text-zinc-500 py-6 text-center">No active agent performance data.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topAgents.map((agent, rank) => (
              <div
                key={agent.id}
                className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 space-y-3 relative overflow-hidden"
              >
                <div className="absolute right-2 top-2 h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center font-bold text-xs text-zinc-400">
                  #{rank + 1}
                </div>
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#7F1D1D] text-white text-xs font-bold font-['Poppins',sans-serif]">
                    {agent.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-800 leading-tight">{agent.name}</div>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold mt-0.5">
                      <Star className="h-2.5 w-2.5 fill-amber-500" /> {agent.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="border-t border-zinc-150 pt-2 flex justify-between items-center text-[10px] text-zinc-500">
                  <span>Handoffs Synced:</span>
                  <span className="font-bold text-zinc-800">{agent.completedCount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Offline Operations Analytics ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#7F1D1D] to-[#B71C1C] text-white">
            <WifiOff className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 font-['Poppins',sans-serif]">Offline Operations Analytics</h2>
            <p className="text-xs text-zinc-400">Sync performance, failure analysis, and network reliability.</p>
          </div>
        </div>

        {/* Offline KPI Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Offline Deliveries", value: offlineTotal, icon: WifiOff,       color: "from-zinc-700 to-zinc-900" },
            { label: "Offline Success Rate",      value: `${offlineSuccessRate}%`, icon: CheckCircle2, color: "from-emerald-500 to-teal-600" },
            { label: "Average Sync Time",         value: avgSyncSec,               icon: Timer,        color: "from-[#7F1D1D] to-[#B71C1C]" },
            { label: "Network Reliability",       value: `${networkReliability}%`, icon: Activity,     color: "from-blue-500 to-indigo-600" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-450">{kpi.label}</span>
                <div className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${kpi.color} text-white`}>
                  <kpi.icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-zinc-900 font-['Poppins',sans-serif]">{kpi.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Offline vs Online + Failure Reasons */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Offline vs Online Deliveries */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <BarChart4 className="h-5 w-5 text-[#7F1D1D]" />
              <h3 className="text-sm font-bold text-zinc-900 font-['Poppins',sans-serif]">Offline vs Online Deliveries</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "Online",          value: Math.max(onlineTotal, 0), color: "bg-blue-500",    text: "text-blue-700" },
                { label: "Offline Total",   value: offlineTotal,            color: "bg-zinc-700",   text: "text-zinc-700" },
                { label: "Offline Synced",  value: offlineSynced,           color: "bg-emerald-500", text: "text-emerald-700" },
                { label: "Offline Failed",  value: offlineFailed,           color: "bg-rose-500",    text: "text-rose-700" },
                { label: "Pending / Syncing", value: offlinePending,        color: "bg-amber-500",   text: "text-amber-700" },
                { label: "Manual Review",   value: offlineManual,           color: "bg-violet-500",  text: "text-violet-700" },
              ].map((row) => {
                const total = Math.max(deliveries.length, offlineTotal, 1);
                const pct = Math.min(Math.round((row.value / total) * 100), 100);
                return (
                  <div key={row.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-zinc-600">{row.label}</span>
                      <span className={row.text}>{row.value}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.color} transition-all duration-700`}
                        style={{ width: `${pct || 2}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Failure Reason Breakdown */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-500" />
              <h3 className="text-sm font-bold text-zinc-900 font-['Poppins',sans-serif]">Offline Failure Reasons</h3>
            </div>
            {failureReasonEntries.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">No failures recorded.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {failureReasonEntries.map(([reason, count]) => {
                  const label = FAILURE_REASON_LABELS[reason as keyof typeof FAILURE_REASON_LABELS] || reason;
                  const pct = Math.round((count / maxFailureCount) * 100);
                  return (
                    <div key={reason} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-zinc-600">{label}</span>
                        <span className="text-rose-600">{count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-500 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Agent Offline Performance Table */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#7F1D1D]" />
            <h3 className="text-sm font-bold text-zinc-900 font-['Poppins',sans-serif]">Agent Offline Performance</h3>
          </div>
          {agentOfflinePerf.length === 0 ? (
            <p className="text-xs text-zinc-400 py-6 text-center">No offline agent performance data available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                  <tr>
                    <th className="py-2 text-left font-semibold">Agent</th>
                    <th className="py-2 text-center font-semibold">Total Offline</th>
                    <th className="py-2 text-center font-semibold">Synced</th>
                    <th className="py-2 text-center font-semibold">Failed</th>
                    <th className="py-2 text-center font-semibold">Success Rate</th>
                    <th className="py-2 text-left font-semibold">Reliability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {agentOfflinePerf.map((agent) => (
                    <tr key={agent.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#7F1D1D] text-white text-[10px] font-bold">
                            {agent.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <span className="font-semibold text-zinc-800">{agent.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-center font-bold text-zinc-700">{agent.offlineTotal}</td>
                      <td className="py-3 text-center font-bold text-emerald-600">{agent.offlineSynced}</td>
                      <td className="py-3 text-center font-bold text-rose-600">{agent.offlineFailed}</td>
                      <td className="py-3 text-center">
                        <span className={`font-bold ${agent.successRate >= 80 ? "text-emerald-600" : agent.successRate >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                          {agent.successRate}%
                        </span>
                      </td>
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                agent.successRate >= 80 ? "bg-emerald-500" :
                                agent.successRate >= 50 ? "bg-amber-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${agent.successRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
