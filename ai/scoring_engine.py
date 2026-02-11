#!/usr/bin/env python3
"""
AI Scoring Engine for Cognosis
Scores similarity between user responses and targets using NLP and vision models
"""

import os
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Cognosis AI Scoring Service")

# Request/Response models
class ScoringRequest(BaseModel):
    target: str
    targetType: str  # 'text', 'image', 'card', 'number', 'choice', 'rng', 'physiological'
    response: str
    responseType: str  # 'text', 'card', 'number', 'choice', 'data'
    experimentType: str = None  # Optional: specific experiment type for custom scoring

class CIDScoringRequest(BaseModel):
    commitmentHash: str
    cid: str
    targetCID: str = None
    decryptionKey: str = None

class ScoringResponse(BaseModel):
    score: float
    method: str
    details: Dict[str, Any]
    scoringModuleHash: str = "scoring-v1.0.0"

# Initialize AI models
def initialize_models():
    """Initialize OpenAI and other AI models"""
    global openai_available, clip_available

    openai_available = False
    clip_available = False

    # Try to import OpenAI
    try:
        import openai
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key and api_key != 'your_openai_api_key_here':
            from openai import OpenAI
            global openai_client
            openai_client = OpenAI(api_key=api_key)
            openai_available = True
            print("✓ OpenAI API initialized")
        else:
            print("⚠ OpenAI API key not configured")
    except Exception as e:
        print(f"⚠ OpenAI initialization failed: {e}")

    # Try to import CLIP for image-text matching
    try:
        import torch
        from transformers import CLIPProcessor, CLIPModel
        global clip_model, clip_processor

        clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        clip_available = True
        print("✓ CLIP model loaded")
    except Exception as e:
        print(f"⚠ CLIP initialization failed: {e}")

# Text similarity using OpenAI embeddings
async def score_text_similarity_openai(target_text: str, response_text: str) -> Dict[str, Any]:
    """Score text similarity using OpenAI embeddings"""
    try:
        # Get embeddings for both texts
        target_embedding = openai_client.embeddings.create(
            input=target_text,
            model="text-embedding-3-small"
        )

        response_embedding = openai_client.embeddings.create(
            input=response_text,
            model="text-embedding-3-small"
        )

        # Calculate cosine similarity
        import numpy as np

        target_vec = np.array(target_embedding.data[0].embedding)
        response_vec = np.array(response_embedding.data[0].embedding)

        similarity = np.dot(target_vec, response_vec) / (
            np.linalg.norm(target_vec) * np.linalg.norm(response_vec)
        )

        # Normalize to 0-1 range
        score = (similarity + 1) / 2

        return {
            'score': float(score),
            'method': 'openai_embeddings',
            'similarity': float(similarity)
        }
    except Exception as e:
        print(f"OpenAI scoring error: {e}")
        raise

# Simple text similarity fallback using word overlap
def score_text_similarity_simple(target_text: str, response_text: str) -> Dict[str, Any]:
    """Simple text similarity using word overlap"""
    target_words = set(target_text.lower().split())
    response_words = set(response_text.lower().split())

    if not target_words or not response_words:
        return {'score': 0.0, 'method': 'simple_overlap', 'overlap_count': 0}

    overlap = target_words.intersection(response_words)
    score = len(overlap) / max(len(target_words), len(response_words))

    return {
        'score': float(score),
        'method': 'simple_overlap',
        'overlap_count': len(overlap),
        'overlap_words': list(overlap)
    }

# Exact match scoring (for cards, dice, choices)
def score_exact_match(target: str, response: str) -> Dict[str, Any]:
    """Score exact match for choices, cards, etc."""
    match = target.strip().lower() == response.strip().lower()
    return {
        'score': 1.0 if match else 0.0,
        'method': 'exact_match',
        'match': match,
        'target': target,
        'response': response
    }

# Multiple choice scoring
def score_multiple_choice(target: str, response: str, num_choices: int = 4) -> Dict[str, Any]:
    """Score multiple choice with chance correction"""
    match = target.strip().lower() == response.strip().lower()
    # Above chance scoring: (correct - 1/n) / (1 - 1/n)
    if match:
        score = 1.0
    else:
        score = 0.0

    # Calculate above-chance score
    chance_level = 1.0 / num_choices
    above_chance = (score - chance_level) / (1.0 - chance_level) if score > chance_level else 0.0

    return {
        'score': float(score),
        'above_chance_score': float(max(0, above_chance)),
        'method': 'multiple_choice',
        'match': match,
        'chance_level': chance_level,
        'num_choices': num_choices
    }

# RNG deviation scoring (chi-square test)
def score_rng_deviation(target_distribution: str, response_data: str) -> Dict[str, Any]:
    """Score RNG experiments using chi-square deviation"""
    try:
        import json
        import numpy as np
        from scipy import stats

        # Parse response data (expected to be JSON with trial results)
        data = json.loads(response_data)
        trials = data.get('trials', [])
        target_value = data.get('target', None)  # e.g., "high" or "low"

        if not trials:
            return {'score': 0.0, 'method': 'rng_deviation', 'error': 'No trials data'}

        # Calculate observed frequencies
        observed = np.array(trials)
        expected_mean = 0.5  # For binary RNG

        # Calculate z-score
        n = len(trials)
        observed_mean = np.mean(observed)
        expected_std = np.sqrt(expected_mean * (1 - expected_mean) / n)

        z_score = (observed_mean - expected_mean) / expected_std if expected_std > 0 else 0

        # Calculate p-value
        p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))  # Two-tailed

        # Convert to score (0-1 range, with 0.5 = chance)
        # Higher deviation from chance = higher score
        score = min(1.0, abs(z_score) / 3.0)  # Normalize z-score

        return {
            'score': float(score),
            'method': 'rng_deviation',
            'z_score': float(z_score),
            'p_value': float(p_value),
            'observed_mean': float(observed_mean),
            'expected_mean': expected_mean,
            'n_trials': n,
            'significant': p_value < 0.05
        }
    except Exception as e:
        print(f"RNG scoring error: {e}")
        return {'score': 0.0, 'method': 'rng_deviation', 'error': str(e)}

