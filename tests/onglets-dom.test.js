/* ==================================================================
   LES ONGLETS AJOUTÉS, DANS UN VRAI DOM

   Douze onglets ont été ajoutés par injection au chargement : onze
   sections de diligences normatives et les faits marquants de
   l'exercice. S'y ajoutent les blocs greffés dans des onglets
   existants — assertions du programme, détail de la revue analytique,
   échantillonnage, rapports.

   Tout cela a été vérifié À L'ŒIL, une fois, dans le navigateur.
   Aucun test ne garantissait qu'un onglet s'installe encore après une
   modification ultérieure : une injection qui échoue est SILENCIEUSE —
   le panneau n'apparaît pas, la navigation ne le propose pas, et rien
   dans la console ne le signale.

   Ces tests chargent le livrable dans jsdom et vérifient que chaque
   onglet existe, qu'il est atteignable, qu'il porte ses champs, et
   qu'il est déclaré pour la sauvegarde.
   ================================================================== */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { cheminApplication } from './harness.js';

const html = fs.readFileSync(cheminApplication(), 'utf8');

const jsdom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://seven7-audit.web.app/', virtualConsole: new VirtualConsole(),
});
await new Promise(r => {
    if(jsdom.window.document.readyState === 'complete') return r();
    jsdom.window.addEventListener('load', r, { once:true });
});
await new Promise(r => setTimeout(r, 80));   /* laisse passer les injections */
const W = jsdom.window;
const D = W.document;
const local = v => JSON.parse(JSON.stringify(v));

const DILIGENCES = local(W.DILIGENCES);
const AJOUTES = DILIGENCES.map(d => d.id).concat(['faits-exercice']);

// Sans ce close(), un minuteur réel enregistré par la fenêtre (ex : déconnexion
// automatique sur inactivité, 46-session-inactivite.js) retient le process Node
// ouvert jusqu'à son échéance — jsdom n'expose pas d'identifiant unref()able,
// seul close() annule ses minuteurs internes. Les autres fichiers de tests DOM
// recréent une fenêtre par test et la ferment aussitôt ; celui-ci en partage une
// seule pour tout le fichier, d'où ce close() unique, en tout dernier.
after(() => { jsdom.window.close(); });

/* ---------------- Existence et atteignabilité ---------------- */

test('INJECTION — les onze onglets ajoutés existent dans le document', () => {
    const manquants = AJOUTES.filter(id => !D.getElementById(id));
    assert.deepEqual(manquants, [], 'onglets non injectés');
    assert.equal(AJOUTES.length, 11);
});

test('INJECTION — chaque onglet ajouté est un panneau d’onglet à part entière', () => {
    for(const id of AJOUTES){
        const p = D.getElementById(id);
        assert.ok(p.classList.contains('tab-content'), `${id} : pas un panneau d’onglet`);
        assert.ok(p.querySelector('[data-tab]'), `${id} : sans carte data-tab, il ne sera pas sauvegardé`);
    }
});

test('NAVIGATION — chaque onglet ajouté a son bouton, dans la bonne phase', () => {
    for(const d of DILIGENCES){
        const menu = D.getElementById('phase-dropdown-' + d.phase);
        assert.ok(menu, `phase ${d.phase} introuvable`);
        const b = menu.querySelector('[data-dili="' + d.id + '"]');
        assert.ok(b, `${d.id} : aucun bouton dans la phase ${d.phase}`);
        assert.match(b.getAttribute('onclick'), new RegExp("showTab\\('" + d.id + "'\\)"));
    }
});

test('NAVIGATION — showTab est protégé par le contrôle d’accès', () => {
    // showTab est remplacé par une version qui refuse les onglets non
    // accordés au collaborateur. Hors session, seuls l'identification et la
    // messagerie passent : c'est la propriété de sécurité à préserver.
    //
    // CONSÉQUENCE EN PRODUCTION : les onglets ajoutés ne sont pas accordés
    // d'office aux collaborateurs existants. L'administrateur doit les
    // cocher dans « Gérer l'équipe » — le bouton « Tout cocher » par phase
    // le fait en un clic. Sans cela, le collaborateur reçoit une alerte
    // « Accès non autorisé » qui ressemble à une panne.
    let refus = 0;
    W.alert = function(){ refus++; };
    W.showTab('continuite');
    assert.equal(refus, 1, 'un onglet non accordé doit être refusé, pas ouvert');
    assert.ok(!D.getElementById('continuite').classList.contains('active'));
});

