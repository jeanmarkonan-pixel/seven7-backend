/* ==================================================================
   SEVEN7 — ÉTAPE 4 : REVUE DES VARIATIONS PAR CYCLE
   Analyse ligne par ligne, sous-compte par sous-compte, de l'évolution
   N-1 → N à l'intérieur de chaque cycle, avec seuils, rattachement au
   poste de liasse et zone de commentaire auditeur persistante.
   ================================================================== */

var CYC_COM = null;
function cycComKey(){
    var d = (typeof window !== 'undefined' && window.SEVEN7_DOSSIER_ID) ? window.SEVEN7_DOSSIER_ID : 'local';
    return 'seven7_cycvar_com_' + d;
}
function cycComLoad(){
    if(CYC_COM) return CYC_COM;
    CYC_COM = {};
    try{ CYC_COM = JSON.parse(localStorage.getItem(cycComKey()) || '{}') || {}; }catch(e){ CYC_COM = {}; }
    return CYC_COM;
}
function cycComSet(compte, valeur){
    cycComLoad();
    if(valeur) CYC_COM[compte] = valeur; else delete CYC_COM[compte];
    try{ localStorage.setItem(cycComKey(), JSON.stringify(CYC_COM)); }catch(e){}
    var el = document.getElementById('cycv-nb-com');
    if(el) el.textContent = Object.keys(CYC_COM).length;
}

/* Poste de liasse d'un compte, via le moteur de l'étape 2 */
function cycPosteLiasse(r){
    try{
        var m = paramResolve(r.compte, r.sd, r.sc);
        if(!m) return '—';
        var lib = {brut:'brut', amort:'amort.', net:''}[m.col] || '';
        return m.ref + (lib ? ' <span style="color:#999;">('+lib+')</span>' : '');
    }catch(e){ return '—'; }
}

/* Construit les lignes de variation d'un cycle (comptes N et comptes disparus) */
function cycOccurrences(rows){
    var n = {};
    rows.forEach(function(r){ var k = cycKey(r.compte); n[k] = (n[k] || 0) + 1; });
    return n;
}
function cycVarLignes(cycId, rows, rowsN1, mapN, mapN1){
    var out = [], occ = cycOccurrences(rows);
    rows.forEach(function(r){
        if(cycleOf(r.compte) !== cycId) return;
        var k = cycKey(r.compte);
        var r1 = mapN1[k];
        /* Numéro de compte présent plusieurs fois dans la balance N : le solde N-1
           ne peut pas être affecté sans ambiguïté, il n'est rattaché à aucune ligne. */
        var dbl = occ[k] > 1;
        var sN = cycSolde(r), sN1 = (r1 && !dbl) ? cycSolde(r1) : 0;
        out.push({compte:r.compte, intitule:r.intitule, poste:cycPosteLiasse(r),
                  sN:sN, sN1:sN1, v:sN - sN1, nouveau:!r1 && !dbl, disparu:false, doublon:dbl});
    });
    rowsN1.forEach(function(r1){
        if(cycleOf(r1.compte) !== cycId) return;
        if(mapN[cycKey(r1.compte)]) return;
        var sN1 = cycSolde(r1);
        if(Math.abs(sN1) < 1) return;
        out.push({compte:r1.compte, intitule:r1.intitule, poste:cycPosteLiasse(r1),
                  sN:0, sN1:sN1, v:-sN1, nouveau:false, disparu:true});
    });
    out.forEach(function(l){
        l.pct = (l.sN1 !== 0) ? (l.v / Math.abs(l.sN1)) * 100 : (l.sN !== 0 ? 100 : 0);
    });
    out.sort(function(a, b){ return Math.abs(b.v) - Math.abs(a.v); });
    return out;
}

