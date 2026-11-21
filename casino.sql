
-- ---------- Boutique en ligne Casino Shop ----------
-- Code d'accès du client : AUCUNE règle d'accès => personne ne peut le lire depuis le site
create table if not exists config_casino (
  id int primary key default 1 check (id = 1),
  code text not null
);
alter table config_casino enable row level security;

-- Produits proposés dans sa boutique (photo + descriptif ajoutables ensuite)
create table if not exists produits_casino (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  description text,
  photo_url text,
  actif boolean not null default true,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);
alter table produits_casino enable row level security;
drop policy if exists "accès interne complet" on produits_casino;
create policy "accès interne complet" on produits_casino for all using (true) with check (true);

-- Au départ : ses produits habituels (ceux de ta fiche Casino Shop)
insert into produits_casino (nom, ordre)
select produit, (row_number() over (order by produit))::int
from (
  select distinct p.produit
  from clients_reguliers_produits p
  join clients_reguliers c on c.id = p.client_id
  where c.nom = 'Casino Shop'
) t
on conflict (nom) do nothing;

-- Vérifie le code
create or replace function casino_verifier(p_code text) returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from config_casino where code = p_code and p_code <> '');
$$;

-- Enregistre une commande : elle arrive tout de suite dans le labo boulangerie, à la date choisie
create or replace function casino_commander(p_code text, p_date date, p_lignes jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare l jsonb; n int := 0;
begin
  if not casino_verifier(p_code) then raise exception 'Code invalide'; end if;
  if p_date < (now() at time zone 'Europe/Paris')::date then raise exception 'Cette date est déjà passée'; end if;
  for l in select * from jsonb_array_elements(p_lignes) loop
    if coalesce((l->>'quantite')::int, 0) > 0 then
      insert into commandes (client, produit, quantite, atelier, date_retrait, heure_retrait, statut, prise_par, notes)
      values ('Casino Shop', l->>'produit', (l->>'quantite')::int, 'boulangerie', p_date, '08:00', 'a_faire', 'Casino (site)', 'Commande en ligne');
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- Ses commandes à venir
create or replace function casino_mes_commandes(p_code text)
returns table (date_retrait date, produit text, quantite numeric, statut text)
language plpgsql security definer set search_path = public as $$
begin
  if not casino_verifier(p_code) then raise exception 'Code invalide'; end if;
  return query
    select c.date_retrait, c.produit, c.quantite::numeric, c.statut
    from commandes c
    where c.client = 'Casino Shop' and c.statut <> 'annule'
      and c.date_retrait >= (now() at time zone 'Europe/Paris')::date
    order by c.date_retrait, c.produit;
end $$;

-- Annulation d'une journée (seulement ce qui n'est pas encore préparé)
create or replace function casino_annuler(p_code text, p_date date) returns integer
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not casino_verifier(p_code) then raise exception 'Code invalide'; end if;
  update commandes set statut = 'annule'
  where client = 'Casino Shop' and date_retrait = p_date and statut = 'a_faire';
  get diagnostics n = row_count;
  return n;
end $$;

-- ⚠️ CHOISIS LE CODE DE TON CLIENT ICI (remplace 1234 par le code de ton choix) :
insert into config_casino (id, code) values (1, '1234')
on conflict (id) do update set code = excluded.code;