test('NAVIGATION — chaque panneau ajouté peut devenir le seul actif', () => {
    // Indépendamment du contrôle d'accès : la structure du document
    // permet-elle d'afficher ce panneau et lui seul ?
    for(const id of AJOUTES){
        D.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
        D.getElementById(id).classList.add('active');
        const actifs = [...D.querySelectorAll('.tab-content.active')].map(e => e.id);
        assert.deepEqual(actifs, [id], `${id} : l’affichage exclusif ne fonctionne pas`);
    }
    D.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
    D.getElementById('identification').classList.add('active');
});

test('SAUVEGARDE — chaque onglet ajouté est déclaré dans TABS', () => {
    // Un onglet absent de TABS ne serait jamais sauvegardé : le travail
    // de l'auditeur serait perdu à la fermeture, sans aucun avertissement.
    const ids = local(W.TABS).map(t => t.id);
    const oublies = AJOUTES.filter(id => !ids.includes(id));
    assert.deepEqual(oublies, [], 'onglets non sauvegardés');
});

test('SAUVEGARDE — aucun identifiant d’onglet en double', () => {
    const ids = local(W.TABS).map(t => t.id);
    const doubles = ids.filter((v, i) => ids.indexOf(v) !== i);
    assert.deepEqual([...new Set(doubles)], []);
});

/* ---------------- Contenu réel des diligences ---------------- */

test('DILIGENCES — chaque section porte sa base normative et son objectif', () => {
    for(const d of DILIGENCES){
        const t = D.getElementById(d.id).textContent;
        assert.ok(t.includes(d.norme), `${d.id} : base normative absente de l’écran`);
        assert.ok(t.includes(d.objectif.slice(0, 50)), `${d.id} : objectif absent de l’écran`);
    }
});

test('DILIGENCES — tous les points de contrôle sont rendus avec leur champ', () => {
    for(const d of DILIGENCES){
        const p = D.getElementById(d.id);
        // Certains panneaux (ecritures) portent une seconde table greffée par un
        // autre module (centralisation des anomalies) : on scope au premier
        // tableau, toujours celui de la diligence elle-même (rendu avant toute
        // greffe ultérieure).
        const table = p.querySelector('table');
        const lignes = table.querySelectorAll('tr');
        // en-tête + un point par ligne
        assert.equal(lignes.length, d.points.length + 1,
            `${d.id} : ${lignes.length - 1} lignes rendues pour ${d.points.length} points`);
        const champs = table.querySelectorAll('input, select, textarea');
        assert.ok(champs.length >= d.points.length,
            `${d.id} : des points sont rendus sans champ de saisie`);
    }
});

test('DILIGENCES — les questions à réponse fermée offrent les quatre états', () => {
    for(const d of DILIGENCES){
        const attendus = d.points.filter(p => p.t === 'oui').length;
        if(!attendus) continue;
        const selects = D.getElementById(d.id).querySelectorAll('table select');
        assert.equal(selects.length, attendus, `${d.id} : nombre de listes déroulantes inattendu`);
        const opts = [...selects[0].options].map(o => o.textContent).filter(Boolean);
        assert.deepEqual(opts, ['Oui', 'Non', 'N/A', 'En cours'], `${d.id} : états proposés inattendus`);
    }
});

test('DILIGENCES — chaque section se termine par une conclusion à rédiger', () => {
    for(const d of DILIGENCES){
        const zones = D.getElementById(d.id).querySelectorAll('textarea');
        assert.ok(zones.length >= 1, `${d.id} : aucune zone de conclusion`);
    }
});

test('DILIGENCES — l’injection est idempotente', () => {
    // diliInstaller() est rappelé à chaque restauration de dossier : un
    // second passage ne doit pas dupliquer panneaux ni boutons.
    const avantPanneaux = D.querySelectorAll('.tab-content').length;
    const avantBoutons  = D.querySelectorAll('[data-dili]').length;
    W.diliInstaller();
    W.diliInstaller();
    assert.equal(D.querySelectorAll('.tab-content').length, avantPanneaux, 'panneaux dupliqués');
    assert.equal(D.querySelectorAll('[data-dili]').length, avantBoutons, 'boutons dupliqués');
});

