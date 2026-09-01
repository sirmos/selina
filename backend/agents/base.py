"""
Base class every specialist agent extends. An agent's job is to turn an
event into a next action, using the provider for reasoning where needed
and the timeline store for anything that should be remembered.
"""

from abc import ABC, abstractmethod

from providers.base import LLMProvider
from memory.timeline_store import TimelineStore


class Agent(ABC):
    name: str = "base"

    def __init__(self, provider: LLMProvider, timeline: TimelineStore):
        self.provider = provider
        self.timeline = timeline

    @abstractmethod
    def handle(self, event: dict) -> dict:
        """Take an incoming event, return a next action as a dict with at
        least an "action" key. Agents should log anything worth remembering
        to self.timeline before returning."""
        raise NotImplementedError
