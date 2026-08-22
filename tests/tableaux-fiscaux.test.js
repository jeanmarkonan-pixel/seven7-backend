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
    assert.ok(w.document.getElementById('tf-credit-tva'), 'tableau Crédit de TVA absent');
    assert.ok(w.document.getElementById('tf-its-annuel'), 'tableau ITS(6413,6414,6415) absent');
    assert.ok(w.document.getElementById('tf-irvm'), 'tableau IRVM absent');
    assert.ok(w.document.getElementById('tf-bic'), 'tableau BIC absent');
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
    // Groupe 2 (TSE) : aucun compte associé (TF_COMPTES), Solde Initial reste un
    // champ de saisie manuelle — teste la mécanique générique du pied, sans être
    // affecté par l'extraction automatique (voir tests SOLDE INITIAL AUTO ci-dessous).
    const table = w.document.getElementById('tf-groupe2');
    // TSE : Janvier 100 000, Février 150 000 — Total attendu 250 000
    table.rows[1].querySelector('[data-tf-col="TSE"]').value = '100000';
    table.rows[2].querySelector('[data-tf-col="TSE"]').value = '150000';
    w.tfRecalculerLigne('impots_groupe_2', table.rows[1].querySelector('[data-tf-col="TSE"]'));
    const totalEl = table.querySelector('[data-tf-pied="total"][data-tf-col="TSE"]');
    assert.equal(w.parseNum(totalEl.textContent), 250000, 'TOTAL doit sommer les 12 mois');

    table.querySelector('[data-tf-pied="si"][data-tf-col="TSE"]').value = '50000';
    table.querySelector('[data-tf-pied="reg"][data-tf-col="TSE"]').value = '180000';
    w.tfRecalculerPied('tf-groupe2');
    const sfEl = table.querySelector('[data-tf-pied="sf"][data-tf-col="TSE"]');
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

test('CRÉDIT DE TVA — solde positif (déclaré ≥ récupéré) grise et désactive la suite', async () => {
    const d = await domPret();
    const w = d.window;
    w.document.getElementById('tf-ctva-declare').value = '1000000';
    w.document.getElementById('tf-ctva-recupere').value = '400000';
    w.tfRecalculerCreditTVA();
    assert.equal(w.parseNum(w.document.getElementById('tf-ctva-solde').textContent), 600000);
    const section = w.document.getElementById('tf-credit-tva-section');
    assert.ok(section.classList.contains('tf-section-grisee'), 'section devrait être grisée');
    assert.equal(w.document.getElementById('tf-ctva-si').disabled, true);
    assert.equal(w.document.getElementById('tf-ctva-paiement').disabled, true);
    d.window.close();
});

test('CRÉDIT DE TVA — solde négatif ouvre la suite à la saisie, Solde Final suit la formule', async () => {
    const d = await domPret();
    const w = d.window;
    w.document.getElementById('tf-ctva-declare').value = '200000';
    w.document.getElementById('tf-ctva-recupere').value = '500000';
    w.tfRecalculerCreditTVA();
    assert.equal(w.parseNum(w.document.getElementById('tf-ctva-solde').textContent), -300000);
    const section = w.document.getElementById('tf-credit-tva-section');
    assert.equal(section.classList.contains('tf-section-grisee'), false, 'section ne devrait pas être grisée');
    assert.equal(w.document.getElementById('tf-ctva-si').disabled, false);
    assert.equal(w.document.getElementById('tf-ctva-paiement').disabled, false);
    w.document.getElementById('tf-ctva-si').value = '50000';
    w.document.getElementById('tf-ctva-paiement').value = '100000';
    w.tfRecalculerCreditTVA();
    // Solde Final = Solde Initial + Solde − Total Paiement = 50 000 + (-300 000) − 100 000
    assert.equal(w.parseNum(w.document.getElementById('tf-ctva-sf').textContent), -350000);
    d.window.close();
});

