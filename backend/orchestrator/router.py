"""
Natural language router. This is the piece that makes the iMessage flow
actually work: given whatever a woman types, decide which of the nine
agents are relevant, without her ever choosing one herself.

This only works well with a real reasoning provider. MockProvider's
canned replies will not parse into valid agent names, and classify() will
correctly fall back to companion in that case, that is expected, not a
bug, real classification needs OpenAIProvider or NebiusProvider active.
"""

from providers.base import CompletionRequest

AGENT_TOPICS = {
    "safety": "feeling physically unsafe, dangerous situations, unsafe travel, harassment risk in the moment",
    "health": "physical or mental health, menstrual cycle, symptoms, medical worries",
    "companion": "wanting someone to talk to, emotional support, venting with no specific request",
    "rights": "being mistreated, harassment, disputes, documenting an incident, uncomfortable messages from someone",
    "welfare": "unpaid wages, working conditions, hours worked versus what was agreed",
    "academic": "school or coursework, requirements, deadlines, studying",
    "career": "job applications, interview preparation, career questions",
    "financial": "budgeting, spending, what she can afford",
    "opportunity": "scholarships, grants, programs, opportunities she found and wants to understand",
}

ROUTER_SYSTEM_PROMPT = (
    "You are Selina's router. Given a message from a woman using the Selina "
    "support system, decide which of the following areas are relevant to "
    "what she is describing. A message can involve more than one area. "
    "Only include an area if it is clearly relevant, do not guess. "
    "Reply with nothing but a comma separated list of area names from this "
    "exact set: " + ", ".join(AGENT_TOPICS.keys()) + ". "
    "If none clearly apply, reply with exactly: companion."
)


def classify(provider, text: str) -> list:
    """Return the list of agent names relevant to this message, always at
    least one. Falls back to companion if the provider's reply does not
    parse into any known agent name."""
    request = CompletionRequest(
        system_prompt=ROUTER_SYSTEM_PROMPT,
        user_prompt=text,
        tier="fast",
    )
    raw = provider.complete(request)
    candidates = [c.strip().lower() for c in raw.split(",")]
    valid = [c for c in candidates if c in AGENT_TOPICS]
    return valid or ["companion"]
