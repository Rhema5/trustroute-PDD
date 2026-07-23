import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
  useNavigate,
  redirect,
} from "@tanstack/react-router";
import {
  Map,
  QrCode,
  Truck,
  User,
  ShieldCheck,
  RefreshCw,
  Menu,
  X,
  Bell,
  Search,
  ChevronLeft,
  LogOut,
  Check,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { useApp } from "@/store/app-store";
import { waitForAuth } from "@/lib/auth-guard";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

export const Route = createFileRoute("/agent")({
  beforeLoad: async () => {
    await waitForAuth();
    const state = useApp.getState();
    if (!state.user || state.role !== "agent") {
      throw redirect({ to: "/login" });
    }
  },
  component: AgentLayout,
});

const navItems = [
  { to: "/agent" as const, label: "Route Overview", icon: Map, exact: true },
  { to: "/agent/scan" as const, label: "QR Scanner", icon: QrCode },
  { to: "/agent/deliveries" as const, label: "Deliveries List", icon: Truck },
  { to: "/agent/certificate" as const, label: "Certificate Hub", icon: ShieldCheck },
  { to: "/agent/sync" as const, label: "Sync Center", icon: RefreshCw },
  { to: "/agent/profile" as const, label: "My Profile", icon: User },
];

function AgentLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const path = useRouterState({ select: (s) => s.location.pathname });
  const user = useApp((s) => s.user);
  const role = useApp((s) => s.role);
  const userName = useApp((s) => s.userName) || "Field Agent";
  const userEmail = useApp((s) => s.user?.email) || "";
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);

  const searchQuery = useApp((s) => s.searchQuery);
  const setSearchQuery = useApp((s) => s.setSearchQuery);
  const notifications = useApp((s) => s.notifications);
  const markNotificationAsRead = useApp((s) => s.markNotificationAsRead);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (user && role === "agent") {
      const unsubDeliveries = useApp.getState().subscribeToDeliveries();
      const unsubNotifications = useApp.getState().subscribeToNotifications();
      return () => {
        unsubDeliveries();
        unsubNotifications();
      };
    }
  }, [user, role]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      toast.success("Signed out successfully.");
      navigate({ to: "/login" });
    } catch (err: any) {
      console.error("Sign out error:", err);
      toast.error("Failed to sign out.");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AG";
  };

  // Helper for Breadcrumbs
  const getBreadcrumbs = () => {
    const segments = path.split("/").filter(Boolean);
    return [
      { label: "Agent Portal", to: "/agent" },
      ...segments.slice(1).map((s, idx) => {
        const to = "/" + segments.slice(0, idx + 2).join("/");
        const label = s.charAt(0).toUpperCase() + s.slice(1);
        return { label, to };
      }),
    ];
  };

  return (
    <div className="relative min-h-screen bg-[#070B14] text-zinc-100 font-sans flex overflow-hidden">
      {/* ─── DESKTOP LEFT SIDEBAR ─────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-4 left-4 z-30 hidden flex-col rounded-3xl bg-[#0F1424] border border-[#1F273E] text-zinc-200 p-4 shadow-elevated transition-all duration-300 md:flex",
          collapsed ? "w-[78px]" : "w-[260px]",
        )}
      >
        <div className={cn("flex items-center gap-3 px-2 py-3", collapsed && "justify-center")}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#B71C1C] to-red-500 shadow-glow grid place-items-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="text-left">
              <span className="text-sm font-bold tracking-tight text-white block">
                TrustRoute
              </span>
              <span className="text-[10px] text-zinc-450 uppercase font-bold tracking-wider">
                Agent Terminal
              </span>
            </div>
          )}
        </div>

        <nav className="mt-8 flex-1 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition duration-200 cursor-pointer",
                  active
                    ? "text-white bg-red-950/40 border border-[#B71C1C]/40"
                    : "text-zinc-400 border border-transparent hover:bg-zinc-800/30 hover:text-zinc-200",
                )}
              >
                <item.icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0 transition",
                    active ? "text-[#FF4D4D]" : "text-zinc-500 group-hover:text-zinc-300",
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
                {active && !collapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#FF4D4D] shadow-glow" />
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleSignOut}
          className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-400 hover:bg-red-950/20 hover:text-red-400 transition cursor-pointer border border-transparent"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mt-3 flex items-center justify-center rounded-xl border border-[#2B3553] bg-zinc-900/40 py-2.5 text-zinc-400 transition hover:bg-zinc-800/40 cursor-pointer"
        >
          <ChevronLeft className={cn("h-4 w-4 transition duration-300", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* ─── MOBILE DRAWER OVERLAY SIDEBAR ──────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-[#0F1424] border-r border-[#1F273E] p-5 flex flex-col md:hidden text-zinc-200"
            >
              <div className="flex items-center justify-between pb-6 border-b border-zinc-850">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#B71C1C] to-red-500 shadow-glow grid place-items-center">
                    <ShieldCheck className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold tracking-tight text-white block">
                      TrustRoute
                    </span>
                    <span className="text-[10px] text-zinc-450 uppercase font-bold tracking-wider">
                      Agent Terminal
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-6 flex-1 space-y-1.5 overflow-y-auto">
                {navItems.map((item) => {
                  const active = item.exact ? path === item.to : path.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition cursor-pointer",
                        active
                          ? "text-white bg-red-950/40 border border-[#B71C1C]/40"
                          : "text-zinc-400 border border-transparent hover:bg-zinc-800/30",
                      )}
                    >
                      <item.icon
                        className={cn("h-4.5 w-4.5 shrink-0", active ? "text-[#FF4D4D]" : "text-zinc-500")}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <button
                onClick={handleSignOut}
                className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-zinc-400 hover:bg-red-950/20 hover:text-red-400 transition cursor-pointer"
              >
                <LogOut className="h-4.5 w-4.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── MAIN APP WRAPPER ────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 w-full",
          "md:pl-[292px]",
          collapsed && "md:pl-[110px]",
        )}
      >
        {/* Sticky top navigation bar */}
        <header className="sticky top-0 z-20 bg-[#070B14]/85 backdrop-blur-md border-b border-zinc-850 px-4 py-3 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Hamburger to open sidebar on mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-xl border border-zinc-800 bg-[#0F1424] hover:bg-zinc-850 text-zinc-400 transition cursor-pointer md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs for easy routing navigation */}
            <nav className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-450">
              {getBreadcrumbs().map((b, i) => (
                <div key={b.to} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-zinc-700">/</span>}
                  <Link
                    to={b.to}
                    className={cn(
                      "hover:text-zinc-200 transition font-medium",
                      i === getBreadcrumbs().length - 1 && "text-zinc-200 font-bold",
                    )}
                  >
                    {b.label}
                  </Link>
                </div>
              ))}
            </nav>
          </div>

          {/* Search bar inside header (responsive) */}
          <div className="hidden lg:block flex-1 max-w-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search route, deliveries, recipient..."
                className="w-full rounded-xl border border-zinc-800 bg-[#0F1424] py-2 pl-10 pr-4 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-[#B71C1C]/50 transition-all"
              />
            </div>
          </div>

          {/* User operations/menu details */}
          <div className="flex items-center gap-3.5 ml-auto">
            {/* Connection Badge */}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold transition border",
                isOnline
                  ? "bg-green-950/20 text-green-400 border-green-500/20"
                  : "bg-amber-950/20 text-amber-400 border-amber-500/20",
              )}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3 text-green-400" /> Online
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-amber-400" /> Offline Mode
                </>
              )}
            </span>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative grid h-9.5 w-9.5 place-items-center rounded-xl border border-zinc-800 bg-[#0F1424] hover:bg-zinc-850 text-zinc-400 transition cursor-pointer"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-zinc-800 bg-[#0F1424] p-4 shadow-elevated z-50 text-left"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Alert Logs ({unreadCount} new)
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-center text-xs text-zinc-500 py-6">
                          No notifications logged in your session.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              "p-2.5 rounded-xl text-xs border transition flex items-start justify-between gap-2",
                              n.read
                                ? "bg-zinc-900/30 border-zinc-850 text-zinc-500"
                                : "bg-red-950/10 border-red-950 text-zinc-200 font-medium",
                            )}
                          >
                            <div>
                              <div className="font-semibold text-zinc-200">{n.title}</div>
                              <p className="mt-0.5 text-zinc-400 text-[11px] leading-relaxed">
                                {n.message}
                              </p>
                              <span className="text-[9px] text-zinc-500 mt-1 block">
                                {new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            {!n.read && (
                              <button
                                onClick={() => markNotificationAsRead(n.id)}
                                className="shrink-0 h-5 w-5 grid place-items-center rounded bg-red-950 hover:bg-red-900 text-red-400 transition cursor-pointer"
                                title="Mark as read"
                              >
                                <Check className="h-3.5 w-3.5" />
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

            {/* Profile Initials Trigger */}
            <Link
              to="/agent/profile"
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#0F1424] hover:bg-zinc-850 px-2 py-1.5 transition"
            >
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#B71C1C] to-red-500 text-xs font-bold text-white shadow-glow shrink-0">
                {getInitials(userName)}
              </div>
              <div className="hidden sm:block text-left text-xs leading-none">
                <div className="font-semibold text-white truncate max-w-[120px]">{userName}</div>
                <div className="text-zinc-500 text-[9px] mt-0.5 max-w-[120px] truncate">{userEmail}</div>
              </div>
            </Link>
          </div>
        </header>

        {/* ─── VIEWPORT ROUTE AREA ───────────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 w-full max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
