// End-to-end API check against the dev server.
const BASE = process.env.BASE ?? "http://localhost:3000";

const sample = {
  docDate: "2026-11-16",
  customerName: "บริษัททศนจันทร์จิลล์สหกรณ์ (ประเทศไทย) จำกัด (มหาชน)",
  customerAddress: "94 ม.1 ต.บ้านสวน นายสุดสาภารม์โลหก สามเลิศ อ.บางปะอิน จ.ประจวบคีรีขันธ์ 44160",
  poRef: "PO-2026-001",
  contactName: "นายอะลี กิตติผู้",
  contactPosition: "ผู้เสนอราคา",
  validityDays: 50,
  deliveryDays: 50,
  paymentDays: 60,
  vatRate: 7,
  vatInclusive: false,
  finalDiscount: 0,
  status: "draft",
  items: [
    { description: "Carbide cutting tool shank, 12 mm.", qty: 1, unit: "ชิ้น", unitPrice: 69000, discount: 0, discountMode: "amount" },
    { description: "1.0 mm lathe cutting insert", qty: 2, unit: "ชิ้น", unitPrice: 39000, discount: 100, discountMode: "amount" },
    { description: "Drill Bit, 3 mm Diameter", qty: 10, unit: "ชิ้น", unitPrice: 14500, discount: 0, discountMode: "amount" },
  ],
};

const json = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 300);
  }
};

// 1. create
const created = await json(
  await fetch(`${BASE}/api/quotations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sample),
  }),
);
console.log("1) create ->", created.docNo, created.id, "status:", created.status);

// 2. list
const list = await json(await fetch(`${BASE}/api/quotations`));
console.log("2) list ->", Array.isArray(list) ? `${list.length} rows, docNo=${list[0]?.docNo}` : list);

// 3. get one
const one = await json(await fetch(`${BASE}/api/quotations/${created.id}`));
console.log("3) get ->", one.quotation?.docNo, "items:", one.items?.length, "item0:", one.items?.[0]?.description);

// 4. validation failure
const bad = await fetch(`${BASE}/api/quotations`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ...sample, customerName: "", items: [] }),
});
console.log("4) invalid payload ->", bad.status, JSON.stringify(await json(bad)).slice(0, 160));

// 5. status patch
const patched = await json(
  await fetch(`${BASE}/api/quotations/${created.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "sent" }),
  }),
);
console.log("5) patch status ->", patched.status);

// 6. duplicate
const copy = await json(await fetch(`${BASE}/api/quotations/${created.id}`, { method: "POST" }));
console.log("6) duplicate ->", copy.docNo, copy.id);

// 7. pdf
const pdf = await fetch(`${BASE}/api/quotations/${created.id}/pdf`);
const buf = Buffer.from(await pdf.arrayBuffer());
console.log("7) pdf ->", pdf.status, pdf.headers.get("content-type"), buf.length, "bytes", buf.subarray(0, 5).toString());

// 8. soft delete
const del = await json(await fetch(`${BASE}/api/quotations/${copy.id}`, { method: "DELETE" }));
console.log("8) delete ->", JSON.stringify(del));
const list2 = await json(await fetch(`${BASE}/api/quotations`));
console.log("9) list after delete ->", list2.length, "rows");
