/* Chat — the 10-year career future-self role-play (phase c) */
const { useState, useEffect, useRef, useMemo } = React;

const SUGGESTED = [
  { lbl: 'A NORMAL DAY', text: 'What does an ordinary Tuesday actually look like for you?' },
  { lbl: 'THE HARD PARTS', text: "What's the part of this work nobody warned me about?" },
  { lbl: 'GETTING THERE', text: 'How did you go from where I am now to where you are?' },
  { lbl: 'DOUBT', text: "Honestly I'm not sure this is right for me. Did you ever feel that?" },
];

function buildOpening({ name, career, answers }) {
  const me = name || 'You';
  const role = (career || 'this career').trim();
  const interests = (answers.interests || '').trim();

  const lines = [
    `Hey — it's me. You, about ten years from now. These days I work as a ${role.toLowerCase()}, though the road here had more turns than I'd have guessed at your age.`,
    `I'm not here to sell you on it. Some days are genuinely good and some are just long. What I can do is tell you what it actually feels like from the inside, so you can decide for yourself whether you want to walk toward it.`,
  ];
  if (interests) {
    lines.push(`I still remember the version of us that ${interests.toLowerCase().replace(/[.!?]+$/, '')}. That thread didn't disappear — it just found a shape. Funny how that works.`);
  }
  lines.push(`So — what do you actually want to know? Ask me anything.`);
  return lines;
}

