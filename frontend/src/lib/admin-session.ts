import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { verifyMessage } from "viem";
import { DEPLOYER_ADDRESS } from "@/lib/contracts";

export const ADMIN_COOKIE = "rf_admin";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

/** A signed sign-in message is only accepted for this long after it was issued. */
const SIGN_IN_WINDOW_MS = 5 * 60 * 1000;

/** Message the deployer wallet signs. Built on the client, parsed here. */
export function signInMessage(address: string, issuedAt: string): string {
  return `RangeFrenzy admin sign-in\nAddress: ${address.toLowerCase()}\nIssued: ${issuedAt}`;
}

function secret(): Buffer | null {
  const explicit = process.env.ADMIN_SESSION_SECRET;
  if (explicit) return Buffer.from(explicit);
  // No dedicated secret configured: derive one from the service-role key, which
  // is already server-only. The key itself is never exposed by this.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createHmac("sha256", serviceKey).update("rangefrenzy-admin-session").digest();
}

function sign(payload: string, key: Buffer): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createSessionToken(now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const payload = Buffer.from(JSON.stringify({ exp: now + ADMIN_SESSION_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

function tokenIsValid(token: string | undefined, now = Date.now()): boolean {
  const key = secret();
  if (!token || !key) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload, key);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > now;
  } catch {
    return false;
  }
}

export function isAdminRequest(req: NextRequest): boolean {
  return tokenIsValid(req.cookies.get(ADMIN_COOKIE)?.value);
}

/** Use at the top of a privileged route: `const denied = requireAdmin(req); if (denied) return denied;` */
export function requireAdmin(req: NextRequest): NextResponse | null {
  if (isAdminRequest(req)) return null;
  return NextResponse.json({ error: "Admin sign-in required" }, { status: 401 });
}

/** True only if `signature` was produced by the deployer wallet over a fresh, well-formed message. */
export async function verifyDeployerSignature(
  message: string,
  signature: string,
  now = Date.now()
): Promise<boolean> {
  const match = /^RangeFrenzy admin sign-in\nAddress: (0x[0-9a-f]{40})\nIssued: (.+)$/.exec(message);
  if (!match) return false;
  const [, address, issued] = match;
  if (address !== DEPLOYER_ADDRESS) return false;
  const issuedAt = Date.parse(issued);
  if (Number.isNaN(issuedAt) || Math.abs(now - issuedAt) > SIGN_IN_WINDOW_MS) return false;
  try {
    return await verifyMessage({
      address: DEPLOYER_ADDRESS,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}
