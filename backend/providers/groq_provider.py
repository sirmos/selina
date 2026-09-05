"""
Groq provider. No credit card required, unlike OpenAI, sign up with just
an email at console.groq.com/keys and get a key instantly. Groq's API is
OpenAI-compatible, so this reuses the openai package pointed at Groq's
base URL instead of a separate SDK.

Not usable until GROQ_API_KEY is set. Once it is, switching
life_orchestrator.py's provider to GroqProvider is the only change needed,
same pattern as NebiusProvider and OpenAIProvider.
"""

import os
from openai import OpenAI

from .base import LLMProvider, CompletionRequest

BASE_URL = "https://api.groq.com/openai/v1"

# Groq retired llama-3.1-8b-instant and llama-3.3-70b-versatile on
# August 16, 2026. Their own migration guide points to these as the
# current production replacements. Check console.groq.com/docs/models if
# this ever 404s again, their lineup changes more often than most.
MODEL_BY_TIER = {
    "fast": "openai/gpt-oss-20b",
    "deep": "openai/gpt-oss-120b",
}


class GroqProvider(LLMProvider):
    def __init__(self, api_key: str = None):
        key = api_key or os.environ.get("GROQ_API_KEY")
        if not key:
            raise ValueError(
                "GROQ_API_KEY is not set. Get a free key with no credit card "
                "at console.groq.com/keys, then add it to your environment."
            )
        self.client = OpenAI(base_url=BASE_URL, api_key=key)

    def complete(self, request: CompletionRequest) -> str:
        model = MODEL_BY_TIER.get(request.tier, MODEL_BY_TIER["fast"])
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.user_prompt},
            ],
        )
        return response.choices[0].message.content
