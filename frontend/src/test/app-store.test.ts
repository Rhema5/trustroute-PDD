import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Firebase dependencies
vi.mock("@/lib/firebase", () => ({
  db: {},
  auth: {
    currentUser: null,
  },
}));

vi.mock("firebase/auth", () => ({
  getAuth: () => ({}),
  onAuthStateChanged: vi.fn(() => () => {}),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  query: vi.fn(),
  orderBy: vi.fn(),
}));

import { useApp } from "@/store/app-store";

describe("useApp Zustand Store Tests", () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useApp.setState({
      role: null,
      user: null,
      authLoading: true,
      deliveries: [],
    });
  });

  it("should have correct initial state", () => {
    const state = useApp.getState();
    expect(state.role).toBeNull();
    expect(state.user).toBeNull();
    expect(state.authLoading).toBe(true);
    expect(state.deliveries).toEqual([]);
  });

  it("should correctly update role state", () => {
    useApp.getState().setRole("owner");
    expect(useApp.getState().role).toBe("owner");

    useApp.getState().setRole("agent");
    expect(useApp.getState().role).toBe("agent");

    useApp.getState().setRole(null);
    expect(useApp.getState().role).toBeNull();
  });

  it("should correctly set deliveries list", () => {
    const mockDeliveries: any[] = [
      {
        id: "TR-9999",
        customer: "Alice",
        destination: "123 Main St",
        priority: "Express",
        status: "pending",
      },
    ];

    useApp.getState().setDeliveries(mockDeliveries);
    expect(useApp.getState().deliveries).toHaveLength(1);
    expect(useApp.getState().deliveries[0].customer).toBe("Alice");
  });
});
