export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatGhs } from "@/lib/money";

export default async function HistoryPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile?.church_id) return null;
  const supabase = await createClient();
  const { data: reports, error: dataError } = await supabase
    .from("weekly_reports").select("id, sabbath_date, status, loose_offering, sabbath_school_offering")
    .eq("church_id", profile.church_id).eq("status", "submitted").order("sabbath_date", { ascending: false });
  if (dataError) return <p role="alert" className="text-red-700">Unable to load history.</p>;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 className="font-semibold">Submitted reports</h2>
    {reports?.length ? <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{reports.map((report) =>
      <a href={`/church/history/${report.id}`} key={report.id} className="flex min-h-11 items-center justify-between py-3">
        <span>{report.sabbath_date}</span>
        <span className="flex items-center gap-3"><span>{formatGhs(Math.round((Number(report.loose_offering)+Number(report.sabbath_school_offering))*100))}</span><a href={`/api/exports/report/${report.id}/pdf`}>PDF</a></span>
      </a>
    )}</div> : <p className="mt-3">No submitted reports.</p>}
  </section>;
}
