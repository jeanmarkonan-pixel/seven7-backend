/* ==================================================================
   INTERFACE — le livrable dans un vrai DOM

   Le harnais principal évalue les blocs <script> dans un bac à sable
   sans navigateur : suffisant pour le moteur de calcul, aveugle à tout
   ce qui touche au document. Ces tests chargent le HTML dans jsdom.

   Ils couvrent ce qu'aucun autre test ne voit : le diagnostic de SDK
   absent, la barre de navigation, la grille de balance, la conversion
   des champs de montant et l'estampille de version.

   jsdom n'exécute pas les <script src> externes (SDK Firebase,
   lz-string) : c'est précisément la situation que le diagnostic est
   censé traiter, et elle est ici reproduite sans truquage.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { cheminApplication } from './harness.js';

const html = fs.readFileSync(cheminApplication(), 'utf8');

/** Charge l'application dans un DOM complet. Les scripts inline
 *  s'exécutent ; les scripts externes ne sont pas récupérés.
 *  La console virtuelle reste muette : le fichier produit beaucoup de
 *  bruit sous jsdom (SDK absent, API non implémentées) qui masquerait
 *  le résultat des tests. */
function dom(){
    return new JSDOM(html, {
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        url: 'https://seven7-audit.web.app/',
        virtualConsole: new VirtualConsole(),
    });
}

/** Charge le document ET attend que son initialisation soit passée.
 *  Plusieurs modules ne travaillent qu'au DOMContentLoaded, voire dans
 *  un setTimeout(0) qui suit : les tester avant reviendrait à constater
 *  qu'ils n'ont rien fait. */
async function domPret(){
    const d = dom();
    const w = d.window;
    if(w.document.readyState !== 'complete')
        await new Promise(r => w.addEventListener('load', r, { once:true }));
    await new Promise(r => setTimeout(r, 50));  // laisse passer les setTimeout(0)
    return d;
}

/** Recopie une valeur venue du realm jsdom dans le nôtre.
 *  assert.deepEqual compare les prototypes : un tableau construit dans
 *  la fenêtre jsdom n'est jamais « égal » à un tableau local. */
const local = v => JSON.parse(JSON.stringify(v));

test('SDK — le diagnostic nomme les scripts Firebase manquants', () => {
    const d = dom();
    const w = d.window;

    // Le SDK n'est pas là : c'est le cas d'un pare-feu ou d'un antivirus
    // interceptant gstatic.com.
    assert.equal(w.sdkFirebasePresent(), false);

    const manquants = local(w.sdkFirebaseDetail());
    assert.deepEqual(manquants, [
        'firebase-app-compat.js',
        'firebase-auth-compat.js',
        'firebase-firestore-compat.js',
    ], 'les trois scripts du SDK doivent être nommés');

    // sdkVerifierFirebase refuse et affiche, au lieu de laisser remonter
    // « firebase is not defined ».
    assert.equal(w.sdkVerifierFirebase(), false);
    const bandeau = w.document.getElementById('sdk-bandeau');
    assert.ok(bandeau, 'aucun bandeau de diagnostic affiché');
    assert.match(bandeau.textContent, /gstatic\.com/, 'l’origine des scripts doit être nommée');
    assert.match(bandeau.textContent, /pare-feu|antivirus/i, 'les causes probables doivent être citées');
    assert.match(bandeau.textContent, /restent utilisables/i,
        'l’utilisateur doit savoir que les onglets de calcul fonctionnent hors connexion');

    // appelé deux fois, le bandeau ne se duplique pas
    w.sdkVerifierFirebase();
    assert.equal(w.document.querySelectorAll('#sdk-bandeau').length, 1);
    d.window.close();
});

