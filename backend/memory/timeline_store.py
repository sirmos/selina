"""
A simple in-memory timeline store. The interface is what matters here, not
the storage, swapping this for a real database later means implementing
the same three methods against something persistent.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class TimelineEntry:
    id: str
    agent: str
    kind: str
    summary: str
    data: dict = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TimelineStore:
    def __init__(self):
        self._entries: list[TimelineEntry] = []
        self._counter = 0

    def add(self, agent: str, kind: str, summary: str, data: Optional[dict] = None) -> TimelineEntry:
        self._counter += 1
        entry = TimelineEntry(
            id=f"t{self._counter}",
            agent=agent,
            kind=kind,
            summary=summary,
            data=data or {},
        )
        self._entries.append(entry)
        return entry

    def all(self) -> list[TimelineEntry]:
        return list(self._entries)

    def for_agent(self, agent: str) -> list[TimelineEntry]:
        return [e for e in self._entries if e.agent == agent]
