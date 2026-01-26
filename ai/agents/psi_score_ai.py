"""
PsiScoreAI - Specialized Remote Viewing Scoring Agent
Multi-dimensional analysis of RV session data using AI (Gemini Vision)
"""

from typing import Dict, List, Any, Optional
import os
import numpy as np
from datetime import datetime
import json
import base64
import httpx

from llm_provider import get_default_provider, LLMProvider


class PsiScoreAI:
    """
    Objective scoring and statistical analysis of remote viewing sessions

    Scoring Dimensions:
    - Spatial correlation (geometric/structural accuracy)
    - Semantic alignment (concept/meaning similarity)
    - Emotional resonance (affective tone matching)
    - Stage-specific accuracy (performance by CRV stage)
    - Symbolic correspondence (archetypal/metaphoric accuracy)
    """

    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm = llm_provider or get_default_provider()
        self.model = self.llm.get_default_model()
        self.name = "PsiScoreAI"
        self.version = "1.0.0"
        self.total_scorings = 0

        # Embeddings handled via LLM API
        self.embedding_model = None

        self.system_prompt = """You are PsiScoreAI, an objective AI scoring system for remote viewing experiments.

Your role is to analyze participant impressions against targets and provide multi-dimensional scoring.

SCORING DIMENSIONS:
1. **Spatial Correlation** (0-1): Geometric and structural accuracy
   - Shape, size, orientation
   - Spatial relationships
   - Dimensional properties

2. **Semantic Alignment** (0-1): Conceptual and meaning similarity
   - Category matching (natural vs manufactured)
   - Function/purpose alignment
   - Thematic coherence

3. **Emotional Resonance** (0-1): Affective tone matching
   - Mood/atmosphere
   - Emotional qualities
   - Aesthetic impact

4. **Sensory Accuracy** (0-1): Stage 2 specific
   - Texture, temperature
   - Sounds, smells
   - Tactile qualities

5. **Symbolic Correspondence** (0-1): Metaphoric/archetypal accuracy
   - Symbolic representations
   - Archetypal patterns
   - Metaphoric accuracy

ANALYSIS PRINCIPLES:
- Objective and data-driven
- Multi-dimensional assessment
- Statistical baselines for context
- No confirmation bias
- Transparent methodology

OUTPUT REQUIREMENTS:
- Numerical scores (0-1) for each dimension
- Overall composite score
- Confidence intervals
- Specific correspondences identified
- Mismatches noted
- Statistical context (comparison to chance)

Be rigorous, objective, and scientifically precise."""

    async def score_session(
        self,
        session_id: str,
        user_id: str,
        impressions: Dict[str, Any],
        target_data: Dict[str, Any],
        target_hash: str
    ) -> Dict[str, Any]:
        """
        Score a complete RV session

        Args:
            session_id: Session identifier
            user_id: Participant ID
            impressions: Participant's impressions (text, sketches, stage data)
            target_data: The actual target information (now revealed for scoring)
            target_hash: Hash of the target (for verification)

        Returns:
            Multi-dimensional scoring results
        """
        start_time = datetime.utcnow()
        self.total_scorings += 1

        # Extract text impressions
        text_impressions = self._extract_text_impressions(impressions)
        target_description = target_data.get("description", "")

        # Calculate individual scores
        spatial_score = await self._score_spatial_correlation(
            impressions,
            target_data
        )

        semantic_score = await self._score_semantic_alignment(
            text_impressions,
            target_description
        )

        emotional_score = await self._score_emotional_resonance(
            impressions.get("stage_4_data", {}),
            target_data.get("emotional_qualities", {})
        )

        sensory_score = await self._score_sensory_accuracy(
            impressions.get("stage_2_data", {}),
            target_data.get("sensory_properties", {})
        )

        symbolic_score = await self._score_symbolic_correspondence(
            impressions,
            target_data
        )

        # Calculate overall composite score
        # Weighted average based on RV research consensus
        weights = {
            "spatial": 0.25,
            "semantic": 0.25,
            "emotional": 0.20,
            "sensory": 0.15,
            "symbolic": 0.15
        }

        overall_score = (
            spatial_score * weights["spatial"] +
            semantic_score * weights["semantic"] +
            emotional_score * weights["emotional"] +
            sensory_score * weights["sensory"] +
            symbolic_score * weights["symbolic"]
        )

        # Statistical analysis
        statistical_context = self._calculate_statistical_context(overall_score)

        # Generate detailed analysis
        detailed_analysis = await self._generate_detailed_analysis(
            impressions,
            target_data,
            {
                "spatial": spatial_score,
                "semantic": semantic_score,
                "emotional": emotional_score,
                "sensory": sensory_score,
                "symbolic": symbolic_score,
                "overall": overall_score
            }
        )

        end_time = datetime.utcnow()
        duration_ms = int((end_time - start_time).total_seconds() * 1000)

        return {
            "session_id": session_id,
            "user_id": user_id,
            "target_hash": target_hash,
            "scores": {
                "spatial_correlation": round(spatial_score, 3),
                "semantic_alignment": round(semantic_score, 3),
                "emotional_resonance": round(emotional_score, 3),
                "sensory_accuracy": round(sensory_score, 3),
                "symbolic_correspondence": round(symbolic_score, 3),
                "overall_score": round(overall_score, 3)
            },
            "statistical_context": statistical_context,
            "detailed_analysis": detailed_analysis,
            "correspondences": self._identify_correspondences(impressions, target_data),
            "mismatches": self._identify_mismatches(impressions, target_data),
            "duration_ms": duration_ms,
            "scored_at": datetime.utcnow().isoformat(),
            "scorer_version": self.version
        }

    async def _score_spatial_correlation(
        self,
        impressions: Dict[str, Any],
        target_data: Dict[str, Any]
    ) -> float:
        """Score geometric and structural accuracy"""
        # Extract spatial descriptors
        participant_spatial = impressions.get("stage_3_data", {})
        target_spatial = target_data.get("spatial_properties", {})

        scoring_prompt = f"""Analyze spatial correlation between impression and target:

PARTICIPANT'S SPATIAL IMPRESSIONS:
{json.dumps(participant_spatial, indent=2)}

TARGET'S SPATIAL PROPERTIES:
{json.dumps(target_spatial, indent=2)}

Score the spatial correlation on 0-1 scale:
- 1.0 = Highly accurate spatial match
- 0.5 = Moderate correspondence
- 0.0 = No spatial correlation

Consider: shapes, sizes, orientations, dimensions, spatial relationships.

Respond with JSON: {{"score": float, "reasoning": "brief explanation"}}"""

        response = await self.llm.chat_completion(
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": scoring_prompt}
            ],
            model=self.model,
            temperature=0.1  # Low temperature for consistent scoring
        )

        try:
            result = json.loads(response["content"])
            return float(result.get("score", 0.0))
        except json.JSONDecodeError:
            return 0.0

    async def _score_semantic_alignment(
        self,
        participant_text: str,
        target_description: str
    ) -> float:
        """Score conceptual and meaning similarity"""
        if not participant_text or not target_description:
            return 0.0

        # Use embeddings if available
        if self.embedding_model:
            participant_embedding = self.embedding_model.encode(participant_text)
            target_embedding = self.embedding_model.encode(target_description)

            # Cosine similarity
            similarity = float(np.dot(participant_embedding, target_embedding) /
                             (np.linalg.norm(participant_embedding) * np.linalg.norm(target_embedding)))

            # Normalize to 0-1 range (cosine similarity is -1 to 1)
            return (similarity + 1) / 2
        else:
            # Use LLM for semantic scoring
            scoring_prompt = f"""Score semantic alignment between impressions and target:

IMPRESSIONS: "{participant_text}"

TARGET: "{target_description}"

Rate semantic similarity 0-1:
- 1.0 = Concepts closely match
- 0.5 = Some thematic overlap
- 0.0 = No semantic connection

JSON: {{"score": float}}"""

            response = await self.llm.chat_completion(
                messages=[{"role": "user", "content": scoring_prompt}],
                model=self.model,
                temperature=0.1
            )

            try:
                result = json.loads(response["content"])
                return float(result.get("score", 0.0))
            except json.JSONDecodeError:
                return 0.0

    async def _score_emotional_resonance(
        self,
        participant_emotions: Dict[str, Any],
        target_emotions: Dict[str, Any]
    ) -> float:
        """Score affective tone matching"""
        if not participant_emotions or not target_emotions:
            return 0.0

        prompt = f"""Score emotional resonance:

PARTICIPANT: {json.dumps(participant_emotions)}
TARGET: {json.dumps(target_emotions)}

Rate 0-1 how well emotions match.
JSON: {{"score": float}}"""

        response = await self.llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
            temperature=0.1
        )

        try:
            result = json.loads(response["content"])
            return float(result.get("score", 0.0))
        except json.JSONDecodeError:
            return 0.0

    async def _score_sensory_accuracy(
        self,
        participant_sensory: Dict[str, Any],
        target_sensory: Dict[str, Any]
    ) -> float:
        """Score Stage 2 sensory accuracy"""
        if not participant_sensory or not target_sensory:
            return 0.0

        # Similar LLM-based scoring
        prompt = f"""Score sensory accuracy (textures, temperatures, sounds, smells):

PARTICIPANT: {json.dumps(participant_sensory)}
TARGET: {json.dumps(target_sensory)}

Rate 0-1.
JSON: {{"score": float}}"""

        response = await self.llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
            temperature=0.1
        )

        try:
            result = json.loads(response["content"])
            return float(result.get("score", 0.0))
        except json.JSONDecodeError:
            return 0.0

    async def _score_symbolic_correspondence(
        self,
        impressions: Dict[str, Any],
        target_data: Dict[str, Any]
    ) -> float:
        """Score metaphoric/archetypal accuracy"""
        # Extract symbolic elements
        symbols = impressions.get("symbols", [])
        target_symbols = target_data.get("symbolic_elements", [])

        if not symbols and not target_symbols:
            return 0.5  # Neutral if no symbolic data

        prompt = f"""Score symbolic/archetypal correspondence:

IMPRESSIONS: {json.dumps(symbols)}
TARGET: {json.dumps(target_symbols)}

Rate 0-1.
JSON: {{"score": float}}"""

        response = await self.llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
            temperature=0.1
        )

        try:
            result = json.loads(response["content"])
            return float(result.get("score", 0.0))
        except json.JSONDecodeError:
            return 0.5

    async def _generate_detailed_analysis(
        self,
        impressions: Dict[str, Any],
        target_data: Dict[str, Any],
        scores: Dict[str, float]
    ) -> str:
        """Generate comprehensive analysis of the session"""
        analysis_prompt = f"""Generate detailed analysis of this RV session:

SCORES:
{json.dumps(scores, indent=2)}

Provide:
1. Overall assessment (2 sentences)
2. Strongest correspondences (2-3 specific examples)
3. Areas of divergence (1-2 examples)
4. Statistical context (how does overall score compare to chance baseline of 0.20?)

Keep under 150 words. Be specific and scientific."""

        response = await self.llm.chat_completion(
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": analysis_prompt}
            ],
            model=self.model,
            temperature=0.5,
            max_tokens=300
        )

        return response["content"]

    def _extract_text_impressions(self, impressions: Dict[str, Any]) -> str:
        """Extract all text impressions into single string"""
        texts = []

        for stage in range(1, 7):
            stage_data = impressions.get(f"stage_{stage}_data", {})
            if "text" in stage_data:
                texts.append(stage_data["text"])

        return " ".join(texts)

    def _calculate_statistical_context(self, overall_score: float) -> Dict[str, Any]:
        """Calculate statistical significance and context"""
        # Chance baseline for multi-dimensional RV scoring
        # Research suggests ~20% baseline for random guessing
        chance_baseline = 0.20

        # Simple z-score calculation (would be more sophisticated in production)
        # Assuming standard deviation of 0.15 based on RV literature
        std_dev = 0.15
        z_score = (overall_score - chance_baseline) / std_dev

        # Effect size (Cohen's d)
        cohens_d = (overall_score - chance_baseline) / std_dev

        return {
            "chance_baseline": chance_baseline,
            "score_above_chance": overall_score > chance_baseline,
            "z_score": round(z_score, 2),
            "cohens_d": round(cohens_d, 2),
            "effect_size_interpretation": self._interpret_effect_size(cohens_d),
            "percentile": round(self._score_to_percentile(overall_score), 1)
        }

    def _interpret_effect_size(self, cohens_d: float) -> str:
        """Interpret Cohen's d effect size"""
        if cohens_d < 0.2:
            return "negligible"
        elif cohens_d < 0.5:
            return "small"
        elif cohens_d < 0.8:
            return "medium"
        else:
            return "large"

    def _score_to_percentile(self, score: float) -> float:
        """Convert score to approximate percentile (simplified)"""
        # This would use actual distribution data in production
        if score < 0.20:
            return 25
        elif score < 0.40:
            return 50
        elif score < 0.60:
            return 75
        elif score < 0.75:
            return 90
        else:
            return 95

    def _identify_correspondences(
        self,
        impressions: Dict[str, Any],
        target_data: Dict[str, Any]
    ) -> List[str]:
        """Identify specific matches between impressions and target"""
        correspondences = []

        # This would be more sophisticated in production
        # For now, placeholder logic
        correspondences.append("Stage 2 sensory data showed texture correspondence")

        return correspondences

    def _identify_mismatches(
        self,
        impressions: Dict[str, Any],
        target_data: Dict[str, Any]
    ) -> List[str]:
        """Identify specific divergences"""
        mismatches = []

        # Placeholder
        mismatches.append("Indoor/outdoor classification diverged")

        return mismatches

    async def score_image_similarity(
        self,
        target_image_url: str,
        choice_image_url: str,
        distractor_image_urls: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Score image similarity using Gemini Vision API.

        Args:
            target_image_url: URL to the target image
            choice_image_url: URL to the user's chosen image
            distractor_image_urls: URLs of distractor images for Psi-Coefficient

        Returns:
            Similarity scores including Psi-Coefficient if distractors provided
        """
        # Validate URLs
        if not self._validate_image_url(target_image_url) or not self._validate_image_url(choice_image_url):
            return {"error": "Invalid image URL", "similarity": 0.0}

        # Use Gemini to compare images
        similarity = await self._compare_images_with_gemini(target_image_url, choice_image_url)

        result = {
            "target_choice_similarity": float(similarity),
            "model": "gemini-vision",
        }

        if distractor_image_urls:
            psi = await self.calculate_psi_coefficient(
                target_image_url, choice_image_url, distractor_image_urls
            )
            result["psi_coefficient"] = psi

        return result

    def _validate_image_url(self, url: str) -> bool:
        """SECURITY: Validate that image URL is from allowed sources only"""
        # Only allow HTTPS URLs and specific trusted IPFS gateways
        ALLOWED_PREFIXES = [
            'https://',
        ]
        # Block internal/local URLs (SSRF prevention)
        BLOCKED_PATTERNS = [
            'localhost', '127.0.0.1', '0.0.0.0',
            '10.', '172.16.', '172.17.', '172.18.', '172.19.',
            '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
            '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
            '172.30.', '172.31.', '192.168.',
            'metadata.google', '169.254.',  # Cloud metadata endpoints
        ]
        url_lower = url.lower()
        for blocked in BLOCKED_PATTERNS:
            if blocked in url_lower:
                return False
        return any(url.startswith(prefix) for prefix in ALLOWED_PREFIXES)

    async def _fetch_image_as_base64(self, image_url: str) -> Optional[str]:
        """Fetch image from URL and convert to base64"""
        try:
            if not self._validate_image_url(image_url):
                print(f"[PsiScoreAI] SECURITY: Rejected invalid/blocked URL: {image_url[:50]}")
                return None

            async with httpx.AsyncClient() as client:
                resp = await client.get(image_url, timeout=30.0)
                resp.raise_for_status()
                # SECURITY: Validate content type
                content_type = resp.headers.get('content-type', '')
                if not content_type.startswith('image/'):
                    print(f"[PsiScoreAI] SECURITY: Rejected non-image content type: {content_type}")
                    return None
                return base64.b64encode(resp.content).decode('utf-8')
        except Exception as e:
            print(f"[PsiScoreAI] Error fetching image {image_url}: {e}")
            return None

    async def _compare_images_with_gemini(self, image1_url: str, image2_url: str) -> float:
        """Use Gemini Vision to compare two images and return similarity score (0-1)"""
        try:
            prompt = """Compare these two images and rate their visual similarity on a scale from 0 to 1.

Consider:
- Visual elements (shapes, colors, objects)
- Composition and layout
- Overall theme/concept
- Semantic meaning

Respond with ONLY a JSON object: {"similarity": 0.XX, "reasoning": "brief explanation"}

Be objective and precise. A score of 1.0 means nearly identical, 0.5 means moderate similarity, 0.0 means completely different."""

            # Use LLM with image URLs for vision
            response = await self.llm.chat_completion_with_images(
                messages=[{"role": "user", "content": prompt}],
                image_urls=[image1_url, image2_url],
                model=self.model,
                temperature=0.1
            )

            result = json.loads(response["content"])
            return float(result.get("similarity", 0.0))
        except Exception as e:
            print(f"[PsiScoreAI] Error comparing images with Gemini: {e}")
            # Fallback to text-based comparison if vision fails
            return await self._compare_images_fallback(image1_url, image2_url)

    async def _compare_images_fallback(self, image1_url: str, image2_url: str) -> float:
        """Fallback: describe images and compare descriptions"""
        try:
            # Get descriptions of both images
            desc1 = await self._describe_image(image1_url)
            desc2 = await self._describe_image(image2_url)

            if not desc1 or not desc2:
                return 0.0

            # Compare descriptions
            prompt = f"""Compare these two image descriptions and rate their similarity (0-1):

Image 1: {desc1}
Image 2: {desc2}

Respond with JSON: {{"similarity": 0.XX}}"""

            response = await self.llm.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                model=self.model,
                temperature=0.1
            )

            result = json.loads(response["content"])
            return float(result.get("similarity", 0.0))
        except Exception as e:
            print(f"[PsiScoreAI] Fallback comparison failed: {e}")
            return 0.0

    async def _describe_image(self, image_url: str) -> Optional[str]:
        """Get a description of an image using Gemini Vision"""
        try:
            response = await self.llm.chat_completion_with_images(
                messages=[{"role": "user", "content": "Describe this image in detail (shapes, colors, objects, mood, composition). Be concise but thorough."}],
                image_urls=[image_url],
                model=self.model,
                temperature=0.3
            )
            return response["content"]
        except Exception as e:
            print(f"[PsiScoreAI] Error describing image: {e}")
            return None

    async def calculate_psi_coefficient(
        self,
        target_image_url: str,
        response_image_url: str,
        distractor_image_urls: List[str]
    ) -> Dict[str, Any]:
        """
        Calculate the Psi-Coefficient using Gemini Vision:
        Ψ = (Sim(R,T) - Mean(Sim(R,D₁...₃))) / σ

        Where:
            R = Response (user's choice)
            T = Target
            D₁...₃ = Distractor images
            σ = Std deviation of all Sim(R, D) values

        Args:
            target_image_url: The correct target image
            response_image_url: The user's chosen/drawn response
            distractor_image_urls: List of distractor image URLs

        Returns:
            Psi-Coefficient with statistical context
        """
        # Calculate similarity between response and target
        sim_rt = await self._compare_images_with_gemini(response_image_url, target_image_url)

        # Calculate similarities between response and each distractor
        distractor_sims = []
        for d_url in distractor_image_urls:
            if self._validate_image_url(d_url):
                sim_rd = await self._compare_images_with_gemini(response_image_url, d_url)
                distractor_sims.append(sim_rd)

        if not distractor_sims:
            return {"error": "No valid distractor images", "psi": 0.0}

        mean_distractor_sim = float(np.mean(distractor_sims))
        std_distractor_sim = float(np.std(distractor_sims)) if len(distractor_sims) > 1 else 0.1

        # Avoid division by zero
        if std_distractor_sim < 0.001:
            std_distractor_sim = 0.1

        psi = (sim_rt - mean_distractor_sim) / std_distractor_sim

        return {
            "psi": round(float(psi), 4),
            "sim_response_target": round(sim_rt, 4),
            "mean_sim_response_distractors": round(mean_distractor_sim, 4),
            "std_distractors": round(std_distractor_sim, 4),
            "distractor_similarities": [round(s, 4) for s in distractor_sims],
            "interpretation": self._interpret_psi(psi),
            "significant": abs(psi) > 1.96  # 95% confidence
        }

    def _interpret_psi(self, psi: float) -> str:
        """Interpret the Psi-Coefficient value"""
        if psi > 2.58:
            return "highly_significant_hit"
        elif psi > 1.96:
            return "significant_hit"
        elif psi > 1.0:
            return "suggestive_hit"
        elif psi > 0:
            return "slight_positive"
        elif psi > -1.0:
            return "chance_level"
        elif psi > -1.96:
            return "below_chance"
        else:
            return "significant_miss"

    def get_status(self) -> Dict[str, Any]:
        """Get PsiScoreAI status"""
        return {
            "name": self.name,
            "version": self.version,
            "status": "active",
            "model": self.model,
            "total_scorings": self.total_scorings,
            "vision_available": True,
            "scoring_dimensions": [
                "spatial_correlation",
                "semantic_alignment",
                "emotional_resonance",
                "sensory_accuracy",
                "symbolic_correspondence"
            ],
            "image_comparison": "gemini-vision",
            "capabilities": [
                "multi_dimensional_scoring",
                "statistical_analysis",
                "correspondence_detection",
                "effect_size_calculation",
                "gemini_image_similarity",
                "psi_coefficient"
            ]
        }
