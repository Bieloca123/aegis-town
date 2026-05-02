import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/signin", "/privacy-policy"]);
const PASS_THROUGH_PREFIXES = ["/auth/", "/_next/", "/api/"];

function isAssetLike(path: string): boolean {
  return /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|json)$/.test(path);
}

export const updateSession = async (request: NextRequest) => {
  try {
    let response = NextResponse.next({
      request: { headers: request.headers },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: "", ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value: "", ...options });
          },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();
    const path = request.nextUrl.pathname;

    if (PASS_THROUGH_PREFIXES.some((p) => path.startsWith(p)) || isAssetLike(path)) {
      return response;
    }

    if (!user) {
      if (PUBLIC_PATHS.has(path)) return response;
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_member, onboarding_complete")
      .eq("id", user.id)
      .single();

    const isMember = profile?.is_member === true;
    const onboarded = profile?.onboarding_complete === true;
    const realmId = process.env.NEXT_PUBLIC_DEFAULT_REALM_ID;

    if (!isMember) {
      if (path === "/welcome") return response;
      return NextResponse.redirect(new URL("/welcome", request.url));
    }

    if (!onboarded) {
      if (path === "/onboarding") return response;
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    if (realmId && (path === "/" || path === "/signin" || path === "/welcome" || path === "/onboarding" || path === "/app")) {
      return NextResponse.redirect(new URL(`/play/${realmId}`, request.url));
    }

    return response;
  } catch (e) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }
};
