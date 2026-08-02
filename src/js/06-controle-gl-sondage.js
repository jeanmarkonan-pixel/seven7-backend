// ============================================================
// 3. CONTROLE DES ECRITURES DU GRAND LIVRE - SONDAGE MANUEL
// ============================================================
var echantillonGLSondageData = [];

// ---------- Seuils manuels par compte (% du solde), pour le filtre "Compte spécifique" ----------
// Même logique que conclusionsEcritures : on "récupère" les % déjà saisis dans le DOM avant de
// reconstruire le tableau, car il est régénéré à chaque recalcul (Balance N, seuils, Grand Livre...).
var pourcentageSeuilParCompte = {};
// Liste des comptes ajoutés manuellement (via la liste déroulante "+ Ajouter un compte") pour le
// filtre "Compte spécifique" et le tableau des seuils. Remplace l'ancien couplage automatique avec
// l'onglet "Sélection automatique des comptes à auditer", qui mélangeait tout : désormais l'auditeur
// choisit lui-même, un par un, les comptes qu'il veut suivre, avec son propre seuil par compte.
var comptesAuditManuel = [];
// Reconstruit comptesAuditManuel à partir du tableau HTML déjà présent dans la page (ex. après un
// rechargement de l'onglet restauré depuis la sauvegarde), pour ne jamais perdre les comptes déjà
// ajoutés lors d'un rendu ultérieur.
function syncComptesAuditManuelFromDom(){
    if(comptesAuditManuel.length > 0) return;
    var tbl = document.getElementById('ctrl-seuils-comptes-table');
    if(!tbl) return;
    var trs = tbl.querySelectorAll('tr[data-compte-row]');
    trs.forEach(function(tr){
        comptesAuditManuel.push({ compte: tr.getAttribute('data-compte-row'), intitule: tr.getAttribute('data-intitule') || '' });
    });
}
// Solde retenu d'un compte (valeur absolue Débit - Crédit) d'après la Balance N, pour le calcul du
// seuil en % — indépendant de l'onglet "Sélection automatique" (qui ne liste que les comptes ≥ seuil
// de planification global).
function getSoldeCompteAudit(compte){
    var rows = balanceData.n || [];
    for(var i=0;i<rows.length;i++){
        if(String(rows[i].compte) === String(compte)) return Math.abs((rows[i].sd||0) - (rows[i].sc||0));
    }
    return 0;
}
// Liste des comptes distincts présents dans le Grand Livre (Bilan + Gestion), pour peupler la liste
// déroulante "+ Ajouter un compte".
function getComptesGrandLivreUniques(){
    var seen = {};
    var out = [];
    (grandLivreData||[]).forEach(function(r){
        var c = String(r.compte||'').trim();
        if(!c || seen[c]) return;
        seen[c] = true;
        out.push({ compte:c, intitule:r.intitule||'' });
    });
    out.sort(function(a,b){ return a.compte.localeCompare(b.compte, undefined, {numeric:true}); });
    return out;
}
// Rafraîchit la liste déroulante d'ajout, en excluant les comptes déjà suivis.
function refreshNouveauCompteOptions(){
    var sel = document.getElementById('ctrl-nouveau-compte');
    if(!sel) return;
    var deja = {};
    comptesAuditManuel.forEach(function(c){ deja[String(c.compte)] = true; });
    var seuil = seuils.planif || 0;
    var comptesEligibles = (balanceData.n || []).filter(function(r){
        if(!r.compte || deja[String(r.compte)]) return false;
        return seuil > 0 && Math.abs((r.sd||0) - (r.sc||0)) >= seuil;
    }).sort(function(a,b){ return String(a.compte).localeCompare(String(b.compte), undefined, {numeric:true}); });
    var html = '<option value="">— Choisir un compte à ajouter (≥ seuil de planification) —</option>';
    comptesEligibles.forEach(function(c){
        html += '<option value="'+esc(c.compte)+'" data-intitule="'+esc(c.intitule||'')+'">'+esc(c.compte)+' — '+esc(c.intitule||'')+'</option>';
    });
    sel.innerHTML = html;
}
// Ajoute le compte choisi dans la liste déroulante au tableau des seuils.
function ajouterCompteSeuil(){
    syncComptesAuditManuelFromDom();
    var sel = document.getElementById('ctrl-nouveau-compte');
    if(!sel || !sel.value){ alert('Choisissez d\'abord un compte dans la liste.'); return; }
    var compte = sel.value;
    if(comptesAuditManuel.some(function(c){ return String(c.compte) === compte; })) return;
    var opt = sel.options[sel.selectedIndex];
    var intitule = opt ? (opt.getAttribute('data-intitule') || '') : '';
    comptesAuditManuel.push({ compte: compte, intitule: intitule });
    renderSeuilsComptesTable();
    renderCtrlCompteSelect();
    refreshNouveauCompteOptions();
    computeControleGLSondage();
}
// Retire un compte du tableau des seuils (et de sa % associée).
function supprimerCompteSeuil(compte){
    syncComptesAuditManuelFromDom();
    comptesAuditManuel = comptesAuditManuel.filter(function(c){ return String(c.compte) !== String(compte); });
    delete pourcentageSeuilParCompte[compte];
    renderSeuilsComptesTable();
    renderCtrlCompteSelect();
    refreshNouveauCompteOptions();
    var selEl = document.getElementById('ctrl-compte-select');
    if(selEl && selEl.value === String(compte)){ selEl.value = ''; }
    computeControleGLSondage();
}
function scrapePourcentagesSeuil(){
    var tbl = document.getElementById('ctrl-seuils-comptes-table');
    if(!tbl) return;
    tbl.querySelectorAll('input.pct-seuil-compte').forEach(function(inp){
        var k = inp.getAttribute('data-compte');
        if(!k) return;
        pourcentageSeuilParCompte[k] = parseNum(inp.value);
    });
}
function seuilCalculeCompte(compte){
    var pct = pourcentageSeuilParCompte[compte] || 0;
    var solde = getSoldeCompteAudit(compte);
    return (pct/100) * solde;
}
function onPctSeuilCompteChange(compte){
    var input = document.querySelector('input.pct-seuil-compte[data-compte="'+cssEsc(String(compte))+'"]');
    if(input) pourcentageSeuilParCompte[compte] = parseNum(input.value);
    var cell = document.querySelector('td.seuil-calc[data-compte="'+cssEsc(String(compte))+'"]');
    if(cell) cell.textContent = fmt(seuilCalculeCompte(compte));
    var sel = document.getElementById('ctrl-compte-select');
    if(sel && sel.value === String(compte)) computeControleGLSondage();
}
function cssEsc(s){
    return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
}
function renderSeuilsComptesTable(){
    syncComptesAuditManuelFromDom();
    scrapePourcentagesSeuil(); // préserve les % déjà saisis avant de reconstruire le tableau
    var tbl = document.getElementById('ctrl-seuils-comptes-table');
    if(!tbl) return;
    var compteActif = (function(){ var s = document.getElementById('ctrl-compte-select'); return s ? s.value : ''; })();
    var html = '<tr><th>N° Compte</th><th>Intitulé</th><th>Solde retenu (FCFA)</th><th>Seuil (%)</th><th>Seuil calculé (FCFA)</th><th></th></tr>';
    if(comptesAuditManuel.length === 0){
        html += '<tr><td colspan="6" style="text-align:center;color:#888;">Aucun compte ajouté. Choisissez un compte dans la liste ci-dessus puis cliquez sur « + Ajouter ».</td></tr>';
    } else {
        comptesAuditManuel.forEach(function(c){
            var key = String(c.compte);
            var pct = pourcentageSeuilParCompte[key] !== undefined ? pourcentageSeuilParCompte[key] : 0;
            var solde = getSoldeCompteAudit(key);
            var seuilCalc = (pct/100) * solde;
            var estActif = (key === String(compteActif) && compteActif !== '');
            html += '<tr data-compte-row="'+esc(key)+'" data-intitule="'+esc(c.intitule)+'"'+(estActif?' style="background:#eafaf1;"':'')+'>'+
                '<td>'+esc(c.compte)+'</td><td>'+esc(c.intitule)+'</td>'+
                '<td class="number">'+fmt(solde)+'</td>'+
                '<td><input type="number" class="pct-seuil-compte" data-compte="'+esc(key)+'" value="'+pct+'" min="0" max="100" step="0.1" style="width:80px;" onchange="onPctSeuilCompteChange(\''+key.replace(/'/g,"\\'")+'\')"></td>'+
                '<td class="number seuil-calc" data-compte="'+esc(key)+'">'+fmt(seuilCalc)+'</td>'+
                '<td style="white-space:nowrap;">'+
                    '<button class="btn btn-primary" style="padding:3px 8px; font-size:11px;" onclick="filtrerParCompteSeuil(\''+key.replace(/'/g,"\\'")+'\')" title="N\'afficher, dans le tableau du bas, que les écritures de ce compte dont le montant est ≥ au seuil calculé ci-contre">'+(estActif?'✓ Filtré':'👁️ Filtrer')+'</button> '+
                    '<button class="btn btn-danger" style="padding:3px 8px; font-size:11px;" onclick="supprimerCompteSeuil(\''+key.replace(/'/g,"\\'")+'\')">✕</button>'+
                '</td>'+
                '</tr>';
        });
    }
    tbl.innerHTML = html;
    refreshNouveauCompteOptions();
}
// Applique en un clic le filtre "Compte spécifique" sur le compte de la ligne cliquée dans le
// tableau des seuils : le tableau du bas n'affiche alors QUE les écritures de ce compte dont le
// montant est supérieur ou égal au "Seuil calculé (FCFA)" de cette même ligne.
function filtrerParCompteSeuil(compte){
    var sel = document.getElementById('ctrl-compte-select');
    if(!sel) return;
    if(sel.value === String(compte)){
        // Cliquer une 2e fois sur le compte déjà filtré retire le filtre (retour au périmètre normal)
        sel.value = '';
    } else {
        sel.value = String(compte);
    }
    onCtrlCompteChange();
    var tableEl = document.getElementById('controle-gl-sondage-table');
    if(tableEl) tableEl.scrollIntoView({ behavior:'smooth', block:'center' });
}
function renderCtrlCompteSelect(){
    var sel = document.getElementById('ctrl-compte-select');
    if(!sel) return;
    syncComptesAuditManuelFromDom();
    var current = sel.value;
    var html = '<option value="">— Tous les comptes du périmètre —</option>';
    comptesAuditManuel.forEach(function(c){
        html += '<option value="'+esc(c.compte)+'">'+esc(c.compte)+' — '+esc(c.intitule)+'</option>';
    });
    sel.innerHTML = html;
    if(current && comptesAuditManuel.some(function(c){ return String(c.compte) === current; })){
        sel.value = current;
    }
}
function onCtrlCompteChange(){
    computeControleGLSondage(true);
    if(typeof renderSeuilsComptesTable === 'function') renderSeuilsComptesTable();
}
function onCtrlModeChange(){
    var mode = document.getElementById('ctrl-mode').value;
    var tauxGroup = document.getElementById('ctrl-taux-group');
    var genGroup = document.getElementById('ctrl-generer-group');
    var explication = document.getElementById('ctrl-mode-explication');
    if(mode === 'sondage'){
        tauxGroup.style.display = '';
        genGroup.style.display = '';
        explication.innerHTML = 'Mode <strong>sondage aléatoire manuel</strong> : applique un taux de sondage (%) librement modifiable aux écritures du périmètre choisi ci-dessous, afin de générer un échantillon d\'écritures à contrôler. Le nombre d\'écritures tirées = taux × nombre d\'écritures du périmètre (arrondi au supérieur). Le tirage est aléatoire sans remise ; cliquez sur « Générer l\'échantillon » pour (re)générer un tirage. Statuez la <strong>conclusion</strong> de chaque écriture contrôlée (Conforme / Anomalie / À documenter) et ajoutez une observation si besoin.';
    } else {
        tauxGroup.style.display = 'none';
        genGroup.style.display = 'none';
        explication.innerHTML = 'Mode <strong>automatique</strong> (par défaut) : affiche automatiquement, pour le périmètre de comptes choisi ci-dessous, <strong>toutes les écritures (factures) dont le montant est supérieur ou égal au seuil d\'anomalies de faible importance</strong> (onglet Planification). La liste se met à jour toute seule à chaque saisie du Grand Livre ou changement de seuil — aucune action manuelle requise. Statuez la <strong>conclusion</strong> de chaque écriture contrôlée (Conforme / Anomalie / À documenter) et ajoutez une observation si besoin.';
    }
    computeControleGLSondage(true);
}
function computeControleGLSondage(regenerer){
    var perimetreEl = document.getElementById('ctrl-perimetre');
    var tauxEl = document.getElementById('ctrl-taux-sondage');
    var modeEl = document.getElementById('ctrl-mode');
    var compteSelectEl = document.getElementById('ctrl-compte-select');
    if(!perimetreEl || !tauxEl || !modeEl) return; // onglet pas encore présent dans le DOM
    syncComptesAuditManuelFromDom();
    scrapePourcentagesSeuil();
    var perimetre = perimetreEl.value;
    var mode = modeEl.value;
    var taux = Math.max(0, Math.min(100, parseNum(tauxEl.value, true)));
    var compteFiltre = compteSelectEl ? compteSelectEl.value : '';

    // Quand un compte spécifique est choisi, il prime sur le périmètre/mode "classiques"
    // (on les grise visuellement pour éviter toute confusion, sans perdre leur valeur).
    [perimetreEl, modeEl, tauxEl].forEach(function(el){ if(el) el.disabled = !!compteFiltre; });
    var infoBox = document.getElementById('ctrl-seuil-pct-info');

    var perimetreLignes;
    if(compteFiltre){
        perimetreLignes = (grandLivreData||[]).filter(function(r){ return String(r.compte) === String(compteFiltre); });
    } else {
        var comptesRetenus = null; // null = pas de filtre (tous les comptes)
        if(perimetre === 'selection'){
            comptesRetenus = {};
            comptesSelectionnesData.forEach(function(c){ comptesRetenus[String(c.compte)] = true; });
        }
        perimetreLignes = (grandLivreData||[]).filter(function(r){
            if(!comptesRetenus) return true;
            return !!comptesRetenus[String(r.compte)];
        });
    }

    setText('ctrl-nb-perimetre', perimetreLignes.length);

    if(compteFiltre){
        // Mode "compte spécifique" : toutes les écritures de ce compte dont le montant (abs)
        // est supérieur ou égal au seuil calculé (% manuel × solde du compte).
        var seuilCompte = seuilCalculeCompte(compteFiltre);
        echantillonGLSondageData = perimetreLignes.filter(function(r){
            return Math.abs((r.debit||0) - (r.credit||0)) >= seuilCompte;
        });
        echantillonGLSondageData._perimetreSignature = null;
        if(infoBox){
            infoBox.style.display = '';
            var pct = pourcentageSeuilParCompte[compteFiltre] || 0;
            document.getElementById('ctrl-seuil-pct-txt').textContent = pct + '% du solde du compte = ' + fmt(seuilCompte) + ' FCFA';
        }
    } else if(mode === 'auto'){
        if(infoBox) infoBox.style.display = 'none';
        // Mode automatique : toutes les factures du périmètre dont le montant (abs) >= seuil de faible importance
        var seuilFaible = seuils.faible || 0;
        echantillonGLSondageData = perimetreLignes.filter(function(r){
            return Math.abs((r.debit||0) - (r.credit||0)) >= seuilFaible && seuilFaible > 0;
        });
        echantillonGLSondageData._perimetreSignature = null; // invalide le cache du mode sondage si on revient dessus plus tard
    } else {
        if(infoBox) infoBox.style.display = 'none';
        if(regenerer || !echantillonGLSondageData._perimetreSignature || echantillonGLSondageData._perimetreSignature !== (perimetre+'|'+taux+'|'+perimetreLignes.length)){
            // Tirage aléatoire sans remise : taux% du nombre d'écritures du périmètre, arrondi au supérieur
            var nbATirer = Math.ceil(perimetreLignes.length * (taux/100));
            var indices = perimetreLignes.map(function(_,i){ return i; });
            // mélange (Fisher-Yates)
            for(var i=indices.length-1;i>0;i--){
                var j = Math.floor(Math.random()*(i+1));
                var tmp = indices[i]; indices[i]=indices[j]; indices[j]=tmp;
            }
            var retenus = indices.slice(0, nbATirer).sort(function(a,b){ return a-b; });
            echantillonGLSondageData = retenus.map(function(i){ return perimetreLignes[i]; });
            echantillonGLSondageData._perimetreSignature = perimetre+'|'+taux+'|'+perimetreLignes.length;
        }
    }

    var montantTotal = 0;
    echantillonGLSondageData.forEach(function(r){ montantTotal += Math.abs((r.debit||0) - (r.credit||0)); });
    setText('ctrl-nb-echantillon', echantillonGLSondageData.length);
    setText('ctrl-montant-echantillon', fmt(montantTotal));

    scrapeConclusions('controle-gl-sondage-table'); // préserve les conclusions déjà saisies avant de reconstruire le tableau
    var nbAnomalies = 0;
    var table = document.getElementById('controle-gl-sondage-table');
    var html = '<tr><th>N° Compte</th><th>Intitulé</th><th>Date</th><th>N° Facture / Réf.</th><th>Libellé</th><th>Débit</th><th>Crédit</th><th>Montant</th><th>Conclusion</th><th>Observation</th></tr>';
    if(echantillonGLSondageData.length === 0){
        var msgVide;
        if(compteFiltre){
            msgVide = 'Aucune écriture pour ce compte avec un montant ≥ au seuil calculé. Ajustez le % de seuil dans le tableau « Seuils par compte » ci-dessus, ou vérifiez la saisie du Grand Livre pour ce compte.';
        } else if(mode === 'auto'){
            msgVide = 'Aucune facture ≥ seuil de faible importance dans le périmètre choisi (ou seuil non calculé — vérifiez l\'onglet Planification).';
        } else {
            msgVide = 'Aucune écriture dans le périmètre choisi, ou taux de sondage à 0%.';
        }
        html += '<tr><td colspan="10" style="text-align:center;color:#888;">'+msgVide+'</td></tr>';
    } else {
        echantillonGLSondageData.forEach(function(r){
            var key = glRowKey(r);
            if(conclusionsEcritures[key] && conclusionsEcritures[key].statut === 'Anomalie') nbAnomalies++;
            html += '<tr><td>'+esc(r.compte)+'</td><td>'+esc(r.intitule)+'</td><td>'+esc(r.date)+'</td><td>'+esc(r.ref)+'</td><td>'+esc(r.libelle)+'</td>'+
                '<td class="number">'+fmt(r.debit)+'</td><td class="number">'+fmt(r.credit)+'</td>'+
                '<td class="number">'+fmt(Math.abs((r.debit||0)-(r.credit||0)))+'</td>'+renderConclusionCells(key)+'</tr>';
        });
    }
    table.innerHTML = html;
    setText('ctrl-nb-anomalies', nbAnomalies);
}
function exportControleGLSondage(){
    var csv = 'N COMPTE;INTITULE;DATE;REFERENCE;LIBELLE;DEBIT;CREDIT;MONTANT;CONCLUSION;OBSERVATION\n';
    echantillonGLSondageData.forEach(function(r){
        var key = glRowKey(r);
        var c = conclusionsEcritures[key] || {};
        csv += [r.compte,r.intitule,r.date,r.ref,r.libelle,r.debit,r.credit,Math.abs((r.debit||0)-(r.credit||0)),c.statut||'',c.commentaire||''].join(';') + '\n';
    });
    downloadCsv(csv, 'CONTROLE_GL_SONDAGE.csv');
}
