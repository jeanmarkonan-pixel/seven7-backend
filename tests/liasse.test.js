/* ==================================================================
   Non-régression de la liasse : BILAN, COMPTE DE RÉSULTAT, TFT.
   Référence : liasse DGI corrigée MTTCI, exercice clos le 31/12/2025.
   C'est LE test à faire passer avant toute livraison.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI, liasseReference, arrondi } from './harness.js';

const app = chargerApplication();
app.chargerBalances(balancesMTTCI());
const REF = liasseReference();

const actifN   = app.evaluer('liasseGetActif("n")');
const actifN1  = app.evaluer('liasseGetActif("n1")');
const resN     = app.evaluer('liasseGetResultat("n")');
const resN1    = app.evaluer('liasseGetResultat("n1")');
const passifN  = app.evaluer(`liasseGetPassif("n", ${resN.XI})`);
const passifN1 = app.evaluer(`liasseGetPassif("n1", ${resN1.XI})`);

test('BILAN — ACTIF : brut, amortissements, net N et net N-1', () => {
    for(const [ref, attendu] of Object.entries(REF.actif)){
        const a = actifN[ref] || {}, b = actifN1[ref] || {};
        assert.equal(arrondi(a.brut),  attendu[0], `${ref} brut`);
        assert.equal(arrondi(a.amort), attendu[1], `${ref} amortissements`);
        assert.equal(arrondi(a.net),   attendu[2], `${ref} net N`);
        assert.equal(arrondi(b.net),   attendu[3], `${ref} net N-1`);
    }
});

test('BILAN — PASSIF : net N et net N-1', () => {
    for(const [ref, attendu] of Object.entries(REF.passif)){
        assert.equal(arrondi((passifN[ref]  || {}).net), attendu[0], `${ref} net N`);
        assert.equal(arrondi((passifN1[ref] || {}).net), attendu[1], `${ref} net N-1`);
    }
});

test('COMPTE DE RÉSULTAT — exercices N et N-1', () => {
    for(const [ref, attendu] of Object.entries(REF.resultat)){
        assert.equal(arrondi(resN[ref]),  attendu[0], `${ref} N`);
        assert.equal(arrondi(resN1[ref]), attendu[1], `${ref} N-1`);
    }
});

test('BILAN — équilibre ACTIF = PASSIF', () => {
    assert.equal(arrondi(actifN.BZ.net),  arrondi(passifN.DZ.net));
    assert.equal(arrondi(actifN1.BZ.net), arrondi(passifN1.DZ.net));
});

test('TFT — lignes ZA à ZH conformes à la liasse DGI', () => {
    const T = app.evaluer('liasseGetTFTColumn("n")');
    for(const [ref, attendu] of Object.entries(REF.tft_n)){
        assert.equal(arrondi(T[ref]), attendu, `TFT ${ref}`);
    }
});

test('TFT — bouclage : ZA + ZG = ZH', () => {
    const T = app.evaluer('liasseGetTFTColumn("n")');
    assert.equal(arrondi(T.ZA + T.ZG), arrondi(T.ZH));
    assert.equal(arrondi(T.ECART), 0);
});

test('TFT — la variation de trésorerie recoupe la classe 5 de la balance', () => {
    const T = app.evaluer('liasseGetTFTColumn("n")');
    const variation = app.evaluer(`cycSumPfx('n', ['5'], 'solde') - cycSumPfx('n1', ['5'], 'solde')`);
    assert.equal(arrondi(T.ZG), arrondi(variation));
});

/* ---- Régressions historiques : ne jamais les réintroduire ---- */

test('RÉGRESSION — un compte 41 créditeur va au passif en DI, pas en BI', () => {
    // 41810000 « CLIENT FACTURE A ETABLIR » : solde créditeur 113 822 444.
    // La lecture littérale de la planche le classait en BI, donnant un actif négatif.
    const m = app.evaluer(`paramResolve('41810000', 0, 113822444)`);
    assert.equal(m.ref, 'DI');
    assert.ok(actifN.BI.net > 0, 'BI ne doit jamais être négatif');
});

test('RÉGRESSION — un compte 40 débiteur va à l’actif en BH, pas en DJ', () => {
    const m = app.evaluer(`paramResolve('40910000', 300000, 0)`);
    assert.equal(m.ref, 'BH');
});

test('RÉGRESSION — TFT ligne FH : mvt débit sur 27 (dépôts et cautionnements)', () => {
    // 27580000 : mouvement débit 100 000 000. Une lecture « 279 » au lieu de
    // « 27 + renvoi de bas de page » donnait FH = 0.
    const T = app.evaluer('liasseGetTFTColumn("n")');
    assert.equal(arrondi(T.FH), -100000000);
});
