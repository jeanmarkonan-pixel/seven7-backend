// ============================================================
// TFT — TABLEAU DES FLUX DE TRESORERIE (méthode indirecte)
// Réutilise entièrement le moteur ACTIF/PASSIF/RESULTAT ci-dessus :
// aucune nouvelle table de mapping n'est nécessaire, seules les
// notions d'OUVERTURE et de CLOTURE de chaque poste sont combinées.
// ============================================================

// Index ref -> feuille (actif/passif), construit une seule fois.
var LIASSE_BS_INDEX = null;
function liasseBuildBSIndex(){
    if(LIASSE_BS_INDEX) return LIASSE_BS_INDEX;
    var idx = {actifMap:{}, passifMap:{}};
    LIASSE_DATA.actifLines.forEach(function(l){ idx.actifMap[l.ref] = l; });
    LIASSE_DATA.passifLines.forEach(function(l){ idx.passifMap[l.ref] = l; });
    LIASSE_BS_INDEX = idx;
    return idx;
}

// Valeur NETTE d'un poste de bilan (ref ACTIF ou PASSIF), à l'ouverture ou à la clôture
// de l'exercice 'ex' ('n' ou 'n1').
function liasseBSNet(ex, ref, which){
    var idx = liasseBuildBSIndex();
    if(idx.actifMap[ref]) return (liasseGetActif(ex, which)[ref] || {net:0}).net;
    if(idx.passifMap[ref]) return (liasseGetPassif(ex, undefined, which)[ref] || {net:0}).net;
    return 0;
}

// Clôture du poste 'ref' pour l'exercice 'ex' : c'est toujours la clôture de SA propre balance.
function liasseBSClosingNet(ex, ref){
    return liasseBSNet(ex, ref, 'closing');
}
// Ouverture du poste 'ref' pour l'exercice 'ex' :
//  - pour ex='n'  : ouverture N = clôture N-1 (comparaison entre les deux balances saisies)
//  - pour ex='n1' : ouverture N-1 = colonne "Ouverture" propre de la balance N-1
function liasseBSOpeningNet(ex, ref){
    if(ex === 'n') return liasseBSNet('n1', ref, 'closing');
    return liasseBSNet('n1', ref, 'opening');
}
// Variation (clôture - ouverture) du poste 'ref', pour la colonne d'exercice 'ex'.
function liasseBSVariation(ex, ref){
    return liasseBSClosingNet(ex, ref) - liasseBSOpeningNet(ex, ref);
}

// Somme des MOUVEMENTS de l'exercice (colonnes 'md'/'mc' de la balance) pour les comptes
// rattachés à une liste de REF donnée sur la colonne 'brut' (utilisé pour les acquisitions/
// cessions d'immobilisations : le mouvement débit = augmentation brute, le mouvement
// crédit = diminution brute (cession, mise au rebut) de l'exercice).
// Solde d'un compte (préfixe brut, ex: '654', '676', '766') sur la balance de l'exercice 'ex',
// à l'ouverture ou à la clôture — s'appuie sur les fonctions SD()/SC() déjà utilisées ailleurs
// dans l'application (moteur balance générale).
function liasseRawNet(ex, prefix, which){
    var rows = (typeof balanceData !== 'undefined' && balanceData[ex]) ? balanceData[ex] : [];
    var dField = (which === 'opening') ? 'od' : 'sd';
    var cField = (which === 'opening') ? 'oc' : 'sc';
    var sd = 0, sc = 0;
    for(var i=0;i<rows.length;i++){
        var c = String(rows[i].compte || '').trim();
        if(c.indexOf(prefix) !== 0) continue;
        sd += parseNum(rows[i][dField]) || 0;
        sc += parseNum(rows[i][cField]) || 0;
    }
    return {sd:sd, sc:sc};
}
// Montant "charge" (débiteur) d'un compte de classe 6 pour l'exercice 'ex' (flux annuel = solde
// de clôture, les comptes de gestion étant remis à zéro chaque exercice).
function liasseChargeAmt(ex, prefix){
    var v = liasseRawNet(ex, prefix, 'closing');
    return v.sd - v.sc;
}
// Montant "produit" (créditeur) d'un compte de classe 7 pour l'exercice 'ex'.
function liasseProduitAmt(ex, prefix){
    var v = liasseRawNet(ex, prefix, 'closing');
    return v.sc - v.sd;
}
// Variation (clôture - ouverture) du solde NET (créditeur - débiteur) d'un groupe de comptes
// identifiés par leurs préfixes exacts (utilisé pour isoler comptes 161/162/1661/1662 dans DA).
function liasseRawVariation(ex, prefixList){
    function netAt(exercice, which){
        var sd=0, sc=0;
        prefixList.forEach(function(p){
            var v = liasseRawNet(exercice, p, which);
            sd += v.sd; sc += v.sc;
        });
        return sc - sd;
    }
    var opening = (ex === 'n') ? netAt('n1','closing') : netAt('n1','opening');
    var closing = netAt(ex, 'closing');
    return closing - opening;
}

