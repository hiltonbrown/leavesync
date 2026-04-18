import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PermissionDeniedState } from "./permission-denied-state";

describe("PermissionDeniedState", () => {
  it("renders correctly", () => {
    render(<PermissionDeniedState />);

    expect(screen.getByText("Permission Denied")).toBeDefined();
    expect(
      screen.getByText("You do not have permission to view this page.")
    ).toBeDefined();

    const link = screen.getByRole("link", { name: "Go to Dashboard" });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/");
  });
});
