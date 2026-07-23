import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, setPersistence, indexedDBLocalPersistence } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyDFhhyGtxKTSZpAff0QuSkVokZbFybWhBw",
  authDomain: "trustroute-c1698.firebaseapp.com",
  databaseURL: "https://trustroute-c1698-default-rtdb.firebaseio.com",
  projectId: "trustroute-c1698",
  storageBucket: "trustroute-c1698.firebasestorage.app",
  messagingSenderId: "612268243801",
  appId: "1:612268243801:web:28625485ccbd97d26dea48",
  measurementId: "G-H1M6T96VQB"
};

// Initialize Firebase safely for SSR/HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Force explicit IndexedDB persistence for Capacitor mobile apps
if (typeof window !== "undefined") {
  setPersistence(auth, indexedDBLocalPersistence).catch(console.error);
}

export let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(console.error);
}

// Initialize Firebase App Check with ReCaptchaV3Provider support
// Configure local development debug tokens conditionally (window.FIREBASE_APPCHECK_DEBUG_TOKEN = true)
/*
if (typeof window !== "undefined") {
  if (import.meta.env.DEV) {
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6Lc_q_YqAAAAAN_rXJ521v5JkX2oU7eYp8N_9P_O";
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn("App Check failed to initialize (likely due to missing env variables or multiple initializations):", err);
  }
}
*/

