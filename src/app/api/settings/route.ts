import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";
import { settingsPayloadSchema } from "@/lib/api";
import { getDb } from "@/lib/db";
import { companySettings } from "@/lib/db/schema";

export async function GET(req: Request) {
  if (!(await getRequestUser(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDb();
  const row = await db.query.companySettings.findFirst({
    where: (t, { eq }) => eq(t.id, 1),
  });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  if (!(await getRequestUser(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = settingsPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const db = getDb();
  const [row] = await db
    .update(companySettings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(companySettings.id, 1))
    .returning();
  return NextResponse.json(row);
}
