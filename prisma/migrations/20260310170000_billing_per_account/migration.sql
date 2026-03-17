-- Add billing owner to each organization
ALTER TABLE "Organization"
ADD COLUMN "billingOwnerId" TEXT;

WITH "resolvedOwners" AS (
  SELECT
    o."id" AS "orgId",
    COALESCE(
      (
        SELECT om."userId"
        FROM "OrgMember" om
        WHERE om."orgId" = o."id" AND om."role" = 'OWNER'
        ORDER BY om."joinedAt" ASC, om."id" ASC
        LIMIT 1
      ),
      (
        SELECT om."userId"
        FROM "OrgMember" om
        WHERE om."orgId" = o."id"
        ORDER BY om."joinedAt" ASC, om."id" ASC
        LIMIT 1
      )
    ) AS "userId"
  FROM "Organization" o
)
UPDATE "Organization" o
SET "billingOwnerId" = ro."userId"
FROM "resolvedOwners" ro
WHERE o."id" = ro."orgId";

ALTER TABLE "Organization"
ALTER COLUMN "billingOwnerId" SET NOT NULL;

CREATE INDEX "Organization_billingOwnerId_idx" ON "Organization"("billingOwnerId");

ALTER TABLE "Organization"
ADD CONSTRAINT "Organization_billingOwnerId_fkey"
FOREIGN KEY ("billingOwnerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rebuild subscriptions so they belong to billing owner accounts instead of organizations
CREATE TABLE "Subscription_new" (
    "id" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Subscription_new_pkey" PRIMARY KEY ("id")
);

WITH "rankedSubscriptions" AS (
  SELECT
    s."id",
    CASE
      WHEN s."stripeCustomerId" LIKE 'placeholder_%' THEN 'placeholder_' || o."billingOwnerId"
      ELSE s."stripeCustomerId"
    END AS "stripeCustomerId",
    s."stripeSubscriptionId",
    s."plan",
    s."status",
    s."currentPeriodEnd",
    s."createdAt",
    s."updatedAt",
    o."billingOwnerId" AS "userId",
    ROW_NUMBER() OVER (
      PARTITION BY o."billingOwnerId"
      ORDER BY
        CASE s."plan"
          WHEN 'STUDIO' THEN 2
          WHEN 'PRO' THEN 1
          ELSE 0
        END DESC,
        CASE
          WHEN s."stripeCustomerId" LIKE 'placeholder_%' THEN 0
          ELSE 1
        END DESC,
        s."updatedAt" DESC,
        s."createdAt" DESC,
        s."id" ASC
    ) AS "rowNum"
  FROM "Subscription" s
  INNER JOIN "Organization" o ON o."id" = s."orgId"
)
INSERT INTO "Subscription_new" (
  "id",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "plan",
  "status",
  "currentPeriodEnd",
  "createdAt",
  "updatedAt",
  "userId"
)
SELECT
  rs."id",
  rs."stripeCustomerId",
  rs."stripeSubscriptionId",
  rs."plan",
  rs."status",
  rs."currentPeriodEnd",
  rs."createdAt",
  rs."updatedAt",
  rs."userId"
FROM "rankedSubscriptions" rs
WHERE rs."rowNum" = 1;

DROP TABLE "Subscription";

ALTER TABLE "Subscription_new" RENAME TO "Subscription";

CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

ALTER TABLE "Subscription"
ADD CONSTRAINT "Subscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
