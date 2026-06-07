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

function PhaseB({ profileData, onDone, onBack }) {
  const { useState, useEffect, useRef } = React;
  const [messages, setMessages] = useState([]);
  const [booting, setBooting] = useState(true);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const [showLock, setShowLock] = useState(false);
  const [career, setCareer] = useState('');
  const [familiarity, setFamiliarity] = useState(undefined);
  const [interest, setInterest] = useState(undefined);
  const sessionId = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending, booting, showLock]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { sessionId: sid, opening } = await postJSON('/api/phase-b/session', { profileData });
        if (cancelled) return;
        sessionId.current = sid;
        setMessages([{ role: 'guide', paras: splitParas(opening), id: 'g0' }]);
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
    setMessages((p) => [...p, { role: 'user', text: t, id: `u${Date.now()}` }]);
    setDraft(''); setPending(true); setError(null);
    try {
      const { reply, recommendations } = await postJSON('/api/chat', { sessionId: sessionId.current, message: t });
      setMessages((p) => [...p, { role: 'guide', paras: splitParas(reply), recommendations: recommendations || null, id: `g${Date.now()}` }]);
      setShowLock(true); // once the guide has replied at least once, allow locking in
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally { setPending(false); }
  };

  const transcript = () => messages.map((m) => {
    if (m.role === 'user') return { role: 'user', text: m.text };
    let text = (m.paras || []).join('\n\n');
    if (m.recommendations && m.recommendations.length) {
      // Fold the structured cards back into the saved transcript so the record
      // (and the eval pipeline) keeps the full recommendation text.
      text += '\n\n' + m.recommendations
        .map((r, i) => `${i + 1}. ${r.title} — ${r.why}${r.path ? ` Path: ${r.path}` : ''}`)
        .join('\n');
    }
    return { role: 'guide', text };
  });

  // Selecting a recommendation card fills the lock-in choice.
  const chooseRec = (title) => { setCareer(title); setShowLock(true); };

  const canLock = career.trim() && familiarity && interest;
  const lockIn = () => {
    if (!canLock) return;
    onDone({
      career: career.trim(),
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
        <div className="end"><button className="btn ghost sm" onClick={onBack}>Back</button></div>
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
                      {m.role === 'guide' ? m.paras.map((p, i) => <p key={i}>{p}</p>) : m.text}
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
                  <div className="bubble"><div className="typing"><span></span><span></span><span></span></div></div>
                </div>
              )}
            </div>
          </div>

          {showLock && (
            <div className="pb-lock fade-in">
              <div className="pb-lock-h">Ready to step into one?</div>
              <p className="sv-intro" style={{ margin: '0 0 12px' }}>
                Pick the career you're most curious to experience as your future self. You can explore others later.
              </p>
              <input className="sv-input" placeholder="The career you choose — e.g. Data analyst"
                value={career} onChange={(e) => setCareer(e.target.value)} />
              <div style={{ marginTop: 10 }}>
                <ScaleRow id="fam" text={`How familiar do you already feel with ${career.trim() || 'this career'}?`}
                  scale={PB_FAMILIARITY} value={familiarity} onChange={(_, v) => setFamiliarity(v)} />
                <ScaleRow id="int" text="How strong is your interest in it right now?"
                  scale={PB_INTEREST} value={interest} onChange={(_, v) => setInterest(v)} />
              </div>
              <button className="btn accent" style={{ marginTop: 12 }} disabled={!canLock} onClick={lockIn}>
                Step into this future
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 6.5h7M6.5 3l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="composer-wrap pb-composer">
        {error && <div className="composer-error">{error}</div>}
        <div className="composer">
          <textarea rows={1} placeholder={booting ? 'Connecting…' : 'Reply to the guide…'}
            value={draft} disabled={booting}
            onChange={(e) => setDraft(e.target.value)}
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
