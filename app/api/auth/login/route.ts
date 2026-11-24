import { NextResponse } from "next/server";
import { db, errorResponse, readJson } from "@/lib/server/db";
import { ensureAdminAccount } from "@/lib/server/data";
import { verifyPassword } from "@/lib/server/password";
import { attachSession } from "@/lib/server/session";
import { isValidPhone, normalizePhone } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";

interface LoginBody {
  phone?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = await readJson<LoginBody>(request);
    if (!body) return errorResponse("Données invalides.", 400);

    const phone = normalizePhone(body.phone || "");
    if (!isValidPhone(phone)) {
      return errorResponse("Numéro de téléphone invalide.", 400);
    }

    await ensureAdminAccount();

    const { data: member, error } = await db()
      .from("members")
      .select("id, phone, full_name, role, password_hash")
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;
    if (!member) return errorResponse("Numéro ou mot de passe incorrect.", 401);

    // Mot de passe par défaut = numéro de téléphone.
    const password = body.password?.trim() ? body.password : phone;
    const ok = await verifyPassword(password, String(member.password_hash));
    if (!ok) return errorResponse("Numéro ou mot de passe incorrect.", 401);

    const user: SessionUser = {
      id: String(member.id),
      phone: String(member.phone),
      fullName: String(member.full_name),
      role: member.role === "admin" ? "admin" : "member",
    };

    return attachSession(NextResponse.json({ user }), user);
  } catch (error) {
    console.error("[login]", error);
    return errorResponse(error instanceof Error ? error.message : "Erreur de connexion.", 500);
  }
}
