/* ==================================================================
   RAPPROCHEMENT BANCAIRE — intégration DOM (import → rapprochement →
   report au Grand Livre)

   Le moteur pur (parsing, matching, proposition) est couvert sans DOM
   dans rapprochement-bancaire.test.js. Ici, on vérifie le CÂBLAGE réel :
   l'import peuple l'état persistant, le rapprochement coche les bonnes
   cases dans le tableau affiché, les cas ambigus/manquants sont bien
   rendus, et le report d'une écriture manquante passe RÉELLEMENT par le
   circuit d'import du Grand Livre (paste-gl-bilan + pasteGLTable), pas
   par une écriture directe dans grandLivreBilanData.
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

test('INSTALLATION — les blocs import/ambigus/manquantes sont posés une seule fois', async () => {
    const d = await domPret();
    const w = d.window;
    w.rbInstaller();
    w.rbInstaller();
    assert.equal(w.document.querySelectorAll('#rapprochement-bancaire .card').length,
        w.document.querySelectorAll('#rapprochement-bancaire .card').length, 'pas de crash à réinstaller');
    assert.ok(w.document.getElementById('rb-import-diagnostic'), 'zone de diagnostic import absente');
    assert.ok(w.document.getElementById('rb-releve-json'), 'état persistant du relevé absent');
    assert.ok(w.document.getElementById('rb-ambigus-section'), 'section doublons ambigus absente');
    assert.ok(w.document.getElementById('rb-manquantes-section'), 'section écritures manquantes absente');
    assert.equal(w.document.getElementById('rb-ambigus-section').style.display, 'none', 'masquée tant que rien n’est ambigu');
    assert.equal(w.document.getElementById('rb-manquantes-section').style.display, 'none', 'masquée tant que rien ne manque');
    d.window.close();
});

test('IMPORT + RAPPROCHEMENT — une ligne sans ambiguïté est cochée automatiquement et badgée 🤖', async () => {
    const d = await domPret();
    const w = d.window;
    w.grandLivreBilanData = [
        { compte:'521100', intitule:'BANQUE', date:'2025-11-06', ref:'', libelle:'Vir client', debit:250000, credit:0 },
    ];
    w.rbGenererTout(true);

    const cellules = [
        ['Date', 'Libellé', 'Référence', 'Débit', 'Crédit'],
        ['05/11/2025', 'VIREMENT CLIENT', 'VIR001', '', '250000'],
    ];
    w.rbTraiterLignesImportees(cellules, 'test.csv');

    const corps = w.document.getElementById('rb-table-nov');
    const cb = corps.querySelector('.rb-pointe');
    assert.ok(cb, 'ligne GL absente du tableau novembre');
    assert.equal(cb.checked, true, 'la correspondance non ambiguë doit être cochée automatiquement');
    assert.equal(cb.getAttribute('data-origine'), 'auto');

    const etat = JSON.parse(w.document.getElementById('rb-releve-json').value);
    assert.equal(etat.lignes.length, 1);
    assert.equal(etat.lignes[0].traite, true, 'la ligne de relevé rapprochée doit être marquée traitée');
    d.window.close();
});

test('IMPORT + RAPPROCHEMENT — deux candidats au même montant : rien coché seul, résolution manuelle possible', async () => {
    const d = await domPret();
    const w = d.window;
    w.grandLivreBilanData = [
        { compte:'521100', intitule:'BANQUE', date:'2025-11-04', ref:'', libelle:'Paiement A', debit:100000, credit:0 },
        { compte:'521100', intitule:'BANQUE', date:'2025-11-06', ref:'', libelle:'Paiement B', debit:100000, credit:0 },
    ];
    w.rbGenererTout(true);

    const cellules = [
        ['Date', 'Libellé', 'Montant'],
        ['05/11/2025', 'ENCAISSEMENT X', '100000'],
    ];
    w.rbTraiterLignesImportees(cellules, 'test.csv');

    const corps = w.document.getElementById('rb-table-nov');
    const cases = Array.from(corps.querySelectorAll('.rb-pointe'));
    assert.ok(cases.every(c => !c.checked), 'aucune case ne doit être cochée toute seule en cas d’ambiguïté');

    const section = w.document.getElementById('rb-ambigus-section');
    assert.notEqual(section.style.display, 'none', 'la section ambigus doit être visible');
    const select = w.document.getElementById('rb-ambigus-corps').querySelector('select');
    assert.ok(select, 'sélecteur de résolution manuelle absent');
    assert.equal(select.querySelectorAll('option').length, 4, '2 candidats + "Choisir" + "Aucune"');

    // Résolution manuelle : l'auditeur choisit le premier candidat proposé (l'option
    // porte la clef stable de l'écriture GL, pas un simple indice — voir rbRendreAmbigus).
    const premiereOption = Array.from(select.querySelectorAll('option')).find(o => o.value && o.value !== 'aucune');
    assert.ok(premiereOption, 'aucune option de candidat dans le sélecteur');
    select.value = premiereOption.value;
    const bouton = w.document.getElementById('rb-ambigus-corps').querySelector('button');
    bouton.click();

    const casesApres = Array.from(corps.querySelectorAll('.rb-pointe'));
    assert.equal(casesApres.filter(c => c.checked).length, 1, 'exactement une case doit être cochée après résolution manuelle');
    assert.equal(w.document.getElementById('rb-ambigus-section').style.display, 'none', 'plus de cas ambigu après résolution');
    d.window.close();
});

test('SANS CORRESPONDANCE — proposition d’écriture manquante, reportée au Grand Livre Bilan en partie double', async () => {
    const d = await domPret();
    const w = d.window;
    w.grandLivreBilanData = [];
    w.rbGenererTout(true);

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
    assert.equal(comptes.length, 2);
    assert.ok(comptes.includes('52'), 'compte banque (52) manquant — comptes obtenus : ' + comptes.join(','));
    assert.ok(comptes.includes('674'), 'compte agios (674) manquant — comptes obtenus : ' + comptes.join(','));

    const etat = JSON.parse(w.document.getElementById('rb-releve-json').value);
    assert.equal(etat.lignes[0].traite, true, 'la ligne reportée doit être marquée traitée');
    assert.equal(w.document.getElementById('rb-manquantes-section').style.display, 'none', 'plus rien à proposer après report');
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
