import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { connectionViewSelect } from "./_connection-view";

const forbiddenConnectionFields = [
  "access_token_encrypted",
  "access_token_iv",
  "access_token_auth_tag",
  "refresh_token_encrypted",
  "refresh_token_iv",
  "refresh_token_auth_tag",
  "token_key_version",
  "token_encrypted_at",
];

describe("connectionViewSelect", () => {
  it("excludes encrypted token fields", () => {
    for (const field of forbiddenConnectionFields) {
      expect(connectionViewSelect).not.toHaveProperty(field);
    }
  });

  it("uses an explicit field allowlist", () => {
    expect(
      Object.values(connectionViewSelect).every((value) => value === true)
    ).toBe(true);
  });
});
