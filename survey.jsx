/*
 * survey.jsx — validated pre/post instruments (Status Brief §2.5, §3.4, §3.7) and a
 * small data-driven renderer. Pre-survey = Phase A; post-survey runs after Phase C.
 *
 * Instruments: BFI-10 (Rammstedt & John, 2007), Schwartz-aligned work values,
 * RIASEC 6-item interest screen, IOS (closeness), a 3-item future-self-continuity
 * scale (adapted FSCS), and a 4-item future-self vividness scale. Pre/post use the
 * SAME closeness/continuity/vividness items for comparability. The future-self
 * referent is kept generic ("about 10 years from now") because the career is chosen
 * later, in Phase B.
 *
 * All components destructure React hooks inside function scope (the no-build setup
 * runs each .jsx as a separate script; top-level declarations are shared, so we
 * avoid colliding hook bindings by scoping them locally).
 */

// --- Instrument definitions ------------------------------------------------

// Personality — Mini-IPIP (Donnellan et al., 2006; IPIP items, public domain).
// 20 items, 4 per trait, 5-point accuracy. (R) = reverse-keyed (Build Plan §10.1a.)
const MINIIPIP = [
  { id: 'mip_e1', text: 'I am the life of the party.', trait: 'E', reverse: false },
  { id: 'mip_a1', text: "I sympathize with others' feelings.", trait: 'A', reverse: false },
  { id: 'mip_c1', text: 'I get chores done right away.', trait: 'C', reverse: false },
  { id: 'mip_n1', text: 'I have frequent mood swings.', trait: 'N', reverse: false },
  { id: 'mip_o1', text: 'I have a vivid imagination.', trait: 'O', reverse: false },
  { id: 'mip_e2', text: 'I talk to a lot of different people at parties.', trait: 'E', reverse: false },
  { id: 'mip_a2', text: "I feel others' emotions.", trait: 'A', reverse: false },
  { id: 'mip_c2', text: 'I like order.', trait: 'C', reverse: false },
  { id: 'mip_n2', text: 'I get upset easily.', trait: 'N', reverse: false },
  { id: 'mip_o2', text: 'I have difficulty understanding abstract ideas.', trait: 'O', reverse: true },
  { id: 'mip_e3', text: "I don't talk a lot.", trait: 'E', reverse: true },
  { id: 'mip_a3', text: 'I am not really interested in others.', trait: 'A', reverse: true },
  { id: 'mip_c3', text: 'I often forget to put things back in their proper place.', trait: 'C', reverse: true },
  { id: 'mip_n3', text: 'I am relaxed most of the time.', trait: 'N', reverse: true },
  { id: 'mip_o3', text: 'I am not interested in abstract ideas.', trait: 'O', reverse: true },
  { id: 'mip_e4', text: 'I keep in the background.', trait: 'E', reverse: true },
  { id: 'mip_a4', text: "I am not interested in other people's problems.", trait: 'A', reverse: true },
  { id: 'mip_c4', text: 'I make a mess of things.', trait: 'C', reverse: true },
  { id: 'mip_n4', text: 'I seldom feel blue.', trait: 'N', reverse: true },
  { id: 'mip_o4', text: 'I do not have a good imagination.', trait: 'O', reverse: true },
];
const MIP_SCALE = { points: 5, left: 'Very inaccurate', right: 'Very accurate' };

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

const RIASEC = [
  { id: 'ria_R', key: 'R', text: 'building, fixing, or working with your hands and tools' },
  { id: 'ria_I', key: 'I', text: 'analysing data, researching, or solving abstract problems' },
  { id: 'ria_A', key: 'A', text: 'creating, designing, writing, or expressing ideas' },
  { id: 'ria_S', key: 'S', text: 'helping, teaching, advising, or working closely with people' },
  { id: 'ria_E', key: 'E', text: 'leading, persuading, selling, or starting ventures' },
  { id: 'ria_C', key: 'C', text: 'organising, structuring, or working with records and details' },
];
const RIASEC_SCALE = { points: 5, left: 'Strongly dislike', right: 'Strongly enjoy' };

