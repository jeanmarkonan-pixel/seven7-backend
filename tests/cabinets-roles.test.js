/* ==================================================================
   PHASE 2 — RÈGLES DE SÉCURITÉ DU NOUVEAU MODÈLE (CABINETS/RÔLES/PALIERS)

   Complète tests/rules.test.js (ancien modèle, inchangé) sans le
   remplacer. Ces tests tournent contre l'émulateur Firestore, jamais
   contre le projet réel :

       npm run emulateur     # dans un premier terminal
       npm --prefix . test tests/cabinets-roles.test.js   # dans un second

   Sans émulateur, les tests sont ignorés plutôt que déclarés en échec.

   Les six tentatives d'intrusion exigées par le cahier des charges
   (§6) sont marquées « EXIGÉE §6 » ci-dessous ; le reste couvre les
   cas limites trouvés en écrivant les règles (collision de séquence,
   cabinet suspendu, auto-désactivation d'un admin).
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
} from '@firebase/rules-unit-testing';
import { RACINE } from './harness.js';

const HOTE = '127.0.0.1';
const PORT = 8080;

let dispo = false;
try {
    const r = await fetch(`http://${HOTE}:${PORT}/`, { signal: AbortSignal.timeout(1500) });
    dispo = r.status < 500;
} catch { dispo = false; }

const opts = dispo ? {} : { skip: 'émulateur Firestore injoignable — lancez `npm run emulateur`' };

let env;
if (dispo) {
    env = await initializeTestEnvironment({
        // Même projectId que tests/rules.test.js et tests/creation-collaborateur.test.js
        // — pas un choix, une contrainte : firebase.json déclare
        // singleProjectMode: true, et les émulateurs n'acceptent alors
        // qu'un seul projet réel, quel que soit celui demandé côté client.
        // Un projectId différent le fait échouer silencieusement pour
        // Firestore et explicitement pour Auth (auth/user-not-found), pas
        // l'isoler. La séparation entre fichiers qui partagent tous la même
        // base (chacun vide la sienne via clearFirestore/semer) vient donc
        // d'ailleurs : voir package.json, "test" tourne avec
        // --test-concurrency=1 précisément pour ça.
        projectId: 'seven7-audit-test',
        firestore: {
            host: HOTE, port: PORT,
            rules: fs.readFileSync(path.join(RACINE, 'firestore.rules'), 'utf8'),
        },
    });
    test.after(() => env.cleanup());
}

/* --- acteurs ---------------------------------------------------------
   Cabinet KONAN (actif, quota 2/5), admin = ADM, collaborateur = COL,
   affecté au seul dossier "1". Cabinet AUTRE, complètement étanche. */
const ADM = 'uid-admin-konan';
const COL = 'uid-collab-konan';
const AUTRE_ADM = 'uid-admin-autre';

const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

