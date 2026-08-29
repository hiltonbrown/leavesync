import { signInCopy } from "@repo/auth/components/sign-in";
import { brandNameDisplay } from "@repo/seo/branding";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Page, {
  metadata,
} from "../app/(unauthenticated)/(auth)/sign-in/[[...sign-in]]/page";

vi.mock("@repo/auth/components/sign-in", () => ({
  SignIn: () => <div data-testid="sign-in-component" />,
  signInCopy: {
    description:
      "Sign in to manage leave and availability for your organisation.",
    title: "Welcome back",
  },
}));

describe("Sign In Page", () => {
  it("renders the sign in component", () => {
    const { container } = render(<Page />);
    expect(container).toBeDefined();
  });

  it("exports metadata aligned with canonical sign-in copy", () => {
    expect(metadata.title).toBe(`${signInCopy.title} | ${brandNameDisplay}`);
    expect(metadata.description).toBe(signInCopy.description);
  });
});
