/* ==================================================================
   SEVEN7 — LIASSE : MOTEUR ÉTAPE 2
   Branche le calcul BILAN / RÉSULTAT / TFT sur les tableaux de
   correspondance officiels saisis dans l'onglet PARAMÈTRES.
   Les fonctions ci-dessous REDÉFINISSENT celles de l'étape 1.
   ================================================================== */

/* ------------------------------------------------------------------
   1. SPECS MACHINE — traduction exploitable des colonnes "N° de comptes"
      i = comptes inclus (préfixes) | e = exclusions | s = sens du solde
      Le suffixe "p" (quote-part) est ignoré : le compte est rattaché en
      totalité et signalé dans le bloc CONFLITS.
   ------------------------------------------------------------------ */
var PARAM_SPEC = {
 /* ---- ACTIF : b = colonne BRUT, a = colonne AMORTISSEMENTS/DÉPRÉCIATIONS ---- */
 AE:{b:{i:['211','2181','2191']},                 a:{i:['2811','2818p','2911','2918p','2919p']}},
 AF:{b:{i:['212','213','214','2193']},            a:{i:['2812','2813','2814','2912','2913','2914','2919p']}},
 AG:{b:{i:['215','216']},                         a:{i:['2815','2816','2915','2916']}},
 /* 2198 « autres immobilisations incorporelles en cours » : présent au
    référentiel DGI pour AH, il manquait ici et ne résolvait NULLE PART —
    son montant quittait le bilan, qui cessait alors d'équilibrer.
    2949 relève désormais du module de répartition (43-repartition.js) :
    l'exclusion ci-dessous ne vaut que comme repli tant qu'aucun
    arbitrage n'a été rendu. */
 AH:{b:{i:['217','218','2198'],e:['2181']},       a:{i:['2817','2818p','2917','2918p','2919p']}},
 AJ:{b:{i:['22']},                                a:{i:['282','292']}},
 AK:{b:{i:['231','232','233','237','2391']},      a:{i:['2831','2832','2833','2837','2931','2932','2933','2937','2939p']}},
 AL:{b:{i:['234','235','238','2392','2393']},     a:{i:['2834','2835','2838','2934','2935','2938','2939p']}},
 AM:{b:{i:['24'],e:['245','2495']},               a:{i:['284','294'],e:['2845','2945','2949p']}},
 AN:{b:{i:['245','2495']},                        a:{i:['2845','2945','2949p']}},
 AP:{b:{i:['251','252']},                         a:{i:['2951','2952']}},
 AR:{b:{i:['26']},                                a:{i:['296']}},
 AS:{b:{i:['27']},                                a:{i:['297']}},
 BA:{b:{i:['485','488']},                         a:{i:['498']}},
 BB:{b:{i:['31','32','33','34','35','36','37','38']}, a:{i:['39']}},
 /* 40x et 41x : ventilation par le SENS du solde (règle de présentation SYSCOHADA)
    — un compte fournisseur débiteur remonte à l'actif (BH), un compte client
    créditeur remonte au passif (DI). Voir bloc P6.                            */
 BH:{b:{i:['40'],s:'SD'},                         a:{i:['490']}},
 BI:{b:{i:['41'],s:'SD'},                         a:{i:['491']}},
 BJ:{b:{i:['185','42','43','44','45','46','47'],e:['478','479'],s:'SD'},
                                                  a:{i:['492','493','494','495','496','497']}},
 BQ:{b:{i:['50']},                                a:{i:['590']}},
 BR:{b:{i:['51']},                                a:{i:['591']}},
 BS:{b:{i:['52','53','54','55','57','581','582'],s:'SD'}, a:{i:['592','593','594']}},
 BU:{b:{i:['478']}},

 /* ---- PASSIF : n = colonne NET ---- */
 CA:{n:{i:['101','102','103','104']}},
 CB:{n:{i:['109']}},
 CD:{n:{i:['105']}},
 CE:{n:{i:['106']}},
 CF:{n:{i:['111','112','113']}},
 CG:{n:{i:['118']}},
 CH:{n:{i:['12']}},
 CJ:{n:{i:['13']}},
 CL:{n:{i:['14']}},
 CM:{n:{i:['15']}},
 DA:{n:{i:['16','181','182','183','184']}},
 DB:{n:{i:['17']}},
 DC:{n:{i:['19']}},
 DH:{n:{i:['481','482','484','4998']}},
 DI:{n:{i:['41'],s:'SC'}},
 DJ:{n:{i:['40'],s:'SC'}},
 DK:{n:{i:['42','43','44'],s:'SC'}},
 DM:{n:{i:['185','45','46','47'],e:['479','478'],s:'SC'}},
 DN:{n:{i:['499','599'],e:['4998']}},
 DQ:{n:{i:['564','565']}},
 DR:{n:{i:['52','53','561','566'],s:'SC'}},
 DV:{n:{i:['479']}},

 /* ---- COMPTE DE RÉSULTAT ---- */
 TA:{n:{i:['701']}},  RA:{n:{i:['601']}},  RB:{n:{i:['6031']}},
 TB:{n:{i:['702','703','704']}},  TC:{n:{i:['705','706']}},  TD:{n:{i:['707']}},
 TE:{n:{i:['73']}},   TF:{n:{i:['72']}},   TG:{n:{i:['71']}},
 TH:{n:{i:['75']}},   TI:{n:{i:['781']}},
 RC:{n:{i:['602']}},  RD:{n:{i:['6032']}}, RE:{n:{i:['604','605','608']}},
 RF:{n:{i:['6033']}}, RG:{n:{i:['61']}},   RH:{n:{i:['62','63']}},
 RI:{n:{i:['64']}},   RJ:{n:{i:['65']}},   RK:{n:{i:['66']}},
 TJ:{n:{i:['791','798','799']}},          RL:{n:{i:['681','691']}},
 TK:{n:{i:['77']}},   TL:{n:{i:['797']}},  TM:{n:{i:['787']}},
 RM:{n:{i:['67']}},   RN:{n:{i:['697']}},
 TN:{n:{i:['82']}},   TO:{n:{i:['84','86','88']}},
 RO:{n:{i:['81']}},   RP:{n:{i:['83','85']}},
 RQ:{n:{i:['87']}},   RS:{n:{i:['89']}}
};

