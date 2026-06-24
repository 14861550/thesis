"""
figures.py — regenerate every figure in the thesis (and the value-adding
extensions) from the reproduced results. Each function writes a PNG (300 dpi)
and a PDF, and returns the PNG path. A consistent, print-friendly style is used.
"""
from __future__ import annotations
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from . import stats as S
from . import lsm as L
from . import qualitative as Q

# ---- house style ---------------------------------------------------------- #
plt.rcParams.update({
    "figure.dpi": 110, "savefig.dpi": 300, "font.size": 11,
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.grid": True, "grid.alpha": 0.25, "grid.linewidth": 0.6,
    "font.family": "DejaVu Sans", "axes.titlesize": 12, "axes.titleweight": "bold",
})
INT_C, BASE_C = "#2C5F8A", "#C44E52"   # integrated (blue), baseline (red)
_OUTDIR = Path(__file__).resolve().parent.parent / "figures"


def _save(fig, name, outdir=None):
    outdir = Path(outdir or _OUTDIR)
    outdir.mkdir(parents=True, exist_ok=True)
    png = outdir / f"{name}.png"
    fig.savefig(png, bbox_inches="tight")
    fig.savefig(outdir / f"{name}.pdf", bbox_inches="tight")
    plt.close(fig)
    return png


# --------------------------------------------------------------------------- #
# Figure 4 — between-arm effect sizes (forest plot)                            #
# --------------------------------------------------------------------------- #
def fig4_between_arm_forest(between, outdir=None):
    labels = {"closeness": "Closeness", "vividness": "Vividness",
              "continuity": "Continuity", "cip_anxiety": "Commitment anxiety",
              "cip_confidence": "Decision confidence"}
    rows = list(between.itertuples())
    y = np.arange(len(rows))[::-1]
    fig, ax = plt.subplots(figsize=(7.4, 3.6))
    ax.axvspan(-0.2, 0.2, color="0.85", alpha=0.6, lw=0, label="trivial (|d|<0.2)")
    ax.axvline(0, color="0.4", lw=1)
    for yi, r in zip(y, rows):
        ax.plot([r.ci_lo, r.ci_hi], [yi, yi], color="0.3", lw=1.6)
        ax.plot(r.d, yi, "o", color=INT_C, ms=8, zorder=3)
        ax.text(r.ci_hi + 0.05, yi, f"{r.d:+.2f} [{r.ci_lo:+.2f}, {r.ci_hi:+.2f}]",
                va="center", fontsize=9, color="0.25")
    ax.set_yticks(y)
    ax.set_yticklabels([labels[r.construct] for r in rows])
    ax.set_xlim(-1.5, 1.6)
    ax.set_xlabel("Between-arm effect size  Cohen's $d$  (integrated − baseline)")
    ax.set_title("Figure 4. Between-arm effects on pre→post change (95% CI)")
    ax.legend(loc="upper left", fontsize=8, framealpha=0.9)
    return _save(fig, "fig4_between_arm_forest", outdir)


