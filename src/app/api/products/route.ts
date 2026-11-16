import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/server";
import { productPayloadSchema } from "@/lib/api";
import { getDb } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { searchProducts } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  if (!(await getRequestUser(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const rows = await searchProducts(q);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!(await getRequestUser(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = productPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const db = getDb();
  const [row] = await db
    .insert(products)
    .values({
      description: parsed.data.description,
      unit: parsed.data.unit ?? null,
      unitPrice: parsed.data.unitPrice,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
