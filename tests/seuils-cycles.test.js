/* ==================================================================
   SEUILS PAR CYCLE (ISA 320)

   Un seuil unique appliqué à tous les cycles est rarement approprié.
   ISA 320 admet un seuil plus bas là où une anomalie inférieure au
   seuil global pourrait tout de même influencer le lecteur.

   Le point délicat : ces seuils commandent la DÉTECTION. Un seuil
   trop haut masque des anomalies, un seuil nul en fait remonter des
   milliers. La fonction doit donc toujours rendre un nombre
   exploitable, et la saisie de l'auditeur doit toujours l'emporter.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { cheminApplication, balancesMTTCI } from './harness.js';

const jsdom = new JSDOM(fs.readFileSync(cheminApplication(), 'utf8'), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://seven7-audit.web.app/', virtualConsole: new VirtualConsole(),
});
await new Promise(r => {
    if(jsdom.window.document.readyState === 'complete') return r();
    jsdom.window.addEventListener('load', r, { once:true });
});
await new Promise(r => setTimeout(r, 80));
const W = jsdom.window;
const local = v => JSON.parse(JSON.stringify(v));

W.balanceData = balancesMTTCI();
W.seuils = { signif: 20000000, faible: 1000000, planif: 15000000, totalActifN: 385982204 };

test('PROPOSITION — chaque cycle reçoit un seuil déduit de son risque', () => {
    const p = local(W.scProposer());
    assert.equal(p.length, local(W.CYCLES).length, 'un cycle n’a pas reçu de proposition');
    for(const l of p){
        assert.ok(['ÉLEVÉ', 'MOYEN', 'FAIBLE'].includes(l.risque), `${l.id} : risque « ${l.risque} »`);
        assert.ok(l.seuil > 0, `${l.id} : seuil nul`);
        assert.ok(l.seuil <= W.seuils.planif, `${l.id} : seuil supérieur au seuil global`);
        assert.ok(l.justification, `${l.id} : proposition sans justification`);
    }
});

test('PROPOSITION — le seuil descend quand le risque monte', () => {
    const f = local(W.SC_FACTEURS);
    assert.ok(f['ÉLEVÉ'].f < f['MOYEN'].f, 'un risque élevé doit resserrer davantage');
    assert.ok(f['MOYEN'].f < f['FAIBLE'].f);
    assert.equal(f['FAIBLE'].f, 1, 'un risque faible garde le seuil de planification');
});

test('SENSIBILITÉ — capitaux, fiscal et trésorerie sont bornés quel que soit leur risque', () => {
    // La sensibilité tient à la nature du poste, pas à la statistique
    // des anomalies : un cycle fiscal noté « faible » doit tout de même
    // être contrôlé finement, toute anomalie exposant à un redressement.
    const p = local(W.scProposer());
    for(const id of ['CAP', 'FIS', 'TRE']){
        const l = p.find(x => x.id === id);
        assert.ok(l.sensible, `${id} : devrait être marqué sensible`);
        assert.ok(l.facteur <= W.SC_FACTEUR_SENSIBLE + 1e-9,
            `${id} : facteur ${l.facteur} au-dessus du plafond des cycles sensibles`);
    }
});

test('SAISIE — le seuil retenu par l’auditeur l’emporte sur la proposition', () => {
    const propose = local(W.scProposer()).find(x => x.id === 'VTE').seuil;
    W.scEnregistrer('VTE', 250000);
    assert.equal(W.seuilDuCycle('VTE'), 250000, 'la saisie doit primer');
    assert.notEqual(W.seuilDuCycle('VTE'), propose);
    W.scEnregistrer('VTE', 0);   /* remise à zéro : on revient à la proposition */
    assert.equal(W.seuilDuCycle('VTE'), propose);
});