# --------------------------------------------------------------------------- #
# Figure 5 — manipulation checks + objective LSM                              #
# --------------------------------------------------------------------------- #
def fig5_manip_and_lsm(manip, lsm_res, outdir=None):
    fig, (axL, axR) = plt.subplots(1, 2, figsize=(9.2, 3.8),
                                   gridspec_kw={"width_ratios": [2.3, 1]})
    # left: 3 manipulation checks, 1-7
    checks = list(manip.itertuples())
    x = np.arange(len(checks)); w = 0.38
    mi = [c.mean_int for c in checks]; mb = [c.mean_base for c in checks]
    axL.bar(x - w/2, mi, w, color=INT_C, label="Integrated")
    axL.bar(x + w/2, mb, w, color=BASE_C, label="Minimal baseline")
    axL.set_xticks(x)
    axL.set_xticklabels(["Felt\nunderstood", "Own way\nof talking", "Concrete\nmoments"])
    axL.set_ylim(0, 7); axL.set_ylabel("Manipulation-check rating (1–7)")
    axL.set_title("Perceived design components")
    axL.legend(fontsize=8)
    for xi, a, b in zip(x, mi, mb):
        axL.text(xi - w/2, a + 0.1, f"{a:.2f}", ha="center", fontsize=8)
        axL.text(xi + w/2, b + 0.1, f"{b:.2f}", ha="center", fontsize=8)
    # right: LSM 0-1
    iv = np.array(lsm_res["integrated_vals"]); bv = np.array(lsm_res["baseline_vals"])
    means = [lsm_res["integrated_mean"], lsm_res["baseline_mean"]]
    ses = [iv.std(ddof=1)/np.sqrt(len(iv)), bv.std(ddof=1)/np.sqrt(len(bv))]
    axR.bar([0, 1], means, 0.6, yerr=[1.96*s for s in ses], capsize=5,
            color=[INT_C, BASE_C])
    axR.set_xticks([0, 1]); axR.set_xticklabels(["Integrated", "Minimal"])
    axR.set_ylim(0, 1); axR.set_ylabel("Linguistic style matching (0–1)")
    axR.set_title("Objective LSM")
    for xi, m in zip([0, 1], means):
        axR.text(xi, m + 0.02, f"{m:.2f}", ha="center", fontsize=9)
    fig.suptitle("Figure 5. Manipulation checks and objective style matching by arm",
                 fontsize=12, fontweight="bold", y=1.02)
    return _save(fig, "fig5_manip_and_lsm", outdir)


# --------------------------------------------------------------------------- #
# Figure 6 — pre→post means by arm per construct                              #
# --------------------------------------------------------------------------- #
def fig6_prepost(df, whole, outdir=None):
    order = ["closeness", "vividness", "continuity", "cip_anxiety", "cip_confidence"]
    titles = {"closeness": "Closeness", "vividness": "Vividness",
              "continuity": "Continuity", "cip_anxiety": "Commitment anxiety",
              "cip_confidence": "Decision confidence"}
    star = {}
    for r in whole.itertuples():
        p = r.p
        star[r.construct] = ("***" if p < .001 else "**" if p < .01 else "*" if p < .05 else "")
    fig, axes = plt.subplots(1, 5, figsize=(13.5, 3.2), sharey=False)
    for ax, k in zip(axes, order):
        for arm, c, mk in [("integrated", INT_C, "o"), ("baseline", BASE_C, "s")]:
            sub = df[df.arm == arm]
            pre, post = sub[f"{k}_pre"].dropna(), sub[f"{k}_post"].dropna()
            m = [pre.mean(), post.mean()]
            se = [pre.std(ddof=1)/np.sqrt(len(pre)), post.std(ddof=1)/np.sqrt(len(post))]
            ax.errorbar([0, 1], m, yerr=[1.96*s for s in se], marker=mk, color=c,
                        capsize=3, lw=1.8, ms=7, label=arm.capitalize())
        ax.set_xticks([0, 1]); ax.set_xticklabels(["Pre", "Post"])
        ax.set_xlim(-0.3, 1.3)
        ax.set_title(f"{titles[k]} {star[k]}")
    axes[0].set_ylabel("Scale score (mean, 95% CI)")
    axes[0].legend(fontsize=8, loc="lower left")
    fig.suptitle("Figure 6. Pre→post scale means by arm  (whole-sample paired test: * p<.05, *** p<.001)",
                 fontsize=12, fontweight="bold", y=1.04)
    return _save(fig, "fig6_prepost_by_arm", outdir)


