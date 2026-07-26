import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Package,
  MapPin,
  User,
  Phone,
  CreditCard,
  CheckCircle2,
  Navigation,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Clock,
  Sparkles,
  Loader2,
  Building2,
  DollarSign,
} from "lucide-react";
import { Logo } from "@/components/trust/Logo";
import { useApp } from "@/store/app-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer")({
  head: () => ({
    meta: [
      { title: "Customer Portal — Book Delivery Order | TrustRoute" },
      { name: "description", content: "Book verified enterprise deliveries with OTP handoff security." },
    ],
  }),
  component: CustomerPortalPage,
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

function CustomerPortalPage() {
  const addDelivery = useApp((s) => s.addDelivery);
  const completeOnlinePayment = useApp((s) => s.completeOnlinePayment);
  const deliveries = useApp((s) => s.deliveries);

  // Form State
  const [pickupAddress, setPickupAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [packageType, setPackageType] = useState("Parcel");
  const [paymentType, setPaymentType] = useState<"prepaid" | "cod">("prepaid");
  const [amount, setAmount] = useState<string>("499.00");
  const [notes, setNotes] = useState("");

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdDelivery, setCreatedDelivery] = useState<any>(null);
  const [payingOnline, setPayingOnline] = useState(false);

  // Real-time listener for created delivery status updates
  const activeDelivery = createdDelivery
    ? deliveries.find((d) => d.id === createdDelivery.id) || createdDelivery
    : null;

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.display_name || `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            // Use shorter address: suburb + city + state
            const parts = data.address;
            const shortAddr = [
              parts?.road || parts?.neighbourhood || parts?.suburb,
              parts?.city || parts?.town || parts?.village,
              parts?.state
            ].filter(Boolean).join(", ");
            setPickupAddress(shortAddr || addr);
          } else {
            setPickupAddress(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        } catch {
          setPickupAddress(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
        setDetectingLocation(false);
        toast.success("Pickup location detected from GPS!");
      },
      (err) => {
        setDetectingLocation(false);
        toast.error("Failed to detect location. Please enter pickup address manually.");
      },
      { timeout: 8000 }
    );
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!recipientName.trim()) {
      toast.error("Recipient Name is mandatory.");
      return;
    }
    if (!recipientPhone.trim() || recipientPhone.trim().length < 7) {
      toast.error("A valid Recipient Phone number is mandatory.");
      return;
    }
    if (!destinationAddress.trim()) {
      toast.error("Destination Address is mandatory.");
      return;
    }
    if (!pickupAddress.trim()) {
      toast.error("Pickup Location is required.");
      return;
    }

    setSubmitting(true);
    try {
      const deliveryId = `TR-${Math.floor(10000 + Math.random() * 90000)}`;
      const secretOtp = String(Math.floor(1000 + Math.random() * 9000));
      const numericAmount = parseFloat(amount) || 499;

      const newDeliveryObj = {
        id: deliveryId,
        customer: recipientName.trim(),
        phone: recipientPhone.trim(),
        pickupLocation: pickupAddress.trim(),
        destination: destinationAddress.trim(),
        packageType: packageType,
        notes: notes.trim(),
        priority: "Express" as const,
        agentId: "", // Empty until Enterprise assigns an agent
        agentName: "Awaiting Assignment",
        enterpriseId: "enterprise-customer-portal",
        eta: "Pending Assignment",
        status: "pending" as const,
        otp: secretOtp,
        distanceKm: 5.2,
        createdAt: new Date().toISOString(),
        paymentType: paymentType,
        paymentStatus: paymentType === "cod" ? ("cod_pending" as const) : ("pending" as const),
        paymentAmount: numericAmount,
      };

      await addDelivery(newDeliveryObj as any);
      setCreatedDelivery(newDeliveryObj);
      toast.success(`Order ${deliveryId} placed successfully!`);
    } catch (err: any) {
      console.error("Order creation failed:", err);
      toast.error(err.message || "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!activeDelivery) return;
    setPayingOnline(true);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Failed to load Razorpay SDK. Check connection.");
      setPayingOnline(false);
      return;
    }

    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TGsFUD44ioTAmN";
    const amountVal = activeDelivery.paymentAmount || 499;
    const amountInSubunits = Math.round(amountVal * 100);

    const options = {
      key: keyId,
      amount: amountInSubunits,
      currency: "INR",
      name: "TrustRoute Logistics",
      description: `Delivery Fee for Order Ref: ${activeDelivery.id}`,
      handler: async function (response: any) {
        try {
          await completeOnlinePayment(
            activeDelivery.id,
            "razorpay",
            amountVal,
            response.razorpay_payment_id,
            {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || "",
              razorpay_signature: response.razorpay_signature || "",
            }
          );
          toast.success("Payment successful via Razorpay!");
          setCreatedDelivery({
            ...activeDelivery,
            paymentStatus: "paid",
          });
        } catch (err) {
          toast.error("Payment recorded, but sync failed.");
        } finally {
          setPayingOnline(false);
        }
      },
      prefill: {
        name: activeDelivery.customer,
        contact: activeDelivery.phone,
      },
      theme: { color: "#7F1D1D" },
      modal: {
        ondismiss: function () {
          setPayingOnline(false);
          toast.info("Payment cancelled.");
        },
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast.error("Failed to open Razorpay modal.");
      setPayingOnline(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-200 transition"
            >
              Enterprise / Agent Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        {!activeDelivery ? (
          /* ORDER CREATION FORM */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
              <div className="rounded-2xl bg-red-950/80 p-3 text-red-500 border border-red-900/50">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Book a Delivery Order</h1>
                <p className="text-xs text-slate-400">
                  Enter pickup & recipient details. Enterprise will assign a verified agent.
                </p>
              </div>
            </div>

            <form onSubmit={handleOrderSubmit} className="space-y-6 text-left">
              {/* Pickup Location */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Pickup Address / Location <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="e.g. 12 Main St, Guindy, Chennai"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-red-600 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition cursor-pointer disabled:opacity-50"
                  >
                    {detectingLocation ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
                    ) : (
                      <Navigation className="h-3.5 w-3.5 text-red-400" />
                    )}
                    GPS Spot
                  </button>
                </div>
              </div>

              {/* Recipient Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Recipient Name <span className="text-red-500">* (Mandatory)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-red-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Recipient Phone Number <span className="text-red-500">* (Mandatory)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="tel"
                      required
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-red-600 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Destination Address */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Destination / Dropoff Address <span className="text-red-500">* (Mandatory)</span>
                </label>
                <input
                  type="text"
                  required
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="e.g. Plot 45, Anna Salai, T. Nagar, Chennai"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-red-600 transition"
                />
              </div>

              {/* Package Type & Amount */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Package Type
                  </label>
                  <select
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-red-600 transition"
                  >
                    <option value="Parcel">Parcel / Box</option>
                    <option value="Documents">Important Documents</option>
                    <option value="Electronics">Electronics & Hardware</option>
                    <option value="Medical">Medical Supplies</option>
                    <option value="Grocery">Food & Grocery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Delivery Fee (₹ INR)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-red-600 transition"
                  />
                </div>
              </div>

              {/* Payment Mode Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Payment Option
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentType("prepaid")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition cursor-pointer",
                      paymentType === "prepaid"
                        ? "border-red-600 bg-red-950/40 text-red-400"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900"
                    )}
                  >
                    <CreditCard className="h-4 w-4" />
                    Online Razorpay (Prepaid ₹)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("cod")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition cursor-pointer",
                      paymentType === "cod"
                        ? "border-red-600 bg-red-950/40 text-red-400"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900"
                    )}
                  >
                    <DollarSign className="h-4 w-4" />
                    Cash on Delivery (COD ₹)
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Delivery Notes / Gate Code (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Call upon arrival, leave at reception..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-red-600 transition"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-700 hover:bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Order to Enterprise...
                  </>
                ) : (
                  <>
                    Submit Order Request <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          /* ORDER CONFIRMATION & LIVE TRACKING VIEW */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 text-left shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Order Placed Successfully
                  </span>
                  <h2 className="text-2xl font-extrabold text-white mt-2">
                    Order Ref: {activeDelivery.id}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Share the secret OTP with your delivery agent upon handoff.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase">Handoff Secret OTP</div>
                  <div className="text-3xl font-black tracking-widest text-red-400 bg-slate-950 px-4 py-1.5 rounded-2xl border border-red-900/50 mt-1 inline-block">
                    {activeDelivery.otp}
                  </div>
                </div>
              </div>

              {/* Status Tracker */}
              <div className="py-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Live Order Lifecycle Status
                </h3>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className={cn("p-3 rounded-2xl border transition", activeDelivery.status === "pending" ? "border-amber-500 bg-amber-950/40 text-amber-300 font-bold" : "border-slate-800 bg-slate-950 text-slate-500")}>
                    1. Awaiting Enterprise
                  </div>
                  <div className={cn("p-3 rounded-2xl border transition", activeDelivery.status === "assigned" ? "border-blue-500 bg-blue-950/40 text-blue-300 font-bold" : "border-slate-800 bg-slate-950 text-slate-500")}>
                    2. Agent Assigned
                  </div>
                  <div className={cn("p-3 rounded-2xl border transition", activeDelivery.status === "in_progress" ? "border-purple-500 bg-purple-950/40 text-purple-300 font-bold" : "border-slate-800 bg-slate-950 text-slate-500")}>
                    3. In Transit
                  </div>
                  <div className={cn("p-3 rounded-2xl border transition", activeDelivery.status === "delivered" ? "border-emerald-500 bg-emerald-950/40 text-emerald-300 font-bold" : "border-slate-800 bg-slate-950 text-slate-500")}>
                    4. Delivered & Verified
                  </div>
                </div>
              </div>

              {/* Order Details Breakdown */}
              <div className="grid gap-4 sm:grid-cols-2 rounded-2xl bg-slate-950 p-4 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold">Recipient:</span>{" "}
                  <span className="text-slate-200 font-bold">{activeDelivery.customer} ({activeDelivery.phone})</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Pickup:</span>{" "}
                  <span className="text-slate-200 font-bold">{activeDelivery.pickupLocation || "Pickup Location"}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Destination:</span>{" "}
                  <span className="text-slate-200 font-bold">{activeDelivery.destination}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Assigned Agent:</span>{" "}
                  <span className="text-slate-200 font-bold">{activeDelivery.agentName || "Awaiting Assignment"}</span>
                </div>
              </div>

              {/* Razorpay Online Payment Action */}
              {activeDelivery.paymentType === "prepaid" && (
                <div className="mt-6 border-t border-slate-800 pt-6">
                  {activeDelivery.paymentStatus === "paid" ? (
                    <div className="flex items-center gap-3 rounded-2xl bg-emerald-950/50 border border-emerald-800 p-4 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      Payment of ₹{activeDelivery.paymentAmount} Paid via Razorpay Test Gateway.
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-950 p-4 border border-red-900/40">
                      <div>
                        <div className="text-sm font-bold text-white">Prepaid Amount: ₹{activeDelivery.paymentAmount} INR</div>
                        <div className="text-xs text-slate-400">Complete payment via Razorpay Test Gateway</div>
                      </div>
                      <button
                        onClick={handleRazorpayPayment}
                        disabled={payingOnline}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-700 hover:bg-red-600 px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
                      >
                        {payingOnline ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        Pay ₹{activeDelivery.paymentAmount} with Razorpay
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setCreatedDelivery(null)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  Book Another Order
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
