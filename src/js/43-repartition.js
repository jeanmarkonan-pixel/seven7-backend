/* ==================================================================
   SEVEN7 — RÉPARTITION DES COMPTES AMBIGUS (suffixe « p »)

   Certains comptes d'amortissement et de dépréciation sont revendiqués
   par PLUSIEURS postes de la planche officielle, avec le suffixe « p »
   pour « quote-part » : 2818p appartient à AE et à AH, 2919p à AE, AF
   et AH, 2949p à AM et AN.

   Jusqu'ici le moteur les rattachait EN TOTALITÉ au premier poste
   déclaré, et signalait le conflit sans le résoudre. Le total du bilan
   restait juste, mais la ventilation entre postes était fausse.

   Ce module porte le mécanisme de répartition fourni en référence.
   Trois adaptations ont été nécessaires :

   1. SYNCHRONE. Le module d'origine est asynchrone ; liasseGetActif ne
      l'est pas, et l'est appelé de partout. Une chaîne de promesses
      aurait imposé de réécrire tout le moteur.
   2. localStorage AU LIEU DE window.storage, qui n'existe pas ici. Les
      règles sont peu volumineuses et propres au poste de travail.
   3. REPLI SÛR. Le module d'origine ne renvoie RIEN pour une règle non
      validée : le montant disparaîtrait et le bilan cesserait
      d'équilibrer. Ici, un compte non réparti reste rattaché comme
      avant — total juste, ventilation approchée — et il est signalé.

   La garantie essentielle du module d'origine est conservée : UNE RÈGLE
   EN POURCENTAGE NE S'APPLIQUE JAMAIS TANT QUE L'AUDITEUR NE L'A PAS
   VALIDÉE. Une suggestion reste une suggestion.
   ================================================================== */

/* Suggestions issues du référentiel DGI. Aucune ne s'applique tant que
   validePar est nul : ce sont des points de départ, pas des décisions. */
var REP_REGLES_DEFAUT = {
    '2818': { libelle:"Amortissements des autres immobilisations incorporelles",
              methode:'pourcentage', cibles:[{ref:'AE', pct:0.5}, {ref:'AH', pct:0.5}],
              origine:'suggestion', validePar:null, dateValidation:null, reconductible:true },
    '2918': { libelle:"Dépréciations des autres immobilisations incorporelles",
              methode:'pourcentage', cibles:[{ref:'AE', pct:0.5}, {ref:'AH', pct:0.5}],
              origine:'suggestion', validePar:null, dateValidation:null, reconductible:true },
    '2919': { libelle:"Dépréciations des autres immobilisations incorporelles",
              methode:'pourcentage', cibles:[{ref:'AE', pct:0.34}, {ref:'AF', pct:0.33}, {ref:'AH', pct:0.33}],
              origine:'suggestion', validePar:null, dateValidation:null, reconductible:true },
    '2939': { libelle:"Dépréciations des bâtiments et aménagements",
              methode:'pourcentage', cibles:[{ref:'AK', pct:0.5}, {ref:'AL', pct:0.5}],
              origine:'suggestion', validePar:null, dateValidation:null, reconductible:true },
    '2949': { libelle:"Dépréciations du matériel",
              methode:'pourcentage', cibles:[{ref:'AM', pct:0.5}, {ref:'AN', pct:0.5}],
              origine:'suggestion', validePar:null, dateValidation:null, reconductible:true }
};

/* ------------------------------------------------------------------
   Persistance — par dossier, pour qu'un cabinet ne transporte pas les
   arbitrages d'un client chez un autre.
   ------------------------------------------------------------------ */
function repCle(){
    var d = '';
    try{ d = window.SEVEN7_DOSSIER_ID || ''; }catch(e){}
    return 'seven7_repartition' + (d ? '_' + d : '');
}
var REP_CACHE = null;

function repCharger(){
    if(REP_CACHE) return REP_CACHE;
    var regles = null;
    try{
        var brut = localStorage.getItem(repCle());
        if(brut) regles = JSON.parse(brut);
    }catch(e){}
    if(!regles || typeof regles !== 'object') regles = {};
    /* Les suggestions complètent, sans jamais écraser un arbitrage rendu. */
    for(var k in REP_REGLES_DEFAUT)
        if(Object.prototype.hasOwnProperty.call(REP_REGLES_DEFAUT, k) && !regles[k])
            regles[k] = JSON.parse(JSON.stringify(REP_REGLES_DEFAUT[k]));
    REP_CACHE = regles;
    return regles;
}
function repEnregistrer(regles){
    REP_CACHE = regles;
    try{ localStorage.setItem(repCle(), JSON.stringify(regles)); }catch(e){}
}
/* Vide le cache mémoire : les arbitrages enregistrés sont conservés.
   Appelé au changement de dossier, pour relire les règles du nouveau. */
