/* ==================================================================
   SEVEN7 — ÉTAPE 3 : ANALYSE DES ERREURS PAR CYCLE COMPTABLE
   Travaille sur les deux balances (N et N-1), sous-compte par
   sous-compte, et produit un tableau d'anomalies par cycle.
   ================================================================== */

var CYCLES = [
 {id:'IMM', nom:'Immobilisations et amortissements', ico:'🏭',
  pfx:['20','21','22','23','24','25','26','27','28','29'], couleur:'#1B2A4A'},
 {id:'STK', nom:'Stocks et variations de stocks', ico:'📦',
  pfx:['3','603'], couleur:'#6d4c1f'},
 {id:'ACH', nom:'Achats et fournisseurs', ico:'🛒',
  pfx:['40','601','602','604','605','608','61','62','63'], couleur:'#7a4b12'},
 {id:'VTE', nom:'Ventes et clients', ico:'💰',
  pfx:['41','70'], couleur:'#1f6b4a'},
 {id:'PER', nom:'Personnel', ico:'👥',
  pfx:['42','66'], couleur:'#4a2f6b'},
 {id:'FIS', nom:'Fiscal et social', ico:'🏛️',
  pfx:['43','44','64','89'], couleur:'#6b1f3a'},
 {id:'TRE', nom:'Trésorerie', ico:'🏦',
  pfx:['5'], couleur:'#0f5a6b'},
 {id:'CAP', nom:'Capitaux propres et financement', ico:'🏛',
  pfx:['10','11','12','13','14','15','16','17','18','19'], couleur:'#2c3e50'},
 {id:'REG', nom:'Comptes de régularisation et autres tiers', ico:'🔁',
  pfx:['45','46','47','48','49'], couleur:'#7a5c00'},
 {id:'HAO', nom:'Hors activités ordinaires', ico:'⚡',
  pfx:['8'], couleur:'#5a1f1f'},
 {id:'AUT', nom:'Autres comptes de gestion', ico:'📄',
  pfx:['65','67','68','69','71','72','73','75','77','78','79'], couleur:'#555'}
];

/* Rattachement d'un compte à un cycle : préfixe déclaré le plus long */
var CYC_INDEX = null;
function cycBuildIndex(){
    if(CYC_INDEX) return CYC_INDEX;
    var idx = {};
    CYCLES.forEach(function(c){
        c.pfx.forEach(function(p){
            if(!idx[p.length]) idx[p.length] = {};
            if(!idx[p.length][p]) idx[p.length][p] = c.id;
        });
    });
    CYC_INDEX = idx; return idx;
}
function cycleOf(compte){
    var m = String(compte === undefined || compte === null ? '' : compte).trim().match(/^\d+/);
    if(!m) return null;
    var d = m[0], idx = cycBuildIndex();
    for(var len = Math.min(d.length, 6); len >= 1; len--){
        if(idx[len] && idx[len][d.substring(0,len)]) return idx[len][d.substring(0,len)];
    }
    return null;
}

/* Utilitaires ----------------------------------------------------- */
function cycKey(c){ return String(c === undefined || c === null ? '' : c).trim(); }
function cycSolde(r){ return (parseNum(r.sd)||0) - (parseNum(r.sc)||0); }
function cycOuv(r){   return (parseNum(r.od)||0) - (parseNum(r.oc)||0); }
function cycMvt(r){   return (parseNum(r.md)||0) + (parseNum(r.mc)||0); }
function cycSumPfx(ex, pfxList, field){
    var rows = (typeof balanceData !== 'undefined' && balanceData[ex]) ? balanceData[ex] : [], t = 0;
    for(var i=0;i<rows.length;i++){
        var m = cycKey(rows[i].compte).match(/^\d+/); if(!m) continue;
        for(var j=0;j<pfxList.length;j++){
            if(m[0].indexOf(pfxList[j]) === 0){
                t += (field === 'solde') ? cycSolde(rows[i]) : (parseNum(rows[i][field])||0);
                break;
            }
        }
    }
    return t;
}
var CYC_GRAV = {CRITIQUE:{o:1,cls:'status-danger'}, MAJEUR:{o:2,cls:'status-warning'}, MINEUR:{o:3,cls:''}};

/* ------------------------------------------------------------------
   Batterie de tests appliquée à chaque compte du cycle
   ------------------------------------------------------------------ */
