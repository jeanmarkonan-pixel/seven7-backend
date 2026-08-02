// ============================================================
// BILAN — reproduction exacte de la logique Excel (onglet BILAN)
// ============================================================
// ============================================================
// RESULTAT — reproduction exacte de la logique Excel (onglet RESULTAT)
// ============================================================
function renderResultat(rN, rN1){
    var lines = buildResultatLines(rN, rN1);
    var table = document.getElementById('resultat-table');
    var html = '<tr><th>Réf.</th><th>Libellés</th><th>Exercice N</th><th>Exercice N-1</th></tr>';
    lines.forEach(function(l){
        var cls = l.isGrandTotal ? 'total-row' : (l.isTotal ? 'total-row' : (l.isMemo ? '' : ''));
        html += '<tr class="'+cls+'"><td>'+esc(l.ref)+'</td><td>'+(l.isTotal||l.isGrandTotal?'<strong>':'')+esc(l.lib)+(l.isTotal||l.isGrandTotal?'</strong>':'')+'</td><td class="number calculated">'+fmt(l.n)+'</td><td class="number">'+fmt(l.n1)+'</td></tr>';
    });
    table.innerHTML = html;
    var badge = document.getElementById('status-resultat');
    if(badge){ badge.textContent = 'Auto'; badge.className='badge badge-success'; }
}

function renderBilan(actifN, actifN1, passifN, passifN1){
    var tableA = document.getElementById('bilan-actif');
    var htmlA = '<tr><th>Réf.</th><th>Poste</th><th>Brut N</th><th>Amort./Prov. N</th><th>Net N</th><th>Net N-1</th></tr>';
    actifN.lines.forEach(function(l, idx){
        var l1 = actifN1.lines[idx] || {net:0};
        var cls = l.isGrandTotal ? 'total-row' : (l.isTotal ? 'total-row' : '');
        var brut = (l.brut===null||l.brut===undefined) ? '' : fmt(l.brut);
        var amort = (l.amort===null||l.amort===undefined) ? '' : fmt(l.amort);
        htmlA += '<tr class="'+cls+'"><td>'+esc(l.ref)+'</td><td>'+(l.isTotal?'<strong>':'')+esc(l.poste)+(l.isTotal?'</strong>':'')+'</td>'+
                 '<td class="number">'+brut+'</td><td class="number">'+amort+'</td>'+
                 '<td class="number calculated">'+fmt(l.net)+'</td><td class="number">'+fmt(l1.net)+'</td></tr>';
    });
    tableA.innerHTML = htmlA;

    var tableP = document.getElementById('bilan-passif');
    var htmlP = '<tr><th>Réf.</th><th>Poste</th><th>Net N</th><th>Net N-1</th></tr>';
    passifN.lines.forEach(function(l, idx){
        var l1 = passifN1.lines[idx] || {net:0};
        var cls = l.isGrandTotal ? 'total-row' : (l.isTotal ? 'total-row' : '');
        htmlP += '<tr class="'+cls+'"><td>'+esc(l.ref)+'</td><td>'+(l.isTotal?'<strong>':'')+esc(l.poste)+(l.isTotal?'</strong>':'')+'</td>'+
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
