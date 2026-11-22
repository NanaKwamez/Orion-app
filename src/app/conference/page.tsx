export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatGhs } from "@/lib/money";

export default async function ConferenceDashboard() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!profile) return <p>Sign in to continue.</p>;
  const supabase = await createClient();
  const { data: districts, error: districtsError } = await supabase
    .from("districts").select("id, name, code, is_active").order("name");
  const { data: distributions, error: distributionsError } = await supabase
    .from("report_distributions").select("conference_amount, district_amount, local_amount");
  if (districtsError || distributionsError) return <p role="alert" className="text-red-700">Unable to load conference data.</p>;
  const conferenceDue = (distributions ?? []).reduce((sum, row) => sum + Math.round(Number(row.conference_amount) * 100), 0);
  const districtDue = (distributions ?? []).reduce((sum, row) => sum + Math.round(Number(row.district_amount) * 100), 0);
  const localDue = (distributions ?? []).reduce((sum, row) => sum + Math.round(Number(row.local_amount) * 100), 0);
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["Conference due", conferenceDue],
          ["District due", districtDue],
          ["Local kept", localDue],
        ].map(([label, amount]) => (
          <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-slate-600 dark:text-slate-300">{label}</p>
            <p className="mt-2 text-xl font-bold text-[#D4AF37]">{formatGhs(Number(amount))}</p>
          </article>
        ))}
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 font-semibold dark:border-slate-800">Districts</div>
        {(districts ?? []).length === 0 ? <p className="p-4">No districts have been registered.</p> : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {districts?.map((district) => (
              <div key={district.id} className="flex items-center justify-between p-4">
                <div><p className="font-medium">{district.name}</p><p className="text-slate-500">{district.code}</p></div>
                <span className={district.is_active ? "text-green-700 dark:text-green-300" : "text-slate-500"}>{district.is_active ? "Active" : "Inactive"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
