import { NextResponse } from "next/server";
import { getCategories } from "@/lib/server/data";
import { db, errorResponse, readJson } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";
import { readSession } from "@/lib/server/session";
import { isValidPhone, normalizePhone } from "@/lib/utils";
import type { Role } from "@/lib/types";

interface Context {
  params: Promise<{ id: string }>;
}

interface PatchBody {
  fullName?: string;
  phone?: string;
  categoryId?: string | null;
  role?: Role;
  resetPassword?: boolean;
  payment?: {
    paid: boolean;
    /** Montant versé. Peut être inférieur au tarif : on enregistre alors un acompte. */
    amount?: number | null;
    reference?: string | null;
  };
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await readSession();
    if (user?.role !== "admin") return errorResponse("Accès réservé à l'administrateur.", 403);

    const { id } = await context.params;
    const body = await readJson<PatchBody>(request);
    if (!body) return errorResponse("Données invalides.", 400);

    const supabase = db();
    const { data: existing, error: lookupError } = await supabase
      .from("members")
      .select("id, phone, category_id")
      .eq("id", id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!existing) return errorResponse("Membre introuvable.", 404);

    const { data: existingPayment, error: paymentLookupError } = await supabase
      .from("payments")
      .select("amount, reference")
      .eq("member_id", id)
      .maybeSingle();
    if (paymentLookupError) throw paymentLookupError;

    const categories = await getCategories();
    const nextPhone = body.phone !== undefined ? normalizePhone(body.phone) : String(existing.phone);
    if (!isValidPhone(nextPhone)) return errorResponse("Numéro de téléphone invalide.", 400);

    const nextCategoryId =
      body.categoryId === undefined ? (existing.category_id as string | null) : body.categoryId || null;

    if (nextCategoryId && !categories.some((c) => c.id === nextCategoryId)) {
      return errorResponse("Catégorie introuvable.", 400);
    }

    const oldCategory = categories.find((c) => c.id === existing.category_id);
    const newCategory = categories.find((c) => c.id === nextCategoryId);
    const expectedAmount = newCategory?.amount ?? 0;

    const update: Record<string, unknown> = {
      phone: nextPhone,
      category_id: nextCategoryId,
    };
    if (body.fullName !== undefined) {
      if (body.fullName.trim().length < 2) return errorResponse("Le nom est trop court.", 400);
      update.full_name = body.fullName.trim();
    }
    if (body.role === "admin" || body.role === "member") update.role = body.role;
    if (body.resetPassword) update.password_hash = await hashPassword(nextPhone);

    // Montant à enregistrer : null signifie "aucun paiement".
    let paymentAmount: number | null | undefined;
    let paymentReference: string | null | undefined;

    if (body.payment) {
      if (!body.payment.paid) {
        paymentAmount = null;
      } else {
        const raw = body.payment.amount ?? expectedAmount;
        const amount = Number(raw);
        if (!Number.isFinite(amount) || amount < 0) return errorResponse("Montant invalide.", 400);
        if (!Number.isInteger(amount)) return errorResponse("Le montant doit être un nombre entier de FCFA.", 400);
        if (expectedAmount > 0 && amount > expectedAmount) {
          return errorResponse(`Le montant ne peut pas dépasser ${expectedAmount} FCFA pour cette catégorie.`, 400);
        }
        paymentAmount = amount === 0 ? null : amount;
        if (body.payment.reference !== undefined) {
          paymentReference = body.payment.reference?.trim() || null;
        }
      }
    }

    const { error: updateError } = await supabase.from("members").update(update).eq("id", id);
    if (updateError) {
      if (updateError.code === "23505") return errorResponse("Ce numéro existe déjà.", 409);
      throw updateError;
    }

    if (body.payment) {
      if (paymentAmount === null) {
        const { error: deleteError } = await supabase.from("payments").delete().eq("member_id", id);
        if (deleteError) throw deleteError;
      } else if (paymentAmount !== undefined) {
        const paymentUpdate: Record<string, unknown> = {
          member_id: id,
          amount: paymentAmount,
          recorded_by: user.id,
          paid_at: new Date().toISOString(),
        };
        if (paymentReference !== undefined) paymentUpdate.reference = paymentReference;

        const { error: paymentError } = await supabase
          .from("payments")
          .upsert(paymentUpdate, { onConflict: "member_id" });
        if (paymentError) throw paymentError;
      }
    } else if (body.categoryId !== undefined && nextCategoryId !== existing.category_id) {
      // Un paiement complet suit le nouveau tarif ; un acompte reste inchangé.
      const oldAmount = oldCategory?.amount ?? 0;
      const previousAmount = Number(existingPayment?.amount ?? 0);
      const wasFull = previousAmount >= oldAmount && (oldAmount > 0 || previousAmount > 0);

      if (wasFull && expectedAmount !== oldAmount) {
        if (expectedAmount === 0) {
          const { error: deleteError } = await supabase.from("payments").delete().eq("member_id", id);
          if (deleteError) throw deleteError;
        } else {
          const { error: paymentError } = await supabase
            .from("payments")
            .update({ amount: expectedAmount })
            .eq("member_id", id);
          if (paymentError) throw paymentError;
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[members:update]", error);
    return errorResponse(error instanceof Error ? error.message : "Erreur serveur.", 500);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await readSession();
    if (user?.role !== "admin") return errorResponse("Accès réservé à l'administrateur.", 403);

    const { id } = await context.params;
    if (id === user.id) return errorResponse("Vous ne pouvez pas supprimer votre propre compte.", 400);

    const { error } = await db().from("members").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[members:delete]", error);
    return errorResponse("Erreur lors de la suppression.", 500);
  }
}