/* Colonne cible de chaque clé de spec */
var PARAM_SPECKEY_COL = {b:'brut', a:'amort', n:'net'};

/* ------------------------------------------------------------------
   2. INDEX DE RÉSOLUTION — table préfixe → candidats
   ------------------------------------------------------------------ */
var PARAM_INDEX = null;
var PARAM_CONFLITS = [];

function paramNormTok(t){ return String(t).replace(/[^0-9]/g,''); }
function paramIsPart(t){ return /p$/i.test(String(t)); }

function paramBuildIndex(){
    if(PARAM_INDEX) return PARAM_INDEX;
    var byLen = {};
    PARAM_CONFLITS = [];
    Object.keys(PARAM_SPEC).forEach(function(ref){
        var spec = PARAM_SPEC[ref];
        Object.keys(spec).forEach(function(k){
            var col = PARAM_SPECKEY_COL[k];
            if(!col) return;
            var s = spec[k];
            var excl = (s.e || []).map(paramNormTok);
            (s.i || []).forEach(function(tok){
                var p = paramNormTok(tok);
                if(!p) return;
                var L = p.length;
                if(!byLen[L]) byLen[L] = {};
                if(!byLen[L][p]) byLen[L][p] = [];
                var already = byLen[L][p];
                // conflit : même préfixe déjà revendiqué pour la même colonne sans distinction de sens
                for(var z=0; z<already.length; z++){
                    if(already[z].col === col && !already[z].sens && !s.s){
                        PARAM_CONFLITS.push({prefix:p, col:col, refs:[already[z].ref, ref],
                            motif: paramIsPart(tok) ? 'Quote-part « p » : le compte est rattaché en totalité au premier poste déclaré.'
                                                    : 'Préfixe revendiqué par deux postes sur la même colonne.'});
                    }
                }
                already.push({ref:ref, col:col, sens:s.s || null, excl:excl});
            });
        });
    });
    PARAM_INDEX = byLen;
    return byLen;
}

/* Résolution d'un numéro de compte : préfixe le plus long, exclusions
   respectées, arbitrage par le sens réel du solde si nécessaire.      */
