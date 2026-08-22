/* ==================================================================
   DÉTECTION DES ERREURS DE CODIFICATION SYSCOHADA (onglets e/f)

   Trois règles déterministes (racine de classe, compte tiers générique,
   incohérence N/N-1) et la reclassification virtuelle qui en découle
   (jamais de modification de balanceData ni du CSV — seulement
   paramResolve() qui en tient compte pour le Bilan/Résultat).
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { cheminApplication } from './harness.js';

const html = fs.readFileSync(cheminApplication(), 'utf8');

function dom(){
    return new JSDOM(html, {
        runScripts: 'dangerously', pretendToBeVisual: true,
        url: 'https://seven7-audit.web.app/', virtualConsole: new VirtualConsole(),
    });
}
async function domPret(){
    const d = dom();
    const w = d.window;
    w.alert = () => {};
    if(w.document.readyState !== 'complete')
        await new Promise(r => w.addEventListener('load', r, { once:true }));
    await new Promise(r => setTimeout(r, 60));
    return d;
}
const local = v => JSON.parse(JSON.stringify(v));

test('RACINE — un libellé « achat de marchandises » hors compte 601 est signalé', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [
        { compte:'6112000', intitule:'ACHAT DE MARCHANDISES', od:0, oc:0, md:0, mc:0, sd:500000, sc:0 },
        { compte:'60110000', intitule:'ACHAT DE MARCHANDISES', od:0, oc:0, md:0, mc:0, sd:200000, sc:0 },
    ];
    const liste = w.syscDetecterRacine();
    assert.equal(liste.length, 1, 'seul le compte mal racine doit être signalé');
    assert.equal(liste[0].compte, '6112000');
    assert.equal(liste[0].compteRecommande, '601');
    d.window.close();
});

test('RACINE — un compte au solde nul n’est jamais signalé', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [{ compte:'6112000', intitule:'ACHAT DE MARCHANDISES', od:0, oc:0, md:0, mc:0, sd:0, sc:0 }];
    assert.deepEqual(local(w.syscDetecterRacine()), []);
    d.window.close();
});

test('GÉNÉRIQUE — un compte tiers racine nue (401000) est signalé, un sous-compte réel ne l’est pas', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [
        { compte:'401000', intitule:'FOURNISSEURS DIVERS', od:0, oc:0, md:0, mc:0, sd:0, sc:900000 },
        { compte:'401002', intitule:'FOURNISSEUR ABC', od:0, oc:0, md:0, mc:0, sd:0, sc:150000 },
    ];
    const liste = w.syscDetecterGenerique();
    assert.equal(liste.length, 1);
    assert.equal(liste[0].compte, '401000');
    d.window.close();
});

test('N/N-1 — même libellé, racine différente d’un exercice à l’autre : signalé', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n1 = [{ compte:'411002', intitule:'CLIENT ABC', sd:100000, sc:0 }];
    w.balanceData.n  = [{ compte:'601002', intitule:'CLIENT ABC', sd:100000, sc:0 }];
    const liste = w.syscDetecterIncoherenceNN1();
    assert.equal(liste.length, 1);
    assert.equal(liste[0].compte, '601002');
    assert.equal(liste[0].compteRecommande, '411002');
    d.window.close();
});

test('N/N-1 — un simple changement de sous-compte dans la même classe n’est pas signalé', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n1 = [{ compte:'411002', intitule:'CLIENT ABC', sd:100000, sc:0 }];
    w.balanceData.n  = [{ compte:'411005', intitule:'CLIENT ABC', sd:100000, sc:0 }];
    assert.deepEqual(local(w.syscDetecterIncoherenceNN1()), []);
    d.window.close();
});

test('TIERS — un compte hors classe 40/41 dans la Balance tiers est signalé', async () => {
    const d = await domPret();
    const w = d.window;
    w.tiersData.fourn = [{ compte:'601500', intitule:'FOURNISSEUR MAL CLASSÉ', sd:0, sc:200000 }];
    const liste = w.syscDetecterTiers().fourn;
    assert.equal(liste.length, 1);
    assert.equal(liste[0].compteRecommande, '40');
    d.window.close();
});

test('RECLASSIFICATION — appliquer redirige paramResolve vers la racine recommandée, sans toucher balanceData', async () => {
    const d = await domPret();
    const w = d.window;
    const compteMalNumerote = '6112000';
    const avant = w.paramResolve(compteMalNumerote, 500000, 0);
    assert.equal(avant.ref, 'RG', 'sans reclassification, 611... tombe dans Transports (61)');

    w.syscAppliquerReclassification(compteMalNumerote, '601');
    const apres = w.paramResolve(compteMalNumerote, 500000, 0);
    assert.equal(apres.ref, 'RA', 'après reclassification, doit résoudre comme un compte 601 (Achats de marchandises)');
    assert.equal(w.syscOverrides[compteMalNumerote], '601');

    w.syscAnnulerReclassification(compteMalNumerote);
    const revenu = w.paramResolve(compteMalNumerote, 500000, 0);
    assert.equal(revenu.ref, 'RG', 'annuler doit restaurer la résolution d’origine');
    assert.equal(w.syscOverrides[compteMalNumerote], undefined);
    d.window.close();
});

test('RECLASSIFICATION — persistée en localStorage par dossier, rechargée au prochain scan', async () => {
    const d = await domPret();
    const w = d.window;
    w.syscAppliquerReclassification('6112000', '601');
    const brut = JSON.parse(w.localStorage.getItem(w.syscOverridesCle()) || '{}');
    assert.equal(brut['6112000'], '601');
    d.window.close();
});

test('PANNEAU — les onglets Balance générale et Balance tiers reçoivent le tableau d’anomalies', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [{ compte:'6112000', intitule:'ACHAT DE MARCHANDISES', od:0, oc:0, md:0, mc:0, sd:500000, sc:0 }];
    w.tiersData.fourn = [{ compte:'601500', intitule:'FOURNISSEUR MAL CLASSÉ', sd:0, sc:200000 }];
    w.syscRafraichirTout();
    const panneauBalance = w.document.getElementById('sysc-panneau-balance-n');
    const panneauTiers = w.document.getElementById('sysc-panneau-tiers-fourn');
    assert.ok(panneauBalance, 'panneau absent de la Balance générale');
    assert.ok(panneauTiers, 'panneau absent de la Balance tiers fournisseurs');
    assert.match(panneauBalance.textContent, /6112000/);
    assert.match(panneauTiers.textContent, /601500/);
    assert.ok(panneauBalance.closest('#balance-n'), 'le panneau doit être dans l’onglet Balance générale N');
    d.window.close();
});

test('PANNEAU — sans anomalie, le panneau reste présent mais masqué', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [{ compte:'60110000', intitule:'ACHAT DE MARCHANDISES', od:0, oc:0, md:0, mc:0, sd:200000, sc:0 }];
    w.balanceData.n1 = [];
    w.tiersData.fourn = [];
    w.tiersData.clients = [];
    w.syscRafraichirTout();
    const panneau = w.document.getElementById('sysc-panneau-balance-n');
    assert.ok(panneau, 'le panneau doit exister même vide');
    assert.equal(panneau.style.display, 'none');
    d.window.close();
});

test('ANOMALIES — anScannerSYSCOHADA remonte les erreurs non reclassées, plus une fois reclassées', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [{ compte:'6112000', intitule:'ACHAT DE MARCHANDISES', od:0, oc:0, md:0, mc:0, sd:500000, sc:0 }];
    let liste = w.anScannerSYSCOHADA();
    assert.ok(liste.some(a => a.cle === 'sysc:balance:6112000'));

    w.syscAppliquerReclassification('6112000', '601');
    liste = w.anScannerSYSCOHADA();
    assert.ok(!liste.some(a => a.cle === 'sysc:balance:6112000'), 'une anomalie reclassée ne doit plus remonter');
    d.window.close();
});
