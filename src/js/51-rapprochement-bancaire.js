/* ==================================================================
   SEVEN7 — RAPPROCHEMENT BANCAIRE (Novembre / Décembre)

   Onglet rattaché à la lettre j (Grand Livre) de l'arborescence a→u, sur
   le même modèle que 47-choix-opinion.js (panneau auto-installé, déclaré
   dans TABS, jamais dupliqué, bouton inséré dans le menu Phase 2 juste
   après GL Gestion).

   HISTORIQUE (à comprendre avant de retoucher ce fichier) : le 25/08,
   l'import du relevé (CSV/Excel) avait été entièrement retiré à la
   demande du cabinet — le sélecteur de fichiers Android le rendait
   impraticable sur le terrain, et le cabinet travaillait avec le relevé
   PAPIER sous les yeux. L'onglet ne faisait plus qu'extraire le Grand
   Livre et laisser cocher « Pointé » à la main.

   Le 26/08, nouvelle demande explicite : rapprochement automatique
   complet (import CSV/Excel ou collage, moteur de correspondance
   montant/date/référence, détection des doublons ambigus, génération
   des écritures manquantes). Pour ne pas reproduire le problème du
   25/08, l'import se fait par DEUX voies parallèles : fichier (utile au
   bureau) ET collage de texte (contourne totalement le sélecteur de
   fichiers Android — copier le relevé depuis l'appli bancaire ou Excel
   et le coller directement). Le pointage manuel papier reste intact et
   pleinement fonctionnel en parallèle : rien n'oblige à importer quoi
   que ce soit, c'est un mode additionnel, pas un remplacement.

   PRINCIPE DE SÉCURITÉ (« zéro erreur silencieuse », demande explicite
   du cabinet) : le moteur ne coche automatiquement une correspondance
   QUE si elle est mutuellement unique — une ligne de relevé avec
   exactement un candidat Grand Livre compatible (compte, sens, montant,
   ±N jours), et ce candidat n'est réclamé par aucune autre ligne de
   relevé. Tout le reste (0 ou 2+ candidats, des deux côtés) part dans
   des listes séparées qui exigent une décision explicite de l'auditeur
   — jamais de correspondance choisie seule par le moteur en cas de
   doute. Toute ligne de fichier illisible (date/montant non compris)
   est listée telle quelle, jamais silencieusement ignorée.

   ARCHITECTURE : le relevé importé (lignes brutes + rejets) est
   sérialisé en JSON dans un <textarea id="rb-releve-json" hidden> à
   l'intérieur de l'onglet — comme tout onglet de l'app, la sauvegarde
   Firestore capture le innerHTML entier du div (doSaveTab,
   10-config-collaboration.js), et freezeDynamicValues() copie déjà
   .value vers le contenu du textarea avant capture (même mécanisme que
   pour toute zone de collage existante) : ça survit donc au rechargement
   sans mécanisme de persistance dédié. Chaque ligne de relevé porte un
   id stable (rbNouvelId) et un indicateur .traite, mis à jour au fil des
   rapprochements/résolutions — c'est la seule vraie source de vérité
   sur ce qui reste à traiter (le Grand Livre affiché, lui, reste
   régénéré à chaque fois depuis grandLivreData comme avant).

   Portée limitée aux deux derniers mois de l'exercice (novembre,
   décembre) — demande explicite du cabinet, pas une limite technique :
   RB_MOIS peut recevoir d'autres mois sans reprendre la structure.
   ================================================================== */

var RB_MOIS = [
    { index: 10, id: 'nov', nom: 'Novembre' },
    { index: 11, id: 'dec', nom: 'Décembre' }
];

/* ---------- Comptes banque (préfixes, ex. "52" ou "521,522") ---------- */
function rbComptesConfigures(){
    var input = document.getElementById('rb-comptes-banque');
    var brut = input ? input.value : '52';
    return String(brut || '52').split(/[,\s]+/).filter(function(s){ return s !== ''; });
}
function rbInfoMois(moisIndex){
    return RB_MOIS.filter(function(m){ return m.index === moisIndex; })[0];
}
function rbMoisDeDate(dateStr){
    var mois = parseInt(String(dateStr || '').slice(5, 7), 10) - 1;
    return isNaN(mois) ? null : mois;
}
function rbToleranceJours(){
    var el = document.getElementById('rb-tolerance-jours');
    var v = el ? parseInt(el.value, 10) : NaN;
    return (isNaN(v) || v < 0) ? 5 : v;
}
function rbPad2(n){ n = String(n); return n.length < 2 ? '0' + n : n; }

