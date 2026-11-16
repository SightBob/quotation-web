import { z } from "zod";
import { toSatang } from "./money";
import type { CompanyInfo, QuotationDoc, QuotationItem } from "./types";

/** Editable line as held in form state (prices kept as raw strings for the inputs) */
export interface FormItem {
  id: string;
  description: string;
  qty: string;
  unit: string;
  unitPrice: string;
  discount: string;
  discountMode: "amount" | "percent";
}

export interface FormState {
  docNo: string;
  docDate: string;
  customerName: string;
  customerAddress: string;
  customerTaxId: string;
  poRef: string;
  contactName: string;
  contactPosition: string;
  validityDays: string;
  deliveryDays: string;
  paymentDays: string;
  vatRate: string;
  vatInclusive: boolean;
  finalDiscount: string;
  remark: string;
  items: FormItem[];
}

let seq = 0;
export function newItem(partial: Partial<FormItem> = {}): FormItem {
  seq += 1;
  return {
    id: `i${Date.now()}-${seq}`,
    description: "",
    qty: "1",
    unit: "",
    unitPrice: "",
    discount: "",
    discountMode: "amount",
    ...partial,
  };
}

/** accept "1,250.50" / "฿1 250" / 1250.5 -> number */
const num = (schema: z.ZodType, empty: unknown = undefined) =>
  z.preprocess((v) => {
    if (typeof v === "string") {
      const cleaned = v.replace(/[,\s฿]/g, "");
      return cleaned === "" ? empty : Number(cleaned);
    }
    return v;
  }, schema);

export const itemSchema = z.object({
  description: z.string().trim().min(1, "ต้องระบุรายการ"),
  qty: num(z.number().gt(0, "จำนวนต้องมากกว่า 0")),
  unitPrice: num(z.number().min(0, "ราคาต้องไม่ติดลบ")),
  discount: num(z.number().min(0, "ส่วนลดต้องไม่ติดลบ"), 0),
  discountMode: z.enum(["amount", "percent"]),
});

export const formSchema = z.object({
  docNo: z.string().trim().min(1, "ต้องระบุเลขที่เอกสาร"),
  docDate: z.string().min(1, "ต้องระบุวันที่"),
  customerName: z.string().trim().min(1, "ต้องระบุชื่อลูกค้า"),
  customerAddress: z.string().trim().min(1, "ต้องระบุที่อยู่ลูกค้า"),
  validityDays: num(z.number().int().min(0)),
  deliveryDays: num(z.number().int().min(0)),
  paymentDays: num(z.number().int().min(0)),
  vatRate: num(z.number().min(0).max(100)),
  vatInclusive: z.boolean(),
  finalDiscount: num(z.number().min(0), 0),
  poRef: z.string(),
  contactName: z.string(),
  contactPosition: z.string(),
  remark: z.string(),
  items: z.array(itemSchema).min(1, "ต้องมีอย่างน้อย 1 รายการ"),
});

export type FormErrors = Record<string, string>;

/** Flatten zod issues into a field -> message map */
export function collectErrors(error: z.ZodError): FormErrors {
  const out: FormErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Form state -> printable document (prices converted to satang) */
export function toDoc(state: FormState, company: CompanyInfo): QuotationDoc {
  const items: QuotationItem[] = state.items.map((it) => ({
    description: it.description,
    qty: Number(it.qty) || 0,
    unit: it.unit || null,
    unitPrice: toSatang(it.unitPrice),
    // amount mode = satang, percent mode = raw percent number
    discount:
      it.discountMode === "percent"
        ? Number(it.discount) || 0
        : it.discount
          ? toSatang(it.discount)
          : 0,
    discountMode: it.discountMode,
  }));

  return {
    docNo: state.docNo,
    docDate: state.docDate,
    company,
    customer: {
      name: state.customerName,
      address: state.customerAddress,
      taxId: state.customerTaxId || null,
    },
    poRef: state.poRef || null,
    contactName: state.contactName || null,
    contactPosition: state.contactPosition || null,
    validityDays: Number(state.validityDays) || 0,
    deliveryDays: Number(state.deliveryDays) || 0,
    paymentDays: Number(state.paymentDays) || 0,
    vatRate: Number(state.vatRate) || 0,
    vatInclusive: state.vatInclusive,
    finalDiscount: toSatang(state.finalDiscount),
    remark: state.remark || null,
    items,
  };
}
