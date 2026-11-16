import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** company profile / defaults (single row, id = 1) */
export const companySettings = pgTable("company_settings", {
  id: integer("id").primaryKey().default(1),
  nameEn: text("name_en").notNull(),
  nameTh: text("name_th").notNull(),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  taxId: text("tax_id").notNull().default(""),
  branch: text("branch").notNull().default(""),
  logoPath: text("logo_path"),
  signaturePath: text("signature_path"),
  primaryColor: text("primary_color").notNull().default("#8CC63F"),
  docNoPattern: text("doc_no_pattern").notNull().default("QT{YY}{MM}-{SEQ}"),
  validityDays: integer("validity_days").notNull().default(50),
  deliveryDays: integer("delivery_days").notNull().default(50),
  paymentDays: integer("payment_days").notNull().default(60),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2, mode: "number" }).notNull().default(7),
  vatInclusive: boolean("vat_inclusive").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    address: text("address").notNull().default(""),
    taxId: text("tax_id"),
    branch: text("branch"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customers_name_idx").on(t.name)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    description: text("description").notNull(),
    unit: text("unit"),
    /** satang */
    unitPrice: integer("unit_price").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_description_idx").on(t.description)],
);

export const quotations = pgTable(
  "quotations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    docNo: text("doc_no").notNull(),
    docDate: date("doc_date").notNull(),
    customerId: integer("customer_id").references(() => customers.id),
    // snapshot of customer data at issue time
    customerName: text("customer_name").notNull(),
    customerAddress: text("customer_address").notNull().default(""),
    customerTaxId: text("customer_tax_id"),
    poRef: text("po_ref"),
    contactName: text("contact_name"),
    contactPosition: text("contact_position"),
    validityDays: integer("validity_days").notNull().default(50),
    deliveryDays: integer("delivery_days").notNull().default(50),
    paymentDays: integer("payment_days").notNull().default(60),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2, mode: "number" }).notNull().default(7),
    vatInclusive: boolean("vat_inclusive").notNull().default(false),
    /** satang */
    finalDiscount: integer("final_discount").notNull().default(0),
    remark: text("remark"),
    /** internal note, never shown on the document */
    internalNote: text("internal_note"),
    status: text("status").notNull().default("draft"),
    /** 0 = ฉบับต้นฉบับ, 1,2,... = ฉบับแก้ไข */
    revisionNo: integer("revision_no").notNull().default(0),
    /** the document this revision came from */
    parentId: uuid("parent_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("quotations_doc_no_uidx").on(t.docNo),
    index("quotations_customer_id_idx").on(t.customerId),
    index("quotations_doc_date_idx").on(t.docDate),
    index("quotations_status_idx").on(t.status),
    index("quotations_parent_id_idx").on(t.parentId),
  ],
);

/** immutable history of every change */
export const quotationAuditLogs = pgTable(
  "quotation_audit_logs",
  {
    id: serial("id").primaryKey(),
    quotationId: uuid("quotation_id")
      .notNull()
      .references(() => quotations.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    changedBy: uuid("changed_by"),
    changedByEmail: text("changed_by_email"),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    note: text("note"),
  },
  (t) => [index("quotation_audit_logs_quotation_id_idx").on(t.quotationId)],
);

export const quotationItems = pgTable(
  "quotation_items",
  {
    id: serial("id").primaryKey(),
    quotationId: uuid("quotation_id")
      .notNull()
      .references(() => quotations.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    description: text("description").notNull(),
    qty: numeric("qty", { precision: 12, scale: 3, mode: "number" }).notNull().default(1),
    unit: text("unit"),
    /** satang */
    unitPrice: integer("unit_price").notNull().default(0),
    /** satang, per unit */
    discount: integer("discount").notNull().default(0),
    discountMode: text("discount_mode").notNull().default("amount"),
  },
  (t) => [index("quotation_items_quotation_id_idx").on(t.quotationId)],
);

/** sequence counter per document-number prefix (e.g. "QT69011") */
export const docCounters = pgTable("doc_counters", {
  prefix: text("prefix").primaryKey(),
  lastSeq: integer("last_seq").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CompanySettings = typeof companySettings.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Quotation = typeof quotations.$inferSelect;
export type QuotationItem = typeof quotationItems.$inferSelect;
export type QuotationAuditLog = typeof quotationAuditLogs.$inferSelect;
