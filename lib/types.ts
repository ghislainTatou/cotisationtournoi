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

export interface DashboardData {
  user: SessionUser;
  settings: Settings;
  categories: Category[];
  stats: Stats;
  paid: Member[];
  remaining: Member[];
  members: Member[];
}
