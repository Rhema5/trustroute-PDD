import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

import { readFileSync } from "fs";

// Read and parse .env file
let envVars = {};
try {
  const envContent = readFileSync("./.env", "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      envVars[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
  });
} catch (e) {}

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const ENTERPRISE_HUBS = [
  {
    name: "Avadi Regional Hub",
    email: "enterprise_avadi@trustroute.com",
    password: "AvadiHub@2026!",
    region: "Avadi",
  },
  {
    name: "Poonamallee Regional Hub",
    email: "enterprise_poonamallee@trustroute.com",
    password: "PoonamalleeHub@2026!",
    region: "Poonamallee",
  },
  {
    name: "Koyambedu Regional Hub",
    email: "enterprise_koyambedu@trustroute.com",
    password: "KoyambeduHub@2026!",
    region: "Koyambedu",
  },
  {
    name: "Vellore Regional Hub",
    email: "enterprise_vellore@trustroute.com",
    password: "VelloreHub@2026!",
    region: "Vellore",
  },
  {
    name: "Default General Hub",
    email: "enterprise@gmail.com",
    password: "DefaultHub@2026!",
    region: "Default",
  },
];

export async function seedEnterpriseAccounts() {
  console.log("🚀 Provisioning Regional Enterprise Hub accounts...");
  for (const hub of ENTERPRISE_HUBS) {
    try {
      let uid = "";
      try {
        const cred = await signInWithEmailAndPassword(auth, hub.email, hub.password);
        uid = cred.user.uid;
        console.log(`✓ Signed in existing Enterprise Hub: ${hub.name} (${uid})`);
      } catch (err) {
        // Account doesn't exist, create it
        const cred = await createUserWithEmailAndPassword(auth, hub.email, hub.password);
        uid = cred.user.uid;
        console.log(`+ Created new Enterprise Hub: ${hub.name} (${uid})`);
      }

      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          email: hub.email,
          displayName: hub.name,
          name: hub.name,
          role: "owner",
          hubRegion: hub.region,
          enterpriseId: uid,
          active: true,
          status: "available",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`  -> Firestore document set for ${hub.name} [region: ${hub.region}]`);
    } catch (err) {
      console.error(`❌ Failed provisioning ${hub.email}:`, err.message);
    }
  }
  console.log("✅ Regional Enterprise Hub seeding complete.");
}

// Run directly if called from CLI
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed-enterprises.js")) {
  seedEnterpriseAccounts().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