function paramResolve(compte, sd, sc){
    var raw = String(compte === undefined || compte === null ? '' : compte).trim();
    var m = raw.match(/^\d+/);
    if(!m) return null;
    var digits = m[0];
    var tables = paramBuildIndex();
    var net = (parseNum(sd) || 0) - (parseNum(sc) || 0);
    var maxLen = Math.min(digits.length, 12);
    for(var len = maxLen; len >= 2; len--){
        var table = tables[len];
        if(!table) continue;
        var cands = table[digits.substring(0, len)];
        if(!cands) continue;
        var usable = [];
        for(var i=0;i<cands.length;i++){
            var c = cands[i], skip = false;
            for(var j=0;j<c.excl.length;j++){
                if(digits.indexOf(c.excl[j]) === 0){ skip = true; break; }
            }
            if(!skip) usable.push(c);
        }
        if(!usable.length) continue;
        if(usable.length === 1) return usable[0];
        // arbitrage par le sens du solde (BJ/DK/DM, BS/DR…)
        for(var k=0;k<usable.length;k++){
            if(usable[k].sens === 'SD' && net >= 0) return usable[k];
            if(usable[k].sens === 'SC' && net <  0) return usable[k];
        }
        for(var q=0;q<usable.length;q++){ if(!usable[q].sens) return usable[q]; }
        return usable[0];
    }
    return null;
}

/* Compatibilité : l'ancienne signature reste utilisable (export XML, etc.) */
function liasseFindRef(compte, sd, sc){ return paramResolve(compte, sd, sc); }

/* ------------------------------------------------------------------
   3. AGRÉGATION SUR LA BALANCE — remplace liasseSumByRef / mouvements
   ------------------------------------------------------------------ */
function paramRows(ex){
    return (typeof balanceData !== 'undefined' && balanceData[ex]) ? balanceData[ex] : [];
}
function liasseSumByRef(ex, ref, col, sens, which){
    var rows = paramRows(ex);
    var dF = (which === 'opening') ? 'od' : 'sd';
    var cF = (which === 'opening') ? 'oc' : 'sc';
    var total = 0;
    for(var i=0;i<rows.length;i++){
        var sd = parseNum(rows[i][dF]) || 0;
        var sc = parseNum(rows[i][cF]) || 0;
        var m = paramResolve(rows[i].compte, sd, sc);
        if(!m || m.col !== col) continue;
        var montant = (sens === 'SC-SD') ? (sc - sd) : (sd - sc);

        /* Comptes revendiqués par plusieurs postes (suffixe « p ») : si
           l'auditeur a arbitré leur répartition, le montant se ventile
           selon sa décision. Sinon repQuoteParts rend null et le compte
           reste rattaché au premier poste déclaré — le total du bilan
           demeure juste, la ventilation est signalée comme approchée.
           Voir src/js/43-repartition.js. */
        var parts = (typeof repQuoteParts === 'function') ? repQuoteParts(rows[i].compte) : null;
        if(parts){
            if(parts[ref]) total += montant * parts[ref];
            continue;
        }
        if(m.ref !== ref) continue;
        total += montant;
    }
    return total;
}
function liasseSumMovementByRef(ex, refList, field){
    var rows = paramRows(ex);
    var total = 0;
    for(var i=0;i<rows.length;i++){
        var m = paramResolve(rows[i].compte, rows[i].sd, rows[i].sc);
        if(!m || m.col !== 'brut' || refList.indexOf(m.ref) === -1) continue;
        total += parseNum(rows[i][field]) || 0;
    }
    return total;
}

/* ------------------------------------------------------------------
   4. PRIMITIVES DE LA PLANCHE TFT : sd / sc / mvt débit / mvt crédit
      'when' : 'cur'  = colonnes de clôture (sd, sc)
               'prev' = situation N-1 (clôture de la balance N-1 si ex='n',
                        colonnes d'ouverture de la balance N-1 si ex='n1')
   ------------------------------------------------------------------ */
