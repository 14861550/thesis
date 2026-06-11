/* App shell — full study flow controller + tweaks
 *
 * Flow (Status Brief §3.2 / §3.6):
 *   landing → consent → avatar → presurvey (Phase A) → phaseb (Phase B) →
 *   roleplay (Phase C) → postsurvey → done (closure + data export)
 *
 * Condition (main | baseline) comes from ?condition= and only changes Phase C.
 * Everything is held in React state; nothing is persisted (no DB). The full
 * session record can be downloaded as JSON on the closure screen.
 */
const { useState, useEffect, useRef } = React;

const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "#b5552f",
  "headlineFont": "serif"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = ['#b5552f', '#5d6b4d', '#3c5e85', '#7a3d68', '#2f2f2d'];

function qp(name) {
  try { return new URLSearchParams(window.location.search).get(name); } catch (e) { return null; }
}
// Two orthogonal axes from the URL (Build Plan §6), locked for the session:
//   condition / cond ∈ {main, baseline}   → stage-C role-play prompt
//   rec ∈ {reflective, direct, guide}     → stage-B recommendation prompt
//     (default = reflective, the working stage-B design; guide is the backup)
//   study (analysis tag) + pid (prefixed id, e.g. K017) are recorded only.
function readCondition() { const c = qp('condition') || qp('cond'); return c === 'baseline' ? 'baseline' : 'main'; }
function readRec() { const r = qp('rec'); return ['guide', 'reflective', 'direct'].includes(r) ? r : 'reflective'; }
function readStudy() { return qp('study') || 'kangzhi'; }
function readPid() { return qp('pid') || null; }
function readTestMode() { return qp('test') === '1'; }

// --- Persistence (additive; never blocks or alters the participant UX) ------
// The study session is saved to Postgres via the backend. All calls are
// best-effort: any failure (offline / no DB) is swallowed so the flow is
// identical to before, and the JSON download at Closure still works.
const PERSIST_BASE = (typeof window !== 'undefined' && window.THESIS_API_BASE) || '';

// Local key for resume-after-disconnect (stores the participant's in-progress run).
const PROGRESS_KEY = 'thesis_progress_v3';

function readSessionParam() {
  try { return new URLSearchParams(window.location.search).get('session'); } catch (e) { return null; }
}

async function apiCreateSession({ condition, rec, study, pid }) {
  try {
    const r = await fetch(PERSIST_BASE + '/api/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ condition, rec, study, pid }),
    });
    const d = await r.json().catch(() => ({}));
    return d && d.id ? d.id : null;
  } catch (e) { return null; }
}

function apiSaveSession(id, partial) {
  if (!id) return Promise.resolve();
  return fetch(PERSIST_BASE + '/api/sessions/' + id, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  }).catch(() => {});
}

/** Condense the Phase-B dialogue into carry-over notes for the MAIN role-play. */
function phaseBNotesFrom(pb) {
  if (!pb || !pb.transcript) return '';
  const userTurns = pb.transcript.filter(t => t.role === 'user').map(t => `- ${t.text}`);
  return [
    `They chose to step into: ${pb.career}.`,
    userTurns.length ? `In the recommendation chat they said:\n${userTurns.join('\n')}` : '',
  ].filter(Boolean).join('\n');
}

/** Where an admin-resumed run should land, given its saved study object. */
function resumeScreenFor(study) {
  const has = (o) => o && Object.keys(o).length > 0;
  if (!study) return 'landing';
  if (study.meta && study.meta.status === 'completed') return 'done';
  if (!(study.profile && study.profile.name)) return 'avatar';
  if (!has(study.preSurvey)) return 'presurvey';
  if (!(study.phaseB && study.phaseB.career)) return 'pause_ab';
  if (has(study.postSurvey)) return 'postsurvey';
  const cTurns = study.phaseC && Array.isArray(study.phaseC.transcript) && study.phaseC.transcript.length;
  return cTurns ? 'roleplay' : 'pause_bc';
}

