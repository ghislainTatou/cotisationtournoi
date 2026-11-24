import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { Role, SessionUser } from "@/lib/types";

const COOKIE_NAME = "cotisation_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload extends SessionUser {
  exp: number;
}

function secret(): string {
  return process.env.SESSION_SECRET || "dev-secret-a-changer-en-production";
}

function sign(payloadB64: string): string {
  return createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

function encode(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.id || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const payload = decode(store.get(COOKIE_NAME)?.value);
  if (!payload) return null;

  return {
    id: payload.id,
    phone: payload.phone,
    fullName: payload.fullName,
    role: payload.role,
  };
}

export function attachSession(response: NextResponse, user: SessionUser): NextResponse {
  const payload: SessionPayload = { ...user, exp: Date.now() + MAX_AGE_SECONDS * 1000 };
  response.cookies.set(COOKIE_NAME, encode(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return response;
}

export function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function requireUser(): Promise<SessionUser | null> {
  return readSession();
}

export function isAdmin(user: SessionUser | null): user is SessionUser & { role: "admin" } {
  return user?.role === ("admin" as Role);
}
