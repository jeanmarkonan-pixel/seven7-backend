/* ==================================================================
   SEVEN7 — DILIGENCES NORMATIVES DE LA MISSION

   L'application couvrait le contrôle des comptes. Elle ne couvrait pas
   les diligences que les normes imposent AUTOUR de ce contrôle, et dont
   plusieurs sont d'ordre public en zone OHADA : acceptation et
   indépendance, fraude, continuité et procédure d'alerte, conventions
   réglementées, événements postérieurs, lettre d'affirmation,
   vérifications spécifiques, communication à la gouvernance, revue et
   archivage du dossier.

   Une mission sans ces éléments n'est pas documentée : le dossier ne
   démontre pas que le commissaire aux comptes a fait ce que la norme
   lui commande.

   Chaque section porte sa base normative. Les références AUSCGIE sont
   celles de l'Acte uniforme relatif au droit des sociétés commerciales
   et du GIE ; les références ISA renvoient aux normes internationales
   d'audit, applicables par renvoi des normes professionnelles.

   ATTENTION : ces libellés d'articles doivent être confrontés à la
   version en vigueur de l'Acte uniforme avant usage en mission. Ils
   sont donnés comme repères de travail, pas comme source de droit.
   ================================================================== */

/* Types de saisie disponibles pour un point de diligence :
     'oui'    → Oui / Non / N/A / En cours
     'texte'  → ligne de texte
     'zone'   → bloc de texte
     'date'   → date
     'nom'    → intervenant                                            */

