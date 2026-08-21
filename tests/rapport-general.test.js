/* ==================================================================
   RAPPORT GÉNÉRAL DU COMMISSAIRE AUX COMPTES

   Le livrable final de la mission. Ces tests protègent deux choses :

   · la STRUCTURE — un rapport auquel manque une section normative est
     irrecevable, et l'omission ne se voit pas à la relecture ;
   · le fait que l'opinion reste un CHOIX. L'outil ne doit jamais
     déduire une certification de l'absence de constatation : il
     informe, l'auditeur décide.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI, liasseReference } from './harness.js';

const app = chargerApplication();
app.chargerBalances(balancesMTTCI());
const REF = liasseReference();
const S = app.sandbox;
const local = v => JSON.parse(JSON.stringify(v));

/** Renseigne la fiche d'identification puis produit le texte. */
function rapport(champs){
    const defauts = {
        'fi-raison': 'MANUTENTION TRANSIT-TRANSPORT', 'fi-forme': 'SA',
        'fi-capital': '25000000', 'fi-cloture': '2025-12-31',
        'rap-opinion': 'CERT', 'rap-lieu': 'Abidjan', 'rap-date': '2026-04-30',
        'rap-cabinet': 'CABINET SEVEN7', 'rap-signataire': 'Jean Mark ONAN',
        'rap-observation': '',
    };
    const tout = Object.assign({}, defauts, champs || {});
    for(const [id, v] of Object.entries(tout)) S.document.getElementById(id).value = v;
    S.document.getElementById('rap-continuite').checked     = !!(champs && champs.continuite);
    S.document.getElementById('rap-questions-cles').checked  = !!(champs && champs.questionsCles);
    S.document.getElementById('rap-autres-infos').checked    = !(champs && champs.sansAutresInfos);
    return S.rapGenerer();
}

test('STRUCTURE — les sections normatives sont toutes présentes', () => {
    // ISA 700 : l'absence d'une seule de ces sections rend le rapport
    // non conforme, et rien à la relecture ne le signale.
    const t = rapport();
    for(const section of [
        'RAPPORT DU COMMISSAIRE AUX COMPTES, AUDITEUR INDÉPENDANT',
        'Aux actionnaires de',
        'OPINION',
        "FONDEMENT DE L'OPINION",
        'RESPONSABILITÉS DE LA DIRECTION',
        "RESPONSABILITÉS DU COMMISSAIRE AUX COMPTES POUR L'AUDIT DES ÉTATS FINANCIERS",
        'VÉRIFICATIONS SPÉCIFIQUES',
        'Commissaire aux comptes',
    ]) assert.ok(t.includes(section), `section absente : « ${section} »`);
});

test('ISA 700 §21 — le titre indique clairement l’indépendance de l’auditeur', () => {
    // Exigence explicite : « un titre qui indique clairement qu'il s'agit
    // du rapport d'un auditeur indépendant ». Le seul intitulé « rapport
    // du commissaire aux comptes » n'y suffit pas.
    assert.match(rapport().split('\n')[0], /INDÉPENDANT/);
});

