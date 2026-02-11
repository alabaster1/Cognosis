# MetaCoordinator Usage Guide

The **MetaCoordinator** is the orchestration layer that intelligently routes tasks to appropriate AI agents and executes AgentBuilder workflows.

## 🎯 What It Does

1. **Intelligent Task Routing** - Automatically selects the right agent(s) for any task
2. **Multi-Agent Coordination** - Coordinates multiple agents working together
3. **Workflow Execution** - Runs AgentBuilder templates step-by-step
4. **Response Synthesis** - Combines multiple agent responses into coherent answers

## 📡 API Endpoints

### 1. Execute Task with Intelligent Routing

**Endpoint**: `POST /meta/task`

Use this when you want the MetaCoordinator to automatically determine which agent(s) should handle a task.

**Request**:
```json
{
  "task": "Analyze my last 5 experiments and give me tips for improvement",
  "user_id": "user_123",
  "session_id": "session_456",
  "context": {
    "experiment_type": "remote-viewing"
  }
}
```

**Response**:
```json
{
  "response": "Based on your last 5 experiments, you've achieved an average score of 68%, which is above chance baseline (50%). Here are some tips for improvement...",
  "strategy": "parallel",
  "agents_used": ["data_analyst", "experiment_conductor"],
  "duration_ms": 3200,
  "coordinated_at": "2025-10-07T23:45:12Z"
}
```

### 2. Execute AgentBuilder Workflow

**Endpoint**: `POST /meta/workflow`

Use this to execute a complete workflow template created in AgentBuilder.

**Request**:
```json
{
  "template_id": "template_uuid_here",
  "user_id": "user_123",
  "initial_data": {
    "experiment_type": "remote-viewing-images",
    "session_id": "session_456"
  }
}
```

**Response**:
```json
{
  "template_id": "template_uuid_here",
  "user_id": "user_123",
  "status": "completed",
  "steps_completed": 5,
  "total_steps": 5,
  "execution_log": [
    {
      "step_order": 0,
      "step_name": "Introduction",
      "step_type": "participant_guidance",
      "result": { "guidance": "Welcome to this remote viewing experiment..." },
      "duration_ms": 850,
      "timestamp": "2025-10-07T23:45:10Z"
    },
    // ... more steps
  ],
  "collected_data": {
    "target_hash": "abc123...",
    "score": 0.75
  },
  "duration_ms": 12400
}
```

### 3. Get Status

**Endpoint**: `GET /meta/status`

**Response**:
```json
{
  "name": "MetaCoordinator",
  "status": "active",
  "model": "gpt-4o",
  "total_coordinations": 142,
  "available_agents": ["experiment_conductor", "data_analyst"],
  "capabilities": [
    "multi_agent_coordination",
    "intelligent_task_routing",
    "workflow_execution",
    "response_synthesis"
  ]
}
```

## 🎨 Usage Examples

### Example 1: Simple Task (Single Agent)

```javascript
const response = await fetch('http://localhost:8001/meta/task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task: "What should I focus on during remote viewing?",
    user_id: userId
  })
});

const result = await response.json();
console.log(result.response);
// MetaCoordinator routes to ExperimentConductor
// Returns: "During remote viewing, focus on..."
```

### Example 2: Complex Task (Multiple Agents)

```javascript
const response = await fetch('http://localhost:8001/meta/task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task: "How am I doing compared to others? What can I improve?",
    user_id: userId,
    context: { experiment_type: "remote-viewing" }
  })
});

const result = await response.json();
// MetaCoordinator:
// 1. Routes to DataAnalyst for performance stats
// 2. Routes to ExperimentConductor for improvement tips
// 3. Synthesizes both into coherent response
```

### Example 3: Execute Workflow

```javascript
const response = await fetch('http://localhost:8001/meta/workflow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template_id: "rv_beginner_protocol",
    user_id: userId,
    initial_data: {
      session_id: sessionId,
      experiment_type: "remote-viewing-images"
    }
  })
});

const execution = await response.json();
console.log(`Workflow completed ${execution.steps_completed}/${execution.total_steps} steps`);
console.log('Execution log:', execution.execution_log);
```

## 🔄 Coordination Strategies

The MetaCoordinator uses 3 strategies based on the task:

### 1. **Single Agent**
- Task can be handled by one agent
- Example: "Explain how remote viewing works"
- Routes to: ExperimentConductor only

### 2. **Parallel**
- Multiple agents work independently, results combined
- Example: "Analyze my stats and give me encouragement"
- Routes to: DataAnalyst + ExperimentConductor (simultaneously)
- Faster execution

### 3. **Sequential**
- Agents work in order, each using previous output
- Example: "Analyze my performance, then create a personalized training plan"
- Routes to: DataAnalyst → ExperimentConductor
- Agent B uses Agent A's output

## 🏗️ Workflow Execution

When executing AgentBuilder templates, MetaCoordinator handles:

### Step Types

**1. Target Generation**
- Generates random target for experiment
- Creates cryptographic hash
- Stores metadata

