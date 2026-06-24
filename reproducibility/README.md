# Reproducibility package — Integrated Future‑Self Chatbot evaluation

One‑click reproduction of **every result and figure** in the thesis
*“Designing an Integrated User‑Adaptive Future‑Self Chatbot for Career
Exploration”* (Kangzhi Qin, BSc Business Analytics), plus a set of value‑adding
robustness analyses. Built as supporting code for the thesis and for journal
submission.

## What you get

| File | What it is |
|---|---|
| **`Future_Self_Reproduction.ipynb`** | The notebook. *Run All* → loads the data, reproduces the funnel, all five hypothesis tests, the whole‑sample effects, manipulation checks + objective LSM, the exploratory coupling, the coded open‑ended evidence, reliability, and the robustness extensions — then **machine‑checks every number against the thesis** (15/15). |
| **`REPORT.md` / `REPORT.pdf`** | A journal‑style analytical report of the full evaluation (with figures and the new analyses). |
| `futureself/` | A small, readable Python package: `scoring`, `cohort` (data + funnel), `stats`, `lsm`, `qualitative`, `extensions`, `figures`. |
| `figures/` | All regenerated figures (PNG + PDF, 300 dpi). |
| `data/sessions_deidentified.json` | The bundled **de‑identified, numeric‑only** snapshot (no participant free text). |
| `data/coding_pack_codes.json` | Quote‑free hand‑coded labels for the qualitative figures + the reliability pairs. |

## Quick start (zero configuration)

```bash
cd reproducibility
pip install -r requirements.txt
jupyter notebook Future_Self_Reproduction.ipynb     # then Run All
```

With no configuration the notebook reproduces everything from the bundled
de‑identified snapshot. The final cell prints `15/15 checks passed ✅`.

To regenerate the figures and report without Jupyter:

```bash
python - <<'PY'
from futureself import cohort, stats, figures as F
studies, src = cohort.load_studies(); sample, counts = cohort.build_funnel(studies)
df = stats.to_frame(sample); F.fig4_between_arm_forest(stats.between_arms(df))
print("source:", src, "| n =", len(sample), counts["_final_by_arm"])
PY
```

## Reading the live database directly (optional)

The notebook resolves its data source automatically: **live PostgreSQL → deployed
HTTPS export → bundled snapshot**. To read the live study database, copy the
template and fill it in (the file is git‑ignored, so credentials never reach the
repo):

```bash
cp .env.local.example .env.local      # then edit; Run All again
```

* **Option A — direct PostgreSQL:** set `DATABASE_PUBLIC_URL` to the study's connection string.
* **Option B — HTTPS export:** set `STUDY_BASE_URL` + `ADMIN_TOKEN`.

In live mode the funnel, the LSM index, and the casing‑mirror audit are
recomputed **from raw transcripts**; offline they use the precomputed metrics in
the snapshot. Both paths produce identical figures.

## What is reproduced

* **Funnel** 185 → 32 (18 integrated, 14 baseline), exactly as registered (§6.4).
* **Table 2 / Figure 4** between‑arm Cohen's *d*, 95 % CIs, Welch *t*, *p* — all five hypotheses.
* **Figure 6** whole‑sample pre→post effects (d_z); **Figure 5** manipulation checks + objective LSM; **Figure 7** vividness × self‑efficacy coupling.
* **Figures 8–9** coded open‑ended evidence (Cohen's κ = 1.00) and requests for specifics.
* **Reliability** (Cronbach's α / inter‑item r) and **sample descriptives**.
* **Extensions** (new): equivalence/TOST, JZS Bayes factors, minimum‑turn sensitivity (0–5), Holm/BH multiplicity, casing‑mirror adherence, bootstrap CIs.

## Tests

```bash
pip install pytest
pytest -q                      # asserts the reproduced numbers match the thesis
```

## Privacy & ethics

The repository is public and the data are human‑subjects, so the bundled
snapshot ships **no participant free text** — only de‑identified numeric survey
responses for the 32 analysis participants, precomputed text‑derived metrics
(LSM, casing, word counts), and non‑identifying funnel metadata for the other
logged sessions. Names, emails, transcripts, and open‑ended prose are never
written to the repo. See the Data & Ethics statement in `REPORT.md`.

## Regenerating the bundled artifacts

```bash
python build_snapshot.py path/to/export_deidentified.json   # rebuild the snapshot
python _build_notebook.py                                   # rebuild the notebook
```
