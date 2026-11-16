import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "./index";
import {
  companySettings,
  customers,
  docCounters,
  products,
  quotationAuditLogs,
  quotationItems,
  quotations,
} from "./schema";
import type { QuotationPayload } from "@/lib/api";
import { DEFAULT_DOC_NO_PATTERN, docNoPrefix, formatDocNo } from "@/lib/docno";
import { assetUrl } from "@/lib/storage";
import {
  baseDocNo,
  canTransition,
  isDeletable,
  isEditable,
  isExpired,
  isStatus,
  revisionOf,
  type Status,
} from "@/lib/status";
import type { CompanyInfo, QuotationDoc } from "@/lib/types";

export interface Actor {
  id: string;
  email?: string | null;
}

/** thrown when the document is locked or the status transition is not allowed */
export class StatusError extends Error {
  constructor(
    message: string,
    readonly code: "locked" | "invalid_transition" = "locked",
  ) {
    super(message);
  }
}

export async function getCompanySettings(): Promise<CompanyInfo> {
  const db = getDb();
  const row = await db.query.companySettings.findFirst({ where: eq(companySettings.id, 1) });
  if (!row) {
    throw new Error("company_settings row is missing (run supabase-seed.sql)");
  }
  return {
    nameEn: row.nameEn,
    nameTh: row.nameTh,
    address: row.address,
    phone: row.phone,
    taxId: row.taxId,
    branch: row.branch,
    logoUrl: assetUrl(row.logoPath),
    signatureUrl: assetUrl(row.signaturePath),
    primaryColor: row.primaryColor,
  };
}

export async function getDocNoSettings(): Promise<{ pattern: string }> {
  const db = getDb();
  const row = await db.query.companySettings.findFirst({
    where: eq(companySettings.id, 1),
    columns: { docNoPattern: true },
  });
  return { pattern: row?.docNoPattern ?? DEFAULT_DOC_NO_PATTERN };
}

/** Allocate the next document number atomically (counter row per year+month prefix) */
export async function allocateDocNo(
  tx: { execute: (query: SQL) => Promise<unknown> },
  pattern: string,
  docDate: string,
): Promise<string> {
  const prefix = docNoPrefix(pattern, docDate);
  const result = (await tx.execute(
    sql`
      insert into doc_counters (prefix, last_seq)
      values (${prefix}, 1)
      on conflict (prefix)
      do update set last_seq = doc_counters.last_seq + 1, updated_at = now()
      returning last_seq
    `,
  )) as { rows?: { last_seq: number }[] } | { last_seq: number }[];
  // drizzle returns the pg Result object ({ rows: [...] }) for raw SQL
  const rows = Array.isArray(result) ? result : (result.rows ?? []);
  const seq = Number(rows[0]?.last_seq ?? 1);
  return formatDocNo(pattern, docDate, seq);
}

/** next document number without consuming it */
export async function peekNextDocNo(pattern: string, docDate: string): Promise<string> {
  const db = getDb();
  const prefix = docNoPrefix(pattern, docDate);
  const rows = await db
    .select({ lastSeq: docCounters.lastSeq })
    .from(docCounters)
    .where(eq(docCounters.prefix, prefix))
    .limit(1);
  return formatDocNo(pattern, docDate, (rows[0]?.lastSeq ?? 0) + 1);
}

export interface QuotationWithItems {
  quotation: typeof quotations.$inferSelect;
  items: (typeof quotationItems.$inferSelect)[];
}

/* ------------------------------------------------------------------ */
/* audit log                                                          */
/* ------------------------------------------------------------------ */

export type AuditAction =
  | "create"
  | "update"
  | "status_change"
  | "revise"
  | "duplicate"
  | "delete";

export async function addAudit(
  tx: {
    insert: (table: typeof quotationAuditLogs) => any;
  },
  entry: {
    quotationId: string;
    action: AuditAction;
    actor?: Actor | null;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    note?: string | null;
  },
) {
  await tx.insert(quotationAuditLogs).values({
    quotationId: entry.quotationId,
    action: entry.action,
    changedBy: entry.actor?.id ?? null,
    changedByEmail: entry.actor?.email ?? null,
    oldValues: entry.oldValues ?? null,
    newValues: entry.newValues ?? null,
    note: entry.note ?? null,
  });
}

