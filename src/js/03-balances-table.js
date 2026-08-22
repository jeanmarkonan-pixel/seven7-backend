// ============================================================
// TABLE BALANCE N / N-1 : rendu, ajout, import
// ============================================================
function balanceRowHtml(ex, row){
    row = row || {compte:'', intitule:'', od:'', oc:'', md:'', mc:'', sd:'', sc:''};
    var oc2 = 'onBalanceCellChange(\''+ex+'\', this)';
    return '<td><input type="text" class="editable b-compte" value="'+esc(row.compte)+'" onchange="'+oc2+'"></td>'+
           '<td><input type="text" class="editable b-intitule" value="'+esc(row.intitule)+'" onchange="'+oc2+'"></td>'+
           '<td><input type="text" inputmode="decimal" class="editable b-od number montant-fmt" data-montant="1" value="'+ fmtSaisie(row.od || '') +'" onchange="'+oc2+'"></td>'+
           '<td><input type="text" inputmode="decimal" class="editable b-oc number montant-fmt" data-montant="1" value="'+ fmtSaisie(row.oc || '') +'" onchange="'+oc2+'"></td>'+
           '<td><input type="text" inputmode="decimal" class="editable b-md number montant-fmt" data-montant="1" value="'+ fmtSaisie(row.md || '') +'" onchange="'+oc2+'"></td>'+
           '<td><input type="text" inputmode="decimal" class="editable b-mc number montant-fmt" data-montant="1" value="'+ fmtSaisie(row.mc || '') +'" onchange="'+oc2+'"></td>'+
           '<td><input type="text" inputmode="decimal" class="editable b-sd number montant-fmt" data-montant="1" value="'+ fmtSaisie(row.sd || '') +'" onchange="'+oc2+'"></td>'+
           '<td><input type="text" inputmode="decimal" class="editable b-sc number montant-fmt" data-montant="1" value="'+ fmtSaisie(row.sc || '') +'" onchange="'+oc2+'"></td>'+
           '<td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td>';
}
function esc(s){ return String(s===undefined||s===null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

function addBalanceRow(ex){
    var table = document.getElementById('table-balance-'+ex);
    var tr = document.createElement('tr');
    tr.innerHTML = balanceRowHtml(ex, null);
    table.appendChild(tr);
}

function onBalanceCellChange(ex){
    recomputeBalanceFromTable(ex);
}

function recomputeBalanceFromTable(ex){
    var table = document.getElementById('table-balance-'+ex);
    var rows = [];
    var trs = table.querySelectorAll('tr');
    for(var i=1;i<trs.length;i++){
        var tds = trs[i].querySelectorAll('input');
        if(tds.length < 8) continue;
        rows.push({
            compte: tds[0].value.trim(),
            intitule: tds[1].value,
            od: parseNum(tds[2].value),
            oc: parseNum(tds[3].value),
            md: parseNum(tds[4].value),
            mc: parseNum(tds[5].value),
            sd: parseNum(tds[6].value),
            sc: parseNum(tds[7].value)
        });
    }
    balanceData[ex] = rows;
    updateBalanceStats(ex);
    updateAllCalculations();
    updateStatus('balance-'+ex.replace('n1','n1').replace(/^n$/,'n'));
    var badge = document.getElementById('status-balance-'+ex);
    if(badge && rows.length){ badge.textContent = 'Importée ('+rows.length+' lignes)'; badge.className='badge badge-success'; }
    if(typeof liasseRefreshAll === 'function') liasseRefreshAll();
    if(typeof syscRafraichirTout === 'function') syscRafraichirTout();
}

function updateBalanceStats(ex){
    var rows = balanceData[ex] || [];
    var totOd=0, totOc=0, totMd=0, totMc=0, totSd=0, totSc=0;
    var classes = {1:0,2:0,3:0,4:0,5:0,6:0,7:0};
    rows.forEach(function(r){
        totOd += (r.od||0); totOc += (r.oc||0);
        totMd += r.md; totMc += r.mc; totSd += r.sd; totSc += r.sc;
        var c = String(r.compte||'')[0];
        if(classes.hasOwnProperty(c)) classes[c] += (r.sd || r.sc || 0);
    });
    var pfx = ex; // 'n' or 'n1'
    setText(pfx+'-total-od', fmt(totOd));
    setText(pfx+'-total-oc', fmt(totOc));
    setText(pfx+'-ecart-o', fmt(totOd-totOc));
    setText(pfx+'-total-md', fmt(totMd));
    setText(pfx+'-total-mc', fmt(totMc));
    setText(pfx+'-ecart-m', fmt(totMd-totMc));
    setText(pfx+'-total-sd', fmt(totSd));
    setText(pfx+'-total-sc', fmt(totSc));
    setText(pfx+'-ecart-s', fmt(totSd-totSc));
    setText(pfx+'-nb-comptes', rows.length);
    for(var k=1;k<=7;k++){ setText(pfx+'-classe'+k, fmt(classes[k])); }
    var statutEl = document.getElementById(pfx+'-statut');
    var equilibree = Math.abs(totOd-totOc) < 1 && Math.abs(totSd-totSc) < 1 && Math.abs(totMd-totMc) < 1;
    if(statutEl){
        statutEl.textContent = equilibree ? ('BALANCE '+ (ex==='n1'?'N-1':'N') +' ÉQUILIBRÉE (ouverture, mouvements et clôture)') : ('⚠ BALANCE '+(ex==='n1'?'N-1':'N')+' EN DÉSÉQUILIBRE');
        statutEl.className = equilibree ? 'status-ok' : 'status-danger';
    }
}
function setText(id, val){ var el = document.getElementById(id); if(el) el.textContent = val; }

function clearBalance(ex){
    if(!confirm('Vider entièrement la balance '+(ex==='n1'?'N-1':'N')+' ?')) return;
    var table = document.getElementById('table-balance-'+ex);
    var trs = table.querySelectorAll('tr');
    for(var i=trs.length-1;i>=1;i--){ trs[i].remove(); }
    balanceData[ex] = [];
    updateBalanceStats(ex);
    updateAllCalculations();
    if(typeof liasseRefreshAll === 'function') liasseRefreshAll();
}

function pasteBalance(ex){
    var text = document.getElementById('paste-'+ex).value;
    if(!text.trim()) return;
    var lines = text.split(/\r?\n/).filter(function(l){ return l.trim() !== ''; });
    balanceInsererLignes(ex, lines);
    document.getElementById('paste-'+ex).value = '';
}

// Insère des lignes tab-délimitées (compte / intitulé / od / oc / md / mc / sd / sc)
// dans la table de balance. Point d'entrée commun au collage (ci-dessus) et à
// l'import de fichier CSV (voir 45-securite-import.js), qui normalise d'abord
// l'ordre de ses colonnes vers ce même format avant d'appeler cette fonction.
function balanceInsererLignes(ex, lines){
    var table = document.getElementById('table-balance-'+ex);
    lines.forEach(function(line){
        var parts = line.split('\t');
        if(parts.length < 2) parts = line.split(/ {2,}/);
        var row = {
            compte: (parts[0]||'').trim(),
            intitule: (parts[1]||'').trim(),
            od: parseNum(parts[2]),
            oc: parseNum(parts[3]),
            md: parseNum(parts[4]),
            mc: parseNum(parts[5]),
            sd: parseNum(parts[6]),
            sc: parseNum(parts[7])
        };
        if(row.compte === '') return;
        var tr = document.createElement('tr');
        tr.innerHTML = balanceRowHtml(ex, row);
        table.appendChild(tr);
    });
    recomputeBalanceFromTable(ex);
}

function exportBalance(ex){
    var rows = balanceData[ex] || [];
    var csv = 'N COMPTE;INTITULE;OUVERTURE DEBIT;OUVERTURE CREDIT;MOUVEMENT DEBIT;MOUVEMENT CREDIT;SOLDE DEBITEUR;SOLDE CREDITEUR\n';
    rows.forEach(function(r){
        csv += [r.compte, r.intitule, r.od, r.oc, r.md, r.mc, r.sd, r.sc].join(';') + '\n';
    });
    downloadCsv(csv, 'BALANCE_'+ (ex==='n1'?'N-1':'N') +'.csv');
}
function downloadCsv(csv, filename){
    var blob = new Blob(["\ufeff"+csv], {type:'text/csv;charset=utf-8;'});
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
