// ============================================================
// SYNTHÈSE — génération automatique à partir des données déjà saisies
// ============================================================
function txt(id){ var el = document.getElementById(id); return el ? (el.textContent || '').trim() : ''; }
function val(id){ var el = document.getElementById(id); return el ? (el.value || '').trim() : ''; }
function setSy(id, texte){ var el = document.getElementById(id); if(el) el.value = texte; }
// Récupère les lignes d'un tableau de résultat (ex. detection-sens-table) déjà rendu, en ignorant
// la ligne "aucune anomalie" (qui a un seul <td> avec colspan) et l'en-tête.
function ligneRowsTexte(tableId, indices, separateur){
    var tbl = document.getElementById(tableId);
    if(!tbl) return [];
    return Array.prototype.slice.call(tbl.rows).slice(1)
        .filter(function(tr){ return tr.querySelectorAll('td').length > 1; })
        .map(function(tr){
            var tds = tr.querySelectorAll('td');
            return indices.map(function(i){ return tds[i] ? tds[i].textContent.trim() : ''; }).filter(Boolean).join(separateur || ' — ');
        });
}
function collecterRecommandations(){
    var tbl = document.getElementById('table-recommandations');
    if(!tbl) return [];
    return Array.prototype.slice.call(tbl.rows).slice(1).map(function(tr){
        var cycle = (tr.querySelector('td:nth-child(1) input')||{}).value || '';
        var constat = (tr.querySelector('td:nth-child(2) textarea')||{}).value || '';
        var reco = (tr.querySelector('td:nth-child(3) textarea')||{}).value || '';
        if(!constat.trim() && !reco.trim()) return null;
        return (cycle.trim() ? cycle.trim()+' — ' : '') + (constat.trim() ? constat.trim()+' : ' : '') + reco.trim();
    }).filter(Boolean);
}
function collecterQuestionnaireCI(){
    var tbl = document.getElementById('table-questionnaire');
    var forces = [], faiblesses = [];
    if(!tbl) return { forces:forces, faiblesses:faiblesses };
    Array.prototype.slice.call(tbl.rows).slice(1).forEach(function(tr){
        var tds = tr.querySelectorAll('td');
        if(tds.length < 6) return;
        var cycle = tds[0].textContent.trim();
        var question = tds[1].textContent.trim();
        var selectEl = tds[2].querySelector('select');
        var existe = selectEl ? selectEl.value : '';
        var effInput = tds[3].querySelector('input');
        var eff = effInput && effInput.value !== '' ? parseNum(effInput.value) : null;
        var pfInput = tds[4].querySelector('input');
        var pointFaible = pfInput ? pfInput.value.trim() : '';
        if(!existe && !pointFaible) return; // question non renseignée
        if(existe === 'Oui' && (eff === null || eff >= 4)){
            forces.push((cycle ? cycle+' : ' : '') + question);
        } else if(existe === 'Non' || existe === 'Partiel' || (eff !== null && eff <= 2) || pointFaible){
            faiblesses.push((cycle ? cycle+' : ' : '') + (pointFaible || question));
        }
    });
    return { forces:forces, faiblesses:faiblesses };
}
function genererSynthese(){
    var dejaRempli = ['sy-objectifs','sy-travaux','sy-anomalies','sy-forces','sy-faiblesses','sy-conclusion'].some(function(id){ return val(id) !== ''; });
    if(dejaRempli && !confirm('Ceci va remplacer le contenu actuel de la Synthèse par une version générée à partir des données de l\'outil. Continuer ?')) return;

    if(typeof updateAllCalculations === 'function') updateAllCalculations();

    var raison = val('fi-raison');
    var exercice = val('fi-exercice');
    var cloture = val('fi-cloture');

    var rN = computeResultat('n');
    var actifN = computeBilanActif('n');

    // ---- Objectifs ----
    setSy('sy-objectifs', 'Audit des états financiers de ' + (raison || '[Raison sociale]') +
        ' pour l\'exercice clos le ' + (cloture || '[date de clôture]') + (exercice ? ' (exercice ' + exercice + ')' : '') +
        ', conformément au référentiel comptable SYSCOHADA révisé, en vue d\'exprimer une opinion sur la régularité, la sincérité et l\'image fidèle des comptes annuels.');

    // ---- Travaux réalisés ----
    setSy('sy-travaux', 'Les travaux ont porté sur : la revue de la Balance N et N-1, la reconstitution du Bilan et du Compte de Résultat (SYSCOHADA), '+
        'le contrôle du Grand Livre par sondage, les contrôles de détection d\'anomalies (équilibres, sens des soldes, variations N/N-1), '+
        'la revue analytique des principaux ratios, la revue des impôts et taxes, ainsi que l\'évaluation du risque du contrôle interne par cycle (Risque du CI).');

    // ---- Anomalies ----
    var sens = ligneRowsTexte('detection-sens-table', [0,1,4]);
    var variations = ligneRowsTexte('detection-variation-table', [0,1,4,5]);
    var fourn = ligneRowsTexte('anorm-fourn-table', [0,1,2]);
    var clients = ligneRowsTexte('anorm-clients-table', [0,1,2]);
    var nbGL = parseInt(txt('ctrl-nb-anomalies'), 10) || 0;
    var nbCh = parseInt(txt('ch-nb-anomalies'), 10) || 0;
    var nbVe = parseInt(txt('ve-nb-anomalies'), 10) || 0;
    var recos = collecterRecommandations();

    var blocsAnomalies = [];
    if(sens.length) blocsAnomalies.push('Anomalies de sens des soldes (' + sens.length + ') :\n' + sens.map(function(s){ return '- ' + s; }).join('\n'));
    if(variations.length) blocsAnomalies.push('Variations anormales N / N-1 (' + variations.length + ') :\n' + variations.map(function(s){ return '- ' + s; }).join('\n'));
    if(fourn.length) blocsAnomalies.push('Fournisseurs anormalement débiteurs (' + fourn.length + ') :\n' + fourn.map(function(s){ return '- ' + s; }).join('\n'));
    if(clients.length) blocsAnomalies.push('Clients anormalement créditeurs (' + clients.length + ') :\n' + clients.map(function(s){ return '- ' + s; }).join('\n'));
    if(nbGL) blocsAnomalies.push(nbGL + ' écriture(s) marquée(s) « Anomalie » dans le Contrôle GL (Sondage) — voir cet onglet pour le détail.');
    if(nbCh) blocsAnomalies.push(nbCh + ' anomalie(s) relevée(s) sur l\'échantillon Charges à contrôler.');
    if(nbVe) blocsAnomalies.push(nbVe + ' anomalie(s) relevée(s) sur l\'échantillon Ventes à contrôler.');
    if(recos.length) blocsAnomalies.push('Recommandations formulées (' + recos.length + ') :\n' + recos.map(function(s){ return '- ' + s; }).join('\n'));
    if(blocsAnomalies.length === 0) blocsAnomalies.push('Aucune anomalie significative détectée à ce stade des travaux (sous réserve des contrôles restant à finaliser).');
    setSy('sy-anomalies', blocsAnomalies.join('\n\n'));

    // ---- Contrôle interne : forces / faiblesses ----
    var ci = collecterQuestionnaireCI();
    setSy('sy-forces', ci.forces.length ? ci.forces.map(function(s){ return '- ' + s; }).join('\n') : 'Aucun point fort spécifique identifié dans le Questionnaire de Contrôle Interne à ce stade.');
    setSy('sy-faiblesses', ci.faiblesses.length ? ci.faiblesses.map(function(s){ return '- ' + s; }).join('\n') : 'Aucune faiblesse majeure identifiée dans le Questionnaire de Contrôle Interne à ce stade.');

    // ---- Conclusion / opinion ----
    var liq = txt('rev-ratio-liquidite'), autonomie = txt('rev-ratio-autonomie'), marge = txt('rev-ratio-marge');
    var lignesCles = [];
    lignesCles.push('Total Bilan (Actif) : ' + fmt(actifN.total) + ' FCFA');
    lignesCles.push('Chiffre d\'affaires : ' + fmt(rN.CA) + ' FCFA');
    lignesCles.push('Résultat net de l\'exercice : ' + fmt(rN.XI) + ' FCFA');
    if(liq) lignesCles.push('Ratio de liquidité générale : ' + liq);
    if(autonomie) lignesCles.push('Ratio d\'autonomie financière : ' + autonomie);
    if(marge) lignesCles.push('Marge nette : ' + marge);

    var totalPoints = sens.length + variations.length + fourn.length + clients.length + nbGL + nbCh + nbVe;
    var opinion = totalPoints === 0
        ? 'Sur la base des travaux effectués, aucune anomalie significative n\'a été relevée. Sous réserve des éléments complémentaires à obtenir de la direction, les comptes annuels présentent, dans tous leurs aspects significatifs, une image fidèle de la situation financière de la société et du résultat de ses opérations pour l\'exercice écoulé, conformément au référentiel SYSCOHADA révisé.'
        : 'Sur la base des travaux effectués, ' + totalPoints + ' point(s) d\'attention (anomalies et/ou variations anormales) ont été relevés et sont détaillés ci-dessus. Ces points devront être clarifiés et, le cas échéant, corrigés avec la direction avant la formulation de l\'opinion définitive sur les comptes.';
    setSy('sy-conclusion', lignesCles.join('\n') + '\n\n' + opinion);

    if(typeof updateStatus === 'function') updateStatus('synthese');
}


