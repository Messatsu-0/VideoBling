import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8000";
const railwayPublicDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
const extraAllowedHosts = (process.env.ALLOWED_HOSTS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedHosts = [
  "localhost",
  "127.0.0.1",
  ".up.railway.app",
  ...(railwayPublicDomain ? [railwayPublicDomain] : []),
  ...extraAllowedHosts
];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    allowedHosts,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true
      }
    }
  }
});
