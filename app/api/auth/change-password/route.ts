import { NextResponse } from "next/server";
import { db, errorResponse, readJson } from "@/lib/server/db";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { readSession } from "@/lib/server/session";

interface Body {
  currentPassword?: string;
  newPassword?: string;
}

export async function POST(request: Request) {
  try {
    const user = await readSession();
    if (!user) return errorResponse("Non connecté.", 401);

    const body = await readJson<Body>(request);
    if (!body?.newPassword || body.newPassword.length < 6) {
      return errorResponse("Le nouveau mot de passe doit contenir au moins 6 caractères.", 400);
    }

    const { data: member, error: lookupError } = await db()
      .from("members")
      .select("password_hash")
      .eq("id", user.id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!member) return errorResponse("Membre introuvable.", 404);

    const current = body.currentPassword?.trim() || user.phone;
    if (!(await verifyPassword(current, String(member.password_hash)))) {
      return errorResponse("Mot de passe actuel incorrect.", 400);
    }

    const { error: updateError } = await db()
      .from("members")
      .update({ password_hash: await hashPassword(body.newPassword) })
      .eq("id", user.id);

    if (updateError) throw updateError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[change-password]", error);
    return errorResponse("Erreur lors du changement de mot de passe.", 500);
  }
}
