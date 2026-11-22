"use client";

import { useState } from "react";

type Rule = {
  id: string;
  contribution_type: "tithe"|"systematic"|"thanksgiving"|"loose"|"sabbath_school";
  conference_pct: number;
  district_pct: number;
  local_pct: number;
  effective_from: string;
};

export default function RuleManager({ initialRules }: { initialRules: Rule[] }) {
  const [rules, setRules] = useState(initialRules);
  const [message, setMessage] = useState<string | null>(null);

  async function addRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const conference = Number(form.get("conference"));
    const district = Number(form.get("district"));
    const local = Number(form.get("local"));
    if (conference + district + local !== 100) {
      setMessage("Percentages must total exactly 100.");
      return;
    }
    const response = await fetch("/api/conference/distribution-rule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contributionType: String(form.get("type")),
        conferencePct: conference,
        districtPct: district,
        localPct: local,
        effectiveFrom: String(form.get("effective")),
      }),
    });
    const body: { rule?: Rule; error?: string } = await response.json();
    if (!response.ok) setMessage(body.error ?? "Unable to add rule.");
    else {
      if (body.rule) setRules((current) => [body.rule as Rule, ...current]);
      event.currentTarget.reset();
      setMessage("Rule version added. It applies only from the effective Sabbath.");
    }
  }

  return (
    <div className="space-y-4">
      {message ? <p role="alert" className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">{message}</p> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Add distribution rule version</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">New versions apply only to future Sabbaths.</p>
        <form onSubmit={addRule} className="mt-4 grid gap-3 sm:grid-cols-6">
          <select name="type" required className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950">
            <option value="tithe">Tithe</option><option value="systematic">Systematic</option>
            <option value="thanksgiving">Thanksgiving</option><option value="loose">Loose</option>
            <option value="sabbath_school">Sabbath School</option>
          </select>
          <input name="conference" type="number" min="0" max="100" step="0.01" placeholder="Conference %" required className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <input name="district" type="number" min="0" max="100" step="0.01" placeholder="District %" required className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <input name="local" type="number" min="0" max="100" step="0.01" placeholder="Local %" required className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <input name="effective" type="date" required className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <button className="rounded-xl bg-[#0B1B3A] px-4 text-white">Add version</button>
        </form>
      </section>
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Rule history</h2>
        <table className="mt-4 w-full text-left"><thead><tr><th>Type</th><th>Conference</th><th>District</th><th>Local</th><th>Effective</th></tr></thead>
          <tbody>{rules.map((rule) => <tr key={rule.id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-2">{rule.contribution_type}</td><td>{rule.conference_pct}%</td><td>{rule.district_pct}%</td><td>{rule.local_pct}%</td><td>{rule.effective_from}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
