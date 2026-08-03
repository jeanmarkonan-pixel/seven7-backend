/* ==================================================================
   SEVEN7 — ASSERTIONS D'AUDIT ET RISQUES INHÉRENTS PAR SECTEUR

   Trois apports, tous consommés par l'onglet Cartographie des risques
   et par le Programme de travail :

   1. ASSERTIONS — les treize assertions de la NEP/ISA 315, en trois
      catégories. Ce sont elles qui relient un risque identifié à la
      diligence qui le couvre : un programme de travail qui ne dit pas
      quelle assertion il couvre ne se justifie pas.

   2. RISQUES_CYCLE — les risques inhérents communs à toute entité,
      classés par cycle comptable (mêmes identifiants que CYCLES).

   3. SECTEURS — les risques inhérents propres à un secteur d'activité.
      Le risque inhérent s'apprécie AVANT prise en compte du contrôle
      interne : c'est la nature même de l'activité qui l'engendre.

   La cotation par défaut (probabilité × impact, de 1 à 5) est un point
   de départ documenté, pas un verdict : l'auditeur la révise au vu de
   sa connaissance de l'entité, et l'application conserve sa saisie.
   ================================================================== */

/* ------------------------------------------------------------------
   1. LES ASSERTIONS
   ------------------------------------------------------------------ */
var ASSERTIONS = [
    /* Flux d'opérations et événements de l'exercice */
    {code:'F_REA', cat:'Flux',  lib:'Réalité',
     def:"Les opérations et les événements enregistrés se sont effectivement réalisés et concernent l'entité."},
    {code:'F_EXH', cat:'Flux',  lib:'Exhaustivité',
     def:"Toutes les opérations et tous les événements qui devaient être enregistrés l'ont été."},
    {code:'F_MES', cat:'Flux',  lib:'Mesure',
     def:"Les montants et autres données relatifs aux opérations ont été enregistrés pour leur montant exact."},
    {code:'F_CUT', cat:'Flux',  lib:'Séparation des exercices',
     def:"Les opérations et les événements ont été imputés sur le bon exercice (cut-off)."},
    {code:'F_CLA', cat:'Flux',  lib:'Classification',
     def:"Les comptes utilisés pour enregistrer les opérations et les événements sont appropriés."},

    /* Soldes de comptes en fin de période */
    {code:'S_EXI', cat:'Soldes', lib:'Existence',
     def:"Les actifs et les passifs de l'entité existent à la date de clôture."},
    {code:'S_DRO', cat:'Soldes', lib:'Droits et obligations',
     def:"Les droits sur les actifs sont détenus par l'entité et ses dettes correspondent à ses obligations."},
    {code:'S_EXH', cat:'Soldes', lib:'Exhaustivité',
     def:"Tous les actifs et passifs qui devaient être comptabilisés l'ont été."},
    {code:'S_EVA', cat:'Soldes', lib:'Évaluation et imputation',
     def:"Les actifs et passifs sont comptabilisés pour le bon montant, ajustements d'évaluation compris."},

    /* Présentation et informations fournies en annexe */
    {code:'P_REA', cat:'Présentation', lib:'Réalité, droits et obligations',
     def:"Les informations fournies portent sur des événements survenus et concernant l'entité."},
    {code:'P_EXH', cat:'Présentation', lib:'Exhaustivité',
     def:"Toutes les informations requises en annexe ont été fournies."},
    {code:'P_PRE', cat:'Présentation', lib:'Présentation et intelligibilité',
     def:"Les informations sont décrites de façon claire et appropriée."},
    {code:'P_MES', cat:'Présentation', lib:'Mesure et évaluation',
     def:"Les informations fournies le sont pour des montants corrects."}
];

var ASSERT_INDEX = null;
function assertIndex(){
    if(ASSERT_INDEX) return ASSERT_INDEX;
    ASSERT_INDEX = {};
    ASSERTIONS.forEach(function(a){ ASSERT_INDEX[a.code] = a; });
    return ASSERT_INDEX;
}
/** « F_REA » → « Réalité (flux) » ; code inconnu rendu tel quel. */
function assertLib(code){
    var a = assertIndex()[code];
    return a ? a.lib + ' (' + a.cat.toLowerCase() + ')' : String(code);
}
/** Liste de codes → chaîne lisible, pour une cellule de tableau. */
function assertLibs(codes){
    return (codes || []).map(assertLib).join(' · ');
}

/* ------------------------------------------------------------------
   2. RISQUES INHÉRENTS COMMUNS, PAR CYCLE
      Identifiants de cycle repris de CYCLES (module 26).
      p = probabilité, i = impact, tous deux de 1 à 5.
   ------------------------------------------------------------------ */
