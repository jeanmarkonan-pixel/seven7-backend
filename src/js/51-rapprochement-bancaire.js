/* ==================================================================
   SEVEN7 — RAPPROCHEMENT BANCAIRE

   Onglet rattaché à la lettre j (Grand Livre) de l'arborescence a→u, sur
   le même modèle que 47-choix-opinion.js (panneau auto-installé, déclaré
   dans TABS, jamais dupliqué, bouton inséré dans le menu Phase 2 juste
   après GL Gestion).

   AFFICHAGE (refonte 31/08) : un SEUL tableau « Résultat du rapprochement »
   qui met, côte à côte, chaque écriture du Grand Livre (compte(s) banque)
   et la ligne du relevé qui lui correspond — plus les lignes non
   rapprochées des deux côtés (colonnes vides du côté manquant) et l'écart
   de montant. Remplace les anciens tableaux mensuels à cases à cocher.

   PÉRIODE : deux champs Du / Au en haut de l'onglet, pré-remplis avec les
   dates d'exercice de l'onglet Identification (r1-exercice-du /
   r1-exercice-au), modifiables. Le rapprochement ne porte que sur les
   écritures et lignes de relevé comprises dans cette période.

   HISTORIQUE (à comprendre avant de retoucher) : import du relevé retiré
   le 25/08 (sélecteur de fichiers Android impraticable), réintroduit le
   26/08 par DEUX voies (fichier ET collage de texte, ce dernier
   contournant le sélecteur de fichiers). Le 31/08, refonte de l'affichage
   en tableau unique côte à côte + sélecteur de période.

   PRINCIPE DE SÉCURITÉ (« zéro erreur silencieuse », demande du cabinet) :
   le moteur (rbRapprocher) ne rapproche automatiquement une ligne QUE si
   la correspondance est mutuellement unique — un seul candidat GL
   compatible (compte, sens, montant, ±N jours), et ce candidat n'est
   revendiqué par aucune autre ligne de relevé. Tout le reste part en
   « doublons ambigus » (décision manuelle) ou reste non rapproché. Toute
   ligne de fichier illisible est listée telle quelle, jamais ignorée.

   ARCHITECTURE : le relevé importé (lignes + rejets + statut de
   rapprochement de chaque ligne) est sérialisé en JSON dans un
   <textarea id="rb-releve-json" hidden> — la sauvegarde Firestore capture
   le innerHTML de l'onglet et freezeDynamicValues() copie .value vers le
   contenu du textarea avant capture, donc ça survit au rechargement.
   Chaque ligne de relevé porte : id stable, statut ('auto' | 'manuel' |
   'aucune' | 'reporte' | absent = à traiter), matchClef (clef de
   l'écriture GL rapprochée quand statut vaut 'auto' ou 'manuel').
   ================================================================== */

/* ---------- Comptes banque (préfixes, ex. "52" ou "521,522") ---------- */
function rbComptesConfigures(){
    var input = document.getElementById('rb-comptes-banque');
    var brut = input ? input.value : '52';
    return String(brut || '52').split(/[,\s]+/).filter(function(s){ return s !== ''; });
}

