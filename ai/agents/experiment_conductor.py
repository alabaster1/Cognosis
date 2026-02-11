"""
ExperimentConductor Agent
Provides real-time guidance and support during experiments
"""

from typing import Dict, List, Any, Optional
import os
import time

from .guardrails import (
    validate_agent_response,
    ExperimentConductorGuardrails,
    REQUIRED_DISCLAIMERS
)
from llm_provider import get_default_provider, LLMProvider

class ExperimentConductor:
    """
    AI agent that guides participants through experiments
    - Provides context-sensitive instructions
    - Answers participant questions
    - Maintains scientific integrity
    - Avoids biasing participants
    """

    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm = llm_provider or get_default_provider()
        self.model = self.llm.get_default_model()
        self.name = "ExperimentConductor"
        self.total_interactions = 0
        self.guardrails = ExperimentConductorGuardrails()

        # System prompt defines agent personality and behavior
        self.system_prompt = """You are the ExperimentConductor for Cognosis, a research platform exploring psi phenomena.

Your role is to guide participants through experiments while maintaining scientific integrity.

CORE PRINCIPLES:
1. **Scientific Integrity**: Never bias participants or lead them toward specific answers
2. **Clarity**: Provide clear, concise instructions appropriate to the experiment phase
3. **Encouragement**: Be supportive and encouraging without revealing targets or outcomes
4. **Privacy**: Remind participants their data is encrypted and private
5. **Neutrality**: Remain neutral about the existence or non-existence of psi abilities

WHAT YOU CAN DO:
- Explain experiment protocols clearly
- Answer procedural questions
- Provide encouragement and motivation
- Clarify what participants should focus on
- Explain what happens next in the experiment

WHAT YOU MUST NOT DO:
- Never reveal targets before commitment
- Never suggest what participants "should" see/feel/experience
- Never make medical or psychological claims
- Never provide guarantees about results
- Never lead participants with phrases like "most people see..." or "you should notice..."

EXPERIMENT TYPES:
- **Remote Viewing**: Perceiving distant or hidden targets (images, locations, objects)
- **Telepathy**: Mind-to-mind communication and emotion sensing
- **Precognition**: Predicting future events or card sequences
- **Dream Journal**: Recording and analyzing dreams
- **Synchronicity**: Tracking meaningful coincidences
- **Psychokinesis**: Influencing random number generation

TONE:
- Professional yet friendly
- Encouraging but not leading
- Clear and concise
- Scientifically grounded

Always include appropriate disclaimers when relevant."""

    async def chat(
        self,
        messages: List[Dict[str, str]],
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        General chat interface for participant questions

        Args:
            messages: Conversation history [{"role": "user", "content": "..."}]
            session_id: Optional experiment session ID
            user_id: Optional user ID
            metadata: Optional additional context

        Returns:
            Dictionary with response and metadata
        """
        start_time = time.time()

        try:
            # Add system prompt
            full_messages = [{"role": "system", "content": self.system_prompt}]
            full_messages.extend(messages)

            # Call LLM provider
            response = await self.llm.chat_completion(
                messages=full_messages,
                model=self.model,
                temperature=0.7,
                max_tokens=500
            )

            assistant_message = response["content"]
            tokens_used = response["tokens_used"]

            # Validate response with guardrails
            experiment_type = metadata.get("experiment_type") if metadata else None
            validation = validate_agent_response(
                assistant_message,
                agent_name=self.name,
                experiment_type=experiment_type
            )

            if not validation["passed"]:
                # Replace with safe fallback
                assistant_message = "I can help guide you through this experiment. Please let me know if you have any questions about the protocol or what to do next."

            # Track metrics
            self.total_interactions += 1
            latency_ms = int((time.time() - start_time) * 1000)

            return {
                "response": assistant_message,
                "tokens_used": tokens_used,
                "latency_ms": latency_ms,
                "metadata": {
                    "session_id": session_id,
                    "guardrails_passed": validation["passed"],
                    "violations": validation.get("violations", [])
                }
            }

        except Exception as e:
            return {
                "response": "I apologize, but I encountered an error. Please try again or contact support if this persists.",
                "error": str(e),
                "metadata": {"session_id": session_id}
            }

    async def provide_guidance(
        self,
        experiment_type: str,
        current_step: int,
        session_id: str,
        user_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Provide context-specific guidance for current experiment step

        Args:
            experiment_type: Type of experiment (e.g., "remote-viewing-images")
            current_step: Current step number in the protocol
            session_id: Experiment session ID
            user_id: User ID
            context: Additional context (previous responses, timing, etc.)

        Returns:
            Dictionary with guidance message and next action
        """
        # Build context-aware prompt
        guidance_prompt = f"""Provide guidance for a participant in a {experiment_type} experiment.

Current Step: {current_step}
Context: {context if context else 'Beginning of experiment'}

Provide:
1. Clear instructions for what to do at this step
2. What they should focus on
3. Any important reminders

Keep it concise (2-3 sentences). Be encouraging but neutral."""

        messages = [{"role": "user", "content": guidance_prompt}]

        result = await self.chat(
            messages=messages,
            session_id=session_id,
            user_id=user_id,
            metadata={"experiment_type": experiment_type, "step": current_step}
        )

        # Determine next action based on step
        next_action = self._get_next_action(experiment_type, current_step)

        return {
            "message": result["response"],
            "next_action": next_action,
            "metadata": {
                "experiment_type": experiment_type,
                "step": current_step,
                "tokens_used": result.get("tokens_used")
            }
        }

    def _get_next_action(self, experiment_type: str, current_step: int) -> str:
        """
        Determine next action based on experiment type and step

        Args:
            experiment_type: Type of experiment
            current_step: Current step number

        Returns:
            Next action identifier
        """
        # Map experiment types to workflow steps
        workflows = {
            "remote-viewing-images": [
                "ideogram_capture",
                "sketch_response",
                "description_capture",
                "target_reveal",
                "self_assessment"
            ],
            "telepathy-emotions": [
                "emotion_selection",
                "body_mapping",
                "confidence_rating",
                "target_reveal",
                "accuracy_check"
            ],
            "card-prediction": [
                "prediction_entry",
                "commitment",
                "card_reveal",
                "accuracy_check",
                "next_round"
            ]
        }

        workflow = workflows.get(experiment_type, [])
        if current_step < len(workflow):
            return workflow[current_step]
        else:
            return "experiment_complete"

    def get_status(self) -> Dict[str, Any]:
        """Get agent status and statistics"""
        return {
            "name": self.name,
            "status": "active",
            "model": self.model,
            "total_interactions": self.total_interactions,
            "capabilities": [
                "experiment_guidance",
                "participant_support",
                "protocol_explanation"
            ]
        }

    async def explain_experiment(self, experiment_type: str) -> str:
        """
        Provide a clear explanation of an experiment type

        Args:
            experiment_type: Type of experiment to explain

        Returns:
            Explanation string
        """
        prompt = f"""Explain the {experiment_type} experiment to a new participant.

Include:
1. What the experiment tests
2. What they will be asked to do
3. How long it typically takes
4. What happens with their data

Be clear, encouraging, and scientifically accurate. Include the experimental disclaimer.
Keep it concise (4-5 sentences)."""

        messages = [{"role": "user", "content": prompt}]
        result = await self.chat(messages=messages, metadata={"experiment_type": experiment_type})

        # Ensure disclaimer is included
        explanation = result["response"]
        if REQUIRED_DISCLAIMERS["experimental"] not in explanation:
            explanation += f"\n\n{REQUIRED_DISCLAIMERS['experimental']}"

        return explanation