// ---------- Capacité d'Autofinancement Globale (CAFG) — NOTE 34 ----------
function liasseGetCAFG(ex){
    var R = liasseGetResultat(ex);
    var valComptableCessionCourante = liasseChargeAmt(ex, '654');
    var produitCessionCourante = liasseProduitAmt(ex, '754');
    var cafe = R.XD + valComptableCessionCourante - produitCessionCourante; // CAFG d'exploitation
    var gainsChange = liasseProduitAmt(ex, '766');
    var pertesChange = liasseChargeAmt(ex, '676');
    var cafg = cafe
        + R.TK                 // Revenus financiers et assimilés
        + gainsChange           // Gains de change financiers (cpte 766)
        + R.TM                  // Transferts de charges financières
        + (R.TN + R.TO)          // Produits HAO
        - R.RM                   // Frais financiers et charges assimilées
        - pertesChange           // Pertes de change financières (cpte 676)
        - (R.RO + R.RP)          // Charges HAO
        - R.RQ                   // Participation des travailleurs
        - R.RS;                  // Impôts sur le résultat
    return cafg;
}

// ---------- TFT complet pour un exercice donné ('n' = colonne N, 'n1' = colonne N-1) ----------
function liasseGetTFT(){
    return { n: liasseGetTFTColumn('n'), n1: liasseGetTFTColumn('n1') };
}

// ---------- RESULTAT : formules officielles DGI (feuille RESULTAT) ----------
function liasseGetResultat(ex){
    var R = {};
    var signByRef = {};
    LIASSE_DATA.resultatLines.forEach(function(l){ signByRef[l.ref] = l.sign; });
    function leaf(ref){
        var sign = signByRef[ref];
        var sens = (sign === '+') ? 'SC-SD' : 'SD-SC';
        return liasseSumByRef(ex, ref, 'net', sens);
    }
    ['TA','RA','RB','TB','TC','TD','TE','TF','TG','TH','TI','RC','RD','RE','RF','RG','RH','RI','RJ',
     'RK','TJ','RL','TK','TL','TM','RM','RN','TN','TO','RO','RP','RQ','RS'].forEach(function(ref){
        R[ref] = leaf(ref);
    });
    R.XA = R.TA - R.RA - R.RB;
    R.XB = R.TA + R.TB + R.TC + R.TD;
    R.XC = (R.TE+R.TF+R.TG+R.TH+R.TI) - R.RC-R.RD-R.RE-R.RF-R.RG-R.RH-R.RI-R.RJ + R.XA + R.TB+R.TC+R.TD;
    R.XD = R.XC - R.RK;
    R.XE = R.XD + R.TJ - R.RL;
    R.XF = R.TK + R.TL + R.TM - R.RM - R.RN;
    R.XG = R.XE + R.XF;
    R.XH = R.TN + R.TO - R.RO - R.RP;
    R.XI = R.XG + R.XH - R.RQ - R.RS;
    return R;
}

function liasseFmt(n){
    n = Math.round((n||0));
    return n.toLocaleString('fr-FR', {maximumFractionDigits:0});
}

