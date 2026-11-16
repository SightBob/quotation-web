import { describe, expect, it } from "vitest";
import {
  bahtText,
  computeTotals,
  formatBaht,
  lineAmount,
  lineUnitPrice,
  toSatang,
} from "./money";

describe("toSatang", () => {
  it("parses strings and numbers", () => {
    expect(toSatang("1,234.50")).toBe(123450);
    expect(toSatang("690")).toBe(69000);
    expect(toSatang(690)).toBe(69000);
    expect(toSatang("")).toBe(0);
    expect(toSatang("abc")).toBe(0);
    expect(toSatang("฿1,000.00")).toBe(100000);
  });
});

describe("formatBaht", () => {
  it("formats with thousands separator and 2 decimals", () => {
    expect(formatBaht(1916000)).toBe("19,160.00");
    expect(formatBaht(2050120)).toBe("20,501.20");
    expect(formatBaht(0)).toBe("0.00");
    expect(formatBaht(-500)).toBe("-5.00");
  });
});

describe("line amount", () => {
  it("amount = unit price * qty", () => {
    expect(lineAmount({ qty: 1, unitPrice: 69000 })).toBe(69000);
    expect(lineAmount({ qty: 2, unitPrice: 39000 })).toBe(78000);
    expect(lineAmount({ qty: 40, unitPrice: 3000 })).toBe(120000);
  });

  it("supports amount and percent discount", () => {
    expect(lineUnitPrice({ qty: 1, unitPrice: 10000, discount: 500 })).toBe(9500);
    expect(
      lineUnitPrice({
        qty: 1,
        unitPrice: 10000,
        discount: 10,
        discountMode: "percent",
      }),
    ).toBe(9000);
    expect(
      lineAmount({ qty: 2, unitPrice: 10000, discount: 10, discountMode: "percent" }),
    ).toBe(18000);
  });
});

describe("computeTotals", () => {
  const lines = [
    { qty: 1, unitPrice: 69000 },
    { qty: 1, unitPrice: 95000 },
    { qty: 2, unitPrice: 39000 },
    { qty: 2, unitPrice: 49000 },
    { qty: 1, unitPrice: 350000 },
    { qty: 2, unitPrice: 185000 },
    { qty: 1, unitPrice: 155000 },
    { qty: 1, unitPrice: 92000 },
    { qty: 4, unitPrice: 38000 },
    { qty: 1, unitPrice: 62000 },
    { qty: 1, unitPrice: 62000 },
    { qty: 1, unitPrice: 68000 },
    { qty: 10, unitPrice: 14500 },
    { qty: 40, unitPrice: 3000 },
  ];

  it("matches the sample document totals", () => {
    const t = computeTotals({ lines, vatRate: 7 });
    expect(t.total).toBe(1916000);
    expect(t.valueAmount).toBe(1916000);
    expect(t.vat).toBe(134120);
    expect(t.net).toBe(2050120);
    expect(formatBaht(t.net)).toBe("20,501.20");
  });

  it("supports vat-inclusive pricing", () => {
    const t = computeTotals({
      lines: [{ qty: 1, unitPrice: 107000 }],
      vatRate: 7,
      vatInclusive: true,
    });
    expect(t.vat).toBe(7000);
    expect(t.net).toBe(107000);
  });

  it("applies bill-level discount before vat", () => {
    const t = computeTotals({
      lines: [{ qty: 1, unitPrice: 100000 }],
      finalDiscount: 10000,
      vatRate: 7,
    });
    expect(t.total).toBe(100000);
    expect(t.valueAmount).toBe(90000);
    expect(t.vat).toBe(6300);
    expect(t.net).toBe(96300);
  });
});

describe("bahtText", () => {
  const cases: Array<[number, string]> = [
    [0, "ศูนย์บาทถ้วน"],
    [100, "หนึ่งบาทถ้วน"],
    [1100, "สิบเอ็ดบาทถ้วน"],
    [2100, "ยี่สิบเอ็ดบาทถ้วน"],
    [10100, "หนึ่งร้อยเอ็ดบาทถ้วน"],
    [100000000, "หนึ่งล้านบาทถ้วน"],
    [2050120, "สองหมื่นห้าร้อยเอ็ดบาทยี่สิบสตางค์"],
  ];

  it.each(cases)("bahtText(%i)", (satang, expected) => {
    expect(bahtText(satang)).toBe(expected);
  });

  it("handles satang only", () => {
    expect(bahtText(1)).toBe("ศูนย์บาทหนึ่งสตางค์");
    expect(bahtText(11)).toBe("ศูนย์บาทสิบเอ็ดสตางค์");
    expect(bahtText(25)).toBe("ศูนย์บาทยี่สิบห้าสตางค์");
  });

  it("handles millions and negatives", () => {
    expect(bahtText(1100000000)).toBe("สิบเอ็ดล้านบาทถ้วน");
    expect(bahtText(2000000100)).toBe("ยี่สิบล้านหนึ่งบาทถ้วน");
    expect(bahtText(110000000)).toBe("หนึ่งล้านหนึ่งแสนบาทถ้วน");
    expect(bahtText(-100)).toBe("ลบหนึ่งบาทถ้วน");
  });
});