var RISQUES_CYCLE = {
 CAP: [
  {r:"Mouvements sur le capital non conformes aux PV d'assemblée ou aux formalités légales",
   a:['S_DRO','P_EXH'], p:2, i:4,
   d:"Rapprocher le capital des statuts à jour, du RCCM et de la DNSV ; valider chaque mouvement au PV d'AGE."},
  {r:"Affectation du résultat N-1 non conforme à la décision d'assemblée",
   a:['S_EVA','F_CLA'], p:3, i:3,
   d:"Rapprocher la variation du report à nouveau du résultat N-1 et du PV d'AGO ; contrôler la réserve légale."},
  {r:"Réserve légale non dotée au taux minimum réglementaire",
   a:['S_EVA','P_EXH'], p:3, i:2,
   d:"Recalculer la dotation à la réserve légale et vérifier le plafond atteint."},
  {r:"Capitaux propres devenus inférieurs à la moitié du capital sans régularisation",
   a:['P_EXH','P_PRE'], p:2, i:5,
   d:"Vérifier l'application de l'article 664 AUSCGGIE et la mention en annexe ; apprécier la continuité d'exploitation."}
 ],
 IMM: [
  {r:"Immobilisations comptabilisées mais physiquement absentes ou hors service",
   a:['S_EXI'], p:3, i:4,
   d:"Sélectionner un échantillon et procéder à l'inventaire physique ; vérifier l'étiquetage."},
  {r:"Charges de gros entretien ou de travaux immobilisables passées en charges, ou l'inverse",
   a:['F_CLA','S_EVA'], p:4, i:3,
   d:"Analyser le compte de petit matériel et les comptes 62/63 significatifs ; apprécier le caractère immobilisable."},
  {r:"Taux et durées d'amortissement non conformes au plan ou au référentiel fiscal",
   a:['S_EVA','F_MES'], p:3, i:3,
   d:"Recalculer les dotations par catégorie et rapprocher du fichier des immobilisations."},
  {r:"Cessions ou mises au rebut non sorties des comptes",
   a:['S_EXI','F_REA'], p:3, i:4,
   d:"Rapprocher les PV de cession et de rebut du grand livre ; contrôler le calcul des plus ou moins-values."},
  {r:"Écart entre le fichier des immobilisations et la balance générale",
   a:['S_EXH','F_MES'], p:4, i:3,
   d:"Rapprocher poste à poste le fichier des immobilisations de la balance et justifier chaque écart."},
  {r:"Cautionnements et dépôts non justifiés ou non recouvrables",
   a:['S_EXI','S_EVA'], p:3, i:3,
   d:"Circulariser les bénéficiaires ; vérifier les échéances et conditions de levée."}
 ],
 STK: [
  {r:"Stocks comptabilisés sans existence physique à la clôture",
   a:['S_EXI'], p:3, i:4,
   d:"Assister à l'inventaire physique ou en contrôler le PV ; sonder par comptage."},
  {r:"Méthode de valorisation non conforme ou appliquée sans permanence",
   a:['S_EVA'], p:3, i:4,
   d:"Vérifier la méthode retenue (CMP, FIFO) et sa permanence ; recalculer sur un échantillon."},
  {r:"Stocks obsolètes, endommagés ou à rotation lente non dépréciés",
   a:['S_EVA'], p:4, i:4,
   d:"Analyser l'antériorité des stocks ; apprécier la suffisance des provisions."},
  {r:"Marchandises en dépôt ou en consignation comptabilisées à tort en stock propre",
   a:['S_DRO'], p:2, i:3,
   d:"Identifier les stocks détenus pour compte de tiers et vérifier leur exclusion."},
  {r:"Rupture de séparation des exercices sur les entrées et sorties de fin d'exercice",
   a:['F_CUT'], p:4, i:3,
   d:"Contrôler les derniers bons de réception et de livraison de l'exercice et les premiers du suivant."}
 ],
 ACH: [
  {r:"Factures reçues non comptabilisées à la clôture (charges à payer omises)",
   a:['F_EXH','S_EXH'], p:4, i:4,
   d:"Examiner les factures et règlements des deux premiers mois de N+1 ; rapprocher des charges à payer."},
  {r:"Charges rattachées au mauvais exercice",
   a:['F_CUT'], p:4, i:4,
   d:"Sonder les factures de novembre-décembre N et janvier-février N+1 sur la date de livraison ou de prestation."},
  {r:"Fournisseurs débiteurs non reclassés à l'actif",
   a:['F_CLA','P_PRE'], p:3, i:2,
   d:"Identifier les comptes 40 débiteurs et vérifier leur reclassement en BH."},
  {r:"Dettes fournisseurs anciennes non apurées, éteintes ou litigieuses",
   a:['S_EXI','S_EVA'], p:3, i:3,
   d:"Analyser l'antériorité des soldes ; circulariser les fournisseurs significatifs."},
  {r:"Charges sans justificatif probant ou sans lien avec l'exploitation",
   a:['F_REA'], p:3, i:4,
   d:"Sonder les charges significatives et récurrentes ; exiger facture, contrat ou bon de réception."}
 ],
 VTE: [
  {r:"Produits comptabilisés avant réalisation de la prestation ou livraison",
   a:['F_REA','F_CUT'], p:4, i:5,
   d:"Contrôler les prestations des deux dernières semaines de l'exercice ; rapprocher facturation et exécution."},
  {r:"Prestations réalisées non facturées à la clôture",
   a:['F_EXH','S_EXH'], p:4, i:4,
   d:"Rapprocher les rapports d'exécution ou bons de livraison de la facturation ; contrôler les factures à établir."},
  {r:"Créances clients irrécouvrables non dépréciées",
   a:['S_EVA'], p:4, i:4,
   d:"Analyser la balance âgée ; rapprocher des encaissements postérieurs et des relances."},
  {r:"Créances fictives ou déjà encaissées maintenues à l'actif",
   a:['S_EXI'], p:3, i:5,
   d:"Circulariser les clients significatifs ; analyser les encaissements des premiers mois de N+1."},
  {r:"Clients créditeurs non reclassés au passif en avances reçues",
   a:['F_CLA','P_PRE'], p:3, i:3,
   d:"Identifier les comptes 41 créditeurs et vérifier leur reclassement en DI."},
  {r:"Avoirs et annulations postérieurs à la clôture non provisionnés",
   a:['F_CUT','S_EVA'], p:3, i:3,
   d:"Examiner les avoirs émis en N+1 et rattacher ceux qui concernent l'exercice audité."}
 ],
 PER: [
  {r:"Charges de personnel non exhaustives : primes, congés, indemnités de fin de carrière",
   a:['F_EXH','S_EXH'], p:4, i:4,
   d:"Rapprocher la masse salariale des déclarations sociales ; contrôler la provision pour congés payés."},
  {r:"Personnel fictif ou maintenu après départ",
   a:['F_REA'], p:2, i:4,
   d:"Rapprocher l'effectif payé du registre du personnel ; sonder les entrées et sorties de l'exercice."},
  {r:"Avances et acomptes au personnel non soldés ni justifiés",
   a:['S_EXI','F_CLA'], p:3, i:2,
   d:"Analyser l'antériorité des comptes 421 débiteurs et leur autorisation."},
  {r:"Indemnités de départ à la retraite non évaluées ou non mentionnées en annexe",
   a:['S_EVA','P_EXH'], p:3, i:3,
   d:"Vérifier le calcul actuariel ou la méthode retenue et la mention en annexe."}
 ],
 FIS: [
  {r:"Déclarations fiscales non conformes aux comptes (TVA, ITS, IS)",
   a:['F_MES','S_EVA'], p:4, i:4,
   d:"Rapprocher les déclarations annuelles des comptes de TVA, d'impôts sur salaires et d'IS."},
  {r:"Crédit de TVA non recouvrable maintenu à l'actif",
   a:['S_EVA','S_EXI'], p:3, i:3,
   d:"Analyser l'ancienneté du crédit et les démarches de remboursement engagées."},
  {r:"Redressement fiscal ou social probable non provisionné",
   a:['S_EXH','P_EXH'], p:3, i:5,
   d:"Obtenir les notifications de contrôle et les avis d'imposition ; apprécier la provision."},
  {r:"Charges non déductibles non réintégrées dans le résultat fiscal",
   a:['F_MES','P_EXH'], p:4, i:3,
   d:"Analyser le tableau de passage du résultat comptable au résultat fiscal."},
  {r:"Comptes d'État débiteurs non reclassés à l'actif",
   a:['F_CLA','P_PRE'], p:3, i:2,
   d:"Identifier les comptes 44 débiteurs et vérifier leur reclassement en BJ."}
 ],
 TRE: [
  {r:"Soldes bancaires non rapprochés ou écarts de rapprochement anciens non apurés",
   a:['S_EXI','F_MES'], p:4, i:4,
   d:"Obtenir les rapprochements de tous les comptes ; justifier les suspens de plus de trois mois."},
  {r:"Caisse créditrice ou solde théorique éloigné du comptage physique",
   a:['S_EXI'], p:3, i:4,
   d:"Rapprocher le compte caisse du PV d'inventaire au 31/12 ; exiger un brouillard de caisse."},
  {r:"Comptes de virements internes (585) non soldés à la clôture",
   a:['F_CLA','S_EXI'], p:3, i:3,
   d:"Vérifier l'absence de solde sur 585 ; investiguer les comptes concernés le cas échéant."},
  {r:"Découverts bancaires non reclassés en trésorerie-passif",
   a:['F_CLA','P_PRE'], p:3, i:3,
   d:"Identifier les comptes 52/53 créditeurs et vérifier leur reclassement en DR."},
  {r:"Confirmations bancaires non obtenues, engagements hors bilan non recensés",
   a:['P_EXH','S_EXH'], p:3, i:4,
   d:"Circulariser toutes les banques ; recenser cautions, nantissements et lignes autorisées."}
 ],
 REG: [
  {r:"Comptes d'attente ou transitoires (47) non soldés à la clôture",
   a:['F_CLA','S_EXI'], p:4, i:3,
   d:"Analyser le détail des comptes 47 et exiger leur apurement avant arrêté."},
  {r:"Charges et produits constatés d'avance mal ventilés entre exercices",
   a:['F_CUT','S_EVA'], p:3, i:3,
   d:"Rapprocher la période couverte de la date de facture ; contrôler le prorata retenu."},
  {r:"Écarts de conversion non constatés sur créances et dettes en devises",
   a:['S_EVA'], p:2, i:3,
   d:"Revaloriser les soldes en devises au cours de clôture ; vérifier la provision pour perte de change."},
  {r:"Comptes courants d'associés non conventionnés ou non rémunérés conformément",
   a:['S_DRO','P_EXH'], p:3, i:3,
   d:"Obtenir les conventions réglementées ; vérifier la mention au rapport spécial."}
 ],
 HAO: [
  {r:"Opérations hors activités ordinaires classées en exploitation, ou l'inverse",
   a:['F_CLA','P_PRE'], p:3, i:3,
   d:"Analyser la nature des opérations portées en 8 ; vérifier le caractère non récurrent."},
  {r:"Plus ou moins-values de cession mal calculées ou mal rattachées",
   a:['F_MES','F_CUT'], p:3, i:3,
   d:"Recalculer par cession : prix de cession, valeur nette comptable, résultat."}
 ],
 AUT: [
  {r:"Dotations et reprises de provisions non justifiées ou non documentées",
   a:['S_EVA','F_REA'], p:3, i:4,
   d:"Obtenir le détail de chaque provision et son fondement ; apprécier reprises et dotations."},
  {r:"Charges et produits financiers non rattachés au bon exercice",
   a:['F_CUT','F_MES'], p:3, i:3,
   d:"Recalculer les intérêts courus sur emprunts et placements à la clôture."}
 ]
};

