-- CreateTable
CREATE TABLE "BaselineProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ageRange" TEXT NOT NULL,
    "gender" TEXT,
    "handedness" TEXT NOT NULL,
    "timezone" TEXT,
    "meditationExperience" INTEGER NOT NULL DEFAULT 0,
    "beliefScale" INTEGER NOT NULL DEFAULT 5,
    "psiTraining" TEXT NOT NULL DEFAULT 'None',
    "geomagneticIndex" DOUBLE PRECISION,
    "lunarPhase" TEXT,
    "dataVersion" TEXT NOT NULL DEFAULT '1.0',
    "encryptedData" TEXT,
    "commitmentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaselineProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionCalibration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "experimentType" TEXT NOT NULL,
    "sleepHours" DOUBLE PRECISION,
    "caffeineIntake" TEXT,
    "substancesUsed" TEXT,
    "moodState" INTEGER NOT NULL DEFAULT 5,
    "stressLevel" INTEGER NOT NULL DEFAULT 5,
    "focusLevel" INTEGER NOT NULL DEFAULT 5,
    "timePressure" BOOLEAN NOT NULL DEFAULT false,
    "outcomeExpectation" INTEGER DEFAULT 5,
    "localTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceLight" DOUBLE PRECISION,
    "heartRate" INTEGER,
    "geomagneticIndex" DOUBLE PRECISION,
    "lunarPhase" TEXT,
    "attentionCheckPassed" BOOLEAN NOT NULL DEFAULT true,
    "dataVersion" TEXT NOT NULL DEFAULT '1.0',
    "encryptedData" TEXT,
    "commitmentHash" TEXT,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionCalibration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostExperimentFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "experimentType" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 5,
    "confidence" INTEGER NOT NULL DEFAULT 5,
    "phenomenology" TEXT[],
    "comments" TEXT,
    "tokensEarned" INTEGER NOT NULL DEFAULT 0,
    "bonusTokens" INTEGER NOT NULL DEFAULT 0,
    "tokenReason" TEXT,
    "achievementsUnlocked" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostExperimentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaselineProfile_userId_key" ON "BaselineProfile"("userId");

-- CreateIndex
CREATE INDEX "BaselineProfile_userId_idx" ON "BaselineProfile"("userId");

-- CreateIndex
CREATE INDEX "BaselineProfile_expiresAt_idx" ON "BaselineProfile"("expiresAt");

-- CreateIndex
CREATE INDEX "SessionCalibration_userId_idx" ON "SessionCalibration"("userId");

-- CreateIndex
CREATE INDEX "SessionCalibration_sessionId_idx" ON "SessionCalibration"("sessionId");

-- CreateIndex
CREATE INDEX "SessionCalibration_experimentType_idx" ON "SessionCalibration"("experimentType");

-- CreateIndex
CREATE INDEX "SessionCalibration_createdAt_idx" ON "SessionCalibration"("createdAt");

-- CreateIndex
CREATE INDEX "PostExperimentFeedback_userId_idx" ON "PostExperimentFeedback"("userId");

-- CreateIndex
CREATE INDEX "PostExperimentFeedback_sessionId_idx" ON "PostExperimentFeedback"("sessionId");

-- CreateIndex
CREATE INDEX "PostExperimentFeedback_experimentType_idx" ON "PostExperimentFeedback"("experimentType");

-- AddForeignKey
ALTER TABLE "BaselineProfile" ADD CONSTRAINT "BaselineProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCalibration" ADD CONSTRAINT "SessionCalibration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostExperimentFeedback" ADD CONSTRAINT "PostExperimentFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
