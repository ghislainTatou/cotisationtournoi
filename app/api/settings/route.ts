import { NextResponse } from "next/server";
import { db, errorResponse, readJson } from "@/lib/server/db";
import { readSession } from "@/lib/server/session";

interface Body {
  tournamentName?: string;
  deadline?: string;
  showRemainingToMembers?: boolean;
}

export async function PATCH(request: Request) {
  try {
    const user = await readSession();
    if (user?.role !== "admin") return errorResponse("Accès réservé à l'administrateur.", 403);

    const body = await readJson<Body>(request);
    if (!body) return errorResponse("Données invalides.", 400);

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.tournamentName !== undefined) {
      const name = body.tournamentName.trim();
      if (name.length < 2) return errorResponse("Nom du tournoi trop court.", 400);
      update.tournament_name = name;
    }

    if (body.deadline !== undefined) {
      const deadline = new Date(body.deadline);
      if (Number.isNaN(deadline.getTime())) return errorResponse("Date limite invalide.", 400);
      update.deadline = deadline.toISOString();
    }

    if (body.showRemainingToMembers !== undefined) {
      update.show_remaining_to_members = Boolean(body.showRemainingToMembers);
    }

    const { error } = await db().from("settings").update(update).eq("id", 1);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[settings]", error);
    return errorResponse("Erreur lors de l'enregistrement.", 500);
  }
}
