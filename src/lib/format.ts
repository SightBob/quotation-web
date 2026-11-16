const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  // a plain "YYYY-MM-DD" is a calendar date, not an instant -> parse as local time
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (m) {
    const [, y, mo, d] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }
  return new Date(value);
}

/** Buddhist year (พ.ศ.) of a JS date */
export function buddhistYear(value: Date | string): number {
  return toDate(value).getFullYear() + 543;
}

/** "02/11/2569" (dd/mm/พ.ศ.) */
export function formatThaiDate(value: Date | string): string {
  const d = toDate(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${buddhistYear(d)}`;
}

/** "2 พ.ย. 2569" */
export function formatThaiDateLong(value: Date | string): string {
  const d = toDate(value);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${buddhistYear(d)}`;
}

/** yyyy-mm-dd for <input type="date"> */
export function toDateInputValue(value: Date | string): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** "2026-11-02" -> "02/11/2569" */
export function isoToThaiDate(iso: string): string {
  return formatThaiDate(iso);
}

/**
 * "02/11/2569" -> "2026-11-02".
 * Year rules: 4 digits >= 2400 are พ.ศ. (2569 -> 2026), otherwise ค.ศ. (2026 stays 2026).
 * 2 digits are พ.ศ. 25xx ("69" -> 2569 -> 2026).
 * Returns null when the input is not a valid date.
 */
export function thaiDateToIso(text: string): string | null {
  const cleaned = text.trim().replace(/[^\d/]/g, "");
  // 2 or 4 digit year only (3 digits would silently become the wrong year)
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(cleaned);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2500; // "69" -> พ.ศ. 2569
  if (year >= 2400) year -= 543; // พ.ศ. -> ค.ศ.

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null; // e.g. 31/02
  }
  return toDateInputValue(d);
}
