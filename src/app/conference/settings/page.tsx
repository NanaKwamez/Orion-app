export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile) return null;
  const supabase = await createClient();
  const { data: rules, error: dataError } = await supabase
    .from("distribution_rules")
    .select("id, contribution_type, conference_pct, district_pct, local_pct, effective_from")
    .order("effective_from", { ascending: false });
  if (dataError) return <p role="alert" className="text-red-700">Unable to load distribution rules.</p>;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold">Distribution rules</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-300">New versions apply only to future Sabbaths.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr><th className="p-2">Type</th><th>Conference</th><th>District</th><th>Local</th><th>Effective</th></tr></thead>
          <tbody>{rules?.map((rule) => (
            <tr key={rule.id} className="border-t border-slate-200 dark:border-slate-800">
              <td className="p-2">{rule.contribution_type}</td><td>{rule.conference_pct}%</td><td>{rule.district_pct}%</td><td>{rule.local_pct}%</td><td>{rule.effective_from}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