async function semer() {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
        const d = ctx.firestore();
        await d.doc('cabinets/KONAN2026').set({
            codeCabinet: 'KONAN2026', raisonSociale: 'Cabinet Konan & Associés',
            plan: 'STARTER', quotaDossiers: 5, dossiersUtilises: 2,
            statut: 'ACTIF', adminPrincipalUid: ADM,
        });
        await d.doc('cabinets/KONAN2026/membres/' + ADM).set({
            uid: ADM, nom: 'Admin Konan', role: 'ADMIN', actif: true, dossiersAffectes: [],
        });
        await d.doc('cabinets/KONAN2026/membres/' + COL).set({
            uid: COL, nom: 'Collaborateur', role: 'COLLABORATEUR', actif: true, dossiersAffectes: ['1'],
        });
        await d.doc('cabinets/KONAN2026/dossiers/1').set({
            intitule: 'Dossier 1', creePar: ADM, statut: 'EN_COURS',
            liasseVerrouillee: true, numeroSequence: 1,
        });
        await d.doc('cabinets/KONAN2026/dossiers/2').set({
            intitule: 'Dossier 2 (non affecté à COL)', creePar: ADM, statut: 'EN_COURS',
            liasseVerrouillee: true, numeroSequence: 2,
        });

        await d.doc('cabinets/AUTRE').set({
            codeCabinet: 'AUTRE', raisonSociale: 'Autre Cabinet',
            plan: 'STARTER', quotaDossiers: 5, dossiersUtilises: 0,
            statut: 'ACTIF', adminPrincipalUid: AUTRE_ADM,
        });
        await d.doc('cabinets/AUTRE/membres/' + AUTRE_ADM).set({
            uid: AUTRE_ADM, nom: 'Admin Autre', role: 'ADMIN', actif: true, dossiersAffectes: [],
        });
        await d.doc('cabinets/AUTRE/dossiers/1').set({
            intitule: 'Dossier confidentiel autre cabinet', creePar: AUTRE_ADM,
            statut: 'EN_COURS', liasseVerrouillee: true, numeroSequence: 1,
        });

        // Cabinet au quota déjà atteint, pour le test de dépassement.
        await d.doc('cabinets/PLEIN').set({
            codeCabinet: 'PLEIN', raisonSociale: 'Cabinet au plafond',
            plan: 'STARTER', quotaDossiers: 5, dossiersUtilises: 5,
            statut: 'ACTIF', adminPrincipalUid: ADM,
        });
        await d.doc('cabinets/PLEIN/membres/' + ADM).set({
            uid: ADM, nom: 'Admin Konan', role: 'ADMIN', actif: true, dossiersAffectes: [],
        });

        // Cabinet suspendu.
        await d.doc('cabinets/SUSPENDU').set({
            codeCabinet: 'SUSPENDU', raisonSociale: 'Cabinet suspendu',
            plan: 'STARTER', quotaDossiers: 5, dossiersUtilises: 1,
            statut: 'SUSPENDU', adminPrincipalUid: ADM,
        });
        await d.doc('cabinets/SUSPENDU/membres/' + ADM).set({
            uid: ADM, nom: 'Admin Konan', role: 'ADMIN', actif: true, dossiersAffectes: [],
        });
    });
}

/* ---------- Les six tentatives d'intrusion exigées (§6) ----------------- */

test('EXIGÉE §6 — un collaborateur ne peut pas créer un dossier', opts, async () => {
    await semer();
    await assertFails(db(COL).doc('cabinets/KONAN2026/dossiers/3').set({
        intitule: 'Intrus', creePar: COL, statut: 'EN_COURS',
        liasseVerrouillee: true, numeroSequence: 3,
    }));
});

test('EXIGÉE §6 — un collaborateur ne peut pas écrire dans un document de dossier (liasse)', opts, async () => {
    await semer();
    await assertFails(db(COL).doc('cabinets/KONAN2026/dossiers/1').update({ statut: 'CLOTURE' }));
});

test('EXIGÉE §6 — un admin ne peut pas créer un dossier au-delà du quota', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('cabinets/PLEIN/dossiers/6').set({
        intitule: 'Au-delà du quota', creePar: ADM, statut: 'EN_COURS',
        liasseVerrouillee: true, numeroSequence: 6,
    }));
});

test('EXIGÉE §6 — un admin ne peut pas modifier quotaDossiers ou plan', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('cabinets/KONAN2026').update({ quotaDossiers: 999 }));
    await assertFails(db(ADM).doc('cabinets/KONAN2026').update({ plan: 'CABINET' }));
    await assertFails(db(ADM).doc('cabinets/KONAN2026').update({ statut: 'ACTIF', quotaDossiers: 999 }));
});

test('EXIGÉE §6 — un membre du cabinet A ne lit pas un dossier du cabinet B', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('cabinets/AUTRE/dossiers/1').get());
    await assertFails(db(COL).doc('cabinets/AUTRE/dossiers/1').get());
});

test('EXIGÉE §6 — écriture directe sur dossiersUtilises avec un incrément de +5', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('cabinets/KONAN2026').update({ dossiersUtilises: 7 }));
});

/* ---------- Couverture complémentaire ------------------------------------ */

