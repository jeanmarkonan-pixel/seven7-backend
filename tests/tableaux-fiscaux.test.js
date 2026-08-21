/* ==================================================================
   TABLEAUX FISCAUX ET SOCIAUX MENSUELS (onglet l)

   Le rapprochement comptes/déclaré (IMPOTS_ROWS, 08-controles-audit.js)
   a ses propres tests ailleurs ; ceux-ci couvrent uniquement le suivi
   déclaratif mensuel ajouté par 48-tableaux-fiscaux.js : la TVA (solde,
   bascule due/crédit), la patente (écart) et les totaux calculés (CNPS).
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
    if(w.document.readyState !== 'complete')
        await new Promise(r => w.addEventListener('load', r, { once:true }));
    await new Promise(r => setTimeout(r, 60));
    return d;
}

test('INSTALLATION — les tableaux fiscaux sont posés une seule fois dans l’onglet impôts', async () => {
    const d = await domPret();
    const w = d.window;
    const avant = w.document.querySelectorAll('#impots .card').length;
    w.tfInstaller();
    w.tfInstaller();
    assert.equal(w.document.querySelectorAll('#impots .card').length, avant, 'carte dupliquée');
    assert.ok(w.document.getElementById('tf-tva'), 'tableau TVA absent');
    assert.ok(w.document.getElementById('tf-groupe1'), 'tableau impôts groupe 1 absent');
    assert.ok(w.document.getElementById('tf-groupe2'), 'tableau impôts groupe 2 absent');
    assert.ok(w.document.getElementById('tf-cnps'), 'tableau CNPS absent');
    assert.ok(w.document.getElementById('tf-cmu'), 'tableau CMU isolée absent');
    // 12 lignes de mois + 1 en-tête + 4 lignes de pied (Total/Solde Initial/Règlement/Solde Final)
    assert.equal(w.document.getElementById('tf-tva').rows.length, 17);
    d.window.close();
});

test('TVA — un solde mensuel positif alimente TVA due, jamais le crédit', async () => {
    const d = await domPret();
    const w = d.window;
    const tr = w.document.getElementById('tf-tva').rows[1]; // Janvier
    tr.querySelector('[data-tf-col="TVA_Collectee"]').value = '1000000';
    tr.querySelector('[data-tf-col="TVA_Recuperable"]').value = '400000';
    w.tfRecalculerTVA();
    assert.equal(w.parseNum(tr.querySelector('[data-tf-col="TVA_Due"]').textContent), 600000);
    assert.equal(w.parseNum(tr.querySelector('[data-tf-col="Credit_TVA"]').textContent), 0);
    d.window.close();
});

test('TVA — un solde mensuel négatif alimente le crédit, jamais la TVA due', async () => {
    const d = await domPret();
    const w = d.window;
    const tr = w.document.getElementById('tf-tva').rows[1];
    tr.querySelector('[data-tf-col="TVA_Collectee"]').value = '200000';
    tr.querySelector('[data-tf-col="TVA_Recuperable"]').value = '500000';
    w.tfRecalculerTVA();
    assert.equal(w.parseNum(tr.querySelector('[data-tf-col="TVA_Due"]').textContent), 0);
    assert.equal(w.parseNum(tr.querySelector('[data-tf-col="Credit_TVA"]').textContent), 300000);
    d.window.close();
});

test('PIED DE TABLEAU — Solde Final suit Solde Initial + Total − Règlement', async () => {
    const d = await domPret();
    const w = d.window;
    const table = w.document.getElementById('tf-groupe1');
    // ITS : Janvier 100 000, Février 150 000 — Total attendu 250 000
    table.rows[1].querySelector('[data-tf-col="ITS"]').value = '100000';
    table.rows[2].querySelector('[data-tf-col="ITS"]').value = '150000';
    w.tfRecalculerLigne('impots_groupe_1', table.rows[1].querySelector('[data-tf-col="ITS"]'));
    const totalEl = table.querySelector('[data-tf-pied="total"][data-tf-col="ITS"]');
    assert.equal(w.parseNum(totalEl.textContent), 250000, 'TOTAL doit sommer les 12 mois');

    table.querySelector('[data-tf-pied="si"][data-tf-col="ITS"]').value = '50000';
    table.querySelector('[data-tf-pied="reg"][data-tf-col="ITS"]').value = '180000';
    w.tfRecalculerPied('tf-groupe1');
    const sfEl = table.querySelector('[data-tf-pied="sf"][data-tf-col="ITS"]');
    // 50 000 (initial) + 250 000 (total déclaré) - 180 000 (réglé) = 120 000
    assert.equal(w.parseNum(sfEl.textContent), 120000);
    d.window.close();
});

test('RAPPROCHEMENT — CE, TA et TFPC (comptes 6413/6414/6415) rejoignent le tableau existant', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [
        { compte:'64130000', intitule:'CONTRIBUTION EMPLOYEUR', od:0, oc:0, md:250000, mc:0, sd:250000, sc:0 },
        { compte:'64140000', intitule:'TAXE APPRENTISSAGE', od:0, oc:0, md:75000, mc:0, sd:75000, sc:0 },
        { compte:'64150000', intitule:'TAXE FORMATION PRO CONTINUE', od:0, oc:0, md:40000, mc:0, sd:40000, sc:0 },
    ];
    const parKey = k => w.IMPOTS_ROWS_MAP[k];
    assert.ok(parKey('ce'), 'ligne CE absente de IMPOTS_ROWS');
    assert.ok(parKey('ta'), 'ligne TA absente de IMPOTS_ROWS');
    assert.ok(parKey('tfpc'), 'ligne TFPC absente de IMPOTS_ROWS');
    assert.equal(parKey('ce').fn(), 250000);
    assert.equal(parKey('ta').fn(), 75000);
    assert.equal(parKey('tfpc').fn(), 40000);
    d.window.close();
});

test('CRÉDIT DE TVA — solde annuel positif grise et désactive la section', async () => {
    const d = await domPret();
    const w = d.window;
    const table = w.document.getElementById('tf-tva');
    table.rows[1].querySelector('[data-tf-col="TVA_Collectee"]').value = '1000000';
    w.tfRecalculerTVA();
    const section = w.document.getElementById('tf-credit-tva-section');
    assert.ok(section.classList.contains('tf-section-grisee'), 'section devrait être grisée');
    assert.equal(w.document.getElementById('tf-credit-tva-montant').disabled, true);
    d.window.close();
});

test('CRÉDIT DE TVA — solde annuel négatif ouvre la section à la saisie', async () => {
    const d = await domPret();
    const w = d.window;
    const table = w.document.getElementById('tf-tva');
    table.rows[1].querySelector('[data-tf-col="TVA_Recuperable"]').value = '1000000';
    w.tfRecalculerTVA();
    const section = w.document.getElementById('tf-credit-tva-section');
    assert.equal(section.classList.contains('tf-section-grisee'), false, 'section ne devrait pas être grisée');
    assert.equal(w.document.getElementById('tf-credit-tva-montant').disabled, false);
    d.window.close();
});

test('CNPS — le total se recalcule à partir des quatre cotisations', async () => {
    const d = await domPret();
    const w = d.window;
    const tr = w.document.getElementById('tf-cnps').rows[1];
    const input = tr.querySelector('[data-tf-col="RETRAITE"]');
    input.value = '50000';
    tr.querySelector('[data-tf-col="ACT"]').value = '10000';
    tr.querySelector('[data-tf-col="ASSM_PRES_F"]').value = '20000';
    tr.querySelector('[data-tf-col="CMU"]').value = '5000';
    w.tfRecalculerLigne('cnps', input);
    assert.equal(w.parseNum(tr.querySelector('[data-tf-col="CNPS"]').textContent), 85000);
    d.window.close();
});

test('PATENTE — l’écart compare le comptabilisé aux deux tranches payées', async () => {
    const d = await domPret();
    const w = d.window;
    w.document.getElementById('tf-patente-Comptabilite').value = '500000';
    w.document.getElementById('tf-patente-Tranche_1').value = '200000';
    w.document.getElementById('tf-patente-Tranche_2').value = '250000';
    w.tfRecalculerPatente();
    assert.equal(w.parseNum(w.document.getElementById('tf-patente-Ecart').value), 50000);
    assert.equal(w.tfEcartPatente(), 50000);
    d.window.close();
});

test('PATENTE — sans écart, tfEcartPatente rend 0', async () => {
    const d = await domPret();
    const w = d.window;
    w.document.getElementById('tf-patente-Comptabilite').value = '450000';
    w.document.getElementById('tf-patente-Tranche_1').value = '200000';
    w.document.getElementById('tf-patente-Tranche_2').value = '250000';
    w.tfRecalculerPatente();
    assert.equal(w.tfEcartPatente(), 0);
    d.window.close();
});
