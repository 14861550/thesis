# Research-Design & Implementation Plan
## LLM-as-judge ↔ human agreement for IBM-aligned outcomes in a 10-year career future-self chatbot

**Author context:** Gleb Meshkov (14861550), BSc Business Analytics, UvA. Defence 2026-06-24.
**Prepared:** 2026-06 (research-design agent, grounded in the project folder + external literature).

> **Legend — provenance of every claim**
> **[F]** = grounded in the project folder (briefs, `survey.jsx`, `lib/prompt.js`, `app.jsx`, 14-section reference).
> **[L]** = external literature (cited; the four core LLM-judge papers were adversarially verified by the deep-research pass).
> **[P]** = this agent's own proposal / assumption (defeasible; flagged for sign-off where it changes the design).

---

## 0. The one reframing that governs the whole design  [P, built on F+L]

The RQ says "agreement with human evaluation." There are **two non-identical constructs** hiding in that phrase, and conflating them is the project's deepest validity risk:

- **Human rating** = the participant's **internal, felt** state after the session (e.g. "My future self feels tangible and real to me," 7-pt) — a *first-person self-report* **[F: `survey.jsx`]**.
- **LLM-judge rating** = an inference made from the **transcript only** — a *third-person observation* of the conversation's properties.

A judge reading a transcript cannot observe felt continuity; it can at best **predict the participant's self-report from textual evidence**. So the target estimand must be stated as: *"How well can an LLM, given configuration C, predict a participant's post-session self-report rating from the session transcript (± user profile)?"* — not *"does the LLM measure continuity."* Every rubric instruction, metric, and threat below follows from that reframing. This is also the honest framing for the supervisors and is fully **DSR-compatible** (the artifact = the validated predictor pipeline) **[F: brief §4]**.

A direct consequence: the **ceiling on agreement is not 1.0**. It is bounded by (a) how much of the self-report variance is recoverable from text at all, and (b) human test–retest reliability of the instruments themselves. Report agreement *relative to* the human–human / human–self ceiling, never against 1.0 **[L: Zheng et al. 2023 show even human–human agreement on subjective judgements is ~80%, not 100%]**.

---

## 1. Executive summary

- **Estimand:** transcript→self-report predictive agreement, per outcome (continuity, vividness, persuasiveness), across pipeline configurations.
- **Design:** a fully-crossed but small ablation **persona-depth (3–4) × calibration (3) × [judge-model: likely dropped]**, with each (transcript × config) judged **k=5 times** for judge test–retest reliability.
- **Primary metrics:** per-outcome **Spearman ρ**, **quadratic-weighted κ**, **ICC(2,1)**, **exact+adjacent accuracy**, **Bland–Altman bias** — *with bootstrap CIs*, treated as **estimation, not NHST** (N≈20 forbids significance testing) **[F: brief §6; P: metric upgrade]**.
- **Two tracks run in parallel:** (A) **doable now** — build & unit-test the entire pipeline on a **mock/synthetic harness**; (B) **blocked** — everything that needs Thy's (and maybe Kaehl's) human ground truth.
- **Three load-bearing risks:** persuasiveness has **no instrument in the prototype**; judge-model IV likely **blocked** (Sonnet-only); sending transcripts to **external** judge models is a **GDPR/ethics** problem, not just an approval問題.

---

## 2. Phased plan (goal → steps → dependencies), with **doable-now vs blocked** split

### Phase 0 — Lock scope & estimand *(now; 1 day)*
- **Goal:** freeze the estimand (§0), the outcome set, and the IV levels before building.
- **Steps:** write the one-paragraph estimand into the thesis method section; confirm with Shuai/Wendelien that "agreement = transcript→self-report prediction" is acceptable; decide persuasiveness in/out pending Thy (§7).
- **Depends on:** supervisor reply (in flight) **[F: brief §9–10]**.

