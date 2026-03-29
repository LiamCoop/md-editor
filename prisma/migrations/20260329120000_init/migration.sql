CREATE TYPE "DocumentVisibility" AS ENUM ('PRIVATE', 'LINK');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authProvider" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "automergeIdentifier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentMember" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_authProvider_authUserId_key" ON "User"("authProvider", "authUserId");
CREATE INDEX "User_email_idx" ON "User"("email");

CREATE UNIQUE INDEX "Document_automergeIdentifier_key" ON "Document"("automergeIdentifier");
CREATE INDEX "Document_ownerId_idx" ON "Document"("ownerId");
CREATE INDEX "Document_updatedAt_idx" ON "Document"("updatedAt");

CREATE UNIQUE INDEX "DocumentMember_documentId_userId_key" ON "DocumentMember"("documentId", "userId");
CREATE INDEX "DocumentMember_userId_idx" ON "DocumentMember"("userId");

ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentMember" ADD CONSTRAINT "DocumentMember_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentMember" ADD CONSTRAINT "DocumentMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
