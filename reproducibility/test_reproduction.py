"""
test_reproduction.py — assert the reproduced numbers match the thesis.

Runs against the bundled de-identified snapshot, so it needs no network. This is
the same set of checks the notebook performs in its self-check cell.

    pytest -q
"""
import warnings
import pytest

warnings.filterwarnings("ignore")
from futureself import cohort, stats, lsm, qualitative as Q, extensions as X


@pytest.fixture(scope="module")
def ctx():
    studies, _ = cohort.load_studies(prefer=["snapshot"])
    sample, counts = cohort.build_funnel(studies)
    df = stats.to_frame(sample)
    return dict(sample=sample, counts=counts, df=df,
                between={r.construct: r for r in stats.between_arms(df).itertuples()},
                whole={r.construct: r for r in stats.whole_sample_paired(df).itertuples()})


def test_funnel(ctx):
    assert ctx["counts"]["final_analysis_sample"] == 32
    assert ctx["counts"]["_final_by_arm"] == {"integrated": 18, "baseline": 14}
    assert ctx["counts"]["direct_strategy_both_arms"] == 41


@pytest.mark.parametrize("construct,d,p", [
    ("closeness", -0.10, .79), ("vividness", -0.22, .53), ("continuity", -0.14, .69),
    ("cip_anxiety", 0.13, .72), ("cip_confidence", -0.51, .17)])
def test_between_arm(ctx, construct, d, p):
    r = ctx["between"][construct]
    assert abs(r.d - d) <= 0.02
    assert abs(r.p - p) <= 0.03


def test_welch_df_27(ctx):
    assert round(ctx["between"]["closeness"].df) == 27
    assert round(ctx["between"]["cip_confidence"].df) == 27
    assert abs(ctx["between"]["cip_confidence"].t - (-1.42)) <= 0.05


def test_whole_sample(ctx):
    assert abs(ctx["whole"]["vividness"].dz - 0.73) <= 0.02 and ctx["whole"]["vividness"].p < .001
    assert abs(ctx["whole"]["closeness"].dz - 0.40) <= 0.02 and abs(ctx["whole"]["closeness"].p - .032) <= .01


def test_manipulation_checks(ctx):
    mc = {r.check: r for r in stats.manip_contrasts(ctx["df"]).itertuples()}
    assert abs(mc["mc_understand"].mean_int - 4.22) <= .05 and abs(mc["mc_understand"].mean_base - 4.57) <= .05
    assert abs(mc["mc_scene"].mean_int - 4.78) <= .05 and abs(mc["mc_scene"].mean_base - 4.86) <= .05


def test_lsm_arms_not_significant(ctx):
    L = lsm.lsm_by_arm(ctx["sample"])
    grand = (L["integrated_mean"] * 18 + L["baseline_mean"] * 14) / 32
    assert abs(grand - 0.62) <= 0.02 and L["p"] > 0.05


def test_coupling(ctx):
    c = stats.vividness_selfefficacy_coupling(ctx["df"])
    assert abs(c["r"] - 0.31) <= 0.02 and abs(c["p"] - .086) <= .02


def test_qualitative(ctx):
    table, rel = Q.load_coding_table()
    felt = Q.felt_real_codes_by_arm(table, ctx["sample"])
    assert sum(felt["integrated"].values()) == 18 and sum(felt["baseline"].values()) == 11
    assert felt["integrated"]["P2"] == 3 and felt["baseline"]["P2"] == 0
    assert abs(Q.cohen_kappa(rel)["kappa"] - 1.0) <= 1e-6
    w = Q.open_ended_word_counts(ctx["sample"])
    assert abs(w["integrated"]["mean_words_real"] - 25) <= 1 and abs(w["baseline"]["mean_words_real"] - 17) <= 1


def test_extensions(ctx):
    sens = X.minturn_sensitivity(
        [dict(s) for s in cohort.load_studies(prefer=["snapshot"])[0]])
    assert sens["significant"].sum() == 0           # robust across thresholds 0-5
    mult = X.multiplicity(stats.between_arms(ctx["df"]))
    assert (mult["p_holm"] > 0.05).all()            # nothing survives correction
    casing = X.casing_mirror_adherence(ctx["sample"])
    assert casing["mirror_rate"] < 0.10             # model essentially never mirrors casing