var DILIGENCES = [

/* ---------------- PHASE 1 ---------------- */
{
 id:'acceptation', ico:'🤝', titre:'Acceptation & Indépendance', phase:1,
 norme:'ISA 210 · ISA 220 · AUSCGIE art. 694 à 700',
 objectif:"Établir que la mission peut être acceptée ou maintenue, que le commissaire aux comptes est indépendant et qu'aucune incompatibilité ne l'atteint, et que les termes de la mission sont convenus par écrit.",
 points:[
  {t:'oui', q:"Les conditions préalables à l'audit sont-elles réunies : référentiel comptable acceptable et accord de la direction sur ses responsabilités ?", aide:"ISA 210. Le référentiel est le SYSCOHADA révisé."},
  {t:'oui', q:"La lettre de mission a-t-elle été signée et versée au dossier ?", aide:"ISA 210. À renouveler en cas de changement de circonstances."},
  {t:'date', q:"Date de signature de la lettre de mission"},
  {t:'oui', q:"La nomination résulte-t-elle d'une décision régulière de l'assemblée, et la durée du mandat est-elle conforme ?", aide:"AUSCGIE : six exercices pour les SA, trois pour les SARL. Vérifier le PV et le dépôt au RCCM."},
  {t:'texte', q:"Exercices couverts par le mandat en cours (du … au …)"},
  {t:'oui', q:"L'absence d'incompatibilité a-t-elle été vérifiée pour chaque signataire et chaque membre de l'équipe ?", aide:"AUSCGIE art. 697 et suivants : dirigeants, apparentés, salariés, apports en nature, rémunération autre que les honoraires."},
  {t:'oui', q:"Une déclaration d'indépendance annuelle a-t-elle été recueillie auprès de chaque intervenant ?", aide:"ISA 220. Couvrir les liens financiers, personnels et d'affaires."},
  {t:'oui', q:"Les services non-audit rendus à l'entité ou à son groupe ont-ils été recensés et leur compatibilité appréciée ?"},
  {t:'oui', q:"Les honoraires proposés permettent-ils de couvrir les diligences nécessaires ?", aide:"Un honoraire manifestement insuffisant fait peser un risque sur la qualité et sur l'indépendance."},
  {t:'oui', q:"L'entité a-t-elle été soumise au dispositif de lutte contre le blanchiment et le financement du terrorisme (identification du bénéficiaire effectif) ?"},
  {t:'oui', q:"En cas de succession, le prédécesseur a-t-il été contacté et le dossier antérieur consulté ?", aide:"ISA 510 pour les soldes d'ouverture."},
  {t:'zone', q:"Conclusion sur l'acceptation ou le maintien de la mission"}
 ]
},
{
 id:'fraude', ico:'🕵️', titre:'Risque de Fraude', phase:1,
 norme:'ISA 240 · ISA 315',
 objectif:"Identifier et évaluer le risque d'anomalies significatives résultant de fraudes, et concevoir les procédures qui répondent à ce risque. La responsabilité de la prévention incombe à la direction et à la gouvernance ; celle de l'auditeur est d'obtenir une assurance raisonnable.",
 points:[
  {t:'date', q:"Date de la discussion au sein de l'équipe sur la vulnérabilité de l'entité à la fraude", aide:"ISA 240 §15 : cette discussion est obligatoire et doit être documentée."},
  {t:'zone', q:"Points saillants de cette discussion (zones jugées vulnérables, scénarios envisagés)"},
  {t:'oui', q:"La direction a-t-elle été interrogée sur son appréciation du risque de fraude et sur les fraudes connues, suspectées ou alléguées ?"},
  {t:'oui', q:"Les organes de gouvernance ont-ils été interrogés séparément sur le même sujet ?"},
  {t:'oui', q:"Le personnel comptable, l'audit interne et d'autres fonctions ont-ils été interrogés ?"},
  {t:'oui', q:"Le risque de fraude à la comptabilisation des produits a-t-il été apprécié ?", aide:"ISA 240 §26 : ce risque est présumé, sauf à documenter pourquoi il ne s'applique pas."},
  {t:'oui', q:"Le risque de contournement des contrôles par la direction a-t-il été traité ?", aide:"ISA 240 §31 : ce risque existe dans toute entité, quelle que soit la qualité du contrôle interne."},
  {t:'oui', q:"Les écritures comptables ont-elles fait l'objet de tests ciblés ?", aide:"Voir l'onglet Test des écritures. Diligence obligatoire, non substituable."},
  {t:'oui', q:"Les estimations comptables ont-elles été revues à la recherche d'un biais de la direction ?"},
  {t:'oui', q:"Les opérations inhabituelles ou hors du cours normal des affaires ont-elles été examinées ?"},
  {t:'oui', q:"Des indices de fraude ont-ils été relevés au cours des travaux ?"},
  {t:'zone', q:"Si oui : nature des faits, personnes concernées, incidence sur les comptes et suites données"},
  {t:'oui', q:"Une révélation de faits délictueux au Procureur de la République est-elle requise ?", aide:"Obligation propre au commissaire aux comptes en zone OHADA. À apprécier avec le conseil juridique ; la révélation ne se confond pas avec la dénonciation."},
  {t:'zone', q:"Conclusion sur le risque de fraude"}
 ]
},
{
 id:'continuite', ico:'⚠️', titre:'Continuité & Procédure d’alerte', phase:1,
 norme:'ISA 570 · AUSCGIE art. 150 et suivants',
 objectif:"Apprécier le caractère approprié de l'hypothèse de continuité d'exploitation retenue par la direction, et déclencher le cas échéant la procédure d'alerte prévue par l'Acte uniforme.",
 points:[
  {t:'oui', q:"Les indicateurs financiers de difficulté ont-ils été analysés ?", aide:"Capitaux propres négatifs ou inférieurs à la moitié du capital, fonds de roulement négatif, pertes récurrentes, emprunts arrivant à échéance sans refinancement."},
  {t:'oui', q:"Les indicateurs opérationnels et autres ont-ils été analysés ?", aide:"Départ de dirigeants clés, perte d'un marché majeur, litige ou sanction menaçant l'exploitation, rupture d'approvisionnement."},
  {t:'oui', q:"Les capitaux propres sont-ils devenus inférieurs à la moitié du capital social ?", aide:"AUSCGIE : régularisation dans les délais légaux, décision d'assemblée et publicité. À mentionner en annexe."},
  {t:'oui', q:"Une prévision de trésorerie a-t-elle été obtenue et son réalisme apprécié ?", aide:"Couvrir au moins douze mois à compter de la date d'arrêté."},
  {t:'oui', q:"Les hypothèses retenues par la direction ont-elles été discutées et testées ?"},
  {t:'oui', q:"Le soutien des actionnaires ou des banques est-il formalisé par écrit ?", aide:"Une lettre de soutien non engageante ne constitue pas un élément probant suffisant."},
  {t:'oui', q:"L'information donnée en annexe sur la continuité est-elle appropriée ?"},
  {t:'oui', q:"Des faits de nature à compromettre la continuité de l'exploitation ont-ils été relevés ?", aide:"C'est le fait générateur de la procédure d'alerte."},
  {t:'date', q:"Date de la demande d'explications écrite adressée au dirigeant (phase 1 de l'alerte)"},
  {t:'date', q:"Date de la réponse du dirigeant"},
  {t:'zone', q:"Suites données : saisine du conseil ou de l'assemblée, rapport spécial, information du président de la juridiction compétente"},
  {t:'texte', q:"Incidence retenue sur le rapport : opinion non modifiée · paragraphe d'observation · incertitude significative · opinion défavorable"},
  {t:'zone', q:"Conclusion sur la continuité d'exploitation"}
 ]
},

/* ---------------- PHASE 2 ---------------- */
{
 id:'parties-liees', ico:'🔗', titre:'Parties liées & Conventions réglementées', phase:2,
 norme:'ISA 550 · AUSCGIE art. 438 et suivants',
 objectif:"Identifier les parties liées et les opérations conclues avec elles, apprécier leur traitement comptable et l'information donnée, et réunir les éléments du rapport spécial sur les conventions réglementées.",
 points:[
  {t:'oui', q:"La liste des parties liées a-t-elle été obtenue de la direction et recoupée ?", aide:"Actionnaires, dirigeants et leurs proches, sociétés du groupe, entités sous contrôle commun ou influence notable."},
  {t:'oui', q:"L'équipe a-t-elle échangé sur la vulnérabilité des comptes aux anomalies liées aux parties liées ?", aide:"ISA 550 §12 : discussion obligatoire."},
  {t:'oui', q:"Les conventions réglementées ont-elles été recensées et autorisées préalablement par l'organe compétent ?", aide:"AUSCGIE : autorisation préalable du conseil d'administration ou de l'assemblée selon la forme sociale."},
  {t:'oui', q:"Les conventions interdites ont-elles été recherchées ?", aide:"Notamment les emprunts contractés auprès de la société par les dirigeants et les cautions données par la société à leur profit."},
  {t:'oui', q:"Les conventions courantes conclues à des conditions normales ont-elles été distinguées des conventions réglementées ?"},
  {t:'oui', q:"Les comptes courants d'associés font-ils l'objet d'une convention écrite, et leur rémunération est-elle conforme ?"},
  {t:'oui', q:"Les opérations conclues hors du cours normal des affaires ont-elles été examinées ?", aide:"ISA 550 §23 : en apprécier la substance économique réelle."},
  {t:'oui', q:"L'information donnée en annexe sur les parties liées est-elle complète ?"},
  {t:'oui', q:"Le rapport spécial sur les conventions réglementées a-t-il été établi ?", aide:"Rapport distinct du rapport général, présenté à l'assemblée qui statue sur les comptes."},
  {t:'zone', q:"Liste des conventions à mentionner au rapport spécial (parties, objet, conditions, montants de l'exercice)"},
  {t:'zone', q:"Conclusion sur les parties liées"}
 ]
},
{
 id:'ecritures', ico:'📓', titre:'Test des écritures comptables', phase:2,
 norme:'ISA 240 §32',
 objectif:"Tester les écritures portées au grand livre et les autres ajustements, pour répondre au risque de contournement des contrôles par la direction. Cette diligence est obligatoire et ne se substitue à aucune autre.",
 points:[
  {t:'oui', q:"La séquence des numéros d'écriture a-t-elle été contrôlée sans rupture ni doublon ?"},
  {t:'oui', q:"Les écritures passées en dehors des heures ouvrées ou les jours non ouvrés ont-elles été extraites ?"},
  {t:'oui', q:"Les écritures saisies par des utilisateurs inhabituels ou disposant de droits étendus ont-elles été identifiées ?"},
  {t:'oui', q:"Les écritures de montant rond ou proche d'un seuil d'autorisation ont-elles été examinées ?"},
  {t:'oui', q:"Les écritures passées après la date de clôture ou en période d'arrêté ont-elles été revues ?"},
  {t:'oui', q:"Les écritures sans libellé, ou au libellé non explicite, ont-elles été justifiées ?"},
  {t:'oui', q:"Les écritures mouvementant des comptes rarement utilisés ou des comptes d'attente ont-elles été analysées ?"},
  {t:'oui', q:"Les contreparties inhabituelles (produit contre trésorerie sans tiers, par exemple) ont-elles été recherchées ?"},
  {t:'texte', q:"Nombre d'écritures de l'exercice · nombre d'écritures sélectionnées · critères retenus"},
  {t:'zone', q:"Anomalies relevées et suites données"},
  {t:'zone', q:"Conclusion sur le test des écritures"}
 ]
},
{
 id:'estimations', ico:'📐', titre:'Estimations comptables', phase:2,
 norme:'ISA 540',
 objectif:"Apprécier le caractère raisonnable des estimations comptables et des informations fournies à leur sujet, et rechercher les indices d'un biais de la direction.",
 points:[
  {t:'oui', q:"Les estimations significatives ont-elles été recensées ?", aide:"Dépréciations de créances et de stocks, provisions pour risques et litiges, indemnités de fin de carrière, durées d'amortissement, provisions pour garanties."},
  {t:'oui', q:"La méthode retenue par la direction, les hypothèses et les données sources ont-elles été comprises et documentées ?"},
  {t:'oui', q:"Les estimations de l'exercice précédent ont-elles été comparées à leur dénouement réel ?", aide:"ISA 540 : la revue rétrospective éclaire la fiabilité du processus d'estimation et révèle les biais."},
  {t:'oui', q:"Une estimation indépendante ou une fourchette a-t-elle été développée pour les estimations les plus sensibles ?"},
  {t:'oui', q:"Les événements postérieurs confirmant ou infirmant l'estimation ont-ils été pris en compte ?"},
  {t:'oui', q:"Le degré d'incertitude a-t-il été apprécié et l'information en annexe jugée suffisante ?"},
  {t:'oui', q:"Des indices de biais de la direction ont-ils été relevés ?", aide:"Estimations systématiquement prudentes ou optimistes, changement de méthode non justifié, lissage du résultat."},
  {t:'zone', q:"Conclusion sur les estimations comptables"}
 ]
},
{
 id:'evenements-post', ico:'📅', titre:'Événements postérieurs à la clôture', phase:2,
 norme:'ISA 560',
 objectif:"Obtenir des éléments probants sur les événements survenus entre la clôture et la date du rapport, et répondre aux faits portés à la connaissance de l'auditeur après cette date.",
 points:[
  {t:'date', q:"Date d'arrêté des comptes par l'organe compétent"},
  {t:'date', q:"Date de signature du rapport"},
  {t:'oui', q:"Les PV des organes sociaux postérieurs à la clôture ont-ils été lus ?"},
  {t:'oui', q:"Les situations comptables intermédiaires postérieures ont-elles été examinées ?"},
  {t:'oui', q:"La direction a-t-elle été interrogée sur les événements postérieurs significatifs ?"},
  {t:'oui', q:"Les encaissements et décaissements postérieurs ont-ils été analysés ?", aide:"Ils éclairent la recouvrabilité des créances et l'exhaustivité des dettes à la clôture."},
  {t:'oui', q:"Les litiges nés ou dénoués après la clôture ont-ils été recensés ?"},
  {t:'oui', q:"La distinction a-t-elle été faite entre les événements donnant lieu à ajustement et ceux donnant lieu à information en annexe ?", aide:"Ajustement si l'événement confirme une situation existant à la clôture ; information seulement s'il naît après."},
  {t:'zone', q:"Événements relevés, qualification retenue et traitement comptable"},
  {t:'zone', q:"Conclusion sur les événements postérieurs"}
 ]
},

/* ---------------- PHASE 3 ---------------- */
{
 id:'anomalies-non-corrigees', ico:'📊', titre:'Anomalies non corrigées', phase:3,
 norme:'ISA 450 · ISA 320',
 objectif:"Cumuler les anomalies relevées, demander leur correction, et apprécier l'incidence de celles qui ne le sont pas sur l'opinion.",
 points:[
  {t:'texte', q:"Seuil de signification retenu pour les comptes pris dans leur ensemble"},
  {t:'texte', q:"Seuil de planification (seuil de travail)"},
  {t:'texte', q:"Seuil au-delà duquel une anomalie est portée à la connaissance de la gouvernance"},
  {t:'oui', q:"Les anomalies relevées ont-elles toutes été cumulées, y compris celles jugées manifestement négligeables ?"},
  {t:'oui', q:"Leur correction a-t-elle été demandée à la direction ?"},
  {t:'zone', q:"Anomalies corrigées par l'entité (nature, montant, incidence)"},
  {t:'zone', q:"Anomalies NON corrigées (nature, montant, assertion et poste concernés)"},
  {t:'texte', q:"Incidence cumulée sur le résultat net · sur les capitaux propres · sur le total du bilan"},
  {t:'oui', q:"L'incidence cumulée reste-t-elle inférieure au seuil de signification ?"},
  {t:'oui', q:"Les anomalies qualitatives ont-elles été appréciées, indépendamment de leur montant ?", aide:"Information en annexe manquante, non-respect d'une obligation légale, opération avec une partie liée non mentionnée."},
  {t:'oui', q:"La direction a-t-elle confirmé par écrit son refus de corriger et ses motifs ?", aide:"À intégrer à la lettre d'affirmation."},
  {t:'zone', q:"Conclusion et incidence sur l'opinion"}
 ]
},
{
 id:'affirmations', ico:'✍️', titre:'Lettre d’affirmation', phase:3,
 norme:'ISA 580',
 objectif:"Obtenir de la direction les déclarations écrites que les normes exigent, à une date aussi proche que possible de celle du rapport.",
 points:[
  {t:'date', q:"Date de la lettre d'affirmation"},
  {t:'oui', q:"La lettre est-elle datée d'une date proche de celle du rapport, et jamais postérieure ?"},
  {t:'oui', q:"La direction confirme-t-elle avoir rempli ses responsabilités dans l'établissement des comptes ?"},
  {t:'oui', q:"Confirme-t-elle avoir fourni toutes les informations et tous les accès convenus ?"},
  {t:'oui', q:"Confirme-t-elle que toutes les opérations ont été enregistrées et sont reflétées dans les comptes ?"},
  {t:'oui', q:"La lettre couvre-t-elle la fraude : appréciation du risque, fraudes connues ou suspectées, allégations reçues ?", aide:"ISA 240 §39."},
  {t:'oui', q:"Couvre-t-elle le respect des textes légaux et réglementaires et les cas de non-respect connus ?"},
  {t:'oui', q:"Couvre-t-elle l'exhaustivité des parties liées et des conventions conclues avec elles ?"},
  {t:'oui', q:"Couvre-t-elle les litiges, réclamations et passifs éventuels ?"},
  {t:'oui', q:"Couvre-t-elle les événements postérieurs et les hypothèses de continuité d'exploitation ?"},
  {t:'oui', q:"Couvre-t-elle les anomalies non corrigées et leur caractère non significatif de l'avis de la direction ?"},
  {t:'oui', q:"Est-elle signée par les personnes ayant la responsabilité et la connaissance des sujets couverts ?"},
  {t:'zone', q:"Réserves ou refus opposés par la direction, et conséquences sur l'opinion", aide:"Un refus de fournir les déclarations exigées conduit à une impossibilité d'exprimer une opinion."}
 ]
},
{
 id:'verifications-legales', ico:'⚖️', titre:'Vérifications spécifiques & obligations légales', phase:3,
 norme:'AUSCGIE · normes professionnelles',
 objectif:"Procéder aux vérifications que la loi met à la charge du commissaire aux comptes, distinctes de la certification des comptes.",
 points:[
  {t:'oui', q:"La sincérité et la concordance du rapport de gestion avec les comptes ont-elles été vérifiées ?"},
  {t:'oui', q:"Les documents adressés aux actionnaires concordent-ils avec les comptes annuels ?"},
  {t:'oui', q:"L'égalité entre associés a-t-elle été contrôlée ?", aide:"Notamment l'égalité de traitement dans la distribution et l'exercice des droits sociaux."},
  {t:'oui', q:"Le respect des dispositions relatives au capital social a-t-il été vérifié ?", aide:"Libération, capital minimum de la forme sociale, régularité des augmentations et réductions."},
  {t:'oui', q:"La dotation à la réserve légale est-elle conforme ?"},
  {t:'oui', q:"Les délais légaux de tenue de l'assemblée et de dépôt des états financiers sont-ils respectés ?"},
  {t:'oui', q:"Les prises de participation et prises de contrôle de l'exercice ont-elles été mentionnées ?"},
  {t:'oui', q:"Le tableau des résultats des cinq derniers exercices a-t-il été vérifié, le cas échéant ?"},
  {t:'oui', q:"L'obligation de consolidation a-t-elle été examinée ?", aide:"AUSCGIE : établissement de comptes consolidés par les sociétés qui contrôlent d'autres entités."},
  {t:'oui', q:"Les états financiers déposés sont-ils conformes au modèle SYSCOHADA du système applicable ?", aide:"Système normal, système minimal de trésorerie ou système allégé selon la taille."},
  {t:'zone', q:"Irrégularités relevées et mention prévue au rapport"}
 ]
},
{
 id:'communication-gouvernance', ico:'📣', titre:'Communication à la gouvernance', phase:3,
 norme:'ISA 260 · ISA 265',
 objectif:"Communiquer aux organes de gouvernance les éléments que les normes imposent, et signaler par écrit les faiblesses significatives du contrôle interne.",
 points:[
  {t:'oui', q:"L'étendue et le calendrier de la mission ont-ils été communiqués en début de mission ?"},
  {t:'oui', q:"Les constatations significatives ont-elles été communiquées ?", aide:"Choix et application des méthodes comptables, estimations sensibles, informations fournies, difficultés rencontrées."},
  {t:'oui', q:"L'indépendance de l'auditeur a-t-elle été confirmée par écrit à la gouvernance ?"},
  {t:'oui', q:"Les faiblesses significatives du contrôle interne ont-elles été communiquées par écrit et en temps utile ?", aide:"ISA 265. La communication écrite est requise pour les faiblesses significatives."},
  {t:'oui', q:"Les anomalies non corrigées ont-elles été portées à la connaissance de la gouvernance ?"},
  {t:'oui', q:"Les désaccords éventuels avec la direction ont-ils été communiqués ?"},
  {t:'date', q:"Date de la réunion ou de la lettre de communication"},
  {t:'zone', q:"Points communiqués et réponses obtenues"},
  {t:'zone', q:"Faiblesses de contrôle interne signalées et recommandations associées"}
 ]
},
{
 id:'revue-dossier', ico:'🔍', titre:'Revue & documentation du dossier', phase:3,
 norme:'ISA 220 · ISA 230',
 objectif:"Établir que les travaux ont été supervisés et revus, et que le dossier permet à un auditeur expérimenté n'ayant pas participé à la mission d'en comprendre la nature, le calendrier et l'étendue.",
 points:[
  {t:'nom', q:"Associé signataire responsable de la mission"},
  {t:'nom', q:"Composition de l'équipe et répartition des travaux"},
  {t:'oui', q:"Les travaux des collaborateurs ont-ils été supervisés et revus par un membre plus expérimenté ?"},
  {t:'oui', q:"L'associé signataire a-t-il revu la documentation critique avant la date du rapport ?"},
  {t:'oui', q:"Une revue indépendante du dossier a-t-elle été réalisée lorsqu'elle est requise ?", aide:"Entités d'intérêt public, missions à risque élevé, ou selon la politique du cabinet."},
  {t:'nom', q:"Revue indépendante réalisée par"},
  {t:'oui', q:"Les consultations sur des points difficiles ont-elles été documentées, avec les conclusions retenues ?"},
  {t:'oui', q:"Les divergences d'appréciation au sein de l'équipe ont-elles été résolues et documentées ?"},
  {t:'oui', q:"Le dossier permet-il de comprendre qui a exécuté chaque travail, quand, et qui l'a revu ?", aide:"ISA 230 §9."},
  {t:'date', q:"Date de constitution définitive du dossier", aide:"À constituer dans un délai raisonnable après la date du rapport."},
  {t:'oui', q:"Les modalités de conservation et de confidentialité du dossier sont-elles respectées ?"},
  {t:'zone', q:"Conclusion générale : les éléments probants réunis sont-ils suffisants et appropriés ?"}
 ]
}
];