function paramCtx(ex, when){
    if(when !== 'prev') return {ex:ex, d:'sd', c:'sc'};
    if(ex === 'n')  return {ex:'n1', d:'sd', c:'sc'};
    return {ex:'n1', d:'od', c:'oc'};
}
function paramMatchList(compte, list, excl){
    var m = String(compte === undefined || compte === null ? '' : compte).trim().match(/^\d+/);
    if(!m) return false;
    var digits = m[0], i;
    if(excl){ for(i=0;i<excl.length;i++){ if(digits.indexOf(excl[i]) === 0) return false; } }
    for(i=0;i<list.length;i++){ if(digits.indexOf(String(list[i])) === 0) return true; }
    return false;
}
/* somme des SOLDES DÉBITEURS */
function tSD(ex, list, when, excl){
    var c = paramCtx(ex, when), rows = paramRows(c.ex), t = 0;
    for(var i=0;i<rows.length;i++){ if(paramMatchList(rows[i].compte, list, excl)) t += parseNum(rows[i][c.d]) || 0; }
    return t;
}
/* somme des SOLDES CRÉDITEURS */
function tSC(ex, list, when, excl){
    var c = paramCtx(ex, when), rows = paramRows(c.ex), t = 0;
    for(var i=0;i<rows.length;i++){ if(paramMatchList(rows[i].compte, list, excl)) t += parseNum(rows[i][c.c]) || 0; }
    return t;
}
/* somme des MOUVEMENTS DÉBIT de l'exercice */
function tMD(ex, list, excl){
    var rows = paramRows(ex), t = 0;
    for(var i=0;i<rows.length;i++){ if(paramMatchList(rows[i].compte, list, excl)) t += parseNum(rows[i].md) || 0; }
    return t;
}
/* somme des MOUVEMENTS CRÉDIT de l'exercice */
function tMC(ex, list, excl){
    var rows = paramRows(ex), t = 0;
    for(var i=0;i<rows.length;i++){ if(paramMatchList(rows[i].compte, list, excl)) t += parseNum(rows[i].mc) || 0; }
    return t;
}
/* Valeur d'un poste de bilan : col = 'brut' | 'net' ; when = 'cur' | 'prev' */
function tPoste(ex, refs, col, when){
    var idx = liasseBuildBSIndex();
    var target = (when === 'prev')
        ? ((ex === 'n') ? {e:'n1', w:'closing'} : {e:'n1', w:'opening'})
        : {e:ex, w:'closing'};
    var A = null, P = null, t = 0;
    for(var i=0;i<refs.length;i++){
        var r = refs[i], v;
        if(idx.actifMap[r]){ if(!A) A = liasseGetActif(target.e, target.w); v = A[r]; }
        else if(idx.passifMap[r]){ if(!P) P = liasseGetPassif(target.e, undefined, target.w); v = P[r]; }
        if(v) t += (col === 'brut') ? (v.brut || 0) : (v.net || 0);
    }
    return t;
}

/* Les colonnes MOUVEMENTS sont-elles renseignées dans la balance ? */
function paramMouvementsDispos(ex){
    var rows = paramRows(ex);
    for(var i=0;i<rows.length;i++){
        if((parseNum(rows[i].md)||0) !== 0 || (parseNum(rows[i].mc)||0) !== 0) return true;
    }
    return false;
}

/* ------------------------------------------------------------------
   5. TFT — FORMULES OFFICIELLES DE LA PLANCHE (p.49-51)
   ------------------------------------------------------------------ */
