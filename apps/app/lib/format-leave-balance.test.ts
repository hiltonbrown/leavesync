import { describe, expect, it } from "vitest";
import { formatLeaveBalance } from "./format-leave-balance";

const INVALID_CURRENCY_ERROR = /Invalid or unsupported currency code/;

describe("formatLeaveBalance", () => {
  describe("days unit", () => {
    it.each([
      { amount: 1, expected: "1 day" },
      { amount: 5, expected: "5 days" },
      { amount: 0, expected: "0 days" },
      { amount: -1, expected: "-1 days" },
      { amount: -2, expected: "-2 days" },
      { amount: 1.5, expected: "1.5 days" },
      { amount: 1234, expected: "1,234 days" },
    ])("formats $amount days as '$expected'", ({ amount, expected }) => {
      expect(formatLeaveBalance({ amount, unit: "days" })).toBe(expected);
    });
  });

  describe("hours unit", () => {
    it.each([
      { amount: 1, expected: "1 hour" },
      { amount: 7.5, expected: "7.5 hours" },
      { amount: 0, expected: "0 hours" },
      { amount: -1, expected: "-1 hours" },
      { amount: -40, expected: "-40 hours" },
      { amount: 40, expected: "40 hours" },
      { amount: 1000, expected: "1,000 hours" },
    ])("formats $amount hours as '$expected'", ({ amount, expected }) => {
      expect(formatLeaveBalance({ amount, unit: "hours" })).toBe(expected);
    });
  });

  describe("NZD currency", () => {
    it.each([
      { amount: 1234.5, currencyCode: "NZD", expected: "$1,234.50" },
      { amount: 0, currencyCode: "NZD", expected: "$0.00" },
      { amount: -50, currencyCode: "NZD", expected: "-$50.00" },
      { amount: 1.5, currencyCode: "NZD", expected: "$1.50" },
      { amount: 1, currencyCode: "NZD", expected: "$1.00" },
    ])(
      "formats $amount $currencyCode as '$expected'",
      ({ amount, currencyCode, expected }) => {
        expect(
          formatLeaveBalance({ amount, currencyCode, unit: "currency" })
        ).toBe(expected);
      }
    );
  });

  describe("null, undefined, and untyped units", () => {
    it("returns null for null or undefined amount", () => {
      expect(formatLeaveBalance({ amount: null, unit: "days" })).toBeNull();
      expect(
        formatLeaveBalance({ amount: undefined, unit: "hours" })
      ).toBeNull();
    });

    it.each([
      { amount: 10, expected: "10" },
      { amount: 0, expected: "0" },
      { amount: -5, expected: "-5" },
      { amount: 1234.5, expected: "1,234.5" },
    ])(
      "formats $amount with null unit as '$expected'",
      ({ amount, expected }) => {
        expect(formatLeaveBalance({ amount, unit: null })).toBe(expected);
        expect(formatLeaveBalance({ amount, unit: undefined })).toBe(expected);
        expect(formatLeaveBalance({ amount })).toBe(expected);
      }
    );

    it("formats custom unit string", () => {
      expect(formatLeaveBalance({ amount: 3, unit: "shifts" })).toBe(
        "3 shifts"
      );
    });
  });

  describe("invalid or missing currency codes", () => {
    it.each([
      { currencyCode: null, label: "null" },
      { currencyCode: undefined, label: "undefined" },
      { currencyCode: "", label: "empty string" },
      { currencyCode: "USD", label: "unsupported USD" },
      { currencyCode: "EUR", label: "unsupported EUR" },
      { currencyCode: "invalid", label: "invalid string" },
    ])(
      "throws an error for currency unit with $label code",
      ({ currencyCode }) => {
        expect(() =>
          formatLeaveBalance({
            amount: 100,
            currencyCode,
            unit: "currency",
          })
        ).toThrowError(INVALID_CURRENCY_ERROR);
      }
    );
  });
});
