-- ============================================================
-- Boulangerie Manager — schéma Supabase
-- À copier-coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- Extension nécessaire pour générer des UUID
create extension if not exists "pgcrypto";

-- ---------- COMMANDES ----------
create table if not exists commandes (
  id uuid primary key default gen_random_uuid(),
  client text not null,
  produit text not null,
  quantite int not null default 1,
  heure_retrait time,
  notes text,
  statut text not null default 'a_faire'
    check (statut in ('a_faire', 'en_cours', 'pret', 'recupere')),
  created_at timestamptz not null default now()
);

-- ---------- TÂCHES ----------
create table if not exists taches (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  atelier text not null check (atelier in ('boulangerie', 'patisserie')),
  fait boolean not null default false,
  termine_a timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- RECETTES ----------
create table if not exists recettes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text,
  atelier text not null check (atelier in ('boulangerie', 'patisserie')),
  ingredients jsonb not null default '[]'::jsonb, -- ex: [{"nom":"Farine T65","quantite":"1kg"}]
  etapes text not null default '',
  photo_url text,
  created_at timestamptz not null default now()
);

-- ---------- DLC ----------
create table if not exists dlc (
  id uuid primary key default gen_random_uuid(),
  produit text not null,
  date_fabrication date not null default current_date,
  dlc date not null,
  quantite numeric,
  ecoule boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Accès (RLS) — usage interne uniquement (tablettes en boutique)
-- Pas d'authentification utilisateur : on ouvre l'accès via la
-- clé "anon". OK pour un outil interne non exposé publiquement.
-- Si un jour l'appli est accessible depuis l'extérieur, il faudra
-- ajouter une vraie authentification.
-- ============================================================

alter table commandes enable row level security;
alter table taches enable row level security;
alter table recettes enable row level security;
alter table dlc enable row level security;

create policy "accès interne complet" on commandes for all using (true) with check (true);
create policy "accès interne complet" on taches for all using (true) with check (true);
create policy "accès interne complet" on recettes for all using (true) with check (true);
create policy "accès interne complet" on dlc for all using (true) with check (true);

-- ============================================================
-- Temps réel : après avoir lancé ce script, va dans
-- Database > Replication > active le "Realtime" pour ces 4 tables
-- (comme ça les tablettes se mettent à jour automatiquement).
-- ============================================================

-- ---------- EMPLOYÉS (ajouté ensuite) ----------
create table if not exists employes (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  role text not null default 'employe' check (role in ('chef', 'employe')),
  created_at timestamptz not null default now()
);

alter table employes enable row level security;
create policy "accès interne complet" on employes for all using (true) with check (true);

-- Qui a pris la commande / à qui est assignée la tâche
alter table commandes add column if not exists prise_par text;
alter table taches add column if not exists assigne_a text;

-- Atelier concerné par un produit à DLC (laisser vide si commun aux deux)
alter table dlc add column if not exists atelier text check (atelier in ('boulangerie', 'patisserie'));
