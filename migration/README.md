# Migration — modèle de sécurité cabinets/rôles/paliers (phase 1)

Refonte du modèle de sécurité : passage de « un compte Auth = un
dossier » à « un cabinet = un espace », avec rôles hiérarchisés et
quota par palier d'abonnement. Voir la discussion complète dans la
conversation qui a motivé ce chantier (réponses argumentées aux points
de validation, plan en 8 phases).

Cette phase 1 ne touche à **aucun** code applicatif existant. Elle
crée uniquement :

- `plans.mjs` — référentiel des trois paliers (STARTER, PRO, CABINET),
  à écrire dans `/plans/{planId}`. Aucun plafond ni prix n'est codé en
  dur ailleurs : voir l'exigence E5 du cahier des charges.
- `migrer-cabinet.mjs` — fonction pure qui transforme un ancien
  document `seven7_cabinets/{code}` en nouveau document
  `cabinets/{code}`. Testée sans émulateur (`tests/migration.test.js`).
- `executer-migration.mjs` — orchestrateur qui sauvegarde, sème
  `/plans`, crée le compte Auth de l'administrateur si besoin, et
  écrit `cabinets/{code}` + `cabinets/{code}/membres/{uid}`.

  **Correctif du 9 août 2026** : le compte Auth de l'admin est créé
  avec l'email de connexion déterministe `cabinet-{code}@seven7-audit.local`
  (même convention que `cabinetAuthEmail()` déjà utilisée par l'écran
  « Vous êtes admin de cabinet ? »), pas avec `--email`. C'est ce qui
  permet la connexion par CODE_CABINET seul (§4) : l'app doit pouvoir
  résoudre un email à partir du code AVANT toute authentification, donc
  sans lire Firestore. `--email` reste obligatoire mais ne sert plus
  qu'à peupler `emailContact` (adresse réelle de contact, jamais un
  identifiant de connexion).

## Ce qui ne peut pas être déduit automatiquement

L'ancien schéma (`{ palier, plafondDossiers, dossiersCreesAnnee }`) ne
porte ni raison sociale, ni administrateur identifié par UID — l'ancien
modèle n'avait pas d'administrateur au sens Auth, seulement un nom
auto-déclaré par dossier. Ces informations sont donc des **paramètres
obligatoires** de la commande ; une migration lancée sans eux échoue
explicitement plutôt que d'inventer une valeur.

## Utilisation

### Contre l'émulateur (toujours en premier)

```bash
firebase emulators:start --only firestore,auth --project seven7-audit-test
```

Dans un second terminal :

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  node migration/executer-migration.mjs \
    --code KONAN2026 \
    --raison "Cabinet Konan & Associés" \
    --email admin@exemple.ci \
    --nomAdmin "Nom du gérant" \
    --motDePasseAdmin "mot-de-passe-provisoire" \
    --projet seven7-audit-test
```

### Contre la production

Nécessite `GOOGLE_APPLICATION_CREDENTIALS` pointant vers une clé de
compte de service (jamais commitée, jamais dans ce dépôt) :

```bash
GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/cle.json \
  node migration/executer-migration.mjs --code KONAN2026 --production \
    --raison "..." --email "..." --nomAdmin "..." --motDePasseAdmin "..."
```

Si le compte Auth de l'admin existe déjà (créé à la main dans la
console), omettez `--motDePasseAdmin` : la commande le retrouve par
e-mail et ne recrée rien.

## Garanties

- **Non destructif** : `seven7_cabinets/{code}` n'est jamais modifié ni
  supprimé. L'ancien mécanisme de connexion reste fonctionnel pendant
  la période de transition (phase 3).
- **Sauvegarde systématique** : avant toute écriture, l'état courant
  des documents concernés est exporté dans
  `migration/sauvegardes/{code}-{horodatage}.json` (exclu de git —
  contient des données réelles de cabinet).
- **Idempotent** : relancer la commande sur un cabinet déjà migré
  (`cabinets/{code}.migreDepuisAncienSchema === true`) ne fait rien et
  le signale.

## Vérifié le 8 août 2026

Migration testée de bout en bout contre l'émulateur (Firestore + Auth)
avec un cabinet KONAN2026 simulé au schéma ancien réel
(`{ palier: 'STARTER', plafondDossiers: 5, dossiersCreesAnnee: 3 }`) :
sauvegarde écrite, `/plans` semé, compte Auth admin créé, document
`cabinets/KONAN2026` correct, ancien document resté bit-à-bit
identique, deuxième exécution idempotente sans effet de bord.
