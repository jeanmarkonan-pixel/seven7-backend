/* ==================================================================
   GRAND LIVRE — import par lots (collage)

   Régression réelle (26/08) : importGLLinesChunked (04-grand-livre.js)
   enchaînait ses lots via requestAnimationFrame(() => setTimeout(...)).
   rAF se met en pause dès que l'onglet n'est plus au premier plan —
   l'import restait alors bloqué indéfiniment après le premier lot,
   écran figé (« la page ne répond plus »), constaté en production sur
   un collage de plusieurs milliers de lignes. Reproduit et confirmé
   identique sur la version déployée avant le correctif (51d2f0c) :
   bug préexistant, pas causé par une session de travail donnée.
   Corrigé en enchaînant les lots par setTimeout seul, qui ne dépend
   pas de la visibilité de l'onglet. Ce test vérifie qu'un collage de
   plusieurs lots va bien jusqu'au bout, sans dépendre d'un rendu visuel.
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
async function attendreJusqua(predicat, timeoutMs){
    const debut = Date.now();
    while(!predicat()){
        if(Date.now() - debut > timeoutMs) return false;
        await new Promise(r => setTimeout(r, 20));
    }
    return true;
}

test('IMPORT PAR LOTS — un collage de plusieurs milliers de lignes va jusqu’au bout (pas de blocage sur un seul lot)', async () => {
    const d = await domPret();
    const w = d.window;
    const CHUNK_SIZE = 300;
    const total = CHUNK_SIZE * 3 + 50; // force au moins 4 lots

    const lignes = [];
    for(let i = 0; i < total; i++){
        const compte = '5211' + String(1000 + (i % 500)).padStart(4, '0');
        lignes.push([compte, 'BANQUE', '2025-11-05', 'REF' + i, 'Ecriture ' + i,
            i % 2 === 0 ? String(1000 + i) : '', i % 2 === 1 ? String(1000 + i) : ''].join('\t'));
    }
    w.document.getElementById('paste-gl-bilan').value = lignes.join('\n');
    w.pasteGLTable('bilan');

    const termine = await attendreJusqua(
        () => w.document.getElementById('collab-status').textContent.indexOf('importé') !== -1,
        15000
    );
    assert.ok(termine, 'import non terminé après 15s — ' + w.document.getElementById('collab-status').textContent);
    assert.equal(w.grandLivreBilanData.length, total);
    d.window.close();
});

test('IMPORT PAR LOTS — suspend l’auto-sauvegarde pendant l’import puis déclenche une sauvegarde immédiate à la fin', async () => {
    // Bug réel constaté en production (26/08) : le clic qui lance l'import est lui-même un
    // clic DANS l'onglet, qui programme une sauvegarde automatique ~1,3s après — bien avant
    // qu'un gros import ne soit terminé, capturant un tableau à moitié rempli. Vérifie que
    // l'import suspend bien scheduleSave() pour la durée du traitement par lots, et déclenche
    // lui-même une sauvegarde COMPLÈTE une fois tous les lots posés.
    const d = await domPret();
    const w = d.window;
    assert.equal(typeof w.SEVEN7_PAUSE_AUTOSAVE, 'function', 'window.SEVEN7_PAUSE_AUTOSAVE doit être exposée');
    assert.equal(typeof w.SEVEN7_SCHEDULE_SAVE, 'function', 'window.SEVEN7_SCHEDULE_SAVE doit être exposée');

    const appels = [];
    w.SEVEN7_PAUSE_AUTOSAVE = (tabId, pause) => appels.push(['pause', tabId, pause]);
    w.SEVEN7_SCHEDULE_SAVE = (tabId, immediate) => appels.push(['save', tabId, immediate]);

    const CHUNK_SIZE = 300;
    const total = CHUNK_SIZE * 2 + 50;
    const lignes = [];
    for(let i = 0; i < total; i++){
        lignes.push(['5211' + String(1000 + i).padStart(4, '0'), 'BANQUE', '2025-11-05', 'REF' + i, 'E' + i,
            '', String(1000 + i)].join('\t'));
    }
    w.importGLLinesChunked('bilan', lignes);

    // La pause doit être posée SYNCHRONEMENT, avant même le premier lot.
    assert.deepEqual(appels[0], ['pause', 'gl-bilan', true]);

    const termine = await attendreJusqua(() => appels.some(a => a[0] === 'save'), 15000);
    assert.ok(termine, 'sauvegarde finale jamais déclenchée après ' + JSON.stringify(appels));

    const leveePause = appels.find(a => a[0] === 'pause' && a[2] === false);
    const sauvegarde = appels.find(a => a[0] === 'save');
    assert.ok(leveePause, 'la pause doit être levée à la fin de l’import');
    assert.equal(sauvegarde[1], 'gl-bilan');
    assert.equal(sauvegarde[2], true, 'la sauvegarde finale doit être immédiate, pas debounced');
    // La levée de pause doit précéder (ou coïncider avec) la demande de sauvegarde : sinon
    // scheduleSave() la trouverait encore active et l’ignorerait silencieusement.
    assert.ok(appels.indexOf(leveePause) < appels.indexOf(sauvegarde),
        'la pause doit être levée AVANT de demander la sauvegarde finale');
    d.window.close();
});
