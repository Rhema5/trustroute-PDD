import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  WifiOff,
  Wifi,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Trash2,
  X,
  UserCheck,
  FileDown,
  ShieldAlert,
  Upload,
  MapPin,
  Camera,
  KeyRound,
  Monitor,
  Activity,
  TrendingUp,
  Timer,
  BadgeCheck,
  ChevronRight,
  ClipboardList,
  GitBranch,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  ArrowUpRight,
  Shield,
  Zap,
} from "lucide-react";
import { useApp } from "@/store/app-store";
import { FAILURE_REASON_LABELS, type OfflineQueueItem } from "@/lib/offline-queue-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/offline")({
  head: () => ({ meta: [{ title: "Offline Operations Center — TrustRoute" }] }),
  component: OfflineOperationsCenter,
});

// ─── Tab Types ─────────────────────────────────────────────────
type Tab = "pending" | "synced" | "failed" | "manual";

// ─── Status Badge Component ────────────────────────────────────
function StatePill({ state }: { state: OfflineQueueItem["state"] }) {
  const config: Record<string, { label: string; className: string }> = {
    pending:       { label: "Pending",        className: "bg-amber-50 text-amber-700 border-amber-200" },
    syncing:       { label: "Syncing…",       className: "bg-blue-50 text-blue-700 border-blue-200 animate-pulse" },
    synced:        { label: "Synced",         className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    failed:        { label: "Failed",         className: "bg-rose-50 text-rose-700 border-rose-200" },
    manual_review: { label: "Manual Review",  className: "bg-violet-50 text-violet-700 border-violet-200" },
    cancelled:     { label: "Cancelled",      className: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  };
  const c = config[state] ?? config.pending;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border", c.className)}>
      {c.label}
    </span>
  );
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {ok
        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        : <XCircle className="h-3.5 w-3.5 text-rose-500" />}
      <span className={ok ? "text-emerald-700" : "text-rose-600"}>{label}</span>
    </div>
  );
}

function FailureBadge({ reason }: { reason?: string }) {
  if (!reason) return null;
  const label = FAILURE_REASON_LABELS[reason as keyof typeof FAILURE_REASON_LABELS] || reason;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
      {label}
    </span>
  );
}

