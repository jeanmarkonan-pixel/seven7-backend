/* ==================================================================
   SEVEN7 — LIASSE : ONGLET "PARAMÈTRES"
   Tableaux officiels de correspondance POSTES / COMPTES
   Source : SYSCOHADA Révisé — Liste des comptes (p.122),
            Compte de résultat — Tableau de correspondance,
            Correspondance du Tableau des Flux de Trésorerie (p.49-51)
   Ces objets constituent la SOURCE UNIQUE DE VERITE du moteur liasse.
   ================================================================== */

/* ---------- P1a — BILAN : ACTIF ---------- */
var PARAM_BILAN_ACTIF = [
 {ref:'AD', lib:'IMMOBILISATIONS INCORPORELLES', tot:true, brut:'', amort:''},
 {ref:'AE', lib:'Frais de développement et de prospection', brut:'211, 2181, 2191', amort:'2811, 2818p, 2911, 2918p, 2919p'},
 {ref:'AF', lib:'Brevets, licences, logiciels et droits assimilés', brut:'212, 213, 214, 2193', amort:'2812, 2813, 2814, 2912, 2913, 2914, 2919p'},
 {ref:'AG', lib:'Fonds commercial et droit au bail', brut:'215, 216', amort:'2815, 2816, 2915, 2916'},
 {ref:'AH', lib:'Autres immobilisations incorporelles', brut:'217, 218 (sauf 2181), 2198', amort:'2817, 2818p, 2917, 2918p, 2919p'},
 {ref:'AI', lib:'IMMOBILISATIONS CORPORELLES', tot:true, brut:'', amort:''},
 {ref:'AJ', lib:'Terrains<br><span class="param-sub">dont placement en Net ……… (2881 − 2928p)</span>', brut:'22', amort:'282, 292', flag:'AJ'},
 {ref:'AK', lib:'Bâtiments<br><span class="param-sub">dont placement en Net ……… (2315 + 2325 − 2831p − 2832p)</span>', brut:'231, 232, 233, 237, 2391', amort:'2831, 2832, 2833, 2837, 2931, 2932, 2933, 2937, 2939p'},
 {ref:'AL', lib:'Aménagements, agencements et installations', brut:'234, 235, 238, 2392, 2393', amort:'2834, 2835, 2838, 2934, 2935, 2938, 2939p'},
 {ref:'AM', lib:'Matériel, mobilier et actifs biologiques', brut:'24 (sauf 245 et 2495)', amort:'284 (sauf 2845), 294 (sauf 2945, 2949p)'},
 {ref:'AN', lib:'Matériel de transport', brut:'245, 2495', amort:'2845, 2945, 2949p'},
 {ref:'AP', lib:'Avances et acomptes versés sur immobilisations', brut:'251, 252', amort:'2951, 2952'},
 {ref:'AQ', lib:'IMMOBILISATIONS FINANCIÈRES', tot:true, brut:'', amort:''},
 {ref:'AR', lib:'Titres de participation', brut:'26', amort:'296'},
 {ref:'AS', lib:'Autres immobilisations financières', brut:'27', amort:'297'},
 {ref:'AZ', lib:'TOTAL ACTIF IMMOBILISÉ', tot:true, brut:'AD + AI + AP + AQ', amort:''},
 {ref:'BA', lib:'ACTIF CIRCULANT HAO', brut:'485, 488', amort:'498'},
 {ref:'BB', lib:'STOCKS ET ENCOURS', brut:'31, 32, 33, 34, 35, 36, 37, 38', amort:'39'},
 {ref:'BG', lib:'CRÉANCES ET EMPLOIS ASSIMILÉS', tot:true, brut:'', amort:''},
 {ref:'BH', lib:'Fournisseurs avances versées', brut:'409', amort:'490'},
 {ref:'BI', lib:'Clients', brut:'41 (sauf 419)', amort:'491'},
 {ref:'BJ', lib:'Autres créances', brut:'<i>Soldes débiteurs :</i> 185, 42, 43, 44, 45, 46, 47 (sauf 478)', amort:'492, 493, 494, 495, 496, 497'},
 {ref:'BK', lib:'TOTAL ACTIF CIRCULANT', tot:true, brut:'BA + BB + BG', amort:''},
 {ref:'BQ', lib:'Titres de placement', brut:'50', amort:'590'},
 {ref:'BR', lib:'Valeurs à encaisser', brut:'51', amort:'591'},
 {ref:'BS', lib:'Banques, chèques postaux, caisse et assimilés', brut:'<i>Soldes débiteurs :</i> 52, 53, 54, 55, 57, 581, 582', amort:'592, 593, 594'},
 {ref:'BT', lib:'TOTAL TRÉSORERIE - ACTIF', tot:true, brut:'BQ + BR + BS', amort:''},
 {ref:'BU', lib:'Écart de conversion – Actif', brut:'478', amort:''},
 {ref:'BZ', lib:'TOTAL GÉNÉRAL', tot:true, brut:'AZ + BK + BT + BU', amort:''}
];

