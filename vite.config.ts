import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://server.body-simulator.com",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        bodyShapeCalculator: "body-shape-calculator/index.html",
        macroCalculator: "macro-calculator/index.html",
      },
    },
  },
});
