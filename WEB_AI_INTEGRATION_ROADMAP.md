# Web App AI Integration Roadmap

Complete guide for integrating the new AI agents (RVExpertAgent, PsiScoreAI, MetaCoordinator) into the Cognis Institute web application.

---

## 🎯 Overview

This roadmap covers the complete integration of Phase 4 AI agents into the Next.js web application, enabling:
- Stage-based Remote Viewing sessions with AI guidance
- Multi-dimensional AI scoring of RV sessions
- Real-time chat with specialized RV expert
- Automated feedback generation
- Event-driven coordination between agents

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Backend Webhook Infrastructure](#phase-1-backend-webhook-infrastructure)
3. [Phase 2: Frontend Components](#phase-2-frontend-components)
4. [Phase 3: RV Session Flow](#phase-3-rv-session-flow)
5. [Phase 4: Integration & Testing](#phase-4-integration--testing)
6. [Phase 5: Polish & Optimization](#phase-5-polish--optimization)

---

## Prerequisites

### Already Completed ✅
- Database schema extended with Agent models
- Python AI service running (`http://localhost:8001`)
- RVExpertAgent implemented
- PsiScoreAI agent implemented
- MetaCoordinator operational
- ChatKit component available

### What You Need
- AI service running (`cd ai && python3 main.py`)
- Backend service running (`cd backend && npm run dev`)
- Web app running (`cd web && npm run dev`)
- OpenAI API key configured in `ai/.env`

---

## Phase 1: Backend Webhook Infrastructure

### Step 1.1: Create AI Webhook Route
**File**: `backend/routes/aiWebhooks.js`

```javascript
// Event webhook handlers for AI agent coordination
const express = require('express');
const router = express.Router();
const prisma = require('../db');

// POST /api/webhooks/rv/target-committed
// Called when target is committed to blockchain
router.post('/rv/target-committed', async (req, res) => {
  try {
    const { sessionId, targetHash, metadata } = req.body;

    // Notify RV-Expert that session can begin
    const response = await fetch('http://localhost:8001/rv/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: metadata.userId,
        protocol: metadata.protocol || 'CRV',
        context: metadata
      })
    });

    const result = await response.json();

    // Store interaction in database
    await prisma.agentInteraction.create({
      data: {
        sessionId,
        agentId: 'rv_expert',
        userId: metadata.userId,
        messageType: 'session_start',
        role: 'assistant',
        content: result.message,
        successful: true
      }
    });

    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Target committed webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/webhooks/rv/session-complete
// Called when participant completes RV session
router.post('/rv/session-complete', async (req, res) => {
  try {
    const { sessionId, userId, impressions } = req.body;

    // Notify PsiScoreAI to score the session
    // (Target reveal happens here)
    const targetData = await getTargetForSession(sessionId);

    const scoreResponse = await fetch('http://localhost:8001/rv/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        impressions,
        target_data: targetData.data,
        target_hash: targetData.hash
      })
    });

    const scoring = await scoreResponse.json();

    // Store scoring results
    await prisma.experimentSession.update({
      where: { id: sessionId },
      data: {
        score: scoring.scores.overall_score,
        metadata: { ...impressions, scoring }
      }
    });

    res.json({ success: true, scoring });
  } catch (error) {
    console.error('Session complete webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/webhooks/rv/scoring-complete
// Called when PsiScoreAI completes scoring
router.post('/rv/scoring-complete', async (req, res) => {
  try {
    const { sessionId, userId, scoring, impressions } = req.body;

    // Generate personalized feedback via RV-Expert
    const feedbackResponse = await fetch('http://localhost:8001/rv/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        scoring_results: scoring,
        impressions
      })
    });

    const feedback = await feedbackResponse.json();

    // Store feedback
    await prisma.agentInteraction.create({
      data: {
        sessionId,
        agentId: 'rv_expert',
        userId,
        messageType: 'feedback',
        role: 'assistant',
        content: feedback.feedback,
        successful: true
      }
    });

    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Scoring complete webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Step 1.2: Register Webhook Routes
**File**: `backend/server.js`

```javascript
// Add this with other route imports
const aiWebhooks = require('./routes/aiWebhooks');

// Register route (with other app.use statements)
app.use('/api/webhooks', aiWebhooks);
```

### Step 1.3: Create AI Service Helper
**File**: `backend/services/aiService.js`

```javascript
// Helper functions for calling AI service
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

class AIService {
  static async startRVSession(sessionId, userId, protocol = 'CRV') {
    const response = await fetch(`${AI_SERVICE_URL}/rv/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, user_id: userId, protocol })
    });
    return response.json();
  }

  static async getRVGuidance(sessionId, stage, previousImpressions) {
    const response = await fetch(`${AI_SERVICE_URL}/rv/session/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        stage,
        protocol: 'CRV',
        previous_impressions: previousImpressions
      })
    });
    return response.json();
  }

  static async scoreRVSession(sessionId, userId, impressions, targetData, targetHash) {
    const response = await fetch(`${AI_SERVICE_URL}/rv/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        impressions,
        target_data: targetData,
        target_hash: targetHash
      })
    });
    return response.json();
  }

  static async chatWithAgent(agentName, messages, sessionId, userId, metadata) {
    const response = await fetch(`${AI_SERVICE_URL}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_name: agentName,
        session_id: sessionId,
        user_id: userId,
        messages,
        metadata
      })
    });
    return response.json();
  }
}

