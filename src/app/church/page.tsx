export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ChurchHome() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile?.church_id) return null;
  const supabase = await createClient();
  const { data: reports, error: dataError } = await supabase
    .from("weekly_reports").select("id, sabbath_date, status, loose_offering, sabbath_school_offering")
    .eq("church_id", profile.church_id).order("sabbath_date", { ascending: false }).limit(4);
  if (dataError) return <p role="alert" className="text-red-700">Unable to load this Sabbath&apos;s report.</p>;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-[#0B1B3A] p-5 text-white dark:bg-sky-950">
        <p className="text-slate-200">This Sabbath</p>
        <p className="mt-2 text-xl font-semibold">{reports?.[0]?.status === "submitted" ? "Report submitted" : "No submitted report"}</p>
        <a href="/church/report" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-white px-4 font-semibold text-[#0B1B3A]">Start this week&apos;s report</a>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Last 4 weeks</h2>
        {reports?.length ? <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{reports.map((report) =>
          <div key={report.id} className="flex justify-between py-3"><span>{report.sabbath_date}</span><span>{report.status}</span></div>
        )}</div> : <p className="mt-3">No report history.</p>}
      </section>
    </div>
  );
}
