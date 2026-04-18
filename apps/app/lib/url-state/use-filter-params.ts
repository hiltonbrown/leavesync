import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { z } from "zod";

export function useFilterParams<T extends z.ZodTypeAny>(schema: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const data = useMemo(() => {
    const params = entriesToObject(searchParams.entries());
    const parsed = schema.safeParse(params);
    return parsed.success ? (parsed.data as z.infer<T>) : null;
  }, [searchParams, schema]);

  const setFilterParams = useCallback(
    (newParams: Partial<z.infer<T>>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));

      for (const [key, value] of Object.entries(newParams)) {
        if (value === null || value === undefined || value === "") {
          current.delete(key);
        } else if (Array.isArray(value)) {
          current.delete(key);
          for (const item of value) {
            current.append(key, String(item));
          }
        } else {
          current.set(key, String(value));
        }
      }

      router.push(`${pathname}?${current.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return [data, setFilterParams] as const;
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
