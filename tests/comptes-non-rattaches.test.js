/* ==================================================================
   COMPTES NON RATTACHÉS À UN POSTE DE LIASSE

   Le trou que ce module comble : paramResolve() ignore silencieusement
   tout compte qu'aucun poste ne revendique. Le reste du moteur reste
   cohérent avec lui-même — détail et total continuent de s'accorder —
   mais le bilan calculé cesse de recouper la balance réelle, sans
   qu'aucun message ne le dise.

   Cas réel qui a révélé le défaut : une balance 2025 dont le total
   actif ressortait à 2 662 152 560 contre un passif de 2 728 121 651,
   écart de 65 969 091. Trois comptes hors référentiel en étaient la
   cause EXACTE :
     - 239800  « installations en cours »            2 500 000
     - 606100/606110/606300/606800 (numérotation propre au client, hors
       plage 604/605/608 attendue)                     864 660
     - 999999  « profits/pertes non distribués », un compte de purge
       généré par le logiciel du client, sans existence SYSCOHADA
                                                      62 604 431
     total                                           65 969 091   ← égal à l'écart, au franc près

   Personne n'a rien vu parce que rien ne le disait.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI, liasseReference, arrondi } from './harness.js';

const app = chargerApplication();
const S = app.sandbox;
const local = v => JSON.parse(JSON.stringify(v));

/** Ligne minimale de balance. */
const ligne = (compte, intitule, sd, sc) =>
    ({ compte, intitule, od:0, oc:0, md:0, mc:0, sd:sd||0, sc:sc||0 });

test('DÉTECTION — un compte hors référentiel au solde non nul est signalé', () => {
    app.chargerBalances({
        n: [
            ligne('10180000', 'CAPITAL', 0, 1000000),
            ligne('99999900', 'COMPTE DE PURGE LOGICIEL', 62604431, 0),
        ],
        n1: [],
    });
    const det = local(S.detecterComptesNonRattaches());
    assert.equal(det.n.length, 1, 'le capital ne doit pas ressortir : il est rattaché');
    assert.equal(det.n[0].compte, '99999900');
    assert.equal(det.n[0].solde, 62604431);
});

test('DÉTECTION — un compte hors référentiel au solde NUL n’est pas signalé', () => {
    // Un compte soldé n'a aucune incidence sur le bilan : le signaler
    // noierait l'alerte sous du bruit sans conséquence.
    app.chargerBalances({
        n: [ligne('58500100', 'VIREMENT INTERNE SOLDÉ', 500000, 500000)],
        n1: [],
    });
    assert.deepEqual(local(S.detecterComptesNonRattaches()).n, []);
});

test('DÉTECTION — les trois comptes du cas réel sont retrouvés à l’identique', () => {
    // Reproduction du cas qui a révélé le défaut, aux montants exacts.
    app.chargerBalances({
        n: [
            ligne('239800', 'Autres installations et aménagements en cours', 2500000, 0),
            ligne('606100', 'Fournitures non stockables', 15000, 0),
            ligne('606110', 'Electricité', 270400, 0),
            ligne('606300', 'Fournitures Entretien, petit équip.', 560000, 0),
            ligne('606800', 'Autres matères et fournitures', 19260, 0),
            ligne('999999', 'Profits/pertes non distribués', 62604431, 0),
        ],
        n1: [],
    });
    const det = local(S.detecterComptesNonRattaches());
    assert.equal(det.n.length, 6);
    const total = det.n.reduce((s, r) => s + Math.abs(r.solde), 0);
    assert.equal(arrondi(total), 65969091, 'la somme doit égaler l’écart observé au franc près');
    assert.ok(det.n.some(r => r.compte === '999999' && r.solde === 62604431));
});

test('DÉTECTION — un compte du référentiel, même sous forme longue, n’est pas signalé', () => {
    app.chargerBalances({
        n: [ligne('28450000', 'AMORTISSEMENT MATERIEL DE TRANSPORT', 0, 8695525)],
        n1: [],
    });
    assert.deepEqual(local(S.detecterComptesNonRattaches()).n, []);
});

test('ORDRE — les comptes signalés sont triés par montant décroissant', () => {
    app.chargerBalances({
        n: [
            ligne('91100001', 'PETIT ORPHELIN', 1000, 0),
            ligne('91100002', 'GROS ORPHELIN', 5000000, 0),
            ligne('91100003', 'ORPHELIN MOYEN', 250000, 0),
        ],
        n1: [],
    });
    const det = local(S.detecterComptesNonRattaches()).n;
    assert.deepEqual(det.map(r => r.compte), ['91100002', '91100003', '91100001']);
});

test('NON-RÉGRESSION — MTTCI, entièrement couverte par le référentiel, ne signale rien', () => {
    app.chargerBalances(balancesMTTCI());
    const REF = liasseReference();
    const det = local(S.detecterComptesNonRattaches());
    assert.deepEqual(det.n,  [], 'un compte MTTCI ressort comme orphelin en N');
    assert.deepEqual(det.n1, [], 'un compte MTTCI ressort comme orphelin en N-1');
    // et le bilan reste conforme à la liasse DGI, comme avant ce module
    assert.equal(arrondi(S.liasseGetActif('n').BZ.net), REF.actif.BZ[2]);
});

test('BLOCAGE — runDetection s’arrête si des comptes ne sont pas rattachés', () => {
    // Le même mécanisme que le blocage de continuité : les contrôles qui
    // suivent partiraient d'un bilan qui ne recoupe pas la balance.
    app.chargerBalances({
        n: [
            ligne('10180000', 'CAPITAL', 0, 1000000),
            ligne('99999900', 'PURGE', 1000000, 0),
        ],
        n1: [
            ligne('10180000', 'CAPITAL', 0, 1000000),
            ligne('99999900', 'PURGE', 1000000, 0),
        ],
    });
    // Sans conteneurs DOM (setHtml tolère leur absence), seule la valeur
    // de retour de renderComptesNonRattaches doit refléter le blocage.
    assert.equal(S.renderComptesNonRattaches(), false);
});

test('RÉSOLUTION — une fois le compte rattaché par extension du référentiel, il disparaît', () => {
    // Démonstration que la détection réagit au référentiel effectivement
    // utilisé par le moteur, pas à une liste séparée.
    app.chargerBalances({
        n: [ligne('21980000', 'AUTRES INCORP EN COURS', 500000, 0)],
        n1: [],
    });
    // 2198 est couvert depuis la correction du poste AH (voir
    // referentiel-comptes.test.js) : il ne doit donc jamais apparaître ici.
    assert.deepEqual(local(S.detecterComptesNonRattaches()).n, []);
});
