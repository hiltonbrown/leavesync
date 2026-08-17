import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InterceptingModalShell } from "./intercepting-modal-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
  }),
}));

describe("InterceptingModalShell", () => {
  afterEach(() => cleanup());

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

  it("prevents dismissal while close is disabled", async () => {
    const onClose = vi.fn();

    render(
      <InterceptingModalShell
        closeDisabled={true}
        onClose={onClose}
        title="Pending action"
      >
        <p>Saving</p>
      </InterceptingModalShell>
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Pending action",
    });
    expect(dialog.getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();

    fireEvent.keyDown(document, { code: "Escape", key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Pending action" })
    ).toBeDefined();
  });

  it("uses the shared close control when dismissal is enabled", async () => {
    const onClose = vi.fn();

    render(
      <InterceptingModalShell onClose={onClose} title="Ready action">
        <p>Ready</p>
      </InterceptingModalShell>
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Close",
      })
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
