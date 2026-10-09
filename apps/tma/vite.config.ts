import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    // let ngrok (and any tunnel) reach the dev server — Vite 8 blocks unknown hosts
    allowedHosts: true,
  },
});
