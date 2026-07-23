import { readFileSync } from "fs";
import { initializeApp } from "firebase/app";
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
const auth = getAuth(app);

const testAccounts = [
  "owner_test_101@example.com",
  "agent_test_101@example.com",
  "enterprise_test_owner_1@trustroute.com",
  "agenttest1011@gmail.com"
];

const passwords = [
  "password",
  "password123",
  "123456",
  "trustroute",
  "trustroute123",
  "agent123",
  "owner123"
];

const run = async () => {
  for (const email of testAccounts) {
    for (const pw of passwords) {
      try {
        const creds = await signInWithEmailAndPassword(auth, email, pw);
        console.log(`✓ SUCCESS: ${email} with password: ${pw}`);
        break;
      } catch (err) {
        // failed
      }
    }
  }
};

run().then(() => process.exit(0));