/* ---------------- Blocs greffés dans des onglets existants ---------------- */

test('GREFFES — les blocs ajoutés aux onglets existants sont bien en place', () => {
    const attendus = [
        ['risq-secteur',       'risques',             'sélecteur de secteur'],
        ['table-risques',      'risques',             'tableau des risques'],
        ['revue-detail',       'revue',               'détail des grandes masses'],
        ['ec-population',      'controle-gl-sondage', 'échantillonnage statistique'],
        ['table-ec-erreurs',   'controle-gl-sondage', 'anomalies de l’échantillon'],
        ['rap-texte',          'redaction',           'rapport général'],
        ['conv-texte',         'redaction',           'rapport spécial'],
        ['table-conventions',  'redaction',           'saisie des conventions'],
        ['an-table',           'ecritures',           'centralisation des anomalies'],
    ];
    for(const [id, onglet, quoi] of attendus){
        const el = D.getElementById(id);
        assert.ok(el, `${quoi} : élément #${id} absent`);
        assert.ok(D.getElementById(onglet).contains(el),
            `${quoi} : #${id} n’est pas dans l’onglet ${onglet}`);
    }
});

test('GREFFES — la colonne des assertions est posée sur le programme de travail', () => {
    const t = D.getElementById('table-programme');
    assert.equal(t.getAttribute('data-assertions'), 'ok', 'colonne non installée');
    const entetes = [...t.rows[0].cells].map(c => c.textContent);
    assert.ok(entetes.includes('Assertions couvertes'), 'en-tête absent');
    // Les lignes à cellule fusionnée — bandeaux de cycle et « Documents
    // requis » — ne sont pas des procédures : elles n'ont pas de colonne
    // d'assertion, elles doivent en revanche s'élargir d'une colonne.
    const largeur = t.rows[0].cells.length;
    let procedures = 0, remplies = 0, fusionnees = 0;
    for(let i = 1; i < t.rows.length; i++){
        const tr = t.rows[i], c0 = tr.cells[0];
        if(c0 && c0.hasAttribute('colspan')){
            fusionnees++;
            assert.equal(parseInt(c0.getAttribute('colspan'), 10), largeur,
                `ligne ${i} : colspan non ajusté après l’ajout de la colonne — le tableau se désaligne`);
            continue;
        }
        procedures++;
        const c = tr.cells[2] ? tr.cells[2].querySelector('input') : null;
        assert.ok(c, `ligne ${i} : procédure sans cellule d’assertion`);
        if(c.value.trim()) remplies++;
    }
    assert.ok(procedures > 90, `${procedures} procédures trouvées`);
    assert.ok(fusionnees >= 24, `${fusionnees} lignes fusionnées — 12 cycles et 12 blocs de documents attendus`);
    assert.ok(remplies / procedures > 0.9,
        `seules ${remplies} procédures sur ${procedures} portent une assertion`);
});

test('GREFFES — l’injection des assertions ne se rejoue pas', () => {
    const avant = D.getElementById('table-programme').rows[0].cells.length;
    W.progInstallerAssertions();
    assert.equal(D.getElementById('table-programme').rows[0].cells.length, avant,
        'une seconde colonne a été ajoutée');
});

/* ---------------- Cohérence d'ensemble ---------------- */

test('ENSEMBLE — chaque panneau d’onglet a un bouton de navigation', () => {
    // Un panneau sans bouton est du travail invisible : il existe, il se
    // sauvegarde, mais personne ne peut l'atteindre.
    const orphelins = [];
    for(const p of D.querySelectorAll('.tab-content')){
        if(p.id === 'messagerie') continue;   /* bouton dédié hors des phases */
        if(!D.querySelector('[onclick*="showTab(\'' + p.id + '\')"]')) orphelins.push(p.id);
    }
    assert.deepEqual(orphelins, [], 'panneaux inatteignables');
});

test('ENSEMBLE — aucun bouton ne pointe vers un panneau absent', () => {
    const morts = [];
    for(const b of D.querySelectorAll('[onclick*="showTab("]')){
        const m = /showTab\('([^']+)'\)/.exec(b.getAttribute('onclick'));
        if(m && !D.getElementById(m[1])) morts.push(m[1]);
    }
    assert.deepEqual([...new Set(morts)], [], 'boutons pointant dans le vide');
});