function liasseGetTFTColumn(ex){
    var T = {}, R = liasseGetResultat(ex);

    /* ZA — Trésorerie nette au 1er janvier N */
    T.ZA = tPoste(ex, ['BQ','BR','BS'], 'net', 'prev')
         - tPoste(ex, ['DQ','DR'], 'net', 'prev')
         - tSC(ex, ['4726'], 'prev');

    /* FA — CAFG : [XD + XF(1) + TO(2)] - [RP(3) + RQ + RS] + sd 654 - sc 754 */
    var XF1 = R.TK + R.TM - R.RM;                          // XF hors TL et RN  (renvoi 1)
    var TO2 = tSC(ex, ['84','88'], 'cur') - tSD(ex, ['84','88'], 'cur'); // TO hors 86 (renvoi 2)
    var RP3 = tSD(ex, ['83'], 'cur') - tSC(ex, ['83'], 'cur');           // RP hors 85 (renvoi 3)
    T.FA = (R.XD + XF1 + TO2) - (RP3 + R.RQ + R.RS)
         + tSD(ex, ['654'], 'cur') - tSC(ex, ['754'], 'cur');

    /* FB — Actif circulant HAO (signe -)
       Planche officielle, page 49 :
         Net bilan actif_N [BA] − net bilan actif_(N-1) [BA]
         + sd_(N-1) 485 − sd_N 485
         + sd_N 4781 − sc_N 4791 + sc_N 4793 − sd_N 4783
       Les quatre derniers termes portent le renvoi 4, « quote-part liée aux
       HAO » : seule la fraction HAO de ces comptes d'écart de conversion
       devrait entrer ici. Le moteur les prend en totalité, faute de règle de
       répartition — même limite que les comptes suffixés « p » (voir P6).

       La version antérieure omettait 4781, lisait 4791 en solde débiteur au
       lieu de créditeur, et inversait les signes de 4793 et 4783. Sans effet
       sur MTTCI, où FB = 0 : aucun compte 478/479 n'y figure. */
    var vFB = tPoste(ex, ['BA'], 'net', 'cur') - tPoste(ex, ['BA'], 'net', 'prev')
            + tSD(ex, ['485'], 'prev') - tSD(ex, ['485'], 'cur')
            + tSD(ex, ['4781'], 'cur') - tSC(ex, ['4791'], 'cur')
            + tSC(ex, ['4793'], 'cur') - tSD(ex, ['4783'], 'cur');
    T.FB = vFB;   /* affichage en variation brute, conforme à la liasse DGI de référence */

    /* FC — Variation des stocks (signe -) */
    T.FC = tPoste(ex, ['BB'], 'net', 'cur') - tPoste(ex, ['BB'], 'net', 'prev');

    /* FD — Variation des créances (signe -) */
    var LC = ['414','4494','458','461','467','475'];
    var vFD = tPoste(ex, ['BH','BI','BJ'], 'net', 'cur') - tPoste(ex, ['BH','BI','BJ'], 'net', 'prev')
            + tSD(ex, LC, 'prev') - tSD(ex, LC, 'cur')
            + tSD(ex, ['4791'], 'cur') - tSC(ex, ['4791'], 'cur')
            + tMD(ex, ['2714']);
    T.FD = vFD;

    /* FE — Variation du passif circulant (signe +) */
    var LP = ['434','461','465','4726','481','482'];
    T.FE = tPoste(ex, ['DP'], 'net', 'cur') - tPoste(ex, ['DP'], 'net', 'prev')
         + tSC(ex, LP, 'prev') - tSC(ex, LP, 'cur')
         + tSC(ex, ['4793'], 'cur') - tSD(ex, ['4783'], 'cur')
         + tMC(ex, ['4752']) - tMD(ex, ['4752']);

    /* FB, FC, FD sont présentés en variation brute : leur contribution à la
       trésorerie est de signe opposé (une hausse de créances consomme du cash). */
    T.ZB = T.FA - T.FB - T.FC - T.FD + T.FE;

    /* FF — Acquisitions d'immobilisations incorporelles (signe -) */
    var FFin  = ['251','4041','4046','4811','48161','48171','48181'];
    var FFout = ['251','4041','4046','4811','48161','48171','48181','4821'];
    var vFF = tPoste(ex, ['AD'], 'brut', 'cur') - tPoste(ex, ['AD'], 'brut', 'prev')
            + tSD(ex, ['6541','811'], 'cur')
            + tMD(ex, FFin) - tMC(ex, FFout);
    T.FF = -vFF;

    /* FG — Acquisitions d'immobilisations corporelles (signe -) */
    var FGin  = ['4042','4047','4812','48162','48172','4822','48182','284'];
    var FGout = ['17','1984','4042','4047','4812','48162','48172','4822','48182','1068','1548'];
    var vFG = tPoste(ex, ['AI','AP'], 'brut', 'cur') - tPoste(ex, ['AI','AP'], 'brut', 'prev')
            + tSD(ex, ['6542','812'], 'cur')
            + tMC(ex, ['252']) - tMD(ex, ['252'])
            + tMD(ex, FGin) - tMC(ex, FGout);
    T.FG = -vFG;

    /* FH — Acquisitions d'immobilisations financières (signe -) */
    var vFH = tSD(ex, ['4782'], 'cur') - tSC(ex, ['4792'], 'cur')
            + tMD(ex, ['26','27','4813'], ['2714','276']) - tMC(ex, ['106','154','4813']);
    T.FH = -vFH;

    /* FI — Cessions d'immobilisations incorporelles et corporelles (signe +)
       Planche : sc_N [754, 821, 822] + mvt crédit_N [414, 485] − mvt débit_N [414, 485]

       4856 « créances sur cessions d'immobilisations financières » est exclu :
       sans cela il serait compté deux fois, ici par le préfixe 485 et à
       nouveau en FJ, qui le nomme explicitement. Les renvois imprimés sur ces
       deux lignes sont décalés — le 11 « relatif aux immobilisations
       financières » figure sur FI, qui traite des incorporelles et des
       corporelles, tandis que le 12 « à l'exception du compte 4856 » figure
       sur FJ, qui doit précisément le retenir. Même décalage de renvoi qu'en
       FH. L'exclusion retenue ici est la seule lecture qui évite le double
       emploi ; non vérifiable sur MTTCI, où FI et FJ valent 0. */
    T.FI = tSC(ex, ['754','821','822'], 'cur')
         + tMC(ex, ['414','485'], ['4856']) - tMD(ex, ['414','485'], ['4856']);

    /* FJ — Cessions d'immobilisations financières (signe +) */
    T.FJ = tSC(ex, ['826'], 'cur') + tMC(ex, ['27','4856']) - tMD(ex, ['4856']);

    T.ZC = T.FF + T.FG + T.FH + T.FI + T.FJ;

    /* FK — Augmentation de capital par apport nouveau (signe +) */
    T.FK = tSC(ex, ['101','102','1051'], 'cur') - tSC(ex, ['101','102','1051'], 'prev')
         - tSD(ex, ['109','4613','467','4581'], 'cur')
         + tMC(ex, ['103','104','11','12','139','4619','465'])
         - tMD(ex, ['11','12','131']);

    /* FL — Subventions d'investissement reçues (signe +) */
    T.FL = tSC(ex, ['14'], 'cur') - tSC(ex, ['14'], 'prev')
         + tSC(ex, ['799'], 'cur') - tSD(ex, ['4494','4582'], 'cur');

    /* FM / FN — Prélèvements sur le capital, dividendes versés (signe -) */
    T.FM = -tMD(ex, ['4619','103','104']);
    T.FN = -tMD(ex, ['465']);

    T.ZD = T.FK + T.FL + T.FM + T.FN;

    /* FO / FP / FQ — Capitaux étrangers */
    T.FO = tMC(ex, ['161','162']) - tMD(ex, ['4713']) - tSD(ex, ['4784'], 'cur');
    T.FP = tMC(ex, ['163','164','165','167','168','181','182']) - tSD(ex, ['4784'], 'cur');
    T.FQ = -(tMD(ex, ['16','17','181','182']) - tSC(ex, ['4794'], 'cur'));

    T.ZE = T.FO + T.FP + T.FQ;
    T.ZF = T.ZD + T.ZE;
    T.ZG = T.ZB + T.ZC + T.ZF;

    /* ZH — Trésorerie nette au 31 décembre N, lue directement au bilan */
    T.ZH = tPoste(ex, ['BQ','BR','BS'], 'net', 'cur')
         - tPoste(ex, ['DQ','DR'], 'net', 'cur')
         - tSC(ex, ['4726'], 'cur');

    /* Contrôle d'auto-cohérence de la planche : ZA + ZG doit égaler ZH */
    T.CTRL  = T.ZH;
    T.ECART = (T.ZA + T.ZG) - T.ZH;
    T.MVT_OK = paramMouvementsDispos(ex);
    return T;
}

