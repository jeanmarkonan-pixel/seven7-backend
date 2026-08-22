/* ==================================================================
   SEVEN7 — DÉTECTION DES ERREURS DE CODIFICATION SYSCOHADA (22/08)

   Analyse la balance N/N-1 et la Balance tiers pour repérer trois familles
   de non-conformités demandées par le cabinet :

     1. Racine de classe : le libellé évoque une nature de compte (achat de
        marchandises, banque, salaires…) mais le numéro de compte ne
        commence pas par la racine SYSCOHADA attendue (SYSC_MOTS_CLES).
     2. Compte générique non ventilé : un compte tiers (40/41) réduit à sa
        racine nue (401000, 411000…) — tout ce qui suit les 3 premiers
        chiffres est à zéro — signe qu'aucun sous-compte par tiers n'a été
        ouvert.
     3. Incohérence N / N-1 : un même libellé (normalisé) change de racine
        de compte d'un exercice à l'autre, sans que rien ne l'explique —
        signe d'une reclassification hasardeuse plutôt que d'un transfert
        documenté.

   Ce sont des règles explicites, déterministes et vérifiables — pas une
   « IA sémantique » : sur un outil d'audit, un faux positif doit pouvoir
   s'expliquer en une phrase à l'auditeur.

   « Appliquer la re-classification » ne touche jamais balanceData ni le
   CSV d'origine : elle enregistre une correspondance compte→racine dans
   syscOverrides (persistée par dossier, comme 43-repartition.js), que
   paramResolve() (25-moteur-etape2.js) consulte en priorité. Le compte
   se comporte alors, pour le Bilan et le Compte de Résultat UNIQUEMENT,
   comme s'il commençait par la racine recommandée — réversible à tout
   moment via « Annuler ».
   ================================================================== */

// racine : préfixe utilisé pour la DÉTECTION (large, tolère toute sous-
// numérotation propre au cabinet). precis : le compte SYSCOHADA révisé à 4
// chiffres affiché comme recommandation, quand la nomenclature officielle en
// définit un de portée générale. Pour les comptes de tiers (40/41) et les
// banques (52), le 4ᵉ chiffre dépend du fournisseur/client/établissement
// concerné — aucun code universel n'existe, donc pas de "precis" inventé :
// mieux vaut le dire que d'afficher un numéro faux.
var SYSC_MOTS_CLES = [
    { motif: /achat.*(march|marchandise)/i, racine:'601', precis:'6011' },
    { motif: /achat.*(mati[eè]re|premi[eè]re)/i, racine:'602', precis:'6021' },
    { motif: /vente.*(march|marchandise)/i, racine:'701', precis:'7011' },
    { motif: /(salaire|personnel|r[eé]mun[eé]ration)/i, racine:'66', precis:'6611' },
    { motif: /banque/i, racine:'52' },
    { motif: /caisse/i, racine:'57', precis:'5711' },
    { motif: /fournisseur/i, racine:'40' },
    { motif: /client/i, racine:'41' },
    { motif: /terrain/i, racine:'22', precis:'2211' },
    { motif: /b[aâ]timent/i, racine:'23', precis:'2311' },
    { motif: /(mat[eé]riel|mobilier)/i, racine:'24', precis:'2441' },
    { motif: /^capital/i, racine:'101', precis:'1011' }
];

var SYSC_ACCENTS = { 'É':'E','È':'E','Ê':'E','Ë':'E','À':'A','Â':'A','Ä':'A','Ô':'O','Ö':'O','Ù':'U','Û':'U','Ü':'U','Ç':'C','Î':'I','Ï':'I' };
function syscNormaliser(libelle){
    var s = String(libelle || '').toUpperCase();
    var out = '';
    for(var i = 0; i < s.length; i++){ out += SYSC_ACCENTS[s[i]] || s[i]; }
    return out.replace(/[^A-Z0-9]+/g, ' ').trim();
}

/* ---------- Règle 1 : racine de classe ---------- */
function syscDetecterRacine(){
    var out = [];
    (balanceData.n || []).forEach(function(r){
        var compte = String(r.compte || '').trim();
        var montant = (r.sd || 0) || (r.sc || 0);
        if(!compte || !montant) return;
        for(var i = 0; i < SYSC_MOTS_CLES.length; i++){
            var regle = SYSC_MOTS_CLES[i];
            if(!regle.motif.test(r.intitule || '')) continue;
            if(compte.indexOf(regle.racine) === 0) break; // conforme, règle suivante inutile
            var applicable = regle.precis || regle.racine;
            var recommande = regle.precis
                ? regle.precis
                : regle.racine + ' (4ᵉ chiffre selon le tiers/l’établissement concerné — sans code universel)';
            out.push({ compte:compte, intitule:r.intitule,
                erreur:'Libellé évoquant un compte ' + regle.racine + ', mais numéroté ' + compte,
                compteRecommande: recommande, compteApplicable: applicable, montant: montant });
            break; // une seule règle de mot-clé par compte, la première qui matche
        }
    });
    return out;
}

