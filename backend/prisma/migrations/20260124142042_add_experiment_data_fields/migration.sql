-- AlterTable
ALTER TABLE "Commitment" ADD COLUMN     "data" JSONB,
ADD COLUMN     "experimentType" TEXT;

-- CreateTable
CREATE TABLE "TelepathySession" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'awaiting_receiver',
    "targetCID" TEXT,
    "targetImageUrl" TEXT,
    "targetDescription" TEXT,
    "distractorCIDs" TEXT[],
    "distractorUrls" TEXT[],
    "senderTags" TEXT[],
    "senderTagsHash" TEXT,
    "senderSalt" TEXT,
    "senderViewedAt" TIMESTAMP(3),
    "senderSubmittedAt" TIMESTAMP(3),
    "delayMinutes" INTEGER NOT NULL DEFAULT 30,
    "delayStartedAt" TIMESTAMP(3),
    "delayEndsAt" TIMESTAMP(3),
    "receiverTags" TEXT[],
    "receiverChoice" INTEGER,
    "receiverChoiceCID" TEXT,
    "receiverSubmittedAt" TIMESTAMP(3),
    "commitmentHash" TEXT,
    "commitTxId" TEXT,
    "revealTxId" TEXT,
    "blockchainMode" TEXT NOT NULL DEFAULT 'guest',
    "clipSimilarity" DOUBLE PRECISION,
    "psiCoefficient" DOUBLE PRECISION,
    "tagOverlapScore" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "scoringDetails" JSONB,
    "experimentType" TEXT NOT NULL DEFAULT 'telepathy-ghost',
    "inviteCode" TEXT,
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "TelepathySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelepathyMatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "preferredDelay" INTEGER NOT NULL DEFAULT 30,
    "matchedWith" TEXT,
    "sessionId" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelepathyMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelepathySession_inviteCode_key" ON "TelepathySession"("inviteCode");

-- CreateIndex
CREATE INDEX "TelepathySession_senderId_idx" ON "TelepathySession"("senderId");

-- CreateIndex
CREATE INDEX "TelepathySession_receiverId_idx" ON "TelepathySession"("receiverId");

-- CreateIndex
CREATE INDEX "TelepathySession_status_idx" ON "TelepathySession"("status");

-- CreateIndex
CREATE INDEX "TelepathySession_inviteCode_idx" ON "TelepathySession"("inviteCode");

-- CreateIndex
CREATE INDEX "TelepathySession_createdAt_idx" ON "TelepathySession"("createdAt");

-- CreateIndex
CREATE INDEX "TelepathyMatch_status_idx" ON "TelepathyMatch"("status");

-- CreateIndex
CREATE INDEX "TelepathyMatch_role_idx" ON "TelepathyMatch"("role");

-- CreateIndex
CREATE INDEX "TelepathyMatch_userId_idx" ON "TelepathyMatch"("userId");

-- CreateIndex
CREATE INDEX "TelepathyMatch_queuedAt_idx" ON "TelepathyMatch"("queuedAt");

-- AddForeignKey
ALTER TABLE "TelepathyMatch" ADD CONSTRAINT "TelepathyMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