/* ------------------------------------------------------------------
   6. BLOC DE CONTRÔLE DU MOTEUR (affiché dans l'onglet PARAMÈTRES)
   ------------------------------------------------------------------ */
function paramRenderMoteur(){
    paramBuildIndex();
    var rows = '';
    Object.keys(PARAM_SPEC).forEach(function(ref){
        var spec = PARAM_SPEC[ref];
        Object.keys(spec).forEach(function(k){
            var col = PARAM_SPECKEY_COL[k]; if(!col) return;
            var s = spec[k];
            rows += '<tr><td>'+ref+'</td><td style="text-align:center;">'+col.toUpperCase()+'</td>'+
                '<td class="param-formula">'+(s.i||[]).join(', ')+'</td>'+
                '<td class="param-formula">'+((s.e||[]).join(', ') || '—')+'</td>'+
                '<td style="text-align:center;">'+(s.s || '—')+'</td></tr>';
        });
    });
    var conf = PARAM_CONFLITS.map(function(c){
        return '<tr><td>'+c.prefix+'</td><td style="text-align:center;">'+c.col.toUpperCase()+'</td>'+
               '<td>'+c.refs.join(' / ')+'</td><td>'+c.motif+'</td></tr>';
    }).join('');
    var confBloc = conf
      ? '<div class="param-block param-block-warn" style="margin-top:18px;"><div class="param-block-title">⚠ QUOTES-PARTS ET PRÉFIXES PARTAGÉS — ARBITRAGE AUTOMATIQUE</div>'+
        '<table class="liasse-table param-table"><thead><tr><th>PRÉFIXE</th><th>COLONNE</th><th>POSTES</th><th>TRAITEMENT APPLIQUÉ</th></tr></thead><tbody>'+conf+'</tbody></table></div>'
      : '';
    return '<table class="liasse-table param-table"><thead><tr><th style="width:52px;">RÉF</th><th style="width:80px;">COLONNE</th>'+
        '<th>COMPTES RATTACHÉS PAR LE MOTEUR</th><th style="width:140px;">EXCLUSIONS</th><th style="width:60px;">SENS</th></tr></thead><tbody>'+
        rows+'</tbody></table>'+confBloc;
}

