/* ==================================================================
   SEVEN7 — SEUILS PAR CYCLE (ISA 320)

   L'application ne connaissait qu'un seuil de signification global et
   son seuil de planification, appliqués uniformément à tous les
   cycles. La détection des erreurs s'en servait telle quelle.

   ISA 320 admet — et parfois impose — un seuil PLUS BAS pour certains
   flux d'opérations, soldes ou informations : lorsqu'une anomalie
   d'un montant inférieur au seuil global pourrait raisonnablement
   influencer les décisions des utilisateurs des états financiers.

   Cas typiques : un poste sensible parce que réglementé, un cycle où
   la fraude est plausible, une rubrique que les lecteurs suivent de
   près, ou simplement un cycle noté à risque élevé lors de la
   cartographie.

   Le seuil proposé se déduit du RISQUE du cycle, tel que le mémo de
   synthèse l'a évalué. Ce n'est qu'une proposition documentée :
   l'auditeur la révise, et sa saisie l'emporte toujours.
   ================================================================== */

/* Facteur appliqué au seuil de planification selon le risque du cycle.
   Plus le risque est élevé, plus le seuil de travail descend. */
var SC_FACTEURS = {
    'ÉLEVÉ':  { f:0.50, just:"Risque élevé : le seuil est abaissé de moitié pour resserrer la détection." },
    'MOYEN':  { f:0.75, just:"Risque moyen : seuil légèrement abaissé." },
    'FAIBLE': { f:1.00, just:"Risque faible : le seuil de planification s'applique tel quel." }
};

/* Cycles pour lesquels un seuil réduit se justifie indépendamment du
   risque calculé — la sensibilité tient à la nature du poste. */
var SC_SENSIBLES = {
    CAP: "Capitaux propres : postes réglementés, suivis par les associés et l'administration.",
    FIS: "Fiscal et social : toute anomalie expose à un redressement, quel que soit son montant.",
    TRE: "Trésorerie : poste le plus exposé au détournement, contrôlable à l'unité près."
};
var SC_FACTEUR_SENSIBLE = 0.50;

/** Seuil de planification global, ou 0 s'il n'est pas encore fixé. */
function scSeuilGlobal(){
    if(typeof seuils === 'undefined') return 0;
    return parseNum(seuils.planif) || parseNum(seuils.signif) || 0;
}

/**
 * Seuils proposés pour chaque cycle, à partir du risque évalué.
 * @returns {Array} {id, nom, risque, facteur, seuil, justification, sensible}
 */
function scProposer(){
    var global = scSeuilGlobal();
    var risques = {};
    try{
        (memoAnalyseCycles() || []).forEach(function(c){ risques[c.id] = c.risque; });
    }catch(e){}

    var out = [];
    (typeof CYCLES !== 'undefined' ? CYCLES : []).forEach(function(c){
        var risque = risques[c.id] || 'FAIBLE';
        var base = SC_FACTEURS[risque] || SC_FACTEURS['FAIBLE'];
        var facteur = base.f, just = base.just;

        /* Un cycle sensible ne remonte jamais au-dessus du facteur réduit,
           même si son risque calculé est faible : c'est la nature du poste
           qui commande, pas la seule statistique des anomalies. */
        if(SC_SENSIBLES[c.id] && facteur > SC_FACTEUR_SENSIBLE){
            facteur = SC_FACTEUR_SENSIBLE;
            just = SC_SENSIBLES[c.id];
        }
        out.push({
            id: c.id, nom: c.nom, ico: c.ico, risque: risque,
            facteur: facteur, seuil: Math.round(global * facteur),
            justification: just, sensible: !!SC_SENSIBLES[c.id]
        });
    });
    return out;
}

/* Seuils retenus par l'auditeur, saisis dans le tableau. */
var SC_RETENUS = null;

function scCle(){
    var d = (typeof dossierId !== 'undefined' && dossierId) ? dossierId : 'local';
    return 'seven7_seuils_cycles_' + d;
}
function scCharger(){
    if(SC_RETENUS) return SC_RETENUS;
    SC_RETENUS = {};
    try{ SC_RETENUS = JSON.parse(localStorage.getItem(scCle()) || '{}') || {}; }catch(e){ SC_RETENUS = {}; }
    return SC_RETENUS;
}
function scEnregistrer(cycId, valeur){
    var m = scCharger();
    var v = parseNum(valeur) || 0;
    if(v > 0) m[cycId] = v; else delete m[cycId];
    try{ localStorage.setItem(scCle(), JSON.stringify(m)); }catch(e){}
}

