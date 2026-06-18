/* compiled from screens.jsx — do not edit; run `npm run build` */
(function () {
const {
  useState
} = React;
function Landing({
  onBegin
}) {
  const [showHow, setShowHow] = React.useState(false);
  return React.createElement("div", {
    "data-screen-label": "01 Landing"
  }, React.createElement("nav", {
    className: "topnav"
  }, React.createElement("div", {
    className: "brand"
  }, React.createElement(BrandMark, {
    size: 22
  }), React.createElement("span", null, "Thesis")), React.createElement("div", {
    className: "end"
  }, React.createElement("button", {
    className: "btn ghost sm",
    onClick: () => setShowHow(true)
  }, "How it works"))), React.createElement("section", {
    className: "landing-hero"
  }, React.createElement("span", {
    className: "eyebrow"
  }, React.createElement("span", {
    className: "dot"
  }), "A UvA research prototype \xB7 Career exploration"), React.createElement("h1", {
    className: "hero-title"
  }, "Talk to ", React.createElement("em", null, "you"), ",", React.createElement("br", null), "ten years into a career."), React.createElement("p", {
    className: "hero-sub"
  }, "Thesis lets university students step into a vivid role-play with a version of themselves a decade from now \u2014 already working in a career they're curious about. Not to be told what to do, but to feel what that future might actually be like."), React.createElement("div", {
    className: "hero-ctas"
  }, React.createElement("button", {
    className: "btn lg accent",
    onClick: onBegin
  }, "Begin", React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    fill: "none",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M3 7h8M7 3l4 4-4 4",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), React.createElement("button", {
    className: "btn ghost lg",
    onClick: () => setShowHow(true)
  }, "How it works")), React.createElement("p", {
    className: "hero-time"
  }, "A short questionnaire (~10 min) \xB7 choosing a career to step into (~2\u20133 min) \xB7 the conversation itself (20\u201330 min, you decide) \u2014 about 40 minutes in all.", React.createElement("br", null), "Breaks are built in between parts, and you can pause or close the page at any point \u2014 ", React.createElement("strong", null, "your progress is saved and you can continue where you left off."))), showHow && React.createElement("div", {
    className: "how-overlay",
    onClick: () => setShowHow(false),
    role: "dialog",
    "aria-label": "How a session works"
  }, React.createElement("div", {
    className: "how-modal",
    onClick: e => e.stopPropagation()
  }, React.createElement("button", {
    className: "how-close",
    onClick: () => setShowHow(false),
    "aria-label": "Close"
  }, "\xD7"), React.createElement("h2", null, "How a session works"), React.createElement("p", {
    className: "lede"
  }, "Three short steps, then a conversation. Before the chat, you'll answer some questions about yourself and how you see your future."), React.createElement("div", {
    className: "steps"
  }, React.createElement("div", {
    className: "step"
  }, React.createElement("span", {
    className: "num"
  }, "STEP 01 \xB7 ~10 MIN"), React.createElement("h3", null, "A short profile"), React.createElement("p", null, "A few questions about your interests, what you want from work, and where you are in your studies. This grounds the future self in who you actually are.")), React.createElement("div", {
    className: "step"
  }, React.createElement("span", {
    className: "num"
  }, "STEP 02 \xB7 ~2\u20133 MIN"), React.createElement("h3", null, "Choose a future"), React.createElement("p", null, "We surface a handful of careers worth exploring. You pick the one you're most curious to step into \u2014 and you can switch later.")), React.createElement("div", {
    className: "step"
  }, React.createElement("span", {
    className: "num"
  }, "STEP 03 \xB7 20\u201330 MIN"), React.createElement("h3", null, "Have the conversation"), React.createElement("p", null, "Talk with yourself, ten years on, working in that career. The future self will speak in scenes, not summaries \u2014 and it won't tell you what to do."))), React.createElement("p", {
    className: "how-about"
  }, "This is a research prototype from a BSc Business Analytics thesis at the University of Amsterdam, grounded in Identity-Based Motivation (Oyserman) and Future Self-Continuity (Hershfield). You move at your own pace: there are rest points between parts, a break reminder during long conversations, and your progress is saved as you go. And once the study questions are done, the session opens up \u2014 keep talking with your future self, or step into entirely different careers, as many as you like."), React.createElement("button", {
    className: "btn accent",
    onClick: () => {
      setShowHow(false);
      onBegin();
    }
  }, "Begin", React.createElement("svg", {
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
    className: "fineprint"
  }, React.createElement("div", {
    className: "left"
  }, React.createElement(BrandMark, {
    size: 14
  }), React.createElement("span", null, "Thesis \xB7 BSc Business Analytics prototype \xB7 UvA 2026"))));
}
const SWATCHES = ['#b5552f', '#5d6b4d', '#3c5e85', '#7a3d68', '#2f2f2d', '#a07a2c'];
function AvatarCreation({
  value,
  onChange
}) {
  const {
    name = '',
    color
  } = value;
  const initials = (name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '—').toUpperCase();
  const set = patch => onChange({
    ...value,
    ...patch
  });
  return React.createElement("div", {
    className: "avatar-screen fade-in",
    "data-screen-label": "02 Avatar"
  }, React.createElement("div", {
    className: "avatar-canvas"
  }, React.createElement(Monogram, {
    initials: initials,
    color: color,
    size: 200
  }), React.createElement("div", {
    className: "cap"
  }, "Your future self \xB7 10 years on")), React.createElement("div", {
    className: "avatar-controls"
  }, React.createElement("div", {
    className: "q-eyebrow"
  }, "STEP 01 OF 03 \xB7 SET UP"), React.createElement("h2", {
    className: "section-title"
  }, "Give your future self a name."), React.createElement("p", {
    className: "section-sub"
  }, "This is simply you, a decade older. The name is just a label and a color so the conversation has a face \u2014 the real persona is built from your answers next."), React.createElement("div", {
    className: "field-block"
  }, React.createElement("label", {
    className: "field-label"
  }, "Your name (or what you'd prefer to go by)"), React.createElement("input", {
    className: "text-input",
    placeholder: "e.g. Maya, Sam, Alex\u2026",
    value: name,
    onChange: e => set({
      name: e.target.value
    })
  })), React.createElement("div", {
    className: "field-block"
  }, React.createElement("label", {
    className: "field-label"
  }, "Color"), React.createElement("div", {
    className: "swatch-row"
  }, SWATCHES.map(c => React.createElement("button", {
    key: c,
    className: `swatch ${c === color ? 'active' : ''}`,
    style: {
      background: c
    },
    "aria-label": `Color ${c}`,
    onClick: () => set({
      color: c
    })
  }))))));
}
const CAREER_SUGGESTIONS = ['Management consultant', 'Data analyst', 'Product manager', 'Entrepreneur / founder', 'Policy economist', 'UX researcher', 'Investment analyst', 'Sustainability lead'];
const QUESTIONS = [{
  id: 'year',
  eyebrow: 'CONTEXT',
  prompt: 'Where are you in your studies?',
  hint: 'Open to university students of any major, any year, at any university.',
  kind: 'choices',
  options: [{
    id: 'y1',
    ttl: 'First year',
    desc: 'Undergraduate'
  }, {
    id: 'y2',
    ttl: 'Second year',
    desc: 'Undergraduate'
  }, {
    id: 'other',
    ttl: 'Something else',
    desc: 'Another year or programme'
  }]
}, {
  id: 'interests',
  eyebrow: 'INTERESTS',
  prompt: 'What parts of your studies or life genuinely pull you in?',
  hint: 'The topics, problems, or moments where you lose track of time.',
  kind: 'textarea',
  placeholder: 'A few honest lines is plenty.',
  example: React.createElement(React.Fragment, null, React.createElement("b", null, "Try:"), " \"I like untangling messy data into something a non-expert can act on \u2014 and I get oddly into group projects where I end up organising everyone.\"")
}, {
  id: 'values',
  eyebrow: 'WHAT YOU WANT FROM WORK',
  prompt: 'What matters most to you in work?',
  hint: 'Impact, stability, autonomy, creativity, money, people — in your own words.',
  kind: 'textarea',
  placeholder: 'What would make a job feel worth it to you?'
}, {
  id: 'avoid',
  eyebrow: 'WHAT YOU WANT TO AVOID',
  prompt: 'What would you want to avoid in a job?',
  hint: 'Naming what you are moving away from matters as much as what you move toward.',
  kind: 'textarea',
  placeholder: 'The kind of work, environment, or rhythm that would wear you down.'
}, {
  id: 'career',
  eyebrow: 'CHOOSE A FUTURE',
  prompt: 'Which career do you want to step into?',
  hint: 'Pick one you\'re curious to experience as your future self. You can explore others later.',
  kind: 'career'
}];
function Questionnaire({
  answers,
  onChange,
  currentIndex
}) {
  const q = QUESTIONS[currentIndex];
  const value = answers[q.id] || '';
  const set = v => onChange({
    ...answers,
    [q.id]: v
  });
  return React.createElement("div", {
    className: "q-screen fade-in",
    "data-screen-label": `03 Question ${currentIndex + 1}`
  }, React.createElement("div", {
    className: "q-eyebrow"
  }, q.eyebrow, " \xB7 ", currentIndex + 1, " OF ", QUESTIONS.length), React.createElement("h2", {
    className: "q-prompt"
  }, q.prompt), React.createElement("p", {
    className: "q-hint"
  }, q.hint), q.kind === 'choices' && React.createElement("div", {
    className: "q-choices"
  }, q.options.map(opt => React.createElement("button", {
    key: opt.id,
    className: `q-choice ${value === opt.id ? 'active' : ''}`,
    onClick: () => set(opt.id)
  }, React.createElement("div", {
    className: "ttl"
  }, opt.ttl), React.createElement("div", {
    className: "desc"
  }, opt.desc)))), q.kind === 'textarea' && React.createElement("textarea", {
    className: "text-input",
    placeholder: q.placeholder || 'Take your time…',
    value: value,
    onChange: e => set(e.target.value),
    rows: 4
  }), q.kind === 'career' && React.createElement("div", null, React.createElement("div", {
    className: "career-grid"
  }, CAREER_SUGGESTIONS.map(c => React.createElement("button", {
    key: c,
    className: `career-chip ${value === c ? 'active' : ''}`,
    onClick: () => set(c)
  }, c))), React.createElement("div", {
    className: "career-or"
  }, "Or name your own:"), React.createElement("input", {
    className: "text-input",
    placeholder: "e.g. Central bank economist, startup CFO\u2026",
    value: CAREER_SUGGESTIONS.includes(value) ? '' : value,
    onChange: e => set(e.target.value)
  })), q.example && React.createElement("div", {
    className: "q-example"
  }, q.example));
}
function Consent({
  onAgree,
  onBack
}) {
  const [checked, setChecked] = React.useState(false);
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
  }, React.createElement("button", {
    className: "btn ghost sm",
    onClick: onBack
  }, "Exit"))), React.createElement("div", {
    className: "flow-body"
  }, React.createElement("div", {
    className: "sv-wrap"
  }, React.createElement("div", {
    className: "eyebrow"
  }, React.createElement("span", {
    className: "dot"
  }), "Before we begin"), React.createElement("h2", {
    className: "consent-title"
  }, "Informed consent"), React.createElement("div", {
    className: "consent-body"
  }, React.createElement("p", null, "This is a research prototype from a BSc Business Analytics thesis at the University of Amsterdam. You'll fill in a short questionnaire, have a guided conversation to choose a career, then talk with an AI role-playing your future self in that career. Afterwards you'll answer a few reflection questions. The whole session takes about 40\u201350 minutes, is completed unsupervised on your own device, and your responses are stored on a secure cloud server."), React.createElement("ul", null, React.createElement("li", null, "Participation is ", React.createElement("strong", null, "voluntary"), "; you may stop at any time without giving a reason."), React.createElement("li", null, "Your questionnaire answers and the conversation are processed to run the study and may be analysed in anonymised form."), React.createElement("li", null, "The AI is a ", React.createElement("strong", null, "role-play"), " \u2014 one imagined version of a possible future, not a prediction or professional advice. The decision about your future stays yours."), React.createElement("li", null, "No special-category personal data is required. Please don't share anything you'd prefer to keep private.")), React.createElement("p", null, "For questions, contact the research team via the thesis supervisor at the UvA.")), React.createElement("label", {
    className: "consent-check"
  }, React.createElement("input", {
    type: "checkbox",
    checked: checked,
    onChange: e => setChecked(e.target.checked)
  }), React.createElement("span", null, "I have read and understood the above, I am 18 or older, and I agree to take part.")))), React.createElement("div", {
    className: "flow-foot"
  }, React.createElement("button", {
    className: "btn ghost",
    onClick: onBack
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
  }, "Consent"), React.createElement("button", {
    className: "btn accent",
    disabled: !checked && !(typeof window !== 'undefined' && window.THESIS_PREVIEW),
    onClick: onAgree
  }, "I agree \u2014 continue", React.createElement("svg", {
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
  })))));
}
function Pause({
  title,
  lines = [],
  cta = 'Continue',
  eyebrow = 'Take a breath',
  onContinue,
  onBack
}) {
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
  }), eyebrow), React.createElement("h2", {
    className: "consent-title"
  }, title), lines.map((t, i) => React.createElement("p", {
    key: i,
    className: "sv-intro",
    style: {
      maxWidth: '48ch',
      margin: '0 auto 14px',
      color: i ? 'var(--muted)' : undefined
    }
  }, t)), React.createElement("div", {
    className: "pause-actions"
  }, React.createElement("button", {
    className: "btn accent",
    onClick: onContinue
  }, cta, React.createElement("svg", {
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
  }))), onBack && React.createElement("button", {
    className: "btn ghost sm pause-back",
    onClick: onBack
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
  })), "Back")))));
}
const COMFORT_KEY = 'thesis_comfort_v4';
const COMFORT_DEFAULTS = {
  size: 'md',
  spacing: 'cozy',
  width: 'normal',
  motion: 'full',
  font: 'sans'
};
function ComfortSettings({
  tweaks,
  setTweak
}) {
  const [open, setOpen] = React.useState(false);
  const [c, setC] = React.useState(() => {
    try {
      return {
        ...COMFORT_DEFAULTS,
        ...JSON.parse(localStorage.getItem(COMFORT_KEY) || '{}')
      };
    } catch (e) {
      return {
        ...COMFORT_DEFAULTS
      };
    }
  });
  React.useEffect(() => {
    const h = document.documentElement;
    h.dataset.size = c.size;
    h.dataset.spacing = c.spacing;
    h.dataset.width = c.width;
    h.dataset.motion = c.motion;
    h.dataset.font = c.font;
    try {
      localStorage.setItem(COMFORT_KEY, JSON.stringify(c));
    } catch (e) {}
  }, [c]);
  const set = (k, v) => setC(prev => ({
    ...prev,
    [k]: v
  }));
  const Seg = ({
    label,
    k,
    opts
  }) => React.createElement("div", {
    className: "comfort-row"
  }, React.createElement("div", {
    className: "lbl"
  }, label), React.createElement("div", {
    className: "comfort-seg"
  }, opts.map(o => {
    const active = k === 'theme' ? tweaks.theme === o.v : c[k] === o.v;
    return React.createElement("button", {
      key: o.v,
      className: active ? 'on' : '',
      onClick: () => k === 'theme' ? setTweak('theme', o.v) : set(k, o.v)
    }, o.l);
  })));
  return React.createElement(React.Fragment, null, React.createElement("button", {
    className: "comfort-fab",
    "aria-label": "Comfort and display settings",
    title: "Comfort & display",
    onClick: () => setOpen(o => !o)
  }, "Aa"), open && React.createElement("div", {
    className: "comfort-panel",
    role: "dialog",
    "aria-label": "Comfort settings"
  }, React.createElement("h4", null, "Comfort & display ", React.createElement("button", {
    className: "comfort-close",
    onClick: () => setOpen(false),
    "aria-label": "Close"
  }, "\u2715")), React.createElement(Seg, {
    label: "Text size",
    k: "size",
    opts: [{
      v: 'sm',
      l: 'A'
    }, {
      v: 'md',
      l: 'A+'
    }, {
      v: 'lg',
      l: 'A++'
    }, {
      v: 'xl',
      l: 'A+++'
    }]
  }), React.createElement(Seg, {
    label: "Theme",
    k: "theme",
    opts: [{
      v: 'light',
      l: 'Light'
    }, {
      v: 'dark',
      l: 'Dark'
    }]
  }), React.createElement(Seg, {
    label: "Reading font",
    k: "font",
    opts: [{
      v: 'serif',
      l: 'Serif'
    }, {
      v: 'sans',
      l: 'Sans'
    }]
  }), React.createElement(Seg, {
    label: "Line spacing",
    k: "spacing",
    opts: [{
      v: 'cozy',
      l: 'Cozy'
    }, {
      v: 'roomy',
      l: 'Roomy'
    }]
  }), React.createElement(Seg, {
    label: "Reading width",
    k: "width",
    opts: [{
      v: 'narrow',
      l: 'Narrow'
    }, {
      v: 'normal',
      l: 'Default'
    }, {
      v: 'wide',
      l: 'Wide'
    }]
  }), React.createElement(Seg, {
    label: "Motion",
    k: "motion",
    opts: [{
      v: 'full',
      l: 'Full'
    }, {
      v: 'reduced',
      l: 'Reduced'
    }]
  })));
}
const INTENDED_COMBOS = {
  shared: [['direct', 'main']],
  kangzhi: [['direct', 'main'], ['direct', 'baseline']],
  andrea: [['reflective', 'main'], ['direct', 'main']]
};
function isIntended(study, rec, cond) {
  return (INTENDED_COMBOS[study] || []).some(([r, c]) => r === rec && c === cond);
}
function Launcher({
  condition,
  rec,
  study,
  pid,
  onStart
}) {
  const nav = patch => {
    const q = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => q.set(k, v));
    q.set('test', '1');
    window.location.search = q.toString();
  };
  const Seg = ({
    label,
    cur,
    k,
    opts
  }) => React.createElement("div", {
    className: "comfort-row"
  }, React.createElement("div", {
    className: "lbl"
  }, label), React.createElement("div", {
    className: "comfort-seg"
  }, opts.map(o => React.createElement("button", {
    key: o,
    className: cur === o ? 'on' : '',
    onClick: () => nav({
      [k]: o
    })
  }, o))));
  return React.createElement("div", {
    className: "flow"
  }, React.createElement("nav", {
    className: "topnav"
  }, React.createElement("div", {
    className: "brand"
  }, React.createElement(BrandMark, {
    size: 22
  }), React.createElement("span", null, "Thesis")), React.createElement("div", {
    className: "sv-eyebrow"
  }, "Researcher launcher \xB7 test mode"), React.createElement("div", {
    className: "end"
  })), React.createElement("div", {
    className: "flow-body"
  }, React.createElement("div", {
    className: "sv-wrap"
  }, React.createElement("div", {
    className: "eyebrow"
  }, React.createElement("span", {
    className: "dot"
  }), "Test mode (?test=1) \u2014 never shown to participants"), React.createElement("h2", {
    className: "consent-title"
  }, "Launch a test run"), React.createElement("p", {
    className: "sv-intro"
  }, "Pick the two routing axes, then start. Real participants open a fixed personal link and skip this entirely."), React.createElement(Seg, {
    label: "Rec \u2014 stage B prompt",
    cur: rec,
    k: "rec",
    opts: ['reflective', 'direct', 'guide']
  }), React.createElement(Seg, {
    label: "Cond \u2014 stage C prompt",
    cur: condition,
    k: "cond",
    opts: ['main', 'baseline']
  }), React.createElement(Seg, {
    label: "Study tag",
    cur: study,
    k: "study",
    opts: ['shared', 'kangzhi', 'andrea']
  }), React.createElement("p", {
    className: "sv-hint",
    style: {
      marginTop: 6
    }
  }, "Current: study=", React.createElement("b", null, study), " \xB7 rec=", React.createElement("b", null, rec), " \xB7 cond=", React.createElement("b", null, condition), pid ? React.createElement(React.Fragment, null, " \xB7 pid=", React.createElement("b", null, pid)) : null, isIntended(study, rec, condition) ? null : React.createElement("span", {
    className: "muted"
  }, " \xB7 \u26A0 non-standard combo")), React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 14,
      flexWrap: 'wrap'
    }
  }, React.createElement("button", {
    className: "btn accent",
    onClick: onStart
  }, "Start as participant \u2192"), React.createElement("a", {
    className: "btn ghost",
    href: "/admin",
    target: "_blank",
    rel: "noreferrer"
  }, "Open dashboard \u2197")))));
}
Object.assign(window, {
  Landing,
  AvatarCreation,
  Questionnaire,
  QUESTIONS,
  SWATCHES,
  Consent,
  Pause,
  ComfortSettings,
  Launcher
});
})();
