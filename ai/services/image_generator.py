"""
AI Image Generation Service
Generates unique target and distractor images using Replicate (Stable Diffusion) or OpenAI DALL-E.
"""

import os
import hashlib
import random
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx

# Target image categories for generation prompts
TARGET_CATEGORIES = [
    "natural_landscape",
    "architectural_structure",
    "underwater_scene",
    "aerial_view",
    "abstract_pattern",
    "wildlife_scene",
    "urban_environment",
    "celestial_phenomenon",
]

CATEGORY_PROMPTS = {
    "natural_landscape": [
        "A serene mountain valley with a winding river and wildflowers",
        "A misty forest with sunlight filtering through ancient trees",
        "A volcanic island coastline with black sand and turquoise water",
        "A frozen tundra with aurora borealis in the night sky",
    ],
    "architectural_structure": [
        "A futuristic glass bridge connecting two skyscrapers at sunset",
        "An ancient temple overgrown with tropical vegetation",
        "A spiral lighthouse on a rocky cliff during a storm",
        "A floating market with colorful wooden boats and lanterns",
    ],
    "underwater_scene": [
        "A vibrant coral reef with schools of tropical fish",
        "A deep ocean trench with bioluminescent creatures",
        "A sunken shipwreck covered in sea anemones",
        "An underwater cave with crystal-clear blue light",
    ],
    "aerial_view": [
        "A patchwork of rice terraces on mountainsides from above",
        "A desert with geometric salt flats and a lone oasis",
        "A winding river delta meeting the ocean from high altitude",
        "A dense city grid transitioning into farmland",
    ],
    "abstract_pattern": [
        "Fractal patterns in ice crystals under magnification",
        "Swirling marble textures in vivid blue and gold",
        "Geometric tessellation patterns in stained glass",
        "Organic flowing shapes resembling neural networks",
    ],
    "wildlife_scene": [
        "A family of elephants at a watering hole at golden hour",
        "A snow leopard on a Himalayan cliff edge",
        "Flamingos reflected in a still pink-tinted lake",
        "A pod of dolphins leaping through ocean waves",
    ],
    "urban_environment": [
        "A rain-soaked neon-lit street in a cyberpunk city",
        "A quiet European alley with flower-covered balconies",
        "A bustling night market with steam and warm lights",
        "A rooftop garden overlooking a metropolitan skyline",
    ],
    "celestial_phenomenon": [
        "A binary star system with a planet in the foreground",
        "A nebula with vivid colors and distant star clusters",
        "A solar eclipse seen from a mountaintop",
        "A meteor shower over a calm lake at midnight",
    ],
}


