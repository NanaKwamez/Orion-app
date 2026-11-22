export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function MembersPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile?.church_id) return null;
  const supabase = await createClient();
  const { data: members, error: dataError } = await supabase
    .from("members").select("id, full_name, phone, gender, member_number, status")
    .eq("church_id", profile.church_id).order("full_name");
  if (dataError) return <p role="alert" className="text-red-700">Unable to load members.</p>;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-semibold">Members</h2>
      {members?.length ? <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{members.map((member) =>
        <div key={member.id} className="py-3"><strong>{member.full_name}</strong><p className="text-slate-600 dark:text-slate-300">{member.status}{member.member_number ? ` · ${member.member_number}` : ""}</p></div>
      )}</div> : <p className="mt-3">No members.</p>}
    </section>
  );
}
