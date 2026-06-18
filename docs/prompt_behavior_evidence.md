# Prompt-behaviour evidence — length variation & 10-year future grounding

Two role-play effects must be real, not just promised:

1. **Reply length varies** — light/throwaway turns get short replies; only big, open
   questions run longer; no uniform wall of text every turn.
2. **Answers and advice are grounded in the 10-years-future world** — the chosen
   career's tasks/tools/valued skills have changed — **across career types**, not
   just tech (clinical, hands-on and caring work included).

## How this was tested — on the real study model (gpt-5.1)

`test/prompt_behavior_check.mjs` builds the **real** Stage-C system prompt from
`lib/prompt.js`, runs a fixed 8-turn participant script spanning question sizes
through **gpt-5.1 on the UvA proxy** (the study's actual model), and measures each
reply objectively: word-count by turn kind (variation + absolute caps) and a
future-reality detector on the day-to-day/advice turns. It exits non-zero on
regression, so it can gate fielding. Raw transcripts:
`docs/prompt_behavior_evidence/gpt5.1_*.json`.

## What the real-model test caught (and the Claude stand-in had hidden)

Running on gpt-5.1 (not a stand-in) exposed three real problems, since fixed:

| Problem | Before (gpt-5.1) | After (gpt-5.1) |
|---|---|---|
| **Verbose — even light turns were walls** | light/throwaway 74–116w; big/advice 230–465w; max **469w** | short ~39–49w; big/advice ~158–174w; **max ~189w** |
| **Non-tech advice was "timeless"** (teacher: "explain clearly, be patient") | teacher future-grounding **FAIL** | **PASS** (all three careers) |
| **Markdown/list & timestamp-log formatting** ("1) … 2) …", "07:38 — …") | present | gone (flowing prose) |

Fixes (in `lib/prompt.js`): a blunt **primacy** length directive with a one-line
example and hard caps (~110w/3-paragraph ceiling; throwaways get one line;
brevity beats vividness when they conflict; never lists/timestamps); a future
**MUST** that any answer about the work/skills name a concrete decade-shift —
explicitly for clinical/hands-on/caring/creative/trades, not only desk work.

## Measured result on gpt-5.1 (2026-06-18) — PASS

| Career (type) | short-turn mean | big/advice mean | range | varies | not-verbose | future-grounded |
|---|---|---|---|---|---|---|
| Data analyst (analytical) | ~39w | ~174w | 30–188w | ✅ | ✅ | ✅ |
| Registered nurse (clinical) | ~49w | ~158w | 34–189w | ✅ | ✅ | ✅ |
| Primary school teacher (caring) | ~41w | ~169w | 33–185w | ✅ | ✅ | ✅ |

### Representative gpt-5.1 excerpts

- **Length variation (data analyst):** throwaway "lol ok same" → *"Ha, yeah — some
  things really don't change. The overthinking is still here too, it's just…
  better aimed."* (18w); big "what's a normal day" → a 184-word, 3-paragraph scene.
- **Future grounding, analytical:** *"First hour was me and an AI assistant roughing
  out a customer churn dashboard: I sketched the questions, it spat out code and
  charts, I kept poking holes in them."*
- **Future grounding, caring (teacher):** advice now ties to the decade-shift
  (tools handle differentiation/worksheets; the human facilitation became the core)
  rather than timeless "explain clearly".

## Reproduce

```bash
# real study model (gpt-5.1 via the UvA proxy) — set creds in a gitignored .env:
#   LLM_BASE_URL=https://llmproxy.uva.nl/v1
#   UVA_API_TOKEN=<token>
set -a; . ./.env; set +a
node test/prompt_behavior_check.mjs            # generates on gpt-5.1 + measures; non-zero on regression
# or measure transcripts generated elsewhere (dir holds bot_<career>.json):
node test/prompt_behavior_check.mjs --measure docs/prompt_behavior_evidence
```