/* ---------- Règle 2 : compte tiers générique, jamais ventilé ---------- */
function syscEstGenerique(compte){
    var c = String(compte || '');
    if(!/^(40|41)/.test(c)) return false;
    return c.length > 3 && /^0+$/.test(c.slice(3));
}
function syscDetecterGenerique(){
    var out = [];
    (balanceData.n || []).forEach(function(r){
        var compte = String(r.compte || '').trim();
        var montant = (r.sd || 0) || (r.sc || 0);
        if(!montant || !syscEstGenerique(compte)) return;
        var exemple = compte.slice(0, 3) + '1'; // ex. 401000 → 4011, premier sous-compte à 4 chiffres
        out.push({ compte:compte, intitule:r.intitule,
            erreur:'Compte collectif générique, jamais ventilé par tiers',
            compteRecommande: exemple + ' (exemple — un compte à 4 chiffres par tiers, ex. ' + exemple + ', ' + compte.slice(0, 3) + '2…)',
            compteApplicable: exemple, montant: montant });
    });
    return out;
}

/* ---------- Règle 3 : incohérence de racine entre N et N-1 ---------- */
function syscDetecterIncoherenceNN1(){
    var out = [];
    var n1ParLibelle = {};
    (balanceData.n1 || []).forEach(function(r){
        if(!(r.sd || r.sc)) return;
        var lbl = syscNormaliser(r.intitule);
        if(lbl) n1ParLibelle[lbl] = r;
    });
    (balanceData.n || []).forEach(function(r){
        var lbl = syscNormaliser(r.intitule);
        var ancien = n1ParLibelle[lbl];
        if(!ancien) return;
        var compteN = String(r.compte || '').trim();
        var compteN1 = String(ancien.compte || '').trim();
        if(!compteN || compteN === compteN1) return;
        if(compteN.slice(0, 2) === compteN1.slice(0, 2)) return; // même racine, juste un sous-compte différent
        out.push({ compte:compteN, intitule:r.intitule,
            erreur:'Compte ' + compteN1 + ' en N-1 (même libellé), racine différente en N sans écriture de transfert visible',
            compteRecommande: compteN1, compteApplicable: compteN1, montant: (r.sd || 0) || (r.sc || 0) });
    });
    return out;
}
function syscDetecterTout(){
    return [].concat(syscDetecterRacine(), syscDetecterGenerique(), syscDetecterIncoherenceNN1());
}

/* ---------- Balance tiers (onglets f) : racines 1 et 2 uniquement ---------- */
function syscDetecterTiers(){
    function pour(type, racineAttendue){
        var rows = (typeof tiersData !== 'undefined' && tiersData[type]) || [];
        var out = [];
        rows.forEach(function(r){
            var compte = String(r.compte || '').trim();
            var montant = (r.sd || 0) || (r.sc || 0);
            if(!compte || !montant) return;
            if(compte.slice(0, 2) !== racineAttendue){
                var exempleClasse = racineAttendue + '11'; // 4011 (fournisseurs) ou 4111 (clients), à titre indicatif
                out.push({ compte:compte, intitule:r.intitule,
                    erreur:'Compte hors classe ' + racineAttendue + ' dans la Balance tiers ' + (type === 'fourn' ? 'fournisseurs' : 'clients'),
                    compteRecommande: exempleClasse + ' (exemple — le compte réel à 4 chiffres dépend du tiers concerné)',
                    compteApplicable: exempleClasse, montant: montant });
            } else if(syscEstGenerique(compte)){
                var exempleTiers = compte.slice(0, 3) + '1';
                out.push({ compte:compte, intitule:r.intitule,
                    erreur:'Compte collectif générique, jamais ventilé par tiers',
                    compteRecommande: exempleTiers + ' (exemple — un compte à 4 chiffres par tiers, ex. ' + exempleTiers + ', ' + compte.slice(0, 3) + '2…)',
                    compteApplicable: exempleTiers, montant: montant });
            }
        });
        return out;
    }
    return { fourn: pour('fourn', '40'), clients: pour('clients', '41') };
}

