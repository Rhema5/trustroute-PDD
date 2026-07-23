import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { FileCheck2 } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

export const Route = createFileRoute("/dashboard/proofs/")({
  head: () => ({ meta: [{ title: "Proof Records — TrustRoute" }] }),
  component: ProofsList,
});

function ProofsList() {
  const deliveries = useApp((s) => s.deliveries);
  const proofs = useMemo(
    () => deliveries.filter((d) => d.status === "delivered"),
    [deliveries],
  );
  return (
    <div className="space-y-6 text-zinc-850 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-zinc-900 font-['Poppins',sans-serif]">
          Proof records
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Cryptographic validation records and evidence logs for every completed handoff.
        </p>
      </div>

      {proofs.length === 0 ? (
        <div className="p-8 text-center text-sm font-semibold text-zinc-500 bg-white border border-zinc-200/80 rounded-2xl shadow-sm">
          No verified proof logs registered.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {proofs.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-white border border-zinc-200/80 overflow-hidden hover:-translate-y-0.5 transition-all shadow-sm"
            >
              <div className="aspect-video relative bg-zinc-150 overflow-hidden border-b border-zinc-100">
                {d.proof?.photoUrl ? (
                  <img
                    src={d.proof.photoUrl}
                    alt="Handoff Proof"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 to-zinc-100 grid place-items-center">
                    <span className="text-xs text-zinc-400 font-semibold">Image Proof Saved</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-[10px] font-bold text-emerald-700 backdrop-blur-md">
                  <FileCheck2 className="h-3 w-3" /> Verified
                </div>
              </div>
              <div className="p-4">
                <div className="font-mono text-[10px] text-zinc-400 font-bold">{d.id}</div>
                <div className="mt-1 font-bold text-zinc-850">{d.customer}</div>
                <div className="mt-0.5 text-xs text-zinc-500 truncate">{d.destination}</div>
                <Link
                  to="/dashboard/proofs/$id"
                  params={{ id: d.id }}
                  className="mt-3.5 inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                >
                  Open Record Details
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
