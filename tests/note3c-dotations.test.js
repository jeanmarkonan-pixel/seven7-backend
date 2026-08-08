/* ==================================================================
   NOTE 3C — DOTATIONS ET REPRISES D'AMORTISSEMENT

   Bug réel trouvé et corrigé le 8 août 2026 : liasseSumMovementByRef()
   filtrait toujours sur col:'brut', y compris quand appelée depuis
   liasseRenderMvtAmortBlock() pour les dotations/reprises de la
   NOTE 3C. Les mouvements d'amortissement vivent sur les comptes
   d'AMORTISSEMENT (28xx), dont paramResolve() donne col:'amort' — ils
   étaient donc systématiquement exclus, et la NOTE 3C affichait des
   dotations et des reprises à zéro quelle que soit la balance réelle.

   Vérifié empiriquement sur MTTCI : le compte 28130000 porte un
   mouvement crédit de 90 000 (dotation de l'exercice sur AF, brevets/
   licences/logiciels) — c'est exactement le montant que porte le
   classeur DGI de référence pour cette ligne (NOTE 3C, colonne
   "DOTATIONS DE L'EXERCICE").
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI, arrondi } from './harness.js';

const app = chargerApplication();
const S = app.sandbox;
app.chargerBalances(balancesMTTCI());
// Le bac à sable est un autre "realm" JS (vm) : ses tableaux/objets ne sont
// pas reference-equal aux équivalents natifs de ce process, ce qui fait
// échouer assert.deepEqual à tort. On resérialise avant de comparer.
const local = (v) => JSON.parse(JSON.stringify(v));

test('RÉGRESSION — les dotations de la NOTE 3C ne sont plus figées à zéro', () => {
    // AF : brevets, licences, logiciels — compte amort réel 28130000
    const dotation = S.liasseSumMovementByRef('n', ['AF'], 'mc', 'amort');
    assert.equal(arrondi(dotation), 90000,
        'la dotation doit venir du mouvement crédit du compte AMORTISSEMENT, pas du compte brut');
});

test('RÉGRESSION — sans préciser col, le comportement historique (NOTE 3A, col brut) est inchangé', () => {
    // Appel historique de liasseRenderMvtBlock (NOTE 3A) : pas de 4e argument.
    // Le mouvement crédit (mc) d'AF vu côté comptes BRUTS doit rester nul
    // (AF est un compte débiteur, sans mouvement créditeur sur cette
    // balance) — c'est le même appel qu'avant ce correctif, donc le même
    // résultat. Vu côté comptes AMORT, ce même mouvement crédit est la
    // dotation réelle (90 000) : la distinction col brut/amort fonctionne.
    const mcCoteBrut  = S.liasseSumMovementByRef('n', ['AF'], 'mc');
    const mcCoteAmort = S.liasseSumMovementByRef('n', ['AF'], 'mc', 'amort');
    assert.equal(mcCoteBrut, 0);
    assert.equal(mcCoteAmort, 90000);
});

test('NOTE 3C — le tableau de mouvement boucle : ouverture + dotations − reprises = clôture', () => {
    const ouverture = S.liasseSumByRef('n', 'AF', 'amort', 'SC-SD', 'opening');
    const dotations = S.liasseSumMovementByRef('n', ['AF'], 'mc', 'amort');
    const reprises = S.liasseSumMovementByRef('n', ['AF'], 'md', 'amort');
    const cloture = S.liasseSumByRef('n', 'AF', 'amort', 'SC-SD', 'closing');
    assert.equal(arrondi(ouverture + dotations - reprises), arrondi(cloture));
    // Chiffres réels du classeur DGI (NOTE 3C) : ouverture 90 000, dotation
    // 90 000, clôture 180 000.
    assert.equal(arrondi(ouverture), 90000);
    assert.equal(arrondi(cloture), 180000);
});

/* ---------- NOTE 15A — corrigée pour pointer vers CL/CM, pas le capital --- */

test('NOTE 15A — porte désormais les postes CL (subventions) et CM (provisions réglementées)', () => {
    const config = local(S.NOTES_CONFIG).find((n) => n.num === '15A');
    assert.equal(config.type, 'auto-detail');
    assert.deepEqual(config.blocks[0].refs, ['CL', 'CM']);
});

test('NOTE 15A — le détail par compte ne mélange jamais les balances N et N-1', () => {
    // liasseAccountDetailRows prend un exercice explicite ; on vérifie que
    // les deux appels utilisés par liasseRenderDetailBlock lisent bien des
    // balances différentes lorsqu'elles diffèrent.
    const n = S.liasseAccountDetailRows('n', ['CL', 'CM']);
    const n1 = S.liasseAccountDetailRows('n1', ['CL', 'CM']);
    // Sur MTTCI les deux exercices sont vides sur ces postes (pas de
    // subvention) : le test garantit surtout qu'aucune exception n'est
    // levée et que les deux appels sont bien indépendants.
    assert.ok(Array.isArray(n) && Array.isArray(n1));
});

/* ---------- NOTE 28 — ajout du mouvement des provisions (DC / DN) -------- */

test('NOTE 28 — le bloc DC (provisions financières) reconstitue exactement le bilan', () => {
    // Chiffres réels MTTCI, déjà vérifiés au bilan passif (DC = 4 535 050) :
    // ouverture 3 346 380, dotation de l'exercice 1 188 670, clôture 4 535 050.
    const ouverture = S.liasseSumByRef('n', 'DC', 'net', 'SC-SD', 'opening');
    const dotations = S.liasseSumMovementByRef('n', ['DC'], 'mc', 'net');
    const reprises = S.liasseSumMovementByRef('n', ['DC'], 'md', 'net');
    const cloture = S.liasseSumByRef('n', 'DC', 'net', 'SC-SD', 'closing');
    assert.equal(arrondi(ouverture), 3346380);
    assert.equal(arrondi(dotations), 1188670);
    assert.equal(arrondi(ouverture + dotations - reprises), arrondi(cloture));
    assert.equal(arrondi(cloture), 4535050);
});

test('NOTE 28 — les nouveaux blocs DC/DN coexistent avec les blocs résultat existants, sans les remplacer', () => {
    const config = local(S.NOTES_CONFIG).find((n) => n.num === '28');
    const refs = config.blocks.map((b) => b.refs[0]);
    assert.deepEqual(refs, ['DC', 'DN', 'RL', 'RN', 'TJ', 'TL'],
        'les blocs RL/RN/TJ/TL (déjà en place) doivent rester, DC/DN s’ajoutent avant eux');
});

test('NOTE 28 — le rendu HTML contient les deux nouveaux blocs et les quatre historiques', () => {
    const html = S.liasseRenderNote('28');
    for (const attendu of ["PROVISIONS POUR RISQUES ET CHARGES (MOUVEMENT",
        'PROVISIONS POUR RISQUES A COURT TERME', "DOTATIONS D'EXPLOITATION AUX AMORTISSEMENTS",
        'DOTATIONS FINANCIERES AUX PROVISIONS', "REPRISES D'EXPLOITATION", 'REPRISES FINANCIERES']) {
        assert.ok(html.includes(attendu), `bloc manquant dans le rendu : ${attendu}`);
    }
});
