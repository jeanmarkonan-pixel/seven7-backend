/* ==================================================================
   ÉCHANTILLONNAGE STATISTIQUE (ISA 530)

   Le sondage par seuil ne permet aucune conclusion sur la population
   non examinée. Le sondage en unités monétaires le permet — à la
   condition que les calculs soient justes, car ils fondent une
   conclusion d'audit sur des éléments qu'on n'a PAS vus.

   C'est le module où une erreur de formule serait la plus grave : elle
   ne se verrait nulle part, et conduirait à accepter une population
   qui aurait dû être rejetée.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerApplication } from './harness.js';

const app = chargerApplication();
const S = app.sandbox;
const local = v => JSON.parse(JSON.stringify(v));
const proche = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;

/* ---------------- Taille de l'échantillon ---------------- */

test('TAILLE — la formule suit population × facteur / dénominateur', () => {
    // 100 000 000 de population, 5 000 000 tolérables, aucune erreur
    // attendue, confiance 90 % → facteur 2,31.
    // n = 100 000 000 × 2,31 / 5 000 000 = 46,2 → 47
    const t = local(S.ecTaille(100000000, 5000000, 0, 90));
    assert.equal(t.facteur, 2.31);
    assert.equal(t.n, 47, 'taille d’échantillon incorrecte');
    assert.ok(proche(t.intervalle, 100000000 / 47), 'intervalle incohérent avec la taille');
});

test('TAILLE — l’erreur attendue étend l’échantillon par le facteur d’expansion', () => {
    // dénominateur = 5 000 000 − 1 000 000 × 1,5 = 3 500 000
    // n = 100 000 000 × 2,31 / 3 500 000 = 66 tout rond
    const t = local(S.ecTaille(100000000, 5000000, 1000000, 90));
    assert.equal(t.denominateur, 3500000);
    assert.equal(t.n, 66);
    const sans = local(S.ecTaille(100000000, 5000000, 0, 90));
    assert.ok(t.n > sans.n, 'une erreur attendue doit étendre le sondage');
});

test('TAILLE — un niveau de confiance plus élevé étend l’échantillon', () => {
    const tailles = [80, 85, 90, 95, 99].map(c => local(S.ecTaille(100000000, 5000000, 0, c)).n);
    for(let i = 1; i < tailles.length; i++)
        assert.ok(tailles[i] > tailles[i-1],
            `la confiance ${[80,85,90,95,99][i]} % doit exiger plus que la précédente`);
});

test('TAILLE — une erreur attendue qui absorbe le seuil rend le sondage impossible', () => {
    // 5 000 000 tolérables, 4 000 000 attendus × 1,5 = 6 000 000 : dénominateur négatif.
    // Aucun échantillon ne peut démontrer quoi que ce soit ; il faut le dire.
    const t = local(S.ecTaille(100000000, 5000000, 4000000, 90));
    assert.equal(t.n, 0);
    assert.match(t.alerte, /ne peut rien démontrer|absorbe/i);
    assert.match(t.alerte, /contrôle exhaustif/i, 'la solution de repli doit être indiquée');
});

test('TAILLE — les données manquantes ne produisent pas un faux résultat', () => {
    for(const [pop, tol] of [[0, 5000000], [100000000, 0], [0, 0]]){
        const t = local(S.ecTaille(pop, tol, 0, 90));
        assert.equal(t.n, 0);
        assert.ok(t.alerte, 'une donnée manquante doit être signalée, pas ignorée');
    }
});

test('TAILLE — un échantillon très étendu invite à reconsidérer l’approche', () => {
    const t = local(S.ecTaille(100000000, 1000000, 0, 99));
    assert.ok(t.n >= 250);
    assert.match(t.alerte, /exhaustif/i);
});

/* ---------------- Extrapolation ---------------- */

test('EXTRAPOLATION — une erreur sur un élément sondé se projette au prorata', () => {
    // Intervalle 1 000 000. Élément de 200 000 comptabilisé, 150 000 audité :
    // taux d'erreur 25 %, erreur projetée = 25 % × 1 000 000 = 250 000.
    const ex = local(S.ecExtrapoler([{ valeur:200000, correcte:150000 }], 1000000, 90));
    assert.equal(ex.nbErreurs, 1);
    assert.equal(ex.lignes[0].certain, false);
    assert.ok(proche(ex.lignes[0].taux, 25), 'taux d’erreur incorrect');
    assert.ok(proche(ex.lignes[0].projetee, 250000), 'projection incorrecte');
    assert.ok(proche(ex.projeteeSondee, 250000));
});

test('EXTRAPOLATION — une erreur sur un élément certain ne s’extrapole pas', () => {
    // Élément de 2 000 000 pour un intervalle de 1 000 000 : il a été examiné
    // en totalité, l'écart vaut tel quel. L'extrapoler le compterait deux fois.
    const ex = local(S.ecExtrapoler([{ valeur:2000000, correcte:1800000 }], 1000000, 90));
    assert.equal(ex.lignes[0].certain, true);
    assert.equal(ex.lignes[0].projetee, 200000, 'un élément certain ne se projette pas');
    assert.equal(ex.reelleCertaine, 200000);
    assert.equal(ex.projeteeSondee, 0);
});