# --------------------------------------------------------------------------- #
# Figure 7 — vividness × self-efficacy coupling                               #
# --------------------------------------------------------------------------- #
def fig7_coupling(df, coupling, outdir=None):
    fig, ax = plt.subplots(figsize=(6.2, 5))
    for arm, c, mk in [("integrated", INT_C, "o"), ("baseline", BASE_C, "s")]:
        sub = df[df.arm == arm]
        ax.scatter(sub["vividness_chg"], sub["cip_confidence_chg"], c=c, marker=mk,
                   s=55, alpha=0.85, edgecolor="white", label=arm.capitalize())
    x = df["vividness_chg"]; y = df["cip_confidence_chg"]
    m = x.notna() & y.notna()
    b1, b0 = np.polyfit(x[m], y[m], 1)
    xs = np.linspace(x[m].min(), x[m].max(), 50)
    ax.plot(xs, b0 + b1*xs, color="0.3", lw=1.5, ls="--")
    ax.axhline(0, color="0.7", lw=0.8); ax.axvline(0, color="0.7", lw=0.8)
    ax.set_xlabel("Change in vividness (post − pre)")
    ax.set_ylabel("Change in career self-efficacy (post − pre)")
    ax.set_title(f"Figure 7. Vividness × self-efficacy coupling\n"
                 f"r = {coupling['r']:.2f}, p = {coupling['p']:.2f} (pooled, exploratory, n={coupling['n']})")
    ax.legend(fontsize=9)
    return _save(fig, "fig7_vividness_selfefficacy", outdir)


# --------------------------------------------------------------------------- #
# Figure 8 — open-ended feedback (coded positive codes + word counts)          #
# --------------------------------------------------------------------------- #
def fig8_qualitative(felt_codes, word_counts, outdir=None):
    fig, (axL, axR) = plt.subplots(1, 2, figsize=(10.5, 3.9),
                                   gridspec_kw={"width_ratios": [1.6, 1]})
    cats = ["P1", "P2", "P3", "P5"]
    labels = ["Resonance\n(P1)", "Vivid scene\n(P2)", "Continuity\n(P3)", "Agency\n(P5)"]
    x = np.arange(len(cats)); w = 0.38
    vi = [felt_codes["integrated"][c] for c in cats]
    vb = [felt_codes["baseline"][c] for c in cats]
    axL.bar(x - w/2, vi, w, color=INT_C, label=f"Integrated (Σ={sum(felt_codes['integrated'].values())})")
    axL.bar(x + w/2, vb, w, color=BASE_C, label=f"Minimal baseline (Σ={sum(felt_codes['baseline'].values())})")
    axL.set_xticks(x); axL.set_xticklabels(labels)
    axL.set_ylabel("Positive-code count")
    axL.set_title("What made the future self feel real")
    axL.legend(fontsize=8)
    axL.annotate("absent in\nbaseline", xy=(1 + w/2, 0.15), xytext=(1.35, 2.2),
                 fontsize=8, color=BASE_C, ha="center",
                 arrowprops=dict(arrowstyle="->", color=BASE_C, lw=1))
    # right: mean words
    items = ["Felt real", "Broke it"]
    xi = np.arange(2)
    wi = [word_counts["integrated"]["mean_words_real"], word_counts["integrated"]["mean_words_broke"]]
    wb = [word_counts["baseline"]["mean_words_real"], word_counts["baseline"]["mean_words_broke"]]
    axR.bar(xi - w/2, wi, w, color=INT_C)
    axR.bar(xi + w/2, wb, w, color=BASE_C)
    axR.set_xticks(xi); axR.set_xticklabels(items)
    axR.set_ylabel("Mean words written")
    axR.set_title("Open-ended engagement")
    for xx, a, b in zip(xi, wi, wb):
        axR.text(xx - w/2, a + 0.4, f"{a:.0f}", ha="center", fontsize=8)
        axR.text(xx + w/2, b + 0.4, f"{b:.0f}", ha="center", fontsize=8)
    fig.suptitle("Figure 8. Open-ended feedback by arm (32-participant cohort)",
                 fontsize=12, fontweight="bold", y=1.02)
    return _save(fig, "fig8_open_ended", outdir)


