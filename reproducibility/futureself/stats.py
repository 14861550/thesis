"""
stats.py — the inferential analyses reported in the thesis (§6.3, §6.5).

  * between-arm effect sizes on pre->post change (Cohen's d, integrated - baseline)
    with 95% CI, Welch's t, and a Shapiro-gated Mann-Whitney fallback;
  * whole-sample paired pre->post tests (Cohen's d_z);
  * ANCOVA: post ~ condition + pre + familiarity + interest + turns;
  * manipulation-check contrasts;
  * engagement metrics and exploratory mediator->outcome correlations.

Mirrors the thesis analysis: "scores were standardised within scale for the
tests and are reported on the raw scale for description" (§6.3).
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from scipy import stats as sps

from .scoring import outcomes_pre, outcomes_post, manip_checks
from .cohort import split_arms

CONSTRUCTS = ["closeness", "vividness", "continuity", "cip_anxiety", "cip_confidence"]
HYPOTHESIS = {  # directional hypothesis label per construct
    "closeness": "H1", "vividness": "H2", "continuity": "H3",
    "cip_anxiety": "H4a", "cip_confidence": "H4b",
}


# --------------------------------------------------------------------------- #
# per-person tidy frame                                                        #
# --------------------------------------------------------------------------- #
def to_frame(sample):
    """One row per participant: arm, covariates, pre/post/change per construct."""
    rows = []
    for s in sample:
        pre, post = outcomes_pre(s), outcomes_post(s)
        mc = manip_checks(s)
        pb, pc = s.get("phaseB") or {}, s.get("phaseC") or {}
        row = {
            "session_id": (s.get("meta") or {}).get("sessionId"),
            "arm": s["_arm"],
            "career": pb.get("career"),
            "familiarity": _f(pb.get("familiarity")),
            "interest": _f(pb.get("interestStrength")),
            "turns": _user_turns(s),
            "duration_min": (_f(pc.get("durationSec")) or 0) / 60.0,
            "mc_style": mc["mc_style"], "mc_scene": mc["mc_scene"],
            "mc_understand": mc["mc_understand"],
        }
        for k in CONSTRUCTS:
            row[f"{k}_pre"], row[f"{k}_post"] = pre[k], post[k]
            row[f"{k}_chg"] = (post[k] - pre[k]) if (pre[k] is not None and post[k] is not None) else np.nan
        rows.append(row)
    return pd.DataFrame(rows)


def _f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return np.nan


def _user_turns(s):
    pc = s.get("phaseC") or {}
    t = pc.get("transcript")
    if t:
        return sum(1 for m in t if (m or {}).get("role") == "user")
    # snapshot ships turnCount (== user-turn count) instead of raw transcript
    fm = s.get("_funnel") or {}
    if "user_turns" in fm:
        return fm["user_turns"]
    return int(pc.get("turnCount") or 0)


# --------------------------------------------------------------------------- #
# effect sizes                                                                 #
# --------------------------------------------------------------------------- #
def cohens_d_independent(a, b):
    """Cohen's d for two independent samples (pooled SD), a - b."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    a, b = a[~np.isnan(a)], b[~np.isnan(b)]
    na, nb = len(a), len(b)
    sp = np.sqrt(((na - 1) * a.var(ddof=1) + (nb - 1) * b.var(ddof=1)) / (na + nb - 2))
    return (a.mean() - b.mean()) / sp if sp > 0 else np.nan


def d_ci_independent(d, na, nb, z=1.96):
    """95% CI for an independent-samples Cohen's d (Hedges & Olkin SE)."""
    se = np.sqrt((na + nb) / (na * nb) + d ** 2 / (2 * (na + nb)))
    return d - z * se, d + z * se


def cohens_dz(change):
    """Within-person (paired) Cohen's d_z = mean(change) / sd(change)."""
    c = np.asarray(change, float)
    c = c[~np.isnan(c)]
    return c.mean() / c.std(ddof=1) if c.std(ddof=1) > 0 else np.nan


# --------------------------------------------------------------------------- #
# between-arm comparison (H1..H4b)                                             #
# --------------------------------------------------------------------------- #
def between_arms(df):
    out = []
    for k in CONSTRUCTS:
        col = f"{k}_chg"
        ci = df.loc[df.arm == "integrated", col].dropna()
        cb = df.loc[df.arm == "baseline", col].dropna()
        # Primary test: Welch's independent-samples t on the change scores
        # (Table 2 note: "d ... from Welch's t"). The t-statistic is invariant to
        # the within-scale standardisation, so it is computed on the raw change.
        t = sps.ttest_ind(ci, cb, equal_var=False)
        tval, p = float(t.statistic), float(t.pvalue)
        dfree = float(t.df)
        # Robustness: Shapiro-Wilk on the pooled change + a Wilcoxon rank-sum
        # (Mann-Whitney) fallback, as flagged in §6.3.
        allc = pd.concat([ci, cb])
        shap_p = float(sps.shapiro(allc)[1]) if len(allc) >= 3 else np.nan
        p_mwu = float(sps.mannwhitneyu(ci, cb, alternative="two-sided")[1])
        d = cohens_d_independent(ci.values, cb.values)
        lo, hi = d_ci_independent(d, len(ci), len(cb))
        out.append({
            "construct": k, "H": HYPOTHESIS[k],
            "n_int": len(ci), "n_base": len(cb),
            "pre_int": df.loc[df.arm == "integrated", f"{k}_pre"].mean(),
            "post_int": df.loc[df.arm == "integrated", f"{k}_post"].mean(),
            "chg_int": ci.mean(),
            "pre_base": df.loc[df.arm == "baseline", f"{k}_pre"].mean(),
            "post_base": df.loc[df.arm == "baseline", f"{k}_post"].mean(),
            "chg_base": cb.mean(),
            "d": d, "ci_lo": lo, "ci_hi": hi,
            "test": "Welch t", "t": tval, "df": dfree, "p": p,
            "shapiro_p": shap_p, "p_wilcoxon": p_mwu,
        })
    return pd.DataFrame(out)


