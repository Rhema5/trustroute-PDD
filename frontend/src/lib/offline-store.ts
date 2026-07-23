import { openDB, type IDBPDatabase } from "idb";

interface OfflineProof {
  photoBase64?: string;
  gps: { lat: number; lng: number };
  verifiedAt: string;
  hash: string;
  remarks?: string;
  otp: string;
  userAgent?: string;
}

export interface PendingSyncItem {
  id: string; // deliveryId
  status: "delivered" | "failed";
  proof: OfflineProof;
  synced: boolean;
  error?: string;
  // Optional device metadata for Offline Operations Center
  deviceName?: string;
  networkStatus?: string;
  offlineCaptureTime?: string;
  queuePosition?: number;
  browserInfo?: string;
  offlineDurationMs?: number;
  enterpriseId?: string;
  agentId?: string;
  agentName?: string;
  customer?: string;
  payment?: {
    amount: number;
    paymentMethod: "cash";
    paymentType: "cod";
    paymentStatus: "cod_collected";
    customerSignature?: string;
    remarks?: string;
    collectedAt: string;
    deviceId: string;
    networkMode: "offline";
  };
}

const DB_NAME = "trustroute-offline";
const STORE_NAME = "pending_sync";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function queueOfflineSync(item: PendingSyncItem): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, item);
}

export async function getPendingSyncItems(): Promise<PendingSyncItem[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function removePendingSyncItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function clearPendingSyncStore(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}
