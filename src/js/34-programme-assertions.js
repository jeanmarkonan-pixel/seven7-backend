/* ==================================================================
   SEVEN7 — RATTACHEMENT DU PROGRAMME DE TRAVAIL AUX ASSERTIONS

   Une étape de programme qui ne dit pas quelle assertion elle couvre
   ne se justifie pas : c'est le lien entre le risque identifié et la
   diligence qui y répond.

   Le rattachement est déduit du VERBE et de l'OBJET de la procédure,
   par des règles explicites et lisibles ci-dessous. Ce n'est pas une
   vérité : c'est une proposition. La cellule reste modifiable, et le
   survol indique quelle règle a joué, pour que l'auditeur puisse la
   contredire en connaissance de cause.

   Une procédure qui ne déclenche aucune règle reçoit une cellule vide
   plutôt qu'un rattachement approximatif — mieux vaut un blanc visible
   qu'une assertion fausse.
   ================================================================== */

/* Étapes qui ne SONT pas des tests de substance : formuler des
   recommandations, conclure, proposer des écritures de régularisation.
   Elles ne couvrent aucune assertion, et c'est normal — les marquer
   évite de confondre « rien à rattacher » et « rattachement oublié ». */
var PROG_CONCLUSION = /formuler des recommandations|conclure et proposer|proposer des (écritures|ajustements)|écritures de régularisation|recommandations sur les irrégularités/i;

/* Règles ordonnées. Toutes celles qui s'appliquent sont retenues :
   une même procédure couvre souvent plusieurs assertions.            */
var PROG_REGLES = [
 {m:/inventaire physique|existence physique|comptage|présents dans les entrepôts|étiquetage/i,
  a:['S_EXI'], p:"constat physique d'un actif"},

 {m:/circularis|confirmations? de solde|demandes? de confirmation|confirmations? +(directe|externe)|lettres? de confirmation|auprès des tiers/i,
  a:['S_EXI','S_DRO'], p:"confirmation obtenue d'un tiers"},

 {m:/exhaustivi|toutes les .{0,40}(sont|ont été) (bien )?(enregistr|comptabilis)|aucune .{0,30}n.a été omise|non comptabilis|charges à payer|non factur|omission/i,
  a:['F_EXH','S_EXH'], p:"recherche de ce qui manque"},

 {m:/cut-?off|séparation des exercices|rattach\w* (à|a) la bonne période|bon exercice|exercice correspondant|période appropriée|constatés? d.avance|premiers? mois de l.exercice suivant|dernier\w* (mois|semaines) de l.exercice|après la (clôture|fin de l.exercice)|janvier n\+1|date de (prestation|livraison)|réintégré\w* en n\+1|en n\+1/i,
  a:['F_CUT'], p:"rattachement à la période"},

 {m:/provision|déprécia|recouvrab|irrécouvrab|douteus|valorisa|évaluation|évalué|juste valeur|taux et durées|amortissement|dotations aux amortissements|perte de valeur|cours de clôture|taux de clôture/i,
  a:['S_EVA'], p:"appréciation d'une valeur"},

 {m:/reclass|ventilation|répartition|classement|classification|présent(é|ation)|imputation|affectation|immobilis(er|ée?s?|able)|repérer d.éventuelles immobilisations|nature des immobilisations|court terme (ou|et) long terme|bien class|correctement enregistrées? (dans|en) les comptes/i,
  a:['F_CLA','P_PRE'], p:"choix du poste ou du compte"},

 {m:/annexe|information\w* (fournie|requise)|figurent en annexes|mention|engagements? (donnée?s?|hors bilan)/i,
  a:['P_EXH'], p:"information à donner en annexe"},

 {m:/RCCM|statuts|registre (du commerce|des actionnaires)|procès-verbaux?|PV d|assemblée|contrat|convention|titre de propriété|propriété|garanties?|sûretés|cautionnement/i,
  a:['S_DRO'], p:"titre juridique ou acte"},

 {m:/factures? d.achat|justifi|pièce probante|réalité|effectivement (engagée|réalisée)|correspondent à des dépenses|bons? de (réception|commande|livraison)|sans lien avec l.exploitation/i,
  a:['F_REA'], p:"preuve que l'opération a eu lieu"},

 {m:/recalcul|montant exact|arithmétique|calcul|mode de calcul|exactitude|conformes aux (factures|contrats)|taux minimum|correctement calcul/i,
  a:['F_MES'], p:"exactitude d'un montant"},

 {m:/rapprocher|comparer|concordance|balance auxiliaire|tableau de variation|écarts? éventuels|analyser les écarts|obtenir (et analyser )?(la liste|le détail)|dresser un tableau|fichier des immobilisations/i,
  a:['F_MES','S_EXH'], p:"rapprochement de deux sources"},

 {m:/anormalement (créditeur|débiteur)|comptes? .{0,25}créditeurs?|comptes? .{0,25}débiteurs?/i,
  a:['F_CLA'], p:"sens de solde anormal"},

 {m:/sorties? des comptes|mises? au rebut|cédées?|cession|sortie d.actif/i,
  a:['S_EXI','F_REA'], p:"sortie d'actif à constater"},

 {m:/plus.?values?|moins.?values?|résultat de cession/i,
  a:['F_MES','F_CLA'], p:"résultat dégagé par une opération"},

 {m:/échéanc|antériorité|balance âgée|non réglées? depuis|longue période|impayé|relance|mise en demeure|recouvrement|litige|contentieux|judiciaire|négociation/i,
  a:['S_EVA','S_EXH'], p:"ancienneté ou issue incertaine"},

 {m:/méthode d.évaluation|FIFO|LIFO|coût moyen pondéré|permanence des méthodes|normes comptables/i,
  a:['S_EVA','P_PRE'], p:"méthode comptable retenue"},

 {m:/rapprochements? bancaires?|journal de caisse|brouillard de caisse|inventaire de caisse|compte de virement|585/i,
  a:['S_EXI','F_MES'], p:"contrôle de trésorerie"},

 {m:/échantillon/i,
  a:['F_REA'], p:"sondage sur pièces"},

 {m:/correspondent (bien )?à des (créances|dettes|charges|produits) (comptabilisé|enregistré)|encaissements? (effectué|reçu)s? après la clôture|paiements? effectués? après la clôture/i,
  a:['S_EXI','F_CUT'], p:"règlement postérieur confirmant un solde"},

 {m:/non liés? à des|qui ne sont pas liés|non enregistré|absence de|manquant/i,
  a:['F_EXH','S_EXH'], p:"opération sans contrepartie comptable"},

 {m:/analyser les variations|variations? de stock|évolution|anomalies éventuelles|incohérence/i,
  a:['F_MES','S_EVA'], p:"analyse de variation"},

 {m:/répartition|matières premières|en-cours|produits finis|bien présent/i,
  a:['F_CLA','P_PRE'], p:"répartition entre catégories"}
];

