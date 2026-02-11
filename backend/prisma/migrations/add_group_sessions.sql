-- Add support for multi-party/group sessions

-- Group Session model for multi-party experiments
CREATE TABLE IF NOT EXISTS "GroupSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL UNIQUE,
  "experimentType" TEXT NOT NULL,
  "sessionType" TEXT NOT NULL DEFAULT 'multi-party', -- 'telepathy', 'entanglement', 'collective'

  -- Session state
  "status" TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'active', 'completed'
  "requiredParticipants" INTEGER NOT NULL DEFAULT 2,
  "currentParticipants" INTEGER NOT NULL DEFAULT 0,

  -- Timing
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),

  -- Results
  "groupScore" DOUBLE PRECISION,
  "correlationData" JSONB,
  "revealed" BOOLEAN NOT NULL DEFAULT false
);

-- Group participants
CREATE TABLE IF NOT EXISTS "GroupParticipant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "groupSessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT, -- 'sender', 'receiver', 'participant'

  -- Commitment
  "commitmentId" TEXT,
  "committed" BOOLEAN NOT NULL DEFAULT false,
  "committedAt" TIMESTAMP(3),

  -- Results
  "individualScore" DOUBLE PRECISION,

  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GroupParticipant_groupSessionId_fkey" FOREIGN KEY ("groupSessionId") REFERENCES "GroupSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GroupParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GroupParticipant_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "Commitment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Event window tracking
CREATE TABLE IF NOT EXISTS "EventWindow" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "commitmentId" TEXT NOT NULL UNIQUE,
  "experimentType" TEXT NOT NULL,
  "userId" TEXT NOT NULL,

  -- Window timing
  "commitTime" TIMESTAMP(3) NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,

  -- Prediction data
  "predictionSummary" TEXT,
  "predictionCategories" JSONB, -- tags, keywords, entities

  -- Real-world events collected
  "eventsCollected" JSONB, -- news, markets, weather, etc.
  "eventsCollectedAt" TIMESTAMP(3),

  -- Matching results
  "matchScore" DOUBLE PRECISION,
  "matchingEvents" JSONB,
  "matchEvidence" JSONB,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventWindow_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "Commitment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EventWindow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "GroupSession_sessionId_idx" ON "GroupSession"("sessionId");
CREATE INDEX IF NOT EXISTS "GroupSession_experimentType_idx" ON "GroupSession"("experimentType");
CREATE INDEX IF NOT EXISTS "GroupSession_status_idx" ON "GroupSession"("status");

CREATE INDEX IF NOT EXISTS "GroupParticipant_groupSessionId_idx" ON "GroupParticipant"("groupSessionId");
CREATE INDEX IF NOT EXISTS "GroupParticipant_userId_idx" ON "GroupParticipant"("userId");
CREATE INDEX IF NOT EXISTS "GroupParticipant_commitmentId_idx" ON "GroupParticipant"("commitmentId");

CREATE INDEX IF NOT EXISTS "EventWindow_userId_idx" ON "EventWindow"("userId");
CREATE INDEX IF NOT EXISTS "EventWindow_experimentType_idx" ON "EventWindow"("experimentType");
CREATE INDEX IF NOT EXISTS "EventWindow_windowEnd_idx" ON "EventWindow"("windowEnd");

-- Update Commitment table to link to sessions
ALTER TABLE "Commitment" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
CREATE INDEX IF NOT EXISTS "Commitment_sessionId_idx" ON "Commitment"("sessionId");