test('CRÉATION — un admin crée un dossier dans son quota, au bon numéro de séquence', opts, async () => {
    await semer();
    await assertSucceeds(db(ADM).doc('cabinets/KONAN2026/dossiers/3').set({
        intitule: 'Dossier 3', creePar: ADM, statut: 'EN_COURS',
        liasseVerrouillee: true, numeroSequence: 3,
    }));
});

test('CRÉATION — se déclarer créateur au nom d’un autre uid est refusé', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('cabinets/KONAN2026/dossiers/3').set({
        intitule: 'Dossier 3', creePar: COL, statut: 'EN_COURS',
        liasseVerrouillee: true, numeroSequence: 3,
    }));
});

test('CRÉATION — un numeroSequence qui ne correspond pas à dossiersUtilises + 1 est refusé', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('cabinets/KONAN2026/dossiers/9').set({
        intitule: 'Numéro fantaisiste', creePar: ADM, statut: 'EN_COURS',
        liasseVerrouillee: true, numeroSequence: 9,
    }));
});

test('MODIFICATION — creePar et numeroSequence sont immuables après création', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('cabinets/KONAN2026/dossiers/1').update({ creePar: COL }));
    await assertFails(db(ADM).doc('cabinets/KONAN2026/dossiers/1').update({ numeroSequence: 99 }));
    // Un autre champ, lui, reste modifiable par l'admin.
    await assertSucceeds(db(ADM).doc('cabinets/KONAN2026/dossiers/1').update({ statut: 'CLOTURE' }));
});

test('COMPTEUR — l’incrément de +1 exact est accepté', opts, async () => {
    await semer();
    await assertSucceeds(db(ADM).doc('cabinets/KONAN2026').update({ dossiersUtilises: 3 }));
});

test('COMPTEUR — un collaborateur ne peut jamais toucher le compteur', opts, async () => {
    await semer();
    await assertFails(db(COL).doc('cabinets/KONAN2026').update({ dossiersUtilises: 3 }));
});

test('CABINET SUSPENDU — aucune création de dossier, même dans le quota', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('cabinets/SUSPENDU/dossiers/2').set({
        intitule: 'Malgré la suspension', creePar: ADM, statut: 'EN_COURS',
        liasseVerrouillee: true, numeroSequence: 2,
    }));
});

test('CABINET SUSPENDU — le compteur ne peut pas non plus être incrémenté', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('cabinets/SUSPENDU').update({ dossiersUtilises: 2 }));
});

test('LECTURE — un collaborateur lit le dossier qui lui est affecté', opts, async () => {
    await semer();
    await assertSucceeds(db(COL).doc('cabinets/KONAN2026/dossiers/1').get());
});

test('LECTURE — un collaborateur ne lit pas un dossier qui ne lui est pas affecté', opts, async () => {
    await semer();
    await assertFails(db(COL).doc('cabinets/KONAN2026/dossiers/2').get());
});

test('LECTURE — un admin lit tous les dossiers de son cabinet, affectés ou non', opts, async () => {
    await semer();
    await assertSucceeds(db(ADM).doc('cabinets/KONAN2026/dossiers/1').get());
    await assertSucceeds(db(ADM).doc('cabinets/KONAN2026/dossiers/2').get());
});

test('LECTURE — un utilisateur non authentifié ne lit rien', opts, async () => {
    await semer();
    await assertFails(db(null).doc('cabinets/KONAN2026').get());
    await assertFails(db(null).doc('cabinets/KONAN2026/dossiers/1').get());
});

test('SUPPRESSION — un collaborateur ne peut pas supprimer un dossier', opts, async () => {
    await semer();
    await assertFails(db(COL).doc('cabinets/KONAN2026/dossiers/1').delete());
});

test('SUPPRESSION — un admin peut supprimer un dossier de son cabinet', opts, async () => {
    await semer();
    await assertSucceeds(db(ADM).doc('cabinets/KONAN2026/dossiers/2').delete());
});

