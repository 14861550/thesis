"""
Synthetic session data generator.

Generates N sessions in the canonical app JSON schema from a known latent process
so that:
  (a) deeper persona depth (D0→D2) → higher agreement with actual post ratings
  (b) transcript-observable outcomes (manip checks) predicted better than felt outcomes
  (c) Δ-correlation recoverable but weaker than level-correlation
  (d) D3 leakage probe shows inflated level-agreement with ~0 incremental transcript signal

Seeds everything for reproducibility.
"""

import json
import random
import math
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np


# ---------------------------------------------------------------------------
# Latent process constants
# ---------------------------------------------------------------------------

GENDERS = ["male", "female", "non-binary"]
YEARS = ["1st", "2nd", "3rd", "4th"]
CAREERS = [
    "Financial Analyst", "Management Consultant", "Data Scientist",
    "Entrepreneur", "Policy Advisor", "Investment Banker",
    "Marketing Manager", "Sustainability Officer", "HR Manager", "Researcher",
]
VALUES_POOL = [
    "achievement", "creativity", "security", "autonomy", "helping others",
    "wealth", "recognition", "balance", "challenge", "leadership",
    "integrity", "adventure", "community", "family", "growth",
]

FIRST_NAMES = [
    "Alex", "Jordan", "Sam", "Casey", "Morgan", "Riley", "Taylor", "Jamie",
    "Robin", "Drew", "Quinn", "Avery", "Blake", "Charlie", "Dana",
    "Emerson", "Finley", "Greer", "Harper", "Indira",
]

PHASE_B_TEMPLATES = [
    "I am really interested in {career} because I value {v1} and {v2}. I can see myself working in that field.",
    "Honestly I'm not sure yet, but {career} appeals to me because of the {v1} aspect.",
    "My dream is to work as a {career}. I think it aligns with my strengths in terms of {v1}.",
    "I chose {career} because I care deeply about {v1} and want to make an impact.",
    "I'm fascinated by {career}. It combines my interest in {v1} with opportunities for {v2}.",
]

PHASE_C_TEMPLATES_LOW = [
    "This was interesting but I'm not sure it was me.",
    "The session felt a bit generic.",
    "I appreciated the conversation but didn't feel a strong connection.",
]
PHASE_C_TEMPLATES_HIGH = [
    "I really felt like I was talking to a version of myself. Very insightful!",
    "The future self character really understood my values and goals. I feel more connected now.",
    "Incredible experience — I felt like the chatbot truly knew me and my aspirations.",
]

BOT_TURNS = [
    "As your future self 10 years from now, I can tell you that the path was worth it.",
    "Looking back from the future, I remember how uncertain you felt — but your strengths carried you through.",
    "Your passion for {career} really shaped who I became. The {v1} you care about is central to our work now.",
]


def _clip_scale(val: float, lo: float = 1.0, hi: float = 7.0) -> float:
    return float(np.clip(val, lo, hi))


def _round_likert(val: float, lo: int = 1, hi: int = 7) -> int:
    return int(np.clip(round(val), lo, hi))


def _clip5(val: float) -> float:
    return _clip_scale(val, 1.0, 5.0)


def _round5(val: float) -> int:
    return _round_likert(val, 1, 5)