### Phase 1 — Data contract & harness scaffolding *(now; 2–3 days)* — **DOABLE NOW**
- **Goal:** a runnable pipeline end-to-end on fake data, plus the exact data request to Thy/Kaehl.
- **Steps:**
  1. Adopt the **app's Closure export schema as the canonical record** (it already links transcript↔ratings↔profile per session) **[F: `app.jsx` Closure `study` object]** — see §7 for the field spec.
  2. Build the **mock harness**: generate ~30 synthetic sessions (LLM-simulated students × MAIN/BASELINE prompts from `lib/prompt.js`) with *known, planted* quality levels, and synthetic "human" ratings drawn from a model with controlled noise. This lets every metric, the rubric parser, and the config matrix be unit-tested before any real data arrives **[P; F: brief §6 "synthetic users as robustness layer"]**.
  3. Implement metrics (§6) + the judge-call wrapper against **llmproxy.uva.nl / Sonnet 4.6** **[F: brief §12]**.
- **Depends on:** UvA API token (have, via Jiaqi) **[F]**. *No dependency on human data.*

### Phase 2 — Rubric & calibration construction *(now; 2–3 days)* — **DOABLE NOW**
- **Goal:** per-outcome judge rubrics that mirror the human items (§4) and the three calibration variants (§3.3).
- **Steps:** draft rubric prompts; build anchor exemplars from **synthetic / pilot** transcripts (never from the scored set, §5); implement SSR (semantic-similarity mapping to the survey wording) **[F: Maier et al. 2025]**.
- **Depends on:** Phase 1 harness. *No human data needed.*

### Phase 3 — Dry-run ablation on synthetic data *(now; 2 days)* — **DOABLE NOW**
- **Goal:** prove the config matrix produces sensible, *separable* agreement estimates and surface judge instabilities before spending the scarce real data.
- **Steps:** run persona×calibration×(k=5) on synthetic sessions; compute judge test–retest; sanity-check that planted-high transcripts score higher (construct check); pre-register the analysis script so real-data analysis is push-button **[P]**.

### Phase 4 — Real-data agreement study *(blocked; 2–3 days once data lands)* — **BLOCKED BY DATA**
- **Goal:** the actual answer to the RQ on Thy (+Kaehl) transcripts.
- **Steps:** ingest real records → run the *frozen* pipeline → compute per-outcome agreement per config with bootstrap CIs → ablation (which IV moves agreement) → **failure-mode analysis** (where LLM systematically diverges) **[F: brief §6]**.
- **Depends on:** Thy's transcripts+ratings (mandatory); Kaehl's (optional pooling); ethics clearance for handling/處理 the transcripts (§9).

### Phase 5 — Synthesis & design principles *(blocked; with writing week)*
- **Goal:** DSR design principles for IBM-grounded automated evaluation + honest limitation section.
- **Steps:** translate failure modes into reusable principles; write the Sonnet-only / small-N / construct-mismatch limitations explicitly.

> **Bottom line on sequencing:** ~8–10 working days of Phase 1–3 can be completed **before any human data exists**, so the project is not idle while the data blockers resolve. Only Phase 4–5 are gated.

---

## 3. Operationalizing the three IVs

### 3.1 Persona depth — *recommended levels*  [P, reconciling F+L]
Reframe persona depth as **how much user context the judge receives when predicting that user's self-report** (an information-availability manipulation, not a "synthetic user" claim — synthetic users belong only to the dev harness) **[F: brief §6]**.

| Level | Context given to judge | Purpose |
|---|---|---|
| **D0** | transcript only (reference-free) | floor — what's recoverable from text alone |
| **D1** | + demographics + chosen career | minimal grounding |
| **D2** | + full psychometric profile (BFI-10, RIASEC, work-values) | "deep" persona **[F: `survey.jsx`]** |
| **D3** *(handle with care)* | + **baseline pre-scores** (pre-FSCS, pre-vividness) | tests baseline-anchoring |

