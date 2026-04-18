import { describe, expect, it, vi } from "vitest";
import { PermissionDeniedError, requirePageRole } from "./require-page-role";

const mockRequireRole = vi.fn();

vi.mock("@repo/auth/helpers", () => ({
  requireRole: (role: string) => mockRequireRole(role),
}));

describe("requirePageRole", () => {
  it("resolves if user has role", async () => {
    mockRequireRole.mockResolvedValue(true);
    await expect(requirePageRole("org:admin")).resolves.toBeUndefined();
  });

  it("throws PermissionDeniedError if user lacks role", async () => {
    mockRequireRole.mockResolvedValue(false);
    await expect(requirePageRole("org:admin")).rejects.toThrow(
      PermissionDeniedError
    );
  });
});
