import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  memberId: z.string().uuid(),
  reason: z.string().trim().min(10).max(500),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid withdrawal request." }, { status: 400 });
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, is_active").eq("id", userData.user.id).maybeSingle();
    if (profileError || !profile?.is_active || profile.role !== "church")
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    const { data, error } = await supabase.rpc("request_member_withdraw", {
      p_member_id: parsed.data.memberId,
      p_reason: parsed.data.reason,
    });
    if (error) return NextResponse.json({ error: "Unable to submit withdrawal." }, { status: 400 });
    return NextResponse.json({ id: data });
  } catch {
    return NextResponse.json({ error: "Unable to submit withdrawal." }, { status: 500 });
  }
}
