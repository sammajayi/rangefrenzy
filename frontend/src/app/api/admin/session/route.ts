import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  createSessionToken,
  isAdminRequest,
  verifyDeployerSignature,
} from "@/lib/admin-session";

/** Is the caller signed in as admin? */
export async function GET(req: NextRequest) {
  return NextResponse.json({ authenticated: isAdminRequest(req) });
}

/** Exchange a deployer-wallet signature for an httpOnly admin session cookie. */
export async function POST(req: NextRequest) {
  try {
    const { message, signature } = await req.json();
    if (typeof message !== "string" || typeof signature !== "string") {
      return NextResponse.json({ error: "message and signature required" }, { status: 400 });
    }

    if (!(await verifyDeployerSignature(message, signature))) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const token = createSessionToken();
    if (!token) {
      console.error("admin session: no ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY configured");
      return NextResponse.json({ error: "Admin sign-in is not configured" }, { status: 500 });
    }

    const res = NextResponse.json({ authenticated: true });
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("admin session error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ authenticated: false });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
