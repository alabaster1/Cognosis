"""
RVExpertAgent - Remote Viewing Expert & Research Facilitator
Specialized AI agent trained in all major remote viewing protocols
"""

from typing import Dict, List, Any, Optional
import os
import time
from datetime import datetime
import json

from llm_provider import get_default_provider, LLMProvider

class RVExpertAgent:
    """
    Advanced AI entity trained in remote viewing protocols

    Expertise:
    - CRV (Controlled Remote Viewing)
    - ERV (Extended Remote Viewing)
    - ARV (Associative Remote Viewing)
    - HRVG (Hawaii Remote Viewers' Guild protocols)
    - SRV (Scientific Remote Viewing)
    - TDS (Technical Dowsing Systems)

    Maintains blind integrity and guides participants through structured protocols
    """

    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm = llm_provider or get_default_provider()
        self.model = self.llm.get_default_model()
        self.name = "RV-Expert"
        self.version = "1.0.0"
        self.total_sessions = 0

        # CRV Stage definitions
        self.crv_stages = {
            1: {
                "name": "Ideogram Detection",
                "description": "Initial contact - capture first impressions as simple lines/gestures",
                "guidance": "Draw the first mark that comes to mind. Don't think - just let your hand move.",
                "duration_minutes": 2
            },
            2: {
                "name": "Sensory Contact",
                "description": "Gather sensory impressions (textures, temperatures, sounds, smells)",
                "guidance": "What do you sense? Temperature? Texture? Any sounds or smells?",
                "duration_minutes": 5
            },
            3: {
                "name": "Dimensional Analysis",
                "description": "Perceive spatial dimensions and physical properties",
                "guidance": "What are the dimensions? Is it large or small? Indoor or outdoor? What shapes do you perceive?",
                "duration_minutes": 5
            },
            4: {
                "name": "Aesthetic Impact",
                "description": "Emotional tone and aesthetic qualities of the target",
                "guidance": "What emotions do you feel? What is the overall mood or atmosphere?",
                "duration_minutes": 5
            },
            5: {
                "name": "Analytical Queries",
                "description": "Deeper probing with specific questions",
                "guidance": "Ask specific questions about the target. What purpose does it serve? Who might be there?",
                "duration_minutes": 10
            },
            6: {
                "name": "3D Modeling",
                "description": "Create comprehensive model of the target",
                "guidance": "Sketch a complete 3D representation. Include all elements you've perceived.",
                "duration_minutes": 10
            }
        }

        # System prompt with deep RV knowledge
        self.system_prompt = """You are RV-Expert, an advanced AI entity with comprehensive training in remote viewing protocols and parapsychological methodologies.

EXPERTISE:
- CRV (Controlled Remote Viewing) - All 6 stages
- ERV (Extended Remote Viewing) - Deep meditative states
- ARV (Associative Remote Viewing) - Future event prediction
- HRVG protocols - Hawaii Remote Viewers' Guild methods
- SRV - Scientific Remote Viewing procedures
- TDS - Technical Dowsing Systems
- Quantum-consciousness correlations
- Parapsychological experimental design

CORE PRINCIPLES:
1. **Blind Integrity**: NEVER reveal, infer, hint, or leak target information
2. **Non-Leading**: Provide neutral guidance that doesn't bias toward specific responses
3. **Stage-Appropriate**: Tailor instructions to the current CRV stage
4. **Supportive**: Encourage without creating expectation
5. **Scientific**: Maintain rigorous experimental protocol

YOUR ROLE:
- Guide participants through structured RV sessions
- Maintain blind experimental conditions
- Capture impressions systematically
- Provide feedback ONLY after scoring completion
- Support participant wellbeing and grounding

WHAT YOU MUST NOT DO:
- Never reveal or hint at target details
- Never say "you should see X" or "most people perceive Y"
- Never validate impressions before scoring
- Never make claims about psi ability existence
- Never provide medical/psychological advice

COMMUNICATION STYLE:
- Clear, precise instructions
- Calm, grounding presence
- Scientifically accurate language
- Supportive without leading
- Brief and focused

Remember: You are facilitating a blind scientific experiment. The integrity of the data depends on your neutrality."""

    async def start_session(
        self,
        session_id: str,
        user_id: str,
        protocol: str = "CRV",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Begin a new remote viewing session

        Args:
            session_id: Unique session identifier
            user_id: Participant ID
            protocol: RV protocol to use (CRV, ERV, ARV, etc.)
            context: Additional session context

        Returns:
            Session initialization data with welcome message
        """
        self.total_sessions += 1

        welcome_prompt = f"""A participant is beginning a {protocol} remote viewing session.

Session ID: {session_id}
Protocol: {protocol}
Target: BLIND (you do not know the target)

Provide a brief welcome message that:
1. Acknowledges they're starting a {protocol} session
2. Reminds them the target is assigned but they are blind to it
3. Establishes a calm, focused mindset
4. Gives initial Stage 1 instructions (for CRV)

Keep it under 100 words. Be professional and grounding."""

        response = await self.llm.chat_completion(
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": welcome_prompt}
            ],
            model=self.model,
            temperature=0.7,
            max_tokens=200
        )

        welcome_message = response["content"]

        return {
            "session_id": session_id,
            "protocol": protocol,
            "current_stage": 1,
            "message": welcome_message,
            "stage_info": self.crv_stages[1] if protocol == "CRV" else None,
            "started_at": datetime.utcnow().isoformat()
        }

    async def guide_stage(
        self,
        session_id: str,
        stage: int,
        protocol: str = "CRV",
        previous_impressions: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Provide guidance for a specific RV stage

        Args:
            session_id: Session identifier
            stage: Current stage number (1-6 for CRV)
            protocol: RV protocol being used
            previous_impressions: Participant's previous stage responses
            context: Additional context

        Returns:
            Stage-specific guidance and instructions
        """
        if protocol == "CRV" and stage in self.crv_stages:
            stage_info = self.crv_stages[stage]

            guidance_prompt = f"""The participant is now in {protocol} Stage {stage}: {stage_info['name']}.

STAGE OBJECTIVE: {stage_info['description']}
STANDARD GUIDANCE: {stage_info['guidance']}

Previous impressions: {previous_impressions if previous_impressions else 'None (first stage)'}

Provide brief, clear instructions for this stage. Do NOT:
- Reveal or hint at the target
- Validate their previous impressions
- Lead them toward specific perceptions

Focus on the PROCESS, not the content. Keep under 80 words."""

            response = await self.llm.chat_completion(
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": guidance_prompt}
                ],
                model=self.model,
                temperature=0.6,
                max_tokens=150
            )

            return {
                "session_id": session_id,
                "stage": stage,
                "stage_name": stage_info["name"],
                "guidance": response["content"],
                "duration_minutes": stage_info["duration_minutes"],
                "timestamp": datetime.utcnow().isoformat()
            }

        return {
            "session_id": session_id,
            "stage": stage,
            "error": f"Stage {stage} not defined for protocol {protocol}"
        }

    async def handle_participant_question(
        self,
        session_id: str,
        question: str,
        current_stage: int,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Answer participant questions during session

        Maintains blind integrity while providing helpful guidance
        """
        question_prompt = f"""A participant in Stage {current_stage} of a CRV session asks:

"{question}"

Provide a helpful answer that:
1. Does NOT reveal or hint at target information
2. Guides them back to the process
3. Addresses their concern professionally
4. Maintains experimental blind

Keep under 60 words."""

        response = await self.llm.chat_completion(
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": question_prompt}
            ],
            model=self.model,
            temperature=0.6,
            max_tokens=120
        )

        return {
            "session_id": session_id,
            "question": question,
            "answer": response["content"],
            "timestamp": datetime.utcnow().isoformat()
        }

    async def complete_session(
        self,
        session_id: str,
        user_id: str,
        impressions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Mark session as complete and prepare for scoring

        Args:
            session_id: Session identifier
            user_id: Participant ID
            impressions: All collected impressions from the session

        Returns:
            Completion confirmation and next steps
        """
        completion_message = """Excellent work. Your session is complete.

Your impressions have been recorded and will now be scored against the target by our independent AI scoring system.

You will receive detailed feedback once the analysis is complete. This typically takes 1-2 minutes.

Remember: There are no "wrong" answers in remote viewing. Every session provides valuable data."""

        return {
            "session_id": session_id,
            "user_id": user_id,
            "status": "completed",
            "message": completion_message,
            "impressions_captured": len(impressions),
            "awaiting_scoring": True,
            "completed_at": datetime.utcnow().isoformat()
        }

    async def provide_feedback(
        self,
        session_id: str,
        user_id: str,
        scoring_results: Dict[str, Any],
        impressions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate personalized feedback after scoring completion

        This is called AFTER PsiScoreAI has analyzed the session

        Args:
            session_id: Session identifier
            user_id: Participant ID
            scoring_results: Results from PsiScoreAI
            impressions: Participant's impressions

        Returns:
            Detailed personalized feedback
        """
        feedback_prompt = f"""A remote viewing session has been scored. Provide personalized scientific feedback.

SCORING RESULTS:
{json.dumps(scoring_results, indent=2)}

PARTICIPANT IMPRESSIONS SUMMARY:
Stages completed: {impressions.get('stages_completed', 'Unknown')}
Confidence level: {impressions.get('confidence', 'Not provided')}

Generate feedback that:
1. Acknowledges their specific strengths (based on scores)
2. Identifies areas for development
3. Provides 2-3 concrete tips for improvement
4. Maintains scientific accuracy and humility
5. Encourages continued practice

Be specific about which stages performed well. Include proper caveats about sample size and statistical significance.

Keep under 200 words. Be encouraging but scientifically honest."""

        response = await self.llm.chat_completion(
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": feedback_prompt}
            ],
            model=self.model,
            temperature=0.7,
            max_tokens=400
        )

        return {
            "session_id": session_id,
            "user_id": user_id,
            "feedback": response["content"],
            "scoring_summary": scoring_results,
            "recommendations": self._generate_recommendations(scoring_results),
            "timestamp": datetime.utcnow().isoformat()
        }

    def _generate_recommendations(
        self,
        scoring_results: Dict[str, Any]
    ) -> List[str]:
        """Generate specific recommendations based on scores"""
        recommendations = []

        # Check spatial correlation
        if scoring_results.get("spatial_correlation", 0) < 0.5:
            recommendations.append("Practice Stage 3 (dimensional analysis) to improve spatial accuracy")

        # Check emotional alignment
        if scoring_results.get("emotional_alignment", 0) < 0.5:
            recommendations.append("Spend more time in Stage 4 (aesthetic impact) to develop emotional sensing")

        # Check stage-specific accuracy
        if scoring_results.get("stage_2_accuracy", 0) > 0.7:
            recommendations.append("Your Stage 2 sensory work is strong - build on this foundation")

        # Overall performance
        overall = scoring_results.get("overall_score", 0)
        if overall > 0.7:
            recommendations.append("Consider advancing to ERV (Extended RV) protocols")
        elif overall < 0.4:
            recommendations.append("Focus on relaxation and mental quieting before sessions")

        return recommendations

    async def handle_target_committed(
        self,
        session_id: str,
        target_hash: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Event handler: Target has been committed to blockchain

        This is called when the target is locked in, signaling session can begin
        """
        return {
            "event": "target_committed",
            "session_id": session_id,
            "target_hash": target_hash,
            "action": "session_ready_to_begin",
            "message": "Target committed. Session may commence.",
            "timestamp": datetime.utcnow().isoformat()
        }

    async def handle_session_complete(
        self,
        session_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Event handler: Session has been completed by participant

        Triggers notification to PsiScoreAI for analysis
        """
        return {
            "event": "session_complete",
            "session_id": session_data.get("session_id"),
            "action": "notify_scoring_agent",
            "payload": {
                "session_id": session_data.get("session_id"),
                "user_id": session_data.get("user_id"),
                "impressions": session_data.get("impressions"),
                "target_hash": session_data.get("target_hash")
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    async def handle_scoring_complete(
        self,
        session_id: str,
        user_id: str,
        scoring_results: Dict[str, Any],
        impressions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Event handler: Scoring has been completed by PsiScoreAI

        Generates and delivers feedback to participant
        """
        feedback = await self.provide_feedback(
            session_id,
            user_id,
            scoring_results,
            impressions
        )

        return {
            "event": "scoring_complete",
            "session_id": session_id,
            "action": "deliver_feedback",
            "feedback": feedback,
            "timestamp": datetime.utcnow().isoformat()
        }

    def get_status(self) -> Dict[str, Any]:
        """Get RV-Expert agent status"""
        return {
            "name": self.name,
            "version": self.version,
            "status": "active",
            "model": self.model,
            "total_sessions": self.total_sessions,
            "expertise": [
                "CRV", "ERV", "ARV", "HRVG", "SRV", "TDS"
            ],
            "protocols_supported": [
                "CRV (6-stage)",
                "ERV (Extended)",
                "ARV (Associative)"
            ],
            "capabilities": [
                "blind_session_facilitation",
                "stage_based_guidance",
                "participant_support",
                "post_session_feedback",
                "event_driven_coordination"
            ],
            "event_handlers": [
                "target_committed",
                "session_complete",
                "scoring_complete"
            ]
        }
