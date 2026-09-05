// ============================================================
// Gestion du profil employé sur cette tablette
// Une fois choisi, le profil reste en mémoire sur cet appareil
// jusqu'à ce qu'on clique "changer".
// ============================================================

// Donne la date du jour au format AAAA-MM-JJ selon l'heure LOCALE
// (contrairement à toISOString() qui utilise l'heure UTC et peut
// donc afficher encore "hier" juste après minuit en France)
function dateLocale(d) {
  d = d || new Date();
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function getProfil() {
  const brut = localStorage.getItem('bm_profil');
  return brut ? JSON.parse(brut) : null;
}

function effacerProfil() {
  localStorage.removeItem('bm_profil');
  location.reload();
}

// Redemande automatiquement "Qui es-tu ?" après 5 minutes sans interaction
// (utile sur une tablette partagée, pour ne pas laisser un profil ouvert)
let minuteurInactivite;
function reinitialiserMinuteurInactivite() {
  clearTimeout(minuteurInactivite);
  minuteurInactivite = setTimeout(() => {
    if (window.INACTIVITE_RETOUR_ACCUEIL) {
      window.location.href = 'index.html';
    } else {
      effacerProfil();
    }
  }, 5 * 60 * 1000);
}
function demarrerSurveillanceInactivite() {
  reinitialiserMinuteurInactivite();
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, reinitialiserMinuteurInactivite);
  });
}

function afficherBandeauProfil(employe) {
  const bandeau = document.getElementById('bandeau-profil');
  if (bandeau) {
    bandeau.textContent = '👤 ' + employe.nom + (employe.role === 'chef' ? ' (chef)' : '');
  }
}

// Appelle ta logique de page une fois le profil connu :
// initProfil(function(profil) { ... }, 'vente' | 'boulangerie' | 'patisserie')
// Le filtreService limite la liste affichée aux personnes de ce service,
// chef compris (un chef n'apparaît que sur la tablette de son propre service).
async function initProfil(callback, filtreService) {
  const existant = getProfil();
  if (existant) {
    afficherBandeauProfil(existant);
    demarrerSurveillanceInactivite();
    callback(existant);
    return;
  }

  const { data: tousLesEmployes, error } = await supabaseClient.from('employes').select('*').order('nom');

  const data = (filtreService && tousLesEmployes)
    ? tousLesEmployes.filter(e => e.service === filtreService)
    : tousLesEmployes;

  const overlay = document.createElement('div');
  overlay.id = 'overlay-profil';
  overlay.style.cssText = 'position:fixed;inset:0;background:#FAF7F2;display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';

  if (error || !data || data.length === 0) {
    overlay.innerHTML = `
      <div style="text-align:center;max-width:320px;">
        <p>Impossible de charger la liste des employés.</p>
        <p style="opacity:.6;font-size:14px;">${error ? error.message : "Ajoute d'abord des employés dans Supabase (table employes)."}</p>
      </div>`;
    document.body.appendChild(overlay);
    return;
  }

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:28px 20px;max-width:440px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,.1);text-align:center;">
      <h2 style="font-family:'Fraunces',serif;margin-top:0;">Qui es-tu ?</h2>
      <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:14px;">
        ${data.map(e => `
          <button class="btn-profil" data-id="${e.id}" style="
            display:flex;flex-direction:column;align-items:center;gap:10px;
            width:118px;padding:20px 8px;border:none;border-radius:16px;
            background:#FAF7F2;cursor:pointer;font-family:inherit;
            transition:transform .1s ease;">
            <span style="width:56px;height:56px;border-radius:50%;background:#C68A2E;color:#241A14;
              display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;
              font-family:'Fraunces',serif;">
              ${e.nom.charAt(0).toUpperCase()}
            </span>
            <span style="font-size:16px;font-weight:600;color:#241A14;">${e.nom}</span>
          </button>
        `).join('')}
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.btn-profil').forEach(bouton => {
    bouton.onmousedown = () => bouton.style.transform = 'scale(0.94)';
    bouton.onmouseup = () => bouton.style.transform = 'scale(1)';
    bouton.onclick = () => {
      const id = bouton.dataset.id;
      const employe = data.find(e => e.id === id);
      localStorage.setItem('bm_profil', JSON.stringify(employe));
      overlay.remove();
      afficherBandeauProfil(employe);
      demarrerSurveillanceInactivite();
      callback(employe);
    };
  });
}
