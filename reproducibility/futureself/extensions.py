"""
extensions.py — value-adding analyses that strengthen the thesis without
changing its conclusions. For a study whose headline is a between-arm null,
these are exactly the analyses a top journal asks for:

  1. Equivalence testing (TOST)         — can we positively claim the arms are
                                           equivalent, or only "not different"?
  2. Bayesian between-arm t-test (BF10)  — how much evidence FOR the null?
  3. Minimum-turn sensitivity (0..5)     — reproduces the thesis robustness check
  4. Multiplicity correction (Holm/BH)   — five directional hypotheses
  5. Casing-mirror adherence             — quantifies the §8.3 limitation that
                                           the model dropped an explicit, visible
                                           style instruction
  6. Bootstrap CIs for the between-arm d — distribution-free robustness

All are honest: in an n=32 study powered only for large effects, equivalence is
expected to be inconclusive and Bayes factors near 1 — which is the point.
"""
from __future__ import annotations
import math
import re
import numpy as np
import pandas as pd
from scipy import stats as sps
from scipy.integrate import quad

from .stats import CONSTRUCTS, HYPOTHESIS, cohens_d_independent, d_ci_independent


# --------------------------------------------------------------------------- #
# 1. Equivalence testing (TOST on Cohen's d)                                   #
# --------------------------------------------------------------------------- #
def tost_equivalence(df, bound=0.5):
    """Two one-sided tests against ±`bound` (in d units). The arms are declared
    'equivalent' iff the 90% CI of d lies entirely inside (-bound, +bound)."""
    out = []
    for k in CONSTRUCTS:
        ci = df.loc[df.arm == "integrated", f"{k}_chg"].dropna()
        cb = df.loc[df.arm == "baseline", f"{k}_chg"].dropna()
        n1, n2 = len(ci), len(cb)
        d = cohens_d_independent(ci.values, cb.values)
        # 90% CI on d (matches the TOST decision at alpha=.05 each side)
        lo, hi = d_ci_independent(d, n1, n2, z=1.645)
        # the two one-sided p-values via the non-central-free normal approx on d
        se = np.sqrt((n1 + n2) / (n1 * n2) + d ** 2 / (2 * (n1 + n2)))
        p_lower = 1 - sps.norm.cdf((d - (-bound)) / se)   # H0: d <= -bound
        p_upper = sps.norm.cdf((d - bound) / se)          # H0: d >= +bound
        p_tost = max(p_lower, p_upper)
        out.append({"construct": k, "H": HYPOTHESIS[k], "d": d, "bound": bound,
                    "ci90_lo": lo, "ci90_hi": hi, "p_tost": p_tost,
                    "equivalent": (lo > -bound) and (hi < bound)})
    return pd.DataFrame(out)


# --------------------------------------------------------------------------- #
# 2. Bayesian between-arm t-test (JZS Bayes factor, Rouder et al. 2009)         #
# --------------------------------------------------------------------------- #
def _jzs_bf10(t, n1, n2, r=0.707):
    """Two-sample JZS Bayes factor BF10 from the t-statistic."""
    nu = n1 + n2 - 2
    neff = (n1 * n2) / (n1 + n2)

    def prior(g):  # scaled inverse-chi-square on g (inverse-gamma 1/2, r^2/2)
        return (r ** 2 / 2) ** 0.5 / math.gamma(0.5) * g ** (-1.5) * np.exp(-r ** 2 / (2 * g))

    def integrand(g):
        return ((1 + neff * g) ** -0.5
                * (1 + t ** 2 / ((1 + neff * g) * nu)) ** (-(nu + 1) / 2)
                * prior(g))

    num, _ = quad(integrand, 0, np.inf, limit=200)
    den = (1 + t ** 2 / nu) ** (-(nu + 1) / 2)
    return num / den


def bayes_between_arms(df, between):
    """BF10 for the between-arm difference per construct (BF01 = 1/BF10)."""
    bmap = {r.construct: r for r in between.itertuples()}
    out = []
    for k in CONSTRUCTS:
        ci = df.loc[df.arm == "integrated", f"{k}_chg"].dropna()
        cb = df.loc[df.arm == "baseline", f"{k}_chg"].dropna()
        t = sps.ttest_ind(ci, cb, equal_var=False).statistic
        bf10 = _jzs_bf10(float(t), len(ci), len(cb))
        out.append({"construct": k, "H": HYPOTHESIS[k], "t": float(t),
                    "bf10": bf10, "bf01": 1 / bf10})
    return pd.DataFrame(out)


