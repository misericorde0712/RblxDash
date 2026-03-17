-- AlterTable: add configVersion and eventVersion to Game
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "configVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "eventVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: LiveConfig
CREATE TABLE IF NOT EXISTS "LiveConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueType" TEXT NOT NULL DEFAULT 'string',
    "group" TEXT NOT NULL DEFAULT 'default',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "LiveConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LiveEvent
CREATE TABLE IF NOT EXISTS "LiveEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "eventData" TEXT NOT NULL DEFAULT '{}',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "LiveEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: LiveConfig
CREATE UNIQUE INDEX IF NOT EXISTS "LiveConfig_gameId_key_key" ON "LiveConfig"("gameId", "key");
CREATE INDEX IF NOT EXISTS "LiveConfig_gameId_group_idx" ON "LiveConfig"("gameId", "group");

-- CreateIndex: LiveEvent
CREATE UNIQUE INDEX IF NOT EXISTS "LiveEvent_gameId_slug_key" ON "LiveEvent"("gameId", "slug");
CREATE INDEX IF NOT EXISTS "LiveEvent_gameId_active_startsAt_idx" ON "LiveEvent"("gameId", "active", "startsAt");

-- AddForeignKey: LiveConfig → Game
ALTER TABLE "LiveConfig" ADD CONSTRAINT "LiveConfig_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LiveEvent → Game
ALTER TABLE "LiveEvent" ADD CONSTRAINT "LiveEvent_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
