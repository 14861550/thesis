/* compiled from results/results.jsx — do not edit; run `npm run build` */
(function () {
const {
  useState,
  useEffect,
  useCallback
} = React;
async function api(path) {
  const r = await fetch(path, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (r.status === 401) {
    location.href = '/results';
    throw new Error('unauthorized');
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || 'HTTP ' + r.status);
  }
  return r.json();
}
const short = id => (id || '').slice(0, 8);
const fmt = t => t ? new Date(t).toLocaleString() : '—';
const num = (x, dp = 2) => x === null || x === undefined || Number.isNaN(x) ? 'n/a' : Number(x).toFixed(dp);
const Pill = ({
  s
}) => React.createElement("span", {
  className: 'pill s-' + s
}, s);
const OUTC = [['vividness', 'Vividness'], ['closeness', 'Closeness'], ['manip_checks', 'Manip. checks']];
function Delta({
  v
}) {
  if (v === null || v === undefined) return React.createElement("span", {
    className: "muted"
  }, "\u2014");
  const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : '';
  return React.createElement("span", {
    className: 'delta ' + cls
  }, v > 0 ? '+' : '', Number(v).toFixed(2));
}
function Overview() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    api('/api/results/overview').then(setD).catch(e => setErr(e.message));
  }, []);
  if (err) return React.createElement("div", {
    className: "note"
  }, err);
  if (!d) return React.createElement("p", {
    className: "muted"
  }, "Loading\u2026");
  const conds = Object.entries(d.by_condition || {});
  const careers = Object.entries(d.by_career || {}).sort((a, b) => b[1] - a[1]);
  const md = d.mean_delta || {},
    mp = d.mean_post || {};
  return React.createElement("div", null, React.createElement("h1", {
    className: "page"
  }, "Research so far"), React.createElement("p", {
    className: "sub"
  }, "Completed sessions collected to date. N is small \u2014 read everything here as a descriptive pilot, not an inferential result."), React.createElement("div", {
    className: "cards"
  }, React.createElement("div", {
    className: "metric"
  }, React.createElement("div", {
    className: "label"
  }, "Completed sessions"), React.createElement("div", {
    className: "big"
  }, d.n_completed), React.createElement("div", {
    className: "small"
  }, conds.map(([k, v]) => k + ': ' + v).join(' · ') || '—')), React.createElement("div", {
    className: "metric"
  }, React.createElement("div", {
    className: "label"
  }, "Mean \u0394 vividness"), React.createElement("div", {
    className: "big"
  }, React.createElement(Delta, {
    v: md.vividness
  })), React.createElement("div", {
    className: "small"
  }, "pre \u2192 post (1\u20137)")), React.createElement("div", {
    className: "metric"
  }, React.createElement("div", {
    className: "label"
  }, "Mean \u0394 closeness"), React.createElement("div", {
    className: "big"
  }, React.createElement(Delta, {
    v: md.closeness
  })), React.createElement("div", {
    className: "small"
  }, "IOS (1\u20137)"))), React.createElement("div", {
    className: "grid2"
  }, React.createElement("div", {
    className: "panel"
  }, React.createElement("h3", null, "Mean post-session scores (1\u20137)"), React.createElement("table", null, React.createElement("tbody", null, OUTC.map(([k, lbl]) => React.createElement("tr", {
    key: k
  }, React.createElement("td", null, lbl), React.createElement("td", {
    className: "num"
  }, num(mp[k])))))), React.createElement("p", {
    className: "muted",
    style: {
      marginTop: 8,
      fontSize: 12.5
    }
  }, "Manipulation checks (sounded like me / spoke in scenes / understood me) have no pre measure.")), React.createElement("div", {
    className: "panel"
  }, React.createElement("h3", null, "Chosen careers"), React.createElement("table", null, React.createElement("tbody", null, careers.map(([k, v]) => React.createElement("tr", {
    key: k
  }, React.createElement("td", null, k), React.createElement("td", {
    className: "num"
  }, v))), !careers.length && React.createElement("tr", null, React.createElement("td", {
    className: "muted"
  }, "No sessions yet.")))))));
}
function RunDetail({
  id,
  onClose
}) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    api('/api/results/runs/' + id).then(setD).catch(e => setErr(e.message));
  }, [id]);
  const body = () => {
    if (err) return React.createElement("p", {
      className: "muted"
    }, err);
    if (!d) return React.createElement("p", {
      className: "muted"
    }, "Loading\u2026");
    const c = d.config || {};
    const s = d.summary || {};
    const rows = Array.isArray(s.headline) ? s.headline : [];
    const srcLabel = (c.source === 'db' ? 'Real participant sessions' : 'Synthetic (offline demo)') + ' · ' + (c.use_real ? c.model || 'real judge' : 'FakeLLM') + ' · N=' + (s.n_participants ?? '—');
    return React.createElement("div", null, React.createElement("h2", null, "Run ", React.createElement("code", {
      className: "id"
    }, short(id)), " ", React.createElement(Pill, {
      s: d.status
    })), React.createElement("p", {
      className: "muted"
    }, srcLabel, " \xB7 depths ", (c.depths || []).join('/'), " \xB7 ", (c.prompt_structures || []).join('/'), " \xB7 k=", c.n_runs, " \xB7 ", fmt(d.created_at)), d.error && React.createElement("div", {
      className: "note"
    }, d.error), React.createElement("div", {
      className: "note"
    }, "Agreement of the LLM judge with participants' own post-chat ratings. Lower ", React.createElement("b", null, "MAE"), " = closer; ", React.createElement("b", null, "Spearman \u03C1 / QWK / ICC"), " need N\u2265~5 to be meaningful (shown as n/a at tiny N). ", React.createElement("b", null, "Inter-run SD"), " = judge stability across k repeats."), React.createElement("div", {
      className: "panel"
    }, React.createElement("h3", null, "Agreement metrics per outcome \xD7 depth \xD7 structure"), React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Depth"), React.createElement("th", null, "Structure"), React.createElement("th", null, "Outcome"), React.createElement("th", {
      className: "num"
    }, "MAE"), React.createElement("th", {
      className: "num"
    }, "Spearman \u03C1"), React.createElement("th", {
      className: "num"
    }, "QWK"), React.createElement("th", {
      className: "num"
    }, "ICC"), React.createElement("th", {
      className: "num"
    }, "Inter-run SD"), React.createElement("th", {
      className: "num"
    }, "n"))), React.createElement("tbody", null, rows.map((m, i) => React.createElement("tr", {
      key: i
    }, React.createElement("td", null, m.depth), React.createElement("td", null, m.prompt_structure), React.createElement("td", null, m.outcome), React.createElement("td", {
      className: "num"
    }, num(m.mae)), React.createElement("td", {
      className: "num"
    }, num(m.spearman)), React.createElement("td", {
      className: "num"
    }, num(m.qwk)), React.createElement("td", {
      className: "num"
    }, num(m.icc21)), React.createElement("td", {
      className: "num"
    }, num(m.interrun_sd)), React.createElement("td", {
      className: "num"
    }, m.n_sessions ?? '—'))), !rows.length && React.createElement("tr", null, React.createElement("td", {
      colSpan: "9",
      className: "muted"
    }, "No metrics in this run."))))));
  };
  return React.createElement("div", {
    className: "overlay",
    onClick: onClose
  }, React.createElement("div", {
    className: "modal",
    onClick: e => e.stopPropagation()
  }, React.createElement("span", {
    className: "close",
    onClick: onClose
  }, "\xD7"), body()));
}
function RunsView() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState(null);
  const load = useCallback(() => {
    api('/api/results/runs').then(setRows).catch(e => setErr(e.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setInterval(() => {
      if (rows.some(r => r.status === 'queued' || r.status === 'running')) load();
    }, 4000);
    return () => clearInterval(t);
  }, [rows, load]);
  const headline = s => {
    if (!s || !s.headline) return '—';
    const h = s.headline.find(x => x.outcome === 'closeness') || s.headline[0];
    return h ? `${h.outcome} MAE=${num(h.mae)}` : '—';
  };
  if (err) return React.createElement("div", {
    className: "note"
  }, err);
  return React.createElement("div", null, React.createElement("h1", {
    className: "page"
  }, "RQ results \u2014 judge \u2194 human agreement"), React.createElement("p", {
    className: "sub"
  }, "How closely the LLM evaluation pipeline reproduces participants' own ratings, across persona depth and prompt structure."), React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Run"), React.createElement("th", null, "Status"), React.createElement("th", null, "Source"), React.createElement("th", null, "Config"), React.createElement("th", null, "Headline"), React.createElement("th", null, "Created"), React.createElement("th", null))), React.createElement("tbody", null, rows.map(r => React.createElement("tr", {
    key: r.id
  }, React.createElement("td", null, React.createElement("code", {
    className: "id"
  }, short(r.id))), React.createElement("td", null, React.createElement(Pill, {
    s: r.status
  })), React.createElement("td", null, r.config && r.config.source || '—', r.config && r.config.use_real ? ' · real' : ' · fake'), React.createElement("td", {
    className: "muted"
  }, r.config ? `${(r.config.depths || []).join('/')} × ${(r.config.prompt_structures || []).join('/')} × k${r.config.n_runs}` : '—'), React.createElement("td", null, headline(r.summary)), React.createElement("td", {
    className: "muted"
  }, fmt(r.created_at)), React.createElement("td", null, r.status === 'done' ? React.createElement("button", {
    className: "btn",
    onClick: () => setOpen(r.id)
  }, "Open") : React.createElement("span", {
    className: "muted"
  }, r.status)))), !rows.length && React.createElement("tr", null, React.createElement("td", {
    colSpan: "7",
    className: "muted"
  }, "No eval runs yet.")))), open && React.createElement(RunDetail, {
    id: open,
    onClose: () => setOpen(null)
  }));
}
function SimCompare({
  id,
  onClose
}) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    api('/api/results/simulations/' + id).then(setD).catch(e => setErr(e.message));
  }, [id]);
  const body = () => {
    if (err) return React.createElement("p", {
      className: "muted"
    }, err);
    if (!d) return React.createElement("p", {
      className: "muted"
    }, "Loading\u2026");
    const real = d.real_transcript || [];
    const sim = d.sim_transcript || [];
    return React.createElement("div", null, React.createElement("h2", null, d.source_label || '—', " \xB7 ", d.career || '—', " ", React.createElement(Pill, {
      s: d.status
    })), React.createElement("p", {
      className: "muted"
    }, "Simulated Phase-C (", d.config && d.config.turns, " turns, ", d.config && d.config.condition, ") vs the real participant's Phase-C. ", fmt(d.created_at)), d.error && React.createElement("div", {
      className: "note"
    }, d.error), React.createElement("div", {
      className: "note"
    }, "Illustrative only: a silicon participant built from ", d.source_label || 'this participant', "'s profile talking to the same future-self bot. Face validity, not a measured result."), React.createElement("div", {
      className: "grid2"
    }, React.createElement("div", {
      className: "panel"
    }, React.createElement("div", {
      className: "col-head"
    }, "Real participant \u2194 future self"), React.createElement("div", {
      className: "chat"
    }, real.map((m, i) => React.createElement("div", {
      key: i,
      className: 'bub ' + (m.role === 'user' ? 'user' : 'other')
    }, m.text)), !real.length && React.createElement("p", {
      className: "muted"
    }, "No real Phase-C transcript."))), React.createElement("div", {
      className: "panel"
    }, React.createElement("div", {
      className: "col-head"
    }, "Simulated participant \u2194 future self"), React.createElement("div", {
      className: "chat"
    }, sim.map((m, i) => React.createElement("div", {
      key: i,
      className: 'bub ' + (m.role === 'user' ? 'user' : 'other')
    }, m.text)), !sim.length && React.createElement("p", {
      className: "muted"
    }, "No simulated transcript.")))));
  };
  return React.createElement("div", {
    className: "overlay",
    onClick: onClose
  }, React.createElement("div", {
    className: "modal",
    onClick: e => e.stopPropagation()
  }, React.createElement("span", {
    className: "close",
    onClick: onClose
  }, "\xD7"), body()));
}
function SimsView() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState(null);
  const load = useCallback(() => {
    api('/api/results/simulations').then(setRows).catch(e => setErr(e.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setInterval(() => {
      if (rows.some(r => r.status === 'queued' || r.status === 'running')) load();
    }, 4000);
    return () => clearInterval(t);
  }, [rows, load]);
  if (err) return React.createElement("div", {
    className: "note"
  }, err);
  return React.createElement("div", null, React.createElement("h1", {
    className: "page"
  }, "Real vs simulated conversations"), React.createElement("p", {
    className: "sub"
  }, "A \"silicon participant\" built from a real profile chats with the same future-self bot; its transcript sits beside the real one. Launch new ones from the admin dashboard."), React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Run"), React.createElement("th", null, "Status"), React.createElement("th", null, "Participant"), React.createElement("th", null, "Career"), React.createElement("th", null, "Turns"), React.createElement("th", null, "Created"), React.createElement("th", null))), React.createElement("tbody", null, rows.map(r => React.createElement("tr", {
    key: r.id
  }, React.createElement("td", null, React.createElement("code", {
    className: "id"
  }, short(r.id))), React.createElement("td", null, React.createElement(Pill, {
    s: r.status
  })), React.createElement("td", null, r.source_label), React.createElement("td", null, r.career), React.createElement("td", null, r.config && r.config.turns), React.createElement("td", {
    className: "muted"
  }, fmt(r.created_at)), React.createElement("td", null, r.status === 'done' ? React.createElement("button", {
    className: "btn",
    onClick: () => setOpen(r.id)
  }, "Compare") : React.createElement("span", {
    className: "muted"
  }, r.status)))), !rows.length && React.createElement("tr", null, React.createElement("td", {
    colSpan: "7",
    className: "muted"
  }, "No simulations yet \u2014 launch one from the admin dashboard.")))), open && React.createElement(SimCompare, {
    id: open,
    onClose: () => setOpen(null)
  }));
}
function SessionDetail({
  label,
  onClose
}) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    api('/api/results/sessions/' + label).then(setD).catch(e => setErr(e.message));
  }, [label]);
  const body = () => {
    if (err) return React.createElement("p", {
      className: "muted"
    }, err);
    if (!d) return React.createElement("p", {
      className: "muted"
    }, "Loading\u2026");
    const study = d.study || {};
    const tb = study.phaseB && study.phaseB.transcript || [];
    const tc = study.phaseC && study.phaseC.transcript || [];
    const surv = obj => Object.entries(obj || {}).filter(([k]) => k !== 'contact' && k !== 'email');
    const o = d.outcomes || {
      pre: {},
      post: {},
      delta: {}
    };
    return React.createElement("div", null, React.createElement("h2", null, d.label, " ", React.createElement(Pill, {
      s: d.status
    }), " ", React.createElement("span", {
      className: "muted",
      style: {
        fontSize: 14
      }
    }, d.condition)), React.createElement("p", {
      className: "muted"
    }, d.career || '—', " \xB7 completed ", fmt(d.completed_at)), React.createElement("div", {
      className: "grid2",
      style: {
        marginTop: 12
      }
    }, React.createElement("div", {
      className: "panel"
    }, React.createElement("h3", null, "Profile & scores (anonymized)"), React.createElement("div", {
      className: "kv"
    }, React.createElement("b", null, "Participant"), React.createElement("span", null, study.profile && study.profile.name || d.label), React.createElement("b", null, "Career"), React.createElement("span", null, study.phaseB && study.phaseB.career || '—'), React.createElement("b", null, "Big Five"), React.createElement("span", null, study.scores && study.scores.bigFive ? Object.entries(study.scores.bigFive).map(([k, v]) => k + ':' + v).join('  ') : '—'), React.createElement("b", null, "RIASEC"), React.createElement("span", null, study.scores && study.scores.riasec ? Object.entries(study.scores.riasec).map(([k, v]) => k + ':' + v).join('  ') : '—'), React.createElement("b", null, "Values"), React.createElement("span", null, study.scores && study.scores.values ? [].concat(study.scores.values).join(', ') : '—'))), React.createElement("div", {
      className: "panel"
    }, React.createElement("h3", null, "Pre \u2192 post (IBM outcomes)"), React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Outcome"), React.createElement("th", {
      className: "num"
    }, "Pre"), React.createElement("th", {
      className: "num"
    }, "Post"), React.createElement("th", {
      className: "num"
    }, "\u0394"))), React.createElement("tbody", null, [['vividness', 'Vividness'], ['closeness', 'Closeness']].map(([k, lbl]) => React.createElement("tr", {
      key: k
    }, React.createElement("td", null, lbl), React.createElement("td", {
      className: "num"
    }, num(o.pre[k])), React.createElement("td", {
      className: "num"
    }, num(o.post[k])), React.createElement("td", {
      className: "num"
    }, React.createElement(Delta, {
      v: o.delta[k]
    })))), React.createElement("tr", null, React.createElement("td", null, "Manip. checks"), React.createElement("td", {
      className: "num"
    }, "\u2014"), React.createElement("td", {
      className: "num"
    }, num(o.post.manip_checks)), React.createElement("td", {
      className: "num"
    }, "\u2014"))))), React.createElement("div", {
      className: "panel"
    }, React.createElement("h3", null, "Phase B \u2014 career guide"), React.createElement("div", {
      className: "chat"
    }, tb.map((m, i) => React.createElement("div", {
      key: i,
      className: 'bub ' + (m.role === 'user' ? 'user' : 'other')
    }, m.text)), !tb.length && React.createElement("p", {
      className: "muted"
    }, "\u2014"))), React.createElement("div", {
      className: "panel"
    }, React.createElement("h3", null, "Phase C \u2014 future self"), React.createElement("div", {
      className: "chat"
    }, tc.map((m, i) => React.createElement("div", {
      key: i,
      className: 'bub ' + (m.role === 'user' ? 'user' : 'other')
    }, m.text)), !tc.length && React.createElement("p", {
      className: "muted"
    }, "\u2014"))), React.createElement("div", {
      className: "panel",
      style: {
        gridColumn: '1 / -1'
      }
    }, React.createElement("h3", null, "Post-survey answers"), React.createElement("div", {
      className: "kv"
    }, surv(study.postSurvey).map(([k, v]) => [React.createElement("b", {
      key: k + 'k'
    }, k), React.createElement("span", {
      key: k + 'v'
    }, String(v))])))));
  };
  return React.createElement("div", {
    className: "overlay",
    onClick: onClose
  }, React.createElement("div", {
    className: "modal",
    onClick: e => e.stopPropagation()
  }, React.createElement("span", {
    className: "close",
    onClick: onClose
  }, "\xD7"), body()));
}
function SessionsView() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    api('/api/results/sessions').then(setRows).catch(e => setErr(e.message));
  }, []);
  if (err) return React.createElement("div", {
    className: "note"
  }, err);
  return React.createElement("div", null, React.createElement("h1", {
    className: "page"
  }, "Browse sessions \u2014 anonymous"), React.createElement("p", {
    className: "sub"
  }, "Every completed session, names removed (P01, P02\u2026). Full demographics, scores, both transcripts, and pre \u2192 post answers are shown."), React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Participant"), React.createElement("th", null, "Condition"), React.createElement("th", null, "Career"), React.createElement("th", null, "Phase-C turns"), React.createElement("th", null, "Completed"), React.createElement("th", null))), React.createElement("tbody", null, rows.map(r => React.createElement("tr", {
    key: r.label
  }, React.createElement("td", null, React.createElement("b", null, r.label)), React.createElement("td", null, r.condition), React.createElement("td", null, r.career || React.createElement("span", {
    className: "muted"
  }, "\u2014")), React.createElement("td", null, r.phase_c_turns), React.createElement("td", {
    className: "muted"
  }, fmt(r.completed_at)), React.createElement("td", null, React.createElement("button", {
    className: "btn",
    onClick: () => setOpen(r.label)
  }, "Open")))), !rows.length && React.createElement("tr", null, React.createElement("td", {
    colSpan: "6",
    className: "muted"
  }, "No completed sessions yet.")))), open && React.createElement(SessionDetail, {
    label: open,
    onClose: () => setOpen(null)
  }));
}
const RECON = {
  n: 30,
  rows: [{
    o: 'Continuity',
    m1: 4.91,
    m2: 5.06,
    d: 0.14,
    mp: 0.08,
    r: 0.33,
    rlo: -0.04,
    rhi: 0.61,
    sd1: 0.45,
    sd2: 0.22,
    rat: 0.48,
    vp: 0.010
  }, {
    o: 'Vividness',
    m1: 4.93,
    m2: 4.86,
    d: -0.08,
    mp: 0.47,
    r: 0.31,
    rlo: -0.05,
    rhi: 0.61,
    sd1: 0.58,
    sd2: 0.29,
    rat: 0.51,
    vp: 0.0000
  }, {
    o: 'Closeness',
    m1: 4.13,
    m2: 4.20,
    d: 0.07,
    mp: 0.54,
    r: 0.20,
    rlo: -0.17,
    rhi: 0.52,
    sd1: 0.51,
    sd2: 0.41,
    rat: 0.80,
    vp: 0.55
  }, {
    o: 'Manip-checks',
    m1: 6.14,
    m2: 6.12,
    d: -0.02,
    mp: 0.74,
    r: 0.41,
    rlo: 0.06,
    rhi: 0.67,
    sd1: 0.39,
    sd2: 0.22,
    rat: 0.57,
    vp: 0.048
  }]
};
function pval(p) {
  return p < 0.001 ? '<0.001' : p.toFixed(p < 0.1 ? 3 : 2);
}
function ReconView() {
  const SDMAX = 0.65;
  return React.createElement("div", null, React.createElement("h1", {
    className: "page"
  }, "Persona-source ablation"), React.createElement("p", {
    className: "sub"
  }, "A within-silicon robustness check (N=30 paired, model fixed = Sonnet). Each participant ran the full study twice, changing only how the persona was built: ", React.createElement("b", null, "full psychometric profile"), " (Big Five + RIASEC) vs. ", React.createElement("b", null, "baseline questionnaire only"), ". It probes whether simulated outcomes depend on persona construction. This is a methods result \u2014 ", React.createElement("i", null, "not"), " the silicon-vs-human comparison (that needs human data)."), React.createElement("div", {
    className: "note",
    style: {
      borderLeftColor: 'var(--accent)'
    }
  }, React.createElement("b", null, "Headline:"), " stripping the psychometric profile leaves the ", React.createElement("b", null, "means statistically unchanged"), " (paired-t p = 0.08\u20130.74) but ", React.createElement("b", null, "significantly collapses between-person variance"), " on 3 of 4 outcomes (Levene p \u2264 0.05; SD roughly halves). The rich profile mainly buys ", React.createElement("i", null, "spread"), ", not a different average \u2014 the classic \"LLMs flatten variance\" signature, here driven by persona information."), React.createElement("div", {
    className: "panel",
    style: {
      marginTop: 16
    }
  }, React.createElement("h3", null, "Variance by persona source (SD of the outcome across participants)"), React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      marginTop: 12
    }
  }, RECON.rows.map(x => React.createElement("div", {
    key: x.o,
    style: {
      display: 'grid',
      gridTemplateColumns: '120px 1fr 150px',
      alignItems: 'center',
      gap: 12
    }
  }, React.createElement("div", {
    style: {
      fontSize: 13.5
    }
  }, x.o), React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 5
    }
  }, React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: 'var(--muted)',
      width: 60
    }
  }, "full"), React.createElement("div", {
    style: {
      height: 11,
      borderRadius: 999,
      background: 'var(--accent)',
      width: x.sd1 / SDMAX * 100 + '%'
    }
  }), React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11
    }
  }, x.sd1.toFixed(2))), React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: 'var(--muted)',
      width: 60
    }
  }, "quest."), React.createElement("div", {
    style: {
      height: 11,
      borderRadius: 999,
      background: 'var(--muted-2)',
      width: x.sd2 / SDMAX * 100 + '%'
    }
  }), React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11
    }
  }, x.sd2.toFixed(2)))), React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 11.5,
      color: x.vp <= 0.05 ? 'var(--accent-ink)' : 'var(--muted)',
      textAlign: 'right'
    }
  }, "SD \xD7", x.rat.toFixed(2), React.createElement("br", null), "Levene p=", pval(x.vp), x.vp <= 0.05 ? ' *' : '')))), React.createElement("p", {
    className: "muted",
    style: {
      marginTop: 10,
      fontSize: 12
    }
  }, "* = variances significantly differ (p \u2264 0.05). Bars are SD across the 30 participants; shorter = more homogeneous.")), React.createElement("div", {
    className: "panel",
    style: {
      marginTop: 16
    }
  }, React.createElement("h3", null, "Full table"), React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Outcome"), React.createElement("th", {
    className: "num"
  }, "mean (full)"), React.createElement("th", {
    className: "num"
  }, "mean (quest.)"), React.createElement("th", {
    className: "num"
  }, "\u0394"), React.createElement("th", {
    className: "num"
  }, "paired-t p"), React.createElement("th", {
    className: "num"
  }, "r [95% CI]"), React.createElement("th", {
    className: "num"
  }, "SD ratio"), React.createElement("th", {
    className: "num"
  }, "Levene p"))), React.createElement("tbody", null, RECON.rows.map(x => React.createElement("tr", {
    key: x.o
  }, React.createElement("td", null, x.o), React.createElement("td", {
    className: "num"
  }, x.m1.toFixed(2)), React.createElement("td", {
    className: "num"
  }, x.m2.toFixed(2)), React.createElement("td", {
    className: "num"
  }, x.d > 0 ? '+' : '', x.d.toFixed(2)), React.createElement("td", {
    className: "num"
  }, x.mp.toFixed(2)), React.createElement("td", {
    className: "num"
  }, x.r.toFixed(2), " [", x.rlo.toFixed(2), ", ", x.rhi.toFixed(2), "]"), React.createElement("td", {
    className: "num"
  }, x.rat.toFixed(2)), React.createElement("td", {
    className: "num",
    style: {
      color: x.vp <= 0.05 ? 'var(--accent-ink)' : 'inherit'
    }
  }, pval(x.vp)))))), React.createElement("p", {
    className: "muted",
    style: {
      marginTop: 8,
      fontSize: 12.5
    }
  }, "Means equal (high paired-t p) \u2192 mean fidelity to persona source is high. Per-participant r CIs mostly include 0 \u2192 individual correspondence is weak. SD ratio < 1 with small Levene p \u2192 variance flattens when the profile is removed.")), React.createElement("div", {
    className: "note",
    style: {
      marginTop: 16
    }
  }, React.createElement("b", null, "Read honestly:"), " within-silicon only (both arms AI) \u2014 a robustness result mapping to the IV \"persona information source\", and a preview of the variance question; ", React.createElement("i", null, "not"), " the silicon-vs-human finding. N=30, single run per arm (k=1), so the variance gap is not yet separated from run-to-run LLM noise \u2014 a small repeat (k=3) would establish the noise floor."));
}
function Showcase() {
  return React.createElement("div", null, React.createElement("h1", {
    className: "page"
  }, "Silicon-cohort showcase"), React.createElement("p", {
    className: "sub"
  }, "A supervisor-facing walkthrough of the method-validation run (N=20 silicon participants): what it is, why it matters, and the headline charts. Self-contained \u2014 open full screen for the best view."), React.createElement("p", {
    style: {
      margin: '0 0 12px'
    }
  }, React.createElement("a", {
    className: "btn pri",
    href: "/results/showcase",
    target: "_blank",
    rel: "noreferrer"
  }, "Open full screen \u2197")), React.createElement("iframe", {
    src: "/results/showcase",
    title: "Silicon cohort showcase",
    style: {
      width: '100%',
      height: '78vh',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--surface)',
      boxShadow: 'var(--shadow-card)'
    }
  }));
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
  const logout = async () => {
    await fetch('/results/logout', {
      method: 'POST'
    });
    location.href = '/results';
  };
  const TABS = [['overview', 'Overview'], ['rq', 'RQ results'], ['sim', 'Real vs simulated'], ['recon', 'Persona ablation'], ['sessions', 'Browse sessions'], ['showcase', 'Showcase']];
  return React.createElement("div", null, React.createElement("header", null, React.createElement("span", {
    className: "brand"
  }, React.createElement("span", {
    className: "dot"
  }), "Thesis"), React.createElement("span", {
    className: "eyebrow-tag"
  }, "Study results"), React.createElement("div", {
    className: "tabs"
  }, TABS.map(([k, lbl]) => React.createElement("div", {
    key: k,
    className: 'tab' + (tab === k ? ' on' : ''),
    onClick: () => setTab(k)
  }, lbl))), React.createElement("div", {
    className: "spacer"
  }), React.createElement("button", {
    className: "icon-btn",
    onClick: toggleTheme,
    title: "Toggle light / dark"
  }, dark ? '☀' : '☾'), React.createElement("button", {
    className: "btn",
    onClick: logout
  }, "Sign out")), React.createElement("main", null, tab === 'overview' ? React.createElement(Overview, null) : tab === 'rq' ? React.createElement(RunsView, null) : tab === 'sim' ? React.createElement(SimsView, null) : tab === 'recon' ? React.createElement(ReconView, null) : tab === 'showcase' ? React.createElement(Showcase, null) : React.createElement(SessionsView, null)));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
})();