**2. Participant Guidance**
- Calls assigned agent (usually ExperimentConductor)
- Provides context-specific instructions
- Adapts to current step

**3. Data Capture**
- Waits for participant input
- Validates response format
- Stores encrypted data

**4. AI Scoring**
- Calls DataAnalyst or custom scoring
- Compares response to target
- Generates metrics

**5. Blockchain Commit**
- Creates commitment hash
- Submits to blockchain
- Records transaction

### Workflow Example

```javascript
// Researcher creates template in AgentBuilder:
// Step 1: Generate target (target_generation)
// Step 2: Show instructions (participant_guidance → ExperimentConductor)
// Step 3: Collect drawing (data_capture)
// Step 4: Score similarity (ai_scoring → DataAnalyst)
// Step 5: Commit to blockchain (blockchain_commit)

// User executes workflow:
const result = await executeWorkflow("advanced_rv_protocol", userId);

// MetaCoordinator automatically:
// 1. Loads template from database
// 2. Executes each step in order
// 3. Calls appropriate agents
// 4. Tracks progress
// 5. Collects all data
// 6. Returns complete execution log
```

## 🎓 Best Practices

### 1. Task Routing

**Good**: Natural language tasks
```javascript
{
  "task": "Help me understand my performance trends over the last month"
}
```

**Bad**: Direct agent calls (use `/agent/chat` or `/analyst/session` instead)
```javascript
{
  "task": "Call DataAnalyst with these exact parameters..."
}
```

### 2. Context Provision

**Good**: Provide relevant context
```javascript
{
  "task": "Give me tips for improvement",
  "context": {
    "experiment_type": "remote-viewing",
    "difficulty_level": "beginner",
    "recent_scores": [0.65, 0.72, 0.58]
  }
}
```

**Bad**: No context
```javascript
{
  "task": "Give me tips"
}
```

### 3. Workflow Design

**Good**: Logical step progression
```
1. Generate Target
2. Show Instructions
3. Capture Response
4. Score Response
5. Commit to Blockchain
```

**Bad**: Out-of-order steps
```
1. Score Response  // No response yet!
2. Generate Target
...
```

## 🔍 Debugging

### Check Routing Decision

```javascript
// The response includes which strategy was used
const result = await executeTask(task);
console.log('Strategy:', result.strategy);
console.log('Agents used:', result.agents_used);
```

### View Workflow Progress

```javascript
const execution = await executeWorkflow(templateId, userId);

// Check which steps completed
execution.execution_log.forEach(log => {
  console.log(`Step ${log.step_order}: ${log.step_name} - ${log.result.status}`);
});
```

### Monitor Performance

```javascript
// Check MetaCoordinator stats
const status = await fetch('http://localhost:8001/meta/status').then(r => r.json());
console.log('Total coordinations:', status.total_coordinations);
```

## 💡 Advanced Usage

### Custom Agent Integration

Add new agents to MetaCoordinator:

```python
# In main.py
custom_agent = CustomAgent()

meta_coordinator = MetaCoordinator(agents={
    "experiment_conductor": experiment_conductor,
    "data_analyst": data_analyst,
    "rv_expert": rv_expert,
    "psi_score_ai": psi_score_ai,
    "custom_agent": custom_agent  # Add your agent
})
```

### Using RV Agents Through MetaCoordinator

```javascript
// Natural language task routing automatically selects RV-Expert
const response = await fetch('http://localhost:8001/meta/task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task: "Guide me through a CRV Stage 2 session focusing on sensory impressions",
    user_id: userId,
    session_id: sessionId,
    context: {
      protocol: "CRV",
      current_stage: 2
    }
  })
});

// MetaCoordinator automatically routes to rv_expert agent
const result = await response.json();
console.log(result.response); // Stage 2 guidance from RV-Expert
console.log(result.agents_used); // ["rv_expert"]
```

### Workflow Templates

Create templates programmatically:

```python
template = {
    "name": "Custom RV Protocol",
    "workflowSteps": [
        {
            "order": 0,
            "stepType": "participant_guidance",
            "agentId": "experiment_conductor",
            "config": {"phase": "introduction"}
        },
        # ... more steps
    ]
}
```

## 🚀 Performance Tips

1. **Use Parallel When Possible** - Faster than sequential
2. **Cache Common Workflows** - Store frequently used templates
3. **Monitor Token Usage** - Multi-agent tasks use more tokens
4. **Set Timeouts** - Long workflows should have timeout handling

## 📊 Cost Implications

MetaCoordinator adds minimal overhead:
- Routing decision: ~100-200 tokens
- Synthesis (multi-agent): ~200-400 tokens
- Total: Usually < $0.01 per coordination

Multi-agent tasks cost more:
- Single agent: ~$0.001-0.005
- Parallel (2 agents): ~$0.003-0.012
- Sequential (3 agents): ~$0.005-0.020

---

For more information, see the main [AgentKit Integration Guide](../AGENTKIT_INTEGRATION.md).
