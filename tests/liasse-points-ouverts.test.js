/* ==================================================================
   POINTS OUVERTS DE LA LIASSE — ce que MTTCI NE prouve pas

   Le jeu de référence MTTCI valide le moteur à l'unité près, mais il
   n'exerce pas tous ses chemins. Trois lectures de la planche papier
   et six comptes en quote-part restent hors de sa portée : sur ces
   points, une suite verte ne vaut pas validation.

   Ces tests existent pour empêcher exactement cette confusion. Ils
   affirment que MTTCI ne couvre pas ces chemins — et ils échoueront
   le jour où un nouveau jeu d'essai les couvrira, ce qui sera le
   signal qu'on peut enfin trancher.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI, arrondi } from './harness.js';

const app = chargerApplication();
app.chargerBalances(balancesMTTCI());
const ev = code => app.evaluer(code);

/** Comptes de MTTCI (N et N-1) commençant par un préfixe donné. */
const comptes = pfx => ev(`
    balanceData.n.concat(balanceData.n1)
        .filter(function(r){ return String(r.compte).indexOf('${pfx}') === 0; })
        .map(function(r){ return r.compte; })
`);

test('AJ — MTTCI n’a aucun terrain : la formule « dont placement » n’est pas exercée', () => {
    // La planche portait « (2881 − 2928p) ». Le compte 2881 est absent des
    // trois feuilles de plan comptable du classeur DGI, la racine 288 aussi.
    // Le seul compte dont l'intitulé porte « placement » est 228
    // « Terrains-immeubles de placement » ; 2928 « Dépréciation des autres
    // terrains » existe. La formule se lit donc (228 − 2928p).
    //
    // Rien de tout cela n'est vérifiable ici : MTTCI n'a aucun compte 22.
    assert.deepEqual(comptes('22'), [], 'MTTCI a acquis des terrains : la lecture de AJ devient vérifiable');
    assert.equal(arrondi(ev('liasseGetActif("n").AJ.net')), 0);
    assert.equal(arrondi(ev('liasseGetActif("n").AK.net')), 0);
});

test('FB — MTTCI n’a pas d’actif circulant HAO : l’ordre 4791/4793/4783 reste illisible', () => {
    // Fin de ligne partiellement illisible sur la planche. FB vaut 0 ici,
    // donc l'ordre des termes n'a aucune incidence mesurable.
    assert.deepEqual(comptes('485'), [], 'MTTCI utilise 485 : FB devient vérifiable');
    assert.deepEqual(comptes('479'), [], 'MTTCI utilise 479 : FB devient vérifiable');
    assert.equal(arrondi(ev('liasseGetTFTColumn("n").FB')), 0);
    assert.equal(arrondi(ev('liasseGetActif("n").BA.net')), 0);
});

test('FI — MTTCI n’a aucune cession d’immobilisation : le renvoi sur 485 n’est pas tranché', () => {
    // Renvoi ¹¹ porté sur 485 dans une ligne qui concerne les incorporelles
    // et corporelles — incohérence apparente de la planche.
    assert.equal(arrondi(ev('liasseGetTFTColumn("n").FI')), 0);
    assert.deepEqual(comptes('485'), [], 'MTTCI utilise 485 : FI devient vérifiable');
});

test('QUOTE-PART — les six comptes en « p » sont hors du jeu de référence', () => {
    // 2818p, 2918p, 2919p, 2939p, 2949p et 2928p sont revendiqués chacun par
    // deux postes. Le moteur ignore le suffixe « p » et rattache le compte en
    // totalité au premier poste déclaré. Si un client les utilise, une règle
    // de répartition manuelle sera nécessaire.
    for(const pfx of ['2818', '2918', '2919', '2939', '2949', '2928'])
        assert.deepEqual(comptes(pfx), [],
            `MTTCI utilise ${pfx} : la répartition en quote-part devient nécessaire`);
});

test('QUOTE-PART — le rattachement en totalité au premier poste est déterministe', () => {
    // Comportement assumé, pas accidentel : le même compte doit toujours
    // tomber sur le même poste, quel que soit le sens du solde.
    for(const compte of ['28180000', '29190000', '29390000']){
        const a = ev(`JSON.stringify(paramResolve('${compte}', 1000, 0))`);
        const b = ev(`JSON.stringify(paramResolve('${compte}', 0, 1000))`);
        assert.equal(a, b, `${compte} : le rattachement varie selon le sens du solde`);
    }
});

test('PARAMÈTRES — les points à confirmer restent affichés dans l’onglet', () => {
    // PARAM_A_CONFIRMER est la piste d'audit de ces lectures incertaines :
    // il ne doit pas se vider par inadvertance. À ne pas confondre avec
    // PARAM_DIVERGENCES, qui recense les écarts ASSUMÉS et validés
    // numériquement (BI/DI, BH/DJ, FH, FB/FC/FD).
    const aConfirmer = ev('JSON.stringify(PARAM_A_CONFIRMER)');
    for(const ref of ['AJ', 'FB', 'FI'])
        assert.match(aConfirmer, new RegExp(`"${ref}"`), `${ref} ne figure plus dans les points à confirmer`);

    // AJ est désormais tranché sur pièce : le classeur DGI ne connaît pas
    // 2881, et 228 « Terrains-immeubles de placement » est le seul candidat.
    assert.match(aConfirmer, /\(228 − 2928p\)/, 'la lecture retenue pour AJ doit être énoncée');
    assert.match(aConfirmer, /"AJ","Tranché"/, 'AJ n’est plus un simple point de lecture');

    // Les écarts assumés, eux, restent au complet.
    const divergences = ev('JSON.stringify(PARAM_DIVERGENCES)');
    for(const motif of [/BI \/ DI/, /BH \/ DJ/, /"FH"/, /FB \/ FC \/ FD/])
        assert.match(divergences, motif, `écart assumé disparu : ${motif}`);
});

test('AJ — la planche affichée porte la lecture corrigée, pas 2881', () => {
    const actif = ev('JSON.stringify(PARAM_BILAN_ACTIF)');
    assert.ok(!/2881/.test(actif), 'le compte inexistant 2881 figure encore dans la planche');
    assert.match(actif, /dont placement en Net.*228 − 2928p/,
        'la ligne AJ doit porter (228 − 2928p)');
});
