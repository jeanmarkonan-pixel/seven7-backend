/* ==================================================================
   SEVEN7 — RAPPROCHEMENT BANCAIRE (Novembre / Décembre)

   Onglet rattaché à la lettre j (Grand Livre) de l'arborescence a→u, sur
   le même modèle que 47-choix-opinion.js (panneau auto-installé, déclaré
   dans TABS, jamais dupliqué, bouton inséré dans le menu Phase 2 juste
   après GL Gestion).

   PRINCIPE (revu le 25/08, à la demande du cabinet) : cet onglet
   n'importe RIEN. Il n'y a volontairement ni import CSV, ni import Excel,
   ni saisie de relevé — la tentative précédente (import du relevé
   bancaire) a été retirée : le sélecteur de fichiers d'Android rendait
   l'opération impraticable sur le terrain, et surtout le cabinet travaille
   avec le relevé PAPIER sous les yeux.

   Ce que fait l'onglet : il extrait automatiquement du Grand Livre déjà
   saisi (04-grand-livre.js) toutes les opérations du/des compte(s) banque,
   mois par mois, et les affiche en tableau avec une colonne « Pointé » à
   cocher. L'auditeur coche au fur et à mesure qu'il retrouve chaque
   opération sur son relevé papier ; les totaux pointés / non pointés et le
   solde des opérations en suspens se recalculent à chaque clic.

   Portée limitée aux deux derniers mois de l'exercice (novembre,
   décembre) — demande explicite du cabinet, pas une limite technique :
   RB_MOIS peut recevoir d'autres mois sans reprendre la structure.

   Persistance : comme tout onglet de l'app, la sauvegarde Firestore
   capture le innerHTML entier du div (doSaveTab, 10-config-collaboration.js).
   Les lignes générées et les cases cochées sont donc de vraies lignes de
   tableau, pas des variables JS — elles survivent au rechargement. C'est
   aussi pourquoi la régénération depuis le Grand Livre REPORTE les cases
   déjà cochées (rbClefLigne) au lieu de repartir de zéro : actualiser
   après un ajout d'écritures ne doit jamais effacer le travail de pointage
   déjà fait.
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
        var mois = parseInt(String(r.date || '').slice(5, 7), 10) - 1;
        if(mois !== moisIndex) continue;
        out.push(r);
    }
    out.sort(function(a, b){ return String(a.date || '').localeCompare(String(b.date || '')); });
    return out;
}

// Identifie une opération indépendamment de sa position dans la liste :
// permet de retrouver les cases déjà cochées après une actualisation, même
// si des écritures ont été ajoutées ou supprimées entre-temps dans le GL.
function rbClefLigne(r){
    return [String(r.compte || '').trim(), String(r.date || '').trim(), String(r.ref || '').trim(),
            String(r.libelle || '').trim(), parseNum(r.debit), parseNum(r.credit)].join('|');
}

/* ---------- Génération du tableau d'un mois depuis le Grand Livre ---------- */
function rbGenererMois(moisIndex, silencieux){
    var info = rbInfoMois(moisIndex);
    var corps = document.getElementById('rb-table-' + info.id);
    if(!corps) return;

    // Mémorise le pointage déjà effectué avant de reconstruire.
    var dejaPointees = {};
    Array.prototype.slice.call(corps.querySelectorAll('tr[data-rb-clef]')).forEach(function(tr){
        if(tr.querySelector('.rb-pointe') && tr.querySelector('.rb-pointe').checked)
            dejaPointees[tr.getAttribute('data-rb-clef')] = true;
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
        return '<tr data-rb-clef="' + esc(clef) + '">'
            + '<td>' + esc(r.date) + '</td>'
            + '<td>' + esc(r.compte) + '</td>'
            + '<td>' + esc(r.ref) + '</td>'
            + '<td>' + esc(r.libelle) + '</td>'
            + '<td class="number rb-debit" data-montant="' + debit + '">' + (debit ? fmt(debit) : '') + '</td>'
            + '<td class="number rb-credit" data-montant="' + credit + '">' + (credit ? fmt(credit) : '') + '</td>'
            + '<td style="text-align:center;"><input type="checkbox" class="rb-pointe"'
            + (dejaPointees[clef] ? ' checked' : '') + ' onchange="rbRecalculerDeCellule(this)"></td>'
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
    Array.prototype.slice.call(corps.querySelectorAll('.rb-pointe')).forEach(function(c){ c.checked = valeur; });
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
        + 'compte(s) de banque, extraits automatiquement du Grand Livre déjà saisi — il n’y a rien à importer ici. '
        + 'Prenez votre relevé bancaire papier et cochez « Pointé » à chaque montant que vous y retrouvez : les lignes '
        + 'cochées passent en grisé, et le <strong>solde des opérations en suspens</strong> vous donne à tout moment le '
        + 'montant qui reste à justifier. Attention au sens : en comptabilité, un <strong>débit</strong> du compte banque '
        + 'est un encaissement et un <strong>crédit</strong> un décaissement — l’inverse des colonnes de votre relevé.</div>'
        + '<div class="form-group" style="max-width:340px;"><label>Compte(s) banque (préfixes SYSCOHADA, séparés par une virgule)</label>'
        + '<input type="text" id="rb-comptes-banque" value="52" onchange="rbGenererTout(true)"></div>'
        + RB_MOIS.map(function(info){
            return tfSection(info.nom, rbRendreMois(info), 'rb-sec-' + info.id);
        }).join('')
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
