import type { AlternativeContactSnapshot } from "@repo/availability";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlternativeContactsPanel } from "./alternative-contacts-panel";

const mocks = vi.hoisted(() => ({
  reorderAction: vi.fn(),
}));

vi.mock("@/app/(authenticated)/people/_actions", () => ({
  addAlternativeContactAction: vi.fn(),
  deleteAlternativeContactAction: vi.fn(),
  reorderAlternativeContactsAction: (args: unknown) =>
    mocks.reorderAction(args),
  updateAlternativeContactAction: vi.fn(),
}));

const mockContacts: AlternativeContactSnapshot[] = [
  {
    displayOrder: 0,
    email: "alice@example.com",
    id: "contact-1",
    name: "Alice Smith",
    notes: null,
    phone: null,
    role: "Lead",
  },
  {
    displayOrder: 1,
    email: "bob@example.com",
    id: "contact-2",
    name: "Bob Jones",
    notes: null,
    phone: null,
    role: "Backup",
  },
];

describe("AlternativeContactsPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("rows are not announced as buttons and have listitem role", () => {
    render(
      <AlternativeContactsPanel
        canManage={true}
        contacts={mockContacts}
        organisationId="org-1"
        personId="person-1"
      />
    );

    const listitems = screen.getAllByRole("listitem");
    expect(listitems).toHaveLength(2);
    expect(
      screen.queryAllByRole("button", { name: "Alice Smith" })
    ).toHaveLength(0);
  });

  it("first/last move controls are unavailable in the invalid direction", () => {
    render(
      <AlternativeContactsPanel
        canManage={true}
        contacts={mockContacts}
        organisationId="org-1"
        personId="person-1"
      />
    );

    const moveAliceUp = screen.getByRole("button", {
      name: "Move Alice Smith up",
    }) as HTMLButtonElement;
    const moveAliceDown = screen.getByRole("button", {
      name: "Move Alice Smith down",
    }) as HTMLButtonElement;
    const moveBobUp = screen.getByRole("button", {
      name: "Move Bob Jones up",
    }) as HTMLButtonElement;
    const moveBobDown = screen.getByRole("button", {
      name: "Move Bob Jones down",
    }) as HTMLButtonElement;

    expect(moveAliceUp.disabled).toBe(true);
    expect(moveAliceDown.disabled).toBe(false);

    expect(moveBobUp.disabled).toBe(false);
    expect(moveBobDown.disabled).toBe(true);
  });

  it("activating Move down invokes existing mutation path with full orderedContactIds array and announces position", async () => {
    mocks.reorderAction.mockResolvedValueOnce({ ok: true, data: null });

    render(
      <AlternativeContactsPanel
        canManage={true}
        contacts={mockContacts}
        organisationId="org-1"
        personId="person-1"
      />
    );

    const moveAliceDown = screen.getByRole("button", {
      name: "Move Alice Smith down",
    });
    fireEvent.click(moveAliceDown);

    expect(mocks.reorderAction).toHaveBeenCalledWith({
      orderedContactIds: ["contact-2", "contact-1"],
      organisationId: "org-1",
      personId: "person-1",
    });

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain(
        "Alice Smith moved to position 2"
      );
    });
  });

  it("disables reorder controls while pending and announces failure without changing order", async () => {
    let resolveReorder: (val: unknown) => void = () => undefined;
    mocks.reorderAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReorder = resolve;
        })
    );

    render(
      <AlternativeContactsPanel
        canManage={true}
        contacts={mockContacts}
        organisationId="org-1"
        personId="person-1"
      />
    );

    const moveAliceDown = screen.getByRole("button", {
      name: "Move Alice Smith down",
    }) as HTMLButtonElement;
    fireEvent.click(moveAliceDown);

    expect(moveAliceDown.disabled).toBe(true);

    resolveReorder({ ok: false, error: { message: "Server error" } });

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain(
        "Order was not changed"
      );
      expect(screen.getByText("Server error")).toBeDefined();
    });
  });
});
