import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Send, Sparkles } from "lucide-react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/dashboard/new")({
  head: () => ({ meta: [{ title: "New Delivery — TrustRoute" }] }),
  component: NewDelivery,
});

const deliveryFormSchema = z.object({
  customer: z.string().min(2, "Customer name must be at least 2 characters.").trim(),
  phone: z.string().min(7, "Please enter a valid phone number (min 7 digits).").trim(),
  destination: z.string().min(5, "Destination address must be at least 5 characters.").trim(),
  packageType: z.string().min(2, "Package type must be at least 2 characters.").trim(),
  notes: z.string().max(200, "Notes cannot exceed 200 characters.").optional(),
  paymentType: z.enum(["prepaid", "cod"]),
  paymentAmount: z.number().min(0.01, "Amount must be greater than zero."),
});

function NewDelivery() {
  const otp = useMemo(() => String(Math.floor(1000 + Math.random() * 9000)), []);
  const agents = useApp((s) => s.agents);
  const fetchAgents = useApp((s) => s.fetchAgents);
  const user = useApp((s) => s.user);
  const add = useApp((s) => s.addDelivery);
  const addNotification = useApp((s) => s.addNotification);
  const nav = useNavigate();

  const [agentId, setAgentId] = useState<string>("");
  const [priority, setPriority] = useState<"Standard" | "Express" | "Critical">("Express");
  const [paymentType, setPaymentType] = useState<"prepaid" | "cod">("prepaid");
  const [paymentAmount, setPaymentAmount] = useState<string>("15.00");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    if (agents.length > 0 && !agentId) {
      setAgentId(agents[0].id);
    }
  }, [agents, agentId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || done) return;
    setSubmitting(true);

    const fd = new FormData(e.target as HTMLFormElement);
    const formData = {
      customer: String(fd.get("customer") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      destination: String(fd.get("destination") || "").trim(),
      packageType: String(fd.get("packageType") || "").trim(),
      notes: String(fd.get("notes") || "").trim(),
      paymentType,
      paymentAmount: Number(paymentAmount),
    };

    const validation = deliveryFormSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setSubmitting(false);
      return;
    }

    if (!agentId) {
      toast.error("Please assign an agent to this delivery.");
      setSubmitting(false);
      return;
    }

    const assignedAgent = agents.find((a) => a.id === agentId);
    if (!assignedAgent) {
      toast.error("Selected agent is invalid.");
      setSubmitting(false);
      return;
    }

    try {
      const deliveryId = `TR-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
      await add({
        id: deliveryId,
        customer: formData.customer,
        phone: formData.phone,
        destination: formData.destination,
        packageType: formData.packageType,
        notes: formData.notes,
        priority,
        agentId: assignedAgent.id,
        agentName: assignedAgent.name,
        enterpriseId: user?.uid || "",
        eta: priority === "Critical" ? "15 min" : priority === "Express" ? "35 min" : "1h 30min",
        status: "assigned",
        otp,
        distanceKm: Number((2.0 + Math.random() * 12.0).toFixed(1)),
        createdAt: new Date().toISOString(),
        paymentType: formData.paymentType,
        paymentAmount: formData.paymentAmount,
        paymentStatus: formData.paymentType === "cod" ? "cod_pending" : "pending",
      });

      // Notify the assigned agent
      try {
        await addNotification(
          "New Mission Assigned",
          `Delivery ${deliveryId} to ${formData.customer} has been assigned to you.`,
          assignedAgent.id
        );
      } catch (notifErr) {
        console.error("Failed to send assignment notification:", notifErr);
      }

      setDone(true);
      toast.success("Mission deployed successfully!");
      setTimeout(() => nav({ to: "/dashboard" }), 1400);
    } catch (err: any) {
      console.error("Error deploying mission:", err);
      toast.error(err.message || "Failed to deploy mission.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-zinc-850">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-zinc-900 font-['Poppins',sans-serif]">
          Deploy handoff route
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Configure recipient details, cargo payload type, and assign an active agent. Verification
          OTP generated automatically.
        </p>
      </motion.div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 rounded-2xl bg-white border border-zinc-200/80 p-6 shadow-sm space-y-4"
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Recipient & Cargo Destination
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Customer / Recipient name"
              name="customer"
              placeholder="e.g. Elena Park"
              required
            />
            <Input
              label="Recipient Phone number"
              name="phone"
              placeholder="e.g. +1 415 555 0101"
              required
            />
            <Input
              label="Destination Address"
              name="destination"
              placeholder="e.g. 500 Howard St, San Francisco, CA"
              className="sm:col-span-2"
              required
            />
            <Input
              label="Package Payload Type"
              name="packageType"
              placeholder="e.g. Pharmaceuticals"
              required
            />
            <div>
              <Label>Handoff Priority</Label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(["Standard", "Express", "Critical"] as const).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-xs font-bold transition cursor-pointer",
                      priority === p
                        ? p === "Critical"
                          ? "border-rose-350 bg-rose-50 text-rose-700"
                          : p === "Express"
                            ? "border-blue-350 bg-blue-50 text-blue-700"
                            : "border-purple-350 bg-purple-50 text-purple-750"
                        : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Payment Integration Panel */}
            <div className="sm:col-span-2 border-t border-zinc-150 pt-4 mt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                Payment Configuration
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Payment Mode</Label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {(["prepaid", "cod"] as const).map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setPaymentType(t)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-xs font-bold transition cursor-pointer text-center",
                          paymentType === t
                            ? "border-[#7F1D1D] bg-[#7F1D1D]/5 text-[#7F1D1D]"
                            : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100",
                        )}
                      >
                        {t === "prepaid" ? "Online Prepaid" : "Cash on Delivery"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Payment Amount ($)</Label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="15.00"
                    required
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none transition focus:border-[#7F1D1D]/45 focus:bg-white"
                  />
                </div>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Special Handling Notes</Label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Special instructions, gate security codes, temperature constraints..."
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none transition focus:border-[#7F1D1D]/45 focus:bg-white"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-6"
        >
          {/* Agent selection card in Light Mode */}
          <div className="rounded-2xl bg-white border border-zinc-200/80 p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Assign Active Agent
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {agents.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400 font-semibold border border-dashed border-zinc-200 rounded-xl">
                  No active agents available. Ensure agents register.
                </div>
              ) : (
                agents.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => setAgentId(a.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all cursor-pointer",
                      agentId === a.id
                        ? "border-[#7F1D1D] bg-[#7F1D1D]/5"
                        : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100",
                    )}
                  >
                    <div
                      className={cn(
                        "relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br text-[10px] font-bold text-white shadow-sm font-['Poppins',sans-serif]",
                        a.avatarColor,
                      )}
                    >
                      {a.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                      {a.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-zinc-850 truncate">{a.name}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                        ★ {a.rating} · {a.online ? "Available" : "Offline"}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Secure OTP Card */}
          <div className="rounded-2xl bg-[#7F1D1D] p-5 shadow-md text-white text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-100">
              <KeyRound className="h-4 w-4" /> Secure Validation OTP
            </div>
            <div className="mt-4 flex justify-center gap-2">
              {otp.split("").map((d, i) => (
                <div
                  key={i}
                  className="grid h-12 w-10 place-items-center rounded-xl bg-white/10 font-mono text-xl font-extrabold text-white"
                >
                  {d}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-rose-200/90 font-medium">
              Transmitted to client. OTP verification required on handover.
            </p>
          </div>

          <button
            disabled={submitting || done || agents.length === 0}
            type="submit"
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#7F1D1D] hover:bg-[#6B1414] px-5 py-4 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.01] disabled:opacity-40 cursor-pointer"
          >
            {done ? (
              <>
                <CheckCircle2 className="h-4 w-4 animate-bounce" /> Handoff Dispatched
              </>
            ) : submitting ? (
              <>
                <Sparkles className="h-4 w-4 animate-pulse" /> Dispatching Cargo...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Dispatch Secure Handoff
              </>
            )}
          </button>
        </motion.div>
      </form>

      {done && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/20 backdrop-blur-sm"
        >
          <div className="rounded-3xl bg-white border border-zinc-200 p-8 text-center shadow-2xl max-w-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 font-['Poppins',sans-serif]">
              Mission Deployed
            </h3>
            <p className="text-xs text-zinc-500 mt-1 leading-normal">
              Delivery route registered. Agent assigned and OTP token transmitted successfully.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">
      {children}
    </label>
  );
}
function Input({
  label,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <input
        {...rest}
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none transition focus:border-[#7F1D1D]/45 focus:bg-white"
      />
    </div>
  );
}
