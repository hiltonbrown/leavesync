import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { useFilterParams } from "./use-filter-params";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/test",
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams("?q=search&page=1"),
}));

describe("useFilterParams", () => {
  it("parses valid params", () => {
    const schema = z.object({
      page: z.coerce.number().optional(),
      q: z.string().optional(),
    });

    const { result } = renderHook(() => useFilterParams(schema));

    expect(result.current[0]).toEqual({ page: 1, q: "search" });
  });

  it("sets params correctly", () => {
    const schema = z.object({
      page: z.coerce.number().optional(),
      q: z.string().optional(),
    });

    const { result } = renderHook(() => useFilterParams(schema));

    act(() => {
      result.current[1]({ page: 2 });
    });

    expect(pushMock).toHaveBeenCalledWith("/test?q=search&page=2");
  });
});
