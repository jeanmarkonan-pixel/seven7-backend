/* ==================================================================
   INTÉGRATION — LA CHAÎNE COMPLÈTE, DU COLLAGE AU RAPPORT

   Tous les autres tests injectent les balances directement dans
   `balanceData`. Aucun ne vérifiait que la chaîne réelle tient :

     collage d'une balance tabulée (ce que fait l'auditeur depuis Excel)
       → parseNum sur chaque colonne
       → balanceData
       → liasse : bilan, résultat, TFT
       → cycles et détection des erreurs
       → constatations d'audit
       → rapport général

   Chaque maillon est couvert isolément ; c'est leur enchaînement qui
   ne l'était pas. Un test unitaire vert avec une chaîne rompue est
   exactement le genre de faux confort qu'on veut éviter.

   Le collage se fait au FORMAT FRANÇAIS avec points de milliers —
   « 385.982.204 » — celui des exports Excel qui avait révélé la
   régression parseNum. La chaîne est donc éprouvée sur le format qui
   l'avait cassée.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { cheminApplication, balancesMTTCI, liasseReference, arrondi } from './harness.js';

const html = fs.readFileSync(cheminApplication(), 'utf8');
const REF = liasseReference();
const MTTCI = balancesMTTCI();

/** Met un montant au format des exports Excel français : points de
 *  milliers, virgule décimale. C'est ce que l'auditeur colle vraiment. */
function fr(n){
    if(!n) return '';
    const s = Math.abs(Math.round(n)).toString();
    const groupes = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 ? '-' : '') + groupes;
}

/** Transforme une balance de référence en collage tabulé. */
function versCollage(rows){
    return rows.map(r => [
        r.compte, r.intitule, fr(r.od), fr(r.oc), fr(r.md), fr(r.mc), fr(r.sd), fr(r.sc)
    ].join('\t')).join('\n');
}

/* --- La chaîne, exécutée une fois pour toutes les vérifications --- */
const jsdom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://seven7-audit.web.app/', virtualConsole: new VirtualConsole(),
});
await new Promise(r => {
    if(jsdom.window.document.readyState === 'complete') return r();
    jsdom.window.addEventListener('load', r, { once:true });
});
await new Promise(r => setTimeout(r, 60));
const W = jsdom.window;

/* Étape 1 — l'auditeur colle ses deux balances */
for(const ex of ['n', 'n1']){
    W.document.getElementById('paste-' + ex).value = versCollage(MTTCI[ex]);
    W.pasteBalance(ex);
}

test('CHAÎNE 1 — le collage tabulé alimente balanceData intégralement', () => {
    assert.equal(W.balanceData.n.length,  MTTCI.n.length,  'balance N incomplète après collage');
    assert.equal(W.balanceData.n1.length, MTTCI.n1.length, 'balance N-1 incomplète après collage');
});

test('CHAÎNE 2 — les montants au format français traversent le collage sans perte', () => {
    // « 385.982.204 » collé doit valoir 385 982 204, pas 385,982.
    // C'est la régression historique, éprouvée ici sur le chemin réel.
    const totalSD = W.balanceData.n.reduce((s, r) => s + (W.parseNum(r.sd) || 0), 0);
    const attendu = MTTCI.n.reduce((s, r) => s + r.sd, 0);
    assert.equal(arrondi(totalSD), arrondi(attendu), 'les soldes débiteurs ont été tronqués');

    const ligne = W.balanceData.n.find(r => String(r.compte).trim() === '52110000');
    assert.ok(ligne, 'compte de banque introuvable après collage');
    const source = MTTCI.n.find(r => r.compte === '52110000');
    assert.equal(arrondi(W.parseNum(ligne.sd)), arrondi(source.sd));
});

test('CHAÎNE 3 — la liasse se calcule et reproduit les états DGI', () => {
    const A = W.liasseGetActif('n');
    const R = W.liasseGetResultat('n');
    const P = W.liasseGetPassif('n', R.XI);
    assert.equal(arrondi(A.BZ.net), REF.actif.BZ[2],   'total du bilan');
    assert.equal(arrondi(P.DZ.net), REF.passif.DZ[0],  'total du passif');
    assert.equal(arrondi(R.XI),     REF.resultat.XI[0], 'résultat net');
    assert.equal(arrondi(A.BZ.net), arrondi(P.DZ.net),  'le bilan doit boucler');
});

test('CHAÎNE 4 — le TFT boucle sur la balance collée', () => {
    const T = W.liasseGetTFTColumn('n');
    assert.equal(arrondi(T.ZA + T.ZG), arrondi(T.ZH));
    assert.equal(arrondi(T.ECART), 0);
    assert.equal(arrondi(T.ZH), REF.tft_n.ZH);
});

