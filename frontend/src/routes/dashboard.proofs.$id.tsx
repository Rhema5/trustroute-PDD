import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { ArrowLeft, Camera, Download, FileCheck2, MapPin, Share2, ShieldCheck, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/proofs/$id")({
  head: () => ({ meta: [{ title: "Proof Record — TrustRoute" }] }),
  component: ProofView,
});

function ProofView() {
  const { id } = Route.useParams();
  const d = useApp((s) => s.deliveries.find((x) => x.id === id));
  const agents = useApp((s) => s.agents);
  const fetchAgents = useApp((s) => s.fetchAgents);
  const reassign = useApp((s) => s.reassignDelivery);
  const [selectedAgentId, setSelectedAgentId] = useState("");

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  if (!d) throw notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-zinc-850 text-left">
      <Link
        to="/dashboard/proofs"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-800 cursor-pointer transition"
      >
        <ArrowLeft className="h-4 w-4" /> All records
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-white border border-zinc-200/80 overflow-hidden shadow-sm"
      >
        <div className="relative aspect-[16/9] bg-zinc-100 overflow-hidden border-b border-zinc-150">
          {d.proof?.photoUrl ? (
            <img
              src={d.proof.photoUrl}
              alt="Handoff Proof evidence"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 to-zinc-100 grid place-items-center">
              <Camera className="h-12 w-12 text-zinc-300 animate-pulse" />
              <span className="text-xs text-zinc-400 font-bold mt-2">Handoff Image Logged</span>
            </div>
          )}
          <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-250 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Verified handoff
          </div>
          <div className="absolute bottom-4 right-4 font-mono text-[10px] text-zinc-500 font-bold bg-white/70 px-2 py-0.5 rounded border border-zinc-200">
            {d.id}
          </div>
        </div>

        {/* Offline Verification warnings / alerts */}
        {(d as any).offlineVerification && (
          <div className={cn(
            "p-4 border-b text-xs flex items-start gap-3",
            (d as any).offlineVerification.status === "failed" 
              ? "bg-rose-50 border-rose-150 text-rose-800" 
              : "bg-emerald-50 border-emerald-150 text-emerald-800"
          )}>
            {(d as any).offlineVerification.status === "failed" ? (
              <>
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">Offline Verification Failure Alert</div>
                  <p className="mt-1 text-rose-600 leading-relaxed font-semibold">
                    Security Alert: Customer OTP verification failed during offline sync! Recipient presented: <strong className="font-mono bg-rose-100 px-1 py-0.5 rounded">{(d as any).offlineVerification.verifiedOtp}</strong>. 
                    Expected token was: <strong className="font-mono bg-rose-100 px-1 py-0.5 rounded">{(d as any).offlineVerification.actualOtp}</strong>. 
                    Device userAgent: <span className="font-mono text-zinc-650">{(d as any).offlineVerification.userAgent}</span>.
                  </p>
                </div>
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">Offline Verification Verified</div>
                  <p className="mt-1 text-emerald-600 leading-relaxed">
                    OTP verified successfully during offline auto-sync. 
                    Device userAgent: <span className="font-mono text-zinc-650">{(d as any).offlineVerification.userAgent}</span>.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {d.proof && d.proof.otp === "Offline (Bypassed)" && (
          <div className="p-4 border-b text-xs flex items-start gap-3 bg-amber-50 border-amber-150 text-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Legacy Verification Bypass Warning</div>
              <p className="mt-1 text-amber-600 leading-relaxed font-semibold">
                Warning: This handoff was recorded with the bypassed OTP option under the old client offline policy.
              </p>
            </div>
          </div>
        )}

        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-5">
            <div>
              <h1 className="text-xl font-bold text-zinc-900">{d.customer}</h1>
              <p className="text-sm text-zinc-500 mt-1">{d.destination}</p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/dashboard/certificate/$id"
                params={{ id: d.id }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#7F1D1D] hover:bg-[#6B1414] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all"
              >
                <FileCheck2 className="h-4 w-4" /> Download Certificate
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Meta
              label="Verified at"
              value={
                d.proof?.verifiedAt
                  ? new Date(d.proof.verifiedAt).toLocaleString()
                  : new Date().toLocaleString()
              }
            />
            <Meta label="OTP Validation" value={d.otp} mono />
            <Meta label="Verified Agent" value={d.agentName} />
            <Meta label="Cargo Package" value={d.packageType} />
            <Meta
              label="GPS Handoff Location"
              value={
                d.proof
                  ? `${d.proof.gps.lat.toFixed(5)}, ${d.proof.gps.lng.toFixed(5)}`
                  : "Unavailable"
              }
              icon={MapPin}
            />
            <Meta
              label="Verification Cryptographic Hash"
              value={d.proof?.hash ?? "Unavailable"}
              mono
            />
          </div>
        </div>

        {/* Reassignment Control Panel */}
        {d.status !== "delivered" && d.status !== "failed" && (
          <div className="border-t border-zinc-150 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-50/50">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Reassign Dispatch Route</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Route this active task to another agent.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-700 outline-none w-full sm:w-48"
              >
                <option value="">Select agent...</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.online ? "Online" : "Offline"})</option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!selectedAgentId) {
                    toast.error("Please select an agent first.");
                    return;
                  }
                  const agent = agents.find((a) => a.id === selectedAgentId);
                  if (!agent) return;
                  try {
                    await reassign(d.id, agent.id, agent.name);
                    toast.success(`Delivery reassigned to ${agent.name}`);
                  } catch (err) {
                    toast.error("Failed to reassign delivery.");
                  }
                }}
                className="rounded-xl bg-[#7F1D1D] hover:bg-[#6B1414] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition whitespace-nowrap cursor-pointer"
              >
                Reassign Route
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Meta({
  label,
  value,
  mono,
  icon: Icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-zinc-150 bg-zinc-50 p-3">
      <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">{label}</div>
      <div
        className={`mt-1 flex items-center gap-1.5 text-sm ${mono ? "font-mono font-bold text-zinc-700" : "font-semibold text-zinc-800"}`}
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-[#7F1D1D]" />}
        {value}
      </div>
    </div>
  );
}