// ---------- Orchestrateur global ----------
function updateAllCalculations(){
    if(document.getElementById('table-indemnite-retraite')) recomputeIndemniteRetraite();
    if(document.getElementById('table-conges-payes')) recomputeCongesPayes();

    var rN = computeResultat('n');
    var rN1 = computeResultat('n1');
    renderResultat(rN, rN1);

    var actifN = computeBilanActif('n');
    var actifN1 = computeBilanActif('n1');
    var passifN = computeBilanPassif('n', rN.XI);
    var passifN1 = computeBilanPassif('n1', rN1.XI);
    renderBilan(actifN, actifN1, passifN, passifN1);

    // Planification : seuils basés sur l'agrégat choisi par l'utilisateur (sauf si l'utilisateur a modifié un seuil manuellement)
    var totalCP = (passifN.lines.filter(function(l){ return l.poste === 'TOTAL CAPITAUX PROPRES'; })[0] || {net:0}).net;
    var totalAI = (actifN.lines.filter(function(l){ return l.poste === 'TOTAL ACTIF IMMOBILISÉ'; })[0] || {net:0}).net;
    var AGREGATS = {
        bilan: { valeur: actifN.total, label: 'du Total Actif du Bilan' },
        ca: { valeur: rN.CA, label: "du Chiffre d'Affaires" },
        exploitation: { valeur: rN.XE, label: "du Résultat de l'Exploitation" },
        capitaux: { valeur: totalCP, label: 'des Capitaux Propres' },
        immobilise: { valeur: totalAI, label: 'des Actifs Immobilisés' }
    };
    var selAgregat = (document.getElementById('pl-seuil-agregat') || {}).value || 'bilan';
    var pctInput = document.getElementById('pl-seuil-pct');
    var pct = pctInput ? (parseNum(pctInput.value, true) || 0) : 4;
    var agregatInfo = AGREGATS[selAgregat] || AGREGATS.bilan;
    var seuilGlobal = Math.abs(agregatInfo.valeur) * (pct/100);
    seuils.totalActifN = actifN.total;
    seuils.signif = seuilsOverride.signif !== null ? seuilsOverride.signif : seuilGlobal;
    // Taux de calcul automatique (ajustables par l'utilisateur), repères usuels : 5-10% (faible) / 50-75% (planification)
    var tauxFaibleEl = document.getElementById('pl-taux-faible');
    var tauxPlanifEl = document.getElementById('pl-taux-planif');
    var tauxFaible = tauxFaibleEl ? (parseNum(tauxFaibleEl.value, true) || 0) : 5;
    var tauxPlanif = tauxPlanifEl ? (parseNum(tauxPlanifEl.value, true) || 0) : 65;
    seuils.faible = seuils.signif * (tauxFaible/100);
    seuils.planif = seuils.signif * (tauxPlanif/100);
    var lbl = document.getElementById('pl-seuil-agregat-label');
    if(lbl) lbl.textContent = '(' + pct + '% ' + agregatInfo.label + ')';
    var lblFaible = document.getElementById('pl-seuil-faible-label');
    if(lblFaible) lblFaible.textContent = tauxFaible + '% du seuil global';
    var lblPlanif = document.getElementById('pl-seuil-planif-label');
    if(lblPlanif) lblPlanif.textContent = tauxPlanif + '% du seuil global';
    setSeuilFieldValue('pl-seuil-signif', seuils.signif);
    setSeuilFieldValue('pl-seuil-faible', seuils.faible);
    setSeuilFieldValue('pl-seuil-planif', seuils.planif);

    // Étape 2 : contrôles d'audit automatisés
    runDetection();
    runRevueAnalytique();
    recomputeImpots();
    computeAnormaux();
    if(typeof computeSelectionComptes === 'function') computeSelectionComptes();
}
function setSeuilFieldValue(id, val){
    var el = document.getElementById(id);
    if(el) el.value = Math.round(val) || 0;
}

