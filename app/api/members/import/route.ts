import { NextResponse } from "next/server";
import { getCategories } from "@/lib/server/data";
import { db, errorResponse, readJson } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";
import { readSession } from "@/lib/server/session";
import { isValidPhone, normalizePhone } from "@/lib/utils";

interface Body {
  lines?: string;
}

export async function POST(request: Request) {
  try {
    const user = await readSession();
    if (user?.role !== "admin") return errorResponse("Accès réservé à l'administrateur.", 403);

    const body = await readJson<Body>(request);
    const lines = (body?.lines ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !/^(tel|téléphone|phone|nom)/i.test(line.split(/[;,\t]/)[0]));

    if (!lines.length) return errorResponse("Aucune ligne à importer.", 400);

    const categories = await getCategories();
    const categoryByName = new Map(
      categories.map((c) => [c.name.toLocaleLowerCase("fr-FR"), c.id]),
    );

    let created = 0;
    const errors: string[] = [];

    for (const [index, line] of lines.entries()) {
      const parts = line.split(/[;,\t]/).map((p) => p.trim());
      const phone = normalizePhone(parts[0] ?? "");
      const fullName = parts[1] || `Membre ${index + 1}`;
      const categoryRaw = (parts[2] ?? "").toLocaleLowerCase("fr-FR");
      const categoryId = categories.find((c) => c.id === categoryRaw)?.id ?? categoryByName.get(categoryRaw) ?? null;

      if (!isValidPhone(phone)) {
        errors.push(`Ligne ${index + 1} : téléphone invalide (${parts[0] ?? ""}).`);
        continue;
      }

      const { error } = await db().from("members").insert({
        phone,
        full_name: fullName,
        category_id: categoryId,
        password_hash: await hashPassword(phone),
        role: "member",
      });

      if (error) {
        errors.push(`Ligne ${index + 1} (${phone}) : ${error.code === "23505" ? "déjà existant" : error.message}.`);
      } else {
        created += 1;
      }
    }

    return NextResponse.json({ created, errors });
  } catch (error) {
    console.error("[members:import]", error);
    return errorResponse(error instanceof Error ? error.message : "Erreur serveur.", 500);
  }
}
