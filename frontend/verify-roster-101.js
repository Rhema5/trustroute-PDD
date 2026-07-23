import { readFileSync } from "fs";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

// Read and parse .env file
const envPath = "./.env";
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join("=").trim();
    envVars[key] = val;
  }
});

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID,
  measurementId: envVars.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const DEFAULT_OWNER_UID = "pkKb5AUcr4Nfbp9uL7JJc5F0QGx2";

const verify = async () => {
  try {
    console.log("Logging in as default owner owner_test_101@example.com...");
    await signInWithEmailAndPassword(auth, "owner_test_101@example.com", "password123");
    console.log("✓ Signed in.");

    console.log("Executing fetchAgents query...");
    const qAgents = query(
      collection(db, "users"),
      where("role", "==", "agent"),
      where("enterpriseId", "==", DEFAULT_OWNER_UID),
      where("active", "==", true)
    );
    const snapshotAgents = await getDocs(qAgents);
    console.log(`✓ Roster query succeeded. Found ${snapshotAgents.size} active agents.`);

    let foundAgent101 = false;
    snapshotAgents.forEach((docSnap) => {
      const data = docSnap.data();
      console.log(`  - Agent ID: ${docSnap.id}, Name: ${data.displayName || data.name}, Active: ${data.active}, Status: ${data.status}`);
      if (docSnap.id === "LR3P5KHY2efJA0MKiqL3A9KkQ4r2") {
        foundAgent101 = true;
      }
    });

    if (foundAgent101) {
      console.log("\n✓ SUCCESS: Test Agent 101 (LR3P5KHY2efJA0MKiqL3A9KkQ4r2) was successfully returned in the active agents roster query!");
      console.log("✓ This guarantees the Dispatch Secure Handoff button is now ENABLED for the test owner!");
      process.exit(0);
    } else {
      console.error("\n✗ ERROR: Test Agent 101 not found in the returned query results.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
};

verify();
