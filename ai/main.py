"""
Cognosis AI Service
FastAPI server for AI agent orchestration
"""

from fastapi import FastAPI, HTTPException, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import time
from collections import defaultdict
from dotenv import load_dotenv

from agents.experiment_conductor import ExperimentConductor
from agents.data_analyst import DataAnalyst
from agents.meta_coordinator import MetaCoordinator
from agents.guardrails import validate_message, GuardrailViolation
from agents.evals import AgentEvaluator
from agents.rv_expert import RVExpertAgent
from agents.psi_score_ai import PsiScoreAI

load_dotenv()

app = FastAPI(
    title="Cognosis AI Service",
    description="AI agent orchestration for psychological experiments",
    version="1.0.0"
)

# CORS configuration - SECURITY: Restrict methods and headers
ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001,https://cognosispredict.com"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # Restricted from "*"
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],  # Restricted from "*"
    max_age=600,  # Cache preflight for 10 minutes
)

# ============================================
# RATE LIMITING
# ============================================

# Simple in-memory rate limiter
rate_limit_store: Dict[str, List[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 30  # requests per window

def get_client_ip(request: Request) -> str:
    """Extract client IP from request"""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def check_rate_limit(client_id: str) -> bool:
    """Check if client has exceeded rate limit"""
    now = time.time()
    # Clean old entries
    rate_limit_store[client_id] = [
        ts for ts in rate_limit_store[client_id]
        if now - ts < RATE_LIMIT_WINDOW
    ]
    # Check limit
    if len(rate_limit_store[client_id]) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    # Record request
    rate_limit_store[client_id].append(now)
    return True

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    # Skip rate limiting for health checks
    if request.url.path in ["/", "/health"]:
        return await call_next(request)

    client_ip = get_client_ip(request)
    if not check_rate_limit(client_ip):
        return JSONResponse(
            status_code=429,
            content={"error": "Too many requests. Please try again later."}
        )

    response = await call_next(request)

    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"

    return response

# ============================================
# AUTHENTICATION FOR ADMIN ENDPOINTS
# ============================================

ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "")

async def verify_admin_key(x_admin_key: Optional[str] = Header(None)):
    """Verify admin API key for protected endpoints"""
    if not ADMIN_API_KEY:
        # If no admin key is set, allow access (dev mode)
        return True
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin API key")
    return True

# Initialize agents
experiment_conductor = ExperimentConductor()
data_analyst = DataAnalyst()
evaluator = AgentEvaluator()
rv_expert = RVExpertAgent()
psi_score_ai = PsiScoreAI()

# Initialize MetaCoordinator with all agents
meta_coordinator = MetaCoordinator(agents={
    "experiment_conductor": experiment_conductor,
    "data_analyst": data_analyst,
    "rv_expert": rv_expert,
    "psi_score_ai": psi_score_ai
})

# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")

class AgentChatRequest(BaseModel):
    agent_name: str = Field(..., description="Agent to invoke")
    session_id: Optional[str] = Field(None, description="Experiment session ID")
    user_id: Optional[str] = Field(None, description="User ID")
    messages: List[ChatMessage] = Field(..., description="Conversation history")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional context")

class AgentChatResponse(BaseModel):
    agent_name: str
    response: str
    metadata: Optional[Dict[str, Any]] = None
    guardrails_passed: bool = True
    guardrail_flags: Optional[List[str]] = None
    tokens_used: Optional[int] = None
    latency_ms: Optional[int] = None

class GuidanceRequest(BaseModel):
    experiment_type: str = Field(..., description="Type of experiment")
    current_step: int = Field(..., description="Current step number")
    session_id: str = Field(..., description="Experiment session ID")
    user_id: str = Field(..., description="User ID")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")

class GuidanceResponse(BaseModel):
    message: str
    next_action: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# ============================================
# HEALTH & STATUS
# ============================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Cognosis AI Service",
        "status": "active",
        "version": "1.0.0",
        "agents": {
            "experiment_conductor": "active"
        }
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "agents": {
            "experiment_conductor": experiment_conductor.get_status()
        }
    }

# ============================================
# AGENT CHAT ENDPOINTS
# ============================================

