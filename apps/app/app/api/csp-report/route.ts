import { log } from "@repo/observability/log";
import { sanitizeObject } from "@repo/observability/scrubber";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_BODY_SIZE_BYTES = 16 * 1024; // 16 KiB

const numericField = z
  .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
  .optional();

const LegacyCspReportInnerSchema = z
  .object({
    blocked_uri: z.string().optional(),
    "blocked-uri": z.string().optional(),
    blockedURL: z.string().optional(),
    blockedUri: z.string().optional(),
    column_number: numericField,
    "column-number": numericField,
    columnNumber: numericField,
    disposition: z.string().optional(),
    document_uri: z.string().optional(),
    "document-uri": z.string().optional(),
    documentURL: z.string().optional(),
    documentUri: z.string().optional(),
    effective_directive: z.string().optional(),
    "effective-directive": z.string().optional(),
    effectiveDirective: z.string().optional(),
    line_number: numericField,
    "line-number": numericField,
    lineNumber: numericField,
    source_file: z.string().optional(),
    "source-file": z.string().optional(),
    sourceFile: z.string().optional(),
    status_code: numericField,
    "status-code": numericField,
    statusCode: numericField,
    "violated-directive": z.string().optional(),
  })
  .passthrough();

const LegacyCspReportSchema = z.object({
  "csp-report": LegacyCspReportInnerSchema,
});

const ReportingApiBodySchema = z
  .object({
    blocked_url: z.string().optional(),
    "blocked-uri": z.string().optional(),
    blockedURL: z.string().optional(),
    column_number: numericField,
    "column-number": numericField,
    columnNumber: numericField,
    disposition: z.string().optional(),
    document_url: z.string().optional(),
    "document-uri": z.string().optional(),
    documentURL: z.string().optional(),
    effective_directive: z.string().optional(),
    "effective-directive": z.string().optional(),
    effectiveDirective: z.string().optional(),
    line_number: numericField,
    "line-number": numericField,
    lineNumber: numericField,
    source_file: z.string().optional(),
    "source-file": z.string().optional(),
    sourceFile: z.string().optional(),
    status_code: numericField,
    "status-code": numericField,
    statusCode: numericField,
  })
  .passthrough();

const ReportingApiItemSchema = z
  .object({
    body: ReportingApiBodySchema.optional(),
    type: z.string().optional(),
    url: z.string().optional(),
  })
  .passthrough();

const ReportingApiListSchema = z.array(ReportingApiItemSchema);

export interface ScrubbedCspViolation {
  blockedOrigin?: string;
  columnNumber?: number;
  disposition?: string;
  documentOrigin?: string;
  effectiveDirective?: string;
  lineNumber?: number;
  sourceOrigin?: string;
  statusCode?: number;
}

function parseSpecialKeyword(lower: string): string | undefined {
  if (lower === "self" || lower === "'self'") {
    return "self";
  }
  if (
    lower === "inline" ||
    lower === "'inline'" ||
    lower === "'unsafe-inline'"
  ) {
    return "inline";
  }
  if (lower === "eval" || lower === "'eval'" || lower === "'unsafe-eval'") {
    return "eval";
  }
  if (lower === "wasm-eval" || lower === "'wasm-unsafe-eval'") {
    return "wasm-eval";
  }
  if (lower.startsWith("data:")) {
    return "data:";
  }
  if (lower.startsWith("about:")) {
    return "about:";
  }
}

function parseUrlOrigin(trimmed: string): string | undefined {
  if (trimmed.startsWith("/")) {
    return "self";
  }
  if (trimmed.toLowerCase().startsWith("blob:")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.origin && parsed.origin !== "null") {
        return parsed.origin;
      }
    } catch {
      // Ignore
    }
    return "blob:";
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.origin && parsed.origin !== "null") {
      return parsed.origin;
    }
  } catch {
    try {
      if (
        !(
          trimmed.includes("/") ||
          trimmed.includes("?") ||
          trimmed.includes("#") ||
          trimmed.includes("@")
        )
      ) {
        const parsedWithProtocol = new URL(`https://${trimmed}`);
        if (parsedWithProtocol.origin && parsedWithProtocol.origin !== "null") {
          return parsedWithProtocol.origin;
        }
      }
    } catch {
      // Ignore
    }
  }
}

export function parseOrigin(rawUri: unknown): string | undefined {
  if (typeof rawUri !== "string") {
    return;
  }
  const trimmed = rawUri.trim();
  if (!trimmed) {
    return;
  }

  const special = parseSpecialKeyword(trimmed.toLowerCase());
  if (special) {
    return special;
  }

  return parseUrlOrigin(trimmed);
}

interface RawViolationInput {
  blockedUri?: string;
  columnNumber?: number;
  disposition?: string;
  documentUri?: string;
  effectiveDirective?: string;
  lineNumber?: number;
  sourceFile?: string;
  statusCode?: number;
}

