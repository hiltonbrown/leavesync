import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionDeniedError, requirePageRole } from "./require-page-role";

vi.mock("server-only", () => ({}));

const mockHas = vi.fn();

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const mockedAuth = vi.mocked(auth);

// Model a signed-in user holding exactly one role. requirePageRole asks about
// every role at or above the one it needs, so a role-aware mock is what makes
// the hierarchy observable. A mock that returns the same answer for every role
// cannot distinguish "walks up the hierarchy" from "walks down it".
function signedInAs(role: string) {
  mockHas.mockImplementation((asked: { role: string }) =>
    Promise.resolve(asked.role === role)
  );
  mockedAuth.mockResolvedValue({
    has: mockHas,
    isAuthenticated: true,
    orgId: "org_1",
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

describe("requirePageRole", () => {
  beforeEach(() => {
    mockHas.mockReset();
    mockedAuth.mockReset();
    // Default to unauthenticated until signedInAs is called
    mockedAuth.mockResolvedValue({
      has: mockHas,
      isAuthenticated: false,
      orgId: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
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
    const asked = mockHas.mock.calls.map(
      ([arg]) => (arg as { role: string }).role
    );
    expect(asked).toEqual(["org:admin", "org:owner"]);
  });

  it("fails closed for an unrecognised required role", async () => {
    signedInAs("org:owner");
    await expect(requirePageRole("org:superuser")).rejects.toThrow(
      PermissionDeniedError
    );
  });
});
