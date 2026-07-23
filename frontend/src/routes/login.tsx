import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Building2, Smartphone, Lock, Mail, User, MapPin } from "lucide-react";
import { Logo } from "@/components/trust/Logo";
import { BackgroundFX } from "@/components/trust/BackgroundFX";
import { useApp } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — TrustRoute" }] }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      mode: search.mode as "owner" | "agent" | undefined,
    }
  },
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address.").trim(),
  password: z.string().min(6, "Password must be at least 6 characters long."),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters long.").trim(),
});

function LoginPage() {
  const searchParams = Route.useSearch();
  const initialMode = searchParams.mode;

  const [isSignUp, setIsSignUp] = useState(!!initialMode);
  const [role, setRole] = useState<"owner" | "agent">(initialMode || "owner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState("Chennai");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const sanitizedEmail = email.trim();
      const sanitizedName = name.trim();

      if (isSignUp) {
        const validation = signupSchema.safeParse({
          name: sanitizedName,
          email: sanitizedEmail,
          password,
        });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }
      } else {
        const validation = loginSchema.safeParse({
          email: sanitizedEmail,
          password,
        });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }
      }

      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } =
        await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");

      let userCredential;
      if (isSignUp) {
        // Handle explicit signup
        userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
        const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");

        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: sanitizedEmail,
          displayName: sanitizedName || (role === "owner" ? "Acme Operations" : "Field Agent"),
          name: sanitizedName || (role === "owner" ? "Acme Operations" : "Field Agent"),
          role: role === "owner" ? "owner" : "pending",
          enterpriseId: role === "owner" ? userCredential.user.uid : "",
          createdAt: serverTimestamp(),
          active: true,
          status: "available",
          region: region,
        });

        toast.success("Account created successfully!");
      } else {
        // Handle signin
        try {
          userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, password);
        } catch (authError: any) {
          let message = "Invalid email or password.";
          if (authError.code === "auth/user-not-found") {
            message = "No account found with this email.";
          } else if (authError.code === "auth/wrong-password") {
            message = "Incorrect password.";
          } else if (authError.code === "auth/too-many-requests") {
            message = "Too many failed attempts. Please try again later.";
          }
          throw new Error(message);
        }
      }

      // Wait for app-store onAuthStateChanged to sync user and role
      let attempts = 0;
      const checkInterval = setInterval(() => {
        const state = useApp.getState();
        const resolvedRole = state.role;
        if (resolvedRole || attempts > 60) {
          clearInterval(checkInterval);
          setLoading(false);
          if (resolvedRole === "owner") {
            navigate({ to: "/dashboard" });
          } else if (resolvedRole === "agent") {
            navigate({ to: "/agent" });
          } else if (resolvedRole === "pending") {
            navigate({ to: "/pending-approval" });
          } else {
            toast.error("Network timeout or unknown role. Please try again.");
            auth.signOut();
          }
        }
        attempts++;
      }, 150);
    } catch (err: any) {
      console.error("Authentication failed:", err);
      toast.error(err.message || "Authentication failed. Please check your credentials.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { auth, db } = await import("@/lib/firebase");
      const { doc, getDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
      let userCredential;

      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        // NATIVE ANDROID GOOGLE LOGIN
        const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
        const result = await FirebaseAuthentication.signInWithGoogle();
        
        if (!result.credential?.idToken) {
             throw new Error("No ID token found in Google Sign-In result.");
        }

        const { GoogleAuthProvider, signInWithCredential } = await import("firebase/auth");
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        userCredential = await signInWithCredential(auth, credential);
      } else {
        // WEB BROWSER GOOGLE LOGIN
        const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
        const provider = new GoogleAuthProvider();
        userCredential = await signInWithPopup(auth, provider);
      }

      const user = userCredential.user;
      
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const assignedRole = (isSignUp && role === "owner") ? "owner" : "pending";
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || (assignedRole === "owner" ? "Acme Operations" : "Field Agent"),
          name: user.displayName || (assignedRole === "owner" ? "Acme Operations" : "Field Agent"),
          role: assignedRole,
          enterpriseId: assignedRole === "owner" ? user.uid : "",
          createdAt: serverTimestamp(),
          active: true,
          status: "available",
          region: region,
        });
        toast.success("Account created successfully!");
      }
      
      let attempts = 0;
      const checkInterval = setInterval(() => {
        const state = useApp.getState();
        const resolvedRole = state.role;
        if (resolvedRole || attempts > 60) {
          clearInterval(checkInterval);
          setLoading(false);
          if (resolvedRole === "owner") {
            navigate({ to: "/dashboard" });
          } else if (resolvedRole === "agent") {
            navigate({ to: "/agent" });
          } else if (resolvedRole === "pending") {
            navigate({ to: "/pending-approval" });
          } else {
            toast.error("Network timeout or unknown role. Please try again.");
            auth.signOut();
          }
        }
        attempts++;
      }, 150);
      
    } catch (err: any) {
      console.error("Google authentication failed:", err);
      toast.error(err.message || "Google authentication failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundFX />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="mb-10 flex justify-center">
          <Logo size="lg" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-strong rounded-3xl p-8 shadow-elevated"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isSignUp ? "Create an account" : "Welcome back"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSignUp ? "Sign up to register your portal" : "Choose your portal to continue"}
              </p>
            </div>
          </div>

          {/* Role selector (visible for sign up only) */}
          {isSignUp && !initialMode && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { id: "owner", label: "Enterprise", desc: "Operations console", icon: Building2 },
                { id: "agent", label: "Agent", desc: "Field terminal", icon: Smartphone },
              ].map((r) => {
                const active = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id as "owner" | "agent")}
                    className={cn(
                      "relative rounded-2xl border p-4 text-left transition",
                      active
                        ? "border-primary/50 bg-primary/10 shadow-glow"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                    )}
                  >
                    <r.icon
                      className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")}
                    />
                    <div className="mt-3 text-sm font-semibold">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.desc}</div>
                    {active && (
                      <motion.div
                        layoutId="role-glow"
                        className="absolute inset-0 -z-10 rounded-2xl gradient-primary opacity-20 blur-xl"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {isSignUp && (
              <>
                <Field icon={User} label="Full Name" type="text" value={name} onChange={setName} />
                <label className="group relative block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    required
                    className="peer block w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-10 pt-5 pb-2 text-sm text-foreground outline-none transition focus:border-primary/50 focus:bg-white/[0.06] focus:shadow-glow"
                  >
                    <option value="Chennai" className="bg-background text-foreground">Chennai</option>
                    <option value="Bangalore" className="bg-background text-foreground">Bangalore</option>
                    <option value="Mumbai" className="bg-background text-foreground">Mumbai</option>
                    <option value="Delhi" className="bg-background text-foreground">Delhi</option>
                    <option value="Hyderabad" className="bg-background text-foreground">Hyderabad</option>
                  </select>
                  <span className="pointer-events-none absolute left-10 top-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Operating Region
                  </span>
                </label>
              </>
            )}
            <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} />
            <Field
              icon={Lock}
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
            />

            {!isSignUp && (
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl gradient-primary py-3 text-sm font-semibold text-white shadow-glow transition hover:scale-[1.01] disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 animate-ping rounded-full bg-white" />
                  Authenticating
                </span>
              ) : (
                <>
                  {isSignUp ? "Register Account" : "Continue"} {" "}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6 flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="shrink-0 px-4 text-xs text-muted-foreground">OR</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>
          
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-foreground transition hover:bg-white/[0.08] disabled:opacity-70 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            {isSignUp ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  Create one
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  type,
  value,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="group relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        required
        className="peer block w-full rounded-xl border border-white/10 bg-white/[0.04] px-10 pt-5 pb-2 text-sm text-foreground outline-none transition focus:border-primary/50 focus:bg-white/[0.06] focus:shadow-glow"
      />
      <span className="pointer-events-none absolute left-10 top-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </label>
  );
}