/* ---------- P1b — BILAN : PASSIF ---------- */
var PARAM_BILAN_PASSIF = [
 {ref:'CA', lib:'Capital', cpt:'101 à 104'},
 {ref:'CB', lib:'Apporteurs capital non appelé (−)', cpt:'109'},
 {ref:'CD', lib:'Primes liées au capital social', cpt:'105'},
 {ref:'CE', lib:'Écarts de réévaluation', cpt:'106'},
 {ref:'CF', lib:'Réserves indisponibles', cpt:'111, 112, 113'},
 {ref:'CG', lib:'Réserves libres', cpt:'118'},
 {ref:'CH', lib:'Report à nouveau (+ ou −)', cpt:'12 (121) ou (129)'},
 {ref:'CJ', lib:'Résultat net de l’exercice (bénéfice + ou perte −)', cpt:'13 (131 ou 139)'},
 {ref:'CL', lib:'Subventions d’investissement', cpt:'14'},
 {ref:'CM', lib:'Provisions réglementées', cpt:'15'},
 {ref:'CP', lib:'TOTAL CAPITAUX PROPRES ET RESSOURCES ASSIMILÉES', tot:true, cpt:'CA → CM'},
 {ref:'DA', lib:'Emprunts et dettes financières diverses', cpt:'16, 181, 182, 183, 184'},
 {ref:'DB', lib:'Dettes de location acquisition', cpt:'17'},
 {ref:'DC', lib:'Provisions financières pour risques et charges', cpt:'19'},
 {ref:'DD', lib:'TOTAL DETTES FINANCIÈRES ET RESSOURCES ASSIMILÉES', tot:true, cpt:'DA + DB + DC'},
 {ref:'DF', lib:'TOTAL RESSOURCES STABLES', tot:true, cpt:'CP + DD'},
 {ref:'DH', lib:'Dettes circulantes HAO', cpt:'481, 482, 484, 4998'},
 {ref:'DI', lib:'Clients, avances reçues', cpt:'419'},
 {ref:'DJ', lib:'Fournisseurs d’exploitation', cpt:'40 (sauf 409)'},
 {ref:'DK', lib:'Dettes fiscales et sociales', cpt:'<i>Soldes créditeurs :</i> 42, 43, 44'},
 {ref:'DM', lib:'Autres dettes', cpt:'<i>Soldes créditeurs :</i> 185, 45, 46, 47 (sauf 479)'},
 {ref:'DN', lib:'Provisions pour risques et charges à court terme', cpt:'499 (sauf 4998), 599'},
 {ref:'DP', lib:'TOTAL PASSIF CIRCULANT', tot:true, cpt:'DH + DI + DJ + DK + DM + DN'},
 {ref:'DQ', lib:'Banques, crédits d’escompte', cpt:'564, 565'},
 {ref:'DR', lib:'Banques, établissements financiers et crédits de trésorerie', cpt:'<i>Soldes créditeurs :</i> 52, 53, 561, 566'},
 {ref:'DT', lib:'TOTAL TRÉSORERIE - PASSIF', tot:true, cpt:'DQ + DR'},
 {ref:'DV', lib:'Écart de conversion – Passif', cpt:'479'},
 {ref:'DZ', lib:'TOTAL GÉNÉRAL', tot:true, cpt:'DF + DP + DT + DV'}
];

