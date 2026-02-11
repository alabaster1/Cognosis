# Cognis Institute Experiment Enhancement Roadmap

## ✅ Backend Routes Created

The following backend routes have been implemented in `/backend/routes/experiments.js`:

### Card Prediction
- `POST /api/experiments/card-prediction/generate-target` - Generate cryptographically secure random card targets
- `POST /api/experiments/card-prediction/reveal` - Reveal and score card predictions

### AI Telepathy
- `POST /api/experiments/ai-telepathy/generate-target` - Generate random concept targets
- `POST /api/experiments/ai-telepathy/reveal` - Reveal and score telepathy guesses with warmth feedback

### Dice Influence
- `POST /api/experiments/dice-influence/generate-target` - Generate random dice roll targets
- `POST /api/experiments/dice-influence/reveal` - Reveal and score with chi-square analysis

## 📋 Implementation Status

### Phase 1 (Weeks 1-2): Fix Client-Side RNG Experiments

#### ✅ Completed
1. Created `randomTargetService.js` with cryptographic RNG
2. Added backend API routes for all 3 experiments
3. Implemented scoring algorithms:
   - Card Prediction: Hit rate vs 25% baseline
   - AI Telepathy: String similarity with warmth levels
   - Dice Influence: Chi-square statistical analysis

#### 🔄 In Progress
4. Update frontend API service methods
5. Refactor Card Prediction page.tsx to use backend commit/reveal
6. Refactor AI Telepathy page.tsx to use backend commit/reveal
7. Refactor Dice Influence page.tsx to use backend commit/reveal

#### ⏳ Pending
8. Make Card Prediction meditation user-guided
9. Make AI Telepathy meditation user-guided
10. Create RevealModal component for reusable reveal UI

---

## 📝 Detailed Implementation Steps

### Step 1: Update Frontend API Service

Add to `/web/src/services/api Service.ts`:

```typescript
// Card Prediction
async generateCardPredictionTarget(params: {
  difficulty: 'easy' | 'medium' | 'hard';
  verified: boolean;
}): Promise<{ commitmentId: string; nonce: string; totalRounds: number }> {
  return this.post('/experiments/card-prediction/generate-target', params);
}

async revealCardPrediction(params: {
  commitmentId: string;
  predictions: string[];
  nonce: string;
  verified: boolean;
}): Promise<{
  rounds: Array<{ prediction: string; actual: string; correct: boolean }>;
  hits: number;
  total: number;
  accuracy: number;
  baseline: number;
  difference: number;
  targets: string[];
}> {
  return this.post('/experiments/card-prediction/reveal', params);
}

// AI Telepathy
async generateTelepathyTarget(params: {
  rounds: number;
  verified: boolean;
}): Promise<{ commitmentId: string; nonce: string; totalRounds: number }> {
  return this.post('/experiments/ai-telepathy/generate-target', params);
}

async revealTelepathy(params: {
  commitmentId: string;
  guesses: string[][];
  nonce: string;
  verified: boolean;
}): Promise<{
  rounds: Array<{
    target: string;
    category: string;
    guesses: Array<{ guess: string; warmth: string }>;
    bestGuess: string;
    bestWarmth: string;
  }>;
  averageWarmth: string;
  accuracy: string;
  targets: Array<{ concept: string; category: string }>;
}> {
  return this.post('/experiments/ai-telepathy/reveal', params);
}

// Dice Influence
async generateDiceInfluenceTarget(params: {
  targetFace: number;
  totalRolls: number;
  verified: boolean;
}): Promise<{ commitmentId: string; nonce: string; totalRolls: number }> {
  return this.post('/experiments/dice-influence/generate-target', params);
}

async revealDiceInfluence(params: {
  commitmentId: string;
  nonce: string;
  verified: boolean;
}): Promise<{
  rolls: Array<{ number: number; result: number; isHit: boolean }>;
  hits: number;
  totalRolls: number;
  hitRate: number;
  expectedRate: number;
  difference: number;
  distribution: number[];
  chiSquare: number;
  significance: { level: string; description: string; color: string };
  targetFace: number;
  actualResults: number[];
}> {
  return this.post('/experiments/dice-influence/reveal', params);
}
```

### Step 2: Refactor Card Prediction Page

Key changes in `/web/src/app/experiments/card-prediction/page.tsx`:

**Before (Client-Side RNG):**
```typescript
const submitPrediction = () => {
  if (!selectedSuit) return;
  const actualSuit = SUITS[Math.floor(Math.random() * SUITS.length)]; // ❌ Client-side
  const correct = selectedSuit === actualSuit;
  // ...
};
```

