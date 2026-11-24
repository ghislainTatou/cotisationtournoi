import { NextResponse } from "next/server";
import { buildAccounting, getManualTransactions, getMembers } from "@/lib/server/data";
import { db, errorResponse, readJson } from "@/lib/server/db";
import { readSession } from "@/lib/server/session";
import type { AccountingKind } from "@/lib/types";

interface CreateBody {
  kind?: string;
  label?: string;
  amount?: number | string;
  observation?: string;
}

export async function GET() {
  try {
    const user = await readSession();
    if (!user) return errorResponse("Non connecté.", 401);

    const [members, manual] = await Promise.all([getMembers(), getManualTransactions()]);
    return NextResponse.json(buildAccounting(members, manual.rows, manual.available));
  } catch (error) {
    console.error("[accounting:list]", error);
    return errorResponse(error instanceof Error ? error.message : "Erreur serveur.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await readSession();
    if (user?.role !== "admin") return errorResponse("Accès réservé à l'administrateur.", 403);

    const body = await readJson<CreateBody>(request);
    const kind = body?.kind;
    if (kind !== "income" && kind !== "expense") {
      return errorResponse("Type de mouvement invalide.", 400);
    }

    const label = body?.label?.trim() ?? "";
    if (label.length < 2) return errorResponse("Le libellé est trop court.", 400);

    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return errorResponse("Montant invalide.", 400);
    if (!Number.isInteger(amount)) return errorResponse("Le montant doit être un entier de FCFA.", 400);

    const observation = body?.observation?.trim() || null;
    const { error } = await db().from("transactions").insert({
      kind: kind as AccountingKind,
      label,
      amount,
      observation,
      recorded_by: user.id,
    });

    if (error) {
      if (
        error.code === "42P01" ||
        error.code === "PGRST205" ||
        /could not find the table|does not exist/i.test(error.message ?? "")
      ) {
        return errorResponse(
          "La table de comptabilité n'est pas disponible. Exécute supabase/accounting.sql dans le SQL Editor Supabase.",
          500,
        );
      }
      throw error;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[accounting:create]", error);
    return errorResponse(error instanceof Error ? error.message : "Erreur serveur.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await readSession();
    if (user?.role !== "admin") return errorResponse("Accès réservé à l'administrateur.", 403);

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorResponse("Identifiant manquant.", 400);

    const { error } = await db().from("transactions").delete().eq("id", id);
    if (
      error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        /could not find the table|does not exist/i.test(error.message ?? ""))
    ) {
      return errorResponse(
        "La table de comptabilité n'est pas disponible. Exécute supabase/accounting.sql dans le SQL Editor Supabase.",
        500,
      );
    }
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[accounting:delete]", error);
    return errorResponse(error instanceof Error ? error.message : "Erreur serveur.", 500);
  }
}
