"""
scoring.py — survey scoring for the Future-Self chatbot study.

Every score here mirrors the *deployed* artifact's analysis module
(`lib/results_routes.py` in the study platform) exactly, so the figures and
tables reproduced from this package match what the running application would
compute. Item keys and scale directions are documented inline.

Construct map (final instrument, §4.2 / §5.1 of the thesis)
-----------------------------------------------------------
  Mediators
    closeness   : single pictorial IOS item        (ios_pre / ios_post)        1-7
    vividness   : mean of 4 vividness items                                     1-7
    continuity  : mean of the 2-item pictorial FSCS (similarity+connectedness)  1-7
  Distal career outcomes (CIP-Short, scored FORWARD, no reverse-keying)
    cip_anxiety    : mean of 3 commitment-anxiety items  (career indecision)    1-6
    cip_confidence : mean of 3 confidence items          (career self-efficacy) 1-6
  Manipulation checks (post only)                                               1-7
    mc_style, mc_scene, mc_understand
"""
from __future__ import annotations
from statistics import mean as _mean

# ---- item keys (mirror lib/results_routes.js) ------------------------------
VIV_PRE = ["viv_clear", "viv_tangible", "viv_detail", "viv_felt"]
VIV_POST = [k + "_post" for k in VIV_PRE]
FSCS_PRE = ["fscs_similar", "fscs_connected"]
FSCS_POST = [k + "_post" for k in FSCS_PRE]
CIP_ANX_PRE = ["cip_ca_1", "cip_ca_2", "cip_ca_3"]
CIP_ANX_POST = [k + "_post" for k in CIP_ANX_PRE]
CIP_CONF_PRE = ["cip_cf_1", "cip_cf_2", "cip_cf_3"]
CIP_CONF_POST = [k + "_post" for k in CIP_CONF_PRE]
MANIP = ["mc_style", "mc_scene", "mc_understand"]

# Final-instrument signature: a run is "on the final instrument" iff it carries
# the 3+3 CIP-Short outcome block at both pre and post (the June revision).
FINAL_PRE_KEYS = CIP_ANX_PRE + CIP_CONF_PRE
FINAL_POST_KEYS = CIP_ANX_POST + CIP_CONF_POST

# TIPI (Gosling et al., 2003) — for sample description only. reversed = 8 - raw;
# trait = mean of its two items, native 1-7 scale. Mirrors lib/prompt.js.
TIPI_KEY = {
    "E": [(1, False), (6, True)], "A": [(2, True), (7, False)],
    "C": [(3, False), (8, True)], "ES": [(4, True), (9, False)],
    "O": [(5, False), (10, True)],
}


def _num(x):
    try:
        f = float(x)
        return f if f == f else None  # reject NaN
    except (TypeError, ValueError):
        return None


def _scale_mean(resp, ids):
    """Mean of the present numeric items in a scale (None if all missing)."""
    vals = [v for v in (_num(resp.get(i)) for i in ids) if v is not None]
    return _mean(vals) if vals else None


def outcomes_pre(study):
    p = study.get("preSurvey") or {}
    return {
        "vividness": _scale_mean(p, VIV_PRE),
        "closeness": _num(p.get("ios_pre")),
        "continuity": _scale_mean(p, FSCS_PRE),
        "cip_anxiety": _scale_mean(p, CIP_ANX_PRE),
        "cip_confidence": _scale_mean(p, CIP_CONF_PRE),
    }


def outcomes_post(study):
    p = study.get("postSurvey") or {}
    return {
        "vividness": _scale_mean(p, VIV_POST),
        "closeness": _num(p.get("ios_post")),
        "continuity": _scale_mean(p, FSCS_POST),
        "cip_anxiety": _scale_mean(p, CIP_ANX_POST),
        "cip_confidence": _scale_mean(p, CIP_CONF_POST),
    }


def manip_checks(study):
    p = study.get("postSurvey") or {}
    return {m: _num(p.get(m)) for m in MANIP}


def tipi_traits(study):
    resp = study.get("preSurvey") or {}
    out = {}
    for trait, items in TIPI_KEY.items():
        vals = []
        for n, rev in items:
            v = _num(resp.get(f"tipi_{n}"))
            if v is not None:
                vals.append(8 - v if rev else v)
        if len(vals) == 2:
            out[trait] = sum(vals) / 2
    return out


def has_final_instrument(study):
    p = study.get("preSurvey") or {}
    q = study.get("postSurvey") or {}
    return (all(k in p and _num(p.get(k)) is not None for k in FINAL_PRE_KEYS)
            and all(k in q and _num(q.get(k)) is not None for k in FINAL_POST_KEYS))


def phase_c_user_turns(study):
    t = (study.get("phaseC") or {}).get("transcript") or []
    return sum(1 for m in t if (m or {}).get("role") == "user")
