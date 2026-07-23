/**
 * Role Guard Module
 *
 * Centralized route protection for TrustRoute.
 * Validates user role before allowing access to protected routes.
 */

import { redirect } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { waitForAuth } from "@/lib/auth-guard";
import { toast } from "sonner";

type AppRole = "owner" | "agent" | "pending" | "rejected";

/**
 * Route guard that ensures the user has one of the allowed roles.
 * Use in TanStack Router `beforeLoad` hooks.
 *
 * @param allowedRoles - Array of roles that can access this route
 * @param redirectTo - Where to redirect if role doesn't match (optional, auto-detected)
 *
 * @example
 * ```ts
 * beforeLoad: async () => {
 *   await requireRole(["owner"]);
 * }
 * ```
 */
export async function requireRole(
  allowedRoles: AppRole[],
  redirectTo?: string,
): Promise<void> {
  // Wait for Firebase Auth to initialize
  await waitForAuth();

  const state = useApp.getState();
  const { user, role } = state;

  // Not logged in at all
  if (!user) {
    throw redirect({ to: "/login" });
  }

  // No role resolved yet (edge case during signup race)
  if (!role) {
    throw redirect({ to: "/login" });
  }

  // Check if the user's role is in the allowed list
  if (allowedRoles.includes(role as AppRole)) {
    return; // Access granted
  }

  // Handle specific denied roles
  switch (role) {
    case "pending":
      throw redirect({ to: "/pending-approval" });

    case "rejected":
      toast.error(
        "Your account access has been denied by the administrator.",
      );
      throw redirect({ to: "/login" });

    case "owner":
      // Agent tried to access owner pages — redirect to their dashboard
      if (redirectTo) {
        throw redirect({ to: redirectTo });
      }
      throw redirect({ to: "/dashboard" });

    case "agent":
      // Owner tried to access agent pages — redirect to their dashboard
      if (redirectTo) {
        throw redirect({ to: redirectTo });
      }
      throw redirect({ to: "/agent" });

    default:
      // Unknown role
      toast.error("Access denied. Unknown user role.");
      throw redirect({ to: "/login" });
  }
}

/**
 * Check if the current user has a specific role without redirecting.
 * Useful for conditional rendering.
 */
export function hasRole(role: AppRole): boolean {
  const state = useApp.getState();
  return state.role === role;
}

/**
 * Get the appropriate home route for a given role.
 */
export function getHomeRoute(role: string | null): string {
  switch (role) {
    case "owner":
      return "/dashboard";
    case "agent":
      return "/agent";
    default:
      return "/login";
  }
}
