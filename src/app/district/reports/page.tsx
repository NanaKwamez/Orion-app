export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DistrictReportsPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile?.district_id) return null;
  const supabase = await createClient();
  const { data: churches } = await supabase.from("churches").select("id").eq("district_id", profile.district_id);
  const ids = (churches ?? []).map((church) => church.id);
  const { data: reports, error: dataError } = await supabase
    .from("weekly_reports").select("id, church_id, sabbath_date, status, submitted_at")
    .in("church_id", ids).order("sabbath_date", { ascending: false }).limit(100);
  if (dataError) return <p role="alert" className="text-red-700">Unable to load reports.</p>;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 className="font-semibold">District reports</h2>
    {reports?.length ? <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{reports.map((report) =>
      <div key={report.id} className="flex justify-between py-3"><span>{report.sabbath_date}</span><span>{report.status}</span></div>
    )}</div> : <p className="mt-3">No reports.</p>}
  </section>;
}
