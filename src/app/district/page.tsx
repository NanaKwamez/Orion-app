export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DistrictDashboard() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile?.district_id) return null;
  const supabase = await createClient();
  const { data: churches, error: churchesError } = await supabase
    .from("churches").select("id, name, code, is_active").eq("district_id", profile.district_id).order("name");
  const { data: requests, error: requestsError } = await supabase
    .from("member_change_requests").select("id").eq("status", "pending");
  if (churchesError || requestsError) return <p role="alert" className="text-red-700">Unable to load district data.</p>;
  const churchIds = (churches ?? []).map((church) => church.id);
  const { data: reports, error: reportsError } = await supabase
    .from("weekly_reports").select("id, church_id, sabbath_date, status").in("church_id", churchIds).order("sabbath_date", { ascending: false }).limit(100);
  if (reportsError) return <p role="alert" className="text-red-700">Unable to load reports.</p>;
  const submitted = (reports ?? []).filter((report) => report.status === "submitted").length;
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p>Churches</p><p className="mt-2 text-xl font-bold">{churches?.length ?? 0}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p>Submitted reports</p><p className="mt-2 text-xl font-bold">{submitted}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p>Pending approvals</p><p className="mt-2 text-xl font-bold text-[#D4AF37]">{requests?.length ?? 0}</p></article>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">Churches</h2>
        <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{churches?.map((church) => (
          <div key={church.id} className="flex items-center justify-between py-3"><span>{church.name}</span><span className={church.is_active ? "text-green-700" : "text-slate-500"}>{church.is_active ? "Active" : "Inactive"}</span></div>
        ))}</div>
      </section>
    </div>
  );
}
