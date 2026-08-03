/* ==================================================================
   SEVEN7 — FAITS MARQUANTS DE L'EXERCICE

   Ce sont les événements que L'ENTITÉ expose à l'auditeur lors de la
   prise de connaissance : ce qui a marqué l'exercice, et ce qui a
   marqué le précédent dont les effets se prolongent.

   Ils ne se déduisent pas des comptes — ils viennent de l'entretien
   avec la direction. Mais une fois recueillis, ils commandent tout le
   reste : un fait marquant déclaré doit se retrouver dans les chiffres,
   et un mouvement significatif dans les chiffres doit s'expliquer par
   un fait déclaré. C'est ce recoupement que ce module automatise.

   À ne pas confondre avec l'onglet Constatations d'audit (module 35),
   qui rassemble ce que NOS contrôles ont relevé.

   ISA 315 : la compréhension de l'entité et de son environnement est
   la base de l'évaluation du risque d'anomalies significatives.
   ================================================================== */

/* Catégories d'événements, avec pour chacune :
     cyc  — cycles comptables que le fait vient toucher
     ctrl — recoupement automatique proposé quand le fait est déclaré  */
var FAITS_CATEGORIES = [
 {id:'DIRECTION', ico:'👔', lib:"Changement de dirigeant, d'actionnariat ou de gouvernance",
  cyc:['CAP'], ctrl:"Rapprocher des PV d'assemblée, du RCCM et des conventions réglementées.",
  risque:"Un changement de contrôle modifie l'appréciation du risque de fraude et des parties liées."},

 {id:'CAPITAL', ico:'💼', lib:"Opération sur le capital : augmentation, réduction, apport, fusion",
  cyc:['CAP'], ctrl:"Vérifier la variation des comptes 10 et 11 et la concordance avec les PV.",
  risque:"Formalisme juridique et évaluation des apports."},

 {id:'INVEST', ico:'🏗️', lib:"Investissement ou acquisition significative",
  cyc:['IMM'], ctrl:"Vérifier la variation de l'actif immobilisé brut et le financement associé.",
  risque:"Qualification en charge ou en immobilisation, point de départ de l'amortissement."},

 {id:'CESSION', ico:'📤', lib:"Cession, arrêt d'activité ou fermeture de site",
  cyc:['IMM','HAO'], ctrl:"Vérifier les sorties d'actif, les plus ou moins-values et le résultat HAO.",
  risque:"Sortie des comptes, calcul du résultat de cession, dépréciation des actifs restants."},

 {id:'FINANCEMENT', ico:'🏦', lib:"Nouveau financement, refinancement ou difficulté de trésorerie",
  cyc:['CAP','TRE'], ctrl:"Vérifier les comptes 16 et 17, les intérêts courus et les garanties données.",
  risque:"Exhaustivité des dettes, engagements hors bilan, continuité d'exploitation."},

 {id:'ACTIVITE', ico:'📈', lib:"Nouvelle activité, nouveau marché, ou perte d'un client majeur",
  cyc:['VTE'], ctrl:"Analyser la variation du chiffre d'affaires et de la marge par rapport à N-1.",
  risque:"Reconnaissance du revenu, concentration du risque client."},

 {id:'LITIGE', ico:'⚖️', lib:"Litige, contentieux, contrôle fiscal ou social",
  cyc:['FIS','AUT'], ctrl:"Vérifier les provisions pour risques et l'information donnée en annexe.",
  risque:"Provision insuffisante ou absente, passif éventuel non mentionné."},

 {id:'SINISTRE', ico:'🔥', lib:"Sinistre, vol, incendie ou perte exceptionnelle",
  cyc:['IMM','STK','HAO'], ctrl:"Vérifier la sortie des actifs détruits et l'indemnité d'assurance.",
  risque:"Rattachement de l'indemnité, dépréciation des biens sinistrés."},

 {id:'METHODE', ico:'📐', lib:"Changement de méthode comptable ou d'estimation",
  cyc:['AUT'], ctrl:"Vérifier l'information en annexe et le traitement de l'impact sur les capitaux propres.",
  risque:"Permanence des méthodes, comparabilité des exercices."},

 {id:'SI', ico:'💻', lib:"Changement de système d'information ou de logiciel comptable",
  cyc:['AUT'], ctrl:"Vérifier la reprise des à-nouveaux et l'intégrité des soldes après migration.",
  risque:"Perte ou altération de données à la bascule, piste d'audit rompue."},

 {id:'ORGANISATION', ico:'🔧', lib:"Réorganisation, plan social ou mouvement de personnel important",
  cyc:['PER'], ctrl:"Vérifier les provisions pour indemnités et la variation des charges de personnel.",
  risque:"Provision pour restructuration, indemnités de départ."},

 {id:'REGLEMENTAIRE', ico:'📜', lib:"Évolution réglementaire ou fiscale affectant l'entité",
  cyc:['FIS'], ctrl:"Vérifier la prise en compte du nouveau texte dans les comptes.",
  risque:"Non-conformité, redressement, information en annexe."},

 {id:'PARTIES', ico:'🔗', lib:"Opération significative avec une partie liée",
  cyc:['REG'], ctrl:"Rapprocher de l'onglet Parties liées et du rapport spécial.",
  risque:"Conditions non normales, autorisation préalable, information en annexe."},

 {id:'AUTRE', ico:'📌', lib:"Autre événement significatif exposé par l'entité",
  cyc:[], ctrl:"À apprécier selon la nature du fait.",
  risque:""}
];

