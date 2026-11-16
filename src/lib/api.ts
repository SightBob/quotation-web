import { z } from "zod";
import { statusSchema } from "./status";

export { statusSchema };

/** API payload: money is always integer satang */
export const quotationItemSchema = z.object({
  description: z.string().trim().min(1, "ต้องระบุรายการ").max(1000),
  qty: z.number().positive("จำนวนต้องมากกว่า 0").max(1_000_000),
  unit: z.string().max(50).nullable().optional(),
  unitPrice: z.number().int().min(0).max(1_000_000_000),
  discount: z.number().int().min(0).max(1_000_000_000).default(0),
  discountMode: z.enum(["amount", "percent"]).default("amount"),
});

export const quotationPayloadSchema = z.object({
  docDate: z.string().min(1, "ต้องระบุวันที่"),
  customerId: z.number().int().nullable().optional(),
  customerName: z.string().trim().min(1, "ต้องระบุชื่อลูกค้า").max(500),
  customerAddress: z.string().max(1000).default(""),
  customerTaxId: z.string().max(50).nullable().optional(),
  poRef: z.string().max(100).nullable().optional(),
  contactName: z.string().max(200).nullable().optional(),
  contactPosition: z.string().max(200).nullable().optional(),
  validityDays: z.number().int().min(0).max(365).default(50),
  deliveryDays: z.number().int().min(0).max(365).default(50),
  paymentDays: z.number().int().min(0).max(365).default(60),
  vatRate: z.number().min(0).max(100).default(7),
  vatInclusive: z.boolean().default(false),
  finalDiscount: z.number().int().min(0).default(0),
  remark: z.string().max(2000).nullable().optional(),
  status: z.enum(["draft", "sent", "approved", "rejected"]).default("draft"),
  items: z.array(quotationItemSchema).min(1, "ต้องมีอย่างน้อย 1 รายการ").max(500),
});

export type QuotationPayload = z.infer<typeof quotationPayloadSchema>;

export const customerPayloadSchema = z.object({
  name: z.string().trim().min(1).max(500),
  nameEn: z.string().max(500).nullable().optional(),
  address: z.string().max(1000).default(""),
  taxId: z.string().max(50).nullable().optional(),
  branch: z.string().max(100).nullable().optional(),
});

export const productPayloadSchema = z.object({
  description: z.string().trim().min(1).max(1000),
  unit: z.string().max(50).nullable().optional(),
  unitPrice: z.number().int().min(0).max(1_000_000_000),
});

export const settingsPayloadSchema = z.object({
  nameEn: z.string().trim().min(1).max(500),
  nameTh: z.string().trim().min(1).max(500),
  address: z.string().max(1000).default(""),
  phone: z.string().max(100).default(""),
  taxId: z.string().max(50).default(""),
  branch: z.string().max(100).default(""),
  logoPath: z.string().nullable().optional(),
  signaturePath: z.string().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#8CC63F"),
  docNoPattern: z.string().trim().min(1).max(100).default("QT{YY}{MM}-{SEQ}"),
  validityDays: z.number().int().min(0).max(365).default(50),
  deliveryDays: z.number().int().min(0).max(365).default(50),
  paymentDays: z.number().int().min(0).max(365).default(60),
  vatRate: z.number().min(0).max(100).default(7),
  vatInclusive: z.boolean().default(false),
});
