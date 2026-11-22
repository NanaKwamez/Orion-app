import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9-]+$/),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid district details." }, { status: 400 });
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, is_active").eq("id", userData.user.id).maybeSingle();
    if (profileError || !profile?.is_active || profile.role !== "conference")
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    const { data: district, error } = await supabase.from("districts").insert({
      name: parsed.data.name,
      code: parsed.data.code.toUpperCase(),
      is_active: true,
      created_by: userData.user.id,
    }).select("id, name, code, is_active").single();
    if (error) return NextResponse.json({ error: "Unable to register district." }, { status: 400 });
    await supabase.rpc("log_audit", {
      p_action: "district_created",
      p_entity_type: "district",
      p_entity_id: district.id,
      p_district_id: district.id,
      p_details: { name: district.name },
    });
    return NextResponse.json({ district });
  } catch {
    return NextResponse.json({ error: "Unable to register district." }, { status: 500 });
  }
}
