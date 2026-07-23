import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
  useNavigate,
  redirect,
} from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  ChevronLeft,
  FileCheck2,
  History,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  LogOut,
  ShieldCheck,
  BarChart4,
  Users,
  UserCheck,
  Check,
  WifiOff,
  CreditCard,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Logo } from "@/components/trust/Logo";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { waitForAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    await waitForAuth();
    const state = useApp.getState();
    if (!state.user || state.role !== "owner") {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardLayout,
});

const navItems: {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/new", label: "New Delivery", icon: Plus },
  { to: "/dashboard/history", label: "History", icon: History },
  { to: "/dashboard/proofs", label: "Proof Records", icon: FileCheck2 },
  { to: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { to: "/dashboard/agents", label: "Agents Roster", icon: Users },
  { to: "/dashboard/pending", label: "Pending Approvals", icon: UserCheck },
  { to: "/dashboard/offline", label: "Offline Center", icon: WifiOff },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart4 },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const user = useApp((s) => s.user);
  const role = useApp((s) => s.role);
  const userName = useApp((s) => s.userName) || "Enterprise Owner";
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);

  const searchQuery = useApp((s) => s.searchQuery);
  const setSearchQuery = useApp((s) => s.setSearchQuery);
  const notifications = useApp((s) => s.notifications);
  const markNotificationAsRead = useApp((s) => s.markNotificationAsRead);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (user && role === "owner") {
      const unsubDeliveries = useApp.getState().subscribeToDeliveries();
      const unsubNotifications = useApp.getState().subscribeToNotifications();
      const unsubOfflineQueue = useApp.getState().subscribeToOfflineQueue();
      const unsubPayments = useApp.getState().subscribeToPayments();
      return () => {
        unsubDeliveries();
        unsubNotifications();
        unsubOfflineQueue();
        unsubPayments();
      };
    }
  }, [user, role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative min-h-screen bg-zinc-50 text-zinc-800 font-['Inter',sans-serif]">
      {/* Deep Crimson Sidebar Wrapper */}
      <aside
        className={cn(
          "fixed inset-y-3 left-3 z-30 hidden flex-col rounded-3xl bg-[#7F1D1D] text-white p-3 shadow-lg transition-all duration-300 md:flex border border-[#6B1414]",
          collapsed ? "w-[76px]" : "w-[248px]",
        )}
      >
        <div className={cn("flex items-center gap-2 px-2 py-2", collapsed && "justify-center")}>
          {collapsed ? (
            <div className="h-6 w-6 rounded-lg bg-white/20 grid place-items-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-white/20 grid place-items-center">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white font-['Poppins',sans-serif]">
                TrustRoute
              </span>
            </div>
          )}
        </div>
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition cursor-pointer",
                  active
                    ? "text-white bg-white/10"
                    : "text-rose-100 hover:bg-white/5 hover:text-white",
                )}
              >
                <item.icon
                  className={cn("h-4.5 w-4.5 shrink-0", active ? "text-white" : "text-rose-200")}
                />
                {!collapsed && <span className="font-medium">{item.label}</span>}
                {active && !collapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-glow" />
                )}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={async () => {
            try {
              await auth.signOut();
              toast.success("Signed out successfully.");
              navigate({ to: "/login" });
            } catch (err: any) {
              console.error("Sign out error:", err);
              toast.error("Failed to sign out.");
            }
          }}
          className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-300 hover:bg-rose-900/20 hover:text-rose-200 transition cursor-pointer"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          {!collapsed && <span className="font-medium">Sign Out</span>}
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mt-2 flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] py-2 text-rose-200 transition hover:bg-white/[0.06] cursor-pointer"
        >
          <ChevronLeft className={cn("h-4 w-4 transition", collapsed && "rotate-180")} />
        </button>
      </aside>

      <div
        className={cn(
          "relative z-10 transition-all duration-300",
          "md:pl-[272px]",
          collapsed && "md:pl-[100px]",
        )}
      >
        {/* White header bar panel */}
        <header className="sticky top-0 z-20 mx-3 mt-3 rounded-2xl bg-white border border-zinc-200/80 px-4 py-3 shadow-sm md:mx-6 md:mt-4">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Logo size="sm" />
            </div>
            <div className="hidden flex-1 md:block">
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search deliveries, agents, IDs…"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-[#7F1D1D]/45 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Notifications Popover */}
            <div className="relative ml-auto" ref={popoverRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-650 transition cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl z-50 text-left"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-2">
                      <span className="text-xs font-bold text-zinc-800 font-['Poppins',sans-serif]">
                        Notifications ({unreadCount} new)
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-center text-xs text-zinc-400 py-6">
                          No alerts logged in your console.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              "p-2.5 rounded-xl text-xs border transition-all flex items-start justify-between gap-2",
                              n.read
                                ? "bg-zinc-50/50 border-zinc-100 text-zinc-500"
                                : "bg-red-50/20 border-red-100 text-zinc-800 font-medium",
                            )}
                          >
                            <div>
                              <div className="font-semibold text-zinc-800">{n.title}</div>
                              <p className="mt-0.5 text-zinc-500 text-[11px] leading-relaxed">
                                {n.message}
                              </p>
                              <span className="text-[9px] text-zinc-400 mt-1 block">
                                {new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            {!n.read && (
                              <button
                                onClick={() => markNotificationAsRead(n.id)}
                                className="shrink-0 h-5 w-5 grid place-items-center rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition cursor-pointer"
                                title="Mark as read"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#7F1D1D] to-[#B71C1C] text-xs font-bold text-white font-['Poppins',sans-serif]">
                {(() => {
                  return (
                    userName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "EP"
                  );
                })()}
              </div>
              <div className="hidden text-xs leading-tight md:block text-left">
                <div className="font-bold text-zinc-800">
                  {userName}
                </div>
                <div className="text-zinc-400 text-[10px]">
                  {useApp((s) => s.user?.email) || ""}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Panel Area */}
        <main className="px-3 pb-24 pt-4 md:px-6 md:pb-12 text-zinc-800">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-3 left-3 right-3 z-30 flex justify-around rounded-2xl bg-white border border-zinc-250/80 px-2 py-2 shadow-lg md:hidden">
          {navItems.slice(0, 4).map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px]",
                  active ? "text-[#7F1D1D] font-bold" : "text-zinc-555",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

