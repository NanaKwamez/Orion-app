"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { passwordChangeSchema } from "@/lib/validators";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const parsed = passwordChangeSchema.safeParse({ password: String(form.get("password") ?? "") });
    if (!parsed.success) {
      setError("Password must be 12–128 characters.");
      return;
    }
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (updateError) {
      setError("Unable to change password.");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from("profiles").update({ must_change_password: false }).eq("id", userData.user.id);
    }
    router.push("/");
  }
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <label className="mt-4 block">New password
          <input name="password" type="password" autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
        </label>
        {error ? <p role="alert" className="mt-3 text-red-700 dark:text-red-300">{error}</p> : null}
        <button className="mt-4 w-full rounded-xl bg-[#0B1B3A] px-4 py-3 text-white">Save password</button>
      </form>
    </main>
  );
}