**After (Backend Commit/Reveal):**
```typescript
// Phase 1: Generate and commit target
const startExperiment = async () => {
  setPhase('meditation');
  try {
    const result = await apiService.generateCardPredictionTarget({
      difficulty,
      verified: wallet.isVerified
    });
    setCommitmentId(result.commitmentId);
    setNonce(result.nonce);
    setTotalRounds(result.totalRounds);
  } catch (error) {
    setError('Failed to generate target');
  }
};

// Phase 2: Collect predictions (NO REVEAL YET)
const submitPrediction = () => {
  if (!selectedSuit) return;
  setPredictions([...predictions, selectedSuit]);
  setSelectedSuit(null);

  if (predictions.length + 1 >= totalRounds) {
    setPhase('results');
    revealAndScore();
  } else {
    setCurrentRound(currentRound + 1);
  }
};

// Phase 3: Reveal and score
const revealAndScore = async () => {
  try {
    const result = await apiService.revealCardPrediction({
      commitmentId,
      predictions,
      nonce,
      verified: wallet.isVerified
    });
    setResults(result);
    setPhase('success');
  } catch (error) {
    setError('Failed to reveal and score');
  }
};
```

### Step 3: User-Guided Meditation

Change meditation phase from auto-timer to user-controlled:

```typescript
{phase === 'meditation' && (
  <>
    {isLoading ? (
      <div>
        <Loader2 className="animate-spin" />
        <p>Generating target...</p>
      </div>
    ) : (
      <>
        <div className="meditation-guidelines">
          <h3>Meditation Guidelines</h3>
          <ul>
            <li>Find a quiet, comfortable space</li>
            <li>Take deep breaths to relax</li>
            <li>Clear your mind of distractions</li>
            <li>Focus on openness and receptivity</li>
          </ul>
        </div>
        <button onClick={() => setPhase('prediction')}>
          I'm Ready - Begin
        </button>
      </>
    )}
  </>
)}
```

---

## Phase 2 (Weeks 3-4): AI Scoring for Prediction Experiments

### Add AI Scoring Service

Create `/backend/services/predictionScoringService.js`:

```javascript
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class PredictionScoringService {
  async scorePrecognition(prediction, actualOutcome, verificationEvidence) {
    const prompt = `Evaluate this precognition prediction:

PREDICTION (made before event):
${prediction}

ACTUAL OUTCOME:
${actualOutcome}

VERIFICATION EVIDENCE:
${verificationEvidence}

Analyze accuracy and provide detailed scoring:
1. Overall accuracy score (0-100)
2. Specific hits (correct elements)
3. Specific misses (incorrect or missing elements)
4. Constructive feedback

Return as JSON with structure:
{
  "overallScore": number (0-100),
  "accuracy": "exceptional" | "good" | "fair" | "poor",
  "hits": [{ "element": string, "confidence": string, "explanation": string }],
  "misses": [{ "element": string, "importance": string, "explanation": string }],
  "feedback": string,
  "strengths": [string],
  "areasForImprovement": [string]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert precognition evaluator.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    let content = response.choices[0].message.content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    return JSON.parse(content);
  }

  async scoreEventForecasting(/* similar to precognition */) { /* ... */ }
  async scoreDreamJournal(/* ... */) { /* ... */ }
  async scoreTelepathy(/* ... */) { /* ... */ }
  async scoreGlobalConsciousness(/* ... */) { /* ... */ }
}

module.exports = new PredictionScoringService();
```

### Add Reveal Endpoints

Add to `/backend/routes/experiments.js`:

```javascript
// Precognition reveal
router.post('/precognition/reveal', optionalAuthMiddleware, async (req, res) => {
  const { commitmentId, actualOutcome, verificationEvidence } = req.body;

  // 1. Get commitment from database
  const commitment = await prisma.commitment.findUnique({ where: { id: commitmentId } });

  // 2. Retrieve encrypted prediction
  let predictionData;
  if (commitment.ipfsCID) {
    predictionData = await ipfsService.retrieve(commitment.ipfsCID);
  } else {
    predictionData = commitment.data;
  }

  // 3. Score with AI
  const scoringResult = await predictionScoringService.scorePrecognition(
    predictionData.prediction,
    actualOutcome,
    verificationEvidence
  );

  // 4. Store results
  await prisma.response.create({
    data: {
      commitmentId,
      revealedAt: new Date(),
      decryptedData: JSON.stringify({ actualOutcome, verificationEvidence }),
      aiScore: scoringResult.overallScore,
      aiScoreBreakdown: scoringResult
    }
  });

  await prisma.commitment.update({ where: { id: commitmentId }, data: { revealed: true } });

  res.json({ success: true, ...scoringResult });
});
```

---

## Phase 3 (Weeks 5-6): Gamification & Analytics

### Streak Tracking

Update database schema (`prisma/schema.prisma`):

```prisma
model User {
  id            String   @id @default(uuid())
  walletAddress String   @unique
  currentStreak Int      @default(0)
  longestStreak Int      @default(0)
  lastActivityDate DateTime?
  achievements  Achievement[]
  // ...
}

