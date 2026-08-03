/* ==================================================================
   QUALITÉ DE DONNÉE — les défauts de la balance à gérer, pas à corriger

   Le README les classe explicitement comme « des cas à gérer, pas des
   bugs » : ce sont les balances des clients qui sont imparfaites, et
   l'outil doit les signaler sans les réécrire d'autorité.

   Le principe retenu ici est la DÉTECTION, jamais la normalisation
   silencieuse : fusionner deux numéros voisins reviendrait à décider à
   la place de l'auditeur que ce sont bien le même compte.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI, liasseReference, arrondi } from './harness.js';

const app = chargerApplication();
app.chargerBalances(balancesMTTCI());
const REF = liasseReference();
const ev = code => app.evaluer(code);

/** Recopie une valeur venue du bac à sable dans notre realm :
 *  assert.deepEqual compare les prototypes, et un tableau construit
 *  dans le sandbox n'est jamais « égal » à un tableau local. */
const local = v => JSON.parse(JSON.stringify(v));

/** Substitue des balances le temps d'une vérification, puis restaure —
 *  y compris si l'assertion échoue, sans quoi tous les tests suivants
 *  travailleraient sur le jeu de substitution. */
function avecBalances(balances, fn){
    const sauvegarde = ev('JSON.stringify(balanceData)');
    try{
        app.chargerBalances(balances);
        fn();
    } finally {
        app.chargerBalances(JSON.parse(sauvegarde));
    }
}

/* ---------------- Doublons de numéro de compte ---------------- */

test('DOUBLONS — les comptes présents deux fois sont détectés', () => {
    // 63280000 en N, 658800000 en N et en N-1, chacun avec deux intitulés
    // différents : c'est ce qui les rend repérables.
    const anomalies = ev('JSON.stringify(detecterAnomaliesIntitules())');
    assert.match(anomalies, /63280000/, 'doublon 63280000 non signalé');
    assert.match(anomalies, /658800000/, 'doublon 658800000 non signalé');
});

test('DOUBLONS — la revue des variations les tague et refuse de les rapprocher', () => {
    // Sans lever l'ambiguïté, aucun rattachement à un solde N-1 n'est
    // possible : mieux vaut ne rien affirmer que rapprocher au hasard.
    const occ = ev('cycOccurrences(balanceData.n)');
    assert.ok(occ['63280000'] >= 2);
    assert.ok(occ['658800000'] >= 2);
});

test('DOUBLONS — ils ne faussent pas les totaux de la liasse', () => {
    // Le rattachement aux postes se fait par préfixe : les deux lignes
    // d'un même numéro sont bien additionnées.
    assert.equal(arrondi(ev('liasseGetActif("n").BZ.net')), REF.actif.BZ[2]);
    assert.equal(arrondi(ev('liasseGetResultat("n").XI')), REF.resultat.XI[0]);
});

/* ---------------- Numérotation hétérogène ---------------- */

test('NUMÉROTATION — deux écritures d’un même compte dans une balance', () => {
    // Sur MTTCI, la balance N-1 porte 647800000 ET 64780000, ainsi que
    // 6745000 ET 67450000. Ce sont les mêmes comptes, à un zéro près.
    const anomalies = app.sandbox.detecterNumerotationHeterogene();
    const texte = JSON.stringify(anomalies);
    assert.match(texte, /647800000 \/ 64780000|64780000 \/ 647800000/,
        'collision 6478 non signalée');
    assert.match(texte, /6745000 \/ 67450000|67450000 \/ 6745000/,
        'collision 6745 non signalée');
});

test('NUMÉROTATION — un compte renuméroté entre N et N-1 est signalé', () => {
    // Cas construit : le même compte gagne un zéro d'un exercice à l'autre.
    // Sans détection, il sort en « compte nouveau » ET en « compte disparu ».
    avecBalances({
        n:  [{ compte:'60110000', intitule:'ACHATS', od:0, oc:0, md:1000, mc:0, sd:1000, sc:0 }],
        n1: [{ compte:'6011000',  intitule:'ACHATS', od:0, oc:0, md:900,  mc:0, sd:900,  sc:0 }],
    }, () => {
        const texte = JSON.stringify(local(app.sandbox.detecterNumerotationHeterogene()));
        assert.match(texte, /60110000.*\(N\).*6011000.*\(N-1\)/,
            'renumérotation entre exercices non détectée');
        assert.match(texte, /faux « compte nouveau »/, 'la conséquence doit être expliquée');
    });
});

