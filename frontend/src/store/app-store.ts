 import { create } from "zustand";
 import { type Delivery, type DeliveryStatus, type Agent, type Payment } from "@/lib/mock-data";
 import { db, auth } from "@/lib/firebase";
 import {
   collection,
   doc,
   setDoc,
   getDoc,
   updateDoc,
   onSnapshot,
   query,
   orderBy,
   where,
   getDocs,
   serverTimestamp,
   runTransaction,
 } from "firebase/firestore";
 import { onAuthStateChanged, type User } from "firebase/auth";
 import {
   processDeliveries,
   isValidTransition,
   getTransitionError,
   isDuplicate,
   validateDeliveryFields,
   getNextVersion,
   INITIAL_VERSION,
   checkVersionConflict,
 } from "@/lib/delivery-integrity";
 import {
   type OfflineQueueItem,
   type OfflineFailureReason,
   subscribeToOfflineQueue,
   writeOfflineQueueItem,
   updateOfflineQueueItem,
   deleteOfflineQueueItem,
   writeAuditLog,
   makeAuditEntry,
 } from "@/lib/offline-queue-store";
 
 function convertTimestamps(obj: any): any {
   if (!obj || typeof obj !== "object") return obj;
 
   if (typeof obj.toDate === "function") {
     try {
       return obj.toDate().toISOString();
     } catch (e) {
       return new Date().toISOString();
     }
   }
 
   if (Array.isArray(obj)) {
     return obj.map(convertTimestamps);
   }
 
   const result: any = {};
   for (const key of Object.keys(obj)) {
     result[key] = convertTimestamps(obj[key]);
   }
   return result;
 }
 
 interface AppState {
   role: "owner" | "agent" | "pending" | "rejected" | null;
   setRole: (r: "owner" | "agent" | "pending" | "rejected" | null) => void;
   user: User | null;
   userName: string | null;
   userProfile: any | null;
   authLoading: boolean;
   deliveries: Delivery[];
   agents: Agent[];
   setDeliveries: (deliveries: Delivery[]) => void;
   setAgents: (agents: Agent[]) => void;
   addDelivery: (d: Delivery) => Promise<void>;
   updateStatus: (id: string, status: DeliveryStatus, proof?: Delivery["proof"]) => Promise<void>;
   subscribeToDeliveries: () => () => void;
   subscribeToAgents: () => () => void;
   fetchAgents: () => Promise<void>;
   initializeAuth: () => () => void;
   syncState: "idle" | "syncing" | "success" | "failed";
   syncProgress: number;
   triggerAutoSync: () => Promise<void>;
   pendingUsers: any[];
   fetchPendingUsers: () => Promise<void>;
   approveUser: (uid: string, roleToAssign?: "agent" | "owner") => Promise<void>;
   rejectUser: (uid: string) => Promise<void>;
   searchQuery: string;
   setSearchQuery: (q: string) => void;
   notifications: any[];
   subscribeToNotifications: () => () => void;
   markNotificationAsRead: (id: string) => Promise<void>;
   addNotification: (title: string, message: string, targetUserId: string) => Promise<void>;
   reassignDelivery: (deliveryId: string, agentId: string, agentName: string) => Promise<void>;
   // ─── Offline Queue ───────────────────────────────────────────
   offlineQueue: OfflineQueueItem[];
   subscribeToOfflineQueue: () => () => void;
   retryOfflineSync: (id: string) => Promise<void>;
   cancelOfflineSync: (id: string) => Promise<void>;
   deleteOfflineQueueEntry: (id: string) => Promise<void>;
   approveManualReview: (id: string) => Promise<void>;
   rejectManualReview: (id: string) => Promise<void>;
   requestResubmission: (id: string) => Promise<void>;
   escalateManualReview: (id: string) => Promise<void>;  reassignOfflineDelivery: (id: string, agentId: string, agentName: string) => Promise<void>;
  markForManualReview: (id: string) => Promise<void>;
  downloadEvidence: (id: string) => void;
  // Payment Management Module
  payments: Payment[];
  subscribeToPayments: () => () => void;
  collectCodPayment: (deliveryId: string, amount: number, customerSignature?: string, remarks?: string) => Promise<void>;
  completeOnlinePayment: (
    deliveryId: string,
    paymentMethod: string,
    amount: number,
    gatewayReference?: string,
    rzpDetails?: {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    }
  ) => Promise<void>;
}export const useApp = create<AppState>((set, get) => ({
   role: null,
   setRole: (r) => set({ role: r }),
   user: null,
   userName: null,
   userProfile: null,
   authLoading: true,
   deliveries: [],
   agents: [],
   syncState: "idle",
   syncProgress: 0,
   pendingUsers: [],
   searchQuery: "",
   setSearchQuery: (q) => set({ searchQuery: q }),  notifications: [],
  payments: [],
  offlineQueue: [],
  setDeliveries: (deliveries) => set({ deliveries }),
   setAgents: (agents) => set({ agents }),
   reassignDelivery: async (deliveryId, agentId, agentName) => {
     try {
       const docRef = doc(db, "deliveries", deliveryId);
       await runTransaction(db, async (transaction) => {
         const snap = await transaction.get(docRef);
         if (!snap.exists()) throw new Error("Delivery not found.");
         const data = snap.data();
         const nextVersion = getNextVersion(data.version);
         transaction.update(docRef, {
           agentId,
           agentName,
           version: nextVersion,
           updatedAt: serverTimestamp(),
         });
       });
       await get().addNotification(
         "New Mission Reassigned",
         `Delivery ${deliveryId} has been reassigned to you.`,
         agentId
       );
     } catch (err) {
       console.error("Error reassigning delivery:", err);
       throw err;
     }
   },
   addDelivery: async (d) => {
     // Data integrity: validate required fields
     const fieldErrors = validateDeliveryFields(d);
     if (fieldErrors.length > 0) {
       throw new Error(`Delivery validation failed: ${fieldErrors.join(" ")}`);
     }
 
     // Data integrity: prevent duplicate IDs
     if (isDuplicate(get().deliveries, d.id)) {
       throw new Error(`Delivery with ID "${d.id}" already exists. Duplicate creation prevented.`);
     }      try {
        const docRef = doc(db, "deliveries", d.id);
        await runTransaction(db, async (transaction) => {
          // Bypassing read to avoid firestore rules error for non-existent documents
        
        const paymentId = `PM-${d.id}`;
        const paymentRef = doc(db, "payments", paymentId);

        transaction.set(docRef, {
          ...d,
          paymentId,
          version: INITIAL_VERSION,
          createdAt: serverTimestamp(),
        });

        transaction.set(paymentRef, {
          paymentId,
          deliveryId: d.id,
          enterpriseId: d.enterpriseId,
          agentId: d.agentId,
          customerId: d.customer,
          amount: d.paymentAmount ?? 0,
          currency: "INR",
          paymentMethod: "none",
          paymentType: d.paymentType ?? "prepaid",
          paymentStatus: d.paymentType === "cod" ? "cod_pending" : "pending",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          synced: true,
          networkMode: "online",
        });
      });
     } catch (err) {
       console.error("Error adding delivery: ", err);
       throw err;
     }
   },
   updateStatus: async (id, status, proof) => {
     // Pre-validate on client side for fast feedback
     const currentDelivery = get().deliveries.find((d) => d.id === id);
     if (currentDelivery) {
       if (!isValidTransition(currentDelivery.status, status)) {
         const errorMsg = getTransitionError(currentDelivery.status, status);
         console.error(`Status transition blocked: ${errorMsg}`);
         throw new Error(errorMsg);
       }
     }
 
     try {
       const docRef = doc(db, "deliveries", id);
       await runTransaction(db, async (transaction) => {
         const snap = await transaction.get(docRef);
         if (!snap.exists()) throw new Error(`Delivery ${id} not found.`);
         const data = snap.data();
 
         // Transaction-level: re-validate status transition against live Firestore data
         if (!isValidTransition(data.status as DeliveryStatus, status)) {
           throw new Error(getTransitionError(data.status as DeliveryStatus, status));
         }
 
         // Transaction-level: version conflict detection
         const clientVersion = currentDelivery?.version;
         if (checkVersionConflict(data.version, clientVersion)) {
           throw new Error(`Version conflict: delivery ${id} was modified by another user. Please refresh and retry.`);
         }
 
         const nextVersion = getNextVersion(data.version);
         const updates: any = {
           status,
           eta: status === "delivered" ? "Delivered" : "In Transit",
           version: nextVersion,
           updatedAt: serverTimestamp(),
         };
         if (proof) {
           updates.proof = {
             ...proof,
             verifiedAt: serverTimestamp(),
           };
         }
         transaction.update(docRef, updates);
       });
     } catch (err) {
       console.error("Error updating delivery status: ", err);
       throw err;
     }
   },
   subscribeToDeliveries: () => {
     const { user, role } = get();
     if (!user || !role) return () => {};    let q;
    if (role === "owner") {
      q = query(
        collection(db, "deliveries"),
        where("enterpriseId", "==", user.uid),
      );
    } else if (role === "agent") {
      q = query(
        collection(db, "deliveries"),
        where("agentId", "==", user.uid),
      );
    } else {
      return () => {};
    }const unsubscribe = onSnapshot(
       q,
       (snapshot) => {
         const items: Delivery[] = [];
         snapshot.forEach((doc) => {
           const data = doc.data({ serverTimestamps: "estimate" });
           items.push(convertTimestamps(data) as Delivery);
         });
         // Data integrity: auto-sort by status priority + deduplicate
         const processed = processDeliveries(items);
         set({ deliveries: processed });
       },
       (error) => {
         console.error("Error subscribing to deliveries:", error);
       },
     );
     return unsubscribe;
   },
   subscribeToAgents: () => {
      const { user, role, userProfile } = get();
      if (!user || role !== "owner") return () => {};

      const enterpriseId = userProfile?.enterpriseId || user.uid;
      const q = query(
        collection(db, "users"),
        where("role", "==", "agent"),
        where("enterpriseId", "==", enterpriseId),
        where("active", "==", true)
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: Agent[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            list.push({
              id: doc.id,
              name: data.name || data.displayName || "Agent",
              email: data.email || "",
              avatarColor: data.avatarColor || "from-violet-500 to-blue-500",
              online: data.online ?? true,
              rating: data.rating ?? 5.0,
              region: data.region || "",
            });
          });
          set({ agents: list });
        },
        (error) => {
          console.error("Error subscribing to agents:", error);
        },
      );
      return unsubscribe;
    },
    fetchAgents: async () => {
      const { user, role, userProfile } = get();
      if (role !== "owner" || !user) return;
      try {
        const enterpriseId = userProfile?.enterpriseId || user.uid;
        const q = query(
          collection(db, "users"),
          where("role", "==", "agent"),
          where("enterpriseId", "==", enterpriseId),
          where("active", "==", true)
        );
        const snapshot = await getDocs(q);
        const list: Agent[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            name: data.name || data.displayName || "Agent",
            email: data.email || "",
            avatarColor: data.avatarColor || "from-violet-500 to-blue-500",
            online: data.online ?? true,
            rating: data.rating ?? 5.0,
            region: data.region || "",
          });
        });
        set({ agents: list });
      } catch (err) {
        console.error("Error fetching agents:", err);
      }
    },
   fetchPendingUsers: async () => {
     const { role } = get();
     if (role !== "owner") return;
     try {
       const q = query(collection(db, "users"), where("role", "==", "pending"));
       const snapshot = await getDocs(q);
       const list: any[] = [];
       snapshot.forEach((doc) => {
         const data = doc.data();
         list.push({
           id: doc.id,
           name: data.name || "Pending User",
           email: data.email || "",
           createdAt: data.createdAt || new Date().toISOString(),
           region: data.region || "",
         });
       });
       set({ pendingUsers: list });
     } catch (err) {
       console.error("Error fetching pending users:", err);
     }
   },
   approveUser: async (uid, roleToAssign = "agent") => {
      try {
        const { user, userProfile } = get();
        await updateDoc(doc(db, "users", uid), {
          role: roleToAssign,
          enterpriseId: roleToAssign === "agent" ? (userProfile?.enterpriseId || user?.uid || "") : uid,
          active: true,
          status: "available",
        });
        set((s) => ({
          pendingUsers: s.pendingUsers.filter((u) => u.id !== uid),
        }));
      } catch (err) {
        console.error("Error approving user:", err);
        throw err;
      }
    },
    rejectUser: async (uid) => {
      try {
        await updateDoc(doc(db, "users", uid), {
          role: "rejected",
          active: false,
        });
        set((s) => ({
          pendingUsers: s.pendingUsers.filter((u) => u.id !== uid),
        }));
      } catch (err) {
        console.error("Error rejecting user:", err);
        throw err;
      }
    },
   subscribeToNotifications: () => {
     const { user } = get();
     if (!user) return () => {};    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data({ serverTimestamps: "estimate" });
          items.push({ id: doc.id, ...convertTimestamps(data) });
        });
        // In-memory sort by createdAt desc
        items.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        set({ notifications: items });
      },
       (error) => {
         console.error("Error subscribing to notifications:", error);
       },
     );
     return unsubscribe;
   },
   markNotificationAsRead: async (id) => {
     try {
       await updateDoc(doc(db, "notifications", id), {
         read: true,
       });
     } catch (err) {
       console.error("Error marking notification as read:", err);
     }
   },
   // ─── Offline Queue Actions ───────────────────────────────────
   subscribeToOfflineQueue: () => {
     const { user } = get();
     if (!user) return () => {};
     const unsubscribe = subscribeToOfflineQueue(
       user.uid,
       (items) => set({ offlineQueue: items }),
     );
     return unsubscribe;
   },
 
   retryOfflineSync: async (id) => {
     const { user, userName, addNotification } = get();
     if (!user) return;
     try {
       const item = get().offlineQueue.find((q) => q.id === id);
       if (!item) return;
       const auditEntry = makeAuditEntry("retry_attempted", user.uid, userName || "Owner");
       const newHistory = [...(item.auditHistory || []), auditEntry];
       await updateOfflineQueueItem(id, {
         state: "syncing",
         syncAttempts: (item.syncAttempts || 0) + 1,
         auditHistory: newHistory,
       });
       await writeAuditLog(id, id, "retry_attempted", user.uid, userName || "Owner");
       // Trigger actual sync
       await get().triggerAutoSync();
     } catch (err) {
       console.error("retryOfflineSync error:", err);
       throw err;
     }
   },
 
   cancelOfflineSync: async (id) => {
     const { user, userName } = get();
     if (!user) return;
     try {
       const item = get().offlineQueue.find((q) => q.id === id);
       if (!item) return;
       const auditEntry = makeAuditEntry("cancelled", user.uid, userName || "Owner");
       const newHistory = [...(item.auditHistory || []), auditEntry];
       await updateOfflineQueueItem(id, {
         state: "cancelled",
         auditHistory: newHistory,
       });
       await writeAuditLog(id, id, "cancelled", user.uid, userName || "Owner");
     } catch (err) {
       console.error("cancelOfflineSync error:", err);
       throw err;
     }
   },
 
   deleteOfflineQueueEntry: async (id) => {
     const { user, userName } = get();
     if (!user) return;
     try {
       await deleteOfflineQueueItem(id);
       await writeAuditLog(id, id, "cancelled", user.uid, userName || "Owner", { deleted: true });
     } catch (err) {
       console.error("deleteOfflineQueueEntry error:", err);
       throw err;
     }
   },
 
   approveManualReview: async (id) => {
     const { user, userName, addNotification } = get();
     if (!user) return;
     try {
       const item = get().offlineQueue.find((q) => q.id === id);
       if (!item) return;
       const auditEntry = makeAuditEntry("manual_approved", user.uid, userName || "Owner");
       const newHistory = [...(item.auditHistory || []), auditEntry];
       await updateOfflineQueueItem(id, {
         state: "synced",
         verificationStatus: "verified",
         syncCompletedTime: new Date().toISOString(),
         auditHistory: newHistory,
       });
       await writeAuditLog(id, id, "manual_approved", user.uid, userName || "Owner");
       await addNotification(
         "Manual Review Approved",
         `Delivery ${id} has been manually approved and marked as verified.`,
         item.agentId,
       );
     } catch (err) {
       console.error("approveManualReview error:", err);
       throw err;
     }
   },
 
   rejectManualReview: async (id) => {
     const { user, userName, addNotification } = get();
     if (!user) return;
     try {
       const item = get().offlineQueue.find((q) => q.id === id);
       if (!item) return;
       const auditEntry = makeAuditEntry("manual_rejected", user.uid, userName || "Owner");
       const newHistory = [...(item.auditHistory || []), auditEntry];
       await updateOfflineQueueItem(id, {
         state: "failed",
         failureReason: "corrupted_proof",
         verificationStatus: "failed",
         auditHistory: newHistory,
       });
       await writeAuditLog(id, id, "manual_rejected", user.uid, userName || "Owner");
       await addNotification(
         "Manual Review Rejected",
         `Delivery ${id} manual review has been rejected by the owner.`,
         item.agentId,
       );
     } catch (err) {
       console.error("rejectManualReview error:", err);
       throw err;
     }
   },
 
   requestResubmission: async (id) => {
     const { user, userName, addNotification } = get();
     if (!user) return;
     try {
       const item = get().offlineQueue.find((q) => q.id === id);
       if (!item) return;
       const auditEntry = makeAuditEntry("resubmission_requested", user.uid, userName || "Owner");
       const newHistory = [...(item.auditHistory || []), auditEntry];
       await updateOfflineQueueItem(id, {
         state: "failed",
         failureReason: "missing_image",
         auditHistory: newHistory,
       });
       await writeAuditLog(id, id, "resubmission_requested", user.uid, userName || "Owner");
       await addNotification(
         "Resubmission Required",
         `Delivery ${id} requires resubmission. Please re-capture proof and sync again.`,
         item.agentId,
       );
     } catch (err) {
       console.error("requestResubmission error:", err);
       throw err;
     }
   },
 
   escalateManualReview: async (id) => {
     const { user, userName, addNotification } = get();
     if (!user) return;
     try {
       const item = get().offlineQueue.find((q) => q.id === id);
       if (!item) return;
       const auditEntry = makeAuditEntry("escalated", user.uid, userName || "Owner");
       const newHistory = [...(item.auditHistory || []), auditEntry];
       await updateOfflineQueueItem(id, {
         auditHistory: newHistory,
       });
       await writeAuditLog(id, id, "escalated", user.uid, userName || "Owner");
       await addNotification(
         "Delivery Escalated",
         `Delivery ${id} has been escalated for senior review.`,
         user.uid,
       );
     } catch (err) {
       console.error("escalateManualReview error:", err);
       throw err;
     }
   },
 
   reassignOfflineDelivery: async (id, agentId, agentName) => {
     const { user, userName, addNotification } = get();
     if (!user) return;
     try {
       const item = get().offlineQueue.find((q) => q.id === id);
       if (!item) return;
       const auditEntry = makeAuditEntry("reassigned", user.uid, userName || "Owner", { agentId, agentName });
       const newHistory = [...(item.auditHistory || []), auditEntry];
       await updateOfflineQueueItem(id, {
         agentId,
         agentName,
         state: "pending",
         auditHistory: newHistory,
       });
       await writeAuditLog(id, id, "reassigned", user.uid, userName || "Owner", { agentId, agentName });
       await addNotification(
         "Delivery Reassigned",
         `Offline delivery ${id} has been reassigned to you.`,
         agentId,
       );
     } catch (err) {
       console.error("reassignOfflineDelivery error:", err);
       throw err;
     }
   },
 
   markForManualReview: async (id) => {
     const { user, userName, addNotification } = get();
     if (!user) return;
     try {
       const item = get().offlineQueue.find((q) => q.id === id);
       if (!item) return;
       const auditEntry = makeAuditEntry("manual_review_requested", user.uid, userName || "Owner");
       const newHistory = [...(item.auditHistory || []), auditEntry];
       await updateOfflineQueueItem(id, {
         state: "manual_review",
         auditHistory: newHistory,
       });
       await writeAuditLog(id, id, "manual_review_requested", user.uid, userName || "Owner");
       await addNotification(
         "Manual Review Required",
         `Offline delivery ${id} has been flagged for manual review.`,
         user.uid,
       );
     } catch (err) {
       console.error("markForManualReview error:", err);
       throw err;
     }
   },
 
   downloadEvidence: (id) => {
     const item = get().offlineQueue.find((q) => q.id === id);
     if (!item) return;
     const evidence = {
       deliveryId: item.id,
       agent: item.agentName,
       customer: item.customer,
       offlineCaptureTime: item.offlineCaptureTime,
       gps: item.proof?.gps,
       otp: item.proof?.otp,
       hash: item.proof?.hash,
       failureReason: item.failureReason,
       auditHistory: item.auditHistory,
       exportedAt: new Date().toISOString(),
     };
     const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url;
     a.download = `evidence-${id}-${Date.now()}.json`;
     a.click();
     URL.revokeObjectURL(url);
   },
 
   addNotification: async (title, message, targetUserId) => {
     try {
       const newDocRef = doc(collection(db, "notifications"));
       await setDoc(newDocRef, {
         userId: targetUserId,
         title,
         message,
         read: false,
         createdAt: serverTimestamp(),
       });
     } catch (err) {
       console.error("Error adding notification:", err);
     }
   },
   initializeAuth: () => {
     let unsubscribeUserDoc: (() => void) | null = null;
     const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
       if (unsubscribeUserDoc) {
         unsubscribeUserDoc();
         unsubscribeUserDoc = null;
       }
       try {
         if (firebaseUser) {
           const userDocRef = doc(db, "users", firebaseUser.uid);
           unsubscribeUserDoc = onSnapshot(
             userDocRef,
             async (snapshot) => {
               if (snapshot.exists()) {
                 const data = convertTimestamps(snapshot.data({ serverTimestamps: "estimate" }));
                  const role = data.role as "owner" | "agent" | "pending";
                  const userName = data.name || null;
                  set({ user: firebaseUser, role, userName, userProfile: data, authLoading: false });
                  // Auto sync online pending queue items
                  if (navigator.onLine && (role === "owner" || role === "agent")) {
                    get().triggerAutoSync();
                  }
                } else {
                  // If user doc doesn't exist yet (signup race condition), wait for login.tsx's setDoc.
                  set({
                    user: firebaseUser,
                    role: null,
                    userName: firebaseUser.displayName || "New User",
                    userProfile: null,
                    authLoading: false,
                  });
  
                  // Fallback creation after 2 seconds if still missing
                  setTimeout(async () => {
                    const latestSnapshot = await getDoc(userDocRef);
                    if (!latestSnapshot.exists() && auth.currentUser?.uid === firebaseUser.uid) {
                      await setDoc(userDocRef, {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName || "New User",
                        name: firebaseUser.displayName || "New User",
                        role: "pending",
                        enterpriseId: "",
                        createdAt: serverTimestamp(),
                        active: true,
                        status: "available",
                      });
                    }
                  }, 2000);
                }
              },
              (err) => {
                console.error("Error listening to user document:", err);
                set({ user: firebaseUser, role: "pending", userName: null, userProfile: null, authLoading: false });
              },
            );
          } else {
            set({ user: null, role: null, userName: null, userProfile: null, authLoading: false });
          }
        } catch (error) {
          console.error("Error during auth initialization:", error);
          set({ user: null, role: null, userName: null, userProfile: null, authLoading: false });
       }
     });
     return () => {
       unsubscribeAuth();
       if (unsubscribeUserDoc) {
         unsubscribeUserDoc();
       }    };
  },
  subscribeToPayments: () => {
    const { user, role } = get();
    if (!user || !role) return () => {};    let q;
    if (role === "owner") {
      q = query(
        collection(db, "payments"),
        where("enterpriseId", "==", user.uid),
      );
    } else if (role === "agent") {
      q = query(
        collection(db, "payments"),
        where("agentId", "==", user.uid),
      );
    } else {
      return () => {};
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Payment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data({ serverTimestamps: "estimate" });
          items.push(convertTimestamps(data) as Payment);
        });
        // In-memory sort by createdAt desc
        items.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        set({ payments: items });
      },
      (error) => {
        console.error("Error subscribing to payments:", error);
      },
    );
    return unsubscribe;
  },
  collectCodPayment: async (deliveryId, amount, customerSignature, remarks) => {
    const { user, userName } = get();
    if (!user) throw new Error("Authentication required.");

    try {
      const deliveryRef = doc(db, "deliveries", deliveryId);
      const paymentId = `PM-${deliveryId}`;
      const paymentRef = doc(db, "payments", paymentId);
      const transactionId = `TX-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
      const transactionRef = doc(db, "transactions", transactionId);
      const receiptNumber = `RC-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
      const receiptRef = doc(db, "receipts", receiptNumber);

      const subtotal = Number((amount * 0.82).toFixed(2));
      const cgst = Number((amount * 0.09).toFixed(2));
      const sgst = Number((amount * 0.09).toFixed(2));

      await runTransaction(db, async (transaction) => {
        const deliverySnap = await transaction.get(deliveryRef);
        if (!deliverySnap.exists()) throw new Error("Delivery not found.");
        const deliveryData = deliverySnap.data();

        if (deliveryData.paymentStatus === "cod_collected" || deliveryData.paymentStatus === "paid") {
          throw new Error("Payment already collected for this delivery.");
        }

        const nextVersion = getNextVersion(deliveryData.version);

        transaction.update(deliveryRef, {
          paymentStatus: "cod_collected",
          paymentMethod: "cash",
          paymentAmount: amount,
          transactionId,
          gatewayReference: "OFFLINE_CASH",
          paidAt: serverTimestamp(),
          receiptId: receiptNumber,
          cashCollected: amount,
          signature: customerSignature || "",
          remarks: remarks || "",
          version: nextVersion,
          updatedAt: serverTimestamp(),
        });

        transaction.update(paymentRef, {
          paymentStatus: "cod_collected",
          paymentMethod: "cash",
          amount,
          subtotal,
          cgst,
          sgst,
          transactionId,
          receiptNumber,
          paidAt: serverTimestamp(),
          receiptId: receiptNumber,
          cashCollected: amount,
          signature: customerSignature || "",
          remarks: remarks || "",
          gatewayReference: "OFFLINE_CASH",
          updatedAt: serverTimestamp(),
          paymentTime: serverTimestamp(),
        });

        transaction.set(transactionRef, {
          transactionId,
          paymentId,
          deliveryId,
          amount,
          subtotal,
          cgst,
          sgst,
          status: "success",
          paymentMethod: "cash",
          gatewayReference: "OFFLINE_CASH",
          paidAt: serverTimestamp(),
          receiptId: receiptNumber,
          cashCollected: amount,
          signature: customerSignature || "",
          remarks: remarks || "",
          createdAt: serverTimestamp(),
          performedBy: user.uid,
        });

        transaction.set(receiptRef, {
          receiptNumber,
          paymentId,
          deliveryId,
          amount,
          subtotal,
          cgst,
          sgst,
          customerName: deliveryData.customer,
          paymentMethod: "cash",
          paymentTime: serverTimestamp(),
          paidAt: serverTimestamp(),
          receiptId: receiptNumber,
          cashCollected: amount,
          signature: customerSignature || "",
          remarks: remarks || "",
          issuedAt: serverTimestamp(),
          signatureUrl: customerSignature || "",
        });
      });

      await get().addNotification(
        "COD Cash Collected",
        `COD of ${amount.toFixed(2)} collected from customer for delivery ${deliveryId}.`,
        user.uid
      );
      
      const deliverySnap = await getDoc(deliveryRef);
      if (deliverySnap.exists()) {
        const data = deliverySnap.data();
        await get().addNotification(
          "COD Cash Collected",
          `Agent ${userName || "Agent"} collected ${amount.toFixed(2)} cash for delivery ${deliveryId}.`,
          data.enterpriseId
        );
      }
    } catch (err) {
      console.error("Error collecting COD cash:", err);
      throw err;
    }
  },  
  completeOnlinePayment: async (deliveryId, paymentMethod, amount, gatewayReference, rzpDetails) => {
    try {
      const deliveryRef = doc(db, "deliveries", deliveryId);
      const paymentId = `PM-${deliveryId}`;
      const paymentRef = doc(db, "payments", paymentId);
      const transactionId = `TX-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
      const transactionRef = doc(db, "transactions", transactionId);
      const receiptNumber = `RC-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
      const receiptRef = doc(db, "receipts", receiptNumber);

      const subtotal = Number((amount * 0.82).toFixed(2));
      const cgst = Number((amount * 0.09).toFixed(2));
      const sgst = Number((amount * 0.09).toFixed(2));

      await runTransaction(db, async (transaction) => {
        const deliverySnap = await transaction.get(deliveryRef);
        if (!deliverySnap.exists()) throw new Error("Delivery not found.");
        const deliveryData = deliverySnap.data();

        if (deliveryData.paymentStatus === "paid" || deliveryData.paymentStatus === "cod_collected") {
          throw new Error("Delivery is already paid.");
        }

        const nextVersion = getNextVersion(deliveryData.version);
        const resolvedGatewayRef = gatewayReference || rzpDetails?.razorpay_payment_id || `SIMULATED_${paymentMethod.toUpperCase()}_GATEWAY`;

        transaction.update(deliveryRef, {
          paymentStatus: "paid",
          paymentMethod,
          paymentAmount: amount,
          transactionId,
          gatewayReference: resolvedGatewayRef,
          paidAt: serverTimestamp(),
          receiptId: receiptNumber,
          version: nextVersion,
          updatedAt: serverTimestamp(),
        });

        // set() with merge: true safely creates-or-updates atomically.
        transaction.set(paymentRef, {
          paymentId,
          deliveryId,
          enterpriseId: deliveryData.enterpriseId,
          agentId: deliveryData.agentId,
          customerId: deliveryData.customer,
          amount,
          subtotal,
          cgst,
          sgst,
          currency: deliveryData.currency || "INR",
          paymentMethod,
          paymentType: deliveryData.paymentType || "prepaid",
          paymentStatus: "paid",
          transactionId,
          receiptNumber,
          paidAt: serverTimestamp(),
          receiptId: receiptNumber,
          gatewayReference: resolvedGatewayRef,
          razorpayPaymentId: rzpDetails?.razorpay_payment_id || null,
          razorpayOrderId: rzpDetails?.razorpay_order_id || null,
          razorpaySignature: rzpDetails?.razorpay_signature || null,
          updatedAt: serverTimestamp(),
          paymentTime: serverTimestamp(),
          synced: true,
          networkMode: "online",
        }, { merge: true });

        transaction.set(transactionRef, {
          transactionId,
          paymentId,
          deliveryId,
          amount,
          subtotal,
          cgst,
          sgst,
          status: "success",
          paymentMethod,
          gatewayReference: resolvedGatewayRef,
          paidAt: serverTimestamp(),
          receiptId: receiptNumber,
          razorpayPaymentId: rzpDetails?.razorpay_payment_id || null,
          razorpayOrderId: rzpDetails?.razorpay_order_id || null,
          razorpaySignature: rzpDetails?.razorpay_signature || null,
          createdAt: serverTimestamp(),
          performedBy: "customer",
        });

        transaction.set(receiptRef, {
          receiptNumber,
          paymentId,
          deliveryId,
          amount,
          subtotal,
          cgst,
          sgst,
          customerName: deliveryData.customer,
          paymentMethod,
          paymentTime: serverTimestamp(),
          paidAt: serverTimestamp(),
          receiptId: receiptNumber,
          razorpayPaymentId: rzpDetails?.razorpay_payment_id || null,
          issuedAt: serverTimestamp(),
        });
      });

      const deliverySnap = await getDoc(deliveryRef);
      if (deliverySnap.exists()) {
        const data = deliverySnap.data();
        await get().addNotification(
          "Payment Successful",
          `Customer ${data.customer} paid ${amount.toFixed(2)} online via ${paymentMethod.toUpperCase()} for delivery ${deliveryId}.`,
          data.enterpriseId
        );
      }
    } catch (err) {
      console.error("Error completing online payment:", err);
      throw err;
    }
  },
  triggerAutoSync: async () => {const { syncState, updateStatus, user, userName } = get();
     if (syncState === "syncing") return;
     if (!navigator.onLine) return;
 
     try {
       const { getPendingSyncItems, removePendingSyncItem } = await import("@/lib/offline-store");
       const items = await getPendingSyncItems();
       if (items.length === 0) return;
 
       set({ syncState: "syncing", syncProgress: 0 });
       const totalItems = items.length;
       let completedCount = 0;
 
       for (const item of items) {
         const syncStartTime = new Date().toISOString();
 
         // Write initial offlineQueue record (state: syncing) so owner can see it live
         try {
           const queueEntry: import("@/lib/offline-queue-store").OfflineQueueItem = {
             id: item.id,
             enterpriseId: item.enterpriseId || user?.uid || "",
             agentId: item.agentId || user?.uid || "",
             agentName: item.agentName || userName || "Agent",
             customer: item.customer || "",
             deviceName: item.deviceName || navigator.userAgent.split("(")[0].trim() || "Unknown Device",
             networkStatus: navigator.onLine ? "online" : "offline",
             queuePosition: completedCount + 1,
             offlineCaptureTime: item.offlineCaptureTime || item.proof.verifiedAt,
             createdTime: item.offlineCaptureTime || new Date().toISOString(),
             gpsStatus: item.proof.gps ? "captured" : "missing",
             photoStatus: item.proof.photoBase64 ? "captured" : "missing",
             otpStatus: item.proof.otp ? "captured" : "missing",
             syncAttempts: 1,
             estimatedSyncTime: new Date(Date.now() + 30000).toISOString(),
             state: "syncing",
             retryCount: 0,
             syncStartTime,
             browserInfo: item.browserInfo || item.proof.userAgent || navigator.userAgent,
             offlineDurationMs: item.offlineDurationMs,
             proof: {
               gps: item.proof.gps,
               verifiedAt: item.proof.verifiedAt,
               hash: item.proof.hash,
               otp: item.proof.otp,
             },
             auditHistory: [
               makeAuditEntry("sync_started", user?.uid || "", userName || "System"),
             ],
           };
           await writeOfflineQueueItem(queueEntry);
           await writeAuditLog(item.id, item.id, "sync_started", user?.uid || "", userName || "System");
         } catch (queueErr) {
           console.warn("Failed to write offlineQueue record:", queueErr);
         }
 
         // Fetch actual delivery document from Firestore
         const deliveryRef = doc(db, "deliveries", item.id);
         const deliverySnap = await getDoc(deliveryRef);
         const deliveryData = deliverySnap.exists() ? deliverySnap.data() : null;
         const enterpriseId = deliveryData?.enterpriseId || user?.uid || "";
         const originalOtp = deliveryData?.otp || "";
         const isOtpCorrect = item.proof.otp === originalOtp;
 
         let uploadedPhotoUrl = "";
         let photoUploadFailed = false;
 
         // Upload photo base64 to Storage if exists
         if (item.proof.photoBase64) {
           try {
             const { ref, uploadString, getDownloadURL } = await import("firebase/storage");
             const { storage } = await import("@/lib/firebase");
             const imageRef = ref(storage, `proofs/${item.id}_${Date.now()}.jpg`);
             
             const uploadTask = async () => {
               await uploadString(imageRef, item.proof.photoBase64 as string, "data_url");
               return await getDownloadURL(imageRef);
             };
             
             const timeoutTask = new Promise<string>((_, reject) => 
               setTimeout(() => reject(new Error("Storage upload timed out")), 3000)
             );
             
             uploadedPhotoUrl = await Promise.race([uploadTask(), timeoutTask]);
           } catch (photoErr) {
             console.warn("Photo upload failed:", photoErr);
             photoUploadFailed = true;
             uploadedPhotoUrl = "https://placehold.co/600x400/png?text=Demo+Proof";
           }
         }
 
         const statusToSet: DeliveryStatus = isOtpCorrect ? "delivered" : "failed";
         const offlineVerification = {
           verifiedOtp: item.proof.otp,
           actualOtp: originalOtp,
           status: isOtpCorrect ? "success" : "failed",
           userAgent: item.proof.userAgent || "unknown",
           checkedAt: serverTimestamp(),
         };
 
         let syncSucceeded = false;
         let failureReason: import("@/lib/offline-queue-store").OfflineFailureReason = "unknown";
 
         try {
           // Update status in Firestore
           await updateStatus(item.id, statusToSet, {
             photoUrl: uploadedPhotoUrl,
             gps: item.proof.gps,
             verifiedAt: item.proof.verifiedAt,
             hash: item.proof.hash,
           });
 
           // Add verification telemetry details and append notes/remarks
           const updates: any = { offlineVerification };          if (item.proof.remarks) {
            updates.notes = deliveryData?.notes
              ? `${deliveryData.notes}\nRemarks: ${item.proof.remarks}`
              : `Remarks: ${item.proof.remarks}`;
          }
          await updateDoc(deliveryRef, updates);
          syncSucceeded = true;

          // Offline COD Cash Payment synchronization integration
          if (syncSucceeded && isOtpCorrect && item.payment) {
            try {
              const paymentId = `PM-${item.id}`;
              const paymentRef = doc(db, "payments", paymentId);
              const transactionId = `TX-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
              const transactionRef = doc(db, "transactions", transactionId);
              const receiptNumber = `RC-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
              const receiptRef = doc(db, "receipts", receiptNumber);

              await runTransaction(db, async (txn) => {
                const offlineAmount = item.payment?.amount ?? 0;
                const offlineSubtotal = Number((offlineAmount * 0.82).toFixed(2));
                const offlineCgst = Number((offlineAmount * 0.09).toFixed(2));
                const offlineSgst = Number((offlineAmount * 0.09).toFixed(2));

                txn.update(paymentRef, {
                  paymentStatus: "cod_collected",
                  paymentMethod: "cash",
                  amount: offlineAmount,
                  subtotal: offlineSubtotal,
                  cgst: offlineCgst,
                  sgst: offlineSgst,
                  transactionId,
                  receiptNumber,
                  paidAt: serverTimestamp(),
                  receiptId: receiptNumber,
                  cashCollected: offlineAmount,
                  signature: item.payment?.customerSignature || "",
                  remarks: item.payment?.remarks || "",
                  gatewayReference: "OFFLINE_CASH_SYNC",
                  networkMode: "offline",
                  deviceId: item.payment?.deviceId || "unknown",
                  updatedAt: serverTimestamp(),
                  paymentTime: serverTimestamp(),
                });

                txn.update(deliveryRef, {
                  paymentStatus: "cod_collected",
                  paymentMethod: "cash",
                  paymentAmount: offlineAmount,
                  transactionId,
                  gatewayReference: "OFFLINE_CASH_SYNC",
                  paidAt: serverTimestamp(),
                  receiptId: receiptNumber,
                  cashCollected: offlineAmount,
                  signature: item.payment?.customerSignature || "",
                  remarks: item.payment?.remarks || "",
                  paymentId,
                  updatedAt: serverTimestamp(),
                });

                txn.set(transactionRef, {
                  transactionId,
                  paymentId,
                  deliveryId: item.id,
                  amount: offlineAmount,
                  subtotal: offlineSubtotal,
                  cgst: offlineCgst,
                  sgst: offlineSgst,
                  status: "success",
                  paymentMethod: "cash",
                  gatewayReference: "OFFLINE_CASH_SYNC",
                  paidAt: serverTimestamp(),
                  receiptId: receiptNumber,
                  cashCollected: offlineAmount,
                  signature: item.payment?.customerSignature || "",
                  remarks: item.payment?.remarks || "",
                  createdAt: serverTimestamp(),
                  performedBy: item.agentId || "unknown",
                });

                txn.set(receiptRef, {
                  receiptNumber,
                  paymentId,
                  deliveryId: item.id,
                  amount: offlineAmount,
                  subtotal: offlineSubtotal,
                  cgst: offlineCgst,
                  sgst: offlineSgst,
                  customerName: item.customer || "Customer",
                  paymentMethod: "cash",
                  paymentTime: serverTimestamp(),
                  paidAt: serverTimestamp(),
                  receiptId: receiptNumber,
                  cashCollected: offlineAmount,
                  signature: item.payment?.customerSignature || "",
                  remarks: item.payment?.remarks || "",
                  issuedAt: serverTimestamp(),
                  signatureUrl: item.payment?.customerSignature || "",
                });
              });

              await get().addNotification(
                "Offline COD Sync Completed",
                `Offline cash payment of ${item.payment.amount.toFixed(2)} for delivery ${item.id} has been synchronized.`,
                item.agentId
              );
              await get().addNotification(
                "Offline COD Sync Completed",
                `Agent ${item.agentName} synced offline COD collection of ${item.payment.amount.toFixed(2)} for delivery ${item.id}.`,
                enterpriseId
              );
            } catch (paySyncErr) {
              console.error("Error syncing offline payment details:", paySyncErr);
            }
          }
 
           if (!isOtpCorrect) failureReason = "otp_mismatch";
           else if (photoUploadFailed) failureReason = "storage_upload_failure";
         } catch (syncErr: any) {
           console.error("Sync error for item:", item.id, syncErr);
           const msg = syncErr?.message || "";
           if (msg.includes("Version conflict")) failureReason = "version_conflict";
           else if (msg.includes("already exists")) failureReason = "duplicate_delivery";
           else failureReason = "firestore_rejection";
         }
 
         const syncEndTime = new Date().toISOString();
         const syncDuration = new Date(syncEndTime).getTime() - new Date(syncStartTime).getTime();
 
         // Update offlineQueue record with final state
         try {
           const finalAction = syncSucceeded && isOtpCorrect ? "sync_completed" : "sync_failed";
           const finalState = syncSucceeded && isOtpCorrect
             ? "synced"
             : (!isOtpCorrect || !syncSucceeded) ? "failed" : "failed";
 
           await updateOfflineQueueItem(item.id, {
             state: finalState as any,
             syncCompletedTime: syncEndTime,
             syncDuration,
             verificationStatus: isOtpCorrect && syncSucceeded ? "verified" : "failed",
             gpsVerification: !!item.proof.gps,
             otpVerification: isOtpCorrect,
             photoVerification: !!uploadedPhotoUrl,
             proof: {
               photoUrl: uploadedPhotoUrl,
               gps: item.proof.gps,
               verifiedAt: item.proof.verifiedAt,
               hash: item.proof.hash,
               otp: item.proof.otp,
             },
             ...(finalState === "failed" ? { failureReason } : {}),
             auditHistory: [
               makeAuditEntry("sync_started", user?.uid || "", userName || "System"),
               makeAuditEntry(finalAction as any, user?.uid || "", userName || "System"),
             ],
           });
           await writeAuditLog(
             item.id,
             item.id,
             finalAction as any,
             user?.uid || "",
             userName || "System",
             { syncDuration, isOtpCorrect, photoUploadFailed },
           );
         } catch (updateErr) {
           console.warn("Failed to update offlineQueue record:", updateErr);
         }
 
         // Notify the enterprise owner of sync completion
         try {
           await get().addNotification(
             isOtpCorrect && syncSucceeded ? "Delivery Sync Completed" : "Delivery Sync Failed",
             isOtpCorrect && syncSucceeded
               ? `Offline delivery ${item.id} to ${deliveryData?.customer || "recipient"} was synced and verified successfully.`
               : `Offline sync failed for delivery ${item.id}: ${failureReason.replace(/_/g, " ")}.`,
             enterpriseId,
           );
         } catch (notifErr) {
           console.error("Failed to send sync notification:", notifErr);
         }
 
         // Delete from IndexedDB queue
         await removePendingSyncItem(item.id);
 
         completedCount++;
         set({ syncProgress: Math.round((completedCount / totalItems) * 100) });
       }
 
       set({ syncState: "success" });
       setTimeout(() => set({ syncState: "idle", syncProgress: 0 }), 3000);
     } catch (err) {
       console.error("Background auto sync error:", err);
       set({ syncState: "failed" });
       setTimeout(() => set({ syncState: "idle" }), 5000);
     }
   },
 }));
 