"""
PsiScoreAI - Specialized Remote Viewing Scoring Agent
Multi-dimensional analysis of RV session data using AI (Gemini Vision)

All dimension scorers accept raw free-text impressions and extract
the relevant aspects (spatial, sensory, emotional, etc.) automatically.
This avoids requiring structured CRV stage data and reduces analytical
overlay for untrained viewers.
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

    Scoring Dimensions (all derived from raw text):
    - Spatial correlation (geometric/structural accuracy)
    - Semantic alignment (concept/meaning similarity)
    - Emotional resonance (affective tone matching)
    - Sensory accuracy (texture, temperature, sound, color)
    - Symbolic correspondence (archetypal/metaphoric accuracy)
    """

    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm = llm_provider or get_default_provider()
        self.model = self.llm.get_default_model()
        self.name = "PsiScoreAI"
        self.version = "1.1.0"
        self.total_scorings = 0

        # Embeddings handled via LLM API
        self.embedding_model = None

        self.system_prompt = """You are PsiScoreAI, an objective AI scoring system for remote viewing experiments.

Your role is to analyze participant impressions against targets and provide multi-dimensional scoring.

The participant provides free-form text describing their impressions. You must extract and evaluate
the relevant aspects for each scoring dimension from their raw text.

SCORING DIMENSIONS:
1. **Spatial Correlation** (0-1): Geometric and structural accuracy
   - Extract any mentions of: shapes, sizes, orientation, layout, distances, spatial relationships
   - Compare against target's spatial properties

2. **Semantic Alignment** (0-1): Conceptual and meaning similarity
   - Overall thematic and conceptual match
   - Category matching (natural vs manufactured, indoor vs outdoor)
   - Function/purpose alignment

3. **Emotional Resonance** (0-1): Affective tone matching
   - Extract any mentions of: mood, atmosphere, feelings, aesthetic qualities
   - Compare emotional tone against what the target naturally evokes

4. **Sensory Accuracy** (0-1): Multi-sensory accuracy
   - Extract any mentions of: colors, textures, temperatures, sounds, smells, tactile qualities
   - Compare against target's sensory properties

5. **Symbolic Correspondence** (0-1): Metaphoric/archetypal accuracy
   - Symbolic representations and metaphors in the impressions
   - Archetypal patterns that match the target's essence
   - Conceptual associations that indirectly describe the target

ANALYSIS PRINCIPLES:
- Objective and data-driven
- Be generous in recognizing indirect or metaphoric matches (RV often produces symbolic rather than literal impressions)
- No confirmation bias, but also don't penalize for extra impressions that don't match
- Score each dimension independently
- A score of 0.5 represents moderate/partial correspondence, not "average"

OUTPUT: Always respond with valid JSON only."""

    async def score_session(
        self,
        session_id: str,
        user_id: str,
        impressions: Dict[str, Any],
        target_data: Dict[str, Any],
        target_hash: str
    ) -> Dict[str, Any]:
        """
        Score a complete RV session using raw text impressions.
        """
        start_time = datetime.utcnow()
        self.total_scorings += 1

        # Extract all text into a single string
        text_impressions = self._extract_text_impressions(impressions)
        target_description = target_data.get("description", "")
        target_tags = target_data.get("tags", [])

        # Build a rich target description for scoring
        target_context = target_description
        if target_tags:
            target_context += f" (tags: {', '.join(target_tags)})"

        if not text_impressions:
            text_impressions = "(no impressions provided)"

        # Score all dimensions using raw text
        spatial_score = await self._score_spatial(text_impressions, target_context)
        semantic_score = await self._score_semantic(text_impressions, target_context)
        emotional_score = await self._score_emotional(text_impressions, target_context)
        sensory_score = await self._score_sensory(text_impressions, target_context)
        symbolic_score = await self._score_symbolic(text_impressions, target_context)

        # Weighted composite
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

        scores = {
            "spatial": spatial_score,
            "semantic": semantic_score,
            "emotional": emotional_score,
            "sensory": sensory_score,
            "symbolic": symbolic_score,
            "overall": overall_score
        }

        # Statistical context
        statistical_context = self._calculate_statistical_context(overall_score)

        # Detailed analysis + correspondences/mismatches (single LLM call)
        analysis_result = await self._generate_analysis(
            text_impressions, target_context, scores
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
            "detailed_analysis": analysis_result.get("analysis", ""),
            "correspondences": analysis_result.get("correspondences", []),
            "mismatches": analysis_result.get("mismatches", []),
            "duration_ms": duration_ms,
            "scored_at": datetime.utcnow().isoformat(),
            "scorer_version": self.version
        }

    # =========================================================================
    # DIMENSION SCORERS - All work with raw text
    # =========================================================================

    async def _score_spatial(self, impressions: str, target: str) -> float:
        """Score spatial/structural accuracy from raw text"""
        prompt = f"""Extract any spatial or structural elements from these remote viewing impressions,
then score how well they match the target.

IMPRESSIONS: "{impressions}"

TARGET: "{target}"

Look for: shapes, sizes, layout, orientation, distances, structures, open/enclosed spaces,
heights, widths, geometric forms, spatial relationships.

Score 0-1:
- 1.0 = Strong spatial match (shapes, layout, structures align)
- 0.5 = Partial match (some spatial elements correspond)
- 0.0 = No spatial correspondence

JSON: {{"score": float, "extracted": "spatial elements found in impressions"}}"""

        return await self._llm_score(prompt)

    async def _score_semantic(self, impressions: str, target: str) -> float:
        """Score conceptual/meaning similarity from raw text"""
        if not impressions or impressions == "(no impressions provided)":
            return 0.0

        prompt = f"""Score the overall conceptual and thematic similarity between these
remote viewing impressions and the target.

IMPRESSIONS: "{impressions}"

TARGET: "{target}"

Consider: category match (natural/manufactured, indoor/outdoor), thematic overlap,
conceptual associations, function/purpose alignment.

Score 0-1:
- 1.0 = Strong conceptual match
- 0.5 = Some thematic overlap
- 0.0 = No semantic connection

JSON: {{"score": float}}"""

        return await self._llm_score(prompt)

    async def _score_emotional(self, impressions: str, target: str) -> float:
        """Score emotional/atmospheric accuracy from raw text"""
        prompt = f"""Extract any emotional or atmospheric elements from these remote viewing
impressions, then score how well the emotional tone matches what the target naturally evokes.

IMPRESSIONS: "{impressions}"

TARGET: "{target}"

Look for: mood words, atmosphere descriptions, feelings, aesthetic qualities, emotional tones
(peaceful, energetic, mysterious, warm, cold, inviting, desolate, etc.)

Score 0-1:
- 1.0 = Emotional tone strongly matches the target's natural feel
- 0.5 = Partial emotional correspondence
- 0.0 = No emotional match

JSON: {{"score": float, "extracted": "emotional elements found"}}"""

        return await self._llm_score(prompt)

    async def _score_sensory(self, impressions: str, target: str) -> float:
        """Score sensory accuracy from raw text"""
        prompt = f"""Extract any sensory details from these remote viewing impressions,
then score how well they match the target.

IMPRESSIONS: "{impressions}"

TARGET: "{target}"

Look for: colors, textures, temperatures, sounds, smells, tastes, tactile qualities,
light/dark, wet/dry, smooth/rough, loud/quiet, visual details.

Score 0-1:
- 1.0 = Strong sensory match
- 0.5 = Some sensory elements correspond
- 0.0 = No sensory correspondence

JSON: {{"score": float, "extracted": "sensory elements found"}}"""

        return await self._llm_score(prompt)

    async def _score_symbolic(self, impressions: str, target: str) -> float:
        """Score symbolic/metaphoric accuracy from raw text"""
        prompt = f"""Analyze any symbolic, metaphoric, or archetypal elements in these
remote viewing impressions and score how well they correspond to the target
(even indirectly or metaphorically).

IMPRESSIONS: "{impressions}"

TARGET: "{target}"

RV often produces symbolic rather than literal matches. For example, "flowing"
might correspond to water, "reaching upward" to mountains or tall buildings.

Score 0-1:
- 1.0 = Strong symbolic/metaphoric correspondence
- 0.5 = Some symbolic connection
- 0.0 = No symbolic correspondence

JSON: {{"score": float, "extracted": "symbolic elements found"}}"""

        return await self._llm_score(prompt)

    async def _llm_score(self, prompt: str) -> float:
        """Helper: call LLM with a scoring prompt, extract score float"""
        try:
            response = await self.llm.chat_completion(
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.1
            )
            content = response["content"].strip()
            # Strip markdown code fences if present
            if content.startswith("```"):
                content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            result = json.loads(content)
            return max(0.0, min(1.0, float(result.get("score", 0.0))))
        except (json.JSONDecodeError, ValueError, KeyError):
            return 0.0

    # =========================================================================
    # ANALYSIS
    # =========================================================================

    async def _generate_analysis(
        self,
        impressions: str,
        target: str,
        scores: Dict[str, float]
    ) -> Dict[str, Any]:
        """Generate detailed analysis, correspondences, and mismatches in one call"""
        prompt = f"""Analyze this remote viewing session and provide a detailed assessment.

PARTICIPANT'S IMPRESSIONS: "{impressions}"

TARGET: "{target}"

DIMENSION SCORES:
{json.dumps(scores, indent=2)}

Provide your analysis as JSON with these exact keys:
{{
  "analysis": "2-3 sentence overall assessment. Mention strongest and weakest dimensions.",
  "correspondences": ["specific match 1", "specific match 2", ...],
  "mismatches": ["specific divergence 1", "specific divergence 2", ...]
}}

For correspondences, list specific elements from the impressions that match the target.
For mismatches, list impressions that don't correspond to the target.
Keep each item concise (under 15 words). Include 2-5 items per list."""

        try:
            response = await self.llm.chat_completion(
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                model=self.model,
                temperature=0.3,
                max_tokens=500
            )
            content = response["content"].strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            return json.loads(content)
        except (json.JSONDecodeError, ValueError):
            return {
                "analysis": f"Overall score: {scores['overall']:.0%}. Analysis generation failed.",
                "correspondences": [],
                "mismatches": []
            }

    # =========================================================================
    # HELPERS
    # =========================================================================

    def _extract_text_impressions(self, impressions: Dict[str, Any]) -> str:
        """Extract all text impressions into a single string from any input format"""
        texts = []

        # Handle simple format: {description, impressions}
        if "description" in impressions:
            texts.append(str(impressions["description"]))
        if "impressions" in impressions:
            texts.append(str(impressions["impressions"]))

        # Handle structured CRV format (backwards compat)
        for stage in range(1, 7):
            stage_data = impressions.get(f"stage_{stage}_data", {})
            if isinstance(stage_data, dict) and "text" in stage_data:
                texts.append(stage_data["text"])

        # Handle raw text field
        if "text" in impressions:
            texts.append(str(impressions["text"]))

        return " ".join(t for t in texts if t and t.strip())

    def _calculate_statistical_context(self, overall_score: float) -> Dict[str, Any]:
        """Calculate statistical significance and context"""
        chance_baseline = 0.20
        std_dev = 0.15
        z_score = (overall_score - chance_baseline) / std_dev
        cohens_d = z_score  # Same formula for single observation

        return {
            "chance_baseline": chance_baseline,
            "score_above_chance": overall_score > chance_baseline,
            "z_score": round(z_score, 2),
            "cohens_d": round(cohens_d, 2),
            "effect_size_interpretation": self._interpret_effect_size(cohens_d),
            "percentile": round(self._score_to_percentile(overall_score), 1)
        }

    def _interpret_effect_size(self, cohens_d: float) -> str:
        if cohens_d < 0.2:
            return "negligible"
        elif cohens_d < 0.5:
            return "small"
        elif cohens_d < 0.8:
            return "medium"
        else:
            return "large"

    def _score_to_percentile(self, score: float) -> float:
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

    # =========================================================================
    # IMAGE COMPARISON (unchanged)
    # =========================================================================

    async def score_image_similarity(
        self,
        target_image_url: str,
        choice_image_url: str,
        distractor_image_urls: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Score image similarity using Gemini Vision API."""
        if not self._validate_image_url(target_image_url) or not self._validate_image_url(choice_image_url):
            return {"error": "Invalid image URL", "similarity": 0.0}

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
        BLOCKED_PATTERNS = [
            'localhost', '127.0.0.1', '0.0.0.0',
            '10.', '172.16.', '172.17.', '172.18.', '172.19.',
            '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
            '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
            '172.30.', '172.31.', '192.168.',
            'metadata.google', '169.254.',
        ]
        url_lower = url.lower()
        for blocked in BLOCKED_PATTERNS:
            if blocked in url_lower:
                return False
        return url.startswith('https://')

    async def _fetch_image_as_base64(self, image_url: str) -> Optional[str]:
        """Fetch image from URL and convert to base64"""
        try:
            if not self._validate_image_url(image_url):
                print(f"[PsiScoreAI] SECURITY: Rejected invalid/blocked URL: {image_url[:50]}")
                return None
            async with httpx.AsyncClient() as client:
                resp = await client.get(image_url, timeout=30.0)
                resp.raise_for_status()
                content_type = resp.headers.get('content-type', '')
                if not content_type.startswith('image/'):
                    print(f"[PsiScoreAI] SECURITY: Rejected non-image content type: {content_type}")
                    return None
                return base64.b64encode(resp.content).decode('utf-8')
        except Exception as e:
            print(f"[PsiScoreAI] Error fetching image {image_url}: {e}")
            return None

    async def _compare_images_with_gemini(self, image1_url: str, image2_url: str) -> float:
        """Use Gemini Vision to compare two images"""
        try:
            prompt = """Compare these two images and rate their visual similarity on a scale from 0 to 1.
Consider: visual elements, composition, theme, semantic meaning.
Respond with ONLY JSON: {"similarity": 0.XX, "reasoning": "brief explanation"}"""

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
            return await self._compare_images_fallback(image1_url, image2_url)

    async def _compare_images_fallback(self, image1_url: str, image2_url: str) -> float:
        """Fallback: describe images and compare descriptions"""
        try:
            desc1 = await self._describe_image(image1_url)
            desc2 = await self._describe_image(image2_url)
            if not desc1 or not desc2:
                return 0.0

            prompt = f"""Compare these two image descriptions and rate similarity (0-1):
Image 1: {desc1}
Image 2: {desc2}
JSON: {{"similarity": 0.XX}}"""

            response = await self.llm.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                model=self.model,
                temperature=0.1
            )
            result = json.loads(response["content"])
            return float(result.get("similarity", 0.0))
        except Exception:
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
        except Exception:
            return None

    async def calculate_psi_coefficient(
        self,
        target_image_url: str,
        response_image_url: str,
        distractor_image_urls: List[str]
    ) -> Dict[str, Any]:
        """Calculate Psi-Coefficient: Ψ = (Sim(R,T) - Mean(Sim(R,D))) / σ"""
        sim_rt = await self._compare_images_with_gemini(response_image_url, target_image_url)

        distractor_sims = []
        for d_url in distractor_image_urls:
            if self._validate_image_url(d_url):
                sim_rd = await self._compare_images_with_gemini(response_image_url, d_url)
                distractor_sims.append(sim_rd)

        if not distractor_sims:
            return {"error": "No valid distractor images", "psi": 0.0}

        mean_distractor_sim = float(np.mean(distractor_sims))
        std_distractor_sim = float(np.std(distractor_sims)) if len(distractor_sims) > 1 else 0.1
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
            "significant": abs(psi) > 1.96
        }

    def _interpret_psi(self, psi: float) -> str:
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
