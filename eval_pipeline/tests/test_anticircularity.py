"""
Anti-circularity guard tests.

Asserts that no pre-outcome or post-outcome field ID appears in D0-D2 persona prompts.
D3 is explicitly excluded from the check (it's the leakage probe).
"""

import pytest
from eval_pipeline.schema import PRE_OUTCOME_FIELDS, POST_OUTCOME_FIELDS
from eval_pipeline.persona import (
    build_persona_prompt, get_persona_core, assert_no_leakage,
)
from eval_pipeline.synth import SyntheticGenerator


@pytest.fixture(scope="module")
def sample_session():
    gen = SyntheticGenerator(n=1, seed=7)
    sessions = gen.generate()
    s = sessions[0]
    # Simulate loader: add outcomes_pre
    pre = s["preSurvey"]
    import numpy as np
    s["outcomes_pre"] = {
        "continuity": float(np.mean([pre.get("fscs_similar", 4), pre.get("fscs_connected", 4)])),
        "vividness": float(np.mean([pre.get("viv_clear", 4), pre.get("viv_tangible", 4), pre.get("viv_detail", 4), pre.get("viv_felt", 4)])),
        "closeness": pre.get("ios_pre", 4.0),
        "manip_checks": None,
    }
    return s


@pytest.fixture(scope="module")
def all_forbidden_fields():
    return PRE_OUTCOME_FIELDS | POST_OUTCOME_FIELDS


class TestAntiCircularity:

    @pytest.mark.parametrize("depth", ["D0", "D1", "D2"])
    def test_persona_core_no_forbidden_fields(self, sample_session, all_forbidden_fields, depth):
        """Persona core (without item wrapper) must not contain any pre/post outcome field IDs."""
        core = get_persona_core(sample_session, depth)
        for field_id in all_forbidden_fields:
            assert field_id not in core, (
                f"ANTI-CIRCULARITY VIOLATION: field '{field_id}' found in {depth} "
                f"persona core prompt."
            )

    @pytest.mark.parametrize("depth", ["D0", "D1", "D2"])
    @pytest.mark.parametrize("prompt_structure", ["structured", "narrative", "interview"])
    def test_full_prompt_no_forbidden_fields(self, sample_session, all_forbidden_fields,
                                              depth, prompt_structure):
        """Full prompt (core + item wrapper) must not contain pre/post outcome field IDs."""
        prompt = build_persona_prompt(
            session=sample_session,
            depth=depth,
            prompt_structure=prompt_structure,
            item_id="fscs_similar_post",
            item_text="How similar do you feel to your future self?",
            outcome_family="continuity",
        )
        for field_id in all_forbidden_fields:
            assert field_id not in prompt, (
                f"ANTI-CIRCULARITY VIOLATION: field '{field_id}' found in "
                f"{depth}/{prompt_structure} full prompt."
            )

    def test_d3_contains_pre_outcome_scores(self, sample_session):
        """D3 SHOULD contain pre-outcome info (it's the leakage probe)."""
        core = get_persona_core(sample_session, "D3")
        # D3 includes LEAKAGE PROBE text with pre-outcome values
        assert "LEAKAGE PROBE" in core or "ios_pre" in core or any(
            kw in core for kw in ["Pre-session", "leakage", "closeness", "continuity"]
        ), "D3 should include pre-outcome info (leakage probe)"

    def test_assert_no_leakage_raises_on_violation(self):
        """The guard should raise AssertionError if a forbidden field appears."""
        # Plant a forbidden field in a fake D1 prompt
        fake_prompt = "This person has ios_pre=4.5 and fscs_similar=3."
        with pytest.raises(AssertionError) as exc_info:
            assert_no_leakage(fake_prompt, "D1")
        assert "ANTI-CIRCULARITY" in str(exc_info.value)

    def test_assert_no_leakage_passes_clean_prompt(self):
        """Clean prompt should not raise."""
        clean = "This is a 22-year-old Economics student interested in consulting."
        # Should not raise for any of D0, D1, D2
        for depth in ["D0", "D1", "D2"]:
            assert_no_leakage(clean, depth)  # must not raise

    def test_assert_no_leakage_skips_d3(self):
        """D3 leakage probe should never be checked."""
        dirty = "ios_pre=4.5 fscs_similar=3 viv_clear_post=5"
        assert_no_leakage(dirty, "D3")  # must not raise

    @pytest.mark.parametrize("pre_field", list(PRE_OUTCOME_FIELDS))
    def test_each_pre_field_caught(self, pre_field):
        """Each individual pre-outcome field ID triggers the guard."""
        fake_prompt = f"The participant reported {pre_field}=5."
        with pytest.raises(AssertionError):
            assert_no_leakage(fake_prompt, "D2")

    @pytest.mark.parametrize("post_field", list(POST_OUTCOME_FIELDS))
    def test_each_post_field_caught(self, post_field):
        """Each individual post-outcome field ID triggers the guard."""
        fake_prompt = f"The participant's {post_field} was 6."
        with pytest.raises(AssertionError):
            assert_no_leakage(fake_prompt, "D1")
