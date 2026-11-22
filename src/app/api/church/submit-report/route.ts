import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ reportId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid report." }, { status: 400 });
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, church_id, is_active").eq("id", userData.user.id).maybeSingle();
    if (profileError || !profile?.is_active || profile.role !== "church")
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    const { data: report, error: reportError } = await supabase
      .from("weekly_reports").select("church_id").eq("id", parsed.data.reportId).maybeSingle();
    if (reportError || report?.church_id !== profile.church_id)
      return NextResponse.json({ error: "Report is outside your church." }, { status: 403 });
    const { data, error } = await supabase.rpc("submit_weekly_report", { p_report_id: parsed.data.reportId });
    if (error) return NextResponse.json({ error: "Unable to submit report." }, { status: 400 });
    return NextResponse.json({ split: data });
  } catch {
    return NextResponse.json({ error: "Unable to submit report." }, { status: 500 });
  }
}