// Future-self measures (same items pre and post)
const FSCS = [
  { id: 'fscs_similar', text: 'How similar do you feel to your future self, about 10 years from now?' },
  { id: 'fscs_connected', text: 'How connected do you feel to that future self?' },
  { id: 'fscs_care', text: 'How much do you care about what happens to that future self?' },
];
const VIVIDNESS = [
  { id: 'viv_clear', text: 'I can picture my future self clearly.' },
  { id: 'viv_tangible', text: 'My future self feels tangible and real to me.' },
  { id: 'viv_detail', text: "I can imagine specific details of my future self's daily life." },
  { id: 'viv_felt', text: 'I can imagine what it would feel like to be my future self.' },
];
const SEVEN = { points: 7, left: 'Not at all', right: 'Completely' };
const AGREE7 = { points: 7, left: 'Strongly disagree', right: 'Strongly agree' };

const MANIPULATION = [
  { id: 'mc_style', text: 'My future self spoke in a way that sounded like me.' },
  { id: 'mc_scene', text: 'My future self described their life in specific, concrete scenes.' },
  { id: 'mc_understand', text: 'My future self seemed to genuinely understand my situation and background.' },
];
const OPEN_ENDED = [
  { id: 'oe_real', text: 'Which moment in the conversation made you most feel this was genuinely your future self? What made it feel real?' },
  { id: 'oe_broke', text: 'Was there any moment that broke the feeling — that made the future self feel fake, generic, or off? What happened?' },
  { id: 'oe_voice', text: 'Did the way your future self spoke remind you of yourself? In what way, or why not?' },
  { id: 'oe_shift', text: 'After this conversation, has anything shifted in how you picture yourself in this career 10 years from now?' },
];

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

function IOSField({ id, value, onChange, career }) {
  // Seven option pairs with increasing overlap (1 = far apart, 7 = near-complete).
  const opts = Array.from({ length: 7 }, (_, i) => i + 1);
  return (
    <div className="sv-ios">
      <div className="sv-scale-text">
        Which picture best describes how close you feel to your future self
        {career ? ` as a ${career}` : ', about 10 years from now'}?
      </div>
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
      <div className="sv-scale-row" style={{ marginTop: 2 }}>
        <span className="sv-scale-end">Far apart</span>
        <span className="sv-scale-end" style={{ marginLeft: 'auto' }}>Almost one</span>
      </div>
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
      intro: 'This prototype is for Economics & Business students at the UvA.',
      ids: ['age', 'gender', 'year'],
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
          <label className="sv-field">
            <span className="sv-label">Programme / major</span>
            <input className="sv-input" type="text"
              value={answers.major === undefined ? 'Economics & Business' : answers.major}
              onChange={(e) => set('major', e.target.value)} />
          </label>
        </div>
      ),
    },
    {
      title: 'How you see yourself',
      intro: 'How accurately do the following statements describe you, compared with other people you know of the same age? Rate each.',
      ids: MINIIPIP.map((i) => i.id),
      node: <LikertGrid items={MINIIPIP} scale={MIP_SCALE} answers={answers} onChange={set} />,
    },
    {
      title: 'What matters in work',
      intro: 'How important is each of these in your ideal job? Rate every one.',
      ids: WORK_VALUE_ITEMS.map((i) => i.id),
      node: <LikertGrid items={WORK_VALUE_ITEMS} scale={VALUE_SCALE} answers={answers} onChange={set} />,
    },
    {
      title: 'What kind of work appeals',
      intro: 'For each type of activity, indicate how much you would enjoy work that involves…',
      ids: RIASEC.map((i) => i.id),
      node: <LikertGrid items={RIASEC} scale={RIASEC_SCALE} answers={answers} onChange={set} />,
    },
    {
      title: 'Your future self, today',
      intro: "By “your future self” we mean the version of you about 10 years from now. These questions capture how you picture that person today — you'll answer the same ones again after the conversation, so we can see what shifts.",
      ids: ['ios_pre', ...FSCS.map((i) => i.id), ...VIVIDNESS.map((i) => i.id)],
      node: (
        <div className="sv-section">
          <IOSField id="ios_pre" value={answers.ios_pre} onChange={set} />
          <LikertGrid items={FSCS} scale={SEVEN} answers={answers} onChange={set} />
          <LikertGrid items={VIVIDNESS} scale={AGREE7} answers={answers} onChange={set} />
        </div>
      ),
    },
  ];
}

