/*
 * survey.jsx — validated pre/post instruments (Status Brief §2.5, §3.4, §3.7) and a
 * small data-driven renderer. Pre-survey = Phase A; post-survey runs after Phase C.
 *
 * Instruments: BFI-10 (Rammstedt & John, 2007), Schwartz-aligned work values,
 * RIASEC 6-item interest screen, a single IOS closeness item, and a 4-item
 * future-self vividness scale. Pre/post use the SAME closeness/vividness items for
 * comparability. (The earlier two-item FSCS continuity pair was dropped on
 * supervisor feedback — 14 Jun 2026 — as it read as redundant with the IOS item;
 * closeness is now the IOS measure alone.) The future-self referent is kept generic
 * ("about 10 years from now") because the career is chosen later, in Phase B.
 *
 * All components destructure React hooks inside function scope (the no-build setup
 * runs each .jsx as a separate script; top-level declarations are shared, so we
 * avoid colliding hook bindings by scoping them locally).
 */

// --- Instrument definitions ------------------------------------------------

// Personality — TIPI, Ten-Item Personality Inventory (Gosling, Rentfrow & Swann,
// 2003; free for research use). 10 items, 2 per trait (one reversed each),
// administered with the ORIGINAL instruction + 7 labelled anchors (Build Plan
// §10.1a — original-instruments rule). Stem: "I see myself as:". Scoring §9:
// reversed = 8 − raw; trait = mean of its 2 items, natively /7. The fourth
// dimension is Emotional Stability (TIPI's native direction), not Neuroticism.
const TIPI_INSTRUCTION = 'Here are a number of personality traits that may or may not apply to you. Please indicate the extent to which you agree or disagree with that statement. You should rate the extent to which the pair of traits applies to you, even if one characteristic applies more strongly than the other.';
const TIPI = [
  { id: 'tipi_1', text: 'Extraverted, enthusiastic.', trait: 'E', reverse: false },
  { id: 'tipi_2', text: 'Critical, quarrelsome.', trait: 'A', reverse: true },
  { id: 'tipi_3', text: 'Dependable, self-disciplined.', trait: 'C', reverse: false },
  { id: 'tipi_4', text: 'Anxious, easily upset.', trait: 'ES', reverse: true },
  { id: 'tipi_5', text: 'Open to new experiences, complex.', trait: 'O', reverse: false },
  { id: 'tipi_6', text: 'Reserved, quiet.', trait: 'E', reverse: true },
  { id: 'tipi_7', text: 'Sympathetic, warm.', trait: 'A', reverse: false },
  { id: 'tipi_8', text: 'Disorganized, careless.', trait: 'C', reverse: true },
  { id: 'tipi_9', text: 'Calm, emotionally stable.', trait: 'ES', reverse: false },
  { id: 'tipi_10', text: 'Conventional, uncreative.', trait: 'O', reverse: true },
];
const TIPI_SCALE = {
  points: 7, left: 'Disagree strongly', right: 'Agree strongly',
  anchors: ['1 = Disagree strongly', '2 = Disagree moderately', '3 = Disagree a little',
    '4 = Neither agree nor disagree', '5 = Agree a little', '6 = Agree moderately', '7 = Agree strongly'],
};

// Work values — O*NET Work Values (US DOL; public domain). 6 items, rated 1–7
// for importance; the top 3 are fed to the AI (Build Plan §10.1b). [FLAG] this
// deviates from the brief's Schwartz PVQ → needs Shuai & Wendelien sign-off.
const WORK_VALUE_ITEMS = [
  { id: 'val_achievement', name: 'Achievement', text: 'Achievement — using your abilities and seeing the results of your effort; a sense of accomplishment' },
  { id: 'val_independence', name: 'Independence', text: 'Independence — working on your own and making your own decisions' },
  { id: 'val_recognition', name: 'Recognition', text: 'Recognition — advancement, leadership, prestige, and being looked up to' },
  { id: 'val_relationships', name: 'Relationships', text: 'Relationships — friendly co-workers, being of service to others, and work that fits your values' },
  { id: 'val_support', name: 'Support', text: 'Support — supportive management that stands behind you and treats people fairly' },
  { id: 'val_conditions', name: 'Working Conditions', text: 'Working Conditions — job security, good pay, comfortable conditions, and variety' },
];
const VALUE_SCALE = { points: 7, left: 'Not important', right: 'Extremely important' };

