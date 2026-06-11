/* Chat — the 10-year career future-self role-play (phase c) */
const { useState, useEffect, useRef, useMemo } = React;

/* Question prompts offered as tappable chips after EVERY future-self reply, so a
 * tired participant always has somewhere to go next — including angles they might
 * not think to ask about. Deliberately a FIXED, neutral pool (identical across
 * conditions) rather than model-generated, so the nudges can't differ between
 * main and baseline. Free typing always stays available. */
const ASK_POOL = [
  'What does an ordinary Tuesday actually look like for you?',
  "What's the hardest part nobody warned you about?",
  'How did you get from where I am now to where you are?',
  'Did you ever doubt this path?',
  "How's the money — honestly?",
  'What do your evenings and weekends look like?',
  'What surprised you most about this work?',
  'What skill should I start building now?',
  'What was your first job after graduating?',
  'What almost made you quit?',
  'What would you do differently?',
  'Who are the people around you these days?',
  'Where are you living, and do you like it?',
  'What does stress look like for you now?',
  "What's a recent moment that made it feel worth it?",
  'Is there a path you almost took instead?',
  'What do you miss about being my age?',
  'How do I know if this career is right for me?',
];

/* True when an idea substantially overlaps something the user already asked —
 * suggesting "What does an ordinary Tuesday look like?" right after they typed
 * "what does a normal tuesday look like" reads as the app not listening. */
function askedAlready(idea, userTexts) {
  const words = (s) => new Set(s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 4));
  const iw = [...words(idea)];
  return userTexts.some((t) => {
    const tw = words(t);
    return iw.filter((w) => tw.has(w)).length >= 3;
  });
}

/* Pick `n` not-yet-used questions; recycle the pool once it runs dry. */
function pickAskIdeas(used, n = 4, userTexts = []) {
  let avail = ASK_POOL.map((_, i) => i).filter((i) => !used.has(i));
  if (avail.length < n) { used.clear(); avail = ASK_POOL.map((_, i) => i); }
  const fresh = avail.filter((i) => !askedAlready(ASK_POOL[i], userTexts));
  if (fresh.length >= n) avail = fresh;
  const picks = [];
  while (picks.length < n && avail.length) {
    picks.push(avail.splice(Math.floor(Math.random() * avail.length), 1)[0]);
  }
  return picks;
}

/* Idea cards above the composer: tap to send, or keep typing. */
function AskIdeas({ ideas, onPick, disabled }) {
  if (!ideas || !ideas.length) return null;
  return (
    <div className="ask-row" aria-label="Suggested questions">
      <div className="ask-lbl">Ideas to ask — or write your own below</div>
      <div className="ask-grid">
        {ideas.map((i) => (
          <button key={i} className="ask-chip" disabled={disabled} onClick={() => onPick(i)}>
            {ASK_POOL[i]}
          </button>
        ))}
      </div>
    </div>
  );
}

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
 * shows as formatting instead of distracting raw asterisks. Shared by both chats.
 * The prompts now forbid markdown (v5.1 FORMAT lines); as belt-and-braces, any
 * STRAY unpaired asterisks that still slip through are stripped from plain
 * segments (raw * broke immersion in supervisor testing). */
