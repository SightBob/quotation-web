/**
 * Money handling: everything is integer satang (1 baht = 100 satang). No floats.
 */

export const SATANG_PER_BAHT = 100;

export type DiscountMode = "amount" | "percent";

export interface LineInput {
  qty: number;
  /** unit price in satang */
  unitPrice: number;
  /** discount value, interpreted per `discountMode` */
  discount?: number;
  discountMode?: DiscountMode;
}

export interface TotalsInput {
  lines: LineInput[];
  /** extra discount at bill level, in satang */
  finalDiscount?: number;
  /** vat rate in percent, e.g. 7 */
  vatRate: number;
  /** true = unit prices already include vat */
  vatInclusive?: boolean;
}

export interface Totals {
  /** sum of line amounts, before bill-level discount */
  total: number;
  /** total - finalDiscount */
  valueAmount: number;
  vat: number;
  net: number;
}

/** Parse user input ("1,234.50", "1234.5", 1234.5) into satang. */
export function toSatang(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return 0;
    return Math.round(input * SATANG_PER_BAHT);
  }
  const cleaned = input.replace(/[,\s฿]/g, "").trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * SATANG_PER_BAHT);
}

/** Format satang as "19,160.00" */
export function formatBaht(satang: number): string {
  const abs = Math.abs(satang);
  const baht = Math.trunc(abs / SATANG_PER_BAHT);
  const st = abs % SATANG_PER_BAHT;
  const neg = satang < 0 ? "-" : "";
  return `${neg}${baht.toLocaleString("en-US")}.${String(st).padStart(2, "0")}`;
}

/** Discount on one unit, in satang */
export function lineUnitDiscount(line: LineInput): number {
  if (!line.discount) return 0;
  if ((line.discountMode ?? "amount") === "percent") {
    return Math.round((line.unitPrice * line.discount) / 100);
  }
  return Math.round(line.discount);
}

/** Net unit price after discount, in satang */
export function lineUnitPrice(line: LineInput): number {
  return line.unitPrice - lineUnitDiscount(line);
}

/** Amount of one line, in satang */
export function lineAmount(line: LineInput): number {
  return Math.round(lineUnitPrice(line) * line.qty);
}

export function computeTotals(input: TotalsInput): Totals {
  const total = input.lines.reduce((sum, l) => sum + lineAmount(l), 0);
  const finalDiscount = input.finalDiscount ?? 0;
  const valueAmount = total - finalDiscount;
  const rate = input.vatRate ?? 0;
  const vat = input.vatInclusive
    ? Math.round((valueAmount * rate) / (100 + rate))
    : Math.round((valueAmount * rate) / 100);
  const net = input.vatInclusive ? valueAmount : valueAmount + vat;
  return { total, valueAmount, vat, net };
}

const DIGITS = [
  "ศูนย์",
  "หนึ่ง",
  "สอง",
  "สาม",
  "สี่",
  "ห้า",
  "หก",
  "เจ็ด",
  "แปด",
  "เก้า",
];

/** Read a number < 1,000,000 in Thai words (no "ล้าน", no "บาท"). */
function readGroup(group: number): string {
  if (group === 0) return "";
  let out = "";

  const hundredThousands = Math.floor(group / 100000);
  if (hundredThousands > 0) out += DIGITS[hundredThousands] + "แสน";

  const tenThousands = Math.floor(group / 10000) % 10;
  if (tenThousands > 0) out += DIGITS[tenThousands] + "หมื่น";

  const thousands = Math.floor(group / 1000) % 10;
  if (thousands > 0) out += DIGITS[thousands] + "พัน";

  const hundreds = Math.floor(group / 100) % 10;
  if (hundreds > 0) out += DIGITS[hundreds] + "ร้อย";

  const tens = Math.floor(group / 10) % 10;
  const units = group % 10;
  if (tens === 1) out += "สิบ";
  else if (tens === 2) out += "ยี่สิบ";
  else if (tens > 1) out += DIGITS[tens] + "สิบ";

  // "เอ็ด" when the trailing 1 follows a higher place value (11, 101, 1,001)
  const hasHigher =
    hundredThousands > 0 || tenThousands > 0 || thousands > 0 || hundreds > 0 || tens > 0;
  if (units === 1) out += hasHigher ? "เอ็ด" : "หนึ่ง";
  else if (units > 0) out += DIGITS[units];

  return out;
}

/** Read a non-negative integer (< 1e12) in Thai words, with "ล้าน" groups. */
export function thaiInteger(n: number): string {
  if (n === 0) return "ศูนย์";
  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1_000_000);
    rest = Math.floor(rest / 1_000_000);
  }
  let out = "";
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    out += readGroup(g);
    if (i > 0) out += "ล้าน";
  }
  return out;
}

/** Read 1..99 in Thai words (used for satang). */
function thaiUnder100(n: number): string {
  const tens = Math.floor(n / 10);
  const units = n % 10;
  let out = "";
  if (tens === 1) out = "สิบ";
  else if (tens === 2) out = "ยี่สิบ";
  else if (tens > 1) out = DIGITS[tens] + "สิบ";
  if (units === 1) out += tens > 0 ? "เอ็ด" : "หนึ่ง";
  else if (units > 0) out += DIGITS[units];
  return out;
}

/** Convert satang into Thai baht text, e.g. 2050120 -> "สองหมื่นห้าร้อยเอ็ดบาทยี่สิบสตางค์" */
export function bahtText(satang: number): string {
  const abs = Math.abs(Math.trunc(satang));
  const baht = Math.floor(abs / SATANG_PER_BAHT);
  const st = abs % SATANG_PER_BAHT;
  const sign = satang < 0 ? "ลบ" : "";
  const bahtPart = baht === 0 ? "ศูนย์บาท" : thaiInteger(baht) + "บาท";
  const stangPart = st === 0 ? "ถ้วน" : thaiUnder100(st) + "สตางค์";
  return `${sign}${bahtPart}${stangPart}`;
}