// Interests — RIASEC, one item per Holland type, 1–7 (Build Plan §10.1c;
// descriptions grounded in public O*NET / Holland definitions).
const RIASEC = [
  { id: 'ria_R', key: 'R', text: 'Realistic — hands-on, practical work with tools, machines, plants, animals, or things you can build or fix' },
  { id: 'ria_I', key: 'I', text: 'Investigative — working with ideas: analyzing problems, investigating, and figuring out how things work' },
  { id: 'ria_A', key: 'A', text: 'Artistic — creative, expressive work: designing, writing, performing, or coming up with original ideas' },
  { id: 'ria_S', key: 'S', text: 'Social — working with people: helping, teaching, advising, or caring for others' },
  { id: 'ria_E', key: 'E', text: 'Enterprising — leading, persuading, or selling: starting things and influencing people toward a goal' },
  { id: 'ria_C', key: 'C', text: 'Conventional — organized work with clear procedures: handling data, details, records, and keeping things in order' },
];
const RIASEC_SCALE = { points: 7, left: 'Not interested', right: 'Extremely interested' };

// Future-self measures (same items pre and post). Closeness is the single IOS
// circles item (below); the former two-item FSCS continuity pair was removed on
// supervisor feedback (14 Jun 2026) as redundant with it.
const VIVIDNESS = [
  { id: 'viv_clear', text: 'I can picture my future self clearly.' },
  { id: 'viv_tangible', text: 'My future self feels tangible and real to me, not abstract.' },
  { id: 'viv_detail', text: "I can imagine specific details about my future self's life." },
  { id: 'viv_felt', text: 'When I think about my future self, I can almost feel what it would be like.' },
];
const AGREE7 = { points: 7, left: 'Strongly disagree', right: 'Strongly agree' };

// Manipulation checks — verbatim from Build Plan §10.2.
const MANIPULATION = [
  { id: 'mc_style', text: 'My future self spoke in a way that felt like my own way of talking.' },
  { id: 'mc_scene', text: 'My future self described their life through specific, concrete moments rather than vague generalities.' },
  { id: 'mc_understand', text: 'My future self seemed to genuinely understand my current situation and who I am.' },
];
// Open-ended — exactly 2 (supervisor instruction, Build Plan §10.2). Dropped:
// "did the voice remind you of yourself" (redundant with manipulation check 1)
// and "what shifted in how you picture yourself" (carried by CDSE/CIP).
const OPEN_ENDED = [
  { id: 'oe_real', text: 'Which moment in the conversation made you most feel this was genuinely your future self? What made it feel real?' },
  { id: 'oe_broke', text: 'Was there any moment that broke the feeling — that made the future self feel fake, generic, or off? What happened?' },
];

// Distal outcome 1 — Career decision self-efficacy: CDSE-SF Self-Appraisal
// subscale (Betz, Klein & Taylor, 1996). Pre AND post; original stem + 5-level
// confidence scale verbatim. NOT fed to the AI. [VERIFY] all five items against
// the licensed instrument (Mind Garden) before fielding (Build Plan §10.1i).
const CDSE_STEM = 'How much confidence do you have that you could:';
const CDSE_SA_ITEMS = [
  { id: 'cdse_1', text: 'Accurately assess your abilities.' },
  { id: 'cdse_2', text: 'Determine what your ideal job would be.' },
  { id: 'cdse_3', text: 'Decide what you value most in an occupation.' },
  { id: 'cdse_4', text: 'Figure out what you are and are not ready to sacrifice to achieve your career goals.' },
  { id: 'cdse_5', text: 'Define the type of lifestyle you would like to live.' },
];
const CDSE_SCALE = {
  points: 5, left: 'No confidence at all', right: 'Complete confidence',
  anchors: ['1 = No confidence at all', '2 = Very little confidence', '3 = Moderate confidence',
    '4 = Much confidence', '5 = Complete confidence'],
};

