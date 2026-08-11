# Fermeture contrôlée du module Liasse & États financiers

11/08/2026 — voir `PROMPT_CLAUDE_CODE_FERMETURE_MODULE_LIASSE.md` (demande d'origine).

## Décision

Le module Liasse (Bilan, Compte de résultat, TFT, Fiches R, Notes annexes, export XML DGI) est
fermé à **tous les plans** et **tous les modes d'accès** (propriétaire historique par `authUid`
compris, pas seulement les sessions cabinet/pont), jusqu'à validation par deux professionnels du
chiffre. Aucune donnée, aucun fichier, aucune fonction n'a été supprimé — c'est un drapeau, pas
une suppression.

## Fichiers modifiés

| Fichier | Rôle |
|---|---|
| `src/js/config-features.js` (**nouveau**) | Point de contrôle unique : `FEATURES`, `liasseModuleActif(dossierId)`, chargement de `config_globale/features`, badge de l'onglet, formulaire de liste d'attente |
| `build/manifeste.json` | Enregistre `config-features.js` dans le groupe NOYAU (chargé tôt) |
| `firestore.rules` | `config_globale/features` (lecture publique, écriture jamais côté client), `liasse_waitlist` (create authentifié seulement), verrou d'écriture sur `seven7_dossiers/{d}/tabs/{tabId liasse-*}` — s'applique au propriétaire `authUid` ET au pont cabinet |
| `src/js/22-liasse-notes.js` | `showInterface('liasse')` affiche l'écran d'attente au lieu du module si `!liasseModuleActif(...)` |
| `src/js/23-liasse-export-xml.js` | `liasseGenererXML()` refuse même un appel direct si le module est fermé |
| `src/js/10-config-collaboration.js` | Charge `config_globale/features` à l'ouverture d'un dossier (ancien modèle et pont), applique le badge, annote la ligne « module_liasse_fiscale » de l'écran de comparaison des paliers |
| `src/app.html` | Badge « Bientôt disponible » sur le bouton LIASSE, écran d'attente (`#liasse-waitlist-screen`, grille des états, formulaire), bandeau discret sur l'écran de connexion |
| `tests/fermeture-liasse.test.js` (**nouveau**) | 10 scénarios : fermeture par défaut, `LIASSE_ENABLED`, liste blanche, lecture préservée, onglets hors liasse non affectés, `config_globale`/`liasse_waitlist` |
| `tests/pont-dossiers.test.js`, `tests/palier-restrictions.test.js` | Seed `config_globale/features` avec `LIASSE_ENABLED: true` — ces suites testent E3/le palier, pas la fermeture globale |

**Aucun fichier du module Audit n'a été touché.** Aucune modification de `20-liasse-moteur-origine.js`,
`21-liasse-tft.js`, ni du moteur de calcul/mapping dans `31-moteur-unifie.js` (§12, interdit déjà en
vigueur, respecté ici aussi).

## Procédure de réouverture (3 étapes)

1. Dans la console Firebase (Firestore, projet `seven7-audit`), ouvrir ou créer le document
   `config_globale/features`.
2. Poser `LIASSE_ENABLED: true` (booléen).
3. C'est tout — aucun redéploiement. Le changement est visible à la prochaine ouverture de
   dossier par chaque utilisateur (le cache client se recharge par session, pas en temps réel).

## Procédure d'ajout d'un dossier à la liste blanche (testeurs)

1. Dans `config_globale/features`, poser ou compléter le tableau `liasse_beta_dossiers`
   (ex. `["dossier-testeur-1", "dossier-testeur-2"]`) — l'identifiant est celui du document
   `seven7_dossiers/{id}`, pas un nom de cabinet.
2. Le dossier listé accède immédiatement au module (lecture ET écriture), même avec
   `LIASSE_ENABLED: false` — sans effet sur aucun autre dossier.

## Confirmation : aucune donnée supprimée

- Aucune commande `delete` exécutée sur une collection ou un champ existant.
- Le contenu déjà saisi dans les onglets `liasse-*` reste **lisible** (seule l'écriture est
  bloquée) — voir `firestore.rules`, règle `allow read` du `/tabs/{tabId}`, non modifiée par
  cette fermeture.
- Les plans (`/plans/{planId}`) conservent leurs identifiants et leurs droits actuels
  (`fonctionnalites[]` inchangé) — la fermeture est un filtre appliqué par-dessus, pas une
  modification du référentiel des paliers.