// ---------- Rendu HTML ----------
function liasseRenderActif(){
    var vN = liasseGetActif('n'), vN1 = liasseGetActif('n1');
    var rows = LIASSE_DATA.actifLines.map(function(l){
        var n = vN[l.ref] || {brut:0,amort:0,net:0};
        var n1 = vN1[l.ref] || {brut:0,amort:0,net:0};
        var cls = l.bold ? ' class="liasse-total-row"' : '';
        var pad = 10 + (l.indent||0)*14;
        return '<tr'+cls+'><td>'+l.ref+'</td><td style="padding-left:'+pad+'px;">'+l.label+'</td>'+
            '<td class="num">'+liasseFmt(n.brut)+'</td><td class="num">'+liasseFmt(n.amort)+'</td>'+
            '<td class="num">'+liasseFmt(n.net)+'</td><td class="num">'+liasseFmt(n1.net)+'</td></tr>';
    }).join('');
    return '<table class="liasse-table"><thead><tr><th>REF</th><th>ACTIF</th><th>BRUT</th><th>AMORT. / DEPREC.</th><th>NET N</th><th>NET N-1</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function liasseRenderPassif(){
    var rN = liasseGetResultat('n'), rN1 = liasseGetResultat('n1');
    var vN = liasseGetPassif('n', rN.XI), vN1 = liasseGetPassif('n1', rN1.XI);
    var rows = LIASSE_DATA.passifLines.map(function(l){
        var n = vN[l.ref] || {net:0};
        var n1 = vN1[l.ref] || {net:0};
        var cls = l.bold ? ' class="liasse-total-row"' : '';
        var pad = 10 + (l.indent||0)*14;
        return '<tr'+cls+'><td>'+l.ref+'</td><td style="padding-left:'+pad+'px;">'+l.label+'</td>'+
            '<td class="num">'+liasseFmt(n.net)+'</td><td class="num">'+liasseFmt(n1.net)+'</td></tr>';
    }).join('');
    return '<table class="liasse-table"><thead><tr><th>REF</th><th>PASSIF</th><th>NET N</th><th>NET N-1</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function liasseRenderResultat(){
    var vN = liasseGetResultat('n'), vN1 = liasseGetResultat('n1');
    var TOTALS = {XA:1,XB:1,XC:1,XD:1,XE:1,XF:1,XG:1,XH:1,XI:1};
    var rows = LIASSE_DATA.resultatLines.map(function(l){
        var cls = TOTALS[l.ref] ? ' class="liasse-total-row"' : '';
        return '<tr'+cls+'><td>'+l.ref+'</td><td>'+l.label+'</td>'+
            '<td class="num">'+liasseFmt(vN[l.ref])+'</td><td class="num">'+liasseFmt(vN1[l.ref])+'</td></tr>';
    }).join('');
    return '<table class="liasse-table"><thead><tr><th>REF</th><th>LIBELLES</th><th>EXERCICE N</th><th>EXERCICE N-1</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

// ---------- Rendu HTML : BALANCE N / N-1 (reprise de la balance générale saisie) ----------
function liasseRenderBalance(ex){
    var rows = (typeof balanceData !== 'undefined' && balanceData[ex]) ? balanceData[ex] : [];
    if(!rows.length){
        return '<div class="liasse-soon"><span class="icon">'+(ex==='n1'?'📉':'📈')+'</span>Aucune donnée.<br><small>Saisissez ou collez la balance dans l\'onglet BALANCE '+(ex==='n1'?'N-1':'N')+' de l\'interface Audit — elle apparaîtra ici automatiquement.</small></div>';
    }
    var totOd=0, totOc=0, totMd=0, totMc=0, totSd=0, totSc=0;
    var body = rows.map(function(r){
        var od=parseNum(r.od)||0, oc=parseNum(r.oc)||0, md=parseNum(r.md)||0, mc=parseNum(r.mc)||0, sd=parseNum(r.sd)||0, sc=parseNum(r.sc)||0;
        totOd+=od; totOc+=oc; totMd+=md; totMc+=mc; totSd+=sd; totSc+=sc;
        return '<tr><td>'+liasseEsc(r.compte)+'</td><td>'+liasseEsc(r.intitule)+'</td>'+
            '<td class="num">'+liasseFmt(od)+'</td><td class="num">'+liasseFmt(oc)+'</td>'+
            '<td class="num">'+liasseFmt(md)+'</td><td class="num">'+liasseFmt(mc)+'</td>'+
            '<td class="num">'+liasseFmt(sd)+'</td><td class="num">'+liasseFmt(sc)+'</td></tr>';
    }).join('');
    var foot = '<tr class="liasse-total-row"><td colspan="2">TOTAUX ('+rows.length+' comptes)</td>'+
        '<td class="num">'+liasseFmt(totOd)+'</td><td class="num">'+liasseFmt(totOc)+'</td>'+
        '<td class="num">'+liasseFmt(totMd)+'</td><td class="num">'+liasseFmt(totMc)+'</td>'+
        '<td class="num">'+liasseFmt(totSd)+'</td><td class="num">'+liasseFmt(totSc)+'</td></tr>';
    var equilibree = Math.abs(totOd-totOc) < 1 && Math.abs(totMd-totMc) < 1 && Math.abs(totSd-totSc) < 1;
    var statut = '<div class="'+(equilibree?'status-ok':'status-danger')+'" style="margin-top:10px;font-weight:700;">'+
        (equilibree ? ('BALANCE '+(ex==='n1'?'N-1':'N')+' ÉQUILIBRÉE') : ('⚠ BALANCE '+(ex==='n1'?'N-1':'N')+' EN DÉSÉQUILIBRE'))+'</div>';
    return '<table class="liasse-table"><thead><tr><th>N° COMPTE</th><th>INTITULE</th>'+
        '<th>OUVERTURE DEBIT</th><th>OUVERTURE CREDIT</th><th>MVT DEBIT</th><th>MVT CREDIT</th>'+
        '<th>SOLDE DEBITEUR</th><th>SOLDE CREDITEUR</th></tr></thead><tbody>'+body+foot+'</tbody></table>'+statut;
}
function liasseEsc(s){ return String(s===undefined||s===null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }

// ---------- Rendu HTML : TABLEAU DES FLUX DE TRESORERIE ----------
var TFT_LINES = [
    {ref:'ZA', label:'Trésorerie nette au 1er janvier (Trésorerie actif N-1 - Trésorerie passif N-1)', bold:true},
    {section:"Flux de trésorerie provenant des activités opérationnelles"},
    {ref:'FA', label:"Capacité d'Autofinancement Globale (CAFG)"},
    {ref:'FB', label:"- Variation d'actif circulant HAO (1)"},
    {ref:'FC', label:"- Variation des stocks"},
    {ref:'FD', label:"- Variation des créances"},
    {ref:'FE', label:"+ Variation du passif circulant (1)"},
    {ref:'ZB', label:"Flux de trésorerie provenant des activités opérationnelles (A) (somme FA à FE)", bold:true},
    {section:"Flux de trésorerie provenant des activités d'investissement"},
    {ref:'FF', label:"- Décaissements liés aux acquisitions d'immobilisations incorporelles"},
    {ref:'FG', label:"- Décaissements liés aux acquisitions d'immobilisations corporelles"},
    {ref:'FH', label:"- Décaissements liés aux acquisitions d'immobilisations financières"},
    {ref:'FI', label:"+ Encaissements liés aux cessions d'immobilisations incorporelles et corporelles"},
    {ref:'FJ', label:"+ Encaissements liés aux cessions d'immobilisations financières"},
    {ref:'ZC', label:"Flux de trésorerie provenant des activités d'investissement (B) (somme FF à FJ)", bold:true},
    {section:"Flux de trésorerie provenant du financement par les capitaux propres"},
    {ref:'FK', label:"+ Augmentations de capital par apports nouveaux"},
    {ref:'FL', label:"+ Subventions d'investissement reçues"},
    {ref:'FM', label:"- Prélèvements sur le capital"},
    {ref:'FN', label:"- Dividendes versés"},
    {ref:'ZD', label:"Flux de trésorerie provenant des capitaux propres (C) (somme FK à FN)", bold:true},
    {section:"Trésorerie provenant du financement par les capitaux étrangers"},
    {ref:'FO', label:"+ Emprunts (2)"},
    {ref:'FP', label:"+ Autres dettes financières diverses (3)"},
    {ref:'FQ', label:"- Remboursements des emprunts et autres dettes financières"},
    {ref:'ZE', label:"Flux de trésorerie provenant des capitaux étrangers (D) (somme FO à FQ)", bold:true},
    {ref:'ZF', label:"Flux de trésorerie provenant des activités de financement (C+D)", bold:true},
    {ref:'ZG', label:"VARIATION DE LA TRESORERIE NETTE DE LA PERIODE (A+B+C+D)", bold:true},
    {ref:'ZH', label:"Trésorerie nette au 31 Décembre", bold:true}
];