/**
 * Seuil applicable à un cycle : la saisie de l'auditeur si elle existe,
 * la proposition sinon, et à défaut le seuil global.
 *
 * C'est la fonction que consomment la détection des erreurs et la revue
 * des variations : elle doit toujours rendre un nombre exploitable.
 */
function seuilDuCycle(cycId){
    var saisi = scCharger()[cycId];
    if(saisi > 0) return saisi;
    var p = scProposer();
    for(var i = 0; i < p.length; i++)
        if(p[i].id === cycId) return p[i].seuil || scSeuilGlobal();
    return scSeuilGlobal();
}

/* ------------------------------------------------------------------
   Rendu
   ------------------------------------------------------------------ */
function scRendre(){
    var zone = document.getElementById('sc-table');
    if(!zone) return;
    var global = scSeuilGlobal();
    var lignes = scProposer(), retenus = scCharger();

    var html = '<tr><th style="width:24%;">Cycle</th><th style="width:11%;">Risque</th>'
             + '<th style="width:13%;">Seuil proposé</th><th style="width:14%;">Seuil retenu</th>'
             + '<th style="width:8%;">% du global</th><th>Justification</th></tr>';

    lignes.forEach(function(l){
        var retenu = retenus[l.id] || 0;
        var effectif = retenu > 0 ? retenu : l.seuil;
        var pct = global ? Math.round((effectif / global) * 100) : 0;
        var cls = l.risque === 'ÉLEVÉ' ? 'status-danger'
                : (l.risque === 'MOYEN' ? 'status-warning' : '');
        html += '<tr' + (l.sensible ? ' style="background:#fdfaf0;"' : '') + '>'
             + '<td>' + esc(l.ico + ' ' + l.nom) + (l.sensible
                 ? ' <span style="font-size:10px; color:#b8860b;" title="Sensibilité propre au poste, '
                   + 'indépendante du risque calculé">sensible</span>' : '') + '</td>'
             + '<td class="' + cls + '">' + esc(l.risque) + '</td>'
             + '<td class="number">' + fmt(l.seuil) + '</td>'
             + '<td><input type="text" data-montant="1" value="' + (retenu > 0 ? retenu : '') + '"'
             + ' placeholder="' + fmt(l.seuil) + '"'
             + ' onchange="scEnregistrer(\'' + esc(l.id) + '\', this.value); scRendre();"></td>'
             + '<td class="number">' + (global ? pct + ' %' : '—') + '</td>'
             + '<td style="font-size:11px;">' + esc(l.justification) + '</td>'
             + '</tr>';
    });
    zone.innerHTML = html;

    var info = document.getElementById('sc-info');
    if(info){
        info.innerHTML = global
            ? 'Seuil de planification global : <strong>' + fmt(global) + '</strong> FCFA. '
              + 'Les seuils proposés en découlent, selon le risque évalué de chaque cycle.'
            : '<strong>Fixez d’abord le seuil de signification</strong> dans l’onglet Planification : '
              + 'sans lui, aucun seuil par cycle ne peut être proposé.';
    }
}

function scInstaller(){
    if(document.getElementById('sc-table')) return;
    var panneau = document.getElementById('planification');
    if(!panneau) return;
    var carte = document.createElement('div');
    carte.className = 'card';
    carte.setAttribute('data-tab', 'planification');
    carte.innerHTML =
      '<h2>🎚️ SEUILS PAR CYCLE (ISA 320)</h2>'
    + '<div class="alert alert-info">Un seuil unique appliqué à tous les cycles est rarement '
    + 'approprié. ISA 320 admet un seuil <strong>plus bas</strong> pour les postes où une anomalie '
    + 'inférieure au seuil global pourrait tout de même influencer le lecteur des comptes. '
    + 'La proposition se déduit du risque évalué en cartographie ; <strong>votre saisie '
    + 'l’emporte toujours</strong>.</div>'
    + '<p id="sc-info" style="font-size:12px; color:#666;"></p>'
    + '<button type="button" class="btn btn-primary" onclick="scRendre()">🔄 Recalculer les propositions</button>'
    + '<div class="scroll-x" style="margin-top:10px;"><table id="sc-table"></table></div>';
    panneau.appendChild(carte);
    scRendre();
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', scInstaller);
        else
            scInstaller();
    }
}catch(e){}
