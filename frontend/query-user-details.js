import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

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

const accounts = [
  { email: "owner_test_101@example.com", pw: "password123" },
  { email: "agent_test_101@example.com", pw: "password123" },
  { email: "enterprise_test_owner_1@trustroute.com", pw: "password123" },
];

const run = async () => {
  for (const acc of accounts) {
    try {
      console.log(`\nLogging in as ${acc.email}...`);
      const cred = await signInWithEmailAndPassword(auth, acc.email, acc.pw);
      const uid = cred.user.uid;
      console.log(`✓ Signed in. UID: ${uid}`);

      const userDocRef = doc(db, "users", uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        console.log(`✓ Firestore document exists for UID ${uid}:`);
        console.log(JSON.stringify(snap.data(), null, 2));
      } else {
        console.log(`✗ Firestore document does NOT exist for UID ${uid}`);
      }

      await signOut(auth);
    } catch (err) {
      console.error(`✗ Error for ${acc.email}:`, err);
    }
  }
};

run().then(() => process.exit(0));
