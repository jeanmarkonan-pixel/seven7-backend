/* ============================================================================
   SEVEN7 AUDIT — Création d'un cabinet NEUF (schéma en place)

   Ni executer-migration.mjs (exige un ancien seven7_cabinets/{code}) ni
   activer-demande-cabinet.mjs (exige un demandes_cabinet/{id}) ne créent un
   cabinet à partir de rien. Ce script le fait : compte Auth admin + documents
   cabinets/{code} et cabinets/{code}/membres/{uid}, au MÊME schéma que
   activer-demande-cabinet.mjs.

   ⚠️  Crée un compte Firebase Auth avec le mot de passe que TU fournis en
       --motDePasseAdmin. L'admin devra le changer à la première connexion.
       Communique-le au cabinet par un canal séparé du code.

   ----------------------------------------------------------------------------
   CLÉ DE COMPTE DE SERVICE : --key <chemin.json>  (ou GOOGLE_APPLICATION_CREDENTIALS)
     Console Firebase → ⚙ Paramètres → Comptes de service → Générer une clé.

   UTILISATION (depuis le dossier seven7-audit) :

     # 1) Aperçu — n'écrit RIEN :
     node migration/creer-cabinet.mjs --key ../maCle.json \
       --code KONAN2026 --raison "Cabinet Konan & Associés" \
       --email admin@cabinet-konan.ci --nomAdmin "Jean Konan" --plan CABINET

     # 2) Création réelle (ajoute --motDePasseAdmin et --go) :
     node migration/creer-cabinet.mjs --key ../maCle.json \
       --code KONAN2026 --raison "Cabinet Konan & Associés" \
       --email admin@cabinet-konan.ci --nomAdmin "Jean Konan" --plan CABINET \
       --motDePasseAdmin "provisoire-2026!" --go

   Si le compte Auth cabinet-<code>@seven7-audit.local existe déjà, omets
   --motDePasseAdmin : le script le réutilise sans rien recréer.
   ============================================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { PLANS, trouverPlan } from './plans.mjs';
import { membreAdmin } from './migrer-cabinet.mjs';

const PROJECT_ID = 'seven7-audit';
const argv = process.argv.slice(2);
const val = (f) => { const i = argv.indexOf('--' + f); return i !== -1 ? argv[i + 1] : undefined; };
const has = (f) => argv.includes('--' + f);

const GO = has('go');

function cabinetAuthEmail(code){ return 'cabinet-' + String(code).toLowerCase() + '@seven7-audit.local'; }

function initApp(){
    const keyPath = val('key') || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if(keyPath){
        const abs = path.resolve(keyPath);
        if(!fs.existsSync(abs)){ console.error('❌ Clé introuvable : ' + abs); process.exit(1); }
        const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
        if(json.project_id && json.project_id !== PROJECT_ID){
            console.error(`❌ La clé cible "${json.project_id}", script verrouillé sur "${PROJECT_ID}".`); process.exit(1);
        }
        return initializeApp({ credential: cert(json), projectId: PROJECT_ID });
    }
    console.error('❌ Aucune clé. Passe --key <chemin.json> ou définis GOOGLE_APPLICATION_CREDENTIALS.');
    process.exit(1);
}

async function main(){
    const code  = String(val('code') || '').toUpperCase();
    const raison = val('raison');
    const email = val('email');
    const nomAdmin = val('nomAdmin');
    const planId = String(val('plan') || '').toUpperCase();
    const telephone = val('telephone') || null;
    const motDePasse = val('motDePasseAdmin');

    const manquants = [];
    if(!code) manquants.push('--code');
    if(!raison) manquants.push('--raison');
    if(!email) manquants.push('--email');
    if(!nomAdmin) manquants.push('--nomAdmin');
    if(!planId) manquants.push('--plan');
    if(manquants.length){ console.error('❌ Paramètre(s) obligatoire(s) manquant(s) : ' + manquants.join(', ')); process.exit(1); }

    const plan = trouverPlan(planId);
    if(!plan){ console.error(`❌ Plan "${planId}" inconnu. Choix : ${PLANS.map(p=>p.id).join(', ')}`); process.exit(1); }

    const app = initApp();
    const db = getFirestore(app);
    const auth = getAuth(app);
    const emailAuth = cabinetAuthEmail(code);

    console.log('====================================================================');
    console.log('  SEVEN7 — Création de cabinet   (projet : ' + PROJECT_ID + ')');
    console.log('  Mode : ' + (GO ? '🔴 ÉCRITURE RÉELLE' : '🟡 APERÇU (rien ne sera écrit)'));
    console.log('====================================================================\n');

    // Refus si le cabinet existe déjà
    const existant = await db.doc(`cabinets/${code}`).get();
    if(existant.exists){ console.error(`❌ cabinets/${code} existe déjà. Choisis un autre --code.`); process.exit(1); }

    // Compte Auth admin : déjà là ?
    let uidAdmin = null, compteExiste = false;
    try{ const u = await auth.getUserByEmail(emailAuth); uidAdmin = u.uid; compteExiste = true; }
    catch(e){ if(e.code !== 'auth/user-not-found') throw e; }

    console.log('  Cabinet      : ' + code + '  «' + raison + '»');
    console.log('  Admin        : ' + nomAdmin + '  <' + email + '>' + (telephone ? '  tél ' + telephone : ''));
    console.log('  Connexion    : code «' + code + '»  (e-mail interne ' + emailAuth + ')');
    console.log('  Plan         : ' + plan.id + '  — ' + plan.quotaDossiers + ' dossiers, ' + plan.quotaCollaborateurs + ' collaborateurs');
    console.log('  Compte Auth  : ' + (compteExiste ? 'existe déjà (uid ' + uidAdmin + ') — réutilisé'
        : (motDePasse ? 'à créer avec le mot de passe fourni' : '❌ à créer mais --motDePasseAdmin absent')));
    console.log('');

    if(!compteExiste && !motDePasse){
        console.error('❌ Aucun compte Auth pour ' + emailAuth + ' et --motDePasseAdmin non fourni. Ajoute-le.');
        process.exit(1);
    }

    if(!GO){
        console.log('🟡 Aperçu terminé — relance avec --go (et --motDePasseAdmin) pour créer.');
        process.exit(0);
    }

    // 1. /plans (merge — n'écrase rien d'existant)
    const lot = db.batch();
    for(const p of PLANS) lot.set(db.doc(`plans/${p.id}`), p, { merge: true });
    await lot.commit();
    console.log('  ✅ /plans : ' + PLANS.length + ' paliers garantis (merge)');

    // 2. Compte Auth admin
    if(!compteExiste){
        const cree = await auth.createUser({ email: emailAuth, password: motDePasse, displayName: `${nomAdmin} <${email}>` });
        uidAdmin = cree.uid;
        console.log('  ✅ compte Auth créé : ' + emailAuth + ' (uid ' + uidAdmin + ')');
    }

    // 3. cabinets/{code}
    const maintenant = new Date();
    const document = {
        codeCabinet: code,
        raisonSociale: raison,
        emailContact: email,
        telephone,
        plan: plan.id,
        quotaDossiers: plan.quotaDossiers,
        dossiersUtilises: 0,
        exerciceAbonnement: String(maintenant.getUTCFullYear()),
        dateDebut: maintenant,
        dateFin: null,
        statut: 'ACTIF',
        adminPrincipalUid: uidAdmin,
        createdAt: maintenant,
        creeManuellement: true,
    };
    await db.doc(`cabinets/${code}`).set(document);
    console.log('  ✅ cabinets/' + code + ' écrit — plan ' + plan.id + ', admin ' + uidAdmin);

    // 4. membre ADMIN
    await db.doc(`cabinets/${code}/membres/${uidAdmin}`).set(membreAdmin(uidAdmin, nomAdmin, email));
    console.log('  ✅ cabinets/' + code + '/membres/' + uidAdmin + ' — role ADMIN');

    console.log('\n✅ Cabinet créé.');
    console.log('   À transmettre au cabinet : le CODE «' + code + '»');
    console.log('   Mot de passe provisoire : par un canal séparé. À changer à la 1re connexion.');
    process.exit(0);
}

main().catch(e => { console.error('\n❌ Erreur :', e); process.exit(1); });
