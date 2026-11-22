import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/exports";

const schema = z.object({ period: z.enum(["week","month","quarter","year","custom"]).default("week") });

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = schema.safeParse({ period: url.searchParams.get("period") ?? "week" });
    if (!parsed.success) return NextResponse.json({ error: "Invalid export period." }, { status: 400 });
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, district_id, is_active").eq("id", userData.user.id).maybeSingle();
    if (profileError || !profile?.is_active || profile.role !== "district" || !profile.district_id)
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    const { data: churches } = await supabase
      .from("churches").select("id, name").eq("district_id", profile.district_id);
    const ids = (churches ?? []).map((church) => church.id);
    const { data: reports, error: reportsError } = await supabase
      .from("weekly_reports").select("id, church_id, sabbath_date, status")
      .in("church_id", ids).order("sabbath_date", { ascending: false }).limit(500);
    if (reportsError) return NextResponse.json({ error: "Unable to prepare export." }, { status: 400 });
    const names = new Map((churches ?? []).map((church) => [church.id, church.name]));
    const csv = toCsv(["Church","Sabbath","Status"], (reports ?? []).map((report) =>
      [names.get(report.church_id) ?? "", report.sabbath_date, report.status],
    ));
    await supabase.rpc("log_export", {
      p_entity_type: "district_reports",
      p_details: { period: parsed.data.period },
    });
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="district-reports.csv"' },
    });
  } catch {
    return NextResponse.json({ error: "Unable to export." }, { status: 500 });
  }
}
