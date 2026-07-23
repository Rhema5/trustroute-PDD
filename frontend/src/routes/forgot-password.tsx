import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, Mail, Send, Sparkles } from "lucide-react";
import { Logo } from "@/components/trust/Logo";
import { BackgroundFX } from "@/components/trust/BackgroundFX";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset Password — TrustRoute" }] }),
  component: ForgotPasswordPage,
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address.").trim(),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const sanitizedEmail = email.trim();
      const validation = forgotPasswordSchema.safeParse({ email: sanitizedEmail });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { sendPasswordResetEmail } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      await sendPasswordResetEmail(auth, sanitizedEmail);
      setDone(true);
      toast.success("Password reset email sent successfully!");
    } catch (err: any) {
      console.error("Password reset error:", err);
      toast.error(err.message || "Failed to send password reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundFX />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-left">
        <div className="mb-10 flex justify-center">
          <Logo size="lg" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-strong rounded-3xl p-8 shadow-elevated"
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white">Reset Password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 text-center"
            >
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-emerald-400 text-sm font-semibold">
                Email Sent! Please check your inbox for instructions to reset your password.
              </div>
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm text-white hover:bg-white/[0.06] transition"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="group relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  required
                  className="peer block w-full rounded-xl border border-white/10 bg-white/[0.04] px-10 pt-5 pb-2 text-sm text-foreground outline-none transition focus:border-primary/50 focus:bg-white/[0.06] focus:shadow-glow"
                />
                <span className="pointer-events-none absolute left-10 top-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Email Address
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl gradient-primary py-3 text-sm font-semibold text-white shadow-glow transition hover:scale-[1.01] disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 animate-ping rounded-full bg-white" />
                    Sending Email
                  </span>
                ) : (
                  <>
                    Send Reset Link{" "}
                    <Send className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" /> Return to Login
                </Link>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
