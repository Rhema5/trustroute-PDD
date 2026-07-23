import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Building2, Package, ShieldCheck, Sparkles, Truck, Smartphone } from "lucide-react";
import { Logo } from "@/components/trust/Logo";
import { BackgroundFX } from "@/components/trust/BackgroundFX";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TrustRoute — Verified Logistics for Modern Enterprises" },
      {
        name: "description",
        content:
          "Secure delivery verification with OTP, GPS, and proof-of-delivery for enterprise logistics.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BackgroundFX />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition">
            Platform
          </a>
          <a href="#flow" className="hover:text-foreground transition">
            How it works
          </a>
          <a href="#trust" className="hover:text-foreground transition">
            Security
          </a>
        </nav>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium hover:bg-white/10 transition"
        >
          Sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            New — Live GPS verification & cryptographic proof
          </span>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Every delivery, <span className="text-gradient-primary">cryptographically</span>{" "}
            verified.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            TrustRoute is the proof-of-delivery layer for modern logistics — OTP, GPS, and
            tamper-evident photo evidence in one auditable record.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="group inline-flex items-center gap-2 rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:scale-[1.02] cursor-pointer"
            >
              Launch console{" "}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold hover:bg-white/10 transition"
            >
              See platform
            </a>
          </div>
        </motion.div>

        {/* Hero card preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative mx-auto mt-20 max-w-5xl"
        >
          <div className="absolute inset-0 -z-10 rounded-[2rem] gradient-primary opacity-30 blur-3xl" />
          <div className="glass-strong rounded-[2rem] p-2 shadow-elevated">
            <div className="rounded-[1.5rem] bg-background/60 p-8">
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  {
                    icon: ShieldCheck,
                    label: "Verified today",
                    value: "1,147",
                    tone: "from-emerald-500 to-cyan-500",
                  },
                  {
                    icon: Truck,
                    label: "Active routes",
                    value: "94",
                    tone: "from-violet-500 to-blue-500",
                  },
                  {
                    icon: Package,
                    label: "Avg verify time",
                    value: "38s",
                    tone: "from-orange-400 to-pink-500",
                  },
                ].map((s) => (
                  <div key={s.label} className="glass rounded-2xl p-5">
                    <div
                      className={`mb-4 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${s.tone}`}
                    >
                      <s.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-3xl font-bold">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <section id="features" className="mt-32 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "OTP-secured handoff",
              desc: "4-digit codes shared with the recipient. No code, no delivery. No exceptions.",
            },
            {
              icon: Truck,
              title: "Live GPS proof",
              desc: "Sub-meter coordinate capture at the exact moment of handoff, signed and stored.",
            },
            {
              icon: Building2,
              title: "Enterprise audit trail",
              desc: "PDF certificates with QR, hash, and signature for every completed route.",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass rounded-2xl p-6 hover:bg-white/[0.07] transition"
            >
              <f.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </section>
      </main>

      {/* Role Selector Modal */}
      <AnimatePresence>
        {isRoleModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoleModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md glass-strong rounded-3xl p-8 shadow-elevated pointer-events-auto relative overflow-hidden"
              >
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-red-500/10 to-transparent" />
                <div className="text-center mb-8">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 mb-4">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Hey, welcome to TrustRoute!</h2>
                  <p className="text-sm text-zinc-400">What do you need?</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate({ to: "/login", search: { mode: "owner" } })}
                    className="w-full text-left group relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06] hover:border-primary/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-zinc-900 p-3 group-hover:bg-primary/20 transition">
                        <Building2 className="h-6 w-6 text-zinc-400 group-hover:text-primary transition" />
                      </div>
                      <div>
                        <div className="font-bold text-white mb-0.5">Enterprise Mode</div>
                        <div className="text-xs text-zinc-400">Operations & Fleet Management</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate({ to: "/login", search: { mode: "agent" } })}
                    className="w-full text-left group relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06] hover:border-primary/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-zinc-900 p-3 group-hover:bg-primary/20 transition">
                        <Smartphone className="h-6 w-6 text-zinc-400 group-hover:text-primary transition" />
                      </div>
                      <div>
                        <div className="font-bold text-white mb-0.5">Agent Mode</div>
                        <div className="text-xs text-zinc-400">Field Terminal & Verification</div>
                      </div>
                    </div>
                  </button>
                </div>
                
                <button 
                  onClick={() => setIsRoleModalOpen(false)}
                  className="w-full mt-6 text-center text-xs text-zinc-500 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
