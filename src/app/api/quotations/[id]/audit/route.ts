import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/server";
import { getAuditLogs, getRevisionFamily } from "@/lib/db/queries";

type Ctx = { params: Promise<{ id: string }> };

/** audit trail of a document */
export async function GET(req: Request, ctx: Ctx) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const [logs, revisions] = await Promise.all([getAuditLogs(id), getRevisionFamily(id)]);
  return NextResponse.json({ logs, revisions });
}
