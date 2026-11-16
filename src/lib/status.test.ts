import { describe, expect, it } from "vitest";
import {
  baseDocNo,
  canRevise,
  canTransition,
  isDeletable,
  isEditable,
  isExpired,
  revisionOf,
  STATUSES,
} from "./status";

describe("state machine", () => {
  it("allows only the documented transitions", () => {
    expect(canTransition("draft", "sent")).toBe(true);
    expect(canTransition("sent", "approved")).toBe(true);
    expect(canTransition("sent", "rejected")).toBe(true);
    expect(canTransition("sent", "expired")).toBe(true);
    expect(canTransition("sent", "superseded")).toBe(true);
  });

  it("never goes back", () => {
    expect(canTransition("approved", "draft")).toBe(false);
    expect(canTransition("rejected", "sent")).toBe(false);
    expect(canTransition("expired", "draft")).toBe(false);
    expect(canTransition("superseded", "sent")).toBe(false);
    expect(canTransition("draft", "approved")).toBe(false);
  });

  it("locks every terminal status", () => {
    for (const status of ["approved", "rejected", "expired", "superseded"] as const) {
      expect(canTransition(status, "sent")).toBe(false);
      expect(isEditable(status)).toBe(false);
      expect(isDeletable(status)).toBe(false);
    }
  });

  it("keeps draft fully editable", () => {
    expect(isEditable("draft")).toBe(true);
    expect(isDeletable("draft")).toBe(true);
    expect(canRevise("draft")).toBe(false);
    expect(canRevise("sent")).toBe(true);
  });

  it("covers every status", () => {
    expect(STATUSES).toEqual([
      "draft",
      "sent",
      "approved",
      "rejected",
      "expired",
      "superseded",
    ]);
  });
});

describe("isExpired", () => {
  it("expires after the offer validity is over", () => {
    // valid through doc_date + validity_days (inclusive)
    expect(isExpired("2026-11-02", 50, new Date(2026, 10, 2))).toBe(false);
    expect(isExpired("2026-11-02", 50, new Date(2026, 11, 22))).toBe(false); // day 50
    expect(isExpired("2026-11-02", 50, new Date(2026, 11, 23))).toBe(true); // day 51
    expect(isExpired("2026-11-02", 0, new Date(2026, 10, 3))).toBe(true);
  });
});

describe("revision helpers", () => {
  it("splits the base document number and the revision number", () => {
    expect(baseDocNo("QT69011-002")).toBe("QT69011-002");
    expect(baseDocNo("QT69011-002-R1")).toBe("QT69011-002");
    expect(revisionOf("QT69011-002")).toBe(0);
    expect(revisionOf("QT69011-002-R12")).toBe(12);
  });
});
