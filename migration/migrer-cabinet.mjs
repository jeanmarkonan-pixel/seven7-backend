/* ==================================================================
   PHASE 1 — TRANSFORMATION D'UN CABINET DE L'ANCIEN VERS LE NOUVEAU SCHÉMA

   Fonction pure, sans dépendance Firestore : testable sans émulateur.
   L'exécution réelle (lecture/écriture Firestore) vit dans
   executer-migration.mjs, qui appelle celle-ci.

   ------------------------------------------------------------------
   CE QUI NE PEUT PAS ÊTRE DÉDUIT DE L'ANCIEN DOCUMENT
   ------------------------------------------------------------------

   L'ancien schéma, tel que réellement déployé (seven7_cabinets/{code} :
   { palier, plafondDossiers, dossiersCreesAnnee }), ne porte NI la
   raison sociale, NI un administrateur identifié par UID Firebase Auth
   — l'ancien modèle n'avait pas de notion d'administrateur porté par
   l'authentification : « admin » y est un nom auto-déclaré, stocké par
   dossier, jamais vérifié contre une identité. C'est précisément ce
   que cette refonte corrige (voir la note de sécurité dans la réponse
   à la section 9, point liminaire).

   Ces informations sont donc des PARAMÈTRES D'ENTRÉE de la migration,
   jamais devinées :
     - raisonSociale, emailContact, telephone : fournis par l'opérateur
       (aucune source fiable dans l'ancien document) ;
     - adminPrincipalUid : le compte Firebase Auth de l'administrateur
       doit exister AVANT la migration du document cabinet — voir
       executer-migration.mjs, qui le crée si besoin.

   Un appel sans ces paramètres échoue explicitement plutôt que
   d'inventer une valeur de repli.
   ================================================================== */

import { trouverPlan, PLANS } from './plans.mjs';

/**
 * @param {object} ancien             document seven7_cabinets/{code} tel que lu en base
 * @param {object} parametres
 * @param {string} parametres.codeCabinet
 * @param {string} parametres.raisonSociale
 * @param {string} parametres.emailContact
 * @param {string} [parametres.telephone]
 * @param {string} parametres.adminPrincipalUid   UID Firebase Auth déjà créé
 * @param {string} [parametres.exerciceAbonnement]  défaut : année en cours
 * @param {Date}   [maintenant]        injectable pour les tests
 */
export function migrerCabinet(ancien, parametres, maintenant = new Date()) {
    if (!ancien || typeof ancien !== 'object') {
        throw new Error('migrerCabinet : ancien document cabinet manquant ou invalide.');
    }
    const requis = ['codeCabinet', 'raisonSociale', 'emailContact', 'adminPrincipalUid'];
    const manquants = requis.filter((clef) => !parametres?.[clef]);
    if (manquants.length) {
        throw new Error(
            `migrerCabinet : paramètre(s) obligatoire(s) manquant(s) — ${manquants.join(', ')}. `
          + `Ces informations n'existent pas dans l'ancien document et ne peuvent pas être devinées.`);
    }

    const codeCabinet = String(parametres.codeCabinet).toUpperCase();

    // Le palier de l'ancien schéma doit correspondre à un palier connu.
    // Un palier disparu ou renommé fait échouer la migration plutôt que
    // de retomber silencieusement sur un plafond par défaut arbitraire.
    const planId = String(ancien.palier ?? '').toUpperCase();
    const plan = trouverPlan(planId);
    if (!plan) {
        throw new Error(
            `migrerCabinet : palier « ${ancien.palier} » de ${codeCabinet} ne correspond à aucun `
          + `palier connu (${PLANS.map((p) => p.id).join(', ')}). Migrer /plans avant les cabinets.`);
    }

    // dossiersUtilises reprend le compteur existant tel quel — jamais
    // recalculé : la migration ne doit pas remettre à zéro une
    // consommation réelle, ni la gonfler.
    const dossiersUtilises = Number.isFinite(ancien.dossiersCreesAnnee) ? ancien.dossiersCreesAnnee : 0;

    // Le plafond vient du PALIER (référentiel /plans), jamais de
    // l'ancien champ plafondDossiers recopié tel quel — c'est le point
    // structurant du cahier des charges (§3) : le plafond ne doit plus
    // jamais être une donnée dupliquée sur le cabinet, seulement dérivée
    // du plan. On vérifie néanmoins la cohérence et on la signale.
    const ecartPlafond = Number.isFinite(ancien.plafondDossiers) && ancien.plafondDossiers !== plan.quotaDossiers;

    const exerciceAbonnement = parametres.exerciceAbonnement ?? String(maintenant.getUTCFullYear());

    return {
        document: {
            codeCabinet,
            raisonSociale: parametres.raisonSociale,
            emailContact: parametres.emailContact,
            telephone: parametres.telephone ?? null,
            plan: plan.id,
            quotaDossiers: plan.quotaDossiers,
            dossiersUtilises,
            exerciceAbonnement,
            dateDebut: parametres.dateDebut ?? maintenant,
            dateFin: parametres.dateFin ?? null,
            statut: 'ACTIF',
            adminPrincipalUid: parametres.adminPrincipalUid,
            createdAt: parametres.createdAtOrigine ?? maintenant,
            migreDepuisAncienSchema: true,
            migreLe: maintenant,
        },
        avertissements: ecartPlafond
            ? [`Le plafond de l'ancien document (${ancien.plafondDossiers}) diverge de celui du `
              + `palier ${plan.id} dans /plans (${plan.quotaDossiers}). Le nouveau document retient `
              + `celui du palier — vérifier que ce n'était pas un plafond négocié individuellement.`]
            : [],
    };
}

/** Document /cabinets/{code}/membres/{uid} pour l'administrateur principal. */
export function membreAdmin(uid, nom, email, maintenant = new Date()) {
    return {
        uid, nom, email,
        role: 'ADMIN',
        actif: true,
        dossiersAffectes: [],
        createdAt: maintenant,
    };
}
