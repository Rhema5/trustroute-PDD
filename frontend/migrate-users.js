import { readFileSync } from "fs";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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

// Use default test owner as the parent enterprise for orphaned agents
const DEFAULT_OWNER_UID = "pkKb5AUcr4Nfbp9uL7JJc5F0QGx2"; 

const runMigration = async () => {
  try {
    // Log in as owner to ensure auth context is set
    console.log("Logging in to set auth state...");
    await signInWithEmailAndPassword(auth, "owner_test_101@example.com", "password123");
    console.log("✓ Signed in.");

    console.log("Fetching all user documents...");
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);
    console.log(`Found ${snapshot.size} user documents to inspect.\n`);

    let updatedCount = 0;

    for (const docSnap of snapshot.docs) {
      const uid = docSnap.id;
      const data = docSnap.data();
      const updates = {};

      console.log(`Inspecting user ${uid} (${data.email || "No Email"})...`);

      // Ensure uid exists
      if (!data.uid) {
        updates.uid = uid;
      }

      // Ensure displayName and name exist and are consistent
      if (!data.displayName && data.name) {
        updates.displayName = data.name;
      } else if (!data.displayName) {
        updates.displayName = "Field User";
      }
      if (!data.name && data.displayName) {
        updates.name = data.displayName;
      } else if (!data.name) {
        updates.name = "Field User";
      }

      // Ensure active exists
      if (data.active === undefined) {
        updates.active = true;
      }

      // Ensure status exists (especially for agents)
      if (data.status === undefined) {
        updates.status = "available";
      }

      // Ensure createdAt exists
      if (!data.createdAt) {
        updates.createdAt = new Date();
      }

      // Role-specific stabilization
      const role = data.role || "pending";
      if (!data.role) {
        updates.role = "pending";
      }

      if (role === "owner") {
        if (!data.enterpriseId) {
          updates.enterpriseId = uid;
        }
      } else if (role === "agent") {
        if (!data.enterpriseId) {
          // Link to default owner
          updates.enterpriseId = DEFAULT_OWNER_UID;
          console.log(`  -> Linking orphaned agent to default owner: ${DEFAULT_OWNER_UID}`);
        }
      } else if (role === "pending") {
        if (data.enterpriseId === undefined) {
          updates.enterpriseId = "";
        }
      }

      if (Object.keys(updates).length > 0) {
        console.log(`  -> Updates to apply:`, JSON.stringify(updates, null, 2));
        await updateDoc(doc(db, "users", uid), updates);
        updatedCount++;
      } else {
        console.log(`  -> Document is fully compliant. No changes needed.`);
      }
    }

    console.log(`\nMigration complete. Updated ${updatedCount} out of ${snapshot.size} user documents.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
