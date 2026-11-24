import { NextResponse } from "next/server";
import { getCategories } from "@/lib/server/data";
import { db, errorResponse, readJson } from "@/lib/server/db";
import { readSession } from "@/lib/server/session";

interface Body {
  id?: string;
  name?: string;
  amount?: number;
  sortOrder?: number;
}

function adminGuard(user: Awaited<ReturnType<typeof readSession>>) {
  return user?.role === "admin";
}

export async function POST(request: Request) {
  try {
    if (!adminGuard(await readSession())) return errorResponse("Accès refusé.", 403);
    const body = await readJson<Body>(request);
    const name = body?.name?.trim() ?? "";
    const amount = Number(body?.amount);

    if (name.length < 2) return errorResponse("Nom de catégorie trop court.", 400);
    if (!Number.isFinite(amount) || amount < 0) return errorResponse("Montant invalide.", 400);

    const { data, error } = await db()
      .from("categories")
      .insert({
        name,
        amount: Math.round(amount),
        sort_order: Number.isFinite(body?.sortOrder) ? Math.round(Number(body?.sortOrder)) : 99,
      })
      .select("id, name, amount, sort_order")
      .single();

    if (error) throw error;
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    console.error("[categories:create]", error);
    return errorResponse("Erreur serveur.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    if (!adminGuard(await readSession())) return errorResponse("Accès refusé.", 403);
    const body = await readJson<Body>(request);
    if (!body?.id) return errorResponse("Identifiant manquant.", 400);

    const categories = await getCategories();
    if (!categories.some((c) => c.id === body.id)) return errorResponse("Catégorie introuvable.", 404);

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (body.name.trim().length < 2) return errorResponse("Nom de catégorie trop court.", 400);
      update.name = body.name.trim();
    }
    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 0) return errorResponse("Montant invalide.", 400);
      update.amount = Math.round(amount);
    }
    if (body.sortOrder !== undefined) update.sort_order = Math.round(Number(body.sortOrder) || 0);

    const { error } = await db().from("categories").update(update).eq("id", body.id);
    if (error) throw error;

    // Garde les paiements déjà enregistrés cohérents avec le nouveau tarif.
    if (update.amount !== undefined) {
      const { data: members, error: membersError } = await db()
        .from("members")
        .select("id")
        .eq("category_id", body.id);
      if (membersError) throw membersError;

      const memberIds = (members ?? []).map((row) => String(row.id));
      if (memberIds.length) {
        const { error: paymentsError } = await db()
          .from("payments")
          .update({ amount: update.amount })
          .in("member_id", memberIds);
        if (paymentsError) throw paymentsError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[categories:update]", error);
    return errorResponse("Erreur serveur.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!adminGuard(await readSession())) return errorResponse("Accès refusé.", 403);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorResponse("Identifiant manquant.", 400);

    const { error } = await db().from("categories").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[categories:delete]", error);
    return errorResponse("Erreur serveur.", 500);
  }
}
