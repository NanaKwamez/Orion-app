"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { distributePesewas, formatGhs, parseGhsToPesewas } from "@/lib/money";

type Member = { id: string; full_name: string; member_number: string | null };
type Rule = { contribution_type: string; conference_pct: number; district_pct: number; local_pct: number };
type Props = {
  reportId: string;
  churchId: string;
  sabbathDate: string;
  members: Member[];
  initialLoose: number;
  initialSabbath: number;
  status: "draft" | "submitted";
  rules: Rule[];
};

type GridValue = { tithe: string; systematic: string; thanksgiving: string };

export default function WeeklyGrid(props: Props) {
  const [values, setValues] = useState<Record<string, GridValue>>({});
  const [loose, setLoose] = useState(props.initialLoose ? String(props.initialLoose) : "");
  const [sabbath, setSabbath] = useState(props.initialSabbath ? String(props.initialSabbath) : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function setMember(memberId: string, field: keyof GridValue, value: string) {
    setValues((current) => ({ ...current, [memberId]: { ...current[memberId], [field]: value } }));
  }

  const saveDraft = useCallback(async (showMessage: boolean) => {
    if (props.status === "submitted" || !navigator.onLine) return;
    setSaving(true);
    try {
      const supabase = createClient();
      for (const member of props.members) {
        const row = values[member.id];
        const tithe = parseGhsToPesewas(row?.tithe ?? "");
        const systematic = parseGhsToPesewas(row?.systematic ?? "");
        const thanksgiving = parseGhsToPesewas(row?.thanksgiving ?? "");
        if (tithe || systematic || thanksgiving) {
          const { error } = await supabase.from("member_contributions").upsert({
            report_id: props.reportId,
            member_id: member.id,
            tithe: tithe / 100,
            systematic: systematic / 100,
            thanksgiving: thanksgiving / 100,
          }, { onConflict: "report_id,member_id" });
          if (error) throw new Error("Unable to autosave.");
        }
      }
      const { error } = await supabase.from("weekly_reports").update({
        loose_offering: parseGhsToPesewas(loose) / 100,
        sabbath_school_offering: parseGhsToPesewas(sabbath) / 100,
      }).eq("id", props.reportId).eq("status", "draft");
      if (error) throw new Error("Unable to autosave.");
      if (showMessage) setMessage("Draft saved.");
    } catch {
      setMessage("Unable to save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }, [loose, props.members, props.reportId, props.status, sabbath, values]);

  useEffect(() => {
    const timer = window.setInterval(() => saveDraft(false), 60_000);
    const reconnect = () => { void saveDraft(false); };
    window.addEventListener("online", reconnect);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", reconnect);
    };
  }, [saveDraft]);

  async function submit() {
    if (!navigator.onLine) {
      setMessage("Submission needs a connection.");
      return;
    }
    setSaving(true);
    try {
      await saveDraft(false);
      const supabase = createClient();
      const { error } = await supabase.rpc("submit_weekly_report", { p_report_id: props.reportId });
      if (error) throw new Error("Submission failed.");
      setMessage("Report submitted and locked.");
    } catch {
      setMessage("Submission failed. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  const totals = useMemo(() => {
    let tithe = 0, systematic = 0, thanksgiving = 0;
    for (const member of props.members) {
      const row = values[member.id];
      tithe += parseGhsToPesewas(row?.tithe ?? "");
      systematic += parseGhsToPesewas(row?.systematic ?? "");
      thanksgiving += parseGhsToPesewas(row?.thanksgiving ?? "");
    }
    return { tithe, systematic, thanksgiving };
  }, [values, props.members]);

  function preview(type: string, total: number) {
    const rule = props.rules.find((item) => item.contribution_type === type);
    if (!rule) return { conference: 0, district: 0, local: 0 };
    return distributePesewas(total, { conferencePct: rule.conference_pct, districtPct: rule.district_pct, localPct: rule.local_pct });
  }

  const loosePesewas = parseGhsToPesewas(loose);
  const sabbathPesewas = parseGhsToPesewas(sabbath);
  const previewRows = [
    ["Tithe", totals.tithe],
    ["Systematic", totals.systematic],
    ["Thanksgiving", totals.thanksgiving],
    ["Loose", loosePesewas],
    ["Sabbath School", sabbathPesewas],
  ];
  const typeKeys = ["tithe","systematic","thanksgiving","loose","sabbath_school"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Weekly report · {props.sabbathDate}</h2>
        <button onClick={() => saveDraft(true)} disabled={saving} className="rounded-xl border border-slate-300 px-4 dark:border-slate-700">{saving ? "Saving…" : "Save draft"}</button>
      </div>
      {message ? <p role="status" className="text-slate-700 dark:text-slate-200">{message}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left">
          <thead><tr><th className="p-3">Member</th><th>Tithe</th><th>Systematic</th><th>Thanksgiving</th></tr></thead>
          <tbody>{props.members.map((member) => (
            <tr key={member.id} className="border-t border-slate-200 dark:border-slate-800">
              <td className="p-3">{member.full_name}</td>
              {(["tithe","systematic","thanksgiving"] as (keyof GridValue)[]).map((field) =>
                <td key={field} className="p-1"><input inputMode="decimal" aria-label={`${member.full_name} ${field}`} value={values[member.id]?.[field] ?? ""} onChange={(event) => setMember(member.id, field, event.target.value)} className="w-24 rounded-lg border border-slate-300 px-2 dark:border-slate-700 dark:bg-slate-950" /></td>
              )}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">Loose offering<input inputMode="decimal" value={loose} onChange={(event) => setLoose(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /></label>
        <label className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">Sabbath School offering<input inputMode="decimal" value={sabbath} onChange={(event) => setSabbath(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" /></label>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-semibold">Distribution preview</h3>
        <div className="mt-3 space-y-2">{previewRows.map(([label, total], index) => {
          const split = preview(typeKeys[index], Number(total));
          return <div key={String(label)} className="grid grid-cols-4 gap-2 text-sm"><strong>{label}</strong><span>Conference {formatGhs(split.conference)}</span><span>District {formatGhs(split.district)}</span><span>Local {formatGhs(split.local)}</span></div>;
        })}</div>
      </section>
      <div className="sticky bottom-20 flex items-center justify-between rounded-2xl bg-[#0B1B3A] p-4 text-white md:bottom-0">
        <p>{formatGhs(totals.tithe+totals.systematic+totals.thanksgiving+loosePesewas+sabbathPesewas)}</p>
        <button onClick={submit} disabled={saving || props.status==="submitted"} className="min-h-11 rounded-xl bg-white px-5 font-semibold text-[#0B1B3A]">{props.status==="submitted" ? "Submitted" : "Submit report"}</button>
      </div>
    </div>
  );
}
