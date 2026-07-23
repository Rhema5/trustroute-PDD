import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle,
  Clock,
  Upload,
  AlertCircle,
  FileText,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";
import { useApp } from "@/store/app-store";
import { toast } from "sonner";
import { getPendingSyncItems, type PendingSyncItem } from "@/lib/offline-store";

export const Route = createFileRoute("/agent/sync")({
  component: SyncStatus,
});

function SyncStatus() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [items, setItems] = React.useState<PendingSyncItem[]>([]);
  const [sessionCompletedCount, setSessionCompletedCount] = React.useState(0);

  // Connect to global Zustand store states and actions
  const syncState = useApp((s) => s.syncState);
  const syncProgress = useApp((s) => s.syncProgress);
  const triggerAutoSync = useApp((s) => s.triggerAutoSync);

  const loadPendingItems = React.useCallback(async () => {
    try {
      const queued = await getPendingSyncItems();
      setItems(queued);
    } catch (err) {
      console.error("Failed to load offline items:", err);
    }
  }, []);

  React.useEffect(() => {
    loadPendingItems();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadPendingItems]);

  // Track state changes to count session completions
  React.useEffect(() => {
    const prevCount = items.length;
    loadPendingItems().then(() => {
      if (syncState === "success" && prevCount > 0) {
        setSessionCompletedCount((c) => c + prevCount);
      }
    });
  }, [syncState, loadPendingItems]);

  const handleStartSync = async () => {
    if (!isOnline) {
      toast.error("You are currently offline. Connect to internet to sync.");
      return;
    }
    if (items.length === 0) {
      toast.info("No items in queue to sync.");
      return;
    }
    toast.promise(triggerAutoSync(), {
      loading: "Initiating background sync...",
      success: "Sync completed!",
      error: "Sync execution encountered errors.",
    });
  };

  const getSyncStatusUI = () => {
    if (syncState === "syncing") {
      return {
        title: "Synchronizing",
        desc: "Uploading offline deliveries to secure servers...",
        colorClass: "bg-blue-950/20 border-blue-500/25 text-blue-400",
        icon: <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />,
      };
    }
    if (syncState === "success") {
      return {
        title: "Successfully Synced",
        desc: "All offline deliveries synchronized successfully!",
        colorClass: "bg-emerald-950/20 border-emerald-500/25 text-emerald-400",
        icon: <CheckCircle className="h-5 w-5 text-emerald-400" />,
      };
    }
    if (syncState === "failed") {
      return {
        title: "Synchronization Failed",
        desc: "Errors occurred during sync. Remaining items will retry.",
        colorClass: "bg-rose-950/20 border-rose-500/25 text-rose-400",
        icon: <AlertCircle className="h-5 w-5 text-rose-450" />,
      };
    }
    if (items.length > 0) {
      return {
        title: "Pending Sync",
        desc: `${items.length} delivery records waiting in offline queue.`,
        colorClass: "bg-amber-950/20 border-amber-500/25 text-amber-400",
        icon: <Clock className="h-5 w-5 text-amber-400" />,
      };
    }
    return {
      title: "Queue Empty",
      desc: "All delivery handoffs are successfully synced.",
      colorClass: "bg-zinc-900/40 border-zinc-800 text-zinc-400",
      icon: <CheckCircle className="h-5 w-5 text-emerald-400" />,
    };
  };

  const statusUI = getSyncStatusUI();

  const pendingCount = items.filter((x) => !x.error).length;
  const failedCount = items.filter((x) => x.error).length;

  return (
    <div className="space-y-6 text-left text-zinc-300">
      {/* Header section */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-[#FF4D4D] uppercase font-bold tracking-widest block">
            Offline Sync Center
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
            Operational Sync Workspace
          </h1>
          <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
            Verify cached offline transactions, inspect sync details, and upload evidence.
          </p>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${isOnline ? "bg-green-950/20 text-green-400 border-green-500/25" : "bg-orange-950/20 text-orange-400 border-orange-550/20"}`}
        >
          {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isOnline ? "Online" : "Offline"}
        </div>
      </header>

      {/* Sync Status Banner */}
      <div className={`border rounded-2xl p-5 flex gap-3.5 ${statusUI.colorClass}`}>
        <div className="mt-0.5 shrink-0">{statusUI.icon}</div>
        <div className="flex-1">
          <p className="text-sm font-bold">{statusUI.title}</p>
          <p className="text-xs mt-1 leading-relaxed opacity-90">{statusUI.desc}</p>
        </div>
      </div>

      {/* Overall Progress for sync */}
      {syncState === "syncing" && (
        <div className="bg-[#0F1424] border border-zinc-850 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Syncing Progress</p>
            <p className="text-sm font-bold text-[#FF4D4D]">{syncProgress}%</p>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-[#B71C1C] to-red-500 h-2.5 rounded-full transition-all duration-300 shadow-glow"
              style={{ width: `${syncProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Cards Statistics Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Pending Card */}
        <div className="bg-[#0F1424] border border-zinc-850 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-800 transition">
          <div className="flex items-center justify-between text-zinc-550">
            <span className="text-[9px] uppercase font-bold tracking-wider">Pending</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{pendingCount}</div>
            <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Awaiting Sync</p>
          </div>
        </div>

        {/* Syncing Card */}
        <div className="bg-[#0F1424] border border-zinc-850 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-800 transition">
          <div className="flex items-center justify-between text-zinc-550">
            <span className="text-[9px] uppercase font-bold tracking-wider">Syncing</span>
            <RefreshCw className="h-4 w-4 text-blue-500 animate-pulse" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {syncState === "syncing" ? "1" : "0"}
            </div>
            <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Active Syncs</p>
          </div>
        </div>

        {/* Failed Card */}
        <div className="bg-[#0F1424] border border-zinc-850 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-800 transition">
          <div className="flex items-center justify-between text-zinc-550">
            <span className="text-[9px] uppercase font-bold tracking-wider">Failed</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-500">{failedCount}</div>
            <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Sync Errors</p>
          </div>
        </div>

        {/* Manual Review Card */}
        <div className="bg-[#0F1424] border border-zinc-850 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-800 transition">
          <div className="flex items-center justify-between text-zinc-550">
            <span className="text-[9px] uppercase font-bold tracking-wider">Manual Review</span>
            <ShieldCheck className="h-4 w-4 text-violet-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">0</div>
            <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Escalations</p>
          </div>
        </div>

        {/* Completed Card */}
        <div className="bg-[#0F1424] border border-zinc-850 p-4 rounded-xl flex flex-col justify-between hover:border-zinc-800 transition">
          <div className="flex items-center justify-between text-zinc-550">
            <span className="text-[9px] uppercase font-bold tracking-wider">Completed</span>
            <FileCheck2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400">{sessionCompletedCount}</div>
            <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Session Uploads</p>
          </div>
        </div>
      </div>

      {/* Grid: Queue detail items list and operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Sync Queue items list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-450">Sync Queue List</h3>
          {items.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0F1424] border border-dashed border-zinc-800">
              <CheckCircle className="mx-auto h-10 w-10 text-emerald-500 mb-3" />
              <p className="text-sm font-semibold text-zinc-300">All local items synced</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                IndexedDB is empty. All deliveries attested while offline have been successfully synced to the cloud databases.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#0F1424] border border-zinc-850 rounded-2xl p-4.5 flex items-center gap-4 hover:border-zinc-800 transition shadow-sm"
                >
                  <div className="w-10 h-10 bg-red-950/20 rounded-xl flex items-center justify-center shrink-0 border border-red-950">
                    <FileText className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">Delivery Proof Signature</p>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">ID: {item.id}</p>
                    {item.error && (
                      <p className="text-[10px] text-rose-450 mt-1 leading-normal font-semibold">
                        Error: {item.error}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      item.error
                        ? "bg-rose-950/20 text-rose-400 border-rose-500/25"
                        : "bg-amber-950/20 text-amber-400 border-amber-500/25"
                    }`}
                  >
                    {item.error ? "Failed" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Sync controls & notes */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-450">Operations</h3>

          <div className="bg-[#0F1424] border border-zinc-850 rounded-2xl p-5 space-y-4">
            <div>
              <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Cloud Upload</span>
              <h4 className="text-sm font-bold text-white mt-1">Manual Trigger Controls</h4>
              <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
                Manually push cached verification receipts to the Firestore server.
              </p>
            </div>

            {/* Offline warning banner */}
            {!isOnline && (
              <div className="bg-orange-950/10 border border-orange-500/10 rounded-xl p-4 flex gap-3 text-orange-400 text-xs leading-relaxed">
                <WifiOff className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Offline Status Active</span>
                  Device cannot contact TrustRoute servers. The system automatically syncs queue items as soon as connectivity is restored.
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={handleStartSync}
                disabled={!isOnline || syncState === "syncing" || items.length === 0}
                className="w-full bg-gradient-to-r from-[#B71C1C] to-red-600 hover:opacity-90 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition shadow-glow disabled:opacity-30 cursor-pointer"
              >
                {syncState === "syncing" ? (
                  <>
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" /> Synchronizing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4.5 w-4.5" /> Start Sync Queue
                  </>
                )}
              </button>

              <button
                onClick={() => navigate({ to: "/agent" })}
                className="w-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-bold py-3.5 rounded-xl transition cursor-pointer text-xs"
              >
                Back to Route Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
