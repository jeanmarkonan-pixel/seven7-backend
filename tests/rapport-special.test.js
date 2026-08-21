/* ==================================================================
   RAPPORT SPÉCIAL SUR LES CONVENTIONS RÉGLEMENTÉES

   Obligation propre au commissaire aux comptes en zone OHADA, et
   rapport distinct du rapport général. Trois propriétés le rendent
   recevable, et ces tests les protègent :

   · il ne se prononce PAS sur l'utilité ni le bien-fondé ;
   · il ne prétend PAS avoir recherché d'autres conventions ;
   · l'absence de convention s'y DIT — un rapport muet ne vaut pas
     déclaration d'absence.
   ================================================================== */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { cheminApplication } from './harness.js';

/* Ce module manipule un vrai tableau : lignes ajoutées, cellules lues,
   lignes supprimées. Le bac à sable du harnais principal n'a pas de DOM,
   il faut donc jsdom. */
const html = fs.readFileSync(cheminApplication(), 'utf8');
const jsdom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://seven7-audit.web.app/', virtualConsole: new VirtualConsole(),
});
await new Promise(r => {
    if(jsdom.window.document.readyState === 'complete') return r();
    jsdom.window.addEventListener('load', r, { once:true });
});
await new Promise(r => setTimeout(r, 50));
const S = jsdom.window;
const local = v => JSON.parse(JSON.stringify(v));

// Sans ce close(), un minuteur réel enregistré par la fenêtre (déconnexion
// automatique sur inactivité, 46-session-inactivite.js) retient le process
// Node ouvert jusqu'à son échéance — voir la même note dans onglets-dom.test.js.
after(() => { jsdom.window.close(); });

/** Vide le tableau, y saisit des conventions, puis produit le texte. */
function rapportAvec(conventions){
    const t = S.document.getElementById('table-conventions');
    while(t.rows.length > 1) t.deleteRow(1);
    for(const c of conventions || []){
        S.convAjouter();
        const tr = t.rows[t.rows.length - 1];
        for(const [cls, val] of Object.entries(c)){
            const el = tr.querySelector('.cv-' + cls);
            if(el) el.value = val;
        }
    }
    return S.convGenerer();
}

const CONV = {
    rub:'AUT_EX', personne:'M. KOUAME, administrateur', nature:'Bail commercial',
    modalites:'Loyer mensuel de 500 000 FCFA, bail de 3 ans', montant:'6000000',
    autorisation:'Conseil d’administration du 12/03/2025',
};

test('PORTÉE — le rapport dit qu’il ne se prononce pas sur le bien-fondé', () => {
    // C'est ce qui distingue ce rapport d'un avis d'opportunité. L'omettre
    // exposerait le commissaire aux comptes à un reproche d'immixtion.
    const t = rapportAvec([CONV]);
    assert.match(t, /SANS AVOIR À NOUS PRONONCER SUR LEUR UTILITÉ ET LEUR BIEN-FONDÉ/);
    assert.match(t, /ni à rechercher l'existence d'autres conventions/);
    assert.match(t, /Il vous appartient d'apprécier l'intérêt/);
});

test('STRUCTURE — titre, destinataire, exposé de mission et signature', () => {
    const t = rapportAvec([CONV]);
    for(const bloc of [
        'RAPPORT SPÉCIAL DU COMMISSAIRE AUX COMPTES',
        'SUR LES CONVENTIONS RÉGLEMENTÉES',
        'Aux actionnaires de',
        'En notre qualité de commissaire aux comptes',
        'Commissaire aux comptes',
    ]) assert.ok(t.includes(bloc), `bloc absent : « ${bloc} »`);
});

