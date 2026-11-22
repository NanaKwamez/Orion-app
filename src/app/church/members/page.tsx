export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import MemberManager from "@/components/church/member-manager";

export default async function MembersPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile?.church_id) return null;
  const supabase = await createClient();
  const { data: members, error: dataError } = await supabase
    .from("members").select("id, full_name, phone, gender, member_number, status")
    .eq("church_id", profile.church_id).order("full_name");
  if (dataError) return <p role="alert" className="text-red-700">Unable to load members.</p>;
  return <MemberManager churchId={profile.church_id} initialMembers={members ?? []} />;
}
