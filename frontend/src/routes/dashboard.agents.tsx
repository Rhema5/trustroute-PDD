import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Shield,
  Star,
  Truck,
  MoreVertical,
  RefreshCw,
  UserMinus,
  ArrowRightLeft,
  Search,
  Loader2,
  Inbox,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/agents")({
  head: () => ({ meta: [{ title: "Agents Roster — TrustRoute" }] }),
  component: AgentsRosterPage,
});

function AgentsRosterPage() {
  const agents = useApp((s) => s.agents);
  const deliveries = useApp((s) => s.deliveries);
  const fetchAgents = useApp((s) => s.fetchAgents);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      await fetchAgents();
      setLoading(false);
    };
    load();
  }, [fetchAgents]);

  const claimAgent = async () => {
    const email = window.prompt("Enter the email address of the agent you want to claim:");
    if (!email) return;

    try {
      const q = query(collection(db, "users"), where("email", "==", email.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast.error("No agent found with that email address.");
        return;
      }
      
      const agentDoc = snap.docs[0];
      const currentRole = agentDoc.data().role;
      if (currentRole === "owner") {
        toast.error("Cannot claim an enterprise owner.");
        return;
      }

      const currentUser = useApp.getState().user;
      if (!currentUser) return;

      await updateDoc(doc(db, "users", agentDoc.id), {
        enterpriseId: currentUser.uid,
        role: "agent",
        active: true,
        status: "available"
      });
      
      toast.success(`Successfully claimed agent: ${agentDoc.data().name || email}`);
      await fetchAgents();
    } catch (err) {
      console.error(err);
      toast.error("Failed to claim agent. They might already be active on another enterprise.");
    }
  };

  // Compute per-agent stats from deliveries
  const agentStats = agents.map((agent) => {
    const agentDeliveries = deliveries.filter((d) => d.agentId === agent.id);
    const completed = agentDeliveries.filter((d) => d.status === "delivered").length;
    const active = agentDeliveries.filter(
      (d) => d.status === "in_progress" || d.status === "assigned"
    ).length;
    const failed = agentDeliveries.filter((d) => d.status === "failed").length;
    const total = agentDeliveries.length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      ...agent,
      completed,
      active,
      failed,
      total,
      successRate,
    };
  });

  const filtered = agentStats.filter(
    (a) =>
      a.name.toLowerCase().includes(filter.toLowerCase()) ||
      a.id.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#7F1D1D]" />
          <p className="mt-2 text-sm text-zinc-500">Loading agent roster…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-zinc-900 font-['Poppins',sans-serif]">
            Agents roster
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage field agents, view performance metrics, and monitor active assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const currentUser = useApp.getState().user;
              if (currentUser) {
                navigator.clipboard.writeText(currentUser.uid);
                toast.success("Enterprise ID copied to clipboard!");
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-violet-600 hover:bg-violet-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" /> Copy Enterprise ID
          </button>
          <button
            onClick={claimAgent}
            className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-zinc-900 hover:bg-zinc-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
          >
            <UserMinus className="h-3.5 w-3.5" /> Claim Existing Agent
          </button>
          <button
            onClick={async () => {
              setLoading(true);
              await fetchAgents();
              setLoading(false);
              toast.success("Agent roster refreshed.");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-4 py-2.5 text-xs font-bold text-zinc-700 transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Agents",
            value: agents.length,
            icon: Users,
            color: "from-[#7F1D1D] to-[#B71C1C]",
          },
          {
            label: "Online Now",
            value: agents.filter((a) => a.online).length,
            icon: Shield,
            color: "from-emerald-500 to-teal-600",
          },
          {
            label: "Avg. Rating",
            value:
              agents.length > 0
                ? (agents.reduce((acc, a) => acc + a.rating, 0) / agents.length).toFixed(1)
                : "—",
            icon: Star,
            color: "from-amber-500 to-orange-600",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl bg-white border border-zinc-200/80 p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                  s.color
                )}
              >
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-zinc-900 font-['Poppins',sans-serif]">
                  {s.value}
                </div>
                <div className="text-xs text-zinc-400 font-medium">{s.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Table */}
      <div className="rounded-2xl bg-white border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-5 bg-zinc-50/50">
          <h2 className="text-base font-bold text-zinc-900 font-['Poppins',sans-serif]">
            Field agents ({filtered.length})
          </h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search agents…"
              className="w-56 rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-[#7F1D1D]/45"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Inbox className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-2 text-sm text-zinc-500 font-semibold">
              No agents found matching criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-zinc-400 bg-zinc-50/50 border-b border-zinc-150">
                <tr>
                  <th className="p-4 text-left font-semibold">Agent</th>
                  <th className="p-4 text-left font-semibold">Status</th>
                  <th className="p-4 text-center font-semibold">Completed</th>
                  <th className="p-4 text-center font-semibold">Active</th>
                  <th className="p-4 text-center font-semibold">Failed</th>
                  <th className="p-4 text-center font-semibold">Success %</th>
                  <th className="p-4 text-center font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {filtered.map((a, i) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-zinc-50/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
                          {a.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-800">{a.name}</div>
                          <div className="font-mono text-[10px] text-zinc-400">{a.id.slice(0, 12)}…</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold",
                          a.online
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            a.online ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                          )}
                        />
                        {a.online ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-emerald-700">{a.completed}</td>
                    <td className="p-4 text-center font-bold text-blue-600">{a.active}</td>
                    <td className="p-4 text-center font-bold text-rose-600">{a.failed}</td>
                    <td className="p-4 text-center">
                      <span
                        className={cn(
                          "font-bold",
                          a.successRate >= 80
                            ? "text-emerald-700"
                            : a.successRate >= 50
                              ? "text-amber-600"
                              : "text-rose-600"
                        )}
                      >
                        {a.successRate}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                        <Star className="h-3 w-3 fill-amber-500" /> {a.rating.toFixed(1)}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
