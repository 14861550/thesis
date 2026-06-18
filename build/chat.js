/* compiled from chat.jsx — do not edit; run `npm run build` */
(function () {
const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;
const ASK_THEMES = [['A day in the life', ['What does an ordinary Tuesday actually look like for you?', 'What do your evenings and weekends look like?', 'What does stress look like for you now?']], ['How you got here', ['How did you get from where I am now to where you are?', 'What was your first job after graduating?', 'Is there a path you almost took instead?']], ['The honest tradeoffs', ["How's the money — honestly?", "What's the hardest part nobody warned you about?", 'What almost made you quit?']], ['Doubts & turning points', ['Did you ever doubt this path?', 'What would you do differently?', 'What surprised you most about this work?']], ['What I should do now', ['What skill should I start building now?', 'How do I know if this career is right for me?', 'What do you miss about being my age?']], ['People & what makes it worth it', ['Who are the people around you these days?', 'Where are you living, and do you like it?', "What's a recent moment that made it feel worth it?"]]];
const ASK_POOL = ASK_THEMES.flatMap(([, qs]) => qs);
const ASK_THEME = ASK_THEMES.flatMap(([theme, qs]) => qs.map(() => theme));
function askedAlready(idea, userTexts) {
  const words = s => new Set(s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4));
  const iw = [...words(idea)];
  return userTexts.some(t => {
    const tw = words(t);
    return iw.filter(w => tw.has(w)).length >= 3;
  });
}
function pickAskIdeas(used, n = 4, userTexts = []) {
  let avail = ASK_POOL.map((_, i) => i).filter(i => !used.has(i));
  if (avail.length < n) {
    used.clear();
    avail = ASK_POOL.map((_, i) => i);
  }
  const fresh = avail.filter(i => !askedAlready(ASK_POOL[i], userTexts));
  if (fresh.length >= n) avail = fresh;
  const byTheme = new Map();
  for (const i of avail) {
    const t = ASK_THEME[i];
    if (!byTheme.has(t)) byTheme.set(t, []);
    byTheme.get(t).push(i);
  }
  const buckets = [...byTheme.values()];
  for (const b of buckets) b.sort(() => Math.random() - 0.5);
  buckets.sort(() => Math.random() - 0.5);
  const picks = [];
  let bi = 0;
  while (picks.length < n && buckets.some(b => b.length)) {
    const b = buckets[bi % buckets.length];
    if (b.length) picks.push(b.pop());
    bi++;
  }
  return picks;
}
function AskIdeas({
  ideas,
  onPick,
  disabled
}) {
  if (!ideas || !ideas.length) return null;
  return React.createElement("div", {
    className: "ask-row",
    "aria-label": "Suggested questions"
  }, React.createElement("div", {
    className: "ask-lbl"
  }, "Ideas to ask \u2014 or write your own below"), React.createElement("div", {
    className: "ask-grid"
  }, ideas.map(i => React.createElement("button", {
    key: i,
    className: "ask-chip",
    disabled: disabled,
    onClick: () => onPick(i)
  }, ASK_POOL[i]))));
}
function buildOpening({
  name,
  career,
  answers
}) {
  const me = name || 'You';
  const role = (career || 'this career').trim();
  const interests = (answers.interests || '').trim();
  const lines = [`Hey — it's me. You, about ten years from now. These days I work as a ${role.toLowerCase()}, though the road here had more turns than I'd have guessed at your age.`, `I'm not here to sell you on it. Some days are genuinely good and some are just long. What I can do is tell you what it actually feels like from the inside, so you can decide for yourself whether you want to walk toward it.`];
  if (interests) {
    lines.push(`I still remember the version of us that ${interests.toLowerCase().replace(/[.!?]+$/, '')}. That thread didn't disappear — it just found a shape. Funny how that works.`);
  }
  lines.push(`So — what do you actually want to know? Ask me anything.`);
  return lines;
}
function splitParas(text) {
  const parts = (text || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  return parts.length ? parts : [(text || '').trim()];
}
function renderRich(text) {
  const out = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  const plain = s => s.replace(/\*+/g, '');
  let last = 0,
    m,
    k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(plain(text.slice(last, m.index)));
    if (m[1] != null) out.push(React.createElement("strong", {
      key: k++
    }, m[1]));else out.push(React.createElement("em", {
      key: k++
    }, m[2]));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(plain(text.slice(last)));
  return out;
}
function autoGrowTA(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}
function useSlowPending(active, ms = 9000) {
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => {
    if (!active) {
      setSlow(false);
      return undefined;
    }
    const t = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(t);
  }, [active]);
  return slow;
}
function TypingBubble({
  slow
}) {
  return React.createElement("div", null, React.createElement("div", {
    className: "typing"
  }, React.createElement("span", null), React.createElement("span", null), React.createElement("span", null)), slow && React.createElement("div", {
    className: "slow-note fade-in"
  }, "Taking a moment \u2014 a thoughtful reply can take a little while."));
}
const API_BASE = typeof window !== 'undefined' && window.THESIS_API_BASE || '';
async function postJSON(url, body) {
  const res = await fetch(API_BASE + url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
const SOFT_MIN = 20;
const HARD_MIN = 30;
function mmss(min) {
  const s = Math.max(0, Math.floor(min * 60));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function Chat({
  profile,
  condition = 'main',
  profileData = {},
  phaseBNotes = '',
  location = '',
  career: careerProp,
  seedTranscript = [],
  seedElapsedSec = 0,
  mode = 'study',
  onSwitchCareer,
  onComplete,
  onExit,
  onAutosave
}) {
  const isExplore = mode === 'exploration';
  const career = careerProp || profileData.career || 'this career';
  const initials = useMemo(() => (profile.name?.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '—').toUpperCase(), [profile.name]);
  const opening = useMemo(() => buildOpening({
    name: profile.name,
    career,
    answers: {}
  }), [profile.name, career]);
  const [messages, setMessages] = useState([]);
  const [booting, setBooting] = useState(true);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState('');
  const [askIdeas, setAskIdeas] = useState([]);
  const usedIdeas = useRef(new Set());
  const userTexts = useRef([]);
  const [error, setError] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(Math.max(0, Math.round(seedElapsedSec || 0)));
  const elapsedRef = useRef(elapsedSec);
  const errorRef = useRef(null);
  const [nextRest, setNextRest] = useState(SOFT_MIN);
  const [saveState, setSaveState] = useState('');
  const [lastFailed, setLastFailed] = useState(null);
  const scrollRef = useRef(null);
  const taRef = useRef(null);
  const sessionId = useRef(null);
  const messagesRef = useRef([]);
  const slowReply = useSlowPending(pending || booting);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    errorRef.current = error;
  }, [error]);
  useEffect(() => {
    if (!draft) autoGrowTA(taRef.current);
  }, [draft]);
  const elapsedMin = elapsedSec / 60;
  const hard = !isExplore && elapsedMin >= HARD_MIN;
  const soft = !isExplore && !hard && elapsedMin >= nextRest;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasUserTurn = messages.some(m => m.role === 'user');
    el.scrollTop = hasUserTurn ? el.scrollHeight : 0;
  }, [messages, pending, booting]);
  useEffect(() => {
    if (booting) return undefined;
    const t = setInterval(() => {
      if (document.hidden || errorRef.current) return;
      setElapsedSec(s => {
        const next = s >= HARD_MIN * 60 ? s : s + 1;
        elapsedRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [booting]);
  const toTranscript = msgs => msgs.map(m => ({
    role: m.role === 'user' ? 'user' : 'future',
    text: m.role === 'user' ? m.text : (m.paras || []).join('\n\n'),
    ts: m.ts
  }));
  useEffect(() => {
    if (!onAutosave || !messages.length) return;
    setSaveState('saving');
    const extra = {
      durationSec: elapsedRef.current,
      turnCount: messages.filter(m => m.role === 'user').length
    };
    Promise.resolve(onAutosave(toTranscript(messages), extra)).finally(() => setSaveState('saved'));
  }, [messages]);
  useEffect(() => {
    let cancelled = false;
    const seed = (seedTranscript || []).filter(m => m && typeof m.text === 'string' && m.text.trim()).map((m, i) => m.role === 'user' ? {
      role: 'user',
      text: m.text,
      id: `s${i}`,
      ts: m.ts || new Date().toISOString()
    } : {
      role: 'future',
      paras: splitParas(m.text),
      id: `s${i}`,
      ts: m.ts || new Date().toISOString()
    });
    userTexts.current.push(...seed.filter(m => m.role === 'user').map(m => m.text));
    (async () => {
      setBooting(true);
      setError(null);
      try {
        const {
          sessionId: sid,
          opening: text
        } = await postJSON('/api/phase-c/session', {
          condition,
          profileData,
          phaseBNotes,
          location,
          priorTranscript: seed.length ? seedTranscript : undefined
        });
        if (cancelled) return;
        sessionId.current = sid;
        setMessages([...seed, {
          role: 'future',
          paras: splitParas(text),
          id: 'm0',
          ts: new Date().toISOString()
        }]);
        setAskIdeas(pickAskIdeas(usedIdeas.current, 4, userTexts.current));
      } catch (e) {
        if (cancelled) return;
        setMessages([...seed, {
          role: 'future',
          paras: opening,
          id: 'm0',
          ts: new Date().toISOString()
        }]);
        setError("Couldn't reach your future self — replies won't work until the server is running.");
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const finish = () => {
    const transcript = toTranscript(messages);
    const durationSec = elapsedRef.current;
    const turnCount = messages.filter(m => m.role === 'user').length;
    const hitSoft = elapsedMin >= SOFT_MIN;
    const endedBy = hard ? 'hard_cap' : 'user';
    onComplete && onComplete({
      transcript,
      durationSec,
      turnCount,
      hitSoftCap: hitSoft,
      hitHardCap: hard,
      endedBy
    }, sessionId.current);
  };
  const reconnect = async () => {
    const prior = toTranscript(messagesRef.current);
    const seed = prior.length && prior[prior.length - 1].role === 'user' ? prior.slice(0, -1) : prior;
    const {
      sessionId: sid
    } = await postJSON('/api/phase-c/session', {
      condition,
      profileData,
      phaseBNotes,
      location,
      priorTranscript: seed,
      silentResume: true
    });
    sessionId.current = sid;
  };
  const requestReply = async (t, isRetryAfterReconnect = false) => {
    setPending(true);
    setError(null);
    try {
      const {
        reply
      } = await postJSON('/api/chat', {
        sessionId: sessionId.current,
        message: t
      });
      setMessages(prev => [...prev, {
        role: 'future',
        paras: splitParas(reply),
        id: `f${Date.now()}`,
        ts: new Date().toISOString()
      }]);
      setAskIdeas(pickAskIdeas(usedIdeas.current, 4, userTexts.current));
      setLastFailed(null);
    } catch (e) {
      if (!isRetryAfterReconnect && /unknown session/i.test(e.message || '')) {
        try {
          await reconnect();
          setPending(false);
          return requestReply(t, true);
        } catch (e2) {}
      }
      setLastFailed(t);
      setError("Connection hiccuped — your progress is saved.");
    } finally {
      setPending(false);
    }
  };
  const send = async text => {
    const t = text.trim();
    if (!t || pending || booting || hard) return;
    setMessages(prev => [...prev, {
      role: 'user',
      text: t,
      id: `u${Date.now()}`,
      ts: new Date().toISOString()
    }]);
    setDraft('');
    userTexts.current.push(t);
    setAskIdeas([]);
    if (!sessionId.current) {
      try {
        await reconnect();
      } catch (e) {
        setLastFailed(t);
        setError('Connection hiccuped — your progress is saved.');
        return;
      }
    }
    await requestReply(t);
  };
  const sendIdea = i => {
    usedIdeas.current.add(i);
    send(ASK_POOL[i]);
  };
  const retry = () => {
    if (lastFailed && !pending) requestReply(lastFailed);
  };
  return React.createElement("div", {
    className: "chat-app",
    "data-screen-label": "04 Chat"
  }, React.createElement("aside", {
    className: "chat-side"
  }, React.createElement("div", {
    className: "brand"
  }, React.createElement(BrandMark, {
    size: 20
  }), React.createElement("span", null, "Thesis")), React.createElement("div", {
    style: {
      padding: '0 4px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, isExplore && onSwitchCareer && React.createElement("button", {
    className: "btn ghost sm",
    style: {
      width: '100%',
      justifyContent: 'flex-start'
    },
    onClick: onSwitchCareer,
    title: "Pick a different career to step into"
  }, "\u2190\xA0 Choose another career"), React.createElement("button", {
    className: "btn ghost sm",
    style: {
      width: '100%',
      justifyContent: 'flex-start'
    },
    onClick: onExit,
    title: "Restart the study from the beginning"
  }, "\u21BB\xA0 Start over")), React.createElement("div", {
    className: "side-section"
  }, React.createElement("div", {
    className: "side-h"
  }, "You're talking with"), React.createElement("div", {
    className: "side-decision"
  }, React.createElement("div", {
    className: "lbl"
  }, "Your future self \xB7 +10 years"), React.createElement("div", {
    className: "body"
  }, career))), React.createElement("div", {
    className: "side-section"
  }, React.createElement("div", {
    className: "side-h"
  }, "This session"), React.createElement("div", {
    className: "side-item active"
  }, React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, React.createElement(MiniAvatar, {
    initials: initials,
    color: profile.color,
    size: 18
  })), React.createElement("span", null, profile.name || 'Future self'))), React.createElement("div", {
    className: "side-section",
    style: {
      marginTop: 'auto'
    }
  }, React.createElement("div", {
    className: "side-h"
  }, "Why this is a role-play"), React.createElement("div", {
    className: "side-item",
    style: {
      cursor: 'default',
      alignItems: 'flex-start',
      lineHeight: 1.45,
      color: 'var(--muted)'
    }
  }, React.createElement("span", {
    style: {
      fontSize: 12
    }
  }, "This is an imaginative role-play, not a prediction or career advice \u2014 so you can explore your questions freely. The decision about your future stays yours.")))), React.createElement("main", {
    className: "chat-main"
  }, React.createElement("header", {
    className: "chat-header"
  }, React.createElement("div", {
    className: "who"
  }, React.createElement(MiniAvatar, {
    initials: initials,
    color: profile.color,
    size: 32
  }), React.createElement("div", null, React.createElement("div", {
    className: "name"
  }, profile.name || 'Future you'), React.createElement("div", {
    className: "meta"
  }, "+10 years \xB7 ", career))), React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, React.createElement("button", {
    className: "header-restart",
    onClick: onExit,
    title: "Start over from the beginning",
    "aria-label": "Start over"
  }, "\u21BB"), !isExplore && React.createElement("span", {
    className: "clock",
    title: "Time in this conversation"
  }, mmss(elapsedMin)), React.createElement("span", {
    className: "chip"
  }, React.createElement("span", {
    className: "pulse"
  }), "A role-play \xB7 you decide"), isExplore && onSwitchCareer && React.createElement("button", {
    className: "btn ghost sm",
    onClick: onSwitchCareer,
    title: "Pick a different career to step into"
  }, "Other careers"), React.createElement("button", {
    className: "btn accent sm",
    onClick: finish,
    title: isExplore ? 'Wrap up this future' : 'Move on to the reflection'
  }, React.createElement("span", {
    className: "lbl-full"
  }, isExplore ? 'Done with this future' : 'Finish & reflect'), React.createElement("span", {
    className: "lbl-short"
  }, isExplore ? 'Done' : 'Finish'), React.createElement("svg", {
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
  }))))), React.createElement("div", {
    className: "chat-scroll",
    ref: scrollRef
  }, React.createElement("div", {
    className: "chat-thread"
  }, messages.map((m, mi) => {
    const isLast = mi === messages.length - 1;
    return React.createElement("div", {
      key: m.id,
      className: `msg ${m.role} fade-in`
    }, React.createElement("div", {
      className: "avatar"
    }, m.role === 'future' ? React.createElement(MiniAvatar, {
      initials: initials,
      color: profile.color,
      size: 30
    }) : (profile.name?.[0] || 'Y').toUpperCase()), React.createElement("div", {
      style: {
        minWidth: 0,
        flex: m.role === 'user' ? 'unset' : 1
      }
    }, React.createElement("div", {
      className: "bubble"
    }, m.regenerating ? React.createElement("div", {
      className: "typing"
    }, React.createElement("span", null), React.createElement("span", null), React.createElement("span", null)) : m.role === 'future' ? m.paras.map((p, i) => React.createElement("p", {
      key: i
    }, renderRich(p))) : m.text), m.role === 'future' && !m.regenerating && React.createElement("div", {
      className: "actions"
    }, React.createElement("button", {
      title: "Copy"
    }, React.createElement("svg", {
      width: "12",
      height: "12",
      viewBox: "0 0 12 12",
      fill: "none"
    }, React.createElement("rect", {
      x: "3.5",
      y: "3.5",
      width: "6",
      height: "6",
      rx: "1",
      stroke: "currentColor",
      strokeWidth: "1.4"
    }), React.createElement("path", {
      d: "M2 8V2.5C2 2.2 2.2 2 2.5 2H8",
      stroke: "currentColor",
      strokeWidth: "1.4",
      strokeLinecap: "round"
    })), "Copy"))));
  }), (pending || booting) && React.createElement("div", {
    className: "msg future fade-in"
  }, React.createElement("div", {
    className: "avatar"
  }, React.createElement(MiniAvatar, {
    initials: initials,
    color: profile.color,
    size: 30
  })), React.createElement("div", {
    className: "bubble"
  }, React.createElement(TypingBubble, {
    slow: slowReply
  }))))), React.createElement("div", {
    className: "composer-wrap"
  }, error && React.createElement("div", {
    className: "composer-error",
    role: "status"
  }, error, lastFailed && React.createElement("button", {
    className: "link-btn",
    onClick: retry,
    disabled: pending
  }, "Try again")), soft && React.createElement("div", {
    className: "time-note soft"
  }, "You've been talking for a while \u2014 a natural place to pause or wrap up whenever you're ready. No rush.", React.createElement("button", {
    className: "link-btn",
    onClick: () => setNextRest(n => n + SOFT_MIN)
  }, "Keep going"), React.createElement("button", {
    className: "link-btn",
    onClick: finish
  }, "Finish & reflect \u2192")), hard && React.createElement("div", {
    className: "time-note hard"
  }, "That's the end of the conversation for the study. Thanks for talking \u2014 let's reflect on it.", React.createElement("button", {
    className: "link-btn",
    onClick: finish
  }, "Continue \u2192")), !booting && !pending && !hard && React.createElement(AskIdeas, {
    ideas: askIdeas,
    onPick: sendIdea,
    disabled: pending || booting
  }), React.createElement("div", {
    className: "composer"
  }, React.createElement("textarea", {
    rows: 1,
    ref: taRef,
    placeholder: hard ? 'The conversation has ended — continue to reflect.' : booting ? 'Connecting to your future self…' : `Message ${profile.name || 'your future self'}…`,
    value: draft,
    disabled: booting || hard,
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
    disabled: !draft.trim() || pending || booting || hard,
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
  })))), saveState && React.createElement("div", {
    className: "composer-foot"
  }, React.createElement("span", {
    className: "save-note"
  }, saveState === 'saving' ? 'Saving…' : 'Progress saved ✓')))));
}
function FreeContinuation({
  profile = {},
  career = 'this career',
  sessionId,
  history = [],
  condition = 'main',
  profileData = {},
  phaseBNotes = '',
  location = '',
  onSwitchCareer,
  onDone,
  onAutosave
}) {
  const {
    useState,
    useEffect,
    useRef
  } = React;
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const usedIdeas = useRef(new Set());
  const userTexts = useRef((history || []).filter(m => m.role === 'user').map(m => m.text || ''));
  const [askIdeas, setAskIdeas] = useState(() => pickAskIdeas(usedIdeas.current, 4, userTexts.current));
  const [error, setError] = useState(null);
  const startedAt = useRef(Date.now());
  const scrollRef = useRef(null);
  const taRef = useRef(null);
  const slowReply = useSlowPending(pending);
  useEffect(() => {
    if (!draft) autoGrowTA(taRef.current);
  }, [draft]);
  const initials = ((profile.name || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '—').toUpperCase();
  const past = (history || []).map((m, i) => ({
    role: m.role === 'user' ? 'user' : 'future',
    text: m.text || '',
    id: `h${i}`
  }));
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  const toTranscript = msgs => msgs.map(m => ({
    role: m.role === 'user' ? 'user' : 'future',
    text: m.role === 'user' ? m.text : (m.paras || []).join('\n\n'),
    ts: m.ts
  }));
  useEffect(() => {
    if (!onAutosave || !messages.length) return;
    onAutosave(toTranscript(messages));
  }, [messages]);
  const wrapUp = () => {
    const durationSec = Math.round((Date.now() - startedAt.current) / 1000);
    const turnCount = messages.filter(m => m.role === 'user').length;
    onDone && onDone({
      transcript: toTranscript(messages),
      durationSec,
      turnCount
    });
  };
  const sid = useRef(sessionId || null);
  const rebuildSession = async () => {
    const freeSoFar = toTranscript(messages);
    const seed = [...(history || []), ...freeSoFar].filter(m => m && typeof m.text === 'string' && m.text.trim());
    const {
      sessionId: fresh
    } = await postJSON('/api/phase-c/session', {
      condition,
      profileData,
      phaseBNotes,
      location,
      priorTranscript: seed.length ? seed : [{
        role: 'future',
        text: `Hey — it's me again, your future self (${career}).`
      }],
      silentResume: true
    });
    sid.current = fresh;
  };
  const send = async (text, isRetryAfterReconnect = false) => {
    const t = text.trim();
    if (!t || pending) return;
    if (!isRetryAfterReconnect) {
      setMessages(p => [...p, {
        role: 'user',
        text: t,
        id: `u${Date.now()}`,
        ts: new Date().toISOString()
      }]);
      setDraft('');
      userTexts.current.push(t);
    }
    setPending(true);
    setError(null);
    setAskIdeas([]);
    try {
      if (!sid.current) await rebuildSession();
      const {
        reply
      } = await postJSON('/api/chat', {
        sessionId: sid.current,
        message: t
      });
      setMessages(p => [...p, {
        role: 'future',
        paras: splitParas(reply),
        id: `f${Date.now()}`,
        ts: new Date().toISOString()
      }]);
      setAskIdeas(pickAskIdeas(usedIdeas.current, 4, userTexts.current));
    } catch (e) {
      if (!isRetryAfterReconnect && /unknown session/i.test(e.message || '')) {
        sid.current = null;
        setPending(false);
        return send(text, true);
      }
      setError(e.message || 'Something went wrong. Please try again.');
      setAskIdeas(pickAskIdeas(usedIdeas.current, 4, userTexts.current));
    } finally {
      setPending(false);
    }
  };
  const sendIdea = i => {
    usedIdeas.current.add(i);
    send(ASK_POOL[i]);
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
  }, onSwitchCareer && React.createElement("button", {
    className: "btn ghost sm",
    onClick: onSwitchCareer,
    title: "Step into a different career \u2014 just for you, outside the study"
  }, "Try another career"), React.createElement("button", {
    className: "btn accent sm",
    onClick: wrapUp
  }, "I'm done \u2192"))), React.createElement("div", {
    className: "flow-body"
  }, React.createElement("div", {
    className: "pb-wrap"
  }, React.createElement("div", {
    className: "sv-wrap",
    style: {
      textAlign: 'center',
      paddingBottom: 8
    }
  }, React.createElement("div", {
    className: "eyebrow",
    style: {
      justifyContent: 'center'
    }
  }, React.createElement("span", {
    className: "dot"
  }), "Just for you"), React.createElement("p", {
    className: "sv-intro",
    style: {
      maxWidth: '52ch',
      margin: '6px auto 0'
    }
  }, "The study questions are done. If you like, keep talking with your future self \u2014 this part is still recorded for the researcher, but it's outside the main study and entirely optional.")), React.createElement("div", {
    className: "pb-scroll",
    ref: scrollRef
  }, React.createElement("div", {
    className: "chat-thread"
  }, past.map(m => React.createElement("div", {
    key: m.id,
    className: `msg history ${m.role === 'user' ? 'user' : 'future'}`
  }, React.createElement("div", {
    className: "avatar"
  }, m.role === 'user' ? (profile.name?.[0] || 'Y').toUpperCase() : React.createElement(MiniAvatar, {
    initials: initials,
    color: profile.color,
    size: 30
  })), React.createElement("div", {
    style: {
      minWidth: 0,
      flex: m.role === 'user' ? 'unset' : 1
    }
  }, React.createElement("div", {
    className: "bubble"
  }, m.role === 'future' ? splitParas(m.text).map((p, i) => React.createElement("p", {
    key: i
  }, renderRich(p))) : m.text)))), past.length > 0 && React.createElement("div", {
    className: "history-note"
  }, "Your conversation continues"), messages.map(m => React.createElement("div", {
    key: m.id,
    className: `msg ${m.role === 'user' ? 'user' : 'future'} fade-in`
  }, React.createElement("div", {
    className: "avatar"
  }, m.role === 'user' ? (profile.name?.[0] || 'Y').toUpperCase() : React.createElement(MiniAvatar, {
    initials: initials,
    color: profile.color,
    size: 30
  })), React.createElement("div", {
    style: {
      minWidth: 0,
      flex: m.role === 'user' ? 'unset' : 1
    }
  }, React.createElement("div", {
    className: "bubble"
  }, m.role === 'future' ? m.paras.map((p, i) => React.createElement("p", {
    key: i
  }, renderRich(p))) : m.text)))), pending && React.createElement("div", {
    className: "msg future fade-in"
  }, React.createElement("div", {
    className: "avatar"
  }, React.createElement(MiniAvatar, {
    initials: initials,
    color: profile.color,
    size: 30
  })), React.createElement("div", {
    className: "bubble"
  }, React.createElement(TypingBubble, {
    slow: slowReply
  }))))))), React.createElement("div", {
    className: "composer-wrap pb-composer"
  }, error && React.createElement("div", {
    className: "composer-error"
  }, error), !pending && React.createElement(AskIdeas, {
    ideas: askIdeas,
    onPick: sendIdea,
    disabled: pending
  }), React.createElement("div", {
    className: "composer"
  }, React.createElement("textarea", {
    rows: 1,
    ref: taRef,
    placeholder: `Message ${profile.name || 'your future self'}…`,
    value: draft,
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
    disabled: !draft.trim() || pending,
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
  }, "Optional extra chat \u2014 recorded, but not part of the main study analysis.")));
}
Object.assign(window, {
  Chat,
  FreeContinuation,
  postJSON,
  splitParas,
  renderRich,
  buildOpening,
  autoGrowTA,
  useSlowPending,
  TypingBubble
});
})();