test('ABSENCE — sans aucune convention, l’absence est déclarée expressément', () => {
    // Un rapport spécial muet ne vaut pas déclaration : l'assemblée doit
    // lire que le commissaire aux comptes n'a été avisé d'aucune convention.
    const t = rapportAvec([]);
    assert.match(t, /il ne nous a été donné avis d'aucune convention autorisée et conclue/);
    assert.match(t, /aucune autre convention entrant dans le champ/);
});

test('ABSENCE — les rubriques sans convention ne s’impriment pas inutilement', () => {
    // Seule l'absence de conventions DE L'EXERCICE doit être déclarée.
    // Imprimer « néant » sous cinq rubriques noierait l'information.
    const t = rapportAvec([]);
    assert.ok(!t.includes("CONVENTIONS INTERDITES"), 'rubrique vide imprimée à tort');
    assert.ok(!t.includes("CONVENTIONS NON AUTORISÉES PRÉALABLEMENT"));
    assert.ok(t.includes("CONVENTIONS AUTORISÉES ET CONCLUES AU COURS DE L'EXERCICE"));
});

test('CONVENTION — toutes les caractéristiques exigées figurent au rapport', () => {
    const t = rapportAvec([CONV]);
    assert.ok(t.includes('Bail commercial'),                 'nature et objet');
    assert.ok(t.includes('M. KOUAME, administrateur'),       'personne concernée et qualité');
    assert.ok(t.includes('Loyer mensuel de 500 000 FCFA'),   'modalités essentielles');
    assert.ok(t.includes(S.fmt(6000000)),                    'montant de l’exercice');
    assert.ok(t.includes('Conseil d’administration du 12/03/2025'), 'autorisation');
});

test('CONVENTION — une autorisation non renseignée reste un marqueur visible', () => {
    const sans = Object.assign({}, CONV, { autorisation: '' });
    assert.match(rapportAvec([sans]), /\[organe et date à préciser\]/);
});

test('RUBRIQUES — les cinq rubriques normatives sont proposées', () => {
    const codes = local(S.CONV_RUBRIQUES).map(r => r.code);
    assert.deepEqual(codes, ['AUT_EX', 'AUT_POST', 'POURSUIV', 'NON_AUT', 'INTERDIT']);
    for(const r of local(S.CONV_RUBRIQUES))
        assert.ok(r.lib && r.intro, `rubrique ${r.code} incomplète`);
});

test('RUBRIQUES — chaque convention est classée sous la sienne', () => {
    const t = rapportAvec([
        Object.assign({}, CONV, { rub:'AUT_EX',   nature:'Bail commercial' }),
        Object.assign({}, CONV, { rub:'POURSUIV', nature:'Contrat de prestation antérieur' }),
        Object.assign({}, CONV, { rub:'INTERDIT', nature:'Avance en compte courant au dirigeant' }),
    ]);
    const iEx   = t.indexOf('Bail commercial');
    const iPour = t.indexOf('Contrat de prestation antérieur');
    const iInt  = t.indexOf('Avance en compte courant au dirigeant');
    assert.ok(iEx > 0 && iPour > 0 && iInt > 0, 'une convention n’a pas été reprise');
    assert.ok(t.indexOf("CONVENTIONS APPROUVÉES AU COURS D'EXERCICES ANTÉRIEURS") < iPour);
    assert.ok(t.indexOf('CONVENTIONS INTERDITES') < iInt);
});

test('ALERTE — les conventions interdites sont introduites par leur interdiction', () => {
    // L'assemblée doit lire pourquoi ces opérations posent problème.
    const t = rapportAvec([Object.assign({}, CONV, { rub:'INTERDIT', nature:'Caution donnée au dirigeant' })]);
    assert.match(t, /l'Acte uniforme interdit/);
    assert.match(t, /emprunts contractés auprès de la société par ses dirigeants/);
});

test('ALERTE — une convention non autorisée renvoie l’appréciation à l’assemblée', () => {
    const t = rapportAvec([Object.assign({}, CONV, { rub:'NON_AUT' })]);
    assert.match(t, /sans autorisation préalable/);
    assert.match(t, /Il vous appartient d'apprécier les conséquences/);
});

test('SAISIE — une ligne entièrement vide n’est pas comptée comme convention', () => {
    // Le bouton « Ajouter » crée une ligne vierge : elle ne doit pas
    // produire une convention fantôme au rapport.
    const t = S.document.getElementById('table-conventions');
    while(t.rows.length > 1) t.deleteRow(1);
    S.convAjouter(); S.convAjouter();
    const g = local(S.convCollecter());
    assert.equal(Object.values(g).reduce((n, l) => n + l.length, 0), 0);
    assert.match(S.convGenerer(), /aucune convention autorisée et conclue/);
});

test('FORMAT — le texte est exploitable, sans valeur non résolue', () => {
    const t = rapportAvec([CONV]);
    assert.ok(t.length > 1200, `rapport trop court : ${t.length} caractères`);
    assert.ok(!t.includes('undefined'));
    assert.ok(!t.includes('NaN'));
    assert.ok(!/\[object/.test(t));
});
