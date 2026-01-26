"""
LLM Provider Abstraction
Supports both OpenAI and Google Gemini APIs with a unified interface
"""

from typing import Dict, List, Any, Optional
import os
from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""

    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> Dict[str, Any]:
        """
        Generate a chat completion

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name (provider-specific)
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response

        Returns:
            Dict with 'content', 'tokens_used', and 'model'
        """
        pass

    @abstractmethod
    async def chat_completion_with_images(
        self,
        messages: List[Dict[str, str]],
        image_urls: List[str],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> Dict[str, Any]:
        """
        Generate a chat completion with image inputs (vision)

        Args:
            messages: List of message dicts with 'role' and 'content'
            image_urls: List of image URLs to include in the prompt
            model: Model name (provider-specific)
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response

        Returns:
            Dict with 'content', 'tokens_used', and 'model'
        """
        pass

    @abstractmethod
    def get_default_model(self) -> str:
        """Get the default model for this provider"""
        pass


class OpenAIProvider(LLMProvider):
    """OpenAI API provider"""

    def __init__(self, api_key: Optional[str] = None):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        self.default_model = "gpt-4o"

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> Dict[str, Any]:
        response = await self.client.chat.completions.create(
            model=model or self.default_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )

        return {
            "content": response.choices[0].message.content,
            "tokens_used": response.usage.total_tokens if response.usage else 0,
            "model": response.model
        }

    async def chat_completion_with_images(
        self,
        messages: List[Dict[str, str]],
        image_urls: List[str],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> Dict[str, Any]:
        """Generate a chat completion with image inputs using GPT-4 Vision"""
        # Build content array with text and images
        content = []

        # Add the text content from the last user message
        for msg in messages:
            if msg["role"] == "user":
                content.append({"type": "text", "text": msg["content"]})

        # Add images
        for url in image_urls:
            content.append({
                "type": "image_url",
                "image_url": {"url": url}
            })

        vision_messages = [{"role": "user", "content": content}]

        response = await self.client.chat.completions.create(
            model=model or "gpt-4o",  # Vision-capable model
            messages=vision_messages,
            temperature=temperature,
            max_tokens=max_tokens
        )

        return {
            "content": response.choices[0].message.content,
            "tokens_used": response.usage.total_tokens if response.usage else 0,
            "model": response.model
        }

    def get_default_model(self) -> str:
        return self.default_model


class GeminiProvider(LLMProvider):
    """Google Gemini API provider"""

    def __init__(self, api_key: Optional[str] = None):
        import google.generativeai as genai

        api_key = api_key or os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=api_key)
        self.genai = genai
        self.default_model = "gemini-2.0-flash"

        # Model mapping for compatibility
        self.model_map = {
            "gpt-4o": "gemini-2.0-flash",
            "gpt-4": "gemini-1.5-pro",
            "gpt-3.5-turbo": "gemini-1.5-flash",
        }

    def _convert_messages(self, messages: List[Dict[str, str]]) -> tuple:
        """Convert OpenAI-style messages to Gemini format"""
        system_instruction = None
        history = []
        current_message = None

        for msg in messages:
            role = msg["role"]
            content = msg["content"]

            if role == "system":
                system_instruction = content
            elif role == "user":
                current_message = content
                # Add to history if there's a previous exchange
                if history and history[-1]["role"] == "model":
                    history.append({"role": "user", "parts": [content]})
                elif not history:
                    # First user message - will be sent as the prompt
                    pass
                else:
                    history.append({"role": "user", "parts": [content]})
            elif role == "assistant":
                history.append({"role": "model", "parts": [content]})

        return system_instruction, history, current_message

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> Dict[str, Any]:
        # Map OpenAI model names to Gemini
        gemini_model = self.model_map.get(model, model) if model else self.default_model

        # Convert messages
        system_instruction, history, current_message = self._convert_messages(messages)

        # Configure the model
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }

        model_instance = self.genai.GenerativeModel(
            model_name=gemini_model,
            generation_config=generation_config,
            system_instruction=system_instruction
        )

        # Start chat with history
        chat = model_instance.start_chat(history=history if history else [])

        # Send the current message
        response = await chat.send_message_async(current_message or "Hello")

        # Estimate tokens (Gemini doesn't always return exact counts)
        tokens_used = 0
        if hasattr(response, 'usage_metadata'):
            tokens_used = (
                getattr(response.usage_metadata, 'prompt_token_count', 0) +
                getattr(response.usage_metadata, 'candidates_token_count', 0)
            )

        return {
            "content": response.text,
            "tokens_used": tokens_used,
            "model": gemini_model
        }

    async def chat_completion_with_images(
        self,
        messages: List[Dict[str, str]],
        image_urls: List[str],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> Dict[str, Any]:
        """Generate a chat completion with image inputs using Gemini Vision"""
        import httpx

        # Map OpenAI model names to Gemini
        gemini_model = self.model_map.get(model, model) if model else self.default_model

        # Get the text prompt
        text_content = ""
        for msg in messages:
            if msg["role"] == "user":
                text_content = msg["content"]

        # Configure the model
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }

        model_instance = self.genai.GenerativeModel(
            model_name=gemini_model,
            generation_config=generation_config
        )

        # Build content parts with images
        content_parts = [text_content]

        # Fetch and add images
        async with httpx.AsyncClient() as client:
            for url in image_urls:
                try:
                    resp = await client.get(url, timeout=30.0)
                    resp.raise_for_status()
                    content_type = resp.headers.get('content-type', 'image/jpeg')
                    # Create image part for Gemini
                    image_part = {
                        "mime_type": content_type.split(';')[0],
                        "data": resp.content
                    }
                    content_parts.append(image_part)
                except Exception as e:
                    print(f"[GeminiProvider] Error fetching image {url}: {e}")

        # Generate response with images
        response = await model_instance.generate_content_async(content_parts)

        # Get token count
        tokens_used = 0
        if hasattr(response, 'usage_metadata'):
            tokens_used = (
                getattr(response.usage_metadata, 'prompt_token_count', 0) +
                getattr(response.usage_metadata, 'candidates_token_count', 0)
            )

        return {
            "content": response.text,
            "tokens_used": tokens_used,
            "model": gemini_model
        }

    def get_default_model(self) -> str:
        return self.default_model


def get_llm_provider(provider: Optional[str] = None) -> LLMProvider:
    """
    Factory function to get the appropriate LLM provider

    Args:
        provider: Provider name ("openai" or "gemini").
                  If not specified, uses LLM_PROVIDER env var.

    Returns:
        LLMProvider instance
    """
    provider = provider or os.getenv("LLM_PROVIDER", "gemini").lower()

    if provider == "openai":
        return OpenAIProvider()
    elif provider == "gemini":
        return GeminiProvider()
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")


# Singleton instance for convenience
_default_provider: Optional[LLMProvider] = None


def get_default_provider() -> LLMProvider:
    """Get or create the default LLM provider singleton"""
    global _default_provider
    if _default_provider is None:
        _default_provider = get_llm_provider()
    return _default_provider