export async function getAuditLogs(quotationId: string) {
  const db = getDb();
  return db
    .select()
    .from(quotationAuditLogs)
    .where(eq(quotationAuditLogs.quotationId, quotationId))
    .orderBy(desc(quotationAuditLogs.changedAt), desc(quotationAuditLogs.id));
}

/* ------------------------------------------------------------------ */
/* expiry                                                             */
/* ------------------------------------------------------------------ */

/** a sent document whose offer validity has passed becomes expired */
async function applyExpiry(row: typeof quotations.$inferSelect) {
  if (row.status !== "sent") return row;
  if (!isExpired(row.docDate, row.validityDays)) return row;

  const db = getDb();
  const [updated] = await db
    .update(quotations)
    .set({ status: "expired", lockedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(quotations.id, row.id), eq(quotations.status, "sent")))
    .returning();
  if (!updated) return row;

  await db.insert(quotationAuditLogs).values({
    quotationId: row.id,
    action: "status_change",
    changedBy: null,
    changedByEmail: null,
    oldValues: { status: "sent" },
    newValues: { status: "expired", reason: "เลยกำหนดยืนราคา" },
    note: "หมดอายุอัตโนมัติตามกำหนดยืนราคา",
  });
  return updated;
}

/* ------------------------------------------------------------------ */
/* read                                                               */
/* ------------------------------------------------------------------ */

