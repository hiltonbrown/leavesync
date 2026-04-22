import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement, type HTMLAttributes, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupportClient } from "./support-client";

const SYNC_ISSUE_BUTTON_NAME = /i have a sync issue/i;
const SUGGEST_OR_REPORT_BUTTON_NAME = /suggest or report/i;
const TALK_TO_A_HUMAN_BUTTON_NAME = /talk to a human/i;

const mocks = vi.hoisted(() => ({
  getPublicApiUrl: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
  useSearchParams: mocks.useSearchParams,
}));

vi.mock("@/lib/public-api-url", () => ({
  getPublicApiUrl: mocks.getPublicApiUrl,
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) =>
      createElement("div", props, children),
  },
}));

describe("SupportClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    mocks.getPublicApiUrl.mockReturnValue(
      "https://api.leavesync.test/api/support/github-issue"
    );
    mocks.usePathname.mockReturnValue("/support");
    mocks.useSearchParams.mockReturnValue(
      new URLSearchParams("org=00000000-0000-4000-8000-000000000001")
    );
    window.history.replaceState(
      {},
      "",
      "/support?org=00000000-0000-4000-8000-000000000001"
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the real form from the sync issue entry and submits support with the current page URL", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          issueNumber: 123,
          issueUrl: "https://github.com/hiltonbrown/leavesync/issues/123",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    render(<SupportClient />);

    fireEvent.click(
      screen.getByRole("button", { name: SYNC_ISSUE_BUTTON_NAME })
    );

    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Missing leave entry" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: {
        value: "The approved leave entry is missing from the calendar.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await screen.findByText("Your message has been sent to support.");
    fireEvent.click(
      screen.getByRole("button", { name: "Send another message" })
    );
    expect((screen.getByLabelText("Subject") as HTMLInputElement).value).toBe(
      ""
    );
    expect(
      (screen.getByLabelText("Message") as HTMLTextAreaElement).value
    ).toBe("");

    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body));

    expect(url).toBe("https://api.leavesync.test/api/support/github-issue");
    expect(body).toMatchObject({
      category: "support",
      message: "The approved leave entry is missing from the calendar.",
      priority: "normal",
      subject: "Missing leave entry",
    });
    expect(new URL(body.page_url).pathname).toBe("/support");
    expect(new URL(body.page_url).searchParams.get("org")).toBe(
      "00000000-0000-4000-8000-000000000001"
    );
  });

  it("disables duplicate submission while the request is pending", async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => undefined));

    render(<SupportClient />);

    fireEvent.click(
      screen.getByRole("button", { name: TALK_TO_A_HUMAN_BUTTON_NAME })
    );
    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Need help" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Please help with a sync issue." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Sending..." });
      expect((button as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it("shows a client-side validation error before calling the API", async () => {
    render(<SupportClient />);

    fireEvent.click(
      screen.getByRole("button", { name: TALK_TO_A_HUMAN_BUTTON_NAME })
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await screen.findByText("Subject is required.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows a generic error when the API origin cannot be resolved", async () => {
    mocks.getPublicApiUrl.mockReturnValue(null);

    render(<SupportClient />);

    fireEvent.click(
      screen.getByRole("button", { name: TALK_TO_A_HUMAN_BUTTON_NAME })
    );
    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Need help" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Please help with a sync issue." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await screen.findByText(
      "We could not submit your request right now. Please try again."
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows API validation errors without replacing them with the generic failure message", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          code: "validation_error",
          message: "Message is required.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    render(<SupportClient />);

    fireEvent.click(
      screen.getByRole("button", { name: SUGGEST_OR_REPORT_BUTTON_NAME })
    );
    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Clarify save feedback" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "This flow could be clearer." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await screen.findByText("Message is required.");
    expect(
      screen.queryByText(
        "We could not submit your request right now. Please try again."
      )
    ).toBeNull();
  });

  it("shows a generic error and preserves fields when submission fails", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          code: "integration_error",
          message: "GitHub issue creation failed.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    render(<SupportClient />);

    fireEvent.click(
      screen.getByRole("button", { name: SUGGEST_OR_REPORT_BUTTON_NAME })
    );
    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Clarify save feedback" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "This flow could be clearer." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await screen.findByText(
      "We could not submit your request right now. Please try again."
    );

    expect(screen.getByDisplayValue("Clarify save feedback")).toBeDefined();
    expect(
      screen.getByDisplayValue("This flow could be clearer.")
    ).toBeDefined();
    expect(screen.queryByText("GitHub issue creation failed.")).toBeNull();
  });
});
