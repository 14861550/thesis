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

# FSCS = the 2-item Ersner-Hershfield pictorial pair (similarity + connectedness);
# continuity score = mean of the two (Build Plan §10.1e).
FSCS_PRE = ["fscs_similar", "fscs_connected"]
FSCS_POST = [i + "_post" for i in FSCS_PRE]
VIV_PRE = ["viv_clear", "viv_tangible", "viv_detail", "viv_felt"]
VIV_POST = [i + "_post" for i in VIV_PRE]
MANIP = ["mc_style", "mc_scene", "mc_understand"]

# v5.1 distal outcomes (Build Plan §10.1i/j): CDSE-SF Self-Appraisal (1-5),
# CIP-Short-5 Choice/Commitment-Anxiety (1-6; higher = MORE indecision).
CDSE_PRE = [f"cdse_{i}" for i in range(1, 6)]
CDSE_POST = [i + "_post" for i in CDSE_PRE]
CIP_PRE = [f"cip_{i}" for i in range(1, 6)]
CIP_POST = [i + "_post" for i in CIP_PRE]

# TIPI (Gosling et al., 2003) — mirror of the app scoring (Build Plan §9):
# reversed = 8 - raw; trait = mean of its two items, natively /7; ES not N.
TIPI_KEY = {"E": [(1, False), (6, True)], "A": [(2, True), (7, False)],
            "C": [(3, False), (8, True)], "ES": [(4, True), (9, False)],
            "O": [(5, False), (10, True)]}


def tipi_traits(resp):
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
            ("cdse_sa", CDSE_PRE, CDSE_POST, False),   # distal outcome, 1-5
            ("cip_cca", CIP_PRE, CIP_POST, False),     # distal outcome, 1-6 (higher = more indecision)
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
        ("cdse_sa", CDSE_PRE, CDSE_POST, False),
        ("cip_cca", CIP_PRE, CIP_POST, False),
    ]:
        _, _, cm = _outcome_series(g["main"], pre_ids, post_ids, ios)
        _, _, cb = _outcome_series(g["baseline"], pre_ids, post_ids, ios)
        res[name] = {"cohens_d_change": cohens_d(cm, cb), "n_main": len(cm), "n_baseline": len(cb)}
    return res


def inter_item_r(group, ids):
    """Pearson r between two items (the 2-item-scale analogue of alpha)."""
    if len(ids) != 2:
        return None
    pairs = []
    for s in group:
        resp = s.get("preSurvey") or {}
        a, b = _num(resp.get(ids[0])), _num(resp.get(ids[1]))
        if a is not None and b is not None:
            pairs.append((a, b))
    if len(pairs) < 3:
        return None
    xs, ys = [p[0] for p in pairs], [p[1] for p in pairs]
    sx, sy = st.pstdev(xs), st.pstdev(ys)
    if sx == 0 or sy == 0:
        return None
    mx, my = st.mean(xs), st.mean(ys)
    cov = sum((x - mx) * (y - my) for x, y in pairs) / len(pairs)
    return cov / (sx * sy)


def reliability(studies):
    alls = [s for grp in _by_condition(studies).values() for s in grp]
    return {
        # alpha only for multi-item Likert scales (vividness, CDSE-SA, CIP-CCA).
        "vividness_pre_alpha": cronbach_alpha(alls, VIV_PRE),
        "cdse_sa_pre_alpha": cronbach_alpha(alls, CDSE_PRE),
        "cip_cca_pre_alpha": cronbach_alpha(alls, CIP_PRE),
        # 2-item scales: report the inter-item correlation instead of alpha.
        "fscs_pre_inter_item_r": inter_item_r(alls, FSCS_PRE),
        # TIPI traits are 2-item by design; Gosling et al. (2003) argue reliability
        # from test-retest, not internal consistency - so no alpha here.
        "tipi_note": "no alpha for 2-item TIPI traits (by design; see Gosling et al., 2003)",
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


def paired_prepost(studies):
    """Whole-sample pre->post paired t per instrument (mediators + distal
    outcomes). p-values use scipy when available; otherwise t + df are reported
    and p is None (choose stats software - Brief §8)."""
    try:
        from scipy import stats as _sps  # optional
    except Exception:
        _sps = None
    alls = [s for grp in _by_condition(studies).values() for s in grp]
    out = {}
    for name, pre_ids, post_ids, ios in [
        ("ios", None, None, True),
        ("fscs", FSCS_PRE, FSCS_POST, False),
        ("vividness", VIV_PRE, VIV_POST, False),
        ("cdse_sa", CDSE_PRE, CDSE_POST, False),
        ("cip_cca", CIP_PRE, CIP_POST, False),
    ]:
        _, _, change = _outcome_series(alls, pre_ids, post_ids, ios)
        n = len(change)
        if n < 3:
            out[name] = {"n": n, "note": "too few paired observations"}
            continue
        md, sd = st.mean(change), st.stdev(change)
        t = md / (sd / math.sqrt(n)) if sd > 0 else None
        p = float(2 * _sps.t.sf(abs(t), n - 1)) if (_sps and t is not None) else None
        out[name] = {"n": n, "mean_change": md, "sd_change": sd, "t": t, "df": n - 1,
                     "p": p if p is not None else "install scipy for p-values"}
    return out


def sample_tipi(studies):
    """Whole-sample TIPI trait means (sample description; mirrors app scoring)."""
    alls = [s for grp in _by_condition(studies).values() for s in grp]
    acc = {}
    for s in alls:
        for k, v in tipi_traits(s.get("preSurvey") or {}).items():
            acc.setdefault(k, []).append(v)
    return {k: st.mean(v) for k, v in acc.items() if v}


def run_all(studies):
    return {
        "n_total": len(studies),
        "descriptives": descriptives(studies),
        "effect_sizes": effect_sizes(studies),
        "paired_prepost_whole_sample": paired_prepost(studies),
        "reliability": reliability(studies),
        "sample_tipi_trait_means": sample_tipi(studies),
        "ttest_change": ttest_change(studies),
        "ancova": ancova(studies),
        "lsm": lsm(studies),
    }


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "-"
    print(json.dumps(run_all(load(path)), indent=2, ensure_ascii=False))