function cycTestsCompte(r, r1, seuil, cycId, mapN){
    var a = [];
    var sN = cycSolde(r), sN1 = r1 ? cycSolde(r1) : 0;
    var ouv = cycOuv(r), mvt = cycMvt(r);
    var aOuverture = (Math.abs(parseNum(r.od)||0) + Math.abs(parseNum(r.oc)||0)) > 0;
    var aMouvement = mvt > 0;

    /* T1 — cohérence arithmétique de la ligne */
    if(aOuverture || aMouvement){
        var calc = ouv + (parseNum(r.md)||0) - (parseNum(r.mc)||0);
        if(Math.abs(calc - sN) > 1){
            a.push({t:'T1 Arithmétique', g:'CRITIQUE',
                d:'Ouverture + mouvements ≠ solde de clôture (écart de '+fmt(calc - sN)+'). La ligne de balance est incohérente.'});
        }
    }
    /* T2 — continuité N-1 → N
       Les comptes 11, 12 et 13 varient normalement aux à-nouveaux du fait de
       l'affectation du résultat N-1 : l'anomalie est ramenée au niveau MINEUR. */
    var estAffectation = /^1[123]/.test(cycKey(r.compte));
    if(r1 && aOuverture && Math.abs(ouv - sN1) > 1){
        a.push({t:'T2 Continuité', g: estAffectation ? 'MINEUR' : 'CRITIQUE',
            d:'Solde de clôture N-1 ('+fmt(sN1)+') différent de l’ouverture N ('+fmt(ouv)+'), écart de '+fmt(ouv - sN1)+'.'+
              (estAffectation ? ' Variation vraisemblablement imputable à l’affectation du résultat N-1 : rapprocher du PV d’assemblée.' : '')});
    }
    /* T3 — sens anormal */
    if(!isContraActif(r.compte)){
        var att = expectedSensPCG(r.compte);
        if(att === 'D' && sN < -seuil){
            a.push({t:'T3 Sens', g:'MAJEUR', d:'Compte normalement débiteur présentant un solde créditeur.'});
        } else if(att === 'C' && sN > seuil){
            a.push({t:'T3 Sens', g:'MAJEUR', d:'Compte normalement créditeur présentant un solde débiteur.'});
        }
    }
    /* T4 — solde modifié sans mouvement */
    if(r1 && !aMouvement && Math.abs(sN - sN1) > 1){
        a.push({t:'T4 Mouvement', g: estAffectation ? 'MINEUR' : 'CRITIQUE',
            d:'Le solde a varié de '+fmt(sN - sN1)+' alors qu’aucun mouvement n’est enregistré sur l’exercice.'+
              (estAffectation ? ' Écriture d’affectation du résultat passée directement dans les à-nouveaux.' : '')});
    }
    /* T5 — compte nouveau */
    if(!r1 && Math.abs(sN) > seuil){
        a.push({t:'T5 Ouverture', g:'MINEUR', d:'Compte absent de la balance N-1 : ouverture de compte à justifier.'});
    }
    /* T6 — contrôles propres au cycle */
    if(cycId === 'ACH' && cycKey(r.compte).indexOf('40') === 0 && sN > seuil){
        a.push({t:'T6 Reclassement', g:'MAJEUR',
            d:'Fournisseur débiteur : à reclasser à l’actif en BH « Fournisseurs avances versées ».'});
    }
    if(cycId === 'VTE' && cycKey(r.compte).indexOf('41') === 0 && sN < -seuil){
        a.push({t:'T6 Reclassement', g:'MAJEUR',
            d:'Client créditeur : à reclasser au passif en DI « Clients, avances reçues ».'});
    }
    if(cycId === 'PER' && cycKey(r.compte).indexOf('42') === 0 && sN > seuil){
        a.push({t:'T6 Reclassement', g:'MAJEUR', d:'Compte de personnel débiteur : avance ou acompte à justifier, reclassement en BJ.'});
    }
    if(cycId === 'FIS' && cycKey(r.compte).indexOf('44') === 0 && sN > seuil){
        a.push({t:'T6 Reclassement', g:'MAJEUR', d:'Compte d’État débiteur (crédit de TVA ou acompte) : reclassement à l’actif en BJ.'});
    }
    if(cycId === 'TRE'){
        var d5 = cycKey(r.compte);
        if(d5.indexOf('57') === 0 && sN < -1){
            a.push({t:'T6 Caisse', g:'CRITIQUE', d:'Caisse créditrice : situation matériellement impossible, erreur d’imputation ou de saisie.'});
        } else if((d5.indexOf('52') === 0 || d5.indexOf('53') === 0) && sN < -seuil){
            a.push({t:'T6 Reclassement', g:'MAJEUR', d:'Banque créditrice : à reclasser en trésorerie-passif DR.'});
        }
    }
    if(cycId === 'REG' && cycKey(r.compte).indexOf('47') === 0 && Math.abs(sN) > seuil){
        a.push({t:'T6 Attente', g:'MAJEUR',
            d:'Compte transitoire ou d’attente non soldé à la clôture : à apurer avant arrêté des comptes.'});
    }
    if(cycId === 'CAP' && cycKey(r.compte).indexOf('101') === 0 && aMouvement){
        a.push({t:'T6 Capital', g:'MINEUR', d:'Capital mouvementé sur l’exercice : PV d’assemblée et formalités à obtenir.'});
    }
    if(cycId === 'IMM' && cycKey(r.compte).indexOf('28') === 0){
        var brutRef = '2' + cycKey(r.compte).substring(2, 4);
        var brut = cycSumPfx('n', [brutRef], 'solde');
        if(brut > 0 && (-sN) > brut + 1){
            a.push({t:'T6 Amortissement', g:'CRITIQUE',
                d:'Amortissement cumulé ('+fmt(-sN)+') supérieur à la valeur brute des comptes '+brutRef+' ('+fmt(brut)+').'});
        }
    }
    return a;
}