function normalizeViolation(
  raw: RawViolationInput
): ScrubbedCspViolation | null {
  const effectiveDirective = raw.effectiveDirective?.trim();
  const disposition = raw.disposition?.trim();
  const statusCode =
    typeof raw.statusCode === "number" && !Number.isNaN(raw.statusCode)
      ? raw.statusCode
      : undefined;
  const lineNumber =
    typeof raw.lineNumber === "number" && !Number.isNaN(raw.lineNumber)
      ? raw.lineNumber
      : undefined;
  const columnNumber =
    typeof raw.columnNumber === "number" && !Number.isNaN(raw.columnNumber)
      ? raw.columnNumber
      : undefined;

  const documentOrigin = parseOrigin(raw.documentUri);
  const blockedOrigin = parseOrigin(raw.blockedUri);
  const sourceOrigin = parseOrigin(raw.sourceFile);

  if (
    !(effectiveDirective || disposition) &&
    statusCode === undefined &&
    lineNumber === undefined &&
    columnNumber === undefined &&
    !documentOrigin &&
    !blockedOrigin &&
    !sourceOrigin
  ) {
    return null;
  }

  const result: ScrubbedCspViolation = {};
  if (effectiveDirective) {
    result.effectiveDirective = effectiveDirective;
  }
  if (disposition) {
    result.disposition = disposition;
  }
  if (statusCode !== undefined) {
    result.statusCode = statusCode;
  }
  if (lineNumber !== undefined) {
    result.lineNumber = lineNumber;
  }
  if (columnNumber !== undefined) {
    result.columnNumber = columnNumber;
  }
  if (documentOrigin) {
    result.documentOrigin = documentOrigin;
  }
  if (blockedOrigin) {
    result.blockedOrigin = blockedOrigin;
  }
  if (sourceOrigin) {
    result.sourceOrigin = sourceOrigin;
  }

  return result;
}

function extractLegacyViolations(parsed: unknown): ScrubbedCspViolation[] {
  const legacyResult = LegacyCspReportSchema.safeParse(parsed);
  if (!legacyResult.success) {
    return [];
  }
  const report = legacyResult.data["csp-report"];
  const violation = normalizeViolation({
    blockedUri:
      report["blocked-uri"] ??
      report.blockedURL ??
      report.blockedUri ??
      report.blocked_uri,
    columnNumber:
      report["column-number"] ?? report.columnNumber ?? report.column_number,
    disposition: report.disposition,
    documentUri:
      report["document-uri"] ??
      report.documentURL ??
      report.documentUri ??
      report.document_uri,
    effectiveDirective:
      report["effective-directive"] ??
      report.effectiveDirective ??
      report.effective_directive ??
      report["violated-directive"],
    lineNumber:
      report["line-number"] ?? report.lineNumber ?? report.line_number,
    sourceFile:
      report["source-file"] ?? report.sourceFile ?? report.source_file,
    statusCode:
      report["status-code"] ?? report.statusCode ?? report.status_code,
  });
  return violation ? [violation] : [];
}

function extractReportingApiViolations(
  parsed: unknown
): ScrubbedCspViolation[] {
  const listResult = ReportingApiListSchema.safeParse(
    Array.isArray(parsed) ? parsed : [parsed]
  );
  if (!listResult.success) {
    return [];
  }

  const results: ScrubbedCspViolation[] = [];
  for (const item of listResult.data) {
    const { body, url } = item;
    if (!body) {
      continue;
    }
    const violation = normalizeViolation({
      blockedUri: body["blocked-uri"] ?? body.blockedURL ?? body.blocked_url,
      columnNumber:
        body["column-number"] ?? body.columnNumber ?? body.column_number,
      disposition: body.disposition,
      documentUri:
        body["document-uri"] ?? body.documentURL ?? body.document_url ?? url,
      effectiveDirective:
        body["effective-directive"] ??
        body.effectiveDirective ??
        body.effective_directive,
      lineNumber: body["line-number"] ?? body.lineNumber ?? body.line_number,
      sourceFile: body["source-file"] ?? body.sourceFile ?? body.source_file,
      statusCode: body["status-code"] ?? body.statusCode ?? body.status_code,
    });
    if (violation) {
      results.push(violation);
    }
  }
  return results;
}

function isSupportedContentType(contentTypeHeader: string | null): boolean {
  const contentType = contentTypeHeader?.toLowerCase() ?? "";
  return (
    contentType.includes("application/csp-report") ||
    contentType.includes("application/reports+json") ||
    contentType.includes("application/json")
  );
}

export async function POST(request: Request): Promise<Response> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (!Number.isNaN(contentLength) && contentLength > MAX_BODY_SIZE_BYTES) {
      return new Response(null, { status: 413 });
    }
  }

  let rawText = "";
  try {
    rawText = await request.text();
  } catch {
    return new Response(null, { status: 204 });
  }

  const byteLength = new TextEncoder().encode(rawText).length;
  if (byteLength > MAX_BODY_SIZE_BYTES) {
    return new Response(null, { status: 413 });
  }

  if (
    !(
      isSupportedContentType(request.headers.get("content-type")) &&
      rawText.trim()
    )
  ) {
    return new Response(null, { status: 204 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return new Response(null, { status: 204 });
  }

  const legacyViolations = extractLegacyViolations(parsed);
  const violations =
    legacyViolations.length > 0
      ? legacyViolations
      : extractReportingApiViolations(parsed);

  for (const violation of violations) {
    const scrubbed = sanitizeObject(
      violation as unknown as Record<string, unknown>
    );
    log.warn("CSP violation report", scrubbed);
  }

  return new Response(null, { status: 204 });
}
