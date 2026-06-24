"""
build_snapshot.py — produce the bundled offline reproducibility snapshot.

PRIVACY POSTURE (the repository is public, the data are human-subjects): the
snapshot ships NO participant free text. Concretely:

  * Every logged session keeps only NON-IDENTIFYING funnel metadata
    (status, arm, tracked-flag, final-instrument-flag, role-play turn count).
  * The 32 analysis-cohort sessions additionally keep DE-IDENTIFIED NUMERIC
    survey responses (Likert items + scale scores + manipulation checks +
    covariates) and PRECOMPUTED text-derived metrics:
        - per-session Linguistic Style Matching (one number),
        - per-session casing-mirror counts (two integers),
        - per-session open-ended word counts + a "wrote" flag.
  * Raw transcripts, open-ended free text, names, emails, and the raw
    career / location / major strings are NOT written.

This reproduces the full 185->32 funnel and every figure/number in the paper
from numbers alone, while keeping participant prose out of the public repo. The
notebook's optional live-DB / export path recomputes everything from raw text.

Run with the platform's de-identified export on disk:
    python build_snapshot.py  path/to/export_deidentified.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from futureself import scoring
from futureself.cohort import _arm, EXCLUDED_TEST_IDS, build_funnel
from futureself.lsm import session_lsm
from futureself.extensions import session_casing

OUT = Path(__file__).resolve().parent / "data" / "sessions_deidentified.json"

# numeric / categorical survey keys that are safe to keep for the 32 cohort
PRE_NUM = (["age", "gender", "year", "ios_pre"]
           + [f"tipi_{i}" for i in range(1, 11)]
           + [f"ria_{x}" for x in "RIASEC"]
           + ["val_achievement", "val_conditions", "val_independence",
              "val_recognition", "val_relationships", "val_support"]
           + scoring.VIV_PRE + scoring.FSCS_PRE
           + scoring.CIP_ANX_PRE + scoring.CIP_CONF_PRE)
POST_NUM = (["ios_post", "interview"] + scoring.VIV_POST + scoring.FSCS_POST
            + scoring.CIP_ANX_POST + scoring.CIP_CONF_POST + scoring.MANIP)


def funnel_meta(s):
    m = s.get("meta") or {}
    return {
        "completed": m.get("status") == "completed",
        "has_final": scoring.has_final_instrument(s),
        "arm": _arm(s),
        "tracked": bool(m.get("pid")) and m.get("sessionId") not in EXCLUDED_TEST_IDS,
        "user_turns": scoring.phase_c_user_turns(s),
    }


def _wc(t):
    return len((t or "").split())


def main(path):
    full = json.load(open(path, encoding="utf-8"))
    sample, counts = build_funnel(json.loads(json.dumps(full)))
    cohort_ids = {s["meta"]["sessionId"] for s in sample}

    out = []
    for s in full:
        meta = {k: v for k, v in (s.get("meta") or {}).items() if k != "pid"}
        rec = {"meta": meta, "_funnel": funnel_meta(s)}
        if meta.get("sessionId") in cohort_ids:
            pre, post = s.get("preSurvey") or {}, s.get("postSurvey") or {}
            pb, pc = s.get("phaseB") or {}, s.get("phaseC") or {}
            rec["preSurvey"] = {k: pre[k] for k in PRE_NUM if k in pre}
            rec["postSurvey"] = {k: post[k] for k in POST_NUM if k in post}
            rec["postSurvey"]["_oe"] = {
                "wrote_real": bool((post.get("oe_real") or "").strip()),
                "words_real": _wc(post.get("oe_real")),
                "words_broke": _wc(post.get("oe_broke")),
            }
            rec["phaseB"] = {"familiarity": pb.get("familiarity"),
                             "interestStrength": pb.get("interestStrength")}
            rec["phaseC"] = {
                "turnCount": pc.get("turnCount"), "durationSec": pc.get("durationSec"),
                "_lsm": session_lsm(s), "_casing": session_casing(s),
            }
            rec["scores"] = {k: (s.get("scores") or {}).get(k)
                             for k in ("riasec", "bigFive", "cip_pre", "cip_post")}
        out.append(rec)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    kb = OUT.stat().st_size / 1024
    print(f"wrote {OUT} ({kb:.0f} KB): {len(out)} records "
          f"({len(cohort_ids)} cohort w/ numeric data, {len(out)-len(cohort_ids)} metadata-only)")
    print("NO free text written (transcripts / open-ended / names / careers omitted).")
    print("funnel:", counts["logged"], "->", counts["final_analysis_sample"],
          counts["_final_by_arm"])

    # small aggregate the sample table needs but the figures don't (string-free)
    agg = {"distinct_majors": len({(x.get('preSurvey') or {}).get('major')
                                   for x in full
                                   if x['meta'].get('sessionId') in cohort_ids
                                   and (x.get('preSurvey') or {}).get('major')})}
    (OUT.parent / "sample_aggregates.json").write_text(json.dumps(agg, indent=1))
    print("aggregates:", agg)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else
         "/tmp/claude-0/-home-user-thesis/fa6928f0-f311-50c7-964e-07ef61ad5b5b/scratchpad/export_deid.json")
