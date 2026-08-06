import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch {
  // .env file is optional; ignore if absent
}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
  migrations: {
    path: "prisma/migrations",
  },
  schema: "prisma/schema.prisma",
});
