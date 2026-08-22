/* ==================================================================
   TUNNEL D'INSCRIPTION PUBLIC — ACTIVATION D'UNE DEMANDE

   Contrepartie opérateur de src/vitrine/paiement.html : une fois le
   règlement (Wave/Orange Money/virement) vérifié manuellement, ce script
   crée le compte Firebase Auth de l'administrateur et écrit /cabinets/{code}
   au schéma déjà en place (voir migrer-cabinet.mjs) — jamais une seconde
   fois : demandes_cabinet/{id} n'est PAS un cabinet, c'est une intention,
   sans code cabinet ni compte Auth. Le code est choisi ici, par l'opérateur.

   Usage :

     # Contre l'émulateur (voir README de ce dossier)
     firebase emulators:start --only firestore,auth --project seven7-audit-test
     FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
       node migration/activer-demande-cabinet.mjs --demande <id> --code KONAN2026 \
         --motDePasseAdmin "..." --projet seven7-audit-test

     # Contre la production (nécessite GOOGLE_APPLICATION_CREDENTIALS)
     node migration/activer-demande-cabinet.mjs --demande <id> --code KONAN2026 \
       --motDePasseAdmin "..." --production

   RÈGLE DE SÉCURITÉ : demandes_cabinet n'est accessible en lecture/écriture
   qu'à l'Admin SDK (voir firestore.rules) — ce script est le SEUL endroit
   qui la lit et la marque traitée.
   ================================================================== */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { trouverPlan, PLANS } from './plans.mjs';
import { membreAdmin } from './migrer-cabinet.mjs';

function lireArguments(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i].startsWith('--')) continue;
        const clef = argv[i].slice(2);
        const suivant = argv[i + 1];
        args[clef] = (suivant === undefined || suivant.startsWith('--')) ? true : suivant;
    }
    return args;
}

function initialiserApp(args) {
    const options = args.projet ? { projectId: args.projet } : {};
    if (args.production) {
        options.credential = process.env.GOOGLE_APPLICATION_CREDENTIALS
            ? applicationDefault()
            : (() => { throw new Error(
                'Activation en production demandée sans GOOGLE_APPLICATION_CREDENTIALS. '
              + 'Définissez cette variable vers une clé de compte de service avant de relancer.'); })();
    }
    return initializeApp(options);
}

/* Même convention, au caractère près, que cabinetAuthEmail() dans
   src/js/10-config-collaboration.js et executer-migration.mjs — pas de
   module partagé entre code client et scripts Node dans ce projet,
   précédent déjà établi par ce dernier. */
function cabinetAuthEmail(codeCabinet) {
    return 'cabinet-' + String(codeCabinet).toLowerCase() + '@seven7-audit.local';
}

async function assurerCompteAdmin(auth, codeCabinet, emailContact, motDePasse, nom) {
    const emailAuth = cabinetAuthEmail(codeCabinet);
    try {
        const existant = await auth.getUserByEmail(emailAuth);
        console.log(`  compte Auth admin déjà existant : ${emailAuth} (uid ${existant.uid})`);
        return existant.uid;
    } catch (erreur) {
        if (erreur.code !== 'auth/user-not-found') throw erreur;
    }
    if (!motDePasse) {
        throw new Error(
            `Aucun compte Auth pour ${emailAuth}, et --motDePasseAdmin non fourni pour en créer un.`);
    }
    const cree = await auth.createUser({
        email: emailAuth, password: motDePasse, displayName: `${nom} <${emailContact}>`,
    });
    console.log(`  compte Auth admin créé : ${emailAuth} (uid ${cree.uid}) — contact réel : ${emailContact}`);
    return cree.uid;
}

async function activer(args) {
    if (!args.demande) throw new Error('--demande est obligatoire (id du document demandes_cabinet).');
    const codeCabinet = String(args.code || '').toUpperCase();
    if (!codeCabinet) throw new Error('--code est obligatoire (ex. --code KONAN2026) — choisi par vous, pas par le formulaire.');

    const app = initialiserApp(args);
    const db = getFirestore(app);
    const auth = getAuth(app);

    console.log(`\n=== Activation de la demande ${args.demande} → cabinet ${codeCabinet} ===`);

    const refDemande = db.doc(`demandes_cabinet/${args.demande}`);
    const demande = await refDemande.get();
    if (!demande.exists) {
        throw new Error(`demandes_cabinet/${args.demande} introuvable.`);
    }
    const d = demande.data();
    if (d.statut === 'traitee') {
        console.log(`  déjà traitée — rien à refaire. Idempotent par construction.`);
        return;
    }

    const cabinetExistant = await db.doc(`cabinets/${codeCabinet}`).get();
    if (cabinetExistant.exists) {
        throw new Error(`cabinets/${codeCabinet} existe déjà — choisissez un autre --code.`);
    }

    const plan = trouverPlan(d.planSouscrit);
    if (!plan) {
        throw new Error(
            `planSouscrit « ${d.planSouscrit} » de la demande ne correspond à aucun palier connu `
          + `(${PLANS.map((p) => p.id).join(', ')}).`);
    }

    const uidAdmin = await assurerCompteAdmin(
        auth, codeCabinet, d.emailContact, args.motDePasseAdmin, `${d.prenomContact} ${d.nomContact}`);

    const maintenant = new Date();
    const document = {
        codeCabinet,
        raisonSociale: d.nomCabinet,
        emailContact: d.emailContact,
        telephone: d.telephone ?? null,
        plan: plan.id,
        quotaDossiers: plan.quotaDossiers,
        dossiersUtilises: 0,
        exerciceAbonnement: String(maintenant.getUTCFullYear()),
        dateDebut: maintenant,
        dateFin: null,
        statut: 'ACTIF',
        adminPrincipalUid: uidAdmin,
        createdAt: maintenant,
        origineDemandeId: args.demande,
    };

    await db.doc(`cabinets/${codeCabinet}`).set(document);
    console.log(`  cabinets/${codeCabinet} écrit — plan ${document.plan}, admin ${uidAdmin}`);

    await db.doc(`cabinets/${codeCabinet}/membres/${uidAdmin}`)
        .set(membreAdmin(uidAdmin, `${d.prenomContact} ${d.nomContact}`, d.emailContact));
    console.log(`  cabinets/${codeCabinet}/membres/${uidAdmin} écrit — role ADMIN`);

    await refDemande.update({ statut: 'traitee', codeCabinetAttribue: codeCabinet, traiteLe: maintenant });
    console.log(`  demandes_cabinet/${args.demande} marquée traitée`);

    console.log(`\n  Identifiant de connexion à transmettre au cabinet : ${codeCabinet}`);
    console.log(`  (mot de passe : celui fourni en --motDePasseAdmin, à communiquer par un canal séparé)`);
    console.log(`=== Activation de ${codeCabinet} terminée ===\n`);
}

const args = lireArguments(process.argv.slice(2));
activer(args).catch((erreur) => {
    console.error(`\n✖ Activation interrompue : ${erreur.message}`);
    process.exitCode = 1;
});
