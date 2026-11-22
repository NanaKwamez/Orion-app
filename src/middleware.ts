import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const { data: userData, error } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (error || !userData.user) {
    if (path === "/login") return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password, is_active")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile?.is_active) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (profile.must_change_password && path !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }
  const rolePrefixes: Record<string, string> = {
    conference: "/conference",
    district: "/district",
    church: "/church",
  };
  if (path === "/" || path.startsWith("/login")) {
    return NextResponse.redirect(new URL(rolePrefixes[profile.role] ?? "/", request.url));
  }
  const prefix = rolePrefixes[profile.role];
  if (path.startsWith("/conference") && profile.role !== "conference") {
    return NextResponse.redirect(new URL(prefix, request.url));
  }
  if (path.startsWith("/district") && profile.role !== "district") {
    return NextResponse.redirect(new URL(prefix, request.url));
  }
  if (path.startsWith("/church") && profile.role !== "church") {
    return NextResponse.redirect(new URL(prefix, request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|sw.js).*)"],
};