test('ISA 700 §28 — le fondement porte les quatre éléments exigés', () => {
    const t = rapport();
    assert.match(t, /Normes internationales d'audit \(ISA\)/,
        'a) la référence aux normes appliquées');
    assert.match(t, /section « Responsabilités du commissaire aux comptes pour l'audit des états financiers »/,
        'b) le renvoi à la section des responsabilités');
    assert.match(t, /Nous sommes indépendants de la société/, 'c) la déclaration d’indépendance');
    // apostrophe droite ou typographique : le test porte sur le fond, pas sur la saisie
    assert.match(t, /en République de Côte d['’]Ivoire/,
        'c) le PAYS d’où émanent les règles de déontologie — exigé, souvent oublié');
    assert.match(t, /suffisants et appropriés pour fonder notre opinion/,
        'd) l’appréciation des éléments probants');
});

test('ISA 720 — la section « Autres informations » est produite par défaut', () => {
    // En pratique OHADA, il y a toujours un rapport de gestion : la section
    // s'impose donc presque systématiquement.
    const t = rapport();
    assert.ok(t.includes('AUTRES INFORMATIONS'));
    assert.match(t, /La responsabilité des autres informations incombe à la direction/);
    assert.match(t, /n'exprimons aucune forme d'assurance/,
        'le rapport doit dire qu’il ne couvre PAS ces informations');
    assert.ok(t.indexOf('AUTRES INFORMATIONS') < t.indexOf('RESPONSABILITÉS DE LA DIRECTION'),
        'la section se place avant les responsabilités');
});

test('ISA 701 — les questions clés ne sont produites que si demandées', () => {
    assert.ok(!rapport().includes("QUESTIONS CLÉS DE L'AUDIT"));
    const t = rapport({ questionsCles: true });
    assert.ok(t.includes("QUESTIONS CLÉS DE L'AUDIT"));
    assert.match(t, /nous n'exprimons pas une opinion distincte sur ces questions/,
        'la réserve d’usage doit figurer, sans quoi la section se lirait comme des opinions');
});

test('STRUCTURE — l’ordre des sections suit la norme', () => {
    const t = rapport();
    const ordre = ['OPINION', "FONDEMENT DE L'OPINION", 'RESPONSABILITÉS DE LA DIRECTION',
                   'RESPONSABILITÉS DU COMMISSAIRE', 'VÉRIFICATIONS SPÉCIFIQUES'];
    let precedent = -1;
    for(const s of ordre){
        const i = t.indexOf(s);
        assert.ok(i > precedent, `« ${s} » n’est pas à sa place dans l’ordre normatif`);
        precedent = i;
    }
});

test('CHIFFRES — le rapport cite le total du bilan et le résultat de la liasse', () => {
    // Un rapport qui annoncerait d'autres chiffres que les états certifiés
    // serait un faux : ces montants viennent du même moteur que la liasse.
    const t = rapport();
    assert.ok(t.includes(S.fmt(REF.actif.BZ[2])), 'total du bilan absent ou divergent');
    assert.ok(t.includes(S.fmt(REF.resultat.XI[0])), 'résultat net absent ou divergent');
    assert.ok(t.includes('(bénéfice)'), 'le sens du résultat doit être qualifié');
});

test('CHIFFRES — une perte est qualifiée comme telle', () => {
    const sauve = app.evaluer('JSON.stringify(balanceData)');
    try{
        // On force un résultat négatif en ne gardant que des charges.
        app.chargerBalances({
            n:  [{compte:'60110000', intitule:'ACHATS', od:0, oc:0, md:0, mc:0, sd:900000, sc:0},
                 {compte:'52110000', intitule:'BANQUE', od:0, oc:0, md:0, mc:0, sd:0, sc:900000}],
            n1: [],
        });
        assert.ok(rapport().includes('(perte)'), 'une perte doit être qualifiée');
    } finally { app.chargerBalances(JSON.parse(sauve)); }
});

test('OPINION — les quatre opinions normatives sont proposées', () => {
    const codes = local(S.RAP_OPINIONS).map(o => o.code);
    assert.deepEqual(codes.sort(), ['CERT', 'IMPOSS', 'REFUS', 'RESERVE']);
    for(const o of local(S.RAP_OPINIONS)){
        assert.ok(o.lib && o.titre && o.phrase, `opinion ${o.code} incomplète`);
        assert.ok(o.phrase.length > 80, `formule trop courte pour ${o.code}`);
    }
});

test('OPINION — chaque opinion produit son titre et sa formule propres', () => {
    const attendu = {
        CERT:    [/^OPINION$/m,                          /certifions que les états financiers/],
        RESERVE: [/OPINION AVEC RÉSERVE/,                 /sous la réserve décrite/],
        REFUS:   [/OPINION DÉFAVORABLE/,                  /ne sont pas réguliers et sincères/],
        IMPOSS:  [/IMPOSSIBILITÉ D'EXPRIMER UNE OPINION/, /ne sommes pas en mesure d'exprimer une opinion/],
    };
    for(const [code, [titre, formule]] of Object.entries(attendu)){
        const t = rapport({ 'rap-opinion': code });
        assert.match(t, titre,   `${code} : titre attendu absent`);
        assert.match(t, formule, `${code} : formule attendue absente`);
    }
});

test('OPINION — une opinion modifiée appelle un fondement à rédiger', () => {
    // La norme impose d'exposer les faits ET leur incidence chiffrée :
    // le canevas doit le réclamer explicitement, pas laisser un blanc.
    for(const code of ['RESERVE', 'REFUS', 'IMPOSS']){
        const t = rapport({ 'rap-opinion': code });
        assert.match(t, /\[Exposer ici/, `${code} : aucune invite à motiver la modification`);
    }
    assert.ok(!rapport({ 'rap-opinion': 'CERT' }).includes('[Exposer ici'),
        'une certification sans réserve n’a pas à être motivée ainsi');
});

test('OPINION — l’outil ne choisit jamais l’opinion à la place de l’auditeur', () => {
    // Sur MTTCI, aucune constatation bloquante. Le rapport ne doit pas pour
    // autant basculer d'office en certification : c'est le champ « Opinion
    // retenue » qui commande, et lui seul.
    const bloquants = local(S.rapConstatations()).bloquants;
    assert.equal(bloquants.length, 0, 'le jeu de référence ne doit produire aucun bloquant');
    assert.match(rapport({ 'rap-opinion': 'REFUS' }), /OPINION DÉFAVORABLE/,
        'le refus doit être respecté même sans constatation bloquante');
});

test('CONTINUITÉ — la section n’apparaît que si elle est demandée', () => {
    assert.ok(!rapport().includes('INCERTITUDE SIGNIFICATIVE'));
    const t = rapport({ continuite: true });
    assert.ok(t.includes('INCERTITUDE SIGNIFICATIVE LIÉE À LA CONTINUITÉ'));
    assert.match(t, /Notre opinion n'est pas modifiée à l'égard de ce point/,
        'la section doit préciser que l’opinion n’est pas modifiée');
    // elle se place avant les responsabilités, conformément à la norme
    assert.ok(t.indexOf('INCERTITUDE') < t.indexOf('RESPONSABILITÉS DE LA DIRECTION'));
});

test('OBSERVATION — la section n’apparaît que si un texte est saisi', () => {
    assert.ok(!rapport().includes('OBSERVATION'));
    const t = rapport({ 'rap-observation': 'le changement de méthode d’évaluation des stocks' });
    assert.ok(t.includes('OBSERVATION'));
    assert.match(t, /Sans remettre en cause l'opinion/,
        'une observation ne doit jamais se lire comme une réserve');
    assert.ok(t.includes('changement de méthode'));
});

test('SIGNATURE — lieu, date, cabinet et signataire sont repris', () => {
    const t = rapport();
    assert.ok(t.includes('Fait à Abidjan, le 30/04/2026'), 'lieu ou date mal formés');
    assert.ok(t.includes('CABINET SEVEN7'));
    assert.ok(t.includes('Jean Mark ONAN'));
});

test('SIGNATURE — les champs non renseignés restent des marqueurs visibles', () => {
    // Un rapport exporté avec « [Lieu] » se corrige ; un rapport exporté
    // avec un blanc passe inaperçu.
    const t = rapport({ 'rap-lieu': '', 'rap-date': '', 'rap-cabinet': '', 'rap-signataire': '' });
    for(const m of ['[Lieu]', '[date du rapport]', '[Cabinet]', '[Nom du commissaire aux comptes]'])
        assert.ok(t.includes(m), `marqueur attendu absent : ${m}`);
});

test('IDENTIFICATION — la raison sociale manquante reste un marqueur', () => {
    const t = rapport({ 'fi-raison': '' });
    assert.ok(t.includes('[Raison sociale]'));
});

test('CONSTATATIONS — sans source d’anomalies, le fondement reste vide sans casser', () => {
    // L'onglet Constatations d'audit (fmCollecter) a été retiré : rapConstatations()
    // doit se dégrader proprement (listes vides), pas lever d'exception. Le moteur de
    // centralisation des anomalies est destiné à lui redonner une source réelle.
    const sauve = app.evaluer('JSON.stringify(balanceData)');
    try{
        app.chargerBalances({
            n:  [{compte:'52110000', intitule:'BANQUE', od:0, oc:0, md:0, mc:0, sd:1000000, sc:0}],
            n1: [],
        });
        const bloquants = local(S.rapConstatations()).bloquants;
        assert.deepEqual(bloquants, [], 'aucune source d’anomalies branchée pour l’instant');
        const t = rapport({ 'rap-opinion': 'RESERVE' });
        assert.match(t, /Exposer ici, de façon claire et chiffrée/,
            'sans bloquant collecté, le fondement doit rester un marqueur à compléter, pas planter');
    } finally { app.chargerBalances(JSON.parse(sauve)); }
});

test('FORMAT — le rapport tient dans un texte exploitable', () => {
    const t = rapport();
    assert.ok(t.length > 3500, `rapport trop court : ${t.length} caractères`);
    assert.ok(!t.includes('undefined'), 'valeur non résolue dans le texte');
    assert.ok(!t.includes('NaN'), 'montant non résolu dans le texte');
    assert.ok(!/\[object/.test(t), 'objet non converti dans le texte');
});
