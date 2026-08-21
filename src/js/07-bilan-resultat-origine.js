// ============================================================
// BILAN — reproduction exacte de la logique Excel (onglet BILAN)
// ============================================================
// ============================================================
// RESULTAT — reproduction exacte de la logique Excel (onglet RESULTAT)
// ============================================================

/* Renvois aux notes annexes et signes du modèle officiel (planche DGI
   pré-imprimée) — PURE PRÉSENTATION : aucune de ces tables n'intervient
   dans un calcul, elles n'annotent que les lignes déjà produites par le
   moteur (24-parametres.js / 25-moteur-etape2.js / 31-moteur-unifie.js),
   qu'on ne touche pas. Vide = la planche elle-même ne porte pas de renvoi
   sur cette ligne (cas des totaux et de plusieurs postes de détail). */
var BILAN_NOTES_ACTIF = {
    AD:'3', AI:'3', AP:'3', AQ:'4', BA:'5', BB:'6', BH:'17', BI:'7', BJ:'8',
    BQ:'9', BR:'10', BS:'11', BU:'12'
};
var BILAN_NOTES_PASSIF = {
    CA:'13', CB:'13', CD:'14', CE:'3e', CF:'14', CG:'14', CH:'14', CL:'15', CM:'15',
    DA:'16', DB:'16', DC:'16', DH:'5', DI:'7', DJ:'17', DK:'18', DM:'19', DN:'19',
    DQ:'20', DR:'20', DV:'12'
};
var RESULTAT_SIGNES_NOTES = {
    TA:['A +','21'], RA:['-','22'], RB:['-/+','6'],
    TB:['B +','21'], TC:['C +','21'], TD:['D +','21'],
    TE:['-/+','6'], TF:['+','21'], TG:['+','21'], TH:['+','21'], TI:['+','12'],
    RC:['-','22'], RD:['-/+','6'], RE:['-','22'], RF:['-/+','6'],
    RG:['-','23'], RH:['-','24'], RI:['-','25'], RJ:['-','26'], RK:['-','27'],
    TJ:['+','28'], RL:['-','3C&28'],
    TK:['+','29'], TL:['+','28'], TM:['+','12'], RM:['-','29'], RN:['-','3C&28'],
    TN:['+','3D'], TO:['+','30'], RO:['-','3D'], RP:['-','30'],
    RQ:['-','30'], RS:['-','']
};

/* En-tête officiel commun (désignation entité, identification, exercice,
   durée) — lu dans l'onglet Fiche d'identification, jamais saisi deux fois. */
function etatsEnteteHtml(){
    var raison = (typeof rapVal === 'function' ? rapVal('fi-raison') : '') || '……………………………';
    var rccm = (typeof rapVal === 'function' ? rapVal('fi-rccm') : '') || '……………………';
    var clotureIso = (typeof rapVal === 'function' ? rapVal('fi-cloture') : '');
    var cloture = (clotureIso && typeof rapDateFr === 'function') ? rapDateFr(clotureIso) : '……………';
    return '<div><strong>Désignation entité :</strong> ' + esc(raison) + '</div>'
         + '<div><strong>Exercice clos le :</strong> ' + esc(cloture) + '</div>'
         + '<div><strong>Numéro d’identification :</strong> ' + esc(rccm) + '</div>'
         + '<div><strong>Durée (en mois) :</strong> 12</div>';
}
function etatsEnteteInstaller(){
    var a = document.getElementById('etats-entete-bilan');
    if(a) a.innerHTML = etatsEnteteHtml();
    var r = document.getElementById('etats-entete-resultat');
    if(r) r.innerHTML = etatsEnteteHtml();
}