// ---------- Dossiers récents (mémoire MULTI-dossiers du navigateur) ----------
// Avant cette mise à jour, seul le DERNIER dossier ouvert était mémorisé (clé unique
// 'seven7_dossier'), ce qui écrasait la référence à un dossier précédent dès qu'on en
// rejoignait un autre : impossible de revenir dessus sans avoir gardé le lien d'invitation
// d'origine. On garde désormais une liste (jusqu'à RECENTS_MAX entrées, la plus récente en
// tête), affichée sur l'écran de connexion, pour pouvoir rebasculer d'un dossier à l'autre.
// Par sécurité, le mot de passe n'est JAMAIS stocké dans cette liste.
var RECENTS_KEY = 'seven7_dossiers_recents';
var RECENTS_MAX = 8;

function getRecentDossiers(){
    try{
        var raw = localStorage.getItem(RECENTS_KEY);
        var list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch(e){ return []; }
}

function persistRecentDossiers(list){
    try{ localStorage.setItem(RECENTS_KEY, JSON.stringify(list)); }
    catch(e){ /* stockage plein ou indisponible : on ignore silencieusement, ce n'est qu'un confort */ }
}

// Ajoute/déplace une entrée en tête de liste. Dédoublonne par identifiant de dossier.
function saveRecentDossier(dossier, cabinetName, nom){
    if(!dossier) return;
    var list = getRecentDossiers().filter(function(d){ return d.dossier !== dossier; });
    list.unshift({ dossier: dossier, cabinetName: cabinetName || null, nom: nom || null, lastUsed: Date.now() });
    if(list.length > RECENTS_MAX) list = list.slice(0, RECENTS_MAX);
    persistRecentDossiers(list);
    renderRecentDossiersList();
}

// Retire un dossier de la liste des récents (le dossier lui-même n'est PAS supprimé de Firestore,
// c'est seulement le raccourci affiché sur l'écran de connexion qui disparaît).
function removeRecentDossier(dossier){
    persistRecentDossiers(getRecentDossiers().filter(function(d){ return d.dossier !== dossier; }));
    renderRecentDossiersList();
}

function formatRecentDate(ts){
    if(!ts) return '';
    var diffJours = Math.floor((Date.now() - ts) / 86400000);
    if(diffJours <= 0) return "aujourd'hui";
    if(diffJours === 1) return 'hier';
    if(diffJours < 30) return 'il y a ' + diffJours + ' j';
    return new Date(ts).toLocaleDateString('fr-FR');
}

function selectRecentDossier(dossier, nom){
    var el = document.getElementById('lock-collab-dossier');
    el.setAttribute('readonly', 'readonly');
    el.style.background = '#f2f2f2';
    el.style.color = '#555';
    el.value = dossier;
    var nomEl = document.getElementById('lock-collab-name');
    if(nom && nomEl && !nomEl.value) nomEl.value = nom;
    var toggle = document.getElementById('lock-manual-toggle');
    if(toggle) toggle.textContent = '✏️ Saisir un autre identifiant de dossier manuellement';
    switchLockMode('join');
    if(typeof prefetchCabinetBranding === 'function') prefetchCabinetBranding(dossier);
    var pwdEl = document.getElementById('lock-dossier-password');
    if(pwdEl) pwdEl.focus();
}

function renderRecentDossiersList(){
    var wrap = document.getElementById('lock-recent-dossiers');
    var listEl = document.getElementById('lock-recent-dossiers-list');
    if(!wrap || !listEl) return;
    var recents = getRecentDossiers();
    if(!recents.length){ wrap.style.display = 'none'; listEl.innerHTML = ''; return; }
    wrap.style.display = 'block';
    listEl.innerHTML = recents.map(function(d){
        var titre = d.cabinetName ? (d.cabinetName + ' — ' + d.dossier) : d.dossier;
        var jsDossier = JSON.stringify(d.dossier).replace(/"/g, '&quot;');
        var jsNom = JSON.stringify(d.nom || '').replace(/"/g, '&quot;');
        var jsDossierAttr = JSON.stringify(d.dossier).replace(/"/g, '&quot;');
        return '<div style="display:flex; align-items:center; gap:6px; background:#f2f6fa; border:1px solid #dde6ee; border-radius:5px; padding:6px 8px;">' +
                '<button type="button" onclick="selectRecentDossier(' + jsDossier + ', ' + jsNom + ')" style="flex:1; text-align:left; background:none; border:none; cursor:pointer; font-size:12px; color:#1a5276; padding:0;">' +
                    '📁 ' + esc(titre) + '<br><span style="font-size:10px; color:#888; font-weight:400;">' + formatRecentDate(d.lastUsed) + '</span>' +
                '</button>' +
                '<span onclick="removeRecentDossier(' + jsDossierAttr + ')" title="Retirer de la liste (le dossier n\'est pas supprimé)" style="cursor:pointer; color:#c0392b; font-size:15px; padding:0 4px;">&times;</span>' +
            '</div>';
    }).join('');
}

// Permet de saisir à la main l'identifiant exact d'un dossier (utile si on ne l'a ni via un
// lien d'invitation, ni dans la liste des dossiers récents — ex: communiqué par téléphone).
function toggleManualDossierEntry(){
    var el = document.getElementById('lock-collab-dossier');
    var toggle = document.getElementById('lock-manual-toggle');
    if(!el) return;
    if(el.hasAttribute('readonly')){
        el.removeAttribute('readonly');
        el.style.background = '#fff';
        el.style.color = '#2c3e50';
        el.value = '';
        el.placeholder = 'Identifiant exact du dossier (ex: biolab-sarl-2026-a3f9)';
        el.focus();
        if(toggle) toggle.textContent = '↩️ Revenir à la sélection automatique';
    } else {
        el.setAttribute('readonly', 'readonly');
        el.style.background = '#f2f2f2';
        el.style.color = '#555';
        el.value = localStorage.getItem('seven7_dossier') || '';
        if(toggle) toggle.textContent = '✏️ Saisir un autre identifiant de dossier manuellement';
    }
}

// ---------- Initialisation ----------
document.addEventListener('DOMContentLoaded', function(){
    updateAllCalculations();
    var savedName = localStorage.getItem('seven7_name');
    var savedDossier = localStorage.getItem('seven7_dossier');
    var savedCabinetName = localStorage.getItem('seven7_cabinet_name');
    var savedAvatar = localStorage.getItem('seven7_avatar');
    if(savedName) document.getElementById('lock-collab-name').value = savedName;
    if(savedCabinetName) document.getElementById('lock-collab-cabinet-name').value = savedCabinetName;
    if(savedAvatar && AVATAR_CHOICES.indexOf(savedAvatar) !== -1) selectedAvatar = savedAvatar;
    renderAvatarPicker();

    // Migration : si l'ancienne mémoire "un seul dossier" existe mais que la nouvelle liste
    // des récents est vide (première ouverture après mise à jour), on la reprend dans la liste.
    if(savedDossier && !getRecentDossiers().length){
        saveRecentDossier(savedDossier, savedCabinetName || null, savedName || null);
    }
    renderRecentDossiersList();

    var params = new URLSearchParams(window.location.search);
    var dossierFromLink = params.get('dossier');
    if(dossierFromLink){
        document.getElementById('lock-collab-dossier').value = dossierFromLink;
        switchLockMode('join');
        if(typeof prefetchCabinetBranding === 'function') prefetchCabinetBranding(dossierFromLink);
    } else if(savedDossier){
        document.getElementById('lock-collab-dossier').value = savedDossier;
        switchLockMode('join');
        if(typeof prefetchCabinetBranding === 'function') prefetchCabinetBranding(savedDossier);
    } else if(getRecentDossiers().length){
        var dernierRecent = getRecentDossiers()[0].dossier;
        document.getElementById('lock-collab-dossier').value = dernierRecent;
        switchLockMode('join');
        if(typeof prefetchCabinetBranding === 'function') prefetchCabinetBranding(dernierRecent);
    } else {
        switchLockMode('create');
    }
});