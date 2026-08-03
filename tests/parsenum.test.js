/* ==================================================================
   LECTURE DES MONTANTS — parseNum

   Régression la plus sévère du projet : parseNum ne traitait pas le
   point comme séparateur de milliers, si bien que « 385.982.204 » —
   le total du bilan de MTTCI — était lu 385,982. Le format
   « 385.982.204,50 » est celui que produit la plupart des exports
   Excel en configuration française : tous les montants étaient
   tronqués.

   Ces tests fixent la règle de levée d'ambiguïté telle qu'elle est
   documentée dans src/js/02-balances-modele.js :

     · les deux séparateurs présents  → le dernier est décimal
     · un seul séparateur, répété     → séparateur de milliers
     · un seul séparateur, unique et suivi d'exactement trois
       chiffres                       → milliers, SAUF lecture
                                        décimale stricte (2e argument)
     · sinon                          → séparateur décimal

   Les espaces autres que l'espace ordinaire sont écrits en
   échappement : à l'œil nu ils en sont indiscernables, et une
   relecture les « corrigerait » sans s'en apercevoir.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chargerApplication, RACINE } from './harness.js';

const app = chargerApplication();
const parseNum   = (v, strict) => app.sandbox.parseNum(v, strict);
const fmt        = v => app.sandbox.fmt(v);
const fmtSaisie  = v => app.sandbox.fmtSaisie(v);
const brutSaisie = v => app.sandbox.brutSaisie(v);

const INSEC = '\u00a0';   // espace insécable
const FINEI = '\u202f';   // espace fine insécable
const FINE  = '\u2009';   // espace fine

test('les dix-huit formats de montant rencontrés en production', () => {
    const cas = [
        // [entrée, attendu, ce que le cas couvre]
        ['385982204',                                  385982204,   'brut, sans séparateur'],
        ['385 982 204',                                385982204,   'espaces ordinaires'],
        [`385${INSEC}982${INSEC}204`,                  385982204,   'espaces insécables — copier-coller Excel'],
        [`385${FINEI}982${FINEI}204`,                  385982204,   'espaces fines insécables'],
        [`385${FINE}982${FINE}204`,                    385982204,   'espaces fines'],
        ['385.982.204',                                385982204,   'RÉGRESSION — points comme milliers'],
        ['385,982,204',                                385982204,   'virgules comme milliers'],
        ['385.982.204,50',                             385982204.5, 'RÉGRESSION — format français complet'],
        ['385,982,204.50',                             385982204.5, 'format anglo-saxon complet'],
        ['385982204,50',                               385982204.5, 'virgule décimale seule'],
        ['385982204.50',                               385982204.5, 'point décimal seul'],
        ['1234,5',                                     1234.5,      'décimale à un chiffre'],
        ['(1 234 567)',                               -1234567,     'négatif comptable entre parenthèses'],
        ['1 234 567-',                                -1234567,     'négatif comptable suffixé'],
        ['-1 234 567',                                -1234567,     'négatif préfixé'],
        ['1 234 567 FCFA',                             1234567,     'suffixe de devise'],
        ['',                                           0,           'chaîne vide'],
        ['   ',                                        0,           'blancs seuls'],
    ];
    assert.equal(cas.length, 18, 'la suite doit couvrir dix-huit formats');
    for(const [entree, attendu, quoi] of cas)
        assert.equal(parseNum(entree), attendu, `${quoi} — ${JSON.stringify(entree)}`);
});

test('le cas ambigu : un séparateur unique suivi de trois chiffres', () => {
    // « 1.234 » vaut-il mille deux cent trente-quatre, ou 1,234 ?
    // Sur une balance, c'est un séparateur de milliers. Sur un taux,
    // c'est une décimale : d'où le second argument.
    assert.equal(parseNum('1.234'),        1234,  'montant : milliers');
    assert.equal(parseNum('1,234'),        1234,  'montant : milliers');
    assert.equal(parseNum('1.234', true),  1.234, 'lecture stricte : décimale');
    assert.equal(parseNum('1,234', true),  1.234, 'lecture stricte : décimale');

    // Quatre chiffres après le séparateur : jamais des milliers.
    assert.equal(parseNum('1.2345'), 1.2345);
    // Deux chiffres : décimale, même sans lecture stricte.
    assert.equal(parseNum('1.23'),   1.23);
    // Répété : milliers, quelle que soit la lecture demandée.
    assert.equal(parseNum('1.234.567'),       1234567);
    assert.equal(parseNum('1.234.567', true), 1234567);
});

test('les taux et pourcentages se lisent en décimal strict', () => {
    // Un seuil de signification à 1,5 % ne doit jamais devenir 15.
    assert.equal(parseNum('1,5',   true), 1.5);
    assert.equal(parseNum('0,075', true), 0.075);
    assert.equal(parseNum('12,5',  true), 12.5);
    assert.equal(parseNum('1,5'),         1.5, 'sans strict, seul le cas « trois chiffres » diffère');
});

test('valeurs non textuelles et entrées aberrantes', () => {
    assert.equal(parseNum(undefined), 0);
    assert.equal(parseNum(null),      0);
    assert.equal(parseNum(0),         0);
    assert.equal(parseNum(1234.56),   1234.56);
    assert.equal(parseNum(-42),      -42);
    assert.equal(parseNum(NaN),       0, 'NaN ne doit pas se propager dans un total');
    assert.equal(parseNum(Infinity),  0, 'Infinity ne doit pas se propager dans un total');
    assert.equal(parseNum('abc'),     0);
    assert.equal(parseNum('N/A'),     0);
    assert.equal(parseNum('—'),  0, 'tiret cadratin des exports Excel');
});

test('aller-retour affichage puis relecture, sans perte', () => {
    // fmtSaisie écrit dans le champ, parseNum relit ce que l'auditeur voit.
    // Une dérive ici corromprait les montants à chaque passage de focus.
    const montants = [0, 1, 450000, 385982204, 385982204.5, 113822444,
                      -1234567, 1234.56, 999999999999];
    for(const m of montants){
        const affiche = fmtSaisie(m);
        assert.equal(parseNum(affiche), m, `aller-retour sur ${m} (affiché « ${affiche} »)`);
    }
});

test('aller-retour sur les montants réels de la liasse MTTCI', () => {
    // Les valeurs qui ont fait apparaître la régression.
    const reels = {
        'total du bilan':             385982204,
        'clients, factures à établir': 113822444,
        'trésorerie au 31/12':        143188639,
        'chiffre d’affaires':         200218848,
        'résultat net':               5770774,
    };
    for(const [quoi, montant] of Object.entries(reels)){
        const affiche = fmt(montant);
        assert.equal(parseNum(affiche), montant, `${quoi} : « ${affiche} » relu`);
        assert.equal(parseNum(fmtSaisie(montant)), montant, `${quoi} : via fmtSaisie`);
    }
});

test('brutSaisie rend une valeur que parseNum relit à l’identique', () => {
    // brutSaisie alimente le champ pendant l'édition (au focus) ;
    // fmtSaisie le reformate à la sortie. Les deux doivent concorder.
    for(const m of [0, 450000, 385982204.5, -1234567, 1234.56]){
        const brut = brutSaisie(m);
        assert.equal(parseNum(brut), m, `brutSaisie(${m}) = « ${brut} »`);
        assert.equal(parseNum(fmtSaisie(brut)), m, 'puis reformaté');
    }
    assert.equal(brutSaisie(''),        '');
    assert.equal(brutSaisie(null),      '');
    assert.equal(brutSaisie(undefined), '');
});

test('RÉGRESSION — parseFloat ne subsiste que dans parseNum', () => {
    // C'est parseFloat qui tronquait les montants : « 385.982.204 » lu
    // 385,982. Les dix-neuf appels de l'application ont été remplacés par
    // parseNum. Un seul demeure, à l'intérieur de parseNum lui-même, sur
    // une chaîne déjà normalisée. Tout nouveau parseFloat sur une saisie
    // utilisateur rouvrirait la brèche.
    const manifeste = JSON.parse(fs.readFileSync(path.join(RACINE, 'build', 'manifeste.json'), 'utf8'));
    const coupables = [];
    for(const nom of Object.values(manifeste).flat()){
        const src = fs.readFileSync(path.join(RACINE, 'src', 'js', nom), 'utf8');
        const n = (src.match(/\bparseFloat\s*\(/g) || []).length;
        if(n) coupables.push(`${nom} (${n})`);
    }
    assert.deepEqual(coupables, ['02-balances-modele.js (1)'],
        'parseFloat réapparu hors de parseNum — les montants séparés par des points seront tronqués');
});

test('fmtSaisie laisse vide ce qui ne contient aucun chiffre', () => {
    // Sinon un champ vide se remplirait tout seul d'un « 0 » que
    // l'auditeur n'a pas saisi.
    assert.equal(fmtSaisie(''),        '');
    assert.equal(fmtSaisie('   '),     '');
    assert.equal(fmtSaisie(null),      '');
    assert.equal(fmtSaisie(undefined), '');
    assert.equal(fmtSaisie('abc'),     '');
    assert.equal(fmtSaisie('0'),       '0', 'un zéro saisi reste affiché');
});
