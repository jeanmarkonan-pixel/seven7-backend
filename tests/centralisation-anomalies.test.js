/* ==================================================================
   CENTRALISATION DES ANOMALIES (onglet s)

   Couvre le scan des trois sources automatiques (balance tiers, écart
   de patente, contrôle interne), le signalement manuel, la résolution
   par justification, les compteurs KPI, et le pont vers
   rapConstatations() (38-rapport-general.js) qui a perdu sa source
   automatique au retrait de l'onglet Constatations (chantier 4).
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
/** Recopie une valeur venue du realm jsdom dans le nôtre : deepEqual compare
 *  les prototypes, et un tableau né dans jsdom n'est jamais « égal » au nôtre. */
const local = v => JSON.parse(JSON.stringify(v));

async function domPret(){
    const d = dom();
    const w = d.window;
    if(w.document.readyState !== 'complete')
        await new Promise(r => w.addEventListener('load', r, { once:true }));
    await new Promise(r => setTimeout(r, 60));
    return d;
}

test('INSTALLATION — le panneau est posé une seule fois dans l’onglet ecritures', async () => {
    const d = await domPret();
    const w = d.window;
    const avant = w.document.querySelectorAll('#ecritures .card').length;
    w.anInstaller();
    w.anInstaller();
    assert.equal(w.document.querySelectorAll('#ecritures .card').length, avant, 'carte dupliquée');
    assert.ok(w.document.getElementById('an-table'), 'tableau des anomalies absent');
    assert.ok(w.document.getElementById('an-modal'), 'modal de signalement manuel absente');
    d.window.close();
});

test('SCAN — un fournisseur anormalement débiteur remonte comme anomalie', async () => {
    const d = await domPret();
    const w = d.window;
    w.seuils = { faible: 100000, planif: 0, signif: 0 };
    w.tiersData.fourn = [{ compte:'401001', intitule:'FOURNISSEUR X', sd: 5000000, sc: 0 }];
    const liste = w.anScannerTiers();
    assert.equal(liste.length, 1);
    assert.equal(liste[0].montant, 5000000);
    assert.equal(liste[0].onglet, 'tiers-fourn');
    d.window.close();
});

test('SCAN — sous le seuil, aucune anomalie tiers ne remonte', async () => {
    const d = await domPret();
    const w = d.window;
    w.seuils = { faible: 100000, planif: 0, signif: 0 };
    w.tiersData.fourn = [{ compte:'401002', intitule:'FOURNISSEUR Y', sd: 1000, sc: 0 }];
    assert.deepEqual(local(w.anScannerTiers()), []);
    d.window.close();
});

test('SCAN — l’écart de patente non nul remonte, nul il ne remonte pas', async () => {
    const d = await domPret();
    const w = d.window;
    w.balanceData.n = [{ compte:'64120000', intitule:'PATENTES', od:0, oc:0, md:400000, mc:0, sd:400000, sc:0 }];
    w.document.getElementById('tf-patente-Declaration').value = '500000';
    w.tfRecalculerPatente();
    let liste = w.anScannerPatente();
    assert.equal(liste.length, 1);
    assert.equal(liste[0].montant, 100000);

    w.document.getElementById('tf-patente-Declaration').value = '400000';
    w.tfRecalculerPatente();
    liste = w.anScannerPatente();
    assert.deepEqual(local(liste), []);
    d.window.close();
});

test('SCAN — contrôle interne : réponse Non et efficacité faible remontent séparément', async () => {
    const d = await domPret();
    const w = d.window;
    const table = w.document.getElementById('table-questionnaire');
    const tr = table.rows[1];
    tr.querySelector('select').value = 'Non';
    tr.querySelector('input[type="number"]').value = '1';
    const liste = w.anScannerCI();
    // une ligne "Non conforme" et une ligne "Risque critique" pour le même point
    assert.equal(liste.length, 2);
    assert.ok(liste.some(a => /Non conforme/.test(a.description)));
    assert.ok(liste.some(a => /Risque critique/.test(a.description)));
    assert.ok(liste.every(a => a.onglet === 'questionnaire'));
    d.window.close();
});

test('RÉSOLUTION — une anomalie se résout dès qu’une justification est saisie', async () => {
    const d = await domPret();
    const w = d.window;
    w.seuils = { faible: 100000, planif: 0, signif: 0 };
    w.tiersData.fourn = [{ compte:'401003', intitule:'FOURNISSEUR Z', sd: 5000000, sc: 0 }];
    w.anRendre();
    let anomalies = w.anToutesAnomalies();
    assert.equal(anomalies.length, 1);
    assert.equal(anomalies[0].resolue, false);
    assert.equal(w.document.getElementById('an-kpi-encours').textContent, '1');
    assert.equal(w.document.getElementById('an-kpi-resolues').textContent, '0');

    w.anJustifierChange(anomalies[0].cle, 'Justifié auprès de la direction, voir pièce jointe.');
    anomalies = w.anToutesAnomalies();
    assert.equal(anomalies[0].resolue, true);
    assert.equal(w.document.getElementById('an-kpi-encours').textContent, '0');
    assert.equal(w.document.getElementById('an-kpi-resolues').textContent, '1');
    d.window.close();
});

test('SIGNALEMENT MANUEL — ajout, présence dans la liste, puis suppression', async () => {
    const d = await domPret();
    const w = d.window;
    w.anOuvrirModal(); // construit la liste des onglets dans le select, vide les champs
    w.document.getElementById('an-modal-titre').value = 'Anomalie signalée à la main';
    w.document.getElementById('an-modal-description').value = 'Description libre';
    w.document.getElementById('an-modal-montant').value = '12345';
    w.anEnregistrerModal();

    let anomalies = w.anToutesAnomalies();
    const manuelle = anomalies.find(a => a.manuelle);
    assert.ok(manuelle, 'anomalie manuelle absente après enregistrement');
    assert.equal(manuelle.montant, 12345);
    assert.equal(w.document.getElementById('an-modal').style.display, 'none', 'la modal doit se refermer');

    w.anSupprimerManuelle(manuelle.cle);
    anomalies = w.anToutesAnomalies();
    assert.ok(!anomalies.some(a => a.manuelle), 'anomalie manuelle toujours présente après suppression');
    d.window.close();
});

test('PONT RAPPORT — une anomalie non résolue devient un bloquant du fondement de l’opinion', async () => {
    const d = await domPret();
    const w = d.window;
    w.seuils = { faible: 100000, planif: 0, signif: 0 };
    w.tiersData.clients = [{ compte:'411001', intitule:'CLIENT ANORMAL', sd: 0, sc: 8000000 }];
    const cst = w.rapConstatations();
    assert.equal(cst.bloquants.length, 1);
    assert.equal(cst.bloquants[0].source, 'Balance tiers — Clients');
    assert.match(cst.bloquants[0].libelle, /411001/);
    d.window.close();
});

test('PONT RAPPORT — une anomalie justifiée ne remonte plus comme bloquante', async () => {
    const d = await domPret();
    const w = d.window;
    w.seuils = { faible: 100000, planif: 0, signif: 0 };
    w.tiersData.clients = [{ compte:'411002', intitule:'CLIENT ANORMAL 2', sd: 0, sc: 8000000 }];
    const avant = w.anToutesAnomalies();
    w.anJustifierChange(avant[0].cle, 'Confirmé par circularisation, écart normal.');
    const cst = w.rapConstatations();
    assert.deepEqual(local(cst.bloquants), []);
    d.window.close();
});
