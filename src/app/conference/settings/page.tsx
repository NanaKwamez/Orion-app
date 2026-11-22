export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import RuleManager from "@/components/conference/rule-manager";

export default async function SettingsPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile) return null;
  const supabase = await createClient();
  const { data: rules, error: dataError } = await supabase
    .from("distribution_rules")
    .select("id, contribution_type, conference_pct, district_pct, local_pct, effective_from")
    .order("effective_from", { ascending: false });
  if (dataError) return <p role="alert" className="text-red-700">Unable to load distribution rules.</p>;
  return <RuleManager initialRules={rules ?? []} />;
}
