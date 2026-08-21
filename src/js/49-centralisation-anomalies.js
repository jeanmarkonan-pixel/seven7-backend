/* ==================================================================
   SEVEN7 — CENTRALISATION DES ANOMALIES (ONGLET s)

   Scanne le state global pour lister automatiquement :
   - les écarts de balance tiers (fournisseurs anormalement débiteurs,
     clients anormalement créditeurs — même détection que l'onglet
     Balance tiers, computeAnormaux() dans 08-controles-audit.js,
     relue ici sans dupliquer son rendu) ;
   - l'écart de Patente (tfEcartPatente(), 48-tableaux-fiscaux.js) ;
   - les points de Contrôle Interne à risque (Questionnaire CI) : une
     réponse « Non » vaut non-conformité, une efficacité notée 1 ou 2
     vaut risque critique. Le questionnaire n'utilise pas ces libellés
     tels quels (il note « Oui/Non/Partiel/N/A » + une efficacité 1-5) :
     cette correspondance est le pont entre les deux.

   S'y ajoutent les anomalies signalées manuellement (bouton dédié).

   Une anomalie se résout dès qu'une justification est saisie dans sa
   zone de texte — pas de bouton "résoudre" séparé, comme demandé.
   Les justifications sont mémorisées par dossier (localStorage, comme
   43-seuils-cycles.js) : elles ne sont pas perdues au recalcul, puisque
   les anomalies scannées sont recalculées à chaque rendu, pas stockées.

   Alimente aussi rapConstatations() (38-rapport-general.js) : depuis le
   retrait de l'onglet Constatations (chantier 4), le fondement d'une
   opinion avec réserve n'avait plus de source automatique. Les
   anomalies non résolues en tiennent lieu désormais.
   ================================================================== */

/* ---------- Persistance (justifications + anomalies manuelles) ---------- */
function anDossierCle(){
    return (typeof dossierId !== 'undefined' && dossierId) ? dossierId : 'local';
}
function anJustifCle(){ return 'seven7_anomalies_justif_' + anDossierCle(); }
function anManuellesCle(){ return 'seven7_anomalies_manuelles_' + anDossierCle(); }

function anChargerJustifs(){
    try{ return JSON.parse(localStorage.getItem(anJustifCle()) || '{}') || {}; }catch(e){ return {}; }
}
function anEnregistrerJustif(cle, texte){
    var m = anChargerJustifs();
    if(texte && texte.trim()) m[cle] = texte; else delete m[cle];
    try{ localStorage.setItem(anJustifCle(), JSON.stringify(m)); }catch(e){}
}
function anChargerManuelles(){
    try{ return JSON.parse(localStorage.getItem(anManuellesCle()) || '[]') || []; }catch(e){ return []; }
}
function anEnregistrerManuelles(liste){
    try{ localStorage.setItem(anManuellesCle(), JSON.stringify(liste)); }catch(e){}
}

/* ---------- Sources scannées ---------- */
// Même seuil et même filtre que computeAnormaux() (08-controles-audit.js) : on
// relit tiersData plutôt que dupliquer un second calcul divergent.
function anScannerTiers(){
    var seuilAnomalie = Math.max((typeof seuils !== 'undefined' ? seuils.faible : 0) * 0.1, 1);
    var out = [];
    ((typeof tiersData !== 'undefined' && tiersData.fourn) || []).forEach(function(r){
        if(r.sd > seuilAnomalie){
            out.push({ cle:'tiers:fourn:' + r.compte, source:'Balance tiers — Fournisseurs',
                description: 'Compte ' + r.compte + ' (' + (r.intitule||'') + ') anormalement débiteur',
                montant: r.sd, onglet:'tiers-fourn' });
        }
    });
    ((typeof tiersData !== 'undefined' && tiersData.clients) || []).forEach(function(r){
        if(r.sc > seuilAnomalie){
            out.push({ cle:'tiers:clients:' + r.compte, source:'Balance tiers — Clients',
                description: 'Compte ' + r.compte + ' (' + (r.intitule||'') + ') anormalement créditeur',
                montant: r.sc, onglet:'tiers-clients' });
        }
    });
    return out;
}
function anScannerPatente(){
    if(typeof tfEcartPatente !== 'function') return [];
    var ecart = tfEcartPatente();
    if(!ecart) return [];
    return [{ cle:'patente:ecart', source:'Patente',
        description: 'Écart entre le montant comptabilisé et les deux tranches payées',
        montant: ecart, onglet:'impots' }];
}
function anScannerCI(){
    var table = document.getElementById('table-questionnaire');
    if(!table) return [];
    var out = [];
    Array.prototype.slice.call(table.rows).slice(1).forEach(function(tr, i){
        var cycle = (tr.cells[0] && tr.cells[0].textContent) || '';
        var question = (tr.cells[1] && tr.cells[1].textContent) || '';
        var reponseEl = tr.querySelector('select');
        var efficaciteEl = tr.querySelector('input[type="number"]');
        var reponse = reponseEl ? reponseEl.value : '';
        var efficacite = efficaciteEl ? parseNum(efficaciteEl.value) : null;
        var cleBase = 'ci:' + i + ':' + question.slice(0, 60);
        if(reponse === 'Non'){
            out.push({ cle: cleBase + ':nc', source: 'Contrôle interne — ' + cycle,
                description: 'Non conforme : ' + question, montant: null, onglet:'questionnaire' });
        }
        if(efficacite && efficacite <= 2){
            out.push({ cle: cleBase + ':rc', source: 'Contrôle interne — ' + cycle,
                description: 'Risque critique (efficacité ' + efficacite + '/5) : ' + question, montant: null, onglet:'questionnaire' });
        }
    });
    return out;
}
function anScannerManuelles(){
    return anChargerManuelles().map(function(m){
        return { cle: m.cle, source: 'Signalement manuel', description: m.description || m.titre,
            montant: m.montant, onglet: m.onglet, manuelle: true, titre: m.titre };
    });
}

