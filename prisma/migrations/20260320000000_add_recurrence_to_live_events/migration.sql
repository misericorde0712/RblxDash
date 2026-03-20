-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('ONCE', 'ALWAYS', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable: make startsAt optional
ALTER TABLE "LiveEvent" ALTER COLUMN "startsAt" DROP NOT NULL;

-- AlterTable: add recurrence fields
ALTER TABLE "LiveEvent" ADD COLUMN "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'ONCE',
ADD COLUMN "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "recurrenceDaysOfWeek" INTEGER[],
ADD COLUMN "recurrenceDayOfMonth" INTEGER,
ADD COLUMN "duration" INTEGER,
ADD COLUMN "recurrenceTimeOfDay" TEXT,
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- DropIndex
DROP INDEX IF EXISTS "LiveEvent_gameId_active_startsAt_idx";

-- CreateIndex
CREATE INDEX "LiveEvent_gameId_active_recurrenceType_idx" ON "LiveEvent"("gameId", "active", "recurrenceType");
