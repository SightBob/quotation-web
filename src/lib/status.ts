import { z } from "zod";

export const STATUSES = [
  "draft",
  "sent",
  "approved",
  "rejected",
  "expired",
  "superseded",
] as const;

export type Status = (typeof STATUSES)[number];

export const statusSchema = z.enum(STATUSES);

export const STATUS_LABEL: Record<Status, string> = {
  draft: "ร่าง",
  sent: "ส่งแล้ว",
  approved: "อนุมัติ",
  rejected: "ปฏิเสธ",
  expired: "หมดอายุ",
  superseded: "ถูกแทนที่",
};

/** allowed status transitions (no going back) */
export const TRANSITIONS: Record<Status, Status[]> = {
  draft: ["sent"],
  sent: ["approved", "rejected", "expired", "superseded"],
  approved: [],
  rejected: [],
  expired: [],
  superseded: [],
};

/** content of a document may only be edited while it is a draft */
export function isEditable(status: Status): boolean {
  return status === "draft";
}

/** only drafts can be deleted */
export function isDeletable(status: Status): boolean {
  return status === "draft";
}

/** a new revision can be created from a document that was already sent */
export function canRevise(status: Status): boolean {
  return status === "sent";
}

export function canTransition(from: Status, to: Status): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

/** a document is expired once the offer validity (doc_date + validity_days) has passed */
export function isExpired(docDate: string, validityDays: number, now = new Date()): boolean {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(docDate);
  if (!d) return false;
  const base = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]));
  const end = new Date(base);
  end.setDate(end.getDate() + (validityDays || 0));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today > end;
}

/** "QT69011-002-R1" -> "QT69011-002" */
export function baseDocNo(docNo: string): string {
  return docNo.replace(/-R\d+$/, "");
}

/** "QT69011-002" -> 0, "QT69011-002-R2" -> 2 */
export function revisionOf(docNo: string): number {
  const m = /-R(\d+)$/.exec(docNo);
  return m ? Number(m[1]) : 0;
}