test('ITS ANNUEL — le TOTAL suit la somme de CE, TA et TFPC', async () => {
    const d = await domPret();
    const w = d.window;
    const table = w.document.getElementById('tf-its-annuel');
    table.querySelector('[data-tf-col="CE"]').value = '250000';
    table.querySelector('[data-tf-col="TA"]').value = '75000';
    table.querySelector('[data-tf-col="TFPC"]').value = '40000';
    w.tfRecalculerITSAnnuel();
    assert.equal(w.parseNum(table.querySelector('[data-tf-col="TOTAL"]').textContent), 365000);
    d.window.close();
});

test('IRVM — l’IRVM dû se calcule à partir de la base et du taux applicable', async () => {
    const d = await domPret();
    const w = d.window;
    w.document.getElementById('tf-irvm-taux').value = '15';
    const table = w.document.getElementById('tf-irvm');
    table.rows[1].querySelector('[data-tf-col="Base"]').value = '1000000';
    w.tfRecalculerIRVM();
    assert.equal(w.parseNum(table.rows[1].querySelector('[data-tf-col="IRVM"]').textContent), 150000);
    const totalEl = table.querySelector('[data-tf-pied="total"][data-tf-col="IRVM"]');
    assert.equal(w.parseNum(totalEl.textContent), 150000, 'le pied doit sommer les 4 trimestres');
    d.window.close();
});

test('BIC — les deux acomptes et le solde de liquidation suivent le pied Total/Solde', async () => {
    const d = await domPret();
    const w = d.window;
    const table = w.document.getElementById('tf-bic');
    assert.equal(table.querySelectorAll('tr[data-tf-mois]').length, 3, '2 acomptes + solde de liquidation');
    table.rows[1].querySelector('[data-tf-col="Montant"]').value = '300000';
    table.rows[2].querySelector('[data-tf-col="Montant"]').value = '300000';
    w.tfRecalculerPied('tf-bic');
    const totalEl = table.querySelector('[data-tf-pied="total"][data-tf-col="Montant"]');
    assert.equal(w.parseNum(totalEl.textContent), 600000);
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

test('PATENTE — Comptabilité extraite automatiquement du compte 6412, Écart = Déclaration − Comptabilité', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [{ compte:'64120000', intitule:'PATENTES', od:0, oc:0, md:450000, mc:0, sd:450000, sc:0 }];
    w.document.getElementById('tf-patente-Declaration').value = '500000';
    w.tfRecalculerPatente();
    assert.equal(w.parseNum(w.document.getElementById('tf-patente-Comptabilite').textContent), 450000);
    assert.equal(w.parseNum(w.document.getElementById('tf-patente-Ecart').textContent), 50000);
    assert.equal(w.tfEcartPatente(), 50000);
    d.window.close();
});

test('PATENTE — sans écart, tfEcartPatente rend 0', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [{ compte:'64120000', intitule:'PATENTES', od:0, oc:0, md:450000, mc:0, sd:450000, sc:0 }];
    w.document.getElementById('tf-patente-Declaration').value = '450000';
    w.tfRecalculerPatente();
    assert.equal(w.tfEcartPatente(), 0);
    d.window.close();
});

test('SOLDE INITIAL AUTO — TVA extrait l’ouverture des comptes 443/445, en lecture seule', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [
        { compte:'44300000', intitule:'TVA COLLECTEE', od:0, oc:120000, md:0, mc:0, sd:0, sc:120000 },
        { compte:'44500000', intitule:'TVA RECUPERABLE', od:50000, oc:0, md:0, mc:0, sd:50000, sc:0 },
    ];
    const table = w.document.getElementById('tf-tva');
    const collecteeEl = table.querySelector('[data-tf-pied="si"][data-tf-col="TVA_Collectee"]');
    assert.equal(collecteeEl.tagName, 'TD');
    assert.ok(!table.querySelector('[data-tf-pied="si"][data-tf-col="TVA_Collectee"] input'), 'doit être en lecture seule, pas un champ de saisie');
    d.window.close();
});

