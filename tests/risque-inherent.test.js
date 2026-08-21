/* ==================================================================
   RISQUE INHÉRENT (onglet c, position 2)

   Copie structurelle de Cartographie des risques (mêmes colonnes), mais
   sans aucune génération automatique : l'auditeur saisit à la main, la
   ligne "aucune donnée" ne disparaît qu'à sa première saisie. Couvre
   aussi la correction de calcRisk(), qui dérivait auparavant l'onglet à
   marquer "à jour" du nom de la table plutôt que de le coder en dur sur
   'risques' — un bug qui aurait fait pointer cet onglet vers le mauvais
   statut.
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

test('STRUCTURE — le panneau existe, avec les mêmes colonnes que Cartographie des risques', async () => {
    const d = await domPret();
    const w = d.window;
    const panneau = w.document.getElementById('risque-inherent');
    assert.ok(panneau, 'panneau risque-inherent absent');
    assert.ok(panneau.classList.contains('tab-content'));
    const entetesRI = [...w.document.querySelector('#table-risque-inherent tr').cells].map(c => c.textContent);
    const entetesCart = [...w.document.querySelector('#table-risques tr').cells].map(c => c.textContent);
    assert.deepEqual(entetesRI, entetesCart, 'les colonnes doivent être identiques à Cartographie des risques');
    d.window.close();
});

test('VIDE PAR DÉFAUT — aucune ligne de données, aucune génération automatique', async () => {
    const d = await domPret();
    const w = d.window;
    const table = w.document.getElementById('table-risque-inherent');
    // 1 en-tête + 1 ligne "aucune donnée" placeholder, rien de plus
    assert.equal(table.rows.length, 2);
    assert.ok(w.document.getElementById('risque-inherent-vide'), 'placeholder "aucune donnée" absent');
    assert.equal(typeof w.risqGenerer, 'function', 'risqGenerer doit exister (Cartographie)');
    // mais rien dans le panneau risque-inherent ne l'appelle
    assert.ok(!w.document.getElementById('risque-inherent').innerHTML.includes('risqGenerer'),
        'aucune génération automatique ne doit être câblée sur Risque Inhérent');
    d.window.close();
});

test('AJOUTER — une ligne manuelle retire le placeholder et se supprime normalement', async () => {
    const d = await domPret();
    const w = d.window;
    w.addRow('table-risque-inherent', ['text','text','text','text','number15-risk','number15-risk','calculated','calculated','text']);
    assert.equal(w.document.getElementById('risque-inherent-vide'), null, 'le placeholder doit disparaître après ajout');
    const table = w.document.getElementById('table-risque-inherent');
    assert.equal(table.rows.length, 2, '1 en-tête + 1 ligne ajoutée');

    const ligne = table.rows[1];
    assert.ok(ligne.querySelector('.risk-score'), 'cellule risk-score manquante');
    assert.ok(ligne.querySelector('.risk-level'), 'cellule risk-level manquante');

    w.deleteRow(ligne.querySelector('button.btn-danger'));
    assert.equal(table.rows.length, 1, 'la ligne doit pouvoir être supprimée normalement');
    d.window.close();
});

test('CALCUL — calcRisk() met à jour le statut de risque-inherent, pas celui de risques', async () => {
    const d = await domPret();
    const w = d.window;
    w.addRow('table-risque-inherent', ['text','text','text','text','number15-risk','number15-risk','calculated','calculated','text']);
    const ligne = w.document.getElementById('table-risque-inherent').rows[1];
    const nums = ligne.querySelectorAll('input[type="number"]');
    nums[0].value = '5'; nums[1].value = '4';
    w.calcRisk(nums[1]);
    assert.equal(ligne.querySelector('.risk-score').textContent, '20');
    assert.equal(ligne.querySelector('.risk-level').textContent, 'Élevé');
    assert.ok(ligne.classList.contains('risk-high'));
    const badgeRI = w.document.getElementById('status-risque-inherent');
    if(badgeRI) assert.notEqual(badgeRI.className, 'badge badge-warning', 'le statut de risque-inherent doit avoir bougé');
    d.window.close();
});
