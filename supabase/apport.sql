-- Apports : distingue le montant de la cotisation du surplus versé par un membre.
-- À exécuter une seule fois dans le SQL Editor de Supabase (projet déjà en place).

alter table public.payments
  add column if not exists extra_amount integer not null default 0 check (extra_amount >= 0);

-- Rafraîchit le cache du schéma PostgREST pour que l'API voie la colonne tout de suite.
notify pgrst, 'reload schema';
