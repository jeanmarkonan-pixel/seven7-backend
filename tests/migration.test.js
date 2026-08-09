/* ==================================================================
   PHASE 1 — MIGRATION DES CABINETS VERS LE NOUVEAU SCHÉMA

   La fonction de transformation (migrerCabinet) est pure : ces tests
   ne dépendent d'aucun émulateur et tournent toujours. Ils vérifient
   en particulier qu'aucune information absente de l'ancien document
   (raison sociale, administrateur) n'est jamais devinée — la migration
   doit échouer explicitement plutôt qu'inventer une valeur.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { migrerCabinet, membreAdmin } from '../migration/migrer-cabinet.mjs';
import { PLANS, trouverPlan, SEUIL_ILLIMITE } from '../migration/plans.mjs';

const MAINTENANT = new Date('2026-08-09T00:00:00Z');

const PARAMETRES_KONAN = {
    codeCabinet: 'konan2026', // volontairement en minuscules : doit être normalisé
    raisonSociale: 'Cabinet Konan & Associés',
    emailContact: 'admin@cabinet-konan.example',
    adminPrincipalUid: 'uid-admin-konan',
};

/* ---------- Référentiel des paliers ------------------------------------ */

test('PLANS — les trois paliers du cahier des charges sont présents', () => {
    assert.deepEqual(PLANS.map((p) => p.id), ['STARTER', 'PRO', 'CABINET']);
});

test('PLANS — STARTER et PRO respectent les plafonds du cahier des charges (§8)', () => {
    assert.equal(trouverPlan('STARTER').quotaDossiers, 5);
    assert.equal(trouverPlan('STARTER').quotaCollaborateurs, 2);
    assert.equal(trouverPlan('PRO').quotaDossiers, 20);
    assert.equal(trouverPlan('PRO').quotaCollaborateurs, 6);
});

test('PLANS — CABINET est « illimité », représenté par un plafond très grand', () => {
    assert.equal(trouverPlan('CABINET').quotaDossiers, SEUIL_ILLIMITE);
    assert.equal(trouverPlan('CABINET').quotaCollaborateurs, SEUIL_ILLIMITE);
});

test('PLANS — aucun prix n’est renseigné : à la charge de l’exploitant', () => {
    for (const plan of PLANS) assert.equal(plan.prixAnnuel, null);
});

test('trouverPlan — un palier inconnu renvoie null, jamais une exception', () => {
    assert.equal(trouverPlan('PREMIUM_INEXISTANT'), null);
});

/* ---------- Migration d'un cabinet -------------------------------------- */

test('MIGRATION — cas nominal, reprend le compteur et normalise le code', () => {
    const ancien = { palier: 'STARTER', plafondDossiers: 5, dossiersCreesAnnee: 3 };
    const { document, avertissements } = migrerCabinet(ancien, PARAMETRES_KONAN, MAINTENANT);

    assert.equal(document.codeCabinet, 'KONAN2026', 'le code doit être normalisé en majuscules');
    assert.equal(document.plan, 'STARTER');
    assert.equal(document.quotaDossiers, 5);
    assert.equal(document.dossiersUtilises, 3, 'le compteur existant est repris tel quel, jamais recalculé');
    assert.equal(document.statut, 'ACTIF');
    assert.equal(document.adminPrincipalUid, 'uid-admin-konan');
    assert.equal(document.migreDepuisAncienSchema, true);
    assert.deepEqual(avertissements, []);
});

test('MIGRATION — sans raison sociale, échoue explicitement plutôt que d’inventer une valeur', () => {
    const ancien = { palier: 'STARTER', plafondDossiers: 5, dossiersCreesAnnee: 3 };
    const { raisonSociale, ...sansRaison } = PARAMETRES_KONAN;
    assert.throws(() => migrerCabinet(ancien, sansRaison, MAINTENANT), /raisonSociale/);
});

test('MIGRATION — sans administrateur, échoue explicitement', () => {
    const ancien = { palier: 'STARTER', plafondDossiers: 5, dossiersCreesAnnee: 3 };
    const { adminPrincipalUid, ...sansAdmin } = PARAMETRES_KONAN;
    assert.throws(() => migrerCabinet(ancien, sansAdmin, MAINTENANT), /adminPrincipalUid/);
});

test('MIGRATION — un palier disparu ou renommé fait échouer la migration', () => {
    const ancien = { palier: 'PREMIUM_ANCIEN', plafondDossiers: 999, dossiersCreesAnnee: 0 };
    assert.throws(() => migrerCabinet(ancien, PARAMETRES_KONAN, MAINTENANT), /palier/);
});

test('MIGRATION — un plafond d’ancien document divergent du palier est signalé, pas silencieux', () => {
    // Le cahier des charges (§1) annonce KONAN2026 à 5 dossiers/an pour le
    // palier Starter, ce qui concorde — mais si un cabinet avait un
    // plafond négocié individuellement, ce cas doit être visible.
    const ancien = { palier: 'STARTER', plafondDossiers: 8, dossiersCreesAnnee: 2 };
    const { document, avertissements } = migrerCabinet(ancien, PARAMETRES_KONAN, MAINTENANT);
    assert.equal(document.quotaDossiers, 5, 'le plafond retenu est celui du palier, pas l’ancien champ');
    assert.equal(avertissements.length, 1);
    assert.match(avertissements[0], /diverge/);
});

test('MIGRATION — le compteur à zéro reste à zéro, jamais transformé en absence de champ', () => {
    const ancien = { palier: 'PRO', plafondDossiers: 20, dossiersCreesAnnee: 0 };
    const { document } = migrerCabinet(ancien, PARAMETRES_KONAN, MAINTENANT);
    assert.equal(document.dossiersUtilises, 0);
});

test('MIGRATION — sans document ancien, échoue explicitement', () => {
    assert.throws(() => migrerCabinet(null, PARAMETRES_KONAN, MAINTENANT), /ancien document/);
});

test('MIGRATION — exerciceAbonnement par défaut à l’année de l’exécution', () => {
    const ancien = { palier: 'STARTER', plafondDossiers: 5, dossiersCreesAnnee: 1 };
    const { document } = migrerCabinet(ancien, PARAMETRES_KONAN, MAINTENANT);
    assert.equal(document.exerciceAbonnement, '2026');
});

/* ---------- Membre administrateur --------------------------------------- */

test('membreAdmin — porte le rôle ADMIN, actif, sans dossier affecté par défaut', () => {
    const m = membreAdmin('uid-1', 'Konan', 'admin@cabinet-konan.example', MAINTENANT);
    assert.equal(m.role, 'ADMIN');
    assert.equal(m.actif, true);
    assert.deepEqual(m.dossiersAffectes, []);
});
