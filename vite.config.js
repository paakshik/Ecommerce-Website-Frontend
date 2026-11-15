import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/tests/setup.js",
    // Unit tests only: pick up *.test.js / *.spec.js under src/, never the
    // Playwright E2E specs under e2e/.
    include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    exclude: ["**/e2e/**", "**/node_modules/**"],
  },
});