test('EXTRAPOLATION — les deux segments se cumulent sans se confondre', () => {
    const ex = local(S.ecExtrapoler([
        { valeur:2000000, correcte:1800000 },   // certain : 200 000
        { valeur:200000,  correcte:150000  },   // sondé   : 250 000 projetés
    ], 1000000, 90));
    assert.equal(ex.reelleCertaine, 200000);
    assert.ok(proche(ex.projeteeSondee, 250000));
    assert.ok(proche(ex.projeteeTotale, 450000));
});

test('EXTRAPOLATION — un élément sans écart n’est pas compté comme anomalie', () => {
    const ex = local(S.ecExtrapoler([
        { valeur:500000, correcte:500000 },
        { valeur:300000, correcte:250000 },
    ], 1000000, 90));
    assert.equal(ex.nbErreurs, 1, 'seul l’élément en écart est une anomalie');
});

test('EXTRAPOLATION — la provision existe même sans aucune anomalie', () => {
    // C'est le cœur du raisonnement : n'avoir rien trouvé ne prouve pas
    // qu'il n'y a rien. La provision matérialise ce doute résiduel.
    const ex = local(S.ecExtrapoler([], 1000000, 90));
    assert.equal(ex.nbErreurs, 0);
    assert.equal(ex.projeteeTotale, 0);
    assert.ok(proche(ex.provision, 2.31 * 1000000), 'provision de base incorrecte');
    assert.equal(ex.maximale, ex.provision);
});

test('EXTRAPOLATION — l’erreur maximale probable dépasse toujours l’erreur projetée', () => {
    const ex = local(S.ecExtrapoler([{ valeur:200000, correcte:150000 }], 1000000, 90));
    assert.ok(ex.maximale > ex.projeteeTotale,
        'sans provision, on conclurait sur la seule erreur vue');
    assert.ok(proche(ex.maximale, ex.projeteeTotale + ex.provision));
});

/* ---------------- Conclusion ---------------- */

test('CONCLUSION — une erreur maximale supérieure au seuil interdit l’acceptation', () => {
    const c = local(S.ecConclusion(6000000, 5000000));
    assert.equal(c.ok, false);
    assert.match(c.texte, /DÉPASSE/);
    assert.match(c.texte, /opinion|étendez le sondage/i, 'les suites possibles doivent être dites');
});

test('CONCLUSION — une marge étroite est signalée comme telle', () => {
    const c = local(S.ecConclusion(4800000, 5000000));
    assert.equal(c.ok, true);
    assert.match(c.texte, /marge est étroite/);
});

test('CONCLUSION — une marge confortable conclut à l’acceptation', () => {
    const c = local(S.ecConclusion(1000000, 5000000));
    assert.equal(c.ok, true);
    assert.match(c.texte, /nettement inférieure/);
});

test('CONCLUSION — sans erreur tolérable, aucune conclusion n’est formulée', () => {
    const c = local(S.ecConclusion(1000000, 0));
    assert.equal(c.ok, null);
});

/* ---------------- Cohérence du barème ---------------- */

test('BARÈME — les facteurs croissent avec la confiance et le nombre d’erreurs', () => {
    const niveaux = [80, 85, 90, 95, 99];
    const F = local(S.EC_FIABILITE);
    for(const c of niveaux){
        assert.equal(F[c].length, 6, `barème incomplet pour ${c} %`);
        for(let k = 1; k < F[c].length; k++)
            assert.ok(F[c][k] > F[c][k-1], `${c} % : facteur non croissant en ${k} erreurs`);
    }
    for(let i = 1; i < niveaux.length; i++)
        for(let k = 0; k < 6; k++)
            assert.ok(F[niveaux[i]][k] > F[niveaux[i-1]][k],
                `facteur non croissant entre ${niveaux[i-1]} % et ${niveaux[i]} % à ${k} erreurs`);
});

test('BARÈME — chaque niveau de confiance proposé a ses deux facteurs', () => {
    for(const c of local(S.EC_CONFIANCES)){
        assert.ok(local(S.EC_FIABILITE)[c.v], `pas de facteur de fiabilité pour ${c.v} %`);
        assert.ok(local(S.EC_EXPANSION)[c.v], `pas de facteur d’expansion pour ${c.v} %`);
        assert.match(c.lib, /%/, 'le libellé doit porter le niveau');
    }
});

test('BARÈME — les valeurs de référence à 95 % sont celles des tables publiées', () => {
    // Repères vérifiables : 3,00 sans erreur et 4,75 avec une erreur.
    const F = local(S.EC_FIABILITE);
    assert.equal(F[95][0], 3.00);
    assert.equal(F[95][1], 4.75);
    assert.equal(F[99][0], 4.61);
    assert.equal(local(S.EC_EXPANSION)[95], 1.6);
});