/* ------------------------------------------------------------------
   7. RENDU TFT — reprend la présentation existante et ajoute le
      diagnostic de disponibilité des colonnes MOUVEMENTS.
   ------------------------------------------------------------------ */
function liasseRenderTFT(){
    var T = liasseGetTFT();
    var rows = TFT_LINES.map(function(l){
        if(l.section) return '<tr><td colspan="4" style="background:#f4f1ea;font-weight:700;color:#1B2A4A;">'+l.section+'</td></tr>';
        var cls = l.bold ? ' class="liasse-total-row"' : '';
        var vn = T.n[l.ref] || 0, vn1 = T.n1[l.ref] || 0;
        return '<tr'+cls+'><td>'+l.ref+'</td><td>'+l.label+'</td>'+
            '<td class="num">'+liasseFmt(vn)+'</td><td class="num">'+liasseFmt(vn1)+'</td></tr>';
    }).join('');
    var equilibre = Math.abs(T.n.ECART) < 1;
    var ctrl = '<div class="'+(equilibre?'status-ok':'status-danger')+'" style="margin-top:10px;font-weight:700;">'+
        (equilibre ? '\u2714 Contr\u00f4le de la planche : ZA + ZG = ZH (tr\u00e9sorerie actif N \u2212 tr\u00e9sorerie passif N \u2212 sc 4726)'
                   : '\u26a0 \u00c9cart de contr\u00f4le (ZA + ZG \u2212 ZH) : '+liasseFmt(T.n.ECART))+'</div>';
    var diag = '';
    if(!T.n.MVT_OK){
        diag = '<div class="status-danger" style="margin-top:10px;font-weight:700;">'+
            '\u26a0 Colonnes MOUVEMENTS (d\u00e9bit / cr\u00e9dit) absentes de la balance N \u2014 les lignes FF \u00e0 FQ du TFT '+
            'reposent int\u00e9gralement sur ces colonnes et resteront fausses tant qu\u2019elles ne sont pas import\u00e9es.</div>';
    }
    var notes = '<div style="font-size:11px;color:#666;margin-top:14px;line-height:1.6;">'+
        'Calcul conforme au tableau de correspondance officiel reproduit dans l\u2019onglet <b>PARAM\u00c8TRES</b> (bloc P3). '+
        'Colonne N\u22121 : la situation d\u2019ouverture est lue dans les colonnes <i>Ouverture d\u00e9bit / cr\u00e9dit</i> de la balance N\u22121 ; '+
        'les lignes reposant sur les mouvements de l\u2019exercice N\u22121 exigent que ces colonnes soient renseign\u00e9es dans la balance N\u22121.</div>';
    return '<table class="liasse-table"><thead><tr><th>REF</th><th>LIBELLES</th><th>EXERCICE N</th><th>EXERCICE N-1</th></tr></thead><tbody>'+rows+'</tbody></table>'+ctrl+diag+notes;
}

