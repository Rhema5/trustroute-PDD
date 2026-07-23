import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  MapPin,
  ShieldCheck,
  Upload,
  FileText,
  Download,
  Phone,
  Map,
  RefreshCw,
  AlertCircle,
  Info,
  User,
  Check,
  Clock,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";

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

export const Route = createFileRoute("/agent/delivery/$id")({
  head: () => ({ meta: [{ title: "Verify Delivery — TrustRoute" }] }),
  component: DeliveryFlow,
});

function DeliveryFlow() {
  const { id } = Route.useParams();
  const d = useApp((s) => s.deliveries.find((x) => x.id === id));
  const update = useApp((s) => s.updateStatus);
  const nav = useNavigate();

  const [step, setStep] = useState(0); // 0: Details, 1: GPS, 2: OTP, 3: Photo, 4: Review
  const [photo, setPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<string | null>(null);

  // HTML5 Web Camera Fallback States
  const [webcamActive, setWebcamActive] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [gpsState, setGpsState] = useState<"idle" | "loading" | "done">("idle");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = useRef<HTMLInputElement[]>([]);
  const otpFilled = otp.join("");
  const otpValid = d && otpFilled === d.otp;
  const [completing, setCompleting] = useState(false);
  const [hold, setHold] = useState(0);
  const holdRef = useRef<number | null>(null);
  const [remarks, setRemarks] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Payment integration states
  const [offlinePayment, setOfflinePayment] = useState<any>(null);
  const [codCollected, setCodCollected] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [collectedAmount, setCollectedAmount] = useState((d?.paymentAmount || 15.00).toString());
  const collectCodPayment = useApp((s) => s.collectCodPayment);
  const completeOnlinePayment = useApp((s) => s.completeOnlinePayment);

  // Online Checkout & QR States
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrTimer, setQrTimer] = useState<number>(300);

  // Canvas Drawing Pad States & Handlers
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Browser Webcam Sync Effect
  useEffect(() => {
    if (webcamActive && videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [webcamActive, mediaStream]);

  // Auto-launch camera when reaching Step 3 (Photo Evidence)
  useEffect(() => {
    if (step === 3 && !webcamActive && !photo) {
      launchCamera();
    }
  }, [step, webcamActive, photo]);

  // QR Code Timer Effect
  useEffect(() => {
    let interval: number;
    if (qrCodeUrl && qrTimer > 0) {
      interval = window.setInterval(() => {
        setQrTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [qrCodeUrl, qrTimer]);

  const generateUpiQr = () => {
    if (!d) return;
    const amountVal = d.paymentAmount || 15.00;
    const upiLink = `upi://pay?pa=trustroute@upi&pn=TrustRoute%20Logistics&am=${amountVal}&cu=INR`;
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`);
    setQrTimer(300);
    toast.success("Razorpay UPI Payment QR Code initialized.");
  };

  const handleRazorpayCheckout = async () => {
    if (!d) return;
    setCheckoutProcessing(true);

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error("Failed to load Razorpay Checkout SDK. Ensure network connectivity.");
      setCheckoutProcessing(false);
      return;
    }

    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TGsFUD44ioTAmN";
    const amountVal = d.paymentAmount || 15.00;

    const amountInSubunits = Math.round(amountVal * 100);

    const options = {
      key: keyId,
      amount: amountInSubunits,
      currency: "INR",
      name: "TrustRoute Logistics",
      description: `Billing Settlement for Delivery Ref: ${d.id}`,
      handler: async function (response: any) {
        setCompleting(true);
        try {
          const rzpPaymentId = response.razorpay_payment_id;
          await completeOnlinePayment(d.id, "card", amountVal, rzpPaymentId, {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
          toast.success("Payment authorized successfully via Razorpay!");
        } catch (err: any) {
          console.error("Failed to process Razorpay database settlement:", err);
          toast.error("Failed to write payment confirmation to database.");
        } finally {
          setCompleting(false);
          setCheckoutProcessing(false);
        }
      },
      prefill: {
        name: d.customer || "",
        contact: d.phone || "",
      },
      notes: {
        deliveryId: d.id,
        packageType: d.packageType,
      },
      theme: {
        color: "#B71C1C",
      },
      modal: {
        ondismiss: function () {
          toast.info("Payment cancelled by customer.");
          setCheckoutProcessing(false);
        }
      }
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        console.error("Razorpay payment failed:", response.error);
        toast.error(response.error.description || "Razorpay Payment Authorization Failed.");
        setCheckoutProcessing(false);
      });
      rzp.open();
    } catch (err) {
      console.error("Failed to open Razorpay Checkout modal:", err);
      toast.error("Failed to initialize payment window.");
      setCheckoutProcessing(false);
    }
  };

  // PDF Download State
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Stop media stream tracks on unmount to release camera resources
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  if (!d) throw notFound();

  // Watermark drawing function
  const watermarkImage = (base64Str: string, lat: number, lng: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        // Match image resolution
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        // Adjust dimensions based on image size
        const padding = Math.max(15, Math.round(img.width * 0.03));
        const fontSize = Math.max(16, Math.round(img.width * 0.035));
        const lineHeight = Math.round(fontSize * 1.4);

        ctx.font = `bold ${fontSize}px sans-serif`;

        // Render black background box at the bottom
        const boxHeight = padding * 2 + lineHeight * 3;
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(0, img.height - boxHeight, img.width, boxHeight);

        // Render text lines
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        const textY = img.height - boxHeight + padding;
        ctx.fillText(`TrustRoute Secured Handoff — ID: ${d.id}`, padding, textY);
        ctx.fillText(
          `GPS: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`,
          padding,
          textY + lineHeight,
        );
        ctx.fillText(`Verified: ${new Date().toLocaleString()}`, padding, textY + lineHeight * 2);

        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => resolve(base64Str);
      img.src = base64Str;
    });
  };

  // CAMERA LAUNCH ROUTINE
  const launchCamera = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });
        if (image.dataUrl) {
          const coords = gpsCoords || { lat: 37.7749, lng: -122.4194 };
          const watermarked = await watermarkImage(image.dataUrl, coords.lat, coords.lng);
          setPhotoFile(watermarked);
          setPhoto(true);
          toast.success("Native proof capture watermarked successfully!");
        }
      } catch (err: any) {
        console.error("Capacitor camera error:", err);
        if (!err.message?.includes("User cancelled")) {
          toast.error("Failed to launch native camera.");
        }
      }
    } else {
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
        } catch (e) {
          // Fallback if environment camera constraint fails (e.g. on Desktop)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setMediaStream(stream);
        setWebcamActive(true);
        toast.info("Browser camera viewfinder initialized.");
      } catch (err) {
        console.error("Browser webcam access error:", err);
        toast.error("Failed to access device camera stream. Check system permissions.");
      }
    }
  };

  const captureWebcam = async () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const coords = gpsCoords || { lat: 37.7749, lng: -122.4194 };
        const watermarked = await watermarkImage(dataUrl, coords.lat, coords.lng);
        setPhotoFile(watermarked);
        setPhoto(true);
        toast.success("Webcam photo captured and watermarked!");
      }
    } catch (err) {
      console.error("Error snapping picture from video stream:", err);
      toast.error("Failed to snap picture.");
    } finally {
      stopWebcam();
    }
  };

  const stopWebcam = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setWebcamActive(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        try {
          const coords = gpsCoords || { lat: 37.7749, lng: -122.4194 };
          const watermarked = await watermarkImage(dataUrl, coords.lat, coords.lng);
          setPhotoFile(watermarked);
          setPhoto(true);
          toast.success("Photo uploaded and watermarked successfully!");
        } catch (err) {
          console.error("Error processing uploaded photo:", err);
          toast.error("Failed to process uploaded photo.");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const startGps = () => {
    setGpsState("loading");
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your device.");
      setGpsState("idle");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGpsState("done");
        toast.success("GPS Location verification captured!");
      },
      (error) => {
        console.error("GPS capture error:", error);
        toast.error("Failed to capture live GPS location. Ensure location permission is granted.");
        setGpsState("idle");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleOtp = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 3) otpRefs.current[i + 1]?.focus();
  };

  const startHold = () => {
    holdRef.current = window.setInterval(() => {
      setHold((h) => {
        if (h >= 100) {
          stopHold();
          complete();
          return 100;
        }
        return h + 4;
      });
    }, 30);
  };

  const stopHold = () => {
    if (holdRef.current) clearInterval(holdRef.current);
    holdRef.current = null;
    setHold((h) => (h >= 100 ? h : 0));
  };

  const completingRef = useRef(false);

  const complete = async () => {
    if (completingRef.current) return;
    completingRef.current = true;
    setCompleting(true);
    try {
      const sanitizedRemarks = remarks.trim().slice(0, 150);
      const coords = gpsCoords || { lat: 37.7749, lng: -122.4194 };
      const dateStr = new Date().toISOString();
      const verifiedOtp = otpFilled;

      const dataToHash = `${d.id}-${verifiedOtp}-${coords.lat.toFixed(5)}-${coords.lng.toFixed(5)}-${dateStr}`;
      const msgBuffer = new TextEncoder().encode(dataToHash);
      let signatureHash = "0x000000...000000";
      if (crypto && crypto.subtle) {
        try {
          const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
          signatureHash = `0x${hashHex.slice(0, 6)}...${hashHex.slice(-6)}`;
        } catch (e) {
          console.warn("Crypto hash failed, using fallback");
        }
      }

      if (!isOnline) {
        const { queueOfflineSync } = await import("@/lib/offline-store");
        await queueOfflineSync({
          id: d.id,
          status: "delivered",
          proof: {
            photoBase64: photoFile || undefined,
            gps: coords,
            verifiedAt: dateStr,
            hash: signatureHash,
            remarks: sanitizedRemarks || undefined,
            otp: verifiedOtp,
            userAgent: navigator.userAgent,
          },
          synced: false,
          ...(offlinePayment ? {
            payment: {
              amount: offlinePayment.amount,
              paymentMethod: "cash",
              paymentType: "cod",
              paymentStatus: "cod_collected",
              customerSignature: offlinePayment.customerSignature || "",
              remarks: offlinePayment.remarks || "",
              collectedAt: dateStr,
              deviceId: navigator.userAgent.split("(")[0].trim() || "unknown",
              networkMode: "offline",
            }
          } : {})
        });

        toast.success("Delivery saved offline. It will sync automatically when back online.");
        setCompleting(false);
        nav({ to: "/agent" });
        return;
      }

      let uploadedPhotoUrl = "";
      if (photoFile) {
        try {
          const { ref, uploadString, getDownloadURL } = await import("firebase/storage");
          const { storage } = await import("@/lib/firebase");
          const imageRef = ref(storage, `proofs/${d.id}_${Date.now()}.jpg`);
          
          const uploadTask = async () => {
            await uploadString(imageRef, photoFile, "data_url");
            return await getDownloadURL(imageRef);
          };
          const timeoutTask = new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error("Storage upload timed out")), 5000)
          );
          
          uploadedPhotoUrl = await Promise.race([uploadTask(), timeoutTask]);
        } catch (err) {
          console.warn("Storage upload failed, proceeding with local base64 image:", err);
          // Fallback to the base64 image for demo purposes so it displays correctly
          uploadedPhotoUrl = photoFile;
        }
      }

      await update(d.id, "delivered", {
        photoUrl: uploadedPhotoUrl,
        gps: coords,
        verifiedAt: dateStr,
        hash: signatureHash,
      });

      if (sanitizedRemarks) {
        const { doc, updateDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        await updateDoc(doc(db, "deliveries", d.id), {
          notes: d.notes
            ? `${d.notes}\nRemarks: ${sanitizedRemarks}`
            : `Remarks: ${sanitizedRemarks}`,
        });
      }

      try {
        await useApp.getState().addNotification(
          "Delivery Completed",
          `Agent ${d.agentName || "Agent"} successfully verified delivery ${d.id} to ${d.customer}.`,
          d.enterpriseId
        );
      } catch (notifErr) {
        console.error("Failed to send verification notification:", notifErr);
      }

      toast.success("Delivery successfully verified!");
      setCompleting(false);
      nav({ to: "/agent" });
    } catch (err: any) {
      console.error("Error saving proof: ", err);
      toast.error(err.message || "Failed to confirm delivery.");
      setCompleting(false);
    } finally {
      completingRef.current = false;
      setCompleting(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!certRef.current) return;
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
      pdf.save(`TrustRoute-Certificate-${d.id}.pdf`);
      toast.success("Certificate PDF downloaded!");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF.");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(
    () => () => {
      if (holdRef.current) clearInterval(holdRef.current);
    },
    [],
  );

  // Verification timeline logs generator
  const getTimelineSteps = () => {
    const isPaidOrCodCollected = d.paymentStatus === "paid" || d.paymentStatus === "cod_collected" || codCollected;
    return [
      { label: "Dispatch Assigned", desc: "Delivery dispatched and assigned to agent.", done: true, time: "09:12 AM" },
      { label: "Live GPS Verification", desc: "Snapping agent coords at destination.", done: gpsState === "done" || d.status === "delivered", time: "Pending" },
      { label: "OTP Attestation", desc: "Recipient entering 4-digit code.", done: otpValid || d.status === "delivered", time: "Pending" },
      { label: "Physical Packaging Proof", desc: "Camera snapped evidence overlay.", done: photo || d.status === "delivered", time: "Pending" },
      { label: "Payment Verification", desc: d.paymentType === "cod" ? "COD cash collected." : "Prepaid online verified.", done: isPaidOrCodCollected || d.status === "delivered", time: "Pending" },
      { label: "Cryptographic Certificate", desc: "Generate SHA signature & sync.", done: d.status === "delivered", time: "Pending" },
    ];
  };

  const timelineSteps = getTimelineSteps();

  // RENDER COMPLETED STATE (CERTIFICATE ATTATION SCREEN)
  if (d.status === "delivered") {
    return (
      <div className="space-y-6 text-left text-zinc-300">
        {/* Back and Sync Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            to="/agent"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Route overview
          </Link>
          <button
            onClick={handleDownloadCertificate}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4.5 py-2.5 text-xs font-bold text-white shadow-glow cursor-pointer disabled:opacity-50 transition"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Saving A4 PDF..." : "Download Certificate"}
          </button>
        </div>

        {/* Desktop Split Panels Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Left Panel: Attestation Details (Audit log, Customer info, GPS info) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Delivery Information Section */}
            <div className="rounded-2xl bg-[#0F1424] border border-zinc-850 p-5 space-y-4">
              <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-zinc-850/60 pb-2">
                <Info className="h-4 w-4 text-[#FF4D4D]" /> Delivery Information
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Parcel ID:</span>
                  <span className="font-mono text-zinc-300 font-bold">{d.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Payload Type:</span>
                  <span className="font-semibold text-zinc-300">{d.packageType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Priority Level:</span>
                  <span className="font-semibold text-[#FF4D4D]">{d.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Route Distance:</span>
                  <span className="font-semibold text-zinc-300">{d.distanceKm} km</span>
                </div>
              </div>
            </div>

            {/* Customer Information Section */}
            <div className="rounded-2xl bg-[#0F1424] border border-zinc-850 p-5 space-y-4">
              <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-zinc-850/60 pb-2">
                <User className="h-4 w-4 text-[#FF4D4D]" /> Customer Information
              </h3>
              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-[#FF4D4D] mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">{d.customer}</div>
                    <div className="text-zinc-500 text-[11px] mt-0.5">{d.phone}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 border-t border-zinc-850/60 pt-3">
                  <Map className="h-4 w-4 text-[#FF4D4D] mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">Destination Address</div>
                    <div className="text-zinc-450 text-[11px] mt-0.5 leading-relaxed">
                      {d.destination}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GPS Verification Section */}
            <div className="rounded-2xl bg-[#0F1424] border border-zinc-850 p-5 space-y-4">
              <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-zinc-850/60 pb-2">
                <MapPin className="h-4 w-4 text-[#FF4D4D]" /> GPS & Verification Logs
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-850 flex justify-between">
                  <span className="text-zinc-500">Live Latitude:</span>
                  <span className="font-mono text-white font-bold">
                    {d.proof?.gps?.lat?.toFixed(5) ?? "—"}° N
                  </span>
                </div>
                <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-850 flex justify-between">
                  <span className="text-zinc-500">Live Longitude:</span>
                  <span className="font-mono text-white font-bold">
                    {d.proof?.gps?.lng?.toFixed(5) ?? "—"}° E
                  </span>
                </div>
                <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-850 flex justify-between">
                  <span className="text-zinc-500">Attestation Timestamp:</span>
                  <span className="text-white font-bold">
                    {d.proof?.verifiedAt
                      ? new Date(d.proof.verifiedAt).toLocaleTimeString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit & Sync Status Section */}
            <div className="rounded-2xl bg-[#0F1424] border border-zinc-850 p-5 space-y-4">
              <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-zinc-850/60 pb-2">
                <ShieldCheck className="h-4 w-4 text-[#FF4D4D]" /> Cryptographic Hash
              </h3>
              <div className="text-xs font-mono bg-zinc-950/45 p-3 rounded-xl border border-zinc-850 text-zinc-400 break-all leading-relaxed">
                {d.proof?.hash ?? "—"}
              </div>
            </div>
          </div>

          {/* Right Panel: White attestation PDF mockup */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-450 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[#FF4D4D]" /> Attestation certificate preview
            </h2>

            <div
              ref={certRef}
              className="w-full rounded-3xl bg-white p-6 text-slate-900 border border-slate-200 shadow-elevated relative"
            >
              {/* Decorative paper headers */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2 text-left">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#B71C1C]">
                    <span className="text-xs font-bold text-white font-mono">TR</span>
                  </div>
                  <div>
                    <span className="text-sm font-extrabold text-slate-950 block">
                      TrustRoute Attestation
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                      Delivery attestation receipt
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">ID</div>
                  <div className="font-mono text-xs font-bold text-slate-950">{d.id}</div>
                </div>
              </div>

              {/* Attestation Header Body */}
              <div className="mt-6 text-center">
                <h2 className="text-lg font-black text-slate-950 tracking-tight">
                  Delivery Verification Receipt
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Cryptographically secured handoff evidence overlay.
                </p>
              </div>

              {/* Photo Proof (if exists) */}
              {d.proof?.photoUrl && (
                <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 relative aspect-video max-h-44">
                  <img
                    src={d.proof.photoUrl}
                    alt="Attestation Proof"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Fields */}
              <div className="mt-6 space-y-2 text-xs text-left">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                    Recipient Name
                  </span>
                  <span className="font-bold text-slate-950">{d.customer}</span>
                </div>

                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                    Destination Coordinates / Address
                  </span>
                  <span className="text-slate-900 block font-medium leading-snug">{d.destination}</span>
                  <span className="text-[10px] font-mono text-slate-500 block mt-1">
                    GPS Lat/Lng: {d.proof?.gps?.lat?.toFixed(5) ?? "—"}, {d.proof?.gps?.lng?.toFixed(5) ?? "—"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                      Payload
                    </span>
                    <span className="text-slate-950 font-semibold">{d.packageType}</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                      Attested On
                    </span>
                    <span className="text-slate-950 font-semibold">
                      {d.proof?.verifiedAt
                        ? new Date(d.proof.verifiedAt).toLocaleDateString()
                        : new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-2.5">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">
                    Handoff Digital Signature
                  </span>
                  <span className="font-mono text-[9px] break-all text-slate-700 block leading-tight">
                    {d.proof?.hash ?? "—"}
                  </span>
                </div>
              </div>

              {/* Verification Stamp footer */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-left">
                <div className="h-10 w-10 bg-[repeating-linear-gradient(90deg,#000_0,#000_2px,transparent_2px,transparent_4px)] opacity-30" />
                <div className="h-12 w-12 border-[3px] border-emerald-600 rounded-full grid place-items-center text-emerald-700 font-extrabold text-[8px] rotate-[-12deg] shadow-sm shrink-0 select-none">
                  VERIFIED
                </div>
                <div className="text-right">
                  <div className="border-b border-slate-300 font-[cursive] text-xs italic text-slate-800">
                    TrustRoute Attest
                  </div>
                  <div className="text-[8px] text-slate-400 mt-0.5">Secure attestation attachement</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER ACTIVE VERIFICATION STEPS (stepper flow)
  return (
    <div className="space-y-6 text-left text-zinc-300">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/agent"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Cancel verification
        </Link>

        {/* Sync / Online Indicator */}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
            isOnline
              ? "bg-green-950/20 text-green-400 border-green-500/25"
              : "bg-orange-950/20 text-orange-400 border-orange-500/25",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-green-400 animate-pulse" : "bg-orange-400")} />
          {isOnline ? "Network Connected" : "Network Disconnected"}
        </span>
      </div>

      {/* Grid panels layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left column sections: Delivery info, Recipient details, Audit logs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Delivery Info Section */}
          <div className="rounded-2xl bg-[#0F1424] border border-zinc-850 p-5 space-y-4">
            <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-zinc-850/60 pb-2">
              <Info className="h-4 w-4 text-[#FF4D4D]" /> Delivery Information
            </h3>
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Parcel ID:</span>
                <span className="font-mono text-zinc-300 font-bold">{d.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-850">
                  <span className="text-zinc-500 block text-[9px] uppercase">Payload</span>
                  <span className="font-bold text-white">{d.packageType}</span>
                </div>
                <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-850">
                  <span className="text-zinc-500 block text-[9px] uppercase">Priority</span>
                  <span className="font-bold text-red-400">{d.priority}</span>
                </div>
              </div>
              {d.notes && (
                <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-850">
                  <span className="text-zinc-500 block text-[9px] uppercase">
                    Handling Instruction
                  </span>
                  <p className="text-[11px] text-zinc-350 leading-relaxed mt-1">{d.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Customer Info Section */}
          <div className="rounded-2xl bg-[#0F1424] border border-zinc-850 p-5 space-y-4">
            <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-zinc-850/60 pb-2">
              <User className="h-4 w-4 text-[#FF4D4D]" /> Customer Information
            </h3>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-[#FF4D4D] mt-0.5" />
                <div>
                  <div className="font-semibold text-white">{d.customer}</div>
                  <div className="text-zinc-500 text-[11px] mt-0.5">{d.phone}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 border-t border-zinc-850/60 pt-3">
                <Map className="h-4 w-4 text-[#FF4D4D] mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Destination Address</div>
                  <div className="text-zinc-450 text-[11px] mt-0.5 leading-relaxed">
                    {d.destination}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Timeline / Step list */}
          <div className="rounded-2xl bg-[#0F1424] border border-zinc-850 p-5 space-y-4">
            <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-zinc-850/60 pb-2">
              <Clock className="h-4 w-4 text-[#FF4D4D]" /> Audit Timeline Status
            </h3>
            <div className="relative pl-5.5 space-y-4 text-xs">
              <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-zinc-850" />
              {timelineSteps.map((s, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={cn(
                      "absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 grid place-items-center",
                      s.done
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-650",
                    )}
                  >
                    {s.done && <Check className="h-2 w-2 stroke-[4px]" />}
                  </div>
                  <div>
                    <div className={cn("font-bold", s.done ? "text-white" : "text-zinc-500")}>
                      {s.label}
                    </div>
                    <p className="text-[10px] text-zinc-550 mt-0.5 leading-snug">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column sections: Stepper workflow area */}
        <div className="lg:col-span-3 space-y-5">
          {/* Stepper progress indicator */}
          <div className="rounded-2xl bg-[#0F1424] border border-zinc-850 p-4.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-550 uppercase tracking-widest font-mono">
              <span>Verification Workspace</span>
              <span>Step {step} of 5</span>
            </div>
            <div className="mt-3.5 flex gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-300",
                    step >= s ? "bg-[#B71C1C] shadow-glow" : "bg-zinc-850",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Stepper Forms Workspace */}
          <div className="rounded-3xl bg-[#0F1424] border border-zinc-850 p-6 shadow-elevated min-h-[300px] flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6 text-left"
                >
                  <div>
                    <h3 className="text-lg font-black text-white">Start Verification Workspace</h3>
                    <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
                      Confirm recipient credentials and begin security logs (GPS coords capture, SMS OTP attestation, watermarked photo snappings).
                    </p>
                  </div>

                  <div className="bg-zinc-950/30 border border-zinc-850 rounded-2xl p-4.5 flex gap-3 text-xs leading-relaxed text-zinc-400">
                    <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Device Attestation Notice</span>
                      This handoff session uses cryptographic secure auditing. Ensure camera permissions and location services are enabled on this terminal.
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(1)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#B71C1C] to-red-600 hover:opacity-90 py-4 text-sm font-bold text-white shadow-glow transition cursor-pointer"
                  >
                    Start Attestation Flow <CheckCircle2 className="h-4.5 w-4.5" />
                  </button>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-black text-white">Step 1: Location Coords Snapping</h3>
                    <p className="text-xs text-zinc-450 mt-1">
                      Snap live device GPS coordinates to verify handover at destination.
                    </p>
                  </div>

                  <button
                    onClick={startGps}
                    disabled={gpsState === "loading"}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-bold uppercase tracking-wider transition border cursor-pointer",
                      gpsState === "done"
                        ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/20"
                        : "bg-[#B71C1C] hover:bg-[#961717] text-white shadow-glow",
                    )}
                  >
                    {gpsState === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Fetching GPS Coords...
                      </>
                    ) : gpsState === "done" ? (
                      <>
                        <CheckCircle2 className="h-4.5 w-4.5" /> Location Authenticated
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4.5 w-4.5" /> Snap Device Location
                      </>
                    )}
                  </button>

                  {gpsState === "done" && gpsCoords && (
                    <div className="rounded-2xl border border-zinc-850 overflow-hidden bg-zinc-950/30">
                      <div className="h-32 bg-zinc-950/80 grid place-items-center relative">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05),transparent_70%)]" />
                        <div className="text-center relative z-10">
                          <MapPin className="mx-auto h-7 w-7 text-[#FF4D4D] animate-bounce" />
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mt-2">
                            Secure Coords Lock active
                          </span>
                        </div>
                      </div>
                      <div className="p-4.5 border-t border-zinc-850 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Latitude:</span>
                          <span className="font-bold text-zinc-300">{gpsCoords.lat.toFixed(6)}°</span>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-zinc-500">Longitude:</span>
                          <span className="font-bold text-zinc-300">{gpsCoords.lng.toFixed(6)}°</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-zinc-850/60">
                    <button
                      onClick={() => setStep(0)}
                      className="flex-1 rounded-2xl border border-zinc-800 py-3.5 text-xs font-bold hover:bg-zinc-850/40 transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      disabled={gpsState !== "done"}
                      onClick={() => setStep(2)}
                      className="flex-1 rounded-2xl bg-[#B71C1C] hover:bg-[#961717] py-3.5 text-xs font-bold text-white shadow-glow disabled:opacity-30 transition cursor-pointer"
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-black text-white">Step 2: Recipient OTP Attestation</h3>
                    <p className="text-xs text-zinc-450 mt-1">
                      Verify SMS OTP attestation code generated during parcel dispatch.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-center gap-3.5">
                      {otp.map((v, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            if (el) otpRefs.current[i] = el;
                          }}
                          value={v}
                          onChange={(e) => handleOtp(i, e.target.value)}
                          inputMode="numeric"
                          maxLength={1}
                          className={cn(
                            "h-14 w-12 rounded-xl border bg-zinc-950 font-mono text-2xl font-bold text-center outline-none transition",
                            v ? "border-[#B71C1C] text-[#FF4D4D] shadow-glow" : "border-zinc-800 text-white",
                            otpFilled.length === 4 && isOnline && !otpValid && "border-rose-500 text-rose-400",
                          )}
                        />
                      ))}
                    </div>

                    {!isOnline && (
                      <div className="rounded-xl border border-orange-500/10 bg-orange-950/10 p-3 text-center text-xs text-orange-400 font-semibold leading-relaxed">
                        Offline status: code verification runs on next cloud database synchronization.
                      </div>
                    )}

                    {isOnline && otpFilled.length === 4 &&
                      (otpValid ? (
                        <div className="text-center mt-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/30 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-400 font-bold">
                            <ShieldCheck className="h-4 w-4" /> Code attested successfully
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-rose-400 text-center font-bold">
                          Attestation mismatch. Verify OTP sequence.
                        </div>
                      ))}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-zinc-850/60">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 rounded-2xl border border-zinc-800 py-3.5 text-xs font-bold hover:bg-zinc-850/40 transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      disabled={isOnline ? !otpValid : otpFilled.length !== 4}
                      onClick={() => setStep(3)}
                      className="flex-1 rounded-2xl bg-[#B71C1C] hover:bg-[#961717] py-3.5 text-xs font-bold text-white shadow-glow disabled:opacity-30 transition cursor-pointer"
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-black text-white">Step 3: Packaging Evidence Snapping</h3>
                    <p className="text-xs text-zinc-450 mt-1">
                      Snap parcel packaging at handoff point. Security details are watermarked onto evidence.
                    </p>
                  </div>

                  {webcamActive ? (
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-zinc-800">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 z-10">
                        <button
                          type="button"
                          onClick={captureWebcam}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Snap Photo
                        </button>
                        <button
                          type="button"
                          onClick={stopWebcam}
                          className="bg-zinc-850 hover:bg-zinc-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div
                        onClick={launchCamera}
                        className={cn(
                          "relative grid aspect-video w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition-all cursor-pointer",
                          photo
                            ? "border-emerald-500/40 bg-emerald-950/10"
                            : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/30",
                        )}
                      >
                        {photo && photoFile ? (
                          <div className="absolute inset-0">
                            <img
                              src={photoFile}
                              alt="Watermarked proof"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/10" />
                            <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-400 backdrop-blur-md font-bold">
                              <CheckCircle2 className="h-3 w-3" /> Photo Watermarked
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-zinc-500">
                            <Camera className="mx-auto h-8 w-8 text-[#B71C1C] animate-pulse" />
                            <div className="mt-2.5 text-xs font-bold text-zinc-300">
                              Launch Device Camera
                            </div>
                            <div className="text-[10px] text-zinc-650 mt-1">
                              Triggers native/web viewfinder streams
                            </div>
                          </div>
                        )}
                      </div>

                      {!photo && !webcamActive && (
                        <div className="flex justify-center">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer shadow-sm"
                          >
                            <Upload className="h-4 w-4" /> Upload Photo Instead
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-zinc-850/60">
                    <button
                      onClick={() => {
                        stopWebcam();
                        setStep(2);
                      }}
                      className="flex-1 rounded-2xl border border-zinc-800 py-3.5 text-xs font-bold hover:bg-zinc-850/40 transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      disabled={!photo || webcamActive}
                      onClick={() => setStep(4)}
                      className="flex-1 rounded-2xl bg-[#B71C1C] hover:bg-[#961717] py-3.5 text-xs font-bold text-white shadow-glow disabled:opacity-30 transition cursor-pointer"
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-black text-white">Step 4: Payment Verification</h3>
                    <p className="text-xs text-zinc-450 mt-1">
                      {d.paymentType === "cod"
                        ? "Record cash collection from customer at destination."
                        : "Verify receipt of online prepaid funds."}
                    </p>
                  </div>

                  {d.paymentType === "cod" || (!isOnline && d.paymentStatus !== "paid") ? (
                    <div className="space-y-4 text-left">
                      {d.paymentType !== "cod" && !isOnline && d.paymentStatus !== "paid" && (
                        <div className="rounded-xl border border-orange-500/20 bg-orange-950/20 p-3 text-center text-xs text-orange-400 font-bold leading-relaxed mb-2">
                          Device is offline. Online payment gateways are disabled. Please collect Cash on Delivery (COD) as a fallback.
                        </div>
                      )}
                      <div className="bg-zinc-950/45 p-4.5 rounded-xl border border-zinc-850 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-bold">Total Amount to Collect:</span>
                          <span className="text-lg font-black text-white font-mono">${(d.paymentAmount || 15.00).toFixed(2)}</span>
                        </div>
                      </div>

                      {codCollected || d.paymentStatus === "cod_collected" ? (
                        <div className="rounded-xl border border-emerald-500/10 bg-emerald-950/15 p-4 text-center text-xs text-emerald-400 font-semibold leading-relaxed">
                          COD Payment recorded successfully! ✓
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] uppercase font-bold text-zinc-550 block">
                                Collected Amount ($)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={collectedAmount}
                                onChange={(e) => setCollectedAmount(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs outline-none focus:border-[#B71C1C] text-zinc-200 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-zinc-550 block">
                                Recipient Name
                              </label>
                              <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Name of person signing..."
                                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs outline-none focus:border-[#B71C1C] text-zinc-200"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-550 block mb-1">
                              Customer Drawing Signature (Canvas)
                            </label>
                            <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/70 h-36">
                              <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                width={320}
                                height={144}
                                className="w-full h-full touch-none cursor-crosshair"
                              />
                              <button
                                type="button"
                                onClick={clearCanvas}
                                className="absolute bottom-2.5 right-2.5 rounded bg-zinc-800/85 hover:bg-zinc-800 px-2 py-1 text-[9px] font-bold text-zinc-300 transition cursor-pointer"
                              >
                                Clear Pad
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-550 block">
                              Payment Remarks (optional)
                            </label>
                            <textarea
                              value={paymentRemarks}
                              onChange={(e) => setPaymentRemarks(e.target.value)}
                              placeholder="Cash collected details..."
                              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs outline-none focus:border-[#B71C1C] text-zinc-200"
                              rows={2}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              const amountVal = parseFloat(collectedAmount) || d.paymentAmount || 15.00;
                              let sigDataUrl = "";
                              if (canvasRef.current) {
                                sigDataUrl = canvasRef.current.toDataURL("image/png");
                              }

                              if (isOnline) {
                                try {
                                  setCompleting(true);
                                  await collectCodPayment(d.id, amountVal, sigDataUrl, paymentRemarks);
                                  setCodCollected(true);
                                  toast.success("Cash payment logged in Firestore!");
                                } catch (err: any) {
                                  toast.error(err.message || "Failed to log cash payment.");
                                } finally {
                                  setCompleting(false);
                                }
                              } else {
                                setOfflinePayment({
                                  amount: amountVal,
                                  customerSignature: sigDataUrl,
                                  remarks: paymentRemarks,
                                });
                                setCodCollected(true);
                                toast.success("COD recorded offline. Saved to local queue.");
                              }
                            }}
                            className="w-full bg-[#B71C1C] hover:bg-[#961717] py-3.5 text-xs font-bold text-white rounded-xl shadow-glow cursor-pointer transition uppercase"
                          >
                            Confirm Cash Collected
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 text-left">
                      <div className="bg-zinc-950/45 p-4 rounded-xl border border-zinc-850 text-xs flex justify-between items-center">
                        <span className="text-zinc-500 font-bold">Billing Status:</span>
                        <span className={cn(
                          "font-bold uppercase",
                          d.paymentStatus === "paid" ? "text-emerald-400" : "text-amber-500 animate-pulse"
                        )}>
                          {d.paymentStatus === "paid" ? "Prepaid Paid ✓" : "Prepaid Pending"}
                        </span>
                      </div>

                      {d.paymentStatus === "paid" ? (
                        <div className="rounded-xl border border-emerald-500/10 bg-emerald-950/15 p-4 text-center text-xs text-emerald-400 font-semibold leading-relaxed">
                          Prepaid Payment confirmed! Verification complete.
                        </div>
                      ) : (
                        <div className="space-y-4.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={handleRazorpayCheckout}
                              disabled={checkoutProcessing}
                              className="w-full bg-[#B71C1C] hover:bg-[#961717] py-3.5 text-xs font-bold text-white rounded-xl shadow-glow cursor-pointer transition uppercase disabled:opacity-50"
                            >
                              {checkoutProcessing ? "Initializing SDK..." : "Pay via Razorpay"}
                            </button>
                            <button
                              type="button"
                              onClick={generateUpiQr}
                              className="w-full bg-zinc-800 hover:bg-zinc-750 py-3.5 text-xs font-bold text-zinc-100 rounded-xl cursor-pointer transition uppercase"
                            >
                              Generate UPI QR
                            </button>
                          </div>

                          {qrCodeUrl && (
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4.5 text-center space-y-3.5">
                              <p className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">
                                Customer QR Scan (UPI Checkout)
                              </p>
                              <div className="mx-auto h-48 w-48 bg-white p-2 rounded-xl flex items-center justify-center">
                                <img src={qrCodeUrl} alt="UPI QR" className="h-full w-full object-contain" />
                              </div>
                              <div className="text-xs text-zinc-400 font-medium">
                                QR expires in <span className="font-mono text-white font-bold">{Math.floor(qrTimer / 60)}:{(qrTimer % 60).toString().padStart(2, "0")}</span>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    setCompleting(true);
                                    const mockPayId = `pay_qr_${crypto.randomUUID().split("-")[0].toUpperCase()}`;
                                    await completeOnlinePayment(d.id, "upi", d.paymentAmount || 15.00, mockPayId, {
                                      razorpay_payment_id: mockPayId,
                                      razorpay_order_id: `order_qr_${crypto.randomUUID().split("-")[0].toUpperCase()}`,
                                      razorpay_signature: "simulated_qr_hash"
                                    });
                                    setQrCodeUrl(null);
                                    toast.success("UPI QR Code scanned and settled successfully!");
                                  } catch (err: any) {
                                    toast.error(err.message || "Failed to finalize QR payment.");
                                  } finally {
                                    setCompleting(false);
                                  }
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer"
                              >
                                Verify / Simulate Scan Success
                              </button>
                            </div>
                          )}

                          <div className="rounded-xl border border-rose-500/10 bg-rose-950/15 p-4 text-xs text-rose-450 font-semibold leading-relaxed space-y-2 text-center">
                            <p>
                              Alternative: Customer can also scan parcel barcode on receipt or visit:
                            </p>
                            <div className="font-mono bg-black/45 p-2 rounded-lg text-[10px] break-all select-all text-white border border-zinc-850">
                              {window.location.origin}/payment/{d.id}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-zinc-850/60">
                    <button
                      onClick={() => setStep(3)}
                      className="flex-1 rounded-2xl border border-zinc-800 py-3.5 text-xs font-bold hover:bg-zinc-850/40 transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      disabled={d.paymentType === "cod" ? !codCollected && d.paymentStatus !== "cod_collected" : d.paymentStatus !== "paid"}
                      onClick={() => setStep(5)}
                      className="flex-1 rounded-2xl bg-[#B71C1C] hover:bg-[#961717] py-3.5 text-xs font-bold text-white shadow-glow disabled:opacity-30 transition cursor-pointer"
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-black text-white">Step 5: Audit & Confirmation</h3>
                    <p className="text-xs text-zinc-450 mt-1">
                      Verify snapped evidence credentials before generating signature.
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-3 bg-zinc-950/45 rounded-xl border border-zinc-850">
                      <span className="text-zinc-500 font-bold">Location Coords:</span>
                      <span className="font-mono text-zinc-300 font-bold">
                        {gpsCoords
                          ? `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}`
                          : "Unavailable"}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-zinc-950/45 rounded-xl border border-zinc-850">
                      <span className="text-zinc-500 font-bold">SMS Attestation:</span>
                      <span className="text-zinc-300 font-bold">
                        {isOnline ? "Verified Verified ✓" : `Offline (Code: ${otpFilled})`}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-zinc-950/45 rounded-xl border border-zinc-850">
                      <span className="text-zinc-500 font-bold">Payment Status:</span>
                      <span className="text-zinc-300 font-bold capitalize">
                        {d.paymentStatus === "paid" || d.paymentStatus === "cod_collected" || codCollected ? "Paid / Collected ✓" : "Pending"}
                      </span>
                    </div>
                    {photoFile && (
                      <div className="rounded-xl border border-zinc-850 overflow-hidden relative aspect-video bg-zinc-950/60 max-h-36">
                        <img
                          src={photoFile}
                          alt="Handoff snap"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-1 text-left pt-2">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block">
                        Attestation Notes / Remarks
                      </label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Snap description details (optional)..."
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs outline-none focus:border-[#B71C1C] text-zinc-200 placeholder:text-zinc-650"
                        rows={3}
                        maxLength={150}
                      />
                      <div className="text-right text-[9px] text-zinc-550 font-bold">
                        {remarks.length}/150
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-zinc-850/60">
                    <button
                      onClick={() => setStep(4)}
                      className="flex-1 rounded-2xl border border-zinc-800 py-3.5 text-xs font-bold hover:bg-zinc-850/40 transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={complete}
                      disabled={completing}
                      className="flex-[2] relative flex h-12 select-none items-center justify-center overflow-hidden rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-[#B71C1C] hover:bg-[#961717] shadow-glow cursor-pointer transition disabled:opacity-50"
                    >
                      <span className="relative z-10">
                        {completing ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Finalizing...
                          </span>
                        ) : (
                          "Attest & Upload"
                        )}
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {completing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-md">
          <div className="text-center text-white space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#B71C1C]" />
            <p className="text-xs font-bold uppercase tracking-wider">Confirming attestation transactions...</p>
          </div>
        </div>
      )}
    </div>
  );
}
