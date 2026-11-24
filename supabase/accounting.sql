-- Comptabilité : dons, dépenses et autres mouvements saisis manuellement.
-- Les cotisations des membres sont ajoutées automatiquement depuis la table payments.
-- À exécuter une seule fois dans le SQL Editor de Supabase (projet déjà en place).

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income', 'expense')),
  label text not null,
  amount integer not null check (amount > 0),
  observation text,
  recorded_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_created_at_idx
  on public.transactions (created_at desc);

alter table public.transactions enable row level security;

-- Rafraîchit le cache du schéma PostgREST pour que l'API voie la table tout de suite.
notify pgrst, 'reload schema';
