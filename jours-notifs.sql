
-- Jours où chaque personne veut recevoir la notification Casino (1 = lundi … 7 = dimanche)
alter table employes add column if not exists jours_casino int[] not null default '{1,2,3,4,5,6,7}';
