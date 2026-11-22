import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ProfileRole = "conference" | "district" | "church";

export type Profile = {
  id: string;
  full_name: string;
  role: ProfileRole;
  district_id: string | null;
  church_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
};

export async function getAuthenticatedProfile(): Promise<{ profile: Profile | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) return { profile: null, error: "Unable to verify your account." };
    if (!userData.user) return { profile: null, error: null };
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, district_id, church_id, is_active, must_change_password")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (error) return { profile: null, error: "Unable to load your profile." };
    return { profile: data as Profile | null, error: null };
  } catch {
    return { profile: null, error: "Unable to verify your account." };
  }
}
