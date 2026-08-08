/* ==================================================================
   NOTES ANNEXES — RATTACHEMENT DES POSTES À LA BONNE NOTE

   Le classeur DGI de référence porte, sur chaque poste du bilan et du
   compte de résultat, une colonne « NOTE » qui dit explicitement à
   quelle note annexe ce poste appartient (ex. le poste DI porte
   « NOTE 7 », le poste BH porte « NOTE 17 »). C'est la seule source de
   vérité : elle a servi à trouver, le 8 août 2026, six notes dont la
   liste de postes (NOTES_CONFIG) divergeait de cette colonne.

   | Note | Défaut trouvé | Correction |
   |---|---|---|
   | 7  | ne montrait que BI (clients débiteurs) | ajout de DI (clients, avances reçues — passif) |
   | 8  | incluait BH par erreur | BH retiré (BH appartient à la NOTE 17) |
   | 14 | incluait CE (qui appartient à la NOTE 3E) ; omettait CH | CE retiré, CH (report à nouveau) ajouté |
   | 17 | ne montrait que DJ (fournisseurs, passif) | ajout de BH (fournisseurs, avances versées — actif) |
   | 21 | omettait TF (production immobilisée) | TF ajouté |
   | 30 | incluait TN et RO (qui appartiennent à la NOTE 3D) | TN et RO retirés |

   En corrigeant la NOTE 7, un second défaut, plus profond, est apparu :
   liasseAccountDetailRows() appelait liasseFindRef(compte) SANS lui
   passer le solde débiteur/créditeur du compte. Cette fonction en a
   pourtant besoin pour arbitrer entre deux postes de sens opposé
   partageant une même racine de compte (ex. 4191 va à BI si débiteur,
   à DI si créditeur). Sans solde, l'arbitrage retombait toujours sur
   le même poste par défaut : un compte créditeur pouvait apparaître,
   avec un montant négatif, dans le détail du poste débiteur. Corrigé
   en passant les colonnes sd/sc (ou od/oc en ouverture) à l'appel.

   Chaque montant ci-dessous est celui du classeur DGI réel (MTTCI,
   exercice 2025), pas une valeur inventée.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication, balancesMTTCI, arrondi } from './harness.js';

const app = chargerApplication();
const S = app.sandbox;
app.chargerBalances(balancesMTTCI());
const local = (v) => JSON.parse(JSON.stringify(v));

function configDe(num) {
    return local(S.NOTES_CONFIG).find((n) => n.num === num);
}
function refsDe(num) {
    return configDe(num).blocks.flatMap((b) => b.refs);
}

test('NOTE 7 — porte désormais BI (actif) et DI (passif)', () => {
    assert.deepEqual(refsDe('7'), ['BI', 'DI']);
    const html = S.liasseRenderNote('7');
    assert.match(html, /311[\s ]?123[\s ]?915/, 'le montant réel de DI doit apparaître dans le rendu');
});

test('RÉGRESSION — liasseAccountDetailRows arbitre par le sens réel du solde', () => {
    // Compte 4111 (Clients, débiteur) doit aller à BI ; 4181 et 4191
    // (Clients factures à établir / avances reçues, créditeurs) à DI.
    // Chiffres réels MTTCI : BI = 62 627 355, DI = 311 123 915.
    const bi = S.liasseAccountDetailRows('n', ['BI']);
    const di = S.liasseAccountDetailRows('n', ['DI']);
    assert.equal(arrondi(bi.reduce((s, r) => s + r.net, 0)), 62627355);
    assert.equal(arrondi(di.reduce((s, r) => s + r.net, 0)), 311123915);
    assert.ok(bi.every((r) => r.net >= 0), 'aucun compte créditeur ne doit apparaître (négatif) dans le bloc BI');
});

test('NOTE 8 — ne porte plus que BJ, BH en est retiré', () => {
    assert.deepEqual(refsDe('8'), ['BJ']);
});

test('NOTE 14 — porte CD/CF/CG/CH, plus CE (qui appartient à la NOTE 3E)', () => {
    assert.deepEqual(refsDe('14'), ['CD', 'CF', 'CG', 'CH']);
    const html = S.liasseRenderNote('14');
    // CH se ventile sur deux comptes (1210 créditeur 17 291 540, 1291
    // débiteur -3 759 434) qui n'apparaissent jamais additionnés seuls
    // dans ce rendu par compte — seul le total de la note (CD+CF+CG+CH)
    // l'est : 5 000 000 + 17 291 540 - 3 759 434 = 18 532 106.
    assert.match(html, /17[\s ]?291[\s ]?540/, 'le compte 1210 (report à nouveau créditeur) doit apparaître');
    assert.match(html, /18[\s ]?532[\s ]?106/, 'le total de la note doit inclure CH');
});

test('NOTE 17 — porte désormais BH (actif) et DJ (passif)', () => {
    assert.deepEqual(refsDe('17'), ['BH', 'DJ']);
});

test('NOTE 21 — porte TF (production immobilisée), en plus des ventes et autres produits', () => {
    assert.deepEqual(refsDe('21'), ['TA', 'TB', 'TC', 'TD', 'TF', 'TG', 'TH']);
});

test('NOTE 30 — ne porte plus que RP et TO ; TN et RO (NOTE 3D) en sont retirés', () => {
    assert.deepEqual(refsDe('30'), ['RP', 'TO']);
});

test('COUVERTURE — aucun poste du bilan/résultat taggé d’une note DGI n’est absent de NOTES_CONFIG', () => {
    // Les couples (poste, note) tels que portés par le classeur DGI de
    // référence (colonne NOTE du BILAN/ACTIF/PASSIF/RESULTAT). Un sous-
    // ensemble volontairement restreint aux notes déjà en type
    // « auto-detail » dans ce module — les notes encore « manual »
    // (3D, 3E, 27B, etc.) ne sont pas concernées par ce contrôle.
    const attendus = {
        BI: '7', DI: '7', BJ: '8', BH: '17', DJ: '17',
        CD: '14', CF: '14', CG: '14', CH: '14',
        TA: '21', TB: '21', TC: '21', TD: '21', TF: '21', TG: '21', TH: '21',
        RP: '30', TO: '30',
    };
    for (const [ref, note] of Object.entries(attendus)) {
        const refs = refsDe(note);
        assert.ok(refs.includes(ref), `le poste ${ref} doit figurer dans la NOTE ${note}`);
    }
});

test('NON-RÉGRESSION — le bilan reste équilibré après ces corrections (elles ne touchent que l’affichage des notes)', () => {
    const actif = S.liasseGetActif('n');
    const resultat = S.liasseGetResultat('n');
    const passif = S.liasseGetPassif('n', resultat.XI);
    assert.equal(arrondi(actif.BZ.net), arrondi(passif.DZ.net));
});
