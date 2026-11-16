// Status / revision / audit flow checks against the dev server.
import { TEST_EMAIL, TEST_PASSWORD } from "./_creds.mjs";
import { readFileSync } from "node:fs";
const envLocal = readFileSync(".env.local", "utf8");
const SUPABASE_URL = envLocal.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const ANON_KEY = envLocal.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const BASE = "http://localhost:3000";
const EMAIL = TEST_EMAIL;
const PASSWORD = TEST_PASSWORD;

const login = async () => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await res.json();
  return body.access_token;
};

const key = await login();
if (!key) throw new Error("login failed");

const api = async (path, options = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
};

const payload = (over = {}) => ({
  docDate: "2026-11-16",
  customerName: "บริษัท ทดสอบ สถานะ จำกัด",
  customerAddress: "1/1 ถนนทดสอบ",
  customerTaxId: null,
  poRef: null,
  contactName: "นายทดสอบ",
  contactPosition: "ผู้เสนอราคา",
  validityDays: 50,
  deliveryDays: 50,
  paymentDays: 60,
  vatRate: 7,
  vatInclusive: false,
  finalDiscount: 0,
  remark: null,
  status: "draft",
  items: [
    { description: "สินค้าทดสอบ", qty: 2, unit: "ชิ้น", unitPrice: 50000, discount: 0, discountMode: "amount" },
  ],
  ...over,
});

// 1) create draft
const created = await api("/api/quotations", { method: "POST", body: JSON.stringify(payload()) });
console.log("1) สร้าง draft ->", created.status, created.body.docNo, created.body.status);
const id = created.body.id;

// 2) edit content while draft
const edited = await api(`/api/quotations/${id}`, {
  method: "PATCH",
  body: JSON.stringify({ action: "content", ...payload({ remark: "แก้ไขแล้ว" }) }),
});
console.log("2) แก้ไขตอนเป็น draft ->", edited.status);

// 3) draft -> sent
const sent = await api(`/api/quotations/${id}`, {
  method: "PATCH",
  body: JSON.stringify({ action: "status", status: "sent" }),
});
console.log("3) draft -> sent ->", sent.status, sent.body.status, "| sentAt:", Boolean(sent.body.sentAt));

// 4) edit content while sent -> must be 409
const locked = await api(`/api/quotations/${id}`, {
  method: "PATCH",
  body: JSON.stringify({ action: "content", ...payload({ remark: "แก้ฝ่าฝืน" }) }),
});
console.log("4) แก้ไขตอนเป็น sent ->", locked.status, locked.body.message);

// 5) delete while sent -> must be 409
const lockedDelete = await api(`/api/quotations/${id}`, { method: "DELETE" });
console.log("5) ลบตอนเป็น sent ->", lockedDelete.status, lockedDelete.body.message);

// 6) invalid transition sent -> draft -> 409
const back = await api(`/api/quotations/${id}`, {
  method: "PATCH",
  body: JSON.stringify({ action: "status", status: "draft" }),
});
console.log("6) sent -> draft (ย้อนสถานะ) ->", back.status, back.body.message);

// 7) create revision
const revision = await api(`/api/quotations/${id}/revision`, { method: "POST" });
console.log("7) สร้างฉบับแก้ไข ->", revision.status, revision.body.docNo, "| revisionNo:", revision.body.revisionNo, "| parent:", Boolean(revision.body.parentId));
const revId = revision.body.id;

// 8) send the revision -> parent becomes superseded
const sentRev = await api(`/api/quotations/${revId}`, {
  method: "PATCH",
  body: JSON.stringify({ action: "status", status: "sent" }),
});
const parent = await api(`/api/quotations/${id}`);
console.log("8) ส่งฉบับแก้ไข ->", sentRev.status, "| ฉบับก่อนหน้าเป็น:", parent.body.quotation.status);

// 9) revision of a non-sent document -> 409
const revAgain = await api(`/api/quotations/${revId}/revision`, { method: "POST" });
console.log("9) สร้าง revision จากฉบับ sent (ตามกฎแล้วอนุญาต) ->", revAgain.status, revAgain.body.docNo ?? revAgain.body.message);

// 10) approve -> then try to go back
const approved = await api(`/api/quotations/${revId}`, {
  method: "PATCH",
  body: JSON.stringify({ action: "status", status: "approved" }),
});
const backApproved = await api(`/api/quotations/${revId}`, {
  method: "PATCH",
  body: JSON.stringify({ action: "status", status: "draft" }),
});
console.log("10) อนุมัติ ->", approved.status, approved.body.status, "| ย้อนกลับ ->", backApproved.status);

// 11) internal note works in every status
const note = await api(`/api/quotations/${revId}`, {
  method: "PATCH",
  body: JSON.stringify({ action: "note", note: "บันทึกภายในหลังอนุมัติ" }),
});
console.log("11) บันทึกภายใน (เอกสารล็อก) ->", note.status, JSON.stringify(note.body.internalNote));

// 12) audit log
const audit = await api(`/api/quotations/${revId}/audit`);
console.log("12) audit log ->", audit.status, audit.body.logs.length, "รายการ");
for (const log of audit.body.logs) {
  console.log("     -", log.action, "|", log.changedByEmail, "|", new Date(log.changedAt).toISOString().slice(0, 16), "|", log.note ?? "");
}
console.log("    ฉบับในตระกูล:", audit.body.revisions.map((r) => `${r.docNo}(${r.status})`).join(", "));

// 13) expiry: sent document whose validity has passed
const old = await api("/api/quotations", {
  method: "POST",
  body: JSON.stringify(payload({ docDate: "2026-01-01", validityDays: 1 })),
});
await api(`/api/quotations/${old.body.id}`, {
  method: "PATCH",
  body: JSON.stringify({ action: "status", status: "sent" }),
});
const expired = await api(`/api/quotations/${old.body.id}`);
console.log("13) เลยกำหนด ->", expired.body.quotation.status, "(ควรเป็น expired)");

// 14) list: latest revision only vs all
const latest = await api("/api/quotations");
const all = await api("/api/quotations?allRevisions=1");
console.log("14) รายการ: ฉบับล่าสุดเท่านั้น =", latest.body.length, "รายการ | ทุกฉบับ =", all.body.length, "รายการ");

// cleanup
for (const doc of all.body) {
  await fetch(`${BASE}/api/quotations/${doc.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
  });
}
console.log("cleanup: ลบเอกสารทดสอบแล้ว (soft delete)");
