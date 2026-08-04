/* ==================================================================
   CONFORMITÉ DU RÉFÉRENTIEL DE COMPTES

   Le moteur rattache chaque compte de la balance à un poste de la
   planche. Un compte que rien ne réclame ne produit PAS d'erreur : il
   disparaît, silencieusement, et le bilan cesse d'équilibrer sans que
   rien ne le signale.

   C'est exactement ce qui se passait pour 2198 « autres immobilisations
   incorporelles en cours » : présent au référentiel DGI pour AH, absent
   du moteur, il ne résolvait nulle part.

   Ces tests balaient tout le plan de comptes pour qu'aucun compte
   d'actif ou de passif ne puisse à nouveau sortir du bilan.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI, liasseReference, arrondi } from './harness.js';

const app = chargerApplication();
app.chargerBalances(balancesMTTCI());
const REF = liasseReference();
const S = app.sandbox;

/** Le compte est-il rattaché à un poste, dans un sens comme dans l'autre ? */
const resout = c => !!(S.paramResolve(c + '0000', 1000, 0) || S.paramResolve(c + '0000', 0, 1000));

test('RÉGRESSION — 2198 est rattaché à AH et ne sort plus du bilan', () => {
    const m = S.paramResolve('21980000', 500000, 0);
    assert.ok(m, '2198 ne résout nulle part — son montant quitterait le bilan');
    assert.equal(m.ref, 'AH');
    assert.equal(m.col, 'brut');
});

test('COUVERTURE — tous les comptes du référentiel DGI pour AH sont rattachés', () => {
    // Référentiel : AH brut = 217, 218 (sauf 2181), 2198
    assert.equal(S.paramResolve('21700000', 1000, 0).ref, 'AH');
    assert.equal(S.paramResolve('21800000', 1000, 0).ref, 'AH');
    assert.equal(S.paramResolve('21980000', 1000, 0).ref, 'AH');
    // 2181 est réservé à AE : l'exclusion doit tenir
    assert.equal(S.paramResolve('21810000', 1000, 0).ref, 'AE');
});

test('COUVERTURE — tout compte de saisie du plan comptable atteint un poste', () => {
    // Balayer 100 à 599 produirait du bruit : « 200 » ou « 300 » ne sont
    // pas des comptes SYSCOHADA. On interroge donc le plan comptable
    // embarqué dans l'application, qui fait autorité.
    //
    // Les comptes à deux chiffres — 11, 21, 28… — sont des têtes de
    // chapitre, jamais mouvementées : elles sont exclues à dessein.
    const plan = Object.keys(JSON.parse(JSON.stringify(S.PCG_FICHES)));
    assert.ok(plan.length > 100, 'plan comptable introuvable ou incomplet');

    const orphelins = plan
        .filter(c => /^[1-5]/.test(c) && c.length >= 3)
        .filter(c => !resout(c));
    assert.deepEqual(orphelins, [],
        'comptes de saisie du plan que le moteur ne rattache à aucun poste : leur montant sortirait du bilan');
});

test('COUVERTURE — les têtes de chapitre ne sont pas rattachées, et c’est voulu', () => {
    // Si l'une venait à résoudre, c'est qu'un préfixe trop court aurait
    // été déclaré quelque part — et il capterait alors tout un chapitre.
    for(const tete of ['11', '21', '28', '29', '48', '56'])
        assert.equal(resout(tete), false,
            `${tete} est une tête de chapitre : la rattacher capterait tous ses sous-comptes`);
});

test('ÉQUILIBRE — un compte 2198 dans la balance ne déséquilibre pas l’actif', () => {
    // Le test qui aurait attrapé le défaut : avant correction, 500 000
    // sortaient de l'actif et BZ ne bouclait plus avec la balance.
    const sauve = app.evaluer('JSON.stringify(balanceData)');
    try{
        app.chargerBalances({
            n: [
                { compte:'21980000', intitule:'INCORP EN COURS', od:0, oc:0, md:0, mc:0, sd:500000, sc:0 },
                { compte:'10100000', intitule:'CAPITAL',         od:0, oc:0, md:0, mc:0, sd:0, sc:500000 },
            ],
            n1: [],
        });
        const A = S.liasseGetActif('n');
        assert.equal(arrondi(A.AH.brut), 500000, 'le montant doit atteindre AH');
        assert.equal(arrondi(A.AD.net),  500000, 'et remonter dans la section');
        assert.equal(arrondi(A.BZ.net),  500000, 'et dans le total général');
        const R = S.liasseGetResultat('n');
        const P = S.liasseGetPassif('n', R.XI);
        assert.equal(arrondi(A.BZ.net), arrondi(P.DZ.net), 'actif et passif doivent boucler');
    } finally { app.chargerBalances(JSON.parse(sauve)); }
});

test('AFFICHAGE — les lignes de total portent leur formule', () => {
    // Un lecteur qui additionne toutes les lignes visibles compte deux
    // fois : AD figure au-dessus des postes qu'elle regroupe.
    for(const [ref, formule] of Object.entries(JSON.parse(JSON.stringify(S.LIASSE_SOMMES)))){
        const m = S.liasseMarqueSomme(ref);
        assert.ok(m.includes('Σ'), `${ref} : pastille de somme absente`);
        assert.ok(m.includes(formule), `${ref} : formule « ${formule} » absente`);
        assert.match(m, /Ne l’additionnez pas/, `${ref} : l’avertissement doit être dans l’infobulle`);
    }
});

test('AFFICHAGE — un poste ordinaire ne porte aucune pastille', () => {
    for(const ref of ['AE', 'AF', 'AJ', 'AM', 'BI', 'BS', 'CA', 'DI'])
        assert.equal(S.liasseMarqueSomme(ref), '', `${ref} n’est pas un total`);
});

test('AFFICHAGE — les formules déclarées correspondent au calcul réel', () => {
    // Une formule affichée qui ne serait pas celle appliquée serait pire
    // que pas de formule du tout : elle tromperait la vérification.
    const A = S.liasseGetActif('n');
    const verifs = {
        AD:['AE','AF','AG','AH'], AI:['AJ','AK','AL','AM','AN'], AQ:['AR','AS'],
        AZ:['AD','AI','AP','AQ'], BG:['BH','BI','BJ'], BK:['BA','BB','BG'],
        BT:['BQ','BR','BS'],      BZ:['AZ','BK','BT','BU'],
    };
    for(const [tot, parts] of Object.entries(verifs))
        for(const col of ['brut', 'amort', 'net']){
            const somme = parts.reduce((s, p) => s + ((A[p]||{})[col] || 0), 0);
            assert.equal(arrondi(somme), arrondi((A[tot]||{})[col] || 0),
                `${tot} (${col}) : la formule affichée ne correspond pas au calcul`);
        }
});

test('NON-RÉGRESSION — MTTCI reste conforme à la liasse DGI', () => {
    const A = S.liasseGetActif('n');
    assert.equal(arrondi(A.AZ.amort), REF.actif.AZ[1]);
    assert.equal(arrondi(A.BZ.net),   REF.actif.BZ[2]);
});
