"""
Google Gemini provider, via Google's own OpenAI-compatible endpoint, so
this reuses the same openai package pattern as every other provider here
instead of a separate SDK. Free tier, no credit card, get a key at
aistudio.google.com/apikey.

Not usable until GEMINI_API_KEY is set.
"""

import os
from openai import OpenAI

from .base import LLMProvider, CompletionRequest

BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

MODEL_BY_TIER = {
    "fast": "gemini-2.0-flash",
    "deep": "gemini-2.0-flash",
}


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str = None):
        key = api_key or os.environ.get("GEMINI_API_KEY")
        if not key:
            raise ValueError(
                "GEMINI_API_KEY is not set. Get a free key with no credit card "
                "at aistudio.google.com/apikey, then add it to your environment."
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
