"""
OpenRouter provider, gives access to several genuinely free models
(marked with a ":free" suffix) through one API key, no credit card. Sign
up at openrouter.ai/keys.

Not usable until OPENROUTER_API_KEY is set. Model availability on the
free tier shifts more than most, check openrouter.ai/models and filter
for free models before relying on the default here.
"""

import os
from openai import OpenAI

from .base import LLMProvider, CompletionRequest

BASE_URL = "https://openrouter.ai/api/v1"

# Free-tier model IDs on OpenRouter change often, this is a reasonable
# default as of when this was written, verify at openrouter.ai/models
# (filter by "free") before depending on it for a real demo.
MODEL_BY_TIER = {
    "fast": "meta-llama/llama-3.3-70b-instruct:free",
    "deep": "meta-llama/llama-3.3-70b-instruct:free",
}


class OpenRouterProvider(LLMProvider):
    def __init__(self, api_key: str = None):
        key = api_key or os.environ.get("OPENROUTER_API_KEY")
        if not key:
            raise ValueError(
                "OPENROUTER_API_KEY is not set. Get a free key with no "
                "credit card at openrouter.ai/keys, then add it to your "
                "environment."
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
