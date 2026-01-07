import { defineConfig } from "vite";

export default defineConfig({
  server: {
    allowedHosts: [
      "scenarios-shipments-harper-del.trycloudflare.com",
    ],
  },
});
