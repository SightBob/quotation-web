import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing");
  }
  return { url, key };
}

/** Server-side client with cookie based session (route handlers, server components) */
export async function createSupabaseServerClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // called from a Server Component: middleware/proxy refreshes the session instead
        }
      },
    },
  });
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** role comes from app_metadata (only an admin/service role can set it) */
export async function getCurrentRole(): Promise<"admin" | "staff"> {
  const user = await getCurrentUser();
  const role = (user?.app_metadata?.role as string | undefined) ?? "staff";
  return role === "admin" ? "admin" : "staff";
}

/**
 * Session for API callers: accepts a Supabase access token (Authorization: Bearer)
 * or falls back to the browser cookie session.
 */
export async function getRequestUser(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      return user ?? null;
    }
  }
  return getCurrentUser();
}
