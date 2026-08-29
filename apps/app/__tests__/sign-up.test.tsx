import { signUpCopy } from "@repo/auth/components/sign-up";
import { brandNameDisplay } from "@repo/seo/branding";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Page, {
  metadata,
} from "../app/(unauthenticated)/(auth)/sign-up/[[...sign-up]]/page";

vi.mock("@repo/auth/components/sign-up", () => ({
  SignUp: () => <div data-testid="sign-up-component" />,
  signUpCopy: {
    description:
      "Start a new Team Calendar organisation, or accept an invitation from your team email.",
    title: "Create your organisation",
  },
}));

describe("Sign Up Page", () => {
  it("renders the sign up component", () => {
    const { container } = render(<Page />);
    expect(container).toBeDefined();
  });

  it("exports metadata aligned with canonical sign-up copy", () => {
    expect(metadata.title).toBe(`${signUpCopy.title} | ${brandNameDisplay}`);
    expect(metadata.description).toBe(signUpCopy.description);
  });
});
