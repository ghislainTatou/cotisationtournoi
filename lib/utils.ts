import type { Member, Settings } from "@/lib/types";

export function normalizePhone(value: string): string {
  return value.replace(/[\s().-]/g, "").trim();
}

export function isValidPhone(value: string): boolean {
  return /^\+?\d{8,15}$/.test(value);
}

export function formatMoney(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface CountdownInfo {
  label: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  finished: boolean;
  isToday: boolean;
}

export function getCountdown(deadline: string, now: Date = new Date()): CountdownInfo {
  const target = new Date(deadline);
  const totalMs = target.getTime() - now.getTime();
  const finished = totalMs <= 0;

  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const dayDiff = Math.round((targetUtc - todayUtc) / 86_400_000);

  const label = dayDiff > 0 ? `J-${dayDiff}` : dayDiff === 0 ? "Jour J" : `J+${Math.abs(dayDiff)}`;

  const abs = Math.max(0, totalMs);
  return {
    label,
    days: dayDiff,
    hours: Math.floor(abs / 3_600_000) % 24,
    minutes: Math.floor(abs / 60_000) % 60,
    seconds: Math.floor(abs / 1000) % 60,
    totalMs,
    finished,
    isToday: dayDiff === 0,
  };
}

export function csvSafe(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportMembersCsv(rows: Member[], settings: Settings): void {
  const header = [
    "Nom",
    "Téléphone",
    "Catégorie",
    "Montant dû",
    "Déjà payé",
    "Reste",
    "Statut",
    "Date paiement",
    "Référence",
  ];
  const lines = rows.map((m) =>
    [
      m.fullName,
      m.phone,
      m.categoryName,
      m.amount,
      m.paidAmount,
      m.remainingAmount,
      m.status === "paid" ? "Payé" : m.status === "partial" ? "Acompte" : "En attente",
      m.payment?.paidAt ?? "",
      m.payment?.reference ?? "",
    ]
      .map(csvSafe)
      .join(";"),
  );
  const content = `\uFEFF${header.join(";")}\n${lines.join("\n")}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${settings.tournamentName.replace(/[^\w-]/g, "_")}_cotisations.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