test('SDK — un SDK complet ne déclenche aucun bandeau', () => {
    const d = dom();
    const w = d.window;
    w.firebase = { initializeApp(){}, auth(){}, firestore(){} };

    assert.equal(w.sdkFirebasePresent(), true);
    assert.deepEqual(local(w.sdkFirebaseDetail()), []);
    assert.equal(w.sdkVerifierFirebase(), true);
    assert.equal(w.document.getElementById('sdk-bandeau'), null,
        'bandeau affiché alors que le SDK est présent');
    d.window.close();
});

test('NAVIGATION — les 45 onglets sont répartis sur trois phases', async () => {
    const d = await domPret();
    const w = d.window;

    assert.ok(Array.isArray(w.TABS), 'TABS absent');
    // 31 onglets d’origine (dont Messagerie), 11 sections de diligences normatives,
    // les faits marquants de l’exercice, le choix de l’opinion à opérer, et le
    // rapprochement bancaire (25/08).
    assert.equal(w.TABS.length, 45, 'le nombre d’onglets a changé');

    const phases = [...new Set(w.TABS.map(t => t.phase))].sort();
    assert.deepEqual(phases, [1, 2, 3], 'les onglets doivent couvrir trois phases, une par rangée');

    // identifiants uniques : un doublon ferait pointer deux boutons au même endroit
    const ids = w.TABS.map(t => t.id);
    assert.equal(new Set(ids).size, ids.length, 'identifiant d’onglet en double');

    // chaque onglet déclare un libellé
    for(const t of w.TABS)
        assert.ok(t.label && t.label.trim(), `onglet ${t.id} sans libellé`);

    // et chaque onglet a bien son panneau dans le document
    const orphelins = w.TABS.filter(t => !w.document.getElementById(t.id)).map(t => t.id);
    assert.deepEqual(local(orphelins), [], 'onglets déclarés sans panneau correspondant');
    d.window.close();
});

test('BALANCE — les lignes portent des champs texte formatés, pas des compteurs', () => {
    const d = dom();
    const w = d.window;

    const ligne = w.balanceRowHtml('n', {
        compte:'41810000', intitule:'CLIENT FACTURE A ETABLIR',
        od:0, oc:0, md:0, mc:113822444, sd:0, sc:113822444
    });
    assert.ok(ligne && ligne.length, 'balanceRowHtml n’a rien produit');

    const tr = w.document.createElement('tr');
    tr.innerHTML = ligne;

    // Aucun <input type="number"> : c'étaient eux qui tronquaient
    // visuellement les montants dans les colonnes étroites.
    assert.equal(tr.querySelectorAll('input[type="number"]').length, 0,
        'champ numérique résiduel dans une ligne de balance');

    const champs = tr.querySelectorAll('input');
    assert.ok(champs.length >= 8, `ligne incomplète : ${champs.length} champs`);

    // le numéro de compte et l'intitulé sont restitués
    const valeurs = [...champs].map(i => i.value);
    assert.ok(valeurs.includes('41810000'), 'numéro de compte absent');
    assert.ok(valeurs.some(v => /CLIENT FACTURE/.test(v)), 'intitulé absent');
    d.window.close();
});

