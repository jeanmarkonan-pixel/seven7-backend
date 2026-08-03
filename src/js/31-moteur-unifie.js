/* ==================================================================
   SEVEN7 — MOTEUR UNIFIÉ

   L'application portait deux moteurs comptables en parallèle. Seul
   liasseGet* recevait les corrections de mapping ; compute* gardait
   la logique d'origine et alimentait pourtant la Planification, la
   Revue analytique, les onglets BILAN et RESULTAT, le contrôle
   d'équilibre de Détection des erreurs et genererSynthese().

   Deux écarts mesurés sur MTTCI :

     - computeBilanPassif perdait les comptes 41 créditeurs hors 419.
       k26 ne prenait que 419, k29 excluait tout le 41 : le compte
       41810000 créditeur de 113 822 444 n'était capté nulle part.
       L'onglet BILAN et Détection des erreurs annonçaient un
       déséquilibre de ce montant sur une balance pourtant équilibrée.

     - computeResultat rangeait 707 « produits accessoires » en TC
       avec 705 et 706, là où la planche officielle lui réserve TD.
       Nul en N, mais 259 481 536 mal ventilés en N-1.

   compute* devient donc une vue de liasseGet*, à la forme attendue
   par ses appelants : { lines:[{ref, poste, brut, amort, net}], total }.
   Les huit libellés de sous-total sont ceux que runRevueAnalytique()
   et updateAllCalculations() recherchent par chaîne exacte — ils font
   partie du contrat, ne pas les retoucher sans lire tests/moteurs.test.js.
   ================================================================== */

/* [réf, libellé, isTotal] — ordre de la planche DGI */
var MOTEUR_PLAN_ACTIF = [
    ['AD', 'Immobilisations incorporelles', true],
    ['AE', 'Frais de développement et de prospection', false],
    ['AF', 'Brevets, licences, logiciels et droits similaires', false],
    ['AG', 'Fonds commercial et droit au bail', false],
    ['AH', 'Autres immobilisations incorporelles', false],
    ['AI', 'Immobilisations corporelles', true],
    ['AJ', 'Terrains', false],
    ['AK', 'Bâtiments', false],
    ['AL', 'Aménagements, agencements et installations', false],
    ['AM', 'Matériel, mobilier et actifs biologiques', false],
    ['AN', 'Matériel de transport', false],
    ['AP', 'Avances et acomptes versés sur immobilisations', true],
    ['AQ', 'Immobilisations financières', true],
    ['AR', 'Titres de participation', false],
    ['AS', 'Autres immobilisations financières', false],
    ['AZ', 'TOTAL ACTIF IMMOBILISÉ', true],
    ['BA', 'Actif circulant HAO', true],
    ['BB', 'Stocks et en-cours', true],
    ['BG', 'Créances et emplois assimilés', true],
    ['BH', 'Fournisseurs, avances versées', false],
    ['BI', 'Clients', false],
    ['BJ', 'Autres créances', false],
    ['BK', 'TOTAL ACTIF CIRCULANT', true],
    ['BQ', 'Titres de placement', false],
    ['BR', 'Valeurs à encaisser', false],
    ['BS', 'Banques, chèques postaux, caisse et assimilés', false],
    ['BT', 'TOTAL TRÉSORERIE-ACTIF', true],
    ['BU', 'Écart de conversion-Actif', false],
    ['BZ', 'TOTAL GÉNÉRAL ACTIF', true]
];

