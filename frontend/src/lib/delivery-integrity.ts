/**
 * Delivery Data Integrity Module
 *
 * Provides:
 * 1. Valid status transition enforcement
 * 2. Auto-sorting by status priority + recency
 * 3. Duplicate detection and deduplication
 * 4. Stale-write protection via updatedAt timestamps
 */

import type { Delivery, DeliveryStatus } from "./mock-data";

// ─── Status Transition Rules ──────────────────────────────────
// Defines which status transitions are allowed.
// Key = current status, Value = array of valid next statuses
const VALID_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  assigned: ["in_progress", "delivered", "failed", "cancelled"],
  in_progress: ["delivered", "failed", "cancelled"],
  delivered: [], // Terminal state — no further transitions
  failed: ["assigned"], // Can be retried by reassigning
  cancelled: [], // Terminal state
};

/**
 * Check if a status transition is valid.
 * Returns true if transitioning from `current` to `next` is allowed.
 */
export function isValidTransition(
  current: DeliveryStatus,
  next: DeliveryStatus,
): boolean {
  // Same status is always a no-op (allowed for idempotency)
  if (current === next) return true;
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

/**
 * Returns a human-readable error message for an invalid transition.
 */
export function getTransitionError(
  current: DeliveryStatus,
  next: DeliveryStatus,
): string {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || allowed.length === 0) {
    return `Cannot change status from "${current}" — it is a terminal state.`;
  }
  return `Invalid transition: "${current}" → "${next}". Allowed transitions from "${current}": ${allowed.map((s) => `"${s}"`).join(", ")}.`;
}

// ─── Status Priority for Sorting ──────────────────────────────
// Lower number = higher priority (shown first in the list)
const STATUS_PRIORITY: Record<DeliveryStatus, number> = {
  in_progress: 0, // Active deliveries first
  assigned: 1, // Waiting to start
  failed: 2, // Needs attention
  delivered: 3, // Completed (least urgent)
  cancelled: 4, // Terminal/Cancelled
};

// Priority weight multiplier for delivery priority
const PRIORITY_WEIGHT: Record<string, number> = {
  Critical: 0,
  Express: 1,
  Standard: 2,
};

/**
 * Sort deliveries by:
 * 1. Status priority (in_progress > assigned > failed > delivered)
 * 2. Within same status, by delivery priority (Critical > Express > Standard)
 * 3. Within same priority, by createdAt (newest first)
 */
export function sortDeliveries(deliveries: Delivery[]): Delivery[] {
  return [...deliveries].sort((a, b) => {
    // First: Sort by status priority
    const statusDiff =
      (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;

    // Second: Sort by delivery priority within same status
    const priorityDiff =
      (PRIORITY_WEIGHT[a.priority] ?? 99) -
      (PRIORITY_WEIGHT[b.priority] ?? 99);
    if (priorityDiff !== 0) return priorityDiff;

    // Third: Sort by createdAt (newest first)
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

// ─── Duplicate Detection ──────────────────────────────────────

/**
 * Check if a delivery with the given ID already exists.
 */
export function isDuplicate(
  deliveries: Delivery[],
  newId: string,
): boolean {
  return deliveries.some((d) => d.id === newId);
}

/**
 * Deduplicate deliveries, keeping the most recently updated version.
 * Uses createdAt as a fallback timestamp for ordering.
 */
export function deduplicateDeliveries(
  deliveries: Delivery[],
): Delivery[] {
  const map = new Map<string, Delivery>();
  for (const d of deliveries) {
    const existing = map.get(d.id);
    if (!existing) {
      map.set(d.id, d);
    } else {
      // Keep the one with the more recent timestamp
      const existingTime = existing.createdAt
        ? new Date(existing.createdAt).getTime()
        : 0;
      const newTime = d.createdAt
        ? new Date(d.createdAt).getTime()
        : 0;
      if (newTime >= existingTime) {
        map.set(d.id, d);
      }
    }
  }
  return Array.from(map.values());
}

// ─── Stale-Write Protection ───────────────────────────────────

/**
 * Checks if a delivery update should be allowed based on timestamps.
 * Prevents overwriting newer data with stale writes.
 *
 * @param existingDelivery - The current delivery in state
 * @param incomingTimestamp - The timestamp of the incoming update (ISO string)
 * @returns true if the write should proceed, false if it's stale
 */
export function isStaleWrite(
  existingDelivery: Delivery,
  incomingTimestamp: string | undefined,
): boolean {
  if (!incomingTimestamp) return false; // No timestamp = allow (first write)
  if (!existingDelivery.createdAt) return false; // No existing timestamp = allow

  const existingTime = new Date(existingDelivery.createdAt).getTime();
  const incomingTime = new Date(incomingTimestamp).getTime();

  // Stale if incoming is older than existing
  return incomingTime < existingTime;
}

// ─── Validation Helpers ───────────────────────────────────────

/**
 * Validate a delivery object has required fields for data integrity.
 */
export function validateDeliveryFields(d: Partial<Delivery>): string[] {
  const errors: string[] = [];
  if (!d.id) errors.push("Delivery ID is required.");
  if (!d.customer || d.customer.trim().length < 2)
    errors.push("Customer name must be at least 2 characters.");
  if (!d.destination || d.destination.trim().length < 5)
    errors.push("Destination must be at least 5 characters.");
  if (!d.agentId) errors.push("Agent must be assigned.");
  if (!d.enterpriseId) errors.push("Enterprise ID is required.");
  if (!d.otp || d.otp.length !== 4) errors.push("OTP must be a 4-digit code.");
  return errors;
}

// ─── Version Control (Optimistic Concurrency) ────────────────

/** The Firestore field name used for version tracking */
export const DELIVERY_VERSION_FIELD = "version";

/** Initial version for newly created deliveries */
export const INITIAL_VERSION = 1;

/**
 * Check if a version conflict exists (stale write detection).
 * Returns true if the incoming version is outdated.
 *
 * @param currentVersion - The version currently stored in Firestore
 * @param incomingVersion - The version the client believes is current
 * @returns true if there is a conflict (incoming is stale)
 */
export function checkVersionConflict(
  currentVersion: number | undefined,
  incomingVersion: number | undefined,
): boolean {
  // If no version tracking exists yet, no conflict
  if (currentVersion === undefined || incomingVersion === undefined) {
    return false;
  }
  // Conflict if the incoming version doesn't match current
  return incomingVersion < currentVersion;
}

/**
 * Get the next version number for a delivery update.
 * If no version exists yet, starts at INITIAL_VERSION.
 */
export function getNextVersion(currentVersion: number | undefined): number {
  if (currentVersion === undefined || currentVersion < 1) {
    return INITIAL_VERSION;
  }
  return currentVersion + 1;
}

/**
 * Process raw Firestore deliveries into sorted, deduplicated, integrity-checked list.
 * This is the main pipeline that should be called whenever deliveries arrive.
 */
export function processDeliveries(rawDeliveries: Delivery[]): Delivery[] {
  const deduplicated = deduplicateDeliveries(rawDeliveries);
  const sorted = sortDeliveries(deduplicated);
  return sorted;
}