// ─── KPI Widget ────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, accent, delay,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm hover:-translate-y-0.5 transition-transform"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-450">{label}</span>
        <div className={cn("grid h-8 w-8 place-items-center rounded-lg text-white", accent)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-extrabold text-zinc-900 font-['Poppins',sans-serif]">{value}</div>
      {sub && <div className="text-[10px] text-zinc-400 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

// ─── Audit Timeline ────────────────────────────────────────────
function AuditTimeline({ history }: { history?: OfflineQueueItem["auditHistory"] }) {
  if (!history || history.length === 0) {
    return <p className="text-xs text-zinc-400 py-3 text-center">No audit history yet.</p>;
  }
  return (
    <div className="space-y-2">
      {[...history].reverse().map((entry, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="mt-0.5 h-5 w-5 shrink-0 grid place-items-center rounded-full bg-zinc-100 border border-zinc-200">
            <GitBranch className="h-2.5 w-2.5 text-zinc-500" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-700 capitalize">
              {entry.action.replace(/_/g, " ")}
            </div>
            <div className="text-[10px] text-zinc-400">
              {entry.performedByName} · {new Date(entry.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
function OfflineOperationsCenter() {
  const [activeTab, setActiveTab] = React.useState<Tab>("pending");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const offlineQueue = useApp((s) => s.offlineQueue);
  const role = useApp((s) => s.role);

  const retryOfflineSync      = useApp((s) => s.retryOfflineSync);
  const cancelOfflineSync     = useApp((s) => s.cancelOfflineSync);
  const deleteOfflineQueueEntry = useApp((s) => s.deleteOfflineQueueEntry);
  const approveManualReview   = useApp((s) => s.approveManualReview);
  const rejectManualReview    = useApp((s) => s.rejectManualReview);
  const requestResubmission   = useApp((s) => s.requestResubmission);
  const escalateManualReview  = useApp((s) => s.escalateManualReview);
  const markForManualReview   = useApp((s) => s.markForManualReview);
  const downloadEvidence      = useApp((s) => s.downloadEvidence);

  const isOwner = role === "owner";

  // ─── Derived Data ─────────────────────────────────────────────
  const pendingItems  = offlineQueue.filter((q) => q.state === "pending" || q.state === "syncing");
  const syncedItems   = offlineQueue.filter((q) => q.state === "synced");
  const failedItems   = offlineQueue.filter((q) => q.state === "failed");
  const manualItems   = offlineQueue.filter((q) => q.state === "manual_review");

  // KPI calculations
  const today = new Date().toDateString();
  const syncedToday    = syncedItems.filter((q) => q.syncCompletedTime && new Date(q.syncCompletedTime).toDateString() === today).length;
  const offlineToday   = offlineQueue.filter((q) => q.createdTime && new Date(q.createdTime).toDateString() === today).length;
  const currentlySyncing = offlineQueue.filter((q) => q.state === "syncing").length;

  const avgSyncMs = syncedItems.length > 0
    ? syncedItems.reduce((acc, q) => acc + (q.syncDuration || 0), 0) / syncedItems.length
    : 0;
  const avgSyncSec = avgSyncMs > 0 ? `${(avgSyncMs / 1000).toFixed(1)}s` : "—";

  const longestPending = pendingItems.reduce<OfflineQueueItem | null>((oldest, q) => {
    if (!oldest) return q;
    return new Date(q.createdTime) < new Date(oldest.createdTime) ? q : oldest;
  }, null);
  const longestPendingDur = longestPending
    ? `${Math.round((Date.now() - new Date(longestPending.createdTime).getTime()) / 60000)}m`
    : "—";

  const totalResolvable = syncedItems.length + failedItems.length;
  const successRate = totalResolvable > 0
    ? `${Math.round((syncedItems.length / totalResolvable) * 100)}%`
    : "—";

  // ─── Action Handlers ──────────────────────────────────────────
  const handle = (fn: (id: string) => Promise<void>, id: string, label: string) => {
    toast.promise(fn(id), {
      loading: `${label}…`,
      success: `${label} successful.`,
      error: `${label} failed.`,
    });
  };

  // ─── Tab Config ───────────────────────────────────────────────
  const tabs: { id: Tab; label: string; count: number; icon: React.ElementType; accent: string }[] = [
    { id: "pending",  label: "Pending Queue",    count: pendingItems.length,  icon: Clock,         accent: "text-amber-600" },
    { id: "synced",   label: "Synced",           count: syncedItems.length,   icon: CheckCircle2,  accent: "text-emerald-600" },
    { id: "failed",   label: "Failed",           count: failedItems.length,   icon: XCircle,       accent: "text-rose-600" },
    { id: "manual",   label: "Manual Review",    count: manualItems.length,   icon: ShieldAlert,   accent: "text-violet-600" },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-zinc-900 font-['Poppins',sans-serif] flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#7F1D1D] to-[#B71C1C] text-white">
                <WifiOff className="h-5 w-5" />
              </div>
              Offline Operations Center
            </h1>
            <p className="text-sm text-zinc-500 mt-1 ml-11.5">
              Real-time monitoring of every offline delivery — from capture to verification.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live · Firestore Realtime
          </div>
        </div>
      </motion.div>

      {/* KPI Widgets */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pending Offline Deliveries" value={pendingItems.length}  sub="Awaiting sync"          icon={Clock}       accent="bg-gradient-to-br from-amber-500 to-orange-600"   delay={0.00} />
        <KpiCard label="Currently Syncing"          value={currentlySyncing}    sub="Active uploads"         icon={Upload}      accent="bg-gradient-to-br from-blue-500 to-indigo-600"    delay={0.04} />
        <KpiCard label="Failed Sync"                value={failedItems.length}  sub="Needs attention"        icon={XCircle}     accent="bg-gradient-to-br from-rose-600 to-red-700"       delay={0.08} />
        <KpiCard label="Successfully Synced Today"  value={syncedToday}         sub="Completed handoffs"     icon={BadgeCheck}  accent="bg-gradient-to-br from-emerald-500 to-teal-600"   delay={0.12} />
        <KpiCard label="Average Sync Time"          value={avgSyncSec}          sub="Per delivery"           icon={Timer}       accent="bg-gradient-to-br from-[#7F1D1D] to-[#B71C1C]"   delay={0.16} />
        <KpiCard label="Offline Deliveries Today"   value={offlineToday}        sub="Captured offline"       icon={WifiOff}     accent="bg-gradient-to-br from-zinc-700 to-zinc-900"      delay={0.20} />
        <KpiCard label="Longest Pending"            value={longestPendingDur}   sub="Oldest pending item"    icon={Activity}    accent="bg-gradient-to-br from-violet-500 to-purple-700"  delay={0.24} />
        <KpiCard label="Verification Success Rate"  value={successRate}         sub="Offline deliveries"     icon={TrendingUp}  accent="bg-gradient-to-br from-teal-500 to-cyan-600"      delay={0.28} />
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`offline-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer",
              activeTab === tab.id
                ? "bg-white border-zinc-300 shadow-sm text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100",
            )}
          >
            <tab.icon className={cn("h-4 w-4", tab.accent)} />
            {tab.label}
            <span className={cn(
              "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
              activeTab === tab.id ? "bg-zinc-100 text-zinc-700" : "bg-zinc-100/50 text-zinc-400",
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ─── TAB 1: Pending Offline Queue ──────────────────────── */}
        {activeTab === "pending" && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 bg-zinc-50/60">
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-amber-500" />
                <h2 className="text-sm font-bold text-zinc-900 font-['Poppins',sans-serif]">
                  Pending Offline Queue
                </h2>
                <span className="text-xs text-zinc-400 font-medium">— deliveries awaiting sync</span>
              </div>
            </div>
            {pendingItems.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-zinc-500">No pending deliveries in queue.</p>
                <p className="text-xs text-zinc-400 mt-1">All offline deliveries have been synced.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-50/50 border-b border-zinc-100">
                    <tr>
                      <th className="p-4 text-left font-semibold">Delivery ID</th>
                      <th className="p-4 text-left font-semibold">Customer</th>
                      <th className="p-4 text-left font-semibold">Agent</th>
                      <th className="p-4 text-left font-semibold">Created</th>
                      <th className="p-4 text-left font-semibold">Offline Captured</th>
                      <th className="p-4 text-left font-semibold">Signals</th>
                      <th className="p-4 text-left font-semibold">Attempts</th>
                      <th className="p-4 text-left font-semibold">Device</th>
                      <th className="p-4 text-left font-semibold">Network</th>
                      <th className="p-4 text-left font-semibold">Queue#</th>
                      <th className="p-4 text-left font-semibold">State</th>
                      <th className="p-4 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {pendingItems.map((item, i) => (
                      <React.Fragment key={item.id}>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-zinc-50/40 transition-colors"
                        >
                          <td className="p-4">
                            <div className="font-mono text-xs font-bold text-zinc-500">{item.id.slice(0, 10)}…</div>
                          </td>
                          <td className="p-4 font-semibold text-zinc-800 text-xs">{item.customer || "—"}</td>
                          <td className="p-4 text-xs text-zinc-600">{item.agentName || "—"}</td>
                          <td className="p-4 text-xs text-zinc-500">
                            {item.createdTime ? new Date(item.createdTime).toLocaleString() : "—"}
                          </td>
                          <td className="p-4 text-xs text-zinc-500">
                            {item.offlineCaptureTime ? new Date(item.offlineCaptureTime).toLocaleString() : "—"}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-0.5">
                              <StatusDot ok={item.gpsStatus === "captured"} label="GPS" />
                              <StatusDot ok={item.photoStatus === "captured"} label="Photo" />
                              <StatusDot ok={item.otpStatus === "captured"} label="OTP" />
                            </div>
                          </td>
                          <td className="p-4 text-xs text-zinc-600 text-center">{item.syncAttempts}</td>
                          <td className="p-4 text-xs text-zinc-500 max-w-[120px] truncate">{item.deviceName || "—"}</td>
                          <td className="p-4">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                              item.networkStatus === "online"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-orange-50 text-orange-700",
                            )}>
                              {item.networkStatus === "online" ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                              {item.networkStatus || "unknown"}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-bold text-zinc-500 text-center">#{item.queuePosition}</td>
                          <td className="p-4"><StatePill state={item.state} /></td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <button
                                id={`pending-view-${item.id}`}
                                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                className="grid h-7 w-7 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 transition cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                id={`pending-retry-${item.id}`}
                                onClick={() => handle(retryOfflineSync, item.id, "Retry sync")}
                                className="grid h-7 w-7 place-items-center rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 transition cursor-pointer"
                                title="Retry Sync"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                id={`pending-cancel-${item.id}`}
                                onClick={() => handle(cancelOfflineSync, item.id, "Cancel sync")}
                                className="grid h-7 w-7 place-items-center rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                                title="Cancel Sync"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                              {isOwner && (
                                <button
                                  id={`pending-delete-${item.id}`}
                                  onClick={() => handle(deleteOfflineQueueEntry, item.id, "Delete queue item")}
                                  className="grid h-7 w-7 place-items-center rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-red-50 text-zinc-400 hover:text-rose-600 transition cursor-pointer"
                                  title="Delete Queue Item (Owner Only)"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                        {expandedId === item.id && (
                          <tr>
                            <td colSpan={12} className="bg-zinc-50/80 px-6 py-4 border-b border-zinc-100">
                              <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                  <p className="text-xs font-bold text-zinc-600 mb-2 uppercase tracking-wider">Proof Details</p>
                                  <div className="space-y-1 text-xs text-zinc-600">
                                    <p><span className="font-semibold">GPS:</span> {item.proof?.gps ? `${item.proof.gps.lat.toFixed(4)}, ${item.proof.gps.lng.toFixed(4)}` : "Not captured"}</p>
                                    <p><span className="font-semibold">OTP:</span> {item.proof?.otp || "—"}</p>
                                    <p><span className="font-semibold">Hash:</span> <span className="font-mono text-[10px]">{item.proof?.hash?.slice(0, 20) || "—"}…</span></p>
                                    <p><span className="font-semibold">Verified At:</span> {item.proof?.verifiedAt ? new Date(item.proof.verifiedAt).toLocaleString() : "—"}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-zinc-600 mb-2 uppercase tracking-wider">Device</p>
                                  <div className="space-y-1 text-xs text-zinc-600">
                                    <p><span className="font-semibold">Device:</span> {item.deviceName || "—"}</p>
                                    <p><span className="font-semibold">Browser:</span> <span className="text-[10px]">{item.browserInfo?.slice(0, 60) || "—"}</span></p>
                                    <p><span className="font-semibold">Offline Duration:</span> {item.offlineDurationMs ? `${Math.round(item.offlineDurationMs / 60000)} min` : "—"}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-zinc-600 mb-2 uppercase tracking-wider">Audit History</p>
                                  <AuditTimeline history={item.auditHistory} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── TAB 2: Successfully Synced ────────────────────────── */}
        {activeTab === "synced" && (
          <motion.div
            key="synced"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4 bg-zinc-50/60">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
              <h2 className="text-sm font-bold text-zinc-900 font-['Poppins',sans-serif]">Successfully Synced Deliveries</h2>
              <span className="text-xs text-zinc-400 font-medium">— verified and complete</span>
            </div>
            {syncedItems.length === 0 ? (
              <div className="py-16 text-center">
                <WifiOff className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-zinc-500">No synced deliveries yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-zinc-400 bg-zinc-50/50 border-b border-zinc-100">
                    <tr>
                      <th className="p-4 text-left font-semibold">Delivery ID</th>
                      <th className="p-4 text-left font-semibold">Agent</th>
                      <th className="p-4 text-left font-semibold">Customer</th>
                      <th className="p-4 text-left font-semibold">Sync Completed</th>
                      <th className="p-4 text-left font-semibold">Verification</th>
                      <th className="p-4 text-left font-semibold">Duration</th>
                      <th className="p-4 text-left font-semibold">GPS</th>
                      <th className="p-4 text-left font-semibold">OTP</th>
                      <th className="p-4 text-left font-semibold">Photo</th>
                      <th className="p-4 text-left font-semibold">Certificate</th>
                      <th className="p-4 text-left font-semibold">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {syncedItems.map((item, i) => (
                      <React.Fragment key={item.id}>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-zinc-50/40 transition-colors"
                        >
                          <td className="p-4 font-mono text-xs font-bold text-zinc-500">{item.id.slice(0, 10)}…</td>
                          <td className="p-4 text-xs text-zinc-700 font-semibold">{item.agentName || "—"}</td>
                          <td className="p-4 text-xs text-zinc-700">{item.customer || "—"}</td>
                          <td className="p-4 text-xs text-zinc-500">
                            {item.syncCompletedTime ? new Date(item.syncCompletedTime).toLocaleString() : "—"}
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                              item.verificationStatus === "verified"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700",
                            )}>
                              {item.verificationStatus === "verified" ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                              {item.verificationStatus || "unknown"}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-zinc-500">
                            {item.syncDuration ? `${(item.syncDuration / 1000).toFixed(1)}s` : "—"}
                          </td>
                          <td className="p-4"><StatusDot ok={!!item.gpsVerification} label="GPS" /></td>
                          <td className="p-4"><StatusDot ok={!!item.otpVerification} label="OTP" /></td>
                          <td className="p-4"><StatusDot ok={!!item.photoVerification} label="Photo" /></td>
                          <td className="p-4">
                            {item.proof?.photoUrl
                              ? <a href={item.proof.photoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />View</a>
                              : <span className="text-xs text-zinc-400">—</span>
                            }
                          </td>
                          <td className="p-4">
                            <button
                              id={`synced-audit-${item.id}`}
                              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-600 transition cursor-pointer"
                            >
                              <ClipboardList className="h-3.5 w-3.5" />
                              Audit Log
                            </button>
                          </td>
                        </motion.tr>
                        {expandedId === item.id && (
                          <tr>
                            <td colSpan={11} className="bg-zinc-50/80 px-6 py-4 border-b border-zinc-100">
                              <p className="text-xs font-bold text-zinc-600 mb-3 uppercase tracking-wider">Audit History</p>
                              <AuditTimeline history={item.auditHistory} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── TAB 3: Failed Sync ────────────────────────────────── */}
        {activeTab === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4 bg-zinc-50/60">
              <XCircle className="h-4.5 w-4.5 text-rose-500" />
              <h2 className="text-sm font-bold text-zinc-900 font-['Poppins',sans-serif]">Failed Offline Synchronization</h2>
              <span className="text-xs text-zinc-400 font-medium">— require intervention</span>
            </div>
            {failedItems.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-zinc-500">No failed deliveries.</p>
              </div>
            ) : (
              <div className="space-y-3 p-5">
                {failedItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl border border-zinc-200 bg-zinc-50/30 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-zinc-600">{item.id.slice(0, 12)}…</span>
                          <FailureBadge reason={item.failureReason} />
                          <span className="text-[10px] text-zinc-400 font-semibold">Retry #{item.retryCount || 0}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                          <span>{item.agentName || "—"}</span>
                          <span>·</span>
                          <span>{item.customer || "—"}</span>
                          <span>·</span>
                          <span>{item.offlineCaptureTime ? new Date(item.offlineCaptureTime).toLocaleString() : "—"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          id={`failed-retry-${item.id}`}
                          onClick={() => handle(retryOfflineSync, item.id, "Retry sync")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-700 transition cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Retry
                        </button>
                        <button
                          id={`failed-reassign-${item.id}`}
                          onClick={() => toast.info("Select an agent from Agents Roster to reassign.")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Reassign
                        </button>
                        <button
                          id={`failed-manual-${item.id}`}
                          onClick={() => handle(markForManualReview, item.id, "Mark for manual review")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 text-xs font-semibold text-violet-700 transition cursor-pointer"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" /> Manual Review
                        </button>
                        <button
                          id={`failed-evidence-${item.id}`}
                          onClick={() => downloadEvidence(item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-600 transition cursor-pointer"
                        >
                          <FileDown className="h-3.5 w-3.5" /> Download Evidence
                        </button>
                      </div>
                    </div>
                    {/* Expand audit */}
                    <button
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-600 flex items-center gap-1 transition cursor-pointer"
                    >
                      <ChevronRight className={cn("h-3 w-3 transition", expandedId === item.id && "rotate-90")} />
                      {expandedId === item.id ? "Hide" : "Show"} audit history
                    </button>
                    {expandedId === item.id && (
                      <div className="pt-2 border-t border-zinc-100">
                        <AuditTimeline history={item.auditHistory} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ─── TAB 4: Manual Verification Queue ─────────────────── */}
        {activeTab === "manual" && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 px-1">
              <ShieldAlert className="h-4.5 w-4.5 text-violet-600" />
              <h2 className="text-sm font-bold text-zinc-900 font-['Poppins',sans-serif]">Manual Verification Queue</h2>
              <span className="text-xs text-zinc-400">— owner review required</span>
            </div>
            {manualItems.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm py-16 text-center">
                <Shield className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-zinc-500">No deliveries pending manual review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {manualItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl border border-violet-200/60 bg-white shadow-sm overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-violet-100/60 bg-violet-50/30">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700">
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-mono text-sm font-bold text-zinc-800">{item.id}</div>
                          <div className="text-xs text-zinc-500">{item.agentName} · {item.customer}</div>
                        </div>
                      </div>
                      <StatePill state={item.state} />
                    </div>

                    {/* Evidence Grid */}
                    <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Proof Image */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <Camera className="h-3 w-3" /> Proof Image
                        </p>
                        {item.proof?.photoUrl ? (
                          <img
                            src={item.proof.photoUrl}
                            alt="Delivery proof"
                            className="w-full h-40 object-cover rounded-xl border border-zinc-200"
                          />
                        ) : (
                          <div className="w-full h-40 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 grid place-items-center">
                            <p className="text-xs text-zinc-400">No photo captured</p>
                          </div>
                        )}
                      </div>

                      {/* GPS + Timestamps */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" /> GPS & Timestamps
                        </p>
                        <div className="space-y-2 text-xs text-zinc-600">
                          <div className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-100">
                            <p className="text-[10px] font-semibold text-zinc-400 mb-0.5">GPS Coordinates</p>
                            <p className="font-mono font-bold text-zinc-800">
                              {item.proof?.gps ? `${item.proof.gps.lat.toFixed(5)}, ${item.proof.gps.lng.toFixed(5)}` : "Not available"}
                            </p>
                          </div>
                          <div className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-100">
                            <p className="text-[10px] font-semibold text-zinc-400 mb-0.5">Capture Timestamp</p>
                            <p className="font-bold text-zinc-800">{item.offlineCaptureTime ? new Date(item.offlineCaptureTime).toLocaleString() : "—"}</p>
                          </div>
                          <div className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-100">
                            <p className="text-[10px] font-semibold text-zinc-400 mb-0.5">QR / OTP Code</p>
                            <p className="font-mono text-lg font-extrabold text-violet-700 tracking-widest">
                              {item.proof?.otp || "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Device + Audit */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <Monitor className="h-3 w-3" /> Device & Audit
                        </p>
                        <div className="space-y-2 text-xs text-zinc-600">
                          <div className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-100">
                            <p className="text-[10px] font-semibold text-zinc-400 mb-0.5">Device Name</p>
                            <p className="font-semibold text-zinc-800">{item.deviceName || "—"}</p>
                          </div>
                          <div className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-100">
                            <p className="text-[10px] font-semibold text-zinc-400 mb-0.5">Browser / UA</p>
                            <p className="text-[10px] text-zinc-600 leading-tight truncate">{item.browserInfo?.slice(0, 80) || "—"}</p>
                          </div>
                          <div className="bg-zinc-50 rounded-lg p-2.5 border border-zinc-100">
                            <p className="text-[10px] font-semibold text-zinc-400 mb-0.5">Offline Duration</p>
                            <p className="font-semibold text-zinc-800">
                              {item.offlineDurationMs ? `${Math.round(item.offlineDurationMs / 60000)} min` : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Audit History (collapsed) */}
                    <div className="px-5 pb-3">
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-600 flex items-center gap-1 transition cursor-pointer"
                      >
                        <ChevronRight className={cn("h-3 w-3 transition", expandedId === item.id && "rotate-90")} />
                        {expandedId === item.id ? "Hide" : "Show"} full audit history
                      </button>
                      {expandedId === item.id && (
                        <div className="mt-3 pt-3 border-t border-zinc-100">
                          <AuditTimeline history={item.auditHistory} />
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    {isOwner && (
                      <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-zinc-100 bg-zinc-50/50">
                        <button
                          id={`manual-approve-${item.id}`}
                          onClick={() => handle(approveManualReview, item.id, "Approve delivery")}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          id={`manual-reject-${item.id}`}
                          onClick={() => handle(rejectManualReview, item.id, "Reject delivery")}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" /> Reject
                        </button>
                        <button
                          id={`manual-resubmit-${item.id}`}
                          onClick={() => handle(requestResubmission, item.id, "Request resubmission")}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Request Resubmission
                        </button>
                        <button
                          id={`manual-reassign-${item.id}`}
                          onClick={() => toast.info("Select an agent from Agents Roster to reassign.")}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Reassign
                        </button>
                        <button
                          id={`manual-escalate-${item.id}`}
                          onClick={() => handle(escalateManualReview, item.id, "Escalate for review")}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-700 transition cursor-pointer"
                        >
                          <Zap className="h-3.5 w-3.5" /> Escalate
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