/* ------------------------------------------------------------------
   3. RISQUES INHÉRENTS PAR SECTEUR D'ACTIVITÉ
      Le risque inhérent tient à la nature de l'activité, avant toute
      prise en compte du contrôle interne. Ces risques s'AJOUTENT aux
      risques de cycle ci-dessus.
   ------------------------------------------------------------------ */
var SECTEURS = [
 {id:'TRANSIT', nom:'Transit, transport et logistique', ico:'🚢', risques:[
  {c:'VTE', r:"Débours et frais avancés pour le compte des clients traités en produits au lieu de comptes de tiers",
   a:['F_CLA','F_REA'], p:4, i:4,
   d:"Distinguer la rémunération propre du transitaire des débours refacturés à l'euro près ; contrôler le compte 4191."},
  {c:'VTE', r:"Prestations à cheval sur la clôture : dossier ouvert en N, achevé en N+1",
   a:['F_CUT','F_EXH'], p:4, i:4,
   d:"Analyser les dossiers non soldés au 31/12 ; rattacher produits et charges à l'avancement réel."},
  {c:'FIS', r:"Droits de douane et taxes avancés non recouvrés auprès des clients",
   a:['S_EVA','S_EXI'], p:4, i:4,
   d:"Rapprocher les quittances douanières des refacturations ; apprécier la recouvrabilité."},
  {c:'ACH', r:"Factures de compagnies maritimes, aériennes et de manutention reçues avec un fort décalage",
   a:['F_EXH','F_CUT'], p:5, i:4,
   d:"Recenser les dossiers livrés non facturés par les transporteurs ; provisionner les charges à payer."},
  {c:'IMM', r:"Cautions et consignations douanières immobilisées durablement",
   a:['S_EXI','S_EVA'], p:4, i:3,
   d:"Circulariser l'administration douanière et les cautionnaires ; vérifier les conditions de mainlevée."},
  {c:'AUT', r:"Litiges sur avaries, retards et pertes de marchandises non provisionnés",
   a:['S_EXH','P_EXH'], p:3, i:4,
   d:"Obtenir l'état des sinistres et des réclamations ; apprécier la couverture d'assurance."}
 ]},

 {id:'NEGOCE', nom:'Négoce, commerce et distribution', ico:'🛒', risques:[
  {c:'STK', r:"Démarque inconnue et écarts d'inventaire récurrents",
   a:['S_EXI','F_EXH'], p:4, i:4,
   d:"Analyser l'évolution du taux de démarque ; contrôler les procédures de comptage."},
  {c:'STK', r:"Stocks à rotation lente ou périmés maintenus à leur coût d'achat",
   a:['S_EVA'], p:4, i:4,
   d:"Établir la balance âgée des stocks ; apprécier la valeur nette de réalisation."},
  {c:'VTE', r:"Ventes au comptant non enregistrées, notamment en espèces",
   a:['F_EXH','F_REA'], p:4, i:5,
   d:"Rapprocher les encaissements de caisse du chiffre d'affaires déclaré ; tester la séquence des tickets."},
  {c:'ACH', r:"Ristournes, remises de fin d'année et coopérations commerciales non rattachées",
   a:['F_CUT','F_EXH'], p:4, i:3,
   d:"Obtenir les accords fournisseurs ; recalculer les ristournes acquises à la clôture."},
  {c:'VTE', r:"Marge brute incohérente avec le mix produits ou la politique tarifaire",
   a:['F_MES','F_EXH'], p:3, i:4,
   d:"Analyser la marge par famille de produits et expliquer les variations anormales."}
 ]},

 {id:'BTP', nom:'BTP, construction et travaux publics', ico:'🏗️', risques:[
  {c:'VTE', r:"Chantiers pluriannuels : produit à l'avancement mal évalué ou avancement surestimé",
   a:['F_MES','F_CUT'], p:5, i:5,
   d:"Obtenir les situations de travaux et le budget par chantier ; recalculer l'avancement et la marge à terminaison."},
  {c:'VTE', r:"Travaux exécutés non facturés ou situations non validées par le maître d'ouvrage",
   a:['F_EXH','S_EXI'], p:4, i:4,
   d:"Rapprocher les situations émises des PV de réception ; apprécier le risque de contestation."},
  {c:'AUT', r:"Chantiers déficitaires : perte à terminaison non provisionnée",
   a:['S_EXH','S_EVA'], p:4, i:5,
   d:"Comparer coûts engagés et budget par chantier ; provisionner les pertes prévisibles."},
  {c:'AUT', r:"Garanties de parfait achèvement et retenues de garantie non suivies",
   a:['S_EXH','P_EXH'], p:3, i:3,
   d:"Recenser les retenues de garantie et leur échéance ; apprécier les provisions pour travaux à terminer."},
  {c:'STK', r:"Stocks de matériaux sur chantier non recensés ou consommés non imputés",
   a:['S_EXI','F_CLA'], p:4, i:3,
   d:"Contrôler l'affectation des consommations par chantier ; vérifier l'inventaire des dépôts."},
  {c:'ACH', r:"Sous-traitance non déclarée ou factures de sous-traitants en retard",
   a:['F_EXH','F_CUT'], p:4, i:4,
   d:"Rapprocher les contrats de sous-traitance des factures reçues ; provisionner les travaux exécutés non facturés."}
 ]},

 {id:'INDUS', nom:'Industrie et agro-industrie', ico:'🏭', risques:[
  {c:'STK', r:"Coût de production incorporant des charges non incorporables ou une sous-activité",
   a:['S_EVA'], p:4, i:4,
   d:"Vérifier la composition du coût de production ; contrôler le traitement de la sous-activité."},
  {c:'STK', r:"En-cours de production évalués sans suivi analytique fiable",
   a:['S_EVA','S_EXI'], p:4, i:4,
   d:"Rapprocher les en-cours des ordres de fabrication ; contrôler le degré d'avancement retenu."},
  {c:'IMM', r:"Immobilisations de production maintenues à l'actif malgré un arrêt d'exploitation",
   a:['S_EVA','S_EXI'], p:3, i:4,
   d:"Identifier les lignes arrêtées ; apprécier la dépréciation et le test de valeur recouvrable."},
  {c:'STK', r:"Pertes de matière, freintes et rendements non maîtrisés",
   a:['F_EXH','S_EVA'], p:4, i:3,
   d:"Analyser les rendements matière sur l'exercice et expliquer les écarts au standard."},
  {c:'AUT', r:"Obligations environnementales de remise en état non provisionnées",
   a:['S_EXH','P_EXH'], p:2, i:4,
   d:"Recenser les obligations réglementaires de dépollution ou de démantèlement."}
 ]},

 {id:'HOTEL', nom:'Hôtellerie et restauration', ico:'🏨', risques:[
  {c:'VTE', r:"Multiplicité des points de vente et volume de petites transactions en espèces",
   a:['F_EXH','F_REA'], p:5, i:4,
   d:"Rapprocher les états de caisse par point de vente du chiffre d'affaires ; tester la séquence des notes."},
  {c:'VTE', r:"Arrhes, acomptes et réservations comptabilisés en produits avant le séjour",
   a:['F_CUT','F_REA'], p:4, i:3,
   d:"Analyser les réservations couvrant la clôture ; reclasser en produits constatés d'avance."},
  {c:'STK', r:"Stocks de denrées et de boissons : pertes, consommations internes et offerts",
   a:['S_EXI','F_EXH'], p:4, i:3,
   d:"Contrôler les ratios de consommation ; vérifier le suivi des offerts et des repas du personnel."},
  {c:'PER', r:"Personnel saisonnier et extras non déclarés ou mal rattachés",
   a:['F_EXH','F_CUT'], p:4, i:4,
   d:"Rapprocher les plannings des déclarations sociales ; contrôler les charges de fin d'exercice."},
  {c:'IMM', r:"Dépenses de rénovation et de renouvellement mal qualifiées",
   a:['F_CLA','S_EVA'], p:4, i:3,
   d:"Analyser les travaux de l'exercice et distinguer entretien et immobilisation."}
 ]},

 {id:'MICROFI', nom:'Microfinance et établissements financiers', ico:'🏦', risques:[
  {c:'VTE', r:"Portefeuille de crédits : créances en souffrance mal classées ou reclassées à tort en sain",
   a:['S_EVA','F_CLA'], p:5, i:5,
   d:"Contrôler le classement par antériorité selon l'instruction en vigueur ; recalculer le PAR."},
  {c:'VTE', r:"Provisionnement du risque de crédit inférieur aux minima réglementaires",
   a:['S_EVA'], p:4, i:5,
   d:"Recalculer les provisions par classe d'antériorité ; rapprocher des exigences prudentielles."},
  {c:'VTE', r:"Rééchelonnements et refinancements masquant la dégradation du portefeuille",
   a:['F_REA','S_EVA'], p:4, i:5,
   d:"Analyser les crédits restructurés ; vérifier leur déclassement et leur provisionnement."},
  {c:'AUT', r:"Intérêts courus sur créances douteuses maintenus en produits",
   a:['F_REA','S_EVA'], p:4, i:4,
   d:"Vérifier l'arrêt de la comptabilisation des intérêts sur créances en souffrance."},
  {c:'TRE', r:"Dépôts de la clientèle : exhaustivité et disponibilité",
   a:['S_EXH','S_DRO'], p:3, i:5,
   d:"Rapprocher le grand livre des dépôts du fichier clients ; circulariser un échantillon."},
  {c:'FIS', r:"Ratios prudentiels non respectés et non mentionnés",
   a:['P_EXH','P_PRE'], p:3, i:5,
   d:"Recalculer les ratios réglementaires ; vérifier l'information en annexe."}
 ]},

 {id:'TELECOM', nom:'Télécommunications et numérique', ico:'📡', risques:[
  {c:'VTE', r:"Revenus prépayés : crédits non consommés comptabilisés en produits",
   a:['F_CUT','F_REA'], p:4, i:4,
   d:"Analyser le solde des crédits non consommés à la clôture ; reclasser en produits constatés d'avance."},
  {c:'VTE', r:"Volume de transactions rendant impossible le contrôle unitaire",
   a:['F_EXH','F_MES'], p:4, i:4,
   d:"S'appuyer sur les contrôles généraux informatiques ; tester la chaîne de facturation de bout en bout."},
  {c:'IMM', r:"Frais de développement et coûts de réseau immobilisés sans critères d'activation",
   a:['S_EVA','F_CLA'], p:4, i:4,
   d:"Vérifier les critères d'activation projet par projet et le début d'amortissement."},
  {c:'AUT', r:"Contrats pluriannuels avec engagements de service non provisionnés",
   a:['S_EXH','P_EXH'], p:3, i:3,
   d:"Recenser les engagements contractuels et pénalités de niveau de service."}
 ]},

 {id:'SANTE', nom:'Santé, cliniques et pharmacies', ico:'🏥', risques:[
  {c:'VTE', r:"Créances sur assureurs et organismes de prise en charge rejetées ou impayées",
   a:['S_EVA','S_EXI'], p:4, i:4,
   d:"Analyser l'antériorité des créances par organisme et le taux de rejet historique."},
  {c:'VTE', r:"Actes réalisés en fin d'exercice non facturés",
   a:['F_EXH','F_CUT'], p:4, i:3,
   d:"Rapprocher le registre des actes de la facturation ; contrôler les séjours à cheval sur la clôture."},
  {c:'STK', r:"Médicaments et consommables périmés ou soumis à traçabilité réglementaire",
   a:['S_EVA','S_EXI'], p:4, i:3,
   d:"Contrôler les dates de péremption à l'inventaire ; vérifier la destruction des périmés."},
  {c:'AUT', r:"Litiges de responsabilité médicale non provisionnés",
   a:['S_EXH','P_EXH'], p:2, i:5,
   d:"Obtenir l'état des contentieux et l'avis des conseils ; vérifier la couverture d'assurance."}
 ]},

 {id:'ONG', nom:'ONG, associations et projets financés', ico:'🤝', risques:[
  {c:'VTE', r:"Subventions et financements comptabilisés en produits avant réalisation des conditions",
   a:['F_REA','F_CUT'], p:4, i:5,
   d:"Analyser chaque convention de financement ; rattacher les produits à l'avancement des activités éligibles."},
  {c:'ACH', r:"Dépenses non éligibles au regard des conventions de bailleurs",
   a:['F_REA','F_CLA'], p:4, i:5,
   d:"Sonder les dépenses par ligne budgétaire ; vérifier l'éligibilité et les seuils conventionnels."},
  {c:'AUT', r:"Fonds dédiés non employés à la clôture non isolés au passif",
   a:['S_EXH','P_PRE'], p:4, i:4,
   d:"Recenser les reliquats par convention ; vérifier leur inscription en fonds dédiés."},
  {c:'TRE', r:"Comptes bancaires dédiés par projet non rapprochés ou fonds mélangés",
   a:['S_EXI','F_CLA'], p:3, i:4,
   d:"Contrôler l'étanchéité des comptes projets ; rapprocher chaque compte séparément."},
  {c:'IMM', r:"Immobilisations acquises sur financement bailleur : propriété et restitution",
   a:['S_DRO','P_EXH'], p:3, i:3,
   d:"Vérifier les clauses de dévolution des biens en fin de projet."}
 ]},

 {id:'IMMO', nom:'Immobilier et promotion immobilière', ico:'🏘️', risques:[
  {c:'VTE', r:"Programmes en cours : chiffre d'affaires à l'avancement mal évalué",
   a:['F_MES','F_CUT'], p:4, i:5,
   d:"Recalculer l'avancement par programme sur la base des coûts engagés et du budget révisé."},
  {c:'STK', r:"Stocks d'immeubles et terrains évalués au-dessus de leur valeur de marché",
   a:['S_EVA'], p:3, i:5,
   d:"Comparer la valeur comptable aux prix de marché constatés ; apprécier la dépréciation."},
  {c:'VTE', r:"Réservations et versements des acquéreurs traités en produits",
   a:['F_CUT','F_REA'], p:4, i:4,
   d:"Analyser les avances reçues et leur reclassement au passif."},
  {c:'AUT', r:"Frais financiers immobilisés au-delà de la durée de construction",
   a:['S_EVA','F_CLA'], p:3, i:3,
   d:"Vérifier la période de capitalisation retenue pour chaque programme."}
 ]},

 {id:'PETRO', nom:'Produits pétroliers et négoce de commodités', ico:'⛽', risques:[
  {c:'STK', r:"Stocks volumineux valorisés sur des cours volatils à la clôture",
   a:['S_EVA'], p:4, i:5,
   d:"Contrôler le cours retenu et la conversion en volumes ; apprécier la valeur nette de réalisation."},
  {c:'STK', r:"Écarts de jaugeage, pertes en ligne et évaporation",
   a:['S_EXI','F_EXH'], p:4, i:4,
   d:"Rapprocher les relevés de jauge des mouvements comptables ; analyser les pertes techniques."},
  {c:'FIS', r:"Taxes spécifiques et prélèvements sectoriels mal liquidés",
   a:['F_MES','S_EVA'], p:4, i:4,
   d:"Recalculer les taxes spécifiques sur les volumes déclarés."},
  {c:'VTE', r:"Ventes à crédit à des stations ou revendeurs sans garantie suffisante",
   a:['S_EVA'], p:4, i:4,
   d:"Analyser l'encours par client et les garanties obtenues."}
 ]},

 {id:'AGRI', nom:'Agriculture, plantations et filières agricoles', ico:'🌾', risques:[
  {c:'STK', r:"Actifs biologiques et récoltes sur pied : existence et évaluation",
   a:['S_EXI','S_EVA'], p:4, i:4,
   d:"Contrôler les superficies et rendements retenus ; vérifier la méthode d'évaluation."},
  {c:'VTE', r:"Campagnes agricoles à cheval sur l'exercice comptable",
   a:['F_CUT'], p:4, i:4,
   d:"Rattacher produits et charges de campagne à l'exercice ; contrôler les livraisons de fin de campagne."},
  {c:'ACH', r:"Achats aux producteurs en espèces, sans pièce probante suffisante",
   a:['F_REA','F_EXH'], p:5, i:4,
   d:"Vérifier les bordereaux d'achat et les registres de collecte ; apprécier la traçabilité."},
  {c:'IMM', r:"Plantations en cours de production : amortissement et dépréciation",
   a:['S_EVA'], p:3, i:3,
   d:"Vérifier le point de départ de l'amortissement et la durée de vie retenue."}
 ]},

 {id:'SERV', nom:'Services professionnels et prestations intellectuelles', ico:'💼', risques:[
  {c:'VTE', r:"Travaux en cours et honoraires à facturer évalués sans suivi des temps",
   a:['S_EXI','F_MES'], p:4, i:4,
   d:"Rapprocher les temps passés des missions ; apprécier le taux de facturation retenu."},
  {c:'VTE', r:"Missions au forfait déficitaires non provisionnées",
   a:['S_EXH','S_EVA'], p:3, i:4,
   d:"Comparer temps consommés et budget par mission ; provisionner les pertes à terminaison."},
  {c:'PER', r:"Rémunération variable et intéressement non provisionnés",
   a:['F_EXH','S_EXH'], p:4, i:3,
   d:"Recalculer les primes acquises au titre de l'exercice selon les accords."},
  {c:'AUT', r:"Mise en cause de responsabilité professionnelle non provisionnée",
   a:['S_EXH','P_EXH'], p:2, i:4,
   d:"Obtenir l'état des réclamations et la police de responsabilité civile professionnelle."}
 ]}
];

