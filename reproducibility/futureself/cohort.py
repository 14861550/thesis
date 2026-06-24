"""
cohort.py — load study records and apply the registered analysis funnel.

Data source resolution (in order), so the notebook "just runs":
  1. A live PostgreSQL database (env DATABASE_URL / DATABASE_PUBLIC_URL), read
     directly with read-only SELECTs and reconstructed to the same `study`
     object the app exports.
  2. The deployed admin export endpoint over HTTPS (env STUDY_BASE_URL +
     ADMIN_TOKEN) — the platform's own de-identified export.
  3. A bundled de-identified snapshot shipped with this package
     (data/sessions_deidentified.json) — guarantees offline reproducibility.

Analysis funnel (thesis §6.4) — reproduced exactly:
  185 logged
   ->  62-64 completed on the FINAL instrument
   ->  41 restricted to the DIRECT recommendation strategy, both arms
          (integrated = condition 'main', baseline = condition 'baseline')
   ->  37 after removing test / untracked runs   (pid IS NULL)
   ->  32 after excluding runs with < 2 role-play exchanges  (user turns < 2)
          final: 18 integrated, 14 baseline
"""
from __future__ import annotations
import json
import os
import urllib.request
from pathlib import Path

from .scoring import has_final_instrument, phase_c_user_turns

_PKG = Path(__file__).resolve().parent
_SNAPSHOT = _PKG.parent / "data" / "sessions_deidentified.json"

MIN_ROLEPLAY_TURNS = 2  # "two genuine exchanges" — the single analyst judgment (§6.4)

# Documented test / untracked exclusions (thesis §6.4: "removed test and
# untracked runs"). Three carry no participant id (pid IS NULL); the fourth is a
# researcher test run that happened to be opened on a tracked link ("Thy
# testing", pid S010). Listed by stable session id so the exclusion reproduces
# from the de-identified snapshot, where participant names are stripped.
EXCLUDED_TEST_IDS = {
    "2e49ea21-4254-410c-b528-544e8926ab6b": 'researcher test run ("andrea - test")',
    "bba8cbf4-b43a-44a4-8830-c0bbb027a94e": 'researcher test run ("thy-testing")',
    "cb070033-6958-4a89-b296-f7d41dc9cd57": 'untracked junk run (name "11", no pid)',
    "b6d2fe4a-0731-4b1b-b1aa-409a7c29506a": 'researcher test run ("Thy testing", pid S010)',
}


# --------------------------------------------------------------------------- #
# 1. data acquisition                                                         #
# --------------------------------------------------------------------------- #
def _reconstruct(row):
    """Rebuild the canonical `study` object from a DB row (mirrors sessions.js)."""
    def j(v):
        return v if isinstance(v, dict) else (json.loads(v) if v else {})
    return {
        "meta": {
            "condition": row["condition"], "rec": row.get("rec") or "direct",
            "study": row.get("study"), "pid": row.get("pid"),
            "recruiter": row.get("recruiter"), "version": row.get("version"),
            "status": row["status"], "sessionId": str(row["id"]),
            "createdAt": str(row.get("created_at")),
            "completedAt": str(row.get("completed_at")),
        },
        "profile": j(row.get("profile")), "preSurvey": j(row.get("pre_survey")),
        "scores": j(row.get("scores")), "phaseB": j(row.get("phase_b")),
        "phaseC": j(row.get("phase_c")), "postSurvey": j(row.get("post_survey")),
    }


def _load_from_db(url):
    import psycopg2
    import psycopg2.extras
    conn = psycopg2.connect(url, connect_timeout=15)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM sessions ORDER BY created_at")
        rows = cur.fetchall()
    finally:
        conn.close()
    return [_reconstruct(r) for r in rows]


def _load_from_http(base, token):
    url = base.rstrip("/") + "/api/admin/sessions/export?deidentify=1"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())


