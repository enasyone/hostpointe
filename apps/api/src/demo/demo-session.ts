// DEMO ONLY. Signed session tokens for the development sign-in. Not a real identity system.
// Real sign-in (Microsoft Entra External ID, ADR-0002) replaces this before any real attendee uses the app.
import { createHmac, timingSafeEqual } from "node:crypto";

export interface DemoSession {
  userId: string;
  tenantId: string;
  exp: number; // seconds since 1 Jan 1970
}

// The people created by database/seed/seed.mjs (fake data). DEMO sign-in can only become one of them.
export const DEMO_USERS: Record<string, { userId: string; tenantId: string; label: string }> = {
  "demo-organiser-1": { userId: "00000000-0000-4000-8000-000000001002", tenantId: "00000000-0000-4000-8000-000000001001", label: "DEMO Organiser One" },
  "demo-organiser-2": { userId: "00000000-0000-4000-8000-000000002002", tenantId: "00000000-0000-4000-8000-000000002001", label: "DEMO Organiser Two" },
};

const b64 = (b: Buffer) => b.toString("base64url");
const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest();

export function issueToken(s: DemoSession, secret: string): string {
  const payload = b64(Buffer.from(JSON.stringify(s)));
  return `${payload}.${b64(sign(payload, secret))}`;
}

export function verifyToken(token: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): DemoSession | null {
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const expected = sign(payload, secret);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as DemoSession;
    return typeof s.exp === "number" && s.exp > nowSeconds && s.userId && s.tenantId ? s : null;
  } catch {
    return null;
  }
}
