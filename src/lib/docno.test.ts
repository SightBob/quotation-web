import { describe, expect, it } from "vitest";
import { DEFAULT_DOC_NO_PATTERN, docNoPrefix, formatDocNo } from "./docno";

const date = new Date("2026-11-02");

describe("formatDocNo", () => {
  it("matches the original document number", () => {
    expect(formatDocNo(DEFAULT_DOC_NO_PATTERN, date, 2)).toBe("QT69011-002");
  });

  it("pads month to 3 digits", () => {
    expect(formatDocNo(DEFAULT_DOC_NO_PATTERN, new Date("2026-01-05"), 1)).toBe("QT69001-001");
    expect(formatDocNo(DEFAULT_DOC_NO_PATTERN, new Date("2026-12-05"), 1)).toBe("QT69012-001");
  });

  it("supports custom widths and tokens", () => {
    expect(formatDocNo("Q{YY}{MM}{DD}-{SEQ4}", date, 12)).toBe("Q6901102-0012");
    expect(formatDocNo("QT-{SEQ}", date, 7)).toBe("QT-007");
  });
});

describe("docNoPrefix", () => {
  it("groups the counter per year+month", () => {
    expect(docNoPrefix(DEFAULT_DOC_NO_PATTERN, date)).toBe("QT69011");
    expect(docNoPrefix(DEFAULT_DOC_NO_PATTERN, new Date("2026-12-31"))).toBe("QT69012");
  });
});
