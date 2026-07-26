import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
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
  Send,
  Search,
  ShoppingBag,
  Shirt,
  Bike,
  Car,
  FileText,
  Boxes,
  Home,
  UserCheck,
  LogOut,
  Mail,
  X,
  Receipt,
  Check,
} from "lucide-react";
import { Logo } from "@/components/trust/Logo";
import { useApp } from "@/store/app-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sendOtpSms, formatPhoneNumber } from "@/lib/sms-service";
import { auth, db } from "@/lib/firebase";

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

// Haversine formula to compute exact distance between two lat/lng points in kilometers
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.max(1, Math.round(distance * 10) / 10);
}

// 6 Delivery Categories matching Customer App Screenshot 2
const CATEGORIES = [
  { id: "food", label: "Food & Groceries", icon: ShoppingBag, color: "bg-amber-50 text-amber-600 border-amber-150 hover:bg-amber-100/80", iconBg: "bg-amber-100 text-amber-600" },
  { id: "clothes", label: "Clothes & Laundry", icon: Shirt, color: "bg-blue-50 text-blue-600 border-blue-150 hover:bg-blue-100/80", iconBg: "bg-blue-100 text-blue-600" },
  { id: "parcels", label: "Bike / Parcels", icon: Bike, color: "bg-red-50 text-red-600 border-red-150 hover:bg-red-100/80", iconBg: "bg-red-100 text-red-600" },
  { id: "large", label: "Cars / Large", icon: Car, color: "bg-rose-50 text-rose-600 border-rose-150 hover:bg-rose-100/80", iconBg: "bg-rose-100 text-rose-600" },
  { id: "documents", label: "Documents", icon: FileText, color: "bg-purple-50 text-purple-600 border-purple-150 hover:bg-purple-100/80", iconBg: "bg-purple-100 text-purple-600" },
  { id: "others", label: "Others", icon: Boxes, color: "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200/80", iconBg: "bg-zinc-200 text-zinc-700" },
];