test('CHAÎNE 5 — les deux moteurs comptables restent d’accord', () => {
    const ancien = W.computeResultat('n');
    const actif  = W.computeBilanActif('n');
    assert.equal(arrondi(actif.total), REF.actif.BZ[2]);
    assert.equal(arrondi(ancien.XI),   REF.resultat.XI[0]);
});

test('CHAÎNE 6 — la détection des erreurs tourne sans exception', () => {
    // runDetection enchaîne continuité, cycles, revue des variations :
    // c'est le point où une balance mal formée casserait l'application.
    assert.doesNotThrow(() => W.runDetection());
    assert.doesNotThrow(() => W.runCycles());
    assert.doesNotThrow(() => W.runCyclesVariations());
});

test('CHAÎNE 7 — les contrôles croisés bloquants sortent à écart nul', () => {
    for(const cyc of ['IMM', 'CAP', 'TRE']){
        const c = W.cycControlesGlobaux(cyc).filter(x => !x.info);
        assert.ok(c.length, `${cyc} : aucun contrôle bloquant`);
        assert.equal(arrondi(c[0].a), arrondi(c[0].b), `${cyc} : ${c[0].lib}`);
    }
});

test('CHAÎNE 8 — les constatations ne signalent aucun bloquant sur un jeu sain', () => {
    // JSON.parse recopie dans notre realm : assert.deepEqual compare les
    // prototypes, et un tableau né dans jsdom n'est jamais « égal » au nôtre.
    const F = JSON.parse(JSON.stringify(W.fmCollecter()));
    const bloquants = F.filter(x => x.degre === 'BLOQUANT').map(x => x.libelle);
    assert.deepEqual(bloquants, [],
        'un jeu réconcilié ne doit produire aucune constatation bloquante');
});

test('CHAÎNE 9 — la revue analytique détaillée recoupe les grandes masses', () => {
    assert.equal(arrondi(W.rvdTotaux('ai').n),  REF.actif.AZ[2]);
    assert.equal(arrondi(-W.rvdTotaux('cp').n), REF.passif.CP[0]);
});

test('CHAÎNE 10 — le rapport général se produit avec les chiffres de la liasse', () => {
    W.document.getElementById('fi-raison').value  = 'MANUTENTION TRANSIT-TRANSPORT';
    W.document.getElementById('fi-cloture').value = '2025-12-31';
    W.document.getElementById('rap-opinion').value = 'CERT';
    const t = W.rapGenerer();
    assert.ok(t.includes('MANUTENTION TRANSIT-TRANSPORT'));
    assert.ok(t.includes(W.fmt(REF.actif.BZ[2])),    'total du bilan absent du rapport');
    assert.ok(t.includes(W.fmt(REF.resultat.XI[0])), 'résultat net absent du rapport');
    assert.ok(t.includes('VÉRIFICATIONS SPÉCIFIQUES'));
});

test('CHAÎNE 11 — le rapport spécial se produit dans la même passe', () => {
    const t = W.convGenerer();
    assert.ok(t.includes('RAPPORT SPÉCIAL DU COMMISSAIRE AUX COMPTES'));
    assert.ok(t.includes('MANUTENTION TRANSIT-TRANSPORT'), 'l’identification ne se propage pas');
    assert.match(t, /aucune convention autorisée et conclue/);
});

test('CHAÎNE 12 — le mémo de synthèse s’alimente de la même passe', () => {
    const analyse = W.memoAnalyseCycles();
    assert.ok(analyse.length, 'aucun cycle analysé après la chaîne complète');
    const poids = analyse.reduce((s, c) => s + c.poids, 0);
    assert.ok(Math.abs(poids - 100) < 0.01, `somme des poids = ${poids}`);
});

test('CHAÎNE 13 — une balance vide ne casse aucun maillon', () => {
    // L'auditeur ouvre un dossier neuf : rien ne doit lever d'exception.
    const d = new JSDOM(html, {
        runScripts: 'dangerously', pretendToBeVisual: true,
        url: 'https://seven7-audit.web.app/', virtualConsole: new VirtualConsole(),
    });
    return new Promise(r => {
        d.window.addEventListener('load', () => setTimeout(() => {
            const V = d.window;
            assert.doesNotThrow(() => V.runDetection());
            assert.doesNotThrow(() => V.liasseGetActif('n'));
            assert.doesNotThrow(() => V.fmCollecter());
            assert.doesNotThrow(() => V.rapGenerer());
            assert.doesNotThrow(() => V.convGenerer());
            assert.ok(V.rapGenerer().includes('[Raison sociale]'),
                'un dossier neuf doit produire des marqueurs, pas des blancs');
            d.window.close();
            r();
        }, 60), { once:true });
    });
});
