export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatGhs } from "@/lib/money";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile?.church_id) return null;
  const supabase = await createClient();
  const { data: report, error: reportError } = await supabase
    .from("weekly_reports").select("id, sabbath_date, status, notes")
    .eq("id", id).eq("church_id", profile.church_id).maybeSingle();
  if (reportError) return <p role="alert" className="text-red-700">Unable to load report.</p>;
  if (!report) return <p role="alert">Report not found.</p>;
  const { data: distributions, error: distributionsError } = await supabase
    .from("report_distributions").select("contribution_type, total_amount, conference_amount, district_amount, local_amount")
    .eq("report_id", report.id);
  if (distributionsError) return <p role="alert" className="text-red-700">Unable to load distribution.</p>;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-lg font-semibold">{report.sabbath_date}</h2>
    {distributions?.map((row) =>
      <div key={row.contribution_type} className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-4">
        <strong>{row.contribution_type}</strong>
        <span>Total {formatGhs(Math.round(Number(row.total_amount)*100))}</span>
        <span>Conference {formatGhs(Math.round(Number(row.conference_amount)*100))}</span>
        <span>District {formatGhs(Math.round(Number(row.district_amount)*100))}</span>
        <span>Local {formatGhs(Math.round(Number(row.local_amount)*100))}</span>
      </div>
    )}
  </section>;
}
