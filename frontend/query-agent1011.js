import { readFileSync } from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
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
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID,
  measurementId: envVars.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const run = async () => {
  try {
    await signInWithEmailAndPassword(auth, "ops@acme.co", "trustroute");
    const docSnap = await getDoc(doc(db, "users", "y6oSAqeaSyaI4mXK3aJISEdRBjj2"));
    if (docSnap.exists()) {
      console.log("Agent1011 Firestore Profile:", JSON.stringify(docSnap.data()));
    } else {
      console.log("Agent1011 Firestore Profile: DOCUMENT MISSING!");
    }
  } catch (err) {
    console.error(err);
  }
};

run().then(() => process.exit(0));
