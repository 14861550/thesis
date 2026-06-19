/* compiled from admin/admin.jsx — do not edit; run `npm run build` */
(function () {
const {
  useState,
  useEffect,
  useCallback
} = React;
async function api(path, opts = {}) {
  const r = await fetch(path, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...opts
  });
  if (r.status === 401) {
    location.href = '/admin';
    throw new Error('unauthorized');
  }
  if (r.status === 503) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || 'unavailable');
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error((d.error || 'HTTP ' + r.status) + (d.detail ? ' — ' + d.detail : '') + (d.hint ? ' · Fix: ' + d.hint : ''));
  }
  return r.json();
}
const short = id => (id || '').slice(0, 8);
const fmt = t => t ? new Date(t).toLocaleString() : '—';
const Pill = ({
  s
}) => React.createElement("span", {
  className: 'pill s-' + s
}, s);
const SourceBadge = ({
  pid,
  showPid
}) => pid ? React.createElement("span", {
  className: "pill src-real",
  title: 'Real participant — recruited via generated link (' + pid + ')'
}, showPid ? 'Real · ' + pid : 'Real') : React.createElement("span", {
  className: "pill src-test",
  title: "No participant link \u2014 ad-hoc / test session"
}, "test");
const CSV_MEAN = (o, ids) => {
  const v = ids.map(i => Number(o && o[i])).filter(x => !Number.isNaN(x));
  return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '';
};
function studiesToCsv(studies) {
  const cols = ['session_id', 'pid', 'study', 'rec', 'cond', 'status', 'created_at', 'completed_at', 'career', 'location', 'familiarity', 'interest_strength', 'c_duration_sec', 'c_turns', 'c_ended_by', 'free_turns', 'ios_pre', 'ios_post', 'fscs_pre_mean', 'fscs_post_mean', 'viv_pre_mean', 'viv_post_mean', 'cip_anxiety_pre_mean', 'cip_confidence_pre_mean', 'cip_anxiety_post_mean', 'cip_confidence_post_mean', 'mc_style', 'mc_scene', 'mc_understand'];
  const esc = x => {
    const s = x == null ? '' : String(x);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = studies.map(s => {
    const meta = s.meta || {},
      pb = s.phaseB || {},
      pc = s.phaseC || {},
      fc = s.freeContinuation || {};
    const pre = s.preSurvey || {},
      post = s.postSurvey || {};
    return [meta.sessionId, meta.pid, meta.study, meta.rec, meta.condition, meta.status, meta.createdAt, meta.completedAt, pb.career, pb.location, pb.familiarity, pb.interestStrength, pc.durationSec, pc.turnCount, pc.endedBy, fc.turnCount, pre.ios_pre, post.ios_post, CSV_MEAN(pre, ['fscs_similar', 'fscs_connected']), CSV_MEAN(post, ['fscs_similar_post', 'fscs_connected_post']), CSV_MEAN(pre, ['viv_clear', 'viv_tangible', 'viv_detail', 'viv_felt']), CSV_MEAN(post, ['viv_clear_post', 'viv_tangible_post', 'viv_detail_post', 'viv_felt_post']), CSV_MEAN(pre, ['cip_ca_1', 'cip_ca_2', 'cip_ca_3']), CSV_MEAN(pre, ['cip_cf_1', 'cip_cf_2', 'cip_cf_3']), CSV_MEAN(post, ['cip_ca_1_post', 'cip_ca_2_post', 'cip_ca_3_post']), CSV_MEAN(post, ['cip_cf_1_post', 'cip_cf_2_post', 'cip_cf_3_post']), post.mc_style, post.mc_scene, post.mc_understand].map(esc).join(',');
  });
  return cols.join(',') + '\n' + rows.join('\n') + '\n';
}
async function downloadCsv() {
  const studies = await api('/api/admin/sessions/export');
  const blob = new Blob([studiesToCsv(studies)], {
    type: 'text/csv'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'runs.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
function resumeUrl(r) {
  const q = new URLSearchParams({
    session: r.id,
    resume: '1'
  });
  if (r.condition) q.set('cond', r.condition);
  if (r.rec) q.set('rec', r.rec);
  if (r.study) q.set('study', r.study);
  if (r.pid) q.set('pid', r.pid);
  return location.origin + '/?' + q.toString();
}
function recruitUrl(r) {
  const q = new URLSearchParams({
    session: r.id
  });
  if (r.condition) q.set('cond', r.condition);
  if (r.rec) q.set('rec', r.rec);
  if (r.study) q.set('study', r.study);
  if (r.pid) q.set('pid', r.pid);
  return location.origin + '/?' + q.toString();
}
function SessionDetail({
  id,
  onClose
}) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    api('/api/admin/sessions/' + id).then(setD).catch(e => setErr(e.message));
  }, [id]);
  if (err) return React.createElement("div", {
    className: "overlay",
    onClick: onClose
  }, React.createElement("div", {
    className: "modal",
    onClick: e => e.stopPropagation()
  }, React.createElement("span", {
    className: "close",
    onClick: onClose
  }, "\xD7"), React.createElement("p", {
    className: "muted"
  }, err)));
  if (!d) return React.createElement("div", {
    className: "overlay",
    onClick: onClose
  }, React.createElement("div", {
    className: "modal"
  }, React.createElement("p", {
    className: "muted"
  }, "Loading\u2026")));
  const study = d.study || {};
  const tb = study.phaseB && study.phaseB.transcript || [];
  const tc = study.phaseC && study.phaseC.transcript || [];
  const fc = study.freeContinuation && study.freeContinuation.transcript || [];
  const surv = obj => Object.entries(obj || {}).filter(([k]) => k !== 'contact');
  const pb = study.phaseB || {},
    pc = study.phaseC || {},
    meta = study.meta || {};
  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(study, null, 2)], {
      type: 'application/json'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = id + '.json';
    a.click();
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
  }, "\xD7"), React.createElement("h2", null, "Session ", React.createElement("code", {
    className: "id"
  }, short(id)), " ", React.createElement(Pill, {
    s: d.status
  }), " ", React.createElement(SourceBadge, {
    pid: meta.pid,
    showPid: true
  })), React.createElement("p", {
    className: "muted",
    style: {
      margin: '2px 0 10px'
    }
  }, "Created ", fmt(d.created_at), " \xB7 Completed ", fmt(d.completed_at)), meta.pid ? React.createElement("div", {
    className: "note real"
  }, React.createElement("b", null, "Real participant data"), " \u2014 recruited via a generated link. Version: study=", React.createElement("b", null, meta.study || '—'), " \xB7 rec=", React.createElement("b", null, meta.rec || '—'), " \xB7 cond=", React.createElement("b", null, d.condition || '—'), " \xB7 link #", React.createElement("b", null, meta.pid)) : React.createElement("div", {
    className: "note"
  }, React.createElement("b", null, "Ad-hoc / test session"), " \u2014 no participant link (PID). Version: study=", React.createElement("b", null, meta.study || '—'), " \xB7 rec=", React.createElement("b", null, meta.rec || '—'), " \xB7 cond=", React.createElement("b", null, d.condition || '—')), React.createElement("div", {
    className: "muted",
    style: {
      fontSize: 12,
      margin: '0 0 4px'
    }
  }, "Participant recruit link (start fresh through consent):"), React.createElement("div", {
    className: "link-box",
    style: {
      marginBottom: 8
    }
  }, recruitUrl({
    id,
    condition: d.condition,
    rec: meta.rec,
    study: meta.study,
    pid: meta.pid
  })), React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 16
    }
  }, React.createElement("button", {
    className: "btn pri",
    onClick: () => navigator.clipboard.writeText(recruitUrl({
      id,
      condition: d.condition,
      rec: meta.rec,
      study: meta.study,
      pid: meta.pid
    }))
  }, "Copy recruit link"), React.createElement("a", {
    className: "btn",
    href: resumeUrl({
      id,
      condition: d.condition,
      rec: meta.rec,
      study: meta.study,
      pid: meta.pid
    }),
    target: "_blank",
    rel: "noreferrer"
  }, "Resume session \u2197"), React.createElement("button", {
    className: "btn",
    onClick: () => navigator.clipboard.writeText(resumeUrl({
      id,
      condition: d.condition,
      rec: meta.rec,
      study: meta.study,
      pid: meta.pid
    }))
  }, "Copy resume link"), React.createElement("button", {
    className: "btn",
    onClick: downloadJson
  }, "Download JSON")), React.createElement("div", {
    className: "grid2"
  }, React.createElement("div", {
    className: "panel"
  }, React.createElement("h3", null, "Profile, choice & scores"), React.createElement("div", {
    className: "kv"
  }, React.createElement("b", null, "Name"), React.createElement("span", null, study.profile && study.profile.name || '—'), React.createElement("b", null, "Career"), React.createElement("span", null, pb.career || '—'), React.createElement("b", null, "Location"), React.createElement("span", null, pb.location || '—'), React.createElement("b", null, "Familiarity / interest"), React.createElement("span", null, (pb.familiarity != null ? pb.familiarity : '—') + ' / ' + (pb.interestStrength != null ? pb.interestStrength : '—')), React.createElement("b", null, "C duration"), React.createElement("span", null, pc.durationSec != null ? Math.round(pc.durationSec / 60) + ' min · ' + (pc.turnCount || 0) + ' turns · ended by ' + (pc.endedBy || '—') : '—'), React.createElement("b", null, "Big Five"), React.createElement("span", null, study.scores && study.scores.bigFive ? Object.entries(study.scores.bigFive).map(([k, v]) => k + ' ' + v).join(' · ') : '—'), React.createElement("b", null, "RIASEC"), React.createElement("span", null, study.scores && study.scores.riasec ? Object.entries(study.scores.riasec).map(([k, v]) => k + ' ' + v).join(' · ') : '—'), React.createElement("b", null, "Values"), React.createElement("span", null, study.scores && study.scores.values ? [].concat(study.scores.values).join(', ') : '—'))), React.createElement("div", {
    className: "panel"
  }, React.createElement("h3", null, "Pre-survey (", surv(study.preSurvey).length, " items)"), React.createElement("div", {
    className: "kv kv-scroll"
  }, surv(study.preSurvey).map(([k, v]) => [React.createElement("b", {
    key: k + 'k'
  }, k), React.createElement("span", {
    key: k + 'v'
  }, String(v))]))), React.createElement("div", {
    className: "panel"
  }, React.createElement("h3", null, "Phase B \u2014 recommendation chat (", tb.length, " turns)"), React.createElement("div", {
    className: "chat"
  }, tb.map((m, i) => React.createElement("div", {
    key: i,
    className: 'bub ' + (m.role === 'user' ? 'user' : 'other')
  }, m.text)), !tb.length && React.createElement("p", {
    className: "muted"
  }, "No transcript."))), React.createElement("div", {
    className: "panel"
  }, React.createElement("h3", null, "Phase C \u2014 future self (", tc.length, " turns)"), React.createElement("div", {
    className: "chat"
  }, tc.map((m, i) => React.createElement("div", {
    key: i,
    className: 'bub ' + (m.role === 'user' ? 'user' : 'other')
  }, m.text)), !tc.length && React.createElement("p", {
    className: "muted"
  }, "No transcript."))), React.createElement("div", {
    className: "panel"
  }, React.createElement("h3", null, "Post-survey (", surv(study.postSurvey).length, " items)"), React.createElement("div", {
    className: "kv kv-scroll"
  }, surv(study.postSurvey).map(([k, v]) => [React.createElement("b", {
    key: k + 'k'
  }, k), React.createElement("span", {
    key: k + 'v'
  }, String(v))]))), React.createElement("div", {
    className: "panel"
  }, React.createElement("h3", null, "Free continuation (", fc.length, " turns)"), React.createElement("div", {
    className: "chat"
  }, fc.map((m, i) => React.createElement("div", {
    key: i,
    className: 'bub ' + (m.role === 'user' ? 'user' : 'other')
  }, m.text)), !fc.length && React.createElement("p", {
    className: "muted"
  }, "None.")))), React.createElement("details", {
    className: "raw"
  }, React.createElement("summary", null, "Raw JSON"), React.createElement("pre", {
    className: "json",
    style: {
      maxHeight: 420
    }
  }, JSON.stringify(study, null, 2)))));
}
function NewSession({
  onClose,
  onCreated
}) {
  const [condition, setCondition] = useState('');
  const [rec, setRec] = useState('direct');
  const [study, setStudy] = useState('kangzhi');
  const [pid, setPid] = useState('');
  const [link, setLink] = useState(null);
  const create = async () => {
    const d = await api('/api/admin/sessions', {
      method: 'POST',
      body: JSON.stringify({
        condition: condition || undefined,
        rec,
        study: study || undefined,
        pid: pid || undefined
      })
    });
    setLink({
      link: location.origin + d.link,
      condition: d.condition,
      rec: d.rec,
      study: d.study,
      id: d.id
    });
    onCreated && onCreated();
  };
  return React.createElement("div", {
    className: "overlay",
    onClick: onClose
  }, React.createElement("div", {
    className: "modal",
    style: {
      width: 520
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("span", {
    className: "close",
    onClick: onClose
  }, "\xD7"), React.createElement("h2", null, "New participant session"), !link ? React.createElement("div", null, React.createElement("p", {
    className: "muted"
  }, "Leave condition blank for balanced auto-assignment. Rec = stage-B prompt (reflective = default; direct = Andrea's second arm; guide = backup)."), React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 8
    }
  }, React.createElement("label", null, "Cond\xA0", React.createElement("select", {
    value: condition,
    onChange: e => setCondition(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "Balanced (auto)"), React.createElement("option", {
    value: "main"
  }, "main"), React.createElement("option", {
    value: "baseline"
  }, "baseline"))), React.createElement("label", null, "Rec\xA0", React.createElement("select", {
    value: rec,
    onChange: e => setRec(e.target.value)
  }, React.createElement("option", {
    value: "reflective"
  }, "reflective"), React.createElement("option", {
    value: "direct"
  }, "direct"), React.createElement("option", {
    value: "guide"
  }, "guide")))), React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 10
    }
  }, React.createElement("label", null, "Study\xA0", React.createElement("input", {
    type: "text",
    value: study,
    onChange: e => setStudy(e.target.value),
    style: {
      width: 110
    }
  })), React.createElement("label", null, "PID\xA0", React.createElement("input", {
    type: "text",
    value: pid,
    onChange: e => setPid(e.target.value),
    placeholder: "K017",
    style: {
      width: 90
    }
  })), React.createElement("button", {
    className: "btn pri",
    onClick: create
  }, "Create & get link"))) : React.createElement("div", null, React.createElement("p", null, link.study, " \xB7 rec ", React.createElement("b", null, link.rec), " \xB7 cond ", React.createElement("b", null, link.condition), " \xB7 id ", React.createElement("code", {
    className: "id"
  }, short(link.id))), React.createElement("div", {
    className: "link-box"
  }, link.link), React.createElement("button", {
    className: "btn",
    style: {
      marginTop: 10
    },
    onClick: () => navigator.clipboard.writeText(link.link)
  }, "Copy link"), React.createElement("p", {
    className: "muted",
    style: {
      marginTop: 10,
      fontSize: 12
    }
  }, "Saved to the shared sessions list \u2014 any teammate can find this row and copy the same link (Sessions \u2192 ", React.createElement("b", null, "Copy link"), ", or open it for the full recruit link)."))));
}
function SessionsView() {
  const [rows, setRows] = useState([]);
  const [condition, setCondition] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState(null);
  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (condition) q.set('condition', condition);
    if (status) q.set('status', status);
    api('/api/admin/sessions?' + q.toString()).then(setRows).catch(e => setErr(e.message));
  }, [condition, status]);
  useEffect(() => {
    load();
  }, [load]);
  const del = async id => {
    if (!confirm('Delete session ' + short(id) + '?')) return;
    await api('/api/admin/sessions/' + id, {
      method: 'DELETE'
    });
    load();
  };
  if (err) return React.createElement("div", {
    className: "note"
  }, err);
  return React.createElement("div", null, React.createElement("div", {
    className: "toolbar"
  }, React.createElement("select", {
    value: condition,
    onChange: e => setCondition(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "All conditions"), React.createElement("option", {
    value: "main"
  }, "main"), React.createElement("option", {
    value: "baseline"
  }, "baseline")), React.createElement("select", {
    value: status,
    onChange: e => setStatus(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "All statuses"), React.createElement("option", {
    value: "started"
  }, "started"), React.createElement("option", {
    value: "in_progress"
  }, "in_progress"), React.createElement("option", {
    value: "completed"
  }, "completed"), React.createElement("option", {
    value: "abandoned"
  }, "abandoned")), React.createElement("button", {
    className: "btn",
    onClick: load
  }, "Refresh"), React.createElement("div", {
    className: "spacer"
  }), React.createElement("button", {
    className: "btn pri",
    onClick: () => setCreating(true)
  }, "+ New session"), React.createElement("button", {
    className: "btn",
    onClick: () => downloadCsv().catch(e => setErr(e.message))
  }, "Export CSV (tidy)"), React.createElement("button", {
    className: "btn",
    onClick: () => {
      location.href = '/api/admin/sessions/export';
    }
  }, "Export all (JSON)"), React.createElement("button", {
    className: "btn",
    onClick: () => {
      location.href = '/api/admin/sessions/export?deidentify=1';
    }
  }, "Export de-identified")), React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "ID"), React.createElement("th", null, "Source"), React.createElement("th", null, "PID"), React.createElement("th", null, "Study"), React.createElement("th", null, "Rec"), React.createElement("th", null, "Cond"), React.createElement("th", null, "Status"), React.createElement("th", null, "Career"), React.createElement("th", null, "C-turns"), React.createElement("th", null, "Created"), React.createElement("th", null, "Completed"), React.createElement("th", null))), React.createElement("tbody", null, rows.map(r => React.createElement("tr", {
    key: r.id
  }, React.createElement("td", null, React.createElement("code", {
    className: "id"
  }, short(r.id))), React.createElement("td", null, React.createElement(SourceBadge, {
    pid: r.pid
  })), React.createElement("td", {
    className: "muted"
  }, r.pid || '—'), React.createElement("td", {
    className: "muted"
  }, r.study || '—'), React.createElement("td", null, r.rec || '—'), React.createElement("td", null, r.condition), React.createElement("td", null, React.createElement(Pill, {
    s: r.status
  })), React.createElement("td", null, r.career || React.createElement("span", {
    className: "muted"
  }, "\u2014")), React.createElement("td", null, r.phase_c_turns), React.createElement("td", {
    className: "muted"
  }, fmt(r.created_at)), React.createElement("td", {
    className: "muted"
  }, fmt(r.completed_at)), React.createElement("td", {
    className: "row"
  }, React.createElement("button", {
    className: "btn",
    onClick: () => setOpen(r.id)
  }, "Open"), React.createElement("button", {
    className: "btn",
    onClick: () => navigator.clipboard.writeText(recruitUrl(r)),
    title: "Copy the participant recruit link (start fresh through consent). Saved on the shared row, so anyone on the team can copy it."
  }, "Copy link"), React.createElement("a", {
    className: "btn",
    href: resumeUrl(r),
    target: "_blank",
    rel: "noreferrer",
    title: "Continue this run where it stopped (works on any device; the future self keeps its memory)"
  }, "Resume \u2197"), React.createElement("button", {
    className: "btn danger",
    onClick: () => del(r.id)
  }, "Delete")))), !rows.length && React.createElement("tr", null, React.createElement("td", {
    colSpan: "12",
    className: "muted"
  }, "No sessions yet.")))), open && React.createElement(SessionDetail, {
    id: open,
    onClose: () => setOpen(null)
  }), creating && React.createElement(NewSession, {
    onClose: () => setCreating(false),
    onCreated: load
  }));
}
const DEPTHS = ['D0', 'D1', 'D2', 'D3'];
const STRUCTS = ['structured', 'narrative', 'interview'];
function EvalView() {
  const [runs, setRuns] = useState([]);
  const [source, setSource] = useState('synthetic');
  const [depths, setDepths] = useState(['D0', 'D2', 'D3']);
  const [structs, setStructs] = useState(['structured']);
  const [nRuns, setNRuns] = useState(5);
  const [useReal, setUseReal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const load = useCallback(() => {
    api('/api/admin/eval-runs').then(setRuns).catch(e => setErr(e.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setInterval(() => {
      if (runs.some(r => r.status === 'queued' || r.status === 'running')) load();
    }, 3000);
    return () => clearInterval(t);
  }, [runs, load]);
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  const launch = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api('/api/admin/eval-runs', {
        method: 'POST',
        body: JSON.stringify({
          source,
          depths,
          prompt_structures: structs,
          n_runs: Number(nRuns),
          use_real: useReal
        })
      });
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const headline = s => {
    if (!s || !s.headline) return '—';
    const h = s.headline.find(x => x.depth === 'D2' && x.outcome === 'continuity') || s.headline[0];
    return h ? `${h.depth}/${h.outcome} ρ=${h.spearman == null ? 'n/a' : Number(h.spearman).toFixed(2)}` : '—';
  };
  return React.createElement("div", null, React.createElement("div", {
    className: "note"
  }, React.createElement("b", null, "Data source"), " \u2014 ", React.createElement("i", null, "Synthetic"), ": offline, deterministic, shows the agreement gradient (demo / methodology).", React.createElement("i", null, " DB sessions"), ": evaluates your stored sessions (use ", React.createElement("b", null, "Real LLM"), " for meaningful numbers; Fake on real sessions is a smoke test)."), React.createElement("div", {
    className: "panel",
    style: {
      marginBottom: 16
    }
  }, React.createElement("h3", null, "Launch a run"), React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 8
    }
  }, React.createElement("label", null, "Source\xA0", React.createElement("select", {
    value: source,
    onChange: e => setSource(e.target.value)
  }, React.createElement("option", {
    value: "synthetic"
  }, "Synthetic (offline demo)"), React.createElement("option", {
    value: "db"
  }, "DB sessions (completed)"))), React.createElement("label", null, "k (runs/participant) ", React.createElement("input", {
    type: "number",
    min: "1",
    max: "20",
    value: nRuns,
    onChange: e => setNRuns(e.target.value),
    style: {
      width: 64
    }
  })), React.createElement("label", {
    className: "ck"
  }, React.createElement("input", {
    type: "checkbox",
    checked: useReal,
    onChange: e => setUseReal(e.target.checked)
  }), " Real LLM (needs ANTHROPIC_API_KEY)")), React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 8
    }
  }, React.createElement("span", {
    className: "muted"
  }, "Depths:"), DEPTHS.map(d => React.createElement("label", {
    key: d,
    className: "ck"
  }, React.createElement("input", {
    type: "checkbox",
    checked: depths.includes(d),
    onChange: () => toggle(depths, setDepths, d)
  }), " ", d))), React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 10
    }
  }, React.createElement("span", {
    className: "muted"
  }, "Structures:"), STRUCTS.map(s => React.createElement("label", {
    key: s,
    className: "ck"
  }, React.createElement("input", {
    type: "checkbox",
    checked: structs.includes(s),
    onChange: () => toggle(structs, setStructs, s)
  }), " ", s))), React.createElement("button", {
    className: "btn pri",
    disabled: busy || !depths.length || !structs.length,
    onClick: launch
  }, busy ? 'Launching…' : 'Launch run'), err && React.createElement("span", {
    className: "err-inline"
  }, err)), React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Run"), React.createElement("th", null, "Status"), React.createElement("th", null, "Source"), React.createElement("th", null, "Config"), React.createElement("th", null, "Headline"), React.createElement("th", null, "Created"), React.createElement("th", null))), React.createElement("tbody", null, runs.map(r => React.createElement("tr", {
    key: r.id
  }, React.createElement("td", null, React.createElement("code", {
    className: "id"
  }, short(r.id))), React.createElement("td", null, React.createElement(Pill, {
    s: r.status
  })), React.createElement("td", null, r.config && r.config.source, r.config && r.config.use_real ? ' · real' : ' · fake'), React.createElement("td", {
    className: "muted"
  }, r.config ? `${(r.config.depths || []).join('/')} × ${(r.config.prompt_structures || []).join('/')} × k${r.config.n_runs}` : '—'), React.createElement("td", null, headline(r.summary)), React.createElement("td", {
    className: "muted"
  }, fmt(r.created_at)), React.createElement("td", null, r.status === 'done' ? React.createElement("a", {
    className: "btn",
    href: '/api/admin/eval-runs/' + r.id + '/report',
    target: "_blank",
    rel: "noreferrer"
  }, "Report \u2197") : r.status === 'failed' ? React.createElement("span", {
    className: "muted",
    title: r.error
  }, "failed") : React.createElement("span", {
    className: "muted"
  }, "\u2026")))), !runs.length && React.createElement("tr", null, React.createElement("td", {
    colSpan: "7",
    className: "muted"
  }, "No runs yet.")))));
}
function SimDetail({
  id,
  onClose
}) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    api('/api/admin/simulations/' + id).then(setD).catch(e => setErr(e.message));
  }, [id]);
  const body = () => {
    if (err) return React.createElement("p", {
      className: "muted"
    }, err);
    if (!d) return React.createElement("p", {
      className: "muted"
    }, "Loading\u2026");
    const tr = Array.isArray(d.transcript) ? d.transcript : [];
    const p = d.persona || {};
    return React.createElement("div", null, React.createElement("h2", null, "Simulation ", React.createElement("code", {
      className: "id"
    }, short(id)), " ", React.createElement(Pill, {
      s: d.status
    }), " ", React.createElement("span", {
      className: "pill src-synth",
      title: "Synthetic silicon-persona run \u2014 not a real participant"
    }, "Synthetic")), React.createElement("div", {
      className: "note synth"
    }, React.createElement("b", null, "Synthetic data"), " \u2014 silicon-persona simulation, not real user data."), React.createElement("p", {
      className: "muted"
    }, "Career: ", p.career || '—', " \xB7 condition ", d.config && d.config.condition, " \xB7 turns ", d.config && d.config.turns, " \xB7 ", fmt(d.created_at)), d.error && React.createElement("div", {
      className: "note"
    }, d.error), React.createElement("div", {
      className: "panel",
      style: {
        marginTop: 12
      }
    }, React.createElement("h3", null, "Simulated Phase-C transcript (silicon participant \u2194 future-self bot)"), React.createElement("div", {
      className: "chat",
      style: {
        maxHeight: 460
      }
    }, tr.map((m, i) => React.createElement("div", {
      key: i,
      className: 'bub ' + (m.role === 'user' ? 'user' : 'other')
    }, m.text)), !tr.length && React.createElement("p", {
      className: "muted"
    }, "No transcript yet."))));
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
function SimView() {
  const [rows, setRows] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [src, setSrc] = useState('');
  const [turns, setTurns] = useState(5);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState(null);
  const load = useCallback(() => {
    api('/api/admin/simulations').then(setRows).catch(e => setErr(e.message));
  }, []);
  useEffect(() => {
    load();
    api('/api/admin/sessions?status=completed').then(setSessions).catch(() => {});
  }, [load]);
  useEffect(() => {
    const t = setInterval(() => {
      if (rows.some(r => r.status === 'queued' || r.status === 'running')) load();
    }, 3000);
    return () => clearInterval(t);
  }, [rows, load]);
  const launch = async () => {
    if (!src) {
      setErr('Pick a completed session.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api('/api/admin/simulations', {
        method: 'POST',
        body: JSON.stringify({
          source_session_id: src,
          turns: Number(turns)
        })
      });
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return React.createElement("div", null, React.createElement("div", {
    className: "note"
  }, "A ", React.createElement("b", null, "silicon participant"), " built from a completed session's profile chats with the same future-self bot the humans used. The simulated transcript is shown beside the real one on the read-only ", React.createElement("a", {
    href: "/results",
    target: "_blank",
    rel: "noreferrer"
  }, "/results"), " page. Each run \u2248 2\xD7turns Sonnet calls."), React.createElement("div", {
    className: "panel",
    style: {
      marginBottom: 16
    }
  }, React.createElement("h3", null, "Launch a simulation"), React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 8
    }
  }, React.createElement("label", null, "Source session\xA0", React.createElement("select", {
    value: src,
    onChange: e => setSrc(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "\u2014 pick a completed session \u2014"), sessions.map(s => React.createElement("option", {
    key: s.id,
    value: s.id
  }, (s.career || '—') + ' · ' + short(s.id) + ' · ' + s.condition)))), React.createElement("label", null, "turns ", React.createElement("input", {
    type: "number",
    min: "1",
    max: "12",
    value: turns,
    onChange: e => setTurns(e.target.value),
    style: {
      width: 64
    }
  })), React.createElement("button", {
    className: "btn pri",
    disabled: busy || !src,
    onClick: launch
  }, busy ? 'Launching…' : 'Launch simulation'), err && React.createElement("span", {
    className: "err-inline"
  }, err))), React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Run"), React.createElement("th", null, "Status"), React.createElement("th", null, "Career"), React.createElement("th", null, "Source"), React.createElement("th", null, "Turns"), React.createElement("th", null, "Created"), React.createElement("th", null))), React.createElement("tbody", null, rows.map(r => React.createElement("tr", {
    key: r.id
  }, React.createElement("td", null, React.createElement("code", {
    className: "id"
  }, short(r.id))), React.createElement("td", null, React.createElement(Pill, {
    s: r.status
  })), React.createElement("td", null, r.career || React.createElement("span", {
    className: "muted"
  }, "\u2014")), React.createElement("td", null, React.createElement("code", {
    className: "id"
  }, r.source_session_id ? short(r.source_session_id) : '—')), React.createElement("td", null, r.config && r.config.turns), React.createElement("td", {
    className: "muted"
  }, fmt(r.created_at)), React.createElement("td", null, r.status === 'done' ? React.createElement("button", {
    className: "btn",
    onClick: () => setOpen(r.id)
  }, "View") : r.status === 'failed' ? React.createElement("span", {
    className: "muted",
    title: r.error
  }, "failed") : React.createElement("span", {
    className: "muted"
  }, "\u2026")))), !rows.length && React.createElement("tr", null, React.createElement("td", {
    colSpan: "7",
    className: "muted"
  }, "No simulations yet.")))), open && React.createElement(SimDetail, {
    id: open,
    onClose: () => setOpen(null)
  }));
}
const LAUNCH_CELLS = [{
  key: 'shared',
  label: 'Shared · direct × main (Kangzhi main + Andrea direct)',
  study: 'shared',
  rec: 'direct',
  cond: 'main',
  prefix: 'S'
}, {
  key: 'k-base',
  label: 'Kangzhi · direct × baseline',
  study: 'kangzhi',
  rec: 'direct',
  cond: 'baseline',
  prefix: 'K'
}, {
  key: 'a-refl',
  label: 'Andrea · reflective × main',
  study: 'andrea',
  rec: 'reflective',
  cond: 'main',
  prefix: 'A'
}, {
  key: 'custom',
  label: 'Custom combination',
  custom: true,
  prefix: 'X'
}];
function RecruitView() {
  const [cellKey, setCellKey] = useState('shared');
  const [custom, setCustom] = useState({
    study: 'kangzhi',
    rec: 'direct',
    cond: 'main'
  });
  const [count, setCount] = useState(5);
  const [prefix, setPrefix] = useState('S');
  const [start, setStart] = useState(1);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [err, setErr] = useState(null);
  const [notice, setNotice] = useState(null);
  const cell = LAUNCH_CELLS.find(c => c.key === cellKey);
  const axes = cell.custom ? custom : cell;
  const nextStartFor = (rws, pfx) => {
    const p = (pfx || '').trim().toUpperCase();
    if (!p) return 1;
    const nums = rws.filter(r => r.pid && r.pid.toUpperCase().startsWith(p)).map(r => parseInt(r.pid.slice(p.length), 10)).filter(n => !Number.isNaN(n));
    return nums.length ? Math.max(...nums) + 1 : 1;
  };
  const load = () => api('/api/admin/sessions').then(rws => {
    setRows(rws);
    setStart(nextStartFor(rws, prefix));
    setLoading(false);
  }).catch(e => {
    setErr(e.message);
    setLoading(false);
  });
  useEffect(() => {
    load();
  }, []);
  const pick = c => {
    setCellKey(c.key);
    setPrefix(c.prefix);
    setStart(nextStartFor(rows, c.prefix));
    setCopied(null);
  };
  const previewUrl = () => {
    const q = new URLSearchParams({
      cond: axes.cond,
      rec: axes.rec,
      study: axes.study,
      preview: '1'
    });
    return location.origin + '/?' + q.toString();
  };
  const generate = async () => {
    setBusy(true);
    setErr(null);
    setCopied(null);
    setNotice(null);
    try {
      const n = Math.max(1, Math.min(50, Number(count) || 1));
      const existing = new Set(rows.filter(r => r.pid).map(r => r.pid.toUpperCase()));
      let made = 0,
        skipped = 0;
      for (let i = 0; i < n; i++) {
        const pid = prefix.trim() ? prefix.trim().toUpperCase() + String(Number(start) + i).padStart(3, '0') : undefined;
        if (pid && existing.has(pid)) {
          skipped++;
          continue;
        }
        await api('/api/admin/sessions', {
          method: 'POST',
          body: JSON.stringify({
            condition: axes.cond,
            rec: axes.rec,
            study: axes.study,
            pid
          })
        });
        if (pid) existing.add(pid);
        made++;
      }
      await load();
      if (skipped) setNotice(`Generated ${made}; skipped ${skipped} whose PID already existed (no duplicates created).`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const delOne = async l => {
    const msg = l.used ? `Delete ${l.pid}? A participant has ALREADY STARTED this one — its session data will be permanently removed. Continue?` : `Delete unused link ${l.pid}?`;
    if (!confirm(msg)) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      await api('/api/admin/sessions/' + l.id, {
        method: 'DELETE'
      });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const delUnused = async g => {
    const unused = g.links.filter(l => !l.used);
    if (!unused.length) return;
    if (!confirm(`Delete ${unused.length} unused link${unused.length > 1 ? 's' : ''} in "${g.label}"? Links a participant has already started are kept.`)) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      for (const l of unused) await api('/api/admin/sessions/' + l.id, {
        method: 'DELETE'
      });
      await load();
      setNotice(`Deleted ${unused.length} unused link${unused.length > 1 ? 's' : ''}.`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const isUsed = r => r.status !== 'started' || Boolean(r.career) || (r.phase_c_turns || 0) > 0;
  const groupMap = {};
  for (const r of rows) {
    if (!r.pid) continue;
    const label = `${r.study || '—'} · ${r.rec || '—'} × ${r.condition || '—'}`;
    (groupMap[label] = groupMap[label] || []).push({
      id: r.id,
      pid: r.pid,
      link: recruitUrl(r),
      created: r.created_at || '',
      used: isUsed(r)
    });
  }
  const groups = Object.entries(groupMap).map(([label, links]) => {
    links.sort((a, b) => String(a.pid).localeCompare(String(b.pid), undefined, {
      numeric: true
    }));
    const latest = links.reduce((m, l) => l.created > m ? l.created : m, '');
    const unusedCount = links.filter(l => !l.used).length;
    return {
      label,
      links,
      latest,
      unusedCount
    };
  }).sort((a, b) => a.latest < b.latest ? 1 : -1);
  const copyGroup = (label, links) => {
    navigator.clipboard.writeText(links.map(l => l.pid + '\t' + l.link).join('\n'));
    setCopied(label);
  };
  return React.createElement("div", null, React.createElement("div", {
    className: "note"
  }, React.createElement("b", null, "Recruit participants"), " \u2014 pick the chatbot version (study cell), mint as many personal links as you need, and send ", React.createElement("b", null, "one link to one participant"), ". Each link locks its condition and carries a sequential participant ID; the session row appears under Sessions the moment they consent.", React.createElement("b", null, " Every generated link is saved on the server, so the whole team sees the same list below"), " \u2014 and the next PID number is taken from everyone's links, so two of you can recruit at once without clashing."), React.createElement("div", {
    className: "panel",
    style: {
      marginBottom: 16
    }
  }, React.createElement("h3", null, "1 \xB7 Chatbot version"), React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 10
    }
  }, LAUNCH_CELLS.map(c => React.createElement("button", {
    key: c.key,
    className: 'btn' + (cellKey === c.key ? ' pri' : ''),
    onClick: () => pick(c)
  }, c.label))), cell.custom && React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 4
    }
  }, React.createElement("label", null, "Study\xA0", React.createElement("input", {
    type: "text",
    value: custom.study,
    onChange: e => setCustom({
      ...custom,
      study: e.target.value
    }),
    style: {
      width: 100
    }
  })), React.createElement("label", null, "Rec\xA0", React.createElement("select", {
    value: custom.rec,
    onChange: e => setCustom({
      ...custom,
      rec: e.target.value
    })
  }, React.createElement("option", {
    value: "reflective"
  }, "reflective"), React.createElement("option", {
    value: "direct"
  }, "direct"), React.createElement("option", {
    value: "guide"
  }, "guide"))), React.createElement("label", null, "Cond\xA0", React.createElement("select", {
    value: custom.cond,
    onChange: e => setCustom({
      ...custom,
      cond: e.target.value
    })
  }, React.createElement("option", {
    value: "main"
  }, "main"), React.createElement("option", {
    value: "baseline"
  }, "baseline")))), React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 4
    }
  }, React.createElement("a", {
    className: "btn",
    href: previewUrl(),
    target: "_blank",
    rel: "noreferrer",
    title: "Open this combination as a test drive: nothing is saved, and every step can be skipped without filling anything in."
  }, "Test drive this version \u2197 ", React.createElement("span", {
    className: "muted"
  }, "(no data saved)"))), React.createElement("h3", {
    style: {
      marginTop: 14
    }
  }, "2 \xB7 How many participants"), React.createElement("div", {
    className: "row"
  }, React.createElement("label", null, "Links ", React.createElement("input", {
    type: "number",
    min: "1",
    max: "50",
    value: count,
    onChange: e => setCount(e.target.value),
    style: {
      width: 64
    }
  })), React.createElement("label", null, "PID prefix ", React.createElement("input", {
    type: "text",
    value: prefix,
    onChange: e => setPrefix(e.target.value),
    style: {
      width: 56
    }
  })), React.createElement("label", null, "from # ", React.createElement("input", {
    type: "number",
    min: "1",
    value: start,
    onChange: e => setStart(e.target.value),
    style: {
      width: 72
    }
  })), React.createElement("button", {
    className: "btn pri",
    disabled: busy,
    onClick: generate
  }, busy ? 'Generating…' : 'Generate links'), React.createElement("button", {
    className: "btn",
    disabled: loading || busy,
    onClick: load,
    title: "Re-pull the shared list"
  }, "\u21BB Refresh"), err && React.createElement("span", {
    className: "err-inline"
  }, err), notice && React.createElement("span", {
    className: "muted",
    style: {
      marginLeft: 10,
      fontSize: 13
    }
  }, notice))), loading ? React.createElement("p", {
    className: "muted"
  }, "Loading the team's generated links\u2026") : !groups.length ? React.createElement("p", {
    className: "muted"
  }, "No participant links generated yet.") : groups.map(g => React.createElement("div", {
    className: "panel",
    style: {
      marginBottom: 14
    },
    key: g.label
  }, React.createElement("h3", null, g.links.length, " link", g.links.length > 1 ? 's' : '', " \xB7 ", g.label, g.latest ? ' · latest ' + fmt(g.latest) : '', g.unusedCount ? React.createElement("span", {
    className: "muted",
    style: {
      textTransform: 'none',
      letterSpacing: 0
    }
  }, " \xB7 ", g.unusedCount, " unused") : null), React.createElement("div", {
    className: "row",
    style: {
      marginBottom: 10
    }
  }, React.createElement("button", {
    className: "btn",
    onClick: () => copyGroup(g.label, g.links)
  }, copied === g.label ? 'Copied ✓' : 'Copy all (PID + link)'), g.unusedCount ? React.createElement("button", {
    className: "btn danger",
    disabled: busy,
    onClick: () => delUnused(g),
    title: "Delete every link in this group that no participant has started yet"
  }, "Delete ", g.unusedCount, " unused") : null), React.createElement("div", {
    className: "kv kv-scroll",
    style: {
      gridTemplateColumns: 'max-content 1fr max-content',
      maxHeight: 320
    }
  }, g.links.map(l => [React.createElement("b", {
    key: l.pid + 'k',
    title: l.used ? 'A participant has started this link' : 'Unused — no participant yet'
  }, l.pid, l.used ? React.createElement("span", {
    className: "muted",
    style: {
      fontWeight: 400
    }
  }, " \xB7\xA0in\xA0use") : ''), React.createElement("span", {
    key: l.pid + 'v'
  }, React.createElement("a", {
    href: l.link,
    target: "_blank",
    rel: "noreferrer"
  }, l.link)), React.createElement("button", {
    key: l.pid + 'd',
    className: "link-del",
    disabled: busy,
    onClick: () => delOne(l),
    title: l.used ? 'Delete this link (it has participant data)' : 'Delete this unused link'
  }, "\xD7")])))));
}
function DescriptivesView() {
  const [studies, setStudies] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    api('/api/admin/sessions/export').then(setStudies).catch(e => setErr(e.message));
  }, []);
  if (err) return React.createElement("div", {
    className: "note"
  }, err);
  if (!studies) return React.createElement("p", {
    className: "muted"
  }, "Loading\u2026");
  const m = xs => {
    const v = xs.map(Number).filter(x => !Number.isNaN(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const f2 = x => x == null ? '—' : x.toFixed(2);
  const d2 = (a, b) => a == null || b == null ? '—' : (b - a >= 0 ? '+' : '') + (b - a).toFixed(2);
  const perPerson = (objs, ids) => objs.map(o => m(ids.map(id => o[id]))).filter(x => x != null);
  const groups = {};
  for (const s of studies) {
    const c = s.meta && s.meta.condition || 'main';
    (groups[c] = groups[c] || []).push(s);
  }
  const stat = list => {
    const pre = list.map(s => s.preSurvey || {}),
      post = list.map(s => s.postSurvey || {});
    return {
      n: list.length,
      completed: list.filter(s => s.meta && s.meta.completedAt).length,
      iosPre: m(pre.map(o => o.ios_pre)),
      iosPost: m(post.map(o => o.ios_post)),
      fPre: m(perPerson(pre, ['fscs_similar', 'fscs_connected'])),
      fPost: m(perPerson(post, ['fscs_similar_post', 'fscs_connected_post'])),
      vPre: m(perPerson(pre, ['viv_clear', 'viv_tangible', 'viv_detail', 'viv_felt'])),
      vPost: m(perPerson(post, ['viv_clear_post', 'viv_tangible_post', 'viv_detail_post', 'viv_felt_post'])),
      caPre: m(perPerson(pre, ['cip_ca_1', 'cip_ca_2', 'cip_ca_3'])),
      caPost: m(perPerson(post, ['cip_ca_1_post', 'cip_ca_2_post', 'cip_ca_3_post'])),
      cfPre: m(perPerson(pre, ['cip_cf_1', 'cip_cf_2', 'cip_cf_3'])),
      cfPost: m(perPerson(post, ['cip_cf_1_post', 'cip_cf_2_post', 'cip_cf_3_post']))
    };
  };
  const conds = Object.keys(groups).sort();
  return React.createElement("div", null, React.createElement("div", {
    className: "note"
  }, "Live per-condition descriptives (Build Plan \xA714). Means over stored responses; \u0394 = post \u2212 pre. The two CIP-Short distal outcomes are ", React.createElement("b", null, "forward-scored"), " (/6): commitment anxiety (higher = more career indecision) and confidence (career decision self-efficacy; higher = more confident). Descriptive only \u2014 t-test / ANCOVA / Cronbach's \u03B1 are phase 2 (run ", React.createElement("b", null, "analysis.py"), " on the exported data)."), React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Condition"), React.createElement("th", null, "N"), React.createElement("th", null, "Completed"), React.createElement("th", null, "IOS pre \u2192 post (\u0394) /7"), React.createElement("th", null, "FSCS pre \u2192 post (\u0394) /7"), React.createElement("th", null, "Vividness pre \u2192 post (\u0394) /7"), React.createElement("th", null, "CIP anxiety pre \u2192 post (\u0394) /6"), React.createElement("th", null, "CIP confidence pre \u2192 post (\u0394) /6"))), React.createElement("tbody", null, conds.map(c => {
    const s = stat(groups[c]);
    return React.createElement("tr", {
      key: c
    }, React.createElement("td", null, React.createElement("b", null, c)), React.createElement("td", null, s.n), React.createElement("td", null, s.completed), React.createElement("td", null, f2(s.iosPre), " \u2192 ", f2(s.iosPost), " ", React.createElement("span", {
      className: "muted"
    }, "(", d2(s.iosPre, s.iosPost), ")")), React.createElement("td", null, f2(s.fPre), " \u2192 ", f2(s.fPost), " ", React.createElement("span", {
      className: "muted"
    }, "(", d2(s.fPre, s.fPost), ")")), React.createElement("td", null, f2(s.vPre), " \u2192 ", f2(s.vPost), " ", React.createElement("span", {
      className: "muted"
    }, "(", d2(s.vPre, s.vPost), ")")), React.createElement("td", null, f2(s.caPre), " \u2192 ", f2(s.caPost), " ", React.createElement("span", {
      className: "muted"
    }, "(", d2(s.caPre, s.caPost), ")")), React.createElement("td", null, f2(s.cfPre), " \u2192 ", f2(s.cfPost), " ", React.createElement("span", {
      className: "muted"
    }, "(", d2(s.cfPre, s.cfPost), ")")));
  }), !conds.length && React.createElement("tr", null, React.createElement("td", {
    colSpan: "8",
    className: "muted"
  }, "No sessions yet.")))));
}
function DbHealthBanner() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    fetch('/healthz').then(r => r.json()).then(setHealth).catch(() => {});
  }, []);
  if (!health || health.db) return null;
  const d = health.db_detail || {};
  return React.createElement("div", {
    className: "note",
    style: {
      margin: '18px 24px 0',
      maxWidth: 1132,
      marginLeft: 'auto',
      marginRight: 'auto',
      borderColor: 'var(--accent)',
      background: 'var(--accent-soft)',
      color: 'var(--accent-ink)'
    }
  }, React.createElement("b", null, "Database not connected"), " \u2014 every list / export below will fail until this is fixed.", React.createElement("br", null), "Probe: ", React.createElement("code", null, d.reason || 'unknown'), d.host ? React.createElement(React.Fragment, null, " \xB7 target host ", React.createElement("code", null, d.host)) : null, d.hint ? React.createElement(React.Fragment, null, React.createElement("br", null), React.createElement("b", null, "Fix:"), " ", d.hint) : null);
}
function App() {
  const [tab, setTab] = useState('recruit');
  const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('admin-theme', next);
    setDark(!dark);
  };
  const logout = async () => {
    await fetch('/admin/logout', {
      method: 'POST'
    });
    location.href = '/admin';
  };
  return React.createElement("div", null, React.createElement("header", null, React.createElement("span", {
    className: "brand"
  }, React.createElement("span", {
    className: "dot"
  }), "Thesis"), React.createElement("span", {
    className: "eyebrow-tag"
  }, "Study admin"), React.createElement("div", {
    className: "tabs"
  }, React.createElement("div", {
    className: 'tab' + (tab === 'recruit' ? ' on' : ''),
    onClick: () => setTab('recruit')
  }, "Recruit"), React.createElement("div", {
    className: 'tab' + (tab === 'sessions' ? ' on' : ''),
    onClick: () => setTab('sessions')
  }, "Sessions"), React.createElement("div", {
    className: 'tab' + (tab === 'desc' ? ' on' : ''),
    onClick: () => setTab('desc')
  }, "Descriptives"), React.createElement("div", {
    className: 'tab' + (tab === 'eval' ? ' on' : ''),
    onClick: () => setTab('eval')
  }, "Eval runs"), React.createElement("div", {
    className: 'tab' + (tab === 'sim' ? ' on' : ''),
    onClick: () => setTab('sim')
  }, "Simulations")), React.createElement("div", {
    className: "spacer"
  }), React.createElement("a", {
    className: "btn",
    href: "/results",
    target: "_blank",
    rel: "noreferrer"
  }, "Results \u2197"), React.createElement("a", {
    className: "btn",
    href: "/",
    target: "_blank",
    rel: "noreferrer"
  }, "Participant app \u2197"), React.createElement("button", {
    className: "icon-btn",
    onClick: toggleTheme,
    title: "Toggle light / dark"
  }, dark ? '☀' : '☾'), React.createElement("button", {
    className: "btn",
    onClick: logout
  }, "Sign out")), React.createElement(DbHealthBanner, null), React.createElement("main", null, tab === 'recruit' ? React.createElement(RecruitView, null) : tab === 'sessions' ? React.createElement(SessionsView, null) : tab === 'desc' ? React.createElement(DescriptivesView, null) : tab === 'eval' ? React.createElement(EvalView, null) : React.createElement(SimView, null)));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
})();