module.exports = AIService;
```

---

## Phase 2: Frontend Components

### Step 2.1: Create RV Session Manager Hook
**File**: `web/src/hooks/useRVSession.ts`

```typescript
import { useState, useCallback } from 'react';

interface RVSessionState {
  sessionId: string | null;
  currentStage: number;
  protocol: string;
  impressions: Record<string, any>;
  isLoading: boolean;
  error: string | null;
}

export function useRVSession() {
  const [state, setState] = useState<RVSessionState>({
    sessionId: null,
    currentStage: 1,
    protocol: 'CRV',
    impressions: {},
    isLoading: false,
    error: null
  });

  const startSession = useCallback(async (userId: string, protocol: string = 'CRV') => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create session in backend
      const response = await fetch('/api/experiments/rv/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, protocol })
      });

      const { sessionId, welcomeMessage } = await response.json();

      setState(prev => ({
        ...prev,
        sessionId,
        currentStage: 1,
        protocol,
        isLoading: false
      }));

      return { sessionId, welcomeMessage };
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      throw error;
    }
  }, []);

  const advanceStage = useCallback(async (stageImpressions: any) => {
    setState(prev => ({
      ...prev,
      impressions: {
        ...prev.impressions,
        [`stage_${prev.currentStage}_data`]: stageImpressions
      },
      currentStage: prev.currentStage + 1
    }));
  }, []);

  const completeSession = useCallback(async (finalImpressions: any) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/experiments/rv/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          impressions: {
            ...state.impressions,
            [`stage_${state.currentStage}_data`]: finalImpressions
          }
        })
      });

      const result = await response.json();
      setState(prev => ({ ...prev, isLoading: false }));

      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      throw error;
    }
  }, [state.sessionId, state.impressions, state.currentStage]);

  return {
    ...state,
    startSession,
    advanceStage,
    completeSession
  };
}
```

### Step 2.2: Create RV Stage Component
**File**: `web/src/components/rv/RVStageGuide.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Brain, Eye, Hand, Heart, MessageCircle, Box } from 'lucide-react';

interface RVStageGuideProps {
  sessionId: string;
  stage: number;
  previousImpressions?: string;
  onComplete: (impressions: any) => void;
}

const STAGE_ICONS = {
  1: Eye,
  2: Hand,
  3: Box,
  4: Heart,
  5: MessageCircle,
  6: Brain
};

const STAGE_NAMES = {
  1: 'Ideogram Detection',
  2: 'Sensory Contact',
  3: 'Dimensional Analysis',
  4: 'Aesthetic Impact',
  5: 'Analytical Queries',
  6: '3D Modeling'
};

export default function RVStageGuide({
  sessionId,
  stage,
  previousImpressions,
  onComplete
}: RVStageGuideProps) {
  const [guidance, setGuidance] = useState<string>('');
  const [impressions, setImpressions] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const Icon = STAGE_ICONS[stage as keyof typeof STAGE_ICONS] || Brain;

  useEffect(() => {
    async function fetchGuidance() {
      setIsLoading(true);

      try {
        const response = await fetch('http://localhost:8001/rv/session/guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            stage,
            protocol: 'CRV',
            previous_impressions: previousImpressions
          })
        });

        const data = await response.json();
        setGuidance(data.guidance);
      } catch (error) {
        console.error('Failed to fetch guidance:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGuidance();
  }, [sessionId, stage, previousImpressions]);

  const handleSubmit = () => {
    onComplete({
      text: impressions,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
          <Icon className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Stage {stage}: {STAGE_NAMES[stage as keyof typeof STAGE_NAMES]}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">CRV Protocol</p>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">{guidance}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Record your impressions:
            </label>
            <textarea
              value={impressions}
              onChange={(e) => setImpressions(e.target.value)}
              className="w-full h-48 p-3 border border-gray-300 dark:border-gray-700 rounded-lg
                       bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500"
              placeholder="Write down everything you perceive..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!impressions.trim()}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                     font-medium disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
          >
            {stage === 6 ? 'Complete Session' : `Continue to Stage ${stage + 1}`}
          </button>
        </div>
      )}
    </div>
  );
}
```

### Step 2.3: Create RV Session Page
**File**: `web/src/app/experiments/rv-session/[sessionId]/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RVStageGuide from '@/components/rv/RVStageGuide';
import ChatKit from '@/components/ai/ChatKit';

