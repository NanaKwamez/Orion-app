export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ApprovalQueue from "@/components/district/approval-queue";

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
  return <ApprovalQueue initialRequests={requests ?? []} />;
}
