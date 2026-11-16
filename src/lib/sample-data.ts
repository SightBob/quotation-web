import type { QuotationDoc } from "./types";

/** Sample data transcribed from "example quotation.jpg" (QT69011-002). */
export const sampleCompany = {
  nameEn: "55 Inter Supply Co., Ltd.",
  nameTh: "บริษัท ทีทีเอินเตอร์ซัพพลาย จำกัด (สำนักงานใหญ่)",
  address: "306 หมู่ 7 อ.เทศบาลเมือง-โคลกกรวด อ.เมือง ชลบุรี 30000",
  phone: "08-9717-5255",
  taxId: "0105548003655",
  branch: "(สำนักงานใหญ่)",
  logoUrl: null,
  primaryColor: "#8CC63F",
};

export const sampleCustomers = [
  {
    name: "บริษัททศนจันทร์จิลล์สหกรณ์ (ประเทศไทย) จำกัด (มหาชน)",
    address:
      "94 ม.1 ต.บ้านสวน นายสุดสาภารม์โลหก สามเลิศ อ.บางปะอิน จ.ประจวบคีรีขันธ์ 44160",
    taxId: "",
  },
  {
    name: "บริษัท สยามแมคคิน จำกัด (มหาชน)",
    address: "99/1 ถนนสุขุมวิท แขวงคลองเตยเหนือ เขตคลองเตยเหนือ กรุงเทพมหานคร 10110",
    taxId: "0105551000237",
  },
  {
    name: "บริษัท ชิลลิ่น เมทัล จำกัด",
    address: "1/1 ถนนภูจียา ต.หนองขาม อ.เมือง จ.ชลบุรี 30000",
    taxId: "0105548000888",
  },
];

/** product master (description + unit price in satang) used for autocomplete */
export const sampleProducts = [
  { description: "Carbide cutting tool shank, 12 mm.", unitPrice: 69000 },
  { description: "Carbide cutting tool shank, 16 mm.", unitPrice: 95000 },
  { description: "1.0 mm lathe cutting insert", unitPrice: 39000 },
  { description: "1.3 mm lathe cutting insert", unitPrice: 49000 },
  { description: "BT40 Tool Holder", unitPrice: 350000 },
  { description: "Cable lock", unitPrice: 185000 },
  { description: "Lathe Insert,W  rainbow", unitPrice: 155000 },
  { description: "Lathe Insert,2mm", unitPrice: 92000 },
  { description: "Lathe Insert, HSS 3,4,5,6mm", unitPrice: 38000 },
  { description: "Lathe Insert, HSS 6mm", unitPrice: 62000 },
  { description: "Lathe Insert, HSS 8mm", unitPrice: 62000 },
  { description: "Lathe Insert, HSS 10mm", unitPrice: 68000 },
  { description: "Drill Bit, 3 mm Diameter", unitPrice: 14500 },
  { description: "Double Expansion Anchor With Bolt, Size 1/4 inch", unitPrice: 3000 },
];

export const sampleQuotation: QuotationDoc = {
  docNo: "QT69011-002",
  docDate: new Date("2026-11-02"),
  company: sampleCompany,
  customer: {
    name: "บริษัททศนจันทร์จิลล์สหกรณ์ (ประเทศไทย) จำกัด (มหาชน)",
    address:
      "94 ม.1 ต.บ้านสวน นายสุดสาภารม์โลหก สามเลิศ อ.บางปะอิน จ.ประจวบคีรีขันธ์ 44160",
    taxId: null,
    branch: null,
  },
  poRef: null,
  contactName: "นายอะลี กิตติผู้",
  contactPosition: "ผู้เสนอราคา",
  signatureUrl: null,
  validityDays: 50,
  deliveryDays: 50,
  paymentDays: 60,
  vatRate: 7,
  vatInclusive: false,
  finalDiscount: 0,
  remark: null,
  items: [
    { description: "Carbide cutting tool shank, 12 mm.", qty: 1, unitPrice: 69000 },
    { description: "Carbide cutting tool shank, 16 mm.", qty: 1, unitPrice: 95000 },
    { description: "1.0 mm lathe cutting insert", qty: 2, unitPrice: 39000 },
    { description: "1.3 mm lathe cutting insert", qty: 2, unitPrice: 49000 },
    { description: "BT40 Tool Holder", qty: 1, unitPrice: 350000 },
    { description: "Cable lock", qty: 2, unitPrice: 185000 },
    { description: "Lathe Insert,W  rainbow", qty: 1, unitPrice: 155000 },
    { description: "Lathe Insert,2mm", qty: 1, unitPrice: 92000 },
    { description: "Lathe Insert, HSS 3,4,5,6mm", qty: 4, unitPrice: 38000 },
    { description: "Lathe Insert, HSS 6mm", qty: 1, unitPrice: 62000 },
    { description: "Lathe Insert, HSS 8mm", qty: 1, unitPrice: 62000 },
    { description: "Lathe Insert, HSS 10mm", qty: 1, unitPrice: 68000 },
    { description: "Drill Bit, 3 mm Diameter", qty: 10, unitPrice: 14500 },
    { description: "Double Expansion Anchor With Bolt, Size 1/4 inch", qty: 40, unitPrice: 3000 },
  ],
};
