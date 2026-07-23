import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Database,
  UploadCloud,
  Camera,
  MapPin,
  Bell,
  WifiOff,
  FileCheck,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { queueOfflineSync } from "@/lib/offline-store";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/testing")({
  head: () => ({ meta: [{ title: "Diagnostic Testing Hub — TrustRoute" }] }),
  component: DiagnosticHub,
});

function DiagnosticHub() {
  const user = useApp((s) => s.user);
  const triggerAutoSync = useApp((s) => s.triggerAutoSync);
  const addNotification = useApp((s) => s.addNotification);

  // Diagnostic states
  const [dbState, setDbState] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [dbLog, setDbLog] = useState("");

  const [storageState, setStorageState] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [storageLog, setStorageLog] = useState("");

  const [cameraState, setCameraState] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [cameraLog, setCameraLog] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [gpsState, setGpsState] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [gpsLog, setGpsLog] = useState("");

  const [notifState, setNotifState] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [notifLog, setNotifLog] = useState("");

  const [syncState, setSyncState] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [syncLog, setSyncLog] = useState("");

  const [pdfState, setPdfState] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [pdfLog, setPdfLog] = useState("");
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  // Firestore Connection Test
  const testFirestore = async () => {
    setDbState("testing");
    setDbLog("Initializing write transaction to /tests/connection_test...");
    try {
      const testRef = doc(db, "tests", "connection_test");
      const writePayload = {
        status: "active",
        timestamp: new Date().toISOString(),
        testerId: user?.uid || "anonymous",
      };
      await setDoc(testRef, writePayload);
      setDbLog((l) => `${l}\n✓ Write successful. Attempting read transaction...`);

      const docSnap = await getDoc(testRef);
      if (docSnap.exists() && docSnap.data().testerId === (user?.uid || "anonymous")) {
        setDbLog(
          (l) => `${l}\n✓ Read transaction matched written payload.\nFirestore is fully connected.`
        );
        setDbState("success");
        toast.success("Firestore test passed!");
      } else {
        throw new Error("Read mismatch or missing test document.");
      }
    } catch (err: any) {
      console.error(err);
      setDbLog((l) => `${l}\n✗ Error: ${err.message || err}`);
      setDbState("failed");
      toast.error("Firestore test failed.");
    }
  };

  // Storage Upload Test
  const testStorage = async () => {
    setStorageState("testing");
    setStorageLog("Compiling mock proof segment upload to proofs/diagnostic_test.txt...");
    try {
      const testFileRef = ref(storage, "proofs/diagnostic_test.txt");
      const mockContent = `data:text/plain;base64,${btoa(
        `TrustRoute Storage Test - Verified on ${new Date().toISOString()}`
      )}`;

      await uploadString(testFileRef, mockContent, "data_url");
      setStorageLog((l) => `${l}\n✓ Content successfully uploaded to storage bucket.`);

      const url = await getDownloadURL(testFileRef);
      setStorageLog((l) => `${l}\n✓ Download URL fetched successfully:\n${url}`);
      setStorageState("success");
      toast.success("Storage upload test passed!");
    } catch (err: any) {
      console.error(err);
      setStorageLog((l) => `${l}\n✗ Error: ${err.message || err}`);
      setStorageState("failed");
      toast.error("Storage test failed.");
    }
  };

  // Camera Viewfinder Test
  const testCamera = async () => {
    setCameraState("testing");
    setCameraLog("Requesting video stream facingMode: environment...");
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(media);
      if (videoRef.current) {
        videoRef.current.srcObject = media;
      }
      setCameraLog((l) => `${l}\n✓ Viewfinder feed connected. Camera permissions verified.`);
      setCameraState("success");
      toast.success("Camera test passed!");
    } catch (err: any) {
      console.error(err);
      setCameraLog((l) => `${l}\n✗ Camera stream error: ${err.message || err}`);
      setCameraState("failed");
      toast.error("Camera access failed.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraState("idle");
    setCameraLog("Camera stopped.");
  };

  // Geolocation GPS Test
  const testGps = () => {
    setGpsState("testing");
    setGpsLog("Retrieving current geoposition coordinates...");
    if (!navigator.geolocation) {
      setGpsLog((l) => `${l}\n✗ Geolocation API is not supported by this browser.`);
      setGpsState("failed");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLog(
          (l) =>
            `${l}\n✓ Position resolved:\nLat: ${pos.coords.latitude.toFixed(6)}°\nLng: ${pos.coords.longitude.toFixed(6)}°\nAccuracy: ±${pos.coords.accuracy}m`
        );
        setGpsState("success");
        toast.success("GPS Geolocation test passed!");
      },
      (err) => {
        console.error(err);
        setGpsLog((l) => `${l}\n✗ Geolocation resolve failed: ${err.message}`);
        setGpsState("failed");
        toast.error("GPS test failed.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Notification Pipeline Test
  const testNotification = async () => {
    if (!user) {
      toast.error("You must be logged in to test notifications.");
      return;
    }
    setNotifState("testing");
    setNotifLog(`Posting system diagnostic test alert to target UID: ${user.uid}...`);
    try {
      await addNotification(
        "Diagnostic Alert",
        `Test message generated by diagnostic interface at ${new Date().toLocaleTimeString()}`,
        user.uid
      );
      setNotifLog((l) => `${l}\n✓ Notification pushed to Firestore collection.\nCheck dropdown bell.`);
      setNotifState("success");
      toast.success("Notification sent!");
    } catch (err: any) {
      console.error(err);
      setNotifLog((l) => `${l}\n✗ Alert error: ${err.message || err}`);
      setNotifState("failed");
    }
  };

  // Offline Sync Queue Mocking Test
  const testOfflineSync = async () => {
    setSyncState("testing");
    setSyncLog("Injecting diagnostic delivery item into IndexedDB queue...");
    try {
      const mockDeliveryId = `TEST-SYNC-${Math.floor(1000 + Math.random() * 9000)}`;
      await queueOfflineSync({
        id: mockDeliveryId,
        status: "delivered",
        proof: {
          gps: { lat: 37.7749, lng: -122.4194 },
          verifiedAt: new Date().toISOString(),
          hash: "0xDiagnosticVerifySync",
          remarks: "Diagnostic sync loop mock",
          otp: "0000",
          userAgent: navigator.userAgent,
        },
        synced: false,
      });

      setSyncLog((l) => `${l}\n✓ Delivery queued in IndexedDB. Triggering autoSync process...`);
      await triggerAutoSync();
      setSyncLog(
        (l) =>
          `${l}\n✓ Auto-sync execution completed. If online, check delivery ledger for ${mockDeliveryId}.`
      );
      setSyncState("success");
      toast.success("Offline sync execution test completed!");
    } catch (err: any) {
      console.error(err);
      setSyncLog((l) => `${l}\n✗ Sync loop error: ${err.message || err}`);
      setSyncState("failed");
      toast.error("Offline sync test failed.");
    }
  };

  // PDF Download Compiler Test
  const testPdfGeneration = async () => {
    if (!pdfTemplateRef.current) return;
    setPdfState("testing");
    setPdfLog("Compiling element DOM container into canvas representation...");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).jsPDF;

      const canvas = await html2canvas(pdfTemplateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      setPdfLog((l) => `${l}\n✓ DOM canvas prepared successfully.`);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save("TrustRoute-Diagnostic-Report.pdf");

      setPdfLog((l) => `${l}\n✓ PDF successfully compiled and triggered for browser download.`);
      setPdfState("success");
      toast.success("PDF Download compiled!");
    } catch (err: any) {
      console.error(err);
      setPdfLog((l) => `${l}\n✗ Compiler error: ${err.message || err}`);
      setPdfState("failed");
      toast.error("PDF test failed.");
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-zinc-900 font-['Poppins',sans-serif]">
          System Diagnostic Hub
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Perform component verification tests across browser APIs, Firestore databases, Cloud Storage, and local document compilers.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Firestore Test Card */}
        <TestCard
          title="Firestore Database Test"
          description="Write and read back verification test documents."
          icon={Database}
          state={dbState}
          log={dbLog}
          onTest={testFirestore}
        />

        {/* Storage Test Card */}
        <TestCard
          title="Cloud Storage Handoff Test"
          description="Upload dummy proofs to Storage buckets and retrieve URL."
          icon={UploadCloud}
          state={storageState}
          log={storageLog}
          onTest={testStorage}
        />

        {/* Geolocation GPS Card */}
        <TestCard
          title="GPS Geolocation API"
          description="Test browser geolocation accuracy and coordinate mapping."
          icon={MapPin}
          state={gpsState}
          log={gpsLog}
          onTest={testGps}
        />

        {/* Notifications Card */}
        <TestCard
          title="Notification Pipeline Test"
          description="Dispatch user notification alert records to current profile."
          icon={Bell}
          state={notifState}
          log={notifLog}
          onTest={testNotification}
        />

        {/* Offline Sync Card */}
        <TestCard
          title="Offline Sync Queue Loop"
          description="Mock offline IndexedDB parcel, sync and verify online."
          icon={WifiOff}
          state={syncState}
          log={syncLog}
          onTest={testOfflineSync}
        />

        {/* PDF Download Test */}
        <TestCard
          title="PDF Document Compiler"
          description="Convert DOM element into A4 print-ready PDF certificate."
          icon={FileCheck}
          state={pdfState}
          log={pdfLog}
          onTest={testPdfGeneration}
        />

        {/* Camera Test Viewfinder */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-[#B71C1C]" />
              <div>
                <h3 className="text-sm font-bold text-zinc-800">Camera Viewfinder Test</h3>
                <p className="text-[11px] text-zinc-400">Validate media devices API.</p>
              </div>
            </div>
            {cameraState === "success" ? (
              <button
                onClick={stopCamera}
                className="rounded-lg bg-zinc-150 hover:bg-zinc-200 px-3 py-1.5 text-[10px] font-bold text-zinc-700 cursor-pointer"
              >
                Stop Feed
              </button>
            ) : (
              <button
                onClick={testCamera}
                disabled={cameraState === "testing"}
                className="rounded-lg bg-[#7F1D1D] hover:bg-[#6B1414] px-3 py-1.5 text-[10px] font-bold text-white shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Start Feed
              </button>
            )}
          </div>

          <div className="aspect-video w-full rounded-xl bg-zinc-950 overflow-hidden relative border border-zinc-150 flex items-center justify-center text-zinc-500">
            {cameraState === "success" && stream ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-xs space-y-1">
                {cameraState === "testing" ? (
                  <>
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-450" />
                    <span>Spinning up viewfinder stream...</span>
                  </>
                ) : (
                  <span>Camera viewport inactive</span>
                )}
              </div>
            )}
          </div>
          <pre className="p-3 bg-zinc-900 rounded-xl font-mono text-[9px] text-zinc-300 leading-normal max-h-24 overflow-y-auto">
            {cameraLog || "Press Start Feed to initialize diagnostic checks."}
          </pre>
        </div>
      </div>

      {/* Hidden Certificate Template for PDF Compiler Test */}
      <div className="absolute -left-[9999px] top-0 pointer-events-none">
        <div
          ref={pdfTemplateRef}
          className="w-[190mm] bg-white p-12 text-slate-900 border border-slate-200"
        >
          <div className="border-b-2 border-slate-350 pb-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              TRUSTROUTE DIAGNOSTIC REPORT
            </h1>
            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border">
              STATUS: SECURED
            </span>
          </div>
          <div className="mt-8 space-y-4">
            <p className="text-sm leading-relaxed">
              This document was compiled by the local PDF generator test loop on TrustRoute
              verified logistics app client.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6 text-xs">
              <div className="bg-slate-50 p-3 rounded">
                <strong className="block text-slate-400 font-semibold uppercase text-[9px]">
                  Authorized Tester
                </strong>
                <span>{user?.email || "Anonymous admin"}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <strong className="block text-slate-400 font-semibold uppercase text-[9px]">
                  Diagnostic Time
                </strong>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable Test Card Component
function TestCard({
  title,
  description,
  icon: Icon,
  state,
  log,
  onTest,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  state: "idle" | "testing" | "success" | "failed";
  log: string;
  onTest: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-[#B71C1C]" />
            <div>
              <h3 className="text-sm font-bold text-zinc-800">{title}</h3>
              <p className="text-[11px] text-zinc-400 leading-normal">{description}</p>
            </div>
          </div>
          {state === "testing" ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#B71C1C]" />
          ) : state === "success" ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
          ) : state === "failed" ? (
            <XCircle className="h-4.5 w-4.5 text-rose-500" />
          ) : (
            <button
              onClick={onTest}
              className="rounded-lg bg-zinc-50 border border-zinc-200 p-1.5 hover:bg-zinc-100 cursor-pointer"
            >
              <Play className="h-3 w-3 text-zinc-600 fill-zinc-650" />
            </button>
          )}
        </div>

        <pre className="p-3 bg-zinc-900 rounded-xl font-mono text-[9px] text-zinc-300 leading-normal max-h-24 overflow-y-auto whitespace-pre-wrap">
          {log || "Execute diagnostic test to view telemetry logs."}
        </pre>
      </div>

      {state !== "idle" && state !== "testing" && (
        <button
          onClick={onTest}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-zinc-250 bg-zinc-50 hover:bg-zinc-100 py-2 text-xs font-bold text-zinc-700 transition cursor-pointer"
        >
          <RefreshCw className="h-3 w-3" /> Re-Test
        </button>
      )}
    </div>
  );
}
