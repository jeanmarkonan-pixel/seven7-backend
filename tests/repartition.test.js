/* ==================================================================
   RÉPARTITION DES COMPTES AMBIGUS (suffixe « p »)

   Certains comptes d'amortissement sont revendiqués par plusieurs
   postes : 2818p par AE et AH, 2919p par AE, AF et AH, 2949p par AM
   et AN. Le moteur les rattachait en totalité au premier poste
   déclaré : total juste, ventilation fausse.

   Deux propriétés protègent l'auditeur, et ces tests les tiennent :

   1. UNE SUGGESTION NE S'APPLIQUE JAMAIS SEULE. Tant que l'arbitrage
      n'est pas rendu, aucun pourcentage n'est appliqué.
   2. UN COMPTE NON RÉPARTI NE DISPARAÎT PAS. Il reste rattaché comme
      avant, sans quoi le bilan cesserait d'équilibrer — un défaut bien
      pire que la ventilation approchée qu'il remplace.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI, liasseReference, arrondi } from './harness.js';

const app = chargerApplication();
app.chargerBalances(balancesMTTCI());
const REF = liasseReference();
const S = app.sandbox;
const local = v => JSON.parse(JSON.stringify(v));

/** Balance minimale portant un compte ambigu, pour isoler le mécanisme. */
function avecCompteAmbigu(compte, montantCrediteur, fn){
    const sauve = app.evaluer('JSON.stringify(balanceData)');
    try{
        app.chargerBalances({
            n: [
                { compte:'21300000', intitule:'LOGICIELS',   od:0, oc:0, md:0, mc:0, sd:1000000, sc:0 },
                { compte:'21800000', intitule:'AUTRES INCORP', od:0, oc:0, md:0, mc:0, sd:2000000, sc:0 },
                { compte:compte,     intitule:'AMORT AMBIGU', od:0, oc:0, md:0, mc:0, sd:0, sc:montantCrediteur },
            ],
            n1: [],
        });
        fn();
    } finally {
        app.chargerBalances(JSON.parse(sauve));
        S.repEffacer();
    }
}

test('SÛRETÉ — une suggestion non validée ne s’applique pas', () => {
    // C'est la garantie centrale : le référentiel PROPOSE 50/50 sur 2818,
    // mais tant que l'auditeur n'a pas tranché, rien n'est réparti.
    S.repEffacer();
    assert.equal(S.repQuoteParts('28180000'), null,
        'une suggestion ne doit produire aucune quote-part');
    const regle = local(S.repCharger())['2818'];
    assert.equal(regle.origine, 'suggestion');
    assert.equal(regle.validePar, null);
    assert.deepEqual(regle.cibles.map(c => c.ref), ['AE', 'AH'], 'la suggestion reste consultable');
});

test('SÛRETÉ — un compte non réparti reste rattaché, le bilan tient', () => {
    // Sans ce repli, le montant disparaîtrait du bilan.
    avecCompteAmbigu('28180000', 400000, () => {
        const A = S.liasseGetActif('n');
        const totalAmort = ['AE','AF','AG','AH'].reduce((s, r) => s + ((A[r]||{}).amort || 0), 0);
        assert.equal(arrondi(totalAmort), 400000, 'le montant doit rester dans le bilan');
        assert.equal(arrondi(A.AD.amort), 400000, 'la section AD doit le porter');
        assert.equal(arrondi(A.AZ.amort), 400000, 'le total AZ doit le porter');
    });
});

test('RÉPARTITION — un arbitrage validé ventile réellement le montant', () => {
    avecCompteAmbigu('28180000', 400000, () => {
        S.repValider('2818', [{ref:'AE', pct:0.5}, {ref:'AH', pct:0.5}], 'test');
        const parts = local(S.repQuoteParts('28180000'));
        assert.deepEqual(parts, { AE:0.5, AH:0.5 });

        const A = S.liasseGetActif('n');
        assert.equal(arrondi(A.AE.amort), 200000, 'AE doit recevoir la moitié');
        assert.equal(arrondi(A.AH.amort), 200000, 'AH doit recevoir la moitié');
        assert.equal(arrondi(A.AD.amort), 400000, 'la section reste inchangée');
    });
});

test('RÉPARTITION — une répartition inégale est respectée', () => {
    avecCompteAmbigu('29190000', 300000, () => {
        S.repValider('2919', [{ref:'AE', pct:0.6}, {ref:'AF', pct:0.4}], 'test');
        const A = S.liasseGetActif('n');
        assert.equal(arrondi(A.AE.amort), 180000);
        assert.equal(arrondi(A.AF.amort), 120000);
        assert.equal(arrondi(A.AD.amort), 300000, 'le total de section est conservé');
    });
});

