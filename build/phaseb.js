/* compiled from phaseb.jsx — do not edit; run `npm run build` */
(function () {
const PB_FAMILIARITY = {
  points: 7,
  left: 'Not at all familiar',
  right: 'Very familiar'
};
const PB_INTEREST = {
  points: 7,
  left: 'Not at all',
  right: 'Very strong'
};
const PB_REST_MIN = 20;
function PhaseB({
  profileData,
  rec = 'direct',
  seedTranscript = [],
  onDone,
  onBack,
  onAutosave
}) {
  const {
    useState,
    useEffect,
    useRef
  } = React;
  const [messages, setMessages] = useState([]);
  const [booting, setBooting] = useState(true);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const [showLock, setShowLock] = useState(false);
  const [career, setCareer] = useState('');
  const [location, setLocation] = useState('');
  const [familiarity, setFamiliarity] = useState(undefined);
  const [interest, setInterest] = useState(undefined);
  const [elapsedMin, setElapsedMin] = useState(0);
  const [nextRest, setNextRest] = useState(PB_REST_MIN);
  const sessionId = useRef(null);
  const scrollRef = useRef(null);
  const lockRef = useRef(null);
  const taRef = useRef(null);
  const startedAt = useRef(Date.now());
  const slowReply = useSlowPending(pending || booting);
  useEffect(() => {
    if (!draft) autoGrowTA(taRef.current);
  }, [draft]);
  const restDue = elapsedMin >= nextRest;
  useEffect(() => {
    const t = setInterval(() => setElapsedMin((Date.now() - startedAt.current) / 60000), 5000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending, booting, showLock]);
  const guideTurns = messages.filter(m => m.role === 'guide').length;
  const hasRecs = messages.some(m => m.recommendations && m.recommendations.length);
  useEffect(() => {
    let cancelled = false;
    const seed = (seedTranscript || []).filter(m => m && typeof m.text === 'string' && m.text.trim()).map((m, i) => m.role === 'user' ? {
      role: 'user',
      text: m.text,
      id: `s${i}`,
      ts: m.ts || new Date().toISOString()
    } : {
      role: 'guide',
      paras: splitParas(m.text),
      id: `s${i}`,
      ts: m.ts || new Date().toISOString()
    });
    (async () => {
      try {
        const {
          sessionId: sid,
          opening,
          recommendations
        } = await postJSON('/api/phase-b/session', {
          profileData,
          rec,
          priorTranscript: seed.length ? seedTranscript : undefined
        });
        if (cancelled) return;
        sessionId.current = sid;
        if (seed.length) {
          setMessages(seed);
          setShowLock(true);
        } else {
          setMessages([{
            role: 'guide',
            paras: splitParas(opening),
            recommendations: recommendations || null,
            id: 'g0',
            ts: new Date().toISOString()
          }]);
        }
      } catch (e) {
        if (cancelled) return;
        setError("Couldn't reach the guide — make sure the server is running.");
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const send = async text => {
    const t = text.trim();
    if (!t || pending || booting || !sessionId.current) return;
    setMessages(p => [...p, {
      role: 'user',
      text: t,
      id: `u${Date.now()}`,
      ts: new Date().toISOString()
    }]);
    setDraft('');
    setPending(true);
    setError(null);
    try {
      const {
        reply,
        recommendations
      } = await postJSON('/api/chat', {
        sessionId: sessionId.current,
        message: t
      });
      setMessages(p => [...p, {
        role: 'guide',
        paras: splitParas(reply),
        recommendations: recommendations || null,
        id: `g${Date.now()}`,
        ts: new Date().toISOString()
      }]);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  };
  const transcript = () => messages.map(m => {
    if (m.role === 'user') return {
      role: 'user',
      text: m.text,
      ts: m.ts
    };
    let text = (m.paras || []).join('\n\n');
    if (m.recommendations && m.recommendations.length) {
      text += '\n\n' + m.recommendations.map((r, i) => `${i + 1}. ${r.title} — ${r.why}${r.path ? ` Path: ${r.path}` : ''}`).join('\n');
    }
    return {
      role: 'guide',
      text,
      ts: m.ts
    };
  });
  useEffect(() => {
    if (!onAutosave || !messages.length) return;
    onAutosave(transcript());
  }, [messages]);
  const chooseRec = title => {
    setCareer(title);
    setCareerNote(null);
    setShowLock(true);
  };
  const openChooser = () => setShowLock(true);
  useEffect(() => {
    if (showLock && lockRef.current && lockRef.current.scrollIntoView) {
      lockRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [showLock]);
  const [checking, setChecking] = useState(false);
  const [careerNote, setCareerNote] = useState(null);
  const isPreview = typeof window !== 'undefined' && window.THESIS_PREVIEW;
  const recTitles = messages.flatMap(m => (m.recommendations || []).map(r => (r.title || '').trim().toLowerCase()));
  const canLock = (isPreview || career.trim() && familiarity && interest) && !checking;
  const lockIn = async () => {
    if (!canLock) return;
    const chosen = career.trim() || (isPreview ? 'Data analyst (preview)' : '');
    setCareerNote(null);
    if (chosen && !recTitles.includes(chosen.toLowerCase()) && !isPreview) {
      setChecking(true);
      try {
        const v = await postJSON('/api/validate-career', {
          career: chosen
        });
        if (v && v.ok === false) {
          setCareerNote(v.hint || "That doesn't read as a career — name a job or professional direction, like 'Data analyst' or 'Teacher'.");
          setChecking(false);
          return;
        }
      } catch (e) {}
      setChecking(false);
    }
    onDone({
      career: chosen,
      location: location.trim(),
      familiarity,
      interestStrength: interest,
      transcript: transcript()
    });
  };
  return React.createElement("div", {
    className: "flow"
  }, React.createElement("div", {
    className: "flow-progress"
  }, React.createElement("div", {
    className: "bar",
    style: {
      width: '55%'
    }
  })), React.createElement("nav", {
    className: "topnav"
  }, React.createElement("div", {
    className: "brand"
  }, React.createElement(BrandMark, {
    size: 22
  }), React.createElement("span", null, "Thesis")), React.createElement("div", {
    className: "sv-eyebrow"
  }, "Step 03 \xB7 Find a direction"), React.createElement("div", {
    className: "end",
    style: {
      display: 'flex',
      gap: 8
    }
  }, React.createElement("button", {
    className: "btn ghost sm",
    onClick: onBack
  }, "Back"))), React.createElement("div", {
    className: "flow-body"
  }, React.createElement("div", {
    className: "pb-wrap"
  }, React.createElement("div", {
    className: "pb-scroll",
    ref: scrollRef
  }, React.createElement("div", {
    className: "chat-thread"
  }, messages.map(m => React.createElement("div", {
    key: m.id,
    className: `msg ${m.role === 'user' ? 'user' : 'future'} fade-in`
  }, React.createElement("div", {
    className: "avatar"
  }, m.role === 'user' ? 'You' : React.createElement(BrandMark, {
    size: 20
  })), React.createElement("div", {
    style: {
      minWidth: 0,
      flex: m.role === 'user' ? 'unset' : 1
    }
  }, React.createElement("div", {
    className: "bubble"
  }, m.role === 'guide' ? m.paras.map((p, i) => React.createElement("p", {
    key: i
  }, renderRich(p))) : m.text), m.recommendations && m.recommendations.length > 0 && React.createElement("div", {
    className: "rec-grid"
  }, m.recommendations.map((r, i) => React.createElement("button", {
    key: i,
    type: "button",
    className: `rec-card ${career.trim() === r.title ? 'active' : ''}`,
    onClick: () => chooseRec(r.title)
  }, React.createElement("div", {
    className: "rec-title"
  }, r.title), r.why && React.createElement("div", {
    className: "rec-why"
  }, r.why), r.path && React.createElement("div", {
    className: "rec-path"
  }, r.path))))))), (pending || booting) && React.createElement("div", {
    className: "msg future fade-in"
  }, React.createElement("div", {
    className: "avatar"
  }, React.createElement(BrandMark, {
    size: 20
  })), React.createElement("div", {
    className: "bubble"
  }, React.createElement(TypingBubble, {
    slow: slowReply
  }))))), !showLock && !pending && React.createElement("div", {
    className: `pb-choose-bar ${hasRecs ? 'ready' : ''}`
  }, hasRecs ? React.createElement(React.Fragment, null, React.createElement("span", {
    className: "pb-choose-cue"
  }, "Seen a direction you would want to live out?"), React.createElement("button", {
    className: "btn accent sm",
    onClick: openChooser
  }, "Choose a career \u2192")) : React.createElement("button", {
    className: "link-btn",
    style: {
      margin: 0
    },
    onClick: openChooser
  }, "When you are ready, choose a career to step into \u2192")))), showLock && React.createElement("div", {
    className: "pb-lock-overlay",
    role: "dialog",
    "aria-modal": "true"
  }, React.createElement("div", {
    className: "pb-lock-sheet fade-in",
    ref: lockRef
  }, React.createElement("button", {
    className: "btn ghost sm pb-lock-back",
    onClick: () => setShowLock(false)
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
  })), "Back to chat"), React.createElement("div", {
    className: "pb-lock"
  }, React.createElement("div", {
    className: "pb-lock-h"
  }, career.trim() ? `Step into life as a ${career.trim()}?` : 'Ready to step into one?'), React.createElement("p", {
    className: "sv-intro",
    style: {
      margin: '0 0 12px'
    }
  }, hasRecs ? 'Go back to the chat to tap a suggested card, or type your own below. ' : '', "Pick the career you're most curious to experience as your future self \u2014 you can explore others later."), React.createElement("input", {
    className: "sv-input",
    placeholder: "The career you choose \u2014 e.g. Data analyst",
    value: career,
    onChange: e => {
      setCareer(e.target.value);
      setCareerNote(null);
    }
  }), careerNote && React.createElement("div", {
    className: "composer-error",
    style: {
      marginTop: 8,
      textAlign: 'left'
    }
  }, careerNote), React.createElement("input", {
    className: "sv-input",
    style: {
      marginTop: 8
    },
    placeholder: "Where? \u2014 a city, country, or 'open' (optional)",
    value: location,
    onChange: e => setLocation(e.target.value)
  }), React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, React.createElement(ScaleRow, {
    id: "fam",
    text: `How familiar do you already feel with ${career.trim() || 'this career'}?`,
    scale: PB_FAMILIARITY,
    value: familiarity,
    onChange: (_, v) => setFamiliarity(v)
  }), React.createElement(ScaleRow, {
    id: "int",
    text: "How strong is your interest in it right now?",
    scale: PB_INTEREST,
    value: interest,
    onChange: (_, v) => setInterest(v)
  })), React.createElement("button", {
    className: "btn accent",
    style: {
      marginTop: 12
    },
    disabled: !canLock,
    onClick: lockIn
  }, checking ? 'Checking…' : 'Step into this future', React.createElement("svg", {
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
  }))), !canLock && React.createElement("p", {
    className: "sv-hint",
    style: {
      marginTop: 8
    }
  }, !career.trim() ? 'Choose or type a career' : !familiarity ? 'Rate how familiar it feels' : 'Rate your interest', " to continue.")))), React.createElement("div", {
    className: "composer-wrap pb-composer"
  }, error && React.createElement("div", {
    className: "composer-error"
  }, error), restDue && React.createElement("div", {
    className: "time-note soft"
  }, "You've been exploring for a while \u2014 take a short breather if you like, or keep going.", React.createElement("button", {
    className: "link-btn",
    onClick: () => setNextRest(n => n + PB_REST_MIN)
  }, "Keep going")), React.createElement("div", {
    className: "composer"
  }, React.createElement("textarea", {
    rows: 1,
    ref: taRef,
    placeholder: booting ? 'Connecting…' : 'Reply to the guide…',
    value: draft,
    disabled: booting,
    onChange: e => {
      setDraft(e.target.value);
      autoGrowTA(e.target);
    },
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send(draft);
      }
    }
  }), React.createElement("button", {
    className: "send",
    disabled: !draft.trim() || pending || booting,
    onClick: () => send(draft),
    "aria-label": "Send"
  }, React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none"
  }, React.createElement("path", {
    d: "M7 11V3M3 7l4-4 4 4",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })))), React.createElement("div", {
    className: "composer-foot"
  }, "The guide opens doors, not closes them \u2014 the choice stays yours.")));
}
Object.assign(window, {
  PhaseB
});
})();
