-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "model" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "config" JSONB,
    "guardrails" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "totalInteractions" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "averageLatency" DOUBLE PRECISION,
    "successRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentInteraction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "agentId" TEXT NOT NULL,
    "userId" TEXT,
    "messageType" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "latencyMs" INTEGER,
    "successful" BOOLEAN NOT NULL DEFAULT true,
    "guardrailsPassed" BOOLEAN NOT NULL DEFAULT true,
    "guardrailFlags" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEvaluation" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "evalType" TEXT NOT NULL,
    "dataset" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "testCases" INTEGER NOT NULL,
    "passedCases" INTEGER NOT NULL,
    "details" JSONB,
    "suggestions" JSONB,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'beginner',
    "estimatedDuration" INTEGER,
    "guardrails" JSONB,
    "requiresConsent" BOOLEAN NOT NULL DEFAULT true,
    "minAge" INTEGER NOT NULL DEFAULT 18,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "requiredRole" TEXT NOT NULL DEFAULT 'participant',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "averageCompletion" DOUBLE PRECISION,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperimentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "stepType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "agentId" TEXT,
    "config" JSONB,
    "requiredData" JSONB,
    "outputData" JSONB,
    "validationRules" JSONB,
    "canSkip" BOOLEAN NOT NULL DEFAULT false,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentInstance" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'started',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "collectedData" JSONB,
    "results" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "completionRate" DOUBLE PRECISION,
    "userRating" INTEGER,
    "userFeedback" TEXT,

    CONSTRAINT "ExperimentInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_name_key" ON "Agent"("name");

-- CreateIndex
CREATE INDEX "Agent_name_idx" ON "Agent"("name");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "AgentInteraction_sessionId_idx" ON "AgentInteraction"("sessionId");

-- CreateIndex
CREATE INDEX "AgentInteraction_agentId_idx" ON "AgentInteraction"("agentId");

-- CreateIndex
CREATE INDEX "AgentInteraction_userId_idx" ON "AgentInteraction"("userId");

-- CreateIndex
CREATE INDEX "AgentInteraction_timestamp_idx" ON "AgentInteraction"("timestamp");

-- CreateIndex
CREATE INDEX "AgentEvaluation_agentId_idx" ON "AgentEvaluation"("agentId");

-- CreateIndex
CREATE INDEX "AgentEvaluation_evalType_idx" ON "AgentEvaluation"("evalType");

-- CreateIndex
CREATE INDEX "AgentEvaluation_passed_idx" ON "AgentEvaluation"("passed");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentTemplate_slug_key" ON "ExperimentTemplate"("slug");

-- CreateIndex
CREATE INDEX "ExperimentTemplate_slug_idx" ON "ExperimentTemplate"("slug");

-- CreateIndex
CREATE INDEX "ExperimentTemplate_category_idx" ON "ExperimentTemplate"("category");

-- CreateIndex
CREATE INDEX "ExperimentTemplate_isPublic_idx" ON "ExperimentTemplate"("isPublic");

-- CreateIndex
CREATE INDEX "ExperimentTemplate_createdBy_idx" ON "ExperimentTemplate"("createdBy");

-- CreateIndex
CREATE INDEX "WorkflowStep_templateId_idx" ON "WorkflowStep"("templateId");

-- CreateIndex
CREATE INDEX "WorkflowStep_agentId_idx" ON "WorkflowStep"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_templateId_order_key" ON "WorkflowStep"("templateId", "order");

-- CreateIndex
CREATE INDEX "ExperimentInstance_templateId_idx" ON "ExperimentInstance"("templateId");

-- CreateIndex
CREATE INDEX "ExperimentInstance_userId_idx" ON "ExperimentInstance"("userId");

-- CreateIndex
CREATE INDEX "ExperimentInstance_status_idx" ON "ExperimentInstance"("status");

-- AddForeignKey
ALTER TABLE "AgentInteraction" ADD CONSTRAINT "AgentInteraction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperimentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentInteraction" ADD CONSTRAINT "AgentInteraction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentInteraction" ADD CONSTRAINT "AgentInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvaluation" ADD CONSTRAINT "AgentEvaluation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentTemplate" ADD CONSTRAINT "ExperimentTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ExperimentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentInstance" ADD CONSTRAINT "ExperimentInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ExperimentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentInstance" ADD CONSTRAINT "ExperimentInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
