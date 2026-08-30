// ============================================================
// GRAND LIVRE — désormais scindé en deux tableaux : GL Bilan (classes 1 à 5)
// et GL Gestion (classes 6 à 8). Séparer les deux réduit fortement le coût de
// chaque recalcul (chaque tableau est plus petit, et modifier une ligne de
// Bilan ne reconstruit plus les tableaux Charges/Ventes à contrôler).
// ============================================================
var GL_TABLES = {
    bilan:   { tableId: 'table-gl-bilan',   pasteId: 'paste-gl-bilan',   containerId: 'gl-bilan' },
    gestion: { tableId: 'table-gl-gestion', pasteId: 'paste-gl-gestion', containerId: 'gl-gestion' }
};
function glRowHtml(kind, row){
    row = row || {compte:'',intitule:'',date:'',ref:'',libelle:'',debit:'',credit:''};
    var oc = 'recomputeGLTable(\''+kind+'\')';
    return '<td><input type="text" class="editable gl-compte" value="'+esc(row.compte)+'" onchange="'+oc+'"></td>'+
           '<td><input type="text" class="editable gl-intitule" value="'+esc(row.intitule)+'" onchange="'+oc+'"></td>'+
           '<td><input type="date" class="editable gl-date date-input" value="'+esc(row.date)+'" onchange="'+oc+'"></td>'+
           '<td><input type="text" class="editable gl-ref" value="'+esc(row.ref)+'" onchange="'+oc+'"></td>'+
           '<td><input type="text" class="editable gl-libelle" value="'+esc(row.libelle)+'" onchange="'+oc+'"></td>'+
           '<td><input type="number" class="editable gl-debit number" value="'+(row.debit||'')+'" onchange="'+oc+'"></td>'+
           '<td><input type="number" class="editable gl-credit number" value="'+(row.credit||'')+'" onchange="'+oc+'"></td>'+
           '<td class="calculated gl-classe"></td><td class="calculated gl-type"></td><td class="calculated gl-montant number"></td>'+
           '<td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td>';
}
function addGLRow(kind){
    var table = document.getElementById(GL_TABLES[kind].tableId);
    var tr = document.createElement('tr');
    tr.innerHTML = glRowHtml(kind, null);
    table.appendChild(tr);
}
function pasteGLTable(kind){
    var cfg = GL_TABLES[kind];
    var ta = document.getElementById(cfg.pasteId);
    var text = ta.value;
    if(!text.trim()) return;
    var lines = text.split(/\r?\n/).filter(function(l){ return l.trim() !== ''; });
    ta.value = '';
    importGLLinesChunked(kind, lines);
}
// Traite les écritures collées par lots (chunks), en cédant la main au navigateur entre chaque lot
// (via requestAnimationFrame + setTimeout) plutôt que de tout insérer d'un bloc dans le tableau déjà
// affiché. Sans ça, un Grand Livre de plusieurs milliers de lignes bloque le thread principal en continu
// et déclenche le message "la page ne répond plus". Les lignes sont regroupées dans un DocumentFragment
// avant d'être ajoutées au tableau, pour limiter le nombre de manipulations du DOM en direct.
// Statut sûr pour l'import GL : n'utilise PAS setStatus() du module collaboration
// (défini bien plus loin dans le fichier, donc indisponible ici — c'était la cause du bug
// qui bloquait tout le collage des écritures GL Bilan / GL Gestion).
function glImportSetStatus(txt){
    var el = document.getElementById('collab-status');
    if(el) el.textContent = txt;
}
function importGLLinesChunked(kind, lines){
    var cfg = GL_TABLES[kind];
    var label = kind === 'bilan' ? 'GL Bilan' : 'GL Gestion';
    var table = document.getElementById(cfg.tableId);
    var total = lines.length;
    var CHUNK_SIZE = 300;
    var idx = 0;
    var actionButtons = document.querySelectorAll('#'+cfg.containerId+' button, #'+cfg.containerId+' input[type="file"]');
    actionButtons.forEach(function(b){ b.disabled = true; });
    glImportSetStatus('⏳ Import du ' + label + '… 0/' + total + ' lignes');
    // Le clic qui a déclenché cet import (bouton « Coller »/import fichier) programme lui-même
    // une sauvegarde automatique ~1,3s plus tard (listener global de clic, 10-config-
    // collaboration.js) — bien avant qu'un gros import (plusieurs milliers de lignes, plusieurs
    // dizaines de secondes) ne soit terminé. Sans cette pause, la sauvegarde capturait le
    // tableau EN PLEINE CROISSANCE, les deux se disputant le même thread (bug réel constaté en
    // production le 26/08). On suspend donc l'auto-sauvegarde de cet onglet pour la durée de
    // l'import, et on déclenche nous-mêmes une sauvegarde immédiate une fois tous les lots posés.
    if(typeof window.SEVEN7_PAUSE_AUTOSAVE === 'function') window.SEVEN7_PAUSE_AUTOSAVE(cfg.containerId, true);

    // TROISIÈME cause du blocage à l'import d'un gros Grand Livre (les deux premières —
    // rAF en arrière-plan, course avec l'auto-sauvegarde — ont été corrigées le 26/08,
    // le cabinet a signalé que ça bloquait toujours) : l'observateur global de
    // 28-format-montants.js rescanne TOUT le document (querySelectorAll sur des dizaines
    // de milliers de champs) à chaque lot posé — coût O(n²) purement synchrone. On le
    // suspend pour la durée de l'import, puis on relance UN seul passage ciblé sur ce
    // tableau une fois tous les lots en place.
    if(typeof window.SEVEN7_PAUSE_FORMAT_MONTANTS === 'function') window.SEVEN7_PAUSE_FORMAT_MONTANTS(true);
    function reprendreFormatMontants(){
        if(typeof window.SEVEN7_PAUSE_FORMAT_MONTANTS === 'function') window.SEVEN7_PAUSE_FORMAT_MONTANTS(false);
        if(typeof formaterTousLesMontants === 'function') formaterTousLesMontants(table);
    }

    // Filet de sécurité : si processChunk() échoue de façon inattendue en cours de route,
    // ne JAMAIS laisser l'auto-sauvegarde suspendue en silence pour cet onglet — mieux vaut
    // un message d'erreur visible qu'un onglet qui cesse silencieusement de se sauvegarder.
    function annulerImport(erreur){
        actionButtons.forEach(function(b){ b.disabled = false; });
        reprendreFormatMontants();
        if(typeof window.SEVEN7_PAUSE_AUTOSAVE === 'function') window.SEVEN7_PAUSE_AUTOSAVE(cfg.containerId, false);
        glImportSetStatus('❌ Import du ' + label + ' interrompu (' + idx + '/' + total + ' lignes posées) — ' + erreur.message);
        alert('⚠ L’import du ' + label + ' s’est interrompu après ' + idx + ' ligne(s) sur ' + total
            + '. Les lignes déjà posées restent affichées ; relancez l’import pour le reste si besoin.\n\n' + erreur.message);
    }

    function processChunk(){
        try{
            var fragment = document.createDocumentFragment();
            var end = Math.min(idx + CHUNK_SIZE, total);
            for(var i = idx; i < end; i++){
                var parts = lines[i].split('\t');
                var row = {
                    compte:(parts[0]||'').trim(), intitule:(parts[1]||'').trim(), date:(parts[2]||'').trim(),
                    ref:(parts[3]||'').trim(), libelle:(parts[4]||'').trim(), debit:parseNum(parts[5]), credit:parseNum(parts[6])
                };
                if(row.compte === '') continue;
                var tr = document.createElement('tr');
                tr.innerHTML = glRowHtml(kind, row);
                fragment.appendChild(tr);
            }
            table.appendChild(fragment);
            idx = end;
        }catch(erreur){ annulerImport(erreur); return; }
        if(idx < total){
            glImportSetStatus('⏳ Import du ' + label + '… ' + idx + '/' + total + ' lignes');
            // setTimeout seul (pas requestAnimationFrame) : laisse le navigateur peindre / répondre
            // aux événements entre deux lots, SANS dépendre d'une frame d'animation. rAF se met en
            // pause dès que l'onglet n'est plus au premier plan/visible (changement de fenêtre,
            // notification, etc.) — l'import restait alors bloqué indéfiniment au premier lot, écran
            // figé (« la page ne répond plus »), confirmé par test : reproductible aussi bien sur la
            // version déployée avant le 26/08 que sur celle-ci — bug préexistant, pas une régression.
            setTimeout(processChunk, 0);
        } else {
            actionButtons.forEach(function(b){ b.disabled = false; });
            recomputeGLTable(kind);
            reprendreFormatMontants();
            var nb = kind === 'bilan' ? grandLivreBilanData.length : grandLivreGestionData.length;
            glImportSetStatus('🟢 ' + label + ' importé (' + nb + ' lignes)');
            if(typeof window.SEVEN7_PAUSE_AUTOSAVE === 'function') window.SEVEN7_PAUSE_AUTOSAVE(cfg.containerId, false);
            if(typeof window.SEVEN7_SCHEDULE_SAVE === 'function') window.SEVEN7_SCHEDULE_SAVE(cfg.containerId, true);
        }
    }
    processChunk();
}
function classifyGLCompte(compte){
    // Classification SYSCOHADA de la classe et du type d'écriture pour l'ensemble de la liasse (classes 1 à 8)
    var c0 = compte.charAt(0);
    var c2 = compte.substring(0,2);
    var classe = c0;
    var type = 'Autre';
    if(c0 === '1') type = 'Capitaux (Bilan-Passif)';
    else if(c0 === '2') type = 'Immobilisations (Bilan-Actif)';
    else if(c0 === '3') type = 'Stocks (Bilan-Actif)';
    else if(c0 === '4') type = 'Tiers (Bilan)';
    else if(c0 === '5') type = 'Trésorerie (Bilan)';
    else if(c0 === '6') type = 'Charge';
    else if(c0 === '7') type = (c2 === '70' ? 'Vente' : 'Produit');
    else if(c0 === '8'){
        // Comptes 8 : les comptes en 2e position paire sont des produits HAO, impairs des charges HAO (81/83/85/87 charges, 82/84/86/88 produits)
        var d2 = parseInt(compte.charAt(1) || '0', 10);
        type = (d2 % 2 === 0) ? 'Produit HAO' : 'Charge HAO';
    }
    return { classe: classe, type: type };
}
// Recalcule UNIQUEMENT le tableau modifié (bilan OU gestion) : c'est ce qui évite de rescanner
// et reconstruire l'ensemble du Grand Livre à chaque frappe, comme c'était le cas avant la scission.
function recomputeGLTable(kind){
    var cfg = GL_TABLES[kind];
    var table = document.getElementById(cfg.tableId);
    var trs = table.querySelectorAll('tr');
    var data = [];
    var totCharges = 0, totVentes = 0, totBilan = 0;
    for(var i=1;i<trs.length;i++){
        var tr = trs[i];
        var inputs = tr.querySelectorAll('input');
        if(inputs.length < 7) continue;
        var compte = inputs[0].value.trim();
        var debit = parseNum(inputs[5].value);
        var credit = parseNum(inputs[6].value);
        var classe = '', type = '', montant = 0;
        if(compte){
            var cls = classifyGLCompte(compte);
            classe = cls.classe;
            type = cls.type;
            if(type === 'Charge' || type === 'Charge HAO'){ montant = debit; }
            else if(type === 'Vente' || type === 'Produit' || type === 'Produit HAO'){ montant = credit; }
            else { montant = debit - credit; } // comptes de bilan (classes 1 à 5) : mouvement net signé
        }
        tr.querySelector('.gl-classe').textContent = classe;
        tr.querySelector('.gl-type').textContent = type;
        tr.querySelector('.gl-montant').textContent = montant ? fmt(montant) : '';
        if(type === 'Charge' || type === 'Charge HAO') totCharges += montant;
        else if(type === 'Vente' || type === 'Produit' || type === 'Produit HAO') totVentes += montant;
        else if(classe >= '1' && classe <= '5' && classe !== '') totBilan += Math.abs(montant);
        if(compte){
            data.push({
                compte: compte, intitule: inputs[1].value, date: inputs[2].value, ref: inputs[3].value,
                libelle: inputs[4].value, debit: debit, credit: credit, classe: classe, type: type, montant: montant
            });
        }
    }
    if(kind === 'bilan'){
        grandLivreBilanData = data;
        setText('gl-bilan-nb-lignes', data.length);
        setText('gl-bilan-total', fmt(totBilan));
        var badgeB = document.getElementById('status-gl-bilan');
        if(badgeB && data.length){ badgeB.textContent = 'Importé ('+data.length+' lignes)'; badgeB.className='badge badge-success'; }
        // Le GL Bilan seul ne modifie pas les échantillons Charges/Ventes (classes 6 à 8 uniquement),
        // mais peut affecter le périmètre du Contrôle GL par sondage (qui peut porter sur tous les comptes).
        if(typeof computeControleGLSondage === 'function') computeControleGLSondage();
    } else {
        grandLivreGestionData = data;
        setText('gl-gestion-total-charges', fmt(totCharges));
        setText('gl-gestion-total-ventes', fmt(totVentes));
        var badgeG = document.getElementById('status-gl-gestion');
        if(badgeG && data.length){ badgeG.textContent = 'Importé ('+data.length+' lignes)'; badgeG.className='badge badge-success'; }
        if(typeof computeControleGLSondage === 'function') computeControleGLSondage();
    }
}
function clearGLTable(kind){
    var cfg = GL_TABLES[kind];
    var label = kind === 'bilan' ? 'GL Bilan' : 'GL Gestion';
    if(!confirm('Vider entièrement le ' + label + ' ?')) return;
    var table = document.getElementById(cfg.tableId);
    var trs = table.querySelectorAll('tr');
    for(var i=trs.length-1;i>=1;i--){ trs[i].remove(); }
    recomputeGLTable(kind);
}
function exportGLTable(kind){
    var data = kind === 'bilan' ? grandLivreBilanData : grandLivreGestionData;
    var filename = kind === 'bilan' ? 'GL_BILAN.csv' : 'GL_GESTION.csv';
    var csv = 'N COMPTE;INTITULE;DATE;REFERENCE;LIBELLE;DEBIT;CREDIT;CLASSE;TYPE;MONTANT\n';
    data.forEach(function(r){
        csv += [r.compte,r.intitule,r.date,r.ref,r.libelle,r.debit,r.credit,r.classe,r.type,r.montant].join(';') + '\n';
    });
    downloadCsv(csv, filename);
}