class SyntheticGenerator:
    """
    Generates synthetic sessions with planted latent truth.

    Latent model per participant:
      trait_vector  : [O, C, E, A, N] in [1,5]
      riasec_vector : [R, I, A, S, E, C] in [1,5]
      convo_quality : scalar in [0,1] encoding how good phaseC felt
                      (planted in transcript text + drives manip-check signal)
      pre_outcomes  : [continuity_pre, vividness_pre, closeness_pre] in [1,7]
      true_post     : derived from pre_outcomes + convo_quality + noise

    FakeLLM knows:
      D0: only demographics → uses base + large noise
      D1: + psych → uses psych signal + medium noise
      D2: + own words → uses psych + transcript quality signal + small noise
      D3: + pre-outcomes → uses pre directly → inflated correlation, no new info
    """

    def __init__(self, n: int = 24, seed: int = 42):
        self.n = n
        self.seed = seed
        self.rng = np.random.default_rng(seed)
        random.seed(seed)

    def generate(self) -> List[Dict[str, Any]]:
        sessions = []
        for i in range(self.n):
            sessions.append(self._generate_one(i))
        return sessions

    def _generate_one(self, idx: int) -> Dict[str, Any]:
        rng = self.rng
        pid = f"synth_{idx:03d}"

        # --- Latent traits ---
        traits = rng.normal(3.0, 0.8, size=5).clip(1, 5)
        O, C, E, A, N = traits
        riasec = rng.normal(3.0, 0.8, size=6).clip(1, 5)
        R_s, I_s, A_s, S_s, E_s, C_s = riasec

        # Conversation quality [0,1] — planted signal for manip checks & post outcomes
        convo_quality = float(rng.beta(2.5, 2.5))

        # Career
        career = random.choice(CAREERS)
        familiarity = int(rng.integers(1, 8))
        interest = int(rng.integers(1, 8))

        # Values (2-4 randomly)
        n_vals = int(rng.integers(2, 5))
        values = random.sample(VALUES_POOL, n_vals)

        # Demographics
        age = int(rng.integers(18, 26))
        gender = random.choice(GENDERS)
        year = random.choice(YEARS)
        name = FIRST_NAMES[idx % len(FIRST_NAMES)]
        color = f"#{rng.integers(0, 0xFFFFFF):06x}"

        # --- Pre-outcomes ---
        # Plausibly derived from traits + noise
        cont_pre = _clip_scale(3.5 + 0.4 * (A - 3) + 0.3 * (O - 3) + rng.normal(0, 0.6))
        viv_pre = _clip_scale(3.5 + 0.4 * (O - 3) + 0.2 * (E - 3) + rng.normal(0, 0.6))
        ios_pre = _clip_scale(3.5 + 0.3 * (A - 3) + rng.normal(0, 0.8))

        # Decompose pre into items
        fscs_similar = _clip_scale(cont_pre + rng.normal(0, 0.3))
        fscs_connected = _clip_scale(cont_pre + rng.normal(0, 0.3))

        viv_clear = _clip_scale(viv_pre + rng.normal(0, 0.3))
        viv_tangible = _clip_scale(viv_pre + rng.normal(0, 0.3))
        viv_detail = _clip_scale(viv_pre + rng.normal(0, 0.3))
        viv_felt = _clip_scale(viv_pre + rng.normal(0, 0.3))

        # --- True post-outcomes ---
        # Continuity post: pre + convo effect + noise
        convo_effect_felt = 0.6 * (convo_quality - 0.5)  # ~[-0.3, 0.3]
        cont_post = _clip_scale(cont_pre + convo_effect_felt + rng.normal(0, 0.4))
        viv_post = _clip_scale(viv_pre + convo_effect_felt + rng.normal(0, 0.4))
        ios_post = _clip_scale(ios_pre + convo_effect_felt + rng.normal(0, 0.5))

        # Manip checks: more directly driven by convo_quality (transcript-observable)
        mc_base = 1.0 + 6.0 * convo_quality  # [1,7]
        mc_style_val = _clip_scale(mc_base + rng.normal(0, 0.4))
        mc_scene_val = _clip_scale(mc_base + rng.normal(0, 0.4))
        mc_understand_val = _clip_scale(mc_base + rng.normal(0, 0.4))

        # Post item decomposition
        fscs_similar_post = _clip_scale(cont_post + rng.normal(0, 0.3))
        fscs_connected_post = _clip_scale(cont_post + rng.normal(0, 0.3))
        viv_clear_post = _clip_scale(viv_post + rng.normal(0, 0.3))
        viv_tangible_post = _clip_scale(viv_post + rng.normal(0, 0.3))
        viv_detail_post = _clip_scale(viv_post + rng.normal(0, 0.3))
        viv_felt_post = _clip_scale(viv_post + rng.normal(0, 0.3))

        # --- BFI items (2 items per factor, ~noise around latent trait) ---
        bfi_e1 = _round5(E + rng.normal(0, 0.4))
        bfi_e2 = _round5(E + rng.normal(0, 0.4))
        bfi_a1 = _round5(A + rng.normal(0, 0.4))
        bfi_a2 = _round5(A + rng.normal(0, 0.4))
        bfi_c1 = _round5(C + rng.normal(0, 0.4))
        bfi_c2 = _round5(C + rng.normal(0, 0.4))
        bfi_n1 = _round5(N + rng.normal(0, 0.4))
        bfi_n2 = _round5(N + rng.normal(0, 0.4))
        bfi_o1 = _round5(O + rng.normal(0, 0.4))
        bfi_o2 = _round5(O + rng.normal(0, 0.4))

        # RIASEC items
        ria_R = _round5(R_s)
        ria_I = _round5(I_s)
        ria_A_val = _round5(A_s)
        ria_S = _round5(S_s)
        ria_E_val = _round5(E_s)
        ria_C_val = _round5(C_s)

        # --- Transcripts ---
        v1, v2 = values[0], values[1] if len(values) > 1 else values[0]
        phase_b_text = random.choice(PHASE_B_TEMPLATES).format(career=career, v1=v1, v2=v2)
        phase_b_bot = random.choice(BOT_TURNS).format(career=career, v1=v1, v2=v2)

        # Phase C: quality determines which template and how many turns
        if convo_quality > 0.6:
            c_user_texts = [random.choice(PHASE_C_TEMPLATES_HIGH) for _ in range(3)]
        elif convo_quality < 0.4:
            c_user_texts = [random.choice(PHASE_C_TEMPLATES_LOW) for _ in range(2)]
        else:
            c_user_texts = [random.choice(PHASE_C_TEMPLATES_LOW),
                            random.choice(PHASE_C_TEMPLATES_HIGH)]

        # Embed convo_quality in phaseC user text so D2 can read it
        quality_word = "very engaging" if convo_quality > 0.6 else ("somewhat engaging" if convo_quality > 0.4 else "not very engaging")
        c_user_texts.append(f"Overall I found this session {quality_word}.")

        phase_c_transcript = []
        for txt in c_user_texts:
            phase_c_transcript.append({"role": "user", "text": txt})
            phase_c_transcript.append({"role": "assistant", "text": "Thank you for sharing that."})

        phase_b_transcript = [
            {"role": "user", "text": phase_b_text},
            {"role": "assistant", "text": phase_b_bot},
        ]

        # --- OE fields (open-ended, strings) ---
        oe_real = "yes" if convo_quality > 0.5 else "somewhat"
        oe_broke = "no" if convo_quality > 0.4 else "a little"
        oe_voice = "authentic" if convo_quality > 0.6 else "generic"
        oe_shift = "yes, I feel more motivated" if convo_quality > 0.6 else "not really"

        # Store latent truth for tests / FakeLLM
        latent = {
            "convo_quality": convo_quality,
            "cont_pre": float(cont_pre),
            "viv_pre": float(viv_pre),
            "ios_pre": float(ios_pre),
            "cont_post": float(cont_post),
            "viv_post": float(viv_post),
            "ios_post_true": float(ios_post),
            "mc_true": float(mc_base),
            "traits": traits.tolist(),
            "riasec": riasec.tolist(),
        }

        session = {
            "_latent": latent,  # not part of canonical schema; stripped when saving
            "meta": {
                "condition": "main" if idx % 4 != 0 else "baseline",
                "version": "1.0.0",
                "completedAt": f"2025-0{(idx % 9) + 1}-{(idx % 28) + 1:02d}T12:00:00Z",
            },
            "profile": {"name": name, "color": color},
            "preSurvey": {
                "age": age,
                "gender": gender,
                "year": year,
                "bfi_e1": bfi_e1, "bfi_a1": bfi_a1, "bfi_c1": bfi_c1,
                "bfi_n1": bfi_n1, "bfi_o1": bfi_o1,
                "bfi_e2": bfi_e2, "bfi_a2": bfi_a2, "bfi_c2": bfi_c2,
                "bfi_n2": bfi_n2, "bfi_o2": bfi_o2,
                "values": values,
                "ria_R": ria_R, "ria_I": ria_I, "ria_A": ria_A_val,
                "ria_S": ria_S, "ria_E": ria_E_val, "ria_C": ria_C_val,
                "ios_pre": float(round(ios_pre, 1)),
                "fscs_similar": float(round(fscs_similar, 1)),
                "fscs_connected": float(round(fscs_connected, 1)),
                "viv_clear": float(round(viv_clear, 1)),
                "viv_tangible": float(round(viv_tangible, 1)),
                "viv_detail": float(round(viv_detail, 1)),
                "viv_felt": float(round(viv_felt, 1)),
            },
            "scores": {
                "bigFive": {
                    "O": float(round(float(O), 2)),
                    "C": float(round(float(C), 2)),
                    "E": float(round(float(E), 2)),
                    "A": float(round(float(A), 2)),
                    "N": float(round(float(N), 2)),
                },
                "riasec": {
                    "R": float(round(float(R_s), 2)),
                    "I": float(round(float(I_s), 2)),
                    "A": float(round(float(A_s), 2)),
                    "S": float(round(float(S_s), 2)),
                    "E": float(round(float(E_s), 2)),
                    "C": float(round(float(C_s), 2)),
                },
                "values": values,
            },
            "phaseB": {
                "career": career,
                "familiarity": familiarity,
                "interestStrength": interest,
                "transcript": phase_b_transcript,
            },
            "phaseC": {
                "transcript": phase_c_transcript,
                "durationSec": int(600 + 1200 * convo_quality),
                "turnCount": len(phase_c_transcript),
            },
            "postSurvey": {
                "ios_post": float(round(ios_post, 1)),
                "fscs_similar_post": float(round(fscs_similar_post, 1)),
                "fscs_connected_post": float(round(fscs_connected_post, 1)),
                "viv_clear_post": float(round(viv_clear_post, 1)),
                "viv_tangible_post": float(round(viv_tangible_post, 1)),
                "viv_detail_post": float(round(viv_detail_post, 1)),
                "viv_felt_post": float(round(viv_felt_post, 1)),
                "mc_style": float(round(mc_style_val, 1)),
                "mc_scene": float(round(mc_scene_val, 1)),
                "mc_understand": float(round(mc_understand_val, 1)),
                "oe_real": oe_real,
                "oe_broke": oe_broke,
                "oe_voice": oe_voice,
                "oe_shift": oe_shift,
                "interview": "yes" if convo_quality > 0.7 else "no",
                "contact": "yes" if convo_quality > 0.8 else "no",
            },
        }
        return session


def save_synthetic_sessions(sessions: List[Dict[str, Any]], out_dir: str) -> List[str]:
    """Save sessions to out_dir as JSON files. Strips _latent key from saved files."""
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    paths = []
    for sess in sessions:
        sid = sess.get("meta", {}).get("completedAt", "unknown")
        pid = sess.get("profile", {}).get("name", "p")
        # Build saveable version without latent
        saveable = {k: v for k, v in sess.items() if k != "_latent"}
        fname = f"synth_{pid}_{sid[:10].replace('-','')}.json"
        fpath = os.path.join(out_dir, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(saveable, f, indent=2)
        paths.append(fpath)
    return paths
