import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Star, Trophy, Truck, ShieldCheck, Mail, Calendar, UserCheck, MapPin } from "lucide-react";
import { useApp } from "@/store/app-store";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/agent/profile")({
  head: () => ({ meta: [{ title: "Profile — TrustRoute" }] }),
  component: Profile,
});

function Profile() {
  const userName = useApp((s) => s.userName) || "Field Agent";
  const userEmail = useApp((s) => s.user?.email) || "";
  const userProfile = useApp((s) => s.userProfile);
  const deliveries = useApp((s) => s.deliveries);

  // BUGFIX: wrap derived list calculations in useMemo to avoid re-creating arrays on every render
  const completedCount = useMemo(() => {
    return deliveries.filter((d) => d.status === "delivered").length;
  }, [deliveries]);

  const rating = userProfile?.rating ?? 5.0;
  const streak = userProfile?.streak ?? "3d";
  const nav = useNavigate();
  const [regionUpdating, setRegionUpdating] = useState(false);
  const currentRegion = userProfile?.region || "Chennai";

  const handleRegionChange = async (newRegion: string) => {
    const currentUser = useApp.getState().user;
    if (!currentUser) return;
    setRegionUpdating(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { region: newRegion });
      toast.success(`Operating hub successfully changed to ${newRegion}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update operating hub.");
    } finally {
      setRegionUpdating(false);
    }
  };

  const handleDisconnect = async () => {
    const currentUser = useApp.getState().user;
    if (!currentUser) return;
    
    const newEnterpriseId = window.prompt("To switch to a new Enterprise, please ask your new owner for their 'Enterprise ID' and paste it below:");
    if (!newEnterpriseId || newEnterpriseId.trim() === "") return;
    
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { 
        enterpriseId: newEnterpriseId.trim(),
        status: "available"
      });
      toast.success("Successfully connected to the new Enterprise!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to the new Enterprise. Please ensure the ID is correct.");
    }
  };

  // BUGFIX: Dynamic joined date formatting
  const getJoinedDate = () => {
    if (!userProfile?.createdAt) return "June 2026";
    try {
      const date = new Date(userProfile.createdAt);
      return date.toLocaleDateString([], { month: "long", year: "numeric" });
    } catch (e) {
      return "June 2026";
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      toast.success("Signed out successfully.");
      nav({ to: "/login" });
    } catch (err: any) {
      console.error("Error signing out:", err);
      toast.error("Failed to sign out.");
    }
  };

  const getInitials = (name: string) => {
    return (
      name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "AG"
    );
  };

  return (
    <div className="space-y-6 text-left text-zinc-300">
      {/* Header section */}
      <header>
        <span className="text-[10px] text-[#FF4D4D] uppercase font-bold tracking-widest block">
          Agent Terminal
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
          My Account
        </h1>
        <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
          Manage your profile details, statistics, and terminal settings.
        </p>
      </header>

      {/* Grid: Profile detail card and performance cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-2 space-y-5">
          {/* Main info card */}
          <div className="rounded-3xl bg-[#0F1424] border border-zinc-850 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-5">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-[#B71C1C] to-red-500 text-2xl font-black text-white shadow-glow shrink-0">
              {getInitials(userName)}
            </div>
            <div className="text-center sm:text-left min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h2 className="text-xl font-bold text-white leading-none">{userName}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-950/20 text-emerald-400 border border-emerald-500/25">
                  <UserCheck className="h-3 w-3" /> Active Terminal
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="h-3.5 w-3.5 text-zinc-550 shrink-0" /> {userEmail}
              </p>
            </div>
          </div>

          {/* Detailed Account fields card */}
          <div className="rounded-3xl bg-[#0F1424] border border-zinc-850 p-6 space-y-5">
            <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-2 border-b border-zinc-850/60 pb-2">
              <ShieldCheck className="h-4 w-4 text-[#FF4D4D]" /> Terminal Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-zinc-950/30 p-4 rounded-2xl border border-zinc-850">
                <span className="text-[9px] uppercase font-bold text-zinc-550 block">Operational Role</span>
                <span className="text-sm font-bold text-white mt-1 block">TrustRoute Field Agent</span>
              </div>

              <div className="bg-zinc-950/30 p-4 rounded-2xl border border-zinc-850">
                <span className="text-[9px] uppercase font-bold text-zinc-550 block">Registered Terminal Email</span>
                <span className="text-sm font-bold text-white mt-1 block truncate" title={userEmail}>
                  {userEmail}
                </span>
              </div>

              <div className="bg-zinc-950/30 p-4 rounded-2xl border border-zinc-850">
                <span className="text-[9px] uppercase font-bold text-zinc-550 block">Security Authority</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-emerald-400" /> Authorized
                </span>
              </div>

              <div className="bg-zinc-950/30 p-4 rounded-2xl border border-zinc-850">
                <span className="text-[9px] uppercase font-bold text-zinc-550 block">Joined date</span>
                <span className="text-sm font-bold text-white mt-1 block flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-zinc-500" /> {getJoinedDate()}
                </span>
              </div>

              <div className="bg-zinc-950/30 p-4 rounded-2xl border border-zinc-850 sm:col-span-2">
                <span className="text-[9px] uppercase font-bold text-zinc-550 block">Operating Hub (Region)</span>
                <div className="mt-2 relative">
                  <select
                    value={currentRegion}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    disabled={regionUpdating}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-[#FF4D4D]/50 transition appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="Chennai">Chennai</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Hyderabad">Hyderabad</option>
                  </select>
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
              
              <div className="sm:col-span-2 pt-2 border-t border-zinc-850/60 mt-2">
                <button
                  onClick={handleDisconnect}
                  className="w-full py-2.5 px-4 rounded-xl border border-violet-500/20 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" /> Link to a New Enterprise
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Statistics overview & signout */}
        <div className="space-y-5">
          <h3 className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Performance metrics</h3>

          <div className="bg-[#0F1424] border border-zinc-850 rounded-3xl p-6 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Truck, label: "Routes Done", value: completedCount.toString(), color: "text-[#FF4D4D]" },
                { icon: Star, label: "Handoff Rating", value: rating.toFixed(1), color: "text-yellow-500" },
                { icon: Trophy, label: "Active Streak", value: streak, color: "text-violet-500" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-zinc-950/30 p-3.5 rounded-2xl text-center border border-zinc-850 flex flex-col items-center justify-between"
                >
                  <s.icon className={cn("h-5 w-5 mb-2", s.color)} />
                  <div>
                    <div className="text-lg font-black text-white">{s.value}</div>
                    <div className="text-[8px] text-zinc-500 uppercase font-bold mt-0.5 whitespace-nowrap">
                      {s.label.split(" ")[0]}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-850 pt-5 text-center">
              <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed max-w-xs mx-auto">
                Sign out will close this active terminal session and clear temporary route caches.
              </p>
              <button
                onClick={handleSignOut}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 py-3.5 text-xs font-bold text-rose-450 hover:text-rose-400 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" /> End Terminal Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
