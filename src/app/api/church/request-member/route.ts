import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  churchId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  gender: z.enum(["male","female","other"]).optional(),
  memberNumber: z.string().trim().max(50).optional(),
  reason: z.string().trim().min(10).max(500),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid member request." }, { status: 400 });
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, church_id, is_active").eq("id", userData.user.id).maybeSingle();
    if (profileError || !profile?.is_active || profile.role !== "church" || profile.church_id !== parsed.data.churchId)
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    const { data, error } = await supabase.rpc("request_member_add", {
      p_church_id: parsed.data.churchId,
      p_full_name: parsed.data.fullName,
      p_phone: parsed.data.phone ?? null,
      p_gender: parsed.data.gender ?? null,
      p_member_number: parsed.data.memberNumber ?? null,
      p_reason: parsed.data.reason,
    });
    if (error) return NextResponse.json({ error: "Unable to submit member request." }, { status: 400 });
    return NextResponse.json({ id: data });
  } catch {
    return NextResponse.json({ error: "Unable to submit member request." }, { status: 500 });
  }
}
