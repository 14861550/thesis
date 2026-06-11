/* Screens: Landing, Avatar creation, Questionnaire */
const { useState } = React;

/* ============================================================
   LANDING — minimal, centered, no decorative graphic
   ============================================================ */
function Landing({ onBegin }) {
  return (
    <div data-screen-label="01 Landing">
      <nav className="topnav">
        <div className="brand"><BrandMark size={22}/><span>Thesis</span></div>
        <div className="nav-links">
          <a href="#how" onClick={(e) => { e.preventDefault(); document.getElementById('how')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>How it works</a>
          <a href="#about" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>About the study</a>
        </div>
        <div className="end">
          <button className="btn ghost sm" onClick={onBegin}>Sign in</button>
        </div>
      </nav>

      <section className="landing-hero">
        <span className="eyebrow"><span className="dot"></span>A UvA research prototype · Career exploration</span>
        <h1 className="hero-title">
          Talk to <em>you</em>,<br/>ten years into a career.
        </h1>
        <p className="hero-sub">
          Thesis lets Economics &amp; Business students step into a vivid role-play
          with a version of themselves a decade from now — already working in a career
          they're curious about. Not to be told what to do, but to feel what that
          future might actually be like.
        </p>
        <div className="hero-ctas">
          <button className="btn lg accent" onClick={onBegin}>
            Begin
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button className="btn ghost lg" onClick={() => document.getElementById('how')?.scrollIntoView({behavior: 'smooth', block: 'start'})}>How it works</button>
        </div>
        <div className="hero-foot">
          <span className="pill">~ 50–60 minute session</span>
          <span className="pill">A conversation with your future self</span>
        </div>
      </section>

      <section className="howit" id="how">
        <h2>How a session works</h2>
        <p className="lede">
          Three short steps, then a conversation. Before the chat, you'll answer some
          questions about yourself and how you see your future.
        </p>
        <div className="steps">
          <div className="step">
            <span className="num">STEP 01</span>
            <h3>A short profile</h3>
            <p>A few questions about your interests, what you want from work, and where
              you are in your studies. This grounds the future self in who you actually are.</p>
          </div>
          <div className="step">
            <span className="num">STEP 02</span>
            <h3>Choose a future</h3>
            <p>We surface a handful of careers worth exploring. You pick the one you're
              most curious to step into — and you can switch later.</p>
          </div>
          <div className="step">
            <span className="num">STEP 03</span>
            <h3>Have the conversation</h3>
            <p>Talk with yourself, ten years on, working in that career. The future self
              will speak in scenes, not summaries — and it won't tell you what to do.</p>
          </div>
        </div>
      </section>

      <div className="fineprint" id="about">
        <div className="left"><BrandMark size={14}/><span>Thesis · BSc Business Analytics prototype · UvA 2026</span></div>
        <div>Grounded in Identity-Based Motivation (Oyserman) &amp; Future Self-Continuity (Hershfield)</div>
      </div>
    </div>
  );
}

/* ============================================================
   AVATAR CREATION — minimal: name + color monogram. 10y fixed.
   ============================================================ */
const SWATCHES = ['#b5552f', '#5d6b4d', '#3c5e85', '#7a3d68', '#2f2f2d', '#a07a2c'];

function AvatarCreation({ value, onChange }) {
  const { name = '', color } = value;
  const initials = (name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '—').toUpperCase();
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="avatar-screen fade-in" data-screen-label="02 Avatar">
      <div className="avatar-canvas">
        <Monogram initials={initials} color={color} size={200}/>
        <div className="cap">Your future self · 10 years on</div>
      </div>
      <div className="avatar-controls">
        <div className="q-eyebrow">STEP 01 OF 03 · SET UP</div>
        <h2 className="section-title">Give your future self a name.</h2>
        <p className="section-sub">
          This is simply you, a decade older. The name is just a label and a color so the
          conversation has a face — the real persona is built from your answers next.
        </p>

        <div className="field-block">
          <label className="field-label">Your name (or a name to go by)</label>
          <input className="text-input" placeholder="e.g. Maya, Sam, Alex…" value={name} onChange={(e) => set({ name: e.target.value })} autoFocus/>
        </div>

        <div className="field-block">
          <label className="field-label">Color</label>
          <div className="swatch-row">
            {SWATCHES.map(c => (
              <button key={c} className={`swatch ${c === color ? 'active' : ''}`} style={{background: c}} aria-label={`Color ${c}`} onClick={() => set({ color: c })}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   QUESTIONNAIRE — phase-a profile + phase-b career pick, distilled
   ============================================================ */
const CAREER_SUGGESTIONS = [
  'Management consultant', 'Data analyst', 'Product manager',
  'Entrepreneur / founder', 'Policy economist', 'UX researcher',
  'Investment analyst', 'Sustainability lead',
];

const QUESTIONS = [
  {
    id: 'year',
    eyebrow: 'CONTEXT',
    prompt: 'Where are you in your studies?',
    hint: 'This is a prototype for Economics & Business students at the UvA.',
    kind: 'choices',
    options: [
      { id: 'y1', ttl: 'First year', desc: 'BSc Economics & Business' },
      { id: 'y2', ttl: 'Second year', desc: 'BSc Economics & Business' },
      { id: 'other', ttl: 'Something else', desc: 'Another year or programme' },
    ],
  },
  {
    id: 'interests',
    eyebrow: 'INTERESTS',
    prompt: 'What parts of your studies or life genuinely pull you in?',
    hint: 'The topics, problems, or moments where you lose track of time.',
    kind: 'textarea',
    placeholder: 'A few honest lines is plenty.',
    example: <><b>Try:</b> "I like untangling messy data into something a non-expert can act on — and I get oddly into group projects where I end up organising everyone."</>,
  },
  {
    id: 'values',
    eyebrow: 'WHAT YOU WANT FROM WORK',
    prompt: 'What matters most to you in work?',
    hint: 'Impact, stability, autonomy, creativity, money, people — in your own words.',
    kind: 'textarea',
    placeholder: 'What would make a job feel worth it to you?',
  },
  {
    id: 'avoid',
    eyebrow: 'WHAT YOU WANT TO AVOID',
    prompt: 'What would you want to avoid in a job?',
    hint: 'Naming what you are moving away from matters as much as what you move toward.',
    kind: 'textarea',
    placeholder: 'The kind of work, environment, or rhythm that would wear you down.',
  },
  {
    id: 'career',
    eyebrow: 'CHOOSE A FUTURE',
    prompt: 'Which career do you want to step into?',
    hint: 'Pick one you\'re curious to experience as your future self. You can explore others later.',
    kind: 'career',
  },
];

function Questionnaire({ answers, onChange, currentIndex }) {
  const q = QUESTIONS[currentIndex];
  const value = answers[q.id] || '';
  const set = (v) => onChange({ ...answers, [q.id]: v });

  return (
    <div className="q-screen fade-in" data-screen-label={`03 Question ${currentIndex + 1}`}>
      <div className="q-eyebrow">{q.eyebrow} · {currentIndex + 1} OF {QUESTIONS.length}</div>
      <h2 className="q-prompt">{q.prompt}</h2>
      <p className="q-hint">{q.hint}</p>

      {q.kind === 'choices' && (
        <div className="q-choices">
          {q.options.map(opt => (
            <button key={opt.id} className={`q-choice ${value === opt.id ? 'active' : ''}`} onClick={() => set(opt.id)}>
              <div className="ttl">{opt.ttl}</div>
              <div className="desc">{opt.desc}</div>
            </button>
          ))}
        </div>
      )}

      {q.kind === 'textarea' && (
        <textarea className="text-input" placeholder={q.placeholder || 'Take your time…'} value={value} onChange={(e) => set(e.target.value)} rows={4} autoFocus/>
      )}

      {q.kind === 'career' && (
        <div>
          <div className="career-grid">
            {CAREER_SUGGESTIONS.map(c => (
              <button key={c} className={`career-chip ${value === c ? 'active' : ''}`} onClick={() => set(c)}>{c}</button>
            ))}
          </div>
          <div className="career-or">Or name your own:</div>
          <input
            className="text-input"
            placeholder="e.g. Central bank economist, startup CFO…"
            value={CAREER_SUGGESTIONS.includes(value) ? '' : value}
            onChange={(e) => set(e.target.value)}
          />
        </div>
      )}

      {q.example && <div className="q-example">{q.example}</div>}
    </div>
  );
}

/* ============================================================
   CONSENT — informed consent gate before the session (§3.6)
   ============================================================ */
function Consent({ onAgree, onBack }) {
  const [checked, setChecked] = React.useState(false);
  return (
    <div className="flow">
      <nav className="topnav">
        <div className="brand"><BrandMark size={22} /><span>Thesis</span></div>
        <div className="end"><button className="btn ghost sm" onClick={onBack}>Exit</button></div>
      </nav>
      <div className="flow-body">
        <div className="sv-wrap">
          <div className="eyebrow"><span className="dot" />Before we begin</div>
          <h2 className="consent-title">Informed consent</h2>
          <div className="consent-body">
            <p>This is a research prototype from a BSc Business Analytics thesis at the University of Amsterdam. You'll fill in a short questionnaire, have a guided conversation to choose a career, then talk with an AI role-playing your future self in that career. Afterwards you'll answer a few reflection questions. The whole session takes about 50–60 minutes, is completed unsupervised on your own device, and your responses are stored on a secure cloud server.</p>
            <ul>
              <li>Participation is <strong>voluntary</strong>; you may stop at any time without giving a reason.</li>
              <li>Your questionnaire answers and the conversation are processed to run the study and may be analysed in anonymised form.</li>
              <li>The AI is a <strong>role-play</strong> — one imagined version of a possible future, not a prediction or professional advice. The decision about your future stays yours.</li>
              <li>No special-category personal data is required. Please don't share anything you'd prefer to keep private.</li>
            </ul>
            <p>For questions, contact the research team via the thesis supervisor at the UvA.</p>
          </div>
          <label className="consent-check">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>I have read and understood the above, I am 18 or older, and I agree to take part.</span>
          </label>
        </div>
      </div>
      <div className="flow-foot">
        <button className="btn ghost" onClick={onBack}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M10 6.5H3M6.5 3l-4 3.5 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
        <span className="step-label">Consent</span>
        <button className="btn accent" disabled={!checked} onClick={onAgree}>
          I agree — continue
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5h7M6.5 3l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PAUSE — "Take a breath" interstitial between stages (§3.9 / §15).
   A calm, near-empty screen that names what's done and what's next and
   advances ONLY when the participant presses Continue (never timed/auto).
   The B→C pause's Continue is what starts the Phase-C clock (the role-play
   mounts on continue), so resting here costs no conversation time.
   ============================================================ */
function Pause({ title, lines = [], cta = 'Continue', eyebrow = 'Take a breath', onContinue }) {
  return (
    <div className="flow">
      <nav className="topnav">
        <div className="brand"><BrandMark size={22} /><span>Thesis</span></div>
        <div className="end" />
      </nav>
      <div className="flow-body">
        <div className="sv-wrap" style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}><span className="dot" />{eyebrow}</div>
          <h2 className="consent-title">{title}</h2>
          {lines.map((t, i) => (
            <p key={i} className="sv-intro"
              style={{ maxWidth: '48ch', margin: '0 auto 14px', color: i ? 'var(--muted)' : undefined }}>{t}</p>
          ))}
          <button className="btn accent" style={{ marginTop: 10 }} onClick={onContinue}>
            {cta}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5h7M6.5 3l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   COMFORT & DISPLAY SETTINGS (participant-facing — Build Plan §16/§16a)
   A small floating "Aa" control: text size, theme, line spacing, reading width,
   motion. Theme routes through the shared tweak (one source of truth); the rest
   are applied as data-attributes on <html> (see styles.css) and remembered in
   localStorage. Shown to everyone — unlike the researcher Tweaks panel.
   To match the Build Plan's opinionated defaults (A++/Dark/Roomy/Wide), change
   COMFORT_DEFAULTS + the theme default; kept neutral here so nothing looks off.
   ============================================================ */
const COMFORT_KEY = 'thesis_comfort_v1';
// Defaults per Build Plan §0: text A++ / theme Dark / reading font Serif /
// spacing Roomy / width Wide / motion Full (participants can change any of them;
// the theme default lives in DEFAULT_TWEAKS in app.jsx).
const COMFORT_DEFAULTS = { size: 'lg', spacing: 'roomy', width: 'wide', motion: 'full', font: 'serif' };

function ComfortSettings({ tweaks, setTweak }) {
  const [open, setOpen] = React.useState(false);
  const [c, setC] = React.useState(() => {
    try { return { ...COMFORT_DEFAULTS, ...JSON.parse(localStorage.getItem(COMFORT_KEY) || '{}') }; }
    catch (e) { return { ...COMFORT_DEFAULTS }; }
  });
  React.useEffect(() => {
    const h = document.documentElement;
    h.dataset.size = c.size; h.dataset.spacing = c.spacing;
    h.dataset.width = c.width; h.dataset.motion = c.motion; h.dataset.font = c.font;
    try { localStorage.setItem(COMFORT_KEY, JSON.stringify(c)); } catch (e) {}
  }, [c]);
  const set = (k, v) => setC((prev) => ({ ...prev, [k]: v }));

  const Seg = ({ label, k, opts }) => (
    <div className="comfort-row">
      <div className="lbl">{label}</div>
      <div className="comfort-seg">
        {opts.map((o) => {
          const active = k === 'theme' ? tweaks.theme === o.v : c[k] === o.v;
          return (
            <button key={o.v} className={active ? 'on' : ''}
              onClick={() => (k === 'theme' ? setTweak('theme', o.v) : set(k, o.v))}>{o.l}</button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <button className="comfort-fab" aria-label="Comfort and display settings"
        title="Comfort & display" onClick={() => setOpen((o) => !o)}>Aa</button>
      {open && (
        <div className="comfort-panel" role="dialog" aria-label="Comfort settings">
          <h4>Comfort &amp; display</h4>
          <Seg label="Text size" k="size" opts={[{ v: 'sm', l: 'A' }, { v: 'md', l: 'A+' }, { v: 'lg', l: 'A++' }, { v: 'xl', l: 'A+++' }]} />
          <Seg label="Theme" k="theme" opts={[{ v: 'light', l: 'Light' }, { v: 'dark', l: 'Dark' }]} />
          <Seg label="Reading font" k="font" opts={[{ v: 'serif', l: 'Serif' }, { v: 'sans', l: 'Sans' }]} />
          <Seg label="Line spacing" k="spacing" opts={[{ v: 'cozy', l: 'Cozy' }, { v: 'roomy', l: 'Roomy' }]} />
          <Seg label="Reading width" k="width" opts={[{ v: 'narrow', l: 'Narrow' }, { v: 'normal', l: 'Default' }, { v: 'wide', l: 'Wide' }]} />
          <Seg label="Motion" k="motion" opts={[{ v: 'full', l: 'Full' }, { v: 'reduced', l: 'Reduced' }]} />
        </div>
      )}
    </>
  );
}

/* ============================================================
   RESEARCHER LAUNCHER (test mode only — Build Plan §16b)
   Shown only with ?test=1 (never to real participants, who open a fixed link).
   Lets the researcher pick the two routing axes (rec × cond) + study tag and
   jump straight in, or open the dashboard. Picking an axis reloads with the new
   query params (which are then locked for the run, exactly like a real link).
   ============================================================ */
const INTENDED_COMBOS = {
  kangzhi: [['guide', 'main'], ['guide', 'baseline']],
  andrea: [['reflective', 'main'], ['direct', 'main']],
};
function isIntended(study, rec, cond) {
  return (INTENDED_COMBOS[study] || []).some(([r, c]) => r === rec && c === cond);
}

function Launcher({ condition, rec, study, pid, onStart }) {
  const nav = (patch) => {
    const q = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => q.set(k, v));
    q.set('test', '1');
    window.location.search = q.toString(); // reload with the chosen axes locked
  };
  const Seg = ({ label, cur, k, opts }) => (
    <div className="comfort-row">
      <div className="lbl">{label}</div>
      <div className="comfort-seg">
        {opts.map((o) => (
          <button key={o} className={cur === o ? 'on' : ''} onClick={() => nav({ [k]: o })}>{o}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="flow">
      <nav className="topnav">
        <div className="brand"><BrandMark size={22} /><span>Thesis</span></div>
        <div className="sv-eyebrow">Researcher launcher · test mode</div>
        <div className="end" />
      </nav>
      <div className="flow-body">
        <div className="sv-wrap">
          <div className="eyebrow"><span className="dot" />Test mode (?test=1) — never shown to participants</div>
          <h2 className="consent-title">Launch a test run</h2>
          <p className="sv-intro">Pick the two routing axes, then start. Real participants open a fixed personal link and skip this entirely.</p>
          <Seg label="Rec — stage B prompt" cur={rec} k="rec" opts={['guide', 'reflective', 'direct']} />
          <Seg label="Cond — stage C prompt" cur={condition} k="cond" opts={['main', 'baseline']} />
          <Seg label="Study tag" cur={study} k="study" opts={['kangzhi', 'andrea']} />
          <p className="sv-hint" style={{ marginTop: 6 }}>
            Current: study=<b>{study}</b> · rec=<b>{rec}</b> · cond=<b>{condition}</b>{pid ? <> · pid=<b>{pid}</b></> : null}
            {isIntended(study, rec, condition) ? null : <span className="muted"> · ⚠ non-standard combo</span>}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn accent" onClick={onStart}>Start as participant →</button>
            <a className="btn ghost" href="/admin" target="_blank" rel="noreferrer">Open dashboard ↗</a>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Landing, AvatarCreation, Questionnaire, QUESTIONS, SWATCHES, Consent, Pause, ComfortSettings, Launcher });
