import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, CheckCircle2, Loader2, ShoppingCart, Clock, User, Phone, Navigation } from "lucide-react";
import { toast } from "sonner";
import { sendOtpSms } from "@/lib/sms-service";

export const Route = createFileRoute("/dashboard/orders")({
  head: () => ({ meta: [{ title: "Incoming Marketplace Orders — TrustRoute" }] }),
  component: IncomingOrdersPage,
});

function IncomingOrdersPage() {
  const deliveries = useApp((s) => s.deliveries);
  const agents = useApp((s) => s.agents);
  const acceptCustomerOrder = useApp((s) => s.acceptCustomerOrder);

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Record<string, string>>({});

  // Filter pending customer orders
  const pendingOrders = deliveries.filter((d) => d.status === "pending");

  const handleAcceptOrder = async (deliveryId: string) => {
    const agentId = selectedAgent[deliveryId];
    if (!agentId) {
      toast.error("Please select an agent to assign before accepting.");
      return;
    }
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) {
      toast.error("Selected agent not found.");
      return;
    }
    setAcceptingId(deliveryId);
    try {
      await acceptCustomerOrder(deliveryId, agent.id, agent.name);
      toast.success(`Order ${deliveryId} accepted and assigned to ${agent.name}!`);

      // Trigger Smart SMS Dispatch to recipient
      const target = pendingOrders.find((d) => d.id === deliveryId);
      if (target && target.phone && target.otp) {
        sendOtpSms(target.phone, target.otp, deliveryId, target.customer);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to accept order.");
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="space-y-6 text-left text-zinc-800 font-sans">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-zinc-900 font-['Poppins',sans-serif]">
          Incoming Marketplace Orders
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Review and accept delivery requests from customers.
        </p>
      </div>

      <div className="space-y-4">
        {pendingOrders.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center shadow-xs">
            <ShoppingCart className="mx-auto h-10 w-10 text-zinc-300" />
            <h3 className="mt-3 text-sm font-bold text-zinc-900 font-['Poppins',sans-serif]">
              No Pending Marketplace Orders
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              New customer delivery orders will appear here automatically in real time.
            </p>
          </div>
        ) : (
          pendingOrders.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-zinc-300 transition-all space-y-4"
            >
              {/* Top Status & Date Row (Matching Screenshot 2) */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200/80">
                  <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending Acceptance
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  {d.createdAt ? new Date(d.createdAt).toLocaleString() : "Just now"}
                </span>
              </div>

              {/* Middle Row: Pickup & Dropoff vs Action Dropdown (Matching Screenshot 2) */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  {/* PICKUP */}
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                      PICKUP
                    </span>
                    <div className="flex items-start gap-1.5 mt-0.5">
                      <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-xs font-semibold text-zinc-800">
                        {d.pickupLocation || "Pickup Location"}
                      </span>
                    </div>
                  </div>

                  {/* DROPOFF */}
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                      DROPOFF
                    </span>
                    <div className="flex items-start gap-1.5 mt-0.5">
                      <MapPin className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-semibold text-zinc-800 block">
                          {d.destination}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium block mt-0.5">
                          {d.customer} • {d.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Select Agent Dropdown + Green Accept Order Button (Matching Screenshot 2) */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <select
                    value={selectedAgent[d.id] || ""}
                    onChange={(e) =>
                      setSelectedAgent((prev) => ({ ...prev, [d.id]: e.target.value }))
                    }
                    className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-xs text-zinc-700 font-semibold outline-none focus:border-emerald-500 focus:bg-white transition cursor-pointer min-w-[170px]"
                  >
                    <option value="">Select Agent (Optional)</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleAcceptOrder(d.id)}
                    disabled={acceptingId === d.id}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#00a86b] hover:bg-[#008f5b] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50"
                  >
                    {acceptingId === d.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Accept Order
                  </button>
                </div>
              </div>

              {/* Bottom Metadata Bar: Category | Package | Estimated Price | Distance (Matching Screenshot 2) */}
              <div className="border-t border-zinc-150 pt-3 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
                <div>
                  <span className="text-zinc-400 font-semibold">Delivery PIN / OTP: </span>
                  <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">{d.otp}</span>
                </div>
                <div>
                  <span className="text-zinc-400 font-semibold">Category: </span>
                  <span className="font-bold text-zinc-900">{d.packageType || "Food & Groceries"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 font-semibold">Package: </span>
                  <span className="font-bold text-zinc-900">{d.notes || d.customer || "Parcel item"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 font-semibold">Estimated Price: </span>
                  <span className="font-bold text-zinc-900">₹{d.paymentAmount || 92.0}</span>
                </div>
                <div>
                  <span className="text-zinc-400 font-semibold">Distance: </span>
                  <span className="font-bold text-zinc-900">{d.distanceKm || 7.51} km</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
