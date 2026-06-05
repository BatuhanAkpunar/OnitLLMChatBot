import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Next.js 16 renamed `middleware` to `proxy` (runs on the Node.js runtime).
 * This refreshes the Supabase session on every navigation and redirects
 * unauthenticated users to /login.
 */
export async function proxy(request: NextRequest) {
  // When Supabase isn't configured (local dev placeholders), skip auth entirely.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run logic between createServerClient and getClaims().
  // getClaims() verifies the JWT (locally via JWKS or via the Auth server) and
  // refreshes the session cookie when needed.
  let isAuthed = false;
  try {
    const { data } = await supabase.auth.getClaims();
    isAuthed = Boolean(data?.claims);
  } catch {
    isAuthed = false;
  }

  const { pathname } = request.nextUrl;
  // The landing ("/") is public: anyone can compose a prompt; sign-in is only
  // required to actually get a result.
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth");
  // API routes authenticate themselves and return proper status codes. They must
  // NOT be redirected: a 307 on a streaming fetch POST gets followed to an HTML
  // page (405) and surfaces as a generic "something went wrong" in the client.
  const isApi = pathname.startsWith("/api");

  if (!isAuthed && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
