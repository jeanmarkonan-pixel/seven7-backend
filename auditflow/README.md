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