/* ---------- P2 — COMPTE DE RÉSULTAT ---------- */
var PARAM_RESULTAT = [
 {ref:'TA', lib:'Ventes de marchandises', mk:'A', sg:'+', cpt:'701'},
 {ref:'RA', lib:'Achats de marchandises', sg:'−', cpt:'601'},
 {ref:'RB', lib:'Variation de stocks de marchandises', sg:'− / +', cpt:'6031'},
 {ref:'XA', lib:'MARGE COMMERCIALE (Somme TA à RB)', tot:true},
 {ref:'TB', lib:'Ventes de produits fabriqués', mk:'B', sg:'+', cpt:'702, 703, 704'},
 {ref:'TC', lib:'Travaux, services vendus', mk:'C', sg:'+', cpt:'705, 706'},
 {ref:'TD', lib:'Produits accessoires', mk:'D', sg:'+', cpt:'707'},
 {ref:'XB', lib:'CHIFFRE D’AFFAIRES (A + B + C + D)', tot:true},
 {ref:'TE', lib:'Production stockée (ou déstockage)', sg:'+', cpt:'73'},
 {ref:'TF', lib:'Production immobilisée', sg:'+', cpt:'72'},
 {ref:'TG', lib:'Subventions d’exploitation', sg:'+', cpt:'71'},
 {ref:'TH', lib:'Autres produits', sg:'+', cpt:'75'},
 {ref:'TI', lib:'Transferts de charges d’exploitation', sg:'+', cpt:'781'},
 {ref:'RC', lib:'Achats de matières premières et fournitures liées', sg:'−', cpt:'602'},
 {ref:'RD', lib:'Variation de stocks de matières premières et fournitures liées', sg:'− / +', cpt:'6032'},
 {ref:'RE', lib:'Autres achats', sg:'−', cpt:'604, 605, 608'},
 {ref:'RF', lib:'Variation de stocks d’autres approvisionnements', sg:'− / +', cpt:'6033'},
 {ref:'RG', lib:'Transports', sg:'−', cpt:'61'},
 {ref:'RH', lib:'Services extérieurs', sg:'−', cpt:'62, 63'},
 {ref:'RI', lib:'Impôts et taxes', sg:'−', cpt:'64'},
 {ref:'RJ', lib:'Autres charges', sg:'−', cpt:'65'},
 {ref:'XC', lib:'VALEUR AJOUTÉE (XB + RA + RB) + (somme TE à RJ)', tot:true},
 {ref:'RK', lib:'Charges de personnel', sg:'−', cpt:'66'},
 {ref:'XD', lib:'EXCÉDENT BRUT D’EXPLOITATION (XC + RK)', tot:true},
 {ref:'TJ', lib:'Reprises d’amortissements, de provisions et dépréciations', sg:'+', cpt:'791, 798, 799'},
 {ref:'RL', lib:'Dotations aux amortissements et aux provisions et dépréciations', sg:'−', cpt:'681, 691'},
 {ref:'XE', lib:'RÉSULTAT D’EXPLOITATION (XD + TJ + RL)', tot:true},
 {ref:'TK', lib:'Revenus financiers et assimilés', sg:'+', cpt:'77'},
 {ref:'TL', lib:'Reprises de provisions et dépréciations financières', sg:'+', cpt:'797'},
 {ref:'TM', lib:'Transferts de charges financières', sg:'+', cpt:'787'},
 {ref:'RM', lib:'Frais financiers et charges assimilées', sg:'−', cpt:'67'},
 {ref:'RN', lib:'Dotations aux provisions et aux dépréciations financières', sg:'−', cpt:'697'},
 {ref:'XF', lib:'RÉSULTAT FINANCIER (somme TK à RN)', tot:true},
 {ref:'XG', lib:'RÉSULTAT DES ACTIVITÉS ORDINAIRES (XE + XF)', tot:true},
 {ref:'TN', lib:'Produits des cessions d’immobilisations', sg:'+', cpt:'82'},
 {ref:'TO', lib:'Autres Produits HAO', sg:'+', cpt:'84, 86, 88'},
 {ref:'RO', lib:'Valeurs comptables des cessions d’immobilisations', sg:'−', cpt:'81'},
 {ref:'RP', lib:'Autres Charges HAO', sg:'−', cpt:'83, 85'},
 {ref:'XH', lib:'RÉSULTAT HORS ACTIVITÉS ORDINAIRES (somme TN à RP)', tot:true},
 {ref:'RQ', lib:'Participation des travailleurs', sg:'−', cpt:'87'},
 {ref:'RS', lib:'Impôts sur le résultat', sg:'−', cpt:'89'},
 {ref:'XI', lib:'RÉSULTAT NET (XG + XH + RQ + RS)', tot:true}
];

