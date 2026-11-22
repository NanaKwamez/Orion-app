import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  districtId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9-]+$/),
  location: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid church details." }, { status: 400 });
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, district_id, is_active").eq("id", userData.user.id).maybeSingle();
    if (profileError || !profile?.is_active || profile.role !== "district" || profile.district_id !== parsed.data.districtId)
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    const { data: church, error } = await supabase.from("churches").insert({
      district_id: parsed.data.districtId,
      name: parsed.data.name,
      code: parsed.data.code.toUpperCase(),
      location: parsed.data.location || null,
      is_active: true,
      created_by: userData.user.id,
    }).select("id, name, code, location, is_active").single();
    if (error) return NextResponse.json({ error: "Unable to register church." }, { status: 400 });
    await supabase.rpc("log_audit", {
      p_action: "church_created",
      p_entity_type: "church",
      p_entity_id: church.id,
      p_church_id: church.id,
      p_district_id: parsed.data.districtId,
      p_details: { name: church.name },
    });
    return NextResponse.json({ church });
  } catch {
    return NextResponse.json({ error: "Unable to register church." }, { status: 500 });
  }
}