/* ------------------------------------------------------------------
   RECOUPEMENT AVEC LES CHIFFRES
   Un fait déclaré doit se voir dans les comptes ; une variation forte
   doit s'expliquer par un fait. Les deux sens sont testés.
   ------------------------------------------------------------------ */

/** Variation d'un ensemble de préfixes entre N-1 et N, en valeur absolue. */
function fxVariation(pfx){
    try{
        return cycSumPfx('n', pfx, 'solde') - cycSumPfx('n1', pfx, 'solde');
    }catch(e){ return 0; }
}

/** Seuil au-delà duquel une variation mérite une explication. */
function fxSeuil(){
    var s = (typeof seuils !== 'undefined' && seuils.signif) ? seuils.signif : 0;
    if(s > 0) return s;
    try{ return Math.abs(liasseGetActif('n').BZ.net || 0) * 0.05; }catch(e){ return 0; }
}

/**
 * Variations significatives que rien de déclaré n'explique.
 * @param {string[]} declares  identifiants de catégories cochées « Oui »
 */
function fxVariationsInexpliquees(declares){
    var seuil = fxSeuil();
    if(!seuil) return [];
    var d = declares || [];
    var sondes = [
        {cat:'INVEST',      pfx:['20','21','22','23','24','25','26','27'], lib:"Actif immobilisé brut"},
        {cat:'ACTIVITE',    pfx:['70'],                                    lib:"Chiffre d'affaires"},
        {cat:'FINANCEMENT', pfx:['16','17'],                               lib:"Emprunts et dettes financières"},
        {cat:'ORGANISATION',pfx:['66'],                                    lib:"Charges de personnel"},
        {cat:'CAPITAL',     pfx:['10'],                                    lib:"Capital"},
        {cat:'LITIGE',      pfx:['19'],                                    lib:"Provisions pour risques et charges"},
        {cat:'CESSION',     pfx:['8'],                                     lib:"Opérations hors activités ordinaires"}
    ];
    var out = [];
    sondes.forEach(function(s){
        if(d.indexOf(s.cat) !== -1) return;      /* un fait le justifie déjà */
        var v = fxVariation(s.pfx);
        if(Math.abs(v) > seuil){
            var c = FAITS_CATEGORIES.filter(function(x){ return x.id === s.cat; })[0] || {};
            out.push({ cat:s.cat, lib:s.lib, variation:v,
                       question:"« " + s.lib + " » varie de " + fmt(v)
                              + " sans qu'aucun fait marquant ne l'explique. "
                              + (c.lib ? "Interroger la direction sur : " + c.lib.toLowerCase() + "." : "") });
        }
    });
    return out;
}

/** Faits déclarés que les chiffres ne corroborent pas. */
function fxFaitsNonCorrobores(declares){
    var seuil = fxSeuil();
    if(!seuil) return [];
    var paires = { INVEST:['20','21','22','23','24','25','26','27'], ACTIVITE:['70'],
                   FINANCEMENT:['16','17'], ORGANISATION:['66'], CAPITAL:['10'],
                   LITIGE:['19'], CESSION:['8'] };
    var out = [];
    (declares || []).forEach(function(cat){
        if(!paires[cat]) return;
        var v = fxVariation(paires[cat]);
        if(Math.abs(v) <= seuil){
            var c = FAITS_CATEGORIES.filter(function(x){ return x.id === cat; })[0] || {};
            out.push({ cat:cat, lib:c.lib || cat, variation:v,
                       question:"Fait déclaré « " + (c.lib || cat) + " », mais les comptes correspondants "
                              + "ne varient que de " + fmt(v) + ", en deçà du seuil. "
                              + "Vérifier que l'opération a bien été comptabilisée." });
        }
    });
    return out;
}

/* ------------------------------------------------------------------
   RENDU
   ------------------------------------------------------------------ */
function fxLigneHtml(c){
    var oc = "onchange=\"fxRecouper()\"";
    return '<tr data-cat="' + esc(c.id) + '">'
        + '<td style="font-size:12px;">' + esc(c.ico + ' ' + c.lib)
        + (c.risque ? '<br><span style="font-size:11px; color:#777;">Enjeu : ' + esc(c.risque) + '</span>' : '')
        + '</td>'
        + '<td><select class="fx-survenu" ' + oc + '><option></option><option>Oui</option>'
        + '<option>Non</option><option>Ne sait pas</option></select></td>'
        + '<td><select ' + oc + '><option></option><option>Exercice N</option>'
        + '<option>Exercice N-1</option><option>Les deux</option></select></td>'
        + '<td><textarea rows="2" onchange="updateStatus(\'faits-exercice\')" '
        + 'placeholder="Ce que l’entité nous a exposé"></textarea></td>'
        + '<td style="font-size:11px; color:#666;">' + esc(c.ctrl) + '</td>'
        + '<td><textarea rows="2" onchange="updateStatus(\'faits-exercice\')" '
        + 'placeholder="Diligence retenue et conclusion"></textarea></td>'
        + '</tr>';
}