export default function RVSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [currentStage, setCurrentStage] = useState(1);
  const [impressions, setImpressions] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);
  const [scoring, setScoring] = useState<any>(null);

  const handleStageComplete = async (stageImpressions: any) => {
    const updatedImpressions = {
      ...impressions,
      [`stage_${currentStage}_data`]: stageImpressions
    };

    setImpressions(updatedImpressions);

    if (currentStage === 6) {
      // Complete session
      await completeSession(updatedImpressions);
    } else {
      // Advance to next stage
      setCurrentStage(prev => prev + 1);
    }
  };

  const completeSession = async (finalImpressions: any) => {
    try {
      const response = await fetch('/api/webhooks/rv/session-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: 'current-user-id', // Get from auth
          impressions: finalImpressions
        })
      });

      const result = await response.json();
      setScoring(result.scoring);
      setShowResults(true);
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  if (showResults && scoring) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Session Results</h1>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Score</h3>
            <p className="text-3xl font-bold text-purple-600">
              {(scoring.scores.overall_score * 100).toFixed(1)}%
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Percentile</h3>
            <p className="text-3xl font-bold text-blue-600">
              {scoring.statistical_context.percentile}th
            </p>
          </div>
        </div>

        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Detailed Analysis</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {scoring.detailed_analysis}
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      <div className="lg:col-span-2">
        <RVStageGuide
          sessionId={sessionId}
          stage={currentStage}
          previousImpressions={
            currentStage > 1 ? impressions[`stage_${currentStage - 1}_data`]?.text : undefined
          }
          onComplete={handleStageComplete}
        />
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-6">
          <ChatKit
            agentName="rv_expert"
            sessionId={sessionId}
            userId="current-user-id"
            experimentType="remote-viewing-crv"
            metadata={{ currentStage }}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 3: RV Session Flow

### Complete Event Flow

```
1. User clicks "Start Remote Viewing Session"
   ↓
2. Frontend creates session → Backend POST /api/experiments/rv/start
   ↓
3. Backend generates target → Commits to blockchain
   ↓
4. Backend triggers webhook → POST /api/webhooks/rv/target-committed
   ↓
5. RV-Expert generates welcome message
   ↓
6. User sees Stage 1 guidance → Records impressions
   ↓
7. User advances through Stages 1-6
   ↓
8. User completes Stage 6 → Frontend POST /api/webhooks/rv/session-complete
   ↓
9. Target revealed → PsiScoreAI scores session
   ↓
10. Scoring complete → POST /api/webhooks/rv/scoring-complete
   ↓
11. RV-Expert generates personalized feedback
   ↓
12. User sees results page with scoring + feedback
```

### Database Updates Required

```prisma
model ExperimentSession {
  // ... existing fields

  // Add these fields
  rvStage          Int?              // Current CRV stage (1-6)
  rvProtocol       String?           // CRV, ERV, ARV, etc.
  rvImpressions    Json?             // Stage-by-stage impressions
  rvScoring        Json?             // PsiScoreAI results
  rvFeedback       String?           // RV-Expert personalized feedback
}
```

---

## Phase 4: Integration & Testing

### Step 4.1: Create Test Session
```bash
# Terminal 1: Start AI service
cd ai
python3 main.py

# Terminal 2: Start backend
cd backend
npm run dev

# Terminal 3: Start web app
cd web
npm run dev
```

### Step 4.2: Test Checklist
- [ ] AI service responds to health check (`http://localhost:8001/`)
- [ ] RV-Expert status accessible (`http://localhost:8001/rv/status`)
- [ ] PsiScoreAI status accessible (`http://localhost:8001/rv/scorer/status`)
- [ ] Backend webhook routes registered
- [ ] Create new RV session from UI
- [ ] Progress through all 6 CRV stages
- [ ] Submit impressions at each stage
- [ ] Chat with RV-Expert during session
- [ ] Complete session and see scoring
- [ ] Review personalized feedback
- [ ] Check database for AgentInteraction records

