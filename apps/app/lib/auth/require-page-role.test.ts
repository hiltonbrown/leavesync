import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionDeniedError, requirePageRole } from "./require-page-role";

const mockRequireRole = vi.fn();

vi.mock("@repo/auth/helpers", () => ({
  requireRole: (role: string) => mockRequireRole(role),
}));

// Model a signed-in user holding exactly one role. requirePageRole asks about
// every role at or above the one it needs, so a role-aware mock is what makes
// the hierarchy observable. A mock that returns the same answer for every role
// cannot distinguish "walks up the hierarchy" from "walks down it".
function signedInAs(role: string) {
  mockRequireRole.mockImplementation((asked: string) =>
    Promise.resolve(asked === role)
  );
}

describe("requirePageRole", () => {
  beforeEach(() => {
    mockRequireRole.mockReset();
  });

  it("allows a user whose role is exactly the required role", async () => {
    signedInAs("org:admin");
    await expect(requirePageRole("org:admin")).resolves.toBeUndefined();
  });

  it("allows a user whose role is above the required role", async () => {
    signedInAs("org:owner");
    await expect(requirePageRole("org:manager")).resolves.toBeUndefined();
  });

  it("denies a user whose role is below the required role", async () => {
    signedInAs("org:admin");
    await expect(requirePageRole("org:owner")).rejects.toThrow(
      PermissionDeniedError
    );
  });

  it("denies a viewer everywhere above viewer", async () => {
    signedInAs("org:viewer");
    await expect(requirePageRole("org:manager")).rejects.toThrow(
      PermissionDeniedError
    );
  });

  it("asks only about roles at or above the required one", async () => {
    signedInAs("org:owner");
    await requirePageRole("org:admin");
    const asked = mockRequireRole.mock.calls.map(([role]) => role);
    expect(asked).toEqual(["org:admin", "org:owner"]);
  });

  it("fails closed for an unrecognised required role", async () => {
    signedInAs("org:owner");
    await expect(requirePageRole("org:superuser")).rejects.toThrow(
      PermissionDeniedError
    );
  });
});
