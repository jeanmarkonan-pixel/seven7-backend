/* ==================================================================
   CHANTIER 1 — RÉCONCILIATION DES DEUX MOTEURS COMPTABLES

   L'application a longtemps porté deux moteurs en parallèle :

     - computeBilanActif / computeBilanPassif / computeResultat
       l'historique, qui alimente la Planification (seuils), la Revue
       analytique (ratios), les onglets BILAN et RESULTAT, le contrôle
       d'équilibre de Détection des erreurs et genererSynthese()

     - liasseGetActif / liasseGetPassif / liasseGetResultat
       le nouveau, branché sur les mappings officiels SYSCOHADA

   Seul le second recevait les corrections de mapping. Ces tests
   exigent que les deux produisent désormais les mêmes chiffres, et
   que ces chiffres soient ceux de la liasse DGI.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI, liasseReference, arrondi } from './harness.js';

const app = chargerApplication();
app.chargerBalances(balancesMTTCI());
const REF = liasseReference();

const ancienN  = app.evaluer('computeResultat("n")');
const ancienN1 = app.evaluer('computeResultat("n1")');
const actifN   = app.evaluer('computeBilanActif("n")');
const actifN1  = app.evaluer('computeBilanActif("n1")');
const passifN  = app.evaluer(`computeBilanPassif("n", ${ancienN.XI})`);
const passifN1 = app.evaluer(`computeBilanPassif("n1", ${ancienN1.XI})`);

/** Sous-total de l'ancien moteur, retrouvé par son libellé exact.
 *  Ce sont ces libellés que runRevueAnalytique() et updateAllCalculations()
 *  utilisent pour lire les agrégats : ils font partie du contrat. */
const poste = (etat, lib) => {
    const l = etat.lines.find(x => x.poste === lib);
    assert.ok(l, `libellé absent du moteur : « ${lib} » — contrat rompu avec runRevueAnalytique()`);
    return l.net;
};

test('ÉQUILIBRE — le bilan de l’ancien moteur boucle (Actif = Passif)', () => {
    // Régression : le passif perdait les comptes 41 créditeurs hors 419.
    // Sur MTTCI, 41810000 « CLIENT FACTURE A ETABLIR » créditeur de
    // 113 822 444 n'était capté ni par k26 (419 seul) ni par k29 (qui
    // exclut tout le 41). L'onglet BILAN et le contrôle d'équilibre de
    // Détection des erreurs affichaient un faux déséquilibre.
    assert.equal(arrondi(actifN.total),  arrondi(passifN.total));
    assert.equal(arrondi(actifN1.total), arrondi(passifN1.total));
});

test('BILAN — les totaux de l’ancien moteur sont ceux de la liasse DGI', () => {
    assert.equal(arrondi(actifN.total),   REF.actif.BZ[2],  'total général actif N');
    assert.equal(arrondi(actifN1.total),  REF.actif.BZ[3],  'total général actif N-1');
    assert.equal(arrondi(passifN.total),  REF.passif.DZ[0], 'total général passif N');
    assert.equal(arrondi(passifN1.total), REF.passif.DZ[1], 'total général passif N-1');
});

test('BILAN — les sous-totaux lus par la Revue analytique sont conformes', () => {
    const attendu = [
        ['TOTAL ACTIF IMMOBILISÉ',   actifN,  actifN1,  REF.actif.AZ[2], REF.actif.AZ[3]],
        ['TOTAL ACTIF CIRCULANT',    actifN,  actifN1,  REF.actif.BK[2], REF.actif.BK[3]],
        ['TOTAL TRÉSORERIE-ACTIF',   actifN,  actifN1,  REF.actif.BT[2], REF.actif.BT[3]],
        ['TOTAL CAPITAUX PROPRES',   passifN, passifN1, REF.passif.CP[0], REF.passif.CP[1]],
        ['TOTAL DETTES FINANCIÈRES', passifN, passifN1, REF.passif.DD[0], REF.passif.DD[1]],
        ['TOTAL RESSOURCES STABLES', passifN, passifN1, REF.passif.DF[0], REF.passif.DF[1]],
        ['TOTAL PASSIF CIRCULANT',   passifN, passifN1, REF.passif.DP[0], REF.passif.DP[1]],
        ['TOTAL TRÉSORERIE-PASSIF',  passifN, passifN1, REF.passif.DT[0], REF.passif.DT[1]],
    ];
    for(const [lib, eN, eN1, dgiN, dgiN1] of attendu){
        assert.equal(arrondi(poste(eN,  lib)), dgiN,  `${lib} — N`);
        assert.equal(arrondi(poste(eN1, lib)), dgiN1, `${lib} — N-1`);
    }
});

