import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useApp } from "@/store/app-store";
import { BackgroundFX } from "@/components/trust/BackgroundFX";
import { Logo } from "@/components/trust/Logo";
import { Loader2, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase";
import { waitForAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/pending-approval")({
  beforeLoad: async () => {
    await waitForAuth();
    const state = useApp.getState();
    if (!state.user) {
      throw redirect({ to: "/login" });
    }
    if (state.role === "agent") {
      throw redirect({ to: "/agent" });
    }
    if (state.role === "owner") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: PendingApprovalPage,
});

function PendingApprovalPage() {
  const role = useApp((s) => s.role);
  const navigate = useNavigate();

  useEffect(() => {
    if (role === "agent") {
      navigate({ to: "/agent" });
    } else if (role === "owner") {
      navigate({ to: "/dashboard" });
    } else if (role === "rejected") {
      auth.signOut();
      navigate({ to: "/login" });
    }
  }, [role, navigate]);

  return (
    <div className="relative min-h-screen">
      <BackgroundFX />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-10 flex justify-center">
          <Logo size="lg" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-3xl p-8 shadow-elevated flex flex-col items-center"
        >
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
             <ShieldAlert className="h-6 w-6 text-primary absolute" />
             <Loader2 className="h-16 w-16 text-primary/40 animate-spin absolute" />
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-2">
            Waiting for Approval
          </h1>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Your field agent account has been successfully registered.
            <br /><br />
            As soon as your Enterprise Administrator approves your access, this page will automatically securely transfer you to your dashboard.
          </p>
          
          <button
            onClick={() => auth.signOut()}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Sign out and return to login
          </button>
        </motion.div>
      </div>
    </div>
  );
}
