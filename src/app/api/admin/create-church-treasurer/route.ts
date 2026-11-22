import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.string().email().max(254),
  fullName: z.string().trim().min(2).max(100),
  churchId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid account details." }, { status: 400 });
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, district_id, is_active").eq("id", userData.user.id).maybeSingle();
    if (profileError || profile?.role !== "district" || !profile.is_active || !profile.district_id)
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    const { data: church, error: churchError } = await supabase
      .from("churches").select("id").eq("id", parsed.data.churchId).eq("district_id", profile.district_id).maybeSingle();
    if (churchError || !church) return NextResponse.json({ error: "Church is outside your district." }, { status: 403 });

    const admin = createAdminClient();
    const password = crypto.randomUUID();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.fullName },
    });
    if (createError || !created.user) return NextResponse.json({ error: "Unable to create account." }, { status: 400 });
    const { error: profileInsertError } = await admin.from("profiles").insert({
      id: created.user.id,
      full_name: parsed.data.fullName,
      role: "church",
      church_id: parsed.data.churchId,
      is_active: true,
      must_change_password: true,
    });
    if (profileInsertError) return NextResponse.json({ error: "Unable to link account." }, { status: 400 });
    return NextResponse.json({ temporaryPassword: password });
  } catch {
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
