import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    spa: {
      enabled: true,
    },
  },
  vite: {
    base: process.env.VITE_BASE_URL || "/",
    server: {
      allowedHosts: true,
    },
  },
});
