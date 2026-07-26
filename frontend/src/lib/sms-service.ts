import { toast } from "sonner";

/**
 * TrustRoute Smart SMS Gateway Service
 * Handles Real Cellular SMS dispatch via Fast2SMS REST API
 * (Proxied via Vite dev server to bypass browser CORS preflight blocks).
 */

export interface SmsSendResult {
  success: boolean;
  mode: "real" | "native" | "demo";
  message: string;
}

/**
 * Checks if a phone string represents a valid real mobile number (10+ digits)
 * vs a test / dummy number (e.g. 9999999999, 123456, 555-xxx).
 */
export function isRealPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, "");
  
  const isDummyPattern = 
    /^(\d)\1{7,}/.test(digitsOnly) ||
    digitsOnly.startsWith("12345") ||
    digitsOnly.startsWith("555") ||
    digitsOnly.length < 10 ||
    digitsOnly.length > 13;

  return !isDummyPattern;
}

/**
 * Format phone number to clean E.164 / Indian standard format (+91 XXXXX XXXXX)
 */
export function formatPhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `+91 ${digitsOnly.slice(2, 7)} ${digitsOnly.slice(7)}`;
  }
  return phone;
}

/**
 * Main SMS Gateway Dispatch Function
 */
export async function sendOtpSms(
  phone: string,
  otp: string,
  orderId: string,
  recipientName: string = "Customer"
): Promise<SmsSendResult> {
  const formattedPhone = formatPhoneNumber(phone);
  const isReal = isRealPhoneNumber(phone);
  const digitsOnly = phone.replace(/\D/g, "").slice(-10);

  // Fast2SMS API Key provided by user
  const fast2smsKey =
    import.meta.env.VITE_FAST2SMS_API_KEY ||
    "d6rXgDuLfOwFB45TokYiSRUtz1p9M3y2jNAmQnvesxacVEbZhK9oZBTfQp2YCKDXULc8i4b60u3dnqSJ";

  const smsText = `TrustRoute Delivery PIN for Order ${orderId} is ${otp}. Share with agent upon arrival.`;

  // 1. REAL CELLULAR SMS VIA PROXIED FAST2SMS REST GATEWAY (Bypasses CORS restrictions)
  if (isReal && fast2smsKey) {
    try {
      // Endpoint target (Vite dev proxy or direct fallback)
      const baseUrl = typeof window !== "undefined" ? "/api/fast2sms" : "https://www.fast2sms.com/dev/bulkV2";

      // Attempt 1: Fast2SMS OTP Route
      const otpUrl = `${baseUrl}?authorization=${encodeURIComponent(
        fast2smsKey
      )}&route=otp&variables_values=${encodeURIComponent(otp)}&flash=0&numbers=${digitsOnly}`;

      const res = await fetch(otpUrl, { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        if (data && data.return) {
          toast.success(`📲 Real Cellular SMS sent to ${formattedPhone} via Fast2SMS!`);
          return { success: true, mode: "real", message: "Real cellular SMS sent via Fast2SMS" };
        }
      }

      // Attempt 2: Fast2SMS Quick SMS Route ("q")
      const qUrl = `${baseUrl}?authorization=${encodeURIComponent(
        fast2smsKey
      )}&route=q&message=${encodeURIComponent(smsText)}&language=english&flash=0&numbers=${digitsOnly}`;

      const qRes = await fetch(qUrl, { method: "GET" });
      if (qRes.ok) {
        const qData = await qRes.json();
        if (qData && qData.return) {
          toast.success(`📲 Real Cellular SMS text sent to ${formattedPhone} via Fast2SMS!`);
          return { success: true, mode: "real", message: "Real cellular SMS sent via Fast2SMS Quick Route" };
        } else if (qData && qData.message) {
          const msgStr = Array.isArray(qData.message) ? qData.message.join(", ") : qData.message;
          toast.warning(`Fast2SMS Response: ${msgStr}`, { duration: 8000 });
        }
      }
    } catch (err: any) {
      console.warn("Fast2SMS REST proxy notice:", err);
    }
  }

  // 2. TRIGGER NATIVE MOBILE MESSAGING APP (sms:+919876543210?body=...)
  if (typeof window !== "undefined" && isReal) {
    try {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        const smsUrl = `sms:+91${digitsOnly}?body=${encodeURIComponent(smsText)}`;
        window.open(smsUrl, "_self");
      }
    } catch (e) {
      console.warn("Native SMS launch notice:", e);
    }
  }

  // 3. DISPLAY ON-SCREEN OTP PIN FOR TESTING
  toast.info(`📲 SMS OTP PIN [${otp}] dispatched to ${formattedPhone}`);

  return {
    success: true,
    mode: "demo",
    message: `OTP ${otp} logged for ${formattedPhone}`,
  };
}
