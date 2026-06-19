const { useState, useEffect, useCallback } = React;

async function api(path) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' } });
  if (r.status === 401) { location.href = '/results'; throw new Error('unauthorized'); }
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || ('HTTP ' + r.status)); }
  return r.json();
}
const short = (id) => (id || '').slice(0, 8);
const fmt = (t) => t ? new Date(t).toLocaleString() : '—';
const num = (x, dp = 2) => (x === null || x === undefined || Number.isNaN(x)) ? 'n/a' : Number(x).toFixed(dp);
const Pill = ({ s }) => <span className={'pill s-' + s}>{s}</span>;
const OUTC = [['vividness', 'Vividness'], ['closeness', 'Closeness'], ['manip_checks', 'Manip. checks']];

function Delta({ v }) {
  if (v === null || v === undefined) return <span className="muted">—</span>;
  const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : '';
  return <span className={'delta ' + cls}>{v > 0 ? '+' : ''}{Number(v).toFixed(2)}</span>;
}

// ---------- Overview ----------
function Overview() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { api('/api/results/overview').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="note">{err}</div>;
  if (!d) return <p className="muted">Loading…</p>;
  const conds = Object.entries(d.by_condition || {});
  const careers = Object.entries(d.by_career || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <h1 className="page">Research so far</h1>
      <p className="sub">Completed sessions collected to date. N is small — read everything here as a descriptive pilot, not an inferential result.</p>
      <div className="cards">
        <div className="metric"><div className="label">Completed sessions</div><div className="big">{d.n_completed}</div>
          <div className="small">{conds.map(([k, v]) => k + ': ' + v).join(' · ') || '—'}</div></div>
        <div className="metric"><div className="label">Mean Δ vividness</div><div className="big"><Delta v={d.mean_delta.vividness} /></div><div className="small">pre → post (1–7)</div></div>
        <div className="metric"><div className="label">Mean Δ closeness</div><div className="big"><Delta v={d.mean_delta.closeness} /></div><div className="small">IOS (1–7)</div></div>
      </div>
      <div className="grid2">
        <div className="panel">
          <h3>Mean post-session scores (1–7)</h3>
          <table><tbody>
            {OUTC.map(([k, lbl]) => <tr key={k}><td>{lbl}</td><td className="num">{num(d.mean_post[k])}</td></tr>)}
          </tbody></table>
          <p className="muted" style={{ marginTop: 8, fontSize: 12.5 }}>Manipulation checks (sounded like me / spoke in scenes / understood me) have no pre measure.</p>
        </div>
        <div className="panel">
          <h3>Chosen careers</h3>
          <table><tbody>
            {careers.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v}</td></tr>)}
            {!careers.length && <tr><td className="muted">No sessions yet.</td></tr>}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