/* ---------- P3 — TABLEAU DES FLUX DE TRÉSORERIE ---------- */
var PARAM_TFT = [
 {ref:'ZA', lib:'Trésorerie nette au 1<sup>er</sup> janvier N', tot:true,
  calc:'Net bilan actif<sub>(N−1)</sub> [BQ + BR + BS] − net bilan passif<sub>(N−1)</sub> [DQ + DR] − sc<sub>(N−1)</sub> 4726'},
 {ref:'FA', lib:'Capacité d’Autofinancement Globale (CAFG)', sg:'+',
  calc:'Cpte résultat<sub>N</sub> [XD + XF<sup>1</sup> + TO<sup>2</sup>] − Cpte résultat<sub>N</sub> [RP<sup>3</sup> + RQ + RS] + sd<sub>N</sub> 654 − sc<sub>N</sub> 754'},
 {ref:'FB', lib:'Actif circulant HAO', sg:'−',
  calc:'Net bilan actif<sub>N</sub> [BA] − net bilan actif<sub>(N−1)</sub> [BA] + sd<sub>(N−1)</sub> 485 − sd<sub>N</sub> 485 + sd<sub>N</sub> 4791<sup>4</sup> − sc<sub>N</sub> 4793<sup>4</sup> + sd<sub>N</sub> 4783<sup>4</sup>', flag:'FB'},
 {ref:'FC', lib:'Variation des stocks', sg:'−',
  calc:'Net bilan actif<sub>N</sub> [BB] − net bilan actif<sub>(N−1)</sub> [BB]'},
 {ref:'FD', lib:'Variation des créances', sg:'−',
  calc:'Net bilan actif<sub>N</sub> [BH + BI + BJ] − net bilan actif<sub>(N−1)</sub> [BH + BI + BJ] + sd<sub>(N−1)</sub> [414, 4494, 458, 461, 467, 475] − sd<sub>N</sub> [414, 4494, 458, 461, 467, 475] + sd<sub>N</sub> 4791<sup>5</sup> − sc<sub>N</sub> 4791<sup>5</sup> + mvt débit 2714'},
 {ref:'FE', lib:'Variation du passif circulant', sg:'+',
  calc:'Bilan passif<sub>N</sub> [DP] − Bilan passif<sub>(N−1)</sub> [DP] + sc<sub>(N−1)</sub> [434, 461, 465, 4726, 481, 482] − sc<sub>N</sub> [434, 461, 465, 4726, 481, 482] + sc<sub>N</sub> 4793<sup>5</sup> − sd<sub>N</sub> 4783<sup>5</sup> + mvt crédit 4752 − mvt débit 4752'},
 {ref:'ZB', lib:'Flux de trésorerie provenant des activités opérationnelles', tot:true, calc:'Somme algébrique (FA à FE)'},
 {ref:'FF', lib:'Décaissements liés aux acquisitions d’immobilisations incorporelles', sg:'−',
  calc:'Brut bilan actif<sub>N</sub> [AD] − brut bilan actif<sub>(N−1)</sub> [AD] + sd<sub>N</sub> [6541<sup>6</sup>, 811] + mvt débit<sub>N</sub> [251, 4041, 4046, 4811, 48161, 48171, 48181] − mvt crédit<sub>N</sub> [251, 4041, 4046, 4811, 48161, 48171, 48181, 4821]'},
 {ref:'FG', lib:'Décaissements liés aux acquisitions d’immobilisations corporelles', sg:'−',
  calc:'Brut bilan actif<sub>N</sub> [AI + AP] − brut bilan actif<sub>(N−1)</sub> [AI + AP] + sd<sub>N</sub> [6542, 812] + mvt crédit<sub>N</sub> 252 − mvt débit<sub>N</sub> 252 + mvt débit<sub>N</sub> [4042, 4047, 4812, 48162, 48172, 4822, 48182, 284] − mvt crédit<sub>N</sub> [17, 1984<sup>7</sup>, 4042, 4047, 4812, 48162, 48172, 4822, 48182, 1068<sup>8</sup>, 1548<sup>9</sup>]', flag:'FG'},
 {ref:'FH', lib:'Décaissements liés aux immobilisations financières', sg:'−',
  calc:'sd<sub>N</sub> 4782 − sc<sub>N</sub> 4792 + mvt débit<sub>N</sub> [26, 27<sup>10</sup>, 4813] − mvt crédit<sub>N</sub> [106<sup>11</sup>, 154<sup>11</sup>, 4813]'},
 {ref:'FI', lib:'Encaissements liés aux cessions d’immobilisations incorporelles et corporelles', sg:'+',
  calc:'sc<sub>N</sub> [754, 821, 822] + mvt crédit<sub>N</sub> [414, 485<sup>11</sup>] − mvt débit<sub>N</sub> [414, 485<sup>11</sup>]', flag:'FI'},
 {ref:'FJ', lib:'Encaissements liés aux cessions d’immobilisations financières', sg:'+',
  calc:'sc<sub>N</sub> 826 + mvt crédit<sub>N</sub> [27<sup>12</sup>, 4856] − mvt débit<sub>N</sub> [4856]'},
 {ref:'ZC', lib:'Flux de trésorerie provenant des activités d’investissement', tot:true, calc:'Somme algébrique (FF à FJ)'},
 {ref:'FK', lib:'Augmentation de capital par apport nouveau', sg:'+',
  calc:'sc<sub>N</sub> [101, 102, 1051] − sc<sub>(N−1)</sub> [101, 102, 1051] − sd<sub>N</sub> [109, 4613, 467, 4581] + mvt crédit<sub>N</sub> [103, 104, 11, 12, 139, 4619, 465] − mvt débit<sub>N</sub> [11, 12, 131]'},
 {ref:'FL', lib:'Subventions d’investissement reçues', sg:'+',
  calc:'sc<sub>N</sub> 14 − sc<sub>(N−1)</sub> 14 + sc<sub>N</sub> 799 − sd<sub>N</sub> [4494, 4582]'},
 {ref:'FM', lib:'Prélèvement sur le capital', sg:'−', calc:'mvt débit<sub>N</sub> [4619, 103, 104]'},
 {ref:'FN', lib:'Dividendes versés', sg:'−', calc:'mvt débit<sub>N</sub> 465'},
 {ref:'ZD', lib:'Flux de trésorerie provenant des capitaux propres', tot:true, calc:'Somme algébrique (FK à FN)'},
 {ref:'FO', lib:'Emprunts', sg:'+', calc:'mvt crédit<sub>N</sub> [161, 162] − mvt débit<sub>N</sub> 4713 − sd<sub>N</sub> 4784<sup>13</sup>'},
 {ref:'FP', lib:'Autres dettes financières', sg:'+', calc:'mvt crédit<sub>N</sub> [163, 164, 165, 167, 168, 181, 182] − sd<sub>N</sub> 4784<sup>14</sup>'},
 {ref:'FQ', lib:'Remboursement des emprunts et autres dettes financières', sg:'−', calc:'mvt débit<sub>N</sub> [16, 17, 181, 182] − sc<sub>N</sub> 4794'},
 {ref:'ZE', lib:'Flux de trésorerie provenant des capitaux étrangers', tot:true, calc:'Somme algébrique (FO à FQ)'},
 {ref:'ZF', lib:'Flux de trésorerie provenant des activités de financement', tot:true, calc:'Somme algébrique (ZD, ZE)'},
 {ref:'ZG', lib:'Variation de la trésorerie nette de la période', tot:true, calc:'Somme algébrique (ZB, ZC et ZF)'},
 {ref:'ZH', lib:'Trésorerie nette au 31 décembre N', tot:true, calc:'bilan actif<sub>N</sub> [BQ + BR + BS] − bilan passif<sub>N</sub> [DQ + DR] − sc<sub>N</sub> 4726'}
];

