import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  completeXeroOAuth: vi.fn(),
  isPreviewDeployment: vi.fn(),
}));

vi.mock("@repo/xero", () => ({
  completeXeroOAuth: mocks.completeXeroOAuth,
  isPreviewDeployment: mocks.isPreviewDeployment,
}));

const { GET } = await import("./route");

describe("Xero OAuth callback route", () => {
  const callbackUrl =
    "https://api.example.com/api/xero/oauth/callback?code=code&state=state";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPreviewDeployment.mockReturnValue(false);
    mocks.completeXeroOAuth.mockResolvedValue({
      ok: true,
      value: {
        redirectTo: "/settings/integrations/xero/connect?session=session_1",
        sessionId: "session_1",
      },
    });
  });

  it("rejects a missing nonce cookie without exchanging the code", async () => {
    mocks.completeXeroOAuth.mockResolvedValue({
      ok: false,
      error: { code: "invalid_state", message: "The Xero OAuth state was invalid." },
    });
    const response = await GET(new Request(callbackUrl));

    expect(response.status).toBe(400);
    expect(mocks.completeXeroOAuth).toHaveBeenCalledWith({
      code: "code",
      nonce: null,
      state: "state",
    });
  });

  it("passes the nonce cookie to the OAuth service", async () => {
    const response = await GET(
      new Request(callbackUrl, {
        headers: { cookie: "xero_oauth_nonce=matching-nonce" },
      })
    );

    expect(response.status).toBe(307);
    expect(mocks.completeXeroOAuth).toHaveBeenCalledWith({
      code: "code",
      nonce: "matching-nonce",
      state: "state",
    });
    expect(response.headers.get("set-cookie")).toContain("xero_oauth_nonce=;");
  });

  it("returns the service error for a mismatched nonce", async () => {
    mocks.completeXeroOAuth.mockResolvedValue({
      ok: false,
      error: { code: "invalid_state", message: "The Xero OAuth state was invalid." },
    });

    const response = await GET(
      new Request(callbackUrl, {
        headers: { cookie: "xero_oauth_nonce=mismatched-nonce" },
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.completeXeroOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: "mismatched-nonce" })
    );
  });

  it("rejects preview callbacks before reading callback parameters", async () => {
    mocks.isPreviewDeployment.mockReturnValue(true);

    const response = await GET(new Request(callbackUrl));

    expect(response.status).toBe(403);
    expect(mocks.completeXeroOAuth).not.toHaveBeenCalled();
  });
});