// Distal outcome 2 — Career indecision: CIP-Short-5, Choice/Commitment-Anxiety
// subscale (Xu & He, 2022). Pre AND post; original 6-point scale (higher = more
// indecision). NOT fed to the AI. [VERIFY — BLOCKING] three items below are
// placeholders until the exact five CCA items are copied verbatim from
// Xu & He (2022), J. Career Assessment 30(4) — see Build Plan §10.1j.
const CIP_CCA_ITEMS = [
  { id: 'cip_1', text: 'I often feel nervous when thinking about choosing a career.' },
  { id: 'cip_2', text: 'I am reluctant to commit myself to a particular career direction.' },
  { id: 'cip_3', text: '[PENDING — insert verbatim from Xu & He (2022)]' },
  { id: 'cip_4', text: '[PENDING — insert verbatim from Xu & He (2022)]' },
  { id: 'cip_5', text: '[PENDING — insert verbatim from Xu & He (2022)]' },
];
const CIP_SCALE = { points: 6, left: 'Complete disagreement', right: 'Strong agreement' };
if (CIP_CCA_ITEMS.some((i) => i.text.includes('PENDING'))) {
  console.warn('[CIP-CCA] Placeholder items present — the study is NOT fieldable until the five verbatim items from Xu & He (2022) are inserted into CIP_CCA_ITEMS.');
}

// --- Field renderers -------------------------------------------------------

function ScaleRow({ id, text, scale, value, onChange }) {
  const pts = Array.from({ length: scale.points }, (_, i) => i + 1);
  return (
    <div className="sv-scale">
      <div className="sv-scale-text">{text}</div>
      <div className="sv-scale-row">
        <span className="sv-scale-end">{scale.left}</span>
        <div className="sv-scale-pts">
          {pts.map((p) => (
            <button
              key={p}
              type="button"
              className={`sv-pt ${value === p ? 'on' : ''}`}
              onClick={() => onChange(id, p)}
              aria-label={`${p}`}
            >{p}</button>
          ))}
        </div>
        <span className="sv-scale-end">{scale.right}</span>
      </div>
    </div>
  );
}