- **Recommended primary contrast: D0 vs D2.** Hypothesis (directional, not causal): more user context *can* raise agreement by letting the judge model the rater's frame **[L: persona/context can improve simulation fidelity — Park et al. 2024 generative agents replicate ~85% of GSS responses; but also Lost-in-Simulation / MirrorBench warn of miscalibration & role drift — F brief §11]**.
- **This IV is the thesis's genuine contribution precisely because it is *under-supported*.** The deep-research pass found **no verified source** establishing that supplying a user's persona/profile to a judge improves agreement *with that user's own self-report* (vs. biasing the judge toward the *expected* rather than *actual* response). Frame this as an open empirical question the thesis answers, not a settled benefit **[L: deep-research open-question #3; persona-steering literature did not survive verification on this point]**.
- **D3 is a trap to expose, not a feature to recommend:** because post-scores correlate with baseline, feeding baseline lets the judge "agree" by **regressing on the baseline**, not by reading the transcript — inflated agreement that is really leakage **[P]**. If included, report it explicitly as a *baseline-anchored predictor* comparison and show the transcript's incremental contribution.
- **Alternative considered:** treat persona depth as a synthetic-user generation parameter (shallow/medium/deep simulated students). *Rejected for the agreement DV* — synthetic users have no human self-report to agree with; keep them in the dev harness only **[F: brief §6 secondary]**.

### 3.2 Judge-model selection — *design for the likely block*  [P, F]
**Most probable state: BLOCKED — only Sonnet 4.6 on llmproxy.uva.nl** **[F: brief §6, §9]**. Decision tree:

1. **If Sonnet-only (expected): drop the IV honestly.** Re-allocate the freed design budget to deeper persona×calibration coverage and more k-repeats. State single-judge reproducibility as a named limitation **[L: Verga et al. 2024 "Replacing Judges with Juries" — a *panel* of diverse models reduces intra-model/self bias and tracks humans better than any single judge; Guerdan et al. 2025 (verified) — single forced-choice judge selection can be up to **31% worse** than indeterminacy-aware selection]**.
2. **If 2+ UvA models exist:** run a genuine single-vs-panel contrast (cheapest defensible multi-model design) **[L: Verga 2024]**.
3. **External models by API key:** *only* pending **two** sign-offs — supervisor **and** ethics — because **human transcripts contain free-text PII and leave the UvA boundary** if sent to OpenAI/Anthropic-direct (GDPR data egress) **[P; §9]**. Do not treat this as a mere "approval."
4. **Do NOT relabel decoding/temperature/prompt-format variants as "model selection."** Those are calibration/robustness factors (§3.3); calling them the model IV would misrepresent the design — flag for sign-off if substituted **[P]**.