### Step 4.3: API Integration Tests
```typescript
// Test file: web/src/__tests__/rv-integration.test.ts

describe('RV Session Integration', () => {
  it('should start a new RV session', async () => {
    const response = await fetch('/api/experiments/rv/start', {
      method: 'POST',
      body: JSON.stringify({ userId: 'test-user', protocol: 'CRV' })
    });
    expect(response.ok).toBe(true);
  });

  it('should get stage guidance from RV-Expert', async () => {
    const response = await fetch('http://localhost:8001/rv/session/guide', {
      method: 'POST',
      body: JSON.stringify({
        session_id: 'test-session',
        stage: 1,
        protocol: 'CRV'
      })
    });
    const data = await response.json();
    expect(data.guidance).toBeDefined();
  });

  // ... more tests
});
```

---

## Phase 5: Polish & Optimization

### Step 5.1: Loading States
- Skeleton screens during AI response generation
- Progress indicators for multi-stage workflows
- Optimistic UI updates

### Step 5.2: Error Handling
- Graceful fallbacks if AI service is down
- Retry logic for failed webhook calls
- User-friendly error messages

### Step 5.3: Performance
- Cache AI guidance for common scenarios
- Debounce chat inputs
- Lazy load heavy components

### Step 5.4: Analytics
Track key metrics:
- Session completion rate
- Average score by stage
- AI response latency
- User satisfaction ratings

---

## 🚀 Quick Start Commands

```bash
# 1. Start all services
npm run dev:all  # (if you have a unified script)

# Or manually:
# Terminal 1: AI Service
cd ai && python3 main.py

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Web App
cd web && npm run dev

# 2. Test RV Session
# Navigate to: http://localhost:3000/experiments/remote-viewing
# Click "Start CRV Session"
# Follow the 6-stage workflow

# 3. Monitor AI Service
# Visit: http://localhost:8001/docs
# Test endpoints directly
```

---

## 📊 Success Metrics

### Technical Metrics
- [ ] All API endpoints respond < 2s
- [ ] AI guidance generates < 5s
- [ ] Session completion flow works end-to-end
- [ ] No errors in console/logs
- [ ] Database updates correctly

### User Experience Metrics
- [ ] Session completion rate > 80%
- [ ] Users understand stage guidance
- [ ] Chat responses feel natural
- [ ] Scoring feedback is actionable
- [ ] Users want to repeat sessions

---

## 🔧 Troubleshooting

### AI Service Not Responding
```bash
# Check if running
lsof -i :8001

# Restart service
cd ai
python3 main.py

# Check logs
tail -f ai/logs/service.log
```

### Webhook Failures
```bash
# Check backend logs
cd backend
npm run dev

# Test webhook directly
curl -X POST http://localhost:3001/api/webhooks/rv/target-committed \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","targetHash":"abc123","metadata":{}}'
```

### Database Issues
```bash
# Check Prisma connection
cd backend
npx prisma studio

# Run migrations
npx prisma migrate dev
```

---

## 📚 Additional Resources

- [AI Service Documentation](ai/README.md)
- [AgentKit Integration Guide](AGENTKIT_INTEGRATION.md)
- [MetaCoordinator Usage](ai/METACOORDINATOR_GUIDE.md)
- [Remote Viewing Protocols](RV_PROTOCOLS.md)
- [API Reference](http://localhost:8001/docs)

---

## ✅ Completion Checklist

### Backend
- [ ] Webhook routes created (`aiWebhooks.js`)
- [ ] AI service helper created (`aiService.js`)
- [ ] Routes registered in `server.js`
- [ ] Database schema updated
- [ ] Webhooks tested with curl

### Frontend
- [ ] `useRVSession` hook created
- [ ] `RVStageGuide` component created
- [ ] RV session page created
- [ ] ChatKit integrated
- [ ] Results page styled
- [ ] Loading states added
- [ ] Error boundaries implemented

### Testing
- [ ] End-to-end session flow works
- [ ] All 6 stages functional
- [ ] Scoring displays correctly
- [ ] Feedback generates properly
- [ ] Database records created
- [ ] No console errors
- [ ] Mobile responsive

### Documentation
- [ ] README updated
- [ ] API endpoints documented
- [ ] User guide created
- [ ] Developer notes added

---

**Total Implementation Time**: 6-8 hours for complete integration

**Priority**:
1. Backend webhooks (1-2 hours)
2. Frontend components (2-3 hours)
3. Testing & debugging (2-3 hours)
4. Polish & optimization (1-2 hours)

---

*Generated: Phase 4 - Domain-Specific Agents Integration*
*Last Updated: 2025-10-07*