/** Catégories déclarées « Oui » dans le tableau. */
function fxDeclares(){
    var t = document.getElementById('table-faits-exercice');
    if(!t) return [];
    var out = [];
    for(var i = 1; i < t.rows.length; i++){
        var tr = t.rows[i], s = tr.querySelector('.fx-survenu');
        if(s && s.value === 'Oui' && tr.getAttribute('data-cat')) out.push(tr.getAttribute('data-cat'));
    }
    return out;
}

/** Met à jour le bloc de recoupement avec les chiffres. */
function fxRecouper(){
    var zone = document.getElementById('fx-recoupement');
    if(!zone) return;
    var d = fxDeclares();
    var manques = fxVariationsInexpliquees(d);
    var creux   = fxFaitsNonCorrobores(d);

    if(!fxSeuil()){
        zone.innerHTML = '<div class="alert alert-info">Chargez les balances et fixez le seuil de '
                       + 'signification pour que le recoupement avec les chiffres se fasse.</div>';
        return;
    }
    var h = '';
    if(!manques.length && !creux.length){
        h = '<div class="alert alert-success">✓ Les faits déclarés et les variations des comptes '
          + 'se recoupent, au regard du seuil de signification.</div>';
    } else {
        h = '<table><tr><th style="width:22%;">Point d’attention</th><th>Question à poser à la direction</th></tr>';
        manques.forEach(function(m){
            h += '<tr><td class="status-warning">Variation inexpliquée</td><td>' + esc(m.question) + '</td></tr>';
        });
        creux.forEach(function(m){
            h += '<tr><td class="status-warning">Fait sans trace comptable</td><td>' + esc(m.question) + '</td></tr>';
        });
        h += '</table>';
    }
    zone.innerHTML = h;
    if(typeof updateStatus === 'function') updateStatus('faits-exercice');
}

function fxInstaller(){
    if(typeof TABS !== 'undefined' && !TABS.some(function(t){ return t.id === 'faits-exercice'; }))
        TABS.push({ id:'faits-exercice', label:'📌 Faits Marquants de l’Exercice', phase:1 });

    var hote = (document.querySelector('.tab-content') || {}).parentNode;
    if(!hote) return;

    if(!document.getElementById('faits-exercice')){
        var d = document.createElement('div');
        d.id = 'faits-exercice';
        d.className = 'tab-content';
        d.innerHTML =
          '<div class="card" data-tab="faits-exercice">'
        + '<h2>📌 FAITS MARQUANTS DE L’EXERCICE</h2>'
        + '<div class="alert alert-info">Événements que <strong>l’entité vous expose</strong> lors de '
        + 'la prise de connaissance, pour l’exercice audité et pour le précédent dont les effets se '
        + 'prolongent. Ils commandent l’approche : un fait déclaré doit se retrouver dans les chiffres, '
        + 'et une variation forte doit s’expliquer par un fait. Le recoupement est proposé en bas de page.</div>'
        + '<table id="table-faits-exercice">'
        + '<tr><th style="width:26%;">Nature de l’événement</th><th style="width:9%;">Survenu ?</th>'
        + '<th style="width:10%;">Exercice</th><th style="width:22%;">Exposé de l’entité</th>'
        + '<th style="width:16%;">Recoupement attendu</th><th style="width:17%;">Diligence & conclusion</th></tr>'
        + FAITS_CATEGORIES.map(fxLigneHtml).join('')
        + '</table>'
        + '<h3 style="margin-top:22px;">Recoupement avec les comptes</h3>'
        + '<button type="button" class="btn btn-primary" onclick="fxRecouper()">🔗 Recouper avec les chiffres</button>'
        + '<div id="fx-recoupement" style="margin-top:12px;"></div>'
        + '<div class="form-group" style="margin-top:18px;"><label>Synthèse : incidence des faits marquants sur l’approche d’audit</label>'
        + '<textarea rows="4" onchange="updateStatus(\'faits-exercice\')"></textarea></div>'
        + '</div>';
        hote.appendChild(d);
    }

    var menu = document.getElementById('phase-dropdown-1');
    if(menu && !menu.querySelector('[data-fx]')){
        var b = document.createElement('button');
        b.className = 'tab-btn phase1';
        b.setAttribute('data-fx', '1');
        b.setAttribute('onclick', "showTab('faits-exercice')");
        b.textContent = '📌 Faits Marquants de l’Exercice';
        var apres = menu.querySelector("[onclick*=\"'identification'\"]");
        if(apres && apres.nextSibling) menu.insertBefore(b, apres.nextSibling); else menu.appendChild(b);
    }
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', fxInstaller);
        else
            fxInstaller();
    }
}catch(e){}
