import "server-only";

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "../generated/client";
import { keys } from "../keys";

declare global {
  var __leavesyncDatabase: PrismaClient | undefined;
}

neonConfig.webSocketConstructor = ws;

const createDatabaseClient = (): PrismaClient => {
  const adapter = new PrismaNeon({ connectionString: keys().DATABASE_URL });

  return new PrismaClient({ adapter });
};

export const database =
  globalThis.__leavesyncDatabase ?? createDatabaseClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__leavesyncDatabase = database;
}

export type Database = PrismaClient;
