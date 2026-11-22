import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createWeeklyReportPdf } from "@/lib/pdf";

export const runtime = "nodejs";

const schema = z.object({ id: z.string().uuid() });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const parsed = schema.safeParse(await context.params);
    if (!parsed.success) return NextResponse.json({ error: "Invalid report." }, { status: 400 });
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, is_active").eq("id", userData.user.id).maybeSingle();
    if (profileError || !profile?.is_active || !["conference","district","church"].includes(profile.role))
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });

    const { data: report, error: reportError } = await supabase
      .from("weekly_reports").select("id, church_id, sabbath_date, status").eq("id", parsed.data.id).maybeSingle();
    if (reportError || !report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const { data: church, error: churchError } = await supabase
      .from("churches").select("name").eq("id", report.church_id).maybeSingle();
    if (churchError || !church) return NextResponse.json({ error: "Unable to prepare report." }, { status: 400 });
    const { data: members, error: membersError } = await supabase
      .from("member_contributions").select("member_id, tithe, systematic, thanksgiving").eq("report_id", report.id);
    if (membersError) return NextResponse.json({ error: "Unable to prepare report." }, { status: 400 });
    const memberIds = (members ?? []).map((row) => row.member_id);
    const { data: memberRows } = memberIds.length
      ? await supabase.from("members").select("id, full_name").in("id", memberIds)
      : { data: [] };
    const names = new Map((memberRows ?? []).map((member) => [member.id, member.full_name]));
    const doc = createWeeklyReportPdf(
      church.name,
      report.sabbath_date,
      (members ?? []).map((row) => ({
        memberName: names.get(row.member_id) ?? "Member",
        tithe: Math.round(Number(row.tithe) * 100),
        systematic: Math.round(Number(row.systematic) * 100),
        thanksgiving: Math.round(Number(row.thanksgiving) * 100),
      })),
    );
    await supabase.rpc("log_export", {
      p_entity_type: "weekly_report",
      p_entity_id: report.id,
      p_details: { format: "pdf" },
    });
    return new NextResponse(Buffer.from(doc.output("arraybuffer")), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="weekly-report.pdf"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to export report." }, { status: 500 });
  }
}
