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

/* Substitue des balances le temps d'une vérification, puis restaure —
   y compris si l'assertion échoue. */
function avecBalances(balances, fn){
    const sauvegarde = ev('JSON.stringify(balanceData)');
    try{ app.chargerBalances(balances); return fn(); }
    finally{ app.chargerBalances(JSON.parse(sauvegarde)); }
}
const ligne = (compte, ch) => Object.assign(
    { compte, intitule:'', od:0, oc:0, md:0, mc:0, sd:0, sc:0 }, ch);

/** FB avec un seul compte ajouté, moins FB sans lui : isole sa contribution. */
function contributionFB(compte, champs){
    const socle = { n:[ligne('48800000', {sd:1000})], n1:[] };
    const sans = avecBalances(socle, () => arrondi(ev('liasseGetTFTColumn("n").FB')));
    const avec = avecBalances(
        { n: socle.n.concat([ligne(compte, champs)]), n1: [] },
        () => arrondi(ev('liasseGetTFTColumn("n").FB')));
    return avec - sans;
}

test('FB — les quatre termes d’écart de conversion portent le signe de la planche', () => {
    // Planche page 49 : … + sd_N 4781 − sc_N 4791 + sc_N 4793 − sd_N 4783
    //
    // La version antérieure omettait 4781, lisait 4791 au débit et inversait
    // les signes de 4793 et 4783. MTTCI ne l'exerçait pas — FB y vaut 0 —
    // et la suite restait donc verte malgré l'erreur.
    assert.equal(contributionFB('47810000', { sd:7 }),  +7,  '+ sd 4781');
    assert.equal(contributionFB('47910000', { sc:11 }), -11, '− sc 4791');
    assert.equal(contributionFB('47930000', { sc:13 }), +13, '+ sc 4793');
    assert.equal(contributionFB('47830000', { sd:17 }), -17, '− sd 4783');
});

test('FB — un solde débiteur sur 4791 n’a aucun effet, seul le créditeur compte', () => {
    // C'était l'erreur exacte : tSD au lieu de tSC sur 4791.
    assert.equal(contributionFB('47910000', { sd:11 }), 0);
});

test('FB — MTTCI ne l’exerce toujours pas : la formule reste non validée par le réel', () => {
    // Les signes sont désormais ceux de la planche, mais aucune liasse de
    // référence ne les confronte à un état DGI. Ce test échouera le jour où
    // un jeu d'essai portera ces comptes : ce sera le moment de valider.
    assert.deepEqual(comptes('485'), [], 'MTTCI utilise 485 : FB devient vérifiable sur du réel');
    assert.deepEqual(comptes('479'), [], 'MTTCI utilise 479 : FB devient vérifiable sur du réel');
    assert.equal(arrondi(ev('liasseGetTFTColumn("n").FB')), 0);
    assert.equal(arrondi(ev('liasseGetActif("n").BA.net')), 0);
});

test('FI — 4856 alimente FJ et non FI, sans être compté deux fois', () => {
    // La planche liste 485 en FI et 4856 en FJ. Comme le rattachement se fait
    // par préfixe, 485 capte 4856 : sans exclusion, une cession d'immobilisation
    // financière gonflerait les deux lignes à la fois.
    //
    // Les renvois imprimés sont décalés sur ces deux lignes — le 11 « relatif
    // aux immobilisations financières » figure sur FI, qui traite des
    // incorporelles et corporelles, et le 12 « à l'exception du compte 4856 »
    // sur FJ, qui doit précisément le retenir. L'exclusion retenue est la
    // seule lecture qui évite le double emploi.
    const T = avecBalances({ n:[ligne('48560000', { mc:5000 })], n1:[] },
                           () => JSON.parse(ev('JSON.stringify(liasseGetTFTColumn("n"))')));
    assert.equal(arrondi(T.FI), 0,    '4856 ne doit pas entrer en FI');
    assert.equal(arrondi(T.FJ), 5000, '4856 doit entrer en FJ');

    // un autre compte 485 alimente bien FI
    const U = avecBalances({ n:[ligne('48510000', { mc:5000 })], n1:[] },
                           () => JSON.parse(ev('JSON.stringify(liasseGetTFTColumn("n"))')));
    assert.equal(arrondi(U.FI), 5000, '485 hors 4856 doit entrer en FI');
    assert.equal(arrondi(U.FJ), 0);
});

test('FI — MTTCI n’a aucune cession : la lecture reste non validée par le réel', () => {
    assert.equal(arrondi(ev('liasseGetTFTColumn("n").FI')), 0);
    assert.deepEqual(comptes('485'), [], 'MTTCI utilise 485 : FI devient vérifiable sur du réel');
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
