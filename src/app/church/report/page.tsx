export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import WeeklyGrid from "@/components/church/weekly-grid";

type MemberRow = { id: string; full_name: string; member_number: string | null };

export default async function WeeklyReportPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile?.church_id) return null;
  const supabase = await createClient();
  const accra = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Accra", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date());
  const getPart = (type: "year"|"month"|"day") => accra.find((part) => part.type === type)?.value ?? "";
  const today = new Date(`${getPart("year")}-${getPart("month")}-${getPart("day")}T12:00:00Z`);
  today.setUTCDate(today.getUTCDate() - today.getUTCDay());
  if (today.getUTCDay() !== 6) today.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 1) % 7));
  const sabbathDate = `${today.getUTCFullYear()}-${String(today.getUTCMonth()+1).padStart(2,"0")}-${String(today.getUTCDate()).padStart(2,"0")}`;

  const { data: existing, error: existingError } = await supabase
    .from("weekly_reports").select("id, sabbath_date, status, loose_offering, sabbath_school_offering, notes")
    .eq("church_id", profile.church_id).eq("sabbath_date", sabbathDate).maybeSingle();
  if (existingError) return <p role="alert" className="text-red-700">Unable to load the weekly report.</p>;

  let reportId = existing?.id;
  if (!existing) {
    const id = crypto.randomUUID();
    const { error: insertError } = await supabase.from("weekly_reports").insert({
      id, church_id: profile.church_id, sabbath_date: sabbathDate, status: "draft", loose_offering: 0,
      sabbath_school_offering: 0, created_by: profile.id,
    });
    if (insertError) return <p role="alert" className="text-red-700">Unable to start the report.</p>;
    reportId = id;
  }

  const { data: members, error: membersError } = await supabase
    .from("members").select("id, full_name, member_number").eq("church_id", profile.church_id).eq("status", "active").order("full_name");
  const { data: rules, error: rulesError } = await supabase
    .from("distribution_rules").select("contribution_type, conference_pct, district_pct, local_pct, effective_from")
    .lte("effective_from", sabbathDate).order("effective_from", { ascending: false });
  if (membersError || rulesError) return <p role="alert" className="text-red-700">Unable to load report inputs.</p>;

  const latestRules = ["tithe","systematic","thanksgiving","loose","sabbath_school"].map((type) =>
    rules?.find((rule) => rule.contribution_type === type),
  ).filter((rule) => rule !== undefined);

  return <WeeklyGrid
    reportId={reportId}
    churchId={profile.church_id}
    sabbathDate={sabbathDate}
    members={(members ?? []) as MemberRow[]}
    initialLoose={existing ? Number(existing.loose_offering) : 0}
    initialSabbath={existing ? Number(existing.sabbath_school_offering) : 0}
    status={existing?.status ?? "draft"}
    rules={latestRules}
  />;
}
