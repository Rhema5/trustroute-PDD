import { useApp } from "@/store/app-store";

/**
 * A Promise wrapper that resolves once the Zustand store has finished initializing
 * the Firebase Auth listener (i.e. authLoading is false).
 */
export const waitForAuth = (): Promise<void> => {
  return new Promise<void>((resolve) => {
    const state = useApp.getState();
    if (!state.authLoading) {
      resolve();
      return;
    }

    const unsubscribe = useApp.subscribe((state) => {
      if (!state.authLoading) {
        unsubscribe();
        resolve();
      }
    });
  });
};
