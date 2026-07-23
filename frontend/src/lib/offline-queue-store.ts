/**
 * Offline Queue Store
 *
 * Manages the `offlineQueue` Firestore collection which tracks all deliveries
 * completed offline — from capture through sync to final verification.
 *
 * Also manages `auditLogs` writes for every offline action.
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────

export type OfflineQueueState =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "manual_review"
  | "cancelled";

export type OfflineFailureReason =
  | "otp_mismatch"
  | "gps_mismatch"
  | "corrupted_proof"
  | "duplicate_delivery"
  | "network_timeout"
  | "firestore_rejection"
  | "storage_upload_failure"
  | "version_conflict"
  | "invalid_qr"
  | "missing_image"
  | "missing_gps"
  | "unknown";

export type AuditAction =
  | "offline_created"
  | "sync_started"
  | "sync_completed"
  | "sync_failed"
  | "manual_approved"
  | "manual_rejected"
  | "manual_review_requested"
  | "escalated"
  | "reassigned"
  | "cancelled"
  | "resubmission_requested"
  | "retry_attempted"
  | "retry_succeeded"
  | "retry_failed";

export interface AuditEntry {
  action: AuditAction;
  timestamp: string;
  performedBy: string;
  performedByName: string;
  metadata?: Record<string, any>;
}

export interface OfflineQueueItem {
  id: string;                      // deliveryId (also the Firestore doc ID)
  enterpriseId: string;
  agentId: string;
  agentName: string;
  customer: string;
  deviceName: string;
  networkStatus: string;
  queuePosition: number;
  offlineCaptureTime: string;
  createdTime: string;
  gpsStatus: "captured" | "missing";
  photoStatus: "captured" | "missing";
  otpStatus: "captured" | "missing";
  syncAttempts: number;
  estimatedSyncTime: string;
  state: OfflineQueueState;
  failureReason?: OfflineFailureReason;
  retryCount: number;
  syncCompletedTime?: string;
  syncDuration?: number;           // milliseconds
  syncStartTime?: string;
  verificationStatus?: "verified" | "failed" | "partial";
  proofCertificate?: string;
  gpsVerification?: boolean;
  otpVerification?: boolean;
  photoVerification?: boolean;
  proof?: {
    photoUrl?: string;
    gps?: { lat: number; lng: number };
    verifiedAt?: string;
    hash?: string;
    otp?: string;
  };
  auditHistory?: AuditEntry[];
  manualReviewAssignee?: string;
  browserInfo?: string;
  offlineDurationMs?: number;
  updatedAt?: string;
}

// ─── Failure Reason Labels ─────────────────────────────────────

export const FAILURE_REASON_LABELS: Record<OfflineFailureReason, string> = {
  otp_mismatch: "OTP Mismatch",
  gps_mismatch: "GPS Mismatch",
  corrupted_proof: "Corrupted Proof",
  duplicate_delivery: "Duplicate Delivery",
  network_timeout: "Network Timeout",
  firestore_rejection: "Firestore Rejection",
  storage_upload_failure: "Storage Upload Failure",
  version_conflict: "Version Conflict",
  invalid_qr: "Invalid QR",
  missing_image: "Missing Image",
  missing_gps: "Missing GPS",
  unknown: "Unknown Error",
};

// ─── Firestore Helpers ─────────────────────────────────────────

function convertTimestamps(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (obj instanceof Timestamp) {
    try {
      return obj.toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  if (Array.isArray(obj)) return obj.map(convertTimestamps);
  const result: any = {};
  for (const key of Object.keys(obj)) {
    result[key] = convertTimestamps(obj[key]);
  }
  return result;
}

// ─── Real-time Subscription ────────────────────────────────────

/**
 * Subscribe to all offlineQueue items for an enterprise (owner view).
 * Returns unsubscribe function.
 */