export async function listQuotations(opts: {
  search?: string;
  status?: string;
  customerId?: number;
  limit?: number;
  offset?: number;
  /** false = only the newest revision of each document */
  allRevisions?: boolean;
}) {
  const db = getDb();
  const where = [];
  if (opts.status && opts.status !== "all") where.push(eq(quotations.status, opts.status));
  if (opts.customerId) where.push(eq(quotations.customerId, opts.customerId));
  if (opts.search) {
    const q = `%${opts.search}%`;
    where.push(
      or(
        ilike(quotations.docNo, q),
        ilike(quotations.customerName, q),
        ilike(quotations.poRef, q),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(quotations)
    .where(and(...where))
    .orderBy(desc(quotations.docDate), desc(quotations.createdAt))
    .limit(opts.limit ?? 200)
    .offset(opts.offset ?? 0);

  const withExpiry = await Promise.all(rows.map((r) => applyExpiry(r)));
  if (opts.allRevisions) return withExpiry;

  // newest revision per base document
  const newest = new Map<string, (typeof withExpiry)[number]>();
  for (const row of withExpiry) {
    const key = baseDocNo(row.docNo);
    const current = newest.get(key);
    if (!current) {
      newest.set(key, row);
      continue;
    }
    const a = revisionOf(row.docNo);
    const b = revisionOf(current.docNo);
    if (a > b || (a === b && row.createdAt > current.createdAt)) newest.set(key, row);
  }
  return [...newest.values()];
}

export async function getQuotation(id: string): Promise<QuotationWithItems | null> {
  const db = getDb();
  const row = await db.query.quotations.findFirst({
    where: and(eq(quotations.id, id), sql`${quotations.deletedAt} is null`),
  });
  if (!row) return null;
  const quotation = await applyExpiry(row);
  const items = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, id))
    .orderBy(asc(quotationItems.orderIndex));
  return { quotation, items };
}

/** every revision of the same document (root + R1, R2, ...) */
export async function getRevisionFamily(quotationId: string) {
  const db = getDb();
  const row = await db.query.quotations.findFirst({ where: eq(quotations.id, quotationId) });
  if (!row) return [];
  const base = baseDocNo(row.docNo);
  const rows = await db
    .select()
    .from(quotations)
    .where(and(sql`${quotations.deletedAt} is null`, sql`${quotations.docNo} like ${base + "%"}`))
    .orderBy(asc(quotations.revisionNo), asc(quotations.createdAt));
  return rows;
}

/* ------------------------------------------------------------------ */
/* write                                                              */
/* ------------------------------------------------------------------ */

function itemValues(payload: QuotationPayload, quotationId: string) {
  return payload.items.map((item, i) => ({
    quotationId,
    orderIndex: i,
    description: item.description,
    qty: item.qty,
    unit: item.unit ?? null,
    unitPrice: item.unitPrice,
    discount: item.discount,
    discountMode: item.discountMode,
  }));
}

export async function createQuotation(
  payload: QuotationPayload,
  actor?: Actor | null,
  options: { status?: Status; docNo?: string; parentId?: string | null; revisionNo?: number } = {},
) {
  const db = getDb();
  const { pattern } = await getDocNoSettings();
  const status = options.status ?? "draft";

  return db.transaction(async (tx) => {
    const docNo = options.docNo ?? (await allocateDocNo(tx as never, pattern, payload.docDate));
    const [quotation] = await tx
      .insert(quotations)
      .values({
        docNo,
        docDate: payload.docDate,
        customerId: payload.customerId ?? null,
        customerName: payload.customerName,
        customerAddress: payload.customerAddress,
        customerTaxId: payload.customerTaxId ?? null,
        poRef: payload.poRef ?? null,
        contactName: payload.contactName ?? null,
        contactPosition: payload.contactPosition ?? null,
        validityDays: payload.validityDays,
        deliveryDays: payload.deliveryDays,
        paymentDays: payload.paymentDays,
        vatRate: payload.vatRate,
        vatInclusive: payload.vatInclusive,
        finalDiscount: payload.finalDiscount,
        remark: payload.remark ?? null,
        status,
        revisionNo: options.revisionNo ?? 0,
        parentId: options.parentId ?? null,
        sentAt: status === "sent" ? new Date() : null,
        lockedAt: status === "draft" ? null : new Date(),
        createdBy: actor?.id ?? null,
      })
      .returning();

    await tx.insert(quotationItems).values(itemValues(payload, quotation.id));

    await addAudit(tx as never, {
      quotationId: quotation.id,
      action: options.parentId ? "revise" : "create",
      actor: actor ?? null,
      newValues: { docNo, status },
      note: options.parentId ? "สร้างฉบับแก้ไข" : null,
    });

    return quotation;
  });
}

/** content of a document - only drafts may be edited */
export async function updateQuotationContent(
  id: string,
  payload: QuotationPayload,
  actor?: Actor | null,
) {
  const db = getDb();
  const current = await db.query.quotations.findFirst({ where: eq(quotations.id, id) });
  if (!current) return null;
  if (!isEditable(current.status as Status)) {
    throw new StatusError(
      `เอกสารสถานะ "${current.status}" แก้ไขเนื้อหาโดยตรงไม่ได้ ต้องสร้างฉบับแก้ไข`,
    );
  }

  return db.transaction(async (tx) => {
    // snapshot of the old items BEFORE they are replaced
    const oldItems = await tx
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, id))
      .orderBy(asc(quotationItems.orderIndex));

    const [quotation] = await tx
      .update(quotations)
      .set({
        docDate: payload.docDate,
        customerId: payload.customerId ?? null,
        customerName: payload.customerName,
        customerAddress: payload.customerAddress,
        customerTaxId: payload.customerTaxId ?? null,
        poRef: payload.poRef ?? null,
        contactName: payload.contactName ?? null,
        contactPosition: payload.contactPosition ?? null,
        validityDays: payload.validityDays,
        deliveryDays: payload.deliveryDays,
        paymentDays: payload.paymentDays,
        vatRate: payload.vatRate,
        vatInclusive: payload.vatInclusive,
        finalDiscount: payload.finalDiscount,
        remark: payload.remark ?? null,
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, id))
      .returning();

    await tx.delete(quotationItems).where(eq(quotationItems.quotationId, id));
    await tx.insert(quotationItems).values(itemValues(payload, id));

    await addAudit(tx as never, {
      quotationId: id,
      action: "update",
      actor: actor ?? null,
      oldValues: {
        docDate: current.docDate,
        customerName: current.customerName,
        items: oldItems.map((i) => ({
          description: i.description,
          qty: Number(i.qty),
          unitPrice: i.unitPrice,
        })),
      },
      newValues: {
        docDate: payload.docDate,
        customerName: payload.customerName,
        items: payload.items.map((i) => ({
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
      },
    });

    return quotation;
  });
}

/** status change - only the transitions of the state machine are allowed */
export async function updateQuotationStatus(
  id: string,
  next: string,
  actor?: Actor | null,
  note?: string | null,
) {
  const db = getDb();
  const current = await db.query.quotations.findFirst({ where: eq(quotations.id, id) });
  if (!current) return null;

  if (!isStatus(next)) {
    throw new StatusError("สถานะไม่ถูกต้อง", "invalid_transition");
  }
  const from = current.status as Status;
  if (!canTransition(from, next)) {
    throw new StatusError(
      `เปลี่ยนสถานะจาก "${from}" เป็น "${next}" ไม่ได้`,
      "invalid_transition",
    );
  }

  return db.transaction(async (tx) => {
    const [quotation] = await tx
      .update(quotations)
      .set({
        status: next,
        sentAt: next === "sent" ? new Date() : current.sentAt,
        lockedAt: next === "draft" ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(quotations.id, id))
      .returning();

    await addAudit(tx as never, {
      quotationId: id,
      action: "status_change",
      actor: actor ?? null,
      oldValues: { status: from },
      newValues: { status: next },
      note: note ?? null,
    });

    // a revision that gets sent supersedes its parent
    if (next === "sent" && current.parentId) {
      const parent = await tx.query.quotations.findFirst({
        where: eq(quotations.id, current.parentId),
      });
      if (parent && parent.status === "sent") {
        await tx
          .update(quotations)
          .set({ status: "superseded", lockedAt: new Date(), updatedAt: new Date() })
          .where(eq(quotations.id, parent.id));
        await addAudit(tx as never, {
          quotationId: parent.id,
          action: "status_change",
          actor: actor ?? null,
          oldValues: { status: "sent" },
          newValues: { status: "superseded", reason: "มีฉบับแก้ไขใหม่" },
          note: `ถูกแทนที่โดย ${current.docNo}`,
        });
      }
    }

    return quotation;
  });
}

/** internal note - never touches the document content, allowed in every status */
export async function updateInternalNote(
  id: string,
  note: string | null,
  actor?: Actor | null,
) {
  const db = getDb();
  const current = await db.query.quotations.findFirst({ where: eq(quotations.id, id) });
  if (!current) return null;

  return db.transaction(async (tx) => {
    const [quotation] = await tx
      .update(quotations)
      .set({ internalNote: note, updatedAt: new Date() })
      .where(eq(quotations.id, id))
      .returning();

    await addAudit(tx as never, {
      quotationId: id,
      action: "update",
      actor: actor ?? null,
      oldValues: { internalNote: current.internalNote },
      newValues: { internalNote: note },
      note: "แก้ไขบันทึกภายใน",
    });

    return quotation;
  });
}

/** create a revision of a document that was already sent */
export async function createRevision(id: string, actor?: Actor | null) {
  const db = getDb();
  const source = await getQuotation(id);
  if (!source) return null;
  const { quotation: q, items } = source;

  if (q.status !== "sent") {
    throw new StatusError(
      `สร้างฉบับแก้ไขได้เฉพาะเอกสารสถานะ "ส่งแล้ว" (เอกสารนี้อยู่สถานะ "${q.status}")`,
    );
  }

  const revisionNo = revisionOf(q.docNo) + 1;
  const docNo = `${baseDocNo(q.docNo)}-R${revisionNo}`;

  const payload: QuotationPayload = {
    docDate: q.docDate,
    customerId: q.customerId,
    customerName: q.customerName,
    customerAddress: q.customerAddress,
    customerTaxId: q.customerTaxId,
    poRef: q.poRef,
    contactName: q.contactName,
    contactPosition: q.contactPosition,
    validityDays: q.validityDays,
    deliveryDays: q.deliveryDays,
    paymentDays: q.paymentDays,
    vatRate: Number(q.vatRate),
    vatInclusive: q.vatInclusive,
    finalDiscount: q.finalDiscount,
    remark: q.remark,
    status: "draft",
    items: items.map((i) => ({
      description: i.description,
      qty: Number(i.qty),
      unit: i.unit,
      unitPrice: i.unitPrice,
      discount: i.discount,
      discountMode: i.discountMode === "percent" ? "percent" : "amount",
    })),
  };

  const created = await createQuotation(payload, actor, {
    status: "draft",
    docNo,
    parentId: q.id,
    revisionNo,
  });

  // remember the link on the parent as well
  await db
    .update(quotations)
    .set({ updatedAt: new Date() })
    .where(eq(quotations.id, q.id));

  return created;
}

/** soft delete - only drafts */
export async function softDeleteQuotation(id: string, actor?: Actor | null) {
  const db = getDb();
  const current = await db.query.quotations.findFirst({ where: eq(quotations.id, id) });
  if (!current) return null;
  if (!isDeletable(current.status as Status)) {
    throw new StatusError(
      `ลบเอกสารสถานะ "${current.status}" ไม่ได้ (ลบได้เฉพาะเอกสารร่าง)`,
    );
  }

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(quotations)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(quotations.id, id))
      .returning({ id: quotations.id });

    await addAudit(tx as never, {
      quotationId: id,
      action: "delete",
      actor: actor ?? null,
      oldValues: { status: current.status, deletedAt: null },
      newValues: { deletedAt: new Date().toISOString() },
      note: "ลบเอกสาร (soft delete)",
    });

    return row ?? null;
  });
}