function buildPostSections(answers, onChange, career, study = 'kangzhi') {
  const set = (id, v) => onChange(id, v);
  // Post future-self items reuse the SAME ids as pre but with a "_post" suffix.
  const fscsPost = FSCS.map((i) => ({ ...i, id: i.id + '_post' }));
  const vivPost = VIVIDNESS.map((i) => ({ ...i, id: i.id + '_post' }));
  return [
    {
      title: 'Your future self, now',
      intro: 'Now — after the conversation — how do you picture your future self (about 10 years from now)?',
      ids: ['ios_post', ...fscsPost.map((i) => i.id), ...vivPost.map((i) => i.id)],
      node: (
        <div className="sv-section">
          <IOSField id="ios_post" value={answers.ios_post} onChange={set} career={career} />
          <LikertGrid items={fscsPost} scale={SEVEN} answers={answers} onChange={set} />
          <LikertGrid items={vivPost} scale={AGREE7} answers={answers} onChange={set} />
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
    // Andrea's DV battery — labelled placeholder, only for study=andrea (Build
    // Plan §10.2). Ships disabled until her CDSE-SF + agency/closeness items are
    // confirmed; routing already supports her conditions.
    ...(study === 'andrea' ? [{
      title: 'Your career decision',
      intro: 'A few questions about how you feel about choosing your path.',
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

function PagedSurvey({ sections, answers, onChange, onDone, onBack, eyebrow }) {
  const { useState } = React;
  const [page, setPage] = useState(0);
  const s = sections[page];
  const complete = sectionComplete(s.ids, answers);
  const isLast = page === sections.length - 1;

  const next = () => { if (isLast) onDone(); else { setPage(page + 1); window.scrollTo(0, 0); } };
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
          <div className="eyebrow"><span className="dot" />{s.title}</div>
          {s.intro && <p className="sv-intro">{s.intro}</p>}
          {s.node}
        </div>
      </div>
      <div className="flow-foot">
        <button className="btn ghost" onClick={back}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M10 6.5H3M6.5 3l-4 3.5 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
        <span className="step-label">{page + 1} OF {sections.length}</span>
        <button className="btn accent" disabled={!complete} onClick={next}>
          {isLast ? 'Done' : 'Continue'}
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5h7M6.5 3l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}

function PreSurvey({ answers, onChange, onDone, onBack }) {
  return (
    <PagedSurvey eyebrow="Step 02 · Pre-survey"
      sections={buildPreSections(answers, onChange)}
      answers={answers} onChange={onChange} onDone={onDone} onBack={onBack} />
  );
}

function PostSurvey({ answers, onChange, onDone, career, study }) {
  return (
    <PagedSurvey eyebrow="Final step · Reflection"
      sections={buildPostSections(answers, onChange, career, study)}
      answers={answers} onChange={onChange} onDone={onDone} />
  );
}

// --- Scoring + export helpers (used by app.jsx) ----------------------------

function scoreBigFive(a) {
  const rev = (x) => 6 - x;
  const out = {};
  for (const t of ['O', 'C', 'E', 'A', 'N']) {
    const items = MINIIPIP.filter((i) => i.trait === t);
    const vals = items.map((i) => (i.reverse ? rev(Number(a[i.id])) : Number(a[i.id])));
    if (vals.every((v) => !Number.isNaN(v))) out[t] = vals.reduce((s, v) => s + v, 0) / vals.length;
  }
  return out;
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
  const major = pre.major === undefined ? 'Economics & Business' : (pre.major || 'Economics & Business');
  return {
    year: pre.year,
    demographics: { age: pre.age, gender: pre.gender, major },
    bigFive: scoreBigFive(pre),
    values: topWorkValues(pre),
    riasec: scoreRiasec(pre),
  };
}

Object.assign(window, {
  ScaleRow, LikertGrid, IOSField, ChoiceField, MultiField,
  PreSurvey, PostSurvey, buildProfileData, scoreBigFive, scoreRiasec,
});
