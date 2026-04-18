import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders with description only", () => {
    render(<EmptyState description="No items found." />);

    expect(screen.getByText("No items found.")).toBeDefined();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders with title and action slot", () => {
    render(
      <EmptyState
        actionSlot={<button type="button">Create Item</button>}
        description="No items found."
        title="Items"
      />
    );

    expect(screen.getByText("Items")).toBeDefined();
    expect(screen.getByText("No items found.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Create Item" })).toBeDefined();
  });
});