/** copy a document into a new draft (does not touch the original) */
export async function duplicateQuotation(id: string, actor?: Actor | null) {
  const db = getDb();
  const source = await getQuotation(id);
  if (!source) return null;
  const { pattern } = await getDocNoSettings();
  const { quotation: q, items } = source;

  return db.transaction(async (tx) => {
    const docNo = await allocateDocNo(tx as never, pattern, q.docDate);
    const [quotation] = await tx
      .insert(quotations)
      .values({
        docNo,
        docDate: q.docDate,
        customerId: q.customerId,
        customerName: q.customerName,
        customerAddress: q.customerAddress,
        customerTaxId: q.customerTaxId,
        poRef: q.poRef,
        contactName: q.contactName,
        contactPosition: q.contactPosition,
        validityDays: q.validityDays,
        deliveryDays: q.deliveryDays,
        paymentDays: q.paymentDays,
        vatRate: q.vatRate,
        vatInclusive: q.vatInclusive,
        finalDiscount: q.finalDiscount,
        remark: q.remark,
        status: "draft",
        createdBy: actor?.id ?? null,
      })
      .returning();
    await tx.insert(quotationItems).values(
      items.map((item) => ({
        quotationId: quotation.id,
        orderIndex: item.orderIndex,
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountMode: item.discountMode,
      })),
    );
    await addAudit(tx as never, {
      quotationId: quotation.id,
      action: "duplicate",
      actor: actor ?? null,
      newValues: { docNo, from: q.docNo },
      note: `คัดลอกจาก ${q.docNo}`,
    });
    return quotation;
  });
}

