import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FetchErrorState } from "./fetch-error-state";

describe("FetchErrorState", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders with entity name", () => {
    render(<FetchErrorState entityName="people" />);

    expect(screen.getByText("Unable to load people")).toBeDefined();
    expect(
      screen.getByText("Try again or contact support if the issue continues.")
    ).toBeDefined();
  });

  it("renders with retry slot", () => {
    render(
      <FetchErrorState
        entityName="people"
        retrySlot={<button type="button">Try again</button>}
      />
    );

    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
  });
});
