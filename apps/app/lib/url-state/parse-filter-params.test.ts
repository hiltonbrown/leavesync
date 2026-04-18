import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseFilterParams } from "./parse-filter-params";

describe("parseFilterParams", () => {
  it("parses valid record", () => {
    const schema = z.object({
      q: z.string().optional(),
      page: z.coerce.number().optional(),
    });

    const result = parseFilterParams({ q: "test", page: "1" }, schema);
    expect(result).toEqual({ q: "test", page: 1 });
  });

  it("parses URLSearchParams", () => {
    const schema = z.object({
      q: z.string().optional(),
      page: z.coerce.number().optional(),
    });

    const params = new URLSearchParams("?q=test&page=1");
    const result = parseFilterParams(params, schema);
    expect(result).toEqual({ q: "test", page: 1 });
  });

  it("returns null on validation failure", () => {
    const schema = z.object({
      page: z.coerce.number(), // required
    });

    const result = parseFilterParams({ q: "test" }, schema);
    expect(result).toBeNull();
  });
});
