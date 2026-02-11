# Cognosis AI Service

AI agent orchestration for experimental psychology research platform.

## Overview

This Python/FastAPI service provides AI-powered agents to enhance the Cognosis platform:

- **ExperimentConductor**: Real-time guidance during experiments
- **DataAnalyst**: Statistical analysis and interpretation
- **Guardrails**: Safety and scientific integrity validation

## Architecture

```
ai/
├── main.py                    # FastAPI application
├── requirements.txt           # Python dependencies
├── .env.example              # Environment configuration
├── agents/
│   ├── __init__.py
│   ├── experiment_conductor.py  # Participant guidance agent
│   ├── data_analyst.py          # Statistical analysis agent
│   └── guardrails.py            # Validation and safety rules
└── utils/                     # Shared utilities
```

## Setup

### 1. Install Dependencies

```bash
cd ai
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 3. Run the Service

```bash
python main.py
```

The service will start on `http://localhost:8001`

## API Endpoints

### Health Check

```
GET /
GET /health
```

### ExperimentConductor

```
POST /agent/chat
POST /conductor/guidance
GET /conductor/status
```

### DataAnalyst

```
POST /analyst/session       # Analyze single session
POST /analyst/aggregate     # Analyze multiple sessions
GET /analyst/status
```

## Usage Examples

### Chat with ExperimentConductor

```python
import requests

response = requests.post('http://localhost:8001/agent/chat', json={
    "agent_name": "experiment_conductor",
    "session_id": "session_123",
    "user_id": "user_456",
    "messages": [
        {"role": "user", "content": "What should I focus on during remote viewing?"}
    ],
    "metadata": {
        "experiment_type": "remote-viewing-images"
    }
})

print(response.json()["response"])
```

### Analyze Session Results

```python
response = requests.post('http://localhost:8001/analyst/session', json={
    "session_id": "session_123",
    "experiment_type": "card-prediction",
    "responses": [
        {"prediction": "hearts", "match": True},
        {"prediction": "clubs", "match": False},
        # ... more responses
    ],
    "targets": [
        {"card": "hearts"},
        {"card": "diamonds"},
        # ... more targets
    ]
})

result = response.json()
print(result["interpretation"])
print(result["statistics"])
```

## Agents

### ExperimentConductor

**Purpose**: Provide real-time guidance and support during experiments

**Capabilities**:
- Context-sensitive instructions
- Answering participant questions
- Maintaining scientific integrity
- Avoiding participant bias

**Guardrails**:
- Never reveals targets before commitment
- No leading questions
- No medical/psychological claims
- Maintains neutrality about psi existence

### DataAnalyst

**Purpose**: Analyze experiment results and generate statistical reports

**Capabilities**:
- Statistical hypothesis testing
- Effect size calculation
- Bayesian baseline updates
- Visualization recommendations

**Statistical Methods**:
- Binomial tests for binary outcomes
- t-tests for continuous data
- Confidence intervals (95%)
- Multiple comparison corrections

**Guardrails**:
- Conservative interpretation
- Required caveats and limitations
- No unsupported claims
- Proper sample size considerations

## Guardrails System

All agent responses are validated against:

1. **Content Safety**
   - No medical/psychological diagnoses
   - No financial advice
   - No harmful content
   - No personal data requests

2. **Scientific Integrity**
   - No leading questions
   - Accurate descriptions
   - Proper consent
   - Data privacy
   - No false claims

3. **Agent-Specific Rules**
   - ExperimentConductor: No bias toward specific responses
   - DataAnalyst: Require statistical rigor

## Integration with Cognosis

### Frontend (Next.js/React)

The `ChatKit` component in `/web/src/components/ai/ChatKit.tsx` provides the UI:

```tsx
import ChatKit from '@/components/ai/ChatKit';

<ChatKit
  agentName="experiment_conductor"
  sessionId={sessionId}
  userId={userId}
  experimentType="remote-viewing-images"
/>
```

### Backend (Node.js/Express)

Experiments can call AI service endpoints:

```javascript
const response = await fetch('http://localhost:8001/analyst/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: sessionId,
    experiment_type: experimentType,
    responses: responses,
    targets: targets
  })
});

const analysis = await response.json();
```

### Database (Prisma)

Agent interactions are tracked in the database:

- `Agent` - Agent configuration
- `AgentInteraction` - Chat logs
- `AgentEvaluation` - Performance metrics

## Development

### Adding a New Agent

1. Create agent file in `agents/` directory
2. Implement agent class with:
   - `__init__()` - Initialize OpenAI client
   - `system_prompt` - Define agent personality
   - Core methods for agent capabilities
   - `get_status()` - Return agent metadata
3. Add to `agents/__init__.py` exports
4. Register in `main.py`
5. Add API endpoints

### Running Tests

```bash
pytest tests/
```

### Code Quality

```bash
black .  # Format code
flake8 . # Lint code
mypy .   # Type checking
```

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Environment Variables

Production requires:
- `OPENAI_API_KEY` - OpenAI API key
- `DATABASE_URL` - PostgreSQL connection string
- `CORS_ORIGINS` - Allowed origins (comma-separated)

## Monitoring

The service exposes metrics via status endpoints:

```python
GET /conductor/status
{
  "name": "ExperimentConductor",
  "status": "active",
  "total_interactions": 1234,
  "capabilities": [...]
}
```

## Cost Considerations

- **Model**: GPT-4o (~$5-15/1M tokens)
- **Average chat**: ~200-500 tokens
- **Average analysis**: ~500-1000 tokens
- **Estimated cost**: $0.01-0.05 per interaction

## Security

1. **API Key Management**
   - Never commit `.env` to git
   - Use environment variables in production
   - Rotate keys regularly

2. **Input Validation**
   - All inputs validated via Pydantic models
   - Guardrails check all agent outputs
   - Rate limiting recommended

3. **Data Privacy**
   - Agent interactions logged to database
   - No PII in agent prompts
   - Encryption at rest recommended

## Future Enhancements

### Phase 3 (In Progress)
- **AgentBuilder**: Visual workflow creator
- **MetaCoordinator**: Multi-agent orchestration
- **Token rewards**: Blockchain integration

### Additional Features
- **ScientificCommunicator**: Research report generation
- **Evals**: Automated quality assessment
- **RAG**: Knowledge base integration
- **Voice**: Speech-to-text support

## License

MIT License - See main project LICENSE file

## Support

For issues or questions:
- GitHub Issues: [Cognosis repository]
- Documentation: [Link to docs]
- Email: support@Cognosis.example.com