/* ------------------------------------------------------------------
   4. GÉNÉRATION DE LA CARTOGRAPHIE
   ------------------------------------------------------------------ */
var SECT_INDEX = null;
function secteurIndex(){
    if(SECT_INDEX) return SECT_INDEX;
    SECT_INDEX = {};
    SECTEURS.forEach(function(s){ SECT_INDEX[s.id] = s; });
    return SECT_INDEX;
}
function secteurNom(id){
    var s = secteurIndex()[id];
    return s ? s.nom : '';
}
/** Nom du cycle depuis son identifiant (CYCLES vient du module 26). */
function cycleNom(cycId){
    if(typeof CYCLES === 'undefined') return cycId;
    for(var i = 0; i < CYCLES.length; i++)
        if(CYCLES[i].id === cycId) return CYCLES[i].nom;
    return cycId;
}
function risqueNiveau(score){
    return score >= 15 ? 'Élevé' : (score >= 8 ? 'Moyen' : 'Faible');
}

/**
 * Construit la liste des risques d'une mission.
 * @param {string} secteurId  identifiant de secteur, ou '' pour les seuls risques de cycle
 * @returns {Array} lignes {origine, cycle, cycleNom, risque, assertions, p, i, score, niveau, diligence}
 */
function genererCartographie(secteurId){
    var out = [];
    function pousser(origine, cycId, x){
        var p = x.p || 3, i = x.i || 3;
        out.push({
            origine: origine, cycle: cycId, cycleNom: cycleNom(cycId),
            risque: x.r, assertions: x.a || [],
            p: p, i: i, score: p * i, niveau: risqueNiveau(p * i),
            diligence: x.d || ''
        });
    }
    var ordre = (typeof CYCLES !== 'undefined')
        ? CYCLES.map(function(c){ return c.id; })
        : Object.keys(RISQUES_CYCLE);

    ordre.forEach(function(cycId){
        (RISQUES_CYCLE[cycId] || []).forEach(function(x){ pousser('Cycle', cycId, x); });
    });

    var s = secteurIndex()[secteurId];
    if(s) s.risques.forEach(function(x){ pousser(s.nom, x.c, x); });

    out.sort(function(a, b){
        return b.score - a.score || a.cycleNom.localeCompare(b.cycleNom);
    });
    return out;
}

