export type DiscountMode = "amount" | "percent";

export interface CompanyInfo {
  nameEn: string;
  nameTh: string;
  address: string;
  phone: string;
  taxId: string;
  branch: string;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  primaryColor?: string;
}

export interface CustomerInfo {
  name: string;
  nameEn?: string | null;
  address: string;
  taxId?: string | null;
  branch?: string | null;
}

export interface QuotationItem {
  description: string;
  qty: number;
  /** unit of measure, e.g. "ชิ้น" */
  unit?: string | null;
  /** unit price in satang */
  unitPrice: number;
  discount?: number;
  discountMode?: DiscountMode;
}

export interface QuotationDoc {
  docNo: string;
  docDate: Date | string;
  company: CompanyInfo;
  customer: CustomerInfo;
  poRef?: string | null;
  contactName?: string | null;
  contactPosition?: string | null;
  signatureUrl?: string | null;
  validityDays: number;
  deliveryDays: number;
  paymentDays: number;
  vatRate: number;
  vatInclusive?: boolean;
  /** bill level discount in satang */
  finalDiscount?: number;
  remark?: string | null;
  items: QuotationItem[];
}
