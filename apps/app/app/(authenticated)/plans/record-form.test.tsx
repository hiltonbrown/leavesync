import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecordForm } from "./record-form";

const mocks = vi.hoisted(() => ({
  createRecordAction: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  updateRecordAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("./_actions", () => ({
  createRecordAction: (input: unknown) => mocks.createRecordAction(input),
  updateRecordAction: (input: unknown) => mocks.updateRecordAction(input),
}));

class ResizeObserverMock {
  disconnect() {
    // No-op: the form does not react to resize callbacks in this test.
  }
  observe() {
    // No-op: the form does not react to resize callbacks in this test.
  }
  unobserve() {
    // No-op: the form does not react to resize callbacks in this test.
  }
}

globalThis.ResizeObserver = ResizeObserverMock;

const renderForm = () =>
  render(
    <RecordForm
      balanceAvailable={null}
      canSelectPerson
      closeHref="/plans"
      hasActiveXeroConnection={false}
      mode="create"
      organisationId="00000000-0000-4000-8000-000000000001"
      people={[
        {
          email: "alex@example.com",
          id: "00000000-0000-4000-8000-000000000002",
          label: "Alex Morgan",
        },
      ]}
    />
  );

describe("RecordForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("associates visible labels with the core controls", () => {
    renderForm();

    expect(screen.getByRole("radiogroup", { name: "Intent" })).toBeDefined();
    expect(screen.getByLabelText("Person")).toBeDefined();
    expect(screen.getByLabelText("Leave type")).toBeDefined();
    expect(screen.getByLabelText("Starts")).toBeDefined();
    expect(screen.getByLabelText("Ends")).toBeDefined();
    expect(screen.getByLabelText("Contactability")).toBeDefined();
    expect(screen.getByLabelText("Privacy")).toBeDefined();
    expect(screen.getByLabelText("Notes")).toBeDefined();
  });

  it("focuses an announced error summary and preserves entered values", async () => {
    const { container } = renderForm();
    const notes = screen.getByLabelText("Notes") as HTMLTextAreaElement;
    fireEvent.change(notes, { target: { value: "Keep this note" } });

    const form = container.querySelector("form");
    if (!form) {
      throw new Error("Expected the record form to render.");
    }
    fireEvent.submit(form);

    const alert = await screen.findByRole("alert");
    expect(document.activeElement).toBe(alert);
    expect(notes.value).toBe("Keep this note");
  });
});
