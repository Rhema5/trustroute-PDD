import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/store/app-store";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — TrustRoute" }] }),
  component: SettingsPage,
});

const settingsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").trim(),
  company: z.string().min(2, "Company name must be at least 2 characters.").trim(),
});

function SettingsPage() {
  const user = useApp((s) => s.user);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.name || "");
          setCompany(data.company || "Acme Logistics");
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    };
    loadProfile();
  }, [user]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || loading) return;
    setLoading(true);

    const validation = settingsSchema.safeParse({ name, company });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: name.trim(),
        company: company.trim(),
      });
      useApp.setState({ userName: name.trim() });
      toast.success("Settings saved successfully.");
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 text-zinc-850 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-zinc-900 font-['Poppins',sans-serif]">
          Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage workspace preferences, enterprise profile branding, and security handoff policy
          rules.
        </p>
      </div>

      <form
        onSubmit={saveSettings}
        className="rounded-2xl bg-white border border-zinc-200/80 p-6 space-y-6 shadow-sm"
      >
        <h2 className="text-sm font-bold text-zinc-800 font-['Poppins',sans-serif]">
          Company & User Profile
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">
              Administrator Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-250 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-[#7F1D1D]/45 focus:bg-white"
              required
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-[#7F1D1D] tracking-wider">
              Company / Workspace Name
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-250 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-[#7F1D1D]/45 focus:bg-white"
              required
            />
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-zinc-800 font-['Poppins',sans-serif]">
                Verification Policy Enforced
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                Strict multi-factor verification: (GPS capture + OTP match + Photo evidence).
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
              Active
            </span>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#7F1D1D] hover:bg-[#6B1414] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
          >
            {loading ? "Saving..." : "Save Workspace Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
