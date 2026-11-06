
-- ---------- Notifications téléphone (tâches assignées) ----------
create table if not exists abonnements_push (
  id uuid primary key default gen_random_uuid(),
  employe_nom text not null,
  service text,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table abonnements_push enable row level security;
drop policy if exists "accès interne complet" on abonnements_push;
create policy "accès interne complet" on abonnements_push for all using (true) with check (true);

create extension if not exists pg_net with schema extensions;

create or replace function notifier_nouvelle_tache() returns trigger
language plpgsql security definer as $$
begin
  begin
    perform net.http_post(
      url := 'https://kwqnaomfyazikxlxrjbn.supabase.co/functions/v1/notifier-tache',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3cW5hb21meWF6aWt4bHhyamJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NDIzODgsImV4cCI6MjEwMzQxODM4OH0.5FbL1YP683bgQAoJECny5O02Li6sR93gKLFf1uGP0VE'),
      body := jsonb_build_object('assigne_a', new.assigne_a, 'description', new.description, 'atelier', new.atelier)
    );
  exception when others then
    null; -- une notification ratée ne doit jamais empêcher d'ajouter la tâche
  end;
  return new;
end $$;

drop trigger if exists trigger_notifier_tache on taches;
create trigger trigger_notifier_tache after insert on taches
for each row execute function notifier_nouvelle_tache();
