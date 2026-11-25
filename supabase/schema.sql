-- Cotisation tournoi : schéma Supabase
-- À exécuter une seule fois dans l'éditeur SQL de Supabase.

create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount integer not null check (amount >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  full_name text not null,
  category_id uuid references public.categories(id) on delete set null,
  password_hash text not null,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

-- amount = montant effectivement versé. Un montant inférieur au tarif de la
-- catégorie représente un acompte ; le solde est calculé par l'application.
-- extra_amount = part du versement qui dépasse le tarif (apport en plus de la cotisation).
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members(id) on delete cascade,
  amount integer not null check (amount >= 0),
  extra_amount integer not null default 0 check (extra_amount >= 0),
  paid_at timestamptz not null default now(),
  reference text,
  recorded_by uuid references public.members(id) on delete set null
);

-- Journal comptable : dons et dépenses saisis manuellement.
-- Les cotisations sont automatiquement listées comme entrées depuis payments.
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income', 'expense')),
  label text not null,
  amount integer not null check (amount > 0),
  observation text,
  recorded_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id integer primary key check (id = 1),
  tournament_name text not null default 'Tournoi du 28 novembre',
  deadline timestamptz not null default '2026-11-28T23:59:00Z',
  show_remaining_to_members boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.settings (id, tournament_name, deadline)
values (1, 'Tournoi du 28 novembre', '2026-11-28T23:59:00Z')
on conflict (id) do nothing;

-- Catégories par défaut (modifiables depuis l'interface admin)
do $$
begin
  if not exists (select 1 from public.categories) then
    insert into public.categories (name, amount, sort_order) values
      ('Adulte', 10000, 1),
      ('Étudiant', 5000, 2),
      ('Junior', 2000, 3);
  end if;
end $$;

create index if not exists members_category_idx on public.members(category_id);
create index if not exists payments_paid_at_idx on public.payments(paid_at desc);

-- Le service_role contourne RLS : on active RLS pour éviter tout accès anonyme direct.
alter table public.categories enable row level security;
alter table public.members enable row level security;
alter table public.payments enable row level security;
alter table public.transactions enable row level security;
alter table public.settings enable row level security;
