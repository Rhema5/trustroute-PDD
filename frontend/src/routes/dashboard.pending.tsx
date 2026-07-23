import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, UserCheck, UserX, UserPlus, Inbox, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/pending")({
  head: () => ({ meta: [{ title: "User Management — TrustRoute" }] }),
  component: PendingApprovalsPage,
});

function PendingApprovalsPage() {
  const pendingUsers = useApp((s) => s.pendingUsers);
  const fetchPending = useApp((s) => s.fetchPendingUsers);
  const agents = useApp((s) => s.agents);
  const fetchAgents = useApp((s) => s.fetchAgents);
  const approve = useApp((s) => s.approveUser);
  const reject = useApp((s) => s.rejectUser);
  
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [filterRegion, setFilterRegion] = useState<string>("All Regions");

  const filteredPending = filterRegion === "All Regions" ? pendingUsers : pendingUsers.filter(u => u.region === filterRegion);
  const filteredAgents = filterRegion === "All Regions" ? agents : agents.filter(u => u.region === filterRegion);

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchPending(), fetchAgents()]);
      setLoading(false);
    };
    load();
  }, [fetchPending, fetchAgents]);

  const handleApprove = async (uid: string, role: "agent" | "owner") => {
    setActioningId(uid);
    try {
      await approve(uid, role);
      toast.success(`User successfully approved as ${role === "owner" ? "Enterprise Owner" : "Field Agent"}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve user.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (uid: string) => {
    setActioningId(uid);
    try {
      await reject(uid);
      toast.success("User registration application denied.");
    } catch (err: any) {
      toast.error(err.message || "Failed to deny application.");
    } finally {
      setActioningId(null);
    }
  };

  const handleRevoke = async (uid: string) => {
    setActioningId(uid);
    try {
      await reject(uid);
      toast.success("User access has been revoked.");
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke access.");
    } finally {
      setActioningId(null);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      if (typeof date === 'object' && date.seconds) {
        return new Date(date.seconds * 1000).toLocaleString();
      }
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#7F1D1D]" />
          <p className="mt-2 text-sm text-zinc-500">Retrieving registrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-850 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-zinc-900 font-['Poppins',sans-serif]">
          Access Management
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Review pending registrations and manage approved users.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("pending")}
          className={cn(
            "pb-3 px-1 text-sm font-semibold transition-colors border-b-2",
            activeTab === "pending"
              ? "border-[#7F1D1D] text-[#7F1D1D]"
              : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
          )}
        >
          <div className="flex items-center gap-2">
            Pending
            {filteredPending.length > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#7F1D1D] text-white text-[10px] font-bold">
                {filteredPending.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={cn(
            "pb-3 px-1 text-sm font-semibold transition-colors border-b-2",
            activeTab === "approved"
              ? "border-[#7F1D1D] text-[#7F1D1D]"
              : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
          )}
        >
          <div className="flex items-center gap-2">
            Approved
            {filteredAgents.length > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-bold">
                {filteredAgents.length}
              </span>
            )}
          </div>
        </button>
        </div>
        <div>
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 outline-none hover:border-zinc-300 focus:border-[#7F1D1D]"
          >
            <option value="All Regions">All Regions</option>
            <option value="Chennai">Chennai</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Delhi">Delhi</option>
            <option value="Hyderabad">Hyderabad</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-zinc-200/80 p-6 shadow-sm">
        <AnimatePresence mode="wait">
          {activeTab === "pending" && filteredPending.length === 0 ? (
            <motion.div
              key="empty-pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 font-['Poppins',sans-serif]">
                All Caught Up!
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                No user registrations are currently awaiting administrator credentials.
              </p>
            </motion.div>
          ) : activeTab === "approved" && filteredAgents.length === 0 ? (
            <motion.div
              key="empty-approved"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 font-['Poppins',sans-serif]">
                No Approved Users
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                There are currently no approved users in the system.
              </p>
            </motion.div>
          ) : activeTab === "pending" ? (
            <motion.div key="list-pending" className="divide-y divide-zinc-100">
              {filteredPending.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-[200px]">
                    <div className="font-bold text-zinc-800 text-sm flex items-center gap-2">
                      {u.name}
                      {u.region && (
                        <span className="text-[9px] uppercase tracking-wider font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200">
                          {u.region}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">{u.email}</div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      Registered: {formatDate(u.createdAt)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={actioningId !== null}
                      onClick={() => handleApprove(u.id, "agent")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-3.5 py-2 text-xs font-bold text-zinc-700 transition cursor-pointer disabled:opacity-50"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Approve Agent
                    </button>
                    <button
                      disabled={actioningId !== null}
                      onClick={() => handleApprove(u.id, "owner")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-3.5 py-2 text-xs font-bold text-zinc-700 transition cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      Approve Admin
                    </button>
                    <button
                      disabled={actioningId !== null}
                      onClick={() => handleReject(u.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 text-xs font-bold text-rose-700 transition cursor-pointer disabled:opacity-50"
                    >
                      <UserX className="h-3.5 w-3.5 text-rose-600" />
                      Deny Access
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="list-approved" className="divide-y divide-zinc-100">
              {filteredAgents.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-[200px]">
                    <div className="font-bold text-zinc-800 text-sm flex items-center gap-2">
                      {u.name}
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      {u.region && (
                        <span className="text-[9px] uppercase tracking-wider font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200">
                          {u.region}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">{u.email}</div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 capitalize border border-zinc-200">
                      {u.role || "Agent"}
                    </span>
                    <button
                      disabled={actioningId !== null}
                      onClick={() => handleRevoke(u.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-[10px] font-bold text-rose-700 transition cursor-pointer disabled:opacity-50 ml-2"
                    >
                      <UserX className="h-3 w-3 text-rose-600" />
                      Decline
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
