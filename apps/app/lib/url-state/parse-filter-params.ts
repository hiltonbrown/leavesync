import type { z } from "zod";

export function parseFilterParams<T extends z.ZodTypeAny>(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams,
  schema: T
): z.infer<T> | null {
  let paramsToParse: Record<string, unknown> = {};

  if (searchParams instanceof URLSearchParams) {
    paramsToParse = entriesToObject(searchParams.entries());
  } else {
    paramsToParse = searchParams;
  }

  const parsed = schema.safeParse(paramsToParse);

  if (parsed.success) {
    return parsed.data;
  }

  return null;
}

function entriesToObject(
  entries: IterableIterator<[string, string]>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      result[key] = [...existing, value];
    } else {
      result[key] = [existing, value];
    }
  }
  return result;
}