function repOublier(){ REP_CACHE = null; }

/* Efface les arbitrages rendus et revient aux seules suggestions.
   Geste délibéré : c'est la seule façon de revenir sur une décision
   reconduite d'exercice en exercice. */
function repEffacer(){
    REP_CACHE = null;
    try{ localStorage.removeItem(repCle()); }catch(e){}
}

/* ------------------------------------------------------------------
   Détection et résolution
   ------------------------------------------------------------------ */
/** Racine de répartition qui couvre ce compte, la plus longue d'abord. */
function repRacine(compte){
    var m = String(compte === undefined || compte === null ? '' : compte).trim().match(/^\d+/);
    if(!m) return null;
    var d = m[0], regles = repCharger();
    var racines = Object.keys(regles).sort(function(a, b){ return b.length - a.length; });
    for(var i = 0; i < racines.length; i++)
        if(d.indexOf(racines[i]) === 0) return racines[i];
    return null;
}

/** Une règle est-elle applicable ? Une suggestion ne l'est jamais. */
function repApplicable(regle){
    if(!regle || regle.methode !== 'pourcentage') return false;
    if(regle.origine === 'suggestion' && !regle.validePar) return false;
    return !!(regle.cibles && regle.cibles.length);
}

/**
 * Quotes-parts d'un compte : { ref: fraction } — ou null si le compte
 * n'est pas ambigu, ou si sa règle n'a pas été validée.
 */
function repQuoteParts(compte){
    var racine = repRacine(compte);
    if(!racine) return null;
    var regle = repCharger()[racine];
    if(!repApplicable(regle)) return null;
    var out = {};
    for(var i = 0; i < regle.cibles.length; i++){
        var c = regle.cibles[i];
        out[c.ref] = (out[c.ref] || 0) + (c.pct || 0);
    }
    return out;
}

/**
 * Comptes ambigus présents dans la balance et NON encore répartis.
 * @returns {Array} [{compte, intitule, racine, libelle, montant, cibles}]
 */
function repEnAttente(ex){
    var rows = (typeof balanceData !== 'undefined' && balanceData[ex || 'n']) ? balanceData[ex || 'n'] : [];
    var regles = repCharger(), vus = {}, out = [];
    for(var i = 0; i < rows.length; i++){
        var r = rows[i];
        var racine = repRacine(r.compte);
        if(!racine) continue;
        if(repApplicable(regles[racine])) continue;
        var k = String(r.compte).trim();
        if(vus[k]) continue;
        vus[k] = 1;
        var sd = parseNum(r.sd) || 0, sc = parseNum(r.sc) || 0;
        out.push({
            compte: k, intitule: (r.intitule || '').trim(), racine: racine,
            libelle: (regles[racine] || {}).libelle || '',
            montant: sc - sd,
            cibles: ((regles[racine] || {}).cibles || []).slice()
        });
    }
    return out;
}

/** Enregistre l'arbitrage de l'auditeur. Les parts doivent totaliser 100 %. */
function repValider(racine, cibles, utilisateur){
    var total = 0;
    for(var i = 0; i < cibles.length; i++) total += cibles[i].pct || 0;
    if(Math.abs(total - 1) > 0.001)
        throw new Error('La répartition de ' + racine + ' doit totaliser 100 % (actuellement '
                      + (total * 100).toFixed(1) + ' %).');
    var regles = repCharger();
    var base = regles[racine] || {};
    regles[racine] = {
        libelle: base.libelle || '', methode: 'pourcentage', cibles: cibles,
        origine: 'manuel', validePar: utilisateur || 'auditeur',
        dateValidation: new Date().toISOString().slice(0, 10), reconductible: true
    };
    repEnregistrer(regles);
    return regles[racine];
}

/** Annule un arbitrage et revient à la suggestion d'origine. */
function repReinitialiser(racine){
    var regles = repCharger();
    if(REP_REGLES_DEFAUT[racine]) regles[racine] = JSON.parse(JSON.stringify(REP_REGLES_DEFAUT[racine]));
    else delete regles[racine];
    repEnregistrer(regles);
}

/* ------------------------------------------------------------------
   Interface — bandeau et fenêtre d'arbitrage
   ------------------------------------------------------------------ */
