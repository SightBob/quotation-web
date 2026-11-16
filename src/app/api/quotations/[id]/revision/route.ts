import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/server";
import { createRevision, StatusError } from "@/lib/db/queries";

type Ctx = { params: Promise<{ id: string }> };

/** create a revision (copy) of a document that was already sent */
export async function POST(req: Request, ctx: Ctx) {
  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const actor = { id: user.id, email: user.email };
  try {
    const revision = await createRevision(id, actor);
    if (!revision) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(revision, { status: 201 });
  } catch (err) {
    if (err instanceof StatusError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "server_error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