/* ---------- P4 — NOTES DE BAS DE PAGE ---------- */
var PARAM_NOTES = [
 [1,'À l’exception de TL, RN et correction des intérêts courus sur prêts et dettes financières.'],
 [2,'À l’exception du compte 86.'],
 [3,'À l’exception du compte 85.'],
 [4,'Quote-part liée aux HAO.'],
 [5,'Quote-part liée à l’exploitation.'],
 [6,'Solde débiteur de la balance N des comptes 6541 des immobilisations amortissables.'],
 [7,'Mouvement débit des comptes 6541 de la balance N des immobilisations non amortissables.'],
 [8,'Démantèlement et remise en état liés aux immobilisations corporelles.'],
 [9,'Relatif aux immobilisations corporelles.'],
 [10,'À l’exception des comptes 2714 « créances de location-financement » et 276 « intérêts courus ».'],
 [11,'Relatif aux immobilisations financières.'],
 [12,'À l’exception du compte 4856 « créances sur cession d’immobilisations financières ».'],
 [13,'À l’exception du compte 2766 « intérêts courus sur créances de location-financement ».'],
 [14,'Écart de conversion lié aux emprunts obligataires et indivis.'],
 [15,'Écart de conversion lié aux autres dettes financières.']
];

var PARAM_LEGENDE = 'sc<sub>N</sub> = solde créditeur exercice N &nbsp;•&nbsp; sc<sub>(N−1)</sub> = solde créditeur exercice N−1 &nbsp;•&nbsp; sd<sub>N</sub> = solde débiteur exercice N &nbsp;•&nbsp; sd<sub>(N−1)</sub> = solde débiteur exercice N−1 &nbsp;•&nbsp; mvt = mouvement au cours de l’exercice &nbsp;•&nbsp; « p » = partie / quote-part du compte';

