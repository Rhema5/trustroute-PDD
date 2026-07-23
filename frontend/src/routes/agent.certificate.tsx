import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  Download,
  CheckCircle,
  MapPin,
  ShieldCheck,
  User,
  Package,
  Wifi,
  WifiOff,
  Search,
  Eye,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/store/app-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agent/certificate")({
  component: PDFCertificate,
});

function PDFCertificate() {
  const [downloading, setDownloading] = React.useState(false);
  const [downloaded, setDownloaded] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  const certRef = React.useRef<HTMLDivElement>(null);

  // Retrieve deliveries from the global store
  const deliveries = useApp((s) => s.deliveries);
  const deliveredList = React.useMemo(
    () => deliveries.filter((d) => d.status === "delivered"),
    [deliveries],
  );

  // Selection states
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Default to the first delivery if none selected
  const activeDelivery =
    deliveredList.find((d) => d.id === selectedId) || deliveredList[0] || null;

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleDownload = async () => {
    if (!certRef.current || !activeDelivery) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).jsPDF;

      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`TrustRoute-Certificate-${activeDelivery.id}.pdf`);
      setDownloaded(true);
      toast.success("Certificate downloaded successfully!");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF.");
    } finally {
      setDownloading(false);
    }
  };

  // Filter list of certificates
  const filteredList = deliveredList.filter(
    (d) =>
      d.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.destination.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6 text-left text-zinc-300">
      {/* Header section */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] text-[#FF4D4D] uppercase font-bold tracking-widest block">
            Agent Terminal
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
            Certificate Hub
          </h1>
          <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
            Inspect, search, and download PDF receipts for completed handoff verifications.
          </p>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${
            isOnline
              ? "bg-green-950/20 text-green-400 border-green-500/25"
              : "bg-orange-950/20 text-orange-400 border-orange-550/20"
          }`}
        >
          {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isOnline ? "Online" : "Offline"}
        </div>
      </header>

      {/* Main Workspace Layout */}
      {deliveredList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-16 text-center bg-[#0F1424]">
          <FileText className="mx-auto h-12 w-12 text-[#B71C1C] animate-pulse mb-3" />
          <p className="text-sm font-semibold text-zinc-300">No Attested Receipts Available</p>
          <p className="text-xs text-zinc-550 mt-1.5 leading-relaxed max-w-sm mx-auto">
            Once you complete route delivery verifications, they will appear in this hub for attestation downloads.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Left Column: Certificate Selector list */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
              Delivered Parcels List
            </h3>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipient or parcel ID..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-[#0F1424] text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-[#B71C1C]/40 outline-none transition"
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filteredList.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 font-semibold bg-zinc-950/20 border border-zinc-850 rounded-xl">
                  No matches found.
                </div>
              ) : (
                filteredList.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      setSelectedId(d.id);
                      setDownloaded(false);
                    }}
                    className={cn(
                      "p-3 rounded-xl border transition cursor-pointer text-left flex items-center justify-between gap-3",
                      activeDelivery && activeDelivery.id === d.id
                        ? "bg-red-950/20 border-[#B71C1C]/40 text-white"
                        : "bg-[#0F1424] border-zinc-850 text-zinc-400 hover:border-zinc-800",
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-bold text-xs truncate text-white">{d.customer}</div>
                      <div className="font-mono text-[9px] text-zinc-500 font-semibold">ID: {d.id}</div>
                      <div className="text-[10px] text-zinc-400 truncate flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                        <span className="truncate">{d.destination}</span>
                      </div>
                    </div>
                    <div className="h-7 w-7 rounded bg-zinc-900 border border-zinc-850 grid place-items-center text-zinc-400 shrink-0">
                      <Eye className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Certificate Attestation Preview & Download */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
                Cryptographic Attestation Receipt
              </h3>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#B71C1C] hover:opacity-90 px-3 py-1.5 text-[10px] font-bold text-white shadow-glow disabled:opacity-40 transition cursor-pointer"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" /> Compiling...
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3" /> Save PDF Receipt
                  </>
                )}
              </button>
            </div>

            {activeDelivery && (
              <div className="space-y-4">
                {/* Attestation PDF White Sheet Container */}
                <div
                  ref={certRef}
                  className="border border-slate-200 rounded-3xl overflow-hidden shadow-elevated bg-white text-slate-900 p-6 relative"
                >
                  {/* Certificate Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-2 text-left">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#B71C1C]">
                        <span className="text-xs font-bold text-white font-mono">TR</span>
                      </div>
                      <div>
                        <p className="text-slate-950 font-extrabold text-sm block">TrustRoute Attestation</p>
                        <p className="text-slate-400 text-[8px] uppercase tracking-wider font-bold block">
                          Official handoff attest
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">
                        Verification ID
                      </p>
                      <p className="text-slate-950 font-mono text-xs font-bold">{activeDelivery.id}</p>
                    </div>
                  </div>

                  {/* Certificate Body */}
                  <div className="mt-5 space-y-3.5 text-left text-xs">
                    {activeDelivery.proof?.photoUrl && (
                      <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative max-h-44">
                        <img
                          src={activeDelivery.proof.photoUrl}
                          alt="Handoff Proof"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                        Recipient Customer Name
                      </span>
                      <span className="text-slate-950 font-extrabold">{activeDelivery.customer}</span>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                        Handoff Destination Address
                      </span>
                      <span className="text-slate-900 block font-medium leading-snug">{activeDelivery.destination}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                          Payload details
                        </span>
                        <span className="text-slate-950 font-semibold">{activeDelivery.packageType}</span>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                          Attested date
                        </span>
                        <span className="text-slate-950 font-semibold">
                          {activeDelivery.proof?.verifiedAt
                            ? new Date(activeDelivery.proof.verifiedAt).toLocaleDateString()
                            : new Date().toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                        Live GPS Coordinates
                      </span>
                      <span className="font-mono text-slate-950 block font-bold">
                        {activeDelivery.proof
                          ? `${activeDelivery.proof.gps.lat.toFixed(5)}° N, ${activeDelivery.proof.gps.lng.toFixed(5)}° E`
                          : "Unavailable"}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                        Cryptographic Hash Attest signature
                      </span>
                      <span className="font-mono text-[9px] break-all text-slate-700 block leading-tight">
                        {activeDelivery.proof?.hash ?? "Unavailable"}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                        Assigned terminal Agent
                      </span>
                      <span className="text-slate-950 font-semibold">{activeDelivery.agentName}</span>
                    </div>
                  </div>

                  {/* Digital Seal stamp */}
                  <div className="border-t border-slate-200 mt-6 pt-4 flex items-center justify-between text-left">
                    <div>
                      <p className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">
                        attestation flow
                      </p>
                      <p className="text-xs font-black text-[#B71C1C]">TrustRoute secured Attestation</p>
                    </div>
                    <div className="h-12 w-12 border-[3px] border-emerald-500 rounded-full grid place-items-center text-emerald-600 font-black text-[8px] rotate-[-10deg] shadow-sm select-none shrink-0">
                      VERIFIED
                    </div>
                  </div>
                </div>

                {/* Success Download Alert */}
                {downloaded && (
                  <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-2xl p-4 flex gap-3 text-emerald-400 text-xs">
                    <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                    <p className="font-semibold leading-normal">
                      A4 Attestation Receipt downloaded to local file manager.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
