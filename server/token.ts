import crypto from "node:crypto";

/** Jeton signé (type JWT, HMAC-SHA256) — sans dépendance externe. Pur et testable (horloge injectée). */

export interface TokenPayload {
  user: string;
  role: string;
  exp: number; // secondes epoch
}

const b64u = (b: Buffer): string => b.toString("base64url");

export function signToken(payload: { user: string; role: string }, secret: string, nowSec: number, ttlSec = 86400): string {
  const body: TokenPayload = { user: payload.user, role: payload.role, exp: nowSec + ttlSec };
  const data = b64u(Buffer.from(JSON.stringify(body)));
  const sig = b64u(crypto.createHmac("sha256", secret).update(data).digest());
  return `${data}.${sig}`;
}

export function verifyToken(token: string, secret: string, nowSec: number): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expSig = b64u(crypto.createHmac("sha256", secret).update(data).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(data, "base64url").toString()) as TokenPayload;
    if (typeof body.exp !== "number" || body.exp < nowSec) return null;
    return body;
  } catch {
    return null;
  }
}
