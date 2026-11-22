"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { loginSchema } from "@/lib/validators";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const form = new FormData(event.currentTarget);
      const parsed = loginSchema.safeParse({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      if (!parsed.success) {
        setError("Enter a valid email and password.");
        return;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
      if (signInError) {
        setError("Sign-in failed. Check your email and password.");
        return;
      }
      await supabase.rpc("log_login");
      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <label className="block">
        <span className="mb-1 block">Email</span>
        <input name="email" type="email" autoComplete="email" className="w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="block">
        <span className="mb-1 block">Password</span>
        <input name="password" type="password" autoComplete="current-password" className="w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
      <button disabled={loading} className="w-full rounded-xl bg-[#0B1B3A] px-4 py-3 font-semibold text-white disabled:opacity-60">
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
