export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DistrictChurchesPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile?.district_id) return null;
  const supabase = await createClient();
  const { data: churches, error: dataError } = await supabase
    .from("churches").select("id, name, code, location, is_active").eq("district_id", profile.district_id).order("name");
  if (dataError) return <p role="alert" className="text-red-700">Unable to load churches.</p>;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 className="font-semibold">District churches</h2>
    <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{churches?.map((church) =>
      <div key={church.id} className="py-3"><strong>{church.name}</strong><p className="text-slate-600 dark:text-slate-300">{church.code}{church.location ? ` · ${church.location}` : ""}</p></div>
    )}</div>
  </section>;
}
