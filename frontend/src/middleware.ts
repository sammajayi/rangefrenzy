import { NextResponse, type NextRequest } from "next/server";

const ROOT_DOMAIN = "rangefrenzy.xyz";
const ADMIN_HOST = "admin.rangefrenzy.xyz";
const APEX_HOSTS = ["rangefrenzy.xyz", "www.rangefrenzy.xyz"];

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const { pathname, search } = req.nextUrl;
  const isProdDomain = host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`);

  // admin.rangefrenzy.xyz → serve the /admin page at the subdomain's root.
  if (host === ADMIN_HOST) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL(`/admin${search}`, req.url));
    }
    return NextResponse.next();
  }

  // Visiting /admin on any other rangefrenzy.xyz (sub)domain → send to admin.rangefrenzy.xyz.
  if (isProdDomain && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    const rest = pathname.slice("/admin".length);
    return NextResponse.redirect(`https://${ADMIN_HOST}${rest}${search}`);
  }

  // rangefrenzy.xyz / www.rangefrenzy.xyz → landing page.
  if (APEX_HOSTS.includes(host) && pathname === "/") {
    return NextResponse.rewrite(new URL(`/landing${search}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
