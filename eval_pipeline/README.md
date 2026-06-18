# Future-Self Career Chatbot — Evaluation Pipeline

A Python evaluation pipeline for the BSc thesis studying whether an LLM
"persona/digital-twin" can reproduce participant post-chat self-report ratings.

---

## What it is

Students complete a ~30-minute future-self career chatbot study:
pre-survey → career selection → role-play with an LLM as their future self
(phaseC) → post-survey.

This pipeline answers the research question:
> Can an LLM persona/digital-twin, built from a participant's questionnaire,
> reproduce that participant's post-chat self-report ratings — and how do design
> choices (persona depth, prompt structure) affect agreement with human ratings?

**Design**: For each participant, build a persona prompt at a given depth (D0–D2),
feed it the actual phaseC transcript, ask it to fill in the post-survey battery
*as that participant* via **SSR** (Semantic Similarity Rating).

---

## One-command demo (fully offline)

```bash
python -m eval_pipeline.run_demo
# or
python eval_pipeline/run_demo.py
```

Outputs:
- `eval_pipeline/out/report.html` — self-contained HTML report (embedded figures)
- `eval_pipeline/out/results.csv` — per-outcome × per-config metrics table
- `eval_pipeline/out/figures/*.png` — all plots

---

## How to plug in real data

1. Export JSON files from the app (one file per session).
2. Drop them into `eval_pipeline/data/raw/`.
3. Re-run: `python -m eval_pipeline.run_demo`

The loader (`eval_pipeline/loader.py`) reads the canonical app schema directly.
No schema changes needed — the exact field names from the app export are used.

---

## How to enable a real LLM

Real LLM adapters are provided in `eval_pipeline/llm_client.py`.
They are **not** called in the offline demo or tests.

**Anthropic (claude-sonnet-4-6):**
```bash
export ANTHROPIC_API_KEY=your_key_here
```

**OpenAI-compatible (e.g. UvA):**
```bash
export OPENAI_BASE_URL=https://your-endpoint.example.com/v1
export OPENAI_API_KEY=your_key_here
export OPENAI_MODEL=gpt-4o
```

Then in code:
```python
from eval_pipeline.llm_client import get_llm
llm = get_llm(use_real=True)
```

---

## How to swap the embedder

Default: `HashingEmbedder` (char n-gram, deterministic, offline).

For real use:
```python
from eval_pipeline.embedder import SentenceTransformerEmbedder
embedder = SentenceTransformerEmbedder("all-MiniLM-L6-v2")
# pip install sentence-transformers
```

---

## Run tests

```bash
pytest eval_pipeline/tests/ -v
```

---

## Persona depth levels

| Level | Contents | Notes |
|-------|----------|-------|
| D0 | Demographics only | age, gender, year, career |
| D1 | D0 + psychometrics + career | Big Five, RIASEC, values, familiarity |
| D2 | D1 + own words | participant's phaseB user turns |
| D3 | D2 + pre-outcome scores | **LEAKAGE PROBE ONLY** — not a real level |

---

## Metric definitions

| Metric | Description |
|--------|-------------|
| MAE | Mean Absolute Error between predicted and actual continuous ratings |
| Spearman ρ | Rank correlation (level-agreement) |
| QWK | Quadratic-weighted Cohen's κ |
| ICC(2,1) | Intraclass Correlation, two-way random, absolute, single measures |
| Adjacent Acc | % predictions within ±1 of actual rounded rating |
| Bland-Altman | Bias (mean difference) + 95% limits of agreement |
| Δ-correlation | Spearman between (pred_post − actual_pre) and (actual_post − actual_pre) |
| Inter-run SD | Mean per-participant SD across k=5 runs (persona stability) |

All metrics have bootstrap 95% CIs (percentile method, n_boot=1000).

---

## Outcome instruments

- **Continuity (FSCS)**: mean of fscs_similar_post, fscs_connected_post (1–7)
- **Vividness**: mean of viv_clear_post, viv_tangible_post, viv_detail_post, viv_felt_post (1–7)
- **Closeness (IOS)**: ios_post (1–7 single item)
- **Manipulation checks**: mean of mc_style, mc_scene, mc_understand (1–7) — transcript-observable
- **Persuasiveness**: NOT collected by the app — slot reserved, always None in real data

---

## Limitations

1. **Synthetic data only** (demo): All figures/results are from N=24 synthetic sessions.
2. **No test-retest**: Park (2019) normalized accuracy not computable; FSCS r≈.66 (Ersner-Hershfield, 2009) cited as context.
3. **Single judge model**: Only claude-sonnet-4-6 (or FakeLLM) acts as judge.
4. **SSR stub embedder**: Offline demo uses char n-gram hashing; not semantically meaningful.
5. **Persuasiveness not collected**: App does not export persuasiveness.
6. **Small N**: Default N=24 → descriptive only, no inferential testing.
7. **Model fixed**: No cross-model comparison; temperature/seed varied instead.

---

## Project structure

```
eval_pipeline/
├── __init__.py
├── run_demo.py          # One-command demo entry point
├── schema.py            # Field ID constants, outcome definitions, SSR anchors
├── loader.py            # Session JSON loader
├── synth.py             # Synthetic data generator
├── persona.py           # Persona/prompt builder + anti-circularity guard
├── embedder.py          # Pluggable text embedder (default: HashingEmbedder)
├── ssr.py               # Semantic Similarity Rating
├── llm_client.py        # FakeLLM + real LLM adapters
├── pipeline.py          # Core pipeline (session × config × run)
├── metrics.py           # All metrics with bootstrap CIs
├── report.py            # HTML report + CSV + figure generators
├── tests/
│   ├── test_loader.py
│   ├── test_metrics.py
│   ├── test_ssr.py
│   ├── test_anticircularity.py
│   └── test_e2e.py
├── data/
│   └── raw/             # Drop real app JSON exports here
└── out/
    ├── report.html      # Generated report
    ├── results.csv      # Generated CSV
    └── figures/         # Generated plots
```
