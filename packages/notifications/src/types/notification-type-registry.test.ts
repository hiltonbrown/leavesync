import { notification_type as notificationTypes } from "@repo/database/generated/enums";
import { describe, expect, it } from "vitest";
import {
  emailTemplateForType,
  getDefaultChannels,
  getTypeConfig,
  listAllTypes,
} from "./notification-type-registry";

describe("notification-type-registry", () => {
  it("has a registry entry for every enum value", () => {
    const registered = new Set(listAllTypes().map((config) => config.type));

    expect(registered).toEqual(new Set(Object.values(notificationTypes)));
  });

  it("returns documented defaults and templates", () => {
    expect(getDefaultChannels("leave_submitted")).toEqual({
      inApp: true,
      email: true,
    });
    expect(getDefaultChannels("leave_withdrawn")).toEqual({
      inApp: true,
      email: false,
    });
    expect(emailTemplateForType("leave_submitted")).toBe("LeaveSubmitted");
    expect(emailTemplateForType("leave_withdrawn")).toBeNull();
  });

  it("keeps category ordering stable", () => {
    expect(listAllTypes().map((config) => config.userFacingCategory)).toEqual([
      "leave_lifecycle",
      "leave_lifecycle",
      "leave_lifecycle",
      "leave_lifecycle",
      "approval_flow",
      "approval_flow",
      "sync",
      "sync",
      "system",
      "system",
    ]);
  });

  it("returns a fallback config without throwing", () => {
    expect(getTypeConfig("leave_approved").label).toBe("Leave approved");
  });
});
