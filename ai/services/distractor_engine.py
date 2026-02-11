"""
Adversarial Distractor Engine ("Semantic Sieve")
Generates distractor images that share the same semantic tags as the target,
making text-based elimination impossible and forcing genuine psi perception.
"""

import os
import json
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

from llm_provider import get_default_provider


class DistractorEngine:
    """
    The Semantic Sieve generates distractors by:
    1. Analyzing target image/description to extract 5 core visual tags
    2. Generating distractor images using those SAME tags but varied composition
    3. Verifying inter-similarity > threshold so text descriptions are useless
    4. Returning all images with metadata
    """

    def __init__(self):
        self.llm = get_default_provider()
        self.model = self.llm.get_default_model()

    async def generate_adversarial_distractors(
        self,
        target_image_url: Optional[str] = None,
        target_description: str = "",
        num_distractors: int = 3,
        min_similarity: float = 0.7
    ) -> Dict[str, Any]:
        """
        Generate adversarial distractors using the Semantic Sieve method.

        Args:
            target_image_url: URL of target image (optional)
            target_description: Text description of the target
            num_distractors: Number of distractors to generate
            min_similarity: Minimum cosine similarity threshold between all images

        Returns:
            Dict with target tags, distractor images, and similarity scores
        """
        # Step 1: Extract visual tags from target
        tags = await self._extract_visual_tags(target_description, target_image_url)

        # Step 2: Generate distractor prompts using same tags
        distractor_prompts = await self._generate_distractor_prompts(tags, num_distractors)

        # Step 3: Generate distractor images
        from services.image_generator import ImageGenerator
        generator = ImageGenerator()

        distractors = []
        for i, prompt in enumerate(distractor_prompts):
            import random
            seed = random.randint(0, 2**32 - 1)
            image_url = await generator._generate_with_replicate(prompt, seed)
            if image_url is None:
                image_url = await generator._generate_with_openai(prompt)

            cid = await generator._pin_to_ipfs(image_url) if image_url else None

            distractors.append({
                "image_url": image_url,
                "cid": cid,
                "prompt": prompt,
                "seed": seed,
                "index": i,
                "shared_tags": tags,
            })

        # Step 4: Verify inter-similarity if CLIP is available
        similarity_matrix = await self._verify_similarity(
            target_image_url, distractors, min_similarity
        )

        return {
            "target_tags": tags,
            "target_description": target_description,
            "distractors": distractors,
            "num_generated": len([d for d in distractors if d["image_url"]]),
            "similarity_matrix": similarity_matrix,
            "min_similarity_threshold": min_similarity,
            "adversarial_quality": self._assess_quality(similarity_matrix, min_similarity),
            "generated_at": datetime.utcnow().isoformat(),
        }

    async def _extract_visual_tags(
        self, description: str, image_url: Optional[str] = None
    ) -> List[str]:
        """
        Extract 5 core visual tags (nouns + adjectives) from the target.
        These tags will be shared across all distractors to prevent text-based elimination.
        """
        prompt = f"""Analyze this image/scene description and extract exactly 5 core visual elements.
These should be the most prominent nouns and adjectives that define the scene.

Description: "{description}"

Return ONLY a JSON array of 5 strings, each being a visual tag (noun or adjective).
Example: ["mountain", "snow-covered", "lake", "pine trees", "sunset"]

The tags should be:
- Visually specific (not abstract concepts)
- The most defining elements of the scene
- A mix of objects (nouns) and qualities (adjectives)

JSON array only:"""

        response = await self.llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
            temperature=0.3
        )

        try:
            content = response["content"].strip()
            if content.startswith("```"):
                content = content.replace("```json\n", "").replace("```", "").strip()
            tags = json.loads(content)
            if isinstance(tags, list) and len(tags) >= 5:
                return tags[:5]
            return tags if isinstance(tags, list) else ["scene", "natural", "colorful", "detailed", "atmospheric"]
        except (json.JSONDecodeError, KeyError):
            return ["scene", "natural", "colorful", "detailed", "atmospheric"]

    async def _generate_distractor_prompts(
        self, tags: List[str], num_distractors: int
    ) -> List[str]:
        """
        Generate distractor prompts that use ALL the same visual tags
        but vary composition, lighting, and specific subjects.
        """
        tags_str = ", ".join(tags)

        prompt = f"""Generate {num_distractors} image prompts that ALL contain these visual elements: {tags_str}

Each prompt must:
1. Include ALL five visual elements listed above
2. Vary the composition (different arrangement, perspective, framing)
3. Vary the lighting style (dawn, midday, dusk, artificial, dramatic)
4. Use different specific species/objects while keeping the same categories
5. Be distinct scenes that would look different but share the same text description tags

The goal is that a text description of any of these images would match ALL the same tags,
making it impossible to distinguish them by description alone.

Return as a JSON array of {num_distractors} prompt strings.
Each prompt should be 1-2 sentences, detailed and suitable for image generation.

JSON array only:"""

        response = await self.llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model=self.model,
            temperature=0.8
        )

        try:
            content = response["content"].strip()
            if content.startswith("```"):
                content = content.replace("```json\n", "").replace("```", "").strip()
            prompts = json.loads(content)
            if isinstance(prompts, list):
                return [f"{p}, photorealistic, high detail, 8k" for p in prompts[:num_distractors]]
        except (json.JSONDecodeError, KeyError):
            pass

        # Fallback: generate basic variations
        fallback_prompts = []
        for i in range(num_distractors):
            variations = ["dawn lighting, wide angle", "sunset, close-up perspective", "dramatic storm lighting, aerial view"]
            fallback_prompts.append(
                f"A scene featuring {tags_str}, {variations[i % len(variations)]}, photorealistic, high detail"
            )
        return fallback_prompts

    async def _verify_similarity(
        self,
        target_image_url: Optional[str],
        distractors: List[Dict[str, Any]],
        min_similarity: float
    ) -> Optional[Dict[str, Any]]:
        """Verify inter-similarity between target and all distractors using CLIP"""
        try:
            from agents.psi_score_ai import CLIP_AVAILABLE, PsiScoreAI

            if not CLIP_AVAILABLE or not target_image_url:
                return None

            scorer = PsiScoreAI()
            similarities = {}

            for d in distractors:
                if d.get("image_url"):
                    result = await scorer.score_image_similarity(
                        target_image_url=target_image_url,
                        choice_image_url=d["image_url"]
                    )
                    sim = result.get("target_choice_similarity", 0.0)
                    similarities[f"target_vs_distractor_{d['index']}"] = sim

            return {
                "scores": similarities,
                "mean_similarity": sum(similarities.values()) / max(len(similarities), 1),
                "all_above_threshold": all(s >= min_similarity for s in similarities.values()),
            }
        except Exception as e:
            print(f"[DistractorEngine] Similarity verification error: {e}")
            return None

    def _assess_quality(
        self, similarity_matrix: Optional[Dict], min_similarity: float
    ) -> str:
        """Assess the adversarial quality of generated distractors"""
        if similarity_matrix is None:
            return "unverified"

        mean_sim = similarity_matrix.get("mean_similarity", 0.0)
        if mean_sim >= min_similarity:
            return "excellent"
        elif mean_sim >= min_similarity * 0.8:
            return "good"
        elif mean_sim >= min_similarity * 0.6:
            return "fair"
        else:
            return "poor"
