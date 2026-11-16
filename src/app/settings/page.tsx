import { SettingsForm } from "@/components/settings/SettingsForm";
import { getDb } from "@/lib/db";
import { companySettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentRole } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const db = getDb();
  const row = await db.query.companySettings.findFirst({
    where: eq(companySettings.id, 1),
  });
  const role = await getCurrentRole();

  if (!row) {
    return (
      <main className="p-6">
        <p>ยังไม่มีข้อมูลตั้งค่าบริษัท (รัน supabase-seed.sql)</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">ตั้งค่าบริษัท</h1>
        </div>

        {role !== "admin" ? (
          <p className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            บัญชีนี้มีสิทธิ์ “staff” — ตั้งค่าทั่วไปได้ แต่การลบเอกสาร/แก้สิทธิ์ผู้ใช้ต้องเป็น “admin”
          </p>
        ) : null}

        <SettingsForm
          initial={{
            nameEn: row.nameEn,
            nameTh: row.nameTh,
            address: row.address,
            phone: row.phone,
            taxId: row.taxId,
            branch: row.branch,
            logoPath: row.logoPath,
            signaturePath: row.signaturePath,
            primaryColor: row.primaryColor,
            docNoPattern: row.docNoPattern,
            validityDays: row.validityDays,
            deliveryDays: row.deliveryDays,
            paymentDays: row.paymentDays,
            vatRate: Number(row.vatRate),
            vatInclusive: row.vatInclusive,
          }}
        />
      </div>
    </main>
  );
}