@app.post("/agent/chat", response_model=AgentChatResponse)
async def agent_chat(request: AgentChatRequest):
    """
    Generic chat endpoint for any agent
    Routes to appropriate agent based on agent_name
    """
    try:
        # Validate last user message with guardrails
        user_messages = [msg for msg in request.messages if msg.role == "user"]
        if user_messages:
            last_message = user_messages[-1].content
            validation = validate_message(last_message)

            if not validation["passed"]:
                return AgentChatResponse(
                    agent_name=request.agent_name,
                    response="I cannot process that request as it violates safety guidelines.",
                    guardrails_passed=False,
                    guardrail_flags=validation["violations"]
                )

        # Route to appropriate agent
        if request.agent_name == "experiment_conductor":
            result = await experiment_conductor.chat(
                messages=[msg.model_dump() for msg in request.messages],
                session_id=request.session_id,
                user_id=request.user_id,
                metadata=request.metadata
            )
        else:
            raise HTTPException(status_code=404, detail=f"Agent '{request.agent_name}' not found")

        return AgentChatResponse(
            agent_name=request.agent_name,
            response=result["response"],
            metadata=result.get("metadata"),
            guardrails_passed=True,
            tokens_used=result.get("tokens_used"),
            latency_ms=result.get("latency_ms")
        )

    except Exception as e:
        # SECURITY: Don't expose internal error details
        print(f"[ERROR] agent_chat: {e}")
        raise HTTPException(status_code=500, detail="An error occurred processing your request")

# ============================================
# EXPERIMENT CONDUCTOR ENDPOINTS
# ============================================

