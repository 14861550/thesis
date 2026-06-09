#!/usr/bin/env python3
"""
compare_runs.py — paired comparison of two silicon runs (the reconstruction
ablation). Run 1 = full-profile persona; Run 2 = questionnaire-only persona;
model held fixed (Sonnet). Pairs sessions by participant id (profile.name) and,
per outcome, reports how close Run 2 is to Run 1.

Usage:
  python3 scripts/compare_runs.py --run1 <dir> --run2 <dir> [--out compare.csv]
"""
import argparse, glob, json, math, os, sys
import numpy as np
from scipy import stats
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from eval_pipeline.loader import load_session

OUTCOMES = ["continuity", "vividness", "closeness", "manip_checks"]


def load_dir(d):
    out = {}
    for p in sorted(glob.glob(os.path.join(d, "*.json"))):
        s = load_session(p)
        name = (s.get("profile", {}) or {}).get("name") or s["session_id"]
        out[name] = s
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run1", required=True, help="full-profile run sessions dir")
    ap.add_argument("--run2", required=True, help="questionnaire-only run sessions dir")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()

    R1, R2 = load_dir(a.run1), load_dir(a.run2)
    common = sorted(set(R1) & set(R2))
    print(f"Run1={len(R1)}  Run2={len(R2)}  paired={len(common)}\n")
    if not common:
        raise SystemExit("No paired participants (profile.name must match across runs).")

    def fisher_ci(r, n):
        """95% CI for Pearson r via Fisher z."""
        if not np.isfinite(r) or n < 4 or abs(r) >= 1:
            return (float("nan"), float("nan"))
        z = np.arctanh(r); se = 1.0 / math.sqrt(n - 3)
        return (float(np.tanh(z - 1.96 * se)), float(np.tanh(z + 1.96 * se)))

    f = lambda v: "n/a" if (v is None or (isinstance(v, float) and math.isnan(v))) else f"{v:.2f}"
    print(f"{'outcome':13}{'n':>3}{'mean1':>7}{'mean2':>7}{'Δmean':>7}{'meanP':>7}{'MAE':>6}{'r':>6}{'r 95% CI':>16}{'SD1':>6}{'SD2':>6}{'SDrat':>7}{'varP':>7}")
    rows = []
    for o in OUTCOMES:
        x, y = [], []
        for k in common:
            a1 = R1[k]["outcomes_post"].get(o); a2 = R2[k]["outcomes_post"].get(o)
            if a1 is not None and a2 is not None:
                x.append(a1); y.append(a2)
        x, y = np.array(x, float), np.array(y, float); n = len(x)
        if n == 0:
            continue
        sdx, sdy = float(x.std(ddof=1)), float(y.std(ddof=1))
        mae = float(np.mean(np.abs(x - y)))
        bias = float(np.mean(y - x))
        r = float(stats.pearsonr(x, y)[0]) if n > 1 and sdx > 0 and sdy > 0 else float("nan")
        rho = float(stats.spearmanr(x, y)[0]) if n > 1 and sdx > 0 and sdy > 0 else float("nan")
        r_lo, r_hi = fisher_ci(r, n)
        # paired mean test (do the two persona sources give the same mean?)
        mean_p = float(stats.ttest_rel(x, y).pvalue) if n > 1 and (sdx > 0 or sdy > 0) else float("nan")
        # variance equality test (does stripping the profile flatten spread?)
        var_p = float(stats.levene(x, y, center="median").pvalue) if sdx > 0 and sdy > 0 else float("nan")
        sd_ratio = (sdy / sdx) if sdx > 0 else float("nan")
        print(f"{o:13}{n:>3}{f(x.mean()):>7}{f(y.mean()):>7}{f(y.mean()-x.mean()):>7}{f(mean_p):>7}{f(mae):>6}{f(r):>6}{('['+f(r_lo)+','+f(r_hi)+']'):>16}{f(sdx):>6}{f(sdy):>6}{f(sd_ratio):>7}{f(var_p):>7}")
        rows.append({
            "outcome": o, "n": n, "mean_run1": x.mean(), "mean_run2": y.mean(),
            "mean_diff": y.mean() - x.mean(), "mean_p_paired": mean_p,
            "mae": mae, "pearson_r": r, "r_ci_lo": r_lo, "r_ci_hi": r_hi,
            "spearman_rho": rho, "BA_bias": bias,
            "sd_run1": sdx, "sd_run2": sdy, "sd_ratio": sd_ratio, "var_levene_p": var_p,
        })

    if a.out:
        import csv
        with open(a.out, "w", newline="") as fc:
            w = csv.DictWriter(fc, fieldnames=list(rows[0].keys()))
            w.writeheader(); w.writerows(rows)
        with open(os.path.splitext(a.out)[0] + ".json", "w") as fj:
            json.dump({"n_paired": len(common), "outcomes": rows}, fj, indent=2)
        print(f"\nwrote {a.out} and {os.path.splitext(a.out)[0] + '.json'}")

    print("\nRun1 = full-profile persona | Run2 = questionnaire-only persona | model fixed = Sonnet.")
    print("meanP = paired t p (means equal?). varP = Levene p (variances equal?). SDrat = SD2/SD1.")
    print("High r + Δmean≈0 (meanP large) + SDrat≈1  =>  persona source barely matters.")
    print("Δmean≈0 but SDrat<1 with small varP        =>  stripping the profile FLATTENS variance (key signal).")


if __name__ == "__main__":
    main()
