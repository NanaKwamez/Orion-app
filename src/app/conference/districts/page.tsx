export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DistrictsPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile) return null;
  const supabase = await createClient();
  const { data: districts, error: dataError } = await supabase
    .from("districts").select("id, name, code, is_active").order("name");
  if (dataError) return <p role="alert" className="text-red-700">Unable to load districts.</p>;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-semibold">Districts</h2>
      {districts?.length ? (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {districts.map((district) => <div key={district.id} className="py-3"><strong>{district.name}</strong> — {district.code}</div>)}
        </div>
      ) : <p>No districts.</p>}
    </section>
  );
}
