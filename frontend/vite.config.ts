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
      proxy: {
        "/api/fast2sms": {
          target: "https://www.fast2sms.com/dev/bulkV2",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/fast2sms/, ""),
        },
      },
    },
  },
});
