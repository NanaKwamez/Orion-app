"use client";

import { useState } from "react";

type Church = { id: string; name: string; code: string; location: string | null; is_active: boolean };

export default function ChurchManager({ districtId, initialChurches }: { districtId: string; initialChurches: Church[] }) {
  const [churches, setChurches] = useState(initialChurches);
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  async function registerChurch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/district/register-church", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        districtId,
        name: String(form.get("name") ?? ""),
        code: String(form.get("code") ?? ""),
        location: String(form.get("location") ?? ""),
      }),
    });
    const body: { church?: Church; error?: string } = await response.json();
    setMessage(body.error ?? (body.church ? "Church registered." : null));
    if (body.church) {
      setChurches((current) => [...current, body.church as Church]);
      event.currentTarget.reset();
    }
  }

  async function createTreasurer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPassword(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/create-church-treasurer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        churchId: String(form.get("churchId") ?? ""),
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? ""),
      }),
    });
    const body: { temporaryPassword?: string; error?: string } = await response.json();
    if (!response.ok) setMessage(body.error ?? "Unable to create treasurer.");
    else {
      setPassword(body.temporaryPassword ?? null);
      event.currentTarget.reset();
    }
  }

  return (
    <div className="space-y-4">
      {message ? <p role="alert" className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">{message}</p> : null}
      {password ? <p className="rounded-xl bg-amber-50 p-3 text-slate-950">Temporary password (shown once): <strong>{password}</strong></p> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Register local church</h2>
        <form onSubmit={registerChurch} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input name="name" required placeholder="Church name" className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <input name="code" required placeholder="Church code" className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <input name="location" placeholder="Location" className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <button className="rounded-xl bg-[#0B1B3A] px-4 text-white">Register</button>
        </form>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Create church treasurer</h2>
        <form onSubmit={createTreasurer} className="mt-4 grid gap-3 sm:grid-cols-4">
          <select name="churchId" required className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950"><option value="">Select church</option>{churches.map((church) => <option key={church.id} value={church.id}>{church.name}</option>)}</select>
          <input name="fullName" required placeholder="Full name" className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <input name="email" required type="email" placeholder="Email" className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <button className="rounded-xl bg-[#0B1B3A] px-4 text-white">Create account</button>
        </form>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">District churches</h2>
        <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{churches.map((church) =>
          <div key={church.id} className="py-3"><strong>{church.name}</strong><p className="text-slate-600 dark:text-slate-300">{church.code}{church.location ? ` · ${church.location}` : ""}</p></div>
        )}</div>
      </section>
    </div>
  );
}