/* ==================================================================
   FILET DE SÉCURITÉ — bug réel constaté (25/08) : sur un dossier ancien,
   après restauration du innerHTML sauvegardé (applyRemoteTab, 10-config-
   collaboration.js — toute la carte GL Bilan/Gestion, boutons compris, est
   resauvegardée telle quelle), deux symptômes ont été observés ensemble
   sur un même dossier :
   1) Colonnes calculées (Classe/Type/Montant) et compteurs restent à 0
      malgré des lignes réelles avec montants — recomputeGLTable() n'a
      jamais tourné depuis la dernière restauration (elle ne s'exécute
      normalement qu'au changement d'une cellule, jamais au chargement).
   2) Les 3 boutons d'action (Ajouter/Vider/Exporter) ne répondaient plus
      du tout, alors que les boutons identiques du GL Gestion et le
      bouton "Coller les écritures" du MÊME GL Bilan fonctionnaient —
      signe d'une rangée de boutons dupliquée dans l'ancien HTML restauré
      (une copie invisible superposée absorbe le clic).
   glAssurerIntegrite() répare les deux : ne garde qu'une seule rangée de
   boutons d'action par carte, et force un recalcul. Un MutationObserver
   la relance à chaque restauration distante, sur le même principe que
   51-rapprochement-bancaire.js (rbAssurerBoutonsImport/rbObserverSync).
   ================================================================== */
