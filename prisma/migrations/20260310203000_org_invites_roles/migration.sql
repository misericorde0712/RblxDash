-- Remove the legacy VIEWER role and upgrade existing members to MODERATOR
UPDATE "OrgMember"
SET "role" = 'MODERATOR'
WHERE "role" = 'VIEWER';

ALTER TABLE "OrgMember"
ALTER COLUMN "role" DROP DEFAULT;

ALTER TYPE "OrgRole" RENAME TO "OrgRole_old";

CREATE TYPE "OrgRole" AS ENUM ('MODERATOR', 'ADMIN', 'OWNER');

ALTER TABLE "OrgMember"
ALTER COLUMN "role" TYPE "OrgRole"
USING (
  CASE
    WHEN "role"::text = 'VIEWER' THEN 'MODERATOR'
    ELSE "role"::text
  END
)::"OrgRole";

DROP TYPE "OrgRole_old";

ALTER TABLE "OrgMember"
ALTER COLUMN "role" SET DEFAULT 'MODERATOR';

-- Workspace invitation links
CREATE TABLE "OrgInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "orgId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,

    CONSTRAINT "OrgInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgInvite_token_key" ON "OrgInvite"("token");
CREATE INDEX "OrgInvite_orgId_createdAt_idx" ON "OrgInvite"("orgId", "createdAt");
CREATE INDEX "OrgInvite_orgId_email_idx" ON "OrgInvite"("orgId", "email");

ALTER TABLE "OrgInvite"
ADD CONSTRAINT "OrgInvite_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgInvite"
ADD CONSTRAINT "OrgInvite_invitedByUserId_fkey"
FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgInvite"
ADD CONSTRAINT "OrgInvite_acceptedByUserId_fkey"
FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
