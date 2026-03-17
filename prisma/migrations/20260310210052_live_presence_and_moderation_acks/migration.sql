-- CreateEnum
CREATE TYPE "SanctionDeliveryStatus" AS ENUM ('PENDING', 'APPLIED', 'FAILED');

-- DropIndex
DROP INDEX IF EXISTS "Organization_billingOwnerId_idx";

-- AlterTable
ALTER TABLE "Sanction" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryDetails" TEXT,
ADD COLUMN     "deliveryStatus" "SanctionDeliveryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- Backfill existing sanctions before enforcing NOT NULL on updatedAt
UPDATE "Sanction"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

ALTER TABLE "Sanction" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Sanction" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" RENAME CONSTRAINT "Subscription_new_pkey" TO "Subscription_pkey";

-- AlterTable
ALTER TABLE "TrackedPlayer" ADD COLUMN     "currentServerJobId" TEXT,
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSessionEndedAt" TIMESTAMP(3),
ADD COLUMN     "lastSessionStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LiveServer" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "placeId" TEXT,
    "region" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPlayerCount" INTEGER NOT NULL DEFAULT 0,
    "lastPlayerIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "LiveServer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveServer_gameId_lastHeartbeatAt_idx" ON "LiveServer"("gameId", "lastHeartbeatAt");

-- CreateIndex
CREATE UNIQUE INDEX "LiveServer_gameId_jobId_key" ON "LiveServer"("gameId", "jobId");

-- CreateIndex
CREATE INDEX "TrackedPlayer_gameId_isOnline_lastSeenAt_idx" ON "TrackedPlayer"("gameId", "isOnline", "lastSeenAt");

-- AddForeignKey
ALTER TABLE "LiveServer" ADD CONSTRAINT "LiveServer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
