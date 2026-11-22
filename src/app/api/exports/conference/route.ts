import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/exports";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, is_active").eq("id", userData.user.id).maybeSingle();
    if (profileError || !profile?.is_active || profile.role !== "conference")
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    const { data: reports, error } = await supabase
      .from("weekly_reports").select("church_id, sabbath_date, status").order("sabbath_date", { ascending: false }).limit(500);
    if (error) return NextResponse.json({ error: "Unable to prepare export." }, { status: 400 });
    const csv = toCsv(["Church ID","Sabbath","Status"], (reports ?? []).map((report) =>
      [report.church_id, report.sabbath_date, report.status],
    ));
    await supabase.rpc("log_export", {
      p_entity_type: "conference_reports",
      p_details: { format: "csv" },
    });
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="conference-reports.csv"' },
    });
  } catch {
    return NextResponse.json({ error: "Unable to export." }, { status: 500 });
  }
}