model Achievement {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  type        String   // 'streak', 'accuracy', 'explorer', etc.
  name        String
  description String
  unlockedAt  DateTime @default(now())
  metadata    Json?
}
```

Create `/backend/services/gamificationService.js`:

```javascript
class GamificationService {
  async updateStreak(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const today = new Date().toDateString();
    const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate).toDateString() : null;

    if (lastActivity === today) {
      return user; // Already updated today
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    const newStreak = lastActivity === yesterday ? user.currentStreak + 1 : 1;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, user.longestStreak),
        lastActivityDate: new Date()
      }
    });

    // Check for achievements
    await this.checkStreakAchievements(userId, newStreak);

    return updated;
  }

  async checkStreakAchievements(userId, streak) {
    const milestones = [7, 30, 100, 365];
    for (const milestone of milestones) {
      if (streak === milestone) {
        await this.unlockAchievement(userId, {
          type: 'streak',
          name: `${milestone}-Day Streak`,
          description: `Maintained a ${milestone}-day experiment streak`
        });
      }
    }
  }

  async unlockAchievement(userId, achievement) {
    const existing = await prisma.achievement.findFirst({
      where: { userId, type: achievement.type, name: achievement.name }
    });

    if (!existing) {
      return await prisma.achievement.create({
        data: { userId, ...achievement }
      });
    }
  }
}
```

### Time-Series Dashboard

Create `/web/src/components/dashboard/PerformanceCharts.tsx`:

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function PerformanceCharts({ experiments }: { experiments: any[] }) {
  // Process experiments into time-series data
  const data = experiments.map(exp => ({
    date: new Date(exp.createdAt).toLocaleDateString(),
    accuracy: exp.response?.aiScore || 0,
    type: exp.experimentType
  }));

  return (
    <div className="bg-white rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-4">Accuracy Over Time</h2>
      <LineChart width={800} height={400} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="accuracy" stroke="#8884d8" />
      </LineChart>
    </div>
  );
}
```

---

## Phase 4 (Weeks 7-8): Multi-User & Meta-Analysis

### WebSocket Setup

Install dependencies:
```bash
npm install socket.io socket.io-client
```

Create `/backend/services/socketService.js`:

```javascript
const { Server } = require('socket.io');

class SocketService {
  init(server) {
    this.io = new Server(server, {
      cors: { origin: process.env.FRONTEND_URL, credentials: true }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-telepathy-session', (sessionId) => {
        socket.join(sessionId);
        this.io.to(sessionId).emit('participant-joined', socket.id);
      });

      socket.on('send-telepathy-target', (data) => {
        this.io.to(data.sessionId).emit('target-sent', data);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }
}

module.exports = new SocketService();
```

### Meta-Analysis Aggregation

Create `/backend/routes/meta-analysis.js`:

```javascript
router.get('/global-stats', async (req, res) => {
  const stats = await prisma.response.groupBy({
    by: ['experimentType'],
    _avg: { aiScore: true },
    _count: { _all: true }
  });

  const aggregated = stats.map(stat => ({
    type: stat.experimentType,
    averageScore: stat._avg.aiScore,
    totalTrials: stat._count._all,
    effectSize: calculateCohenD(stat._avg.aiScore, 50), // 50 = chance baseline
    confidenceInterval: calculateCI(stat)
  }));

  res.json({ success: true, stats: aggregated });
});
```

---

## 🎯 Next Steps

1. Run `npm install recharts socket.io socket.io-client` in backend and frontend
2. Restart backend server to load new routes
3. Test card prediction flow with curl or Postman
4. Refactor frontend pages one by one
5. Add reveal modal component
6. Implement Phase 2 AI scoring
7. Build gamification system
8. Deploy Phase 4 advanced features

## 📚 Documentation

- Backend API docs: `/backend/API.md`
- Frontend component docs: `/web/COMPONENTS.md`
- Database schema: `/backend/prisma/schema.prisma`
- Security model: `/docs/SECURITY.md`