export async function searchCustomers(search?: string) {
  const db = getDb();
  const q = search ? `%${search}%` : "%";
  return db
    .select()
    .from(customers)
    .where(or(ilike(customers.name, q), ilike(customers.nameEn, q))!)
    .orderBy(asc(customers.name))
    .limit(50);
}

export async function searchProducts(search?: string) {
  const db = getDb();
  const q = search ? `%${search}%` : "%";
  return db
    .select()
    .from(products)
    .where(ilike(products.description, q))
    .orderBy(asc(products.description))
    .limit(50);
}

export async function countQuotations() {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(quotations)
    .where(sql`${quotations.deletedAt} is null`);
  return row?.value ?? 0;
}

/** DB row -> printable document */
export function toDoc(row: QuotationWithItems, company: CompanyInfo): QuotationDoc {
  return {
    docNo: row.quotation.docNo,
    docDate: row.quotation.docDate,
    company,
    customer: {
      name: row.quotation.customerName,
      address: row.quotation.customerAddress,
      taxId: row.quotation.customerTaxId,
    },
    poRef: row.quotation.poRef,
    contactName: row.quotation.contactName,
    contactPosition: row.quotation.contactPosition,
    validityDays: row.quotation.validityDays,
    deliveryDays: row.quotation.deliveryDays,
    paymentDays: row.quotation.paymentDays,
    vatRate: Number(row.quotation.vatRate),
    vatInclusive: row.quotation.vatInclusive,
    finalDiscount: row.quotation.finalDiscount,
    remark: row.quotation.remark,
    items: row.items.map((i) => ({
      description: i.description,
      qty: Number(i.qty),
      unit: i.unit,
      unitPrice: i.unitPrice,
      discount: i.discount,
      discountMode: i.discountMode === "percent" ? "percent" : "amount",
    })),
  };
}