// Écritures du Grand Livre pour ces comptes et ce mois — même logique de
// préfixe que tfMouvementMensuel (48-tableaux-fiscaux.js). grandLivreData
// réunit GL Bilan et GL Gestion (02-balances-modele.js) ; les comptes 52
// vivent dans le GL Bilan, mais on lit l'ensemble pour ne dépendre d'aucune
// hypothèse sur l'onglet où l'écriture a été saisie.
function rbEcrituresGL(moisIndex, prefixes){
    var rows = (typeof grandLivreData !== 'undefined') ? grandLivreData : [];
    var out = [];
    for(var i = 0; i < rows.length; i++){
        var r = rows[i];
        var compte = String(r.compte || '').trim();
        var correspond = prefixes.some(function(p){ return compte.indexOf(p) === 0; });
        if(!correspond) continue;
        if(rbMoisDeDate(r.date) !== moisIndex) continue;
        out.push(r);
    }
    out.sort(function(a, b){ return String(a.date || '').localeCompare(String(b.date || '')); });
    return out;
}
// Même chose, mais uniquement les écritures dont la case Pointé n'est PAS
// déjà cochée dans le tableau affiché — c'est le vivier réel de candidats
// pour le moteur de rapprochement (une écriture déjà pointée, peu importe
// comment, ne doit plus jamais être proposée comme correspondance).
function rbEcrituresGLNonPointees(moisIndex, prefixes){
    var ecritures = rbEcrituresGL(moisIndex, prefixes);
    var info = rbInfoMois(moisIndex);
    var corps = document.getElementById('rb-table-' + info.id);
    if(!corps) return ecritures;
    return ecritures.filter(function(r){
        var tr = rbTrPourClef(corps, rbClefLigne(r));
        var cb = tr ? tr.querySelector('.rb-pointe') : null;
        return !(cb && cb.checked);
    });
}