test('MEMBRES — un admin peut ajouter un collaborateur', opts, async () => {
    await semer();
    await assertSucceeds(db(ADM).doc('cabinets/KONAN2026/membres/uid-nouveau').set({
        uid: 'uid-nouveau', nom: 'Nouveau', role: 'COLLABORATEUR', actif: true, dossiersAffectes: [],
    }));
});

test('MEMBRES — un collaborateur ne peut pas s’auto-promouvoir admin', opts, async () => {
    await semer();
    await assertFails(db(COL).doc('cabinets/KONAN2026/membres/' + COL).update({ role: 'ADMIN' }));
});

test('MEMBRES — un admin ne peut pas se désactiver lui-même (cabinet orphelin de tout admin)', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('cabinets/KONAN2026/membres/' + ADM).update({ actif: false }));
});

test('MEMBRES — un admin peut désactiver un collaborateur', opts, async () => {
    await semer();
    await assertSucceeds(db(ADM).doc('cabinets/KONAN2026/membres/' + COL).update({ actif: false }));
});

/* ---------- Connexion collaborateur par e-mail (phase 3) ------------------ */

test('MEMBRES — un utilisateur authentifié lit TOUJOURS son propre document membre, même absent', opts, async () => {
    await semer();
    // C'est ce que fait l'écran de connexion juste après signInWithEmailAndPassword,
    // AVANT de savoir si la personne appartient à ce cabinet : la lecture doit
    // réussir et renvoyer « inexistant », jamais lever une exception — sinon
    // impossible d'afficher « vous n'êtes pas membre de ce cabinet » plutôt
    // qu'une erreur technique.
    const snap = await db(AUTRE_ADM).doc('cabinets/KONAN2026/membres/' + AUTRE_ADM).get();
    assert.equal(snap.exists, false);
});

test('MEMBRES — un utilisateur ne peut pas lire le document membre de quelqu’un d’autre par ce biais', opts, async () => {
    await semer();
    await assertFails(db(AUTRE_ADM).doc('cabinets/KONAN2026/membres/' + ADM).get());
    await assertFails(db(AUTRE_ADM).doc('cabinets/KONAN2026/membres/' + COL).get());
});

test('COLLABORATEUR — lit son dossier affecté, jamais un autre, jamais un autre cabinet', opts, async () => {
    await semer();
    await assertSucceeds(db(COL).doc('cabinets/KONAN2026/dossiers/1').get());
    await assertFails(db(COL).doc('cabinets/KONAN2026/dossiers/2').get());
    await assertFails(db(COL).doc('cabinets/AUTRE/dossiers/1').get());
});

test('COLLABORATEUR DÉSACTIVÉ — perd l’accès à ses dossiers dès la désactivation, pas seulement à l’écran', opts, async () => {
    await semer();
    // Avant désactivation : accès normal.
    await assertSucceeds(db(COL).doc('cabinets/KONAN2026/dossiers/1').get());

    await db(ADM).doc('cabinets/KONAN2026/membres/' + COL).update({ actif: false });

    // Le document membre reste lisible par son propriétaire (il doit pouvoir
    // savoir POURQUOI il est refusé, pas recevoir une erreur muette), mais
    // dit actif: false — et la règle de lecture du DOSSIER, elle, se ferme
    // réellement : ce n'est pas l'écran qui protège, c'est la règle.
    const snap = await db(COL).doc('cabinets/KONAN2026/membres/' + COL).get();
    assert.equal(snap.data().actif, false);
    await assertFails(db(COL).doc('cabinets/KONAN2026/dossiers/1').get());
});

test('CABINET — création et suppression du document cabinet lui-même sont toujours refusées côté client', opts, async () => {
    await semer();
    await assertFails(db(ADM).doc('cabinets/NOUVEAU').set({
        codeCabinet: 'NOUVEAU', raisonSociale: 'Auto-créé', plan: 'STARTER',
        quotaDossiers: 5, dossiersUtilises: 0, statut: 'ACTIF', adminPrincipalUid: ADM,
    }));
    await assertFails(db(ADM).doc('cabinets/KONAN2026').delete());
});
