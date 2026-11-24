export type Role = "admin" | "member";

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
  amount: number;
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
