import { buddhistYear, toDate } from "./format";

/**
 * Document number pattern, e.g. "QT{YY}{MM}-{SEQ}" -> "QT69011-002"
 * Tokens:
 *   {YY}   buddhist year, 2 digits        69
 *   {MM}   month, 3 digits (zero padded)  011
 *   {DD}   day, 2 digits                  02
 *   {SEQ}  sequence, 3 digits              002
 *   {SEQ4} sequence, 4 digits              0002
 */
export const DEFAULT_DOC_NO_PATTERN = "QT{YY}{MM}-{SEQ}";

const TOKEN = /\{(YY|MM|DD|SEQ\d*)\}/g;

export function formatDocNo(pattern: string, date: Date | string, seq: number): string {
  const d = toDate(date);
  const yy = String(buddhistYear(d) % 100).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(3, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return pattern.replace(TOKEN, (_m, token: string) => {
    if (token === "YY") return yy;
    if (token === "MM") return mm;
    if (token === "DD") return dd;
    const width = token === "SEQ" ? 3 : Number(token.slice(3));
    return String(seq).padStart(width, "0");
  });
}

/**
 * The part of the number that groups the sequence counter.
 * "QT{YY}{MM}-{SEQ}" -> "QT69011" (year+month buckets share one counter)
 */
export function docNoPrefix(pattern: string, date: Date | string): string {
  return formatDocNo(pattern, date, 0).replace(/[-]?0+$/, "");
}

/** Preview of the next number, e.g. "QT69011-001" */
export function previewDocNo(pattern: string, date: Date | string, nextSeq: number): string {
  return formatDocNo(pattern, date, nextSeq);
}
