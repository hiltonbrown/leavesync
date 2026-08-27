import { log } from "@repo/observability/log";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST, parseOrigin } from "./route";

vi.mock("@repo/observability/log", () => ({
  log: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("parseOrigin", () => {
  it("extracts origin from absolute URLs and removes paths, query params, and fragments", () => {
    expect(
      parseOrigin(
        "https://sub.domain.com:8080/nested/path/page.html?token=secret123&user=456#heading-1"
      )
    ).toBe("https://sub.domain.com:8080");
  });

  it("handles relative paths as self", () => {
    expect(parseOrigin("/api/sensitive-route?query=param#frag")).toBe("self");
    expect(parseOrigin("self")).toBe("self");
    expect(parseOrigin("'self'")).toBe("self");
  });

  it("handles inline, eval, and wasm keywords", () => {
    expect(parseOrigin("inline")).toBe("inline");
    expect(parseOrigin("'unsafe-inline'")).toBe("inline");
    expect(parseOrigin("eval")).toBe("eval");
    expect(parseOrigin("'unsafe-eval'")).toBe("eval");
    expect(parseOrigin("wasm-eval")).toBe("wasm-eval");
  });

  it("handles data: and about: schemes", () => {
    expect(parseOrigin("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA")).toBe(
      "data:"
    );
    expect(parseOrigin("about:blank")).toBe("about:");
  });

  it("handles blob: URLs by extracting inner origin", () => {
    expect(
      parseOrigin(
        "blob:https://app.teamcalendar.com/d94e320f-07e1-4560-bf8c-1e67e3dfd3aa"
      )
    ).toBe("https://app.teamcalendar.com");
  });

  it("returns undefined for invalid or malicious inputs", () => {
    expect(parseOrigin("")).toBeUndefined();
    expect(parseOrigin("   ")).toBeUndefined();
    expect(parseOrigin(null)).toBeUndefined();
    expect(parseOrigin(undefined)).toBeUndefined();
    expect(parseOrigin(12_345)).toBeUndefined();
    expect(parseOrigin("javascript:alert(1)")).toBeUndefined();
  });
});

describe("POST /api/csp-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts legacy CSP report with application/csp-report and returns 204", async () => {
    const reportPayload = {
      "csp-report": {
        "blocked-uri": "https://malicious-cdn.com/evil.js?token=leaked",
        "column-number": 42,
        disposition: "report",
        "document-uri":
          "https://app.teamcalendar.com/calendar?session=secret#details",
        "effective-directive": "script-src-elem",
        "line-number": 105,
        "original-policy": "default-src 'self'; script-src 'self'",
        "source-file": "https://app.teamcalendar.com/main.js?version=1.2.3",
        "status-code": 200,
      },
    };

    const request = new Request("http://localhost:3000/api/csp-report", {
      body: JSON.stringify(reportPayload),
      headers: {
        "content-type": "application/csp-report",
      },
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(204);
    expect(log.warn).toHaveBeenCalledTimes(1);

    const loggedContext = vi.mocked(log.warn).mock.calls[0][1] as Record<
      string,
      unknown
    >;

    expect(loggedContext).toEqual({
      blockedOrigin: "https://malicious-cdn.com",
      columnNumber: 42,
      disposition: "report",
      documentOrigin: "https://app.teamcalendar.com",
      effectiveDirective: "script-src-elem",
      lineNumber: 105,
      sourceOrigin: "https://app.teamcalendar.com",
      statusCode: 200,
    });

    // Ensure no sensitive fields leak
    const loggedJson = JSON.stringify(loggedContext);
    expect(loggedJson).not.toContain("token=leaked");
    expect(loggedJson).not.toContain("session=secret");
    expect(loggedJson).not.toContain("original-policy");
    expect(loggedJson).not.toContain("calendar?session");
  });

  it("accepts Reporting API v1 array with application/reports+json and returns 204", async () => {
    const reportList = [
      {
        age: 10,
        body: {
          blockedURL: "inline",
          columnNumber: 15,
          disposition: "report",
          documentURL: "https://app.teamcalendar.com/dashboard",
          effectiveDirective: "script-src",
          lineNumber: 2,
          originalPolicy: "script-src 'self'",
          sample: "console.log('secret')",
          statusCode: 200,
        },
        type: "csp-violation",
        url: "https://app.teamcalendar.com/dashboard",
      },
    ];

    const request = new Request("http://localhost:3000/api/csp-report", {
      body: JSON.stringify(reportList),
      headers: {
        "content-type": "application/reports+json",
      },
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(204);
    expect(log.warn).toHaveBeenCalledTimes(1);

    const loggedContext = vi.mocked(log.warn).mock.calls[0][1] as Record<
      string,
      unknown
    >;

    expect(loggedContext).toEqual({
      blockedOrigin: "inline",
      columnNumber: 15,
      disposition: "report",
      documentOrigin: "https://app.teamcalendar.com",
      effectiveDirective: "script-src",
      lineNumber: 2,
      statusCode: 200,
    });
    expect(JSON.stringify(loggedContext)).not.toContain("console.log");
  });

  it("returns 413 when content-length exceeds 16 KiB", async () => {
    const request = new Request("http://localhost:3000/api/csp-report", {
      body: "{}",
      headers: {
        "content-length": "16385",
        "content-type": "application/csp-report",
      },
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("returns 413 when body payload exceeds 16 KiB without header", async () => {
    const hugePadding = "a".repeat(17 * 1024);
    const request = new Request("http://localhost:3000/api/csp-report", {
      body: JSON.stringify({ huge: hugePadding }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("safely discards malformed JSON with 204", async () => {
    const request = new Request("http://localhost:3000/api/csp-report", {
      body: "not valid json {{{",
      headers: {
        "content-type": "application/csp-report",
      },
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(204);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("safely discards unsupported content-type with 204", async () => {
    const request = new Request("http://localhost:3000/api/csp-report", {
      body: JSON.stringify({ test: "data" }),
      headers: {
        "content-type": "text/html",
      },
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(204);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("safely discards empty or unrelated JSON with 204", async () => {
    const request = new Request("http://localhost:3000/api/csp-report", {
      body: JSON.stringify({ otherEvent: "something_else" }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(204);
    expect(log.warn).not.toHaveBeenCalled();
  });
});
