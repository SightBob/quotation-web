import { describe, expect, it } from "vitest";
import {
  buddhistYear,
  formatThaiDate,
  formatThaiDateLong,
  isoToThaiDate,
  thaiDateToIso,
  toDateInputValue,
} from "./format";

describe("formatThaiDate", () => {
  it("shows the buddhist year", () => {
    expect(formatThaiDate("2026-11-02")).toBe("02/11/2569");
    expect(formatThaiDate(new Date(2026, 10, 2))).toBe("02/11/2569");
    expect(formatThaiDate("2026-01-05")).toBe("05/01/2569");
  });

  it("treats a plain date string as a local calendar date (no timezone shift)", () => {
    // a UTC parse would show 01/11 in a negative-offset timezone
    expect(formatThaiDate("2026-11-02")).toBe("02/11/2569");
    expect(toDateInputValue("2026-11-02")).toBe("2026-11-02");
  });

  it("formats long form and buddhist year", () => {
    expect(formatThaiDateLong("2026-11-02")).toBe("2 พ.ย. 2569");
    expect(buddhistYear("2026-11-02")).toBe(2569);
    expect(isoToThaiDate("2026-11-02")).toBe("02/11/2569");
  });
});

describe("thaiDateToIso", () => {
  it("parses พ.ศ. dates", () => {
    expect(thaiDateToIso("02/11/2569")).toBe("2026-11-02");
    expect(thaiDateToIso("2/1/2569")).toBe("2026-01-02");
    expect(thaiDateToIso("05/12/2569")).toBe("2026-12-05");
  });

  it("keeps a ค.ศ. year as is", () => {
    expect(thaiDateToIso("02/11/2026")).toBe("2026-11-02");
  });

  it("treats a 2 digit year as พ.ศ. 25xx", () => {
    expect(thaiDateToIso("02/11/69")).toBe("2026-11-02");
  });

  it("rejects invalid dates", () => {
    expect(thaiDateToIso("31/02/2569")).toBeNull();
    expect(thaiDateToIso("02/13/2569")).toBeNull();
    expect(thaiDateToIso("abc")).toBeNull();
    expect(thaiDateToIso("")).toBeNull();
  });
});
