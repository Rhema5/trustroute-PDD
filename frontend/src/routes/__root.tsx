import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { AlertTriangle, ArrowLeft, RefreshCcw, ShieldCheck } from "lucide-react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070B14] px-6 text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.15),transparent_35%)]" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20">
          <ShieldCheck className="h-10 w-10 text-cyan-400" />
        </div>

        <h1 className="mt-6 text-7xl font-extrabold tracking-tight text-white">404</h1>

        <h2 className="mt-4 text-2xl font-semibold">Route Not Found</h2>

        <p className="mt-3 text-sm leading-relaxed text-white/60">
          The requested page does not exist inside the TrustRoute secure network.
        </p>

        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:scale-[1.03]"
          >
            <ArrowLeft className="h-4 w-4" />
            Return Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);

  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070B14] px-6 text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.15),transparent_35%)]" />

      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </div>

        <h1 className="mt-6 text-center text-3xl font-bold tracking-tight">System Error</h1>

        <p className="mt-4 text-center text-sm leading-relaxed text-white/60">
          Something unexpected interrupted the TrustRoute platform. Please retry the operation or
          return to the dashboard.
        </p>

        {/* Error Box */}
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="font-mono text-xs text-red-300">
            {(() => {
              const msg = error.message || "";
              if (
                msg.includes("permission-denied") ||
                msg.toLowerCase().includes("permission denied")
              ) {
                return "Access Denied: You do not have permission to view or modify this resource.";
              }
              if (
                msg.includes("unauthenticated") ||
                msg.toLowerCase().includes("not authenticated")
              ) {
                return "Authentication required. Please sign in.";
              }
              return "An unexpected error occurred. Please try again later.";
            })()}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:scale-[1.03]"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
          </button>

          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },

      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },

      {
        title: "TrustRoute — Secure Logistics Verification Platform",
      },

      {
        name: "description",
        content:
          "Enterprise-grade delivery verification SaaS with GPS validation, OTP confirmation, proof-of-delivery capture, and audit-ready logistics tracking.",
      },

      {
        name: "theme-color",
        content: "#070B14",
      },

      {
        property: "og:title",
        content: "TrustRoute — Secure Logistics Verification Platform",
      },

      {
        property: "og:description",
        content: "Modern logistics verification infrastructure for enterprise operations.",
      },

      {
        property: "og:type",
        content: "website",
      },

      {
        property: "og:site_name",
        content: "TrustRoute",
      },

      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],

    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },

      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },

      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },

      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@350;400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap",
      },

      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>

      <body className="min-h-screen bg-white font-['Plus_Jakarta_Sans'] antialiased text-gray-900">
        {/* Animated Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-red-200/40 blur-3xl" />

          <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-100/60 blur-3xl" />

          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        {children}

        <Scripts />
      </body>
    </html>
  );
}

import { useApp } from "@/store/app-store";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const initializeAuth = useApp((s) => s.initializeAuth);
  const authLoading = useApp((s) => s.authLoading);
  const triggerAutoSync = useApp((s) => s.triggerAutoSync);

  React.useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, [initializeAuth]);

  React.useEffect(() => {
    const handleOnline = () => {
      triggerAutoSync();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [triggerAutoSync]);

  if (authLoading) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#070B14] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-xs text-muted-foreground">Initializing security protocol...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-right" />
      <Outlet />
    </QueryClientProvider>
  );
}
