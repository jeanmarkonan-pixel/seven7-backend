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

    function processChunk(){
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
        if(idx < total){
            glImportSetStatus('⏳ Import du ' + label + '… ' + idx + '/' + total + ' lignes');
            // requestAnimationFrame laisse le navigateur peindre / répondre aux événements avant le lot suivant
            requestAnimationFrame(function(){ setTimeout(processChunk, 0); });
        } else {
            actionButtons.forEach(function(b){ b.disabled = false; });
            recomputeGLTable(kind);
            var nb = kind === 'bilan' ? grandLivreBilanData.length : grandLivreGestionData.length;
            glImportSetStatus('🟢 ' + label + ' importé (' + nb + ' lignes)');
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