/* ------------------------------------------------------------------
   5. RENDU DANS L'ONGLET CARTOGRAPHIE DES RISQUES
   ------------------------------------------------------------------ */

/* Remplit la liste déroulante des secteurs au chargement. */
function risqInitSecteurs(){
    var sel = document.getElementById('risq-secteur');
    if(!sel || sel.options.length) return;
    var html = '<option value="">— Aucun secteur particulier (risques de cycle seuls) —</option>';
    SECTEURS.forEach(function(s){
        html += '<option value="' + esc(s.id) + '">' + esc(s.ico + ' ' + s.nom) + '</option>';
    });
    sel.innerHTML = html;
}

/* Une ligne du tableau, éditable comme les lignes saisies à la main. */
function risqLigneHtml(l){
    var oc = 'onchange="updateStatus(\'risques\')"';
    return '<tr>'
        + '<td style="font-size:11px; color:#666;">' + esc(l.origine) + '</td>'
        + '<td><input type="text" value="' + esc(l.cycleNom) + '" ' + oc + '></td>'
        + '<td><input type="text" value="' + esc(l.risque) + '" ' + oc + '></td>'
        + '<td style="font-size:11px;" title="' + esc(l.assertions.map(function(c){
              var a = assertIndex()[c]; return a ? a.lib + ' : ' + a.def : c;
          }).join('\n')) + '">' + esc(assertLibs(l.assertions)) + '</td>'
        + '<td><input type="number" min="1" max="5" value="' + l.p + '" onchange="calcRisk(this)"></td>'
        + '<td><input type="number" min="1" max="5" value="' + l.i + '" onchange="calcRisk(this)"></td>'
        + '<td class="calculated risk-score">' + l.score + '</td>'
        + '<td class="calculated risk-level">' + esc(l.niveau) + '</td>'
        + '<td><input type="text" value="' + esc(l.diligence) + '" ' + oc + '></td>'
        + '<td><button class="btn btn-danger" onclick="deleteRow(this)">✕</button></td>'
        + '</tr>';
}

