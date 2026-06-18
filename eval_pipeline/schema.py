"""
Canonical schema definitions and field name constants for the future-self career chatbot study.

DO NOT add any pre-outcome field IDs here and use them in persona construction
without going through the anti-circularity guard in persona.py.
"""

from typing import TypedDict, List, Optional, Literal

# ---------------------------------------------------------------------------
# Field ID constants — single source of truth
# ---------------------------------------------------------------------------

# Pre-survey outcome fields (FORBIDDEN in D0-D2 persona prompts)
PRE_OUTCOME_FIELDS = frozenset({
    "ios_pre",
    "fscs_similar", "fscs_connected",
    "viv_clear", "viv_tangible", "viv_detail", "viv_felt",
})

# Post-survey outcome fields (NEVER put in persona for any depth)
POST_OUTCOME_FIELDS = frozenset({
    "ios_post",
    "fscs_similar_post", "fscs_connected_post",
    "viv_clear_post", "viv_tangible_post", "viv_detail_post", "viv_felt_post",
    "mc_style", "mc_scene", "mc_understand",
    "oe_real", "oe_broke", "oe_voice", "oe_shift",
    "interview", "contact",
})

# Psychometric fields allowed from D1 upward
PSYCH_FIELDS = frozenset({
    "bfi_e1", "bfi_a1", "bfi_c1", "bfi_n1", "bfi_o1",
    "bfi_e2", "bfi_a2", "bfi_c2", "bfi_n2", "bfi_o2",
    "ria_R", "ria_I", "ria_A", "ria_S", "ria_E", "ria_C",
    "values",
})

# Demographic / career fields allowed from D0 upward
DEMO_FIELDS = frozenset({
    "age", "gender", "year",
})

CAREER_FIELDS = frozenset({
    "career", "familiarity", "interestStrength",
})

# Outcome definitions
OUTCOMES = {
    "continuity": {
        "label": "Continuity (FSCS)",
        "items": ["fscs_similar_post", "fscs_connected_post"],
        "scale": (1, 7),
        "pre_items": ["fscs_similar", "fscs_connected"],
        "observable": False,
    },
    "vividness": {
        "label": "Vividness",
        "items": ["viv_clear_post", "viv_tangible_post", "viv_detail_post", "viv_felt_post"],
        "scale": (1, 7),
        "pre_items": ["viv_clear", "viv_tangible", "viv_detail", "viv_felt"],
        "observable": False,
    },
    "closeness": {
        "label": "Closeness (IOS)",
        "items": ["ios_post"],
        "scale": (1, 7),
        "pre_items": ["ios_pre"],
        "observable": False,
    },
    "manip_checks": {
        "label": "Manipulation Checks",
        "items": ["mc_style", "mc_scene", "mc_understand"],
        "scale": (1, 7),
        "pre_items": [],
        "observable": True,
    },
    # Persuasiveness: NOT collected by the app
    # "persuasiveness": { ... }  -- slot reserved but not implemented
}