# CLIP-based image-text scoring
def score_image_text_clip(image_url: str, response_text: str) -> Dict[str, Any]:
    """Score image-text similarity using CLIP"""
    try:
        import torch
        from PIL import Image
        import requests
        from io import BytesIO

        # Download image
        response = requests.get(image_url)
        image = Image.open(BytesIO(response.content))

        # Prepare inputs
        inputs = clip_processor(
            text=[response_text],
            images=image,
            return_tensors="pt",
            padding=True
        )

        # Get similarity
        outputs = clip_model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1)

        score = float(probs[0][0])

        return {
            'score': score,
            'method': 'clip',
            'confidence': score
        }
    except Exception as e:
        print(f"CLIP scoring error: {e}")
        raise

@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    initialize_models()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "PsiFieldApp AI Scoring Engine",
        "status": "running",
        "openai_available": openai_available,
        "clip_available": clip_available
    }

@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok"}

@app.post("/score", response_model=ScoringResponse)
async def score_response(request: ScoringRequest) -> ScoringResponse:
    """
    Score the similarity between target and response
    """
    try:
        # Extract target description for text-based scoring
        target_desc = request.target

        # If target is image URL, extract description from URL or use a default
        if request.targetType == 'image':
            # Extract seed/description from URL
            if 'seed/' in request.target:
                parts = request.target.split('seed/')[1].split('/')[0]
                target_desc = parts
            else:
                target_desc = "image"

        # Choose scoring method based on experiment and response types
        details = {}

        # Exact match experiments (cards, choices, etc.)
        if request.targetType in ['card', 'choice'] and request.responseType in ['card', 'choice']:
            details = score_exact_match(request.target, request.response)

        # Multiple choice with chance correction
        elif request.responseType == 'choice' and request.experimentType:
            # Extract number of choices from experiment type if available
            num_choices = 4  # default
            if 'ganzfeld' in request.experimentType.lower():
                num_choices = 4
            details = score_multiple_choice(request.target, request.response, num_choices)

        # RNG experiments
        elif request.targetType == 'rng' or request.experimentType in ['rng-focus', 'pk-rng', 'dice-influence']:
            details = score_rng_deviation(request.target, request.response)

        # Image target, text response
        elif request.targetType == 'image' and request.responseType == 'text':
            if clip_available:
                details = score_image_text_clip(request.target, request.response)
            elif openai_available:
                details = await score_text_similarity_openai(target_desc, request.response)
            else:
                details = score_text_similarity_simple(target_desc, request.response)

        # Both text (remote viewing, telepathy, etc.)
        elif request.targetType == 'text' and request.responseType == 'text':
            if openai_available:
                details = await score_text_similarity_openai(request.target, request.response)
            else:
                details = score_text_similarity_simple(request.target, request.response)

        else:
            # Fallback to simple text matching
            details = score_text_similarity_simple(target_desc, request.response)

        return ScoringResponse(
            score=details['score'],
            method=details['method'],
            details=details,
            scoringModuleHash="scoring-v1.1.0"
        )

    except Exception as e:
        print(f"Scoring error: {e}")
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")

@app.post("/score/cid", response_model=ScoringResponse)
async def score_from_cid(request: CIDScoringRequest) -> ScoringResponse:
    """
    Score similarity given IPFS CIDs for response and target
    Fetches encrypted blobs, decrypts if key provided, and scores
    """
    try:
        import requests

        # Fetch response from IPFS
        ipfs_gateway = os.getenv('IPFS_GATEWAY', 'https://ipfs.io')
        response_url = f"{ipfs_gateway}/ipfs/{request.cid}"

        response_data = requests.get(response_url, timeout=30).json()

        # Decrypt if key provided
        if request.decryptionKey:
            # TODO: Implement decryption
            # For now, assume response_data contains plaintext
            user_response = response_data.get('response', '')
        else:
            user_response = response_data.get('response', '')

        # Fetch target if CID provided
        if request.targetCID:
            target_url = f"{ipfs_gateway}/ipfs/{request.targetCID}"
            target_data = requests.get(target_url, timeout=30).json()
            target = target_data.get('data', '')
            target_type = target_data.get('type', 'text')
        else:
            # Fallback: fetch from database by commitmentHash
            target = "default target"
            target_type = "text"

        # Score using existing logic
        if target_type == 'text':
            if openai_available:
                details = await score_text_similarity_openai(target, user_response)
            else:
                details = score_text_similarity_simple(target, user_response)
        else:
            details = score_text_similarity_simple(target, user_response)

        return ScoringResponse(
            score=details['score'],
            method=details['method'] + '_cid',
            details={
                **details,
                'commitmentHash': request.commitmentHash,
                'responseCID': request.cid
            },
            scoringModuleHash="scoring-v1.0.0"
        )

    except Exception as e:
        print(f"CID scoring error: {e}")
        raise HTTPException(status_code=500, detail=f"CID scoring failed: {str(e)}")

@app.post("/score/batch")
async def score_batch(requests: list[ScoringRequest]) -> list[ScoringResponse]:
    """Score multiple responses in batch"""
    results = []
    for req in requests:
        try:
            result = await score_response(req)
            results.append(result)
        except Exception as e:
            results.append(ScoringResponse(
                score=0.0,
                method='error',
                details={'error': str(e)}
            ))
    return results

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 Starting AI Scoring Engine on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
