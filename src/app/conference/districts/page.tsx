export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import DistrictManager from "@/components/conference/district-manager";

export default async function DistrictsPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile) return null;
  const supabase = await createClient();
  const { data: districts, error: dataError } = await supabase
    .from("districts").select("id, name, code, is_active").order("name");
  if (dataError) return <p role="alert" className="text-red-700">Unable to load districts.</p>;
  return <DistrictManager initialDistricts={districts ?? []} />;
}
