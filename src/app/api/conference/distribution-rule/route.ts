import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  contributionType: z.enum(["tithe","systematic","thanksgiving","loose","sabbath_school"]),
  conferencePct: z.number().min(0).max(100),
  districtPct: z.number().min(0).max(100),
  localPct: z.number().min(0).max(100),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid rule values." }, { status: 400 });
    if (parsed.data.conferencePct + parsed.data.districtPct + parsed.data.localPct !== 100)
      return NextResponse.json({ error: "Percentages must total 100." }, { status: 400 });
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, is_active").eq("id", userData.user.id).maybeSingle();
    if (profileError || !profile?.is_active || profile.role !== "conference")
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    const { data: rule, error } = await supabase.from("distribution_rules").insert({
      contribution_type: parsed.data.contributionType,
      conference_pct: parsed.data.conferencePct,
      district_pct: parsed.data.districtPct,
      local_pct: parsed.data.localPct,
      effective_from: parsed.data.effectiveFrom,
      created_by: userData.user.id,
    }).select("id, contribution_type, conference_pct, district_pct, local_pct, effective_from").single();
    if (error) return NextResponse.json({ error: "Unable to add rule version." }, { status: 400 });
    await supabase.rpc("log_audit", {
      p_action: "distribution_rule_change",
      p_entity_type: "distribution_rule",
      p_entity_id: rule.id,
      p_details: { contribution_type: rule.contribution_type, effective_from: rule.effective_from },
    });
    return NextResponse.json({ rule });
  } catch {
    return NextResponse.json({ error: "Unable to add rule version." }, { status: 500 });
  }
}
