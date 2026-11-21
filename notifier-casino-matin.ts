// Fonction « notifier-casino-matin » — à 6h00 (heure de Paris), prévient Hugo et Mathieu
// des commandes Casino Shop prévues pour la journée.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

// Les personnes qui reçoivent la notification (noms exacts de leurs profils)
const DESTINATAIRES = ["Hugo", "Mathieu"];

webpush.setVapidDetails(
  "https://boulangerie-desauw.fr/",
  Deno.env.get("VAPID_PUBLIC")!,
  Deno.env.get("VAPID_PRIVATE")!
);
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  let corps: any = {};
  try { corps = await req.json(); } catch (_) {}

  // Le planning tourne à 4h et 5h (heure UTC) : on n'agit que s'il est 6h à Paris
  const heureParis = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(new Date());
  if (!corps.force && heureParis !== "06") return new Response("pas l'heure");

  const aujourdhui = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()); // AAAA-MM-JJ

  const { data: lignes } = await supabase.from("commandes").select("produit, quantite")
    .eq("client", "Casino Shop").eq("date_retrait", aujourdhui).neq("statut", "annule");

  if (!lignes || lignes.length === 0) return new Response("aucune commande");

  const totaux: Record<string, number> = {};
  lignes.forEach((l) => { totaux[l.produit] = (totaux[l.produit] || 0) + Number(l.quantite); });
  const texte = Object.entries(totaux).map(([p, q]) => `${q} ${p}`).join(", ");

  const message = JSON.stringify({
    titre: "Casino Shop — commande du jour",
    texte,
    url: "labo.html?atelier=boulangerie",
  });

  // Jour de la semaine à Paris (1 = lundi … 7 = dimanche) et personnes qui veulent être prévenues ce jour-là
  const nomJour = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short" }).format(new Date());
  const jourNum = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[nomJour]!;
  const { data: personnes } = await supabase.from("employes").select("nom, jours_casino").in("nom", DESTINATAIRES);
  const aPrevenir = (personnes || [])
    .filter((p) => !p.jours_casino || p.jours_casino.includes(jourNum))
    .map((p) => p.nom);
  if (aPrevenir.length === 0) return new Response("personne à prévenir aujourd'hui");

  const { data: abonnements } = await supabase.from("abonnements_push").select("*").in("employe_nom", aPrevenir);

  await Promise.all((abonnements || []).map(async (a) => {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, message);
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await supabase.from("abonnements_push").delete().eq("id", a.id);
      }
    }
  }));

  return new Response("ok");
});