function App() {
  const [tweaks, setTweak] = useTweaks(DEFAULT_TWEAKS);
  const [condition] = useState(readCondition);
  const [rec] = useState(readRec);
  const [study] = useState(readStudy);
  const [pid] = useState(readPid);
  const [testMode] = useState(readTestMode);
  const [screen, setScreen] = useState(() => (readTestMode() ? 'launcher' : 'landing'));
  const [profile, setProfile] = useState({ name: '', color: '#b5552f' });
  const [preAnswers, setPreAnswers] = useState({});
  const [phaseB, setPhaseB] = useState(null);     // { career, location, familiarity, interestStrength, transcript }
  const [phaseC, setPhaseC] = useState(null);     // { transcript, durationSec, turnCount, ... }
  const [postAnswers, setPostAnswers] = useState({});
  const [freeCont, setFreeCont] = useState(null); // free continuation (logged separately)
  const [pendingSnap, setPendingSnap] = useState(null); // saved snapshot awaiting resume-or-restart
  const phaseCSessionId = useRef(null);           // reused so free continuation = same convo
  const resumedC = useRef(false);                 // admin resume: seed the role-play with the saved transcript

  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.style.setProperty('--accent', tweaks.accent);
    document.documentElement.style.setProperty('--accent-soft',
      tweaks.theme === 'dark' ? shadeMix(tweaks.accent, 0.78, 30) : tintFromAccent(tweaks.accent));
    document.documentElement.style.setProperty('--accent-ink', shadeFromAccent(tweaks.accent, tweaks.theme));
    document.documentElement.style.setProperty('--font-serif',
      tweaks.headlineFont === 'sans'
        ? 'var(--font-sans)'
        : '"Instrument Serif", ui-serif, Georgia, "Times New Roman", serif');
  }, [tweaks]);

  useEffect(() => { setProfile(p => ({ ...p, color: tweaks.accent })); }, [tweaks.accent]);

  // Establish (or adopt) a persistent study session id for this run.
  const studyId = useRef(null);
  useEffect(() => {
    // Resume an in-progress run after a refresh / lost connection: restore the
    // saved local snapshot (answers, selections, screen) so nothing is re-entered.
    let snap = null;
    try { snap = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null'); } catch (e) {}
    const existing = readSessionParam();
    // Admin-initiated resume (?session=<id>&resume=1): hydrate the run from the
    // SERVER row — works on any device, unlike the localStorage snapshot. The
    // role-play transcript (if any) is re-seeded into the model so the future
    // self remembers the earlier conversation.
    if (existing && qp('resume') === '1' && !readTestMode()) {
      studyId.current = existing;
      (async () => {
        try {
          const r = await fetch(PERSIST_BASE + '/api/sessions/' + existing);
          if (!r.ok) throw new Error('not found');
          const study = await r.json();
          if (study.profile && study.profile.name) setProfile((p) => ({ ...p, ...study.profile }));
          if (study.preSurvey) setPreAnswers(study.preSurvey);
          if (study.phaseB && (study.phaseB.career || (study.phaseB.transcript || []).length)) setPhaseB(study.phaseB);
          if (study.phaseC && (study.phaseC.transcript || []).length) { setPhaseC(study.phaseC); resumedC.current = true; }
          if (study.postSurvey && Object.keys(study.postSurvey).length) setPostAnswers(study.postSurvey);
          setScreen(resumeScreenFor(study));
        } catch (e) { setScreen('landing'); }
      })();
      return;
    }
    if (!readTestMode() && snap && snap.screen && snap.screen !== 'landing' && snap.screen !== 'done') {
      // Offer an explicit resume-or-restart choice (Build Plan §13a) rather than
      // silently restoring — the participant decides to continue or start fresh.
      if (snap.studyId) studyId.current = snap.studyId;
      else if (existing) studyId.current = existing;
      setPendingSnap(snap);
      setScreen('resume_choice');
      return;
    }
    if (existing) { studyId.current = existing; return; } // admin-created participant link
    // No session row is created here: nothing is recorded before consent (§15).
  }, []); // once

  // First write happens only after the participant agrees (§15: no data before
  // consent). Admin-created links already carry an id; never create twice.
  const beginAfterConsent = () => {
    if (!studyId.current) {
      apiCreateSession({ condition, rec, study, pid }).then((id) => { studyId.current = id; });
    }
    setScreen('avatar');
  };

  // Persist progress locally so a dropped connection / refresh can resume.
  useEffect(() => {
    // Only snapshot once the participant is genuinely into the study (pre-survey
    // onward). Landing/consent/avatar/launcher/resume aren't an "in-progress run"
    // to resume into (§13a), and we don't want a consent-screen refresh to pop the
    // resume-or-restart choice.
    if (['landing', 'consent', 'avatar', 'resume_choice', 'launcher'].includes(screen)) return;
    try {
      if (screen === 'done') { localStorage.removeItem(PROGRESS_KEY); return; }
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        studyId: studyId.current, screen, profile, preAnswers, phaseB, phaseC, postAnswers,
      }));
    } catch (e) { /* storage unavailable — non-blocking */ }
  }, [screen, profile, preAnswers, phaseB, phaseC, postAnswers]);

  const setPre = (id, v) => setPreAnswers(prev => ({ ...prev, [id]: v }));
  const setPost = (id, v) => setPostAnswers(prev => ({ ...prev, [id]: v }));

  // Structured profile for the prompts; career/ratings get added after Phase B.
  const baseProfile = buildProfileData(preAnswers);
  const fullProfile = phaseB
    ? { ...baseProfile, career: phaseB.career, familiarity: phaseB.familiarity, interestStrength: phaseB.interestStrength }
    : baseProfile;

  const restart = () => {
    try { localStorage.removeItem(PROGRESS_KEY); } catch (e) {}
    studyId.current = null; // a fresh session row is created at the next consent (§15)
    setProfile({ name: '', color: tweaks.accent });
    setPreAnswers({}); setPhaseB(null); setPhaseC(null); setPostAnswers({});
    setFreeCont(null); phaseCSessionId.current = null;
    setScreen('landing');
  };

  // One confirm-guarded restart shared by the floating fab AND the chat sidebar's
  // "Start over" — a single misclick must never wipe a session in progress.
  const confirmRestart = () => {
    const ok = typeof window.confirm === 'function'
      ? window.confirm('Restart from the beginning? Your current attempt will be left behind (it stays saved for the researcher) and a fresh one starts.')
      : true;
    if (ok) restart();
  };

  // Resume-or-restart (Build Plan §13a): restore the saved snapshot, or start
  // fresh. The snapshot is merged with the SERVER row when one exists — the
  // per-turn autosaves there hold the mid-chat transcript and the conversation
  // clock, which the local snapshot doesn't (it only captures completed phases).
  // That's what lets a refresh/redeploy mid-role-play resume the SAME
  // conversation at the SAME clock instead of starting over.
  const resumeRun = async () => {
    const s = pendingSnap || {};
    if (s.profile) setProfile(s.profile);
    if (s.preAnswers) setPreAnswers(s.preAnswers);
    let pb = s.phaseB || null;
    let pc = s.phaseC || null;
    if (studyId.current) {
      try {
        const r = await fetch(PERSIST_BASE + '/api/sessions/' + studyId.current);
        if (r.ok) {
          const study = await r.json();
          if (!pb && study.phaseB && (study.phaseB.career || (study.phaseB.transcript || []).length)) pb = study.phaseB;
          const serverC = study.phaseC || {};
          const serverTurns = (serverC.transcript || []).length;
          const localTurns = ((pc && pc.transcript) || []).length;
          if (serverTurns > localTurns) pc = serverC;
        }
      } catch (e) { /* offline — snapshot only */ }
    }
    if (pb) setPhaseB(pb);
    if (pc && (pc.transcript || []).length) { setPhaseC(pc); resumedC.current = true; }
    if (s.postAnswers) setPostAnswers(s.postAnswers);
    setPendingSnap(null);
    setScreen(s.screen || 'landing');
  };
  const startOver = () => { setPendingSnap(null); restart(); };

  return (
    <div className="app">
      {screen === 'resume_choice' && (
        <div className="flow">
          <nav className="topnav"><div className="brand"><BrandMark size={22} /><span>Thesis</span></div><div className="end" /></nav>
          <div className="flow-body">
            <div className="sv-wrap" style={{ textAlign: 'center' }}>
              <div className="eyebrow" style={{ justifyContent: 'center' }}><span className="dot" />Welcome back</div>
              <h2 className="consent-title">Continue where you left off?</h2>
              <p className="sv-intro" style={{ maxWidth: '46ch', margin: '0 auto 20px' }}>
                We found an unfinished session on this device. You can pick up exactly where you stopped, or start a fresh one.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn accent" onClick={resumeRun}>Continue my session →</button>
                <button className="btn ghost" onClick={startOver}>Start over</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {screen === 'launcher' && (
        <Launcher condition={condition} rec={rec} study={study} pid={pid}
          onStart={() => setScreen('landing')} />
      )}

      {screen === 'landing' && <Landing onBegin={() => setScreen('consent')} />}

      {screen === 'consent' && (
        <Consent onAgree={beginAfterConsent} onBack={() => setScreen('landing')} />
      )}

      {screen === 'avatar' && (
        <div className="flow">
          <div className="flow-progress"><div className="bar" style={{ width: '8%' }} /></div>
          <nav className="topnav">
            <div className="brand"><BrandMark size={22} /><span>Thesis</span></div>
            <div className="sv-eyebrow">Step 01 · Set up</div>
            <div className="end"><button className="btn ghost sm" onClick={() => setScreen('landing')}>Exit</button></div>
          </nav>
          <div className="flow-body">
            <AvatarCreation value={profile} onChange={setProfile} />
          </div>
          <div className="flow-foot">
            <button className="btn ghost" onClick={() => setScreen('consent')}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M10 6.5H3M6.5 3l-4 3.5 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Back
            </button>
            <span className="step-label">STEP 01</span>
            <button className="btn accent" disabled={!profile.name.trim()} onClick={() => setScreen('presurvey')}>
              Continue
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5h7M6.5 3l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      )}

      {screen === 'presurvey' && (
        <PreSurvey answers={preAnswers} onChange={setPre}
          onDone={() => {
            apiSaveSession(studyId.current, {
              profile,
              preSurvey: preAnswers,
              // Distal-outcome scores ride in `scores` but are NEVER part of the
              // AI profile (Build Plan §10.1i/j: not fed to the model).
              scores: {
                bigFive: baseProfile.bigFive, riasec: baseProfile.riasec, values: baseProfile.values,
                cdseSA_pre: scoreCdseSA(preAnswers), cipCCA_pre: scoreCipCCA(preAnswers),
              },
            });
            setScreen('pause_ab');
          }}
          onBack={() => setScreen('avatar')} />
      )}

      {screen === 'pause_ab' && (
        <Pause title="Take a breath."
          lines={[
            "That's the questionnaire done.",
            "Next, a short conversation to explore some career directions — you'll pick one to step into. Rest a moment, and continue when you're ready.",
          ]}
          onContinue={() => setScreen('phaseb')} />
      )}

      {screen === 'phaseb' && (
        <PhaseB profileData={baseProfile} rec={rec}
          onAutosave={(tr) => apiSaveSession(studyId.current, { phaseB: { transcript: tr } })}
          onDone={(pb) => { setPhaseB(pb); apiSaveSession(studyId.current, { phaseB: pb }); setScreen('pause_bc'); }}
          onBack={() => setScreen('presurvey')} />
      )}

      {screen === 'pause_bc' && (
        <Pause title="Take a breath." eyebrow="One more breath" cta="Begin"
          lines={[
            "You've chosen a career to step into. Next you'll talk with yourself, ten years from now, living that life.",
            "It's yours to pace — around 20 minutes in, your future self will gently suggest wrapping up, and it closes at 30. A few short questions follow; then you can keep chatting if you like.",
          ]}
          onContinue={() => setScreen('roleplay')} />
      )}

      {screen === 'roleplay' && (
        <Chat profile={profile} condition={condition} profileData={fullProfile}
          phaseBNotes={phaseBNotesFrom(phaseB)} location={phaseB && phaseB.location} career={phaseB && phaseB.career}
          seedTranscript={(resumedC.current && phaseC && phaseC.transcript) || []}
          seedElapsedSec={(resumedC.current && phaseC && phaseC.durationSec) || 0}
          onAutosave={(tr, extra) => apiSaveSession(studyId.current, { phaseC: { transcript: tr, ...(extra || {}) } })}
          onComplete={(pc, sid) => {
            setPhaseC(pc); phaseCSessionId.current = sid;
            apiSaveSession(studyId.current, { phaseC: pc });
            setScreen('pause_cpost');
          }}
          onExit={confirmRestart} />
      )}

      {screen === 'pause_cpost' && (
        <Pause title="Thank you."
          lines={[
            "A few short questions about how that felt, then you're done.",
            "Take a breath, and continue when you're ready.",
          ]}
          onContinue={() => setScreen('postsurvey')} />
      )}

      {screen === 'postsurvey' && (
        <PostSurvey answers={postAnswers} onChange={setPost} career={phaseB && phaseB.career} study={study}
          onDone={() => {
            apiSaveSession(studyId.current, {
              postSurvey: postAnswers,
              scores: {
                bigFive: baseProfile.bigFive, riasec: baseProfile.riasec, values: baseProfile.values,
                cdseSA_pre: scoreCdseSA(preAnswers), cipCCA_pre: scoreCipCCA(preAnswers),
                cdseSA_post: scoreCdseSA(postAnswers, '_post'), cipCCA_post: scoreCipCCA(postAnswers, '_post'),
              },
              version: '3.1', finalize: true,
            });
            setScreen('free');
          }} />
      )}

      {screen === 'free' && (
        <FreeContinuation profile={profile} career={phaseB && phaseB.career} sessionId={phaseCSessionId.current}
          history={(phaseC && phaseC.transcript) || []}
          condition={condition} profileData={fullProfile} phaseBNotes={phaseBNotesFrom(phaseB)}
          location={phaseB && phaseB.location}
          onAutosave={(tr) => apiSaveSession(studyId.current, { freeContinuation: { transcript: tr } })}
          onDone={(fc) => { setFreeCont(fc); apiSaveSession(studyId.current, { freeContinuation: fc }); setScreen('done'); }} />
      )}

      {screen === 'done' && (
        <Closure
          study={{
            meta: { condition, rec, study, pid, version: '3.1', completedAt: new Date().toISOString() },
            profile,
            preSurvey: preAnswers,
            scores: {
              bigFive: baseProfile.bigFive, riasec: baseProfile.riasec, values: baseProfile.values,
              cdseSA_pre: scoreCdseSA(preAnswers), cipCCA_pre: scoreCipCCA(preAnswers),
              cdseSA_post: scoreCdseSA(postAnswers, '_post'), cipCCA_post: scoreCipCCA(postAnswers, '_post'),
            },
            phaseB,
            phaseC,
            postSurvey: postAnswers,
            freeContinuation: freeCont || {},
          }}
          onRestart={restart} />
      )}

      {/* The design Tweaks panel is a researcher/dev tool — hidden from real
          participants to keep the flow seamless (Build Plan §16); show with ?test=1. */}
      {testMode && <ThesisTweaks tweaks={tweaks} setTweak={setTweak} />}
      {/* Participant-facing comfort/accessibility control (always available). */}
      <ComfortSettings tweaks={tweaks} setTweak={setTweak} />
      {/* Persistent "restart" chrome (§0): always available mid-run; warns that the
          current attempt is left behind (still saved for the researcher). */}
      {!['landing', 'launcher', 'resume_choice', 'done'].includes(screen) && (
        <button className="restart-fab" title="Restart survey" onClick={confirmRestart}>↻ Restart</button>
      )}
    </div>
  );
}

/* Closure — thank-you, free-continuation note, and JSON data export (no DB) */
function Closure({ study, onRestart }) {
  const download = () => {
    const blob = new Blob([JSON.stringify(study, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url; a.download = `thesis-session-${study.meta.condition}-${stamp}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flow">
      <nav className="topnav">
        <div className="brand"><BrandMark size={22} /><span>Thesis</span></div>
        <div className="end" />
      </nav>
      <div className="flow-body">
        <div className="sv-wrap" style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ justifyContent: 'center' }}><span className="dot" />All done</div>
          <h2 className="consent-title">Thank you</h2>
          <p className="sv-intro" style={{ maxWidth: '46ch', margin: '0 auto 14px' }}>
            That's the end of the study. Whatever your future self showed you, the decision about where
            you go from here stays entirely yours.
          </p>
          <p className="sv-intro" style={{ maxWidth: '46ch', margin: '0 auto 18px' }}>
            What you met today is one possible future, built from your own answers — not a prediction,
            and not a recommendation.
          </p>
          <p className="sv-intro" style={{ maxWidth: '46ch', margin: '0 auto 24px', color: 'var(--muted)' }}>
            Your responses have been saved — thank you for taking part. If you opted in to a follow-up
            interview, the researcher will reach out using the contact you left.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn ghost" onClick={download}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v7M4 6.5l3 3 3-3M2.5 11.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Download my session data
            </button>
            <button className="btn accent" onClick={onRestart}>Start over</button>
          </div>
          <p className="sv-hint" style={{ marginTop: 18 }}>
            Condition: {study.meta.condition} · the JSON holds your survey responses and both transcripts.
          </p>
        </div>
      </div>
    </div>
  );
}

/* color helpers */
function tintFromAccent(hex) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c) => Math.round(c + (245 - c) * 0.8);
  return rgbToHex(mix(r), mix(g), mix(b));
}
function shadeMix(hex, amt, target) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (c) => Math.round(c + (target - c) * amt);
  return rgbToHex(mix(r), mix(g), mix(b));
}
function shadeFromAccent(hex, theme) {
  const { r, g, b } = hexToRgb(hex);
  if (theme === 'dark') { const mix = (c) => Math.round(c + (250 - c) * 0.55); return rgbToHex(mix(r), mix(g), mix(b)); }
  const mix = (c) => Math.round(c * 0.45); return rgbToHex(mix(r), mix(g), mix(b));
}
function hexToRgb(h) { const v = h.replace('#', ''); return { r: parseInt(v.slice(0,2),16), g: parseInt(v.slice(2,4),16), b: parseInt(v.slice(4,6),16) }; }
function rgbToHex(r, g, b) { return '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join(''); }

/* Tweaks panel */
function ThesisTweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Appearance">
        <TweakRadio label="Mode" value={tweaks.theme} onChange={(v) => setTweak('theme', v)}
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}/>
        <TweakColor label="Accent" value={tweaks.accent} onChange={(v) => setTweak('accent', v)} options={ACCENT_OPTIONS}/>
        <TweakRadio label="Headlines" value={tweaks.headlineFont} onChange={(v) => setTweak('headlineFont', v)}
          options={[{ value: 'serif', label: 'Serif' }, { value: 'sans', label: 'Sans' }]}/>
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