function renderRich(text) {
  const out = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  const plain = (s) => s.replace(/\*+/g, '');
  let last = 0, m, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(plain(text.slice(last, m.index)));
    if (m[1] != null) out.push(<strong key={k++}>{m[1]}</strong>);
    else out.push(<em key={k++}>{m[2]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(plain(text.slice(last)));
  return out;
}

/* Auto-grow a composer textarea with its content (one line up to 200px) so
 * longer thoughts don't scroll inside a single cramped row. */
function autoGrowTA(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

/* True once `active` has been continuously true for `ms` — used to show a quiet
 * patience note when a reply runs long (the reasoning model can take 15-40s;
 * bare typing dots that long read as "it broke"). */
function useSlowPending(active, ms = 9000) {
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => {
    if (!active) { setSlow(false); return undefined; }
    const t = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(t);
  }, [active]);
  return slow;
}

/* Typing dots + the optional slow-reply note. Calm wording only — §16 forbids
 * pressure cues. */
function TypingBubble({ slow }) {
  return (
    <div>
      <div className="typing"><span></span><span></span><span></span></div>
      {slow && <div className="slow-note fade-in">Taking a moment — a thoughtful reply can take a little while.</div>}
    </div>
  );
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

/* Render elapsed minutes as a quiet mm:ss count-up (§7: a running clock in the
 * header; §16 forbids countdowns/pressure cues — counting UP is the spec). */
function mmss(min) {
  const s = Math.max(0, Math.floor(min * 60));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function Chat({ profile, condition = 'main', profileData = {}, phaseBNotes = '', location = '', career: careerProp, seedTranscript = [], seedElapsedSec = 0, onComplete, onExit, onAutosave }) {
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
  const [askIdeas, setAskIdeas] = useState([]);   // refreshed after every reply
  const usedIdeas = useRef(new Set());
  const userTexts = useRef([]);                   // what they asked, for chip de-duplication
  const [error, setError] = useState(null);
  // Conversation clock = ACCUMULATED seconds, not wall time since mount: it
  // pauses while the page is hidden/closed or while a connection error blocks
  // the conversation, persists with every autosave, and resumes from the saved
  // value (seedElapsedSec) — interruptions don't eat the participant's 30 min.
  const [elapsedSec, setElapsedSec] = useState(Math.max(0, Math.round(seedElapsedSec || 0)));
  const elapsedRef = useRef(elapsedSec);
  const errorRef = useRef(null);
  const [nextRest, setNextRest] = useState(SOFT_MIN); // recurring rest prompt cadence (§11.4)
  const [saveState, setSaveState] = useState('');      // '' | 'saving' | 'saved' (§13b autosave indicator)
  const [lastFailed, setLastFailed] = useState(null);  // failed user turn, for a clean "Try again" (§13b)
  const scrollRef = useRef(null);
  const taRef = useRef(null);
  const sessionId = useRef(null);
  const messagesRef = useRef([]);
  const slowReply = useSlowPending(pending || booting);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { errorRef.current = error; }, [error]);

  // Reset the composer height after a send clears the draft programmatically.
  useEffect(() => { if (!draft) autoGrowTA(taRef.current); }, [draft]);

  const elapsedMin = elapsedSec / 60;
  const hard = elapsedMin >= HARD_MIN;
  const soft = !hard && elapsedMin >= nextRest; // fires at 20 min and again every 20 if it continues

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending, booting]);

  // Tick the clock only while the conversation is actually live: not while
  // connecting, not while the tab is hidden / the page is closed, not while a
  // connection error is blocking replies, and not past the hard cap.
  useEffect(() => {
    if (booting) return undefined;
    const t = setInterval(() => {
      if (document.hidden || errorRef.current) return;
      setElapsedSec((s) => {
        const next = s >= HARD_MIN * 60 ? s : s + 1;
        elapsedRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [booting]);

  // Persist the transcript-so-far after every change (§13a: nothing lives only
  // in browser memory; the user turn is saved before the slow model call too,
  // because `send` appends it to state before awaiting the reply).
  const toTranscript = (msgs) => msgs.map((m) => ({
    role: m.role === 'user' ? 'user' : 'future',
    text: m.role === 'user' ? m.text : (m.paras || []).join('\n\n'),
    ts: m.ts,
  }));
  useEffect(() => {
    if (!onAutosave || !messages.length) return;
    setSaveState('saving');
    // durationSec/turnCount ride with every save: saveSession replaces the whole
    // phaseC section, and the persisted clock is what a resume continues from.
    const extra = { durationSec: elapsedRef.current, turnCount: messages.filter((m) => m.role === 'user').length };
    Promise.resolve(onAutosave(toTranscript(messages), extra)).finally(() => setSaveState('saved'));
  }, [messages]);

  // Create the phase-c session (condition-routed) and fetch the opener on mount.
  // When an admin-resumed run carries a saved transcript, it is replayed into the
  // model's history server-side and rendered here, so the conversation continues
  // with full memory instead of starting over.
  useEffect(() => {
    let cancelled = false;
    const seed = (seedTranscript || [])
      .filter((m) => m && typeof m.text === 'string' && m.text.trim())
      .map((m, i) => (m.role === 'user'
        ? { role: 'user', text: m.text, id: `s${i}`, ts: m.ts || new Date().toISOString() }
        : { role: 'future', paras: splitParas(m.text), id: `s${i}`, ts: m.ts || new Date().toISOString() }));
    userTexts.current.push(...seed.filter((m) => m.role === 'user').map((m) => m.text));
    (async () => {
      setBooting(true);
      setError(null);
      try {
        const { sessionId: sid, opening: text } =
          await postJSON('/api/phase-c/session', {
            condition, profileData, phaseBNotes, location,
            priorTranscript: seed.length ? seedTranscript : undefined,
          });
        if (cancelled) return;
        sessionId.current = sid;
        setMessages([...seed, { role: 'future', paras: splitParas(text), id: 'm0', ts: new Date().toISOString() }]);
        setAskIdeas(pickAskIdeas(usedIdeas.current, 4, userTexts.current));
      } catch (e) {
        if (cancelled) return;
        setMessages([...seed, { role: 'future', paras: opening, id: 'm0', ts: new Date().toISOString() }]);
        setError("Couldn't reach your future self — replies won't work until the server is running.");
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // run once

  const finish = () => {
    const transcript = toTranscript(messages);
    const durationSec = elapsedRef.current; // accumulated live time (pauses excluded)
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

  // The server holds the live LLM session in memory; a redeploy/restart loses it
  // ("Unknown session"). Self-heal: silently re-create the phase-c session with
  // the full visible transcript replayed into the model (minus the trailing user
  // turn, which is about to be re-sent), so the conversation continues with full
  // memory and the participant notices nothing.
  const reconnect = async () => {
    const prior = toTranscript(messagesRef.current);
    const seed = prior.length && prior[prior.length - 1].role === 'user' ? prior.slice(0, -1) : prior;
    const { sessionId: sid } = await postJSON('/api/phase-c/session', {
      condition, profileData, phaseBNotes, location,
      priorTranscript: seed, silentResume: true,
    });
    sessionId.current = sid;
  };

  // Ask the model for a reply to `t`. The user bubble is appended by `send`;
  // `retry` reuses the same path WITHOUT re-appending it (the server rolled the
  // failed turn back, so re-sending the text is clean — §13b).
  const requestReply = async (t, isRetryAfterReconnect = false) => {
    setPending(true);
    setError(null);
    try {
      const { reply } = await postJSON('/api/chat', { sessionId: sessionId.current, message: t });
      setMessages(prev => [...prev, { role: 'future', paras: splitParas(reply), id: `f${Date.now()}`, ts: new Date().toISOString() }]);
      setAskIdeas(pickAskIdeas(usedIdeas.current, 4, userTexts.current)); // fresh angles after every reply
      setLastFailed(null);
    } catch (e) {
      if (!isRetryAfterReconnect && /unknown session/i.test(e.message || '')) {
        try {
          await reconnect();
          setPending(false);
          return requestReply(t, true);
        } catch (e2) { /* fall through to the normal error path */ }
      }
      setLastFailed(t);
      setError("Connection hiccuped — your progress is saved.");
    } finally {
      setPending(false);
    }
  };

  const send = async (text) => {
    const t = text.trim();
    if (!t || pending || booting || hard) return;
    setMessages(prev => [...prev, { role: 'user', text: t, id: `u${Date.now()}`, ts: new Date().toISOString() }]);
    setDraft('');
    userTexts.current.push(t);
    setAskIdeas([]); // hide while the reply is in flight; refreshed on arrival
    if (!sessionId.current) {
      // No live session (e.g. boot failed earlier) — rebuild one silently from
      // the visible transcript instead of dead-ending the participant.
      try { await reconnect(); } catch (e) {
        setLastFailed(t);
        setError('Connection hiccuped — your progress is saved.');
        return;
      }
    }
    await requestReply(t);
  };

  const sendIdea = (i) => { usedIdeas.current.add(i); send(ASK_POOL[i]); };

  const retry = () => { if (lastFailed && !pending) requestReply(lastFailed); };

  // Regenerate ("This doesn't feel like me") is intentionally REMOVED for the
  // controlled study: letting a participant re-roll the future self's reply makes
  // the role-play exposure non-comparable across participants and could be steered
  // toward a flattering answer — a confound for the IBM outcome measures
  // (Build Plan §11.5 seamlessness / measurement integrity). The /api/regenerate
  // route still exists for ad-hoc testing but is no longer reachable in the UI.

  return (
    <div className="chat-app" data-screen-label="04 Chat">
      <aside className="chat-side">
        <div className="brand"><BrandMark size={20}/><span>Thesis</span></div>

        <div style={{padding: '0 4px'}}>
          <button className="btn ghost sm" style={{width: '100%', justifyContent: 'flex-start'}} onClick={onExit} title="Restart the study from the beginning">
            ↻&nbsp; Start over
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
            <button className="header-restart" onClick={onExit} title="Start over from the beginning" aria-label="Start over">↻</button>
            <span className="clock" title="Time in this conversation">{mmss(elapsedMin)}</span>
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
                <div className="bubble"><TypingBubble slow={slowReply} /></div>
              </div>
            )}

          </div>
        </div>

        <div className="composer-wrap">
          {error && (
            <div className="composer-error" role="status">
              {error}
              {lastFailed && (
                <button className="link-btn" onClick={retry} disabled={pending}>Try again</button>
              )}
            </div>
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
          {!booting && !pending && !hard && (
            <AskIdeas ideas={askIdeas} onPick={sendIdea} disabled={pending || booting} />
          )}
          <div className="composer">
            <textarea
              rows={1}
              ref={taRef}
              placeholder={hard ? 'The conversation has ended — continue to reflect.' : booting ? 'Connecting to your future self…' : `Message ${profile.name || 'your future self'}…`}
              value={draft}
              disabled={booting || hard}
              onChange={(e) => { setDraft(e.target.value); autoGrowTA(e.target); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }}
            />
            <button className="send" disabled={!draft.trim() || pending || booting || hard} onClick={() => send(draft)} aria-label="Send">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="composer-foot">
            Ask anything — your future self is here to think it through with you.
            {saveState && <span className="save-note">{saveState === 'saving' ? ' · Saving…' : ' · Progress saved ✓'}</span>}
          </div>
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
function FreeContinuation({ profile = {}, career = 'this career', sessionId, history = [],
  condition = 'main', profileData = {}, phaseBNotes = '', location = '', onDone, onAutosave }) {
  const { useState, useEffect, useRef } = React;
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const usedIdeas = useRef(new Set());
  const userTexts = useRef((history || []).filter((m) => m.role === 'user').map((m) => m.text || ''));
  const [askIdeas, setAskIdeas] = useState(() => pickAskIdeas(usedIdeas.current, 4, userTexts.current));
  const [error, setError] = useState(null);
  const startedAt = useRef(Date.now());
  const scrollRef = useRef(null);
  const taRef = useRef(null);
  const slowReply = useSlowPending(pending);
  useEffect(() => { if (!draft) autoGrowTA(taRef.current); }, [draft]);
  const initials = ((profile.name || '').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2) || '—').toUpperCase();

  // The role-play transcript is shown (read-only) above the new messages so this
  // reads as the SAME conversation continuing — not a fresh chat with no memory.
  // It is display-only: autosave below records only the NEW (free) turns.
  const past = (history || []).map((m, i) => ({
    role: m.role === 'user' ? 'user' : 'future',
    text: m.text || '',
    id: `h${i}`,
  }));

  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, pending]);
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, []); // start at the newest turn

  const toTranscript = (msgs) => msgs.map((m) => ({
    role: m.role === 'user' ? 'user' : 'future',
    text: m.role === 'user' ? m.text : (m.paras || []).join('\n\n'),
    ts: m.ts,
  }));

  // Same per-turn durability as the role-play (§13a) — logged separately (§3.9b).
  useEffect(() => {
    if (!onAutosave || !messages.length) return;
    onAutosave(toTranscript(messages));
  }, [messages]);

  const wrapUp = () => {
    const durationSec = Math.round((Date.now() - startedAt.current) / 1000);
    const turnCount = messages.filter((m) => m.role === 'user').length;
    onDone && onDone({ transcript: toTranscript(messages), durationSec, turnCount });
  };

  // The live server session may be gone (server restart, or the run was resumed
  // on another device after the post-survey). Self-heal exactly like the main
  // chat: rebuild a phase-c session silently from the role-play history + the
  // free turns so far, so "keep talking" always works.
  const sid = useRef(sessionId || null);
  const rebuildSession = async () => {
    const freeSoFar = toTranscript(messages);
    const seed = [...(history || []), ...freeSoFar]
      .filter((m) => m && typeof m.text === 'string' && m.text.trim());
    const { sessionId: fresh } = await postJSON('/api/phase-c/session', {
      condition, profileData, phaseBNotes, location,
      priorTranscript: seed.length ? seed : [{ role: 'future', text: `Hey — it's me again, your future self (${career}).` }],
      silentResume: true,
    });
    sid.current = fresh;
  };

  const send = async (text, isRetryAfterReconnect = false) => {
    const t = text.trim();
    if (!t || pending) return;
    if (!isRetryAfterReconnect) {
      setMessages((p) => [...p, { role: 'user', text: t, id: `u${Date.now()}`, ts: new Date().toISOString() }]);
      setDraft('');
      userTexts.current.push(t);
    }
    setPending(true); setError(null); setAskIdeas([]);
    try {
      if (!sid.current) await rebuildSession();
      const { reply } = await postJSON('/api/chat', { sessionId: sid.current, message: t });
      setMessages((p) => [...p, { role: 'future', paras: splitParas(reply), id: `f${Date.now()}`, ts: new Date().toISOString() }]);
      setAskIdeas(pickAskIdeas(usedIdeas.current, 4, userTexts.current));
    } catch (e) {
      if (!isRetryAfterReconnect && /unknown session/i.test(e.message || '')) {
        sid.current = null;
        setPending(false);
        return send(text, true);
      }
      setError(e.message || 'Something went wrong. Please try again.');
      setAskIdeas(pickAskIdeas(usedIdeas.current, 4, userTexts.current));
    } finally { setPending(false); }
  };

  const sendIdea = (i) => { usedIdeas.current.add(i); send(ASK_POOL[i]); };

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
            <p className="sv-intro" style={{ maxWidth: '52ch', margin: '6px auto 0' }}>
              The study questions are done. If you like, keep talking with your future self — this part is
              still recorded for the researcher, but it's outside the main study and entirely optional.
            </p>
          </div>
          <div className="pb-scroll" ref={scrollRef}>
            <div className="chat-thread">
              {past.map((m) => (
                <div key={m.id} className={`msg history ${m.role === 'user' ? 'user' : 'future'}`}>
                  <div className="avatar">{m.role === 'user' ? (profile.name?.[0] || 'Y').toUpperCase() : <MiniAvatar initials={initials} color={profile.color} size={30} />}</div>
                  <div style={{ minWidth: 0, flex: m.role === 'user' ? 'unset' : 1 }}>
                    <div className="bubble">{m.role === 'future' ? splitParas(m.text).map((p, i) => <p key={i}>{renderRich(p)}</p>) : m.text}</div>
                  </div>
                </div>
              ))}
              {past.length > 0 && <div className="history-note">Your conversation continues</div>}
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
                  <div className="bubble"><TypingBubble slow={slowReply} /></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="composer-wrap pb-composer">
        {error && <div className="composer-error">{error}</div>}
        {!pending && <AskIdeas ideas={askIdeas} onPick={sendIdea} disabled={pending} />}
        <div className="composer">
          <textarea rows={1} ref={taRef} placeholder={`Message ${profile.name || 'your future self'}…`}
            value={draft} onChange={(e) => { setDraft(e.target.value); autoGrowTA(e.target); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }} />
          <button className="send" disabled={!draft.trim() || pending} onClick={() => send(draft)} aria-label="Send">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div className="composer-foot">Optional extra chat — recorded, but not part of the main study analysis.</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Chat, FreeContinuation, postJSON, splitParas, renderRich, buildOpening,
  autoGrowTA, useSlowPending, TypingBubble,
});
