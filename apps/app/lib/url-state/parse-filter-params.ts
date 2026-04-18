import type { z } from "zod";

export function parseFilterParams<T extends z.ZodTypeAny>(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams,
  schema: T
): z.infer<T> | null {
  let paramsToParse: Record<string, unknown> = {};

  if (searchParams instanceof URLSearchParams) {
    paramsToParse = Object.fromEntries(searchParams.entries());
  } else {
    paramsToParse = searchParams;
  }

  const parsed = schema.safeParse(paramsToParse);

  if (parsed.success) {
    return parsed.data;
  }

  return null;
}
