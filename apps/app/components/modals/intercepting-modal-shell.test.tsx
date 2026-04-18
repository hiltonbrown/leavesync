import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InterceptingModalShell } from "./intercepting-modal-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
  }),
}));

describe("InterceptingModalShell", () => {
  it("renders children and title", async () => {
    render(
      <InterceptingModalShell title="Test Title">
        <p>Modal Content</p>
      </InterceptingModalShell>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Title")).toBeDefined();
      expect(screen.getByText("Modal Content")).toBeDefined();
    });
  });
});
