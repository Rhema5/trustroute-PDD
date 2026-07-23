import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScanner } from "html5-qrcode";
import { Camera, AlertTriangle, RefreshCw, QrCode } from "lucide-react";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

export function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  const startScanner = async () => {
    setError(null);
    setScanning(true);

    try {
      const scanner = new Html5Qrcode("qr-reader-container");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Stop scanner before processing to avoid duplicate scans
          scanner
            .stop()
            .then(() => {
              if (mountedRef.current) {
                setScanning(false);
                onScanSuccess(decodedText);
              }
            })
            .catch(console.error);
        },
        () => {
          // QR code scanning failure — ignore (continuous scanning)
        }
      );
    } catch (err: any) {
      console.error("QR Scanner start error:", err);
      const msg =
        err?.message || "Failed to initialize camera for QR scanning.";
      setError(msg);
      setScanning(false);
      onScanError?.(msg);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // Only stop if scanner is actively scanning (state 2 = SCANNING)
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        // Scanner may already be stopped
        console.warn("Scanner stop warning:", err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    mountedRef.current = true;
    startScanner();

    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        {/* Scanner Viewport */}
        <div
          id="qr-reader-container"
          ref={containerRef}
          className="relative aspect-square w-full"
          style={{ minHeight: 300 }}
        />

        {/* Overlay Frame */}
        {scanning && (
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2">
              <div className="absolute inset-0 rounded-xl border-2 border-primary/60" />
              {/* Corner accents */}
              <div className="absolute -left-[1px] -top-[1px] h-8 w-8 rounded-tl-xl border-l-[3px] border-t-[3px] border-primary" />
              <div className="absolute -right-[1px] -top-[1px] h-8 w-8 rounded-tr-xl border-r-[3px] border-t-[3px] border-primary" />
              <div className="absolute -bottom-[1px] -left-[1px] h-8 w-8 rounded-bl-xl border-b-[3px] border-l-[3px] border-primary" />
              <div className="absolute -bottom-[1px] -right-[1px] h-8 w-8 rounded-br-xl border-b-[3px] border-r-[3px] border-primary" />
              {/* Scan line animation */}
              <div className="absolute left-2 right-2 top-1/2 h-0.5 animate-pulse bg-gradient-to-r from-transparent via-primary to-transparent" />
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-semibold">Camera Error</span>
          </div>
          <p className="text-xs text-rose-300/80 leading-relaxed">{error}</p>
          <button
            onClick={() => {
              stopScanner().then(startScanner);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-950/30 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/50 transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry Camera
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
        <QrCode className="h-4 w-4 text-primary shrink-0" />
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Position the QR code within the scanner frame. Detection is automatic.
        </p>
      </div>
    </div>
  );
}