export function subscribeToOfflineQueue(
  enterpriseId: string,
  onUpdate: (items: OfflineQueueItem[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(
    collection(db, "offlineQueue"),
    where("enterpriseId", "==", enterpriseId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: OfflineQueueItem[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data({ serverTimestamps: "estimate" });
        items.push(convertTimestamps(raw) as OfflineQueueItem);
      });
      // In-memory sort by createdTime desc
      items.sort((a, b) => {
        const timeA = a.createdTime ? new Date(a.createdTime).getTime() : 0;
        const timeB = b.createdTime ? new Date(b.createdTime).getTime() : 0;
        return timeB - timeA;
      });
      onUpdate(items);
    },
    (error) => {
      console.error("offlineQueue subscription error:", error);
      onError?.(error);
    },
  );
}

/**
 * Subscribe to offlineQueue items for a specific agent.
 */
export function subscribeToAgentOfflineQueue(
  agentId: string,
  onUpdate: (items: OfflineQueueItem[]) => void,
): () => void {
  const q = query(
    collection(db, "offlineQueue"),
    where("agentId", "==", agentId),
  );

  return onSnapshot(q, (snapshot) => {
    const items: OfflineQueueItem[] = [];
    snapshot.forEach((docSnap) => {
      const raw = docSnap.data({ serverTimestamps: "estimate" });
      items.push(convertTimestamps(raw) as OfflineQueueItem);
    });
    // In-memory sort by createdTime desc
    items.sort((a, b) => {
      const timeA = a.createdTime ? new Date(a.createdTime).getTime() : 0;
      const timeB = b.createdTime ? new Date(b.createdTime).getTime() : 0;
      return timeB - timeA;
    });
    onUpdate(items);
  });
}

// ─── Write Operations ──────────────────────────────────────────

/**
 * Write or overwrite an offline queue item in Firestore.
 */
export async function writeOfflineQueueItem(
  item: OfflineQueueItem,
): Promise<void> {
  const docRef = doc(db, "offlineQueue", item.id);
  await setDoc(docRef, {
    ...item,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update specific fields on an offline queue item.
 */
export async function updateOfflineQueueItem(
  id: string,
  updates: Partial<OfflineQueueItem>,
): Promise<void> {
  const docRef = doc(db, "offlineQueue", id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an offline queue item (owner only).
 */
export async function deleteOfflineQueueItem(id: string): Promise<void> {
  await deleteDoc(doc(db, "offlineQueue", id));
}

// ─── Audit Log ─────────────────────────────────────────────────

/**
 * Write an audit log entry to Firestore.
 */
export async function writeAuditLog(
  deliveryId: string,
  queueItemId: string,
  action: AuditAction,
  performedBy: string,
  performedByName: string,
  metadata?: Record<string, any>,
): Promise<void> {
  const logRef = doc(collection(db, "auditLogs"));
  await setDoc(logRef, {
    action,
    deliveryId,
    queueItemId,
    performedBy,
    performedByName,
    timestamp: serverTimestamp(),
    metadata: metadata || {},
  });
}

/**
 * Append an audit entry to an offlineQueue item's auditHistory array.
 */
export function makeAuditEntry(
  action: AuditAction,
  performedBy: string,
  performedByName: string,
  metadata?: Record<string, any>,
): AuditEntry {
  return {
    action,
    timestamp: new Date().toISOString(),
    performedBy,
    performedByName,
    metadata,
  };
}

// ─── Fetch for analytics (one-shot) ────────────────────────────

/**
 * Fetch all synced offline queue items for analytics.
 */
export async function fetchOfflineQueueSnapshot(
  enterpriseId: string,
): Promise<OfflineQueueItem[]> {
  const q = query(
    collection(db, "offlineQueue"),
    where("enterpriseId", "==", enterpriseId),
  );
  const snapshot = await getDocs(q);
  const items: OfflineQueueItem[] = [];
  snapshot.forEach((docSnap) => {
    items.push(convertTimestamps(docSnap.data()) as OfflineQueueItem);
  });
  return items;
}
