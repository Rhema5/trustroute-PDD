import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QRScanner } from "@/components/trust/QRScanner";
import { useState } from "react";
import { QrCode, ArrowLeft, Loader2, AlertTriangle, CheckCircle2, ShieldCheck, Keyboard, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/agent/scan")({
  head: () => ({ meta: [{ title: "Scan — TrustRoute" }] }),
  component: ScanPage,
});

function ScanPage() {
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [lookingUp, setLookingUp] = useState(false);
  const [manualId, setManualId] = useState("");
  const deliveries = useApp((s) => s.deliveries);
  const navigate = useNavigate();

  const handleScanSuccess = async (decodedText: string) => {
    setScanning(false);
    setScannedId(decodedText);
    setLookingUp(true);

    // Attempt to find the delivery in the loaded state
    const trimmedId = decodedText.trim();
    const delivery = deliveries.find(
      (d) => d.id === trimmedId || d.id.toLowerCase() === trimmedId.toLowerCase()
    );

    if (delivery) {
      toast.success(`Delivery found: ${delivery.customer}`);
      setTimeout(() => {
        navigate({ to: "/agent/delivery/$id", params: { id: delivery.id } });
      }, 800);
    } else {
      setLookingUp(false);
      toast.error("No matching delivery found for scanned QR code.");
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    handleScanSuccess(manualId);
  };

  const handleRetry = () => {
    setScannedId(null);
    setScanning(true);
    setLookingUp(false);
    setManualId("");
  };

  return (
    <div className="space-y-6 text-left text-zinc-300">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <Link
          to="/agent"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <span className="text-xs font-bold text-zinc-550 uppercase tracking-widest">
          Camera scanning
        </span>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-white">Scan Parcel QR Code</h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Position the parcel's unique QR code in the camera frame to instantly load details.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {scanning ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Outer Scanner Wrapper */}
              <div className="relative mx-auto max-w-md bg-[#0F1424] border border-zinc-850 rounded-3xl overflow-hidden p-6 shadow-elevated">
                {/* Visual Camera corners */}
                <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-[#FF4D4D] rounded-tl-md z-10 animate-pulse" />
                <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-[#FF4D4D] rounded-tr-md z-10 animate-pulse" />
                <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-[#FF4D4D] rounded-bl-md z-10 animate-pulse" />
                <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-[#FF4D4D] rounded-br-md z-10 animate-pulse" />

                {/* Laser animation line */}
                <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-[#FF4D4D] opacity-40 shadow-[0_0_8px_#FF4D4D] z-10 animate-[pulse-glow_1.5s_infinite]" />

                <div className="rounded-2xl overflow-hidden bg-black border border-zinc-900 aspect-square">
                  <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onScanError={(err) => {
                      console.error("Scan error:", err);
                    }}
                  />
                </div>
              </div>

              {/* Manual search fallback option */}
              <div className="mx-auto max-w-md bg-[#0F1424] border border-zinc-850 p-4.5 rounded-2xl">
                <div className="flex items-center gap-2 mb-3 text-zinc-400">
                  <Keyboard className="h-4 w-4 text-[#FF4D4D]" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Manual Query Option</span>
                </div>
                <form onSubmit={handleManualSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    placeholder="Enter Parcel ID manually..."
                    className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 text-xs text-zinc-200 placeholder:text-zinc-550 focus:border-[#B71C1C]/40 outline-none transition"
                  />
                  <button
                    type="submit"
                    className="px-4 rounded-xl bg-zinc-900 border border-zinc-850 text-xs font-bold text-zinc-200 hover:bg-zinc-800 transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Search className="h-3.5 w-3.5" /> Lookup
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 max-w-md mx-auto"
            >
              <div className="rounded-3xl border border-zinc-850 bg-[#0F1424] p-6 text-center space-y-4 shadow-elevated">
                {lookingUp ? (
                  <div className="space-y-3 py-6">
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#FF4D4D]" />
                    <h3 className="text-sm font-semibold text-white">Looking up delivery details…</h3>
                    <p className="font-mono text-xs text-zinc-500 break-all">{scannedId}</p>
                  </div>
                ) : (
                  <div className="space-y-3 py-3">
                    <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 animate-bounce" />
                    <h3 className="text-sm font-bold text-white">No Matching Delivery Found</h3>
                    <p className="font-mono text-xs text-zinc-450 break-all bg-zinc-950/45 p-2 rounded-lg border border-zinc-850/60 max-w-xs mx-auto">
                      Scanned: {scannedId}
                    </p>
                    <p className="text-xs text-zinc-550 leading-relaxed max-w-sm mx-auto">
                      This scanned parcel identifier is not found on your assigned route list. Verify the barcode and retry scanning.
                    </p>
                  </div>
                )}
              </div>

              {!lookingUp && (
                <button
                  onClick={handleRetry}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#B71C1C] to-red-600 hover:opacity-90 py-4 text-xs font-bold uppercase tracking-wider text-white shadow-glow transition cursor-pointer"
                >
                  <QrCode className="h-4.5 w-4.5" /> Scan Another Parcel
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