/* Comptes disparus : présents en N-1 avec un solde, absents en N */
function cycDisparus(cycId, mapN, rowsN1, seuil){
    var out = [];
    rowsN1.forEach(function(r1){
        if(cycleOf(r1.compte) !== cycId) return;
        if(mapN[cycKey(r1.compte)]) return;
        if(Math.abs(cycSolde(r1)) <= seuil) return;
        out.push({compte:r1.compte, intitule:r1.intitule, sN:0, sN1:cycSolde(r1),
            anos:[{t:'T7 Disparition', g:'MAJEUR',
                   d:'Compte soldé de '+fmt(cycSolde(r1))+' en N-1 et absent de la balance N : solde apuré ou compte omis.'}]});
    });
    return out;
}

/* ------------------------------------------------------------------
   Contrôles de cohérence au niveau du cycle
   ------------------------------------------------------------------ */
function cycControlesGlobaux(cycId){
    var c = [];
    if(cycId === 'IMM'){
        var dot = cycSumPfx('n', ['681'], 'solde');
        var amN = -cycSumPfx('n', ['28'], 'solde'), amN1 = -cycSumPfx('n1', ['28'], 'solde');
        c.push({lib:'Dotations aux amortissements 681 (N) comparées à la variation des amortissements cumulés 28',
                a:dot, b:amN - amN1, note:'Un écart signale une cession, une reprise ou une dotation non comptabilisée.'});
        c.push({info:true, lib:'Valeur brute des immobilisations 2 (hors 28 et 29) — variation N / N-1',
                a:cycSumPfx('n', ['20','21','22','23','24','25','26','27'], 'solde'),
                b:cycSumPfx('n1', ['20','21','22','23','24','25','26','27'], 'solde'),
                note:'Écart = acquisitions nettes des sorties de l’exercice.'});
    }
    if(cycId === 'STK'){
        var st = cycSumPfx('n', ['3'], 'solde'), st1 = cycSumPfx('n1', ['3'], 'solde');
        c.push({lib:'Variation des comptes de stocks 3 (N − N-1) comparée aux comptes 603',
                a:st - st1, b:-cycSumPfx('n', ['603'], 'solde'),
                note:'La variation du stock au bilan doit égaler l’opposé du solde des comptes 603.'});
    }
    if(cycId === 'CAP'){
        var ranN = cycSumPfx('n', ['12'], 'solde'), ranN1 = cycSumPfx('n1', ['12'], 'solde');
        var resN1 = 0; try{ resN1 = liasseGetResultat('n1').XI; }catch(e){}
        c.push({lib:'Variation du report à nouveau 12 (N − N-1) comparée au résultat net N-1',
                a:-(ranN - ranN1), b:resN1,
                note:'En l’absence de distribution ou de dotation aux réserves, l’affectation du résultat N-1 alimente le report à nouveau.'});
    }
    if(cycId === 'TRE'){
        var trN = cycSumPfx('n', ['5'], 'solde'), trN1 = cycSumPfx('n1', ['5'], 'solde');
        var zg = 0; try{ zg = liasseGetTFTColumn('n').ZG; }catch(e){}
        c.push({lib:'Variation de la trésorerie 5 (N − N-1) comparée à ZG du tableau des flux',
                a:trN - trN1, b:zg,
                note:'Les deux montants doivent être identiques : c’est le bouclage du TFT sur la balance.'});
    }
    if(cycId === 'VTE'){
        c.push({info:true, lib:'Chiffre d’affaires 70 — variation N / N-1',
                a:-cycSumPfx('n', ['70'], 'solde'), b:-cycSumPfx('n1', ['70'], 'solde'),
                note:'Comparer à la variation du poste clients pour apprécier la cohérence du délai de recouvrement.'});
    }
    if(cycId === 'PER'){
        c.push({info:true, lib:'Charges de personnel 66 — variation N / N-1',
                a:cycSumPfx('n', ['66'], 'solde'), b:cycSumPfx('n1', ['66'], 'solde'),
                note:'Rapprocher des états de paie et des déclarations CNPS.'});
    }
    return c;
}