/** Liste consolidée, chaque anomalie enrichie de son statut de résolution. */
function anToutesAnomalies(){
    var justifs = anChargerJustifs();
    var brut = [].concat(anScannerTiers(), anScannerPatente(), anScannerCI(), anScannerManuelles());
    return brut.map(function(a){
        var justification = justifs[a.cle] || '';
        a.justification = justification;
        a.resolue = !!justification.trim();
        return a;
    });
}

/* ---------- Rendu ---------- */
function anLibelleOnglet(id){
    if(typeof TABS === 'undefined') return id;
    var t = TABS.filter(function(x){ return x.id === id; })[0];
    return t ? t.label : id;
}
function anRendre(){
    var zone = document.getElementById('an-table');
    if(!zone) return;
    var toutes = anToutesAnomalies();
    var enCours = toutes.filter(function(a){ return !a.resolue; }).length;
    var resolues = toutes.length - enCours;

    setText('an-kpi-total', toutes.length);
    setText('an-kpi-encours', enCours);
    setText('an-kpi-resolues', resolues);

    if(!toutes.length){
        zone.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#27ae60;">✓ Aucune anomalie détectée pour l’instant</td></tr>';
        return;
    }
    var html = '<tr><th>Source</th><th>Description</th><th>Montant</th><th>Statut</th><th>Justification</th><th></th></tr>';
    toutes.forEach(function(a, i){
        var badge = a.resolue ? '<span class="badge badge-success">🟢 Résolue</span>' : '<span class="badge badge-danger">🔴 En cours</span>';
        html += '<tr>'
            + '<td>' + esc(a.source) + '</td>'
            + '<td>' + esc(a.description) + '</td>'
            + '<td class="number">' + (a.montant === null || a.montant === undefined ? '—' : fmt(a.montant)) + '</td>'
            + '<td>' + badge + '</td>'
            + '<td><textarea rows="1" style="width:100%; font-size:11px;" placeholder="Justification…" '
            +   'onchange="anJustifierChange(\'' + esc(a.cle).replace(/'/g,"\\'") + '\', this.value)">' + esc(a.justification) + '</textarea></td>'
            + '<td>' + (a.onglet ? '<button type="button" class="btn btn-primary" style="padding:6px 10px; font-size:11px;" '
                + 'onclick="showTab(\'' + esc(a.onglet) + '\')">↳ Corriger</button>' : '')
            + (a.manuelle ? ' <button type="button" class="btn btn-danger" style="padding:6px 10px; font-size:11px;" '
                + 'onclick="anSupprimerManuelle(\'' + esc(a.cle) + '\')">✕</button>' : '') + '</td>'
            + '</tr>';
    });
    zone.innerHTML = html;
}
function anJustifierChange(cle, texte){
    anEnregistrerJustif(cle, texte);
    anRendre();
}
function anSupprimerManuelle(cle){
    var liste = anChargerManuelles().filter(function(m){ return m.cle !== cle; });
    anEnregistrerManuelles(liste);
    anRendre();
}

/* ---------- Formulaire manuel ---------- */
function anOuvrirModal(){
    var m = document.getElementById('an-modal');
    if(!m) return;
    var selectOnglet = document.getElementById('an-modal-onglet');
    if(selectOnglet && !selectOnglet.options.length && typeof TABS !== 'undefined'){
        selectOnglet.innerHTML = TABS.map(function(t){ return '<option value="' + esc(t.id) + '">' + esc(t.label) + '</option>'; }).join('');
    }
    document.getElementById('an-modal-titre').value = '';
    document.getElementById('an-modal-description').value = '';
    document.getElementById('an-modal-montant').value = '';
    m.style.display = 'flex';
}
function anFermerModal(){
    var m = document.getElementById('an-modal');
    if(m) m.style.display = 'none';
}
function anEnregistrerModal(){
    var titre = document.getElementById('an-modal-titre').value.trim();
    if(!titre){ alert('Le titre est obligatoire.'); return; }
    var onglet = document.getElementById('an-modal-onglet').value;
    var description = document.getElementById('an-modal-description').value.trim();
    var montant = parseNum(document.getElementById('an-modal-montant').value);
    var liste = anChargerManuelles();
    liste.push({ cle: 'manuelle:' + Date.now() + ':' + Math.random().toString(36).slice(2, 8),
        titre: titre, onglet: onglet, description: description || titre, montant: montant || null });
    anEnregistrerManuelles(liste);
    anFermerModal();
    anRendre();
}

/* ---------- Installation (greffée sur l'onglet ecritures — lettre s) ---------- */
function anInstaller(){
    if(document.getElementById('an-table')) return;
    var panneau = document.getElementById('ecritures');
    if(!panneau) return;

    var carte = document.createElement('div');
    carte.className = 'card';
    carte.setAttribute('data-tab', 'ecritures');
    carte.innerHTML =
      '<h2>🔎 CENTRALISATION DES ANOMALIES</h2>'
    + '<div class="alert alert-info">Rassemble automatiquement les écarts de balance tiers, l’écart de Patente '
    + 'et les points de contrôle interne à risque, plus vos signalements manuels. Une anomalie se résout dès '
    + 'qu’une justification est saisie dans sa zone de texte.</div>'
    + '<div class="grid-3" style="margin-bottom:15px;">'
    +   '<div class="stat-box" style="background:linear-gradient(135deg,#34495e 0%,#2c3e50 100%);"><h4 id="an-kpi-total">0</h4><p>Total anomalies</p></div>'
    +   '<div class="stat-box" style="background:linear-gradient(135deg,#e74c3c 0%,#c0392b 100%);"><h4 id="an-kpi-encours">0</h4><p>En cours</p></div>'
    +   '<div class="stat-box" style="background:linear-gradient(135deg,#27ae60 0%,#1e8449 100%);"><h4 id="an-kpi-resolues">0</h4><p>Résolues</p></div>'
    + '</div>'
    + '<button type="button" class="btn btn-primary" onclick="anRendre()">🔄 Rescanner</button> '
    + '<button type="button" class="btn btn-warning" onclick="anOuvrirModal()">✍️ Signaler une anomalie manuelle</button>'
    + '<div class="scroll-table" style="margin-top:12px;"><table id="an-table"></table></div>'
    + '<div id="an-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:8000; align-items:center; justify-content:center;">'
    +   '<div class="card" style="max-width:480px; width:92%;">'
    +     '<h3>✍️ Signaler une anomalie manuelle</h3>'
    +     '<div class="form-group"><label>Titre</label><input type="text" id="an-modal-titre"></div>'
    +     '<div class="form-group"><label>Onglet concerné</label><select id="an-modal-onglet"></select></div>'
    +     '<div class="form-group"><label>Description</label><textarea id="an-modal-description" rows="3"></textarea></div>'
    +     '<div class="form-group"><label>Montant (FCFA, facultatif)</label><input type="number" id="an-modal-montant"></div>'
    +     '<div class="form-row">'
    +       '<button type="button" class="btn btn-primary" onclick="anEnregistrerModal()">Enregistrer</button>'
    +       '<button type="button" class="btn btn-warning" onclick="anFermerModal()">Annuler</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';
    panneau.appendChild(carte);
    anRendre();
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', anInstaller);
        else
            anInstaller();
    }
}catch(e){}