# --------------------------------------------------------------------------- #
# Figure 9 — requests for concrete specifics (human-coded)                    #
# --------------------------------------------------------------------------- #
def fig9_requests(human_coded, outdir=None):
    cats = ["Skills to build", "Direction and next steps", "Pay and employers"]
    vals = [human_coded["skills"], human_coded["direction"], human_coded["pay"]]
    fig, ax = plt.subplots(figsize=(7, 2.7))
    y = np.arange(len(cats))[::-1]
    ax.barh(y, vals, color=["#3B7A57", "#3B7A57", "#9CAFA0"], height=0.6)
    ax.set_yticks(y); ax.set_yticklabels(cats)
    for yi, v in zip(y, vals):
        ax.text(v + 0.3, yi, str(v), va="center", fontsize=10)
    ax.set_xlabel("Requests across the cohort (human-coded)")
    ax.set_xlim(0, max(vals) + 3)
    ax.set_title("Figure 9. Requests for concrete career specifics")
    return _save(fig, "fig9_requests", outdir)


# --------------------------------------------------------------------------- #
# Extension figures (value-adding; see extensions.py)                          #
# --------------------------------------------------------------------------- #
def figE0_funnel(counts, outdir=None):
    """Sample funnel waterfall (185 → 32)."""
    stages = [
        ("Logged sessions", counts["logged"]),
        ("Completed", counts["completed"]),
        ("Final instrument", counts["completed_final_instrument"]),
        ("Direct strategy,\nboth arms", counts["direct_strategy_both_arms"]),
        ("− test / untracked", counts["after_removing_test_untracked"]),
        ("Final sample\n(18 + 14)", counts["final_analysis_sample"]),
    ]
    labels = [s[0] for s in stages]
    vals = [s[1] for s in stages]
    fig, ax = plt.subplots(figsize=(8.6, 3.6))
    x = np.arange(len(vals))
    bars = ax.bar(x, vals, color=["#7596b8"] * (len(vals) - 1) + [INT_C], width=0.62)
    for xi, v in zip(x, vals):
        ax.text(xi, v + 2, str(v), ha="center", fontsize=11, fontweight="bold")
    ax.set_xticks(x); ax.set_xticklabels(labels, fontsize=8.5)
    ax.set_ylabel("Sessions")
    ax.set_ylim(0, max(vals) * 1.15)
    ax.set_title("Sample funnel (registered analysis plan, §6.4)")
    ax.grid(axis="x", visible=False)
    return _save(fig, "figE0_funnel", outdir)


def figE1_equivalence(tost_df, outdir=None):
    """90% CIs of between-arm d against an equivalence bound (TOST)."""
    labels = {"closeness": "Closeness", "vividness": "Vividness",
              "continuity": "Continuity", "cip_anxiety": "Commitment anxiety",
              "cip_confidence": "Decision confidence"}
    rows = list(tost_df.itertuples())
    y = np.arange(len(rows))[::-1]
    bound = rows[0].bound
    fig, ax = plt.subplots(figsize=(7.6, 3.6))
    ax.axvspan(-bound, bound, color="#cfe8d4", alpha=0.7, lw=0,
               label=f"equivalence region (±{bound})")
    ax.axvline(0, color="0.5", lw=1)
    for yi, r in zip(y, rows):
        ax.plot([r.ci90_lo, r.ci90_hi], [yi, yi], color="0.3", lw=1.8)
        ax.plot(r.d, yi, "o", color=INT_C, ms=7)
        verdict = "equivalent" if r.equivalent else "inconclusive"
        ax.text(1.65, yi, verdict, va="center", fontsize=8,
                color="#2e7d32" if r.equivalent else "#b25b00")
    ax.set_yticks(y); ax.set_yticklabels([labels[r.construct] for r in rows])
    ax.set_xlim(-1.6, 2.1)
    ax.set_xlabel("Between-arm $d$ with 90% CI (TOST)")
    ax.set_title("Figure E1. Equivalence testing (two one-sided tests)")
    ax.legend(loc="upper left", fontsize=8, framealpha=0.9)
    return _save(fig, "figE1_equivalence", outdir)