test('MONTANTS — les champs de saisie sont convertis, les autres épargnés', () => {
    const d = dom();
    const w = d.window;
    const doc = w.document;

    const zone = doc.createElement('div');
    zone.innerHTML = `
        <input type="number" id="m-solde" value="450000">
        <input type="number" id="m-brut" value="385982204">
        <input type="number" id="t-note" max="10" value="7">
        <input type="number" id="t-taux" class="pct" value="1.5">
        <input type="number" id="t-duree" step="0.5" value="12">
        <input type="number" id="t-seuil-var" value="15">
        <input type="number" id="t-nbj" class="nbjours" value="30">
    `;
    doc.body.appendChild(zone);

    assert.equal(w.estChampMontant(doc.getElementById('m-solde')), true);
    assert.equal(w.estChampMontant(doc.getElementById('m-brut')),  true);
    // Notations (bornées par max), taux, durées fractionnaires, seuils en
    // pourcentage et nombres de jours ne doivent jamais recevoir de
    // séparateur de milliers.
    for(const id of ['t-note', 't-taux', 't-duree', 't-seuil-var', 't-nbj'])
        assert.equal(w.estChampMontant(doc.getElementById(id)), false, `${id} converti à tort`);

    w.formaterTousLesMontants(zone);

    const solde = doc.getElementById('m-solde');
    assert.equal(solde.getAttribute('type'), 'text', 'le champ de montant doit devenir texte');
    assert.equal(solde.getAttribute('inputmode'), 'decimal');
    assert.equal(w.parseNum(solde.value), 450000, 'la valeur doit rester relisible');
    assert.match(solde.value, /\s/, 'la valeur affichée doit porter un séparateur de milliers');

    // et le gros montant, celui qui était visuellement tronqué
    assert.equal(w.parseNum(doc.getElementById('m-brut').value), 385982204);

    // les champs épargnés gardent leur type et leur valeur brute
    assert.equal(doc.getElementById('t-note').getAttribute('type'), 'number');
    assert.equal(doc.getElementById('t-taux').value, '1.5');
    d.window.close();
});

test('MONTANTS — aucun champ conservé en numérique ne porte de gros montant', async () => {
    // Un champ resté <input type="number"> avec une valeur à cinq chiffres
    // ou plus serait un montant oublié par la conversion.
    const d = await domPret();
    const w = d.window;
    const fautifs = [...w.document.querySelectorAll('input[type="number"]')]
        .filter(i => Math.abs(w.parseNum(i.value)) >= 10000)
        .map(i => `${i.id || i.className || '(sans id)'} = ${i.value}`);
    assert.deepEqual(fautifs, [], 'champs numériques portant un montant');
    d.window.close();
});

test('VERSION — l’estampille est écrite dans le document au chargement', async () => {
    const d = await domPret();
    const w = d.window;
    const attendu = w.seven7VersionTexte();

    assert.match(attendu, /^v\d+\.\d+\.\d+ · /, `estampille mal formée : ${attendu}`);
    for(const id of ['seven7-version', 'seven7-version-lock']){
        const el = w.document.getElementById(id);
        assert.ok(el, `élément #${id} absent`);
        assert.equal(el.textContent, attendu, `#${id} non renseigné`);
    }
    d.window.close();
});

test('CHARGEMENT — les blocs inline s’évaluent sans erreur de syntaxe', () => {
    // Une erreur de syntaxe dans un bloc empêcherait TOUTES les fonctions
    // qu'il déclare d'exister, sans que le harnais Node le signale
    // clairement. On vérifie qu'une fonction clé de chacun des quatre
    // blocs a bien été définie.
    const d = dom();
    const w = d.window;

    // Blocs 1 et 4 : fonctions déclarées au premier niveau, donc globales.
    for(const [bloc, fn] of [
        ['bloc 1 — noyau',  'parseNum'],
        ['bloc 1 — noyau',  'balanceRowHtml'],
        ['bloc 4 — liasse', 'liasseGetActif'],
        ['bloc 4 — liasse', 'cycleOf'],
        ['bloc 4 — liasse', 'sdkFirebasePresent'],
    ])
        assert.equal(typeof w[fn], 'function', `${bloc} : ${fn} non définie`);

    // Blocs 2 et 3 : tout leur code vit dans une IIFE. Ils ne se
    // reconnaissent qu'à ce qu'ils laissent au premier niveau — c'est
    // aussi la raison pour laquelle un découpage en modules ES demande
    // d'exposer explicitement ce que les attributs onclick appellent.
    assert.equal(typeof w.TABS, 'object', 'bloc 2 : TABS non déclaré');
    assert.equal(typeof w.FIREBASE_CONFIG, 'object', 'bloc 2 : FIREBASE_CONFIG non déclaré');
    assert.ok(w.document.getElementById('lock-screen-cabinet-name'),
              'bloc 3 : l’écran de connexion de la messagerie est absent');
    d.window.close();
});