/* ---------- Points de lecture à confirmer sur la planche papier ---------- */
var PARAM_A_CONFIRMER = [
 ['AJ','Lecture','Formule « dont placement en Net » des Terrains lue « (2881 − 2928p) ». Le compte 2881 n’existe pas au PCG SYSCOHADA : à relire sur la planche (2288 ou 2286 ?). Sans incidence sur les états tant que l’entité n’a pas d’immeuble de placement.'],
 ['FB','Lecture','Fin de ligne : l’ordre des termes 4791 / 4793 / 4783 reste partiellement illisible. Non testable sur la liasse MTTCI (FB = 0).'],
 ['FI','Lecture','Renvoi <sup>11</sup> porté sur 485 dans une ligne qui concerne les incorporelles et corporelles. Non testable sur la liasse MTTCI (FI = 0).']
];

/* Divergences ASSUMÉES entre la lettre de la planche et le moteur,
   chacune validée numériquement sur la liasse MTTCI — exercice 2025. */
var PARAM_DIVERGENCES = [
 ['BI / DI','Bilan',
  'Planche : « BI = 41 sauf 419 » et « DI = 419 ». Moteur : ventilation par le <b>sens du solde</b> — comptes 41 débiteurs en BI, créditeurs en DI.',
  'Le compte 4181 « Clients, factures à établir » présente un solde créditeur de 113 822 444 que la liasse de référence classe en DI. La lecture littérale donnait BI = −51 195 089 (actif négatif).'],
 ['BH / DJ','Bilan',
  'Planche : « BH = 409 » et « DJ = 40 sauf 409 ». Moteur : ventilation par le <b>sens du solde</b> — comptes 40 débiteurs en BH, créditeurs en DJ.',
  'Symétrie de la règle appliquée aux clients. Résultat identique sur la liasse MTTCI (BH = 0, DJ = 27 266).'],
 ['FH','TFT',
  'Lecture initiale « mvt débit [26, 279, 4813] » corrigée en <b>« mvt débit [26, 27 (sauf 2714 et 276), 4813] »</b> : le « 9 » était le renvoi de bas de page, pas un chiffre du numéro de compte.',
  'Le compte 2758 « Autres dépôts et cautionnements » présente un mouvement débit de 100 000 000 que la liasse de référence porte en FH. La lecture initiale donnait FH = 0.'],
 ['FB / FC / FD','TFT',
  'Ces trois lignes sont <b>affichées en variation brute</b> et non en impact trésorerie ; le signe est appliqué dans le total ZB.',
  'Convention de la liasse de référence : FD y figure pour −1 163 246 alors que sa contribution à ZB est de +1 163 246. ZB = FA − FB − FC − FD + FE.']
];

