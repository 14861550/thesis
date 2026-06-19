/*
 * survey.jsx — validated pre/post instruments (Status Brief §2.5, §3.4, §3.7) and a
 * small data-driven renderer. Pre-survey = Phase A; post-survey runs after Phase C.
 *
 * Instruments: TIPI-10 (Gosling et al., 2003), O*NET work values, RIASEC 6-item
 * interest screen, the IOS closeness item, the 2-item pictorial FSCS continuity
 * pair (Ersner-Hershfield et al., 2009), and a 4-item future-self vividness scale.
 * Pre/post use the SAME mediator items for comparability. (Continuity/FSCS was
 * briefly removed on 14 Jun 2026, then RESTORED on 17 Jun 2026 — it is the only
 * measure of the continuity mediator / H3.) The future-self referent is kept generic
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

// Future-self mediator measures (same items pre and post): closeness = IOS circles
// item; continuity = the 2-item pictorial FSCS pair (RESTORED 17 Jun 2026); vividness
// = 4 agree items.
//
// Continuity — Future Self-Continuity Scale (Ersner-Hershfield et al., 2009): two
// pictorial items in the IOS circles format (similarity + connectedness); continuity
// score = mean of the two. This is the sole measure of the continuity mediator (H3)
// and of what the "biographical grounding" design component targets; its 14 Jun
// removal left continuity unmeasured, so it is restored here.
const FSCS = [
  { id: 'fscs_similar', text: 'How alike are you and the future you — the way you act, the things you like, and what matters to you?',
    hint: 'How alike the two of you are.' },
  { id: 'fscs_connected', text: "Does the future you feel like the same you, just older — or like a different person you don't really know yet?",
    hint: "More overlap = feels like one continuous ‘you’." },
];
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

// Distal outcomes — CIP-Short, supervisor spec (CIP_outcome_measures, 2026-06):
// SIX items, two outcomes of three, on the original 6-point agreement scale
// (1 = completely disagree … 6 = strongly agree). Both scored FORWARD as raw
// means (NO reverse-keying):
//   A. Commitment anxiety (career indecision) — higher = more indecision.
//   B. Career decision self-efficacy (confidence) — higher = more confident
//      (these items are reverse-keyed in the original CIP; used here as
//      self-efficacy they are scored forward per the supervisor doc).
// Shown in a fixed MIXED order (not grouped by outcome), pre AND post; NEVER fed
// to the AI. Wordings per the supervisor doc (Hacker et al., 2013; loadings
// Xu, 2020). Replaces the interim single Lack-of-Readiness subscale.
const CIP_ANXIETY_IDS = ['cip_ca_1', 'cip_ca_2', 'cip_ca_3'];
const CIP_CONFIDENCE_IDS = ['cip_cf_1', 'cip_cf_2', 'cip_cf_3'];
const CIP_ITEMS = [
  { id: 'cip_cf_1', text: 'I am confident that I will be able to find a career.' },
  { id: 'cip_ca_1', text: "I can't commit to a career direction." },
  { id: 'cip_cf_3', text: 'I am confident that I can overcome obstacles in pursuing my career.' },
  { id: 'cip_ca_2', text: 'I am concerned that my career goals might change.' },
  { id: 'cip_cf_2', text: "I am quite confident that I will be able to find a career in which I'll perform well." },
  { id: 'cip_ca_3', text: 'It is difficult to decide on a career because I like so many different things.' },
];
const CIP_SCALE = { points: 6, left: 'Completely disagree', right: 'Strongly agree' };

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
          labels (e.g. TIPI's 7), show the full legend once for the block. */}
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
      text={`How much does the future you${career ? ` as a ${career}` : ''} already feel like a part of you today?`}
      hint="Barely-touching circles = not yet; almost-fully-overlapping = already a big part of me." />
  );
}

/* The imagination prompt, self-paced: one line shows at a time and it STAYS —
 * the participant taps "Next" to reveal the following line whenever they are
 * ready (no auto-fade, no auto-advance), so they can sit with each part of the
 * day for as long as they like. The closing line appears once the last line is
 * reached. Progress dots show how many parts remain. */
