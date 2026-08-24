import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException }));
vi.mock("./log", () => ({ log: { error: mocks.logError } }));

const { parseError } = await import("./error");

describe("parseError", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the display message and captures the original exception", () => {
    const error = new Error("Display message");
    expect(parseError(error)).toBe("Display message");
    expect(mocks.captureException).toHaveBeenCalledWith(error);
  });

  it("logs a fixed message with the structured error", () => {
    const error = new Error("Runtime detail");
    parseError(error);
    expect(mocks.logError).toHaveBeenCalledWith("Parsing error", { error });
  });

  it("uses a fixed fallback message without the reporting exception", () => {
    const reportingError = new Error("Reporting failure");
    mocks.captureException.mockImplementationOnce(() => {
      throw reportingError;
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    expect(parseError(new Error("Display message"))).toBe("Display message");
    expect(consoleError).toHaveBeenCalledWith("Error reporting parsing error");
    expect(consoleError.mock.calls.flat()).not.toContain(reportingError);
    consoleError.mockRestore();
  });
});