test('COMPTABILITÉ/ÉCART — ITS/CE/TA/TFPC se rapprochent des comptes 4471-4474, alerte si écart', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [
        { compte:'44710000', intitule:'ITS', od:0, oc:0, md:0, mc:300000, sd:0, sc:300000 },
        { compte:'44720000', intitule:'CE', od:0, oc:0, md:0, mc:250000, sd:0, sc:250000 },
        { compte:'44730000', intitule:'TA', od:0, oc:0, md:0, mc:75000, sd:0, sc:75000 },
        { compte:'44740000', intitule:'TFPC', od:0, oc:0, md:0, mc:40000, sd:0, sc:40000 },
    ];
    const table = w.document.getElementById('tf-groupe1');
    table.rows[1].querySelector('[data-tf-col="ITS"]').value = '300000'; // Janvier, déclaré = comptabilisé
    w.tfRecalculerLigne('impots_groupe_1', table.rows[1].querySelector('[data-tf-col="ITS"]'));
    let ecartEl = table.querySelector('[data-tf-compta="ecart"][data-tf-col="ITS"]');
    assert.equal(w.parseNum(ecartEl.textContent), 0, 'déclaré = comptabilisé (300 000), pas d’écart');
    assert.equal(ecartEl.style.background, '', 'aucune alerte quand l’écart est nul');

    table.rows[1].querySelector('[data-tf-col="CE"]').value = '260000'; // déclaré 260 000 vs comptabilisé 250 000
    w.tfRecalculerLigne('impots_groupe_1', table.rows[1].querySelector('[data-tf-col="CE"]'));
    ecartEl = table.querySelector('[data-tf-compta="ecart"][data-tf-col="CE"]');
    assert.equal(w.parseNum(ecartEl.textContent), 10000);
    assert.notEqual(ecartEl.style.background, '', 'écart non nul doit être surligné (alerte)');
    d.window.close();
});

test('COMPTABILITÉ/ÉCART — CNPS se rapproche des comptes 4311+4312', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [
        { compte:'43110000', intitule:'CNPS PATRONALE', od:0, oc:0, md:0, mc:600000, sd:0, sc:600000 },
        { compte:'43120000', intitule:'CNPS SALARIALE', od:0, oc:0, md:0, mc:200000, sd:0, sc:200000 },
    ];
    const table = w.document.getElementById('tf-cnps');
    table.rows[1].querySelector('[data-tf-col="RETRAITE"]').value = '500000';
    table.rows[1].querySelector('[data-tf-col="ACT"]').value = '300000';
    w.tfRecalculerLigne('cnps', table.rows[1].querySelector('[data-tf-col="ACT"]'));
    const ecartEl = table.querySelector('[data-tf-compta="ecart"][data-tf-col="CNPS"]');
    // Déclaré (colonne calculée CNPS, Janvier) = 800 000, comptabilisé = 600 000 + 200 000 = 800 000
    assert.equal(w.parseNum(ecartEl.textContent), 0);
    d.window.close();
});

test('ANOMALIES — anScannerFiscal remonte les écarts ITS/CE/TA/TFPC et CNPS non nuls', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [
        { compte:'44710000', intitule:'ITS', od:0, oc:0, md:0, mc:100000, sd:0, sc:100000 },
    ];
    const table = w.document.getElementById('tf-groupe1');
    table.rows[1].querySelector('[data-tf-col="ITS"]').value = '150000';
    w.tfRecalculerLigne('impots_groupe_1', table.rows[1].querySelector('[data-tf-col="ITS"]'));
    const liste = w.anScannerFiscal();
    const its = liste.find(a => a.cle === 'fiscal:tf-groupe1:ITS');
    assert.ok(its, 'écart ITS doit remonter dans le scan');
    assert.equal(its.montant, 50000);
    d.window.close();
});