/** Assertions proposées pour un libellé de procédure, sans doublon.
 *  `conclusion` vaut true pour les étapes qui ne sont pas des tests. */
function progAssertions(texte){
    var t = String(texte || '');
    if(PROG_CONCLUSION.test(t))
        return { codes: [], motifs: [], conclusion: true };
    var vues = {}, out = [], motifs = [];
    PROG_REGLES.forEach(function(r){
        if(!r.m.test(t)) return;
        motifs.push(r.p);
        r.a.forEach(function(c){ if(!vues[c]){ vues[c] = 1; out.push(c); } });
    });
    return { codes: out, motifs: motifs, conclusion: false };
}

/* Ordre d'affichage : flux, puis soldes, puis présentation. */
function progTrier(codes){
    var rang = { F:1, S:2, P:3 };
    return codes.slice().sort(function(a, b){
        return (rang[a[0]] || 9) - (rang[b[0]] || 9) || a.localeCompare(b);
    });
}

/**
 * Insère la colonne « Assertions » dans le programme de travail et la
 * préremplit. Idempotent : ne fait rien si la colonne existe déjà —
 * cas d'un onglet restauré depuis Firestore, dont la saisie prime.
 */
function progInstallerAssertions(){
    var table = document.getElementById('table-programme');
    if(!table || table.getAttribute('data-assertions') === 'ok') return;

    var lignes = table.rows, POS = 2;   /* juste après « Procédure / Étape de travail » */
    for(var i = 0; i < lignes.length; i++){
        var tr = lignes[i], c = tr.cells;

        /* ligne d'en-têtes */
        if(c[0] && c[0].tagName === 'TH'){
            var th = document.createElement('th');
            th.textContent = 'Assertions couvertes';
            th.style.width = '14%';
            tr.insertBefore(th, c[POS] || null);
            continue;
        }
        /* bandeau de cycle : une seule cellule fusionnée, on l'élargit */
        if(tr.className.indexOf('prog-cycle-header') !== -1){
            if(c[0] && c[0].hasAttribute('colspan'))
                c[0].setAttribute('colspan', String(parseInt(c[0].getAttribute('colspan'), 10) + 1));
            continue;
        }
        /* ligne de procédure */
        var zone = c[1] ? c[1].querySelector('textarea, input') : null;
        var prop = progAssertions(zone ? (zone.value || zone.textContent) : '');
        var td = document.createElement('td');
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.setAttribute('data-fmt', 'non');
        inp.setAttribute('onchange', "updateStatus('programme')");
        inp.style.fontSize = '11px';
        if(prop.conclusion){
            inp.value = '— étape de conclusion —';
            inp.title = "Cette étape formule une conclusion ou propose une régularisation : "
                      + "elle ne couvre aucune assertion, et c'est normal.";
            inp.style.color = '#888';
        } else {
            inp.value = prop.codes.length ? progTrier(prop.codes).map(assertLib).join(' · ') : '';
            inp.title = prop.motifs.length
                ? "Proposé d'après : " + prop.motifs.join(' ; ') + ".\nModifiable — cette proposition n'engage que le rattachement automatique."
                : "Aucune règle de rattachement n'a joué : à renseigner par l'auditeur.";
            if(!prop.codes.length) inp.style.background = '#fffbe6';
        }
        td.appendChild(inp);
        tr.insertBefore(td, c[POS] || null);
    }
    table.setAttribute('data-assertions', 'ok');
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', progInstallerAssertions);
        else
            progInstallerAssertions();
    }
}catch(e){}
