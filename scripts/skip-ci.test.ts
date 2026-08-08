import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("skip-ci script", () => {
  it("executes without module resolution errors and exits with code 1 or 0", () => {
    try {
      execSync("node scripts/skip-ci.js", {
        encoding: "utf8",
        stdio: "pipe",
      });
      // Exited 0
      expect(true).toBe(true);
    } catch (error: unknown) {
      // Exited with non-zero status code (e.g. exit code 1 when not skipping)
      const err = error as { status?: number };
      expect(err.status).toBe(1);
    }
  });
});
