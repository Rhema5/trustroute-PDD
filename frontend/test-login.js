import { readFileSync } from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

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

const runTest = async () => {
  const testEmail = `test-agent-${Date.now()}@example.com`;
  const testPassword = "testpassword123";

  console.log("1. Attempting to register agent with email:", testEmail);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    const uid = userCredential.user.uid;
    console.log("✓ Registration successful. UID:", uid);

    console.log("2. Setting user document in Firestore...");
    await setDoc(doc(db, "users", uid), {
      uid: uid,
      email: testEmail,
      displayName: "Test Agent Programmatic",
      name: "Test Agent Programmatic",
      role: "agent",
      enterpriseId: "test-owner-enterprise-id",
      createdAt: new Date(),
      active: true,
      status: "available"
    });
    console.log("✓ Firestore document set.");

    console.log("3. Signing out...");
    await signOut(auth);
    console.log("✓ Signed out.");

    console.log("4. Attempting to sign in with the registered credentials...");
    const loginCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log("✓ Sign in successful! Logged in UID:", loginCredential.user.uid);

    console.log("5. Signing out again...");
    await signOut(auth);
    console.log("✓ Final sign out complete. Test passed!");
  } catch (error) {
    console.error("✗ Test failed with error:", error);
  }
};

runTest().then(() => process.exit(0));
