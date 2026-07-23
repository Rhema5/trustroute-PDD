export type DeliveryStatus = "assigned" | "in_progress" | "delivered" | "failed" | "cancelled";

export interface Agent {
  id: string;
  name: string;
  email?: string;
  avatarColor: string;
  online: boolean;
  rating: number;
  region?: string;
}

export interface Payment {
  paymentId: string;
  deliveryId: string;
  enterpriseId: string;
  agentId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: "cash" | "upi" | "card" | "netbanking" | "wallet" | "none";
  paymentType: "prepaid" | "cod";
  paymentStatus: "pending" | "processing" | "paid" | "cod_pending" | "cod_collected" | "failed" | "cancelled" | "refunded";
  gatewayReference?: string;
  transactionId?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
  deviceId?: string;
  networkMode?: "online" | "offline";
}

export interface Transaction {
  transactionId: string;
  paymentId: string;
  deliveryId: string;
  amount: number;
  status: "success" | "failed" | "pending" | "processing";
  paymentMethod: string;
  gatewayReference: string;
  createdAt: string;
  performedBy: string;
}

export interface Receipt {
  receiptNumber: string;
  paymentId: string;
  deliveryId: string;
  amount: number;
  customerName: string;
  issuedAt: string;
  signatureUrl?: string;
}

export interface Delivery {
  id: string;
  customer: string;
  phone: string;
  destination: string;
  packageType: string;
  notes?: string;
  priority: "Standard" | "Express" | "Critical";
  agentId: string;
  agentName: string;
  enterpriseId: string;
  eta: string;
  status: DeliveryStatus;
  otp: string;
  distanceKm: number;
  createdAt: string;
  proof?: {
    photoUrl: string;
    gps: { lat: number; lng: number };
    verifiedAt: string;
    hash: string;
    otp?: string;
    remarks?: string;
    userAgent?: string;
  };
  offlineVerification?: {
    pendingReview: boolean;
    deviceInfo: string;
    offlineReason: string;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewStatus?: "approved" | "rejected";
  };
  version?: number;
  updatedAt?: string;
  // Payment integration fields
  paymentType?: "prepaid" | "cod";
  paymentStatus?: "pending" | "processing" | "paid" | "cod_pending" | "cod_collected" | "failed" | "cancelled" | "refunded";
  paymentAmount?: number;
  paymentId?: string;
  cancellationReason?: string;
}

export const agents: Agent[] = [];
export const deliveries: Delivery[] = [];
export const stats: any[] = [];

export function getDelivery(id: string) {
  return undefined;
}

