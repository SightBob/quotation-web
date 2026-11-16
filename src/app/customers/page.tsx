import { CustomerManager } from "@/components/customers/CustomerManager";

export const dynamic = "force-dynamic";

export default function CustomersPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">จัดการลูกค้า</h1>
            <p className="text-sm text-slate-500">
              ข้อมูลลูกค้าหลักที่ใช้เติมแบบฟอร์มใบเสนอราคา (เอกสารเก่าไม่เปลี่ยนตาม)
            </p>
          </div>
        </div>

        <CustomerManager />
      </div>
    </main>
  );
}