function ImagineSequence({ lines, closing }) {
  const { useState } = React;
  const [idx, setIdx] = useState(0);
  const lns = lines || [];
  const onLast = idx >= lns.length - 1;
  return (
    <div className="sv-imagine">
      <div className="sv-imagine-seq" aria-live="polite">
        <p key={idx} className="sv-imagine-line">{lns[idx] || ''}</p>
      </div>
      {lns.length > 1 && (
        <div className="sv-imagine-dots" aria-hidden="true">
          {lns.map((_, i) => <span key={i} className={`sv-imagine-dot${i <= idx ? ' on' : ''}`} />)}
        </div>
      )}
      {!onLast ? (
        <button type="button" className="btn ghost sv-imagine-next"
          onClick={() => setIdx((i) => Math.min(i + 1, lns.length - 1))}>
          Next
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5h7M6.5 3l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      ) : (closing ? <p className="sv-imagine-close">{closing}</p> : null)}
    </div>
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
      intro: 'Open to university students of any major, any year, at any university.',
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
              options={['First year', 'Second year', 'Third year', 'Fourth year', 'Something else']} />
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
            <input className="sv-input" type="text" placeholder="e.g. Psychology, Computer Science, Law"
              value={answers.major || ''}
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
      intro: 'How important is each of these in your ideal job? Please rate each one.',
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
      // Standalone "imagine your future self" page (Build Plan v5.3 §0.0b(c)),
      // immediately before the future-self mediator block. A 20-second timed hold
      // (restored 2026-06-19 at Kangzhi's request — supersedes the §7.3 skippable
      // version) keeps the participant with the imagination before the closeness
      // measure. It runs in preview too (with a one-click "Skip the wait"); only
      // the headless tests bypass it. Nothing here is recorded as an outcome.
      title: 'Picture that future you',
      intro: 'The next questions are about your future self — the person you will be about 10 years from now. Take a moment for this one — there is nothing to answer here, just a minute to imagine.',
      ids: [],
      holdSeconds: 20,
      node: (
        <ImagineSequence
          lines={[
            "It is an ordinary weekday about ten years from now. Picture waking up — where are you? Whose voice, if anyone's, do you hear first? Notice the room, the light coming in, what is already on your mind before the day has properly started.",
            "Now you are at work, whatever that work has turned out to be. What is in front of you this morning? Who is around — people you work with, people you are helping, someone you are still learning from? Sit for a second with what it feels like to be genuinely good at something you spent years growing into.",
            "It is evening now. The day is behind you. Where are you, who are you with, and how do you feel as it winds down?",
          ]}
          closing="Stay with that person for a moment. They are who the next question is about." />
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
      // Continuity (FSCS) — restored 17 Jun 2026; two pictorial circles items.
      title: 'How continuous is your future self?',
      intro: 'Two more quick pictures — pick the pair of circles that fits best for each.',
      ids: FSCS.map((i) => i.id),
      node: (
        <div className="sv-section">
          {FSCS.map((it) => (
            <CirclesField key={it.id} id={it.id} text={it.text} hint={it.hint}
              value={answers[it.id]} onChange={set} />
          ))}
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
      intro: "Where you stand with career decisions right now — you'll answer these again after the conversation. How much do you agree with each?",
      ids: CIP_ITEMS.map((i) => i.id),
      node: (
        <div className="sv-section">
          <LikertGrid items={CIP_ITEMS} scale={CIP_SCALE} answers={answers} onChange={set} />
        </div>
      ),
    },
  ];
}

function buildPostSections(answers, onChange, career) {
  const set = (id, v) => onChange(id, v);
  // Post future-self items reuse the SAME ids as pre but with a "_post" suffix.
  const vivPost = VIVIDNESS.map((i) => ({ ...i, id: i.id + '_post' }));
  return [
    {
      // Post-conversation mirror of the pre-survey "Picture that future you"
      // page (added 18 Jun 2026): the pre future-self measure was primed by a
      // structured imagination, so the post measure gets a parallel one —
      // otherwise the pre/post ratings would differ in measurement context, not
      // only in the conversation that happened between them. Worded for *after*
      // the role-play (they have now met this person), and carries the same
      // 20-second timed hold as the pre page (restored 2026-06-19); nothing here
      // is recorded.
      title: 'Picture that future you, once more',
      intro: 'Before the last questions, take one more moment with your future self — the person you have just been speaking with, about 10 years from now. There is nothing to answer here, just a minute to picture them again.',
      ids: [],
      holdSeconds: 20,
      node: (
        <ImagineSequence
          lines={[
            "Bring that future self back to mind — the same person you just spoke with, on an ordinary weekday about ten years from now. Picture them waking up: where are they, what does the light in the room feel like, what is already on their mind before the day has properly started?",
            "Now picture the work you talked about together. What is in front of them this morning? Who is around — people they work with, people they are helping, someone they are still learning from? Sit for a second with what it feels like to be that person, genuinely good at something they spent years growing into.",
            "It is evening now, the day behind them. Where are they, who are they with, and how do they feel as it winds down?",
          ]}
          closing="Stay with that person for a moment. The next questions are about them." />
      ),
    },
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
      title: 'And now — how continuous is your future self?',
      intro: 'The same two pictures — pick the pair of circles that fits best for each, now.',
      ids: FSCS.map((i) => i.id + '_post'),
      node: (
        <div className="sv-section">
          {FSCS.map((it) => (
            <CirclesField key={it.id} id={it.id + '_post'} text={it.text} hint={it.hint}
              value={answers[it.id + '_post']} onChange={set} />
          ))}
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
      intro: 'The same statements as before — answer for how you feel right now.',
      ids: CIP_ITEMS.map((i) => i.id + '_post'),
      node: (
        <div className="sv-section">
          <LikertGrid items={CIP_ITEMS.map((i) => ({ ...i, id: i.id + '_post' }))}
            scale={CIP_SCALE} answers={answers} onChange={set} />
        </div>
      ),
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
    {
      title: 'One last thing',
      intro: 'Optional.',
      ids: ['interview'],
      node: (
        <div className="sv-section">
          <div className="sv-field">
            <span className="sv-label">Would you be open to a short (~15 min) follow-up interview about your experience?</span>
            <ChoiceField id="interview" value={answers.interview} onChange={set} options={['Yes', 'No']} />
          </div>
          {answers.interview === 'Yes' && (
            <p className="sv-intro" style={{ marginTop: 4 }}>
              Thank you! We don't collect any contact details here — if you'd like to take part, just
              email the team at <a href="mailto:thy.le@student.uva.nl">thy.le@student.uva.nl</a> and
              we'll arrange a time.
            </p>
          )}
        </div>
      ),
    },
  ];
}

// --- Paged survey container ------------------------------------------------

// v5: bumped whenever the pre/post page set changes (18 Jun 2026: added a
// post-conversation "Picture that future you, once more" page to mirror the
// pre-survey imagination prime; earlier — 17 Jun 2026 — dropped Andrea's
// reflective-vs-direct manipulation-check page) so stale saved page indices
// reset rather than landing the participant on the wrong page after a refresh.
const SVPAGE_KEY = 'thesis_svpage_v5';
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
  // Continue button unlocks — used for the future-self imagination pages.
  // The hold runs in BOTH real and preview runs (so a researcher test-drive shows
  // the real experience — preview gets a one-click "Skip the wait" below so it is
  // not forced to sit 20s every time); only the headless tests bypass it.
  const holdFor = (sec) => {
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isPreview && !heldEnough && <button className="btn ghost" onClick={next}>Skip the wait</button>}
          <button className="btn accent" disabled={!complete} onClick={next}>
            {!heldEnough ? `Take a moment… ${remaining}s` : (isLast ? 'Done' : 'Continue')}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5h7M6.5 3l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
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

function PostSurvey({ answers, onChange, onDone, career }) {
  return (
    <PagedSurvey eyebrow="Final step · Reflection" storageKey="post"
      sections={buildPostSections(answers, onChange, career)}
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

/** Mean of a multi-item scale; suffix '' (pre) or '_post'. */
function scaleMean(a, items, suffix = '') {
  const vals = items.map((i) => Number(a[i.id + suffix])).filter((v) => !Number.isNaN(v));
  return vals.length === items.length
    ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100
    : null;
}
// Continuity (FSCS) = mean of the two pictorial items, 1–7 (no reverse).
const scoreFSCS = (a, suffix = '') => scaleMean(a, FSCS, suffix);
// CIP outcomes (1–6, forward raw means; NO reverse-keying). Returns both
// sub-scores: anxiety = career indecision (higher = more), confidence = career
// decision self-efficacy (higher = more). Each is null until all 3 are answered.
function scoreCip(a, suffix = '') {
  const m = (ids) => {
    const v = ids.map((id) => Number(a[id + suffix])).filter((x) => !Number.isNaN(x));
    return v.length === ids.length
      ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 100) / 100
      : null;
  };
  return { anxiety: m(CIP_ANXIETY_IDS), confidence: m(CIP_CONFIDENCE_IDS) };
}
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
  const major = (pre.major || '').trim();
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
  scoreCip, scoreFSCS,
});