### 3.3 Calibration strategy — *operational definitions*  [F+L+P]
- **Zero-shot:** rubric + anchored scale wording, single direct numeric rating (baseline) **[L: direct scoring]**.
- **Anchored (few-shot):** rubric + **2–3 exemplar transcripts with reference scores spanning low/mid/high** per outcome, in-context. **Exemplar source (critical):** a small **pilot or synthetic** set, **never** transcripts from the evaluation set (leakage, §5) **[P]**.
- **SSR — Semantic Similarity Rating (Maier et al. 2025):** the model answers the *survey item in natural language* (as the rater would), then the free-text answer is mapped onto the 7-pt scale by **semantic similarity to anchor statements** for each scale point (or a probability-weighted expectation over options) — reported to reach **~90% test–retest reliability** replicating human survey responses **[F: brief §11]**. This is the project's stability play and pairs naturally with the G-Eval probability-weighting idea **[L: Liu et al. 2023 G-Eval — token-probability-weighted scores raise Spearman correlation with humans on subjective NLG quality]**.
- **Orthogonal robustness factor (recommend, don't call it an IV):** **self-consistency / averaging** — sample k=5 ratings and average, to damp the documented instability of LLM raters **[L: Wang et al. 2022 self-consistency; Stureborg et al. 2024]**. **Caveat (verified):** averaging is established to improve the rater's *internal stability*, but evidence it improves *human agreement* is weak — treat the agreement benefit as an open question, not an assumption **[L: deep-research open-question #1; Wang 2022 establishes stability only]**.
- **Calibrate expectations — gains are modest [verified]:** SOTA prompted calibration moves human correlation only a little (AutoCalibrate: SummEval Spearman 0.493→0.529, NewsRoom 0.578→0.638, QAGS 0.643→0.703 — ~0.03–0.06, 7–15% relative; G-Eval's probability-weighting: 0.502→0.514) **[L: Liu et al. 2023 G-Eval 2303.16634; AutoCalibrate 2309.13308]**. **Implication:** at **N≈20** a calibration effect of ~0.05 Spearman is **smaller than the CI width** — the study likely *cannot* statistically separate the three calibration variants. Report the contrast descriptively and say so plainly **[P]**.

---

## 4. Rubric design (mirror the human items)  [F-anchored + P]
**Principle:** one rubric per outcome, whose scale and wording are a near-isomorphic mirror of the participant instrument, so judge and human live on the **same scale** **[F: `survey.jsx`]**.

- **Continuity** — mirror the 3 adapted-FSCS items (similar / connected / care), 7-pt "Not at all → Completely." Judge instruction (reframed per §0): *"From this transcript (and profile), estimate how this specific participant would rate each item about their future self."* Score each sub-item; continuity = mean **[F]**.
- **Vividness** — mirror the 4 items (clear / tangible / detailed daily life / felt experience), 7-pt agree **[F]**.
- **Persuasiveness** — **NO prototype instrument exists** **[F: `survey.jsx` has none]**. Must adopt **Thy's exact item(s)** verbatim once shared; until then, mark persuasiveness *provisional* and build the rubric slot but do not finalize wording **[P; F: brief §7 "mandatory if persuasiveness retained"]**.
- **Reliability controls:** k=5 repeats → judge internal consistency (ICC across repeats) + Krippendorff's α across the sub-items **[L+P]**.
- **Bias controls:** fixed item order with **order-swap robustness check** (position bias) **[L: Wang et al. 2023, "LLMs are not fair evaluators," 2305.17926 — verified]**; forbid the judge from seeing the condition label (MAIN/BASELINE) or any score; neutral, non-leading rubric phrasing to curb sycophancy/verbosity bias **[L: Koo et al. 2023 cognitive-bias benchmark]**.
- **Indeterminacy:** allow the judge to express uncertainty (e.g., a response-set / "could be 4 or 5") rather than forced single choice, then aggregate — directly motivated by **[L: Guerdan et al. 2025 (verified) — forced-choice validation mis-selects judges]**.

---

## 5. Experimental design  [P + F]
- **Conditions matrix:** persona-depth {D0,D2(,D1,D3)} × calibration {zero-shot, anchored, SSR} × judge-model {Sonnet} × **k=5 repeats**. With the model IV dropped: **3×3×5 = 45 judge calls per transcript per outcome** → for N≈20 transcripts × 3 outcomes ≈ **2,700 calls** (trivial cost on the UvA API) **[P]**.
- **Within vs between:** the **transcript is the unit**; every config rates **every** transcript (fully within-transcript) → use **paired** comparisons of agreement across configs (more powerful at small N than between-config) **[P]**.
- **Judge stability:** k=5 at fixed temperature; report mean rating + within-config SD as the judge's test–retest reliability **[L: Stureborg 2024]**.
- **Leakage / overfitting guards (small-N is fragile):**
  - Anchored exemplars come from a **disjoint** pilot/synthetic pool, never the scored transcripts **[P]**.
  - **No parameter is fit to the human data** (no threshold tuning, no prompt selection by maximizing agreement on the test set). If any prompt selection happens, use **leave-one-transcript-out** **[P]**.
  - Pre-register/freeze the rubric + analysis before touching real data (Phase 3) **[P]**.

---

## 6. Agreement metrics & analysis  [P upgrade of F + L]
The brief lists Pearson / MAE / Krippendorff α / direction agreement **[F: brief §6]**. For **ordinal Likert at small N**, upgrade to:

| Metric | What it captures | Why (small-N ordinal) |
|---|---|---|
| **Spearman ρ** | monotonic rank agreement | robust to scale nonlinearity; primary |
| **Quadratic-weighted Cohen's κ** | ordinal exact-ish agreement, chance-corrected, penalizes by distance² | standard for graded ratings **[L: Cohen 1968]** |
| **ICC(2,1)** (two-way random, single rater, absolute agreement) | judge-as-replacement-rater reliability | correct ICC form for "one judge vs one human" **[L: Shrout & Fleiss 1979; Koo & Li 2016 bands: <.5 poor, .5–.75 moderate, .75–.9 good]** |
| **Exact + adjacent (±1) accuracy** | practical "close enough" | interpretable for stakeholders |
| **Bland–Altman bias + limits of agreement** | *systematic* over/under-scoring | reveals direction of judge bias, not just spread **[L: Bland & Altman 1986]** |
| **Krippendorff α** | reliability incl. missing data | keep from brief **[F]** |

- **Direction agreement** (high/low split) retained as a coarse, robust fallback **[F]**.
- **Per-outcome, never pooled** across continuity/vividness/persuasiveness (different constructs & scales) **[F]**.
- **Reporting stance — estimation, not NHST:** with **N≈20** (Thy ~10 + Kaehl ~10) **[F: brief §6]**, a single Spearman ρ≈0.5 carries a 95% CI of roughly **[0.05, 0.78]** — too wide for significance claims. Report **bootstrap CIs** and compare configs by **CI overlap / paired bootstrap differences**, framed as **hypothesis-generating** **[P; consistent with F "descriptive correlation, not significance"]**.
- **Power reality:** ~10/group detects only **d≥1.0** **[F: brief §12]**; ICC/κ need ~30–50 subjects for tight CIs **[L: Bonett 2002]** → explicitly state the study **cannot** rank close configurations, only detect large agreement gaps. Silent truncation of this caveat would misrepresent the evidence **[P]**.
- **Correlation alone is insufficient [verified]:** a judge can hit r=0.95 yet be systematically 0.3 points harsh/lenient. Use the two-step protocol: screen on **r ≥ 0.80**, then report a **chance-corrected** coefficient **[L: "Judge's Verdict," NVIDIA 2025, arXiv:2510.09738]**.
- **Coefficient choice is not neutral [verified]:** QWK, ICC, Pearson, Spearman, Kendall τ-b cluster tightly; **unweighted and linearly-weighted κ run much lower and can diverge to ~0** — so use **QWK or ICC, never unweighted/linear κ**, and **pre-register the coefficient** **[L: Warrens 2021, J. Classification]**. (The over-claim that the four correlation-type coefficients are *interchangeable* was **refuted** in verification — report several, don't treat them as equivalent.)
- **QWK prevalence/ceiling paradox [verified] — acute here:** with skewed/ceiling-heavy ratings (likely: students rate future-self items high), QWK can read **0.488 at 99.8% raw agreement** and swing with base-rate at constant percent agreement **[L: Sundararajan & Pirgovi, EDM 2023; Feinstein & Cicchetti 1990; Byrt et al. 1993]**. → **Never rely on a single 0.70 κ cutoff.** Always pair κ with **percent + adjacent agreement, Bland–Altman signed bias, and a prevalence-adjusted κ (PABAK)**, and report the rating distributions first **[P+L]**.
- **Realistic ceiling [verified]:** even SOTA judges are imperfect — GPT-4 >80% pairwise agreement holds **only with ties excluded on open-ended chat** and falls to **~63% in harder/subjective settings**; G-Eval's *absolute* human correlation is only **0.514** **[L: Zheng 2023 2306.05685; "Trust or Escalate" ICLR 2025 2407.18370; G-Eval 2303.16634]**. Calibrate the thesis's claims and report agreement **relative to your own measured human–human ceiling**, not to 1.0 **[L: "Judge's Verdict" — report human–human κ as the benchmark]**.

---

## 7. Data & inputs  [F-anchored]
### 7.1 Exact request to Thy (mandatory) / Kaehl (optional)  [P, schema from F: `app.jsx`]
Request **one JSON record per session** matching the prototype's Closure export (or a CSV with these fields), keyed by a shared **`session_id`**:

```
session_id, condition(main|baseline),
profile: {age, gender, year, bigFive{O,C,E,A,N}, riasec{R,I,A,S,E,C}, values[]},
career,
transcript: [{role, text, ts}],            # full Phase-C dialogue, ordered
human_ratings: {
   continuity: {fscs_similar, fscs_connected}                 # 7-pt
   vividness:  {viv_clear, viv_tangible, viv_detail, viv_felt} # 7-pt
   persuasiveness: {<Thy's exact items + wording + scale>}     # REQUIRED from Thy
   (optional) baseline: {pre-FSCS, pre-vividness}              # for D3 only
}
```
Ask Thy explicitly for: **(a) the persuasiveness item wording + scale** (no prototype equivalent), **(b)** confirmation the FSCS/vividness items are the *same wording* as `survey.jsx`, **(c)** anonymized free-text (§9) **[F: brief §7, §9]**.

### 7.2 Pooling Thy + Kaehl  [F+P]
Poolable for **continuity + vividness only**, and **only if items are identical** (FSCS exact form, vividness wording) **[F: brief §9 "measurement alignment"]**. Persuasiveness cannot be pooled (Kaehl lacks it). If wording differs, **rank-normalize within study** before pooling and report pooled + per-study **[P]**. Andrea's CDSE-SF data is a different construct — exclude **[F: brief §7]**.

### 7.3 What proceeds **now** without data  [P]
The entire **mock/synthetic harness** (Phase 1–3): pipeline, rubric, calibration variants, metrics, config matrix, judge-stability analysis, frozen analysis script. Real data then flows through an unchanged pipeline.

---

## 8. Validity-threats table (threat → severity → mitigation → falsification check)

| # | Threat | Sev. | Mitigation | Falsification check |
|---|---|---|---|---|
| 1 | **Construct mismatch** — transcript-observable ≠ felt self-report (§0) | **High** | reframe estimand as prediction; bound agreement by human reliability | If judge agreement ≈ human–human ceiling on *behaviorally-gradable* items but collapses on *felt* items, mismatch confirmed |
| 2 | **Persuasiveness has no prototype instrument** | **High** | adopt Thy's exact item; mark provisional till shared | If Thy's item is idiosyncratic/low-reliability, persuasiveness agreement is uninterpretable |
| 3 | **Single-judge (Sonnet-only)** | **High** | drop model IV honestly; cite single-judge limits; k=5 stability | Re-run a subset on any 2nd model later; large divergence ⇒ single-judge conclusions fragile **[L: Verga 2024; Guerdan 2025]** |
| 4 | **Small N≈20** → unstable coefficients | **High** | estimation+bootstrap CIs; paired within-transcript; no NHST | If CIs for all configs overlap, "which design wins" is unanswerable — report as such |
| 5 | **Leakage** (anchors/baseline/tuning on test set) | High | disjoint anchor pool; LOO; no fit-to-human; D3 quarantined | If D3≫D0 but transcript-ablation shows ~0 incremental signal ⇒ leakage, not understanding |
| 6 | **Scale non-comparability** judge↔human | Med | mirror items verbatim; rank-based metrics (Spearman/QWK) | Bland–Altman shows constant offset ⇒ recalibrate, not re-conclude |
| 7 | **Range restriction / ceiling** (students rate high) | Med | report rating distributions; rank metrics; ensure MAIN/BASELINE spread **[F]** | If human ratings have SD≈0, correlation is undefined — flag, don't impute |
| 8 | **Judge biases** (position, verbosity, self-preference, sycophancy) | Med | order-swap check; neutral rubric; hide condition/scores | Swap changes scores >1 pt ⇒ position bias material **[L: Wang 2305.17926; Koo 2309.17012; self-preference Panickssery 2024]** |
| 9 | **Prompt sensitivity** | Med | freeze prompts pre-data; report SD over k | Paraphrase rubric ⇒ if agreement swings, sensitivity confirmed **[L: Stureborg 2024]** |
| 10 | **Circularity** if synthetic data leaks into evaluation | Med | synthetic strictly dev-only; never in real-agreement numbers | Any synthetic record in the agreement table = invalid |
| 11 | **PII egress** to external judge models | **High** | keep judging on UvA API; anonymize before any egress; ethics sign-off | If any transcript with PII hits a non-UvA endpoint pre-anonymization ⇒ breach (§9) |

---

## 9. Ethics & data handling  [F+P]
- **Free-text PII:** open-ended post items (`oe_real`, `oe_broke`, `oe_voice`, `oe_shift`) and the **contact email** field collect names/places/contact info **[F: `survey.jsx`]**. Transcripts also contain self-disclosed specifics (the MAIN prompt elicits names/places) **[F: `lib/prompt.js`]**. → **De-identify before analysis**: strip the email/contact field, run NER-based redaction of names/locations in transcripts + free-text, manual spot-check.
- **Storage:** keep human ground-truth on UvA-controlled storage; no transcripts on personal external services; judging via **llmproxy.uva.nl only** unless anonymized + approved **[P; F: brief §12]**.
- **Egress rule:** external judge models require anonymization **and** ethics+supervisor sign-off (ties to threat #11, IV §3.2).
- **Ethics owner gap:** **no team-level ethics owner is assigned** **[F: brief §9]** — this is a **blocking governance item**, not paperwork; it must be assigned before Phase 4 ingest. Put it top of the decisions register.

---

## 10. Decisions register (needs Gleb/Mak + supervisor sign-off)

| # | Open decision | Owner | Blocks | Default if unanswered |
|---|---|---|---|---|
| D1 | Approve estimand reframing "agreement = transcript→self-report prediction" | Shuai/Wendelien | framing of whole thesis | proceed with reframing, flag in limitations **[F §10 email in flight]** |
| D2 | Persuasiveness in/out + exact instrument | Thy + supervisors | rubric, ground truth | keep continuity+vividness solid; persuasiveness provisional **[F §7]** |
| D3 | UvA API: ≥2 models or Sonnet-only? | Jiaqi | judge-model IV | assume Sonnet-only, drop IV **[F §9]** |
| D4 | Kaehl shares transcripts+ratings? instruments aligned? | Kaehl | pooling / N | proceed Thy-only, Kaehl as bonus **[F §7]** |
| D5 | External judge models allowed (with anonymization+ethics)? | supervisors+ethics | model IV option 3 | no egress; UvA-only **[§9]** |
| D6 | **Assign team ethics owner** | team | Phase 4 ingest | **must assign — hard block** **[F §9]** |
| D7 | PR1: resubmit old (temporal-distance) vs rewrite for final RQ | Jiaqi | admin | ask Jiaqi; default rewrite-lite **[F §9]** |

---

## 11. Where the thesis contributes — verified literature gaps  [L: deep-research open questions]
The deep-research pass surfaced four gaps with **no surviving direct evidence** — each is a defensible contribution claim:
1. Does sampling/averaging stochastic ratings improve **human agreement** on subjective Likert DVs, or only the rater's internal stability?
2. What **minimum N / CI width** stabilizes QWK/ICC at tens–low-hundreds for ceiling-prone ordinal self-report? (no concrete small-N guidance exists)
3. Does supplying the user **persona/profile** to the judge improve agreement with that user's **own** self-report, or bias it toward the *expected* response?
4. Do agreement results from **NLG/pairwise/answer-accuracy** benchmarks transfer to **first-person affective/identity** constructs (continuity/vividness/persuasiveness)? — no direct evidence found.
> **External-validity caveat [verified]:** essentially all numeric agreement figures in the literature come from NLG/summarization or RAG answer-accuracy with reference annotations and 3-point/pairwise scales — **not** small-N ordinal Likert self-report on subjective constructs. Treat every imported threshold (0.70/0.80) as an assumption, and pin judge model version + date (proprietary judges drift) **[L: deep-research caveats; survey 2401.07103; "Judging the Judges" 2406.07791]**.

## 12. References (external; ★ = adversarially verified in this pass)
- ★ Zheng et al. 2023. *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena.* arXiv:2306.05685 (NeurIPS). — GPT-4 >80% human agreement ≈ human–human.
- ★ Liu et al. 2023. *G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment.* arXiv:2303.16634 / EMNLP 2023. — probability-weighted scoring ↑ Spearman; LLM-text self-bias.
- ★ Wang et al. 2023. *Large Language Models are not Fair Evaluators.* arXiv:2305.17926. — position bias + swap/calibration mitigations.
- ★ Guerdan et al. 2025. *Validating LLM-as-a-Judge Systems under Rating Indeterminacy.* arXiv:2503.05965 (NeurIPS 2025). — forced-choice validation selects judges up to 31% worse; use response-set ratings.
- ★ "Trust or Escalate" (LLM judges with provable guarantees), ICLR 2025. arXiv:2407.18370. — GPT-4 ~63.2% human agreement without abstention (subjective-setting realism).
- ★ AutoCalibrate (Liu et al.), LREC-COLING 2024. arXiv:2309.13308. — gradient-free criteria calibration; modest gains (SummEval 0.493→0.529).
- ★ "Judge's Verdict" (NVIDIA), 2025. arXiv:2510.09738. — correlation insufficient; two-step r≥0.80 then κ; report human–human κ ceiling.
- ★ Survey of LLM-as-judge. arXiv:2401.07103. — bias catalogue + prompt sensitivity.
- ★ "Judging the Judges." arXiv:2406.07791 (IJCNLP 2025). — judge-model choice is the strongest driver of position bias (15 models).
- ★ Self-Preference Bias in LLM-as-a-Judge. arXiv:2410.21819. — models favour own outputs ~10–25% more.
- ★ Warrens 2021. *A Comparison of Reliability Coefficients for Ordinal Rating Scales.* J. Classification 38(3). — QWK/ICC/Pearson/Spearman/τ-b cluster; avoid unweighted/linear κ.
- ★ Sundararajan & Pirgovi, EDM 2023. — QWK prevalence paradox (0.488 at 99.8% agreement).
- Feinstein & Cicchetti 1990 (kappa paradox); Byrt et al. 1993 (PABAK / prevalence-bias-adjusted κ).
- Verga et al. 2024. *Replacing Judges with Juries (PoLL).* arXiv:2404.18796. — diverse panel > single judge; less intra-model bias.
- Wang et al. 2022. *Self-Consistency.* arXiv:2203.11171 (ICLR 2023). — stability gains (agreement gains unproven).
- Stureborg et al. 2024. *LLMs are Inconsistent and Biased Evaluators.* arXiv:2405.01724.
- Koo et al. 2023. *Benchmarking Cognitive Biases in LLMs as Evaluators.* arXiv:2309.17012.
- Panickssery et al. 2024. *LLM Evaluators Recognize and Favor Their Own Generations.* arXiv:2404.13076 (NeurIPS 2024).
- Maier et al. 2025. *Semantic Similarity Rating (SSR).* — ~90% test–retest (folder ref; verify full cite).
- Park et al. 2024. *Generative Agent Simulations of 1,000 People.* — ~85% GSS self-replication (folder ref).
- Stats: Shrout & Fleiss 1979 (ICC); Koo & Li 2016 (ICC bands); Cohen 1968 (weighted κ); Landis & Koch 1977; Krippendorff (α); Bland & Altman 1986; Bonett 2002 (ICC sample size).

> The ★ items were adversarially verified in this pass (23/25 claims confirmed 3-0; 2 over-generalized claims killed). Two findings rest on a single peer-reviewed source (AutoCalibrate 2309.13308; Judge's Verdict 2510.09738) — flagged. Non-★ arXiv IDs (Verga, Stureborg, Koo, Panickssery, SSR) should be double-checked before the bibliography is final.
