import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { z } from "zod";

export function useFilterParams<T extends z.ZodTypeAny>(schema: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const data = useMemo(() => {
    const params = Object.fromEntries(searchParams.entries());
    const parsed = schema.safeParse(params);
    return parsed.success ? (parsed.data as z.infer<T>) : null;
  }, [searchParams, schema]);

  const setFilterParams = useCallback(
    (newParams: Partial<z.infer<T>>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));

      for (const [key, value] of Object.entries(newParams)) {
        if (value === null || value === undefined || value === "") {
          current.delete(key);
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
