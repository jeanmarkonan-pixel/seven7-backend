# AUDITFLOW

Suite d'audit externe pour les cabinets de la zone OHADA — ISA, SYSCOHADA, offline-first.

Monorepo **pnpm** : Next.js (web) + NestJS (API) + PostgreSQL, la stack retenue
dans `docs/auditflow/Plan_Conformite_Securite_AUDITFLOW.md`.

## Prérequis

| Outil | Version |
|---|---|
| Node.js | ≥ 20 (testé sur 22) |
| pnpm | ≥ 9 (testé sur 10.33) |
| Docker | pour PostgreSQL et Redis en local |
| VS Code | avec les extensions recommandées (proposées à l'ouverture) |

## Démarrage

```bash
cd auditflow
cp .env.example .env      # les valeurs par défaut suffisent en local
pnpm install

pnpm db:up                # démarre PostgreSQL + Redis
pnpm db:load              # charge le schéma SQL dans la base
pnpm db:pull              # Prisma introspecte la base
pnpm --filter @auditflow/db prisma:generate

pnpm dev                  # API sur :3001, web sur :3000
```

- Web : http://localhost:3000
- API : http://localhost:3001/api
- Documentation OpenAPI : http://localhost:3001/api/docs

## Dans Visual Studio Code

Ouvrez `auditflow/auditflow.code-workspace` (et non le dossier racine du dépôt) :
VS Code chargera les quatre dossiers du monorepo, la version TypeScript locale et
les extensions recommandées.

- **F5** → menu *Tout lancer (API + Web)* : démarre les deux applications en mode debug,
  points d'arrêt actifs dans les deux.
- **Ctrl/Cmd+Shift+P → Tasks: Run Task** : installation, démarrage de la base,
  chargement du schéma, introspection, typecheck et build sont préconfigurés.

## Structure

```
auditflow/
├── apps/
│   ├── api/           NestJS — API REST, Swagger, validation, helmet
│   └── web/           Next.js 15 (App Router)
├── packages/
│   └── db/            Client Prisma partagé
├── docker-compose.yml PostgreSQL 16 + Redis 7
└── .vscode/           Debug, tâches, réglages et extensions
```

## Le schéma SQL est la source de vérité

Les modèles Prisma ne définissent pas la base : ils en sont **introspectés**.
La référence reste `docs/auditflow/Schema_SQL_AUDITFLOW_PostgreSQL.sql`
(29 tables, 2 vues, 3 fonctions, 17 triggers, piste d'audit immuable).

Après toute évolution du SQL :

```bash
pnpm db:load && pnpm db:pull && pnpm --filter @auditflow/db prisma:generate
```

N'éditez jamais les modèles de `packages/db/prisma/schema.prisma` à la main :
la prochaine introspection les écraserait.

### Deux conventions du schéma à connaître

- **Suppression logique** — les tables portent un `deleted_at`. Rien n'est supprimé
  physiquement (archivage OHADA 10 ans), donc toute lecture doit écarter les lignes
  supprimées, comme le fait `CabinetsService`.
- **Multi-tenant** — le `cabinet` est la racine d'isolation. Chaque requête sur une
  ressource rattachée doit vérifier l'appartenance au cabinet de l'utilisateur
  (plan de conformité §4.3, IDOR).

## Authentification & RBAC

JWT (8h, durée de session §5.3 du plan de conformité) + rôles hiérarchiques
lus depuis `ref_role_utilisateur` (7 rôles, niveau 5 à 100 — client à
super_admin). Deux guards globaux protègent l'API par défaut :

- `JwtAuthGuard` — ferme tout par défaut ; une route publique se déclare
  explicitement avec `@Public()` (voir `auth/login`, `health`).
- `RolesGuard` — lit `@Roles('associe', ...)` ou `@MinNiveau(60)` posé sur
  un handler. Préférer `@MinNiveau()` : ajouter un rôle intermédiaire dans
  `ref_role_utilisateur` n'oblige pas à retoucher chaque contrôleur.

```bash
curl -X POST http://localhost:3001/api/auth/login   -H "Content-Type: application/json"   -d '{"email":"...","password":"..."}'
# -> { access_token, user }

curl http://localhost:3001/api/cabinets   -H "Authorization: Bearer <access_token>"
```

`JwtStrategy.validate()` revérifie le compte en base à **chaque requête**
(`deleted_at`, `est_actif`) — désactiver un compte invalide immédiatement
tous ses jetons déjà émis, sans attendre leur expiration. Vérifié : un token
valide cesse de fonctionner (401) dès que `est_actif` passe à `false`.

`/cabinets` illustre l'isolation multi-tenant : un utilisateur ne voit que
son propre cabinet, `super_admin` seul voit tout. Tout futur contrôleur
métier doit reprendre ce filtre `cabinet_id` — c'est la frontière IDOR du
plan de conformité (§4.3).

**Connu et non fait à ce stade** : MFA (le schéma a `mfa_actif`/`mfa_secret`
mais aucun flux TOTP n'est branché), verrou par compte après 5 échecs
(seul un throttle par IP à 5/5 min existe, `@Throttle` sur `/auth/login`),
révocation de token à la demande (logout serveur — un JWT reste valide
jusqu'à expiration une fois émis, sauf compte désactivé).

## Gestion des utilisateurs (`/users`)

CRUD complet, réservé à `admin_cabinet` et `super_admin` (`@MinNiveau(90)`
sur le contrôleur). Trois règles de sécurité systématiques, au-delà de
l'isolation par cabinet déjà vue sur `/cabinets` :

- **Anti-escalade** — impossible de créer ou promouvoir un compte à un rôle
  plus élevé que le sien. Un `admin_cabinet` (niveau 90) ne peut pas se
  créer un accès `super_admin` (niveau 100).
- **Anti-auto-verrouillage** — un administrateur ne peut pas se désactiver
  ou se supprimer lui-même via cet endpoint ; ça doit passer par un autre
  admin, pour qu'un cabinet à un seul administrateur ne se retrouve jamais
  sans accès administrateur.
- **404, jamais 403, sur un utilisateur d'un autre cabinet** — accéder par
  id à un compte hors de son périmètre renvoie "introuvable", pas "accès
  refusé", pour ne pas confirmer son existence à qui n'a pas à le savoir.

Vérifié en conditions réelles avec deux cabinets et trois comptes : les dix
cas (création réussie, anti-escalade, seuil de rôle, isolation multi-tenant
sur liste et lecture directe, anti-auto-verrouillage sur désactivation et
suppression, suppression logique effective) passent tous.

**Bug trouvé et corrigé pendant cette vérification** : les quatre méthodes
de `UsersService` renvoyaient `mot_de_passe_hash` dans leur réponse JSON —
haché, mais un secret ne doit jamais transiter côté client. Un helper
`sansHash()` l'exclut systématiquement avant toute réponse.

## Clients (`/clients`) et missions (`/missions`)

CRUD tenant-scopé pour les deux tables au cœur du modèle métier. Écriture
réservée à `admin_cabinet`, `manager`, `senior` et `super_admin` — **pas**
`associe` ni `junior`. C'est une lecture attentive de la matrice RBAC du
plan de conformité §5.1, pas un seuil de niveau : `associe` (niveau 80) n'a
que "Lecture" sur les missions, alors que `manager` (60) et `senior` (40),
hiérarchiquement inférieurs, ont "CRUD". Un `@MinNiveau()` aurait laissé
passer l'associé à tort — `/missions` et `/clients` utilisent donc des
listes de rôles explicites (`@Roles(...)`), pas un seuil.

`MissionsService` valide, au-delà des contraintes FK basiques :

- **`client_id` appartient au cabinet de l'appelant** — sinon une mission
  pourrait être rattachée au client d'un autre cabinet.
- **Chaque poste d'équipe (`associeId`/`managerId`/`seniorId`/`juniorId`)
  tient le niveau hiérarchique attendu** — un junior ne peut pas être
  déclaré associé responsable, même si la colonne SQL accepte n'importe
  quel UUID d'utilisateur. Vérification au-delà de ce que le schéma impose
  lui-même (une simple FK n'a pas de notion de rôle).
- **`exercice_fin` postérieur à `exercice_debut`.**
- **`reference` unique par cabinet** (409 sur doublon).

Vérifié en conditions réelles avec un cabinet à 5 profils (admin, associé,
manager, senior, junior) : création avec équipe valide, rejet d'un junior
comme associé (400), rejet de dates incohérentes (400), rejet de référence
dupliquée (409), et surtout — l'associé peut lire une mission (200) mais
pas en créer une (403), malgré son niveau hiérarchique supérieur au senior
qui, lui, le peut.

**Bug trouvé et corrigé pendant cette vérification** : `exercice_debut` et
les autres champs date recevaient la chaîne ISO courte du DTO
(`"2026-01-01"`) telle quelle — Prisma exige un objet `Date` JS complet
pour un champ `DateTime`, pas une chaîne de date nue, et renvoyait une 500
("premature end of input"). Corrigé par conversion explicite `new Date(...)`
sur tous les champs date, création et modification.

**Connu et non fait à ce stade** : CRUD `client` limité (pas de fusion de
doublons, pas d'historique de relation) ; pas de machine à états sur
`ref_statut_mission` (le statut peut être changé vers n'importe quelle
valeur, l'enchaînement prospect → accepté → ... → archivé n'est pas
imposé) ; portail client (rôle `client`, "Lecture propre" sur sa mission)
non implémenté — nécessite de relier un compte utilisateur à un client
précis, absent du schéma actuel.

## Cycles ISA et tests d'audit

Trois niveaux imbriqués : `GET /cycles-isa` et `GET /programmes-travail`
(catalogue global, sans cabinet_id, lecture ouverte à tout authentifié) →
`/missions/:missionId/cycles` (ouvrir un cycle ISA sur une mission,
paramétrer risques/matérialité) → `/mission-cycles/:cycleId/tests`
(créer un test, depuis le catalogue ou libre, l'exécuter, le faire revoir).

**RBAC à trois régimes différents dans un seul module**, tous tirés
littéralement du plan de conformité §5.1 plutôt que déduits d'un principe
général :

- Cycles : mêmes rôles que Missions (`admin_cabinet`, `manager`, `senior`,
  `super_admin`) — ouvrir un cycle est un acte de planification.
- Tests : `junior` a **CRUD complet**, sans la réserve "(limité)" qui
  s'applique à Missions — c'est lui qui exécute les tests au quotidien,
  le document est explicite sur ce point précis.
- Revue : ni dans la table RBAC ni dans le champ `permissions` JSON
  (qui contient `"revue": "senior"` etc. — un nom de rôle, pas une règle
  de délégation exploitable, voir la mise en garde dans `JwtPayload`).
  Règle propre, documentée comme un choix de conception explicite :
  niveau ≥ 40 (senior et au-dessus) **et** interdiction de revoir un
  test qu'on a soi-même exécuté (séparation des tâches, ISA 220).

Un test peut être créé depuis `programme_travail` (le catalogue préseedé
de 35 tests standards à travers 6 cycles, avec `objectif`/`procedure`/
`assertions` repris tels quels) ou "libre" (objectif/procédure saisis à la
main) — le DTO rend `typeTestCode`/`objectif`/`procedure` obligatoires
seulement dans ce second cas, pour qu'un test libre ne puisse pas être
créé à moitié rempli.

**Bug trouvé et corrigé pendant cette vérification** : le throttle anti-
brute-force sur `/auth/login` (5 tentatives/5 min par IP, §5.4) a fini par
bloquer mes propres tests répétés — pas un bug, la protection fonctionnait
exactement comme prévu. Redémarrer le processus API a suffi (compteur en
mémoire), et j'ai ensuite réutilisé les tokens plutôt que de me
reconnecter à chaque assertion.

Vérifié en conditions réelles avec un cabinet à 4 profils et deux
cabinets distincts : catalogue complet (9 cycles, 8 programmes sur le
cycle cash), ouverture de cycle, contrainte d'unicité mission+cycle
(409), création de test depuis le catalogue avec objectif/procédure
repris mot pour mot, exécution par un junior, **auto-revue refusée pour
le junior (niveau) et pour le senior (séparation des tâches, même à
niveau suffisant)**, revue croisée acceptée, conclusion de cycle avec
validation de longueur, isolation multi-tenant à trois niveaux
d'imbrication (mission → cycle → test, 404 pour un cabinet tiers à
chaque niveau).

## État actuel

Ce qui est en place et vérifié :

- monorepo pnpm, build des trois paquets
- API NestJS : `/api/health`, `/api/auth/login`, `/api/auth/me`,
  `/api/cabinets`, Swagger, validation globale, helmet, CORS
- authentification JWT + RBAC hiérarchique, isolation multi-tenant sur
  `/cabinets`
- client Prisma généré depuis les 29 tables réelles
- front Next.js affichant l'état des services

Ce qui reste à construire : MFA, portail client, workspace auditeur,
génération des rapports ISA, mode offline.
