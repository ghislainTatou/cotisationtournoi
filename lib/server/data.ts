import { db } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";
import { normalizePhone, isValidPhone } from "@/lib/utils";
import type { Category, Member, Settings, Stats } from "@/lib/types";

type AnyRow = Record<string, unknown>;

export const DEFAULT_SETTINGS: Settings = {
  tournamentName: "Tournoi du 28 novembre",
  deadline: "2026-11-28T23:59:00Z",
  showRemainingToMembers: false,
};

export async function getSettings(): Promise<Settings> {
  const { data, error } = await db()
    .from("settings")
    .select("tournament_name, deadline, show_remaining_to_members")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS;

  return {
    tournamentName: String(data.tournament_name ?? DEFAULT_SETTINGS.tournamentName),
    deadline: String(data.deadline ?? DEFAULT_SETTINGS.deadline),
    showRemainingToMembers: Boolean(data.show_remaining_to_members),
  };
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await db()
    .from("categories")
    .select("id, name, amount, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: AnyRow) => ({
    id: String(row.id),
    name: String(row.name),
    amount: Number(row.amount),
    sortOrder: Number(row.sort_order ?? 0),
  }));
}

export async function getMembers(): Promise<Member[]> {
  const [membersRes, categoriesRes, paymentsRes] = await Promise.all([
    db()
      .from("members")
      .select("id, phone, full_name, role, category_id, created_at")
      .order("created_at", { ascending: true }),
    db().from("categories").select("id, name, amount"),
    db()
      .from("payments")
      .select("id, member_id, amount, paid_at, reference")
      .order("paid_at", { ascending: false }),
  ]);

  if (membersRes.error) throw membersRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  const categories = new Map(
    (categoriesRes.data ?? []).map((row: AnyRow) => [
      String(row.id),
      { name: String(row.name), amount: Number(row.amount) },
    ]),
  );

  const payments = new Map(
    (paymentsRes.data ?? []).map((row: AnyRow) => [
      String(row.member_id),
      {
        id: String(row.id),
        amount: Number(row.amount),
        paidAt: String(row.paid_at),
        reference: row.reference ? String(row.reference) : null,
      },
    ]),
  );

  return (membersRes.data ?? []).map((row: AnyRow) => {
    const id = String(row.id);
    const categoryId = row.category_id ? String(row.category_id) : null;
    const category = categoryId ? categories.get(categoryId) : undefined;
    const payment = payments.get(id) ?? null;

    return {
      id,
      phone: String(row.phone),
      fullName: String(row.full_name),
      role: row.role === "admin" ? "admin" : "member",
      categoryId,
      categoryName: category?.name ?? "Non catégorisé",
      amount: payment?.amount ?? category?.amount ?? 0,
      createdAt: String(row.created_at),
      payment,
    };
  });
}

export function computeStats(members: Member[]): Stats {
  const paid = members.filter((m) => m.payment);
  return {
    total: members.length,
    paid: paid.length,
    remaining: members.length - paid.length,
    collected: paid.reduce((sum, m) => sum + (m.payment?.amount ?? 0), 0),
    expected: members.reduce((sum, m) => sum + m.amount, 0),
  };
}

export async function ensureAdminAccount(): Promise<void> {
  const rawPhone = process.env.ADMIN_PHONE;
  if (!rawPhone) return;

  const phone = normalizePhone(rawPhone);
  if (!isValidPhone(phone)) {
    console.warn("[auth] ADMIN_PHONE invalide :", rawPhone);
    return;
  }

  const supabase = db();
  const { data: existing, error: lookupError } = await supabase
    .from("members")
    .select("id, role")
    .eq("phone", phone)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (!existing) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    const password = process.env.ADMIN_PASSWORD || phone;
    const { error: insertError } = await supabase.from("members").insert({
      phone,
      full_name: process.env.ADMIN_NAME || "Administrateur",
      category_id: category?.id ?? null,
      password_hash: await hashPassword(password),
      role: "admin",
    });

    if (insertError) throw insertError;
    return;
  }

  if (existing.role !== "admin") {
    const { error: updateError } = await supabase
      .from("members")
      .update({ role: "admin" })
      .eq("id", existing.id);
    if (updateError) throw updateError;
  }
}