# SSR (Semantic Similarity Rating) anchor statements per scale point (1-7)
# Each outcome family shares a generic 7-point agree scale; item-specific anchors below.
ITEM_SSR_ANCHORS = {
    # FSCS items (post)
    "fscs_similar_post": {
        1: "I feel completely different from my future self; we share nothing in common.",
        2: "I feel very dissimilar to my future self.",
        3: "I feel somewhat different from my future self.",
        4: "I feel neither similar nor different to my future self.",
        5: "I feel somewhat similar to my future self.",
        6: "I feel very similar to my future self.",
        7: "I feel completely similar to my future self; we are basically the same person.",
    },
    "fscs_connected_post": {
        1: "I feel no connection whatsoever to my future self.",
        2: "I feel very little connection to my future self.",
        3: "I feel a slight connection to my future self.",
        4: "I feel a moderate connection to my future self.",
        5: "I feel a fairly strong connection to my future self.",
        6: "I feel a very strong connection to my future self.",
        7: "I feel completely connected to my future self.",
    },
    # Vividness items (post)
    "viv_clear_post": {
        1: "I cannot picture my future self at all; the image is entirely blank.",
        2: "My future self is very blurry and unclear.",
        3: "My future self is somewhat unclear.",
        4: "I have a moderate picture of my future self.",
        5: "I can picture my future self fairly clearly.",
        6: "I can picture my future self very clearly.",
        7: "I have an extremely vivid and clear picture of my future self.",
    },
    "viv_tangible_post": {
        1: "My future self feels completely abstract and unreal.",
        2: "My future self feels very abstract.",
        3: "My future self feels somewhat abstract.",
        4: "My future self feels moderately real.",
        5: "My future self feels fairly tangible and real.",
        6: "My future self feels very tangible and real.",
        7: "My future self feels completely tangible and real, like a real person.",
    },
    "viv_detail_post": {
        1: "I cannot imagine any details of my future self's daily life.",
        2: "I can imagine very few details of my future self's daily life.",
        3: "I can imagine a few details of my future self's daily life.",
        4: "I can imagine some details of my future self's daily life.",
        5: "I can imagine quite a few details of my future self's daily life.",
        6: "I can imagine many specific details of my future self's daily life.",
        7: "I can imagine extremely specific and rich details of my future self's daily life.",
    },
    "viv_felt_post": {
        1: "I have no sense of what it would feel like to be my future self.",
        2: "I have very little sense of what it would feel like to be my future self.",
        3: "I have a slight sense of what it would feel like to be my future self.",
        4: "I have a moderate sense of what it would feel like to be my future self.",
        5: "I have a fairly good sense of what it would feel like to be my future self.",
        6: "I have a very good sense of what it would feel like to be my future self.",
        7: "I can vividly imagine exactly what it would feel like to be my future self.",
    },
    # IOS (post)
    "ios_post": {
        1: "I feel completely separate from my future self; there is no overlap between us.",
        2: "I feel very separate from my future self.",
        3: "I feel slightly separate from my future self.",
        4: "I feel partly overlapping with my future self.",
        5: "I feel fairly overlapping with my future self.",
        6: "I feel very overlapping with my future self.",
        7: "I feel completely merged and overlapping with my future self.",
    },
    # Manipulation checks
    "mc_style": {
        1: "The chatbot's communication style felt completely generic and impersonal.",
        2: "The chatbot's style felt mostly generic.",
        3: "The chatbot's style was slightly personalised.",
        4: "The chatbot's style was moderately personalised.",
        5: "The chatbot's style felt fairly personalised to me.",
        6: "The chatbot's style felt very personalised to me.",
        7: "The chatbot's communication style felt completely personalised and tailored to me.",
    },
    "mc_scene": {
        1: "The scenario depicted by the chatbot felt completely unrealistic for me.",
        2: "The scenario felt mostly unrealistic.",
        3: "The scenario felt slightly realistic.",
        4: "The scenario felt moderately realistic.",
        5: "The scenario felt fairly realistic for my situation.",
        6: "The scenario felt very realistic.",
        7: "The scenario felt completely realistic and plausible for my future.",
    },
    "mc_understand": {
        1: "The chatbot showed no understanding of me whatsoever.",
        2: "The chatbot showed very little understanding of me.",
        3: "The chatbot showed slight understanding of me.",
        4: "The chatbot showed moderate understanding of me.",
        5: "The chatbot showed fairly good understanding of me.",
        6: "The chatbot showed very good understanding of me.",
        7: "The chatbot showed complete and deep understanding of who I am.",
    },
}

# Persona depth levels
DEPTH_LEVELS = ["D0", "D1", "D2", "D3"]
DEPTH_LABELS = {
    "D0": "Demographics only",
    "D1": "D0 + psychometrics + career",
    "D2": "D1 + own words (phaseB turns)",
    "D3": "D2 + pre-outcome scores (LEAKAGE PROBE)",
}

PROMPT_STRUCTURES = ["structured", "narrative", "interview"]
