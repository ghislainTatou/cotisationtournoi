export type Role = "admin" | "member";
export type PaymentStatus = "pending" | "partial" | "paid";

export interface SessionUser {
  id: string;
  phone: string;
  fullName: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  amount: number;
  sortOrder: number;
}

export interface Payment {
  id: string;
  amount: number;
  /** Part du versement au-delà du tarif de la catégorie. */
  extraAmount: number;
  paidAt: string;
  reference: string | null;
}

export interface Member {
  id: string;
  phone: string;
  fullName: string;
  role: Role;
  categoryId: string | null;
  categoryName: string;
  /** Tarif attendu de la catégorie. */
  amount: number;
  /** Montant effectivement versé (0 si aucun paiement). */
  paidAmount: number;
  /** Part du versement comptabilisée comme apport. */
  extraAmount: number;
  /** Solde restant à régler. */
  remainingAmount: number;
  status: PaymentStatus;
  createdAt: string;
  payment: Payment | null;
}

export interface Settings {
  tournamentName: string;
  deadline: string;
  showRemainingToMembers: boolean;
}

export interface Stats {
  total: number;
  paid: number;
  partial: number;
  remaining: number;
  collected: number;
  expected: number;
}

export type AccountingKind = "income" | "expense";
export type AccountingSource = "cotisation" | "apport" | "manuel";

export interface AccountingEntry {
  id: string;
  kind: AccountingKind;
  label: string;
  amount: number;
  observation: string | null;
  createdAt: string;
  source: AccountingSource;
  /** Présent pour les lignes saisies manuellement (supprimables). */
  manualId: string | null;
}

export interface AccountingData {
  entries: AccountingEntry[];
  income: number;
  expense: number;
  balance: number;
  available: boolean;
}

export interface DashboardData {
  user: SessionUser;
  settings: Settings;
  categories: Category[];
  stats: Stats;
  accounting: AccountingData;
  paid: Member[];
  remaining: Member[];
  members: Member[];
}
