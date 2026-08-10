/* ==================================================================
   PHASE 4 — CRÉATION D'UN COMPTE COLLABORATEUR PAR L'ADMIN

   Reproduit exactement cabinetCreerCollaborateur() (src/js/10-config-
   collaboration.js) : une app Firebase SECONDAIRE crée le compte Auth
   du collaborateur, se ferme, puis le document membre est écrit via
   l'app PRINCIPALE (session admin).

   Le risque réel que ce test couvre : firebase.auth().createUserWithEmailAndPassword()
   appelé sur l'app PRINCIPALE reconnecterait automatiquement le
   navigateur sur le compte fraîchement créé, déconnectant l'admin —
   piège classique du SDK client, documenté dans le code. Sans ce
   test, une régression qui réintroduirait l'appel sur la mauvaise app
   ne serait détectée qu'en production, par un admin qui se retrouve
   soudain déconnecté au milieu d'un onboarding.

   Exige LES DEUX émulateurs (Firestore et Auth), pas seulement
   Firestore comme les autres tests de ce dossier :

       firebase emulators:start --only firestore,auth --project seven7-audit-test
       node --test tests/creation-collaborateur.test.js

   Sans les deux, le test est ignoré plutôt que déclaré en échec.
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
    skip: dispoFirestore
        ? 'émulateur Auth injoignable — lancez `firebase emulators:start --only firestore,auth --project seven7-audit-test`'
        : 'émulateurs Firestore/Auth injoignables — lancez `firebase emulators:start --only firestore,auth --project seven7-audit-test`',
};

test('ADMIN crée un collaborateur : session admin intacte, compte Auth réel, document membre correct', opts, async () => {
    process.env.FIRESTORE_EMULATOR_HOST = `${HOTE}:${PORT_FIRESTORE}`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `${HOTE}:${PORT_AUTH}`;

    const { initializeApp } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    const { getFirestore } = await import('firebase-admin/firestore');
    const firebaseCompat = (await import('firebase/compat/app')).default;
    await import('firebase/compat/auth');
    await import('firebase/compat/firestore');

    const suffixe = Date.now();
    const emailAdmin = `admin-${suffixe}@konan-test.ci`;
    const emailCollab = `collab-${suffixe}@konan-test.ci`;
    const code = `KONANTEST${suffixe}`;
    // MÊME projectId que tests/rules.test.js et tests/cabinets-roles.test.js —
    // pas un choix. firebase.json déclare singleProjectMode: true : les deux
    // émulateurs n'acceptent qu'un seul projet réel. Testé empiriquement : un
    // projectId différent laisse admin.createUser() réussir en apparence, mais
    // la connexion cliente échoue ensuite en auth/user-not-found — l'émulateur
    // Auth, contrairement à Firestore, refuse net un projet qu'il ne reconnaît
    // pas comme LE projet. La séparation d'avec rules.test.js et
    // cabinets-roles.test.js (qui vident leur base via clearFirestore) vient
    // de --test-concurrency=1 dans package.json, pas d'un projectId dédié.
    const projectId = 'seven7-audit-test';

    // ---------- Amorçage par firebase-admin (bypass des règles) ----------
    const adminApp = initializeApp({ projectId }, `amorce-${suffixe}`);
    const adminAuth = getAuth(adminApp);
    const adminDb = getFirestore(adminApp);

    const adminUser = await adminAuth.createUser({ email: emailAdmin, password: 'motdepasseadmin123' });
    await adminDb.doc(`cabinets/${code}`).set({
        codeCabinet: code, raisonSociale: 'Cabinet Test', plan: 'STARTER',
        quotaDossiers: 5, dossiersUtilises: 0, statut: 'ACTIF', adminPrincipalUid: adminUser.uid,
    });
    await adminDb.doc(`cabinets/${code}/membres/${adminUser.uid}`).set({
        uid: adminUser.uid, nom: 'Admin Test', email: emailAdmin,
        role: 'ADMIN', actif: true, dossiersAffectes: [],
    });

    // ---------- Côté client : exactement le parcours de l'app ----------
    const FIREBASE_CONFIG = { apiKey: 'fake-key-emulateur', authDomain: 'seven7-audit.firebaseapp.com', projectId };
    const app = firebaseCompat.initializeApp(FIREBASE_CONFIG, `principale-${suffixe}`);
    app.auth().useEmulator(`http://${HOTE}:${PORT_AUTH}`);
    app.firestore().useEmulator(HOTE, PORT_FIRESTORE);

    await app.auth().signInWithEmailAndPassword(emailAdmin, 'motdepasseadmin123');
    assert.equal(app.auth().currentUser.uid, adminUser.uid, 'pré-condition : admin bien connecté avant la création');

    // ---------- Reproduction de cabinetCreerCollaborateur() ----------
    const appSecondaire = firebaseCompat.initializeApp(FIREBASE_CONFIG, `equipe-${suffixe}`);
    appSecondaire.auth().useEmulator(`http://${HOTE}:${PORT_AUTH}`);

    const cred = await appSecondaire.auth().createUserWithEmailAndPassword(emailCollab, 'motdepassecollab');
    const nouvelUid = cred.user.uid;
    await appSecondaire.auth().signOut().catch(() => {});
    await appSecondaire.delete().catch(() => {});

    await app.firestore().collection('cabinets').doc(code).collection('membres').doc(nouvelUid).set({
        uid: nouvelUid, nom: 'Nouvelle Collaboratrice', email: emailCollab,
        role: 'COLLABORATEUR', actif: true, dossiersAffectes: [],
        createdAt: firebaseCompat.firestore.FieldValue.serverTimestamp(),
    });

    // ---------- Vérifications ----------
    assert.equal(app.auth().currentUser.uid, adminUser.uid,
        "la session de l'app principale doit rester celle de l'admin après la création du collaborateur");

    const membreDoc = await app.firestore().collection('cabinets').doc(code).collection('membres').doc(nouvelUid).get();
    assert.equal(membreDoc.exists, true);
    assert.equal(membreDoc.data().role, 'COLLABORATEUR');
    assert.equal(membreDoc.data().actif, true);

    const utilisateurAuth = await adminAuth.getUser(nouvelUid);
    assert.equal(utilisateurAuth.email, emailCollab, 'le compte Auth doit réellement exister, vérifié indépendamment via le SDK admin');

    await app.delete().catch(() => {});
    await adminApp.delete().catch(() => {});
});