function cycVarCSV(){
    var rows = (typeof balanceData !== 'undefined' && balanceData.n)  ? balanceData.n  : [];
    var rowsN1 = (typeof balanceData !== 'undefined' && balanceData.n1) ? balanceData.n1 : [];
    var mapN = {}, mapN1 = {};
    rows.forEach(function(r){ mapN[cycKey(r.compte)] = r; });
    rowsN1.forEach(function(r){ mapN1[cycKey(r.compte)] = r; });
    cycComLoad();
    var out = ['Cycle;Compte;Intitule;Poste liasse;Solde N-1;Solde N;Variation;Variation %;Commentaire auditeur'];
    CYCLES.forEach(function(c){
        cycVarLignes(c.id, rows, rowsN1, mapN, mapN1).forEach(function(l){
            out.push([c.nom, l.compte, String(l.intitule||'').replace(/;/g, ','),
                      String(l.poste).replace(/<[^>]+>/g, '').trim(),
                      Math.round(l.sN1), Math.round(l.sN), Math.round(l.v),
                      l.pct.toFixed(1), (CYC_COM[l.compte] || '').replace(/;/g, ',')].join(';'));
        });
    });
    var blob = '\uFEFF' + out.join('\r\n');
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(blob);
    a.download = 'SEVEN7_revue_variations_par_cycle.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function runCyclesVariations(){
    var el = document.getElementById('cycles-var-content');
    if(!el) return;
    var rows   = (typeof balanceData !== 'undefined' && balanceData.n)  ? balanceData.n  : [];
    var rowsN1 = (typeof balanceData !== 'undefined' && balanceData.n1) ? balanceData.n1 : [];
    if(!rows.length && !rowsN1.length){
        el.innerHTML = '<div class="alert alert-info">Importez les balances N et N-1 pour lancer la revue des variations.</div>';
        return;
    }
    var champPct = document.getElementById('cycv-seuil-pct');
    var champMt  = document.getElementById('cycv-seuil-mt');
    var chkTout  = document.getElementById('cycv-tout');
    var seuilPct = (champPct && champPct.value !== '') ? parseNum(champPct.value, true) : NaN;
    if(isNaN(seuilPct)) seuilPct = 20;
    var seuilMt  = (champMt && champMt.value !== '') ? parseNum(champMt.value) : 0;
    if(isNaN(seuilMt) || !seuilMt) seuilMt = Math.max(seuils.faible || 0, 1);
    var toutAfficher = !!(chkTout && chkTout.checked);

    var mapN = {}, mapN1 = {};
    rows.forEach(function(r){ mapN[cycKey(r.compte)] = r; });
    rowsN1.forEach(function(r){ mapN1[cycKey(r.compte)] = r; });
    cycComLoad();

    var data = {}, totAlertes = 0;
    CYCLES.forEach(function(c){
        var lignes = cycVarLignes(c.id, rows, rowsN1, mapN, mapN1);
        lignes.forEach(function(l){
            l.alerte = (Math.abs(l.v) >= seuilMt) && (Math.abs(l.pct) >= seuilPct);
            if(l.alerte) totAlertes++;
        });
        data[c.id] = lignes;
    });

    /* --- Synthèse --- */
    var syn = '<table><tr><th>Cycle</th><th>Sous-comptes</th><th>Solde N-1</th><th>Solde N</th>'+
              '<th>Variation</th><th>Variation %</th><th>Lignes à examiner</th></tr>';
    CYCLES.forEach(function(c){
        var lignes = data[c.id];
        if(!lignes.length) return;
        var sN = 0, sN1 = 0, nb = 0;
        rows.forEach(function(r){ if(cycleOf(r.compte) === c.id) sN += cycSolde(r); });
        rowsN1.forEach(function(r){ if(cycleOf(r.compte) === c.id) sN1 += cycSolde(r); });
        lignes.forEach(function(l){ if(l.alerte) nb++; });
        var v = sN - sN1, p = sN1 !== 0 ? (v / Math.abs(sN1)) * 100 : (sN !== 0 ? 100 : 0);
        syn += '<tr'+(nb ? ' class="risk-high"' : '')+'><td><b>'+c.ico+' '+esc(c.nom)+'</b></td>'+
               '<td class="number">'+lignes.length+'</td>'+
               '<td class="number">'+fmt(sN1)+'</td><td class="number">'+fmt(sN)+'</td>'+
               '<td class="number">'+fmt(v)+'</td><td class="number">'+p.toFixed(1)+'%</td>'+
               '<td class="number'+(nb ? ' status-warning' : '')+'">'+nb+'</td></tr>';
    });
    syn += '</table>';

    /* --- Un tableau par cycle --- */
    var corps = '';
    CYCLES.forEach(function(c){
        var lignes = data[c.id];
        if(!lignes.length) return;
        var visibles = toutAfficher ? lignes : lignes.filter(function(l){ return l.alerte; });
        var nbAl = lignes.filter(function(l){ return l.alerte; }).length;

        corps += '<div class="cyc-bloc"><div class="cyc-titre" style="background:'+c.couleur+';">'+
                 c.ico+' VARIATIONS — '+esc(c.nom.toUpperCase())+
                 '<span class="cyc-badge">'+lignes.length+' sous-compte(s) · '+nbAl+' à examiner</span></div>';
        corps += '<div class="scroll-table"><table><tr>'+
                 '<th>Compte</th><th>Intitulé</th><th>Poste liasse</th>'+
                 '<th>Solde N-1</th><th>Solde N</th><th>Variation</th><th>%</th>'+
                 '<th>Poids cycle</th><th>Commentaire auditeur</th></tr>';

        if(!visibles.length){
            corps += '<tr><td colspan="9" style="text-align:center;color:#27ae60;">'+
                     '✓ Aucune variation dépassant '+fmt(seuilMt)+' FCFA et '+seuilPct+' % sur ce cycle</td></tr>';
        }
        var totVarCycle = 0;
        lignes.forEach(function(l){ totVarCycle += Math.abs(l.v); });

        visibles.forEach(function(l){
            var poids = totVarCycle ? (Math.abs(l.v) / totVarCycle) * 100 : 0;
            var tag = l.doublon ? ' <span class="cyc-tag" style="background:#f5d5d5;color:#7a1f1f;" title="Num\u00e9ro de compte pr\u00e9sent plusieurs fois dans la balance N : le solde N-1 n\u2019a pas pu \u00eatre rattach\u00e9">doublon</span>'
                    : (l.nouveau ? ' <span class="cyc-tag">nouveau</span>'
                    : (l.disparu ? ' <span class="cyc-tag">disparu</span>' : ''));
            var com = esc(CYC_COM[l.compte] || '');
            corps += '<tr'+(l.alerte ? ' class="risk-high"' : '')+'>'+
                '<td>'+esc(l.compte)+tag+'</td><td>'+esc(l.intitule)+'</td><td>'+l.poste+'</td>'+
                '<td class="number">'+fmt(l.sN1)+'</td><td class="number">'+fmt(l.sN)+'</td>'+
                '<td class="number"><b>'+fmt(l.v)+'</b></td>'+
                '<td class="number">'+l.pct.toFixed(1)+'%</td>'+
                '<td class="number">'+poids.toFixed(1)+'%</td>'+
                '<td><input type="text" class="cyc-com" value="'+com+'" placeholder="Justification / travaux effectués" '+
                    'onchange="cycComSet(\''+esc(l.compte)+'\', this.value)"></td></tr>';
        });

        var sN = 0, sN1 = 0;
        rows.forEach(function(r){ if(cycleOf(r.compte) === c.id) sN += cycSolde(r); });
        rowsN1.forEach(function(r){ if(cycleOf(r.compte) === c.id) sN1 += cycSolde(r); });
        corps += '<tr class="cyc-soustotal"><td colspan="3"><b>Sous-total cycle '+esc(c.nom)+' (balances compl\u00e8tes)</b></td>'+
                 '<td class="number"><b>'+fmt(sN1)+'</b></td><td class="number"><b>'+fmt(sN)+'</b></td>'+
                 '<td class="number"><b>'+fmt(sN - sN1)+'</b></td><td colspan="3"></td></tr>';
        corps += '</table></div></div>';
    });

    setText('cycv-nb-alertes', totAlertes);
    setText('cycv-nb-com', Object.keys(CYC_COM).length);
    el.innerHTML = syn + corps;
}

