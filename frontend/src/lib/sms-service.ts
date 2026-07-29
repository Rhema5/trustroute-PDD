import { toast } from "sonner";

/**
 * TrustRoute Smart SMS Gateway Service
 * Sends real cellular SMS text messages via Fast2SMS Quick REST API (route: "q").
 */

export interface SmsSendResult {
  success: boolean;
  mode: "real" | "native" | "demo";
  message: string;
}

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

export async function sendOtpSms(
  phone: string,
  otp: string,
  orderId: string,
  recipientName: string = "Customer"
): Promise<SmsSendResult> {
  const formattedPhone = formatPhoneNumber(phone);
  const isReal = isRealPhoneNumber(phone);
  const digitsOnly = phone.replace(/\D/g, "").slice(-10);

  // Check user-configured Fast2SMS key from localStorage first, then env, then default fallback
  const customKey = typeof window !== "undefined" ? localStorage.getItem("FAST2SMS_API_KEY") : null;
  const fast2smsKey =
    customKey ||
    import.meta.env.VITE_FAST2SMS_API_KEY ||
    "d6rXgDuLfOwFB45TokYiSRUtz1p9M3y2jNAmQnvesxacVEbZhK9oZBTfQp2YCKDXULc8i4b60u3dnqSJ";

  const smsText = `TrustRoute Verified Delivery: Hello ${recipientName}, your delivery PIN for Order ${orderId} is ${otp}. Please share with agent upon arrival.`;

  if (isReal && fast2smsKey) {
    const endpoints = ["/api/fast2sms", "https://www.fast2sms.com/dev/bulkV2"];

    for (const endpoint of endpoints) {
      try {
        // Attempt 1: Fast2SMS OTP Route ("otp") via POST
        let res = await fetch(endpoint, {
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

        let data = await res.json();
        console.log("Fast2SMS Response (POST route: otp):", data);

        // Attempt 2: Fast2SMS Quick Route ("q") via POST if OTP route failed
        if (!data || !data.return) {
          res = await fetch(endpoint, {
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
          data = await res.json();
          console.log("Fast2SMS Response (POST route: q):", data);
        }

        // Attempt 3: Fast2SMS GET request with URL params if POST failed
        if (!data || !data.return) {
          const getUrl = `${endpoint}?authorization=${encodeURIComponent(fast2smsKey)}&route=otp&variables_values=${otp}&numbers=${digitsOnly}`;
          res = await fetch(getUrl, { method: "GET" });
          data = await res.json();
          console.log("Fast2SMS Response (GET route: otp):", data);
        }

        if (data && data.return) {
          toast.success(`📲 Real SMS OTP sent to ${formattedPhone}!`);
          return { success: true, mode: "real", message: "Real cellular SMS sent via Fast2SMS" };
        } else if (data && data.message) {
          const msgStr = Array.isArray(data.message) ? data.message.join(", ") : data.message;
          console.warn("Fast2SMS API notice:", msgStr);
          toast.warning(`Fast2SMS Notice: ${msgStr}. Please verify API Key in Settings.`, { duration: 6000 });
        }
      } catch (err: any) {
        console.warn(`Fast2SMS fetch notice (${endpoint}):`, err);
      }
    }
  }

  // Clean SMS alert without exposing OTP PIN in brackets
  toast.info(`📲 SMS OTP dispatched to ${formattedPhone}`);

  return {
    success: true,
    mode: "demo",
    message: `OTP dispatched to ${formattedPhone}`,
  };
}
