import { readFileSync } from "fs";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

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

const runWorkflowTest = async () => {
  const ts = Date.now();
  const ownerEmail = `owner_test_${ts}@example.com`;
  const agentEmail = `agent_test_${ts}@example.com`;
  const password = "password123";

  let ownerUid = "";
  let agentUid = "";

  console.log("=== PHASE 1: Owner Registration & Document Seeding ===");
  try {
    const cred = await createUserWithEmailAndPassword(auth, ownerEmail, password);
    ownerUid = cred.user.uid;
    console.log(`✓ Owner registered in Auth. Uid: ${ownerUid}`);

    await setDoc(doc(db, "users", ownerUid), {
      uid: ownerUid,
      email: ownerEmail,
      displayName: "Acme Test Owner",
      name: "Acme Test Owner",
      role: "owner",
      enterpriseId: ownerUid,
      createdAt: new Date(),
      active: true,
    });
    console.log("✓ Owner Firestore document created.");
    await signOut(auth);
  } catch (err) {
    console.error("✗ Owner registration failed:", err);
    process.exit(1);
  }

  console.log("\n=== PHASE 2: Agent Registration (Pending) ===");
  try {
    const cred = await createUserWithEmailAndPassword(auth, agentEmail, password);
    agentUid = cred.user.uid;
    console.log(`✓ Agent registered in Auth. Uid: ${agentUid}`);

    await setDoc(doc(db, "users", agentUid), {
      uid: agentUid,
      email: agentEmail,
      displayName: "Test Agent Handoff",
      name: "Test Agent Handoff",
      role: "pending",
      enterpriseId: "",
      createdAt: new Date(),
      active: true,
      status: "available",
    });
    console.log("✓ Agent Firestore document created (role: pending).");
    await signOut(auth);
  } catch (err) {
    console.error("✗ Agent registration failed:", err);
    process.exit(1);
  }

  console.log("\n=== PHASE 3: Owner Login & Pending User Fetch ===");
  try {
    const cred = await signInWithEmailAndPassword(auth, ownerEmail, password);
    console.log(`✓ Owner logged in successfully.`);

    console.log(`Diagnostic: Fetching owner's own profile...`);
    const ownerDoc = await getDoc(doc(db, "users", ownerUid));
    console.log(`✓ Owner profile fetched successfully. Role: ${ownerDoc.data().role}`);

    const qPending = query(collection(db, "users"), where("role", "==", "pending"));
    const snapshotPending = await getDocs(qPending);
    console.log(`✓ Fetched pending users collection. Size: ${snapshotPending.size}`);

    let foundAgent = false;
    snapshotPending.forEach((docSnap) => {
      if (docSnap.id === agentUid) {
        foundAgent = true;
      }
    });

    if (foundAgent) {
      console.log(`✓ Pending agent found in pending list.`);
    } else {
      throw new Error("Pending agent not returned in query.");
    }

    console.log("\n=== PHASE 4: Owner Approves Agent ===");
    const agentDocRef = doc(db, "users", agentUid);
    await updateDoc(agentDocRef, {
      role: "agent",
      enterpriseId: ownerUid,
      active: true,
      status: "available",
    });
    console.log(`✓ Agent approved and assigned to Enterprise ID: ${ownerUid}`);

  } catch (err) {
    console.error("✗ Owner pending fetch/approve failed:", err);
    process.exit(1);
  }

  console.log("\n=== PHASE 5: Owner Queries Active Agents ===");
  try {
    const qAgents = query(
      collection(db, "users"),
      where("role", "==", "agent"),
      where("enterpriseId", "==", ownerUid),
      where("active", "==", true)
    );
    const snapshotAgents = await getDocs(qAgents);
    console.log(`✓ Fetched active agents in enterprise. Size: ${snapshotAgents.size}`);

    let foundApprovedAgent = false;
    snapshotAgents.forEach((docSnap) => {
      if (docSnap.id === agentUid) {
        foundApprovedAgent = true;
      }
    });

    if (foundApprovedAgent) {
      console.log(`✓ Approved agent returned correctly in filtered agent roster query.`);
    } else {
      throw new Error("Approved agent missing from active roster query.");
    }
    await signOut(auth);
  } catch (err) {
    console.error("✗ Owner active agent query failed:", err);
    process.exit(1);
  }

  console.log("\n=== PHASE 6: Delivery Assignment & Agent View ===");
  try {
    // Sign in as owner to create delivery
    await signInWithEmailAndPassword(auth, ownerEmail, password);
    const deliveryId = `TR-TEST-${ts}`;
    const deliveryDocRef = doc(db, "deliveries", deliveryId);
    await setDoc(deliveryDocRef, {
      id: deliveryId,
      enterpriseId: ownerUid,
      agentId: agentUid,
      agentName: "Test Agent Handoff",
      customer: "John Doe",
      destination: "123 Main St",
      contactNumber: "555-0199",
      packageType: "Documents",
      value: "100",
      status: "assigned",
      otp: "1234",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✓ Delivery ${deliveryId} created and assigned to agent.`);
    await signOut(auth);

    // Sign in as agent to read assigned deliveries
    await signInWithEmailAndPassword(auth, agentEmail, password);
    console.log(`✓ Agent logged in successfully.`);

    const qDeliveries = query(collection(db, "deliveries"), where("agentId", "==", agentUid));
    const snapshotDeliveries = await getDocs(qDeliveries);
    console.log(`✓ Agent fetched assigned deliveries. Size: ${snapshotDeliveries.size}`);

    let foundDelivery = false;
    snapshotDeliveries.forEach((docSnap) => {
      if (docSnap.id === deliveryId) {
        foundDelivery = true;
      }
    });

    if (foundDelivery) {
      console.log(`✓ Assigned delivery returned correctly on Agent's dashboard.`);
    } else {
      throw new Error("Assigned delivery missing from agent's deliveries query.");
    }
    await signOut(auth);

    console.log("\n==========================================");
    console.log("✓ ALL END-TO-END WORKFLOW TESTS PASSED!");
    console.log("==========================================");
    process.exit(0);
  } catch (err) {
    console.error("✗ Delivery assignment or verification failed:", err);
    process.exit(1);
  }
};

runWorkflowTest();
