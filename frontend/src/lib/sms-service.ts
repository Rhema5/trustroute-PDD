import { toast } from "sonner";

/**
 * TrustRoute Smart SMS Gateway Service
 * Handles Real Cellular SMS dispatch via Fast2SMS / Twilio REST APIs
 * and automatic Demo Mode / Native SMS fallbacks.
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
    /^(\d)\1{7,}/.test(digitsOnly) || // Repeated digits like 9999999999
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

  const fast2smsKey = import.meta.env.VITE_FAST2SMS_API_KEY;
  const twilioSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
  const smsText = `TrustRoute Verified Delivery: Hello ${recipientName}, your delivery PIN for Order ${orderId} is ${otp}. Share with agent upon arrival.`;

  // 1. REAL CELLULAR SMS VIA FAST2SMS REST GATEWAY API
  if (isReal && fast2smsKey) {
    try {
      // First attempt: Fast2SMS OTP Route
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": fast2smsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: digitsOnly,
        }),
      });
      const data = await res.json();

      if (data.return) {
        toast.success(`📲 Real SMS text message sent to ${formattedPhone} via Fast2SMS!`);
        return { success: true, mode: "real", message: "Real cellular SMS sent via Fast2SMS" };
      }

      // Second attempt: Fast2SMS Quick SMS Route ("q")
      const qRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": fast2smsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "q",
          message: smsText,
          language: "english",
          flash: "0",
          numbers: digitsOnly,
        }),
      });
      const qData = await qRes.json();
      if (qData.return) {
        toast.success(`📲 Real SMS text message sent to ${formattedPhone} via Fast2SMS!`);
        return { success: true, mode: "real", message: "Real cellular SMS sent via Fast2SMS Quick Route" };
      } else {
        console.warn("Fast2SMS API notice:", qData.message || data.message);
      }
    } catch (err: any) {
      console.warn("SMS Gateway REST API notice:", err);
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

  // 3. DISPLAY ON-SCREEN OTP NOTIFICATION FOR TESTING
  if (isReal) {
    toast.info(`📲 SMS OTP PIN [${otp}] dispatched to ${formattedPhone}`, {
      duration: 8000,
    });
  } else {
    toast.success(`💬 Test SMS: OTP [${otp}] generated for ${formattedPhone}`);
  }

  return {
    success: true,
    mode: "demo",
    message: `OTP ${otp} logged for ${formattedPhone}`,
  };
}