/* Split a model reply into paragraphs for the existing renderer. */
function splitParas(text) {
  const parts = (text || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  return parts.length ? parts : [(text || '').trim()];
}

/* Render minimal inline markdown (**bold**, *italic*) so the model's emphasis
 * shows as formatting instead of distracting raw asterisks. Shared by both chats. */
function renderRich(text) {
  const out = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null) out.push(<strong key={k++}>{m[1]}</strong>);
    else out.push(<em key={k++}>{m[2]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// When the frontend is hosted separately (Vercel) from the API (Railway),
// window.THESIS_API_BASE (set in config.js) points at the backend origin.
// Empty string keeps relative paths so same-origin / local dev still works.
const API_BASE = (typeof window !== 'undefined' && window.THESIS_API_BASE) || '';

async function postJSON(url, body) {
  const res = await fetch(API_BASE + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Conversation-time management (Status Brief §3.9b): soft prompt at 20 min, hard cap at 30.
const SOFT_MIN = 20;
const HARD_MIN = 30;

function Chat({ profile, condition = 'main', profileData = {}, phaseBNotes = '', location = '', career: careerProp, onComplete, onExit }) {
  const career = careerProp || profileData.career || 'this career';
  const initials = useMemo(
    () => (profile.name?.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '—').toUpperCase(),
    [profile.name]
  );
  const opening = useMemo(
    () => buildOpening({ name: profile.name, career, answers: {} }),
    [profile.name, career]
  );

  const [messages, setMessages] = useState([]);
  const [booting, setBooting] = useState(true);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [error, setError] = useState(null);
  const [elapsedMin, setElapsedMin] = useState(0);
  const [nextRest, setNextRest] = useState(SOFT_MIN); // recurring rest prompt cadence (§11.4)
  const scrollRef = useRef(null);
  const sessionId = useRef(null);
  const startedAt = useRef(null);

  const hard = elapsedMin >= HARD_MIN;
  const soft = !hard && elapsedMin >= nextRest; // fires at 20 min and again every 20 if it continues

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending, booting]);

  // Tick the clock once the conversation has started.
  useEffect(() => {
    const t = setInterval(() => {
      if (startedAt.current) setElapsedMin((Date.now() - startedAt.current) / 60000);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Create the phase-c session (condition-routed) and fetch the opener on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBooting(true);
      setError(null);
      try {
        const { sessionId: sid, opening: text } =
          await postJSON('/api/phase-c/session', { condition, profileData, phaseBNotes, location });
        if (cancelled) return;
        sessionId.current = sid;
        startedAt.current = Date.now();
        setMessages([{ role: 'future', paras: splitParas(text), id: 'm0' }]);
      } catch (e) {
        if (cancelled) return;
        startedAt.current = Date.now();
        setMessages([{ role: 'future', paras: opening, id: 'm0' }]);
        setError("Couldn't reach your future self — replies won't work until the server is running.");
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // run once

  const finish = () => {
    const transcript = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'future',
      text: m.role === 'user' ? m.text : (m.paras || []).join('\n\n'),
    }));
    const durationSec = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    const turnCount = messages.filter(m => m.role === 'user').length;
    const hitSoft = elapsedMin >= SOFT_MIN;
    const endedBy = hard ? 'hard_cap' : 'user';
    // Hand back the live phase-c sessionId so free continuation can keep the SAME
    // future-self conversation going (Build Plan §7 Screen 8 / §3.9b).
    onComplete && onComplete(
      { transcript, durationSec, turnCount, hitSoftCap: hitSoft, hitHardCap: hard, endedBy },
      sessionId.current,
    );
  };

  const send = async (text) => {
    const t = text.trim();
    if (!t || pending || booting || hard) return;
    if (!sessionId.current) { setError('No active session — reload to reconnect.'); return; }
    setMessages(prev => [...prev, { role: 'user', text: t, id: `u${Date.now()}` }]);
    setDraft('');
    setShowSuggestions(false);
    setPending(true);
    setError(null);
    try {
      const { reply } = await postJSON('/api/chat', { sessionId: sessionId.current, message: t });
      setMessages(prev => [...prev, { role: 'future', paras: splitParas(reply), id: `f${Date.now()}` }]);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const regen = async (msgId) => {
    if (!sessionId.current || pending) return;
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, regenerating: true } : m));
    setError(null);
    try {
      const { reply } = await postJSON('/api/regenerate', { sessionId: sessionId.current });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, paras: splitParas(reply), regenerating: false } : m));
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, regenerating: false } : m));
      setError(e.message || 'Could not rephrase. Please try again.');
    }
  };

  return (
    <div className="chat-app" data-screen-label="04 Chat">
      <aside className="chat-side">
        <div className="brand"><BrandMark size={20}/><span>Thesis</span></div>

        <div style={{padding: '0 4px'}}>
          <button className="btn ghost sm" style={{width: '100%', justifyContent: 'flex-start'}} onClick={onExit}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            New session
          </button>
        </div>

        <div className="side-section">
          <div className="side-h">You're talking with</div>
          <div className="side-decision">
            <div className="lbl">Your future self · +10 years</div>
            <div className="body">{career}</div>
          </div>
        </div>

        <div className="side-section">
          <div className="side-h">This session</div>
          <div className="side-item active">
            <span style={{display: 'inline-flex'}}><MiniAvatar initials={initials} color={profile.color} size={18}/></span>
            <span>{profile.name || 'Future self'}</span>
          </div>
        </div>

        <div className="side-section" style={{marginTop: 'auto'}}>
          <div className="side-h">Why this is a role-play</div>
          <div className="side-item" style={{cursor: 'default', alignItems: 'flex-start', lineHeight: 1.45, color: 'var(--muted)'}}>
            <span style={{fontSize: 12}}>This is an imaginative role-play, not a prediction or career advice — so you can explore your questions freely. The decision about your future stays yours.</span>
          </div>
        </div>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <div className="who">
            <MiniAvatar initials={initials} color={profile.color} size={32}/>
            <div>
              <div className="name">{profile.name || 'Future you'}</div>
              <div className="meta">+10 years · {career}</div>
            </div>
          </div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <span className="chip"><span className="pulse"></span>A role-play · you decide</span>
            <button className="btn accent sm" onClick={finish} title="Move on to the reflection">
              Finish &amp; reflect
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5h7M6.5 3l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </header>

        <div className="chat-scroll" ref={scrollRef}>
          <div className="chat-thread">
            {messages.map((m, mi) => {
              const isLast = mi === messages.length - 1;
              return (
              <div key={m.id} className={`msg ${m.role} fade-in`}>
                <div className="avatar">
                  {m.role === 'future'
                    ? <MiniAvatar initials={initials} color={profile.color} size={30}/>
                    : (profile.name?.[0] || 'Y').toUpperCase()}
                </div>
                <div style={{minWidth: 0, flex: m.role === 'user' ? 'unset' : 1}}>
                  <div className="bubble">
                    {m.regenerating
                      ? <div className="typing"><span></span><span></span><span></span></div>
                      : m.role === 'future'
                        ? m.paras.map((p, i) => <p key={i}>{renderRich(p)}</p>)
                        : m.text}
                  </div>
                  {m.role === 'future' && !m.regenerating && (
                    <div className="actions">
                      {isLast && (
                      <button onClick={() => regen(m.id)} disabled={pending} title="Regenerate">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6a4 4 0 1 1 1.2 2.8M2 9V6h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        This doesn't feel like me
                      </button>
                      )}
                      <button title="Copy">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M2 8V2.5C2 2.2 2.2 2 2.5 2H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
              );
            })}

            {(pending || booting) && (
              <div className="msg future fade-in">
                <div className="avatar"><MiniAvatar initials={initials} color={profile.color} size={30}/></div>
                <div className="bubble"><div className="typing"><span></span><span></span><span></span></div></div>
              </div>
            )}

            {showSuggestions && !booting && (
              <div className="suggested">
                {SUGGESTED.map((s, i) => (
                  <button key={i} className="suggest-btn" onClick={() => send(s.text)}>
                    <span className="lbl">{s.lbl}</span>
                    {s.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="composer-wrap">
          {error && (
            <div className="composer-error" role="status">{error}</div>
          )}
          {soft && (
            <div className="time-note soft">
              You've been talking for a while — a natural place to pause or wrap up whenever you're ready. No rush.
              <button className="link-btn" onClick={() => setNextRest((n) => n + SOFT_MIN)}>Keep going</button>
              <button className="link-btn" onClick={finish}>Finish &amp; reflect →</button>
            </div>
          )}
          {hard && (
            <div className="time-note hard">
              That's the end of the conversation for the study. Thanks for talking — let's reflect on it.
              <button className="link-btn" onClick={finish}>Continue →</button>
            </div>
          )}
          <div className="composer">
            <textarea
              rows={1}
              placeholder={hard ? 'The conversation has ended — continue to reflect.' : booting ? 'Connecting to your future self…' : `Message ${profile.name || 'your future self'}…`}
              value={draft}
              disabled={booting || hard}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }}
            />
            <button className="send" disabled={!draft.trim() || pending || booting || hard} onClick={() => send(draft)} aria-label="Send">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="composer-foot">Ask anything — your future self is here to think it through with you.</div>
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   FREE CONTINUATION (Build Plan §7 Screen 8 / §3.9b)
   The SAME future-self conversation continuing after the post-survey. It reuses
   the live phase-c sessionId (so the model still has the full role-play history),
   the clock keeps counting, and it is logged SEPARATELY — never part of the main
   analysis. Optional; the participant is already "done".
   ============================================================ */
function FreeContinuation({ profile = {}, career = 'this career', sessionId, onDone }) {
  const { useState, useEffect, useRef } = React;
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const startedAt = useRef(Date.now());
  const scrollRef = useRef(null);
  const initials = ((profile.name || '').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || '—').toUpperCase();

  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, pending]);

  const wrapUp = () => {
    const transcript = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'future',
      text: m.role === 'user' ? m.text : (m.paras || []).join('\n\n'),
    }));
    const durationSec = Math.round((Date.now() - startedAt.current) / 1000);
    const turnCount = messages.filter((m) => m.role === 'user').length;
    onDone && onDone({ transcript, durationSec, turnCount });
  };

  const send = async (text) => {
    const t = text.trim();
    if (!t || pending) return;
    if (!sessionId) { setError('This chat has ended — your study session is already saved.'); return; }
    setMessages((p) => [...p, { role: 'user', text: t, id: `u${Date.now()}` }]);
    setDraft(''); setPending(true); setError(null);
    try {
      const { reply } = await postJSON('/api/chat', { sessionId, message: t });
      setMessages((p) => [...p, { role: 'future', paras: splitParas(reply), id: `f${Date.now()}` }]);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally { setPending(false); }
  };

  return (
    <div className="flow">
      <nav className="topnav">
        <div className="brand"><BrandMark size={22} /><span>Thesis</span></div>
        <div className="end"><button className="btn accent sm" onClick={wrapUp}>I'm done →</button></div>
      </nav>
      <div className="flow-body">
        <div className="pb-wrap">
          <div className="sv-wrap" style={{ textAlign: 'center', paddingBottom: 8 }}>
            <div className="eyebrow" style={{ justifyContent: 'center' }}><span className="dot" />Just for you</div>
            <p className="sv-hint" style={{ maxWidth: '46ch', margin: '0 auto' }}>
              The study is finished. If you like, keep talking with your future self — this part is private and isn't analysed.
            </p>
          </div>
          <div className="pb-scroll" ref={scrollRef}>
            <div className="chat-thread">
              {messages.map((m) => (
                <div key={m.id} className={`msg ${m.role === 'user' ? 'user' : 'future'} fade-in`}>
                  <div className="avatar">{m.role === 'user' ? (profile.name?.[0] || 'Y').toUpperCase() : <MiniAvatar initials={initials} color={profile.color} size={30} />}</div>
                  <div style={{ minWidth: 0, flex: m.role === 'user' ? 'unset' : 1 }}>
                    <div className="bubble">{m.role === 'future' ? m.paras.map((p, i) => <p key={i}>{renderRich(p)}</p>) : m.text}</div>
                  </div>
                </div>
              ))}
              {pending && (
                <div className="msg future fade-in">
                  <div className="avatar"><MiniAvatar initials={initials} color={profile.color} size={30} /></div>
                  <div className="bubble"><div className="typing"><span></span><span></span><span></span></div></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="composer-wrap pb-composer">
        {error && <div className="composer-error">{error}</div>}
        <div className="composer">
          <textarea rows={1} placeholder={`Message ${profile.name || 'your future self'}…`}
            value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }} />
          <button className="send" disabled={!draft.trim() || pending} onClick={() => send(draft)} aria-label="Send">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div className="composer-foot">This continuation is private — it isn't part of the study analysis.</div>
      </div>
    </div>
  );
}

Object.assign(window, { Chat, FreeContinuation, postJSON, splitParas, renderRich, buildOpening });