test('RÉPARTITION — le total de la section suit toujours la somme des postes', () => {
    // La propriété qui rend la ventilation exploitable : quel que soit
    // l'arbitrage, détail et total restent d'accord.
    for(const cibles of [
        [{ref:'AE', pct:1}],
        [{ref:'AH', pct:1}],
        [{ref:'AE', pct:0.25}, {ref:'AH', pct:0.75}],
        [{ref:'AE', pct:0.34}, {ref:'AF', pct:0.33}, {ref:'AH', pct:0.33}],
    ]){
        avecCompteAmbigu('28180000', 900000, () => {
            S.repValider('2818', cibles, 'test');
            const A = S.liasseGetActif('n');
            const somme = ['AE','AF','AG','AH'].reduce((s, r) => s + ((A[r]||{}).amort || 0), 0);
            assert.ok(Math.abs(somme - A.AD.amort) < 1,
                `détail ${somme} ≠ section ${A.AD.amort} pour ${JSON.stringify(cibles)}`);
            assert.ok(Math.abs(somme - 900000) < 1, 'le montant total doit être conservé');
        });
    }
});

test('VALIDATION — une répartition qui ne fait pas 100 % est refusée', () => {
    S.repEffacer();
    assert.throws(() => S.repValider('2818', [{ref:'AE', pct:0.5}, {ref:'AH', pct:0.3}], 'test'),
        /100 %/, 'une somme de 80 % doit être rejetée');
    assert.throws(() => S.repValider('2818', [{ref:'AE', pct:0.7}, {ref:'AH', pct:0.7}], 'test'),
        /100 %/, 'une somme de 140 % doit être rejetée');
    assert.equal(S.repQuoteParts('28180000'), null, 'aucune règle ne doit avoir été retenue');
    S.repEffacer();
});

test('ATTENTE — les comptes à arbitrer sont recensés, une seule fois chacun', () => {
    avecCompteAmbigu('28180000', 400000, () => {
        const attente = local(S.repEnAttente('n'));
        assert.equal(attente.length, 1);
        assert.equal(attente[0].compte, '28180000');
        assert.equal(attente[0].racine, '2818');
        assert.equal(arrondi(attente[0].montant), 400000);
        assert.deepEqual(attente[0].cibles.map(c => c.ref), ['AE', 'AH'],
            'la suggestion doit être proposée à l’auditeur');
    });
});

test('ATTENTE — un compte arbitré sort de la liste', () => {
    avecCompteAmbigu('28180000', 400000, () => {
        assert.equal(local(S.repEnAttente('n')).length, 1);
        S.repValider('2818', [{ref:'AE', pct:0.5}, {ref:'AH', pct:0.5}], 'test');
        assert.deepEqual(local(S.repEnAttente('n')), [], 'plus rien à arbitrer');
    });
});

test('RACINES — les cinq comptes ambigus du référentiel sont couverts', () => {
    S.repEffacer();
    const regles = local(S.repCharger());
    assert.deepEqual(Object.keys(regles).sort(), ['2818', '2918', '2919', '2939', '2949']);
    for(const [racine, r] of Object.entries(regles)){
        assert.ok(r.libelle, `${racine} sans libellé`);
        assert.equal(r.methode, 'pourcentage');
        const total = r.cibles.reduce((s, c) => s + c.pct, 0);
        assert.ok(Math.abs(total - 1) < 0.01, `${racine} : les parts suggérées font ${total}`);
    }
});

test('RACINES — le rattachement retient la racine la plus longue', () => {
    S.repEffacer();
    assert.equal(S.repRacine('28180000'), '2818');
    assert.equal(S.repRacine('29190000'), '2919');
    assert.equal(S.repRacine('29490000'), '2949');
    assert.equal(S.repRacine('28130000'), null, 'un compte non ambigu ne doit pas être capté');
    assert.equal(S.repRacine('TOTAL'), null);
});

test('NON-RÉGRESSION — MTTCI, qui n’a aucun compte ambigu, est inchangée', () => {
    // Le jeu de référence ne porte aucun compte « p » : l'ajout du module
    // ne doit donc rien changer à ses états.
    S.repEffacer();
    assert.deepEqual(local(S.repEnAttente('n')), [], 'MTTCI ne doit rien avoir à arbitrer');
    const A = S.liasseGetActif('n');
    assert.equal(arrondi(A.AZ.amort), REF.actif.AZ[1], 'colonne amortissements');
    assert.equal(arrondi(A.AZ.net),   REF.actif.AZ[2], 'total actif immobilisé');
    assert.equal(arrondi(A.BZ.net),   REF.actif.BZ[2], 'total général');
});
