import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  requestId: z.string().uuid(),
  approve: z.boolean(),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid review." }, { status: 400 });
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, is_active").eq("id", userData.user.id).maybeSingle();
    if (profileError || !profile?.is_active || !["district","conference"].includes(profile.role))
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    const { error } = await supabase.rpc("review_member_request", {
      p_request_id: parsed.data.requestId,
      p_approve: parsed.data.approve,
      p_note: parsed.data.note ?? null,
    });
    if (error) return NextResponse.json({ error: "Unable to review request." }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to review request." }, { status: 500 });
  }
}