// Identifie une opération indépendamment de sa position dans la liste :
// permet de retrouver les cases déjà cochées après une actualisation, même
// si des écritures ont été ajoutées ou supprimées entre-temps dans le GL.
function rbClefLigne(r){
    return [String(r.compte || '').trim(), String(r.date || '').trim(), String(r.ref || '').trim(),
            String(r.libelle || '').trim(), parseNum(r.debit), parseNum(r.credit)].join('|');
}
function rbTrPourClef(corps, clef){
    var trs = corps.querySelectorAll('tr[data-rb-clef]');
    for(var i = 0; i < trs.length; i++){
        if(trs[i].getAttribute('data-rb-clef') === clef) return trs[i];
    }
    return null;
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
// ecrituresGL est déjà filtré par compte/mois), montant identique (à
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
// autres cas (0, ou 2+ candidats d'un côté ou de l'autre), rien n'est coché
// tout seul : direction « ambigus » (2+ candidats) ou « sans correspondance »
// (0 candidat), pour décision explicite de l'auditeur.
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
// PROPOSITION éditable — jamais un fait accompli, voir rbRendreSansCorrespondance.
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
        var mois = rbMoisDeDate(l.date);
        if(mois === null || RB_MOIS.every(function(m){ return m.index !== mois; })){ horsPeriode++; return; }
        l.id = rbNouvelId();
        l.traite = false;
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
    if(!confirm('Effacer le relevé importé de la mémoire de cet onglet ? Les cases déjà pointées dans les tableaux ne seront PAS décochées.')) return;
    rbSauverEtatReleve({ lignes:[], rejets:[], importeLe:null, sourceNom:'' });
    rbRendreDiagnosticImport({ lignes:[], rejets:[] }, 0, 0);
    rbRendreAmbigus({});
    rbRendreSansCorrespondance([]);
}
function rbRendreDiagnosticImport(etat, nbRetenues, horsPeriode){
    var el = document.getElementById('rb-import-diagnostic');
    if(!el) return;
    if(!etat.importeLe && !etat.lignes.length){ el.innerHTML = ''; return; }
    var rejets = etat.rejets || [];
    var html = '<div class="alert ' + (rejets.length ? 'alert-warning' : 'alert-success') + '" style="margin-top:10px; font-size:12px;">'
        + '📄 Dernier import (' + esc(etat.sourceNom || '—') + ') : <strong>' + nbRetenues + '</strong> ligne(s) retenue(s) (nov/déc)'
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
   LANCEMENT DU RAPPROCHEMENT + APPLICATION DES RÉSULTATS
   ================================================================== */
function rbLancerRapprochement(silencieux){
    var etat = rbChargerEtatReleve();
    if(!etat || !etat.lignes || !etat.lignes.length){
        if(!silencieux) alert('Importez ou collez d’abord un relevé bancaire avant de lancer le rapprochement automatique.');
        rbRendreAmbigus({});
        rbRendreSansCorrespondance([]);
        return;
    }
    var prefixes = rbComptesConfigures();
    var tolerance = rbToleranceJours();
    var totalAuto = 0;
    var ambigusParMois = {};
    var sansCorrespondanceTotal = [];

    RB_MOIS.forEach(function(m){
        var lignesDuMois = etat.lignes.filter(function(l){ return !l.traite && rbMoisDeDate(l.date) === m.index; });
        var ecrituresGL = rbEcrituresGLNonPointees(m.index, prefixes);
        var resultat = rbRapprocher(lignesDuMois, ecrituresGL, tolerance);
        totalAuto += rbAppliquerAuto(m.index, resultat.auto);
        // Une fois pointée sans ambiguïté, la ligne est traitée : voir la note
        // d'architecture en tête de fichier sur la limite assumée (si l'auditeur
        // décoche ensuite à la main, il choisit lui-même une autre correspondance
        // plutôt que d'attendre une nouvelle proposition automatique).
        resultat.auto.forEach(function(a){ a.ligneReleve.traite = true; });
        ambigusParMois[m.id] = resultat.ambigus;
        sansCorrespondanceTotal = sansCorrespondanceTotal.concat(resultat.sansCorrespondance);
    });

    rbSauverEtatReleve(etat);
    rbRendreAmbigus(ambigusParMois);
    rbRendreSansCorrespondance(sansCorrespondanceTotal);
    rbRecalculerTout();

    if(!silencieux){
        var totalAmbigus = 0;
        RB_MOIS.forEach(function(m){ totalAmbigus += ambigusParMois[m.id].length; });
        alert('🤖 Rapprochement automatique — ' + totalAuto + ' ligne(s) pointée(s) sans ambiguïté, '
            + totalAmbigus + ' cas ambigu(s) à trancher ci-dessous, '
            + sansCorrespondanceTotal.length + ' ligne(s) du relevé sans écriture correspondante (proposées ci-dessous).');
    }
}
function rbAppliquerAuto(moisIndex, auto){
    var info = rbInfoMois(moisIndex);
    var corps = document.getElementById('rb-table-' + info.id);
    if(!corps) return 0;
    var n = 0;
    auto.forEach(function(m){
        var tr = rbTrPourClef(corps, rbClefLigne(m.ecritureGL));
        if(!tr) return;
        var cb = tr.querySelector('.rb-pointe');
        if(!cb || cb.checked) return; // déjà pointée (ne touche jamais une case déjà cochée)
        cb.checked = true;
        cb.setAttribute('data-origine', 'auto');
        n++;
    });
    if(n) rbRecalculer(moisIndex);
    return n;
}
function rbCandidatsPourLigne(ligne, moisIndex){
    var ecritures = rbEcrituresGLNonPointees(moisIndex, rbComptesConfigures());
    return rbCandidatsGL(ligne, ecritures, rbToleranceJours());
}

/* ---------- Doublons ambigus : résolution manuelle ---------- */
function rbRendreAmbigus(ambigusParMois){
    var corps = document.getElementById('rb-ambigus-corps');
    var section = document.getElementById('rb-ambigus-section');
    if(!corps || !section) return;
    var total = 0;
    var lignesHtml = [];
    RB_MOIS.forEach(function(m){
        (ambigusParMois[m.id] || []).forEach(function(a){
            total++;
            var lr = a.ligneReleve;
            var cible = lr.credit > 0 ? lr.credit : lr.debit;
            var selectId = 'rb-amb-sel-' + lr.id;
            lignesHtml.push('<tr>'
                + '<td>' + esc(m.nom) + '</td>'
                + '<td>' + esc(lr.date) + '</td>'
                + '<td>' + esc(lr.libelle) + (lr.ref ? ' (' + esc(lr.ref) + ')' : '') + '</td>'
                + '<td class="number">' + fmt(cible) + '</td>'
                + '<td><select id="' + selectId + '"><option value="">— Choisir —</option>'
                + a.candidats.map(function(c){
                    var montantGL = parseNum(c.ecritureGL.debit) || parseNum(c.ecritureGL.credit);
                    // La valeur de l'option est la clef stable de l'écriture (pas sa position dans
                    // la liste) : si une autre ambiguïté est résolue entre le rendu et le clic sur
                    // « Valider », la sélection reste correcte — rbConfirmerAmbigu réidentifie
                    // l'écriture par cette même clef plutôt que par un indice qui pourrait glisser.
                    return '<option value="' + esc(rbClefLigne(c.ecritureGL)) + '">' + esc(c.ecritureGL.date) + ' · '
                        + esc(c.ecritureGL.libelle || c.ecritureGL.ref || '(sans libellé)') + ' · '
                        + fmt(montantGL) + ' · écart ' + c.ecartJours.toFixed(1) + ' j</option>';
                }).join('')
                + '<option value="aucune">Aucune de ces écritures</option></select></td>'
                + '<td><button type="button" class="btn btn-primary" onclick="rbConfirmerAmbigu(' + m.index + ', \'' + lr.id + '\', \'' + selectId + '\')">✔ Valider</button></td>'
                + '</tr>');
        });
    });
    section.style.display = total ? '' : 'none';
    corps.innerHTML = lignesHtml.join('') || '<tr><td colspan="6" style="text-align:center; color:#999;">Aucun cas ambigu.</td></tr>';
}
function rbConfirmerAmbigu(moisIndex, ligneId, selectId){
    var select = document.getElementById(selectId);
    if(!select || select.value === ''){ alert('Choisissez une correspondance ou « Aucune de ces écritures » avant de valider.'); return; }
    var etat = rbChargerEtatReleve();
    if(!etat){ alert('Le relevé importé est introuvable — relancez le rapprochement.'); return; }
    var ligne = etat.lignes.filter(function(l){ return l.id === ligneId; })[0];
    if(!ligne){ alert('Cette ligne a disparu — relancez le rapprochement.'); return; }
    if(select.value !== 'aucune'){
        var candidats = rbCandidatsPourLigne(ligne, moisIndex);
        var choisi = candidats.filter(function(c){ return rbClefLigne(c.ecritureGL) === select.value; })[0];
        if(!choisi){ alert('Cette écriture n’est plus disponible (déjà pointée par une autre résolution entre-temps) — relancez le rapprochement.'); return; }
        var info = rbInfoMois(moisIndex);
        var corps = document.getElementById('rb-table-' + info.id);
        var tr = corps ? rbTrPourClef(corps, rbClefLigne(choisi.ecritureGL)) : null;
        if(tr){
            var cb = tr.querySelector('.rb-pointe');
            if(cb && !cb.checked){ cb.checked = true; cb.setAttribute('data-origine', 'manuel'); }
        }
        rbRecalculer(moisIndex);
    }
    ligne.traite = true;
    rbSauverEtatReleve(etat);
    rbLancerRapprochement(true);
}

/* ---------- Écritures relevé sans correspondance : proposition + report ---------- */
function rbRendreSansCorrespondance(sansCorrespondance){
    var corps = document.getElementById('rb-manquantes-corps');
    var section = document.getElementById('rb-manquantes-section');
    if(!corps || !section) return;
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
// les modifier est celle déjà testée du Grand Livre lui-même. C'est aussi
// pourquoi c'est un clic EXPLICITE (jamais automatique) : les comptes
// proposés sont des suggestions, pas une vérité — l'auditeur les valide (et
// peut les corriger) avant qu'ils n'entrent dans la comptabilité.
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
        if(!ligne || ligne.traite) return;
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
        ligne.traite = true;
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

/* ---------- Génération du tableau d'un mois depuis le Grand Livre ---------- */
function rbGenererMois(moisIndex, silencieux){
    var info = rbInfoMois(moisIndex);
    var corps = document.getElementById('rb-table-' + info.id);
    if(!corps) return;

    // Mémorise le pointage déjà effectué (et son origine manuel/auto) avant de reconstruire.
    var dejaPointees = {};
    Array.prototype.slice.call(corps.querySelectorAll('tr[data-rb-clef]')).forEach(function(tr){
        var cb = tr.querySelector('.rb-pointe');
        if(cb && cb.checked)
            dejaPointees[tr.getAttribute('data-rb-clef')] = { origine: cb.getAttribute('data-origine') || 'manuel' };
    });

    var ecritures = rbEcrituresGL(moisIndex, rbComptesConfigures());
    if(!ecritures.length){
        corps.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#999; padding:14px;">'
            + 'Aucune opération de banque trouvée dans le Grand Livre pour ' + esc(info.nom.toLowerCase()) + '. '
            + 'Vérifiez que le Grand Livre est bien importé et que le préfixe de compte ci-dessus correspond à vos comptes de banque.'
            + '</td></tr>';
        rbRecalculer(moisIndex);
        if(!silencieux) alert('Aucune opération de banque pour ' + info.nom + '.');
        return;
    }

    corps.innerHTML = ecritures.map(function(r){
        var clef = rbClefLigne(r);
        var debit = parseNum(r.debit), credit = parseNum(r.credit);
        var pointage = dejaPointees[clef];
        var checked = !!pointage;
        var origine = pointage ? pointage.origine : 'manuel';
        return '<tr data-rb-clef="' + esc(clef) + '">'
            + '<td>' + esc(r.date) + '</td>'
            + '<td>' + esc(r.compte) + '</td>'
            + '<td>' + esc(r.ref) + '</td>'
            + '<td>' + esc(r.libelle) + '</td>'
            + '<td class="number rb-debit" data-montant="' + debit + '">' + (debit ? fmt(debit) : '') + '</td>'
            + '<td class="number rb-credit" data-montant="' + credit + '">' + (credit ? fmt(credit) : '') + '</td>'
            + '<td style="text-align:center;"><input type="checkbox" class="rb-pointe" data-origine="' + origine + '"'
            + (checked ? ' checked' : '') + ' onchange="rbRecalculerDeCellule(this)">'
            + (checked && origine === 'auto' ? ' <span title="Rapproché automatiquement — vérifiez avant de conclure" style="font-size:11px;">🤖</span>' : '')
            + '</td>'
            + '</tr>';
    }).join('');

    rbRecalculer(moisIndex);
    if(!silencieux){
        var reportees = Object.keys(dejaPointees).length;
        alert('✅ ' + info.nom + ' : ' + ecritures.length + ' opération(s) de banque extraite(s) du Grand Livre'
            + (reportees ? ', ' + reportees + ' pointage(s) déjà fait(s) conservé(s).' : '.'));
    }
}
function rbGenererTout(silencieux){
    RB_MOIS.forEach(function(m){ rbGenererMois(m.index, silencieux); });
}

/* ---------- Recalcul des totaux d'un mois ---------- */
function rbMoisDeTable(corps){
    if(!corps) return null;
    for(var i = 0; i < RB_MOIS.length; i++){
        if(corps.id === 'rb-table-' + RB_MOIS[i].id) return RB_MOIS[i].index;
    }
    return null;
}
function rbRecalculerDeCellule(el){
    // Toute interaction humaine sur la case reclasse la ligne en « manuel » —
    // y compris décocher/recocher un pointage posé par le moteur automatique —
    // et retire le badge 🤖, qui n'aurait plus de sens sur une décision qui
    // vient d'être reconfirmée à la main.
    el.setAttribute('data-origine', 'manuel');
    var badge = el.parentNode.querySelector('span[title^="Rapproché automatiquement"]');
    if(badge) badge.remove();
    var corps = el.closest('tbody');
    var moisIndex = rbMoisDeTable(corps);
    if(moisIndex !== null) rbRecalculer(moisIndex);
}
function rbRecalculer(moisIndex){
    var info = rbInfoMois(moisIndex);
    var corps = document.getElementById('rb-table-' + info.id);
    if(!corps) return;

    var totDebit = 0, totCredit = 0;
    var debitPointe = 0, creditPointe = 0;
    var nbPointe = 0, nbNonPointe = 0;

    Array.prototype.slice.call(corps.querySelectorAll('tr[data-rb-clef]')).forEach(function(tr){
        var debit = parseNum(tr.querySelector('.rb-debit').getAttribute('data-montant'));
        var credit = parseNum(tr.querySelector('.rb-credit').getAttribute('data-montant'));
        var pointe = tr.querySelector('.rb-pointe').checked;
        totDebit += debit;
        totCredit += credit;
        if(pointe){ debitPointe += debit; creditPointe += credit; nbPointe++; }
        else nbNonPointe++;
        // Une opération pointée est visuellement mise en retrait : ce qui reste en
        // clair est exactement ce qui n'a pas encore été retrouvé sur le relevé.
        tr.style.background = pointe ? '#eafaf1' : '';
        tr.style.color = pointe ? '#7f8c8d' : '';
    });

    var soldeMois = totDebit - totCredit;                                  // variation du solde en comptabilité
    var enSuspens = (totDebit - debitPointe) - (totCredit - creditPointe); // opérations pas encore retrouvées

    rbTexte('rb-tot-debit-' + info.id, fmt(totDebit));
    rbTexte('rb-tot-credit-' + info.id, fmt(totCredit));
    rbTexte('rb-solde-' + info.id, fmt(soldeMois));
    rbTexte('rb-nb-total-' + info.id, nbPointe + nbNonPointe);
    rbTexte('rb-nb-pointe-' + info.id, nbPointe);
    rbTexte('rb-nb-non-pointe-' + info.id, nbNonPointe);
    rbTexte('rb-debit-pointe-' + info.id, fmt(debitPointe));
    rbTexte('rb-credit-pointe-' + info.id, fmt(creditPointe));

    var elSuspens = document.getElementById('rb-suspens-' + info.id);
    if(elSuspens){
        elSuspens.textContent = fmt(enSuspens);
        elSuspens.style.color = (nbNonPointe === 0) ? '#27ae60' : '#e74c3c';
        elSuspens.style.fontWeight = '700';
    }
    // Le récapitulatif cumule les deux mois : il doit suivre tout recalcul mensuel
    // (pointage d'une case, régénération), sinon il resterait figé à zéro.
    rbRecalculerRecap();
}
function rbTexte(id, val){
    var el = document.getElementById(id);
    if(el) el.textContent = val;
}
function rbRecalculerTout(){
    // rbRecalculer met déjà le récapitulatif à jour à chaque passage.
    RB_MOIS.forEach(function(m){ rbRecalculer(m.index); });
}

/* ---------- Récapitulatif : cumul des deux mois + exercice entier ----------
   Deux niveaux volontairement distincts :
   - « Novembre + Décembre » : cumul des tableaux affichés, donc des lignes
     réellement pointables — c'est le périmètre du travail de rapprochement.
   - « Exercice N » : TOUTES les opérations de banque du Grand Livre, tous mois
     confondus, et le solde du/des compte(s) banque à la clôture d'après la
     balance N (fonctions SD/SC de 02-balances-modele.js quand elles existent).
     Ce solde de balance est la référence à laquelle le relevé de décembre doit
     aboutir ; il est calculé indépendamment du Grand Livre, ce qui permet de
     voir immédiatement si les deux sources divergent.                        */
// SD/SC/OD/OC (02-balances-modele.js) somment déjà TOUS les comptes commençant
// par le préfixe donné : on les appelle une fois par préfixe configuré, jamais
// ligne à ligne (ce qui compterait deux fois un compte couvert par deux préfixes
// imbriqués, ex. « 52 » et « 521 »). Rend null si la balance N n'est pas saisie,
// pour afficher « — » plutôt qu'un 0 trompeur.
function rbSoldeBalanceBanque(prefixes){
    if(typeof balanceData === 'undefined' || typeof SD !== 'function' || typeof SC !== 'function') return null;
    var lignes = (balanceData && balanceData['n']) ? balanceData['n'] : null;
    if(!lignes || !lignes.length) return null;
    var total = 0;
    // solde débiteur net : un compte banque créditeur (découvert) ressort négatif
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

    // Cumul des deux mois affichés, lu depuis les tableaux (donc pointages inclus).
    var totDebit = 0, totCredit = 0, debitPointe = 0, creditPointe = 0, nbTotal = 0, nbPointe = 0;
    RB_MOIS.forEach(function(info){
        var corps = document.getElementById('rb-table-' + info.id);
        if(!corps) return;
        Array.prototype.slice.call(corps.querySelectorAll('tr[data-rb-clef]')).forEach(function(tr){
            var debit = parseNum(tr.querySelector('.rb-debit').getAttribute('data-montant'));
            var credit = parseNum(tr.querySelector('.rb-credit').getAttribute('data-montant'));
            totDebit += debit; totCredit += credit; nbTotal++;
            if(tr.querySelector('.rb-pointe').checked){ debitPointe += debit; creditPointe += credit; nbPointe++; }
        });
    });
    var suspens = (totDebit - debitPointe) - (totCredit - creditPointe);

    rbTexte('rb-recap-nb', nbTotal);
    rbTexte('rb-recap-nb-pointe', nbPointe);
    rbTexte('rb-recap-nb-non-pointe', nbTotal - nbPointe);
    rbTexte('rb-recap-debit', fmt(totDebit));
    rbTexte('rb-recap-credit', fmt(totCredit));
    rbTexte('rb-recap-solde', fmt(totDebit - totCredit));
    var elSus = document.getElementById('rb-recap-suspens');
    if(elSus){
        elSus.textContent = fmt(suspens);
        elSus.style.color = (nbTotal - nbPointe === 0) ? '#27ae60' : '#e74c3c';
        elSus.style.fontWeight = '700';
    }

    // Exercice entier, depuis le Grand Livre (tous mois).
    var rows = (typeof grandLivreData !== 'undefined') ? grandLivreData : [];
    var anDebit = 0, anCredit = 0, anNb = 0;
    rows.forEach(function(r){
        var compte = String(r.compte || '').trim();
        if(!compte || !prefixes.some(function(p){ return compte.indexOf(p) === 0; })) return;
        anDebit += parseNum(r.debit); anCredit += parseNum(r.credit); anNb++;
    });
    rbTexte('rb-an-nb', anNb);
    rbTexte('rb-an-debit', fmt(anDebit));
    rbTexte('rb-an-credit', fmt(anCredit));
    rbTexte('rb-an-solde', fmt(anDebit - anCredit));

    // Solde de clôture d'après la Balance N, et écart avec le Grand Livre.
    var soldeBalance = rbSoldeBalanceBanque(prefixes);
    var elBal = document.getElementById('rb-an-balance');
    var elEcart = document.getElementById('rb-an-ecart');
    if(elBal && elEcart){
        if(soldeBalance === null){
            elBal.textContent = '— (balance N non saisie)';
            elBal.style.color = '#999';
            elEcart.textContent = '—';
            elEcart.style.color = '#999';
            elEcart.style.fontWeight = '400';
        } else {
            elBal.textContent = fmt(soldeBalance);
            elBal.style.color = '';
            // Le Grand Livre ne porte que les mouvements de l'exercice : l'écart
            // attendu avec le solde de balance est le solde d'OUVERTURE du compte,
            // pas zéro. On le retranche quand l'ouverture est disponible.
            var ouverture = rbOuvertureBanque(prefixes);
            var ecart = soldeBalance - (ouverture + (anDebit - anCredit));
            elEcart.textContent = fmt(ecart);
            elEcart.style.color = Math.abs(ecart) < 0.5 ? '#27ae60' : '#e74c3c';
            elEcart.style.fontWeight = '700';
        }
    }
}
function rbRecapHtml(){
    return '<div class="card" style="background:#eaf2f8; margin-top:16px;">'
        + '<h3 style="margin-top:0;">📊 Récapitulatif</h3>'
        + '<h4 style="margin:6px 0 4px; font-size:13px;">Novembre + Décembre (les deux mois rapprochés)</h4>'
        + '<div style="font-size:12px; display:flex; flex-wrap:wrap; gap:18px;">'
        + '<span>Opérations : <strong id="rb-recap-nb">0</strong> '
        + '(✅ <strong id="rb-recap-nb-pointe">0</strong> pointées · ⏳ <strong id="rb-recap-nb-non-pointe">0</strong> non pointées)</span>'
        + '<span>Total Débit : <strong id="rb-recap-debit">0</strong></span>'
        + '<span>Total Crédit : <strong id="rb-recap-credit">0</strong></span>'
        + '<span>Solde des deux mois : <strong id="rb-recap-solde">0</strong></span>'
        + '<span>En suspens : <strong id="rb-recap-suspens">0</strong></span>'
        + '</div>'
        + '<h4 style="margin:14px 0 4px; font-size:13px;">Exercice N — tous les mois</h4>'
        + '<div style="font-size:12px; display:flex; flex-wrap:wrap; gap:18px;">'
        + '<span>Opérations de banque au Grand Livre : <strong id="rb-an-nb">0</strong></span>'
        + '<span>Total Débit : <strong id="rb-an-debit">0</strong></span>'
        + '<span>Total Crédit : <strong id="rb-an-credit">0</strong></span>'
        + '<span>Mouvement net de l’exercice : <strong id="rb-an-solde">0</strong></span>'
        + '</div>'
        + '<div style="font-size:12px; display:flex; flex-wrap:wrap; gap:18px; margin-top:6px;">'
        + '<span>Solde du compte banque à la clôture (Balance N) : <strong id="rb-an-balance">—</strong></span>'
        + '<span>Écart Balance / Grand Livre : <strong id="rb-an-ecart">—</strong></span>'
        + '</div>'
        + '<p style="font-size:11px; color:#666; margin:8px 0 0;">L’écart compare le solde de clôture de la balance au solde '
        + 'd’ouverture augmenté des mouvements du Grand Livre. Il doit être nul : sinon, le Grand Livre et la balance ne '
        + 'racontent pas la même histoire sur le compte banque.</p>'
        + '</div>';
}

/* ---------- Pointer / dépointer tout un mois ---------- */
function rbBasculerTout(moisIndex, valeur){
    var info = rbInfoMois(moisIndex);
    var corps = document.getElementById('rb-table-' + info.id);
    if(!corps) return;
    Array.prototype.slice.call(corps.querySelectorAll('.rb-pointe')).forEach(function(c){
        c.checked = valeur;
        c.setAttribute('data-origine', 'manuel');
        var badge = c.parentNode.querySelector('span[title^="Rapproché automatiquement"]');
        if(badge) badge.remove();
    });
    rbRecalculer(moisIndex);
}

/* ---------- Rendu d'un bloc mensuel ---------- */
function rbBlocActionsHtml(info){
    return '<div class="form-row rb-bloc-actions" style="align-items:center; margin-bottom:10px; gap:10px;">'
        + '<button type="button" class="btn btn-primary" onclick="rbGenererMois(' + info.index + ')">'
        + '🔄 Actualiser depuis le Grand Livre</button>'
        + '<button type="button" class="btn btn-primary" style="background:#27ae60;" onclick="rbBasculerTout(' + info.index + ', true)">☑️ Tout pointer</button>'
        + '<button type="button" class="btn btn-warning" onclick="rbBasculerTout(' + info.index + ', false)">☐ Tout dépointer</button>'
        + '</div>';
}
function rbRendreMois(info){
    return rbBlocActionsHtml(info)
        + '<div class="scroll-table">'
        + '<table><thead>'
        + '<tr><th colspan="7" style="background:#1a5276; color:#fff; text-align:left;">'
        + esc(info.nom.toUpperCase()) + ' — MONTANTS INSCRITS EN COMPTABILITÉ (compte(s) banque)</th></tr>'
        + '<tr>'
        + '<th>Date</th><th>Compte</th><th>N° pièce / Réf.</th><th>Libellé</th>'
        + '<th>Montant Débit<br><span style="font-weight:400; font-size:10px;">(encaissement)</span></th>'
        + '<th>Montant Crédit<br><span style="font-weight:400; font-size:10px;">(décaissement)</span></th>'
        + '<th>Pointé</th>'
        + '</tr></thead>'
        + '<tbody id="rb-table-' + info.id + '"></tbody></table></div>'
        + '<div style="margin-top:10px; font-size:12px; display:flex; flex-wrap:wrap; gap:18px;">'
        + '<span>Opérations : <strong id="rb-nb-total-' + info.id + '">0</strong></span>'
        + '<span>Total Débit : <strong id="rb-tot-debit-' + info.id + '">0</strong></span>'
        + '<span>Total Crédit : <strong id="rb-tot-credit-' + info.id + '">0</strong></span>'
        + '<span>Variation du solde banque : <strong id="rb-solde-' + info.id + '">0</strong></span>'
        + '</div>'
        + '<div style="margin-top:6px; font-size:12px; display:flex; flex-wrap:wrap; gap:18px; color:#555;">'
        + '<span>✅ Pointées : <strong id="rb-nb-pointe-' + info.id + '">0</strong> '
        + '(débit <strong id="rb-debit-pointe-' + info.id + '">0</strong> · crédit <strong id="rb-credit-pointe-' + info.id + '">0</strong>)</span>'
        + '<span>⏳ Non pointées : <strong id="rb-nb-non-pointe-' + info.id + '">0</strong></span>'
        + '<span>Solde des opérations en suspens : <strong id="rb-suspens-' + info.id + '">0</strong></span>'
        + '</div>';
}

/* ---------- Rendu du bloc d'import (fichier + collage + moteur) ---------- */
function rbImportHtml(){
    return '<div class="card" style="background:#fdf6e3; margin-bottom:16px;">'
        + '<h3 style="margin-top:0;">📥 Importer le relevé bancaire (optionnel)</h3>'
        + '<p style="font-size:12px; color:#555; margin:0 0 10px;">Deux façons d’importer, au choix — aucune mise en forme à '
        + 'préparer : <strong>fichier</strong> (CSV ou Excel, pratique au bureau) ou <strong>collage</strong> (copiez les lignes '
        + 'depuis votre appli bancaire ou Excel et collez-les ci-dessous — fonctionne aussi bien sur mobile, sans passer par le '
        + 'sélecteur de fichiers). Le fichier doit avoir une ligne d’en-tête (Date, Libellé, Débit/Crédit ou Montant).</p>'
        + '<div class="form-row" style="align-items:center; gap:14px; flex-wrap:wrap;">'
        + '<div class="form-group" style="margin:0;"><label>Fichier (.csv, .xlsx, .xls)</label>'
        + '<input type="file" accept=".csv,.xlsx,.xls" onchange="rbImporterFichier(this)"></div>'
        + '<div class="form-group" style="margin:0;"><label>Tolérance de rapprochement (jours)</label>'
        + '<input type="number" id="rb-tolerance-jours" value="5" min="0" max="31" style="width:70px;"></div>'
        + '<button type="button" class="btn btn-primary" style="background:#8e44ad;" onclick="rbLancerRapprochement()">🤖 Lancer le rapprochement automatique</button>'
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
function rbAmbigusHtml(){
    return '<div class="card" id="rb-ambigus-section" style="display:none; background:#fdedec; margin-bottom:16px;">'
        + '<h3 style="margin-top:0;">⚠️ Doublons ambigus — décision manuelle requise</h3>'
        + '<p style="font-size:12px; color:#555; margin:0 0 10px;">Ces lignes du relevé ont plusieurs correspondances possibles dans le '
        + 'Grand Livre (ou une écriture du Grand Livre est candidate pour plusieurs lignes du relevé) : le moteur ne choisit jamais seul '
        + 'dans ce cas — choisissez la bonne correspondance, ou « Aucune de ces écritures » si aucune ne convient.</p>'
        + '<div class="scroll-table"><table><thead><tr><th>Mois</th><th>Date relevé</th><th>Libellé relevé</th><th>Montant</th>'
        + '<th>Correspondance</th><th></th></tr></thead><tbody id="rb-ambigus-corps"></tbody></table></div>'
        + '</div>';
}
function rbManquantesHtml(){
    return '<div class="card" id="rb-manquantes-section" style="display:none; background:#eafaf1; margin-bottom:16px;">'
        + '<h3 style="margin-top:0;">➕ Écritures relevé sans correspondance — proposition</h3>'
        + '<p style="font-size:12px; color:#555; margin:0 0 10px;">Ces lignes du relevé n’ont aucune écriture correspondante dans le '
        + 'Grand Livre (frais, agios, virement non comptabilisé…). Une écriture en partie double est proposée pour chacune — '
        + 'vérifiez/corrigez les comptes et le libellé, décochez ce qui ne doit pas être reporté, puis validez.</p>'
        + '<div class="scroll-table"><table><thead><tr><th>Inclure</th><th>Date</th><th>Libellé relevé</th><th>Montant</th>'
        + '<th>Catégorie détectée</th><th>Compte banque</th><th>Compte contrepartie</th><th>Libellé compta</th></tr></thead>'
        + '<tbody id="rb-manquantes-corps"></tbody></table></div>'
        + '<button type="button" class="btn btn-primary" style="margin-top:10px; background:#27ae60;" onclick="rbReporterEcrituresManquantes()">'
        + '📤 Reporter les lignes cochées au Grand Livre Bilan</button>'
        + '</div>';
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
        d.innerHTML =
          '<div class="card" data-tab="rapprochement-bancaire">'
        + '<h2>🏦 RAPPROCHEMENT BANCAIRE — Novembre / Décembre</h2>'
        + '<div class="alert alert-info">Ce tableau affiche les <strong>montants inscrits en comptabilité</strong> sur le(s) '
        + 'compte(s) de banque, extraits automatiquement du Grand Livre déjà saisi. Deux façons de pointer, au choix : à la '
        + 'main, en cochant chaque montant retrouvé sur votre relevé papier ; ou automatiquement, en important/collant votre '
        + 'relevé ci-dessous — le moteur rapproche chaque écriture par montant/date, ne coche <strong>jamais</strong> un cas '
        + 'ambigu tout seul, et propose les écritures manquantes (frais, agios, virements non comptabilisés) prêtes à reporter '
        + 'dans le Grand Livre. Attention au sens : en comptabilité, un <strong>débit</strong> du compte banque est un '
        + 'encaissement et un <strong>crédit</strong> un décaissement — l’inverse des colonnes de votre relevé.</div>'
        + rbImportHtml()
        + '<div class="form-group" style="max-width:340px;"><label>Compte(s) banque (préfixes SYSCOHADA, séparés par une virgule)</label>'
        + '<input type="text" id="rb-comptes-banque" value="52" onchange="rbGenererTout(true)"></div>'
        + RB_MOIS.map(function(info){
            return tfSection(info.nom, rbRendreMois(info), 'rb-sec-' + info.id);
        }).join('')
        + rbAmbigusHtml()
        + rbManquantesHtml()
        + rbRecapHtml()
        + '</div>';
        hote.appendChild(d);
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

    rbAssurerBoutons();
    rbObserverSync();
    // Première génération silencieuse : au tout premier affichage, le tableau se
    // remplit seul si le Grand Livre est déjà là, sans exiger un clic ni ouvrir
    // d'alerte. Si un contenu sauvegardé est restauré ensuite, rbObserverSync
    // rétablit les boutons et rbRecalculerTout remet les totaux à jour.
    rbGenererTout(true);
    // Ré-affiche les ambigus/manquantes déjà en mémoire (relevé restauré depuis
    // Firestore) sans relancer le moteur — juste refléter l'état persisté.
    var etatRestaure = rbChargerEtatReleve();
    if(etatRestaure && etatRestaure.lignes && etatRestaure.lignes.length) rbLancerRapprochement(true);
}

// Filet de sécurité, même principe que glAssurerIntegrite (04-grand-livre.js) :
// la restauration du contenu sauvegardé (applyRemoteTab, 10-config-collaboration.js)
// remplace tout le innerHTML de l'onglet par une version enregistrée qui peut
// dater d'avant l'ajout de ces boutons — ils disparaîtraient alors sans retour
// possible. On réinjecte la rangée manquante, et on retire les doublons éventuels,
// sans toucher aux lignes ni aux pointages restaurés.
function rbAssurerBoutons(){
    RB_MOIS.forEach(function(info){
        var contenu = document.getElementById('rb-sec-' + info.id);
        if(!contenu) return;
        var rangees = Array.prototype.slice.call(contenu.querySelectorAll('.rb-bloc-actions'));
        if(!rangees.length){
            var tmp = document.createElement('div');
            tmp.innerHTML = rbBlocActionsHtml(info);
            contenu.insertBefore(tmp.firstChild, contenu.firstChild);
        } else {
            for(var i = 1; i < rangees.length; i++) rangees[i].remove();
        }
    });
}
function rbObserverSync(){
    var div = document.getElementById('rapprochement-bancaire');
    if(!div || typeof MutationObserver === 'undefined') return;
    // childList seul (sans subtree) : ne réagit qu'au remplacement complet du
    // contenu de l'onglet, jamais aux mises à jour internes (pointage, totaux),
    // qui relanceraient l'observateur en boucle.
    var mo = new MutationObserver(function(){
        rbAssurerBoutons();
        rbRecalculerTout();
        // Une mise à jour distante (un autre collaborateur) remplace tout le
        // contenu de l'onglet, ambigus/manquantes inclus, par sa version au
        // moment de SA sauvegarde : on relance le rapprochement localement pour
        // recalculer ces deux tables contre l'état réel courant plutôt que de
        // garder tel quel un instantané potentiellement obsolète.
        var etat = rbChargerEtatReleve();
        if(etat && etat.lignes && etat.lignes.length) rbLancerRapprochement(true);
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
