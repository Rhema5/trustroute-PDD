import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  FileText,
  Download,
  Loader2,
  ShieldCheck,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  ArrowRight,
  Wifi,
  Sparkles,
} from "lucide-react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Logo } from "@/components/trust/Logo";

export const Route = createFileRoute("/payment/$id")({
  head: () => ({ meta: [{ title: "Pay Invoice — TrustRoute" }] }),
  component: CustomerCheckoutPage,
});

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.hasOwnProperty("Razorpay")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

type SimState = "input" | "processing" | "success" | "failed";

function CustomerCheckoutPage() {
  const { id } = Route.useParams();
  const completeOnlinePayment = useApp((s) => s.completeOnlinePayment);

  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("card");
  const [simState, setSimState] = useState<SimState>("input");
  const [transactionId, setTransactionId] = useState<string>("");
  const [receiptNumber, setReceiptNumber] = useState<string>("");

  // Receipt PDF Download State & Ref
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).jsPDF;

      const canvas = await html2canvas(receiptRef.current, {
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
      pdf.save(`TrustRoute-Receipt-${receiptNumber || "RC-99999"}.pdf`);
      toast.success("Receipt PDF downloaded successfully!");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to compile receipt PDF.");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, "deliveries", id);
    
    // Subscribe to live delivery document updates so customer page updates in real-time
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDelivery({ id: docSnap.id, ...data });
        if (data.paymentStatus === "paid" || data.paymentStatus === "cod_collected") {
          setSimState("success");
          setTransactionId(data.transactionId || `TX-SIM-${docSnap.id.split("-")[1] || "ONLINE"}`);
          setReceiptNumber(data.receiptNumber || `RC-SIM-${docSnap.id.split("-")[1] || "ONLINE"}`);
        }
      } else {
        setDelivery(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching checkout details:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const handleSimulatePayment = async (outcome: "success" | "fail") => {
    if (!delivery) return;
    setSimState("processing");

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (outcome === "success") {
      try {
        const amountVal = delivery.paymentAmount || 15.00;
        const mockPayId = `pay_sim_${crypto.randomUUID().split("-")[0].toUpperCase()}`;
        await completeOnlinePayment(delivery.id, selectedMethod, amountVal, mockPayId, {
          razorpay_payment_id: mockPayId,
          razorpay_order_id: `order_sim_${crypto.randomUUID().split("-")[0].toUpperCase()}`,
          razorpay_signature: "simulated_signature_hash"
        });
        toast.success("Payment completed successfully!");
      } catch (err: any) {
        console.error("Online payment sync failed:", err);
        toast.error("Simulated gateway sync error.");
        setSimState("failed");
      }
    } else {
      setSimState("failed");
      toast.error("Card authorization failed. Please try another method.");
    }
  };

  const handleRazorpayCheckout = async () => {
    if (!delivery) return;
    setSimState("processing");

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error("Failed to load Razorpay Checkout SDK. Ensure network connectivity.");
      setSimState("failed");
      return;
    }

    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TGsFUD44ioTAmN";

    const amountVal = delivery.paymentAmount || 15.00;
    const amountInSubunits = Math.round(amountVal * 100);

    const options = {
      key: keyId,
      amount: amountInSubunits,
      currency: "INR",
      name: "TrustRoute Logistics",
      description: `Billing Settlement for Delivery Ref: ${delivery.id}`,
      handler: async function (response: any) {
        setSimState("processing");
        try {
          const rzpPaymentId = response.razorpay_payment_id;
          await completeOnlinePayment(delivery.id, "razorpay", amountVal, rzpPaymentId, {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id || "",
            razorpay_signature: response.razorpay_signature || "",
          });
          toast.success("Payment authorized successfully via Razorpay!");
          setSimState("success");
        } catch (err: any) {
          console.error("Failed to process Razorpay database settlement:", err);
          toast.error("Failed to write payment confirmation to database.");
          setSimState("failed");
        }
      },
      prefill: {
        name: delivery.customer || "",
        contact: delivery.phone || "",
      },
      notes: {
        deliveryId: delivery.id,
        packageType: delivery.packageType,
      },
      theme: {
        color: "#7F1D1D",
      },
      modal: {
        ondismiss: function () {
          toast.info("Payment cancelled by customer.");
          setSimState("failed");
        }
      }
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        console.error("Razorpay payment failed:", response.error);
        toast.error(response.error?.description || "Razorpay Payment Authorization Failed.");
        setSimState("failed");
      });
      rzp.open();
    } catch (err) {
      console.error("Failed to open Razorpay Checkout modal:", err);
      toast.error("Failed to initialize payment window.");
      setSimState("failed");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#070B14] text-white">
        <div className="text-center space-y-3">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#B71C1C]" />
          <p className="text-xs uppercase tracking-wider text-zinc-550 font-bold">
            Resolving secure billing invoice...
          </p>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#070B14] px-6 text-white text-left">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(183,28,28,0.1),transparent_50%)]" />
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-zinc-850 bg-[#0F1424]/90 p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-950/20 border border-rose-500/20">
            <AlertTriangle className="h-6 w-6 text-rose-405" />
          </div>
          <h2 className="mt-5 text-lg font-black font-['Poppins',sans-serif]">Invoice Not Found</h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            The requested invoice does not exist or has been archived from the TrustRoute verification grid.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 px-5 py-2.5 text-xs font-bold text-white transition"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const amount = delivery.paymentAmount || 15.00;

  return (
    <div className="relative min-h-screen bg-[#070B14] text-zinc-350 text-left font-['Inter',sans-serif] pb-12">
      {/* Background radial glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(183,28,28,0.08),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(15,20,36,0.5),transparent_50%)]" />

      {/* Header section */}
      <header className="border-b border-zinc-900 bg-[#0F1424]/30 backdrop-blur-md py-4 px-6 sticky top-0 z-30">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/20 border border-emerald-500/20 px-2.5 py-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            <Wifi className="h-3 w-3" /> Secure Gateway
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          
          {/* Left Column: Invoice summary */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl bg-[#0F1424]/85 border border-zinc-850 p-6 shadow-xl space-y-5">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#FF4D4D] block">
                Billing Invoice Summary
              </span>
              
              <div>
                <span className="text-[10px] text-zinc-550 uppercase font-bold tracking-wider block">Parcel ID</span>
                <span className="text-sm font-mono font-bold text-white block mt-0.5">{delivery.id}</span>
              </div>

              <div className="border-t border-zinc-850/60 pt-3">
                <span className="text-[10px] text-zinc-550 uppercase font-bold tracking-wider block">Recipient</span>
                <span className="text-sm font-bold text-white block mt-0.5">{delivery.customer}</span>
                <span className="text-xs text-zinc-450 block mt-0.5">{delivery.phone}</span>
              </div>

              <div className="border-t border-zinc-850/60 pt-3 space-y-2">
                <div className="flex items-start gap-2.5 text-xs text-zinc-400">
                  <Package className="h-4 w-4 text-zinc-550 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-zinc-350 block">Cargo Payload</span>
                    <span className="text-[11px] text-zinc-500 block mt-0.5">{delivery.packageType}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-zinc-400">
                  <MapPin className="h-4 w-4 text-zinc-550 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-zinc-350 block">Destination Address</span>
                    <span className="text-[11px] text-zinc-500 block mt-0.5 leading-snug">{delivery.destination}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-850/60 pt-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-550">Subtotal</span>
                  <span className="font-semibold text-zinc-200 font-mono">₹{(amount * 0.82).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-550">CGST (9%)</span>
                  <span className="font-semibold text-zinc-200 font-mono">₹{(amount * 0.09).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-550">SGST (9%)</span>
                  <span className="font-semibold text-zinc-200 font-mono">₹{(amount * 0.09).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-zinc-850/60 pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500 block">Total Due</span>
                  <span className="text-2xl font-black text-white font-['Poppins',sans-serif] block mt-0.5">
                    ₹{amount.toFixed(2)}
                  </span>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0",
                  delivery.paymentStatus === "paid" || delivery.paymentStatus === "cod_collected"
                    ? "bg-emerald-950/20 border-emerald-500/25 text-emerald-400"
                    : "bg-red-950/20 border-red-500/25 text-[#FF4D4D]"
                )}>
                  {delivery.paymentStatus === "paid" ? "Paid" : delivery.paymentStatus === "cod_collected" ? "COD Collected" : "Payment Pending"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Checkout forms */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {simState === "input" && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-3xl bg-[#0F1424]/85 border border-zinc-850 p-6 shadow-xl space-y-6"
                >
                  <div>
                    <h2 className="text-lg font-black text-white font-['Poppins',sans-serif]">Razorpay Online Checkout</h2>
                    <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
                      Official Razorpay Gateway integration active. Click below to launch secure payment modal.
                    </p>
                  </div>

                  {delivery.paymentType === "cod" ? (
                    <div className="rounded-2xl border border-yellow-500/10 bg-yellow-950/10 p-5 text-yellow-400 text-xs leading-relaxed space-y-2">
                      <div className="font-bold text-white text-sm flex items-center gap-1.5">
                        <AlertTriangle className="h-4.5 w-4.5 text-yellow-500" /> Cash on Delivery (COD) Enabled
                      </div>
                      <p>
                        This delivery route is configured for cash collection at the destination. The agent will collect <strong>₹{amount.toFixed(2)}</strong> cash during handoff verification.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-red-500/20 bg-[#B71C1C]/10 p-4.5 flex items-center gap-3.5">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#B71C1C] text-white">
                          <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">Razorpay Payment Gateway</span>
                          <span className="text-[11px] text-zinc-400 block mt-0.5">
                            Supports Credit/Debit Cards, UPI, NetBanking, and Wallets via official Razorpay modal.
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <button
                          onClick={handleRazorpayCheckout}
                          className="w-full bg-[#B71C1C] hover:bg-[#961717] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-glow cursor-pointer transition text-xs uppercase tracking-wider font-semibold"
                        >
                          Pay ₹{amount.toFixed(2)} with Razorpay <ArrowRight className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {simState === "processing" && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-3xl bg-[#0F1424]/85 border border-zinc-850 p-12 shadow-xl text-center space-y-4"
                >
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#B71C1C]" />
                  <h3 className="text-base font-black text-white font-['Poppins',sans-serif] uppercase tracking-wider">
                    Authorizing Secure Funds...
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                    Contacting payment simulator gateway. Checking ledger accounts and generating secure token credentials.
                  </p>
                </motion.div>
              )}

              {simState === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Attestation PDF Receipt */}
                  <div ref={receiptRef} className="border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl bg-white text-zinc-900 p-6 relative">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#B71C1C]">
                          <span className="text-xs font-bold text-white font-mono">TR</span>
                        </div>
                        <div>
                          <p className="text-zinc-950 font-extrabold text-sm block">TrustRoute Receipt</p>
                          <p className="text-zinc-450 text-[8px] uppercase tracking-wider font-bold block">
                            Official Payment Attestation
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] uppercase tracking-wider text-zinc-450 font-bold">Receipt ID</p>
                        <p className="text-zinc-950 font-mono text-xs font-bold">{receiptNumber || "RC-99999"}</p>
                      </div>
                    </div>

                    {/* Receipt Details */}
                    <div className="mt-5 space-y-3.5 text-xs text-left">
                      <div className="rounded-xl bg-zinc-50 p-3 flex justify-between items-center">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-zinc-500 block font-bold">Payment Method</span>
                          <span className="text-zinc-950 font-extrabold capitalize">{delivery.paymentMethod === "none" ? selectedMethod : delivery.paymentMethod}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] uppercase tracking-wider text-zinc-500 block font-bold">Transaction Reference</span>
                          <span className="font-mono text-zinc-900 font-bold">{transactionId || "TX-99999"}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="rounded-xl bg-zinc-50 p-2.5">
                          <span className="text-[8px] uppercase tracking-wider text-zinc-500 block font-bold">Customer Name</span>
                          <span className="text-zinc-950 font-bold block truncate">{delivery.customer}</span>
                        </div>
                        <div className="rounded-xl bg-zinc-50 p-2.5">
                          <span className="text-[8px] uppercase tracking-wider text-zinc-500 block font-bold">Payment Date</span>
                          <span className="text-zinc-950 font-bold block">{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-3.5 space-y-2 text-[11px] text-zinc-600 border-t border-zinc-200">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span className="font-semibold text-zinc-800">₹{(amount * 0.82).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CGST (9%)</span>
                          <span className="font-semibold text-zinc-800">₹{(amount * 0.09).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST (9%)</span>
                          <span className="font-semibold text-zinc-800">₹{(amount * 0.09).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-zinc-50 p-3 flex justify-between items-center">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-zinc-500 block font-bold">Billing Total</span>
                          <span className="text-sm font-extrabold text-zinc-950">₹{amount.toFixed(2)}</span>
                        </div>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800 uppercase tracking-widest shrink-0">
                          Paid
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-zinc-200 mt-6 pt-4 flex items-center justify-between text-left">
                      <div>
                        <p className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Attestation Network</p>
                        <p className="text-[10px] font-black text-[#B71C1C]">TrustRoute Secured transaction</p>
                      </div>
                      <div className="h-10 w-10 border-2 border-emerald-500 rounded-full grid place-items-center text-emerald-600 font-black text-[7px] rotate-[-10deg] shadow-sm select-none">
                        SUCCESS
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/10 bg-emerald-950/10 p-4.5 flex gap-3 text-emerald-400 text-xs">
                    <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Payment Attestation Confirmed</span>
                      Invoice has been settled inside the secure ledger grid. The courier agent will verify receipt details on delivery.
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadReceipt}
                    disabled={downloading}
                    className="w-full bg-[#B71C1C] hover:bg-[#961717] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition text-xs font-semibold shadow-glow disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" /> 
                    {downloading ? "Saving A4 PDF..." : "Download PDF Receipt"}
                  </button>
                </motion.div>
              )}

              {simState === "failed" && (
                <motion.div
                  key="failed"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl bg-[#0F1424]/85 border border-zinc-850 p-8 shadow-xl text-center space-y-5"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-950/20 border border-rose-500/20">
                    <AlertTriangle className="h-6 w-6 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white font-['Poppins',sans-serif]">Transaction Authorization Failed</h3>
                    <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
                      Gateway failed to secure funding. This could be due to insufficient balance, authentication timeouts, or card locks.
                    </p>
                  </div>
                  <button
                    onClick={() => setSimState("input")}
                    className="w-full bg-[#B71C1C] hover:bg-[#961717] text-white font-bold py-3.5 rounded-xl transition cursor-pointer text-xs"
                  >
                    Try Another Method
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