@app.post("/conductor/guidance", response_model=GuidanceResponse)
async def get_experiment_guidance(request: GuidanceRequest):
    """
    Get contextual guidance for participant during experiment
    """
    try:
        result = await experiment_conductor.provide_guidance(
            experiment_type=request.experiment_type,
            current_step=request.current_step,
            session_id=request.session_id,
            user_id=request.user_id,
            context=request.context
        )

        return GuidanceResponse(
            message=result["message"],
            next_action=result.get("next_action"),
            metadata=result.get("metadata")
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conductor/status")
async def conductor_status():
    """Get ExperimentConductor status"""
    return experiment_conductor.get_status()

# ============================================
# DATA ANALYST ENDPOINTS
# ============================================

class SessionAnalysisRequest(BaseModel):
    session_id: str
    experiment_type: str
    responses: List[Dict[str, Any]]
    targets: Optional[List[Dict[str, Any]]] = None
    baseline: Optional[Dict[str, Any]] = None

class AggregateAnalysisRequest(BaseModel):
    user_id: str
    experiment_type: str
    sessions: List[Dict[str, Any]]
    time_period: str = "all_time"

@app.post("/analyst/session")
async def analyze_session(request: SessionAnalysisRequest):
    """Analyze a single experiment session"""
    try:
        result = await data_analyst.analyze_session(
            session_id=request.session_id,
            experiment_type=request.experiment_type,
            responses=request.responses,
            targets=request.targets,
            baseline=request.baseline
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyst/aggregate")
async def analyze_aggregate(request: AggregateAnalysisRequest):
    """Analyze aggregate performance across sessions"""
    try:
        result = await data_analyst.analyze_aggregate(
            user_id=request.user_id,
            experiment_type=request.experiment_type,
            sessions=request.sessions,
            time_period=request.time_period
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analyst/status")
async def analyst_status():
    """Get DataAnalyst status"""
    return data_analyst.get_status()

# ============================================
# EVALS ENDPOINTS
# ============================================

class EvaluateAgentRequest(BaseModel):
    agent_name: str
    eval_type: str = "comprehensive"

@app.post("/evals/run")
async def run_evaluation(request: EvaluateAgentRequest, _: bool = Depends(verify_admin_key)):
    """Run evaluation on an agent (admin only)"""
    try:
        # Get agent instance
        if request.agent_name == "experiment_conductor":
            agent_instance = experiment_conductor
        elif request.agent_name == "data_analyst":
            agent_instance = data_analyst
        else:
            raise HTTPException(status_code=404, detail=f"Agent '{request.agent_name}' not found")

        # Run evaluation
        result = await evaluator.evaluate_agent(
            agent_name=request.agent_name,
            agent_instance=agent_instance,
            eval_type=request.eval_type
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/evals/status")
async def evals_status():
    """Get evaluation system status"""
    return {
        "status": "active",
        "evaluator": "AgentEvaluator",
        "available_agents": ["experiment_conductor", "data_analyst"],
        "eval_types": ["comprehensive", "safety", "accuracy"]
    }

# ============================================
# METACOORDINATOR ENDPOINTS
# ============================================

class MetaTaskRequest(BaseModel):
    task: str = Field(..., description="Natural language task description")
    user_id: Optional[str] = Field(None, description="User ID")
    session_id: Optional[str] = Field(None, description="Session ID")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")

class WorkflowExecutionRequest(BaseModel):
    template_id: str = Field(..., description="ExperimentTemplate ID")
    user_id: str = Field(..., description="User ID")
    initial_data: Optional[Dict[str, Any]] = Field(None, description="Initial workflow data")

@app.post("/meta/task")
async def execute_meta_task(request: MetaTaskRequest):
    """
    Execute a task using MetaCoordinator's intelligent routing
    Automatically selects and coordinates appropriate agents
    """
    try:
        result = await meta_coordinator.execute_task(
            task=request.task,
            user_id=request.user_id,
            session_id=request.session_id,
            context=request.context
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/meta/workflow")
async def execute_workflow(request: WorkflowExecutionRequest, _: bool = Depends(verify_admin_key)):
    """
    Execute an AgentBuilder workflow template (admin only)
    Runs all steps in sequence with appropriate agents
    """
    try:
        result = await meta_coordinator.execute_workflow(
            template_id=request.template_id,
            user_id=request.user_id,
            initial_data=request.initial_data
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/meta/status")
async def meta_status():
    """Get MetaCoordinator status"""
    return meta_coordinator.get_status()

# ============================================
# REMOTE VIEWING EXPERT ENDPOINTS
# ============================================

class RVSessionStartRequest(BaseModel):
    session_id: str = Field(..., description="Unique session identifier")
    user_id: str = Field(..., description="Participant ID")
    protocol: str = Field(default="CRV", description="RV protocol (CRV, ERV, ARV)")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")

class RVStageGuidanceRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    stage: int = Field(..., description="Current stage (1-6 for CRV)")
    protocol: str = Field(default="CRV", description="RV protocol")
    previous_impressions: Optional[str] = Field(None, description="Previous stage responses")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")

class RVQuestionRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    question: str = Field(..., description="Participant question")
    current_stage: int = Field(..., description="Current stage number")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")

class RVSessionCompleteRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    user_id: str = Field(..., description="Participant ID")
    impressions: Dict[str, Any] = Field(..., description="All collected impressions")

class RVFeedbackRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    user_id: str = Field(..., description="Participant ID")
    scoring_results: Dict[str, Any] = Field(..., description="Results from PsiScoreAI")
    impressions: Dict[str, Any] = Field(..., description="Participant impressions")

@app.post("/rv/session/start")
async def start_rv_session(request: RVSessionStartRequest):
    """Start a new remote viewing session"""
    try:
        result = await rv_expert.start_session(
            session_id=request.session_id,
            user_id=request.user_id,
            protocol=request.protocol,
            context=request.context
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rv/session/guide")
async def guide_rv_stage(request: RVStageGuidanceRequest):
    """Get stage-specific guidance during RV session"""
    try:
        result = await rv_expert.guide_stage(
            session_id=request.session_id,
            stage=request.stage,
            protocol=request.protocol,
            previous_impressions=request.previous_impressions,
            context=request.context
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rv/session/question")
async def handle_rv_question(request: RVQuestionRequest):
    """Answer participant questions during RV session"""
    try:
        result = await rv_expert.handle_participant_question(
            session_id=request.session_id,
            question=request.question,
            current_stage=request.current_stage,
            context=request.context
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rv/session/complete")
async def complete_rv_session(request: RVSessionCompleteRequest):
    """Mark RV session as complete"""
    try:
        result = await rv_expert.complete_session(
            session_id=request.session_id,
            user_id=request.user_id,
            impressions=request.impressions
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rv/feedback")
async def provide_rv_feedback(request: RVFeedbackRequest):
    """Generate personalized feedback after scoring"""
    try:
        result = await rv_expert.provide_feedback(
            session_id=request.session_id,
            user_id=request.user_id,
            scoring_results=request.scoring_results,
            impressions=request.impressions
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rv/status")
async def rv_expert_status():
    """Get RV-Expert agent status"""
    return rv_expert.get_status()

# ============================================
# PSI SCORING ENDPOINTS
# ============================================

class PsiScoreRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    user_id: str = Field(..., description="Participant ID")
    impressions: Dict[str, Any] = Field(..., description="Participant's impressions")
    target_data: Dict[str, Any] = Field(..., description="Actual target information")
    target_hash: str = Field(..., description="Hash of the target")

@app.post("/rv/score")
async def score_rv_session(request: PsiScoreRequest):
    """Score a completed RV session using multi-dimensional analysis"""
    try:
        result = await psi_score_ai.score_session(
            session_id=request.session_id,
            user_id=request.user_id,
            impressions=request.impressions,
            target_data=request.target_data,
            target_hash=request.target_hash
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/rv/scorer/status")
async def psi_scorer_status():
    """Get PsiScoreAI status"""
    return psi_score_ai.get_status()

# ============================================
# CLIP IMAGE SIMILARITY SCORING
# ============================================

class ImageSimilarityRequest(BaseModel):
    target_image_url: str = Field(..., description="URL or path to target image")
    choice_image_url: str = Field(..., description="URL or path to user's chosen image")
    distractor_image_urls: Optional[List[str]] = Field(None, description="Distractor image URLs for Psi-Coefficient")

@app.post("/score/image-similarity")
async def score_image_similarity(request: ImageSimilarityRequest):
    """Score image similarity using CLIP vectors and compute Psi-Coefficient"""
    try:
        result = await psi_score_ai.score_image_similarity(
            target_image_url=request.target_image_url,
            choice_image_url=request.choice_image_url,
            distractor_image_urls=request.distractor_image_urls
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PsiCoefficientRequest(BaseModel):
    target_image_url: str = Field(..., description="Target image URL")
    response_image_url: str = Field(..., description="Response/chosen image URL")
    distractor_image_urls: List[str] = Field(..., description="Distractor image URLs")

@app.post("/score/psi-coefficient")
async def calculate_psi_coefficient(request: PsiCoefficientRequest):
    """Calculate Psi-Coefficient: Ψ = (Sim(R,T) - Mean(Sim(R,D))) / σ"""
    try:
        result = await psi_score_ai.calculate_psi_coefficient(
            target_image_url=request.target_image_url,
            response_image_url=request.response_image_url,
            distractor_image_urls=request.distractor_image_urls
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# AI IMAGE GENERATION
# ============================================

class GenerateTargetRequest(BaseModel):
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")
    style: Optional[str] = Field("photorealistic", description="Image style")
    category: Optional[str] = Field(None, description="Target category hint")

class GenerateDistractorsRequest(BaseModel):
    target_image_url: Optional[str] = Field(None, description="Target image URL")
    target_description: Optional[str] = Field(None, description="Target description")
    num_distractors: int = Field(3, description="Number of distractors to generate")
    adversarial: bool = Field(True, description="Use adversarial semantic sieve")

@app.post("/generate/target")
async def generate_target(request: GenerateTargetRequest):
    """Generate a unique AI target image, returns IPFS CID"""
    try:
        from services.image_generator import ImageGenerator
        generator = ImageGenerator()
        result = await generator.generate_target(
            seed=request.seed,
            style=request.style,
            category=request.category
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate/distractors")
async def generate_distractors(request: GenerateDistractorsRequest):
    """Generate distractor images similar to but distinct from target"""
    try:
        from services.image_generator import ImageGenerator
        generator = ImageGenerator()
        result = await generator.generate_distractors(
            target_image_url=request.target_image_url,
            target_description=request.target_description,
            num_distractors=request.num_distractors,
            adversarial=request.adversarial
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ADVERSARIAL DISTRACTOR ENGINE
# ============================================

class AdversarialDistractorRequest(BaseModel):
    target_image_url: Optional[str] = Field(None, description="Target image URL")
    target_description: str = Field(..., description="Target image description")
    num_distractors: int = Field(3, description="Number of distractors")
    min_similarity: float = Field(0.7, description="Minimum inter-similarity threshold")

@app.post("/distractors/adversarial")
async def generate_adversarial_distractors(request: AdversarialDistractorRequest):
    """Generate adversarial distractors using the Semantic Sieve method"""
    try:
        from services.distractor_engine import DistractorEngine
        engine = DistractorEngine()
        result = await engine.generate_adversarial_distractors(
            target_image_url=request.target_image_url,
            target_description=request.target_description,
            num_distractors=request.num_distractors,
            min_similarity=request.min_similarity
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=os.environ.get("NODE_ENV") != "production",
        log_level="info"
    )
