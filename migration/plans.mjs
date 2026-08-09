/* ==================================================================
   PHASE 1 — RÉFÉRENTIEL DES PALIERS D'ABONNEMENT

   Donnée pure, écrite dans /plans/{planId}. Aucun plafond, aucun prix,
   aucun libellé de palier n'est codé en dur ailleurs dans
   l'application — c'est le point structurant du cahier des charges
   (§3, §11) : une évolution tarifaire ne doit exiger aucun
   redéploiement, seulement une réécriture de ces documents.

   « illimité » se représente par un plafond volontairement très grand
   plutôt que par une valeur spéciale (null, -1…), pour rester un
   nombre ordinaire que les règles Firestore et l'arithmétique de
   l'application peuvent comparer sans cas particulier. C'est le même
   choix déjà en place dans src/js/10-config-collaboration.js
   (SEUIL_ILLIMITE = 9999) : cohérence délibérée avec l'existant.

   Écart au schéma proposé au cahier des charges §3, signalé : un champ
   quotaCollaborateurs a été ajouté. Le cahier des charges décrit un
   plafond de collaborateurs par palier (§8, colonne « Collaborateurs »)
   mais son schéma /plans (§3) ne prévoyait que quotaDossiers. Sans ce
   champ, le plafond de collaborateurs resterait soit non appliqué,
   soit codé en dur — les deux contredisent l'exigence E5.

   Les prix sont laissés à null : à renseigner par l'exploitant avant
   mise en production commerciale, jamais par un script.
   ================================================================== */

export const SEUIL_ILLIMITE = 9999;

export const PLANS = [
    {
        id: 'STARTER',
        libelle: 'Starter',
        quotaDossiers: 5,
        quotaCollaborateurs: 2,
        prixAnnuel: null,
        fonctionnalites: [
            'cycle_audit_complet',
            'liasse_syscohada',
            'export_pdf',
        ],
        ordre: 1,
    },
    {
        id: 'PRO',
        libelle: 'Pro',
        quotaDossiers: 20,
        quotaCollaborateurs: 6,
        prixAnnuel: null,
        fonctionnalites: [
            'cycle_audit_complet',
            'liasse_syscohada',
            'export_pdf',
            'revue_analytique_avancee',
            'detection_erreurs',
            'export_excel',
            'module_liasse_fiscale',
        ],
        ordre: 2,
    },
    {
        id: 'CABINET',
        libelle: 'Cabinet',
        quotaDossiers: SEUIL_ILLIMITE,
        quotaCollaborateurs: SEUIL_ILLIMITE,
        prixAnnuel: null,
        fonctionnalites: [
            'cycle_audit_complet',
            'liasse_syscohada',
            'export_pdf',
            'revue_analytique_avancee',
            'detection_erreurs',
            'export_excel',
            'module_liasse_fiscale',
            'multi_exercices',
            'tableau_bord_supervision',
            'support_prioritaire',
        ],
        ordre: 3,
    },
];

/** Un plan par son identifiant, ou null. Jamais d'exception : un appelant
 *  qui cite un palier disparu doit pouvoir le détecter, pas planter. */
export function trouverPlan(planId) {
    return PLANS.find((p) => p.id === planId) ?? null;
}