/**
 * Remplit le tableau des risques.
 * @param {boolean} ajouter  true = conserver les lignes déjà saisies
 */
function risqGenerer(ajouter){
    var table = document.getElementById('table-risques');
    if(!table) return;
    var sel = document.getElementById('risq-secteur');
    var secteurId = sel ? sel.value : '';
    var lignes = genererCartographie(secteurId);

    var vide = document.getElementById('risq-vide');
    if(vide && vide.parentNode) vide.parentNode.removeChild(vide);

    if(!ajouter){
        /* On retire tout sauf la ligne d'en-têtes. */
        while(table.rows.length > 1) table.deleteRow(1);
    }
    var html = lignes.map(risqLigneHtml).join('');
    table.insertAdjacentHTML('beforeend', html);

    var eleves = lignes.filter(function(l){ return l.niveau === 'Élevé'; }).length;
    var moyens = lignes.filter(function(l){ return l.niveau === 'Moyen'; }).length;
    var info = document.getElementById('risq-info');
    if(info){
        info.innerHTML = lignes.length + ' risque(s) inscrit(s)'
            + (secteurId ? ' — dont ceux propres au secteur « ' + esc(secteurNom(secteurId)) + ' »' : '')
            + ' · <strong>' + eleves + '</strong> élevé(s), <strong>' + moyens + '</strong> moyen(s).'
            + ' La cotation proposée est un point de départ : ajustez-la selon votre connaissance de l’entité.';
    }
    if(typeof updateStatus === 'function') updateStatus('risques');
}