function glAssurerIntegrite(kind){
    var cfg = GL_TABLES[kind];
    var conteneur = document.getElementById(cfg.containerId);
    if(!conteneur) return;
    var rangees = Array.prototype.slice.call(
        conteneur.querySelectorAll('.form-row button[onclick*="addGLRow(\'' + kind + '\')"]')
    ).map(function(btn){ return btn.closest('.form-row'); });
    // dédoublonne (une même rangée peut contenir les 3 boutons -> plusieurs
    // matches pointant vers le même .form-row) puis retire les copies en trop.
    var vues = [];
    rangees.forEach(function(r){ if(r && vues.indexOf(r) === -1) vues.push(r); });
    for(var i = 1; i < vues.length; i++){ vues[i].remove(); }
    recomputeGLTable(kind);
}
function glObserverIntegrite(kind){
    var cfg = GL_TABLES[kind];
    var conteneur = document.getElementById(cfg.containerId);
    // subtree:false délibérément : ne réagit qu'au remplacement complet du innerHTML de
    // l'onglet (applyRemoteTab, restauration distante — une mutation childList sur le
    // conteneur lui-même), jamais aux mutations internes (édition d'une cellule, recalcul
    // des colonnes calculées) — sinon recomputeGLTable() (qui modifie des descendants)
    // redéclencherait l'observateur en boucle continue.
    if(!conteneur || typeof MutationObserver === 'undefined') return;
    var mo = new MutationObserver(function(){ glAssurerIntegrite(kind); });
    mo.observe(conteneur, { childList:true });
}
function glInitIntegrite(){
    ['bilan','gestion'].forEach(function(kind){
        glAssurerIntegrite(kind);
        glObserverIntegrite(kind);
    });
}
try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', glInitIntegrite);
        else
            glInitIntegrite();
    }
}catch(e){}
