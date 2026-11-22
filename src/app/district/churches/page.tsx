export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ChurchManager from "@/components/district/church-manager";

export default async function DistrictChurchesPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile?.district_id) return null;
  const supabase = await createClient();
  const { data: churches, error: dataError } = await supabase
    .from("churches").select("id, name, code, location, is_active").eq("district_id", profile.district_id).order("name");
  if (dataError) return <p role="alert" className="text-red-700">Unable to load churches.</p>;
  return <ChurchManager districtId={profile.district_id} initialChurches={(churches ?? []).map((church) => ({
    id: church.id,
    name: church.name,
    code: church.code,
    location: church.location,
    is_active: church.is_active,
  }))} />;
}
