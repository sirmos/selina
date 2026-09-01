"""
Nebius Token Factory provider, using their OpenAI-compatible API. Confirmed
against Nebius's own docs: base URL https://api.tokenfactory.nebius.com/v1/,
bearer auth via NEBIUS_API_KEY, standard chat.completions.create call.

Not usable yet, billing account setup for Nigeria is currently blocked on
Nebius's side. This is written and ready so switching life_orchestrator.py
from MockProvider to NebiusProvider is the only change needed once access
opens up.
"""

import os
from openai import OpenAI

from .base import LLMProvider, CompletionRequest

BASE_URL = "https://api.tokenfactory.nebius.com/v1/"

# Tier to model mapping. Nano or Super for fast, everyday calls, Ultra for
# the heavier reasoning the track description calls out. Confirm exact
# model identifiers in the Token Factory console once access is available,
# these are best current guesses based on the model family names.
MODEL_BY_TIER = {
    "fast": "nvidia/nemotron-3-super-120b-a12b",
    "deep": "nvidia/nemotron-3-ultra",
}


class NebiusProvider(LLMProvider):
    def __init__(self, api_key: str | None = None):
        key = api_key or os.environ.get("NEBIUS_API_KEY")
        if not key:
            raise ValueError(
                "NEBIUS_API_KEY is not set. Add it to your .env once "
                "Token Factory billing access is unblocked."
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
