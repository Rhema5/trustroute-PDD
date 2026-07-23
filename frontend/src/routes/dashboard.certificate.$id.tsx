import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { ArrowLeft, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { toDataURL } from "qrcode";

export const Route = createFileRoute("/dashboard/certificate/$id")({
  head: () => ({ meta: [{ title: "Certificate — TrustRoute" }] }),
  component: CertificatePage,
});

function CertificatePage() {
  const { id } = Route.useParams();
  const d = useApp((s) => s.deliveries.find((x) => x.id === id));
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  if (!d) throw notFound();

  useEffect(() => {
    if (d.id) {
      toDataURL(d.id, { margin: 1, width: 120 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Failed to generate QR code:", err));
    }
  }, [d.id]);

  const handleDownload = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).jsPDF;

      const canvas = await html2canvas(certRef.current, {
        scale: 2, // high quality
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 standard width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`TrustRoute-Certificate-${d.id}.pdf`);
      toast.success("PDF Certificate downloaded successfully.");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/proofs/$id"
          params={{ id: d.id }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-white shadow-glow cursor-pointer disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Generating PDF..." : "Download PDF"}
        </button>
      </div>

      <motion.div
        ref={certRef}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-3xl rounded-3xl bg-white p-12 text-slate-900 shadow-elevated"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-600">
                <span className="text-xs font-bold text-white">TR</span>
              </div>
              <span className="text-lg font-bold">TrustRoute</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Verified Logistics Authority</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              Certificate ID
            </div>
            <div className="font-mono text-sm">{d.id}</div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold">Certificate of Verified Delivery</h2>
          <p className="mt-2 text-sm text-slate-600">
            This document certifies the cryptographically verified handoff of the parcel below.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <Row label="Recipient" value={d.customer} />
          <Row label="Destination" value={d.destination} />
          <Row label="Package type" value={d.packageType} />
          <Row label="Priority" value={d.priority} />
          <Row label="Agent" value={d.agentName} />
          <Row
            label="Verified at"
            value={
              d.proof?.verifiedAt
                ? new Date(d.proof.verifiedAt).toLocaleString()
                : new Date().toLocaleString()
            }
          />
          <Row
            label="GPS"
            value={
              d.proof
                ? `${d.proof.gps.lat.toFixed(5)}, ${d.proof.gps.lng.toFixed(5)}`
                : "37.77490, -122.41940"
            }
            mono
          />
          <Row label="OTP token" value={d.otp} mono />
          <Row label="Verification hash" value={d.proof?.hash ?? "0x9c4b...e7d2"} mono colSpan />
        </div>

        <div className="mt-10 grid grid-cols-3 items-end gap-6">
          <div className="flex flex-col items-start gap-1">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="h-20 w-20 rounded border border-slate-200" />
            ) : (
              <div className="h-20 w-20 rounded bg-slate-100 animate-pulse border border-slate-200" />
            )}
            <div className="text-[9px] text-slate-500">Scan to verify</div>
          </div>
          <div className="text-center">
            <div className="mx-auto h-20 w-20 rounded-full border-4 border-emerald-600 grid place-items-center text-emerald-700 font-bold text-xs rotate-[-8deg]">
              VERIFIED
            </div>
          </div>
          <div className="text-right">
            <div className="border-b border-slate-400 pb-1 font-[cursive] text-lg italic">
              A. Chen
            </div>
            <div className="mt-1 text-[10px] text-slate-500">Authorized signature</div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-4 text-[10px] text-slate-500 text-center">
          TrustRoute Inc. · 100 California St, San Francisco, CA · trustroute.io · Document is
          tamper-evident
        </div>
      </motion.div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  colSpan,
}: {
  label: string;
  value: string;
  mono?: boolean;
  colSpan?: boolean;
}) {
  return (
    <div className={`rounded-lg bg-slate-50 px-3 py-2 ${colSpan ? "col-span-2" : ""}`}>
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 ${mono ? "font-mono text-xs" : "text-sm font-medium"}`}>{value}</div>
    </div>
  );
}