# --------------------------------------------------------------------------- #
# whole-sample paired pre->post                                                #
# --------------------------------------------------------------------------- #
def whole_sample_paired(df):
    out = []
    for k in CONSTRUCTS:
        pre, post = df[f"{k}_pre"], df[f"{k}_post"]
        m = pre.notna() & post.notna()
        pr, po = pre[m].values, post[m].values
        t = sps.ttest_rel(po, pr)
        out.append({
            "construct": k, "n": int(m.sum()),
            "pre": pr.mean(), "post": po.mean(), "delta": (po - pr).mean(),
            "t": float(t.statistic), "df": int(m.sum() - 1),
            "p": float(t.pvalue), "dz": cohens_dz(po - pr),
        })
    return pd.DataFrame(out)


def paired_within_arm(df, arm):
    """Paired pre->post p per construct within one arm (for the §6.5 callouts)."""
    sub = df[df.arm == arm]
    out = {}
    for k in CONSTRUCTS:
        pre, post = sub[f"{k}_pre"], sub[f"{k}_post"]
        msk = pre.notna() & post.notna()
        if msk.sum() >= 3:
            t = sps.ttest_rel(post[msk].values, pre[msk].values)
            out[k] = {"delta": (post[msk] - pre[msk]).mean(), "t": float(t.statistic),
                      "p": float(t.pvalue), "n": int(msk.sum())}
    return out


# --------------------------------------------------------------------------- #
# ANCOVA                                                                       #
# --------------------------------------------------------------------------- #
def ancova(df):
    import statsmodels.formula.api as smf
    out = []
    for k in CONSTRUCTS:
        d = df[[f"{k}_post", f"{k}_pre", "familiarity", "interest", "turns", "arm"]].dropna().copy()
        d.columns = ["post", "pre", "familiarity", "interest", "turns", "arm"]
        d["cond"] = (d["arm"] == "integrated").astype(int)  # integrated=1, baseline=0
        model = smf.ols("post ~ cond + pre + familiarity + interest + turns", data=d).fit()
        out.append({
            "construct": k, "b_cond": model.params["cond"],
            "p_cond": model.pvalues["cond"], "n": int(d.shape[0]),
        })
    return pd.DataFrame(out)


# --------------------------------------------------------------------------- #
# manipulation checks                                                          #
# --------------------------------------------------------------------------- #
def manip_contrasts(df):
    out = []
    for m, label in [("mc_understand", "Felt understood"),
                     ("mc_style", "Own way of talking"),
                     ("mc_scene", "Concrete moments")]:
        i = df.loc[df.arm == "integrated", m].dropna()
        b = df.loc[df.arm == "baseline", m].dropna()
        d = cohens_d_independent(i.values, b.values)
        t = sps.ttest_ind(i, b, equal_var=False)
        out.append({"check": m, "label": label, "mean_int": i.mean(),
                    "mean_base": b.mean(), "d": d, "t": float(t.statistic),
                    "p": float(t.pvalue)})
    return pd.DataFrame(out)


# --------------------------------------------------------------------------- #
# engagement + exploratory couplings                                           #
# --------------------------------------------------------------------------- #
def engagement(df):
    g = df.groupby("arm")
    res = {}
    for arm in ["integrated", "baseline"]:
        s = df[df.arm == arm]
        res[arm] = {
            "n": len(s),
            "mean_turns": s["turns"].mean(),
            "mean_duration_min": s["duration_min"].mean(),
        }
    ti = df.loc[df.arm == "integrated", "turns"]
    tb = df.loc[df.arm == "baseline", "turns"]
    di = df.loc[df.arm == "integrated", "duration_min"]
    db = df.loc[df.arm == "baseline", "duration_min"]
    res["turns_test"] = {"p": float(sps.ttest_ind(ti, tb, equal_var=False).pvalue)}
    res["duration_test"] = {"p": float(sps.ttest_ind(di, db, equal_var=False).pvalue)}
    return res


def vividness_selfefficacy_coupling(df):
    x = df["vividness_chg"]
    y = df["cip_confidence_chg"]
    m = x.notna() & y.notna()
    r, p = sps.pearsonr(x[m], y[m])
    return {"r": float(r), "p": float(p), "n": int(m.sum())}


def all_mediator_outcome_corrs(df):
    out = []
    for med in ["closeness", "vividness", "continuity"]:
        for outc in ["cip_confidence", "cip_anxiety"]:
            x, y = df[f"{med}_chg"], df[f"{outc}_chg"]
            m = x.notna() & y.notna()
            r, p = sps.pearsonr(x[m], y[m])
            out.append({"mediator": med, "outcome": outc, "r": float(r),
                        "p": float(p), "n": int(m.sum())})
    return pd.DataFrame(out)
