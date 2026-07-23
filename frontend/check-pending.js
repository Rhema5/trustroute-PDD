import { readFileSync } from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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
  appId: envVars.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function checkPending() {
  try {
    await signInWithEmailAndPassword(auth, "owner_test_101@example.com", "password123");
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "pending"));
    const snapshot = await getDocs(q);
    console.log("Total pending users:", snapshot.size);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(doc.id, "=> email:", data.email, "| role:", data.role);
    });
  } catch (e) {
    console.error("Error reading users:", e);
  }
  process.exit(0);
}
checkPending();
