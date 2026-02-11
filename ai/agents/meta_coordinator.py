"""
MetaCoordinator - Multi-Agent Orchestrator
Coordinates multiple AI agents and executes complex workflows
"""

from typing import Dict, List, Any, Optional
import os
import json
import time
from datetime import datetime

from llm_provider import get_default_provider, LLMProvider

class MetaCoordinator:
    """
    Orchestrates multiple AI agents to handle complex tasks
    - Intelligent agent selection
    - Workflow execution from AgentBuilder templates
    - Multi-agent collaboration
    - Task decomposition and routing
    """

    def __init__(self, agents: Dict[str, Any], llm_provider: Optional[LLMProvider] = None):
        """
        Initialize MetaCoordinator with available agents

        Args:
            agents: Dictionary of available agents {name: instance}
            llm_provider: Optional LLM provider instance
        """
        self.llm = llm_provider or get_default_provider()
        self.model = self.llm.get_default_model()
        self.name = "MetaCoordinator"
        self.agents = agents
        self.total_coordinations = 0

        self.system_prompt = """You are the MetaCoordinator for Cognosis - an orchestrator that manages multiple AI agents.

Your role is to intelligently route tasks to the appropriate agents and synthesize their outputs.

AVAILABLE AGENTS:
1. **ExperimentConductor** - Provides participant guidance during experiments
   - Use for: Instructions, encouragement, experiment explanations
   - Cannot: Reveal targets, provide analysis, make claims

2. **DataAnalyst** - Analyzes experiment results statistically
   - Use for: Statistical analysis, performance metrics, trend analysis
   - Cannot: Provide guidance, make predictions, engage in chat

TASK ROUTING RULES:
- Single agent tasks: Route directly to appropriate agent
- Multi-agent tasks: Coordinate multiple agents and synthesize responses
- Complex questions: Break down into sub-tasks for different agents

COORDINATION STRATEGIES:
- **Sequential**: Agent A → Agent B (when B needs A's output)
- **Parallel**: Agent A + Agent B → Synthesize (when independent)
- **Iterative**: Agent A → Agent B → Agent A (when refinement needed)

OUTPUT FORMAT:
Return JSON with:
{
  "strategy": "sequential|parallel|single",
  "agents": ["agent1", "agent2"],
  "routing": {
    "agent_name": "specific task for this agent"
  }
}

Be concise and precise in task decomposition."""

    async def route_task(
        self,
        task: str,
        user_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Intelligently route a task to appropriate agent(s)

        Args:
            task: Natural language task description
            user_id: Optional user ID
            context: Optional context (experiment type, session ID, etc.)

        Returns:
            Routing plan with agent assignments
        """
        # Build routing prompt
        routing_prompt = f"""Analyze this task and determine which agent(s) should handle it:

TASK: {task}

CONTEXT: {json.dumps(context) if context else 'None'}

Available agents: {', '.join(self.agents.keys())}

Determine the best routing strategy and specific tasks for each agent."""

        response = await self.llm.chat_completion(
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": routing_prompt}
            ],
            model=self.model,
            temperature=0.2  # Lower temperature for consistent routing
        )

        try:
            routing_plan = json.loads(response["content"])
        except json.JSONDecodeError:
            # Default routing if JSON parsing fails
            routing_plan = {
                "strategy": "single",
                "agents": ["experiment_conductor"],
                "routing": {"experiment_conductor": routing_prompt}
            }

        return routing_plan

    async def execute_task(
        self,
        task: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a task by routing to appropriate agents and synthesizing results

        Args:
            task: Natural language task description
            user_id: User ID
            session_id: Optional session ID
            context: Additional context

        Returns:
            Synthesized response from agent(s)
        """
        start_time = time.time()

        try:
            # Get routing plan
            routing_plan = await self.route_task(task, user_id, context)

            strategy = routing_plan.get("strategy", "single")
            agents_to_use = routing_plan.get("agents", [])
            agent_tasks = routing_plan.get("routing", {})

            agent_results = {}

            # Execute based on strategy
            if strategy == "single":
                # Single agent handles everything
                agent_name = agents_to_use[0] if agents_to_use else "experiment_conductor"
                agent_task = agent_tasks.get(agent_name, task)

                result = await self._call_agent(
                    agent_name,
                    agent_task,
                    user_id,
                    session_id,
                    context
                )
                agent_results[agent_name] = result

            elif strategy == "parallel":
                # Multiple agents work in parallel
                import asyncio
                tasks = []
                for agent_name in agents_to_use:
                    agent_task = agent_tasks.get(agent_name, task)
                    tasks.append(
                        self._call_agent(agent_name, agent_task, user_id, session_id, context)
                    )

                results = await asyncio.gather(*tasks)
                for agent_name, result in zip(agents_to_use, results):
                    agent_results[agent_name] = result

            elif strategy == "sequential":
                # Agents work in sequence
                previous_output = None
                for agent_name in agents_to_use:
                    agent_task = agent_tasks.get(agent_name, task)

                    # Include previous agent's output in context
                    enhanced_context = {**(context or {})}
                    if previous_output:
                        enhanced_context["previous_agent_output"] = previous_output

                    result = await self._call_agent(
                        agent_name,
                        agent_task,
                        user_id,
                        session_id,
                        enhanced_context
                    )
                    agent_results[agent_name] = result
                    previous_output = result.get("response", "")

            # Synthesize results if multiple agents
            if len(agent_results) > 1:
                final_response = await self._synthesize_results(
                    task,
                    agent_results,
                    context
                )
            else:
                # Single agent, return its response directly
                agent_name = list(agent_results.keys())[0]
                final_response = agent_results[agent_name].get("response", "")

            # Track metrics
            self.total_coordinations += 1
            duration_ms = int((time.time() - start_time) * 1000)

            return {
                "response": final_response,
                "strategy": strategy,
                "agents_used": agents_to_use,
                "agent_results": agent_results,
                "duration_ms": duration_ms,
                "coordinated_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            return {
                "response": "I encountered an error coordinating this task. Please try again.",
                "error": str(e),
                "strategy": "error"
            }

    async def _call_agent(
        self,
        agent_name: str,
        task: str,
        user_id: Optional[str],
        session_id: Optional[str],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Call a specific agent with a task"""
        if agent_name not in self.agents:
            return {
                "response": f"Agent '{agent_name}' not available",
                "error": "agent_not_found"
            }

        agent = self.agents[agent_name]

        # Different agents have different interfaces
        if agent_name == "experiment_conductor":
            messages = [{"role": "user", "content": task}]
            return await agent.chat(
                messages=messages,
                session_id=session_id,
                user_id=user_id,
                metadata=context
            )

        elif agent_name == "data_analyst":
            # DataAnalyst needs structured input
            # For now, pass through chat-style
            return {
                "response": "DataAnalyst integration pending for this task type",
                "agent": agent_name
            }

        else:
            return {
                "response": f"Unknown agent interface: {agent_name}",
                "error": "unknown_interface"
            }

    async def _synthesize_results(
        self,
        original_task: str,
        agent_results: Dict[str, Dict[str, Any]],
        context: Optional[Dict[str, Any]]
    ) -> str:
        """
        Synthesize multiple agent responses into coherent answer

        Args:
            original_task: The original user task
            agent_results: Results from each agent
            context: Task context

        Returns:
            Synthesized response
        """
        # Build synthesis prompt
        agent_responses = "\n\n".join([
            f"**{agent_name}**: {result.get('response', '')}"
            for agent_name, result in agent_results.items()
        ])

        synthesis_prompt = f"""Synthesize these agent responses into a coherent, helpful answer:

ORIGINAL TASK: {original_task}

AGENT RESPONSES:
{agent_responses}

Create a unified response that:
1. Addresses the original task completely
2. Integrates insights from all agents
3. Maintains scientific accuracy
4. Is clear and concise

Return only the synthesized response, no meta-commentary."""

        response = await self.llm.chat_completion(
            messages=[{"role": "user", "content": synthesis_prompt}],
            model=self.model,
            temperature=0.5,
            max_tokens=800
        )

        return response["content"]

    async def execute_workflow(
        self,
        template_id: str,
        user_id: str,
        initial_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute an AgentBuilder workflow template

        Args:
            template_id: ExperimentTemplate ID from database
            user_id: User executing the workflow
            initial_data: Initial data for the workflow

        Returns:
            Workflow execution results
        """
        start_time = time.time()

        # This would integrate with your backend to fetch the template
        # For now, simulating the structure
        workflow_steps = await self._load_workflow_template(template_id)

        execution_log = []
        collected_data = initial_data or {}
        current_step = 0

        for step in workflow_steps:
            step_start = time.time()

            try:
                # Execute step based on type
                if step["stepType"] == "target_generation":
                    result = await self._execute_target_generation(step, collected_data)

                elif step["stepType"] == "participant_guidance":
                    agent_id = step.get("agentId", "experiment_conductor")
                    result = await self._execute_guidance_step(
                        step,
                        agent_id,
                        user_id,
                        collected_data
                    )

                elif step["stepType"] == "data_capture":
                    result = await self._execute_data_capture(step, collected_data)

                elif step["stepType"] == "ai_scoring":
                    result = await self._execute_ai_scoring(step, collected_data)

                elif step["stepType"] == "blockchain_commit":
                    result = await self._execute_blockchain_commit(step, collected_data)

                else:
                    result = {"status": "skipped", "reason": "unknown_step_type"}

                # Log step execution
                execution_log.append({
                    "step_order": step["order"],
                    "step_name": step["name"],
                    "step_type": step["stepType"],
                    "result": result,
                    "duration_ms": int((time.time() - step_start) * 1000),
                    "timestamp": datetime.utcnow().isoformat()
                })

                # Collect output data
                if result.get("output_data"):
                    collected_data.update(result["output_data"])

                current_step += 1

            except Exception as e:
                execution_log.append({
                    "step_order": step["order"],
                    "step_name": step["name"],
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
                break

        duration_ms = int((time.time() - start_time) * 1000)

        return {
            "template_id": template_id,
            "user_id": user_id,
            "status": "completed" if current_step == len(workflow_steps) else "failed",
            "steps_completed": current_step,
            "total_steps": len(workflow_steps),
            "execution_log": execution_log,
            "collected_data": collected_data,
            "duration_ms": duration_ms
        }

    async def _load_workflow_template(self, template_id: str) -> List[Dict[str, Any]]:
        """Load workflow template from database"""
        # TODO: Integrate with backend API to fetch ExperimentTemplate
        # For now, return mock structure
        return [
            {
                "order": 0,
                "stepType": "participant_guidance",
                "name": "Introduction",
                "agentId": "experiment_conductor",
                "config": {}
            }
        ]

    async def _execute_target_generation(
        self,
        step: Dict[str, Any],
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute target generation step"""
        # This would call your target generation logic
        return {
            "status": "completed",
            "output_data": {
                "target_hash": "mock_hash_" + str(time.time()),
                "target_type": "image"
            }
        }

    async def _execute_guidance_step(
        self,
        step: Dict[str, Any],
        agent_id: str,
        user_id: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute participant guidance step"""
        if agent_id in self.agents:
            agent = self.agents[agent_id]
            guidance = await agent.provide_guidance(
                experiment_type=data.get("experiment_type", "unknown"),
                current_step=step["order"],
                session_id=data.get("session_id", ""),
                user_id=user_id,
                context=data
            )
            return {
                "status": "completed",
                "guidance": guidance.get("message", ""),
                "output_data": guidance
            }
        return {"status": "agent_not_found"}

    async def _execute_data_capture(
        self,
        step: Dict[str, Any],
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute data capture step"""
        return {
            "status": "waiting_for_input",
            "message": "Waiting for participant response"
        }

    async def _execute_ai_scoring(
        self,
        step: Dict[str, Any],
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute AI scoring step"""
        # This would call DataAnalyst or custom scoring
        return {
            "status": "completed",
            "output_data": {
                "score": 0.75,
                "scored_at": datetime.utcnow().isoformat()
            }
        }

    async def _execute_blockchain_commit(
        self,
        step: Dict[str, Any],
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute blockchain commit step"""
        return {
            "status": "completed",
            "output_data": {
                "commitment_hash": "mock_commitment_" + str(time.time())
            }
        }

    def get_status(self) -> Dict[str, Any]:
        """Get MetaCoordinator status"""
        return {
            "name": self.name,
            "status": "active",
            "model": self.model,
            "total_coordinations": self.total_coordinations,
            "available_agents": list(self.agents.keys()),
            "capabilities": [
                "multi_agent_coordination",
                "intelligent_task_routing",
                "workflow_execution",
                "response_synthesis"
            ]
        }
