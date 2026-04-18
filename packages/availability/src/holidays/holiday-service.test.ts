// vi.mock calls are hoisted to the top by Vitest's transformer.
// We must mock all @repo/database paths before any static imports.
import { vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@repo/database/generated/enums", () => ({}));
vi.mock("@repo/database/generated/client", () => ({}));
vi.mock("@repo/database", () => ({
  database: {
    publicHoliday: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    publicHolidayJurisdiction: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  // scopedQuery must always return an object so spread works; use mockImplementation
  // rather than mockReturnValue so it survives vi.clearAllMocks (which only clears calls).
  scopedQuery: vi.fn().mockImplementation(() => ({})),
}));

import type { ClerkOrgId, OrganisationId } from "@repo/core";
import { database } from "@repo/database";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addCustomHoliday,
  deleteCustomHoliday,
  restoreHoliday,
  suppressHoliday,
} from "./holiday-service";

describe("holiday-service", () => {
  const mockClerkOrgId = "org_123" as ClerkOrgId;
  const mockOrgId = "123e4567-e89b-12d3-a456-426614174000" as OrganisationId;
  const mockUserId = "user_123";

  beforeEach(() => {
    // Reset call history without clearing mock implementations.
    vi.clearAllMocks();
  });

  describe("addCustomHoliday", () => {
    it("should create a custom holiday when it does not exist", async () => {
      vi.mocked(database.publicHoliday.findFirst).mockResolvedValue(null);
      vi.mocked(database.publicHoliday.create).mockResolvedValue({
        id: "holiday_123",
      } as never);

      const result = await addCustomHoliday({
        clerkOrgId: mockClerkOrgId,
        organisationId: mockOrgId,
        jurisdictionId: null,
        name: "Test Holiday",
        date: new Date("2024-12-25"),
        recursAnnually: false,
        appliesToAllJurisdictions: true,
        userId: mockUserId,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe("holiday_123");
      }
      expect(database.publicHoliday.create).toHaveBeenCalled();
    });

    it("should return conflict error if holiday already exists", async () => {
      vi.mocked(database.publicHoliday.findFirst).mockResolvedValue({
        id: "existing_id",
      } as never);

      const result = await addCustomHoliday({
        clerkOrgId: mockClerkOrgId,
        organisationId: mockOrgId,
        jurisdictionId: null,
        name: "Test Holiday",
        date: new Date("2024-12-25"),
        recursAnnually: false,
        appliesToAllJurisdictions: true,
        userId: mockUserId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("CONFLICT");
      }
    });
  });

  describe("suppressHoliday", () => {
    it("should archive the holiday", async () => {
      vi.mocked(database.publicHoliday.findFirst).mockResolvedValue({
        id: "holiday_123",
      } as never);
      vi.mocked(database.publicHoliday.update).mockResolvedValue({
        id: "holiday_123",
      } as never);

      const result = await suppressHoliday(
        mockClerkOrgId,
        mockOrgId,
        "holiday_123",
        mockUserId
      );

      expect(result.ok).toBe(true);
      expect(database.publicHoliday.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ archived_at: expect.any(Date) }),
        })
      );
    });

    it("should return not found if holiday does not exist", async () => {
      vi.mocked(database.publicHoliday.findFirst).mockResolvedValue(null);

      const result = await suppressHoliday(
        mockClerkOrgId,
        mockOrgId,
        "holiday_123",
        mockUserId
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("restoreHoliday", () => {
    it("should un-archive the holiday", async () => {
      vi.mocked(database.publicHoliday.findFirst).mockResolvedValue({
        id: "holiday_123",
      } as never);
      vi.mocked(database.publicHoliday.update).mockResolvedValue({
        id: "holiday_123",
      } as never);

      const result = await restoreHoliday(
        mockClerkOrgId,
        mockOrgId,
        "holiday_123",
        mockUserId
      );

      expect(result.ok).toBe(true);
      expect(database.publicHoliday.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ archived_at: null }),
        })
      );
    });
  });

  describe("deleteCustomHoliday", () => {
    it("should delete a manual holiday", async () => {
      vi.mocked(database.publicHoliday.findFirst).mockResolvedValue({
        id: "holiday_123",
        source: "manual",
      } as never);

      const result = await deleteCustomHoliday(
        mockClerkOrgId,
        mockOrgId,
        "holiday_123"
      );

      expect(result.ok).toBe(true);
      expect(database.publicHoliday.delete).toHaveBeenCalledWith({
        where: { id: "holiday_123" },
      });
    });

    it("should reject deleting a nager-imported holiday", async () => {
      vi.mocked(database.publicHoliday.findFirst).mockResolvedValue({
        id: "holiday_123",
        source: "nager",
      } as never);

      const result = await deleteCustomHoliday(
        mockClerkOrgId,
        mockOrgId,
        "holiday_123"
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
      expect(database.publicHoliday.delete).not.toHaveBeenCalled();
    });
  });
});