var MOTEUR_PLAN_PASSIF = [
    ['CA', 'Capital', false],
    ['CB', 'Apporteurs capital non appelé (-)', false],
    ['CD', 'Primes liées au capital social', false],
    ['CE', 'Écarts de réévaluation', false],
    ['CF', 'Réserves indisponibles', false],
    ['CG', 'Réserves libres', false],
    ['CH', 'Report à nouveau (+ ou -)', false],
    ['CJ', "Résultat net de l'exercice (bénéfice + / perte -)", false],
    ['CL', "Subventions d'investissement", false],
    ['CM', 'Provisions réglementées', false],
    ['CP', 'TOTAL CAPITAUX PROPRES', true],
    ['DA', 'Emprunts et dettes financières diverses', false],
    ['DB', 'Dettes de location-acquisition', false],
    ['DC', 'Provisions pour risques et charges', false],
    ['DD', 'TOTAL DETTES FINANCIÈRES', true],
    ['DF', 'TOTAL RESSOURCES STABLES', true],
    ['DH', 'Dettes circulantes HAO', false],
    ['DI', 'Clients, avances reçues', false],
    ['DJ', "Fournisseurs d'exploitation", false],
    ['DK', 'Dettes fiscales et sociales', false],
    ['DM', 'Autres dettes', false],
    ['DN', 'Provisions pour risques et charges à court terme', false],
    ['DP', 'TOTAL PASSIF CIRCULANT', true],
    ['DQ', "Banques, crédits d'escompte", false],
    ['DR', 'Banques, établissements financiers et crédits de trésorerie', false],
    ['DT', 'TOTAL TRÉSORERIE-PASSIF', true],
    ['DV', 'Écart de conversion-Passif', false],
    ['DZ', 'TOTAL GÉNÉRAL PASSIF', true]
];

function computeBilanActif(ex){
    var A = liasseGetActif(ex);
    var L = MOTEUR_PLAN_ACTIF.map(function(p){
        var v = A[p[0]] || {};
        return {
            ref: p[0], poste: p[1],
            brut:  p[2] ? null : (v.brut  || 0),
            amort: p[2] ? null : (v.amort || 0),
            net:   v.net || 0,
            isTotal: p[2],
            isGrandTotal: p[0] === 'BZ'
        };
    });
    return { lines: L, total: (A.BZ && A.BZ.net) || 0 };
}

function computeBilanPassif(ex, resultatNet){
    var P = liasseGetPassif(ex, resultatNet);
    var L = MOTEUR_PLAN_PASSIF.map(function(p){
        var v = P[p[0]] || {};
        return {
            ref: p[0], poste: p[1], net: v.net || 0,
            isTotal: p[2],
            isGrandTotal: p[0] === 'DZ' || p[0] === 'DF'
        };
    });
    return { lines: L, total: (P.DZ && P.DZ.net) || 0 };
}

function computeResultat(ex){
    var R = liasseGetResultat(ex);
    var O = {};
    for(var k in R){ if(Object.prototype.hasOwnProperty.call(R, k)) O[k] = R[k]; }
    /* Alias hérités : CA était le mémo « chiffre d'affaires », que la
       planche officielle nomme XB ; TP était le poste des autres
       produits HAO, devenu TO. Conservés pour les appelants existants. */
    O.CA = R.XB;
    O.TP = R.TO;
    return O;
}

/* Onglet RESULTAT : réordonné et réétiqueté sur la planche officielle.
   L'ancienne version décalait TD/TE/TH/TI et présentait XB comme
   « production de l'exercice ». */