test('BILAN — les deux moteurs rendent les mêmes lignes, dans le même ordre', () => {
    // renderBilan() apparie actifN.lines[i] avec actifN1.lines[i] par indice.
    assert.equal(actifN.lines.length,  actifN1.lines.length);
    assert.equal(passifN.lines.length, passifN1.lines.length);
    actifN.lines.forEach((l, i)  => assert.equal(l.poste, actifN1.lines[i].poste));
    passifN.lines.forEach((l, i) => assert.equal(l.poste, passifN1.lines[i].poste));
});

test('RÉSULTAT — l’ancien moteur est conforme à la liasse DGI sur les deux exercices', () => {
    // Régression : l'ancien moteur rangeait le compte 707 « produits
    // accessoires » en TC avec 705 et 706, alors que la planche officielle
    // lui réserve TD. Invisible en N (707 nul), massif en N-1 :
    // 259 481 536 déplacés de TD vers TC.
    for(const [ref, attendu] of Object.entries(REF.resultat)){
        assert.equal(arrondi(ancienN[ref]),  attendu[0], `${ref} — N`);
        assert.equal(arrondi(ancienN1[ref]), attendu[1], `${ref} — N-1`);
    }
});

test('RÉSULTAT — les deux moteurs coïncident réf par réf', () => {
    const nouvN  = app.evaluer('liasseGetResultat("n")');
    const nouvN1 = app.evaluer('liasseGetResultat("n1")');
    for(const ref of Object.keys(REF.resultat)){
        assert.equal(arrondi(ancienN[ref]),  arrondi(nouvN[ref]),  `${ref} — N`);
        assert.equal(arrondi(ancienN1[ref]), arrondi(nouvN1[ref]), `${ref} — N-1`);
    }
});

test('RÉSULTAT — les alias consommés ailleurs dans l’application existent', () => {
    // rN.CA : Revue analytique (ratio de marge nette), Planification
    // (agrégat « Chiffre d'affaires »), buildResultatLines.
    // rN.RS et rN.RI : tableau des Impôts et taxes.
    assert.equal(arrondi(ancienN.CA), REF.resultat.XB[0], 'CA doit valoir le chiffre d’affaires XB');
    assert.equal(arrondi(ancienN.RS), REF.resultat.RS[0]);
    assert.equal(arrondi(ancienN.RI), REF.resultat.RI[0]);
});

test('RÉSULTAT — les libellés affichés citent les comptes que le moteur additionne', () => {
    // L'onglet RESULTAT affiche, en face de chaque ligne, les comptes qui la
    // composent. C'est une piste d'audit : elle doit dire la vérité.
    //
    // Trois libellés avaient divergé du référentiel — RF annonçait 6033 et
    // 6038 quand le moteur ne prend que 6033, TJ annonçait 791 seul pour
    // 791/798/799, RL annonçait 69 pour 691. Erreurs d'affichage, sans effet
    // sur les montants, mais un auditeur qui vérifie le rattachement d'un
    // compte s'y serait fié.
    const planche = {};
    for(const l of JSON.parse(app.evaluer('JSON.stringify(PARAM_RESULTAT)')))
        if(l.ref && l.cpt) planche[l.ref] = l.cpt;

    const comptes = s => String(s).replace(/\s*\((SD|SC)[^)]*\)/, '')
                                  .match(/\d+/g)?.sort().join(',') ?? '';

    const ecarts = [];
    for(const l of JSON.parse(app.evaluer('JSON.stringify(buildResultatLines({}, {}))'))){
        const code = (l.lib.match(/\(([A-Z]{2})\)$/) || [])[1];
        if(!code || !planche[code]) continue;
        if(comptes(l.ref) !== comptes(planche[code]))
            ecarts.push(`${code} : affiché « ${l.ref} », référentiel « ${planche[code]} »`);
    }
    assert.deepEqual(ecarts, []);
});

test('SEUILS — les agrégats de planification sont ceux de la liasse DGI', () => {
    // updateAllCalculations() dérive les seuils de signification de ces
    // trois agrégats. Un écart ici décale tout le programme de travail.
    assert.equal(arrondi(actifN.total), REF.actif.BZ[2],    'total bilan');
    assert.equal(arrondi(ancienN.CA),   REF.resultat.XB[0], 'chiffre d’affaires');
    assert.equal(arrondi(ancienN.XI),   REF.resultat.XI[0], 'résultat net');
    assert.equal(arrondi(poste(passifN, 'TOTAL CAPITAUX PROPRES')), REF.passif.CP[0]);
    assert.equal(arrondi(poste(actifN,  'TOTAL ACTIF IMMOBILISÉ')), REF.actif.AZ[2]);
});
