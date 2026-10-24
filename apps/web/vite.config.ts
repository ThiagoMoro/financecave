import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Em dev, o front encaminha /api para a API local (em produção, a Vercel faz isso).
    proxy: {
      "/api": "http://localhost:3333",
    },
  },
});
