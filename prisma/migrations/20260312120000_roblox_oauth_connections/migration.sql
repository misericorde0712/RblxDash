-- CreateTable
CREATE TABLE "RobloxConnection" (
    "id" TEXT NOT NULL,
    "robloxUserId" TEXT NOT NULL,
    "robloxUsername" TEXT,
    "robloxDisplayName" TEXT,
    "robloxProfileUrl" TEXT,
    "robloxAvatarUrl" TEXT,
    "scopes" TEXT[],
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenType" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rawResourceData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RobloxConnection_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Game"
ADD COLUMN     "robloxConnectionId" TEXT,
ADD COLUMN     "robloxUniverseId" TEXT,
ALTER COLUMN   "openCloudApiKey" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RobloxConnection_robloxUserId_key" ON "RobloxConnection"("robloxUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RobloxConnection_userId_key" ON "RobloxConnection"("userId");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_robloxConnectionId_fkey" FOREIGN KEY ("robloxConnectionId") REFERENCES "RobloxConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobloxConnection" ADD CONSTRAINT "RobloxConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