// buildResultatLines() porte le détail compte+sens dans l.ref (ex. "701 (SC-SD)"),
// utile comme piste d'audit ("P5 contrôle du moteur", voir README) et qu'on ne
// touche pas : le code officiel (TA, RA…) n'apparaît que comme suffixe de l.lib,
// y compris sur les lignes de total ("MARGE COMMERCIALE  (XA)").
function resultatCodeOfficiel(l){
    var m = /\(([A-Z0-9]+)\)\s*$/.exec(l.lib || '');
    return m ? m[1] : null;
}
function renderResultat(rN, rN1){
    etatsEnteteInstaller();
    var lines = buildResultatLines(rN, rN1);
    var table = document.getElementById('resultat-table');
    var html = '<tr><th>Réf.</th><th>Libellés</th><th>Signe</th><th>Note</th><th>Exercice N</th><th>Exercice N-1</th></tr>';
    lines.forEach(function(l){
        var cls = l.isGrandTotal ? 'total-row' : (l.isTotal ? 'total-row' : (l.isMemo ? '' : ''));
        var estTotal = l.isTotal || l.isGrandTotal;
        var code = resultatCodeOfficiel(l);
        var sn = !estTotal && code && RESULTAT_SIGNES_NOTES[code];
        var signe = sn ? sn[0] : '';
        var note = sn ? sn[1] : '';
        html += '<tr class="'+cls+'"><td>'+esc(l.ref)+'</td><td>'+(estTotal?'<strong>':'')+esc(l.lib)+(estTotal?'</strong>':'')+'</td>'+
                '<td>'+esc(signe)+'</td><td>'+esc(note)+'</td>'+
                '<td class="number calculated">'+fmt(l.n)+'</td><td class="number">'+fmt(l.n1)+'</td></tr>';
    });
    table.innerHTML = html;
    var badge = document.getElementById('status-resultat');
    if(badge){ badge.textContent = 'Auto'; badge.className='badge badge-success'; }
}

function renderBilan(actifN, actifN1, passifN, passifN1){
    etatsEnteteInstaller();
    var tableA = document.getElementById('bilan-actif');
    var htmlA = '<tr><th>Réf.</th><th>Poste</th><th>Note</th><th>Brut N</th><th>Amort./Prov. N</th><th>Net N</th><th>Net N-1</th></tr>';
    actifN.lines.forEach(function(l, idx){
        var l1 = actifN1.lines[idx] || {net:0};
        var cls = l.isGrandTotal ? 'total-row' : (l.isTotal ? 'total-row' : '');
        var brut = (l.brut===null||l.brut===undefined) ? '' : fmt(l.brut);
        var amort = (l.amort===null||l.amort===undefined) ? '' : fmt(l.amort);
        var note = l.isTotal ? '' : (BILAN_NOTES_ACTIF[l.ref] || '');
        htmlA += '<tr class="'+cls+'"><td>'+esc(l.ref)+'</td><td>'+(l.isTotal?'<strong>':'')+esc(l.poste)+(l.isTotal?'</strong>':'')+'</td>'+
                 '<td>'+esc(note)+'</td>'+
                 '<td class="number">'+brut+'</td><td class="number">'+amort+'</td>'+
                 '<td class="number calculated">'+fmt(l.net)+'</td><td class="number">'+fmt(l1.net)+'</td></tr>';
    });
    tableA.innerHTML = htmlA;

    var tableP = document.getElementById('bilan-passif');
    var htmlP = '<tr><th>Réf.</th><th>Poste</th><th>Note</th><th>Net N</th><th>Net N-1</th></tr>';
    passifN.lines.forEach(function(l, idx){
        var l1 = passifN1.lines[idx] || {net:0};
        var cls = l.isGrandTotal ? 'total-row' : (l.isTotal ? 'total-row' : '');
        var note = l.isTotal ? '' : (BILAN_NOTES_PASSIF[l.ref] || '');
        htmlP += '<tr class="'+cls+'"><td>'+esc(l.ref)+'</td><td>'+(l.isTotal?'<strong>':'')+esc(l.poste)+(l.isTotal?'</strong>':'')+'</td>'+
                 '<td>'+esc(note)+'</td>'+
                 '<td class="number calculated">'+fmt(l.net)+'</td><td class="number">'+fmt(l1.net)+'</td></tr>';
    });
    tableP.innerHTML = htmlP;

    var ecart = actifN.total - passifN.total;
    var equilibre = Math.abs(ecart) < 1;
    var alertDiv = document.getElementById('bilan-alert');
    var statutSpan = document.getElementById('bilan-statut');
    if(equilibre){
        alertDiv.className = 'alert alert-success';
        statutSpan.textContent = 'BILAN ÉQUILIBRÉ — Actif = Passif = ' + fmt(actifN.total);
    } else {
        alertDiv.className = 'alert alert-danger';
        statutSpan.textContent = '⚠ BILAN EN DÉSÉQUILIBRE — Actif='+fmt(actifN.total)+' / Passif='+fmt(passifN.total)+' / Écart='+fmt(ecart);
    }
    var badge = document.getElementById('status-bilan');
    if(badge){ badge.textContent = 'Auto'; badge.className='badge badge-success'; }
}
