/* ==================================================================
   RAPPROCHEMENT BANCAIRE — intégration DOM (import → rapprochement →
   tableau unique côte à côte → report au Grand Livre)

   Le moteur pur (parsing, matching, proposition) est couvert sans DOM
   dans rapprochement-bancaire.test.js. Ici, on vérifie le CÂBLAGE réel :
   l'import peuple l'état persistant, le rapprochement remplit le tableau
   « Résultat » (une ligne par paire GL/relevé + non rapprochées des deux
   côtés), les cas ambigus sont rendus pour arbitrage manuel, et le report
   d'une écriture manquante passe RÉELLEMENT par le circuit d'import du
   Grand Livre (paste-gl-bilan + pasteGLTable), pas par une écriture
   directe dans grandLivreBilanData.
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
    w.rbInstaller();
    return d;
}
function etatDe(w){ return JSON.parse(w.document.getElementById('rb-releve-json').value); }

test('INSTALLATION — les blocs (période, import, ambigus, résultat, manquantes) sont posés une seule fois', async () => {
    const d = await domPret();
    const w = d.window;
    w.rbInstaller();
    w.rbInstaller();
    assert.ok(w.document.getElementById('rb-date-du'), 'sélecteur de période absent');
    assert.ok(w.document.getElementById('rb-import-diagnostic'), 'zone de diagnostic import absente');
    assert.ok(w.document.getElementById('rb-releve-json'), 'état persistant du relevé absent');
    assert.ok(w.document.getElementById('rb-resultat-corps'), 'tableau résultat absent');
    assert.ok(w.document.getElementById('rb-ambigus-section'), 'section doublons ambigus absente');
    assert.ok(w.document.getElementById('rb-manquantes-section'), 'section écritures manquantes absente');
    assert.equal(w.document.querySelectorAll('#rb-releve-json').length, 1, 'état persistant dupliqué');
    assert.equal(w.document.getElementById('rb-ambigus-section').style.display, 'none', 'masquée tant que rien n’est ambigu');
    assert.equal(w.document.getElementById('rb-manquantes-section').style.display, 'none', 'masquée tant que rien ne manque');
    d.window.close();
});

test('IMPORT + RAPPROCHEMENT — une ligne sans ambiguïté apparaît comme paire GL/relevé dans le tableau résultat', async () => {
    const d = await domPret();
    const w = d.window;
    w.grandLivreBilanData = [
        { compte:'521100', intitule:'BANQUE', date:'2025-11-06', ref:'FAC1', libelle:'Vir client SCI', debit:250000, credit:0 },
    ];
    const cellules = [
        ['Date', 'Libellé', 'Référence', 'Débit', 'Crédit'],
        ['05/11/2025', 'VIR RECU SCI', 'FAC1', '', '250000'],
    ];
    w.rbTraiterLignesImportees(cellules, 'test.csv');

    const etat = etatDe(w);
    assert.equal(etat.lignes.length, 1);
    assert.equal(etat.lignes[0].statut, 'auto', 'correspondance mutuellement unique => statut auto');
    assert.equal(etat.lignes[0].matchClef, w.rbClefLigne(w.grandLivreBilanData[0]));

    const corps = w.document.getElementById('rb-resultat-corps');
    assert.equal(corps.querySelectorAll('tr').length, 1, 'une seule ligne dans le résultat');
    assert.ok(corps.textContent.includes('Vir client SCI'), 'libellé GL absent de la ligne');
    assert.ok(corps.textContent.includes('VIR RECU SCI'), 'libellé relevé absent de la ligne');
    assert.equal(w.document.getElementById('rb-res-tot-ecart').textContent.replace(/\s| /g, ''), '0', 'écart total nul attendu');
    d.window.close();
});

test('RAPPROCHEMENT — deux candidats au même montant : rien rapproché seul, arbitrage manuel puis paire dans le résultat', async () => {
    const d = await domPret();
    const w = d.window;
    w.grandLivreBilanData = [
        { compte:'521100', intitule:'BANQUE', date:'2025-11-04', ref:'', libelle:'Paiement A', debit:100000, credit:0 },
        { compte:'521100', intitule:'BANQUE', date:'2025-11-06', ref:'', libelle:'Paiement B', debit:100000, credit:0 },
    ];
    const cellules = [
        ['Date', 'Libellé', 'Montant'],
        ['05/11/2025', 'ENCAISSEMENT X', '100000'],
    ];
    w.rbTraiterLignesImportees(cellules, 'test.csv');

    assert.equal(etatDe(w).lignes[0].statut, undefined, 'aucun statut posé seul en cas d’ambiguïté');
    const section = w.document.getElementById('rb-ambigus-section');
    assert.notEqual(section.style.display, 'none', 'la section ambigus doit être visible');
    const select = w.document.getElementById('rb-ambigus-corps').querySelector('select');
    assert.ok(select, 'sélecteur de résolution manuelle absent');
    assert.equal(select.querySelectorAll('option').length, 4, '2 candidats + "Choisir" + "Aucune"');

    const premiere = Array.from(select.querySelectorAll('option')).find(o => o.value && o.value !== 'aucune');
    select.value = premiere.value;
    w.document.getElementById('rb-ambigus-corps').querySelector('button').click();

    assert.equal(w.document.getElementById('rb-ambigus-section').style.display, 'none', 'plus de cas ambigu après résolution');
    const etat = etatDe(w);
    assert.equal(etat.lignes[0].statut, 'manuel');
    assert.equal(etat.lignes[0].matchClef, premiere.value);
    const corps = w.document.getElementById('rb-resultat-corps');
    assert.ok(corps.textContent.includes('ENCAISSEMENT X'), 'la ligne résolue doit apparaître dans le résultat');
    d.window.close();
});

test('SANS CORRESPONDANCE — proposition d’écriture manquante, reportée au Grand Livre Bilan en partie double', async () => {
    const d = await domPret();
    const w = d.window;
    w.grandLivreBilanData = [];
    const cellules = [
        ['Date', 'Libellé', 'Débit', 'Crédit'],
        ['10/11/2025', 'AGIOS TRIMESTRE', '15000', ''],
    ];
    w.rbTraiterLignesImportees(cellules, 'test.csv');

    const section = w.document.getElementById('rb-manquantes-section');
    assert.notEqual(section.style.display, 'none', 'la section écritures manquantes doit être visible');
    const ligne = w.document.getElementById('rb-manquantes-corps').querySelector('tr[data-rb-manq-id]');
    assert.ok(ligne, 'ligne de proposition absente');
    assert.equal(ligne.querySelector('.rb-manq-compte').value, '674', 'agios détectés => compte 674 par défaut');

    const nbAvant = w.grandLivreBilanData.length;
    w.rbReporterEcrituresManquantes();
    assert.equal(w.grandLivreBilanData.length, nbAvant + 2, 'partie double : deux lignes GL créées (contrepartie + banque)');

    const comptes = w.grandLivreBilanData.map(r => String(r.compte));
    assert.ok(comptes.includes('52'), 'compte banque (52) manquant — ' + comptes.join(','));
    assert.ok(comptes.includes('674'), 'compte agios (674) manquant — ' + comptes.join(','));

    assert.equal(etatDe(w).lignes[0].statut, 'reporte', 'la ligne reportée doit être marquée statut=reporte');
    assert.equal(w.document.getElementById('rb-manquantes-section').style.display, 'none', 'plus rien à proposer après report');
    d.window.close();
});

test('COLLAGE — un relevé Banque Atlantique collé (lignes de titre + colonne Montant unique) est importé', async () => {
    const d = await domPret();
    const w = d.window;
    w.document.getElementById('rb-date-du').value = '2024-01-01';
    w.document.getElementById('rb-date-au').value = '2024-12-31';
    w.document.getElementById('rb-colle-texte').value = [
        'BANQUE ATLANTIQUE - Relevé de Compte',
        'Client : PRO-TRANS AFRICA - 14388087',
        'Compte n° : 143880870012 XOF',
        'Période : du 01/01/2024 au 17/12/2024',
        "Date de l'opération\tDate Valeur\tRéférence\tLibellé\tMontant\tSolde",
        '17/12/2024\t17/12/2024\tFT2435248K5Q\tPaiement Cheque\t(2 572 690)\t5 651 603',
        '11/12/2024\t11/12/2024\tFT24346R3KLJ\tRemise Cheque\t1 640 554\t9 387 376',
    ].join('\n');
    w.rbImporterColle();

    const etat = etatDe(w);
    assert.equal(etat.lignes.length, 2, 'les 4 lignes de titre sont ignorées, 2 lignes de données retenues');
    assert.equal(etat.lignes[0].debit, 2572690, 'montant négatif entre parenthèses => décaissement');
    assert.equal(etat.lignes[1].credit, 1640554, 'montant positif => encaissement');
    assert.ok(!/Colonnes non reconnues/.test(w.document.getElementById('rb-import-diagnostic').textContent));
    d.window.close();
});

test('SÉCURITÉ — une ligne du fichier illisible n’est jamais silencieusement perdue', async () => {
    const d = await domPret();
    const w = d.window;
    const cellules = [
        ['Date', 'Libellé', 'Montant'],
        ['DATE INVALIDE', 'LIGNE CASSÉE', '5000'],
    ];
    w.rbTraiterLignesImportees(cellules, 'test.csv');
    const diag = w.document.getElementById('rb-import-diagnostic').innerHTML;
    assert.ok(diag.indexOf('LIGNE CASSÉE') !== -1, 'la ligne rejetée doit être listée en clair dans le diagnostic');
    d.window.close();
});

test('PÉRIODE — une opération hors des bornes Du / Au est exclue du rapprochement', async () => {
    const d = await domPret();
    const w = d.window;
    w.document.getElementById('rb-date-du').value = '2025-11-01';
    w.document.getElementById('rb-date-au').value = '2025-11-30';
    w.grandLivreBilanData = [
        { compte:'521100', intitule:'BANQUE', date:'2025-12-15', ref:'', libelle:'Hors période', debit:80000, credit:0 },
    ];
    const cellules = [
        ['Date', 'Libellé', 'Montant'],
        ['15/12/2025', 'VIR DECEMBRE', '80000'],
    ];
    w.rbTraiterLignesImportees(cellules, 'test.csv');

    assert.equal(etatDe(w).lignes.length, 0, 'la ligne de relevé de décembre est hors période, donc non retenue');
    const corps = w.document.getElementById('rb-resultat-corps');
    assert.ok(!corps.textContent.includes('Hors période'), 'l’écriture GL de décembre ne doit pas apparaître');
    d.window.close();
});