/* Auto-branchement : la liste des secteurs se remplit dès que le DOM
   existe, sans dépendre de l'orchestrateur d'initialisation. */
try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', risqInitSecteurs);
        else
            risqInitSecteurs();
    }
}catch(e){}

/* Panneau de référence : les treize assertions et leur définition. */
function risqAfficherAssertions(){
    var d = document.getElementById('risq-assertions');
    if(!d) return;
    if(d.style.display !== 'none'){ d.style.display = 'none'; return; }

    var cats = {}, ordre = [];
    ASSERTIONS.forEach(function(a){
        if(!cats[a.cat]){ cats[a.cat] = []; ordre.push(a.cat); }
        cats[a.cat].push(a);
    });
    var html = '<table style="font-size:12px;">'
             + '<tr><th style="width:22%;">Catégorie</th><th style="width:22%;">Assertion</th><th>Définition</th></tr>';
    ordre.forEach(function(cat){
        cats[cat].forEach(function(a, k){
            html += '<tr>'
                 + (k === 0 ? '<td rowspan="' + cats[cat].length + '"><strong>' + esc(cat) + '</strong></td>' : '')
                 + '<td>' + esc(a.lib) + '</td><td>' + esc(a.def) + '</td></tr>';
        });
    });
    html += '</table>'
         + '<p style="font-size:11px; color:#666; margin:8px 0 0;">Référentiel : NEP / ISA 315. '
         + 'Depuis la révision de 2019, les informations fournies en annexe se rattachent aux deux '
         + 'premières familles ; elles restent distinguées ici pour la clarté du programme de travail.</p>';
    d.innerHTML = html;
    d.style.display = 'block';
}
