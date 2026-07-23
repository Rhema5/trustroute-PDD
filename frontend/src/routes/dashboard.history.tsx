import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { StatusBadge } from "@/components/trust/StatusBadge";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { type Delivery } from "@/lib/mock-data";
import { X, AlertCircle, User, MapPin, UserX, FileText } from "lucide-react";

export const Route = createFileRoute("/dashboard/history")({
  head: () => ({ meta: [{ title: "History — TrustRoute" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const deliveries = useApp((s) => s.deliveries);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  return (
    <div className="space-y-6 text-zinc-850 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-zinc-900 font-['Poppins',sans-serif]">
          Delivery history
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Complete archive logs of all dispatched and completed routes.
        </p>
      </div>

      <div className="grid gap-3">
        {deliveries.length === 0 ? (
          <div className="p-8 text-center text-sm font-semibold text-zinc-500 bg-white border border-zinc-200/80 rounded-2xl shadow-sm">
            No dispatched route histories logged.
          </div>
        ) : (
          deliveries.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-wrap items-center gap-4 rounded-2xl bg-white border border-zinc-200/80 p-4 shadow-sm hover:bg-zinc-50/50 transition-all"
            >
              <div className="font-mono text-xs text-zinc-400 font-bold w-20">{d.id}</div>
              <div className="flex-1 min-w-[180px]">
                <div className="font-bold text-zinc-800 text-sm">{d.customer}</div>
                <div className="text-xs text-zinc-400 mt-0.5">{d.destination}</div>
              </div>
              <div className="text-xs text-zinc-400 font-medium">
                {new Date(d.createdAt).toLocaleString()}
              </div>
              <StatusBadge status={d.status} />
              {d.status === "delivered" && (
                <Link
                  to="/dashboard/proofs/$id"
                  params={{ id: d.id }}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                >
                  View Handoff Proof
                </Link>
              )}
              {d.status === "cancelled" && (
                <button
                  onClick={() => setSelectedDelivery(d)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                >
                  View Details
                </button>
              )}
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedDelivery && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDelivery(null)}
              className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl pointer-events-auto overflow-hidden relative"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-red-600" />
                    Delivery Details
                  </h2>
                  <button
                    onClick={() => setSelectedDelivery(null)}
                    className="rounded-full p-1.5 hover:bg-zinc-100 text-zinc-500 transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 text-sm text-left">
                  <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                    <h3 className="font-bold text-red-900 flex items-center gap-1.5 text-xs uppercase tracking-wider mb-2">
                      <AlertCircle className="h-4 w-4" /> Cancellation Reason
                    </h3>
                    <p className="text-red-700 font-medium">
                      {selectedDelivery.cancellationReason || selectedDelivery.notes || "No reason provided by the agent."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <h3 className="font-bold text-zinc-500 flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-2">
                        <UserX className="h-3.5 w-3.5" /> Rejected By
                      </h3>
                      <div className="font-semibold text-zinc-900">{selectedDelivery.agentName || "Unknown Agent"}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">ID: {selectedDelivery.agentId}</div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <h3 className="font-bold text-zinc-500 flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-2">
                        <User className="h-3.5 w-3.5" /> Customer Info
                      </h3>
                      <div className="font-semibold text-zinc-900">{selectedDelivery.customer}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{selectedDelivery.phone}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <h3 className="font-bold text-zinc-500 flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-2">
                      <MapPin className="h-3.5 w-3.5" /> Destination
                    </h3>
                    <div className="font-medium text-zinc-900 leading-relaxed text-xs">
                      {selectedDelivery.destination}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 text-right">
                  <button
                    onClick={() => setSelectedDelivery(null)}
                    className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