function LikertGrid({ items, scale, prefix, answers, onChange }) {
  return (
    <div className="sv-grid">
      {/* Original-instruments rule (§16): when a scale defines verbatim anchor
          labels (TIPI 7, CDSE-SA 5), show the full legend once for the block. */}
      {scale.anchors && (
        <div className="sv-anchors">{scale.anchors.join('   ·   ')}</div>
      )}
      {items.map((it) => (
        <ScaleRow
          key={it.id}
          id={it.id}
          text={prefix ? `${prefix} ${it.text}` : it.text}
          scale={scale}
          value={answers[it.id]}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

/* Seven pairs of overlapping (Euler) circles — the response format for the IOS
 * closeness item (Build Plan §10.1d). Left circle = "You now", right = "You in
 * 10 years"; overlap grows monotonically 1→7. */
function CirclesField({ id, text, hint, value, onChange }) {
  const opts = Array.from({ length: 7 }, (_, i) => i + 1);
  return (
    <div className="sv-ios">
      <div className="sv-scale-text">{text}</div>
      {hint && <div className="sv-hint" style={{ marginBottom: 6 }}>{hint}</div>}
      <div className="sv-ios-row">
        {opts.map((n) => {
          // Two equal circles whose centre distance shrinks MONOTONICALLY from
          // 1 (apart) to 7 (almost one). The old version overshot and converged
          // at 3 then separated again, so 1≈6 and 2≈5 looked identical.
          const r = 12, cy = 15, cx = 32, dMax = 28, dMin = 5;
          const dist = dMax - ((n - 1) / 6) * (dMax - dMin);
          const lx = cx - dist / 2, rx = cx + dist / 2;
          return (
            <button
              key={n}
              type="button"
              className={`sv-ios-opt ${value === n ? 'on' : ''}`}
              onClick={() => onChange(id, n)}
              aria-label={`Closeness ${n}`}
            >
              <svg width="60" height="30" viewBox="0 0 64 30">
                <circle cx={lx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx={rx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <span className="sv-ios-num">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="sv-ios-ends">
        <span>Completely separate</span>
        <span>Almost completely overlapping</span>
      </div>
      <div className="sv-ios-legend">Left circle = you now · right circle = you in 10 years</div>
    </div>
  );
}

/* IOS adapted to the future self (Aron et al., 1992) — single circles item. */
function IOSField({ id, value, onChange, career }) {
  return (
    <CirclesField id={id} value={value} onChange={onChange}
      text={`Pick the pair of circles that best shows how CLOSE AND OVERLAPPING you feel with your future self${career ? ` as a ${career}` : ''}.`}
      hint="Close and overlapping = how much that future person feels part of who you are." />
  );
}

function ChoiceField({ id, options, value, onChange }) {
  return (
    <div className="sv-choices">
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const lbl = typeof o === 'string' ? o : o.label;
        return (
          <button key={val} type="button"
            className={`sv-choice ${value === val ? 'on' : ''}`}
            onClick={() => onChange(id, val)}>{lbl}</button>
        );
      })}
    </div>
  );
}

function MultiField({ id, options, pick, value, onChange }) {
  const sel = Array.isArray(value) ? value : [];
  const toggle = (v) => {
    if (sel.includes(v)) onChange(id, sel.filter((x) => x !== v));
    else if (sel.length < pick) onChange(id, [...sel, v]);
  };
  return (
    <div>
      <div className="sv-multi">
        {options.map((o) => (
          <button key={o} type="button"
            className={`sv-choice ${sel.includes(o) ? 'on' : ''}`}
            disabled={!sel.includes(o) && sel.length >= pick}
            onClick={() => toggle(o)}>{o}</button>
        ))}
      </div>
      <div className="sv-hint">{sel.length}/{pick} chosen</div>
    </div>
  );
}

// --- Section builders (return {title, intro, render, isComplete}) ----------

function sectionComplete(ids, answers) {
  return ids.every((id) => {
    const v = answers[id];
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '' && v !== null;
  });
}

function buildPreSections(answers, onChange) {
  const set = (id, v) => onChange(id, v);
  return [
    {
      title: 'A little about you',
      intro: 'This prototype is for Economics & Business students at the UvA.',
      ids: ['age', 'gender', 'year', ...(answers.year === 'Something else' ? ['year_custom'] : [])],
      node: (
        <div className="sv-section">
          <label className="sv-field">
            <span className="sv-label">Age</span>
            <input className="sv-input" type="number" min="16" max="80"
              value={answers.age || ''} onChange={(e) => set('age', e.target.value)} />
          </label>
          <div className="sv-field">
            <span className="sv-label">Gender</span>
            <ChoiceField id="gender" value={answers.gender} onChange={set}
              options={['Woman', 'Man', 'Non-binary', 'Prefer not to say']} />
          </div>
          <div className="sv-field">
            <span className="sv-label">Where are you in your studies?</span>
            <ChoiceField id="year" value={answers.year} onChange={set}
              options={['First year', 'Second year', 'Third year', 'Something else']} />
          </div>
          {answers.year === 'Something else' && (
            <label className="sv-field">
              <span className="sv-label">Which year? (a number)</span>
              <input className="sv-input" type="number" min="1" max="10"
                value={answers.year_custom || ''} onChange={(e) => set('year_custom', e.target.value)} />
            </label>
          )}
          <label className="sv-field">
            <span className="sv-label">Programme / major</span>
            <input className="sv-input" type="text"
              value={answers.major === undefined ? 'Economics & Business' : answers.major}
              onChange={(e) => set('major', e.target.value)} />
          </label>
        </div>
      ),
    },
    // Short pages (2026-06-11: ~5 items per page max — a dense page reads as
    // intimidating). Instruments are unchanged; only the pagination differs:
    // TIPI is split 5+5 (the verbatim original instruction repeats on both
    // pages), the future-self block splits circles / vividness, and the two
    // distal-outcome scales get a page each.
    {
      title: 'How you see yourself',
      eyebrow: 'Part 1 of 2',
      intro: TIPI_INSTRUCTION,
      ids: TIPI.slice(0, 5).map((i) => i.id),
      node: (
        <div className="sv-section">
          <p className="sv-stem">I see myself as:</p>
          <LikertGrid items={TIPI.slice(0, 5)} scale={TIPI_SCALE} answers={answers} onChange={set} />
        </div>
      ),
    },
    {
      title: 'How you see yourself',
      eyebrow: 'Part 2 of 2',
      intro: TIPI_INSTRUCTION,
      ids: TIPI.slice(5).map((i) => i.id),
      node: (
        <div className="sv-section">
          <p className="sv-stem">I see myself as:</p>
          <LikertGrid items={TIPI.slice(5)} scale={TIPI_SCALE} answers={answers} onChange={set} />
        </div>
      ),
    },
    {
      title: 'What matters in work',
      intro: 'How important is each of these in your ideal job? Rate every one.',
      ids: WORK_VALUE_ITEMS.map((i) => i.id),
      node: <LikertGrid items={WORK_VALUE_ITEMS} scale={VALUE_SCALE} answers={answers} onChange={set} />,
    },
    {
      title: 'What kind of work appeals',
      intro: 'How interested are you in each kind of work?',
      ids: RIASEC.map((i) => i.id),
      node: <LikertGrid items={RIASEC} scale={RIASEC_SCALE} answers={answers} onChange={set} />,
    },
    {
      // Standalone imagination page (supervisor feedback, 14 Jun 2026): give
      // people a moment to actually conjure the future self before we ask how
      // close it feels. No inputs; the Continue button holds for 20 seconds.
      title: 'Picture that future you',
      intro: 'Take a moment for this one — there is nothing to answer here, just a minute to imagine.',
      ids: [],
      holdSeconds: 20,
      node: (
        <div className="sv-imagine">
          <p>It is an ordinary weekday about ten years from now. Picture waking up — where are you? Whose voice, if anyone's, do you hear first? Notice the room, the light coming in, what is already on your mind before the day has properly started.</p>
          <p>Now you are at work, whatever that work has turned out to be. What is in front of you this morning? Who is around — people you work with, people you are helping, someone you are still learning from? Sit for a second with what it feels like to be genuinely good at something you spent years growing into.</p>
          <p>It is evening now. The day is behind you. Where are you, who are you with, and how do you feel as it winds down?</p>
          <p className="sv-imagine-close">Stay with that person for a moment. They are who the next question is about.</p>
        </div>
      ),
    },
    {
      title: 'How close is your future self?',
      intro: "Now that you have pictured that person — how close do they feel to who you are today? You will answer this again after the conversation, so we can see what shifts.",
      ids: ['ios_pre'],
      node: (
        <div className="sv-section">
          <IOSField id="ios_pre" value={answers.ios_pre} onChange={set} />
        </div>
      ),
    },
    {
      title: 'Picturing that future',
      intro: 'How much do you agree with each statement?',
      ids: VIVIDNESS.map((i) => i.id),
      node: <LikertGrid items={VIVIDNESS} scale={AGREE7} answers={answers} onChange={set} />,
    },
    {
      title: 'Your career decision',
      eyebrow: 'Part 1 of 2',
      intro: "Where you stand with career decisions right now — you'll answer these again after the conversation.",
      ids: CDSE_SA_ITEMS.map((i) => i.id),
      node: (
        <div className="sv-section">
          <p className="sv-stem">{CDSE_STEM}</p>
          <LikertGrid items={CDSE_SA_ITEMS} scale={CDSE_SCALE} answers={answers} onChange={set} />
        </div>
      ),
    },
    {
      title: 'Your career decision',
      eyebrow: 'Part 2 of 2',
      intro: 'How much do you agree with each statement?',
      ids: CIP_CCA_ITEMS.map((i) => i.id),
      node: <LikertGrid items={CIP_CCA_ITEMS} scale={CIP_SCALE} answers={answers} onChange={set} />,
    },
  ];
}

function buildPostSections(answers, onChange, career, study = 'kangzhi') {
  const set = (id, v) => onChange(id, v);
  // Post future-self items reuse the SAME ids as pre but with a "_post" suffix.
  const vivPost = VIVIDNESS.map((i) => ({ ...i, id: i.id + '_post' }));
  return [
    {
      title: 'And now — how close is your future self?',
      intro: 'After the conversation, how close does that future you (about 10 years from now) feel to who you are today?',
      ids: ['ios_post'],
      node: (
        <div className="sv-section">
          <IOSField id="ios_post" value={answers.ios_post} onChange={set} career={career} />
        </div>
      ),
    },
    {
      title: 'Picturing that future, now',
      intro: 'How much do you agree with each statement?',
      ids: vivPost.map((i) => i.id),
      node: <LikertGrid items={vivPost} scale={AGREE7} answers={answers} onChange={set} />,
    },
    {
      title: 'Your career decision, now',
      eyebrow: 'Part 1 of 2',
      intro: 'The same short sets as before — answer for how you feel right now.',
      ids: CDSE_SA_ITEMS.map((i) => i.id + '_post'),
      node: (
        <div className="sv-section">
          <p className="sv-stem">{CDSE_STEM}</p>
          <LikertGrid items={CDSE_SA_ITEMS.map((i) => ({ ...i, id: i.id + '_post' }))}
            scale={CDSE_SCALE} answers={answers} onChange={set} />
        </div>
      ),
    },
    {
      title: 'Your career decision, now',
      eyebrow: 'Part 2 of 2',
      intro: 'How much do you agree with each statement?',
      ids: CIP_CCA_ITEMS.map((i) => i.id + '_post'),
      node: <LikertGrid items={CIP_CCA_ITEMS.map((i) => ({ ...i, id: i.id + '_post' }))}
        scale={CIP_SCALE} answers={answers} onChange={set} />,
    },
    {
      title: 'About the conversation',
      intro: 'How much do you agree?',
      ids: MANIPULATION.map((i) => i.id),
      node: <LikertGrid items={MANIPULATION} scale={AGREE7} answers={answers} onChange={set} />,
    },
    {
      title: 'In your own words',
      intro: 'A few honest lines for each — there are no right answers.',
      ids: [], // open-ended are optional
      node: (
        <div className="sv-section">
          {OPEN_ENDED.map((q) => (
            <label className="sv-field" key={q.id}>
              <span className="sv-label">{q.text}</span>
              <textarea className="sv-textarea" rows={3}
                value={answers[q.id] || ''} onChange={(e) => set(q.id, e.target.value)} />
            </label>
          ))}
        </div>
      ),
    },
    // Andrea's DV battery — labelled placeholder, only for study=andrea (Build
    // Plan §10.2). Ships disabled until her CDSE-SF + agency/closeness items are
    // confirmed; routing already supports her conditions.
    ...(study === 'andrea' ? [{
      title: 'A few more questions',
      intro: 'About how you feel about choosing your path.',
      ids: [],
      node: (
        <div className="sv-section">
          <p className="sv-hint">
            (Reserved for Andrea's dependent-variable battery — career-decision self-efficacy
            (CDSE-SF) and agency/closeness. Disabled in this build until the items are confirmed.)
          </p>
        </div>
      ),
    }] : []),
    {
      title: 'One last thing',
      intro: 'Optional.',
      ids: ['interview'],
      node: (
        <div className="sv-section">
          <div className="sv-field">
            <span className="sv-label">Would you be willing to do a short (~15 min) follow-up interview about your experience?</span>
            <ChoiceField id="interview" value={answers.interview} onChange={set} options={['Yes', 'No']} />
          </div>
          {answers.interview === 'Yes' && (
            <label className="sv-field">
              <span className="sv-label">How can we reach you? (email)</span>
              <input className="sv-input" type="email" value={answers.contact || ''}
                onChange={(e) => set('contact', e.target.value)} />
            </label>
          )}
        </div>
      ),
    },
  ];
}

// --- Paged survey container ------------------------------------------------

// v2: bumped when the pre-survey page count changed (imagination page added,
// FSCS items removed — 14 Jun 2026 feedback) so stale saved indices reset.
const SVPAGE_KEY = 'thesis_svpage_v2';
const readSvPage = (k) => {
  try { return Number(JSON.parse(localStorage.getItem(SVPAGE_KEY) || '{}')[k]) || 0; } catch (e) { return 0; }
};
const writeSvPage = (k, n) => {
  try {
    const o = JSON.parse(localStorage.getItem(SVPAGE_KEY) || '{}');
    if (n == null) delete o[k]; else o[k] = n;
    localStorage.setItem(SVPAGE_KEY, JSON.stringify(o));
  } catch (e) { /* storage unavailable */ }
};

function PagedSurvey({ sections, answers, onChange, onDone, onBack, eyebrow, storageKey }) {
  const { useState, useEffect } = React;
  const isPreview = typeof window !== 'undefined' && window.THESIS_PREVIEW;
  // Remember the page index across refreshes (§13a) — answers were already
  // restored, but landing back on page 1 of 9 read as "starting over".
  const [page, setPageRaw] = useState(() => {
    const n = storageKey && !isPreview ? readSvPage(storageKey) : 0;
    return Math.min(Math.max(0, n), sections.length - 1);
  });
  const setPage = (n) => { setPageRaw(n); if (storageKey && !isPreview) writeSvPage(storageKey, n); };
  const s = sections[Math.min(page, sections.length - 1)];

  // Optional timed "hold" gate (supervisor feedback, 14 Jun 2026): a page can
  // ask the participant to sit with a prompt for a few seconds before the
  // Continue button unlocks — used for the future-self imagination page.
  // Skipped in researcher preview and in the headless flow test (no real wait).
  const holdFor = (sec) => {
    if (isPreview) return 0;
    if (typeof window !== 'undefined' && window.THESIS_TEST_NO_HOLD) return 0;
    return sec || 0;
  };
  const [remaining, setRemaining] = useState(() => holdFor(s.holdSeconds));
  useEffect(() => { setRemaining(holdFor(s.holdSeconds)); }, [page]);
  useEffect(() => {
    if (remaining <= 0) return undefined;
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);
  const heldEnough = remaining <= 0;

  // Preview mode (researcher test drive): every page may be skipped unfilled.
  const complete = (isPreview || sectionComplete(s.ids, answers)) && heldEnough;
  const isLast = page === sections.length - 1;

  const next = () => {
    if (isLast) { if (storageKey) writeSvPage(storageKey, null); onDone(); }
    else { setPage(page + 1); window.scrollTo(0, 0); }
  };
  const back = () => { if (page === 0) onBack && onBack(); else { setPage(page - 1); window.scrollTo(0, 0); } };

  return (
    <div className="flow">
      <div className="flow-progress"><div className="bar" style={{ width: `${((page + 1) / sections.length) * 100}%` }} /></div>
      <nav className="topnav">
        <div className="brand"><BrandMark size={22} /><span>Thesis</span></div>
        <div className="sv-eyebrow">{eyebrow}</div>
        <div className="end" />
      </nav>
      <div className="flow-body">
        <div className="sv-wrap">
          {/* Centered, oversized page heading + instruction — unmistakably
              distinct from the items below (2026-06-11 readability order). */}
          <div className="sv-head">
            {s.eyebrow && <div className="sv-part">{s.eyebrow}</div>}
            <h2 className="sv-title">{s.title}</h2>
            {s.intro && <p className="sv-instruction">{s.intro}</p>}
          </div>
          {s.node}
        </div>
      </div>
      <div className="flow-foot">
        {/* No Back out of the survey's first page unless a handler exists — the
            post-survey must not offer a way back into the role-play (§7). */}
        {(page > 0 || onBack) ? (
          <button className="btn ghost" onClick={back}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M10 6.5H3M6.5 3l-4 3.5 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
        ) : <span />}
        <span className="step-label">{page + 1} OF {sections.length}</span>
        <button className="btn accent" disabled={!complete} onClick={next}>
          {!heldEnough ? `Take a moment… ${remaining}s` : (isLast ? 'Done' : 'Continue')}
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5h7M6.5 3l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}

function PreSurvey({ answers, onChange, onDone, onBack }) {
  return (
    <PagedSurvey eyebrow="Step 02 · Pre-survey" storageKey="pre"
      sections={buildPreSections(answers, onChange)}
      answers={answers} onChange={onChange} onDone={onDone} onBack={onBack} />
  );
}

function PostSurvey({ answers, onChange, onDone, career, study }) {
  return (
    <PagedSurvey eyebrow="Final step · Reflection" storageKey="post"
      sections={buildPostSections(answers, onChange, career, study)}
      answers={answers} onChange={onChange} onDone={onDone} />
  );
}

// --- Scoring + export helpers (used by app.jsx) ----------------------------

// TIPI scoring (Build Plan §9): reversed = 8 − raw; trait = mean of its 2 items,
// natively on the 1–7 scale (no rescaling). Fourth dimension = Emotional Stability.
function scoreBigFive(a) {
  const rev = (x) => 8 - x;
  const out = {};
  for (const t of ['O', 'C', 'E', 'A', 'ES']) {
    const items = TIPI.filter((i) => i.trait === t);
    const vals = items.map((i) => (i.reverse ? rev(Number(a[i.id])) : Number(a[i.id])));
    if (vals.every((v) => !Number.isNaN(v))) out[t] = vals.reduce((s, v) => s + v, 0) / vals.length;
  }
  return out;
}

/** Mean of a 5-item distal-outcome scale; suffix '' (pre) or '_post'. */
function scaleMean(a, items, suffix = '') {
  const vals = items.map((i) => Number(a[i.id + suffix])).filter((v) => !Number.isNaN(v));
  return vals.length === items.length
    ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100
    : null;
}
const scoreCdseSA = (a, suffix = '') => scaleMean(a, CDSE_SA_ITEMS, suffix);  // 1–5
const scoreCipCCA = (a, suffix = '') => scaleMean(a, CIP_CCA_ITEMS, suffix);  // 1–6
function scoreRiasec(a) {
  const out = {};
  for (const i of RIASEC) { const v = Number(a[i.id]); if (!Number.isNaN(v)) out[i.key] = v; }
  return out;
}

// O*NET work values are rated 1–7; feed the AI the top 3 (Build Plan §10.1b).
function topWorkValues(pre) {
  const rated = WORK_VALUE_ITEMS
    .map((it) => ({ name: it.name, r: Number(pre[it.id]) }))
    .filter((x) => !Number.isNaN(x.r));
  rated.sort((a, b) => b.r - a.r);
  return rated.slice(0, 3).map((x) => x.name);
}

// Build the structured profileData the backend prompts expect (career added later).
function buildProfileData(pre) {
  const major = pre.major === undefined ? 'Economics & Business' : (pre.major || 'Economics & Business');
  const year = pre.year === 'Something else' && pre.year_custom ? `Year ${pre.year_custom}` : pre.year;
  return {
    year,
    demographics: { age: pre.age, gender: pre.gender, major },
    bigFive: scoreBigFive(pre),
    values: topWorkValues(pre),
    riasec: scoreRiasec(pre),
  };
}

Object.assign(window, {
  ScaleRow, LikertGrid, CirclesField, IOSField, ChoiceField, MultiField,
  PreSurvey, PostSurvey, buildProfileData, scoreBigFive, scoreRiasec,
  scoreCdseSA, scoreCipCCA,
});
