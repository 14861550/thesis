/*
 * phaseb.jsx — Phase B: the shared career-recommendation dialogue (Appendix B).
 *
 * Identical for both conditions. The guide asks a few questions, proposes five
 * career directions, and the student locks in ONE to step into — then rates
 * familiarity and interest strength (covariates, Status Brief §3.4). Both the
 * chosen career and a short carry-over of the conversation flow into Phase C
 * (the MAIN condition uses the carry-over; BASELINE uses only the career name).
 */

const PB_FAMILIARITY = { points: 7, left: 'Not at all familiar', right: 'Very familiar' };
const PB_INTEREST = { points: 7, left: 'Not at all', right: 'Very strong' };
const PB_REST_MIN = 20; // recurring rest hint cadence in stage B (§7 Screen 3)

function PhaseB({ profileData, rec = 'reflective', seedTranscript = [], onDone, onBack, onAutosave }) {
  const { useState, useEffect, useRef } = React;
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
  const slowReply = useSlowPending(pending || booting); // shared with chat.jsx
  useEffect(() => { if (!draft) autoGrowTA(taRef.current); }, [draft]);

  const restDue = elapsedMin >= nextRest; // gentle, recurring, dismissible (§7)

  useEffect(() => {
    const t = setInterval(() => setElapsedMin((Date.now() - startedAt.current) / 60000), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending, booting, showLock]);

  // Bring the lock-in card into view once it appears.
  useEffect(() => {
    if (showLock && lockRef.current && lockRef.current.scrollIntoView) {
      lockRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showLock]);

  const guideTurns = messages.filter((m) => m.role === 'guide').length;
  const hasRecs = messages.some((m) => m.recommendations && m.recommendations.length);

  useEffect(() => {
    let cancelled = false;
    // A resumed run replays the saved transcript into the model (silently) and
    // renders it, so a refresh mid-conversation continues instead of restarting.
    const seed = (seedTranscript || [])
      .filter((m) => m && typeof m.text === 'string' && m.text.trim())
      .map((m, i) => (m.role === 'user'
        ? { role: 'user', text: m.text, id: `s${i}`, ts: m.ts || new Date().toISOString() }
        : { role: 'guide', paras: splitParas(m.text), id: `s${i}`, ts: m.ts || new Date().toISOString() }));
    (async () => {
      try {
        const { sessionId: sid, opening } = await postJSON('/api/phase-b/session', {
          profileData, rec, priorTranscript: seed.length ? seedTranscript : undefined,
        });
        if (cancelled) return;
        sessionId.current = sid;
        if (seed.length) {
          setMessages(seed);
          setShowLock(true); // they were already deep in — keep the chooser available
        } else {
          setMessages([{ role: 'guide', paras: splitParas(opening), id: 'g0', ts: new Date().toISOString() }]);
        }
      } catch (e) {
        if (cancelled) return;
        setError("Couldn't reach the guide — make sure the server is running.");
      } finally { if (!cancelled) setBooting(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const send = async (text) => {
    const t = text.trim();
    if (!t || pending || booting || !sessionId.current) return;
    setMessages((p) => [...p, { role: 'user', text: t, id: `u${Date.now()}`, ts: new Date().toISOString() }]);
    setDraft(''); setPending(true); setError(null);
    try {
      const { reply, recommendations } = await postJSON('/api/chat', { sessionId: sessionId.current, message: t });
      setMessages((p) => [...p, { role: 'guide', paras: splitParas(reply), recommendations: recommendations || null, id: `g${Date.now()}`, ts: new Date().toISOString() }]);
      // Only reveal the lock-in once the guide has actually proposed directions —
      // not after the first question (which felt premature in testing).
      if (recommendations && recommendations.length) setShowLock(true);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally { setPending(false); }
  };

  const transcript = () => messages.map((m) => {
    if (m.role === 'user') return { role: 'user', text: m.text, ts: m.ts };
    let text = (m.paras || []).join('\n\n');
    if (m.recommendations && m.recommendations.length) {
      // Fold the structured cards back into the saved transcript so the record
      // (and the eval pipeline) keeps the full recommendation text.
      text += '\n\n' + m.recommendations
        .map((r, i) => `${i + 1}. ${r.title} — ${r.why}${r.path ? ` Path: ${r.path}` : ''}`)
        .join('\n');
    }
    return { role: 'guide', text, ts: m.ts };
  });

  // Per-turn durability (§13a): persist the stage-B transcript as it grows.
  useEffect(() => {
    if (!onAutosave || !messages.length) return;
    onAutosave(transcript());
  }, [messages]);

  // Selecting a recommendation card fills the lock-in choice.
  const chooseRec = (title) => { setCareer(title); setCareerNote(null); setShowLock(true); };

  // Open the lock-in panel (from the in-flow prompt or a card). Reachable from
  // the start. Scrolling happens in the effect below, once the panel mounts —
  // redesigned from the old stranded top-right ghost button (14 Jun 2026 feedback).
  const openChooser = () => setShowLock(true);
  useEffect(() => {
    if (showLock && lockRef.current && lockRef.current.scrollIntoView) {
      lockRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showLock]);

  const [checking, setChecking] = useState(false);
  const [careerNote, setCareerNote] = useState(null);
  const isPreview = typeof window !== 'undefined' && window.THESIS_PREVIEW;
  const recTitles = messages.flatMap((m) => (m.recommendations || []).map((r) => (r.title || '').trim().toLowerCase()));
  const canLock = (isPreview || (career.trim() && familiarity && interest)) && !checking;

  const lockIn = async () => {
    if (!canLock) return;
    // Preview test drives may skip the picker entirely — substitute a clearly
    // labelled placeholder so the role-play never reads "this career". The real
    // flow can't get here without a validated career (gates + model check).
    const chosen = career.trim() || (isPreview ? 'Data analyst (preview)' : '');
    setCareerNote(null);
    // Free-typed careers get a model sanity check before the role-play can start
    // (card titles came from the model already). Fail-open: an unreachable check
    // never blocks the participant.
    if (chosen && !recTitles.includes(chosen.toLowerCase()) && !isPreview) {
      setChecking(true);
      try {
        const v = await postJSON('/api/validate-career', { career: chosen });
        if (v && v.ok === false) {
          setCareerNote(v.hint || "That doesn't read as a career — name a job or professional direction, like 'Data analyst' or 'Teacher'.");
          setChecking(false);
          return;
        }
      } catch (e) { /* fail-open */ }
      setChecking(false);
    }
    onDone({
      career: chosen,
      location: location.trim(),
      familiarity, interestStrength: interest,
      transcript: transcript(),
    });
  };

  return (
    <div className="flow">
      <div className="flow-progress"><div className="bar" style={{ width: '55%' }} /></div>
      <nav className="topnav">
        <div className="brand"><BrandMark size={22} /><span>Thesis</span></div>
        <div className="sv-eyebrow">Step 03 · Find a direction</div>
        <div className="end" style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost sm" onClick={onBack}>Back</button>
        </div>
      </nav>

      <div className="flow-body">
        <div className="pb-wrap">
          <div className="pb-scroll" ref={scrollRef}>
            <div className="chat-thread">
              {messages.map((m) => (
                <div key={m.id} className={`msg ${m.role === 'user' ? 'user' : 'future'} fade-in`}>
                  <div className="avatar">{m.role === 'user' ? 'You' : <BrandMark size={20} />}</div>
                  <div style={{ minWidth: 0, flex: m.role === 'user' ? 'unset' : 1 }}>
                    <div className="bubble">
                      {m.role === 'guide' ? m.paras.map((p, i) => <p key={i}>{renderRich(p)}</p>) : m.text}
                    </div>
                    {m.recommendations && m.recommendations.length > 0 && (
                      <div className="rec-grid">
                        {m.recommendations.map((r, i) => (
                          <button key={i} type="button"
                            className={`rec-card ${career.trim() === r.title ? 'active' : ''}`}
                            onClick={() => chooseRec(r.title)}>
                            <div className="rec-title">{r.title}</div>
                            {r.why && <div className="rec-why">{r.why}</div>}
                            {r.path && <div className="rec-path">{r.path}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(pending || booting) && (
                <div className="msg future fade-in">
                  <div className="avatar"><BrandMark size={20} /></div>
                  <div className="bubble"><TypingBubble slow={slowReply} /></div>
                </div>
              )}
            </div>
          </div>

          {/* In-flow career chooser (redesigned 14 Jun 2026, replacing the
              stranded top-right ghost button). Reachable from the start: a quiet
              prompt early on, then a clear call once directions have been proposed. */}
          {!showLock && !pending && (
            <div className={`pb-choose-bar ${hasRecs ? 'ready' : ''}`}>
              {hasRecs ? (
                <>
                  <span className="pb-choose-cue">Seen a direction you would want to live out?</span>
                  <button className="btn accent sm" onClick={openChooser}>Choose a career →</button>
                </>
              ) : (
                <button className="link-btn" style={{ margin: 0 }} onClick={openChooser}>
                  When you are ready, choose a career to step into →
                </button>
              )}
            </div>
          )}

          {showLock && (
            <div className="pb-lock fade-in" ref={lockRef}>
              <div className="pb-lock-h">{career.trim() ? `Step into life as a ${career.trim()}?` : 'Ready to step into one?'}</div>
              <p className="sv-intro" style={{ margin: '0 0 12px' }}>
                {hasRecs ? 'Tap a card above to choose, or type your own. ' : ''}Pick the career you're most curious to experience as your future self — you can explore others later.
              </p>
              <input className="sv-input" placeholder="The career you choose — e.g. Data analyst"
                value={career} onChange={(e) => { setCareer(e.target.value); setCareerNote(null); }} />
              {careerNote && <div className="composer-error" style={{ marginTop: 8, textAlign: 'left' }}>{careerNote}</div>}
              <input className="sv-input" style={{ marginTop: 8 }}
                placeholder="Where, for the next ten years? — a city, country, region, or 'open' (optional)"
                value={location} onChange={(e) => setLocation(e.target.value)} />
              <div style={{ marginTop: 10 }}>
                <ScaleRow id="fam" text={`How familiar do you already feel with ${career.trim() || 'this career'}?`}
                  scale={PB_FAMILIARITY} value={familiarity} onChange={(_, v) => setFamiliarity(v)} />
                <ScaleRow id="int" text="How strong is your interest in it right now?"
                  scale={PB_INTEREST} value={interest} onChange={(_, v) => setInterest(v)} />
              </div>
              <button className="btn accent" style={{ marginTop: 12 }} disabled={!canLock} onClick={lockIn}>
                {checking ? 'Checking…' : 'Step into this future'}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5h7M6.5 3l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {!canLock && (
                <p className="sv-hint" style={{ marginTop: 8 }}>
                  {!career.trim() ? 'Choose or type a career' : !familiarity ? 'Rate how familiar it feels' : 'Rate your interest'} to continue.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="composer-wrap pb-composer">
        {error && <div className="composer-error">{error}</div>}
        {restDue && (
          <div className="time-note soft">
            You've been exploring for a while — take a short breather if you like, or keep going.
            <button className="link-btn" onClick={() => setNextRest((n) => n + PB_REST_MIN)}>Keep going</button>
          </div>
        )}
        <div className="composer">
          <textarea rows={1} ref={taRef} placeholder={booting ? 'Connecting…' : 'Reply to the guide…'}
            value={draft} disabled={booting}
            onChange={(e) => { setDraft(e.target.value); autoGrowTA(e.target); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }} />
          <button className="send" disabled={!draft.trim() || pending || booting} onClick={() => send(draft)} aria-label="Send">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div className="composer-foot">The guide opens doors, not closes them — the choice stays yours.</div>
      </div>
    </div>
  );
}

Object.assign(window, { PhaseB });