function buildResultatLines(rN, rN1){
    var PLAN = [
        ['701 (SC-SD)',              'Ventes de marchandises  (TA)', 'TA', 0],
        ['601 (SD-SC)',              'Achats de marchandises  (RA)', 'RA', 0],
        ['6031 (SD-SC)',             'Variation de stocks de marchandises  (RB)', 'RB', 0],
        ['TA-RA-RB',                 'MARGE COMMERCIALE  (XA)', 'XA', 1],
        ['702,703,704 (SC-SD)',      'Ventes de produits fabriqués  (TB)', 'TB', 0],
        ['705,706 (SC-SD)',          'Travaux, services vendus  (TC)', 'TC', 0],
        ['707 (SC-SD)',              'Produits accessoires  (TD)', 'TD', 0],
        ['TA+TB+TC+TD',              "CHIFFRE D'AFFAIRES  (XB)", 'XB', 1],
        ['73 (SC-SD)',               'Production stockée ou déstockage  (TE)', 'TE', 0],
        ['72 (SC-SD)',               'Production immobilisée  (TF)', 'TF', 0],
        ['71 (SC-SD)',               "Subventions d'exploitation  (TG)", 'TG', 0],
        ['75 (SC-SD)',               'Autres produits  (TH)', 'TH', 0],
        ['781 (SC)',                 "Transferts de charges d'exploitation  (TI)", 'TI', 0],
        ['602 (SD-SC)',              'Achats de matières premières et fournitures liées  (RC)', 'RC', 0],
        ['6032 (SD-SC)',             'Variation de stocks de matières premières  (RD)', 'RD', 0],
        ['604,605,608 (SD-SC)',      'Autres achats  (RE)', 'RE', 0],
        ['6033 (SD-SC)',             "Variation de stocks d'autres approvisionnements  (RF)", 'RF', 0],
        ['61 (SD-SC)',               'Transports  (RG)', 'RG', 0],
        ['62,63 (SD-SC)',            'Services extérieurs  (RH)', 'RH', 0],
        ['64 (SD-SC)',               'Impôts et taxes  (RI)', 'RI', 0],
        ['65 (SD-SC)',               'Autres charges  (RJ)', 'RJ', 0],
        ['XB+TE..TI-RC..RJ',         'VALEUR AJOUTÉE  (XC)', 'XC', 1],
        ['66 (SD-SC)',               'Charges de personnel  (RK)', 'RK', 0],
        ['XC-RK',                    "EXCÉDENT BRUT D'EXPLOITATION (EBE)  (XD)", 'XD', 1],
        ['791,798,799 (SC)',         "Reprises d'amortissements, provisions et dépréciations  (TJ)", 'TJ', 0],
        ['681,691 (SD)',             'Dotations aux amortissements, provisions et dépréciations  (RL)', 'RL', 0],
        ['XD+TJ-RL',                 "RÉSULTAT D'EXPLOITATION  (XE)", 'XE', 1],
        ['77 (SC)',                  'Revenus financiers et assimilés  (TK)', 'TK', 0],
        ['797 (SC)',                 'Reprises de provisions et dépréciations financières  (TL)', 'TL', 0],
        ['787 (SC)',                 'Transferts de charges financières  (TM)', 'TM', 0],
        ['67 (SD-SC)',               'Frais financiers et charges assimilées  (RM)', 'RM', 0],
        ['697 (SD)',                 'Dotations aux provisions et dépréciations financières  (RN)', 'RN', 0],
        ['TK+TL+TM-RM-RN',           'RÉSULTAT FINANCIER  (XF)', 'XF', 1],
        ['XE+XF',                    'RÉSULTAT DES ACTIVITÉS ORDINAIRES (RAO)  (XG)', 'XG', 1],
        ['82 (SC)',                  "Produits des cessions d'immobilisations  (TN)", 'TN', 0],
        ['84,86,88 (SC-SD)',         'Autres produits HAO  (TO)', 'TO', 0],
        ['81 (SD)',                  "Valeurs comptables des cessions d'immobilisations  (RO)", 'RO', 0],
        ['83,85 (SD-SC)',            'Autres charges HAO  (RP)', 'RP', 0],
        ['TN+TO-RO-RP',              'RÉSULTAT HORS ACTIVITÉS ORDINAIRES (HAO)  (XH)', 'XH', 1],
        ['87 (SD)',                  'Participation des travailleurs  (RQ)', 'RQ', 0],
        ['89 (SD)',                  'Impôts sur le résultat  (RS)', 'RS', 0],
        ['XG+XH-RQ-RS',              "RÉSULTAT NET DE L'EXERCICE (Bénéfice + / Perte -)  (XI)", 'XI', 2]
    ];
    return PLAN.map(function(p){
        return {
            ref: p[0], lib: p[1],
            n:  rN  ? (rN[p[2]]  || 0) : 0,
            n1: rN1 ? (rN1[p[2]] || 0) : 0,
            isTotal: p[3] >= 1,
            isGrandTotal: p[3] === 2
        };
    });
}

function liasseShowTab(id){
    document.querySelectorAll('.liasse-panel').forEach(function(el){ el.classList.remove('active'); });
    document.querySelectorAll('.liasse-navbtn').forEach(function(el){ el.classList.remove('active'); });
    var panel = document.getElementById(id);
    if(panel) panel.classList.add('active');
    var btn = document.querySelector('.liasse-navbtn[data-target="'+id+'"]');
    if(btn) btn.classList.add('active');
    liasseRefreshAll();
}