class ImageGenerator:
    """Generates AI images for psi experiment targets using Replicate API"""

    def __init__(self):
        self.replicate_token = os.environ.get("REPLICATE_API_TOKEN")
        self.openai_key = os.environ.get("OPENAI_API_KEY")
        self.ipfs_gateway = os.environ.get("IPFS_GATEWAY", "https://gateway.pinata.cloud")
        self.pinata_jwt = os.environ.get("PINATA_JWT")

    async def generate_target(
        self,
        seed: Optional[int] = None,
        style: str = "photorealistic",
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a unique target image.

        Args:
            seed: Random seed for reproducibility
            style: Image style (photorealistic, artistic, abstract)
            category: Target category (uses random if None)

        Returns:
            Dict with image URL, CID, prompt used, and metadata
        """
        if seed is None:
            seed = random.randint(0, 2**32 - 1)

        rng = random.Random(seed)

        if category is None or category not in TARGET_CATEGORIES:
            category = rng.choice(TARGET_CATEGORIES)

        prompts = CATEGORY_PROMPTS[category]
        base_prompt = rng.choice(prompts)

        style_suffix = {
            "photorealistic": ", photorealistic, high detail, 8k resolution",
            "artistic": ", oil painting style, vivid colors, artistic interpretation",
            "abstract": ", abstract interpretation, geometric shapes, surreal composition",
        }.get(style, ", photorealistic, high detail")

        full_prompt = base_prompt + style_suffix

        image_url = await self._generate_with_replicate(full_prompt, seed)

        if image_url is None:
            image_url = await self._generate_with_openai(full_prompt)

        if image_url is None:
            return {
                "error": "Image generation failed. Check API keys.",
                "prompt": full_prompt,
                "seed": seed,
                "category": category,
            }

        cid = await self._pin_to_ipfs(image_url)

        return {
            "image_url": image_url,
            "cid": cid,
            "prompt": full_prompt,
            "seed": seed,
            "category": category,
            "style": style,
            "generated_at": datetime.utcnow().isoformat(),
            "commitment_hash": hashlib.sha256(
                f"{seed}:{full_prompt}:{cid or image_url}".encode()
            ).hexdigest(),
        }

    async def generate_distractors(
        self,
        target_image_url: Optional[str] = None,
        target_description: Optional[str] = None,
        num_distractors: int = 3,
        adversarial: bool = True
    ) -> Dict[str, Any]:
        """
        Generate distractor images similar to but distinct from the target.

        Args:
            target_image_url: URL of the target image
            target_description: Text description of the target
            num_distractors: Number of distractors to generate
            adversarial: If True, use semantic sieve for high similarity

        Returns:
            Dict with distractor images and metadata
        """
        if adversarial and target_description:
            from services.distractor_engine import DistractorEngine
            engine = DistractorEngine()
            return await engine.generate_adversarial_distractors(
                target_image_url=target_image_url,
                target_description=target_description,
                num_distractors=num_distractors
            )

        if not target_description:
            return {"error": "target_description is required for distractor generation"}

        distractors = []
        for i in range(num_distractors):
            variation_prompt = (
                f"A scene similar in theme to '{target_description}' but with "
                f"different composition, different specific subjects, variation {i+1}"
                f", photorealistic, high detail"
            )

            seed = random.randint(0, 2**32 - 1)
            image_url = await self._generate_with_replicate(variation_prompt, seed)
            if image_url is None:
                image_url = await self._generate_with_openai(variation_prompt)

            cid = await self._pin_to_ipfs(image_url) if image_url else None

            distractors.append({
                "image_url": image_url,
                "cid": cid,
                "prompt": variation_prompt,
                "seed": seed,
                "index": i,
            })

        return {
            "distractors": distractors,
            "target_description": target_description,
            "num_generated": len([d for d in distractors if d["image_url"]]),
            "generated_at": datetime.utcnow().isoformat(),
        }

    async def _generate_with_replicate(
        self, prompt: str, seed: int
    ) -> Optional[str]:
        """Generate image using Replicate (Stable Diffusion XL)"""
        if not self.replicate_token:
            return None

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    "https://api.replicate.com/v1/predictions",
                    headers={
                        "Authorization": f"Bearer {self.replicate_token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "version": "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                        "input": {
                            "prompt": prompt,
                            "seed": seed,
                            "width": 1024,
                            "height": 1024,
                            "num_inference_steps": 30,
                            "guidance_scale": 7.5,
                        },
                    },
                )
                response.raise_for_status()
                prediction = response.json()

                prediction_url = prediction.get("urls", {}).get("get")
                if not prediction_url:
                    return None

                for _ in range(60):
                    import asyncio
                    await asyncio.sleep(2)
                    poll_resp = await client.get(
                        prediction_url,
                        headers={"Authorization": f"Bearer {self.replicate_token}"},
                    )
                    poll_data = poll_resp.json()
                    status = poll_data.get("status")

                    if status == "succeeded":
                        output = poll_data.get("output")
                        if isinstance(output, list) and output:
                            return output[0]
                        return output
                    elif status in ("failed", "canceled"):
                        return None

                return None
        except Exception as e:
            print(f"[ImageGenerator] Replicate error: {e}")
            return None

    async def _generate_with_openai(self, prompt: str) -> Optional[str]:
        """Fallback: Generate image using OpenAI DALL-E 3"""
        if not self.openai_key:
            return None

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={
                        "Authorization": f"Bearer {self.openai_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "dall-e-3",
                        "prompt": prompt,
                        "n": 1,
                        "size": "1024x1024",
                        "quality": "standard",
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["data"][0]["url"]
        except Exception as e:
            print(f"[ImageGenerator] OpenAI DALL-E error: {e}")
            return None

    async def _pin_to_ipfs(self, image_url: Optional[str]) -> Optional[str]:
        """Pin image to IPFS via Pinata and return CID"""
        if not image_url or not self.pinata_jwt:
            return None

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                img_resp = await client.get(image_url, timeout=30.0)
                img_resp.raise_for_status()
                image_data = img_resp.content

                files = {"file": ("target.png", image_data, "image/png")}
                pin_resp = await client.post(
                    "https://api.pinata.cloud/pinning/pinFileToIPFS",
                    headers={"Authorization": f"Bearer {self.pinata_jwt}"},
                    files=files,
                )
                pin_resp.raise_for_status()
                return pin_resp.json().get("IpfsHash")
        except Exception as e:
            print(f"[ImageGenerator] IPFS pin error: {e}")
            return None