/* ------------------------------------------------------------------
   RENDU
   ------------------------------------------------------------------ */
var DILI_INDEX = null;
function diliIndex(){
    if(DILI_INDEX) return DILI_INDEX;
    DILI_INDEX = {};
    DILIGENCES.forEach(function(d){ DILI_INDEX[d.id] = d; });
    return DILI_INDEX;
}

/* Cellule de saisie d'un point, selon son type. */
function diliChampHtml(type, tabId){
    var oc = 'onchange="updateStatus(\'' + tabId + '\')"';
    switch(type){
        case 'oui':
            return '<select ' + oc + '><option></option><option>Oui</option><option>Non</option>'
                 + '<option>N/A</option><option>En cours</option></select>';
        case 'date':  return '<input type="date" class="date-input" ' + oc + '>';
        case 'zone':  return '<textarea rows="3" ' + oc + '></textarea>';
        case 'nom':   return '<input type="text" data-fmt="non" ' + oc + '>';
        default:      return '<input type="text" data-fmt="non" ' + oc + '>';
    }
}

/* Panneau complet d'une section de diligences. */
function diliPanneauHtml(d){
    var h = '<div class="card" data-tab="' + esc(d.id) + '">'
          + '<h2>' + esc(d.ico + ' ' + d.titre.toUpperCase()) + '</h2>'
          + '<div class="alert alert-info"><strong>Base normative :</strong> ' + esc(d.norme)
          + '<br>' + esc(d.objectif) + '</div>'
          + '<table><tr><th style="width:56%;">Diligence</th><th style="width:22%;">Réponse / Constat</th>'
          + '<th style="width:22%;">Référence de travail · W/P</th></tr>';
    d.points.forEach(function(p){
        h += '<tr><td>' + esc(p.q)
           + (p.aide ? '<br><span style="font-size:11px; color:#777;">' + esc(p.aide) + '</span>' : '')
           + '</td><td>' + diliChampHtml(p.t, d.id) + '</td>'
           + '<td><input type="text" data-fmt="non" onchange="updateStatus(\'' + esc(d.id) + '\')"></td></tr>';
    });
    h += '</table>'
       + '<div class="form-group" style="margin-top:14px;"><label>Conclusion de la section</label>'
       + '<textarea rows="3" onchange="updateStatus(\'' + esc(d.id) + '\')"></textarea></div>'
       + '</div>';
    return h;
}

