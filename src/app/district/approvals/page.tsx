export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ApprovalsPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile?.district_id) return null;
  const supabase = await createClient();
  const { data: churches } = await supabase.from("churches").select("id").eq("district_id", profile.district_id);
  const ids = (churches ?? []).map((church) => church.id);
  const { data: requests, error: dataError } = await supabase
    .from("member_change_requests")
    .select("id, church_id, member_id, request_type, reason, status, requested_at")
    .in("church_id", ids).eq("status", "pending").order("requested_at", { ascending: false });
  if (dataError) return <p role="alert" className="text-red-700">Unable to load approvals.</p>;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 className="font-semibold">Pending approvals</h2>
    {requests?.length ? <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{requests.map((request) =>
      <div key={request.id} className="py-3"><strong>{request.request_type}</strong><p className="mt-1 text-slate-600 dark:text-slate-300">{request.reason}</p></div>
    )}</div> : <p className="mt-3">No pending requests.</p>}
  </section>;
}
