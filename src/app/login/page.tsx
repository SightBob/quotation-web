"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(searchParams.get("next") ?? "/");
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm space-y-3 rounded-lg border border-slate-200 bg-white p-6"
    >
      <h1 className="text-lg font-bold">เข้าสู่ระบบใบเสนอราคา</h1>
      <label className="block text-sm">
        <span className="block text-slate-500">อีเมล</span>
        <input
          type="email"
          required
          autoComplete="email"
          className="w-full rounded border border-slate-300 px-2 py-1.5"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="block text-slate-500">รหัสผ่าน</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded border border-slate-300 px-2 py-1.5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
      <p className="text-xs text-slate-500">
        ยังไม่มีบัญชี? ให้ผู้ดูแลระบบสร้างใน Supabase Dashboard (Authentication → Users)
      </p>
    </form>
  );
}
