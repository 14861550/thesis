/* compiled from survey.jsx — do not edit; run `npm run build` */
(function () {
const TIPI_INSTRUCTION = 'Here are a number of personality traits that may or may not apply to you. Please indicate the extent to which you agree or disagree with that statement. You should rate the extent to which the pair of traits applies to you, even if one characteristic applies more strongly than the other.';
const TIPI = [{
  id: 'tipi_1',
  text: 'Extraverted, enthusiastic.',
  trait: 'E',
  reverse: false
}, {
  id: 'tipi_2',
  text: 'Critical, quarrelsome.',
  trait: 'A',
  reverse: true
}, {
  id: 'tipi_3',
  text: 'Dependable, self-disciplined.',
  trait: 'C',
  reverse: false
}, {
  id: 'tipi_4',
  text: 'Anxious, easily upset.',
  trait: 'ES',
  reverse: true
}, {
  id: 'tipi_5',
  text: 'Open to new experiences, complex.',
  trait: 'O',
  reverse: false
}, {
  id: 'tipi_6',
  text: 'Reserved, quiet.',
  trait: 'E',
  reverse: true
}, {
  id: 'tipi_7',
  text: 'Sympathetic, warm.',
  trait: 'A',
  reverse: false
}, {
  id: 'tipi_8',
  text: 'Disorganized, careless.',
  trait: 'C',
  reverse: true
}, {
  id: 'tipi_9',
  text: 'Calm, emotionally stable.',
  trait: 'ES',
  reverse: false
}, {
  id: 'tipi_10',
  text: 'Conventional, uncreative.',
  trait: 'O',
  reverse: true
}];
const TIPI_SCALE = {
  points: 7,
  left: 'Disagree strongly',
  right: 'Agree strongly',
  anchors: ['1 = Disagree strongly', '2 = Disagree moderately', '3 = Disagree a little', '4 = Neither agree nor disagree', '5 = Agree a little', '6 = Agree moderately', '7 = Agree strongly']
};
const WORK_VALUE_ITEMS = [{
  id: 'val_achievement',
  name: 'Achievement',
  text: 'Achievement — using your abilities and seeing the results of your effort; a sense of accomplishment'
}, {
  id: 'val_independence',
  name: 'Independence',
  text: 'Independence — working on your own and making your own decisions'
}, {
  id: 'val_recognition',
  name: 'Recognition',
  text: 'Recognition — advancement, leadership, prestige, and being looked up to'
}, {
  id: 'val_relationships',
  name: 'Relationships',
  text: 'Relationships — friendly co-workers, being of service to others, and work that fits your values'
}, {
  id: 'val_support',
  name: 'Support',
  text: 'Support — supportive management that stands behind you and treats people fairly'
}, {
  id: 'val_conditions',
  name: 'Working Conditions',
  text: 'Working Conditions — job security, good pay, comfortable conditions, and variety'
}];
const VALUE_SCALE = {
  points: 7,
  left: 'Not important',
  right: 'Extremely important'
};
const RIASEC = [{
  id: 'ria_R',
  key: 'R',
  text: 'Realistic — hands-on, practical work with tools, machines, plants, animals, or things you can build or fix'
}, {
  id: 'ria_I',
  key: 'I',
  text: 'Investigative — working with ideas: analyzing problems, investigating, and figuring out how things work'
}, {
  id: 'ria_A',
  key: 'A',
  text: 'Artistic — creative, expressive work: designing, writing, performing, or coming up with original ideas'
}, {
  id: 'ria_S',
  key: 'S',
  text: 'Social — working with people: helping, teaching, advising, or caring for others'
}, {
  id: 'ria_E',
  key: 'E',
  text: 'Enterprising — leading, persuading, or selling: starting things and influencing people toward a goal'
}, {
  id: 'ria_C',
  key: 'C',
  text: 'Conventional — organized work with clear procedures: handling data, details, records, and keeping things in order'
}];
const RIASEC_SCALE = {
  points: 7,
  left: 'Not interested',
  right: 'Extremely interested'
};
const FSCS = [{
  id: 'fscs_similar',
  text: 'How alike are you and the future you — the way you act, the things you like, and what matters to you?',
  hint: 'How alike the two of you are.'
}, {
  id: 'fscs_connected',
  text: "Does the future you feel like the same you, just older — or like a different person you don't really know yet?",
  hint: "More overlap = feels like one continuous ‘you’."
}];
const VIVIDNESS = [{
  id: 'viv_clear',
  text: 'I can picture my future self clearly.'
}, {
  id: 'viv_tangible',
  text: 'My future self feels tangible and real to me, not abstract.'
}, {
  id: 'viv_detail',
  text: "I can imagine specific details about my future self's life."
}, {
  id: 'viv_felt',
  text: 'When I think about my future self, I can almost feel what it would be like.'
}];
const AGREE7 = {
  points: 7,
  left: 'Strongly disagree',
  right: 'Strongly agree'
};
const MANIPULATION = [{
  id: 'mc_style',
  text: 'My future self spoke in a way that felt like my own way of talking.'
}, {
  id: 'mc_scene',
  text: 'My future self described their life through specific, concrete moments rather than vague generalities.'
}, {
  id: 'mc_understand',
  text: 'My future self seemed to genuinely understand my current situation and who I am.'
}];
const OPEN_ENDED = [{
  id: 'oe_real',
  text: 'Which moment in the conversation made you most feel this was genuinely your future self? What made it feel real?'
}, {
  id: 'oe_broke',
  text: 'Was there any moment that broke the feeling — that made the future self feel fake, generic, or off? What happened?'
}];
const CIP_ANXIETY_IDS = ['cip_ca_1', 'cip_ca_2', 'cip_ca_3'];
const CIP_CONFIDENCE_IDS = ['cip_cf_1', 'cip_cf_2', 'cip_cf_3'];
const CIP_ITEMS = [{
  id: 'cip_cf_1',
  text: 'I am confident that I will be able to find a career.'
}, {
  id: 'cip_ca_1',
  text: "I can't commit to a career because I don't know what my other options are."
}, {
  id: 'cip_cf_3',
  text: 'I am confident that I can overcome obstacles in pursuing my career.'
}, {
  id: 'cip_ca_2',
  text: 'I am concerned that my career goals might change.'
}, {
  id: 'cip_cf_2',
  text: "I am quite confident that I will be able to find a career in which I'll perform well."
}, {
  id: 'cip_ca_3',
  text: 'It is difficult to decide on a career because I like so many different things.'
}];
const CIP_SCALE = {
  points: 6,
  left: 'Completely disagree',
  right: 'Strongly agree'
};
function ScaleRow({
  id,
  text,
  scale,
  value,
  onChange
}) {
  const pts = Array.from({
    length: scale.points
  }, (_, i) => i + 1);
  return React.createElement("div", {
    className: "sv-scale"
  }, React.createElement("div", {
    className: "sv-scale-text"
  }, text), React.createElement("div", {
    className: "sv-scale-row"
  }, React.createElement("span", {
    className: "sv-scale-end"
  }, scale.left), React.createElement("div", {
    className: "sv-scale-pts"
  }, pts.map(p => React.createElement("button", {
    key: p,
    type: "button",
    className: `sv-pt ${value === p ? 'on' : ''}`,
    onClick: () => onChange(id, p),
    "aria-label": `${p}`
  }, p))), React.createElement("span", {
    className: "sv-scale-end"
  }, scale.right)));
}
function LikertGrid({
  items,
  scale,
  prefix,
  answers,
  onChange
}) {
  return React.createElement("div", {
    className: "sv-grid"
  }, scale.anchors && React.createElement("div", {
    className: "sv-anchors"
  }, scale.anchors.join('   ·   ')), items.map(it => React.createElement(ScaleRow, {
    key: it.id,
    id: it.id,
    text: prefix ? `${prefix} ${it.text}` : it.text,
    scale: scale,
    value: answers[it.id],
    onChange: onChange
  })));
}
function CirclesField({
  id,
  text,
  hint,
  value,
  onChange
}) {
  const opts = Array.from({
    length: 7
  }, (_, i) => i + 1);
  return React.createElement("div", {
    className: "sv-ios"
  }, React.createElement("div", {
    className: "sv-scale-text"
  }, text), hint && React.createElement("div", {
    className: "sv-hint",
    style: {
      marginBottom: 6
    }
  }, hint), React.createElement("div", {
    className: "sv-ios-row"
  }, opts.map(n => {
    const r = 12,
      cy = 15,
      cx = 32,
      dMax = 28,
      dMin = 5;
    const dist = dMax - (n - 1) / 6 * (dMax - dMin);
    const lx = cx - dist / 2,
      rx = cx + dist / 2;
    return React.createElement("button", {
      key: n,
      type: "button",
      className: `sv-ios-opt ${value === n ? 'on' : ''}`,
      onClick: () => onChange(id, n),
      "aria-label": `Closeness ${n}`
    }, React.createElement("svg", {
      width: "60",
      height: "30",
      viewBox: "0 0 64 30"
    }, React.createElement("circle", {
      cx: lx,
      cy: cy,
      r: r,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.6"
    }), React.createElement("circle", {
      cx: rx,
      cy: cy,
      r: r,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.6"
    })), React.createElement("span", {
      className: "sv-ios-num"
    }, n));
  })), React.createElement("div", {
    className: "sv-ios-ends"
  }, React.createElement("span", null, "Completely separate"), React.createElement("span", null, "Almost completely overlapping")), React.createElement("div", {
    className: "sv-ios-legend"
  }, "Left circle = you now \xB7 right circle = you in 10 years"));
}
function IOSField({
  id,
  value,
  onChange,
  career
}) {
  return React.createElement(CirclesField, {
    id: id,
    value: value,
    onChange: onChange,
    text: `How much does the future you${career ? ` as a ${career}` : ''} already feel like a part of you today?`,
    hint: "Barely-touching circles = not yet; almost-fully-overlapping = already a big part of me."
  });
}
function ImagineSequence({
  lines,
  closing
}) {
  const {
    useState,
    useEffect
  } = React;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!lines || lines.length < 2) return undefined;
    const t = setInterval(() => setIdx(i => (i + 1) % lines.length), 6500);
    return () => clearInterval(t);
  }, [lines ? lines.length : 0]);
  return React.createElement("div", {
    className: "sv-imagine"
  }, React.createElement("div", {
    className: "sv-imagine-seq"
  }, React.createElement("p", {
    key: idx,
    className: "sv-imagine-line"
  }, lines && lines[idx] || '')), closing && React.createElement("p", {
    className: "sv-imagine-close"
  }, closing));
}
function ChoiceField({
  id,
  options,
  value,
  onChange
}) {
  return React.createElement("div", {
    className: "sv-choices"
  }, options.map(o => {
    const val = typeof o === 'string' ? o : o.value;
    const lbl = typeof o === 'string' ? o : o.label;
    return React.createElement("button", {
      key: val,
      type: "button",
      className: `sv-choice ${value === val ? 'on' : ''}`,
      onClick: () => onChange(id, val)
    }, lbl);
  }));
}
function MultiField({
  id,
  options,
  pick,
  value,
  onChange
}) {
  const sel = Array.isArray(value) ? value : [];
  const toggle = v => {
    if (sel.includes(v)) onChange(id, sel.filter(x => x !== v));else if (sel.length < pick) onChange(id, [...sel, v]);
  };
  return React.createElement("div", null, React.createElement("div", {
    className: "sv-multi"
  }, options.map(o => React.createElement("button", {
    key: o,
    type: "button",
    className: `sv-choice ${sel.includes(o) ? 'on' : ''}`,
    disabled: !sel.includes(o) && sel.length >= pick,
    onClick: () => toggle(o)
  }, o))), React.createElement("div", {
    className: "sv-hint"
  }, sel.length, "/", pick, " chosen"));
}
function sectionComplete(ids, answers) {
  return ids.every(id => {
    const v = answers[id];
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '' && v !== null;
  });
}
function buildPreSections(answers, onChange) {
  const set = (id, v) => onChange(id, v);
  return [{
    title: 'A little about you',
    intro: 'Open to university students of any major, any year, at any university.',
    ids: ['age', 'gender', 'year', ...(answers.year === 'Something else' ? ['year_custom'] : [])],
    node: React.createElement("div", {
      className: "sv-section"
    }, React.createElement("label", {
      className: "sv-field"
    }, React.createElement("span", {
      className: "sv-label"
    }, "Age"), React.createElement("input", {
      className: "sv-input",
      type: "number",
      min: "16",
      max: "80",
      value: answers.age || '',
      onChange: e => set('age', e.target.value)
    })), React.createElement("div", {
      className: "sv-field"
    }, React.createElement("span", {
      className: "sv-label"
    }, "Gender"), React.createElement(ChoiceField, {
      id: "gender",
      value: answers.gender,
      onChange: set,
      options: ['Woman', 'Man', 'Non-binary', 'Prefer not to say']
    })), React.createElement("div", {
      className: "sv-field"
    }, React.createElement("span", {
      className: "sv-label"
    }, "Where are you in your studies?"), React.createElement(ChoiceField, {
      id: "year",
      value: answers.year,
      onChange: set,
      options: ['First year', 'Second year', 'Third year', 'Fourth year', 'Something else']
    })), answers.year === 'Something else' && React.createElement("label", {
      className: "sv-field"
    }, React.createElement("span", {
      className: "sv-label"
    }, "Which year? (a number)"), React.createElement("input", {
      className: "sv-input",
      type: "number",
      min: "1",
      max: "10",
      value: answers.year_custom || '',
      onChange: e => set('year_custom', e.target.value)
    })), React.createElement("label", {
      className: "sv-field"
    }, React.createElement("span", {
      className: "sv-label"
    }, "Programme / major"), React.createElement("input", {
      className: "sv-input",
      type: "text",
      placeholder: "e.g. Psychology, Computer Science, Law",
      value: answers.major || '',
      onChange: e => set('major', e.target.value)
    })))
  }, {
    title: 'How you see yourself',
    eyebrow: 'Part 1 of 2',
    intro: TIPI_INSTRUCTION,
    ids: TIPI.slice(0, 5).map(i => i.id),
    node: React.createElement("div", {
      className: "sv-section"
    }, React.createElement("p", {
      className: "sv-stem"
    }, "I see myself as:"), React.createElement(LikertGrid, {
      items: TIPI.slice(0, 5),
      scale: TIPI_SCALE,
      answers: answers,
      onChange: set
    }))
  }, {
    title: 'How you see yourself',
    eyebrow: 'Part 2 of 2',
    intro: TIPI_INSTRUCTION,
    ids: TIPI.slice(5).map(i => i.id),
    node: React.createElement("div", {
      className: "sv-section"
    }, React.createElement("p", {
      className: "sv-stem"
    }, "I see myself as:"), React.createElement(LikertGrid, {
      items: TIPI.slice(5),
      scale: TIPI_SCALE,
      answers: answers,
      onChange: set
    }))
  }, {
    title: 'What matters in work',
    intro: 'How important is each of these in your ideal job? Rate every one.',
    ids: WORK_VALUE_ITEMS.map(i => i.id),
    node: React.createElement(LikertGrid, {
      items: WORK_VALUE_ITEMS,
      scale: VALUE_SCALE,
      answers: answers,
      onChange: set
    })
  }, {
    title: 'What kind of work appeals',
    intro: 'How interested are you in each kind of work?',
    ids: RIASEC.map(i => i.id),
    node: React.createElement(LikertGrid, {
      items: RIASEC,
      scale: RIASEC_SCALE,
      answers: answers,
      onChange: set
    })
  }, {
    title: 'Picture that future you',
    intro: 'The next questions are about your future self — the person you will be about 10 years from now. Take a moment for this one — there is nothing to answer here, just a minute to imagine.',
    ids: [],
    skip: true,
    node: React.createElement(ImagineSequence, {
      lines: ["It is an ordinary weekday about ten years from now. Picture waking up — where are you? Whose voice, if anyone's, do you hear first? Notice the room, the light coming in, what is already on your mind before the day has properly started.", "Now you are at work, whatever that work has turned out to be. What is in front of you this morning? Who is around — people you work with, people you are helping, someone you are still learning from? Sit for a second with what it feels like to be genuinely good at something you spent years growing into.", "It is evening now. The day is behind you. Where are you, who are you with, and how do you feel as it winds down?"],
      closing: "Stay with that person for a moment. They are who the next question is about."
    })
  }, {
    title: 'How close is your future self?',
    intro: "Now that you have pictured that person — how close do they feel to who you are today? You will answer this again after the conversation, so we can see what shifts.",
    ids: ['ios_pre'],
    node: React.createElement("div", {
      className: "sv-section"
    }, React.createElement(IOSField, {
      id: "ios_pre",
      value: answers.ios_pre,
      onChange: set
    }))
  }, {
    title: 'How continuous is your future self?',
    intro: 'Two more quick pictures — pick the pair of circles that fits best for each.',
    ids: FSCS.map(i => i.id),
    node: React.createElement("div", {
      className: "sv-section"
    }, FSCS.map(it => React.createElement(CirclesField, {
      key: it.id,
      id: it.id,
      text: it.text,
      hint: it.hint,
      value: answers[it.id],
      onChange: set
    })))
  }, {
    title: 'Picturing that future',
    intro: 'How much do you agree with each statement?',
    ids: VIVIDNESS.map(i => i.id),
    node: React.createElement(LikertGrid, {
      items: VIVIDNESS,
      scale: AGREE7,
      answers: answers,
      onChange: set
    })
  }, {
    title: 'Your career decision',
    intro: "Where you stand with career decisions right now — you'll answer these again after the conversation. How much do you agree with each?",
    ids: CIP_ITEMS.map(i => i.id),
    node: React.createElement("div", {
      className: "sv-section"
    }, React.createElement(LikertGrid, {
      items: CIP_ITEMS,
      scale: CIP_SCALE,
      answers: answers,
      onChange: set
    }))
  }];
}
function buildPostSections(answers, onChange, career) {
  const set = (id, v) => onChange(id, v);
  const vivPost = VIVIDNESS.map(i => ({
    ...i,
    id: i.id + '_post'
  }));
  return [{
    title: 'Picture that future you, once more',
    intro: 'Before the last questions, take one more moment with your future self — the person you have just been speaking with, about 10 years from now. There is nothing to answer here, just a minute to picture them again.',
    ids: [],
    skip: true,
    node: React.createElement(ImagineSequence, {
      lines: ["Bring that future self back to mind — the same person you just spoke with, on an ordinary weekday about ten years from now. Picture them waking up: where are they, what does the light in the room feel like, what is already on their mind before the day has properly started?", "Now picture the work you talked about together. What is in front of them this morning? Who is around — people they work with, people they are helping, someone they are still learning from? Sit for a second with what it feels like to be that person, genuinely good at something they spent years growing into.", "It is evening now, the day behind them. Where are they, who are they with, and how do they feel as it winds down?"],
      closing: "Stay with that person for a moment. The next questions are about them."
    })
  }, {
    title: 'And now — how close is your future self?',
    intro: 'After the conversation, how close does that future you (about 10 years from now) feel to who you are today?',
    ids: ['ios_post'],
    node: React.createElement("div", {
      className: "sv-section"
    }, React.createElement(IOSField, {
      id: "ios_post",
      value: answers.ios_post,
      onChange: set,
      career: career
    }))
  }, {
    title: 'And now — how continuous is your future self?',
    intro: 'The same two pictures — pick the pair of circles that fits best for each, now.',
    ids: FSCS.map(i => i.id + '_post'),
    node: React.createElement("div", {
      className: "sv-section"
    }, FSCS.map(it => React.createElement(CirclesField, {
      key: it.id,
      id: it.id + '_post',
      text: it.text,
      hint: it.hint,
      value: answers[it.id + '_post'],
      onChange: set
    })))
  }, {
    title: 'Picturing that future, now',
    intro: 'How much do you agree with each statement?',
    ids: vivPost.map(i => i.id),
    node: React.createElement(LikertGrid, {
      items: vivPost,
      scale: AGREE7,
      answers: answers,
      onChange: set
    })
  }, {
    title: 'Your career decision, now',
    intro: 'The same statements as before — answer for how you feel right now.',
    ids: CIP_ITEMS.map(i => i.id + '_post'),
    node: React.createElement("div", {
      className: "sv-section"
    }, React.createElement(LikertGrid, {
      items: CIP_ITEMS.map(i => ({
        ...i,
        id: i.id + '_post'
      })),
      scale: CIP_SCALE,
      answers: answers,
      onChange: set
    }))
  }, {
    title: 'About the conversation',
    intro: 'How much do you agree?',
    ids: MANIPULATION.map(i => i.id),
    node: React.createElement(LikertGrid, {
      items: MANIPULATION,
      scale: AGREE7,
      answers: answers,
      onChange: set
    })
  }, {
    title: 'In your own words',
    intro: 'A few honest lines for each — there are no right answers.',
    ids: [],
    node: React.createElement("div", {
      className: "sv-section"
    }, OPEN_ENDED.map(q => React.createElement("label", {
      className: "sv-field",
      key: q.id
    }, React.createElement("span", {
      className: "sv-label"
    }, q.text), React.createElement("textarea", {
      className: "sv-textarea",
      rows: 3,
      value: answers[q.id] || '',
      onChange: e => set(q.id, e.target.value)
    }))))
  }, {
    title: 'One last thing',
    intro: 'Optional.',
    ids: ['interview'],
    node: React.createElement("div", {
      className: "sv-section"
    }, React.createElement("div", {
      className: "sv-field"
    }, React.createElement("span", {
      className: "sv-label"
    }, "Would you be open to a short (~15 min) follow-up interview about your experience?"), React.createElement(ChoiceField, {
      id: "interview",
      value: answers.interview,
      onChange: set,
      options: ['Yes', 'No']
    })), answers.interview === 'Yes' && React.createElement("p", {
      className: "sv-intro",
      style: {
        marginTop: 4
      }
    }, "Thank you! We don't collect any contact details here \u2014 if you'd like to take part, just email the team at ", React.createElement("a", {
      href: "mailto:thy.le@student.uva.nl"
    }, "thy.le@student.uva.nl"), " and we'll arrange a time."))
  }];
}
const SVPAGE_KEY = 'thesis_svpage_v5';
const readSvPage = k => {
  try {
    return Number(JSON.parse(localStorage.getItem(SVPAGE_KEY) || '{}')[k]) || 0;
  } catch (e) {
    return 0;
  }
};
const writeSvPage = (k, n) => {
  try {
    const o = JSON.parse(localStorage.getItem(SVPAGE_KEY) || '{}');
    if (n == null) delete o[k];else o[k] = n;
    localStorage.setItem(SVPAGE_KEY, JSON.stringify(o));
  } catch (e) {}
};
function PagedSurvey({
  sections,
  answers,
  onChange,
  onDone,
  onBack,
  eyebrow,
  storageKey
}) {
  const {
    useState,
    useEffect
  } = React;
  const isPreview = typeof window !== 'undefined' && window.THESIS_PREVIEW;
  const [page, setPageRaw] = useState(() => {
    const n = storageKey && !isPreview ? readSvPage(storageKey) : 0;
    return Math.min(Math.max(0, n), sections.length - 1);
  });
  const setPage = n => {
    setPageRaw(n);
    if (storageKey && !isPreview) writeSvPage(storageKey, n);
  };
  const s = sections[Math.min(page, sections.length - 1)];
  const holdFor = sec => {
    if (isPreview) return 0;
    if (typeof window !== 'undefined' && window.THESIS_TEST_NO_HOLD) return 0;
    return sec || 0;
  };
  const [remaining, setRemaining] = useState(() => holdFor(s.holdSeconds));
  useEffect(() => {
    setRemaining(holdFor(s.holdSeconds));
  }, [page]);
  useEffect(() => {
    if (remaining <= 0) return undefined;
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);
  const heldEnough = remaining <= 0;
  const complete = (isPreview || sectionComplete(s.ids, answers)) && heldEnough;
  const isLast = page === sections.length - 1;
  const next = () => {
    if (isLast) {
      if (storageKey) writeSvPage(storageKey, null);
      onDone();
    } else {
      setPage(page + 1);
      window.scrollTo(0, 0);
    }
  };
  const back = () => {
    if (page === 0) onBack && onBack();else {
      setPage(page - 1);
      window.scrollTo(0, 0);
    }
  };
  return React.createElement("div", {
    className: "flow"
  }, React.createElement("div", {
    className: "flow-progress"
  }, React.createElement("div", {
    className: "bar",
    style: {
      width: `${(page + 1) / sections.length * 100}%`
    }
  })), React.createElement("nav", {
    className: "topnav"
  }, React.createElement("div", {
    className: "brand"
  }, React.createElement(BrandMark, {
    size: 22
  }), React.createElement("span", null, "Thesis")), React.createElement("div", {
    className: "sv-eyebrow"
  }, eyebrow), React.createElement("div", {
    className: "end"
  })), React.createElement("div", {
    className: "flow-body"
  }, React.createElement("div", {
    className: "sv-wrap"
  }, React.createElement("div", {
    className: "sv-head"
  }, s.eyebrow && React.createElement("div", {
    className: "sv-part"
  }, s.eyebrow), React.createElement("h2", {
    className: "sv-title"
  }, s.title), s.intro && React.createElement("p", {
    className: "sv-instruction"
  }, s.intro)), s.node)), React.createElement("div", {
    className: "flow-foot"
  }, page > 0 || onBack ? React.createElement("button", {
    className: "btn ghost",
    onClick: back
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
  })), "Back") : React.createElement("span", null), React.createElement("span", {
    className: "step-label"
  }, page + 1, " OF ", sections.length), React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, s.skip && React.createElement("button", {
    className: "btn ghost",
    onClick: next
  }, "Skip"), React.createElement("button", {
    className: "btn accent",
    disabled: !complete,
    onClick: next
  }, !heldEnough ? `Take a moment… ${remaining}s` : isLast ? 'Done' : 'Continue', React.createElement("svg", {
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
  }))))));
}
function PreSurvey({
  answers,
  onChange,
  onDone,
  onBack
}) {
  return React.createElement(PagedSurvey, {
    eyebrow: "Step 02 \xB7 Pre-survey",
    storageKey: "pre",
    sections: buildPreSections(answers, onChange),
    answers: answers,
    onChange: onChange,
    onDone: onDone,
    onBack: onBack
  });
}
function PostSurvey({
  answers,
  onChange,
  onDone,
  career
}) {
  return React.createElement(PagedSurvey, {
    eyebrow: "Final step \xB7 Reflection",
    storageKey: "post",
    sections: buildPostSections(answers, onChange, career),
    answers: answers,
    onChange: onChange,
    onDone: onDone
  });
}
function scoreBigFive(a) {
  const rev = x => 8 - x;
  const out = {};
  for (const t of ['O', 'C', 'E', 'A', 'ES']) {
    const items = TIPI.filter(i => i.trait === t);
    const vals = items.map(i => i.reverse ? rev(Number(a[i.id])) : Number(a[i.id]));
    if (vals.every(v => !Number.isNaN(v))) out[t] = vals.reduce((s, v) => s + v, 0) / vals.length;
  }
  return out;
}
function scaleMean(a, items, suffix = '') {
  const vals = items.map(i => Number(a[i.id + suffix])).filter(v => !Number.isNaN(v));
  return vals.length === items.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 100) / 100 : null;
}
const scoreFSCS = (a, suffix = '') => scaleMean(a, FSCS, suffix);
function scoreCip(a, suffix = '') {
  const m = ids => {
    const v = ids.map(id => Number(a[id + suffix])).filter(x => !Number.isNaN(x));
    return v.length === ids.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length * 100) / 100 : null;
  };
  return {
    anxiety: m(CIP_ANXIETY_IDS),
    confidence: m(CIP_CONFIDENCE_IDS)
  };
}
function scoreRiasec(a) {
  const out = {};
  for (const i of RIASEC) {
    const v = Number(a[i.id]);
    if (!Number.isNaN(v)) out[i.key] = v;
  }
  return out;
}
function topWorkValues(pre) {
  const rated = WORK_VALUE_ITEMS.map(it => ({
    name: it.name,
    r: Number(pre[it.id])
  })).filter(x => !Number.isNaN(x.r));
  rated.sort((a, b) => b.r - a.r);
  return rated.slice(0, 3).map(x => x.name);
}
function buildProfileData(pre) {
  const major = (pre.major || '').trim();
  const year = pre.year === 'Something else' && pre.year_custom ? `Year ${pre.year_custom}` : pre.year;
  return {
    year,
    demographics: {
      age: pre.age,
      gender: pre.gender,
      major
    },
    bigFive: scoreBigFive(pre),
    values: topWorkValues(pre),
    riasec: scoreRiasec(pre)
  };
}
Object.assign(window, {
  ScaleRow,
  LikertGrid,
  CirclesField,
  IOSField,
  ChoiceField,
  MultiField,
  PreSurvey,
  PostSurvey,
  buildProfileData,
  scoreBigFive,
  scoreRiasec,
  scoreCip,
  scoreFSCS
});
})();
