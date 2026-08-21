/* ==================================================================
   FAITS MARQUANTS DE L'EXERCICE

   Ce que l'ENTITÉ expose à l'auditeur lors de la prise de connaissance.

   Le module ne devine pas les faits : il les recueille, puis les
   recoupe avec les comptes dans les deux sens. Un fait déclaré doit se
   voir dans les chiffres ; une variation forte doit s'expliquer par un
   fait. Ces tests protègent ce double sens, qui est tout l'intérêt.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI } from './harness.js';

const app = chargerApplication();
app.chargerBalances(balancesMTTCI());
const S = app.sandbox;
const local = v => JSON.parse(JSON.stringify(v));

/* Seuil de signification fixé pour rendre le recoupement déterministe. */
S.seuils = Object.assign({}, S.seuils, { signif: 5000000 });

const CATS = local(S.FAITS_CATEGORIES);

test('CATÉGORIES — les événements couverts sont ceux d’une prise de connaissance', () => {
    assert.ok(CATS.length >= 12, `seulement ${CATS.length} catégories`);
    const ids = CATS.map(c => c.id);
    assert.equal(new Set(ids).size, ids.length, 'identifiant en double');
    for(const attendu of ['DIRECTION','CAPITAL','INVEST','CESSION','FINANCEMENT','ACTIVITE',
                          'LITIGE','METHODE','SI','ORGANISATION','PARTIES'])
        assert.ok(ids.includes(attendu), `catégorie manquante : ${attendu}`);
    assert.ok(ids.includes('AUTRE'), 'une entrée libre est nécessaire');
});

test('CATÉGORIES — chacune dit ce qu’elle touche et ce qu’elle fait recouper', () => {
    for(const c of CATS){
        assert.ok(c.ico && c.lib && c.lib.length > 15, `${c.id} : libellé insuffisant`);
        assert.ok(c.ctrl && c.ctrl.length > 20, `${c.id} : recoupement attendu non décrit`);
        assert.ok(Array.isArray(c.cyc), `${c.id} : cycles non déclarés`);
    }
});

test('CATÉGORIES — les cycles cités existent', () => {
    const idsCycle = new Set(local(S.CYCLES).map(c => c.id));
    for(const c of CATS)
        for(const cy of c.cyc)
            assert.ok(idsCycle.has(cy), `${c.id} : cycle inconnu « ${cy} »`);
});

/* ---------------- Recoupement : variation sans fait déclaré ---------------- */

test('RECOUPEMENT — une variation forte sans fait déclaré est signalée', () => {
    // Sur MTTCI, l'actif immobilisé brut varie de ~147 M et le chiffre
    // d'affaires de ~114 M : sans explication, ce sont des questions à poser.
    const m = local(S.fxVariationsInexpliquees([]));
    assert.ok(m.length >= 2, `${m.length} variation(s) signalée(s)`);
    const cats = m.map(x => x.cat);
    assert.ok(cats.includes('INVEST'), 'la variation de l’actif immobilisé doit remonter');
    assert.ok(cats.includes('ACTIVITE'), 'la variation du chiffre d’affaires doit remonter');
    for(const x of m)
        assert.ok(/Interroger la direction|sans qu'aucun fait/.test(x.question),
            'la question à poser doit être formulée');
});

test('RECOUPEMENT — déclarer le fait fait disparaître la question', () => {
    const avant = local(S.fxVariationsInexpliquees([])).map(x => x.cat);
    const apres = local(S.fxVariationsInexpliquees(['INVEST'])).map(x => x.cat);
    assert.ok(avant.includes('INVEST'));
    assert.ok(!apres.includes('INVEST'), 'un fait déclaré ne doit plus être demandé');
    assert.ok(apres.includes('ACTIVITE'), 'les autres questions subsistent');
});

/* ---------------- Recoupement : fait déclaré sans trace comptable ---------------- */

test('RECOUPEMENT — un fait déclaré que les comptes ne corroborent pas est signalé', () => {
    // Aucun mouvement significatif sur les provisions de MTTCI : un litige
    // déclaré devrait donc s'y voir, et ne s'y voit pas.
    const c = local(S.fxFaitsNonCorrobores(['LITIGE']));
    assert.equal(c.length, 1);
    assert.equal(c[0].cat, 'LITIGE');
    assert.match(c[0].question, /ne varient que de|en deçà du seuil/);
    assert.match(c[0].question, /comptabilisée/);
});

test('RECOUPEMENT — un fait déclaré que les chiffres confirment ne remonte pas', () => {
    assert.deepEqual(local(S.fxFaitsNonCorrobores(['INVEST'])), [],
        'l’investissement de MTTCI est bien visible dans les comptes');
});

test('RECOUPEMENT — une catégorie sans contrepartie chiffrable est ignorée', () => {
    // « Changement de système d'information » ne se lit pas dans un solde :
    // le module ne doit pas inventer de contrôle pour elle.
    assert.deepEqual(local(S.fxFaitsNonCorrobores(['SI', 'METHODE', 'AUTRE'])), []);
});

test('RECOUPEMENT — sans seuil de signification, aucun recoupement n’est tenté', () => {
    const sauvegardeSeuils = S.seuils;
    const sauvegardeBal = app.evaluer('JSON.stringify(balanceData)');
    try{
        S.seuils = { signif: 0, faible: 0, planif: 0, totalActifN: 0 };
        app.chargerBalances({ n: [], n1: [] });
        assert.equal(S.fxSeuil(), 0, 'sans données ni seuil, fxSeuil doit valoir 0');
        assert.deepEqual(local(S.fxVariationsInexpliquees([])), []);
        assert.deepEqual(local(S.fxFaitsNonCorrobores(['INVEST'])), []);
    } finally {
        S.seuils = sauvegardeSeuils;
        app.chargerBalances(JSON.parse(sauvegardeBal));
    }
});

test('RECOUPEMENT — à défaut de seuil saisi, 5 % du total du bilan sert de repère', () => {
    const sauvegarde = S.seuils;
    try{
        S.seuils = { signif: 0, faible: 0, planif: 0, totalActifN: 0 };
        const attendu = Math.abs(app.evaluer('liasseGetActif("n").BZ.net')) * 0.05;
        assert.ok(Math.abs(S.fxSeuil() - attendu) < 1, `seuil de repli : ${S.fxSeuil()}`);
    } finally {
        S.seuils = sauvegarde;
    }
});

/* ---------------- Installation ---------------- */

test('INSTALLATION — l’onglet est déclaré en phase 1, avant les travaux', () => {
    // Les faits marquants se recueillent à la prise de connaissance :
    // ils commandent le programme, ils ne le concluent pas.
    const t = local(S.TABS).find(x => x.id === 'faits-exercice');
    assert.ok(t, 'onglet absent de TABS — la saisie serait perdue');
    assert.equal(t.phase, 1);
});

test('RENDU — chaque ligne porte sa catégorie et un champ de survenance', () => {
    for(const c of CATS){
        const h = S.fxLigneHtml(c);
        assert.ok(h.includes('data-cat="' + c.id + '"'), `${c.id} : catégorie non identifiable`);
        assert.match(h, /class="fx-survenu"/, `${c.id} : champ « survenu » absent`);
        assert.match(h, /Exercice N-1/, `${c.id} : l’exercice précédent doit être proposé`);
    }
});
