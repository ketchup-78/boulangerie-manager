// ============================================================
// Gestion du profil employé sur cette tablette
// Une fois choisi, le profil reste en mémoire sur cet appareil
// jusqu'à ce qu'on clique "changer".
// ============================================================

function getProfil() {
  const brut = localStorage.getItem('bm_profil');
  return brut ? JSON.parse(brut) : null;
}

function effacerProfil() {
  localStorage.removeItem('bm_profil');
  location.reload();
}

function afficherBandeauProfil(employe) {
  const bandeau = document.getElementById('bandeau-profil');
  if (bandeau) {
    bandeau.textContent = '👤 ' + employe.nom + (employe.role === 'chef' ? ' (chef)' : '');
  }
}

// Appelle ta logique de page une fois le profil connu :
// initProfil(function(profil) { ... }, 'vente' | 'boulangerie' | 'patisserie')
// Le filtreService limite la liste affichée à ce service, mais le chef
// reste toujours visible (il doit pouvoir agir sur toutes les tablettes).
async function initProfil(callback, filtreService) {
  const existant = getProfil();
  if (existant) {
    afficherBandeauProfil(existant);
    callback(existant);
    return;
  }

  const { data: tousLesEmployes, error } = await supabaseClient.from('employes').select('*').order('nom');

  const data = (filtreService && tousLesEmployes)
    ? tousLesEmployes.filter(e => e.role === 'chef' || e.service === filtreService)
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
    <div style="background:#fff;border-radius:18px;padding:28px;max-width:340px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,.1);text-align:center;">
      <h2 style="font-family:'Fraunces',serif;margin-top:0;">Qui es-tu ?</h2>
      <select id="select-profil" style="width:100%;padding:12px;border-radius:10px;border:1px solid #ddd;font-size:15px;margin-bottom:14px;">
        ${data.map(e => `<option value="${e.id}">${e.nom}</option>`).join('')}
      </select>
      <button id="btn-confirmer-profil" style="width:100%;border:none;background:#C68A2E;color:#241A14;padding:14px;border-radius:12px;font-size:16px;font-weight:600;">C'est moi</button>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('btn-confirmer-profil').onclick = () => {
    const id = document.getElementById('select-profil').value;
    const employe = data.find(e => e.id === id);
    localStorage.setItem('bm_profil', JSON.stringify(employe));
    overlay.remove();
    afficherBandeauProfil(employe);
    callback(employe);
  };
}
