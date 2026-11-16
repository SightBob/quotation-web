// Clean test data, seed the reference quotation (QT69011-002) from the sample image.
import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = readFileSync(".env.local", "utf8").match(/DATABASE_URL=(.*)/)[1].trim();
const db = new Client({ connectionString: url });
await db.connect();

// wipe test rows
await db.query("delete from quotation_items");
await db.query("delete from quotations");
await db.query("delete from doc_counters");

const items = [
  ["Carbide cutting tool shank, 12 mm.", 1, 69000],
  ["Carbide cutting tool shank, 16 mm.", 1, 95000],
  ["1.0 mm lathe cutting insert", 2, 39000],
  ["1.3 mm lathe cutting insert", 2, 49000],
  ["BT40 Tool Holder", 1, 350000],
  ["Cable lock", 2, 185000],
  ["Lathe Insert,W  rainbow", 1, 155000],
  ["Lathe Insert,2mm", 1, 92000],
  ["Lathe Insert, HSS 3,4,5,6mm", 4, 38000],
  ["Lathe Insert, HSS 6mm", 1, 62000],
  ["Lathe Insert, HSS 8mm", 1, 62000],
  ["Lathe Insert, HSS 10mm", 1, 68000],
  ["Drill Bit, 3 mm Diameter", 10, 14500],
  ["Double Expansion Anchor With Bolt, Size 1/4 inch", 40, 3000],
];

const [customer] = (
  await db.query("select id from customers order by id limit 1")
).rows;

const [quotation] = (
  await db.query(
    `insert into quotations
      (doc_no, doc_date, customer_id, customer_name, customer_address, po_ref,
       contact_name, contact_position, validity_days, delivery_days, payment_days,
       vat_rate, vat_inclusive, final_discount, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,50,50,60,7,false,0,'sent')
     returning id`,
    [
      "QT69011-002",
      "2026-11-02",
      customer?.id ?? null,
      "บริษัททศนจันทร์จิลล์สหกรณ์ (ประเทศไทย) จำกัด (มหาชน)",
      "94 ม.1 ต.บ้านสวน นายสุดสาภารม์โลหก สามเลิศ อ.บางปะอิน จ.ประจวบคีรีขันธ์ 44160",
      null,
      "นายอะลี กิตติผู้",
      "ผู้เสนอราคา",
    ],
  )
).rows;

for (const [i, [description, qty, unitPrice]] of items.entries()) {
  await db.query(
    `insert into quotation_items (quotation_id, order_index, description, qty, unit_price, discount, discount_mode)
     values ($1,$2,$3,$4,$5,0,'amount')`,
    [quotation.id, i, description, qty, unitPrice],
  );
}

// counter must be past the seeded number so the next one is 003
await db.query("insert into doc_counters (prefix, last_seq) values ('QT69011', 2)");

console.log("seeded quotation:", quotation.id);
console.log(
  "totals:",
  (
    await db.query(
      `select sum(unit_price * qty) as total from quotation_items where quotation_id = $1`,
      [quotation.id],
    )
  ).rows[0],
);
await db.end();
