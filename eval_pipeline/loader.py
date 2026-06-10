"""
Session JSON loader — reads app exports matching the canonical schema.
Validates structure and extracts computed outcome scores.
"""

import json
import os
import glob
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np

from eval_pipeline.schema import OUTCOMES


def _mean(vals: List[Optional[float]]) -> Optional[float]:
    """Mean of non-None values; returns None if all None."""
    valid = [v for v in vals if v is not None]
    if not valid:
        return None
    return float(np.mean(valid))


def load_session(path: str) -> Dict[str, Any]:
    """
    Load and validate a single session JSON file.

    Returns a flat dict with:
      - all raw fields preserved under their original keys
      - computed outcome scores under 'outcomes_post' and 'outcomes_pre'
      - 'session_id' set to the filename stem
    """
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    session_id = Path(path).stem
    record = {"session_id": session_id, "_raw": raw}

    # --- top-level sections ---
    meta = raw.get("meta", {})
    profile = raw.get("profile", {})
    pre = raw.get("preSurvey", {})
    scores = raw.get("scores", {})
    phase_b = raw.get("phaseB", {})
    phase_c = raw.get("phaseC", {})
    post = raw.get("postSurvey", {})

    record["meta"] = meta
    record["profile"] = profile
    record["preSurvey"] = pre
    record["scores"] = scores
    record["phaseB"] = phase_b
    record["phaseC"] = phase_c
    record["postSurvey"] = post

    # --- extract pre outcomes ---
    record["outcomes_pre"] = {
        "continuity": _mean([pre.get("fscs_similar"), pre.get("fscs_connected"), pre.get("fscs_care")]),
        "vividness": _mean([pre.get("viv_clear"), pre.get("viv_tangible"), pre.get("viv_detail"), pre.get("viv_felt")]),
        "closeness": pre.get("ios_pre"),
        "manip_checks": None,  # no pre measure
    }

    # --- extract post outcomes ---
    record["outcomes_post"] = {
        "continuity": _mean([
            post.get("fscs_similar_post"), post.get("fscs_connected_post"), post.get("fscs_care_post")
        ]),
        "vividness": _mean([
            post.get("viv_clear_post"), post.get("viv_tangible_post"),
            post.get("viv_detail_post"), post.get("viv_felt_post")
        ]),
        "closeness": post.get("ios_post"),
        "manip_checks": _mean([
            post.get("mc_style"), post.get("mc_scene"), post.get("mc_understand")
        ]),
    }

    # Persuasiveness: NOT collected by app — slot present but None
    record["outcomes_post"]["persuasiveness"] = None
    record["outcomes_pre"]["persuasiveness"] = None

    return record


def load_all_sessions(data_dir: str) -> List[Dict[str, Any]]:
    """Load all *.json files from data_dir (and data_dir/raw/)."""
    paths = []
    for pattern in [f"{data_dir}/*.json", f"{data_dir}/raw/*.json"]:
        paths.extend(glob.glob(pattern))
    paths = sorted(set(paths))
    if not paths:
        return []
    sessions = []
    for p in paths:
        try:
            sessions.append(load_session(p))
        except Exception as e:
            print(f"[loader] WARNING: skipping {p}: {e}")
    return sessions


def extract_item_scores(session: Dict[str, Any]) -> Dict[str, Optional[float]]:
    """
    Return flat dict of all individual post-survey Likert items by their field ID.
    Used by the metrics module.
    """
    post = session.get("postSurvey", {})
    items = {}
    for outcome_cfg in OUTCOMES.values():
        for item_id in outcome_cfg["items"]:
            items[item_id] = post.get(item_id)
    return items