def _load_from_snapshot(path=_SNAPSHOT):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_studies(prefer=None, verbose=True):
    """Return (studies, source_label). Tries DB -> HTTP export -> snapshot."""
    order = prefer or ["db", "http", "snapshot"]
    errors = []
    for src in order:
        try:
            if src == "db":
                url = os.environ.get("DATABASE_URL") or os.environ.get("DATABASE_PUBLIC_URL")
                if not url:
                    raise RuntimeError("no DATABASE_URL / DATABASE_PUBLIC_URL in env")
                data = _load_from_db(url)
                label = "live PostgreSQL"
            elif src == "http":
                base = os.environ.get("STUDY_BASE_URL")
                token = os.environ.get("ADMIN_TOKEN")
                if not (base and token):
                    raise RuntimeError("no STUDY_BASE_URL / ADMIN_TOKEN in env")
                data = _load_from_http(base, token)
                label = "deployed admin export (de-identified)"
            else:
                data = _load_from_snapshot()
                label = "bundled de-identified snapshot"
            if verbose:
                print(f"[futureself] loaded {len(data)} records from {label}.")
            return data, label
        except Exception as e:  # noqa: BLE001 — fall through to next source
            errors.append(f"{src}: {e}")
            continue
    raise RuntimeError("could not load study data.\n  " + "\n  ".join(errors))


# --------------------------------------------------------------------------- #
# 2. the analysis funnel                                                       #
# --------------------------------------------------------------------------- #
def _arm(study):
    """integrated (main+direct) / baseline (baseline+direct) / None."""
    m = study.get("meta") or {}
    if m.get("rec") != "direct":
        return None
    if m.get("condition") == "main":
        return "integrated"
    if m.get("condition") == "baseline":
        return "baseline"
    return None


# The bundled snapshot reduces non-analysis sessions to funnel metadata only
# (no survey text / transcripts). These accessors honour those precomputed flags
# when present, and otherwise compute from the raw record — so the same funnel
# reproduces from a live DB read AND from the trimmed offline snapshot.
def _completed(s):
    return (s.get("meta") or {}).get("status") == "completed"


def _has_final(s):
    fm = s.get("_funnel")
    return fm["has_final"] if fm and "has_final" in fm else has_final_instrument(s)


def _user_turns(s):
    fm = s.get("_funnel")
    return fm["user_turns"] if fm and "user_turns" in fm else phase_c_user_turns(s)


def _tracked(s):
    fm = s.get("_funnel")
    if fm and "tracked" in fm:
        return fm["tracked"]
    m = s.get("meta") or {}
    return bool(m.get("pid")) and m.get("sessionId") not in EXCLUDED_TEST_IDS


def build_funnel(studies):
    """Apply the registered funnel; return (analysis_sample, funnel_counts)."""
    counts = {}
    counts["logged"] = len(studies)

    completed = [s for s in studies if _completed(s)]
    counts["completed"] = len(completed)

    final = [s for s in completed if _has_final(s)]
    counts["completed_final_instrument"] = len(final)

    cell = [s for s in final if _arm(s) is not None]
    counts["direct_strategy_both_arms"] = len(cell)
    counts["_cell_by_arm"] = {
        "integrated": sum(1 for s in cell if _arm(s) == "integrated"),
        "baseline": sum(1 for s in cell if _arm(s) == "baseline"),
    }

    # remove test / untracked runs. A genuine participant link carries a
    # researcher-assigned pid (K### / S###); untracked runs have pid IS NULL.
    # One further researcher test run is tracked but flagged by id (see above).
    tracked = [s for s in cell if _tracked(s)]
    counts["after_removing_test_untracked"] = len(tracked)

    # exclude runs with fewer than two role-play exchanges
    final_sample = [s for s in tracked if _user_turns(s) >= MIN_ROLEPLAY_TURNS]
    counts["final_analysis_sample"] = len(final_sample)
    counts["_final_by_arm"] = {
        "integrated": sum(1 for s in final_sample if _arm(s) == "integrated"),
        "baseline": sum(1 for s in final_sample if _arm(s) == "baseline"),
    }
    for s in final_sample:
        s["_arm"] = _arm(s)
    return final_sample, counts


def split_arms(sample):
    integrated = [s for s in sample if s["_arm"] == "integrated"]
    baseline = [s for s in sample if s["_arm"] == "baseline"]
    return integrated, baseline
