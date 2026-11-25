import { NextResponse } from "next/server";
import { getCategories, isMissingSchemaObject } from "@/lib/server/data";
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
  /** Le surplus éventuel est-il un apport (true) ou doit-il être ignoré (false) ? */
  surplusAsApport?: boolean;
  payment?: {
    paid: boolean;
    /** Montant versé. Peut être inférieur au tarif : on enregistre alors un acompte. */
    amount?: number | null;
    reference?: string | null;
    /** Version imbriquée, utilisée par la modale de paiement. */
    surplusAsApport?: boolean;
  };
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await readSession();
    if (user?.role !== "admin") return errorResponse("Accès réservé à l'administrateur.", 403);
    const adminId = user.id;

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
    const surplusAsApport =
      body.surplusAsApport === true || body.payment?.surplusAsApport === true;

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

    async function writePayment(
      amount: number,
      extra: number,
      options: { touchDate?: boolean; reference?: string | null } = {},
    ): Promise<void> {
      const payload: Record<string, unknown> = {
        member_id: id,
        amount,
        extra_amount: extra,
      };
      if (options.touchDate) {
        payload.recorded_by = adminId;
        payload.paid_at = new Date().toISOString();
      }
      if (options.reference !== undefined) payload.reference = options.reference;

      let result = await supabase.from("payments").upsert(payload, { onConflict: "member_id" });
      if (result.error && isMissingSchemaObject(result.error)) {
        if (extra > 0) {
          throw new Error(
            "La colonne apport n'existe pas encore. Exécute supabase/apport.sql dans le SQL Editor Supabase.",
          );
        }
        const fallback = { ...payload };
        delete fallback.extra_amount;
        result = await supabase.from("payments").upsert(fallback, { onConflict: "member_id" });
      }
      if (result.error) throw result.error;
    }

    // Montant à enregistrer : null signifie "aucun paiement".
    let paymentAmount: number | null | undefined;
    let paymentExtra = 0;
    let paymentReference: string | null | undefined;

    if (body.payment) {
      if (!body.payment.paid) {
        paymentAmount = null;
      } else {
        let amount = Number(body.payment.amount ?? expectedAmount);
        if (!Number.isFinite(amount) || amount < 0) return errorResponse("Montant invalide.", 400);
        if (!Number.isInteger(amount)) return errorResponse("Le montant doit être un nombre entier de FCFA.", 400);

        if (expectedAmount > 0 && amount > expectedAmount) {
          if (surplusAsApport) paymentExtra = amount - expectedAmount;
          else amount = expectedAmount;
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
        await writePayment(paymentAmount, paymentExtra, {
          touchDate: true,
          reference: paymentReference,
        });
      }
    } else if (
      body.categoryId !== undefined &&
      nextCategoryId !== existing.category_id &&
      Number(existingPayment?.amount ?? 0) > 0
    ) {
      const oldAmount = oldCategory?.amount ?? 0;
      const previousAmount = Number(existingPayment?.amount ?? 0);
      const wasFull = previousAmount >= oldAmount && (oldAmount > 0 || previousAmount > 0);

      let nextAmount = previousAmount;
      if (expectedAmount === 0) {
        nextAmount = 0;
      } else if (previousAmount <= expectedAmount && wasFull && expectedAmount !== oldAmount) {
        // Un paiement complet suit le nouveau tarif lors d'un changement de catégorie.
        nextAmount = expectedAmount;
      }

      let nextExtra = 0;
      if (expectedAmount > 0 && nextAmount > expectedAmount) {
        if (surplusAsApport) nextExtra = nextAmount - expectedAmount;
        else nextAmount = expectedAmount;
      }

      if (nextAmount === 0) {
        const { error: deleteError } = await supabase.from("payments").delete().eq("member_id", id);
        if (deleteError) throw deleteError;
      } else {
        await writePayment(nextAmount, nextExtra);
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
