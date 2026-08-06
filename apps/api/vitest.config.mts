import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
      "@repo": path.resolve(import.meta.dirname, "../../packages"),
      "server-only": path.resolve(
        import.meta.dirname,
        "../../node_modules/.bun/server-only@0.0.1/node_modules/server-only/empty.js"
      ),
    },
  },
  test: {
    environment: "jsdom",
  },
});