function repRendreBandeau(){
    var vieux = document.getElementById('rep-bandeau');
    if(vieux) vieux.remove();
    var attente = repEnAttente('n');
    if(!attente.length) return;

    var hote = document.getElementById('liasse-parametres') || document.getElementById('bilan');
    if(!hote) return;
    var d = document.createElement('div');
    d.id = 'rep-bandeau';
    d.className = 'alert alert-warning';
    d.innerHTML = '⚠ <strong>' + attente.length + ' compte(s) à répartir entre plusieurs postes.</strong> '
        + 'Ils sont pour l’instant rattachés en totalité au premier poste déclaré : le total du bilan '
        + 'reste juste, mais leur ventilation ne l’est pas. '
        + '<button type="button" class="btn btn-primary" style="margin-left:10px;" '
        + 'onclick="repOuvrirFenetre()">Arbitrer maintenant</button>';
    hote.insertBefore(d, hote.firstChild);
}

function repOuvrirFenetre(){
    var attente = repEnAttente('n');
    if(!attente.length) return;
    var vieux = document.getElementById('rep-fenetre');
    if(vieux) vieux.remove();

    var h = '<div style="background:#fff; max-width:640px; margin:6vh auto; padding:22px; border-radius:8px; max-height:84vh; overflow:auto;">'
        + '<h3 style="margin:0 0 6px;">Répartition des comptes ambigus</h3>'
        + '<p style="font-size:12px; color:#666; margin:0 0 16px;">Ces comptes sont revendiqués par plusieurs '
        + 'postes de la planche officielle. Indiquez la part qui revient à chacun. '
        + '<strong>Votre arbitrage est mémorisé et reconduit les exercices suivants.</strong> '
        + 'Les pourcentages proposés sont une suggestion du référentiel, pas une règle comptable.</p>';

    for(var i = 0; i < attente.length; i++){
        var a = attente[i];
        h += '<div style="margin-bottom:14px; padding:10px; background:#f7f9fc; border-radius:6px;">'
           + '<div style="font-weight:600; font-size:13px;">' + esc(a.compte) + ' — ' + esc(a.intitule || a.libelle) + '</div>'
           + '<div style="font-size:11px; color:#777; margin-bottom:8px;">Montant à répartir : ' + fmt(a.montant) + ' FCFA</div>';
        for(var j = 0; j < a.cibles.length; j++){
            h += '<label style="display:inline-flex; align-items:center; gap:6px; margin:0 14px 6px 0; font-size:12px;">'
               + esc(a.cibles[j].ref) + ' <input type="number" min="0" max="100" step="1" '
               + 'value="' + Math.round((a.cibles[j].pct || 0) * 100) + '" '
               + 'data-rep-racine="' + esc(a.racine) + '" data-rep-ref="' + esc(a.cibles[j].ref) + '" '
               + 'data-fmt="non" style="width:62px;"> %</label>';
        }
        h += '</div>';
    }
    h += '<div style="text-align:right; margin-top:14px;">'
       + '<button type="button" class="btn" onclick="document.getElementById(\'rep-fenetre\').remove()">Annuler</button> '
       + '<button type="button" class="btn btn-primary" onclick="repValiderFenetre()">Valider et mémoriser</button>'
       + '</div><p id="rep-erreur" style="color:#c0392b; font-size:12px; margin:8px 0 0;"></p></div>';

    var o = document.createElement('div');
    o.id = 'rep-fenetre';
    o.style.cssText = 'position:fixed; inset:0; background:rgba(27,42,74,.7); z-index:9999; overflow:auto;';
    o.innerHTML = h;
    document.body.appendChild(o);
}

function repValiderFenetre(){
    var f = document.getElementById('rep-fenetre');
    if(!f) return;
    var parRacine = {};
    var champs = f.querySelectorAll('[data-rep-racine]');
    for(var i = 0; i < champs.length; i++){
        var c = champs[i], racine = c.getAttribute('data-rep-racine');
        if(!parRacine[racine]) parRacine[racine] = [];
        parRacine[racine].push({ ref: c.getAttribute('data-rep-ref'), pct: (parseNum(c.value, true) || 0) / 100 });
    }
    try{
        for(var r in parRacine)
            if(Object.prototype.hasOwnProperty.call(parRacine, r)) repValider(r, parRacine[r], 'auditeur');
    }catch(e){
        var err = document.getElementById('rep-erreur');
        if(err) err.textContent = e.message;
        return;
    }
    f.remove();
    if(typeof liasseRefreshAll === 'function') liasseRefreshAll();
    if(typeof updateAllCalculations === 'function') updateAllCalculations();
    repRendreBandeau();
}