/* Insère les panneaux et les boutons de navigation, et déclare les
   onglets pour la sauvegarde. Idempotent : ne fait rien deux fois, et
   ne touche jamais un panneau déjà rempli (contenu restauré depuis
   Firestore, qui doit primer sur le gabarit vierge). */
function diliInstaller(){
    var hote = document.getElementById('tab-contents')
            || (document.querySelector('.tab-content') || {}).parentNode;
    if(!hote) return;

    DILIGENCES.forEach(function(d){
        /* 1. le panneau */
        var panneau = document.getElementById(d.id);
        if(!panneau){
            panneau = document.createElement('div');
            panneau.id = d.id;
            panneau.className = 'tab-content';
            panneau.innerHTML = diliPanneauHtml(d);
            hote.appendChild(panneau);
        } else if(!panneau.innerHTML.trim()){
            panneau.innerHTML = diliPanneauHtml(d);
        }

        /* 2. le bouton de navigation, dans le menu de sa phase */
        var menu = document.getElementById('phase-dropdown-' + d.phase);
        if(menu && !menu.querySelector('[data-dili="' + d.id + '"]')){
            var b = document.createElement('button');
            b.className = 'tab-btn phase' + d.phase;
            b.setAttribute('data-dili', d.id);
            b.setAttribute('onclick', "showTab('" + d.id + "')");
            b.textContent = d.ico + ' ' + d.titre;
            menu.appendChild(b);
        }

        /* 3. la déclaration pour la sauvegarde par onglet */
        if(typeof TABS !== 'undefined' && !TABS.some(function(t){ return t.id === d.id; }))
            TABS.push({ id:d.id, label:d.ico + ' ' + d.titre, phase:d.phase });
    });
}

try{
    if(typeof document !== 'undefined'){
        if(document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', diliInstaller);
        else
            diliInstaller();
    }
}catch(e){}