/* ---------- Reclassification virtuelle (persistée par dossier) ---------- */
var syscOverrides = {};
function syscDossierCle(){ return (typeof dossierId !== 'undefined' && dossierId) ? dossierId : 'local'; }
function syscOverridesCle(){ return 'seven7_syscohada_reclassifications_' + syscDossierCle(); }
function syscChargerOverrides(){
    try{ syscOverrides = JSON.parse(localStorage.getItem(syscOverridesCle()) || '{}') || {}; }catch(e){ syscOverrides = {}; }
}
function syscEnregistrerOverrides(){
    try{ localStorage.setItem(syscOverridesCle(), JSON.stringify(syscOverrides)); }catch(e){}
}
function syscAppliquerReclassification(compte, racine){
    syscOverrides[compte] = racine;
    syscEnregistrerOverrides();
    if(typeof updateAllCalculations === 'function') updateAllCalculations();
    syscRafraichirTout();
}
function syscAnnulerReclassification(compte){
    delete syscOverrides[compte];
    syscEnregistrerOverrides();
    if(typeof updateAllCalculations === 'function') updateAllCalculations();
    syscRafraichirTout();
}

/* ---------- Panneau d'alerte (onglets e. Balance générale, f. Balance tiers) ---------- */
function syscRendrePanneau(erreurs, panneauId){
    if(!erreurs.length) return '<div id="' + panneauId + '" style="display:none;"></div>';
    var lignes = erreurs.map(function(e){
        var reclasse = syscOverrides[e.compte];
        return '<tr' + (reclasse ? ' style="opacity:.6;"' : '') + '>'
            + '<td>' + esc(e.compte) + '</td><td>' + esc(e.intitule || '') + '</td><td>' + esc(e.erreur) + '</td>'
            + '<td>👉 ' + esc(e.compteRecommande) + '</td>'
            + '<td>' + (reclasse
                ? '<span class="badge badge-success">✓ Reclassé en ' + esc(reclasse) + '</span> '
                  + '<button class="btn btn-warning" style="padding:4px 10px;font-size:11px;" onclick="syscAnnulerReclassification(\'' + esc(e.compte) + '\')">Annuler</button>'
                : '<button class="btn btn-primary" style="padding:4px 10px;font-size:11px;" onclick="syscAppliquerReclassification(\'' + esc(e.compte) + '\', \'' + esc(e.compteApplicable) + '\')">Appliquer la re-classification</button>')
            + '</td></tr>';
    }).join('');
    return '<div id="' + panneauId + '" class="card" style="background:#fff8e1; border-left:4px solid #f39c12;">'
        + '<h3>⚠️ Anomalies de codification SYSCOHADA détectées (' + erreurs.length + ')</h3>'
        + '<div class="scroll-table"><table><tr><th>Compte actuel</th><th>Libellé</th><th>Erreur détectée</th><th>Compte recommandé</th><th>Action</th></tr>' + lignes + '</table></div>'
        + '</div>';
}
function syscRafraichirPanneau(tabId, panneauId, erreurs){
    var html = syscRendrePanneau(erreurs, panneauId);
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var neuf = tmp.firstChild;
    var ancien = document.getElementById(panneauId);
    if(ancien){ ancien.replaceWith(neuf); return; }
    var tab = document.getElementById(tabId);
    if(tab) tab.insertBefore(neuf, tab.firstChild);
}
function syscRafraichirTout(){
    syscRafraichirPanneau('balance-n', 'sysc-panneau-balance-n', syscDetecterTout());
    var t = syscDetecterTiers();
    syscRafraichirPanneau('tiers-fourn', 'sysc-panneau-tiers-fourn', t.fourn);
    syscRafraichirPanneau('tiers-clients', 'sysc-panneau-tiers-clients', t.clients);
}

/* ---------- Pont vers l'onglet s (centralisation des anomalies) ---------- */
function anScannerSYSCOHADA(){
    if(typeof syscDetecterTout !== 'function') return [];
    var out = [];
    syscDetecterTout().forEach(function(e){
        if(syscOverrides[e.compte]) return; // déjà traité par l'auditeur
        out.push({ cle:'sysc:balance:' + e.compte, source:'Codification SYSCOHADA — Balance générale',
            description: e.erreur + ' (compte ' + e.compte + ' — ' + (e.intitule || '') + ')',
            montant: e.montant, onglet:'balance-n' });
    });
    var t = syscDetecterTiers();
    ['fourn', 'clients'].forEach(function(type){
        t[type].forEach(function(e){
            if(syscOverrides[e.compte]) return;
            out.push({ cle:'sysc:' + type + ':' + e.compte,
                source:'Codification SYSCOHADA — Balance tiers ' + (type === 'fourn' ? 'fournisseurs' : 'clients'),
                description: e.erreur + ' (compte ' + e.compte + ' — ' + (e.intitule || '') + ')',
                montant: e.montant, onglet: type === 'fourn' ? 'tiers-fourn' : 'tiers-clients' });
        });
    });
    return out;
}

try{
    if(typeof document !== 'undefined'){
        syscChargerOverrides();
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', syscRafraichirTout);
        else
            syscRafraichirTout();
    }
}catch(e){}