/* ------------------------------------------------------------------
   Rendu
   ------------------------------------------------------------------ */
function runCycles(){
    var el = document.getElementById('cycles-content');
    if(!el) return;
    var rows  = (typeof balanceData !== 'undefined' && balanceData.n)  ? balanceData.n  : [];
    var rowsN1= (typeof balanceData !== 'undefined' && balanceData.n1) ? balanceData.n1 : [];
    if(!rows.length){
        el.innerHTML = '<div class="alert alert-info">Importez la balance N pour lancer l’analyse par cycle.</div>';
        return;
    }
    var champSeuil = document.getElementById('cyc-seuil');
    var seuil = (champSeuil && champSeuil.value !== '') ? parseNum(champSeuil.value) : 0;
    if(!seuil) seuil = Math.max(seuils.faible || 0, 1);

    var mapN1 = {}; rowsN1.forEach(function(r){ mapN1[cycKey(r.compte)] = r; });
    var mapN  = {}; rows.forEach(function(r){ mapN[cycKey(r.compte)] = r; });

    /* Répartition des comptes par cycle */
    var parCycle = {}, horsCycle = [];
    CYCLES.forEach(function(c){ parCycle[c.id] = []; });
    rows.forEach(function(r){
        var id = cycleOf(r.compte);
        if(id) parCycle[id].push(r); else horsCycle.push(r);
    });

    /* Analyse */
    var resultats = {}, tot = {CRITIQUE:0, MAJEUR:0, MINEUR:0};
    CYCLES.forEach(function(c){
        var lignes = [];
        parCycle[c.id].forEach(function(r){
            var r1 = mapN1[cycKey(r.compte)];
            var anos = cycTestsCompte(r, r1, seuil, c.id, mapN);
            if(anos.length){
                lignes.push({compte:r.compte, intitule:r.intitule, sN:cycSolde(r),
                             sN1:r1 ? cycSolde(r1) : 0, anos:anos});
            }
        });
        lignes = lignes.concat(cycDisparus(c.id, mapN, rowsN1, seuil));
        lignes.forEach(function(l){ l.anos.forEach(function(a){ tot[a.g]++; }); });
        lignes.sort(function(x, y){
            var gx = Math.min.apply(null, x.anos.map(function(a){ return CYC_GRAV[a.g].o; }));
            var gy = Math.min.apply(null, y.anos.map(function(a){ return CYC_GRAV[a.g].o; }));
            return gx !== gy ? gx - gy : Math.abs(y.sN) - Math.abs(x.sN);
        });
        resultats[c.id] = lignes;
    });

    /* --- Synthèse --- */
    var syn = '<table><tr><th>Cycle</th><th>Comptes</th><th>Solde N</th><th>Solde N-1</th>'+
              '<th>Variation</th><th>Critiques</th><th>Majeures</th><th>Mineures</th></tr>';
    CYCLES.forEach(function(c){
        var lst = parCycle[c.id];
        if(!lst.length && !resultats[c.id].length) return;
        var sN = 0, sN1 = 0;
        lst.forEach(function(r){ sN += cycSolde(r); });
        rowsN1.forEach(function(r){ if(cycleOf(r.compte) === c.id) sN1 += cycSolde(r); });
        var nb = {CRITIQUE:0, MAJEUR:0, MINEUR:0};
        resultats[c.id].forEach(function(l){ l.anos.forEach(function(a){ nb[a.g]++; }); });
        syn += '<tr><td><b>'+c.ico+' '+esc(c.nom)+'</b></td>'+
               '<td class="number">'+lst.length+'</td>'+
               '<td class="number">'+fmt(sN)+'</td><td class="number">'+fmt(sN1)+'</td>'+
               '<td class="number">'+fmt(sN - sN1)+'</td>'+
               '<td class="number'+(nb.CRITIQUE?' status-danger':'')+'">'+nb.CRITIQUE+'</td>'+
               '<td class="number'+(nb.MAJEUR?' status-warning':'')+'">'+nb.MAJEUR+'</td>'+
               '<td class="number">'+nb.MINEUR+'</td></tr>';
    });
    if(horsCycle.length){
        var sh = 0; horsCycle.forEach(function(r){ sh += cycSolde(r); });
        syn += '<tr><td><b>⚠ Comptes non rattachés à un cycle</b></td><td class="number">'+horsCycle.length+
               '</td><td class="number">'+fmt(sh)+'</td><td colspan="5" class="status-warning">Numéros de compte non conformes au PCG SYSCOHADA</td></tr>';
    }
    syn += '</table>';

    /* --- Un tableau par cycle --- */
    var corps = '';
    CYCLES.forEach(function(c){
        var lst = parCycle[c.id], lignes = resultats[c.id];
        if(!lst.length && !lignes.length) return;
        var ctrls = cycControlesGlobaux(c.id);
        var nbA = 0; lignes.forEach(function(l){ nbA += l.anos.length; });

        corps += '<div class="cyc-bloc"><div class="cyc-titre" style="background:'+c.couleur+';">'+
                 c.ico+' CYCLE '+esc(c.nom.toUpperCase())+
                 '<span class="cyc-badge">'+lst.length+' compte(s) · '+nbA+' anomalie(s)</span></div>';

        if(ctrls.length){
            corps += '<table class="cyc-ctrl"><tr><th>Contrôle de cohérence du cycle</th><th>Exercice N / Valeur A</th><th>Réf. de contrôle / N-1</th><th>Écart</th><th>Statut</th></tr>';
            ctrls.forEach(function(k){
                var e = k.a - k.b, ok = Math.abs(e) < Math.max(seuil, 1);
                var statut = k.info ? '<span style="color:#666;">\u2139 Indicateur</span>'
                                    : '<span class="'+(ok?'status-ok':'status-warning')+'">'+(ok?'\u2714 Coh\u00e9rent':'\u26a0 \u00c0 justifier')+'</span>';
                corps += '<tr><td>'+esc(k.lib)+'<div class="cyc-note">'+esc(k.note)+'</div></td>'+
                         '<td class="number">'+fmt(k.a)+'</td><td class="number">'+fmt(k.b)+'</td>'+
                         '<td class="number">'+fmt(e)+'</td><td>'+statut+'</td></tr>';
            });
            corps += '</table>';
        }

        corps += '<div class="scroll-table"><table><tr><th>Compte</th><th>Intitulé</th>'+
                 '<th>Solde N</th><th>Solde N-1</th><th>Variation</th><th>Test</th><th>Anomalie</th><th>Gravité</th></tr>';
        if(!lignes.length){
            corps += '<tr><td colspan="8" style="text-align:center;color:#27ae60;">✓ Aucune anomalie détectée sur ce cycle au seuil de '+fmt(seuil)+'</td></tr>';
        }
        lignes.forEach(function(l){
            l.anos.forEach(function(a, i){
                corps += '<tr>';
                if(i === 0){
                    corps += '<td rowspan="'+l.anos.length+'">'+esc(l.compte)+'</td>'+
                             '<td rowspan="'+l.anos.length+'">'+esc(l.intitule)+'</td>'+
                             '<td class="number" rowspan="'+l.anos.length+'">'+fmt(l.sN)+'</td>'+
                             '<td class="number" rowspan="'+l.anos.length+'">'+fmt(l.sN1)+'</td>'+
                             '<td class="number" rowspan="'+l.anos.length+'">'+fmt(l.sN - l.sN1)+'</td>';
                }
                corps += '<td>'+esc(a.t)+'</td><td>'+a.d+'</td>'+
                         '<td class="'+CYC_GRAV[a.g].cls+'"><b>'+a.g+'</b></td></tr>';
            });
        });
        corps += '</table></div></div>';
    });

    setText('cyc-nb-crit', tot.CRITIQUE);
    setText('cyc-nb-maj',  tot.MAJEUR);
    setText('cyc-nb-min',  tot.MINEUR);
    el.innerHTML = syn + corps;
}

