-- CreateTable ApiKey
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

ALTER TABLE "ApiKey"
  ADD CONSTRAINT "ApiKey_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApiKey"
  ADD CONSTRAINT "ApiKey_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