/* ---------- Période Du / Au (repli : dates d'exercice de l'Identification) ---------- */
function rbValeurChamp(id){
    var el = document.getElementById(id);
    return el && el.value ? String(el.value).trim() : '';
}
function rbDu(){ return rbValeurChamp('rb-date-du') || rbValeurChamp('r1-exercice-du'); }
function rbAu(){ return rbValeurChamp('rb-date-au') || rbValeurChamp('r1-exercice-au'); }
// Comparaison de chaînes ISO AAAA-MM-JJ : l'ordre lexicographique EST
// l'ordre chronologique, aucune conversion Date nécessaire.
function rbDansPeriode(dateStr){
    var d = String(dateStr || '').slice(0, 10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    var du = rbDu(), au = rbAu();
    if(!du && !au) return true; // aucune borne saisie : tout accepter
    if(du && d < du) return false;
    if(au && d > au) return false;
    return true;
}
function rbToleranceJours(){
    var el = document.getElementById('rb-tolerance-jours');
    var v = el ? parseInt(el.value, 10) : NaN;
    return (isNaN(v) || v < 0) ? 5 : v;
}
function rbPad2(n){ n = String(n); return n.length < 2 ? '0' + n : n; }

// Écritures du Grand Livre pour ces comptes, DANS la période. grandLivreData
// réunit GL Bilan et GL Gestion (02-balances-modele.js) ; on lit l'ensemble
// pour ne dépendre d'aucune hypothèse sur l'onglet de saisie.
function rbEcrituresGLPeriode(prefixes){
    var rows = (typeof grandLivreData !== 'undefined') ? grandLivreData : [];
    var out = [];
    for(var i = 0; i < rows.length; i++){
        var r = rows[i];
        var compte = String(r.compte || '').trim();
        var correspond = prefixes.some(function(p){ return compte.indexOf(p) === 0; });
        if(!correspond) continue;
        if(!rbDansPeriode(r.date)) continue;
        out.push(r);
    }
    out.sort(function(a, b){ return String(a.date || '').localeCompare(String(b.date || '')); });
    return out;
}

// Identifie une écriture GL indépendamment de sa position dans la liste :
// permet de retrouver une correspondance après actualisation, même si des
// écritures ont été ajoutées/supprimées entre-temps.
function rbClefLigne(r){
    return [String(r.compte || '').trim(), String(r.date || '').trim(), String(r.ref || '').trim(),
            String(r.libelle || '').trim(), parseNum(r.debit), parseNum(r.credit)].join('|');
}

/* ==================================================================
   PARSING DU RELEVÉ IMPORTÉ (CSV, Excel ou texte collé)
   Le fichier/texte est déjà réduit en tableau de lignes de cellules par
   45-securite-import.js (secLireReleveFichier, ou secDecouperLigneCSV
   pour le collage) — cette section ne connaît plus la source, juste des
   cellules brutes, et fait le mapping d'en-tête + la validation.
   ================================================================== */
function rbParserDate(v){
    if(v === undefined || v === null) return null;
    var s = String(v).trim();
    if(s === '') return null;
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if(m) return m[1] + '-' + rbPad2(m[2]) + '-' + rbPad2(m[3]);
    m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s);
    if(m){
        var an = m[3];
        if(an.length === 2) an = (parseInt(an, 10) > 70 ? '19' : '20') + an;
        return an + '-' + rbPad2(m[2]) + '-' + rbPad2(m[1]);
    }
    // Numéro de série Excel (jours depuis 1899-12-30), au cas où une cellule
    // arrive déjà convertie en nombre plutôt qu'en texte formaté.
    if(/^\d+(\.\d+)?$/.test(s)){
        var n = parseNum(s);
        if(n > 20000 && n < 60000){
            var ms = Math.round((n - 25569) * 86400 * 1000);
            var d = new Date(ms);
            if(!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
        }
    }
    return null;
}
// lignesCellules : array de array-de-chaînes (une ligne d'en-tête + lignes de
// données). Retourne { lignes, rejets, erreurEntete }. erreurEntete=true si
// aucune colonne Date n'est reconnue, ou ni Débit/Crédit ni Montant — on
// refuse alors tout net plutôt que de deviner un mauvais ordre de colonnes
// (une correspondance sur de mauvaises colonnes serait une erreur silencieuse).
function rbParserLignesCellules(lignesCellules){
    if(!lignesCellules || !lignesCellules.length) return { lignes:[], rejets:[], erreurEntete:false };
    var entetes = (lignesCellules[0] || []).map(function(c){ return String(c === undefined || c === null ? '' : c); });
    var mappe = secMapperEntetes(SEC_CHAMPS_RELEVE, entetes);
    var aDebitCredit = mappe.debit !== undefined && mappe.credit !== undefined;
    var aMontant = mappe.montant !== undefined;
    if(mappe.date === undefined || !(aDebitCredit || aMontant)){
        return { lignes:[], rejets:[], erreurEntete:true };
    }
    var lignes = [], rejets = [];
    for(var i = 1; i < lignesCellules.length; i++){
        var c = lignesCellules[i] || [];
        var vide = c.every(function(x){ return String(x === undefined || x === null ? '' : x).trim() === ''; });
        if(vide) continue;
        var dateStr = rbParserDate(c[mappe.date]);
        var libelle = mappe.libelle !== undefined ? String(c[mappe.libelle] || '').trim() : '';
        var ref = mappe.ref !== undefined ? String(c[mappe.ref] || '').trim() : '';
        var debit = 0, credit = 0;
        if(aDebitCredit){
            debit = parseNum(c[mappe.debit]);
            credit = parseNum(c[mappe.credit]);
        } else {
            var mt = parseNum(c[mappe.montant]);
            if(mt >= 0) credit = mt; else debit = -mt;
        }
        if(!dateStr || (debit === 0 && credit === 0)){
            rejets.push({ ligne: i + 1, brut: c.join(' | ') });
            continue;
        }
        lignes.push({ date: dateStr, libelle: libelle, ref: ref, debit: debit, credit: credit });
    }
    return { lignes: lignes, rejets: rejets, erreurEntete:false };
}

/* ==================================================================
   MOTEUR DE RAPPROCHEMENT AUTOMATIQUE (fonctions pures — testées
   directement, sans DOM, comme le reste du moteur de calcul)
   ================================================================== */
// Candidats Grand Livre pour UNE ligne de relevé : même compte (implicite,
// ecrituresGL est déjà filtré par compte/période), montant identique (à
// l'inversion de sens près) et daté à ±toleranceJours au maximum. Triés du
// plus proche au plus éloigné en date.
// Sens : sur le RELEVÉ, un crédit est un encaissement et un débit un
// décaissement (convention bancaire usuelle). En COMPTABILITÉ, le compte
// banque est un compte d'actif : un encaissement l'augmente donc à son
// DÉBIT, un décaissement le diminue à son CRÉDIT — l'inverse du relevé.
function rbCandidatsGL(ligneReleve, ecrituresGL, toleranceJours){
    var cible = ligneReleve.credit > 0 ? ligneReleve.credit : ligneReleve.debit;
    var sensGL = ligneReleve.credit > 0 ? 'debit' : 'credit';
    if(cible <= 0) return [];
    var dateReleve = new Date(ligneReleve.date).getTime();
    if(isNaN(dateReleve)) return [];
    var candidats = [];
    ecrituresGL.forEach(function(r){
        if(Math.abs(parseNum(r[sensGL]) - cible) >= 0.5) return;
        var dateGL = new Date(r.date).getTime();
        if(isNaN(dateGL)) return;
        var ecartJours = Math.abs(dateReleve - dateGL) / 86400000;
        if(ecartJours <= toleranceJours) candidats.push({ ecritureGL: r, ecartJours: ecartJours });
    });
    candidats.sort(function(a, b){ return a.ecartJours - b.ecartJours; });
    return candidats;
}
// Rapproche un lot de lignes de relevé contre un lot d'écritures GL.
// Règle de sécurité (« zéro erreur silencieuse ») : une correspondance n'est
// retenue automatiquement QUE si elle est mutuellement unique — la ligne de
// relevé n'a qu'un seul candidat GL dans la tolérance, ET ce candidat GL
// n'est candidat pour aucune autre ligne de relevé du lot. Dans tous les
// autres cas (0, ou 2+ candidats d'un côté ou de l'autre), rien n'est
// rapproché tout seul : direction « ambigus » (2+ candidats) ou « sans
// correspondance » (0 candidat), pour décision explicite de l'auditeur.
function rbRapprocher(releveLignes, ecrituresGL, toleranceJours){
    toleranceJours = toleranceJours || 5;
    var candidatsParLigne = releveLignes.map(function(lr){ return rbCandidatsGL(lr, ecrituresGL, toleranceJours); });
    var revendicationsGL = {};
    candidatsParLigne.forEach(function(cands){
        cands.forEach(function(c){
            var clef = rbClefLigne(c.ecritureGL);
            revendicationsGL[clef] = (revendicationsGL[clef] || 0) + 1;
        });
    });

    var auto = [], ambigus = [], sansCorrespondance = [];
    releveLignes.forEach(function(lr, i){
        var cands = candidatsParLigne[i];
        if(cands.length === 0){ sansCorrespondance.push(lr); return; }
        var clefUnique = rbClefLigne(cands[0].ecritureGL);
        if(cands.length === 1 && revendicationsGL[clefUnique] === 1){
            auto.push({ ligneReleve: lr, ecritureGL: cands[0].ecritureGL });
        } else {
            ambigus.push({ ligneReleve: lr, candidats: cands });
        }
    });
    return { auto: auto, ambigus: ambigus, sansCorrespondance: sansCorrespondance };
}

/* ---------- Écritures manquantes : catégorisation et proposition ---------- */
function rbCategoriserLigne(ligneReleve){
    var texte = ((ligneReleve.libelle || '') + ' ' + (ligneReleve.ref || '')).toUpperCase();
    if(/AGIO|INTERET.*DEBIT|INTERET.*DECOUVERT|DECOUVERT/.test(texte)) return 'agios';
    if(/FRAIS|COMMISSION|COTIS.*CARTE|TENUE DE COMPTE|ABONNEMENT|PRELEVEMENT.*SERVICE|SMS BANKING/.test(texte)) return 'frais';
    return 'inconnu';
}
// comptesBanque : préfixes configurés (rbComptesConfigures()) ; comptesDefaut :
// { frais, agios, inconnu } (rbComptesDefautContrepartie()). Renvoie une
// PROPOSITION éditable — jamais un fait accompli, voir rbRendreManquantes.
function rbProposerEcriture(ligneReleve, comptesBanque, comptesDefaut){
    var categorie = rbCategoriserLigne(ligneReleve);
    var libelleParDefaut = categorie === 'agios' ? 'Agios bancaires'
        : categorie === 'frais' ? 'Frais bancaires'
        : (ligneReleve.libelle || 'Mouvement bancaire non identifié');
    return {
        categorie: categorie,
        compteBanque: (comptesBanque && comptesBanque[0]) || '52',
        compteContrepartie: comptesDefaut[categorie],
        libelle: libelleParDefaut,
        montant: ligneReleve.debit > 0 ? ligneReleve.debit : ligneReleve.credit
    };
}
function rbComptesDefautContrepartie(){
    return {
        frais:   ((document.getElementById('rb-compte-frais') || {}).value || '631').trim() || '631',
        agios:   ((document.getElementById('rb-compte-agios') || {}).value || '674').trim() || '674',
        inconnu: ((document.getElementById('rb-compte-inconnu') || {}).value || '471').trim() || '471'
    };
}

/* ==================================================================
   PERSISTANCE DE L'ÉTAT DU RELEVÉ IMPORTÉ (textarea caché, voir note
   d'architecture en tête de fichier)
   ================================================================== */
var RB_ID_COMPTEUR = 0;
function rbNouvelId(){ RB_ID_COMPTEUR++; return 'rl' + Date.now() + '_' + RB_ID_COMPTEUR; }
function rbChargerEtatReleve(){
    var el = document.getElementById('rb-releve-json');
    if(!el || !el.value) return null;
    try{ var e = JSON.parse(el.value); return (e && e.lignes) ? e : null; }
    catch(erreur){ return null; }
}
function rbSauverEtatReleve(etat){
    var el = document.getElementById('rb-releve-json');
    if(el) el.value = JSON.stringify(etat);
}
function rbLigneRapprochee(l){ return (l.statut === 'auto' || l.statut === 'manuel') && l.matchClef; }

/* ==================================================================
   IMPORT (fichier ou collage) → parsing → état → rapprochement
   ================================================================== */
function rbImporterFichier(input){
    var file = input.files && input.files[0];
    var validation = secValiderFichierReleve(file);
    if(!validation.ok){ alert('⚠ ' + validation.erreur); input.value = ''; return; }
    var nomFichier = file.name;
    secLireReleveFichier(file, function(lignesCellules){
        rbTraiterLignesImportees(lignesCellules, nomFichier);
        input.value = '';
    }, function(msg){ alert('⚠ ' + msg); input.value = ''; });
}
function rbImporterColle(){
    var ta = document.getElementById('rb-colle-texte');
    if(!ta || !ta.value.trim()){ alert('Collez d’abord le texte du relevé dans le champ prévu.'); return; }
    var brut = ta.value.split(/\r?\n/).filter(function(l){ return l.trim() !== ''; });
    if(!brut.length){ alert('Rien à analyser.'); return; }
    var delim = secDetecterDelimiteur(brut[0]);
    var lignesCellules = brut.map(function(l){ return secDecouperLigneCSV(l, delim); });
    rbTraiterLignesImportees(lignesCellules, 'Collage manuel');
    ta.value = '';
}
function rbTraiterLignesImportees(lignesCellules, sourceNom){
    var resultat = rbParserLignesCellules(lignesCellules);
    if(resultat.erreurEntete){
        alert('⚠ Colonnes non reconnues. La première ligne du relevé doit contenir une colonne « Date », et soit '
            + '« Débit »/« Crédit » séparés, soit une colonne « Montant » unique. Vérifiez l’en-tête du fichier.');
        return;
    }
    var horsPeriode = 0;
    var lignesRetenues = [];
    resultat.lignes.forEach(function(l){
        if(!rbDansPeriode(l.date)){ horsPeriode++; return; }
        l.id = rbNouvelId();
        lignesRetenues.push(l);
    });

    var etatPrecedent = rbChargerEtatReleve() || { lignes: [], rejets: [] };
    var etat = {
        lignes: etatPrecedent.lignes.concat(lignesRetenues),
        rejets: resultat.rejets,
        importeLe: new Date().toISOString(),
        sourceNom: sourceNom
    };
    rbSauverEtatReleve(etat);
    rbRendreDiagnosticImport(etat, lignesRetenues.length, horsPeriode);
    rbLancerRapprochement(true);
}
function rbViderReleve(){
    if(!confirm('Effacer le relevé importé de la mémoire de cet onglet ?')) return;
    rbSauverEtatReleve({ lignes:[], rejets:[], importeLe:null, sourceNom:'' });
    rbRendreDiagnosticImport({ lignes:[], rejets:[] }, 0, 0);
    rbRendreAmbigus([]);
    rbRendreManquantes([]);
    rbRendreResultat();
    rbRecalculerRecap();
}
function rbRendreDiagnosticImport(etat, nbRetenues, horsPeriode){
    var el = document.getElementById('rb-import-diagnostic');
    if(!el) return;
    if(!etat.importeLe && !etat.lignes.length){ el.innerHTML = ''; return; }
    var rejets = etat.rejets || [];
    var html = '<div class="alert ' + (rejets.length ? 'alert-warning' : 'alert-success') + '" style="margin-top:10px; font-size:12px;">'
        + '📄 Dernier import (' + esc(etat.sourceNom || '—') + ') : <strong>' + nbRetenues + '</strong> ligne(s) retenue(s) dans la période'
        + (horsPeriode ? ', <strong>' + horsPeriode + '</strong> ligne(s) hors période ignorée(s)' : '')
        + '. <strong>' + etat.lignes.length + '</strong> ligne(s) au total en mémoire pour cet onglet.';
    if(rejets.length){
        html += '<br>⚠ <strong>' + rejets.length + '</strong> ligne(s) du fichier NON comprises (date ou montant illisible) — '
            + 'elles ne font PAS partie du rapprochement, vérifiez-les manuellement :'
            + '<ul style="margin:4px 0 0 18px; padding:0;">'
            + rejets.slice(0, 20).map(function(r){ return '<li>Ligne ' + r.ligne + ' : ' + esc(r.brut) + '</li>'; }).join('')
            + (rejets.length > 20 ? '<li>… et ' + (rejets.length - 20) + ' autre(s).</li>' : '')
            + '</ul>';
    }
    html += '</div>';
    el.innerHTML = html;
}

/* ==================================================================
   LANCEMENT DU RAPPROCHEMENT + RENDU DES RÉSULTATS
   ================================================================== */
function rbCandidatsPourLigne(ligne){
    var gl = rbEcrituresGLPeriode(rbComptesConfigures());
    var etat = rbChargerEtatReleve() || { lignes: [] };
    var prises = {};
    etat.lignes.forEach(function(l){
        if(l.id !== ligne.id && rbLigneRapprochee(l)) prises[l.matchClef] = true;
    });
    var dispo = gl.filter(function(e){ return !prises[rbClefLigne(e)]; });
    return rbCandidatsGL(ligne, dispo, rbToleranceJours());
}
function rbLancerRapprochement(silencieux){
    var etat = rbChargerEtatReleve();
    if(!etat || !etat.lignes || !etat.lignes.length){
        if(!silencieux) alert('Importez ou collez d’abord un relevé bancaire avant de lancer le rapprochement automatique.');
        rbRendreAmbigus([]);
        rbRendreManquantes([]);
        rbRendreResultat();
        rbRecalculerRecap();
        return;
    }
    var prefixes = rbComptesConfigures();
    var tolerance = rbToleranceJours();
    var glPeriode = rbEcrituresGLPeriode(prefixes);

    // Écritures GL déjà revendiquées par une correspondance validée (auto/manuel).
    var prises = {};
    etat.lignes.forEach(function(l){ if(rbLigneRapprochee(l)) prises[l.matchClef] = true; });
    var glDispo = glPeriode.filter(function(e){ return !prises[rbClefLigne(e)]; });

    // Lignes de relevé encore à traiter (dans la période, sans statut).
    var aTraiter = etat.lignes.filter(function(l){ return rbDansPeriode(l.date) && !l.statut; });
    var res = rbRapprocher(aTraiter, glDispo, tolerance);

    res.auto.forEach(function(a){
        a.ligneReleve.statut = 'auto';
        a.ligneReleve.matchClef = rbClefLigne(a.ecritureGL);
        delete a.ligneReleve.enAttenteArbitrage;
    });
    // Marqueur transitoire : les lignes ambiguës vivent dans la section
    // « doublons ambigus » et NON dans le tableau de résultat tant qu'elles
    // ne sont pas tranchées (recalculé à chaque passage, jamais une vérité
    // persistée).
    aTraiter.forEach(function(l){ delete l.enAttenteArbitrage; });
    res.ambigus.forEach(function(a){ a.ligneReleve.enAttenteArbitrage = true; });

    rbSauverEtatReleve(etat);
    rbRendreAmbigus(res.ambigus);
    rbRendreManquantes(res.sansCorrespondance);
    rbRendreResultat();
    rbRecalculerRecap();

    if(!silencieux){
        alert('🤖 Rapprochement — ' + res.auto.length + ' correspondance(s) automatique(s), '
            + res.ambigus.length + ' cas ambigu(s) à trancher, '
            + res.sansCorrespondance.length + ' ligne(s) du relevé sans écriture correspondante.');
    }
}

/* ---------- Doublons ambigus : résolution manuelle ---------- */
function rbRendreAmbigus(liste){
    var corps = document.getElementById('rb-ambigus-corps');
    var section = document.getElementById('rb-ambigus-section');
    if(!corps || !section) return;
    liste = liste || [];
    section.style.display = liste.length ? '' : 'none';
    if(!liste.length){ corps.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999;">Aucun cas ambigu.</td></tr>'; return; }
    corps.innerHTML = liste.map(function(a){
        var lr = a.ligneReleve;
        var cible = lr.credit > 0 ? lr.credit : lr.debit;
        var selectId = 'rb-amb-sel-' + lr.id;
        return '<tr>'
            + '<td>' + esc(lr.date) + '</td>'
            + '<td>' + esc(lr.libelle) + (lr.ref ? ' (' + esc(lr.ref) + ')' : '') + '</td>'
            + '<td class="number">' + fmt(cible) + '</td>'
            + '<td><select id="' + selectId + '"><option value="">— Choisir —</option>'
            + a.candidats.map(function(c){
                var montantGL = parseNum(c.ecritureGL.debit) || parseNum(c.ecritureGL.credit);
                return '<option value="' + esc(rbClefLigne(c.ecritureGL)) + '">' + esc(c.ecritureGL.date) + ' · '
                    + esc(c.ecritureGL.libelle || c.ecritureGL.ref || '(sans libellé)') + ' · '
                    + fmt(montantGL) + ' · écart ' + c.ecartJours.toFixed(1) + ' j</option>';
            }).join('')
            + '<option value="aucune">Aucune de ces écritures</option></select></td>'
            + '<td><button type="button" class="btn btn-primary" onclick="rbConfirmerAmbigu(\'' + lr.id + '\', \'' + selectId + '\')">✔ Valider</button></td>'
            + '</tr>';
    }).join('');
}
function rbConfirmerAmbigu(ligneId, selectId){
    var select = document.getElementById(selectId);
    if(!select || select.value === ''){ alert('Choisissez une correspondance ou « Aucune de ces écritures » avant de valider.'); return; }
    var etat = rbChargerEtatReleve();
    if(!etat){ alert('Le relevé importé est introuvable — relancez le rapprochement.'); return; }
    var ligne = etat.lignes.filter(function(l){ return l.id === ligneId; })[0];
    if(!ligne){ alert('Cette ligne a disparu — relancez le rapprochement.'); return; }
    if(select.value === 'aucune'){
        ligne.statut = 'aucune';
        delete ligne.matchClef;
    } else {
        var candidats = rbCandidatsPourLigne(ligne);
        var choisi = candidats.filter(function(c){ return rbClefLigne(c.ecritureGL) === select.value; })[0];
        if(!choisi){ alert('Cette écriture n’est plus disponible (déjà rapprochée par une autre résolution entre-temps) — relancez le rapprochement.'); return; }
        ligne.statut = 'manuel';
        ligne.matchClef = select.value;
    }
    delete ligne.enAttenteArbitrage;
    rbSauverEtatReleve(etat);
    rbLancerRapprochement(true);
}

/* ---------- Écritures relevé sans correspondance : proposition + report ---------- */
function rbRendreManquantes(sansCorrespondance){
    var corps = document.getElementById('rb-manquantes-corps');
    var section = document.getElementById('rb-manquantes-section');
    if(!corps || !section) return;
    sansCorrespondance = sansCorrespondance || [];
    section.style.display = sansCorrespondance.length ? '' : 'none';
    var comptesBanque = rbComptesConfigures();
    var comptesDefaut = rbComptesDefautContrepartie();
    var labelCategorie = { agios:'Agios', frais:'Frais bancaires', inconnu:'Non identifié' };
    var couleurCategorie = { agios:'#eaf2f8', frais:'#eafaf1', inconnu:'#fdebd0' };
    corps.innerHTML = sansCorrespondance.map(function(l){
        var prop = rbProposerEcriture(l, comptesBanque, comptesDefaut);
        return '<tr data-rb-manq-id="' + esc(l.id) + '">'
            + '<td style="text-align:center;"><input type="checkbox" class="rb-manq-inclure" checked></td>'
            + '<td>' + esc(l.date) + '</td>'
            + '<td>' + esc(l.libelle) + (l.ref ? ' (' + esc(l.ref) + ')' : '') + '</td>'
            + '<td class="number">' + fmt(prop.montant) + '</td>'
            + '<td><span style="font-size:11px; padding:2px 6px; border-radius:4px; background:' + couleurCategorie[prop.categorie] + ';">'
                + labelCategorie[prop.categorie] + '</span></td>'
            + '<td><input type="text" class="rb-manq-banque" value="' + esc(prop.compteBanque) + '" style="width:75px;"></td>'
            + '<td><input type="text" class="rb-manq-compte" value="' + esc(prop.compteContrepartie) + '" style="width:75px;"></td>'
            + '<td><input type="text" class="rb-manq-libelle" value="' + esc(prop.libelle) + '" style="width:180px;"></td>'
            + '</tr>';
    }).join('');
}
function rbLigneGLTexte(compte, intitule, date, ref, libelle, debit, credit){
    return [compte, intitule, date, ref, libelle, debit || '', credit || ''].join('\t');
}
// Reporte les lignes cochées dans le Grand Livre Bilan, en partie double
// (compte de contrepartie + compte banque), via le circuit d'import existant
// (paste-gl-bilan + pasteGLTable) — jamais d'écriture directe dans
// grandLivreBilanData/grandLivreGestionData depuis ce module : ce sont des
// données lues par une quinzaine d'autres onglets, la seule voie sûre pour
// les modifier est celle déjà testée du Grand Livre lui-même. Clic EXPLICITE
// (jamais automatique) : les comptes proposés sont des suggestions.
function rbReporterEcrituresManquantes(){
    var corps = document.getElementById('rb-manquantes-corps');
    if(!corps) return;
    var etat = rbChargerEtatReleve();
    if(!etat){ alert('Aucun relevé importé.'); return; }
    var lignesGL = [];
    var nbReportees = 0;
    Array.prototype.slice.call(corps.querySelectorAll('tr[data-rb-manq-id]')).forEach(function(tr){
        var inclure = tr.querySelector('.rb-manq-inclure');
        if(!inclure || !inclure.checked) return;
        var id = tr.getAttribute('data-rb-manq-id');
        var ligne = etat.lignes.filter(function(l){ return l.id === id; })[0];
        if(!ligne || ligne.statut) return;
        var compteBanqueLigne = tr.querySelector('.rb-manq-banque').value.trim();
        var compteContrepartie = tr.querySelector('.rb-manq-compte').value.trim();
        var libelle = tr.querySelector('.rb-manq-libelle').value.trim();
        var montant = ligne.debit > 0 ? ligne.debit : ligne.credit;
        if(!compteBanqueLigne || !compteContrepartie || !montant) return;
        var estDecaissement = ligne.debit > 0;
        if(estDecaissement){
            lignesGL.push(rbLigneGLTexte(compteContrepartie, '', ligne.date, ligne.ref, libelle, montant, 0));
            lignesGL.push(rbLigneGLTexte(compteBanqueLigne, '', ligne.date, ligne.ref, libelle, 0, montant));
        } else {
            lignesGL.push(rbLigneGLTexte(compteBanqueLigne, '', ligne.date, ligne.ref, libelle, montant, 0));
            lignesGL.push(rbLigneGLTexte(compteContrepartie, '', ligne.date, ligne.ref, libelle, 0, montant));
        }
        ligne.statut = 'reporte';
        nbReportees++;
    });
    if(!nbReportees){ alert('Aucune ligne cochée à reporter (ou compte banque/contrepartie manquant sur les lignes cochées).'); return; }
    var zone = document.getElementById('paste-gl-bilan');
    if(!zone){ alert('Le champ de collage du Grand Livre Bilan est introuvable — impossible de reporter automatiquement.'); return; }
    zone.value = lignesGL.join('\n');
    pasteGLTable('bilan');
    rbSauverEtatReleve(etat);
    alert('✅ ' + nbReportees + ' écriture(s) reportée(s) au Grand Livre Bilan (partie double, ' + lignesGL.length
        + ' ligne(s)). Vérifiez-les dans l’onglet Grand Livre avant de conclure.');
    rbLancerRapprochement(true);
}

/* ==================================================================
   TABLEAU UNIQUE « RÉSULTAT DU RAPPROCHEMENT » (GL + relevé côte à côte)
   ================================================================== */
// Montant « signé banque » d'une écriture GL : + = encaissement (débit du
// compte banque), − = décaissement (crédit). Même convention pour une ligne
// de relevé ramenée en compta : crédit relevé (encaissement) = +, débit
// relevé (décaissement) = −.
function rbMontantGL(e){ return parseNum(e.debit) - parseNum(e.credit); }
function rbMontantReleveCompta(l){ return parseNum(l.credit) - parseNum(l.debit); }
function rbDateDeRangee(row){
    if(row.type === 'releve') return row.lr.date || '';
    return (row.e && row.e.date) || '';
}
function rbRendreResultat(){
    var host = document.getElementById('rb-resultat-corps');
    if(!host) return;
    var prefixes = rbComptesConfigures();
    var gl = rbEcrituresGLPeriode(prefixes);
    var etat = rbChargerEtatReleve() || { lignes: [] };
    var relevePeriode = etat.lignes.filter(function(l){ return rbDansPeriode(l.date); });

    var matchByClef = {};
    relevePeriode.forEach(function(l){ if(rbLigneRapprochee(l)) matchByClef[l.matchClef] = l; });

    var rows = [];
    var glPris = {};
    gl.forEach(function(e){
        var clef = rbClefLigne(e);
        var lr = matchByClef[clef];
        if(!lr) return;
        glPris[clef] = true;
        rows.push({ type:'paire', e:e, lr:lr });
    });
    gl.forEach(function(e){ if(!glPris[rbClefLigne(e)]) rows.push({ type:'gl', e:e }); });
    relevePeriode.forEach(function(l){
        if(rbLigneRapprochee(l)) return;       // déjà dans une paire
        if(l.enAttenteArbitrage) return;       // vit dans la section « ambigus »
        rows.push({ type:'releve', lr:l });
    });
    rows.sort(function(a, b){ return rbDateDeRangee(a).localeCompare(rbDateDeRangee(b)); });

    if(!rows.length){
        host.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#999; padding:16px;">'
            + 'Aucune opération dans la période. Vérifiez que le Grand Livre est importé, que le préfixe de compte '
            + 'banque est correct, et que les dates Du / Au couvrent bien vos opérations.</td></tr>';
        rbTexte('rb-res-tot-gl', fmt(0));
        rbTexte('rb-res-tot-releve', fmt(0));
        rbTexte('rb-res-tot-ecart', fmt(0));
        return;
    }

    var totGL = 0, totReleve = 0, totEcart = 0;
    host.innerHTML = rows.map(function(r){
        var e = r.e, lr = r.lr;
        var mGL = e ? rbMontantGL(e) : null;
        var mRel = lr ? rbMontantReleveCompta(lr) : null;
        var ecart = (mGL || 0) - (mRel || 0);
        if(mGL !== null) totGL += mGL;
        if(mRel !== null) totReleve += mRel;
        totEcart += ecart;

        var fond = r.type === 'paire' ? (Math.abs(ecart) < 0.5 ? '#eafaf1' : '#fdf3e3')
                 : r.type === 'gl' ? '#fbecec' : '#eef4fb';
        var badge = r.type === 'paire'
            ? (lr.statut === 'manuel' ? '<span title="Rapproché manuellement" style="font-size:10px;">✋</span> ' : '<span title="Rapproché automatiquement" style="font-size:10px;">🤖</span> ')
            : '';
        return '<tr style="background:' + fond + ';">'
            + '<td>' + (e ? esc(e.compte) : '') + '</td>'
            + '<td>' + (e ? esc(e.date) : '') + '</td>'
            + '<td>' + badge + (e ? esc(e.libelle || '') : '') + '</td>'
            + '<td>' + (e ? esc(e.ref || '') : '') + '</td>'
            + '<td class="number">' + (mGL !== null ? fmt(mGL) : '') + '</td>'
            + '<td>' + (lr ? esc(lr.date) : '') + '</td>'
            + '<td>' + (lr ? esc(lr.libelle || '') : '') + '</td>'
            + '<td>' + (lr ? esc(lr.ref || '') : '') + '</td>'
            + '<td class="number">' + (mRel !== null ? fmt(mRel) : '') + '</td>'
            + '<td class="number" style="' + (Math.abs(ecart) < 0.5 ? 'color:#27ae60;' : 'color:#c0392b; font-weight:700;') + '">' + fmt(ecart) + '</td>'
            + '</tr>';
    }).join('');

    rbTexte('rb-res-tot-gl', fmt(totGL));
    rbTexte('rb-res-tot-releve', fmt(totReleve));
    rbTexte('rb-res-tot-ecart', fmt(totEcart));
    var elEcart = document.getElementById('rb-res-tot-ecart');
    if(elEcart){ elEcart.style.color = Math.abs(totEcart) < 0.5 ? '#27ae60' : '#c0392b'; elEcart.style.fontWeight = '700'; }
}

/* ==================================================================
   RÉCAPITULATIF
   ================================================================== */
function rbTexte(id, val){
    var el = document.getElementById(id);
    if(el) el.textContent = val;
}
// SD/SC/OD/OC (02-balances-modele.js) somment déjà TOUS les comptes commençant
// par le préfixe donné : appelés une fois par préfixe, jamais ligne à ligne.
function rbSoldeBalanceBanque(prefixes){
    if(typeof balanceData === 'undefined' || typeof SD !== 'function' || typeof SC !== 'function') return null;
    var lignes = (balanceData && balanceData['n']) ? balanceData['n'] : null;
    if(!lignes || !lignes.length) return null;
    var total = 0;
    prefixes.forEach(function(p){ total += SD('n', p) - SC('n', p); });
    return total;
}
function rbOuvertureBanque(prefixes){
    if(typeof OD !== 'function' || typeof OC !== 'function') return 0;
    var total = 0;
    prefixes.forEach(function(p){ total += OD('n', p) - OC('n', p); });
    return total;
}
function rbRecalculerRecap(){
    var prefixes = rbComptesConfigures();
    var gl = rbEcrituresGLPeriode(prefixes);
    var etat = rbChargerEtatReleve() || { lignes: [] };
    var relevePeriode = etat.lignes.filter(function(l){ return rbDansPeriode(l.date); });

    var totDebit = 0, totCredit = 0;
    gl.forEach(function(e){ totDebit += parseNum(e.debit); totCredit += parseNum(e.credit); });
    var clefsMatch = {};
    relevePeriode.forEach(function(l){ if(rbLigneRapprochee(l)) clefsMatch[l.matchClef] = true; });
    var nbGLRappro = gl.filter(function(e){ return clefsMatch[rbClefLigne(e)]; }).length;
    var nbGLNon = gl.length - nbGLRappro;
    var nbRelPending = relevePeriode.filter(function(l){ return (!l.statut || l.enAttenteArbitrage); }).length;

    rbTexte('rb-recap-periode', (rbDu() || '—') + '  →  ' + (rbAu() || '—'));
    rbTexte('rb-recap-nb-gl', gl.length);
    rbTexte('rb-recap-debit', fmt(totDebit));
    rbTexte('rb-recap-credit', fmt(totCredit));
    rbTexte('rb-recap-solde', fmt(totDebit - totCredit));
    rbTexte('rb-recap-rappro', nbGLRappro + ' / ' + gl.length);
    rbTexte('rb-recap-gl-non', nbGLNon);
    rbTexte('rb-recap-rel-non', nbRelPending);

    var elSus = document.getElementById('rb-recap-etat');
    if(elSus){
        var ok = (nbGLNon === 0 && nbRelPending === 0);
        elSus.textContent = ok ? '✅ Rapprochement complet' : '⏳ ' + (nbGLNon + nbRelPending) + ' opération(s) non rapprochée(s)';
        elSus.style.color = ok ? '#27ae60' : '#e74c3c';
        elSus.style.fontWeight = '700';
    }

    // Exercice N (indépendant de la période) : GL tous mois vs solde de clôture Balance N.
    var rows = (typeof grandLivreData !== 'undefined') ? grandLivreData : [];
    var anDebit = 0, anCredit = 0, anNb = 0;
    rows.forEach(function(r){
        var compte = String(r.compte || '').trim();
        if(!compte || !prefixes.some(function(p){ return compte.indexOf(p) === 0; })) return;
        anDebit += parseNum(r.debit); anCredit += parseNum(r.credit); anNb++;
    });
    rbTexte('rb-an-nb', anNb);
    rbTexte('rb-an-solde', fmt(anDebit - anCredit));
    var soldeBalance = rbSoldeBalanceBanque(prefixes);
    var elBal = document.getElementById('rb-an-balance');
    var elEc = document.getElementById('rb-an-ecart');
    if(elBal && elEc){
        if(soldeBalance === null){
            elBal.textContent = '— (balance N non saisie)'; elBal.style.color = '#999';
            elEc.textContent = '—'; elEc.style.color = '#999'; elEc.style.fontWeight = '400';
        } else {
            elBal.textContent = fmt(soldeBalance); elBal.style.color = '';
            var ouverture = rbOuvertureBanque(prefixes);
            var ecart = soldeBalance - (ouverture + (anDebit - anCredit));
            elEc.textContent = fmt(ecart);
            elEc.style.color = Math.abs(ecart) < 0.5 ? '#27ae60' : '#e74c3c';
            elEc.style.fontWeight = '700';
        }
    }
}

/* ==================================================================
   RENDU HTML DE L'ONGLET
   ================================================================== */
function rbImportHtml(){
    return '<div class="card" style="background:#fdf6e3; margin-bottom:16px;">'
        + '<h3 style="margin-top:0;">📥 Importer le relevé bancaire</h3>'
        + '<p style="font-size:12px; color:#555; margin:0 0 10px;">Deux façons d’importer, au choix : <strong>fichier</strong> '
        + '(CSV ou Excel) ou <strong>collage</strong> (copiez les lignes depuis votre appli bancaire ou Excel et collez-les '
        + 'ci-dessous — fonctionne aussi sur mobile). La première ligne doit contenir une colonne « Date », et soit '
        + '« Débit »/« Crédit », soit une colonne « Montant » unique.</p>'
        + '<div class="form-row" style="align-items:center; gap:14px; flex-wrap:wrap;">'
        + '<div class="form-group" style="margin:0;"><label>Fichier (.csv, .xlsx, .xls)</label>'
        + '<input type="file" accept=".csv,.xlsx,.xls" onchange="rbImporterFichier(this)"></div>'
        + '<div class="form-group" style="margin:0;"><label>Tolérance de date (jours)</label>'
        + '<input type="number" id="rb-tolerance-jours" value="5" min="0" max="31" style="width:70px;" onchange="rbLancerRapprochement(true)"></div>'
        + '<button type="button" class="btn btn-warning" onclick="rbViderReleve()">🗑 Vider le relevé importé</button>'
        + '</div>'
        + '<div class="form-group" style="margin-top:10px;"><label>Ou collez ici le texte du relevé</label>'
        + '<textarea id="rb-colle-texte" rows="4" style="width:100%; font-family:monospace; font-size:11px;" '
        + 'placeholder="Date;Libellé;Référence;Débit;Crédit&#10;05/11/2025;VIREMENT CLIENT XYZ;VIR001;;250000&#10;..."></textarea>'
        + '<button type="button" class="btn btn-primary" style="margin-top:6px;" onclick="rbImporterColle()">📋 Analyser le texte collé</button></div>'
        + '<div id="rb-import-diagnostic"></div>'
        + '<textarea id="rb-releve-json" style="display:none;"></textarea>'
        + '<div class="form-row" style="margin-top:12px; gap:14px; flex-wrap:wrap; font-size:11px; color:#555;">'
        + '<div class="form-group" style="margin:0;"><label style="font-size:11px;">Compte contrepartie — Frais bancaires</label>'
        + '<input type="text" id="rb-compte-frais" value="631" style="width:70px;"></div>'
        + '<div class="form-group" style="margin:0;"><label style="font-size:11px;">Compte contrepartie — Agios</label>'
        + '<input type="text" id="rb-compte-agios" value="674" style="width:70px;"></div>'
        + '<div class="form-group" style="margin:0;"><label style="font-size:11px;">Compte contrepartie — Non identifié</label>'
        + '<input type="text" id="rb-compte-inconnu" value="471" style="width:70px;"></div>'
        + '</div>'
        + '</div>';
}
function rbPeriodeHtml(){
    return '<div class="card" style="background:#f4f6f7; margin-bottom:16px;">'
        + '<div class="form-row" style="gap:14px; align-items:flex-end; flex-wrap:wrap;">'
        + '<div class="form-group" style="margin:0;"><label>Période — Du</label>'
        + '<input type="date" id="rb-date-du" onchange="rbLancerRapprochement(true)"></div>'
        + '<div class="form-group" style="margin:0;"><label>Au</label>'
        + '<input type="date" id="rb-date-au" onchange="rbLancerRapprochement(true)"></div>'
        + '<div class="form-group" style="margin:0;"><label>Compte(s) banque (préfixes SYSCOHADA, séparés par une virgule)</label>'
        + '<input type="text" id="rb-comptes-banque" value="52" style="width:200px;" onchange="rbLancerRapprochement(true)"></div>'
        + '<button type="button" class="btn btn-primary" style="background:#27ae60;" onclick="rbLancerRapprochement()">🔄 Relancer le rapprochement</button>'
        + '</div>'
        + '<p style="font-size:11px; color:#666; margin:6px 0 0;">Par défaut : les dates de l’exercice (onglet Identification). '
        + 'Modifiez-les pour restreindre la période analysée.</p>'
        + '</div>';
}
function rbAmbigusHtml(){
    return '<div class="card" id="rb-ambigus-section" style="display:none; background:#fdedec; margin-bottom:16px;">'
        + '<h3 style="margin-top:0;">⚠️ Doublons ambigus — décision manuelle requise</h3>'
        + '<p style="font-size:12px; color:#555; margin:0 0 10px;">Ces lignes du relevé ont plusieurs correspondances possibles '
        + 'dans le Grand Livre (ou une écriture du Grand Livre est candidate pour plusieurs lignes du relevé) : le moteur ne '
        + 'choisit jamais seul — choisissez la bonne correspondance, ou « Aucune de ces écritures ».</p>'
        + '<div class="scroll-table"><table><thead><tr><th>Date relevé</th><th>Libellé relevé</th><th>Montant</th>'
        + '<th>Correspondance</th><th></th></tr></thead><tbody id="rb-ambigus-corps"></tbody></table></div>'
        + '</div>';
}
function rbResultatHtml(){
    return '<div class="card" style="margin-bottom:16px;">'
        + '<h3 style="margin-top:0;">📊 Résultat du rapprochement</h3>'
        + '<p style="font-size:12px; color:#555; margin:0 0 10px;">Une ligne par opération : '
        + '<span style="background:#eafaf1; padding:1px 5px;">rapprochée</span> (écart nul), '
        + '<span style="background:#fbecec; padding:1px 5px;">écriture GL sans relevé</span>, '
        + '<span style="background:#eef4fb; padding:1px 5px;">ligne relevé sans écriture</span>. '
        + 'Montants signés : + encaissement, − décaissement.</p>'
        + '<div class="scroll-table"><table>'
        + '<thead><tr>'
        + '<th>Compte bancaire</th><th>Date GL</th><th>Libellé GL</th><th>Réf. GL</th><th>Montant GL</th>'
        + '<th>Date Relevé</th><th>Libellé Relevé</th><th>Réf. Relevé</th><th>Montant Relevé</th><th>Écart</th>'
        + '</tr></thead>'
        + '<tbody id="rb-resultat-corps"></tbody>'
        + '<tfoot><tr style="font-weight:700; background:#1a5276; color:#fff;">'
        + '<td colspan="4" style="text-align:right;">TOTAUX</td><td class="number" id="rb-res-tot-gl">0</td>'
        + '<td colspan="3"></td><td class="number" id="rb-res-tot-releve">0</td>'
        + '<td class="number" id="rb-res-tot-ecart">0</td></tr></tfoot>'
        + '</table></div>'
        + '</div>';
}
function rbManquantesHtml(){
    return '<div class="card" id="rb-manquantes-section" style="display:none; background:#eafaf1; margin-bottom:16px;">'
        + '<h3 style="margin-top:0;">➕ Écritures relevé sans correspondance — proposition</h3>'
        + '<p style="font-size:12px; color:#555; margin:0 0 10px;">Ces lignes du relevé n’ont aucune écriture correspondante dans '
        + 'le Grand Livre (frais, agios, virement non comptabilisé…). Une écriture en partie double est proposée pour chacune — '
        + 'vérifiez/corrigez les comptes et le libellé, décochez ce qui ne doit pas être reporté, puis validez.</p>'
        + '<div class="scroll-table"><table><thead><tr><th>Inclure</th><th>Date</th><th>Libellé relevé</th><th>Montant</th>'
        + '<th>Catégorie détectée</th><th>Compte banque</th><th>Compte contrepartie</th><th>Libellé compta</th></tr></thead>'
        + '<tbody id="rb-manquantes-corps"></tbody></table></div>'
        + '<button type="button" class="btn btn-primary" style="margin-top:10px; background:#27ae60;" onclick="rbReporterEcrituresManquantes()">'
        + '📤 Reporter les lignes cochées au Grand Livre Bilan</button>'
        + '</div>';
}
function rbRecapHtml(){
    return '<div class="card" style="background:#eaf2f8; margin-top:16px;">'
        + '<h3 style="margin-top:0;">📈 Récapitulatif</h3>'
        + '<h4 style="margin:6px 0 4px; font-size:13px;">Période <strong id="rb-recap-periode">—</strong> — <span id="rb-recap-etat" style="font-weight:700;">—</span></h4>'
        + '<div style="font-size:12px; display:flex; flex-wrap:wrap; gap:18px;">'
        + '<span>Écritures GL (banque) : <strong id="rb-recap-nb-gl">0</strong></span>'
        + '<span>Rapprochées : <strong id="rb-recap-rappro">0 / 0</strong></span>'
        + '<span>GL non rapprochées : <strong id="rb-recap-gl-non">0</strong></span>'
        + '<span>Lignes relevé non rapprochées : <strong id="rb-recap-rel-non">0</strong></span>'
        + '</div>'
        + '<div style="font-size:12px; display:flex; flex-wrap:wrap; gap:18px; margin-top:6px;">'
        + '<span>Total Débit : <strong id="rb-recap-debit">0</strong></span>'
        + '<span>Total Crédit : <strong id="rb-recap-credit">0</strong></span>'
        + '<span>Variation du solde banque : <strong id="rb-recap-solde">0</strong></span>'
        + '</div>'
        + '<h4 style="margin:14px 0 4px; font-size:13px;">Exercice N — contrôle de cohérence</h4>'
        + '<div style="font-size:12px; display:flex; flex-wrap:wrap; gap:18px;">'
        + '<span>Opérations de banque au Grand Livre (tous mois) : <strong id="rb-an-nb">0</strong></span>'
        + '<span>Mouvement net de l’exercice : <strong id="rb-an-solde">0</strong></span>'
        + '<span>Solde du compte banque à la clôture (Balance N) : <strong id="rb-an-balance">—</strong></span>'
        + '<span>Écart Balance / Grand Livre : <strong id="rb-an-ecart">—</strong></span>'
        + '</div>'
        + '<p style="font-size:11px; color:#666; margin:8px 0 0;">L’écart compare le solde de clôture de la balance au solde '
        + 'd’ouverture augmenté des mouvements du Grand Livre. Il doit être nul.</p>'
        + '</div>';
}
function rbContenuHtml(){
    return '<div class="card" data-tab="rapprochement-bancaire">'
        + '<h2>🏦 RAPPROCHEMENT BANCAIRE</h2>'
        + '<div class="alert alert-info">Ce tableau met, côte à côte, chaque écriture du Grand Livre sur le(s) compte(s) de '
        + 'banque et la ligne du relevé qui lui correspond, sur la <strong>période choisie ci-dessous</strong>. Importez ou '
        + 'collez votre relevé : le moteur rapproche par montant/date, ne tranche <strong>jamais</strong> un cas ambigu tout '
        + 'seul, et propose les écritures manquantes (frais, agios…) prêtes à reporter dans le Grand Livre. Sens : en '
        + 'comptabilité, un <strong>débit</strong> du compte banque est un encaissement, un <strong>crédit</strong> un '
        + 'décaissement — l’inverse de votre relevé.</div>'
        + rbPeriodeHtml()
        + rbImportHtml()
        + rbAmbigusHtml()
        + rbResultatHtml()
        + rbManquantesHtml()
        + rbRecapHtml()
        + '</div>';
}

function rbPreremplirPeriode(){
    var du = document.getElementById('rb-date-du'), au = document.getElementById('rb-date-au');
    var exDu = document.getElementById('r1-exercice-du'), exAu = document.getElementById('r1-exercice-au');
    if(du && !du.value && exDu && exDu.value) du.value = exDu.value;
    if(au && !au.value && exAu && exAu.value) au.value = exAu.value;
}

var rbEnReconstruction = false;
// Filet de sécurité, même principe que glAssurerIntegrite (04-grand-livre.js) :
// la restauration du contenu sauvegardé (applyRemoteTab) peut remplacer tout le
// innerHTML de l'onglet par une version enregistrée AVANT cette refonte
// (anciens tableaux mensuels). On la détecte (structure clé absente) et on
// reconstruit, en préservant le seul état persisté : le relevé importé.
function rbAssurerStructure(){
    if(rbEnReconstruction) return;
    var div = document.getElementById('rapprochement-bancaire');
    if(!div) return;
    if(div.querySelector('#rb-resultat-corps') && div.querySelector('#rb-date-du')) return;
    rbEnReconstruction = true;
    try{
        var ancienTa = div.querySelector('#rb-releve-json');
        var etatJson = ancienTa ? (ancienTa.value || ancienTa.textContent || '') : '';
        div.innerHTML = rbContenuHtml();
        var nouveauTa = div.querySelector('#rb-releve-json');
        if(nouveauTa) nouveauTa.value = etatJson;
        rbPreremplirPeriode();
    } finally {
        rbEnReconstruction = false;
    }
}

function rbInstaller(){
    if(typeof TABS !== 'undefined' && !TABS.some(function(t){ return t.id === 'rapprochement-bancaire'; }))
        TABS.push({ id:'rapprochement-bancaire', label:'🏦 Rapprochement Bancaire', phase:2 });

    var hote = (document.querySelector('.tab-content') || {}).parentNode;
    if(!hote) return;

    if(!document.getElementById('rapprochement-bancaire')){
        var d = document.createElement('div');
        d.id = 'rapprochement-bancaire';
        d.className = 'tab-content';
        d.innerHTML = rbContenuHtml();
        hote.appendChild(d);
    } else {
        rbAssurerStructure();
    }

    var menu = document.getElementById('phase-dropdown-2');
    if(menu && !menu.querySelector('[data-rb]')){
        var b = document.createElement('button');
        b.className = 'tab-btn phase2';
        b.setAttribute('data-rb', '1');
        b.setAttribute('onclick', "showTab('rapprochement-bancaire')");
        b.textContent = '🏦 Rapprochement Bancaire';
        var apres = menu.querySelector('[onclick*="\'gl-gestion\'"]');
        if(apres && apres.nextSibling) menu.insertBefore(b, apres.nextSibling);
        else menu.appendChild(b);
    }

    rbPreremplirPeriode();
    rbObserverSync();
    // Premier rendu : si le Grand Livre et/ou un relevé restauré sont déjà là,
    // le tableau se remplit seul, sans alerte ni clic.
    rbLancerRapprochement(true);
}

var rbObservateurPose = false;
function rbObserverSync(){
    if(rbObservateurPose) return;
    var div = document.getElementById('rapprochement-bancaire');
    if(!div || typeof MutationObserver === 'undefined') return;
    rbObservateurPose = true;
    // childList seul (sans subtree) : ne réagit qu'au remplacement complet du
    // contenu de l'onglet (restauration distante), jamais aux mises à jour
    // internes (rendu du tableau), qui relanceraient l'observateur en boucle.
    var mo = new MutationObserver(function(){
        if(rbEnReconstruction) return;
        rbAssurerStructure();
        rbLancerRapprochement(true);
    });
    mo.observe(div, { childList:true });
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', rbInstaller);
        else
            rbInstaller();
    }
}catch(e){}