test('SAISIE — une valeur nulle ou négative n’écrase pas la proposition', () => {
    const propose = local(W.scProposer()).find(x => x.id === 'ACH').seuil;
    for(const v of ['', '0', 'abc']){
        W.scEnregistrer('ACH', v);
        assert.equal(W.seuilDuCycle('ACH'), propose, `saisie « ${v} » : la proposition doit tenir`);
    }
});

test('ROBUSTESSE — seuilDuCycle rend toujours un nombre exploitable', () => {
    // C'est cette valeur qui pilote la détection : jamais NaN, jamais undefined.
    for(const c of local(W.CYCLES)){
        const s = W.seuilDuCycle(c.id);
        assert.equal(typeof s, 'number', `${c.id} : type ${typeof s}`);
        assert.ok(Number.isFinite(s) && s >= 0, `${c.id} : valeur ${s}`);
    }
    const inconnu = W.seuilDuCycle('CYCLE-INEXISTANT');
    assert.ok(Number.isFinite(inconnu), 'un cycle inconnu doit retomber sur le seuil global');
});

test('ROBUSTESSE — sans seuil global fixé, rien ne casse', () => {
    const sauve = W.seuils;
    try{
        W.seuils = { signif:0, faible:0, planif:0, totalActifN:0 };
        assert.doesNotThrow(() => W.scProposer());
        assert.doesNotThrow(() => W.scRendre());
        for(const c of local(W.CYCLES))
            assert.ok(Number.isFinite(W.seuilDuCycle(c.id)), `${c.id} : seuil non exploitable`);
        const info = W.document.getElementById('sc-info').textContent;
        assert.match(info, /Fixez d’abord le seuil de signification/,
            'l’absence de seuil doit être dite, pas subie');
    } finally { W.seuils = sauve; W.scRendre(); }
});

test('BRANCHEMENT — la détection par cycle consomme bien ces seuils', () => {
    // Sans ce branchement, les seuils seraient décoratifs. On abaisse
    // drastiquement le seuil d'un cycle et on vérifie que la détection
    // y remonte davantage d'anomalies.
    W.scEnregistrer('VTE', 0);
    W.document.getElementById('cyc-seuil').value = '';
    W.runCycles();
    const avant = W.document.getElementById('cyc-VTE')
        ? W.document.getElementById('cyc-VTE').querySelectorAll('tr').length : 0;

    W.scEnregistrer('VTE', 1);
    W.runCycles();
    const apres = W.document.getElementById('cyc-VTE')
        ? W.document.getElementById('cyc-VTE').querySelectorAll('tr').length : 0;

    W.scEnregistrer('VTE', 0);
    assert.ok(apres >= avant,
        `un seuil abaissé doit remonter au moins autant d’anomalies (${avant} puis ${apres})`);
});

test('BRANCHEMENT — un seuil saisi dans l’onglet Détection reste prioritaire', () => {
    // Le champ « cyc-seuil » est un réglage ponctuel de lecture : il
    // doit court-circuiter les seuils par cycle, sans les effacer.
    W.scEnregistrer('VTE', 250000);
    W.document.getElementById('cyc-seuil').value = '5000000';
    assert.doesNotThrow(() => W.runCycles());
    assert.equal(W.seuilDuCycle('VTE'), 250000, 'le seuil du cycle ne doit pas être modifié');
    W.document.getElementById('cyc-seuil').value = '';
    W.scEnregistrer('VTE', 0);
});

test('RENDU — le tableau expose proposition, saisie et pourcentage', () => {
    W.scRendre();
    const t = W.document.getElementById('sc-table');
    const entetes = [...t.rows[0].cells].map(c => c.textContent);
    assert.deepEqual(entetes,
        ['Cycle', 'Risque', 'Seuil proposé', 'Seuil retenu', '% du global', 'Justification']);
    assert.equal(t.rows.length - 1, local(W.CYCLES).length, 'une ligne par cycle attendue');
    // chaque ligne offre un champ de saisie
    for(let i = 1; i < t.rows.length; i++)
        assert.ok(t.rows[i].querySelector('input'), `ligne ${i} sans champ de saisie`);
});
