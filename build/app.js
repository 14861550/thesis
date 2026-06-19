/* compiled from app.jsx — do not edit; run `npm run build` */
(function () {
const {
  useState,
  useEffect,
  useLayoutEffect,
  useRef
} = React;
const DEFAULT_TWEAKS = {
  "theme": "dark",
  "accent": "#b5552f",
  "headlineFont": "serif"
};
const ACCENT_OPTIONS = ['#b5552f', '#5d6b4d', '#3c5e85', '#7a3d68', '#2f2f2d'];
function qp(name) {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch (e) {
    return null;
  }
}
function readCondition() {
  const c = qp('condition') || qp('cond');
  return c === 'baseline' ? 'baseline' : 'main';
}
function readRec() {
  const r = qp('rec');
  return ['guide', 'reflective', 'direct'].includes(r) ? r : 'direct';
}
function readStudy() {
  return qp('study') || 'kangzhi';
}
function readPid() {
  return qp('pid') || null;
}
function readTestMode() {
  return qp('test') === '1';
}
function readPreview() {
  return qp('preview') === '1';
}
const PERSIST_BASE = typeof window !== 'undefined' && window.THESIS_API_BASE || '';
const PROGRESS_KEY = 'thesis_progress_v3';
function readSessionParam() {
  try {
    return new URLSearchParams(window.location.search).get('session');
  } catch (e) {
    return null;
  }
}
async function apiCreateSession({
  condition,
  rec,
  study,
  pid
}) {
  try {
    const r = await fetch(PERSIST_BASE + '/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        condition,
        rec,
        study,
        pid
      })
    });
    const d = await r.json().catch(() => ({}));
    return d && d.id ? d.id : null;
  } catch (e) {
    return null;
  }
}
function apiSaveSession(id, partial) {
  if (!id) return Promise.resolve();
  return fetch(PERSIST_BASE + '/api/sessions/' + id, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(partial)
  }).catch(() => {});
}
function phaseBNotesFrom(pb) {
  if (!pb || !pb.transcript) return '';
  const userTurns = pb.transcript.filter(t => t.role === 'user').map(t => `- ${t.text}`);
  return [`They chose to step into: ${pb.career}.`, userTurns.length ? `In the recommendation chat they said:\n${userTurns.join('\n')}` : ''].filter(Boolean).join('\n');
}
function resumeScreenFor(study) {
  const has = o => o && Object.keys(o).length > 0;
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
  const [preview] = useState(readPreview);
  if (typeof window !== 'undefined') window.THESIS_PREVIEW = preview;
  const [screen, setScreen] = useState(() => readTestMode() ? 'launcher' : 'landing');
  const [profile, setProfile] = useState({
    name: '',
    color: '#b5552f'
  });
  const [preAnswers, setPreAnswers] = useState({});
  const [phaseB, setPhaseB] = useState(null);
  const [phaseC, setPhaseC] = useState(null);
  const [postAnswers, setPostAnswers] = useState({});
  const [freeCont, setFreeCont] = useState(null);
  const [pendingSnap, setPendingSnap] = useState(null);
  const phaseCSessionId = useRef(null);
  const resumedC = useRef(false);
  const [exploreB, setExploreB] = useState(null);
  const explorations = useRef([]);
  const saveFreeSection = (fc, draft) => apiSaveSession(studyId.current, {
    freeContinuation: {
      ...(fc || freeCont || {}),
      explorations: draft ? [...explorations.current, draft] : explorations.current
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    try {
      let m = document.getElementById('theme-color-live');
      if (!m) {
        m = document.createElement('meta');
        m.id = 'theme-color-live';
        m.name = 'theme-color';
        document.head.appendChild(m);
      }
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      m.setAttribute('content', bg || (tweaks.theme === 'dark' ? '#1a1a19' : '#ffffff'));
    } catch (e) {}
    document.documentElement.style.setProperty('--accent', tweaks.accent);
    document.documentElement.style.setProperty('--accent-soft', tweaks.theme === 'dark' ? shadeMix(tweaks.accent, 0.78, 30) : tintFromAccent(tweaks.accent));
    document.documentElement.style.setProperty('--accent-ink', shadeFromAccent(tweaks.accent, tweaks.theme));
    document.documentElement.style.setProperty('--font-serif', tweaks.headlineFont === 'sans' ? 'var(--font-sans)' : '"Instrument Serif", ui-serif, Georgia, "Times New Roman", serif');
  }, [tweaks]);
  useEffect(() => {
    setProfile(p => ({
      ...p,
      color: tweaks.accent
    }));
  }, [tweaks.accent]);
  const studyId = useRef(null);
  useEffect(() => {
    let snap = null;
    try {
      snap = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
    } catch (e) {}
    const existing = readSessionParam();
    if (readPreview()) return;
    if (existing && qp('resume') === '1' && !readTestMode()) {
      studyId.current = existing;
      (async () => {
        try {
          const r = await fetch(PERSIST_BASE + '/api/sessions/' + existing);
          if (!r.ok) throw new Error('not found');
          const study = await r.json();
          if (study.profile && study.profile.name) setProfile(p => ({
            ...p,
            ...study.profile
          }));
          if (study.preSurvey) setPreAnswers(study.preSurvey);
          if (study.phaseB && (study.phaseB.career || (study.phaseB.transcript || []).length)) setPhaseB(study.phaseB);
          if (study.phaseC && (study.phaseC.transcript || []).length) {
            setPhaseC(study.phaseC);
            resumedC.current = true;
          }
          if (study.postSurvey && Object.keys(study.postSurvey).length) setPostAnswers(study.postSurvey);
          setScreen(resumeScreenFor(study));
        } catch (e) {
          setScreen('landing');
        }
      })();
      return;
    }
    if (!readTestMode() && snap && snap.screen && snap.screen !== 'landing' && snap.screen !== 'done') {
      if (snap.studyId) studyId.current = snap.studyId;else if (existing) studyId.current = existing;
      setPendingSnap(snap);
      setScreen('resume_choice');
      return;
    }
    if (existing) {
      studyId.current = existing;
      return;
    }
  }, []);
  const beginAfterConsent = () => {
    if (!studyId.current && !preview) {
      apiCreateSession({
        condition,
        rec,
        study,
        pid
      }).then(id => {
        studyId.current = id;
      });
    }
    setScreen('avatar');
  };
  useEffect(() => {
    if (preview) return;
    if (['landing', 'consent', 'avatar', 'resume_choice', 'launcher'].includes(screen)) return;
    try {
      if (screen === 'done') {
        localStorage.removeItem(PROGRESS_KEY);
        return;
      }
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        studyId: studyId.current,
        screen,
        profile,
        preAnswers,
        phaseB,
        phaseC,
        postAnswers
      }));
    } catch (e) {}
  }, [screen, profile, preAnswers, phaseB, phaseC, postAnswers]);
  const scrollPos = useRef({});
  const scrollKeyRef = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      if (scrollKeyRef.current != null) scrollPos.current[scrollKeyRef.current] = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useLayoutEffect(() => {
    scrollKeyRef.current = screen;
    window.scrollTo(0, scrollPos.current[screen] || 0);
  }, [screen]);
  const setPre = (id, v) => setPreAnswers(prev => ({
    ...prev,
    [id]: v
  }));
  const setPost = (id, v) => setPostAnswers(prev => ({
    ...prev,
    [id]: v
  }));
  const PREVIEW_SAMPLE = {
    year: '3rd year',
    demographics: {
      age: 22,
      gender: 'female',
      major: 'Psychology'
    },
    bigFive: {
      O: 5.5,
      C: 4.5,
      E: 3.5,
      A: 6,
      ES: 4.5
    },
    values: ['Helping others', 'Achievement', 'Independence'],
    riasec: {
      R: 2,
      I: 6,
      A: 4,
      S: 6,
      E: 3,
      C: 2
    }
  };
  const baseProfile = preview && !(preAnswers.major || '').trim() ? PREVIEW_SAMPLE : buildProfileData(preAnswers);
  const fullProfile = phaseB ? {
    ...baseProfile,
    career: phaseB.career,
    familiarity: phaseB.familiarity,
    interestStrength: phaseB.interestStrength
  } : baseProfile;
  const restart = () => {
    try {
      localStorage.removeItem(PROGRESS_KEY);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.indexOf('thesis_svpage') === 0) localStorage.removeItem(k);
      }
    } catch (e) {}
    studyId.current = null;
    setProfile({
      name: '',
      color: tweaks.accent
    });
    setPreAnswers({});
    setPhaseB(null);
    setPhaseC(null);
    setPostAnswers({});
    setFreeCont(null);
    phaseCSessionId.current = null;
    setExploreB(null);
    explorations.current = [];
    setScreen('landing');
  };
  const confirmRestart = () => {
    const ok = typeof window.confirm === 'function' ? window.confirm('Restart from the beginning? Your current attempt will be left behind (it stays saved for the researcher) and a fresh one starts.') : true;
    if (ok) restart();
  };
  const confirmBack = (msg, action) => {
    const ok = typeof window.confirm === 'function' ? window.confirm(msg) : true;
    if (ok) action();
  };
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
          const localTurns = (pc && pc.transcript || []).length;
          if (serverTurns > localTurns) pc = serverC;
        }
      } catch (e) {}
    }
    if (pb) setPhaseB(pb);
    if (pc && (pc.transcript || []).length) {
      setPhaseC(pc);
      resumedC.current = true;
    }
    if (s.postAnswers) setPostAnswers(s.postAnswers);
    setPendingSnap(null);
    setScreen(s.screen || 'landing');
  };
  const startOver = () => {
    setPendingSnap(null);
    restart();
  };
  return React.createElement("div", {
    className: "app"
  }, screen === 'resume_choice' && React.createElement("div", {
    className: "flow"
  }, React.createElement("nav", {
    className: "topnav"
  }, React.createElement("div", {
    className: "brand"
  }, React.createElement(BrandMark, {
    size: 22
  }), React.createElement("span", null, "Thesis")), React.createElement("div", {
    className: "end"
  })), React.createElement("div", {
    className: "flow-body"
  }, React.createElement("div", {
    className: "sv-wrap",
    style: {
      textAlign: 'center'
    }
  }, React.createElement("div", {
    className: "eyebrow",
    style: {
      justifyContent: 'center'
    }
  }, React.createElement("span", {
    className: "dot"
  }), "Welcome back"), React.createElement("h2", {
    className: "consent-title"
  }, "Continue where you left off?"), React.createElement("p", {
    className: "sv-intro",
    style: {
      maxWidth: '46ch',
      margin: '0 auto 20px'
    }
  }, "We found an unfinished session on this device. You can pick up exactly where you stopped, or start a fresh one."), React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'center',
      flexWrap: 'wrap'
    }
  }, React.createElement("button", {
    className: "btn accent",
    onClick: resumeRun
  }, "Continue my session \u2192"), React.createElement("button", {
    className: "btn ghost",
    onClick: startOver
  }, "Start over"))))), screen === 'launcher' && React.createElement(Launcher, {
    condition: condition,
    rec: rec,
    study: study,
    pid: pid,
    onStart: () => setScreen('landing')
  }), screen === 'landing' && React.createElement(Landing, {
    onBegin: () => setScreen('consent')
  }), screen === 'consent' && React.createElement(Consent, {
    onAgree: beginAfterConsent,
    onBack: () => setScreen('landing')
  }), screen === 'avatar' && React.createElement("div", {
    className: "flow"
  }, React.createElement("div", {
    className: "flow-progress"
  }, React.createElement("div", {
    className: "bar",
    style: {
      width: '8%'
    }
  })), React.createElement("nav", {
    className: "topnav"
  }, React.createElement("div", {
    className: "brand"
  }, React.createElement(BrandMark, {
    size: 22
  }), React.createElement("span", null, "Thesis")), React.createElement("div", {
    className: "sv-eyebrow"
  }, "Step 01 \xB7 Set up"), React.createElement("div", {
    className: "end"
  }, React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => setScreen('landing')
  }, "Exit"))), React.createElement("div", {
    className: "flow-body"
  }, React.createElement(AvatarCreation, {
    value: profile,
    onChange: setProfile
  })), React.createElement("div", {
    className: "flow-foot"
  }, React.createElement("button", {
    className: "btn ghost",
    onClick: () => setScreen('consent')
  }, React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 13 13",
    fill: "none"
  }, React.createElement("path", {
    d: "M10 6.5H3M6.5 3l-4 3.5 4 3.5",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), "Back"), React.createElement("span", {
    className: "step-label"
  }, "STEP 01"), React.createElement("button", {
    className: "btn accent",
    disabled: !profile.name.trim() && !preview,
    onClick: () => setScreen('presurvey')
  }, "Continue", React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 13 13",
    fill: "none"
  }, React.createElement("path", {
    d: "M3 6.5h7M6.5 3l4 3.5-4 3.5",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))))), screen === 'presurvey' && React.createElement(PreSurvey, {
    answers: preAnswers,
    onChange: setPre,
    onDone: () => {
      apiSaveSession(studyId.current, {
        profile,
        preSurvey: preAnswers,
        scores: {
          bigFive: baseProfile.bigFive,
          riasec: baseProfile.riasec,
          values: baseProfile.values,
          cip_pre: scoreCip(preAnswers)
        }
      });
      setScreen('pause_ab');
    },
    onBack: () => setScreen('avatar')
  }), screen === 'pause_ab' && React.createElement(Pause, {
    title: "Take a breath.",
    lines: ["That's the questionnaire done.", "Next, a short conversation to explore some career directions — you'll pick one to step into. Rest a moment, and continue when you're ready."],
    onContinue: () => setScreen('phaseb'),
    onBack: () => setScreen('presurvey')
  }), screen === 'phaseb' && React.createElement(PhaseB, {
    profileData: baseProfile,
    rec: rec,
    seedTranscript: phaseB && !phaseB.career && phaseB.transcript || [],
    onAutosave: tr => apiSaveSession(studyId.current, {
      phaseB: {
        transcript: tr
      }
    }),
    onDone: pb => {
      setPhaseB(pb);
      apiSaveSession(studyId.current, {
        phaseB: pb
      });
      setScreen('pause_bc');
    },
    onBack: () => setScreen('presurvey')
  }), screen === 'pause_bc' && React.createElement(Pause, {
    title: "Take a breath.",
    eyebrow: "One more breath",
    cta: "Begin",
    lines: ["You've chosen a career to step into. Next you'll talk with yourself, ten years from now, living that life.", "It's yours to pace — around 20 minutes in, your future self will gently suggest wrapping up, and it closes at 30. A few short questions follow; then you can keep chatting if you like."],
    onContinue: () => setScreen('roleplay'),
    onBack: () => confirmBack(`Go back to find a direction again?${phaseB && phaseB.career ? ` Your choice (${phaseB.career}) won't carry over` : ''} — you'll pick one again.`, () => {
      setPhaseB(null);
      setScreen('phaseb');
    })
  }), screen === 'roleplay' && React.createElement(Chat, {
    profile: profile,
    condition: condition,
    profileData: fullProfile,
    phaseBNotes: phaseBNotesFrom(phaseB),
    location: phaseB && phaseB.location,
    career: phaseB && phaseB.career,
    seedTranscript: resumedC.current && phaseC && phaseC.transcript || [],
    seedElapsedSec: resumedC.current && phaseC && phaseC.durationSec || 0,
    onAutosave: (tr, extra) => apiSaveSession(studyId.current, {
      phaseC: {
        transcript: tr,
        ...(extra || {})
      }
    }),
    onComplete: (pc, sid) => {
      setPhaseC(pc);
      phaseCSessionId.current = sid;
      apiSaveSession(studyId.current, {
        phaseC: pc
      });
      setScreen('pause_cpost');
    },
    onExit: confirmRestart
  }), screen === 'pause_cpost' && React.createElement(Pause, {
    title: "Thank you.",
    lines: ["A few short questions about how that felt — then the session opens up: you can keep chatting, or step into other careers, for as long as you like.", "Take a breath, and continue when you're ready."],
    onContinue: () => setScreen('postsurvey'),
    onBack: () => confirmBack("Go back into the conversation? You'll return to where it ended and can keep talking before the questions.", () => {
      resumedC.current = true;
      setScreen('roleplay');
    })
  }), screen === 'postsurvey' && React.createElement(PostSurvey, {
    answers: postAnswers,
    onChange: setPost,
    career: phaseB && phaseB.career,
    onDone: () => {
      apiSaveSession(studyId.current, {
        postSurvey: postAnswers,
        scores: {
          bigFive: baseProfile.bigFive,
          riasec: baseProfile.riasec,
          values: baseProfile.values,
          cip_pre: scoreCip(preAnswers),
          cip_post: scoreCip(postAnswers, '_post')
        },
        version: '3.1',
        finalize: true
      });
      setScreen('explore_hub');
    }
  }), screen === 'explore_hub' && React.createElement("div", {
    className: "flow"
  }, React.createElement("nav", {
    className: "topnav"
  }, React.createElement("div", {
    className: "brand"
  }, React.createElement(BrandMark, {
    size: 22
  }), React.createElement("span", null, "Thesis")), React.createElement("div", {
    className: "end"
  })), React.createElement("div", {
    className: "flow-body"
  }, React.createElement("div", {
    className: "sv-wrap",
    style: {
      textAlign: 'center'
    }
  }, React.createElement("div", {
    className: "eyebrow",
    style: {
      justifyContent: 'center'
    }
  }, React.createElement("span", {
    className: "dot"
  }), "Study questions done \u2014 this part is just for you"), React.createElement("h2", {
    className: "consent-title"
  }, "Keep exploring, if you like"), React.createElement("p", {
    className: "sv-intro",
    style: {
      maxWidth: '52ch',
      margin: '0 auto 24px'
    }
  }, "Your study session is complete and saved. From here on, nothing counts toward the research analysis \u2014 it's still recorded, but it's your playground: keep the conversation going, or step into entirely different careers, as many as you like."), React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      alignItems: 'center'
    }
  }, React.createElement("button", {
    className: "btn accent",
    onClick: () => setScreen('free')
  }, "Keep talking with ", profile.name || 'your future self', " \u2192"), React.createElement("button", {
    className: "btn ghost",
    onClick: () => {
      setExploreB(null);
      setScreen('explore_b');
    }
  }, "Step into a different career \u2192"), React.createElement("button", {
    className: "btn ghost",
    onClick: () => setScreen('done')
  }, "I'm done \u2014 finish up"))))), screen === 'explore_b' && React.createElement(PhaseB, {
    profileData: baseProfile,
    rec: rec,
    onAutosave: () => {},
    onDone: pb => {
      setExploreB(pb);
      setScreen('explore_c');
    },
    onBack: () => setScreen('explore_hub')
  }), screen === 'explore_c' && React.createElement(Chat, {
    profile: profile,
    mode: "exploration",
    condition: "main",
    profileData: {
      ...baseProfile,
      career: exploreB && exploreB.career,
      familiarity: exploreB && exploreB.familiarity,
      interestStrength: exploreB && exploreB.interestStrength
    },
    phaseBNotes: phaseBNotesFrom(exploreB),
    location: exploreB && exploreB.location,
    career: exploreB && exploreB.career,
    onSwitchCareer: () => setScreen('explore_b'),
    onAutosave: tr => saveFreeSection(null, {
      career: exploreB && exploreB.career,
      transcript: tr,
      inProgress: true
    }),
    onComplete: pc => {
      explorations.current = [...explorations.current, {
        career: exploreB && exploreB.career || null,
        location: exploreB && exploreB.location || null,
        phaseBTranscript: exploreB && exploreB.transcript || [],
        transcript: pc.transcript,
        durationSec: pc.durationSec,
        turnCount: pc.turnCount,
        ts: new Date().toISOString()
      }];
      saveFreeSection(null, null);
      setScreen('explore_hub');
    },
    onExit: confirmRestart
  }), screen === 'free' && React.createElement(FreeContinuation, {
    profile: profile,
    career: phaseB && phaseB.career,
    sessionId: phaseCSessionId.current,
    history: phaseC && phaseC.transcript || [],
    condition: condition,
    profileData: fullProfile,
    phaseBNotes: phaseBNotesFrom(phaseB),
    location: phaseB && phaseB.location,
    onSwitchCareer: () => {
      setExploreB(null);
      setScreen('explore_b');
    },
    onAutosave: tr => saveFreeSection({
      transcript: tr
    }, null),
    onDone: fc => {
      setFreeCont(fc);
      saveFreeSection(fc, null);
      setScreen('explore_hub');
    }
  }), screen === 'done' && React.createElement(Closure, {
    study: {
      meta: {
        condition,
        rec,
        study,
        pid,
        version: '3.1',
        completedAt: new Date().toISOString()
      },
      profile,
      preSurvey: preAnswers,
      scores: {
        bigFive: baseProfile.bigFive,
        riasec: baseProfile.riasec,
        values: baseProfile.values,
        cip_pre: scoreCip(preAnswers),
        cip_post: scoreCip(postAnswers, '_post')
      },
      phaseB,
      phaseC,
      postSurvey: postAnswers,
      freeContinuation: {
        ...(freeCont || {}),
        explorations: explorations.current
      }
    },
    onRestart: restart
  }), preview && React.createElement("div", {
    className: "preview-badge",
    title: "Researcher test drive \u2014 no session row, no autosaves, all gates skippable"
  }, "PREVIEW \xB7 nothing is saved \xB7 gates off"), testMode && React.createElement(ThesisTweaks, {
    tweaks: tweaks,
    setTweak: setTweak
  }), React.createElement(ComfortSettings, {
    tweaks: tweaks,
    setTweak: setTweak
  }), !['landing', 'launcher', 'resume_choice', 'done'].includes(screen) && React.createElement("button", {
    className: "restart-fab",
    title: "Restart survey",
    onClick: confirmRestart
  }, "\u21BB Restart"));
}
function Closure({
  study,
  onRestart
}) {
  const download = () => {
    const blob = new Blob([JSON.stringify(study, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `thesis-session-${study.meta.condition}-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return React.createElement("div", {
    className: "flow"
  }, React.createElement("nav", {
    className: "topnav"
  }, React.createElement("div", {
    className: "brand"
  }, React.createElement(BrandMark, {
    size: 22
  }), React.createElement("span", null, "Thesis")), React.createElement("div", {
    className: "end"
  })), React.createElement("div", {
    className: "flow-body"
  }, React.createElement("div", {
    className: "sv-wrap",
    style: {
      textAlign: 'center'
    }
  }, React.createElement("div", {
    className: "eyebrow",
    style: {
      justifyContent: 'center'
    }
  }, React.createElement("span", {
    className: "dot"
  }), "All done"), React.createElement("h2", {
    className: "consent-title"
  }, "Thank you"), React.createElement("p", {
    className: "sv-intro",
    style: {
      maxWidth: '46ch',
      margin: '0 auto 14px'
    }
  }, "That's the end of the study. Whatever your future self showed you, the decision about where you go from here stays entirely yours."), React.createElement("p", {
    className: "sv-intro",
    style: {
      maxWidth: '46ch',
      margin: '0 auto 18px'
    }
  }, "What you met today is one possible future, built from your own answers \u2014 not a prediction, and not a recommendation."), React.createElement("p", {
    className: "sv-intro",
    style: {
      maxWidth: '46ch',
      margin: '0 auto 24px',
      color: 'var(--muted)'
    }
  }, "Your responses have been saved \u2014 thank you for taking part. If you'd like to take part in a short follow-up interview, email the team at thy.le@student.uva.nl."), React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'center',
      flexWrap: 'wrap'
    }
  }, React.createElement("button", {
    className: "btn ghost",
    onClick: download
  }, React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, React.createElement("path", {
    d: "M7 2v7M4 6.5l3 3 3-3M2.5 11.5h9",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), "Download my session data"), React.createElement("button", {
    className: "btn accent",
    onClick: onRestart
  }, "Start over")), React.createElement("p", {
    className: "sv-hint",
    style: {
      marginTop: 18
    }
  }, "Condition: ", study.meta.condition, " \xB7 the JSON holds your survey responses and both transcripts."))));
}
function tintFromAccent(hex) {
  const {
    r,
    g,
    b
  } = hexToRgb(hex);
  const mix = c => Math.round(c + (245 - c) * 0.8);
  return rgbToHex(mix(r), mix(g), mix(b));
}
function shadeMix(hex, amt, target) {
  const {
    r,
    g,
    b
  } = hexToRgb(hex);
  const mix = c => Math.round(c + (target - c) * amt);
  return rgbToHex(mix(r), mix(g), mix(b));
}
function shadeFromAccent(hex, theme) {
  const {
    r,
    g,
    b
  } = hexToRgb(hex);
  if (theme === 'dark') {
    const mix = c => Math.round(c + (250 - c) * 0.55);
    return rgbToHex(mix(r), mix(g), mix(b));
  }
  const mix = c => Math.round(c * 0.45);
  return rgbToHex(mix(r), mix(g), mix(b));
}
function hexToRgb(h) {
  const v = h.replace('#', '');
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16)
  };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}
function ThesisTweaks({
  tweaks,
  setTweak
}) {
  return React.createElement(TweaksPanel, {
    title: "Tweaks"
  }, React.createElement(TweakSection, {
    label: "Appearance"
  }, React.createElement(TweakRadio, {
    label: "Mode",
    value: tweaks.theme,
    onChange: v => setTweak('theme', v),
    options: [{
      value: 'light',
      label: 'Light'
    }, {
      value: 'dark',
      label: 'Dark'
    }]
  }), React.createElement(TweakColor, {
    label: "Accent",
    value: tweaks.accent,
    onChange: v => setTweak('accent', v),
    options: ACCENT_OPTIONS
  }), React.createElement(TweakRadio, {
    label: "Headlines",
    value: tweaks.headlineFont,
    onChange: v => setTweak('headlineFont', v),
    options: [{
      value: 'serif',
      label: 'Serif'
    }, {
      value: 'sans',
      label: 'Sans'
    }]
  })));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
})();
