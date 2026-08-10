/* ==================================================================
   PHASE 5 (suite) — LIAISON D'UN DOSSIER ANCIEN, BOUT EN BOUT

   Reproduit exactement cabinetLierDossierExistant() (src/js/10-config-
   collaboration.js) avec le VRAI SDK client, pas seulement les règles en
   isolation (déjà couvertes par tests/liaison-dossier.test.js) : preuve
   qu'une app secondaire vérifie le mot de passe du dossier sans jamais
   toucher la session admin, que la fiche cabinets/{code}/dossiers est
   créée avant le lien, que le quota est incrémenté, et que le lien final
   s'écrit — le tout enchaîné sous la session RÉELLE de l'admin.

   Couvre aussi le scénario de rollback : mot de passe Auth correct, mais
   le champ Firestore "password" a déjà été supprimé par la migration
   authUid (voir collabJoin) — la fiche cabinets/{code}/dossiers doit être
   nettoyée (delete), pas laissée orpheline.

   Exige LES DEUX émulateurs (Firestore et Auth), comme
   tests/creation-collaborateur.test.js.
   ================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';

const HOTE = '127.0.0.1';
const PORT_FIRESTORE = 8080;
const PORT_AUTH = 9099;

async function joignable(port) {
    try {
        const r = await fetch(`http://${HOTE}:${port}/`, { signal: AbortSignal.timeout(1500) });
        return r.status < 500;
    } catch { return false; }
}

const dispoFirestore = await joignable(PORT_FIRESTORE);
const dispoAuth = await joignable(PORT_AUTH);
const dispo = dispoFirestore && dispoAuth;

const opts = dispo ? {} : {
    skip: 'émulateurs Firestore/Auth injoignables — lancez `firebase emulators:start --only firestore,auth --project seven7-audit-test`',
};

async function preparerEnvironnement(suffixe) {
    process.env.FIRESTORE_EMULATOR_HOST = `${HOTE}:${PORT_FIRESTORE}`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `${HOTE}:${PORT_AUTH}`;

    const { initializeApp } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    const { getFirestore } = await import('firebase-admin/firestore');
    const firebaseCompat = (await import('firebase/compat/app')).default;
    await import('firebase/compat/auth');
    await import('firebase/compat/firestore');

    const projectId = 'seven7-audit-test'; // singleProjectMode: true — voir creation-collaborateur.test.js
    const emailAdmin = `admin-liaison-${suffixe}@konan-test.ci`;
    const code = `LIAISONE2E${suffixe}`;
    const dossierId = `dossierliaison${suffixe}`;
    const motDePasseDossier = 'motdepassedossier123';

    const adminApp = initializeApp({ projectId }, `amorce-liaison-${suffixe}`);
    const adminAuth = getAuth(adminApp);
    const adminDb = getFirestore(adminApp);

    const adminUser = await adminAuth.createUser({ email: emailAdmin, password: 'motdepasseadmin123' });
    await adminDb.doc(`cabinets/${code}`).set({
        codeCabinet: code, raisonSociale: 'Cabinet Liaison E2E', plan: 'STARTER',
        quotaDossiers: 5, dossiersUtilises: 0, statut: 'ACTIF', adminPrincipalUid: adminUser.uid,
    });
    await adminDb.doc(`cabinets/${code}/membres/${adminUser.uid}`).set({
        uid: adminUser.uid, nom: 'Admin E2E', email: emailAdmin, role: 'ADMIN', actif: true, dossiersAffectes: [],
    });

    // Le dossier ANCIEN, avec son propre compte Auth (dossier-{id}@…) — exactement
    // comme un dossier réel migré, SANS le champ "password" (déjà supprimé par
    // collabJoin lors de sa migration, voir la note dans 10-config-collaboration.js).
    const dossierUser = await adminAuth.createUser({
        email: `dossier-${dossierId}@seven7-audit.local`, password: motDePasseDossier,
    });
    await adminDb.doc(`seven7_dossiers/${dossierId}`).set({ authUid: dossierUser.uid, raison: 'Dossier ancien e2e' });

    const FIREBASE_CONFIG = { apiKey: 'fake-key-emulateur', authDomain: 'seven7-audit.firebaseapp.com', projectId };
    const app = firebaseCompat.initializeApp(FIREBASE_CONFIG, `principale-liaison-${suffixe}`);
    app.auth().useEmulator(`http://${HOTE}:${PORT_AUTH}`);
    app.firestore().useEmulator(HOTE, PORT_FIRESTORE);
    await app.auth().signInWithEmailAndPassword(emailAdmin, 'motdepasseadmin123');

    return { firebaseCompat, FIREBASE_CONFIG, app, adminApp, adminAuth, adminDb, code, dossierId, motDePasseDossier, adminUser };
}

// Reproduction fidèle de cabinetLierDossierExistant() : app secondaire pour
// vérifier le mot de passe, puis fiche + quota + lien sous la session admin.
async function lierDossier({ firebaseCompat, FIREBASE_CONFIG, app, code, dossierId, motDePasse, suffixe }) {
    const db = app.firestore();
    const appSecondaire = firebaseCompat.initializeApp(FIREBASE_CONFIG, `secondaire-liaison-${suffixe}-${Date.now()}`);
    const authSecondaire = appSecondaire.auth();
    authSecondaire.useEmulator(`http://${HOTE}:${PORT_AUTH}`);

    await authSecondaire.signInWithEmailAndPassword(`dossier-${dossierId}@seven7-audit.local`, motDePasse);
    await authSecondaire.signOut().catch(() => {});
    await appSecondaire.delete().catch(() => {});

    const cabDoc = await db.collection('cabinets').doc(code).get();
    const c = cabDoc.data();
    const nouveauRef = db.collection('cabinets').doc(code).collection('dossiers').doc();
    await nouveauRef.set({
        intitule: 'Dossier lié E2E', creePar: app.auth().currentUser.uid, statut: 'EN_COURS',
        liasseVerrouillee: true, numeroSequence: c.dossiersUtilises + 1, dossierAncienId: dossierId,
    });
    await db.collection('cabinets').doc(code).update({ dossiersUtilises: firebaseCompat.firestore.FieldValue.increment(1) });

    try {
        await db.collection('seven7_dossiers').doc(dossierId).update({
            cabinetCode: code, dossierNouveauId: nouveauRef.id, password: motDePasse,
        });
    } catch (errLiaison) {
        await nouveauRef.delete().catch(() => {});
        throw errLiaison;
    }
    return nouveauRef.id;
}

test('LIAISON E2E — flux complet : app secondaire, fiche, quota, lien — session admin intacte', opts, async () => {
    const env = await preparerEnvironnement(Date.now());
    // Le dossier ancien N'A PAS de champ "password" (déjà migré) — pour que
    // le lien Firestore final réussisse, il faut donc le poser nous-mêmes
    // AVANT le test, exactement comme un dossier qui n'a JAMAIS migré
    // (encore protégé par mot de passe en clair, cas réel pour un dossier
    // dont personne ne s'est reconnecté depuis le déploiement de la
    // migration authUid).
    await env.adminDb.doc(`seven7_dossiers/${env.dossierId}`).update({ password: env.motDePasseDossier });

    const nouvelId = await lierDossier({ ...env, motDePasse: env.motDePasseDossier, suffixe: 'ok' + Date.now() });

    assert.equal(env.app.auth().currentUser.uid, env.adminUser.uid,
        "la session admin doit rester intacte après la liaison (app secondaire jamais confondue avec l'app principale)");

    const dossierLie = await env.adminDb.doc(`seven7_dossiers/${env.dossierId}`).get();
    assert.equal(dossierLie.data().cabinetCode, env.code);
    assert.equal(dossierLie.data().dossierNouveauId, nouvelId);

    const cabDoc = await env.adminDb.doc(`cabinets/${env.code}`).get();
    assert.equal(cabDoc.data().dossiersUtilises, 1, 'le quota doit être incrémenté exactement une fois');

    const ficheDoc = await env.adminDb.doc(`cabinets/${env.code}/dossiers/${nouvelId}`).get();
    assert.equal(ficheDoc.data().dossierAncienId, env.dossierId);

    await env.app.delete().catch(() => {});
    await env.adminApp.delete().catch(() => {});
});

test('LIAISON E2E — dossier déjà migré (pas de champ password) : rollback propre de la fiche, quota non récupéré', opts, async () => {
    const env = await preparerEnvironnement(Date.now() + 1);
    // Ici on NE pose PAS le champ "password" : reproduit fidèlement un
    // dossier déjà migré vers l'authentification moderne (le cas signalé
    // à l'utilisateur, qu'il a choisi de ne pas corriger pour l'instant).

    await assert.rejects(
        () => lierDossier({ ...env, motDePasse: env.motDePasseDossier, suffixe: 'echec' + Date.now() }),
        'la liaison finale doit échouer côté règles (resource.data.password absent)'
    );

    const cabDoc = await env.adminDb.doc(`cabinets/${env.code}`).get();
    assert.equal(cabDoc.data().dossiersUtilises, 1,
        'le quota reste consommé après le rollback (résidu documenté : aucune Cloud Function pour le décrémenter)');

    const fichesRestantes = await env.adminDb.collection(`cabinets/${env.code}/dossiers`).get();
    assert.equal(fichesRestantes.size, 0, 'la fiche orpheline doit avoir été supprimée par le rollback, pas laissée en place');

    const dossierNonLie = await env.adminDb.doc(`seven7_dossiers/${env.dossierId}`).get();
    assert.equal(dossierNonLie.data().cabinetCode, undefined, 'le dossier ancien ne doit porter aucune trace de liaison partielle');

    await env.app.delete().catch(() => {});
    await env.adminApp.delete().catch(() => {});
});
