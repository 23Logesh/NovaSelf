import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Plain static-site Vite config (no SSR, no server, no Nitro).
// `vite build` produces a fully static dist/ folder that can be deployed
// as-is to GitHub Pages or Vercel's static hosting (no Functions/Edge).
//
// If you deploy to GitHub Pages as a PROJECT site (e.g.
// https://<user>.github.io/NovaSelf/), set BASE_PATH="/NovaSelf/" when
// building, e.g.: BASE_PATH=/NovaSelf/ npm run build
// If you deploy to Vercel, or GitHub Pages as a USER/ORG root site, leave it
// as "/" (the default).
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: "dist",
  },
});