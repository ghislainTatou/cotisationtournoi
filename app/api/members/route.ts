import { NextResponse } from "next/server";
import { getCategories } from "@/lib/server/data";
import { db, errorResponse, readJson } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";
import { readSession } from "@/lib/server/session";
import { isValidPhone, normalizePhone } from "@/lib/utils";
import type { Role } from "@/lib/types";

interface CreateBody {
  fullName?: string;
  phone?: string;
  categoryId?: string;
  role?: Role;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const user = await readSession();
    if (user?.role !== "admin") return errorResponse("Accès réservé à l'administrateur.", 403);

    const body = await readJson<CreateBody>(request);
    const fullName = body?.fullName?.trim() ?? "";
    const phone = normalizePhone(body?.phone ?? "");
    const categoryId = body?.categoryId?.trim() || null;

    if (fullName.length < 2) return errorResponse("Le nom est trop court.", 400);
    if (!isValidPhone(phone)) return errorResponse("Numéro de téléphone invalide.", 400);

    const categories = await getCategories();
    if (categoryId && !categories.some((c) => c.id === categoryId)) {
      return errorResponse("Catégorie introuvable.", 400);
    }

    const { data, error } = await db()
      .from("members")
      .insert({
        full_name: fullName,
        phone,
        category_id: categoryId,
        role: body?.role === "admin" ? "admin" : "member",
        password_hash: await hashPassword(body?.password?.trim() || phone),
      })
      .select("id, phone, full_name, role, category_id")
      .single();

    if (error) {
      if (error.code === "23505") return errorResponse("Ce numéro de téléphone existe déjà.", 409);
      throw error;
    }

    return NextResponse.json({ member: data }, { status: 201 });
  } catch (error) {
    console.error("[members:create]", error);
    return errorResponse(error instanceof Error ? error.message : "Erreur serveur.", 500);
  }
}
