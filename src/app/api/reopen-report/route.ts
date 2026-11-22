import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  reportId: z.string().uuid(),
  reason: z.string().trim().min(10).max(500),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "A reopen reason of at least 10 characters is required." }, { status: 400 });
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, is_active").eq("id", userData.user.id).maybeSingle();
    if (profileError || !profile?.is_active || !["district","conference"].includes(profile.role))
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    const { error } = await supabase.rpc("reopen_weekly_report", {
      p_report_id: parsed.data.reportId,
      p_reason: parsed.data.reason,
    });
    if (error) return NextResponse.json({ error: "Unable to reopen report." }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to reopen report." }, { status: 500 });
  }
}
