# RblxDash — Plan d'implémentation API v1

## Vue d'ensemble

API REST publique réservée au plan **STUDIO** (40 CAD/mois).
Authentification par clé API préfixée `rd_live_`.
Base URL : `https://rblxdash.com/api/v1`

---

## 1. Prisma — Nouveau modèle `ApiKey`

```prisma
model ApiKey {
  id          String    @id @default(cuid())
  name        String
  keyHash     String    @unique   // SHA-256 de la clé brute, jamais la clé en clair
  keyPrefix   String              // "rd_live_AbCd" pour affichage dans l'UI
  lastUsedAt  DateTime?
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())

  orgId       String
  createdById String
  org         Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  createdBy   User         @relation(fields: [createdById], references: [id], onDelete: Cascade)

  @@index([orgId])
  @@index([keyHash])
}
```

Migration SQL :
```sql
CREATE TABLE "ApiKey" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "orgId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_orgId_idx" ON "ApiKey"("orgId");
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## 2. Librairies utilitaires

### `src/lib/api-key.ts`
- `generateApiKey()` — génère `rd_live_` + 32 bytes base64url
- `hashApiKey(rawKey)` — SHA-256 hex
- `getKeyPrefix(rawKey)` — `rd_live_AbCd` (8 chars après le préfixe)

### `src/lib/api-auth.ts`
- `authenticateApiRequest(req)` — extrait `Authorization: Bearer ...`, cherche le hash en DB, vérifie plan STUDIO, met à jour `lastUsedAt`, retourne `{ org, dbUser, apiKey }`
- `apiError(code, message, status)` — helper réponse d'erreur uniforme
- `apiSuccess(data, meta?)` — helper réponse succès uniforme

---

## 3. Endpoints — Clés API (gestion)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/keys` | Lister les clés de l'org (sans hash) |
| `POST` | `/api/v1/keys` | Créer une clé — retourne la clé brute **une seule fois** |
| `DELETE` | `/api/v1/keys/:keyId` | Révoquer une clé |

Body POST :
```json
{ "name": "Discord bot modération" }
```

Réponse POST (unique occasion de voir la clé) :
```json
{
  "data": {
    "id": "clx...",
    "name": "Discord bot modération",
    "key": "rd_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "prefix": "rd_live_xxxx",
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "warning": "Store this key securely. It will not be shown again."
}
```

---

## 4. Endpoints — Workspace

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/workspace` | Info workspace (nom, slug, plan, counts) |
| `GET` | `/api/v1/workspace/members` | Liste des membres avec rôle |

---

## 5. Endpoints — Jeux

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/games` | Liste tous les jeux du workspace |
| `GET` | `/api/v1/games/:gameId` | Détails d'un jeu |

---

## 6. Endpoints — Live

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/games/:gameId/live` | Snapshot complet (servers + players + health) |
| `GET` | `/api/v1/games/:gameId/live/servers` | Serveurs actifs paginés |
| `GET` | `/api/v1/games/:gameId/live/players` | Joueurs en ligne paginés |

---

## 7. Endpoints — Joueurs

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/games/:gameId/players` | Liste paginée (`?search`, `?online`, `?page`, `?limit`) |
| `GET` | `/api/v1/games/:gameId/players/:robloxId` | Profil complet du joueur |
| `GET` | `/api/v1/games/:gameId/players/:robloxId/sanctions` | Sanctions du joueur |
| `GET` | `/api/v1/games/:gameId/players/:robloxId/notes` | Notes du joueur |
| `POST` | `/api/v1/games/:gameId/players/:robloxId/notes` | Ajouter une note |

---

## 8. Endpoints — Modération ⭐ (le plus important)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/games/:gameId/sanctions` | Liste paginée (`?status`, `?type`, `?page`, `?limit`) |
| `POST` | `/api/v1/games/:gameId/sanctions` | Créer une sanction |
| `GET` | `/api/v1/games/:gameId/sanctions/:sanctionId` | Détails d'une sanction |
| `DELETE` | `/api/v1/games/:gameId/sanctions/:sanctionId` | Révoquer une sanction |

Body POST sanctions :
```json
{
  "robloxId": "123456789",
  "type": "BAN",
  "reason": "Exploiting — auto-detected by anti-cheat",
  "durationMinutes": null
}
```

---

## 9. Endpoints — Logs

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/games/:gameId/logs` | Feed paginé (`?event`, `?robloxId`, `?from`, `?to`, `?page`, `?limit`) |

Rétention respectée selon le plan (7j FREE / 30j PRO / 90j STUDIO).

---

## 10. Endpoints — Analytics

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/games/:gameId/analytics/overview` | Stats globales (`?range=24h\|7d\|30d`, `?from`, `?to`) |
| `GET` | `/api/v1/games/:gameId/analytics/activity` | Timeline par bucket heure/jour |
| `GET` | `/api/v1/games/:gameId/analytics/economy` | Économie par devise (sources/sinks) |
| `GET` | `/api/v1/games/:gameId/analytics/monetization` | Monétisation par produit |
| `GET` | `/api/v1/games/:gameId/analytics/progression` | Funnel de progression |

---

## 11. Endpoints — Health

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/games/:gameId/health` | Statut de santé (healthy/warning/critical/idle) |

---

## 12. Format de réponse uniforme

### Succès
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 243,
    "has_more": true
  }
}
```

### Erreur
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or revoked API key."
  }
}
```

### Codes d'erreur
| Code | HTTP | Signification |
|------|------|---------------|
| `UNAUTHORIZED` | 401 | Clé manquante, invalide ou révoquée |
| `FORBIDDEN` | 403 | Plan insuffisant ou accès refusé à cette ressource |
| `NOT_FOUND` | 404 | Ressource inexistante dans ce workspace |
| `BAD_REQUEST` | 400 | Body invalide |
| `RATE_LIMITED` | 429 | Trop de requêtes |
| `INTERNAL_ERROR` | 500 | Erreur serveur |

---

## 13. UI Dashboard — Carte gestion des clés

Fichier : `src/app/(dashboard)/dashboard/settings/api-keys-card.tsx`

- Visible uniquement si plan STUDIO
- Affiche la liste des clés actives (prefix, nom, lastUsedAt, createdAt)
- Bouton "Create key" → modal avec champ nom → affiche la clé une fois avec bouton copy → warning "will not be shown again"
- Bouton "Revoke" par clé avec confirmation

---

## 14. Docs API dans le dashboard

Fichier : `src/app/(dashboard)/dashboard/docs/page.tsx` (à enrichir)

- Section "REST API" avec tous les endpoints
- Exemples de requêtes `curl`
- Lien vers la page Settings pour créer une clé

---

## 15. Variables d'environnement

Aucune variable nouvelle requise — l'API utilise la DB et les secrets existants.

---

## Ordre d'implémentation recommandé

1. Schema Prisma + migration SQL
2. `src/lib/api-key.ts`
3. `src/lib/api-auth.ts`
4. Routes `/api/v1/keys` (CRUD clés)
5. Middleware auth partagé appliqué à toutes les routes v1
6. Routes workspace
7. Routes games
8. Routes live
9. Routes players + notes
10. Routes sanctions (modération)
11. Routes logs
12. Routes analytics (5 endpoints)
13. Route health
14. UI settings — api-keys-card
15. Docs API dans le dashboard
