"use client";

import { useState } from "react";

type District = { id: string; name: string; code: string; is_active: boolean };

export default function DistrictManager({ initialDistricts }: { initialDistricts: District[] }) {
  const [districts, setDistricts] = useState(initialDistricts);
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  async function registerDistrict(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/conference/register-district", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") ?? ""),
        code: String(form.get("code") ?? ""),
      }),
    });
    const body: { district?: District; error?: string } = await response.json();
    if (!response.ok) setMessage(body.error ?? "Unable to register district.");
    else if (body.district) {
      setDistricts((current) => [...current, body.district as District]);
      event.currentTarget.reset();
      setMessage("District registered.");
    }
  }

  async function createAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPassword(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/create-district", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        districtId: String(form.get("districtId") ?? ""),
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? ""),
      }),
    });
    const body: { temporaryPassword?: string; error?: string } = await response.json();
    if (!response.ok) setMessage(body.error ?? "Unable to create district admin.");
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
        <h2 className="text-lg font-semibold">Register district</h2>
        <form onSubmit={registerDistrict} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input name="name" placeholder="District name" required className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <input name="code" placeholder="District code" required className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <button className="rounded-xl bg-[#0B1B3A] px-4 text-white">Register</button>
        </form>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Create district admin</h2>
        <form onSubmit={createAdmin} className="mt-4 grid gap-3 sm:grid-cols-4">
          <select name="districtId" required className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950">
            <option value="">Select district</option>
            {districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
          </select>
          <input name="fullName" placeholder="Full name" required className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <input name="email" type="email" placeholder="Email" required className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <button className="rounded-xl bg-[#0B1B3A] px-4 text-white">Create account</button>
        </form>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Districts</h2>
        {districts.length ? <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{districts.map((district) =>
          <div key={district.id} className="flex justify-between py-3"><strong>{district.name}</strong><span>{district.code}</span></div>
        )}</div> : <p className="mt-3">No districts.</p>}
      </section>
    </div>
  );
}
