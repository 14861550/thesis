#!/usr/bin/env python3
"""
analysis.py — phase-2 statistics for the human study (Build Plan §5 / §14).

Reads the researcher export (the JSON array returned by
/api/admin/sessions/export, or a saved copy) and computes the analysis plan from
Brief §4:
  * per-condition descriptives + change scores (IOS / FSCS / vividness, pre→post)
  * Cohen's d on change scores                      (pure-python, computable now)
  * Cronbach's alpha for the multi-item scales      (pure-python)
  * manipulation-check means per condition

The inferential pieces that need scipy / statsmodels (exact t-test p-values,
ANCOVA, LSM) return a labelled {"status": "not_implemented"} until those deps are
added — so this stays a faithful phase-2 scaffold, never a wrong number.

Usage:
  python analysis.py export.json
  curl -s ".../api/admin/sessions/export?token=XXXX" | python analysis.py -
"""
import json
import math
import sys
import statistics as st

FSCS_PRE = ["fscs_similar", "fscs_connected", "fscs_care"]
FSCS_POST = [i + "_post" for i in FSCS_PRE]
VIV_PRE = ["viv_clear", "viv_tangible", "viv_detail", "viv_felt"]
VIV_POST = [i + "_post" for i in VIV_PRE]
MANIP = ["mc_style", "mc_scene", "mc_understand"]


def _num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def _mean(xs):
    vals = [x for x in (_num(v) for v in xs) if x is not None]
    return sum(vals) / len(vals) if vals else None


def _scale_mean(resp, ids):
    """Mean of a scale's items within ONE response (None if all missing)."""
    vals = [v for v in (_num(resp.get(i)) for i in ids) if v is not None]
    return sum(vals) / len(vals) if vals else None


def load(path):
    raw = sys.stdin.read() if path == "-" else open(path, encoding="utf-8").read()
    data = json.loads(raw)
    if isinstance(data, list):
        return data
    return data.get("sessions") or data.get("studies") or []


def _by_condition(studies):
    groups = {}
    for s in studies:
        cond = (s.get("meta") or {}).get("condition", "main")
        groups.setdefault(cond, []).append(s)
    return groups


def _outcome_series(group, pre_ids, post_ids, ios=False):
    """Return (pre[], post[], change[]) of per-person scale means."""
    pre, post, change = [], [], []
    for s in group:
        P, Q = s.get("preSurvey") or {}, s.get("postSurvey") or {}
        a = _num(P.get("ios_pre")) if ios else _scale_mean(P, pre_ids)
        b = _num(Q.get("ios_post")) if ios else _scale_mean(Q, post_ids)
        if a is not None:
            pre.append(a)
        if b is not None:
            post.append(b)
        if a is not None and b is not None:
            change.append(b - a)
    return pre, post, change


def cohens_d(a, b):
    """Cohen's d for two independent samples (pooled SD)."""
    if len(a) < 2 or len(b) < 2:
        return None
    na, nb = len(a), len(b)
    pooled = math.sqrt(((na - 1) * st.variance(a) + (nb - 1) * st.variance(b)) / (na + nb - 2))
    if pooled == 0:
        return None
    return (st.mean(a) - st.mean(b)) / pooled


def cronbach_alpha(group, ids):
    """Cronbach's alpha across respondents who answered every item."""
    rows = []
    for s in group:
        resp = s.get("preSurvey") or {}
        vals = [_num(resp.get(i)) for i in ids]
        if all(v is not None for v in vals):
            rows.append(vals)
    k = len(ids)
    if k < 2 or len(rows) < 3:
        return None
    item_var = [st.variance([r[j] for r in rows]) for j in range(k)]
    total_var = st.variance([sum(r) for r in rows])
    if total_var == 0:
        return None
    return (k / (k - 1)) * (1 - sum(item_var) / total_var)


def descriptives(studies):
    out = {}
    for cond, group in _by_condition(studies).items():
        row = {
            "n": len(group),
            "completed": sum(1 for s in group if (s.get("meta") or {}).get("completedAt")),
        }
        for name, pre_ids, post_ids, ios in [
            ("ios", None, None, True),
            ("fscs", FSCS_PRE, FSCS_POST, False),
            ("vividness", VIV_PRE, VIV_POST, False),
        ]:
            pre, post, change = _outcome_series(group, pre_ids, post_ids, ios)
            row[name] = {
                "pre_mean": _mean(pre),
                "post_mean": _mean(post),
                "change_mean": _mean(change),
                "n_change": len(change),
            }
        row["manip_means"] = {
            m: _mean([(s.get("postSurvey") or {}).get(m) for s in group]) for m in MANIP
        }
        out[cond] = row
    return out


def effect_sizes(studies):
    g = _by_condition(studies)
    if "main" not in g or "baseline" not in g:
        return {"status": "needs both main and baseline groups"}
    res = {}
    for name, pre_ids, post_ids, ios in [
        ("ios", None, None, True),
        ("fscs", FSCS_PRE, FSCS_POST, False),
        ("vividness", VIV_PRE, VIV_POST, False),
    ]:
        _, _, cm = _outcome_series(g["main"], pre_ids, post_ids, ios)
        _, _, cb = _outcome_series(g["baseline"], pre_ids, post_ids, ios)
        res[name] = {"cohens_d_change": cohens_d(cm, cb), "n_main": len(cm), "n_baseline": len(cb)}
    return res


def reliability(studies):
    alls = [s for grp in _by_condition(studies).values() for s in grp]
    return {
        "fscs_pre": cronbach_alpha(alls, FSCS_PRE),
        "vividness_pre": cronbach_alpha(alls, VIV_PRE),
    }


# --- Inferential pieces needing scipy / statsmodels — labelled stubs (§14) ----
def ttest_change(studies):
    return {"status": "not_implemented",
            "note": "independent-samples t / Mann-Whitney on change scores — add scipy.stats (Brief §4.1)"}


def ancova(studies):
    return {"status": "not_implemented",
            "note": "post ~ condition + pre + familiarity + interest_strength (+turns) — add statsmodels (Brief §4.1)"}


def lsm(studies):
    return {"status": "not_implemented",
            "note": "Linguistic Style Matching from transcripts — LIWC / PyLSM, time-permitting (Brief §4.4)"}


def run_all(studies):
    return {
        "n_total": len(studies),
        "descriptives": descriptives(studies),
        "effect_sizes": effect_sizes(studies),
        "reliability_cronbach_alpha": reliability(studies),
        "ttest_change": ttest_change(studies),
        "ancova": ancova(studies),
        "lsm": lsm(studies),
    }


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "-"
    print(json.dumps(run_all(load(path)), indent=2, ensure_ascii=False))