test('NUMÉROTATION — aucun faux positif quand les écritures concordent', () => {
    avecBalances({
        n:  [{ compte:'60110000', intitule:'ACHATS', od:0, oc:0, md:1000, mc:0, sd:1000, sc:0 }],
        n1: [{ compte:'60110000', intitule:'ACHATS', od:0, oc:0, md:900,  mc:0, sd:900,  sc:0 }],
    }, () => {
        assert.deepEqual(local(app.sandbox.detecterNumerotationHeterogene()), []);
    });
});

test('NUMÉROTATION — la normalisation ne sert qu’à comparer, jamais à réécrire', () => {
    assert.equal(ev(`normaliserZerosFin('67450000')`), '6745');
    assert.equal(ev(`normaliserZerosFin('6745000')`),  '6745');
    assert.equal(ev(`normaliserZerosFin('0')`),        '0', 'un compte à zéro ne doit pas devenir vide');
    assert.equal(ev(`normaliserZerosFin('TOTAL')`),    null);
    // les données elles-mêmes restent intactes : c'est à l'auditeur de trancher
    assert.ok(ev(`balanceData.n1.some(function(r){ return String(r.compte).trim() === '6745000'; })`),
        'la balance a été réécrite — la détection ne doit rien modifier');
});

test('NUMÉROTATION — les deux écritures alimentent malgré tout le bon poste', () => {
    // 6745000 et 67450000 sont tous deux des comptes 674 : le préfixe les
    // capte, et RM N-1 de la liasse DGI est bien la somme des deux.
    const rm = ev('liasseGetResultat("n1").RM');
    assert.equal(arrondi(rm), REF.resultat.RM[1]);
    const somme = ev(`
        balanceData.n1
            .filter(function(r){ return String(r.compte).indexOf('6745') === 0; })
            .reduce(function(s, r){ return s + cycSolde(r); }, 0)
    `);
    assert.equal(arrondi(somme), 3492224, 'les deux lignes 6745 doivent totaliser RM N-1');
});

/* ---------------- Déséquilibre des mouvements N-1 ---------------- */

test('MOUVEMENTS — la balance N-1 de MTTCI est déséquilibrée de 22 291 540', () => {
    // Les soldes, eux, sont équilibrés des deux côtés : c'est pourquoi le
    // bilan et le résultat N-1 restent justes.
    const md = ev(`balanceData.n1.reduce(function(s,r){ return s + (parseNum(r.md)||0); }, 0)`);
    const mc = ev(`balanceData.n1.reduce(function(s,r){ return s + (parseNum(r.mc)||0); }, 0)`);
    assert.equal(arrondi(md - mc), -22291540, 'l’écart connu a changé');

    const sd = ev(`balanceData.n1.reduce(function(s,r){ return s + (parseNum(r.sd)||0); }, 0)`);
    const sc = ev(`balanceData.n1.reduce(function(s,r){ return s + (parseNum(r.sc)||0); }, 0)`);
    assert.equal(arrondi(sd - sc), 0, 'les soldes N-1 doivent rester équilibrés');
});

test('MOUVEMENTS — la balance N, elle, est équilibrée des deux façons', () => {
    for(const champ of [['md','mc'], ['sd','sc']]){
        const d = ev(`balanceData.n.reduce(function(s,r){ return s + (parseNum(r.${champ[0]})||0); }, 0)`);
        const c = ev(`balanceData.n.reduce(function(s,r){ return s + (parseNum(r.${champ[1]})||0); }, 0)`);
        assert.equal(arrondi(d - c), 0, `balance N déséquilibrée sur ${champ.join('/')}`);
    }
});

test('MOUVEMENTS — un TFT calculé sur N-1 serait faux, celui sur N est bouclé', () => {
    // Le TFT consomme les colonnes de mouvements. Celles de N-1 étant
    // déséquilibrées, seule la colonne N est exploitable — c'est sur elle
    // que toute la validation a été calée.
    const T = ev('liasseGetTFTColumn("n")');
    assert.equal(arrondi(T.ZA + T.ZG), arrondi(T.ZH));
    assert.equal(arrondi(T.ECART), 0);

    // La colonne N-1 du classeur de référence est elle-même incohérente :
    // ZH y affiche 261 510 046 alors que la trésorerie de clôture N-1 vaut
    // 144 028 083, qui est le ZA de la colonne N.
    assert.equal(REF.tft_n1.ZH, 261510046, 'la référence N-1 a changé');
    assert.equal(REF.tft_n.ZA,  144028083);
    assert.notEqual(REF.tft_n1.ZH, REF.tft_n.ZA,
        'si ces deux valeurs concordent enfin, la colonne N-1 devient exploitable');
});