// ---------- RQ results (eval runs) ----------
function RunDetail({ id, onClose }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { api('/api/results/runs/' + id).then(setD).catch((e) => setErr(e.message)); }, [id]);
  const body = () => {
    if (err) return <p className="muted">{err}</p>;
    if (!d) return <p className="muted">Loading…</p>;
    const c = d.config || {}; const s = d.summary || {};
    const rows = Array.isArray(s.headline) ? s.headline : [];
    const srcLabel = (c.source === 'db' ? 'Real participant sessions' : 'Synthetic (offline demo)')
      + ' · ' + (c.use_real ? (c.model || 'real judge') : 'FakeLLM') + ' · N=' + (s.n_participants ?? '—');
    return (
      <div>
        <h2>Run <code className="id">{short(id)}</code> <Pill s={d.status} /></h2>
        <p className="muted">{srcLabel} · depths {(c.depths || []).join('/')} · {(c.prompt_structures || []).join('/')} · k={c.n_runs} · {fmt(d.created_at)}</p>
        {d.error && <div className="note">{d.error}</div>}
        <div className="note">
          Agreement of the LLM judge with participants' own post-chat ratings. Lower <b>MAE</b> = closer; <b>Spearman ρ / QWK / ICC</b> need N≥~5 to be meaningful (shown as n/a at tiny N). <b>Inter-run SD</b> = judge stability across k repeats.
        </div>
        <div className="panel">
          <h3>Agreement metrics per outcome × depth × structure</h3>
          <table>
            <thead><tr><th>Depth</th><th>Structure</th><th>Outcome</th><th className="num">MAE</th><th className="num">Spearman ρ</th><th className="num">QWK</th><th className="num">ICC</th><th className="num">Inter-run SD</th><th className="num">n</th></tr></thead>
            <tbody>
              {rows.map((m, i) => (
                <tr key={i}>
                  <td>{m.depth}</td><td>{m.prompt_structure}</td><td>{m.outcome}</td>
                  <td className="num">{num(m.mae)}</td><td className="num">{num(m.spearman)}</td>
                  <td className="num">{num(m.qwk)}</td><td className="num">{num(m.icc21)}</td>
                  <td className="num">{num(m.interrun_sd)}</td><td className="num">{m.n_sessions ?? '—'}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan="9" className="muted">No metrics in this run.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}><span className="close" onClick={onClose}>×</span>{body()}</div></div>;
}

function RunsView() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { api('/api/results/runs').then(setRows).catch((e) => setErr(e.message)); }, []);
  const headline = (s) => {
    if (!s || !s.headline) return '—';
    const h = s.headline.find((x) => x.outcome === 'closeness') || s.headline[0];
    return h ? `${h.outcome} MAE=${num(h.mae)}` : '—';
  };
  if (err) return <div className="note">{err}</div>;
  return (
    <div>
      <h1 className="page">RQ results — judge ↔ human agreement</h1>
      <p className="sub">How closely the LLM evaluation pipeline reproduces participants' own ratings, across persona depth and prompt structure.</p>
      <table>
        <thead><tr><th>Run</th><th>Status</th><th>Source</th><th>Config</th><th>Headline</th><th>Created</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><code className="id">{short(r.id)}</code></td>
              <td><Pill s={r.status} /></td>
              <td>{(r.config && r.config.source) || '—'}{r.config && r.config.use_real ? ' · real' : ' · fake'}</td>
              <td className="muted">{r.config ? `${(r.config.depths || []).join('/')} × ${(r.config.prompt_structures || []).join('/')} × k${r.config.n_runs}` : '—'}</td>
              <td>{headline(r.summary)}</td>
              <td className="muted">{fmt(r.created_at)}</td>
              <td>{r.status === 'done' ? <button className="btn" onClick={() => setOpen(r.id)}>Open</button> : <span className="muted">{r.status}</span>}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="7" className="muted">No eval runs yet.</td></tr>}
        </tbody>
      </table>
      {open && <RunDetail id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ---------- Real vs simulated conversations ----------
function SimCompare({ id, onClose }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { api('/api/results/simulations/' + id).then(setD).catch((e) => setErr(e.message)); }, [id]);
  const body = () => {
    if (err) return <p className="muted">{err}</p>;
    if (!d) return <p className="muted">Loading…</p>;
    const real = d.real_transcript || []; const sim = d.sim_transcript || [];
    return (
      <div>
        <h2>{d.source_label || '—'} · {d.career || '—'} <Pill s={d.status} /></h2>
        <p className="muted">Simulated Phase-C ({d.config && d.config.turns} turns, {d.config && d.config.condition}) vs the real participant's Phase-C. {fmt(d.created_at)}</p>
        {d.error && <div className="note">{d.error}</div>}
        <div className="note">Illustrative only: a silicon participant built from {d.source_label || 'this participant'}'s profile talking to the same future-self bot. Face validity, not a measured result.</div>
        <div className="grid2">
          <div className="panel">
            <div className="col-head">Real participant ↔ future self</div>
            <div className="chat">
              {real.map((m, i) => <div key={i} className={'bub ' + (m.role === 'user' ? 'user' : 'other')}>{m.text}</div>)}
              {!real.length && <p className="muted">No real Phase-C transcript.</p>}
            </div>
          </div>
          <div className="panel">
            <div className="col-head">Simulated participant ↔ future self</div>
            <div className="chat">
              {sim.map((m, i) => <div key={i} className={'bub ' + (m.role === 'user' ? 'user' : 'other')}>{m.text}</div>)}
              {!sim.length && <p className="muted">No simulated transcript.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}><span className="close" onClick={onClose}>×</span>{body()}</div></div>;
}

function SimsView() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState(null);
  const load = useCallback(() => { api('/api/results/simulations').then(setRows).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => { if (rows.some((r) => r.status === 'queued' || r.status === 'running')) load(); }, 4000);
    return () => clearInterval(t);
  }, [rows, load]);
  if (err) return <div className="note">{err}</div>;
  return (
    <div>
      <h1 className="page">Real vs simulated conversations</h1>
      <p className="sub">A "silicon participant" built from a real profile chats with the same future-self bot; its transcript sits beside the real one. Launch new ones from the admin dashboard.</p>
      <table>
        <thead><tr><th>Run</th><th>Status</th><th>Participant</th><th>Career</th><th>Turns</th><th>Created</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><code className="id">{short(r.id)}</code></td>
              <td><Pill s={r.status} /></td>
              <td>{r.source_label}</td>
              <td>{r.career}</td>
              <td>{r.config && r.config.turns}</td>
              <td className="muted">{fmt(r.created_at)}</td>
              <td>{r.status === 'done' ? <button className="btn" onClick={() => setOpen(r.id)}>Compare</button> : <span className="muted">{r.status}</span>}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="7" className="muted">No simulations yet — launch one from the admin dashboard.</td></tr>}
        </tbody>
      </table>
      {open && <SimCompare id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ---------- Anonymous session browser ----------
function SessionDetail({ label, onClose }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { api('/api/results/sessions/' + label).then(setD).catch((e) => setErr(e.message)); }, [label]);
  const body = () => {
    if (err) return <p className="muted">{err}</p>;
    if (!d) return <p className="muted">Loading…</p>;
    const study = d.study || {};
    const tb = (study.phaseB && study.phaseB.transcript) || [];
    const tc = (study.phaseC && study.phaseC.transcript) || [];
    const surv = (obj) => Object.entries(obj || {}).filter(([k]) => k !== 'contact' && k !== 'email');
    const o = d.outcomes || { pre: {}, post: {}, delta: {} };
    return (
      <div>
        <h2>{d.label} <Pill s={d.status} /> <span className="muted" style={{ fontSize: 14 }}>{d.condition}</span></h2>
        <p className="muted">{d.career || '—'} · completed {fmt(d.completed_at)}</p>
        <div className="grid2" style={{ marginTop: 12 }}>
          <div className="panel">
            <h3>Profile &amp; scores (anonymized)</h3>
            <div className="kv">
              <b>Participant</b><span>{(study.profile && study.profile.name) || d.label}</span>
              <b>Career</b><span>{(study.phaseB && study.phaseB.career) || '—'}</span>
              <b>Big Five</b><span>{study.scores && study.scores.bigFive ? Object.entries(study.scores.bigFive).map(([k, v]) => k + ':' + v).join('  ') : '—'}</span>
              <b>RIASEC</b><span>{study.scores && study.scores.riasec ? Object.entries(study.scores.riasec).map(([k, v]) => k + ':' + v).join('  ') : '—'}</span>
              <b>Values</b><span>{study.scores && study.scores.values ? [].concat(study.scores.values).join(', ') : '—'}</span>
            </div>
          </div>
          <div className="panel">
            <h3>Pre → post (IBM outcomes)</h3>
            <table>
              <thead><tr><th>Outcome</th><th className="num">Pre</th><th className="num">Post</th><th className="num">Δ</th></tr></thead>
              <tbody>
                {[['vividness', 'Vividness'], ['closeness', 'Closeness']].map(([k, lbl]) => (
                  <tr key={k}><td>{lbl}</td><td className="num">{num(o.pre[k])}</td><td className="num">{num(o.post[k])}</td><td className="num"><Delta v={o.delta[k]} /></td></tr>
                ))}
                <tr><td>Manip. checks</td><td className="num">—</td><td className="num">{num(o.post.manip_checks)}</td><td className="num">—</td></tr>
              </tbody>
            </table>
          </div>
          <div className="panel">
            <h3>Phase B — career guide</h3>
            <div className="chat">{tb.map((m, i) => <div key={i} className={'bub ' + (m.role === 'user' ? 'user' : 'other')}>{m.text}</div>)}{!tb.length && <p className="muted">—</p>}</div>
          </div>
          <div className="panel">
            <h3>Phase C — future self</h3>
            <div className="chat">{tc.map((m, i) => <div key={i} className={'bub ' + (m.role === 'user' ? 'user' : 'other')}>{m.text}</div>)}{!tc.length && <p className="muted">—</p>}</div>
          </div>
          <div className="panel" style={{ gridColumn: '1 / -1' }}>
            <h3>Post-survey answers</h3>
            <div className="kv">{surv(study.postSurvey).map(([k, v]) => [<b key={k + 'k'}>{k}</b>, <span key={k + 'v'}>{String(v)}</span>])}</div>
          </div>
        </div>
      </div>
    );
  };
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}><span className="close" onClick={onClose}>×</span>{body()}</div></div>;
}

function SessionsView() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { api('/api/results/sessions').then(setRows).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="note">{err}</div>;
  return (
    <div>
      <h1 className="page">Browse sessions — anonymous</h1>
      <p className="sub">Every completed session, names removed (P01, P02…). Full demographics, scores, both transcripts, and pre → post answers are shown.</p>
      <table>
        <thead><tr><th>Participant</th><th>Condition</th><th>Career</th><th>Phase-C turns</th><th>Completed</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td><b>{r.label}</b></td>
              <td>{r.condition}</td>
              <td>{r.career || <span className="muted">—</span>}</td>
              <td>{r.phase_c_turns}</td>
              <td className="muted">{fmt(r.completed_at)}</td>
              <td><button className="btn" onClick={() => setOpen(r.label)}>Open</button></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="6" className="muted">No completed sessions yet.</td></tr>}
        </tbody>
      </table>
      {open && <SessionDetail label={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ---------- Persona-source ablation (reconstruction) ----------
const RECON = {
  n: 30,
  rows: [
    { o: 'Continuity',   m1: 4.91, m2: 5.06, d: 0.14, mp: 0.08, r: 0.33, rlo: -0.04, rhi: 0.61, sd1: 0.45, sd2: 0.22, rat: 0.48, vp: 0.010 },
    { o: 'Vividness',    m1: 4.93, m2: 4.86, d: -0.08, mp: 0.47, r: 0.31, rlo: -0.05, rhi: 0.61, sd1: 0.58, sd2: 0.29, rat: 0.51, vp: 0.0000 },
    { o: 'Closeness',    m1: 4.13, m2: 4.20, d: 0.07, mp: 0.54, r: 0.20, rlo: -0.17, rhi: 0.52, sd1: 0.51, sd2: 0.41, rat: 0.80, vp: 0.55 },
    { o: 'Manip-checks', m1: 6.14, m2: 6.12, d: -0.02, mp: 0.74, r: 0.41, rlo: 0.06, rhi: 0.67, sd1: 0.39, sd2: 0.22, rat: 0.57, vp: 0.048 },
  ],
};
function pval(p) { return p < 0.001 ? '<0.001' : p.toFixed(p < 0.1 ? 3 : 2); }
function ReconView() {
  const SDMAX = 0.65;
  return (
    <div>
      <h1 className="page">Persona-source ablation</h1>
      <p className="sub">A within-silicon robustness check (N=30 paired, model fixed = Sonnet). Each participant ran the
        full study twice, changing only how the persona was built: <b>full psychometric profile</b> (Big Five + RIASEC)
        vs. <b>baseline questionnaire only</b>. It probes whether simulated outcomes depend on persona construction.
        This is a methods result — <i>not</i> the silicon-vs-human comparison (that needs human data).</p>

      <div className="note" style={{ borderLeftColor: 'var(--accent)' }}>
        <b>Headline:</b> stripping the psychometric profile leaves the <b>means statistically unchanged</b> (paired-t
        p = 0.08–0.74) but <b>significantly collapses between-person variance</b> on 3 of 4 outcomes
        (Levene p ≤ 0.05; SD roughly halves). The rich profile mainly buys <i>spread</i>, not a different average —
        the classic "LLMs flatten variance" signature, here driven by persona information.
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Variance by persona source (SD of the outcome across participants)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          {RECON.rows.map((x) => (
            <div key={x.o} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 150px', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 13.5 }}>{x.o}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', width: 60 }}>full</span>
                  <div style={{ height: 11, borderRadius: 999, background: 'var(--accent)', width: (x.sd1 / SDMAX * 100) + '%' }}></div>
                  <span className="mono" style={{ fontSize: 11 }}>{x.sd1.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', width: 60 }}>quest.</span>
                  <div style={{ height: 11, borderRadius: 999, background: 'var(--muted-2)', width: (x.sd2 / SDMAX * 100) + '%' }}></div>
                  <span className="mono" style={{ fontSize: 11 }}>{x.sd2.toFixed(2)}</span>
                </div>
              </div>
              <div className="mono" style={{ fontSize: 11.5, color: x.vp <= 0.05 ? 'var(--accent-ink)' : 'var(--muted)', textAlign: 'right' }}>
                SD ×{x.rat.toFixed(2)}<br/>Levene p={pval(x.vp)}{x.vp <= 0.05 ? ' *' : ''}
              </div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>* = variances significantly differ (p ≤ 0.05). Bars are SD across the 30 participants; shorter = more homogeneous.</p>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Full table</h3>
        <table>
          <thead><tr>
            <th>Outcome</th><th className="num">mean (full)</th><th className="num">mean (quest.)</th>
            <th className="num">Δ</th><th className="num">paired-t p</th><th className="num">r [95% CI]</th>
            <th className="num">SD ratio</th><th className="num">Levene p</th>
          </tr></thead>
          <tbody>
            {RECON.rows.map((x) => (
              <tr key={x.o}>
                <td>{x.o}</td>
                <td className="num">{x.m1.toFixed(2)}</td>
                <td className="num">{x.m2.toFixed(2)}</td>
                <td className="num">{x.d > 0 ? '+' : ''}{x.d.toFixed(2)}</td>
                <td className="num">{x.mp.toFixed(2)}</td>
                <td className="num">{x.r.toFixed(2)} [{x.rlo.toFixed(2)}, {x.rhi.toFixed(2)}]</td>
                <td className="num">{x.rat.toFixed(2)}</td>
                <td className="num" style={{ color: x.vp <= 0.05 ? 'var(--accent-ink)' : 'inherit' }}>{pval(x.vp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 8, fontSize: 12.5 }}>
          Means equal (high paired-t p) → mean fidelity to persona source is high. Per-participant r CIs mostly include 0
          → individual correspondence is weak. SD ratio &lt; 1 with small Levene p → variance flattens when the profile is removed.
        </p>
      </div>

      <div className="note" style={{ marginTop: 16 }}>
        <b>Read honestly:</b> within-silicon only (both arms AI) — a robustness result mapping to the IV "persona
        information source", and a preview of the variance question; <i>not</i> the silicon-vs-human finding.
        N=30, single run per arm (k=1), so the variance gap is not yet separated from run-to-run LLM noise — a small
        repeat (k=3) would establish the noise floor.
      </div>
    </div>
  );
}

// ---------- Showcase (embeds the self-contained supervisor walkthrough) ----------
function Showcase() {
  return (
    <div>
      <h1 className="page">Silicon-cohort showcase</h1>
      <p className="sub">A supervisor-facing walkthrough of the method-validation run (N=20 silicon participants):
        what it is, why it matters, and the headline charts. Self-contained — open full screen for the best view.</p>
      <p style={{ margin: '0 0 12px' }}><a className="btn pri" href="/results/showcase" target="_blank" rel="noreferrer">Open full screen ↗</a></p>
      <iframe src="/results/showcase" title="Silicon cohort showcase"
        style={{ width: '100%', height: '78vh', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }} />
    </div>
  );
}

function App() {
  const [tab, setTab] = useState('overview');
  const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('results-theme', next);
    setDark(!dark);
  };
  const logout = async () => { await fetch('/results/logout', { method: 'POST' }); location.href = '/results'; };
  const TABS = [['overview', 'Overview'], ['rq', 'RQ results'], ['sim', 'Real vs simulated'], ['recon', 'Persona ablation'], ['sessions', 'Browse sessions'], ['showcase', 'Showcase']];
  return (
    <div>
      <header>
        <span className="brand"><span className="dot"></span>Thesis</span>
        <span className="eyebrow-tag">Study results</span>
        <div className="tabs">
          {TABS.map(([k, lbl]) => <div key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{lbl}</div>)}
        </div>
        <div className="spacer"></div>
        <button className="icon-btn" onClick={toggleTheme} title="Toggle light / dark">{dark ? '☀' : '☾'}</button>
        <button className="btn" onClick={logout}>Sign out</button>
      </header>
      <main>
        {tab === 'overview' ? <Overview /> : tab === 'rq' ? <RunsView /> : tab === 'sim' ? <SimsView /> : tab === 'recon' ? <ReconView /> : tab === 'showcase' ? <Showcase /> : <SessionsView />}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
