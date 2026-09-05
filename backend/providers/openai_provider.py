"""
OpenAI provider. This hackathon (Photon iMessage) has no model restriction,
unlike the Nebius track, so this is the fastest path to real reasoning
while Nebius access remains blocked.

Not usable until OPENAI_API_KEY is set. Once it is, switching
life_orchestrator.py from MockProvider to OpenAIProvider is the only
change needed, same pattern as NebiusProvider.
"""

import os
from openai import OpenAI

from .base import LLMProvider, CompletionRequest

# gpt-4o-mini for fast, everyday calls (routing, structured acknowledgments),
# gpt-4o for the Companion's open ended conversation, mirroring the
# fast/deep tier split used for Nebius.
MODEL_BY_TIER = {
    "fast": "gpt-4o-mini",
    "deep": "gpt-4o",
}


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str = None):
        key = api_key or os.environ.get("OPENAI_API_KEY")
        if not key:
            raise ValueError(
                "OPENAI_API_KEY is not set. Add it to your environment once "
                "you have a key from platform.openai.com."
            )
        self.client = OpenAI(api_key=key)

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