# --------------------------------------------------------------------------- #
# 3. Minimum-turn sensitivity (reproduces §6.4 robustness: 0..5 unchanged)     #
# --------------------------------------------------------------------------- #
def minturn_sensitivity(studies, thresholds=range(0, 6)):
    """Re-run the full between-arm comparison at each inclusion threshold."""
    from .cohort import build_funnel
    from .stats import to_frame, between_arms
    import futureself.cohort as C
    out = []
    orig = C.MIN_ROLEPLAY_TURNS
    try:
        for thr in thresholds:
            C.MIN_ROLEPLAY_TURNS = thr
            sample, counts = build_funnel(studies)
            df = to_frame(sample)
            ba = between_arms(df)
            for r in ba.itertuples():
                out.append({"min_turns": thr, "construct": r.construct, "d": r.d,
                            "p": r.p, "n_int": r.n_int, "n_base": r.n_base,
                            "significant": r.p < 0.05})
    finally:
        C.MIN_ROLEPLAY_TURNS = orig
    return pd.DataFrame(out)


# --------------------------------------------------------------------------- #
# 4. Multiplicity correction over the five directional hypotheses              #
# --------------------------------------------------------------------------- #
def multiplicity(between):
    from statsmodels.stats.multitest import multipletests
    p = between["p"].values
    holm = multipletests(p, alpha=0.05, method="holm")[1]
    bh = multipletests(p, alpha=0.05, method="fdr_bh")[1]
    return between.assign(p_holm=holm, p_bh=bh)[
        ["construct", "H", "d", "p", "p_holm", "p_bh"]]


# --------------------------------------------------------------------------- #
# 5. Casing-mirror adherence (§8.3): does the bot echo all-lowercase users?     #
# --------------------------------------------------------------------------- #
_HAS_ALPHA = re.compile(r"[a-zA-Z]")
_HAS_UPPER = re.compile(r"[A-Z]")


def _is_all_lower(text):
    """A substantive message written entirely in lower case (>= 2 words)."""
    if not text or len(text.split()) < 2:
        return False
    return bool(_HAS_ALPHA.search(text)) and not _HAS_UPPER.search(text)


def session_casing(study):
    """Per-session (occasions, mirrored): all-lowercase user messages and
    whether the bot's next reply echoed that lowercase register."""
    t = (study.get("phaseC") or {}).get("transcript") or []
    occ = mir = 0
    for i, m in enumerate(t):
        if (m or {}).get("role") != "user" or not _is_all_lower(m.get("text", "")):
            continue
        nxt = next((t[j] for j in range(i + 1, len(t))
                    if (t[j] or {}).get("role") != "user"), None)
        if nxt is None:
            continue
        occ += 1
        mir += int(_is_all_lower(nxt.get("text", "")))
    return {"occasions": occ, "mirrored": mir}


def casing_mirror_adherence(sample, arm="integrated"):
    """For each all-lowercase USER message, was the bot's NEXT reply also
    all-lowercase? The integrated prompt (Appendix A) explicitly says to mirror
    register 'down to loose capitalisation'."""
    occasions = mirrored = 0
    for s in sample:
        if s.get("_arm") != arm:
            continue
        pc = s.get("phaseC") or {}
        # honour precomputed per-session casing counts (snapshot privacy posture)
        c = pc["_casing"] if isinstance(pc.get("_casing"), dict) else session_casing(s)
        occasions += c.get("occasions", 0)
        mirrored += c.get("mirrored", 0)
    return {"arm": arm, "lowercase_user_messages": occasions,
            "bot_mirrored_lowercase": mirrored,
            "mirror_rate": mirrored / occasions if occasions else float("nan")}


# --------------------------------------------------------------------------- #
# 6. Bootstrap CIs for the between-arm d (distribution-free)                    #
# --------------------------------------------------------------------------- #
def bootstrap_d_cis(df, n_boot=5000, seed=0):
    rng = np.random.default_rng(seed)
    out = []
    for k in CONSTRUCTS:
        ci = df.loc[df.arm == "integrated", f"{k}_chg"].dropna().values
        cb = df.loc[df.arm == "baseline", f"{k}_chg"].dropna().values
        d = cohens_d_independent(ci, cb)
        boot = np.empty(n_boot)
        for b in range(n_boot):
            a = rng.choice(ci, len(ci), replace=True)
            c = rng.choice(cb, len(cb), replace=True)
            boot[b] = cohens_d_independent(a, c)
        lo, hi = np.nanpercentile(boot, [2.5, 97.5])
        out.append({"construct": k, "d": d, "boot_lo": lo, "boot_hi": hi})
    return pd.DataFrame(out)