function CustomerPortalPage() {
  const addDelivery = useApp((s) => s.addDelivery);
  const completeOnlinePayment = useApp((s) => s.completeOnlinePayment);
  const deliveries = useApp((s) => s.deliveries);
  const user = useApp((s) => s.user);

  // Active Bottom Nav Tab: 'home' | 'orders' | 'profile'
  const [activeTab, setActiveTab] = useState<"home" | "orders" | "profile">("home");

  // Location State (Default: Thandalam, Chennai)
  const [currentLocation, setCurrentLocation] = useState("Thandalam, Chennai");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({ lat: 13.0298, lng: 79.9721 }); // Default Thandalam lat/lng
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Category Search
  const [searchCategory, setSearchCategory] = useState("");

  // Selected category & modal visibility for booking
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);

  // Form State
  const [pickupAddress, setPickupAddress] = useState("Thandalam, Chennai");
  const [doorNo, setDoorNo] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  
  // Destination Autocomplete Search State
  const [destinationQuery, setDestinationQuery] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [searchingDest, setSearchingDest] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const [paymentType, setPaymentType] = useState<"prepaid" | "cod">("cod");
  const [notes, setNotes] = useState("");

  // Calculated distance & bill
  const [distanceKm, setDistanceKm] = useState<number>(5.0);
  const [totalBill, setTotalBill] = useState<number>(75); // Rate: ₹15/km (5km * 15 = 75)

  const [submitting, setSubmitting] = useState(false);
  const [createdDelivery, setCreatedDelivery] = useState<any>(null);
  const [payingOnline, setPayingOnline] = useState(false);

  // Auth Modal state inside Profile tab
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const filteredCategories = CATEGORIES.filter((c) =>
    c.label.toLowerCase().includes(searchCategory.toLowerCase())
  );

  // Recalculate distance & bill whenever coordinates update
  useEffect(() => {
    if (pickupCoords && destCoords) {
      const dist = calculateHaversineDistance(
        pickupCoords.lat,
        pickupCoords.lng,
        destCoords.lat,
        destCoords.lng
      );
      setDistanceKm(dist);
      const calculatedFee = Math.max(50, Math.round(dist * 15)); // ₹15 per km (min ₹50)
      setTotalBill(calculatedFee);
    }
  }, [pickupCoords, destCoords]);

  // Live OpenStreetMap Nominatim Autocomplete for Destination Search
  useEffect(() => {
    if (!destinationQuery || destinationQuery.trim().length < 3) {
      setDestSuggestions([]);
      setShowDestDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingDest(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            destinationQuery
          )}&format=json&countrycodes=in&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "en" } }
        );
        if (res.ok) {
          const data = await res.json();
          setDestSuggestions(data);
          setShowDestDropdown(true);
        }
      } catch (err) {
        console.error("Destination search failed:", err);
      } finally {
        setSearchingDest(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [destinationQuery]);

  const handleSelectDestination = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const addr = item.display_name;

    setDestinationAddress(addr);
    setDestinationQuery(item.name || addr.split(",")[0]);
    setDestCoords({ lat, lng });
    setShowDestDropdown(false);

    // Calculate distance
    const dist = calculateHaversineDistance(pickupCoords.lat, pickupCoords.lng, lat, lng);
    setDistanceKm(dist);
    setTotalBill(Math.max(50, Math.round(dist * 15)));
    toast.success(`Destination set: ${item.name || addr.split(",")[0]} (${dist} km)`);
  };

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
        setPickupCoords({ lat, lng });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const parts = data.address;
            const shortAddr = [
              parts?.road || parts?.neighbourhood || parts?.suburb,
              parts?.city || parts?.town || parts?.village,
              parts?.state,
            ]
              .filter(Boolean)
              .join(", ");
            const resolved = shortAddr || data.display_name || `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            setCurrentLocation(resolved);
            setPickupAddress(resolved);
          } else {
            setCurrentLocation(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setPickupAddress(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        } catch {
          setCurrentLocation(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          setPickupAddress(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
        setDetectingLocation(false);
        toast.success("Pickup location updated from GPS!");
      },
      (err) => {
        setDetectingLocation(false);
        toast.error("Failed to detect location. Using current location.");
      },
      { timeout: 8000 }
    );
  };

  const handleCategorySelect = (cat: typeof CATEGORIES[0]) => {
    setSelectedCategory(cat);
    setPickupAddress(currentLocation);
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
    const finalDest = destinationAddress.trim() || destinationQuery.trim();
    if (!finalDest) {
      toast.error("Destination Address is mandatory. Please select from search suggestions.");
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
      const fullPickup = doorNo ? `Door ${doorNo}, ${pickupAddress}` : pickupAddress;

      const newDeliveryObj = {
        id: deliveryId,
        customer: recipientName.trim(),
        phone: recipientPhone.trim(),
        pickupLocation: fullPickup,
        destination: finalDest,
        packageType: selectedCategory ? selectedCategory.label : "Parcel",
        notes: notes.trim(),
        priority: "Express" as const,
        agentId: "", // Empty until Enterprise assigns an agent
        agentName: "Awaiting Enterprise Acceptance",
        enterpriseId: "enterprise-customer-portal",
        eta: "Pending Acceptance",
        status: "pending" as const, // YELLOW STATUS BADGE
        otp: secretOtp,
        distanceKm: distanceKm,
        createdAt: new Date().toISOString(),
        paymentType: paymentType,
        paymentStatus: paymentType === "cod" ? ("cod_pending" as const) : ("pending" as const),
        paymentAmount: totalBill,
      };

      await addDelivery(newDeliveryObj as any);
      setCreatedDelivery(newDeliveryObj);
      setSelectedCategory(null);
      setActiveTab("orders");

      if (paymentType === "cod") {
        toast.success(`Order ${deliveryId} placed via Cash on Delivery (₹${totalBill})! Sent to Enterprise.`);
        // Trigger Smart SMS OTP Dispatch
        await sendOtpSms(recipientPhone.trim(), secretOtp, deliveryId, recipientName.trim());
      } else {
        toast.info(`Order ${deliveryId} created! Complete Razorpay payment to confirm.`);
        handleRazorpayPaymentForObj(newDeliveryObj);
      }
    } catch (err: any) {
      console.error("Order creation failed:", err);
      toast.error(err.message || "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRazorpayPaymentForObj = async (deliveryObj: any) => {
    setPayingOnline(true);
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Failed to load Razorpay SDK.");
      setPayingOnline(false);
      return;
    }

    const keyId = "rzp_test_TGsFUD44ioTAmN"; // Exact Razorpay Test Key requested by user
    const amountVal = deliveryObj.paymentAmount || totalBill;
    const amountInSubunits = Math.round(amountVal * 100);

    const options = {
      key: keyId,
      amount: amountInSubunits,
      currency: "INR",
      name: "TrustRoute Logistics",
      description: `Delivery Fee for Order Ref: ${deliveryObj.id}`,
      handler: async function (response: any) {
        try {
          await completeOnlinePayment(
            deliveryObj.id,
            "razorpay",
            amountVal,
            response.razorpay_payment_id,
            {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || "",
              razorpay_signature: response.razorpay_signature || "",
            }
          );
          toast.success("Razorpay payment verified successfully!");
          setCreatedDelivery({
            ...deliveryObj,
            paymentStatus: "paid",
          });
          // Trigger Smart SMS OTP Dispatch
          await sendOtpSms(deliveryObj.phone, deliveryObj.otp, deliveryObj.id, deliveryObj.customer);
        } catch (err) {
          toast.error("Payment recorded, but status update failed.");
        } finally {
          setPayingOnline(false);
        }
      },
      prefill: {
        name: deliveryObj.customer,
        contact: deliveryObj.phone,
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      toast.error("Please fill in email and password.");
      return;
    }
    setAuthLoading(true);
    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("firebase/auth");
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          email: authEmail.trim(),
          displayName: authName.trim() || "Customer",
          name: authName.trim() || "Customer",
          role: "customer",
          createdAt: serverTimestamp(),
        });
        toast.success("Customer account created!");
      } else {
        await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        toast.success("Logged in successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      toast.success("Signed out.");
    } catch {
      toast.error("Failed to sign out.");
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-100 text-slate-800 font-sans overflow-x-hidden pb-24">
      {/* BACKGROUND MAP GRAPHIC (Matching Screenshot 2 Leaflet OpenStreetMap) */}
      <div
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-cover bg-center"
        style={{
          backgroundImage: `url('https://tile.openstreetmap.org/12/2361/1812.png')`,
          filter: "contrast(1.05) brightness(1.02)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/30 to-white/90" />
      </div>

      {/* TOP LOCATION PILL BAR (Matching Screenshot 2) */}
      <header className="sticky top-0 z-20 px-4 py-3 bg-white/70 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <Logo size="sm" />

          {/* Current Location Pill */}
          <div className="flex items-center gap-2 rounded-full bg-red-50 border border-red-200/80 px-3.5 py-1.5 shadow-xs">
            <MapPin className="h-4 w-4 text-red-500 shrink-0" />
            <div className="text-left leading-none">
              <span className="text-[9px] uppercase font-extrabold text-red-400 block tracking-wider">
                Current Location
              </span>
              <span className="text-xs font-bold text-slate-800 truncate max-w-[170px] sm:max-w-[220px] block">
                {currentLocation}
              </span>
            </div>
            <button
              onClick={handleDetectLocation}
              disabled={detectingLocation}
              title="Detect Location via GPS"
              className="ml-1 grid h-6 w-6 place-items-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition cursor-pointer"
            >
              {detectingLocation ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Navigation className="h-3 w-3" />
              )}
            </button>
          </div>

          <Link
            to="/login"
            search={{ mode: "owner" }}
            className="hidden sm:inline-flex rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition"
          >
            Portal Login
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 mx-auto max-w-xl px-4 pt-6 pb-12">
        {/* TAB 1: HOME (Category Selection matching Screenshot 2) */}
        {activeTab === "home" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] bg-white/95 backdrop-blur-md border border-slate-200/90 p-6 sm:p-8 shadow-2xl text-center space-y-6"
          >
            <div className="w-12 h-1.5 rounded-full bg-slate-200 mx-auto" />

            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-['Poppins',sans-serif]">
                What do you need delivered?
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Select a category to dispatch a verified delivery agent.
              </p>
            </div>

            {/* Category Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                placeholder="Search for categories..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-red-500 focus:bg-white transition"
              />
            </div>

            {/* 2x3 CATEGORY CARDS GRID (Matching Screenshot 2) */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              {filteredCategories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] shadow-xs group",
                      cat.color
                    )}
                  >
                    <div className={cn("grid h-12 w-12 place-items-center rounded-xl mb-2.5 transition", cat.iconBg)}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-slate-950">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 2: ORDERS (Customer Delivery Tracking with YELLOW/GREEN Status Badges) */}
        {activeTab === "orders" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 font-['Poppins',sans-serif]">
                My Delivery Orders
              </h2>
              <button
                onClick={() => setActiveTab("home")}
                className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
              >
                + Book New
              </button>
            </div>

            {deliveries.length === 0 ? (
              <div className="rounded-3xl bg-white/90 p-8 text-center border border-slate-200 shadow-sm space-y-3">
                <Package className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">No delivery orders placed yet.</p>
                <button
                  onClick={() => setActiveTab("home")}
                  className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white transition cursor-pointer"
                >
                  Book Your First Order
                </button>
              </div>
            ) : (
              deliveries.map((d) => (
                <div
                  key={d.id}
                  className="rounded-3xl bg-white/95 backdrop-blur-md p-5 border border-slate-200 shadow-md space-y-3 text-left"
                >
                  {/* Status Pill Header (YELLOW = Pending, GREEN = Accepted/Assigned/In Progress) */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-400">{d.id}</span>
                      <span className="text-xs font-bold text-slate-900 block mt-0.5">{d.packageType}</span>
                    </div>

                    {d.status === "pending" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 shadow-xs animate-pulse">
                        <Clock className="h-3 w-3 text-amber-600" /> Pending Acceptance (Enterprise)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Accepted & Assigned ({d.agentName || "Agent"})
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Recipient</span>
                      <span className="font-bold text-slate-800">{d.customer} ({d.phone})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Delivery PIN / OTP</span>
                      <span className="font-mono font-extrabold text-red-600 text-sm tracking-wider">{d.otp}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Pickup Location</span>
                      <span className="font-medium text-slate-700">{d.pickupLocation}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Destination</span>
                      <span className="font-medium text-slate-700">{d.destination}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Distance & Rate</span>
                      <span className="font-bold text-slate-800">{d.distanceKm || 5.0} km @ ₹15/km</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Total Bill</span>
                      <span className="font-extrabold text-slate-900 text-sm">₹{d.paymentAmount || 75}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => sendOtpSms(d.phone, d.otp, d.id, d.customer)}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" /> Resend SMS OTP
                    </button>
                    {d.paymentType === "prepaid" && d.paymentStatus !== "paid" && (
                      <button
                        onClick={() => handleRazorpayPaymentForObj(d)}
                        className="rounded-xl bg-red-600 hover:bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white transition cursor-pointer shadow-xs"
                      >
                        Pay ₹{d.paymentAmount || 75} via Razorpay
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* TAB 3: PROFILE & CUSTOMER AUTH (Profile Tab) */}
        {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[32px] bg-white/95 backdrop-blur-md border border-slate-200 p-6 sm:p-8 shadow-2xl text-left space-y-6"
          >
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-600 text-xl font-bold text-white shadow-md">
                    {(user.displayName || user.email || "C")[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{user.displayName || "Customer"}</h2>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> {user.email}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Account Role:</span>
                    <span className="font-bold text-slate-800">Verified Customer</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Default Location:</span>
                    <span className="font-bold text-slate-800">{currentLocation}</span>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 py-3 text-xs font-bold text-rose-600 transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" /> Sign Out Customer Account
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-['Poppins',sans-serif]">
                    {isSignUp ? "Create Customer Account" : "Customer Sign In"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Sign in to track orders, save pickup addresses, and receive SMS alerts.
                  </p>
                </div>

                {isSignUp && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-red-600 transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="e.g. customer@example.com"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-red-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-red-600 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 py-3 text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignUp ? "Create Account" : "Sign In"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </main>

      {/* BOOKING MODAL (Opens when clicking any Category from Home tab) */}
      <AnimatePresence>
        {selectedCategory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCategory(null)}
              className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg rounded-[32px] bg-white p-6 sm:p-8 shadow-2xl pointer-events-auto overflow-hidden relative text-left space-y-4 max-h-[90vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("p-2 rounded-xl", selectedCategory.iconBg)}>
                      <selectedCategory.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">{selectedCategory.label}</h2>
                      <p className="text-[10px] text-slate-400">Book express dispatch for {selectedCategory.label}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="rounded-full p-1.5 hover:bg-slate-100 text-slate-400 transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleOrderSubmit} className="space-y-4">
                  {/* Pickup Address & Door/Flat Number */}
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Door / Flat No.
                      </label>
                      <input
                        type="text"
                        value={doorNo}
                        onChange={(e) => setDoorNo(e.target.value)}
                        placeholder="e.g. #12/A"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-red-600 transition"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Pickup Location <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={pickupAddress}
                          onChange={(e) => setPickupAddress(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-red-600 transition"
                        />
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition cursor-pointer"
                        >
                          <Navigation className="h-3.5 w-3.5" /> GPS
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Recipient Details */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Recipient Name <span className="text-red-500">* (Mandatory)</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="e.g. Rajesh Kumar"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-red-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Recipient Phone <span className="text-red-500">* (Mandatory)</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-red-600 transition"
                      />
                    </div>
                  </div>

                  {/* DESTINATION SEARCH WITH LIVE OPENSTREETMAP AUTOCOMPLETE DROPDOWN */}
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Destination / Dropoff Address <span className="text-red-500">* (Search GPS)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={destinationQuery}
                        onChange={(e) => setDestinationQuery(e.target.value)}
                        placeholder="Type location e.g. Avadi Bus Stand, Saveetha Hospital..."
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-3.5 pr-8 py-2.5 text-xs text-slate-800 outline-none focus:border-red-600 transition"
                      />
                      {searchingDest && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-red-500" />
                      )}
                    </div>

                    {/* LIVE SEARCH AUTOCOMPLETE SUGGESTIONS DROPDOWN */}
                    {showDestDropdown && destSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl space-y-1">
                        {destSuggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectDestination(item)}
                            className="w-full text-left p-2.5 rounded-xl hover:bg-red-50 transition cursor-pointer flex items-start gap-2 border border-transparent hover:border-red-100"
                          >
                            <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">
                                {item.name || item.display_name.split(",")[0]}
                              </span>
                              <span className="text-[10px] text-slate-500 line-clamp-1">
                                {item.display_name}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* DYNAMIC DELIVERY BILL BREAKDOWN (₹15 per 1 km) */}
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-red-50/50 to-amber-50/50 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                        <Receipt className="h-4 w-4 text-red-600" /> Delivery Bill Estimate
                      </span>
                      <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        ₹15 / km Rate
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Calculated Route Distance:</span>
                      <span className="font-bold text-slate-900">{distanceKm} km</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Distance Fare ({distanceKm} km × ₹15):</span>
                      <span className="font-bold text-slate-900">₹{Math.round(distanceKm * 15)}</span>
                    </div>

                    <div className="flex justify-between pt-1 border-t border-slate-200/80 text-sm font-extrabold text-slate-900">
                      <span>Total Payable Amount:</span>
                      <span className="text-red-700 text-base">₹{totalBill}.00</span>
                    </div>
                  </div>

                  {/* Payment Mode Choice */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Payment Mode Choice
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentType("cod")}
                        className={cn(
                          "py-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs",
                          paymentType === "cod"
                            ? "bg-red-600 text-white border-red-600 shadow-md"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <DollarSign className="h-4 w-4" /> Cash on Delivery (COD ₹{totalBill})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType("prepaid")}
                        className={cn(
                          "py-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs",
                          paymentType === "prepaid"
                            ? "bg-red-600 text-white border-red-600 shadow-md"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        <CreditCard className="h-4 w-4" /> Razorpay Online (Prepaid ₹{totalBill})
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 hover:bg-red-700 py-4 text-xs font-bold text-white shadow-lg transition cursor-pointer disabled:opacity-50 mt-2 hover:scale-[1.01]"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : paymentType === "cod" ? (
                      `Place Order (Cash on Delivery ₹${totalBill}) →`
                    ) : (
                      `Proceed to Pay ₹${totalBill} via Razorpay →`
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* BOTTOM NAVIGATION BAR (Matching Screenshot 2) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2.5 px-6 shadow-lg">
        <div className="mx-auto flex max-w-md justify-around items-center">
          <button
            onClick={() => setActiveTab("home")}
            className={cn(
              "flex flex-col items-center gap-1 transition cursor-pointer",
              activeTab === "home" ? "text-red-600 font-bold" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={cn(
              "flex flex-col items-center gap-1 transition cursor-pointer relative",
              activeTab === "orders" ? "text-red-600 font-bold" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Package className="h-5 w-5" />
            <span className="text-[10px]">Orders</span>
            {deliveries.length > 0 && (
              <span className="absolute -top-1 right-2 h-2 w-2 rounded-full bg-red-600 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "flex flex-col items-center gap-1 transition cursor-pointer",
              activeTab === "profile" ? "text-red-600 font-bold" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