def figE2_sensitivity(sens_df, outdir=None):
    """Between-arm d across minimum-turn thresholds (robustness)."""
    constructs = ["closeness", "vividness", "continuity", "cip_anxiety", "cip_confidence"]
    colors = plt.cm.viridis(np.linspace(0, 0.85, len(constructs)))
    fig, ax = plt.subplots(figsize=(7.6, 4.2))
    for c, col in zip(constructs, colors):
        sub = sens_df[sens_df.construct == c]
        ax.plot(sub.min_turns, sub.d, "-o", color=col, ms=4, label=c)
    ax.axhline(0, color="0.5", lw=0.8)
    ax.axhspan(-0.2, 0.2, color="0.9", alpha=0.6, lw=0)
    ax.set_xlabel("Minimum role-play exchanges required (inclusion threshold)")
    ax.set_ylabel("Between-arm $d$ (integrated − baseline)")
    ax.set_title("Figure E2. Sensitivity of between-arm effects to the\nminimum-turn threshold (0–5)")
    ax.legend(fontsize=8, ncol=2)
    return _save(fig, "figE2_sensitivity", outdir)


def figE3_bayes(bayes_df, outdir=None):
    """Bayes factors (BF10) per construct on a log scale."""
    labels = {"closeness": "Closeness", "vividness": "Vividness",
              "continuity": "Continuity", "cip_anxiety": "Commitment anxiety",
              "cip_confidence": "Decision confidence"}
    rows = list(bayes_df.itertuples())
    y = np.arange(len(rows))[::-1]
    fig, ax = plt.subplots(figsize=(7.4, 3.4))
    ax.axvspan(1/3, 3, color="0.9", alpha=0.7, lw=0, label="anecdotal / inconclusive")
    ax.axvline(1, color="0.5", lw=1)
    ax.axvline(1/3, color="0.6", lw=0.8, ls="--")
    for yi, r in zip(y, rows):
        ax.plot(r.bf10, yi, "D", color=INT_C, ms=8)
        ax.text(r.bf10*1.12, yi, f"BF₁₀={r.bf10:.2f}  (BF₀₁={1/r.bf10:.1f})",
                va="center", fontsize=8.5, color="0.25")
    ax.set_xscale("log")
    ax.set_yticks(y); ax.set_yticklabels([labels[r.construct] for r in rows])
    ax.set_xlim(0.05, 6)
    ax.set_xlabel("Bayes factor BF₁₀ (between-arm difference vs null)")
    ax.set_title("Figure E3. Bayesian evidence for the between-arm null")
    ax.legend(loc="lower right", fontsize=8)
    return _save(fig, "figE3_bayes", outdir)


def figE4_casing(casing, outdir=None):
    """Casing-mirror adherence: lowercase user messages vs lowercase bot replies."""
    fig, ax = plt.subplots(figsize=(6.4, 3.4))
    occ = casing["lowercase_user_messages"]
    mir = casing["bot_mirrored_lowercase"]
    ax.bar([0, 1], [occ, mir], 0.55, color=[INT_C, BASE_C])
    ax.set_xticks([0, 1])
    ax.set_xticklabels([f"All-lowercase\nuser messages\n(n={occ})",
                        f"Bot mirrored\nlowercase\n(n={mir})"])
    ax.set_ylabel("Count of occasions")
    for xi, v in zip([0, 1], [occ, mir]):
        ax.text(xi, v + 0.3, str(v), ha="center", fontsize=11)
    ax.set_title("Figure E4. Casing-mirror adherence in the integrated arm")
    return _save(fig, "figE4_casing_adherence", outdir)