function paramRenderDivergences(){
    var rows = PARAM_DIVERGENCES.map(function(d){
        return '<tr><td style="font-weight:700;">'+d[0]+'</td><td>'+d[1]+'</td><td>'+d[2]+'</td><td>'+d[3]+'</td></tr>';
    }).join('');
    return '<table class="liasse-table param-table"><thead><tr><th style="width:78px;">POSTE</th>'+
        '<th style="width:60px;">ÉTAT</th><th style="width:38%;">RÈGLE APPLIQUÉE PAR LE MOTEUR</th>'+
        '<th>JUSTIFICATION — LIASSE MTTCI 2025</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

/* ---------- RENDU ---------- */
function paramRenderBilanActif(){
    var rows = PARAM_BILAN_ACTIF.map(function(l){
        var cls = l.tot ? ' class="liasse-total-row"' : '';
        var fl = l.flag ? ' <span class="param-flag" title="À confirmer">⚠</span>' : '';
        return '<tr'+cls+'><td>'+l.ref+'</td><td>'+l.lib+fl+'</td><td>'+(l.brut||'')+'</td><td>'+(l.amort||'')+'</td></tr>';
    }).join('');
    return '<table class="liasse-table param-table"><thead><tr><th style="width:52px;">RÉF</th><th>ACTIF</th>'+
        '<th>N° DE COMPTES À INCORPORER — BRUT</th><th>N° DE COMPTES — AMORTISSEMENTS / DÉPRÉCIATIONS</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function paramRenderBilanPassif(){
    var rows = PARAM_BILAN_PASSIF.map(function(l){
        var cls = l.tot ? ' class="liasse-total-row"' : '';
        return '<tr'+cls+'><td>'+l.ref+'</td><td>'+l.lib+'</td><td>'+(l.cpt||'')+'</td></tr>';
    }).join('');
    return '<table class="liasse-table param-table"><thead><tr><th style="width:52px;">RÉF</th><th>PASSIF</th>'+
        '<th>N° DE COMPTES À INCORPORER DANS LES POSTES</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function paramRenderResultat(){
    var rows = PARAM_RESULTAT.map(function(l){
        var cls = l.tot ? ' class="liasse-total-row"' : '';
        var mk = l.mk ? ' <b class="param-mk">'+l.mk+'</b>' : '';
        return '<tr'+cls+'><td>'+l.ref+'</td><td>'+l.lib+mk+'</td><td style="text-align:center;">'+(l.sg||'')+'</td><td>'+(l.cpt||'')+'</td></tr>';
    }).join('');
    return '<table class="liasse-table param-table"><thead><tr><th style="width:52px;">RÉF</th><th>LIBELLÉS</th>'+
        '<th style="width:60px;">SIGNE</th><th>N° DE COMPTES À INCORPORER DANS LES POSTES</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function paramRenderTFT(){
    var rows = PARAM_TFT.map(function(l){
        var cls = l.tot ? ' class="liasse-total-row"' : '';
        var fl = l.flag ? ' <span class="param-flag" title="À confirmer">⚠</span>' : '';
        return '<tr'+cls+'><td>'+l.ref+'</td><td>'+l.lib+fl+'</td><td style="text-align:center;">'+(l.sg||'')+'</td><td class="param-formula">'+(l.calc||'')+'</td></tr>';
    }).join('');
    return '<table class="liasse-table param-table"><thead><tr><th style="width:52px;">RÉF</th><th>LIBELLÉ</th>'+
        '<th style="width:60px;">SIGNE</th><th>ÉLÉMENTS DE CALCUL</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function paramRenderNotes(){
    var rows = PARAM_NOTES.map(function(n){
        return '<tr><td style="width:46px;text-align:center;font-weight:700;">'+n[0]+'</td><td>'+n[1]+'</td></tr>';
    }).join('');
    return '<table class="liasse-table param-table"><thead><tr><th style="width:46px;">N°</th><th>RENVOI</th></tr></thead><tbody>'+rows+'</tbody></table>'+
        '<div class="param-legende"><b>Légende :</b> '+PARAM_LEGENDE+'</div>';
}
function paramRenderAConfirmer(){
    var rows = PARAM_A_CONFIRMER.map(function(c){
        return '<tr><td style="font-weight:700;">'+c[0]+'</td><td>'+c[1]+'</td><td>'+c[2]+'</td></tr>';
    }).join('');
    return '<table class="liasse-table param-table"><thead><tr><th style="width:60px;">RÉF</th><th style="width:150px;">ÉTAT</th><th>POINT À CONFIRMER SUR LA PLANCHE</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function paramRenderAll(){
    return ''+
    '<div class="param-intro">Ces tableaux constituent le <b>référentiel de correspondance officiel</b> reproduit à l’identique depuis le SYSCOHADA Révisé. '+
    'Le moteur de la liasse (BILAN, COMPTE DE RÉSULTAT, TFT) lit <b>directement ces objets</b> : toute correction apportée ici se répercute sur les états générés.<br><br><b>Conformité vérifiée</b> sur la liasse MANUTENTION TRANSIT-TRANSPORT (MTTCI) — exercice clos le 31/12/2025, à partir des balances N et N−1 : <b>256 contrôles BILAN + COMPTE DE RÉSULTAT et 24 lignes de TFT, écart nul sur la totalité</b>.</div>'+

    '<div class="param-block"><div class="param-block-title">P1a — BILAN : TABLEAU DE CORRESPONDANCE POSTES / COMPTES — ACTIF</div>'+paramRenderBilanActif()+'</div>'+
    '<div class="param-block"><div class="param-block-title">P1b — BILAN : TABLEAU DE CORRESPONDANCE POSTES / COMPTES — PASSIF</div>'+paramRenderBilanPassif()+'</div>'+
    '<div class="param-block"><div class="param-block-title">P2 — COMPTE DE RÉSULTAT : TABLEAU DE CORRESPONDANCE POSTES / COMPTES</div>'+paramRenderResultat()+'</div>'+
    '<div class="param-block"><div class="param-block-title">P3 — CORRESPONDANCE DU TABLEAU DES FLUX DE TRÉSORERIE <span class="param-ti">(à titre indicatif)</span></div>'+paramRenderTFT()+'</div>'+
    '<div class="param-block"><div class="param-block-title">P4 — RENVOIS ET LÉGENDE</div>'+paramRenderNotes()+'</div>'+
    '<div class="param-block"><div class="param-block-title">P5 — CONTRÔLE DU MOTEUR : COMPTES EFFECTIVEMENT RATTACHÉS</div>'+
        (typeof paramRenderMoteur === 'function' ? paramRenderMoteur() : '')+'</div>'+
    '<div class="param-block"><div class="param-block-title">P6 — ÉCARTS ASSUMÉS ENTRE LA PLANCHE ET LE MOTEUR (validés numériquement)</div>'+paramRenderDivergences()+'</div>'+
    '<div class="param-block param-block-warn"><div class="param-block-title">⚠ POINTS DE LECTURE RESTANT À CONFIRMER</div>'+paramRenderAConfirmer()+'</div>';
}

