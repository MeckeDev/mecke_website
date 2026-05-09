/* ────────────────────────────────────────────────────────────
   STATE + PERSISTENCE
   ──────────────────────────────────────────────────────────── */
const DEFAULTS = {
  accent: 'amber', accentHex: null,
  font: 'mono',
  bg: 'grid',
  density: 'normal',
  mode: 'dark',
  effects: { cursor: true, scanlines: false, vignette: true, glitch: true },
  order: ['hero','services','recent', 'how','contact'],
  _migrations: { scanlinesOff: true },
};
const STORE_KEY = 'mecke.dev:playground:v1';

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!s) return structuredClone(DEFAULTS);
    const merged = Object.assign(structuredClone(DEFAULTS), s,
      { effects: Object.assign({}, DEFAULTS.effects, s.effects || {}) });
    // one-time: turn off scanlines for users with stale state where they were on by default
    const mig = s._migrations || {};
    if (!mig.scanlinesOff) {
      merged.effects.scanlines = false;
      merged._migrations = Object.assign({}, mig, { scanlinesOff: true });
    }
    return merged;
  } catch (e) { return structuredClone(DEFAULTS); }
}
function saveState() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }
let state = loadState();

const ACCENTS = {
  amber:  { c: '#ffae5c', soft: 'rgba(255,174,92,0.12)',  glow: 'rgba(255,174,92,0.40)' },
  matrix: { c: '#8fd47f', soft: 'rgba(143,212,127,0.12)', glow: 'rgba(143,212,127,0.40)' },
  cyber:  { c: '#66d9ef', soft: 'rgba(102,217,239,0.12)', glow: 'rgba(102,217,239,0.40)' },
  pink:   { c: '#ff6ec7', soft: 'rgba(255,110,199,0.12)', glow: 'rgba(255,110,199,0.40)' },
  nord:   { c: '#88c0d0', soft: 'rgba(136,192,208,0.12)', glow: 'rgba(136,192,208,0.40)' },
  red:    { c: '#ff6e6e', soft: 'rgba(255,110,110,0.12)', glow: 'rgba(255,110,110,0.40)' },
  violet: { c: '#b794f4', soft: 'rgba(183,148,244,0.12)', glow: 'rgba(183,148,244,0.40)' },
};

/* ────────────────────────────────────────────────────────────
   APPLY STATE → DOM
   ──────────────────────────────────────────────────────────── */
function hexToRgba(hex, a) {
  const h = hex.replace('#','');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(v.slice(0,2),16), g = parseInt(v.slice(2,4),16), b = parseInt(v.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

function applyAccent() {
  let c, soft, glow;
  if (state.accentHex) {
    c = state.accentHex;
    soft = hexToRgba(c, 0.12);
    glow = hexToRgba(c, 0.40);
  } else {
    const a = ACCENTS[state.accent] || ACCENTS.amber;
    c = a.c; soft = a.soft; glow = a.glow;
  }
  document.documentElement.style.setProperty('--accent', c);
  document.documentElement.style.setProperty('--accent-soft', soft);
  document.documentElement.style.setProperty('--accent-glow', glow);
  document.getElementById('cur-accent').textContent = state.accentHex || state.accent;
  document.querySelectorAll('#swatches .swatch').forEach(b => {
    b.classList.toggle('active', !state.accentHex && b.dataset.accent === state.accent);
  });
}
function applyFont() {
  document.body.classList.remove('font-mono','font-sans','font-serif','font-pixel');
  document.body.classList.add('font-' + state.font);
  document.getElementById('cur-font').textContent = state.font;
  document.querySelectorAll('[data-group="font"] .pill').forEach(b => {
    b.classList.toggle('active', b.dataset.font === state.font);
  });
}
function applyBg() {
  document.body.dataset.bg = state.bg;
  document.getElementById('cur-bg').textContent = state.bg === 'none' ? 'off' : state.bg;
  document.querySelectorAll('[data-group="bg"] .pill').forEach(b => {
    b.classList.toggle('active', b.dataset.bg === state.bg);
  });
}
function applyDensity() {
  document.body.classList.remove('density-compact','density-normal','density-spacious');
  document.body.classList.add('density-' + state.density);
  document.getElementById('cur-density').textContent = state.density;
  document.querySelectorAll('[data-group="density"] .pill').forEach(b => {
    b.classList.toggle('active', b.dataset.density === state.density);
  });
}
function applyMode() {
  document.body.classList.remove('theme-light','matrix');
  if (state.mode === 'light')  document.body.classList.add('theme-light');
  if (state.mode === 'matrix') document.body.classList.add('matrix');
  if (state.mode === 'matrix') startMatrix(); else stopMatrix();
  document.querySelectorAll('[data-group="mode"] .pill').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
  });
}
function applyEffects() {
  document.body.classList.toggle('cursor-default', !state.effects.cursor);
  document.body.classList.toggle('no-scanlines',  !state.effects.scanlines);
  document.body.classList.toggle('no-vignette',   !state.effects.vignette);
  document.body.classList.toggle('no-glitch',     !state.effects.glitch);
  document.querySelectorAll('[data-toggle]').forEach(row => {
    const k = row.dataset.toggle;
    row.querySelector('.toggle').classList.toggle('on', !!state.effects[k]);
  });
}
function applyOrder() {
  const main = document.querySelector('main.wrap');
  if (!main) return;
  const map = {};
  main.querySelectorAll('section[data-section]').forEach(s => map[s.dataset.section] = s);
  state.order.forEach(key => { if (map[key]) main.appendChild(map[key]); });
}
function applyAll() {
  applyAccent(); applyFont(); applyBg(); applyDensity(); applyMode(); applyEffects(); applyOrder();
}

/* ────────────────────────────────────────────────────────────
   PANEL CONTROLS
   ──────────────────────────────────────────────────────────── */
const fab = document.getElementById('fab');
const cfgClose = document.getElementById('cfg-close');
function openCfg() { document.body.classList.add('cfg-open'); }
function closeCfg() { document.body.classList.remove('cfg-open'); }
fab.addEventListener('click', () => document.body.classList.toggle('cfg-open'));
cfgClose.addEventListener('click', closeCfg);

document.querySelectorAll('#swatches .swatch').forEach(b => {
  if (b.classList.contains('custom')) return;
  b.addEventListener('click', () => {
    state.accent = b.dataset.accent; state.accentHex = null;
    applyAccent(); saveState();
  });
});
document.getElementById('custom-color').addEventListener('input', (e) => {
  state.accentHex = e.target.value;
  applyAccent(); saveState();
});

document.querySelectorAll('[data-group="font"] .pill').forEach(b => {
  b.addEventListener('click', () => { state.font = b.dataset.font; applyFont(); saveState(); });
});
document.querySelectorAll('[data-group="bg"] .pill').forEach(b => {
  b.addEventListener('click', () => { state.bg = b.dataset.bg; applyBg(); saveState(); });
});
document.querySelectorAll('[data-group="density"] .pill').forEach(b => {
  b.addEventListener('click', () => { state.density = b.dataset.density; applyDensity(); saveState(); });
});
document.querySelectorAll('[data-group="mode"] .pill').forEach(b => {
  b.addEventListener('click', () => { state.mode = b.dataset.mode; applyMode(); saveState(); });
});
document.querySelectorAll('[data-toggle]').forEach(row => {
  row.addEventListener('click', () => {
    const k = row.dataset.toggle;
    state.effects[k] = !state.effects[k];
    applyEffects(); saveState();
  });
});

document.getElementById('btn-reset').addEventListener('click', () => {
  state = structuredClone(DEFAULTS);
  applyAll(); saveState();
});
document.getElementById('btn-export').addEventListener('click', async () => {
  const cmds = [
    'theme '   + (state.accentHex || state.accent),
    'font '    + state.font,
    'bg '      + state.bg,
    'density ' + state.density,
    'mode '    + state.mode,
  ].join(' && ');
  try { await navigator.clipboard.writeText(cmds); termWrite('copied: ' + cmds, 'ok'); }
  catch (e) { termWrite(cmds, 'hi'); }
});

/* ────────────────────────────────────────────────────────────
   REORDER MODE (drag sections)
   ──────────────────────────────────────────────────────────── */
let reorderOn = false;
function setReorder(on) {
  reorderOn = on;
  document.body.classList.toggle('reorder-mode', on);
  const main = document.querySelector('main.wrap');
  main.querySelectorAll('section[data-section]').forEach(s => {
    s.draggable = on;
  });
  if (on) closeCfg();
}
document.getElementById('btn-reorder').addEventListener('click', () => setReorder(!reorderOn));

let dragSec = null;
document.addEventListener('dragstart', (e) => {
  if (!reorderOn) return;
  const sec = e.target.closest('section[data-section]');
  if (!sec) return;
  dragSec = sec;
  sec.classList.add('dragging');
  try { e.dataTransfer.setData('text/plain', sec.dataset.section); } catch (err) {}
  e.dataTransfer.effectAllowed = 'move';
});
document.addEventListener('dragover', (e) => {
  if (!reorderOn || !dragSec) return;
  e.preventDefault();
  const sec = e.target.closest('section[data-section]');
  if (!sec || sec === dragSec) return;
  document.querySelectorAll('section.drop-target').forEach(s => s.classList.remove('drop-target'));
  sec.classList.add('drop-target');
});
document.addEventListener('drop', (e) => {
  if (!reorderOn || !dragSec) return;
  e.preventDefault();
  const sec = e.target.closest('section[data-section]');
  if (sec && sec !== dragSec) {
    const main = document.querySelector('main.wrap');
    const rect = sec.getBoundingClientRect();
    const after = (e.clientY - rect.top) > rect.height / 2;
    main.insertBefore(dragSec, after ? sec.nextSibling : sec);
    state.order = Array.from(main.querySelectorAll('section[data-section]'))
      .map(s => s.dataset.section);
    saveState();
  }
  document.querySelectorAll('section.drop-target').forEach(s => s.classList.remove('drop-target'));
});
document.addEventListener('dragend', () => {
  if (dragSec) dragSec.classList.remove('dragging');
  document.querySelectorAll('section.drop-target').forEach(s => s.classList.remove('drop-target'));
  dragSec = null;
});
/* exit reorder on escape */
addEventListener('keydown', (e) => { if (e.key === 'Escape' && reorderOn) setReorder(false); });

/* ────────────────────────────────────────────────────────────
   BOOT SEQUENCE
   ──────────────────────────────────────────────────────────── */
const bootLines = [
  { t: 0,    html: '<span class="dim">[boot]</span> initializing mecke.dev' },
  { t: 220,  html: '<span class="dim">[boot]</span> loading shell .......... <span class="ok">ok</span>' },
  { t: 360,  html: '<span class="dim">[boot]</span> mounting /services ..... <span class="ok">ok</span>' },
  { t: 480,  html: '<span class="dim">[boot]</span> restoring user prefs ... <span class="ok">ok</span>' },
  { t: 640,  html: '<span class="dim">[boot]</span> session id <span class="warn">' + Math.random().toString(36).slice(2,10) + '</span>' },
  { t: 820,  html: '<span class="ok">ready.</span> hello.' },
];
const bootEl = document.getElementById('boot-lines');
bootLines.forEach(({ t, html }) => {
  setTimeout(() => {
    const div = document.createElement('div');
    div.className = 'line shown'; div.innerHTML = html;
    bootEl.appendChild(div);
  }, t);
});
setTimeout(() => document.body.classList.add('booted'), 1300);

/* ────────────────────────────────────────────────────────────
   CLOCK + UPTIME + LOCATION
   ──────────────────────────────────────────────────────────── */
const startTime = Date.now();
const pad = n => String(n).padStart(2, '0');
function tick() {
  const d = new Date();
  document.getElementById('clock').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  const up = Math.floor((Date.now() - startTime) / 1000);
  document.getElementById('uptime').textContent = pad(Math.floor(up / 60)) + ':' + pad(up % 60);
}
tick(); setInterval(tick, 1000);
try {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '—';
  const lang = (navigator.language || '—').split('-')[0];
  document.getElementById('loc').textContent = tz.replace('_', ' ') + ' · ' + lang;
} catch (e) {}
document.getElementById('year').textContent = new Date().getFullYear();

/* ────────────────────────────────────────────────────────────
   CUSTOM CURSOR
   ──────────────────────────────────────────────────────────── */
const dot = document.querySelector('.cursor-dot');
const ring = document.querySelector('.cursor-ring');
let mx = innerWidth/2, my = innerHeight/2, rx = mx, ry = my;
addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
});
function ringLoop() {
  rx += (mx - rx) * 0.18;
  ry += (my - ry) * 0.18;
  ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
  requestAnimationFrame(ringLoop);
}
ringLoop();
function bindHover() {
  document.querySelectorAll('a, button, input, textarea, .listing-row, .swatch, .pill, .toggle, .cfg-toggle').forEach(el => {
    if (el.dataset.hoverBound) return;
    el.dataset.hoverBound = '1';
    el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
  });
}
bindHover();

/* ────────────────────────────────────────────────────────────
   SCRAMBLE-DECRYPT HEADINGS
   ──────────────────────────────────────────────────────────── */
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#01';
function scrambleEl(node) {
  const targets = [];
  const walk = (n) => n.childNodes.forEach(c => {
    if (c.nodeType === 3) targets.push(c);
    else if (c.nodeType === 1) walk(c);
  });
  walk(node);
  targets.forEach(textNode => {
    const original = textNode.nodeValue;
    if (!original.trim()) return;
    let frame = 0;
    const total = 18;
    const lock = original.split('').map(() => Math.floor(Math.random() * total));
    const step = () => {
      let out = '';
      for (let i = 0; i < original.length; i++) {
        const ch = original[i];
        if (frame >= lock[i] || ch === ' ') out += ch;
        else out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      textNode.nodeValue = out;
      frame++;
      if (frame <= total + Math.max(...lock)) requestAnimationFrame(step);
      else textNode.nodeValue = original;
    };
    step();
  });
}
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      if (e.target.dataset.scramble !== undefined) scrambleEl(e.target);
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.25 });
document.querySelectorAll('[data-scramble], section').forEach(el => {
  el.classList.add('reveal');
  obs.observe(el);
});

/* ────────────────────────────────────────────────────────────
   TERMINAL REPL
   ──────────────────────────────────────────────────────────── */
const termBody  = document.getElementById('term-body');
const termInput = document.getElementById('term-input');
const history = []; let histIdx = -1;

function termWrite(text, cls = 'out') {
  const div = document.createElement('div');
  div.className = 'term-line ' + cls;
  div.innerHTML = text;
  termBody.appendChild(div);
  termBody.scrollTop = termBody.scrollHeight;
}

const COMMANDS = {
  help: () => {
    termWrite('available commands:', 'hi');
    [
      ['help',          'show this list'],
      ['services',      'what I can build for you'],
      ['work',          'recent things shipped'],
      ['contact',       'jump to the contact form'],
      ['email',         'open email client'],
      ['whoami',        'about you (your browser tells me a little)'],
      ['about',         'about me'],
      ['date',          'current time'],
      ['ls',            'pretend filesystem'],
      ['cat <file>',    'read a file (try: cat about.txt)'],
      ['', ''],
      ['── playground ──', ''],
      ['theme <name>',     'amber|matrix|cyber|pink|nord|red|violet|#hex'],
      ['font <name>',      'mono|sans|serif|pixel'],
      ['bg <pattern>',     'grid|dots|lines|diag|none'],
      ['density <level>',  'compact|normal|spacious'],
      ['mode <name>',      'dark|light|matrix'],
      ['cursor on/off',    'toggle phosphor cursor'],
      ['scanlines on/off', 'toggle crt scanlines'],
      ['glitch on/off',    'toggle hover glitch'],
      ['customize',        'open settings panel'],
      ['reorder',          'drag sections to reorder'],
      ['physics on/off',   'gravity mode — drag &amp; throw elements'],
      ['shake',            'kick everything around'],
      ['3d / world',       'enter the 3d playground (esc to exit)'],
      ['', ''],
      ['── games ──', ''],
      ['games',             'list playable minigames'],
      ['wordle',            '5-letter word guessing (6 tries)'],
      ['sudoku',            '9×9 logic puzzle'],
      ['2048',              'slide & merge tiles'],
      ['memory',            'match 8 pairs'],
      ['play <name>',       'shortcut: launch any game by name'],
      ['', ''],
      ['random',           'randomize all the things'],
      ['reset',            'restore defaults'],
      ['', ''],
      ['clear',         'clear the screen'],
    ].forEach(([k, v]) => {
      if (!k) { termWrite(' '); return; }
      if (k.startsWith('──')) { termWrite('  <span style="color:var(--ink-dim)">' + k + '</span>'); return; }
      termWrite('  <span style="color:var(--accent)">' + k.padEnd(18) + '</span><span style="color:var(--ink-mute)">' + v + '</span>');
    });
  },
  services: () => {
    termWrite('services on offer:', 'hi');
    [
      'website          — landing pages, dashboards, custom sites',
      'script           — automation, glue code, "do this every X"',
      'desktop_app      — windows / cross-platform native-feel apps',
      'realtime_tool    — log monitors, live parsers, event helpers',
      'ai_workflow      — llm pipelines, agents, integrations',
      'something_weird  — if it\'s code, ask',
    ].forEach(l => termWrite('  ' + l));
    document.getElementById('sec-services').scrollIntoView({ behavior: 'smooth' });
  },
  work: () => {
    termWrite('recent log:', 'hi');
    [
      '[ship] cs2 chat translator (real-time desktop overlay)',
      '[ship] vorsorge (tauri + svelte cross-platform app)',
      '[ship] pin collection platform (web)',
      '[wip ] knowledge graph / docs ontology',
    ].forEach(l => termWrite('  ' + l));
    document.getElementById('sec-recent').scrollIntoView({ behavior: 'smooth' });
  },
  contact: () => {
    termWrite('opening contact form...', 'ok');
    document.getElementById('sec-contact').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => document.getElementById('cf-name').focus(), 700);
  },
  email: () => {
    termWrite('→ launching mail client → contact@mecke.dev', 'ok');
    location.href = 'mailto:contact@mecke.dev?subject=project%20inquiry';
  },
  whoami: () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
    const lang = navigator.language || 'unknown';
    const ua = (navigator.userAgent.match(/(Firefox|Chrome|Safari|Edge|Opera)/) || ['unknown'])[0];
    termWrite('visitor:', 'hi');
    termWrite('  timezone : ' + tz);
    termWrite('  language : ' + lang);
    termWrite('  browser  : ' + ua);
    termWrite('  screen   : ' + screen.width + 'x' + screen.height);
    termWrite('  cookies  : <span style="color:var(--green)">none set</span> (no tracking here)');
  },
  about: () => {
    termWrite('mecke — self-taught technical generalist.', 'hi');
    termWrite('I build practical software: websites, scripts, desktop tools,');
    termWrite('real-time systems, AI-assisted workflows. I work alone and ship fast.');
  },
  date: () => termWrite(new Date().toString()),
  ls: () => {
    termWrite('total 5');
    [ 'drwxr-xr-x  services/',
      '-rw-r--r--  about.txt',
      '-rw-r--r--  recent.log',
      '-rwxr-xr-x  contact.sh',
      '-rw-r--r--  README.md',
    ].forEach(l => termWrite('  ' + l));
  },
  cat: (args) => {
    const f = args[0] || '';
    const files = {
      'about.txt':   'self-taught generalist. builds tools. ships things. likes systems that connect.',
      'readme.md':   '# mecke.dev\n\nyou tell me what you need, I build it. that\'s the readme.',
      'recent.log':  'see `work` command.',
      'contact.sh':  '#!/usr/bin/env shell\nemail contact@mecke.dev   # done',
    };
    if (!f) return termWrite('cat: missing operand. try: cat about.txt', 'err');
    const key = f.toLowerCase();
    if (files[key]) files[key].split('\n').forEach(l => termWrite('  ' + l));
    else termWrite('cat: ' + f + ': no such file', 'err');
  },

  /* ── playground commands ── */
  theme: (args) => {
    const v = (args[0] || '').toLowerCase();
    if (!v) return termWrite('current theme: ' + (state.accentHex || state.accent) + '. options: ' + Object.keys(ACCENTS).join(', ') + ', or #hex', 'out');
    if (/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) {
      state.accentHex = v.startsWith('#') ? v : '#' + v;
      applyAccent(); saveState();
      return termWrite('theme → ' + state.accentHex, 'ok');
    }
    if (!ACCENTS[v]) return termWrite('unknown theme. options: ' + Object.keys(ACCENTS).join(', '), 'err');
    state.accent = v; state.accentHex = null;
    applyAccent(); saveState();
    termWrite('theme → ' + v, 'ok');
  },
  font: (args) => {
    const v = (args[0] || '').toLowerCase();
    if (!['mono','sans','serif','pixel'].includes(v))
      return termWrite('options: mono, sans, serif, pixel', 'err');
    state.font = v; applyFont(); saveState();
    termWrite('font → ' + v, 'ok');
  },
  bg: (args) => {
    const v = (args[0] || '').toLowerCase();
    if (!['grid','dots','lines','diag','none'].includes(v))
      return termWrite('options: grid, dots, lines, diag, none', 'err');
    state.bg = v; applyBg(); saveState();
    termWrite('bg → ' + v, 'ok');
  },
  density: (args) => {
    const v = (args[0] || '').toLowerCase();
    if (!['compact','normal','spacious'].includes(v))
      return termWrite('options: compact, normal, spacious', 'err');
    state.density = v; applyDensity(); saveState();
    termWrite('density → ' + v, 'ok');
  },
  mode: (args) => {
    const v = (args[0] || '').toLowerCase();
    if (!['dark','light','matrix'].includes(v))
      return termWrite('options: dark, light, matrix', 'err');
    state.mode = v; applyMode(); saveState();
    termWrite('mode → ' + v, 'ok');
  },
  cursor:    (a) => toggleEffect('cursor',    a[0]),
  scanlines: (a) => toggleEffect('scanlines', a[0]),
  vignette:  (a) => toggleEffect('vignette',  a[0]),
  glitch:    (a) => toggleEffect('glitch',    a[0]),
  customize: () => { openCfg(); termWrite('panel opened →', 'ok'); },
  config:    () => COMMANDS.customize(),
  reorder:   () => { setReorder(!reorderOn); termWrite('reorder mode: ' + (reorderOn ? 'on (drag sections)' : 'off'), 'ok'); },
  random:    () => {
    const pickK = (o) => Object.keys(o)[Math.floor(Math.random() * Object.keys(o).length)];
    state.accent = pickK(ACCENTS); state.accentHex = null;
    state.font   = ['mono','sans','serif','pixel'][Math.floor(Math.random()*4)];
    state.bg     = ['grid','dots','lines','diag','none'][Math.floor(Math.random()*5)];
    state.density= ['compact','normal','spacious'][Math.floor(Math.random()*3)];
    applyAll(); saveState();
    termWrite('randomized: ' + state.accent + ' / ' + state.font + ' / ' + state.bg + ' / ' + state.density, 'ok');
  },
  physics: (args) => {
    const v = (args[0] || '').toLowerCase();
    let next = !physicsOn;
    if (v === 'on')  next = true;
    if (v === 'off') next = false;
    if (next) enablePhysics(); else disablePhysics();
    termWrite('physics → ' + (physicsOn ? 'on (drag elements to throw)' : 'off'), 'ok');
  },
  gravity: (args) => COMMANDS.physics(args),
  shake: () => {
    if (!physicsOn) { enablePhysics(); }
    shakeAll();
    termWrite('shaking everything.', 'ok');
  },
  '3d': (args) => {
    const v = (args[0] || '').toLowerCase();
    let next = !threeOn;
    if (v === 'on')  next = true;
    if (v === 'off') next = false;
    if (next) { termWrite('entering 3d world... (loading engine)', 'ok'); enable3D(); }
    else      { termWrite('returning to 2d.', 'ok'); disable3D(); }
  },
  world: (args) => COMMANDS['3d'](args),
  pc: (args) => {
    const v = (args[0] || '').toLowerCase();
    let next = !pcOn;
    if (v === 'on')  next = true;
    if (v === 'off') next = false;
    if (next) { termWrite('booting MECKE OS sandbox...', 'ok'); enablePC(); }
    else      { termWrite('shutting down desktop.', 'ok'); disablePC(); }
  },
  desktop: (args) => COMMANDS.pc(args),
  os:      (args) => COMMANDS.pc(args),
  wordle:  () => { termWrite('opening wordle...', 'ok'); enableGame('wordle'); },
  sudoku:  () => { termWrite('opening sudoku...', 'ok'); enableGame('sudoku'); },
  '2048':  () => { termWrite('opening 2048...',   'ok'); enableGame('g2048'); },
  twentyfortyeight: () => COMMANDS['2048'](),
  memory:  () => { termWrite('opening memory match...', 'ok'); enableGame('memory'); },
  match:   () => COMMANDS.memory(),
  csguess: () => { termWrite('opening cs_guess briefing...', 'ok'); enableGame('csguess'); },
  cs:      () => COMMANDS.csguess(),
  guess:   () => COMMANDS.csguess(),
  synthlab:() => { termWrite('booting synth_lab...', 'ok'); enableGame('synthlab'); },
  lab:     () => COMMANDS.synthlab(),
  games:   () => {
    termWrite('available games & tools:', 'hi');
    [
      ['wordle',   '5-letter word guessing'],
      ['sudoku',   '9×9 logic puzzle'],
      ['2048',     'slide & merge tiles'],
      ['memory',   'match 8 pairs'],
      ['csguess',  'identify a CS2 item from a blurred image'],
      ['synthlab', 'full polyphonic web-audio synth + sequencer'],
    ].forEach(([k, v]) => termWrite('  <span style="color:var(--accent)">' + k.padEnd(10) + '</span><span style="color:var(--ink-mute)">' + v + '</span>'));
  },
  play:    (args) => {
    const v = (args[0] || '').toLowerCase();
    if (COMMANDS[v]) { COMMANDS[v](args.slice(1)); return; }
    COMMANDS.games();
  },
  synth: () => {
    if (!pcOn) { termWrite('booting desktop first...', 'ok'); enablePC(); }
    setTimeout(() => { try { pcLaunchApp('synth'); } catch (_) {} }, 50);
    termWrite('synth pad opened. press z–m or q–u to play.', 'ok');
  },
  piano: () => COMMANDS.synth(),
  voice: (args) => {
    const v = (args[0] || '').toLowerCase();
    if (v === 'off') { voiceStop(); termWrite('voice off.', 'ok'); return; }
    if (voiceStart()) termWrite("voice listening. say things like 'theme matrix', 'open desktop', 'physics on'.", 'ok');
  },
  konami: () => { matrixRain(); termWrite('// matrix unlocked', 'ok'); },
  reset: () => {
    state = structuredClone(DEFAULTS);
    applyAll(); saveState();
    termWrite('all settings reset to default.', 'ok');
  },
  matrix: () => COMMANDS.mode(['matrix']),
  clear: () => { termBody.innerHTML = ''; },
  sudo:  () => termWrite('mecke is not in the sudoers file. this incident will be reported.', 'err'),
  exit:  () => termWrite('nice try. you\'re still on a website.', 'out'),
  hire:  () => COMMANDS.contact(),
};

function toggleEffect(name, arg) {
  const v = (arg || '').toLowerCase();
  let next = !state.effects[name];
  if (v === 'on')  next = true;
  if (v === 'off') next = false;
  state.effects[name] = next;
  applyEffects(); saveState();
  termWrite(name + ' → ' + (next ? 'on' : 'off'), 'ok');
}

const ALIASES = {
  'sudo hire mecke': 'hire',
  'rm -rf /':        () => termWrite('nope.', 'err'),
  'hello':           () => termWrite('hi.', 'hi'),
  'hi':              () => termWrite('hi.', 'hi'),
};

function runCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return;
  termWrite(trimmed, 'cmd');
  if (ALIASES[trimmed]) {
    const a = ALIASES[trimmed];
    if (typeof a === 'function') return a();
    return COMMANDS[a]();
  }
  /* support chaining: `theme cyber && font pixel` */
  if (trimmed.includes('&&')) {
    trimmed.split('&&').map(s => s.trim()).filter(Boolean).forEach(part => {
      const [cmd, ...args] = part.split(/\s+/);
      const fn = COMMANDS[cmd.toLowerCase()];
      if (fn) fn(args); else termWrite(cmd + ': command not found.', 'err');
    });
    return;
  }
  const [cmd, ...args] = trimmed.split(/\s+/);
  const fn = COMMANDS[cmd.toLowerCase()];
  if (fn) fn(args);
  else termWrite(cmd + ': command not found. type <span style="color:var(--accent)">help</span>.', 'err');
}

termInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const v = termInput.value;
    if (v.trim()) { history.unshift(v); histIdx = -1; }
    runCommand(v); termInput.value = '';
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (history.length && histIdx < history.length - 1) { histIdx++; termInput.value = history[histIdx]; }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (histIdx > 0) { histIdx--; termInput.value = history[histIdx]; }
    else { histIdx = -1; termInput.value = ''; }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const partial = termInput.value.toLowerCase();
    const match = Object.keys(COMMANDS).find(k => k.startsWith(partial));
    if (match) termInput.value = match;
  } else if (e.key === 'Escape') {
    termInput.value = '';
  }
});
document.getElementById('term').addEventListener('click', () => termInput.focus());

/* ────────────────────────────────────────────────────────────
   CONTACT FORM → MAILTO
   ──────────────────────────────────────────────────────────── */
document.getElementById('contact-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('cf-name').value.trim();
  const kind = document.getElementById('cf-kind').value.trim();
  const msg  = document.getElementById('cf-msg').value.trim();
  const subject = encodeURIComponent('build: ' + (kind || 'project inquiry'));
  const body = encodeURIComponent(
    'hey mecke,\n\n' + msg + '\n\n— ' + name +
    (kind ? '\n(re: ' + kind + ')' : '')
  );
  location.href = 'mailto:contact@mecke.dev?subject=' + subject + '&body=' + body;
});

/* ────────────────────────────────────────────────────────────
   KONAMI → matrix mode
   ──────────────────────────────────────────────────────────── */
const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let kIdx = 0;
addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === konami[kIdx]) {
    kIdx++;
    if (kIdx === konami.length) { kIdx = 0; COMMANDS.mode(['matrix']); }
  } else { kIdx = (k === konami[0]) ? 1 : 0; }
});

/* ────────────────────────────────────────────────────────────
   MATRIX RAIN
   ──────────────────────────────────────────────────────────── */
const canvas = document.getElementById('matrix-canvas');
const mctx = canvas.getContext('2d');
let drops = [], rafId = null;
function resizeMatrix() {
  canvas.width = innerWidth; canvas.height = innerHeight;
  drops = Array(Math.floor(canvas.width / 14)).fill(0).map(() => Math.random() * -50);
}
addEventListener('resize', resizeMatrix); resizeMatrix();
const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789';
function drawMatrix() {
  mctx.fillStyle = 'rgba(10,10,10,0.08)';
  mctx.fillRect(0, 0, canvas.width, canvas.height);
  const c = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8fd47f';
  mctx.fillStyle = c;
  mctx.font = '13px ' + getComputedStyle(document.documentElement).getPropertyValue('--font-mono');
  for (let i = 0; i < drops.length; i++) {
    const ch = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
    mctx.fillText(ch, i * 14, drops[i] * 14);
    if (drops[i] * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
    drops[i]++;
  }
  rafId = requestAnimationFrame(drawMatrix);
}
function startMatrix() { if (!rafId) drawMatrix(); }
function stopMatrix()  { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } mctx && mctx.clearRect(0,0,canvas.width,canvas.height); }

/* ────────────────────────────────────────────────────────────
   PHYSICS MODE
   ──────────────────────────────────────────────────────────── */
const PHYSICS_SELECTORS = [
  '.topbar',
  '.ascii-sig',
  '.headline',
  '.lede',
  '.term',
  '.term-hint',
  '.cta-row',
  '.filename',
  '.section-h',
  '.section-sub',
  '.listing-row',
  '.log-entry',
  '.contact-block',
  '.foot',
];

const GRAVITY = 0.55;
const BOUNCE = 0.5;
const FRICTION = 0.985;
const ANG_FRICTION = 0.95;

let physicsOn = false, bodies = [], physicsRaf = null;
let dragBody = null, dragOffset = { x: 0, y: 0 }, lastMouse = null;

function enablePhysics() {
  if (physicsOn) return;
  physicsOn = true;
  bodies = [];

  /* gather targets, dedupe */
  const seen = new Set();
  const targets = [];
  PHYSICS_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (seen.has(el)) return;
      seen.add(el);
      targets.push(el);
    });
  });

  targets.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const originalStyle = el.getAttribute('style') || '';
    el.classList.add('physics-target');
    el.setAttribute('style',
      'position: fixed !important;' +
      'top: ' + r.top + 'px !important;' +
      'left: ' + r.left + 'px !important;' +
      'width: ' + r.width + 'px !important;' +
      'height: ' + r.height + 'px !important;' +
      'right: auto !important;' +
      'bottom: auto !important;' +
      'margin: 0 !important;' +
      'z-index: 60;'
    );
    bodies.push({
      el, originalStyle,
      x: r.left, y: r.top,
      w: r.width, h: r.height,
      vx: (Math.random() - 0.5) * 3,
      vy: -2 - Math.random() * 4,
      angle: 0,
      vAngle: (Math.random() - 0.5) * 0.02,
      dragging: false,
    });
    el.addEventListener('mousedown', physicsMouseDown);
    el.addEventListener('touchstart', physicsTouchStart, { passive: false });
  });

  document.body.classList.add('physics-on');
  if (!physicsRaf) physicsLoop();
  setPhysicsToggleVisual(true);
}

function disablePhysics() {
  if (!physicsOn) return;
  physicsOn = false;
  if (physicsRaf) { cancelAnimationFrame(physicsRaf); physicsRaf = null; }
  if (dragBody) { dragBody.dragging = false; dragBody = null; }
  bodies.forEach(b => {
    b.el.classList.remove('physics-target');
    b.el.removeEventListener('mousedown', physicsMouseDown);
    b.el.removeEventListener('touchstart', physicsTouchStart);
    if (b.originalStyle) b.el.setAttribute('style', b.originalStyle);
    else b.el.removeAttribute('style');
  });
  bodies = [];
  document.body.classList.remove('physics-on');
  setPhysicsToggleVisual(false);
}

function physicsLoop() {
  if (!physicsOn) return;
  const W = innerWidth, H = innerHeight;
  for (const b of bodies) {
    if (b.dragging) continue;
    b.vy += GRAVITY;
    b.x += b.vx;
    b.y += b.vy;
    b.angle += b.vAngle;

    /* floor */
    if (b.y + b.h > H) {
      b.y = H - b.h;
      if (Math.abs(b.vy) > 0.6) b.vy *= -BOUNCE;
      else b.vy = 0;
      b.vx *= FRICTION;
      b.vAngle *= ANG_FRICTION;
      if (Math.abs(b.vx) < 0.05) b.vx = 0;
      if (Math.abs(b.vAngle) < 0.003) b.vAngle = 0;
    }
    /* walls */
    if (b.x < 0) { b.x = 0; b.vx *= -BOUNCE; b.vAngle += b.vy * 0.0008; }
    if (b.x + b.w > W) { b.x = W - b.w; b.vx *= -BOUNCE; b.vAngle -= b.vy * 0.0008; }

    b.el.style.left = b.x + 'px';
    b.el.style.top = b.y + 'px';
    b.el.style.transform = 'rotate(' + b.angle + 'rad)';
  }
  physicsRaf = requestAnimationFrame(physicsLoop);
}

function physicsMouseDown(e) {
  if (!physicsOn) return;
  const b = bodies.find(x => x.el === e.currentTarget);
  if (!b) return;
  e.preventDefault();
  dragBody = b;
  b.dragging = true;
  b.vx = b.vy = 0;
  b.vAngle *= 0.3;
  dragOffset.x = e.clientX - b.x;
  dragOffset.y = e.clientY - b.y;
  lastMouse = { x: e.clientX, y: e.clientY, t: performance.now() };
}
function physicsTouchStart(e) {
  if (!physicsOn) return;
  const t = e.touches[0]; if (!t) return;
  const b = bodies.find(x => x.el === e.currentTarget);
  if (!b) return;
  e.preventDefault();
  dragBody = b;
  b.dragging = true;
  b.vx = b.vy = 0;
  b.vAngle *= 0.3;
  dragOffset.x = t.clientX - b.x;
  dragOffset.y = t.clientY - b.y;
  lastMouse = { x: t.clientX, y: t.clientY, t: performance.now() };
}
window.addEventListener('mousemove', (e) => {
  if (!dragBody) return;
  const now = performance.now();
  const dt = Math.max(now - lastMouse.t, 8);
  dragBody.vx = (e.clientX - lastMouse.x) / dt * 16;
  dragBody.vy = (e.clientY - lastMouse.y) / dt * 16;
  dragBody.x = e.clientX - dragOffset.x;
  dragBody.y = e.clientY - dragOffset.y;
  dragBody.el.style.left = dragBody.x + 'px';
  dragBody.el.style.top = dragBody.y + 'px';
  lastMouse = { x: e.clientX, y: e.clientY, t: now };
});
window.addEventListener('touchmove', (e) => {
  if (!dragBody) return;
  const t = e.touches[0]; if (!t) return;
  e.preventDefault();
  const now = performance.now();
  const dt = Math.max(now - lastMouse.t, 8);
  dragBody.vx = (t.clientX - lastMouse.x) / dt * 16;
  dragBody.vy = (t.clientY - lastMouse.y) / dt * 16;
  dragBody.x = t.clientX - dragOffset.x;
  dragBody.y = t.clientY - dragOffset.y;
  dragBody.el.style.left = dragBody.x + 'px';
  dragBody.el.style.top = dragBody.y + 'px';
  lastMouse = { x: t.clientX, y: t.clientY, t: now };
}, { passive: false });

function endPhysicsDrag() {
  if (!dragBody) return;
  dragBody.dragging = false;
  /* clamp throw velocity so it doesn't fly to mars */
  const cap = 60;
  dragBody.vx = Math.max(-cap, Math.min(cap, dragBody.vx));
  dragBody.vy = Math.max(-cap, Math.min(cap, dragBody.vy));
  dragBody.vAngle = (Math.random() - 0.5) * 0.18;
  dragBody = null;
}
window.addEventListener('mouseup', endPhysicsDrag);
window.addEventListener('touchend', endPhysicsDrag);
window.addEventListener('touchcancel', endPhysicsDrag);

function shakeAll() {
  bodies.forEach(b => {
    b.vx = (Math.random() - 0.5) * 35;
    b.vy = -8 - Math.random() * 18;
    b.vAngle = (Math.random() - 0.5) * 0.15;
  });
}

/* clamp on resize so bodies stay reachable */
window.addEventListener('resize', () => {
  if (!physicsOn) return;
  bodies.forEach(b => {
    b.x = Math.max(0, Math.min(innerWidth - b.w, b.x));
    b.y = Math.max(0, Math.min(innerHeight - b.h, b.y));
  });
});

function setPhysicsToggleVisual(on) {
  const t = document.querySelector('#physics-toggle .toggle');
  if (t) t.classList.toggle('on', on);
}

document.getElementById('physics-toggle').addEventListener('click', () => {
  if (physicsOn) disablePhysics(); else enablePhysics();
});
document.getElementById('btn-shake').addEventListener('click', () => {
  if (!physicsOn) enablePhysics();
  shakeAll();
});

/* ────────────────────────────────────────────────────────────
   3D MODE — minecraft-style voxel world
   three.js loaded lazily on first activation
   ──────────────────────────────────────────────────────────── */
const THREE_CDN = 'https://unpkg.com/three@0.160.0/build/three.min.js';

let threeLoaded = false, sceneBuilt = false, threeOn = false;
let scene, camera, renderer, raycaster;
let blocksGroup;
let highlightMesh;
let confetti = [];
let skyTarget = null;
let victoryTriggered = false;
const player = {
  pos: null,           /* THREE.Vector3 — feet center */
  vel: null,
  yaw: 0,
  pitch: -0.18,
  grounded: false,
  height: 1.75,
  width: 0.55,
};
let walkPhase = 0;
let hotbarIndex = 0;
let pointerLocked = false;
let amberFound = 0, amberTotal = 0;
const worldBlocks = new Map();   /* "x,y,z" -> { mesh, type } */
const blockMaterials = {};
let _blockGeo;
let threeRaf = null, threeLastT = 0;
const keys = {};

const BLOCK_TYPES = {
  grass:  { color: 0x6db142,  name: 'grass'  },
  dirt:   { color: 0x8a5e2a,  name: 'dirt'   },
  stone:  { color: 0x7c7c86,  name: 'stone'  },
  sand:   { color: 0xe5d289,  name: 'sand'   },
  wood:   { color: 0x6a4a26,  name: 'wood'   },
  leaves: { color: 0x3a7a36,  name: 'leaves' },
  amber:  { color: 0xffae5c,  name: 'amber',  emissive: 0xff8a30, emissiveIntensity: 0.5 },
};
const HOTBAR_ORDER = ['grass','dirt','stone','sand','wood','leaves','amber'];
const blockKey = (x,y,z) => x + ',' + y + ',' + z;

function loadThree() {
  if (threeLoaded) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = THREE_CDN;
    s.onload  = () => { threeLoaded = true; res(); };
    s.onerror = () => rej(new Error('failed to load three.js'));
    document.head.appendChild(s);
  });
}

function getBlockMaterial(type) {
  if (blockMaterials[type]) return blockMaterials[type];
  const T = window.THREE;
  const def = BLOCK_TYPES[type];
  blockMaterials[type] = new T.MeshStandardMaterial({
    color: def.color,
    roughness: 0.92,
    metalness: 0.04,
    emissive: def.emissive || 0,
    emissiveIntensity: def.emissiveIntensity || 0,
    flatShading: true,
  });
  return blockMaterials[type];
}

function addBlock(x, y, z, type) {
  const T = window.THREE;
  const key = blockKey(x, y, z);
  if (worldBlocks.has(key)) return;
  if (!_blockGeo) _blockGeo = new T.BoxGeometry(1, 1, 1);
  const mesh = new T.Mesh(_blockGeo, getBlockMaterial(type));
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  mesh.userData = { bx: x, by: y, bz: z, type };
  blocksGroup.add(mesh);
  worldBlocks.set(key, { mesh, type });
}

function removeBlockAt(x, y, z) {
  const key = blockKey(x, y, z);
  const b = worldBlocks.get(key);
  if (!b) return null;
  blocksGroup.remove(b.mesh);
  worldBlocks.delete(key);
  return b.type;
}

function clearWorld() {
  blocksGroup.clear();
  worldBlocks.clear();
  amberFound = 0;
  amberTotal = 0;
}

function isSolid(x, y, z) { return worldBlocks.has(blockKey(x, y, z)); }

function placeTree(x, baseY, z) {
  for (let i = 0; i < 4; i++) addBlock(x, baseY + i, z, 'wood');
  const top = baseY + 3;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dy = 0; dy <= 2; dy++) {
        if (dx === 0 && dz === 0 && dy < 2) continue;            /* keep trunk */
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;  /* trim corners */
        if (dy === 2 && (Math.abs(dx) === 2 || Math.abs(dz) === 2)) continue;
        addBlock(x + dx, top + dy, z + dz, 'leaves');
      }
    }
  }
}

function generateWorld() {
  const SIZE = 30;
  const half = SIZE / 2;
  /* random seeds for terrain noise */
  const oxA = Math.random() * 200;
  const ozA = Math.random() * 200;
  const oxB = Math.random() * 200;
  const ozB = Math.random() * 200;
  const ampA = 1.5 + Math.random() * 1.4;
  const ampB = 1.0 + Math.random() * 0.9;
  const baseY = 2 + Math.floor(Math.random() * 3);
  const heightAt = (x, z) => Math.max(0, Math.floor(
    baseY +
    Math.sin((x + oxA) * 0.28) * ampA +
    Math.cos((z + ozA) * 0.34) * ampB +
    Math.sin((x + z + oxB) * 0.16) * 1.2 +
    Math.cos((x - z + ozB) * 0.22) * 0.7
  ));

  /* terrain columns — only keep top 5 layers per column for perf */
  for (let x = -half; x < half; x++) {
    for (let z = -half; z < half; z++) {
      const h = heightAt(x, z);
      const minY = Math.max(0, h - 4);
      for (let y = minY; y <= h; y++) {
        let type;
        if (y === h) type = h <= 1 ? 'sand' : 'grass';
        else if (y >= h - 2) type = 'dirt';
        else type = 'stone';
        addBlock(x, y, z, type);
      }
    }
  }

  /* random trees: avoid spawn (origin) and each other */
  const treeCount = 7 + Math.floor(Math.random() * 6);
  const treePositions = [];
  let attempts = 0;
  while (treePositions.length < treeCount && attempts < 120) {
    attempts++;
    const tx = Math.floor((Math.random() - 0.5) * (SIZE - 6));
    const tz = Math.floor((Math.random() - 0.5) * (SIZE - 6));
    if (Math.hypot(tx, tz) < 4) continue;          /* spawn buffer */
    if (treePositions.some(([x, z]) => Math.hypot(x - tx, z - tz) < 4)) continue;
    const h = heightAt(tx, tz);
    if (h <= 1) continue;                          /* skip beach */
    treePositions.push([tx, tz]);
    placeTree(tx, h + 1, tz);
  }

  /* random amber on surface, away from spawn and not buried in leaves */
  const targetAmber = 5 + Math.floor(Math.random() * 4);
  attempts = 0;
  while (amberTotal < targetAmber && attempts < 200) {
    attempts++;
    const ax = Math.floor((Math.random() - 0.5) * (SIZE - 4));
    const az = Math.floor((Math.random() - 0.5) * (SIZE - 4));
    if (Math.hypot(ax, az) < 3) continue;
    const ay = heightAt(ax, az) + 1;
    if (worldBlocks.has(blockKey(ax, ay, az))) continue;
    addBlock(ax, ay, az, 'amber');
    amberTotal++;
  }

  return heightAt;
}

function regenerateWorld() {
  clearWorld();
  clearConfetti();
  victoryTriggered = false;
  skyTarget = null;
  if (scene && scene.background) scene.background.set('#88c0e0');
  if (scene && scene.fog) scene.fog.color.set('#88c0e0');
  const vp = document.getElementById('three-victory');
  if (vp) vp.classList.remove('show');
  const heightAt = generateWorld();
  /* spawn above center, finding actual surface */
  const spawnH = heightAt(0, 0);
  player.pos.set(0.5, spawnH + 1.2, 0.5);
  player.vel.set(0, 0, 0);
  player.yaw = 0;
  player.pitch = -0.05;
  if (highlightMesh) highlightMesh.visible = false;
  updateHUD();
}

function spawnArch(cx, cy, cz) {
  /* 5-wide × 5-tall amber arch with an opening at center */
  const blocks = [
    /* left & right pillars (3 high) */
    [-2, 0, 0], [-2, 1, 0], [-2, 2, 0],
    [ 2, 0, 0], [ 2, 1, 0], [ 2, 2, 0],
    /* top span */
    [-2, 3, 0], [-1, 3, 0], [0, 3, 0], [1, 3, 0], [2, 3, 0],
    /* upper crown */
    [-1, 4, 0], [0, 4, 0], [1, 4, 0],
    /* peak */
    [0, 5, 0],
  ];
  for (const [dx, dy, dz] of blocks) {
    const x = cx + dx, y = cy + dy, z = cz + dz;
    if (worldBlocks.has(blockKey(x, y, z))) removeBlockAt(x, y, z);
    addBlock(x, y, z, 'amber');
  }
}

function spawnConfetti(originX, originY, originZ) {
  const T = window.THREE;
  const mat = getBlockMaterial('amber');
  const geo = new T.BoxGeometry(0.22, 0.22, 0.22);
  for (let i = 0; i < 50; i++) {
    const m = new T.Mesh(geo, mat);
    m.position.set(originX, originY, originZ);
    scene.add(m);
    const ang = Math.random() * Math.PI * 2;
    const spread = 3 + Math.random() * 5;
    confetti.push({
      mesh: m,
      vel: new T.Vector3(
        Math.cos(ang) * spread,
        9 + Math.random() * 5,
        Math.sin(ang) * spread
      ),
      angVel: new T.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ),
      life: 0,
      maxLife: 3.2 + Math.random() * 1.5,
    });
  }
}

function updateConfetti(dt) {
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.life += dt;
    c.vel.y -= 18 * dt;
    c.mesh.position.x += c.vel.x * dt;
    c.mesh.position.y += c.vel.y * dt;
    c.mesh.position.z += c.vel.z * dt;
    c.mesh.rotation.x += c.angVel.x * dt;
    c.mesh.rotation.y += c.angVel.y * dt;
    c.mesh.rotation.z += c.angVel.z * dt;
    if (c.life > c.maxLife || c.mesh.position.y < -10) {
      scene.remove(c.mesh);
      confetti.splice(i, 1);
    }
  }
}

function clearConfetti() {
  for (const c of confetti) scene.remove(c.mesh);
  confetti = [];
}

function triggerVictory() {
  if (victoryTriggered) return;
  victoryTriggered = true;
  /* find ground at spawn for arch base */
  let archY = 0;
  for (let y = 32; y >= 0; y--) {
    if (worldBlocks.has(blockKey(0, y, 0))) { archY = y + 1; break; }
  }
  spawnArch(0, archY, 0);
  spawnConfetti(player.pos.x, player.pos.y + 1.6, player.pos.z);
  /* sunset sky */
  const T = window.THREE;
  skyTarget = {
    bg:  new T.Color('#f7b06e'),
    fog: new T.Color('#f7b06e'),
  };
  /* release pointer lock so user can click reward panel */
  if (document.pointerLockElement) document.exitPointerLock();
  document.getElementById('three-victory').classList.add('show');
  show3DToast('all amber collected — monument raised at spawn', 3200);
}

function buildScene() {
  const T = window.THREE;
  const canvas = document.getElementById('three-canvas');
  const w = innerWidth, h = innerHeight;

  scene = new T.Scene();
  scene.background = new T.Color('#88c0e0');
  scene.fog = new T.Fog('#88c0e0', 32, 90);

  camera = new T.PerspectiveCamera(72, w / h, 0.1, 220);

  renderer = new T.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h, false);

  /* lights */
  scene.add(new T.AmbientLight(0xffffff, 0.45));
  const sun = new T.DirectionalLight(0xfff0d0, 0.95);
  sun.position.set(20, 30, 12);
  scene.add(sun);
  const back = new T.DirectionalLight(0xb0c4d0, 0.28);
  back.position.set(-12, 10, -10);
  scene.add(back);
  scene.add(new T.HemisphereLight(0x99c8e8, 0x554433, 0.45));

  blocksGroup = new T.Group();
  scene.add(blocksGroup);

  /* first-person camera order so yaw and pitch don't gimbal-lock */
  camera.rotation.order = 'YXZ';

  /* placeholder transform — actual spawn set by regenerateWorld */
  player.pos = new T.Vector3();
  player.vel = new T.Vector3();

  /* block highlight */
  highlightMesh = new T.LineSegments(
    new T.EdgesGeometry(new T.BoxGeometry(1.02, 1.02, 1.02)),
    new T.LineBasicMaterial({ color: 0x000000 })
  );
  highlightMesh.visible = false;
  scene.add(highlightMesh);

  raycaster = new T.Raycaster();
  raycaster.far = 6;

  /* hotbar UI */
  const hb = document.getElementById('three-hotbar');
  hb.innerHTML = HOTBAR_ORDER.map((t, i) => {
    const hex = '#' + BLOCK_TYPES[t].color.toString(16).padStart(6, '0');
    return '<div class="hb-slot' + (i === 0 ? ' on' : '') + '" data-i="' + i + '">' +
             '<div class="hb-color" style="background:' + hex + '"></div>' +
             '<div class="hb-name">' + t + '</div>' +
             '<div class="hb-num">' + (i + 1) + '</div>' +
           '</div>';
  }).join('');
  hb.querySelectorAll('.hb-slot').forEach(el => {
    el.addEventListener('click', (e) => {
      hotbarIndex = parseInt(el.dataset.i, 10);
      updateHUD();
      e.stopPropagation();
    });
  });

  sceneBuilt = true;
  updateHUD();
}

function updateHUD() {
  document.getElementById('three-score').textContent = amberFound + ' / ' + amberTotal;
  document.querySelectorAll('.three-hotbar .hb-slot').forEach((s, i) => {
    s.classList.toggle('on', i === hotbarIndex);
  });
}

function show3DToast(text, ms = 2000) {
  const el = document.getElementById('three-toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(show3DToast._t);
  show3DToast._t = setTimeout(() => el.classList.remove('show'), ms);
}

function playerCollidesAt(px, py, pz) {
  const w = player.width / 2;
  const h = player.height;
  const minX = Math.floor(px - w);
  const maxX = Math.floor(px + w - 0.0001);
  const minY = Math.floor(py);
  const maxY = Math.floor(py + h - 0.0001);
  const minZ = Math.floor(pz - w);
  const maxZ = Math.floor(pz + w - 0.0001);
  for (let x = minX; x <= maxX; x++)
    for (let y = minY; y <= maxY; y++)
      for (let z = minZ; z <= maxZ; z++)
        if (isSolid(x, y, z)) return true;
  return false;
}

function castFromHead() {
  const T = window.THREE;
  const dir = new T.Vector3();
  camera.getWorldDirection(dir);
  raycaster.set(camera.position, dir);
  raycaster.far = 6;
  const hits = raycaster.intersectObjects(blocksGroup.children, false);
  return hits.length ? hits[0] : null;
}

function mineBlock() {
  const hit = castFromHead();
  if (!hit) return;
  const ud = hit.object.userData;
  const type = removeBlockAt(ud.bx, ud.by, ud.bz);
  if (type === 'amber' && !victoryTriggered) {
    amberFound++;
    show3DToast('amber +1   (' + amberFound + ' / ' + amberTotal + ')', 1400);
    updateHUD();
    if (amberFound >= amberTotal && amberTotal > 0) {
      setTimeout(triggerVictory, 600);
    }
  }
}

function placeBlock() {
  const hit = castFromHead();
  if (!hit) return;
  const ud = hit.object.userData;
  const n = hit.face.normal;
  const x = ud.bx + Math.round(n.x);
  const y = ud.by + Math.round(n.y);
  const z = ud.bz + Math.round(n.z);
  /* don't place inside player AABB */
  const px = player.pos.x, py = player.pos.y, pz = player.pos.z;
  const w = player.width / 2;
  const overlapsPlayer =
    x + 1 > px - w && x < px + w &&
    y + 1 > py     && y < py + player.height &&
    z + 1 > pz - w && z < pz + w;
  if (overlapsPlayer) return;
  addBlock(x, y, z, HOTBAR_ORDER[hotbarIndex]);
}

function updateHighlight() {
  const hit = castFromHead();
  if (!hit) { highlightMesh.visible = false; return; }
  highlightMesh.position.copy(hit.object.position);
  highlightMesh.visible = true;
}

function threeStep(now) {
  if (!threeOn) return;
  const dt = Math.min((now - threeLastT) / 1000, 0.05);
  threeLastT = now;

  const T = window.THREE;
  const moveSpeed = 4.6;
  let mx = 0, mz = 0;
  if (keys['w'] || keys['arrowup'])    mz -= 1;
  if (keys['s'] || keys['arrowdown'])  mz += 1;
  if (keys['a'] || keys['arrowleft'])  mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  const moving = (mx !== 0 || mz !== 0);
  if (moving) {
    const len = Math.hypot(mx, mz);
    mx /= len; mz /= len;
  }

  /* rotate input by yaw. forward (-Z at yaw=0) = (-sin(yaw), -cos(yaw)).
     world = forward*(-mz) + right*mx, with right = (cos(yaw), -sin(yaw)). */
  let wx = 0, wz = 0;
  if (moving) {
    const cy = Math.cos(player.yaw), sy = Math.sin(player.yaw);
    wx =  mx * cy + mz * sy;
    wz = -mx * sy + mz * cy;
  }

  /* jump */
  if (keys[' '] && player.grounded) {
    player.vel.y = 8.5;
    player.grounded = false;
  }
  player.vel.y -= 26 * dt;

  /* axis-by-axis collision */
  const stepX = wx * moveSpeed * dt;
  const stepZ = wz * moveSpeed * dt;
  const stepY = player.vel.y * dt;

  let nx = player.pos.x + stepX;
  if (!playerCollidesAt(nx, player.pos.y, player.pos.z)) player.pos.x = nx;
  let nz = player.pos.z + stepZ;
  if (!playerCollidesAt(player.pos.x, player.pos.y, nz)) player.pos.z = nz;
  let ny = player.pos.y + stepY;
  if (!playerCollidesAt(player.pos.x, ny, player.pos.z)) {
    player.pos.y = ny;
    if (player.vel.y < 0) player.grounded = false;
  } else {
    if (player.vel.y < 0) player.grounded = true;
    player.vel.y = 0;
  }

  /* fall protection */
  if (player.pos.y < -8) {
    player.pos.set(0.5, 14, 0.5);
    player.vel.set(0, 0, 0);
  }

  /* first-person camera: position at head height, rotate by yaw + pitch */
  camera.position.set(player.pos.x, player.pos.y + 1.65, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, 0);

  /* head bob while walking on ground */
  if (moving && player.grounded) {
    walkPhase += dt * 9;
    camera.position.y += Math.sin(walkPhase * 2) * 0.04;
  } else {
    walkPhase *= Math.pow(0.0001, dt);
  }

  /* confetti + sky lerp */
  if (confetti.length) updateConfetti(dt);
  if (skyTarget) {
    scene.background.lerp(skyTarget.bg, 0.04);
    scene.fog.color.lerp(skyTarget.fog, 0.04);
  }

  updateHighlight();
  renderer.render(scene, camera);
  threeRaf = requestAnimationFrame(threeStep);
}

async function enable3D() {
  if (threeOn) return;
  document.body.classList.add('three-on');
  closeCfg();
  document.getElementById('three-loading').style.display = 'flex';
  try {
    await loadThree();
  } catch (e) {
    show3DToast('couldn\'t load 3d engine. try again later.', 3000);
    setTimeout(disable3D, 1500);
    return;
  }
  if (!sceneBuilt) buildScene();
  regenerateWorld();
  document.getElementById('three-loading').style.display = 'none';
  threeOn = true;
  threeLastT = performance.now();
  threeRaf = requestAnimationFrame(threeStep);
  show3DToast('click canvas to capture mouse · WASD to move · LMB mine · RMB place', 3200);
}

function disable3D() {
  if (!threeOn) return;
  threeOn = false;
  if (threeRaf) cancelAnimationFrame(threeRaf);
  threeRaf = null;
  if (document.pointerLockElement) document.exitPointerLock();
  document.body.classList.remove('three-on');
  for (const k in keys) keys[k] = false;
}

/* ── 3D inputs ── */
addEventListener('keydown', (e) => {
  if (!threeOn) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') {
    /* if mouse is captured, browser auto-releases. otherwise exit world */
    if (!document.pointerLockElement) { e.preventDefault(); disable3D(); }
    return;
  }
  keys[k] = true;
  if (k >= '1' && k <= '7') {
    hotbarIndex = parseInt(k, 10) - 1;
    updateHUD();
  }
  if ([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault();
});
addEventListener('keyup', (e) => {
  if (!threeOn) return;
  keys[e.key.toLowerCase()] = false;
});

/* mouse — pointer lock for FPS-style camera */
document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === document.getElementById('three-canvas');
});
addEventListener('mousemove', (e) => {
  if (!threeOn || !pointerLocked) return;
  player.yaw   -= e.movementX * 0.0024;
  player.pitch -= e.movementY * 0.0024;
  player.pitch = Math.max(-1.2, Math.min(1.2, player.pitch));
});

/* canvas mousedown: first click captures pointer; subsequent clicks act */
addEventListener('mousedown', (e) => {
  if (!threeOn) return;
  if (e.target.id !== 'three-canvas') return;
  if (!pointerLocked) {
    document.getElementById('three-canvas').requestPointerLock();
    return;
  }
  e.preventDefault();
  if (e.button === 0) mineBlock();
  else if (e.button === 2) placeBlock();
});
addEventListener('contextmenu', (e) => {
  if (threeOn && e.target.id === 'three-canvas') e.preventDefault();
});

/* mouse wheel — cycle hotbar */
addEventListener('wheel', (e) => {
  if (!threeOn) return;
  if (e.target.id !== 'three-canvas' && !pointerLocked) return;
  e.preventDefault();
  const dir = e.deltaY > 0 ? 1 : -1;
  hotbarIndex = (hotbarIndex + dir + HOTBAR_ORDER.length) % HOTBAR_ORDER.length;
  updateHUD();
}, { passive: false });

addEventListener('resize', () => {
  if (!threeOn || !renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
});

document.getElementById('btn-3d').addEventListener('click', enable3D);
document.getElementById('three-exit').addEventListener('click', disable3D);
document.getElementById('three-victory-close').addEventListener('click', () => {
  document.getElementById('three-victory').classList.remove('show');
});
document.getElementById('btn-pc').addEventListener('click', enablePC);
document.getElementById('pc-exit').addEventListener('click', disablePC);

/* feature playground cards on the hero */
document.querySelectorAll('.feat-card').forEach((card) => {
  const launch = () => {
    const what = card.dataset.launch;
    if (what === '3d')          enable3D();
    else if (what === 'pc')     enablePC();
    else if (what === 'wordle') enableGame('wordle');
    else if (what === 'sudoku') enableGame('sudoku');
    else if (what === 'g2048')  enableGame('g2048');
    else if (what === 'memory') enableGame('memory');
    else if (what === 'csguess') enableGame('csguess');
    else if (what === 'synthlab') enableGame('synthlab');
    else if (what === 'physics') {
      if (!physicsOn) enablePhysics();
      else { disablePhysics(); enablePhysics(); }
    }
  };
  card.addEventListener('click', launch);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(); }
  });
});

/* ────────────────────────────────────────────────────────────
   PC / DESKTOP SIMULATOR
   ──────────────────────────────────────────────────────────── */
let pcOn = false;
let pcZTop = 100;
const pcWindows = new Map(); // id → { el, app, title, minimized }
let pcWinSeq = 0;
let pcClockTimer = null;
const pcStartTime = Date.now();

const FS = {
  '/': { type: 'dir', children: ['home', 'etc', 'var', 'README.txt'] },
  '/home': { type: 'dir', children: ['mecke'] },
  '/home/mecke': { type: 'dir', children: ['Documents', 'Projects', 'notes.txt', 'TODO.md', '.bashrc'] },
  '/home/mecke/Documents': { type: 'dir', children: ['intro.txt', 'pricing.txt'] },
  '/home/mecke/Projects': { type: 'dir', children: ['cs-translator', 'vorsorge', 'pin-platform', 'easter-eggs'] },
  '/home/mecke/Projects/cs-translator': { type: 'dir', children: ['README.md'] },
  '/home/mecke/Projects/vorsorge':       { type: 'dir', children: ['README.md'] },
  '/home/mecke/Projects/pin-platform':   { type: 'dir', children: ['README.md'] },
  '/home/mecke/Projects/easter-eggs':    { type: 'dir', children: ['README.md'] },
  '/etc': { type: 'dir', children: ['os-release', 'hostname'] },
  '/var': { type: 'dir', children: ['log'] },
  '/var/log': { type: 'dir', children: ['boot.log'] },

  '/README.txt': { type: 'file', body:
    "MECKE OS v1.0\n" +
    "─────────────\n\n" +
    "this is a sandbox desktop running entirely in your browser.\n" +
    "double-click any folder to open it. double-click a text file\n" +
    "to read it in notepad. windows are draggable and resizable.\n\n" +
    "if you got here looking for the real me:\n" +
    "  contact@mecke.dev · https://mecke.dev\n"
  },
  '/home/mecke/notes.txt': { type: 'file', body:
    "// random notes\n\n" +
    "- finish the voxel reward arch shader\n" +
    "- add second easter egg to the desktop sim\n" +
    "- the pin platform filter logic could be simpler\n" +
    "- write up the cs translator architecture\n"
  },
  '/home/mecke/TODO.md': { type: 'file', body:
    "# TODO\n\n" +
    "- [x] terminal\n" +
    "- [x] physics mode\n" +
    "- [x] voxel world\n" +
    "- [x] desktop simulator\n" +
    "- [ ] something even weirder\n"
  },
  '/home/mecke/.bashrc': { type: 'file', body:
    "# minimal bashrc for the sandbox\n" +
    "export PS1='mecke@os:\\w$ '\n" +
    "alias ll='ls -la'\n" +
    "alias hi='echo hello, friend'\n"
  },
  '/home/mecke/Documents/intro.txt': { type: 'file', body:
    "I'm a self-taught technical generalist focused on automation,\n" +
    "tooling, real-time systems, and AI-assisted workflows.\n\n" +
    "If you have a thing that needs to be built — a script, a desktop\n" +
    "tool, a real-time parser, a small website — I can probably build it.\n\n" +
    "contact@mecke.dev\n"
  },
  '/home/mecke/Documents/pricing.txt': { type: 'file', body:
    "no retainers, no monthly minimums.\n" +
    "one-off projects, paid by scope.\n\n" +
    "websites:        3d – 3wk\n" +
    "scripts:         hours – days\n" +
    "desktop apps:    2 – 6wk\n" +
    "realtime tools:  1 – 3wk\n" +
    "ai workflows:    1 – 4wk\n" +
    "weird stuff:     ask\n"
  },
  '/home/mecke/Projects/cs-translator/README.md': { type: 'file', body:
    "# cs-translator\n\n" +
    "real-time chat translator for counter-strike. tails the game's\n" +
    "console log, parses incoming chat, translates on the fly,\n" +
    "displays in a desktop overlay. event-driven, no polling.\n"
  },
  '/home/mecke/Projects/vorsorge/README.md': { type: 'file', body:
    "# vorsorge\n\n" +
    "tauri + svelte desktop app. cross-platform, lean, native feel.\n" +
    "modern frontend wired to a rust backend.\n"
  },
  '/home/mecke/Projects/pin-platform/README.md': { type: 'file', body:
    "# pin-platform\n\n" +
    "collection tracking platform. filtering, sponsor integration,\n" +
    "responsive layout, dynamic UI components.\n"
  },
  '/home/mecke/Projects/easter-eggs/README.md': { type: 'file', body:
    "# easter-eggs\n\n" +
    "structured documentation system. ontology-shaped notes for\n" +
    "games, devs, locations, easter eggs, and media relationships.\n"
  },
  '/etc/os-release': { type: 'file', body:
    "NAME=\"MECKE OS\"\n" +
    "VERSION=\"1.0 (sandbox)\"\n" +
    "PRETTY_NAME=\"MECKE OS 1.0 — built as a tiny static bundle\"\n" +
    "HOME_URL=\"https://mecke.dev\"\n"
  },
  '/etc/hostname': { type: 'file', body: "mecke-sandbox\n" },
  '/var/log/boot.log': { type: 'file', body:
    "[ ok ] mounting /\n" +
    "[ ok ] starting window manager\n" +
    "[ ok ] starting taskbar\n" +
    "[ ok ] loaded 5 apps\n" +
    "[ ok ] desktop ready\n"
  }
};

function fsResolve(path) {
  if (!path.startsWith('/')) path = '/' + path;
  path = path.replace(/\/+/g, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}
function fsParent(path) {
  path = fsResolve(path);
  if (path === '/') return '/';
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}
function fsJoin(parent, child) {
  parent = fsResolve(parent);
  if (parent === '/') return '/' + child;
  return parent + '/' + child;
}
function fsBase(path) {
  path = fsResolve(path);
  if (path === '/') return '/';
  return path.slice(path.lastIndexOf('/') + 1);
}
function fsGet(path) { return FS[fsResolve(path)]; }

function pcRenderTaskbar() {
  const wrap = document.getElementById('pc-tb-tasks');
  if (!wrap) return;
  wrap.innerHTML = '';
  pcWindows.forEach((w, id) => {
    const b = document.createElement('button');
    b.className = 'pc-tb-task' + (!w.minimized && w.el.classList.contains('focused') ? ' active' : '');
    b.textContent = w.title;
    b.title = w.title;
    b.addEventListener('click', () => {
      if (w.minimized) {
        w.minimized = false;
        w.el.classList.remove('minimized');
        pcFocusWindow(id);
      } else if (w.el.classList.contains('focused')) {
        w.minimized = true;
        w.el.classList.add('minimized');
        pcRenderTaskbar();
      } else {
        pcFocusWindow(id);
      }
    });
    wrap.appendChild(b);
  });
}

function pcFocusWindow(id) {
  pcWindows.forEach((w) => w.el.classList.remove('focused'));
  const w = pcWindows.get(id);
  if (!w) return;
  pcZTop += 1;
  w.el.style.zIndex = pcZTop;
  w.el.classList.add('focused');
  pcRenderTaskbar();
}

function pcCloseWindow(id) {
  const w = pcWindows.get(id);
  if (!w) return;
  if (w.onClose) try { w.onClose(); } catch (_) {}
  w.el.remove();
  pcWindows.delete(id);
  pcRenderTaskbar();
}

function pcCreateWindow({ title, width = 460, height = 320, x, y, content, app, onClose }) {
  const id = 'win-' + (++pcWinSeq);
  const root = document.getElementById('pc-windows');
  if (!root) return null;
  const stage = document.getElementById('pc-stage');
  const stageRect = stage.getBoundingClientRect();
  const desktopH = stageRect.height - 38; // taskbar
  if (x === undefined) x = 60 + (pcWinSeq * 24) % 200;
  if (y === undefined) y = 40 + (pcWinSeq * 24) % 140;
  width  = Math.min(width,  Math.max(280, stageRect.width  - 40));
  height = Math.min(height, Math.max(180, desktopH - 40));

  const el = document.createElement('div');
  el.className = 'pc-window';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.width = width + 'px';
  el.style.height = height + 'px';
  el.dataset.id = id;
  el.innerHTML =
    '<div class="pc-titlebar">' +
      '<span class="title"></span>' +
      '<button class="tb-btn min" title="minimize">_</button>' +
      '<button class="tb-btn close" title="close">x</button>' +
    '</div>' +
    '<div class="pc-content"></div>' +
    '<div class="pc-resize"></div>';

  el.querySelector('.title').textContent = title;
  const contentEl = el.querySelector('.pc-content');
  if (typeof content === 'string') contentEl.innerHTML = content;
  else if (content instanceof Node) contentEl.appendChild(content);

  root.appendChild(el);
  const win = { el, app, title, minimized: false, onClose };
  pcWindows.set(id, win);

  el.addEventListener('mousedown', () => pcFocusWindow(id));
  el.querySelector('.pc-titlebar').addEventListener('mousedown', (e) => {
    if (e.target.closest('.tb-btn')) return;
    pcStartDrag(e, el);
  });
  el.querySelector('.pc-resize').addEventListener('mousedown', (e) => pcStartResize(e, el));
  el.querySelector('.tb-btn.close').addEventListener('click', (e) => {
    e.stopPropagation();
    pcCloseWindow(id);
  });
  el.querySelector('.tb-btn.min').addEventListener('click', (e) => {
    e.stopPropagation();
    win.minimized = true;
    el.classList.add('minimized');
    pcRenderTaskbar();
  });

  pcFocusWindow(id);
  return { id, el, contentEl, win };
}

function pcStartDrag(e, el) {
  e.preventDefault();
  const stage = document.getElementById('pc-stage').getBoundingClientRect();
  const startX = e.clientX, startY = e.clientY;
  const ox = parseInt(el.style.left, 10) || 0;
  const oy = parseInt(el.style.top, 10) || 0;
  const onMove = (ev) => {
    let nx = ox + (ev.clientX - startX);
    let ny = oy + (ev.clientY - startY);
    nx = Math.max(0, Math.min(stage.width  - 60, nx));
    ny = Math.max(0, Math.min(stage.height - 60, ny));
    el.style.left = nx + 'px';
    el.style.top  = ny + 'px';
  };
  const onUp = () => {
    removeEventListener('mousemove', onMove);
    removeEventListener('mouseup', onUp);
  };
  addEventListener('mousemove', onMove);
  addEventListener('mouseup', onUp);
}

function pcStartResize(e, el) {
  e.preventDefault();
  e.stopPropagation();
  const startX = e.clientX, startY = e.clientY;
  const ow = el.offsetWidth, oh = el.offsetHeight;
  const onMove = (ev) => {
    el.style.width  = Math.max(280, ow + (ev.clientX - startX)) + 'px';
    el.style.height = Math.max(180, oh + (ev.clientY - startY)) + 'px';
  };
  const onUp = () => {
    removeEventListener('mousemove', onMove);
    removeEventListener('mouseup', onUp);
  };
  addEventListener('mousemove', onMove);
  addEventListener('mouseup', onUp);
}

/* ── App: Files ───────────────────────────────────── */
function buildFilesApp(initialPath) {
  const wrap = document.createElement('div');
  wrap.className = 'fe-wrap';
  wrap.innerHTML =
    '<div class="fe-bar">' +
      '<button class="fe-up" title="up">↑</button>' +
      '<div class="fe-path"></div>' +
    '</div>' +
    '<div class="fe-list"></div>';
  const pathEl = wrap.querySelector('.fe-path');
  const listEl = wrap.querySelector('.fe-list');
  const upBtn  = wrap.querySelector('.fe-up');
  let cwd = initialPath || '/home/mecke';

  function render() {
    cwd = fsResolve(cwd);
    const node = fsGet(cwd);
    pathEl.textContent = cwd;
    listEl.innerHTML = '';
    if (!node || node.type !== 'dir') {
      listEl.innerHTML = '<div class="fe-empty">not a directory</div>';
      return;
    }
    if (!node.children.length) {
      listEl.innerHTML = '<div class="fe-empty">(empty)</div>';
      return;
    }
    const sorted = node.children.slice().sort((a, b) => {
      const na = fsGet(fsJoin(cwd, a)), nb = fsGet(fsJoin(cwd, b));
      const da = na && na.type === 'dir' ? 0 : 1;
      const db = nb && nb.type === 'dir' ? 0 : 1;
      if (da !== db) return da - db;
      return a.localeCompare(b);
    });
    sorted.forEach((name) => {
      const full = fsJoin(cwd, name);
      const child = fsGet(full);
      const kind = child && child.type === 'dir' ? 'dir' : 'file';
      const row = document.createElement('div');
      row.className = 'fe-row';
      row.dataset.kind = kind;
      const ico = kind === 'dir' ? '[D]' : '·';
      const size = kind === 'file'
        ? (child.body ? child.body.length + ' B' : '0 B')
        : '—';
      row.innerHTML =
        '<div class="fe-ico">' + ico + '</div>' +
        '<div class="fe-name"></div>' +
        '<div class="fe-meta">' + (kind === 'dir' ? 'folder' : 'text') + '</div>' +
        '<div class="fe-size">' + size + '</div>';
      row.querySelector('.fe-name').textContent = name;
      let lastClick = 0;
      row.addEventListener('click', () => {
        listEl.querySelectorAll('.fe-row.selected').forEach((r) => r.classList.remove('selected'));
        row.classList.add('selected');
        const now = Date.now();
        if (now - lastClick < 350) {
          if (kind === 'dir') { cwd = full; render(); }
          else pcOpenFile(full);
        }
        lastClick = now;
      });
      listEl.appendChild(row);
    });
  }

  upBtn.addEventListener('click', () => { cwd = fsParent(cwd); render(); });
  render();
  return wrap;
}

function pcOpenFile(path) {
  const node = fsGet(path);
  if (!node || node.type !== 'file') return;
  pcCreateWindow({
    title: 'Notepad — ' + fsBase(path),
    width: 520, height: 380,
    content: buildNotepadApp(path, node.body),
    app: 'notepad'
  });
}

/* ── App: Calculator ─────────────────────────────── */
function buildCalcApp() {
  const wrap = document.createElement('div');
  wrap.className = 'calc-wrap';
  wrap.innerHTML =
    '<div class="calc-pre"></div>' +
    '<div class="calc-display">0</div>' +
    '<div class="calc-grid"></div>';
  const pre  = wrap.querySelector('.calc-pre');
  const disp = wrap.querySelector('.calc-display');
  const grid = wrap.querySelector('.calc-grid');

  let cur = '0', prev = null, op = null, justEvaled = false;

  function show() { disp.textContent = cur; }
  function showPre() {
    pre.textContent = (prev !== null && op) ? (prev + ' ' + op) : '';
  }
  function pushDigit(d) {
    if (justEvaled) { cur = '0'; justEvaled = false; }
    if (cur === '0' && d !== '.') cur = d;
    else if (d === '.' && cur.indexOf('.') !== -1) return;
    else cur += d;
    show();
  }
  function setOp(o) {
    if (op && prev !== null && !justEvaled) {
      compute();
    }
    prev = parseFloat(cur);
    op = o;
    justEvaled = true;
    showPre();
  }
  function compute() {
    if (prev === null || op === null) return;
    const a = prev, b = parseFloat(cur);
    let r = 0;
    switch (op) {
      case '+': r = a + b; break;
      case '-': r = a - b; break;
      case '×': r = a * b; break;
      case '÷': r = b === 0 ? NaN : a / b; break;
    }
    if (!isFinite(r)) cur = 'ERR';
    else cur = String(Math.round(r * 1e10) / 1e10);
    prev = null; op = null;
    justEvaled = true;
    showPre();
    show();
  }
  function clearAll() { cur = '0'; prev = null; op = null; justEvaled = false; show(); showPre(); }
  function backspace() {
    if (justEvaled) { clearAll(); return; }
    cur = cur.length > 1 ? cur.slice(0, -1) : '0';
    show();
  }

  const layout = [
    ['C','←','%','÷'],
    ['7','8','9','×'],
    ['4','5','6','-'],
    ['1','2','3','+'],
    ['±','0','.','=']
  ];
  layout.flat().forEach((label) => {
    const b = document.createElement('button');
    b.className = 'calc-btn';
    b.textContent = label;
    if (['÷','×','-','+'].includes(label)) b.classList.add('op');
    if (label === '=') b.classList.add('eq');
    if (['C','←','%','±'].includes(label)) b.classList.add('fn');
    b.addEventListener('click', () => {
      if (label === 'C') clearAll();
      else if (label === '←') backspace();
      else if (label === '=') compute();
      else if (['+','-','×','÷'].includes(label)) setOp(label);
      else if (label === '%') {
        cur = String(parseFloat(cur) / 100);
        justEvaled = true; show();
      }
      else if (label === '±') {
        if (cur !== '0') cur = cur.startsWith('-') ? cur.slice(1) : '-' + cur;
        show();
      }
      else pushDigit(label);
    });
    grid.appendChild(b);
  });

  show(); showPre();
  return wrap;
}

/* ── App: Notepad ────────────────────────────────── */
function buildNotepadApp(path, body) {
  const wrap = document.createElement('div');
  wrap.className = 'np-wrap';
  wrap.innerHTML =
    '<div class="np-bar">' +
      '<input type="text" class="np-name" />' +
      '<button class="np-save">save</button>' +
    '</div>' +
    '<textarea class="np-area" spellcheck="false"></textarea>';
  const nameEl = wrap.querySelector('.np-name');
  const saveBtn = wrap.querySelector('.np-save');
  const area = wrap.querySelector('.np-area');
  nameEl.value = path || '/home/mecke/untitled.txt';
  area.value = body !== undefined ? body : '';
  saveBtn.addEventListener('click', () => {
    const p = fsResolve(nameEl.value || '/home/mecke/untitled.txt');
    const parent = fsParent(p);
    const parentNode = fsGet(parent);
    if (!parentNode || parentNode.type !== 'dir') {
      saveBtn.textContent = 'no such dir';
      setTimeout(() => saveBtn.textContent = 'save', 1200);
      return;
    }
    const base = fsBase(p);
    if (!parentNode.children.includes(base)) parentNode.children.push(base);
    FS[p] = { type: 'file', body: area.value };
    saveBtn.textContent = 'saved';
    setTimeout(() => saveBtn.textContent = 'save', 1000);
  });
  return wrap;
}

/* ── App: Terminal (in-window) ───────────────────── */
function buildTerminalApp() {
  const wrap = document.createElement('div');
  wrap.className = 'pcterm-wrap';
  wrap.innerHTML =
    '<div class="pcterm-out"></div>' +
    '<div class="pcterm-in"><span class="ps">mecke@os:/home/mecke$</span><input type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"/></div>';
  const out = wrap.querySelector('.pcterm-out');
  const ps  = wrap.querySelector('.ps');
  const inp = wrap.querySelector('input');
  let cwd = '/home/mecke';
  const history = [];
  let hi = -1;

  function write(text, cls) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.textContent = text;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }
  function setPs() { ps.textContent = 'mecke@os:' + cwd + '$'; }

  write('MECKE OS sandbox shell. type `help` for commands.', 'dim');
  setPs();

  const cmds = {
    help: () => {
      write('available: help, ls, cd, cat, pwd, echo, whoami, date, uptime, clear, exit', 'acc');
    },
    ls: (args) => {
      const target = args[0] ? resolveRel(args[0]) : cwd;
      const node = fsGet(target);
      if (!node) { write('ls: no such path: ' + target, 'err'); return; }
      if (node.type === 'file') { write(fsBase(target)); return; }
      const items = node.children.slice().sort();
      items.forEach((c) => {
        const child = fsGet(fsJoin(target, c));
        const isDir = child && child.type === 'dir';
        write((isDir ? '[D] ' : '    ') + c, isDir ? 'acc' : null);
      });
    },
    cd: (args) => {
      if (!args[0] || args[0] === '~') { cwd = '/home/mecke'; setPs(); return; }
      const t = resolveRel(args[0]);
      const n = fsGet(t);
      if (!n) { write('cd: no such path: ' + t, 'err'); return; }
      if (n.type !== 'dir') { write('cd: not a directory: ' + t, 'err'); return; }
      cwd = t;
      setPs();
    },
    cat: (args) => {
      if (!args[0]) { write('cat: missing path', 'err'); return; }
      const t = resolveRel(args[0]);
      const n = fsGet(t);
      if (!n) { write('cat: no such file: ' + t, 'err'); return; }
      if (n.type !== 'file') { write('cat: is a directory: ' + t, 'err'); return; }
      n.body.split('\n').forEach((line) => write(line));
    },
    pwd: () => write(cwd),
    echo: (args) => write(args.join(' ')),
    whoami: () => write('mecke', 'ok'),
    date: () => write(new Date().toString()),
    uptime: () => {
      const s = Math.floor((Date.now() - pcStartTime) / 1000);
      const m = Math.floor(s / 60), ss = s % 60;
      write('up ' + m + 'm ' + String(ss).padStart(2, '0') + 's', 'ok');
    },
    clear: () => { out.innerHTML = ''; },
    exit: () => {
      const winEl = wrap.closest('.pc-window');
      if (winEl) pcCloseWindow(winEl.dataset.id);
    }
  };

  function resolveRel(p) {
    if (p.startsWith('/')) return fsResolve(p);
    if (p === '..') return fsParent(cwd);
    if (p === '.')  return cwd;
    return fsResolve(fsJoin(cwd, p));
  }

  function run(line) {
    write('mecke@os:' + cwd + '$ ' + line, 'dim');
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);
    if (!cmd) return;
    if (cmds[cmd]) cmds[cmd](args);
    else write(cmd + ': command not found. try `help`.', 'err');
  }

  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const line = inp.value;
      if (line.trim()) { history.push(line); hi = history.length; }
      inp.value = '';
      run(line);
    } else if (e.key === 'ArrowUp') {
      if (history.length === 0) return;
      hi = Math.max(0, hi - 1);
      inp.value = history[hi] || '';
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (history.length === 0) return;
      hi = Math.min(history.length, hi + 1);
      inp.value = history[hi] || '';
      e.preventDefault();
    }
  });

  setTimeout(() => inp.focus(), 30);
  return wrap;
}

/* ── App: About ──────────────────────────────────── */
function buildAboutApp() {
  const wrap = document.createElement('div');
  wrap.className = 'about-wrap';
  const upS = Math.floor((Date.now() - pcStartTime) / 1000);
  const upMin = Math.floor(upS / 60), upSec = upS % 60;
  wrap.innerHTML =
    '<h3>MECKE OS · v1.0</h3>' +
    '<div class="row"><span class="k">codename</span><span class="v">static sandbox</span></div>' +
    '<div class="row"><span class="k">kernel</span><span class="v">browser</span></div>' +
    '<div class="row"><span class="k">renderer</span><span class="v">DOM + CSS</span></div>' +
    '<div class="row"><span class="k">memory</span><span class="v">whatever your tab has</span></div>' +
    '<div class="row"><span class="k">cpu</span><span class="v">your machine</span></div>' +
    '<div class="row"><span class="k">uptime</span><span class="v" id="about-uptime">' + upMin + 'm ' + String(upSec).padStart(2, '0') + 's</span></div>' +
    '<hr/>' +
    '<div class="row"><span class="k">author</span><span class="v"><a href="https://mecke.dev" target="_blank">mecke.dev</a></span></div>' +
    '<div class="row"><span class="k">contact</span><span class="v"><a href="mailto:contact@mecke.dev">contact@mecke.dev</a></span></div>' +
    '<div class="credit">need a thing built? open the terminal app and type <span style="color:var(--accent)">cat /README.txt</span>.</div>';
  return wrap;
}

/* ── App launcher / clock ────────────────────────── */
function pcLaunchApp(app) {
  if (app === 'files') {
    pcCreateWindow({ title: 'Files — /home/mecke', width: 520, height: 380, content: buildFilesApp('/home/mecke'), app });
  } else if (app === 'calc') {
    pcCreateWindow({ title: 'Calculator', width: 280, height: 360, content: buildCalcApp(), app });
  } else if (app === 'notepad') {
    pcCreateWindow({ title: 'Notepad — untitled.txt', width: 520, height: 380, content: buildNotepadApp('/home/mecke/untitled.txt', ''), app });
  } else if (app === 'paint') {
    pcCreateWindow({ title: 'Paint', width: 540, height: 420, content: buildPaintApp(), app });
  } else if (app === 'synth') {
    const s = buildSynthApp();
    pcCreateWindow({ title: 'Synth Pad', width: 560, height: 360, content: s.el, app, onClose: s.cleanup });
  } else if (app === 'snake') {
    const snake = buildSnakeApp();
    pcCreateWindow({ title: 'Snake', width: 320, height: 380, content: snake.el, app, onClose: snake.cleanup });
  } else if (app === 'mines') {
    pcCreateWindow({ title: 'Minesweeper', width: 280, height: 340, content: buildMinesApp(), app });
  } else if (app === 'terminal') {
    pcCreateWindow({ title: 'Terminal', width: 560, height: 360, content: buildTerminalApp(), app });
  } else if (app === 'about') {
    pcCreateWindow({ title: 'About this OS', width: 380, height: 360, content: buildAboutApp(), app });
  }
}

/* ── App: Paint ──────────────────────────────────── */
function buildPaintApp() {
  const wrap = document.createElement('div');
  wrap.className = 'pn-wrap';
  const COLORS = ['#000000','#ffffff','#ff6868','#ffae5c','#f4d35e','#6fce8b','#6fb3ff','#c490ff','#ff90c8','#5cd2c7','#7a7a7a','#ffd9b3'];
  const swHtml = COLORS.map((c, i) =>
    '<div class="pn-swatch' + (i === 0 ? ' active' : '') + '" data-c="' + c + '" style="background:' + c + '"></div>'
  ).join('');
  wrap.innerHTML =
    '<div class="pn-bar">' +
      '<div class="pn-swatches" style="display:flex;gap:3px;flex-wrap:wrap;">' + swHtml + '</div>' +
      '<label>size</label><input type="range" class="pn-size" min="1" max="40" value="4"/>' +
      '<button class="pn-tool active" data-tool="brush">brush</button>' +
      '<button class="pn-tool" data-tool="eraser">eraser</button>' +
      '<button class="pn-clear">clear</button>' +
      '<button class="pn-save">download</button>' +
    '</div>' +
    '<div class="pn-canvas-wrap"><canvas class="pn-canvas" width="500" height="320"></canvas></div>';
  const cv = wrap.querySelector('.pn-canvas');
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  let color = '#000000';
  let size  = 4;
  let tool  = 'brush';
  let drawing = false;
  let last = null;

  wrap.querySelectorAll('.pn-swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
      wrap.querySelectorAll('.pn-swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      color = sw.dataset.c;
      tool = 'brush';
      wrap.querySelectorAll('.pn-tool').forEach((t) => t.classList.toggle('active', t.dataset.tool === 'brush'));
    });
  });
  wrap.querySelectorAll('.pn-tool').forEach((t) => {
    t.addEventListener('click', () => {
      wrap.querySelectorAll('.pn-tool').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      tool = t.dataset.tool;
    });
  });
  wrap.querySelector('.pn-size').addEventListener('input', (e) => { size = +e.target.value; });
  wrap.querySelector('.pn-clear').addEventListener('click', () => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
  });
  wrap.querySelector('.pn-save').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = 'mecke-paint-' + Date.now() + '.png';
    a.href = cv.toDataURL('image/png');
    a.click();
  });

  function pos(e) {
    const r = cv.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (cv.width  / r.width),
      y: (e.clientY - r.top)  * (cv.height / r.height)
    };
  }
  function stroke(p) {
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = size;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else {
      ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    last = p;
  }
  cv.addEventListener('mousedown', (e) => { drawing = true; last = null; stroke(pos(e)); });
  addEventListener('mousemove', (e) => { if (drawing) stroke(pos(e)); });
  addEventListener('mouseup', () => { drawing = false; last = null; });

  return wrap;
}

/* ── App: Minesweeper ────────────────────────────── */
function buildMinesApp() {
  const W = 9, H = 9, MINES = 10;
  const wrap = document.createElement('div');
  wrap.className = 'ms-wrap';
  wrap.innerHTML =
    '<div class="ms-head">' +
      '<span class="ms-counter">' + MINES + '</span>' +
      '<button class="ms-reset" title="new game">↺</button>' +
      '<span class="ms-timer">000</span>' +
    '</div>' +
    '<div class="ms-grid"></div>' +
    '<div class="ms-status">left-click: reveal · right-click: flag</div>';
  const grid = wrap.querySelector('.ms-grid');
  const counterEl = wrap.querySelector('.ms-counter');
  const timerEl = wrap.querySelector('.ms-timer');
  const statusEl = wrap.querySelector('.ms-status');
  grid.style.gridTemplateColumns = 'repeat(' + W + ', 22px)';

  let cells = [];
  let started = false, dead = false, won = false;
  let flagged = 0;
  let timer = 0, timerInt = null;

  function key(x, y) { return y * W + x; }
  function inB(x, y) { return x >= 0 && x < W && y >= 0 && y < H; }

  function placeMines(safeX, safeY) {
    let placed = 0;
    while (placed < MINES) {
      const x = Math.floor(Math.random() * W);
      const y = Math.floor(Math.random() * H);
      if (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1) continue;
      const c = cells[key(x, y)];
      if (c.mine) continue;
      c.mine = true; placed++;
    }
    cells.forEach((c) => {
      if (c.mine) return;
      let n = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = c.x + dx, ny = c.y + dy;
        if (inB(nx, ny) && cells[key(nx, ny)].mine) n++;
      }
      c.n = n;
    });
  }

  function reveal(x, y) {
    if (!inB(x, y)) return;
    const c = cells[key(x, y)];
    if (c.open || c.flag) return;
    c.open = true;
    c.el.classList.add('open');
    if (c.mine) {
      c.el.classList.add('mine');
      c.el.textContent = 'X';
      gameOver(false);
      return;
    }
    if (c.n > 0) {
      c.el.dataset.n = c.n;
      c.el.textContent = c.n;
    } else {
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        reveal(x + dx, y + dy);
      }
    }
    checkWin();
  }

  function checkWin() {
    if (dead || won) return;
    const opened = cells.filter((c) => c.open).length;
    if (opened === W * H - MINES) {
      won = true;
      cells.forEach((c) => {
        if (c.mine) { c.el.classList.add('win'); c.el.textContent = 'F'; }
      });
      statusEl.textContent = 'cleared in ' + timer + 's · click ↺ for another';
      statusEl.style.color = 'var(--accent)';
      stopTimer();
    }
  }

  function gameOver(byWin) {
    dead = !byWin;
    cells.forEach((c) => {
      if (c.mine) { c.el.classList.add('open', 'mine'); c.el.textContent = 'X'; }
    });
    statusEl.textContent = 'boom. click ↺ to retry';
    statusEl.style.color = '#ff6868';
    stopTimer();
  }

  function startTimer() {
    if (timerInt) return;
    timerInt = setInterval(() => {
      timer++;
      timerEl.textContent = String(timer).padStart(3, '0');
      if (timer >= 999) stopTimer();
    }, 1000);
  }
  function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }

  function reset() {
    grid.innerHTML = '';
    cells = [];
    started = false; dead = false; won = false;
    flagged = 0; timer = 0;
    timerEl.textContent = '000';
    counterEl.textContent = MINES;
    statusEl.textContent = 'left-click: reveal · right-click: flag';
    statusEl.style.color = 'var(--ink-mute)';
    stopTimer();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const el = document.createElement('div');
      el.className = 'ms-cell';
      const c = { x, y, el, mine: false, n: 0, open: false, flag: false };
      cells.push(c);
      el.addEventListener('click', () => {
        if (dead || won || c.flag) return;
        if (!started) { placeMines(x, y); started = true; startTimer(); }
        reveal(x, y);
      });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (dead || won || c.open) return;
        c.flag = !c.flag;
        el.classList.toggle('flag', c.flag);
        el.textContent = c.flag ? 'F' : '';
        flagged += c.flag ? 1 : -1;
        counterEl.textContent = MINES - flagged;
      });
      grid.appendChild(el);
    }
  }

  wrap.querySelector('.ms-reset').addEventListener('click', reset);
  reset();
  return wrap;
}

/* ── App: Snake ──────────────────────────────────── */
function buildSnakeApp() {
  const SIZE = 16, COLS = 18, ROWS = 18;
  const wrap = document.createElement('div');
  wrap.className = 'snake-wrap';
  wrap.innerHTML =
    '<div class="snake-head"><span>score: <span class="acc s-score">0</span></span><span>best: <span class="s-best">' +
      (parseInt(localStorage.getItem('mecke.snake.best') || '0', 10)) +
    '</span></span></div>' +
    '<canvas class="snake-canvas" width="' + (COLS*SIZE) + '" height="' + (ROWS*SIZE) + '"></canvas>' +
    '<div class="snake-tip">arrows / WASD to move · space to pause · click canvas to focus</div>';
  const cv = wrap.querySelector('.snake-canvas');
  const ctx = cv.getContext('2d');
  const scoreEl = wrap.querySelector('.s-score');
  const bestEl = wrap.querySelector('.s-best');

  let snake, dir, pendingDir, food, score, dead, paused, tickInt;

  function placeFood() {
    while (true) {
      const f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      if (!snake.some((s) => s.x === f.x && s.y === f.y)) return f;
    }
  }
  function reset() {
    snake = [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }];
    dir = { x: 1, y: 0 };
    pendingDir = dir;
    food = placeFood();
    score = 0; dead = false; paused = false;
    scoreEl.textContent = '0';
    if (tickInt) clearInterval(tickInt);
    tickInt = setInterval(tick, 110);
    draw();
  }
  function tick() {
    if (paused || dead) return;
    dir = pendingDir;
    const nh = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS || snake.some((s) => s.x === nh.x && s.y === nh.y)) {
      dead = true; clearInterval(tickInt); tickInt = null;
      const best = parseInt(localStorage.getItem('mecke.snake.best') || '0', 10);
      if (score > best) { localStorage.setItem('mecke.snake.best', String(score)); bestEl.textContent = score; }
      draw(); return;
    }
    snake.unshift(nh);
    if (nh.x === food.x && nh.y === food.y) {
      score++; scoreEl.textContent = score;
      food = placeFood();
    } else {
      snake.pop();
    }
    draw();
  }
  function draw() {
    ctx.fillStyle = '#060709'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * SIZE, y * SIZE, SIZE, SIZE);
    }
    ctx.fillStyle = '#ff6868';
    ctx.fillRect(food.x * SIZE + 2, food.y * SIZE + 2, SIZE - 4, SIZE - 4);
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#ffae5c' : '#6fce8b';
      ctx.fillRect(s.x * SIZE + 1, s.y * SIZE + 1, SIZE - 2, SIZE - 2);
    });
    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#ffae5c'; ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center'; ctx.fillText('PAUSED', cv.width/2, cv.height/2);
    }
    if (dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#ff6868'; ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center'; ctx.fillText('GAME OVER', cv.width/2, cv.height/2 - 10);
      ctx.fillStyle = '#c8c8c8'; ctx.font = '11px monospace';
      ctx.fillText('click canvas to restart', cv.width/2, cv.height/2 + 12);
    }
  }
  function key(e) {
    if (!cv.isConnected) return;
    if (!wrap.closest('.pc-window')) return;
    const k = e.key.toLowerCase();
    let nd = null;
    if (k === 'arrowup'    || k === 'w') nd = { x: 0, y: -1 };
    if (k === 'arrowdown'  || k === 's') nd = { x: 0, y: 1 };
    if (k === 'arrowleft'  || k === 'a') nd = { x: -1, y: 0 };
    if (k === 'arrowright' || k === 'd') nd = { x: 1, y: 0 };
    if (nd && (nd.x !== -dir.x || nd.y !== -dir.y)) { pendingDir = nd; e.preventDefault(); }
    if (k === ' ') { paused = !paused; draw(); e.preventDefault(); }
  }
  cv.addEventListener('click', () => { if (dead) reset(); });
  addEventListener('keydown', key);

  reset();
  return {
    el: wrap,
    cleanup: () => {
      if (tickInt) clearInterval(tickInt);
      removeEventListener('keydown', key);
    }
  };
}

function pcUpdateClock() {
  const el = document.getElementById('pc-tb-clock');
  if (!el) return;
  const d = new Date();
  el.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

let pcBootShown = false;
const PC_BOOT_LINES = [
  { t: 0,    cls: 'dim', text: '[    0.000000] mecke-bios v1.0 (static edition)' },
  { t: 80,   cls: 'dim', text: '[    0.001284] CPU: your machine, probably fine' },
  { t: 160,  cls: 'dim', text: '[    0.002113] memory: ~however much your tab has' },
  { t: 240,  cls: 'ok',  text: '[  ok  ] mounting / on browser-fs' },
  { t: 320,  cls: 'ok',  text: '[  ok  ] starting window manager' },
  { t: 420,  cls: 'ok',  text: '[  ok  ] starting taskbar' },
  { t: 520,  cls: 'ok',  text: '[  ok  ] loading apps: files calc notepad paint snake mines terminal about' },
  { t: 640,  cls: 'ok',  text: '[  ok  ] populating fake filesystem (8 dirs, 10 files)' },
  { t: 760,  cls: 'ok',  text: '[  ok  ] hooking pointer + keyboard input' },
  { t: 880,  cls: 'acc', text: '[ MECKE ] welcome, mecke@os' },
  { t: 980,  cls: 'dim cursor-blink', text: '[ * ] desktop ready ' }
];

function pcRunBoot() {
  const boot = document.getElementById('pc-boot');
  const linesEl = document.getElementById('pc-boot-lines');
  const bar = document.getElementById('pc-boot-bar');
  if (!boot || !linesEl || !bar) return Promise.resolve();
  boot.classList.remove('hide');
  boot.style.display = 'flex';
  boot.style.opacity = '1';
  boot.style.visibility = 'visible';
  linesEl.innerHTML = '';
  bar.style.right = '100%';
  return new Promise((resolve) => {
    const total = PC_BOOT_LINES[PC_BOOT_LINES.length - 1].t + 200;
    PC_BOOT_LINES.forEach((line) => {
      setTimeout(() => {
        const row = document.createElement('span');
        row.className = 'row ' + (line.cls || '');
        row.textContent = line.text;
        linesEl.appendChild(row);
        const pct = Math.round((line.t / total) * 100);
        bar.style.right = (100 - pct) + '%';
      }, line.t);
    });
    setTimeout(() => { bar.style.right = '0%'; }, total - 100);
    setTimeout(() => {
      boot.classList.add('hide');
      setTimeout(() => { boot.style.display = 'none'; resolve(); }, 420);
    }, total + 280);
  });
}

function enablePC() {
  if (pcOn) return;
  if (threeOn) disable3D();
  pcOn = true;
  document.body.classList.add('pc-on');
  pcUpdateClock();
  if (!pcClockTimer) pcClockTimer = setInterval(pcUpdateClock, 15000);
  pcRenderTaskbar();
  document.querySelectorAll('.config').forEach((c) => c.classList.remove('open'));
  if (!pcBootShown) {
    pcBootShown = true;
    pcRunBoot();
  }
}

function disablePC() {
  if (!pcOn) return;
  pcOn = false;
  document.body.classList.remove('pc-on');
  if (pcClockTimer) { clearInterval(pcClockTimer); pcClockTimer = null; }
}

/* desktop icon launching */
addEventListener('click', (e) => {
  const ic = e.target.closest('.pc-icon');
  if (!ic || !pcOn) return;
  document.querySelectorAll('.pc-icon.active').forEach((n) => n.classList.remove('active'));
  ic.classList.add('active');
});
addEventListener('dblclick', (e) => {
  const ic = e.target.closest('.pc-icon');
  if (!ic || !pcOn) return;
  pcLaunchApp(ic.dataset.app);
});
/* keyboard: enter to open the highlighted icon, ESC to exit */
addEventListener('keydown', (e) => {
  if (!pcOn) return;
  if (e.key === 'Escape') {
    if (pcWindows.size > 0) {
      // close focused window first
      let focused = null;
      pcWindows.forEach((w, id) => { if (w.el.classList.contains('focused')) focused = id; });
      if (focused) { pcCloseWindow(focused); return; }
    }
    disablePC();
    return;
  }
  if (e.key === 'Enter') {
    if (e.target.matches('input, textarea')) return;
    const ic = document.querySelector('.pc-icon.active');
    if (ic) { e.preventDefault(); pcLaunchApp(ic.dataset.app); }
  }
});

/* ════════════════════════════════════════════════════════════
   MINIGAMES — Wordle · Sudoku · 2048 · Memory
   ════════════════════════════════════════════════════════════
   Each game is a fullscreen modal overlay (.game-stage). They
   share enableGame/disableGame, a confetti spawner and a toast.
   ──────────────────────────────────────────────────────────── */
const GAME_STAGE_IDS = {
  wordle:   'game-wordle',
  sudoku:   'game-sudoku',
  g2048:    'game-2048',
  memory:   'game-memory',
  csguess:  'game-csguess',
  synthlab: 'game-synthlab',
};
let activeGame = null;
const gameInited = { wordle: false, sudoku: false, g2048: false, memory: false, csguess: false, synthlab: false };

function enableGame(id) {
  if (activeGame) disableGame();
  if (pcOn)  { try { disablePC(); } catch (_) {} }
  if (threeOn) { try { disable3D(); } catch (_) {} }
  const stageId = GAME_STAGE_IDS[id];
  if (!stageId) return;
  const stage = document.getElementById(stageId);
  if (!stage) return;
  document.body.classList.add('game-on');
  stage.classList.add('on');
  activeGame = id;
  if (!gameInited[id]) { GAME_INIT[id](); gameInited[id] = true; }
  GAME_OPEN[id] && GAME_OPEN[id]();
  document.querySelectorAll('.config').forEach((c) => c.classList.remove('open'));
}
function disableGame() {
  if (!activeGame) return;
  GAME_CLOSE[activeGame] && GAME_CLOSE[activeGame]();
  const stage = document.getElementById(GAME_STAGE_IDS[activeGame]);
  if (stage) stage.classList.remove('on');
  document.body.classList.remove('game-on');
  activeGame = null;
}
window.addEventListener('keydown', (e) => {
  if (!activeGame) return;
  if (e.key === 'Escape') { e.preventDefault(); disableGame(); }
});

function gameToast(elId, msg, ms = 1400) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('on'), ms);
}
function gameConfetti(elId, count = 80) {
  const host = document.getElementById(elId);
  if (!host) return;
  host.innerHTML = '';
  const colors = ['#ff8f28', '#6fb3ff', '#6fce8b', '#c490ff', '#ffd166', '#ef476f'];
  for (let i = 0; i < count; i++) {
    const c = document.createElement('i');
    const x = (Math.random() - 0.5) * 1.4 * window.innerWidth;
    const r = (Math.random() - 0.5) * 1440;
    const d = 1.6 + Math.random() * 1.8;
    c.style.left = (Math.random() * 100) + '%';
    c.style.background = colors[i % colors.length];
    c.style.setProperty('--x', x + 'px');
    c.style.setProperty('--r', r + 'deg');
    c.style.setProperty('--d', d + 's');
    c.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
    host.appendChild(c);
  }
  setTimeout(() => { host.innerHTML = ''; }, 3600);
}
const GAME_INIT  = {};
const GAME_OPEN  = {};
const GAME_CLOSE = {};

/* ─── WORDLE ─── */
const WORDLE_WORDS = [
  'amber','arrow','about','adopt','alpha','anvil','angle','apple','arena','aside',
  'audio','badge','bagel','baker','below','bench','black','blade','blame','blank',
  'blast','blaze','blind','block','blood','board','brace','brain','brake','brand',
  'brave','bread','break','brick','bring','brisk','broke','brown','brush','build',
  'burst','cabin','cable','candy','carve','catch','chain','chair','chalk','charm',
  'chart','chase','cheap','cheek','cheer','chess','chest','chief','chord','civic',
  'civil','claim','clamp','clean','clear','click','climb','cloak','clock','clone',
  'close','cloud','clown','coast','color','couch','could','count','court','cover',
  'crane','crash','crate','crazy','cream','creep','crime','crown','crust','cycle',
  'daily','dance','death','depth','digit','ditto','dough','dozen','draft','drain',
  'drama','dress','drift','drink','drive','drone','dwell','eager','early','earth',
  'eight','elbow','elder','elite','empty','enjoy','enter','entry','equal','error',
  'event','every','exact','exist','extra','faith','false','fancy','feast','fence',
  'fever','field','fifty','fight','final','first','flame','flash','fleet','flesh',
  'flick','flint','floor','flour','flown','flush','focus','force','forge','forty',
  'found','frame','frank','fresh','front','frost','fruit','fuzzy','gauge','ghost',
  'giant','glass','globe','glory','glove','grace','grade','grain','grand','grant',
  'grape','graph','grasp','grass','great','green','greet','grief','grind','group',
  'grown','guard','guess','guest','guide','habit','happy','harsh','hatch','heart',
  'heavy','hedge','helix','hello','hence','herds','hover','human','humor','ideal',
  'image','imply','index','ivory','jelly','jewel','joker','judge','juice','knife',
  'knock','known','label','large','later','laugh','layer','leash','learn','leave',
  'lemon','level','light','limit','linen','lobby','local','logic','loose','lower',
  'lucky','lunar','magic','major','maple','match','metal','might','minor','mixer',
  'model','money','month','motor','mount','mouse','mouth','movie','music','naked',
  'never','newer','night','noble','noise','north','novel','ocean','offer','often',
  'olive','onion','order','organ','other','ought','outer','owner','panic','paper',
  'parka','party','peach','pearl','penny','phone','photo','piano','pixel','place',
  'plain','plane','plant','plate','plaza','poker','porch','pound','power','press',
  'price','pride','prime','prism','probe','proud','prove','pulse','punch','quake',
  'queen','queer','query','quest','quick','quiet','quote','radar','radio','raise',
  'ranch','range','rapid','reach','react','ready','realm','rebel','reign','relay',
  'reply','reset','rider','ridge','rifle','river','robin','rough','round','royal',
  'rural','salad','sauce','scale','scare','scene','scope','score','scout','seven',
  'shade','shake','shape','share','shark','sharp','sheep','sheet','shelf','shine',
  'shirt','shock','shore','short','shown','siege','sight','silly','since','siren',
  'sixty','skill','skull','slice','slide','sling','sloth','small','smart','smile',
  'smoke','snake','solar','solid','solve','sound','south','space','spade','spare',
  'spark','speak','speed','spell','spice','spine','split','spore','sport','spray',
  'staff','stage','stair','stamp','stand','start','stash','state','steam','steel',
  'stern','stick','stiff','still','stink','stock','stone','stool','stops','storm',
  'story','stove','strap','straw','strip','study','stuff','style','sugar','suite',
  'sunny','swamp','sweep','sweet','swift','swing','sword','table','taken','taper',
  'taste','teach','tears','tease','tempo','tense','their','theme','there','these',
  'thick','thief','thing','think','third','thorn','those','three','threw','throw',
  'tiger','tight','title','today','token','tonic','tooth','topic','torch','total',
  'touch','tough','tower','toxic','trace','track','trade','trail','train','treat',
  'tribe','trick','tried','truck','truly','trump','trunk','trust','truth','tulip',
  'twice','tying','ultra','uncle','under','union','unite','unity','until','upper',
  'urban','usage','using','valet','valid','value','vapor','vault','venue','verge',
  'verse','vigil','viper','virus','visit','vital','vivid','vocal','voice','vouch',
  'vowel','wagon','waist','waltz','wares','watch','water','wedge','weigh','weird',
  'whale','wharf','wheat','wheel','where','which','while','white','whole','whose',
  'widen','widow','width','wield','wines','witch','woken','woman','women','world',
  'worry','worse','worth','would','wound','woven','wrath','wreck','wring','wrist',
  'write','wrong','yacht','yield','young','youth','zebra'
];
const WORDLE_VALID = new Set(WORDLE_WORDS);
const WORDLE_KBD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', '↵ZXCVBNM⌫'];
const wordleState = { word: '', row: 0, col: 0, board: [], keys: {}, locked: false, streak: 0 };

GAME_INIT.wordle = function () {
  const board = document.getElementById('wordle-board');
  const kbd = document.getElementById('wordle-kbd');
  board.innerHTML = '';
  for (let r = 0; r < 6; r++) {
    const row = document.createElement('div');
    row.className = 'wordle-row';
    for (let c = 0; c < 5; c++) {
      const t = document.createElement('div');
      t.className = 'wordle-tile';
      row.appendChild(t);
    }
    board.appendChild(row);
  }
  kbd.innerHTML = '';
  WORDLE_KBD_ROWS.forEach((kr) => {
    const row = document.createElement('div');
    row.className = 'wordle-krow';
    [...kr].forEach((ch) => {
      const k = document.createElement('button');
      k.className = 'wordle-key' + (ch === '↵' || ch === '⌫' ? ' wide' : '');
      k.textContent = ch === '↵' ? 'enter' : ch === '⌫' ? 'back' : ch;
      k.dataset.key = ch;
      k.addEventListener('click', () => wordlePress(ch));
      row.appendChild(k);
    });
    kbd.appendChild(row);
  });
  try { wordleState.streak = parseInt(localStorage.getItem('mecke_wordle_streak') || '0', 10) || 0; } catch (_) {}
  document.getElementById('wordle-streak').textContent = wordleState.streak;
  document.getElementById('wordle-exit').addEventListener('click', disableGame);
  document.getElementById('wordle-new').addEventListener('click', wordleReset);
  window.addEventListener('keydown', wordleKey);
  wordleReset();
};
GAME_OPEN.wordle = function () {
  document.getElementById('wordle-streak').textContent = wordleState.streak;
};
function wordleReset() {
  wordleState.word = WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)].toUpperCase();
  wordleState.row = 0; wordleState.col = 0; wordleState.locked = false;
  wordleState.board = Array.from({ length: 6 }, () => ['', '', '', '', '']);
  wordleState.keys = {};
  document.getElementById('wordle-board').querySelectorAll('.wordle-tile').forEach((t) => {
    t.className = 'wordle-tile';
    t.textContent = '';
    t.style.removeProperty('--fd');
    t.style.removeProperty('--bd');
  });
  document.getElementById('wordle-kbd').querySelectorAll('.wordle-key').forEach((k) => {
    k.classList.remove('absent', 'present', 'correct');
  });
  document.getElementById('wordle-num').textContent = '1';
}
function wordleKey(e) {
  if (activeGame !== 'wordle' || wordleState.locked) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k === 'Enter')        { e.preventDefault(); wordlePress('↵'); }
  else if (k === 'Backspace'){ e.preventDefault(); wordlePress('⌫'); }
  else if (/^[a-zA-Z]$/.test(k)) { wordlePress(k.toUpperCase()); }
}
function wordlePress(ch) {
  if (wordleState.locked) return;
  const r = wordleState.row;
  if (ch === '⌫') {
    if (wordleState.col > 0) {
      wordleState.col--;
      wordleState.board[r][wordleState.col] = '';
      const tile = document.getElementById('wordle-board').children[r].children[wordleState.col];
      tile.textContent = '';
      tile.classList.remove('filled');
    }
    return;
  }
  if (ch === '↵') { wordleSubmit(); return; }
  if (wordleState.col >= 5) return;
  wordleState.board[r][wordleState.col] = ch;
  const tile = document.getElementById('wordle-board').children[r].children[wordleState.col];
  tile.textContent = ch;
  tile.classList.add('filled');
  wordleState.col++;
}
function wordleSubmit() {
  const r = wordleState.row;
  if (wordleState.col < 5) {
    const rowEl = document.getElementById('wordle-board').children[r];
    rowEl.classList.remove('shake'); void rowEl.offsetWidth; rowEl.classList.add('shake');
    gameToast('wordle-toast', 'not enough letters');
    return;
  }
  const guess = wordleState.board[r].join('');
  if (!WORDLE_VALID.has(guess.toLowerCase())) {
    const rowEl = document.getElementById('wordle-board').children[r];
    rowEl.classList.remove('shake'); void rowEl.offsetWidth; rowEl.classList.add('shake');
    gameToast('wordle-toast', "that's not in the word list");
    return;
  }
  // grade letters: handle dupes correctly by counting answer letters first
  const answer = wordleState.word;
  const grade = ['absent','absent','absent','absent','absent'];
  const counts = {};
  for (const c of answer) counts[c] = (counts[c] || 0) + 1;
  // pass 1: correct
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) { grade[i] = 'correct'; counts[guess[i]]--; }
  }
  // pass 2: present
  for (let i = 0; i < 5; i++) {
    if (grade[i] === 'correct') continue;
    if (counts[guess[i]] > 0) { grade[i] = 'present'; counts[guess[i]]--; }
  }
  wordleState.locked = true;
  const rowEl = document.getElementById('wordle-board').children[r];
  for (let i = 0; i < 5; i++) {
    const tile = rowEl.children[i];
    tile.style.setProperty('--fd', (i * 0.18) + 's');
    tile.classList.add('flip');
    setTimeout(() => {
      tile.classList.add(grade[i]);
      // update keyboard chip
      const cur = wordleState.keys[guess[i]];
      const rank = { absent: 0, present: 1, correct: 2 };
      if (!cur || rank[grade[i]] > rank[cur]) {
        wordleState.keys[guess[i]] = grade[i];
        const keyEl = document.getElementById('wordle-kbd').querySelector('[data-key="' + guess[i] + '"]');
        if (keyEl) {
          keyEl.classList.remove('absent', 'present', 'correct');
          keyEl.classList.add(grade[i]);
        }
      }
    }, i * 180 + 260);
  }
  setTimeout(() => {
    wordleState.row++;
    wordleState.col = 0;
    document.getElementById('wordle-num').textContent = String(Math.min(wordleState.row + 1, 6));
    if (guess === answer) {
      // win
      wordleState.streak++;
      try { localStorage.setItem('mecke_wordle_streak', String(wordleState.streak)); } catch (_) {}
      document.getElementById('wordle-streak').textContent = wordleState.streak;
      for (let i = 0; i < 5; i++) {
        const tile = rowEl.children[i];
        tile.style.setProperty('--bd', (i * 0.1) + 's');
        tile.classList.add('bounce');
      }
      gameConfetti('wordle-confetti', 110);
      const msgs = ['genius!', 'magnificent', 'impressive', 'splendid', 'great', 'phew'];
      gameToast('wordle-toast', msgs[Math.min(r, 5)], 2200);
    } else if (wordleState.row >= 6) {
      // lose
      wordleState.streak = 0;
      try { localStorage.setItem('mecke_wordle_streak', '0'); } catch (_) {}
      document.getElementById('wordle-streak').textContent = '0';
      gameToast('wordle-toast', 'the word was ' + answer, 4200);
    } else {
      wordleState.locked = false;
    }
  }, 5 * 180 + 600);
}
GAME_CLOSE.wordle = function () { /* keep state */ };

/* ─── SUDOKU ─── */
const SK_GIVEN = { easy: 42, medium: 34, hard: 28 };
const sudokuState = {
  board: new Array(81).fill(0),
  solution: new Array(81).fill(0),
  given: new Array(81).fill(false),
  notes: Array.from({ length: 81 }, () => new Set()),
  sel: -1,
  level: 'easy',
  pencil: false,
  mistakes: 0,
  startMs: 0,
  timer: null,
  done: false,
};

function skShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function skSafe(b, r, c, n) {
  for (let i = 0; i < 9; i++) {
    if (b[r * 9 + i] === n) return false;
    if (b[i * 9 + c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (b[(br + i) * 9 + (bc + j)] === n) return false;
  }
  return true;
}
function skSolve(b, randomize = false) {
  for (let i = 0; i < 81; i++) {
    if (b[i] === 0) {
      const r = Math.floor(i / 9), c = i % 9;
      const nums = randomize ? skShuffle([1,2,3,4,5,6,7,8,9]) : [1,2,3,4,5,6,7,8,9];
      for (const n of nums) {
        if (skSafe(b, r, c, n)) {
          b[i] = n;
          if (skSolve(b, randomize)) return true;
          b[i] = 0;
        }
      }
      return false;
    }
  }
  return true;
}
function skGenerate(level) {
  const sol = new Array(81).fill(0);
  skSolve(sol, true);
  const puzzle = sol.slice();
  const target = SK_GIVEN[level] || SK_GIVEN.easy;
  const idxs = skShuffle([...Array(81).keys()]);
  let givens = 81;
  for (const i of idxs) {
    if (givens <= target) break;
    const saved = puzzle[i];
    puzzle[i] = 0;
    givens--;
  }
  return { puzzle, sol };
}
GAME_INIT.sudoku = function () {
  const board = document.getElementById('sk-board');
  board.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9), c = i % 9;
    const cell = document.createElement('div');
    cell.className = 'sk-cell';
    if (c % 3 === 2 && c !== 8) cell.classList.add('b-r');
    if (r % 3 === 2 && r !== 8) cell.classList.add('b-b');
    cell.dataset.i = i;
    cell.addEventListener('click', () => skSelect(i));
    const notes = document.createElement('div');
    notes.className = 'sk-notes';
    for (let n = 1; n <= 9; n++) {
      const s = document.createElement('span');
      s.dataset.n = n;
      notes.appendChild(s);
    }
    cell.appendChild(notes);
    const v = document.createElement('span');
    v.className = 'sk-val';
    cell.appendChild(v);
    board.appendChild(cell);
  }
  const numpad = document.getElementById('sk-numpad');
  numpad.innerHTML = '';
  for (let n = 1; n <= 9; n++) {
    const b = document.createElement('button');
    b.className = 'sk-num';
    b.textContent = n;
    b.addEventListener('click', () => skInput(n));
    numpad.appendChild(b);
  }
  document.getElementById('sk-pencil').addEventListener('click', () => {
    sudokuState.pencil = !sudokuState.pencil;
    document.getElementById('sk-pencil').classList.toggle('on', sudokuState.pencil);
  });
  document.getElementById('sk-erase').addEventListener('click', () => skInput(0));
  document.getElementById('sk-new').addEventListener('click', () => skNewPuzzle(sudokuState.level));
  document.getElementById('sk-exit').addEventListener('click', disableGame);
  document.querySelectorAll('#game-sudoku [data-level]').forEach((b) => {
    b.addEventListener('click', () => skNewPuzzle(b.dataset.level));
  });
  window.addEventListener('keydown', skKey);
  // also build the feature-card preview grid
  const prev = document.getElementById('prev-sudoku-grid');
  if (prev && !prev.children.length) {
    const sample = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
    for (let i = 0; i < 81; i++) {
      const s = document.createElement('span');
      const ch = sample[i];
      s.textContent = ch === '.' ? '' : ch;
      if (i % 7 === 0) {
        s.classList.add('hi');
        s.style.setProperty('--d', ((i % 9) * 0.2) + 's');
      }
      prev.appendChild(s);
    }
  }
  skNewPuzzle('easy');
};
GAME_OPEN.sudoku = function () {
  // resume timer ticking
  if (sudokuState.timer) clearInterval(sudokuState.timer);
  sudokuState.timer = setInterval(skTick, 1000);
};
GAME_CLOSE.sudoku = function () {
  if (sudokuState.timer) { clearInterval(sudokuState.timer); sudokuState.timer = null; }
};
function skNewPuzzle(level) {
  sudokuState.level = level || sudokuState.level || 'easy';
  document.getElementById('sk-level').textContent = sudokuState.level;
  document.querySelectorAll('#game-sudoku [data-level]').forEach((b) => {
    b.classList.toggle('on', b.dataset.level === sudokuState.level);
  });
  const { puzzle, sol } = skGenerate(sudokuState.level);
  sudokuState.board = puzzle.slice();
  sudokuState.solution = sol.slice();
  sudokuState.given = puzzle.map((v) => v !== 0);
  sudokuState.notes = Array.from({ length: 81 }, () => new Set());
  sudokuState.sel = -1;
  sudokuState.mistakes = 0;
  sudokuState.startMs = Date.now();
  sudokuState.done = false;
  document.getElementById('sk-mistakes').textContent = '0';
  if (sudokuState.timer) clearInterval(sudokuState.timer);
  sudokuState.timer = setInterval(skTick, 1000);
  skTick();
  skRender();
}
function skTick() {
  const s = Math.floor((Date.now() - sudokuState.startMs) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const t = document.getElementById('sk-time');
  if (t) t.textContent = mm + ':' + ss;
}
function skRender() {
  const board = document.getElementById('sk-board');
  const cells = board.children;
  let filled = 0;
  for (let i = 0; i < 81; i++) {
    const cell = cells[i];
    cell.classList.remove('given', 'sel', 'peer', 'same', 'conflict', 'win');
    cell.style.removeProperty('--sd');
    const val = cell.querySelector('.sk-val');
    const notes = cell.querySelector('.sk-notes');
    const v = sudokuState.board[i];
    if (sudokuState.given[i]) cell.classList.add('given');
    if (v) {
      val.textContent = v;
      filled++;
      [...notes.children].forEach((s) => s.textContent = '');
    } else {
      val.textContent = '';
      [...notes.children].forEach((s) => {
        const n = +s.dataset.n;
        s.textContent = sudokuState.notes[i].has(n) ? n : '';
      });
    }
  }
  document.getElementById('sk-filled').textContent = String(filled);
  if (sudokuState.sel >= 0) skApplyHighlight();
}
function skApplyHighlight() {
  const i = sudokuState.sel;
  if (i < 0) return;
  const cells = document.getElementById('sk-board').children;
  const r = Math.floor(i / 9), c = i % 9;
  const br = Math.floor(r / 3), bc = Math.floor(c / 3);
  const v = sudokuState.board[i];
  for (let k = 0; k < 81; k++) {
    const cell = cells[k];
    cell.classList.remove('sel', 'peer', 'same');
    const kr = Math.floor(k / 9), kc = k % 9;
    const same = v && sudokuState.board[k] === v;
    const peer = kr === r || kc === c || (Math.floor(kr / 3) === br && Math.floor(kc / 3) === bc);
    if (k === i) cell.classList.add('sel');
    else if (same) cell.classList.add('same');
    else if (peer) cell.classList.add('peer');
  }
}
function skSelect(i) {
  if (sudokuState.done) return;
  sudokuState.sel = i;
  skApplyHighlight();
}
function skInput(n) {
  if (sudokuState.done) return;
  const i = sudokuState.sel;
  if (i < 0 || sudokuState.given[i]) return;
  if (sudokuState.pencil && n !== 0) {
    if (sudokuState.notes[i].has(n)) sudokuState.notes[i].delete(n);
    else sudokuState.notes[i].add(n);
    skRender();
    return;
  }
  if (n === 0) {
    sudokuState.board[i] = 0;
    sudokuState.notes[i].clear();
    skRender();
    return;
  }
  sudokuState.notes[i].clear();
  sudokuState.board[i] = n;
  if (n !== sudokuState.solution[i]) {
    sudokuState.mistakes++;
    document.getElementById('sk-mistakes').textContent = String(sudokuState.mistakes);
    const cell = document.getElementById('sk-board').children[i];
    cell.classList.remove('conflict'); void cell.offsetWidth; cell.classList.add('conflict');
    skRender();
    cell.classList.add('conflict');
    return;
  }
  skRender();
  // check win
  if (sudokuState.board.every((v, k) => v === sudokuState.solution[k])) {
    sudokuState.done = true;
    if (sudokuState.timer) { clearInterval(sudokuState.timer); sudokuState.timer = null; }
    const cells = document.getElementById('sk-board').children;
    for (let k = 0; k < 81; k++) {
      cells[k].style.setProperty('--sd', ((Math.floor(k / 9) + (k % 9)) * 0.04) + 's');
      cells[k].classList.add('win');
    }
    gameConfetti('sk-confetti', 130);
    gameToast('sk-toast', 'solved · ' + document.getElementById('sk-time').textContent, 3200);
  }
}
function skKey(e) {
  if (activeGame !== 'sudoku') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (/^[1-9]$/.test(k)) { e.preventDefault(); skInput(+k); return; }
  if (k === 'Backspace' || k === 'Delete' || k === '0') { e.preventDefault(); skInput(0); return; }
  if (k === 'p' || k === 'P') {
    sudokuState.pencil = !sudokuState.pencil;
    document.getElementById('sk-pencil').classList.toggle('on', sudokuState.pencil);
    return;
  }
  if (sudokuState.sel < 0) return;
  let r = Math.floor(sudokuState.sel / 9), c = sudokuState.sel % 9;
  if (k === 'ArrowUp')    { e.preventDefault(); r = (r + 8) % 9; }
  else if (k === 'ArrowDown')  { e.preventDefault(); r = (r + 1) % 9; }
  else if (k === 'ArrowLeft')  { e.preventDefault(); c = (c + 8) % 9; }
  else if (k === 'ArrowRight') { e.preventDefault(); c = (c + 1) % 9; }
  else return;
  skSelect(r * 9 + c);
}

/* ─── 2048 ─── */
const G2_SIZE = 4;
const g2State = { grid: [], tiles: [], nextId: 1, score: 0, best: 0, over: false };

GAME_INIT.g2048 = function () {
  try { g2State.best = parseInt(localStorage.getItem('mecke_2048_best') || '0', 10) || 0; } catch (_) {}
  document.getElementById('g2-best').textContent = String(g2State.best);
  document.getElementById('g2-new').addEventListener('click', g2New);
  document.getElementById('g2-exit').addEventListener('click', disableGame);
  window.addEventListener('keydown', g2Key);
  const board = document.getElementById('g2-board');
  // build cell backers
  for (let r = 0; r < G2_SIZE; r++) for (let c = 0; c < G2_SIZE; c++) {
    const cell = document.createElement('div');
    cell.className = 'g2048-cell';
    const { x, y } = g2Pos(r, c);
    cell.style.transform = 'translate(' + x + ', ' + y + ')';
    board.appendChild(cell);
  }
  // touch swipe
  let sx = 0, sy = 0;
  board.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY;
  }, { passive: true });
  board.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) g2Move(dx > 0 ? 'right' : 'left');
    else                              g2Move(dy > 0 ? 'down' : 'up');
  }, { passive: true });
  g2New();
};
GAME_OPEN.g2048 = function () { /* nothing */ };
function g2Pos(r, c) {
  // gap=10, cell=96; offset = gap*(c+1) + cell*c
  const x = (10 * (c + 1) + 96 * c) + 'px';
  const y = (10 * (r + 1) + 96 * r) + 'px';
  return { x, y };
}
function g2New() {
  g2State.grid = Array.from({ length: G2_SIZE }, () => new Array(G2_SIZE).fill(null));
  g2State.tiles = [];
  g2State.score = 0;
  g2State.over = false;
  document.getElementById('g2-board').classList.remove('over');
  // wipe DOM tiles
  document.getElementById('g2-board').querySelectorAll('.g2048-tile').forEach((el) => el.remove());
  g2Spawn(); g2Spawn();
  g2Render(true);
}
function g2Spawn() {
  const empty = [];
  for (let r = 0; r < G2_SIZE; r++) for (let c = 0; c < G2_SIZE; c++) {
    if (!g2State.grid[r][c]) empty.push([r, c]);
  }
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const v = Math.random() < 0.9 ? 2 : 4;
  const tile = { id: g2State.nextId++, value: v, r, c, isNew: true, justMerged: false };
  g2State.grid[r][c] = tile;
  g2State.tiles.push(tile);
}
function g2Render(full = false) {
  const board = document.getElementById('g2-board');
  // sync DOM
  const existing = new Map();
  board.querySelectorAll('.g2048-tile').forEach((el) => existing.set(+el.dataset.id, el));
  for (const t of g2State.tiles) {
    let el = existing.get(t.id);
    const { x, y } = g2Pos(t.r, t.c);
    if (!el) {
      el = document.createElement('div');
      el.className = 'g2048-tile';
      el.dataset.id = t.id;
      el.style.setProperty('--x', x);
      el.style.setProperty('--y', y);
      el.style.transform = 'translate(' + x + ', ' + y + ')';
      board.appendChild(el);
    } else {
      existing.delete(t.id);
    }
    el.dataset.v = t.value;
    el.textContent = t.value;
    el.style.setProperty('--x', x);
    el.style.setProperty('--y', y);
    el.style.transform = 'translate(' + x + ', ' + y + ')';
    el.classList.remove('spawn', 'merge');
    void el.offsetWidth;
    if (t.isNew)       el.classList.add('spawn');
    if (t.justMerged)  el.classList.add('merge');
    t.isNew = false;
    t.justMerged = false;
  }
  // remove stale
  existing.forEach((el) => el.remove());
  document.getElementById('g2-score').textContent = String(g2State.score);
  if (g2State.score > g2State.best) {
    g2State.best = g2State.score;
    try { localStorage.setItem('mecke_2048_best', String(g2State.best)); } catch (_) {}
  }
  document.getElementById('g2-best').textContent = String(g2State.best);
}
function g2Move(dir) {
  if (g2State.over) return;
  const dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
  const dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  const order = [...Array(G2_SIZE).keys()];
  const rOrder = dr > 0 ? order.slice().reverse() : order;
  const cOrder = dc > 0 ? order.slice().reverse() : order;
  let moved = false;
  const merged = new Set();
  // remove dead tiles before move
  g2State.tiles = g2State.tiles.filter(t => g2State.grid[t.r][t.c] === t);
  for (const r of rOrder) for (const c of cOrder) {
    const tile = g2State.grid[r][c];
    if (!tile) continue;
    let nr = r, nc = c;
    while (true) {
      const tr = nr + dr, tc = nc + dc;
      if (tr < 0 || tr >= G2_SIZE || tc < 0 || tc >= G2_SIZE) break;
      const target = g2State.grid[tr][tc];
      if (!target) { nr = tr; nc = tc; continue; }
      if (target.value === tile.value && !merged.has(target.id)) {
        // merge
        g2State.grid[r][c] = null;
        target.value *= 2;
        target.justMerged = true;
        g2State.score += target.value;
        merged.add(target.id);
        // remove tile from list (it merged into target)
        const idx = g2State.tiles.indexOf(tile);
        if (idx >= 0) g2State.tiles.splice(idx, 1);
        moved = true;
        nr = -1;
        break;
      }
      break;
    }
    if (nr >= 0 && (nr !== r || nc !== c)) {
      g2State.grid[r][c] = null;
      g2State.grid[nr][nc] = tile;
      tile.r = nr; tile.c = nc;
      moved = true;
    }
  }
  if (moved) {
    g2State.tiles.forEach(t => {
      // ensure grid pointers are consistent
      g2State.grid[t.r][t.c] = t;
    });
    g2Render();
    setTimeout(() => {
      g2Spawn();
      g2Render();
      if (g2HasNoMoves()) {
        g2State.over = true;
        document.getElementById('g2-board').classList.add('over');
        gameToast('g2-toast', 'no moves left · score ' + g2State.score, 3200);
      }
    }, 130);
    if (g2State.tiles.some(t => t.value === 2048) && !g2State._won) {
      g2State._won = true;
      gameConfetti('g2-confetti', 140);
      gameToast('g2-toast', '2048 reached!', 2400);
    }
  }
}
function g2HasNoMoves() {
  for (let r = 0; r < G2_SIZE; r++) for (let c = 0; c < G2_SIZE; c++) {
    if (!g2State.grid[r][c]) return false;
    const v = g2State.grid[r][c].value;
    if (c + 1 < G2_SIZE && g2State.grid[r][c+1] && g2State.grid[r][c+1].value === v) return false;
    if (r + 1 < G2_SIZE && g2State.grid[r+1][c] && g2State.grid[r+1][c].value === v) return false;
  }
  return true;
}
function g2Key(e) {
  if (activeGame !== 'g2048') return;
  const k = e.key.toLowerCase();
  const map = { 'arrowup':'up','w':'up','arrowdown':'down','s':'down','arrowleft':'left','a':'left','arrowright':'right','d':'right' };
  if (map[k]) { e.preventDefault(); g2Move(map[k]); return; }
  if (k === 'r') { e.preventDefault(); g2State._won = false; g2New(); }
}

/* ─── MEMORY MATCH ─── */
const MEM_SYMBOLS = ['★','◆','●','▲','✦','◇','◐','▼'];
const memState = { cards: [], open: [], matched: 0, moves: 0, locked: false, startMs: 0, timer: null, won: false };

GAME_INIT.memory = function () {
  document.getElementById('mem-new').addEventListener('click', memNew);
  document.getElementById('mem-exit').addEventListener('click', disableGame);
  memNew();
};
GAME_OPEN.memory = function () {
  if (memState.timer) clearInterval(memState.timer);
  if (!memState.won) memState.timer = setInterval(memTick, 1000);
};
GAME_CLOSE.memory = function () {
  if (memState.timer) { clearInterval(memState.timer); memState.timer = null; }
};
function memShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function memNew() {
  const deck = memShuffle([...MEM_SYMBOLS, ...MEM_SYMBOLS]);
  const board = document.getElementById('mem-board');
  board.innerHTML = '';
  memState.cards = deck.map((s, i) => ({ sym: s, idx: i, matched: false, flipped: false }));
  memState.open = [];
  memState.matched = 0;
  memState.moves = 0;
  memState.locked = false;
  memState.won = false;
  memState.startMs = Date.now();
  document.getElementById('mem-moves').textContent = '0';
  document.getElementById('mem-matched').textContent = '0';
  if (memState.timer) clearInterval(memState.timer);
  memState.timer = setInterval(memTick, 1000);
  memTick();
  memState.cards.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'mem-card';
    card.dataset.i = i;
    card.innerHTML =
      '<div class="mem-card-inner">' +
        '<div class="mem-card-face mem-back">?</div>' +
        '<div class="mem-card-face mem-front">' + c.sym + '</div>' +
      '</div>';
    card.addEventListener('click', () => memFlip(i));
    board.appendChild(card);
  });
}
function memTick() {
  const s = Math.floor((Date.now() - memState.startMs) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const t = document.getElementById('mem-time');
  if (t) t.textContent = mm + ':' + ss;
}
function memFlip(i) {
  if (memState.locked) return;
  const c = memState.cards[i];
  if (c.matched || c.flipped) return;
  c.flipped = true;
  const el = document.querySelector('#mem-board .mem-card[data-i="' + i + '"]');
  el.classList.add('flipped');
  memState.open.push(i);
  if (memState.open.length === 2) {
    memState.moves++;
    document.getElementById('mem-moves').textContent = String(memState.moves);
    const [a, b] = memState.open;
    if (memState.cards[a].sym === memState.cards[b].sym) {
      memState.cards[a].matched = true;
      memState.cards[b].matched = true;
      memState.matched++;
      document.getElementById('mem-matched').textContent = String(memState.matched);
      [a, b].forEach((k) => {
        const cardEl = document.querySelector('#mem-board .mem-card[data-i="' + k + '"]');
        cardEl.classList.add('matched');
      });
      memState.open = [];
      if (memState.matched === MEM_SYMBOLS.length) {
        memState.won = true;
        if (memState.timer) { clearInterval(memState.timer); memState.timer = null; }
        gameConfetti('mem-confetti', 140);
        gameToast('mem-toast', 'cleared · ' + memState.moves + ' moves · ' + document.getElementById('mem-time').textContent, 3600);
      }
    } else {
      memState.locked = true;
      [a, b].forEach((k) => {
        const cardEl = document.querySelector('#mem-board .mem-card[data-i="' + k + '"]');
        cardEl.classList.add('shake');
      });
      setTimeout(() => {
        [a, b].forEach((k) => {
          memState.cards[k].flipped = false;
          const cardEl = document.querySelector('#mem-board .mem-card[data-i="' + k + '"]');
          cardEl.classList.remove('flipped', 'shake');
        });
        memState.open = [];
        memState.locked = false;
      }, 720);
    }
  }
}

/* ────────────────────────────────────────────────────────────
   SYNTH PAD APP (Web Audio)
   ──────────────────────────────────────────────────────────── */
const SYNTH_KEY_MAP = {
  // bottom row → C4 octave
  'z':60,'s':61,'x':62,'d':63,'c':64,'v':65,'g':66,'b':67,'h':68,'n':69,'j':70,'m':71,
  ',':72,'l':73,'.':74,';':75,'/':76,
  // upper row → C5 octave
  'q':72,'2':73,'w':74,'3':75,'e':76,'r':77,'5':78,'t':79,'6':80,'y':81,'7':82,'u':83,
  'i':84,'9':85,'o':86,'0':87,'p':88
};
const SYNTH_NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function midiToName(m) { return SYNTH_NOTE_NAMES[m % 12] + Math.floor(m / 12 - 1); }
function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function buildSynthApp() {
  const wrap = document.createElement('div');
  wrap.className = 'syn-wrap';
  wrap.innerHTML =
    '<div class="syn-bar">' +
      '<div class="group">' +
        '<button class="syn-osc on" data-w="sawtooth">saw</button>' +
        '<button class="syn-osc"    data-w="square">sq</button>' +
        '<button class="syn-osc"    data-w="triangle">tri</button>' +
        '<button class="syn-osc"    data-w="sine">sin</button>' +
      '</div>' +
      '<div class="group"><span>A</span><input type="range" class="syn-A" min="1"  max="500"  value="20"/></div>' +
      '<div class="group"><span>D</span><input type="range" class="syn-D" min="10" max="1200" value="180"/></div>' +
      '<div class="group"><span>S</span><input type="range" class="syn-S" min="0"  max="100"  value="60"/></div>' +
      '<div class="group"><span>R</span><input type="range" class="syn-R" min="20" max="2000" value="380"/></div>' +
      '<div class="group"><span>cut</span><input type="range" class="syn-cut" min="120" max="9000" value="2400"/></div>' +
      '<div class="group"><span>vol</span><input type="range" class="syn-vol" min="0"   max="100" value="22"/></div>' +
    '</div>' +
    '<canvas class="syn-viz" width="800" height="220"></canvas>' +
    '<div class="syn-keys" id="syn-keys-' + (Date.now() & 0xffff) + '"></div>' +
    '<div class="syn-tip">click keys · or play with <kbd>z</kbd>–<kbd>m</kbd> + <kbd>q</kbd>–<kbd>u</kbd> · pads chromatically</div>';

  let ac = null;
  let master, analyser;
  const active = new Map(); // midi → { osc, gain, filter }
  let waveform = 'sawtooth';
  let A = 20/1000, D = 180/1000, S = 0.6, R = 380/1000;
  let cutoff = 2400, masterVol = 0.22;
  let vizRAF = null;

  function ensureAudio() {
    if (ac) return ac;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ac = new Ctx();
    master = ac.createGain(); master.gain.value = masterVol;
    analyser = ac.createAnalyser(); analyser.fftSize = 1024;
    master.connect(analyser);
    analyser.connect(ac.destination);
    drawViz();
    return ac;
  }

  function noteOn(midi) {
    if (active.has(midi)) return;
    const ctx = ensureAudio(); if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = waveform;
    osc.frequency.value = midiToFreq(midi);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(filter); filter.connect(gain); gain.connect(master);
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1.0, t + A);
    gain.gain.linearRampToValueAtTime(S, t + A + D);
    osc.start();
    active.set(midi, { osc, gain, filter });
    const k = wrap.querySelector('[data-midi="' + midi + '"]');
    if (k) k.classList.add('active');
  }
  function noteOff(midi) {
    const v = active.get(midi); if (!v) return;
    const t = ac.currentTime;
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setValueAtTime(v.gain.gain.value, t);
    v.gain.gain.linearRampToValueAtTime(0, t + R);
    v.osc.stop(t + R + 0.06);
    active.delete(midi);
    const k = wrap.querySelector('[data-midi="' + midi + '"]');
    if (k) k.classList.remove('active');
  }

  function drawViz() {
    const cv = wrap.querySelector('.syn-viz');
    const cx = cv.getContext('2d');
    const data = new Uint8Array(analyser.fftSize);
    function frame() {
      if (!wrap.isConnected) return;
      analyser.getByteTimeDomainData(data);
      cx.fillStyle = '#050608';
      cx.fillRect(0, 0, cv.width, cv.height);
      const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#ffae5c';
      // grid
      cx.strokeStyle = 'rgba(255,255,255,0.04)';
      cx.lineWidth = 1;
      cx.beginPath();
      cx.moveTo(0, cv.height/2); cx.lineTo(cv.width, cv.height/2);
      cx.stroke();
      // waveform
      cx.strokeStyle = accent;
      cx.lineWidth = 2;
      cx.beginPath();
      const slice = cv.width / data.length;
      for (let i = 0; i < data.length; i++) {
        const y = (data[i] / 128 - 1) * 0.5 * cv.height + cv.height/2;
        if (i === 0) cx.moveTo(0, y); else cx.lineTo(i * slice, y);
      }
      cx.stroke();
      vizRAF = requestAnimationFrame(frame);
    }
    frame();
  }

  // build piano: 2 octaves C4–B5
  const keysHost = wrap.querySelector('.syn-keys');
  const startMidi = 60, octaves = 2;
  const whiteIdx = [0,2,4,5,7,9,11];
  const blackIdx = [1,3, null, 6,8,10, null];
  const whiteNotes = [];
  const blackNotes = [];
  for (let o = 0; o < octaves; o++) {
    whiteIdx.forEach((step) => whiteNotes.push(startMidi + 12*o + step));
    blackIdx.forEach((step) => blackNotes.push(step === null ? null : startMidi + 12*o + step));
  }
  const row = document.createElement('div'); row.className = 'row';
  // white keys
  whiteNotes.forEach((m) => {
    const k = document.createElement('div');
    k.className = 'syn-key';
    k.dataset.midi = m;
    const lab = Object.keys(SYNTH_KEY_MAP).find((kk) => SYNTH_KEY_MAP[kk] === m);
    k.innerHTML = '<div class="lab">' + (lab ? lab.toUpperCase() : '') + '<br/>' + midiToName(m) + '</div>';
    let down = false;
    k.addEventListener('mousedown', () => { down = true; noteOn(m); });
    addEventListener('mouseup', () => { if (down) { down = false; noteOff(m); } });
    k.addEventListener('mouseleave', () => { if (down) { down = false; noteOff(m); } });
    row.appendChild(k);
  });
  // black keys positioned absolutely
  const whiteCount = whiteNotes.length;
  blackNotes.forEach((m, i) => {
    if (m === null) return;
    const k = document.createElement('div');
    k.className = 'syn-key bk';
    k.dataset.midi = m;
    const groupIdx = i % 7;
    const oct = Math.floor(i / 7);
    const after = oct * 7 + (groupIdx < 2 ? groupIdx : groupIdx - 1); // skip the gap
    const leftPct = ((after + 1) / whiteCount) * 100;
    k.style.left = 'calc(' + leftPct + '% - ' + (100/whiteCount/2) + '%)';
    k.style.width = (100 / whiteCount * 0.6) + '%';
    let down = false;
    k.addEventListener('mousedown', (e) => { e.stopPropagation(); down = true; noteOn(m); });
    addEventListener('mouseup', () => { if (down) { down = false; noteOff(m); } });
    k.addEventListener('mouseleave', () => { if (down) { down = false; noteOff(m); } });
    row.appendChild(k);
  });
  keysHost.appendChild(row);

  // controls
  wrap.querySelectorAll('.syn-osc').forEach((b) => {
    b.addEventListener('click', () => {
      wrap.querySelectorAll('.syn-osc').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      waveform = b.dataset.w;
    });
  });
  wrap.querySelector('.syn-A').addEventListener('input', (e) => A = +e.target.value / 1000);
  wrap.querySelector('.syn-D').addEventListener('input', (e) => D = +e.target.value / 1000);
  wrap.querySelector('.syn-S').addEventListener('input', (e) => S = +e.target.value / 100);
  wrap.querySelector('.syn-R').addEventListener('input', (e) => R = +e.target.value / 1000);
  wrap.querySelector('.syn-cut').addEventListener('input', (e) => {
    cutoff = +e.target.value;
    active.forEach((v) => v.filter.frequency.setTargetAtTime(cutoff, ac.currentTime, 0.02));
  });
  wrap.querySelector('.syn-vol').addEventListener('input', (e) => {
    masterVol = +e.target.value / 100;
    if (master) master.gain.setTargetAtTime(masterVol, ac.currentTime, 0.02);
  });

  // computer keyboard
  const pressed = new Set();
  function onKD(e) {
    if (!wrap.closest('.pc-window')) return;
    if (e.target.matches('input, textarea')) return;
    const k = e.key.toLowerCase();
    if (SYNTH_KEY_MAP[k] !== undefined && !pressed.has(k)) {
      pressed.add(k);
      noteOn(SYNTH_KEY_MAP[k]);
      e.preventDefault();
    }
  }
  function onKU(e) {
    const k = e.key.toLowerCase();
    if (SYNTH_KEY_MAP[k] !== undefined && pressed.has(k)) {
      pressed.delete(k);
      noteOff(SYNTH_KEY_MAP[k]);
    }
  }
  addEventListener('keydown', onKD);
  addEventListener('keyup',   onKU);

  return {
    el: wrap,
    cleanup: () => {
      removeEventListener('keydown', onKD);
      removeEventListener('keyup',   onKU);
      if (vizRAF) cancelAnimationFrame(vizRAF);
      active.forEach((v) => { try { v.osc.stop(); } catch (_) {} });
      active.clear();
      if (ac) { try { ac.close(); } catch (_) {} }
    }
  };
}

/* ────────────────────────────────────────────────────────────
   VOICE COMMANDS (Web Speech API)
   ──────────────────────────────────────────────────────────── */
let voiceOn = false;
let voiceRecog = null;
function voiceStart() {
  if (voiceOn) return true;
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) {
    termWrite && termWrite('voice: this browser does not support speech recognition.', 'err');
    return false;
  }
  voiceRecog = new Rec();
  voiceRecog.continuous = true;
  voiceRecog.interimResults = false;
  voiceRecog.lang = 'en-US';
  voiceRecog.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const txt = (e.results[i][0].transcript || '').trim().toLowerCase();
      if (!txt) continue;
      voicePillSay(txt);
      const cleaned = txt.replace(/[.,!?]/g, '');
      // try the whole phrase, then drop one leading word at a time
      const tokens = cleaned.split(/\s+/);
      for (let s = 0; s < Math.min(tokens.length, 3); s++) {
        const sub = tokens.slice(s).join(' ');
        const parts = sub.split(/\s+/);
        const cmd = parts[0];
        if (COMMANDS[cmd]) {
          termWrite && termWrite('voice → ' + sub, 'ok');
          try { COMMANDS[cmd](parts.slice(1)); } catch (_) {}
          break;
        }
      }
    }
  };
  voiceRecog.onerror = (e) => {
    termWrite && termWrite('voice error: ' + (e.error || 'unknown'), 'err');
  };
  voiceRecog.onend = () => {
    if (voiceOn) { try { voiceRecog.start(); } catch (_) {} }
  };
  try { voiceRecog.start(); } catch (_) {}
  voiceOn = true;
  document.getElementById('voice-pill').classList.add('on');
  voicePillSay('listening…');
  return true;
}
function voiceStop() {
  if (!voiceOn) return;
  voiceOn = false;
  if (voiceRecog) { try { voiceRecog.stop(); } catch (_) {} }
  voiceRecog = null;
  document.getElementById('voice-pill').classList.remove('on');
}
function voicePillSay(text) {
  const lab = document.querySelector('#voice-pill .label');
  if (lab) lab.textContent = text.length > 32 ? text.slice(0, 32) + '…' : text;
}
const _voiceStopBtn = document.getElementById('voice-stop');
if (_voiceStopBtn) _voiceStopBtn.addEventListener('click', voiceStop);

/* ────────────────────────────────────────────────────────────
   KONAMI CODE → MATRIX RAIN
   ──────────────────────────────────────────────────────────── */
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiBuf = [];
let matrixActive = false;
let matrixRAF = null;

addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  konamiBuf.push(k);
  if (konamiBuf.length > KONAMI.length) konamiBuf.shift();
  if (konamiBuf.length === KONAMI.length && konamiBuf.every((x, i) => x === KONAMI[i])) {
    konamiBuf = [];
    matrixRain();
  }
});

function matrixRain() {
  if (matrixActive) return;
  matrixActive = true;
  const wrap = document.getElementById('matrix-rain');
  const cv = document.getElementById('matrix-rain-cv');
  if (!wrap || !cv) return;
  const cx = cv.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width  = innerWidth  * dpr;
  cv.height = innerHeight * dpr;
  const fontSize = 16 * dpr;
  const cols = Math.floor(cv.width / fontSize);
  const drops = new Array(cols).fill(0).map(() => Math.random() * cv.height);
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン01アMECKEDEV';
  wrap.classList.add('on');

  const start = performance.now();
  function frame() {
    if (!matrixActive) return;
    cx.fillStyle = 'rgba(0,0,0,0.10)';
    cx.fillRect(0, 0, cv.width, cv.height);
    cx.font = fontSize + 'px monospace';
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#8fd47f';
    for (let i = 0; i < cols; i++) {
      const c = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i];
      cx.fillStyle = (Math.random() < 0.04 ? '#ffffff' : accent);
      cx.fillText(c, x, y);
      drops[i] += fontSize * 0.9;
      if (drops[i] > cv.height && Math.random() > 0.975) drops[i] = 0;
    }
    matrixRAF = requestAnimationFrame(frame);
    if (performance.now() - start > 9000) stopMatrix();
  }
  function stopMatrix() {
    matrixActive = false;
    if (matrixRAF) cancelAnimationFrame(matrixRAF);
    wrap.classList.remove('on');
    setTimeout(() => { cx.clearRect(0, 0, cv.width, cv.height); }, 700);
  }
  frame();
  termWrite && termWrite('// the matrix has you. (konami)', 'ok');
}

applyAll();
bindHover();

/* ════════════════════════════════════════════════════════════
   CS_GUESS — embedded Counter-Strike 2 item identification game
   ════════════════════════════════════════════════════════════
   Lazy-initializes when the user opens the briefing.
   ──────────────────────────────────────────────────────────── */
GAME_INIT.csguess = function () {
  const STEAM_IMG_PREFIX = 'https://community.akamai.steamstatic.com/economy/image/';
  const RARITY_COLORS = {
    'Superior': '#d32ce6',         'Exceptional': '#8847ff',  'Master': '#eb4b4b',
    'Distinguished': '#4b69ff',    'Extraordinary': '#eb4b4b','Base Grade': '#b0c3d9',
    'Exotic': '#d32ce6',           'Remarkable': '#8847ff',   'High Grade': '#4b69ff',
    'Highlight Base Grade': '#ffd7aa', 'Classified': '#d32ce6', 'Covert': '#eb4b4b',
    'Mil-Spec Grade': '#4b69ff',   'Restricted': '#8847ff',   'Industrial Grade': '#5e98d9',
    'Consumer Grade': '#b0c3d9',   'Contraband': '#e4ae39',   'Default': '#ded6cc',
  };
  const STATS_KEY = 'cs_guess_stats_v1';
  const ROUND_KEY = 'cs_guess_round_v1';
  const STAGES = [
    { filter: 'blur(20px) contrast(180%) grayscale(100%) brightness(0.35)', overlay: 0.65 },
    { filter: 'blur(12px) brightness(0.6)',                                 overlay: 0.45 },
    { filter: 'blur(7px) brightness(0.85)',                                 overlay: 0.25 },
    { filter: 'blur(4px)',                                                  overlay: 0.12 },
    { filter: 'blur(2px)',                                                  overlay: 0.04 },
    { filter: 'blur(1px)',                                                  overlay: 0    },
    { filter: 'none',                                                       overlay: 0    },
  ];
  const CATEGORY_LABEL = {
    skin:'Weapon Skin', sticker:'Sticker', crate:'Container', key:'Key', agent:'Agent',
    music_kit:'Music Kit', graffiti:'Graffiti', patch:'Patch', collectible:'Collectible',
    tool:'Tool', highlight:'Tournament Highlight', base_weapon:'Base Weapon', unknown:'Item',
  };

  const csg = {
    allItems: [], targetItem: null, attempts: 0, maxAttempts: 6,
    guesses: [], status: 'loading', startTime: 0, endTime: 0, roundNumber: 0,
    hintsRevealed: 0,
  };

  function loadStats() {
    try { const raw = localStorage.getItem(STATS_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    return { played: 0, won: 0, currentStreak: 0, bestStreak: 0, distribution: [0,0,0,0,0,0] };
  }
  function saveStats(s) { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {} }
  function loadRound() {
    try { const n = parseInt(localStorage.getItem(ROUND_KEY) || '0', 10); return Number.isFinite(n) ? n : 0; }
    catch (e) { return 0; }
  }
  function saveRound(n) { try { localStorage.setItem(ROUND_KEY, String(n)); } catch (e) {} }

  let stats = loadStats();
  csg.roundNumber = loadRound();

  const $ = (id) => document.getElementById(id);
  const els = {
    loading:        $('csg-loading'),
    loadingMsg:     $('csg-loadingMsg'),
    loadingRetry:   $('csg-loadingRetry'),
    targetImg:      $('csg-targetImg'),
    targetOverlay:  $('csg-targetOverlay'),
    scanline:       $('csg-scanlineEl'),
    statusText:     $('csg-statusText'),
    attemptDots:    $('csg-attemptDots'),
    attemptCount:   $('csg-attemptCount'),
    searchInput:    $('csg-searchInput'),
    dropdown:       $('csg-dropdown'),
    historyList:    $('csg-historyList'),
    historyMeta:    $('csg-historyMeta'),
    poolMeta:       $('csg-poolMeta'),
    roundMeta:      $('csg-roundMeta'),
    barRound:       $('csg-round'),
    barPool:        $('csg-pool'),
    hintList:       $('csg-hintList'),
    resultModal:    $('csg-resultModal'),
    resultTitle:    $('csg-resultTitle'),
    resultImage:    $('csg-resultImage'),
    resultImageBox: $('csg-resultImageBox'),
    resultName:     $('csg-resultName'),
    resultCat:      $('csg-resultCat'),
    resultDesc:     $('csg-resultDesc'),
    resultAttempts: $('csg-resultAttempts'),
    resultTime:     $('csg-resultTime'),
    emojiRow:       $('csg-emojiRow'),
    shareBtn:       $('csg-shareBtn'),
    playAgainBtn:   $('csg-playAgainBtn'),
    statsModal:     $('csg-statsModal'),
    statRow:        $('csg-statRow'),
    distList:       $('csg-distList'),
    resetStatsBtn:  $('csg-resetStatsBtn'),
    howModal:       $('csg-howModal'),
    howBtn:         $('csg-how'),
    statsBtn:       $('csg-stats'),
    newBtn:         $('csg-new'),
    exitBtn:        $('csg-exit'),
  };

  function categorize(item) {
    const id = (item.id || '').toLowerCase();
    if (id.startsWith('skin-'))        return 'skin';
    if (id.startsWith('sticker-'))     return 'sticker';
    if (id.startsWith('crate-'))       return 'crate';
    if (id.startsWith('key-'))         return 'key';
    if (id.startsWith('agent-'))       return 'agent';
    if (id.startsWith('music_kit-'))   return 'music_kit';
    if (id.startsWith('graffiti-'))    return 'graffiti';
    if (id.startsWith('patch-'))       return 'patch';
    if (id.startsWith('collectible-')) return 'collectible';
    if (id.startsWith('tool-'))        return 'tool';
    if (id.startsWith('highlight-'))   return 'highlight';
    if (id.startsWith('weapon-'))      return 'base_weapon';
    if (item.type && typeof item.type === 'string') {
      const t = item.type.toLowerCase();
      if (t.includes('skin'))    return 'skin';
      if (t.includes('sticker')) return 'sticker';
      if (t.includes('agent'))   return 'agent';
      if (t.includes('crate') || t.includes('case')) return 'crate';
    }
    return 'unknown';
  }

  function expandItem(o) {
    return {
      id:          o.c + ':' + o.n,
      name:        o.n,
      image:       (typeof o.i === 'string' && o.i.startsWith('http')) ? o.i : (STEAM_IMG_PREFIX + (o.i || '')),
      rarity:      o.r ? { name: o.r, color: RARITY_COLORS[o.r] || '#888' } : null,
      description: null,
      category:    o.c,
      weapon:      o.w  ? { name: o.w } : null,
      pattern:     o.p  ? { name: o.p } : null,
      crates:      o.cr ? [o.cr] : [],
      collections: o.co ? [o.co] : [],
      team:        o.t || null,
    };
  }

  async function loadEmbedded() {
    const node = document.getElementById('csg-cs2-data');
    const b64 = (window.CSG_CS2_DATA || (node ? node.textContent : '')).replace(/\s+/g, '');
    if (!b64) throw new Error('CS_GUESS registry data missing');
    const binStr = atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Browser missing DecompressionStream. Use a recent Chrome / Firefox / Edge / Safari.');
    }
    const ds = new DecompressionStream('gzip');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    return JSON.parse(new TextDecoder('utf-8').decode(buf));
  }

  function setLoadingMsg(msg, isError) {
    els.loadingMsg.textContent = msg;
    els.loadingMsg.classList.toggle('csg-loading-error', !!isError);
  }

  async function loadData() {
    els.loadingRetry.style.display = 'none';
    els.loadingMsg.classList.remove('csg-loading-error');
    setLoadingMsg('Decompressing embedded registry…');
    try {
      const raw = await loadEmbedded();
      setLoadingMsg('Indexing entries…');
      await new Promise(r => setTimeout(r, 0));
      const items = raw.map(expandItem)
        .filter(i => i.name && i.image)
        .filter((it, idx, arr) => arr.findIndex(x => x.name === it.name) === idx);
      if (!items.length) throw new Error('Registry parsed empty.');
      for (const it of items) it._lname = it.name.toLowerCase();
      csg.allItems = items;
      setLoadingMsg('✓ ' + items.length.toLocaleString() + ' items indexed.');
      await new Promise(r => setTimeout(r, 350));
      els.loading.classList.add('hidden');
      startNewRound();
    } catch (err) {
      console.error(err);
      setLoadingMsg('LOAD FAILED — ' + (err.message || err), true);
      els.loadingRetry.style.display = 'inline-block';
    }
  }

  els.loadingRetry.addEventListener('click', () => {
    els.loadingRetry.style.display = 'none';
    els.loadingMsg.classList.remove('csg-loading-error');
    loadData();
  });

  /* HTML escape helpers — safe interpolation for innerHTML / attributes */
  const _ESC_HTML = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => _ESC_HTML[c]); }
  function escapeAttr(s) { return escapeHtml(s); }

  /* image error handling (silent — placeholder background) */
  const imgStats = { ok: 0, fail: 0 };
  function onImgError(imgEl) {
    imgStats.fail += 1;
    imgEl.style.opacity = '0.18';
    imgEl.style.background = 'repeating-linear-gradient(45deg, #2a2f3a, #2a2f3a 4px, #1b1f28 4px, #1b1f28 8px)';
  }
  function onImgLoad() { imgStats.ok += 1; }
  window.csgOnImgError = onImgError;
  window.csgOnImgLoad  = onImgLoad;

  let _categoryIndex = null;
  function pickWeightedTarget() {
    if (!_categoryIndex) {
      _categoryIndex = {};
      for (const it of csg.allItems) {
        (_categoryIndex[it.category] = _categoryIndex[it.category] || []).push(it);
      }
    }
    const cats = Object.keys(_categoryIndex).filter(c => _categoryIndex[c].length >= 1);
    const weights = cats.map(c => Math.sqrt(_categoryIndex[c].length));
    const total = weights.reduce((a,b)=>a+b, 0);
    let r = Math.random() * total, cat = cats[0];
    for (let i = 0; i < cats.length; i++) {
      r -= weights[i];
      if (r <= 0) { cat = cats[i]; break; }
    }
    const pool = _categoryIndex[cat];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function startNewRound() {
    csg.targetItem    = pickWeightedTarget();
    csg.attempts      = 0;
    csg.guesses       = [];
    csg.status        = 'playing';
    csg.startTime     = Date.now();
    csg.endTime       = 0;
    csg.hintsRevealed = 0;
    csg.roundNumber  += 1;
    saveRound(csg.roundNumber);
    els.targetImg.src = csg.targetItem.image;
    els.targetImg.alt = '';
    els.searchInput.disabled = false;
    els.searchInput.value = '';
    els.searchInput.focus();
    closeDropdown();
    const roundLabel = String(csg.roundNumber).padStart(3, '0');
    els.roundMeta.textContent = 'ROUND ' + roundLabel;
    if (els.barRound) els.barRound.textContent = roundLabel;
    const poolLabel = csg.allItems.length.toLocaleString();
    els.poolMeta.textContent = 'POOL // ' + poolLabel;
    if (els.barPool) els.barPool.textContent = poolLabel;
    els.statusText.textContent = 'SCANNING';
    renderAttemptDots();
    renderHistory();
    renderHints();
    applyStage();
  }

  function applyStage() {
    const stage = STAGES[Math.min(csg.attempts, STAGES.length - 1)];
    els.targetImg.style.filter = stage.filter;
    els.targetOverlay.style.opacity = String(stage.overlay);
    if (csg.attempts > 0 && csg.status === 'playing') {
      els.scanline.classList.remove('active');
      void els.scanline.offsetWidth;
      els.scanline.classList.add('active');
    }
  }

  function buildHint(item, n) {
    switch (n) {
      case 1: return { k:'CATEGORY', v: CATEGORY_LABEL[item.category] || 'Item' };
      case 2: {
        if (item.weapon) return { k:'CLASS / WEAPON', v: item.weapon.name };
        if (item.team)   return { k:'TEAM', v: item.team };
        return { k:'TYPE', v: CATEGORY_LABEL[item.category] || 'Item' };
      }
      case 3: {
        if (item.rarity && item.rarity.name) return { k:'RARITY', v: item.rarity.name, color: item.rarity.color };
        return { k:'RARITY', v:'Unranked' };
      }
      case 4: {
        if (item.crates && item.crates.length)             return { k:'ORIGIN', v:'From: ' + item.crates[0] };
        if (item.collections && item.collections.length)   return { k:'COLLECTION', v: item.collections[0] };
        return { k:'ORIGIN', v:'No container source' };
      }
      case 5: {
        const masked = item.name.split('').map((ch, i) => {
          if (i === 0)                  return ch.toUpperCase();
          if (/[\s|\-,.()'"]/.test(ch)) return ch;
          if (/[0-9]/.test(ch))         return ch;
          return '_';
        }).join(' ');
        return { k:'NAME PATTERN', v: masked, mono: true };
      }
      case 6: {
        if (item.description) {
          const cleaned = item.description.replace(/<[^>]+>/g, '');
          const words = cleaned.split(/\s+/).filter(w => w.length >= 5 && !/^\W+$/.test(w));
          if (words.length) {
            const w = words[Math.floor(words.length / 2)].replace(/[^\w-]/g, '');
            if (w) return { k:'FLAVOR HINT', v:'"…' + w + '…"' };
          }
        }
        const initials = item.name.split(/\s+/).map(w => w[0]).join('.');
        return { k:'INITIALS', v: initials + '.' };
      }
    }
    return { k:'', v:'' };
  }

  function renderHints() {
    const cards = els.hintList.querySelectorAll('.csg-hint-card');
    for (let i = 0; i < 6; i++) {
      const card = cards[i];
      const body = card.querySelector('.csg-hint-body');
      if (i < csg.hintsRevealed && csg.targetItem) {
        const h = buildHint(csg.targetItem, i + 1);
        card.classList.remove('locked');
        let valHtml = '';
        if (i === 2 && csg.targetItem.rarity && csg.targetItem.rarity.color) {
          const c = csg.targetItem.rarity.color;
          valHtml = `<span class="csg-rarity-pill" style="color:${c};">${escapeHtml(h.v)}</span>`;
        } else if (h.mono) {
          valHtml = `<span class="csg-v csg-mono">${escapeHtml(h.v)}</span>`;
        } else {
          valHtml = `<span class="csg-v">${escapeHtml(h.v)}</span>`;
        }
        body.innerHTML = `<span class="csg-k">${escapeHtml(h.k)}</span>${valHtml}`;
      } else {
        card.classList.add('locked');
        body.innerHTML = `<span class="csg-k">${escapeHtml(['Category','Class / Type','Rarity','Origin','Name Pattern','Final Tip'][i])}</span><span class="csg-v locked">— locked —</span>`;
      }
    }
  }

  let searchTimer = null;
  let dropdownItems = [];
  let dropdownIndex = -1;
  els.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(els.searchInput.value), 130);
  });
  els.searchInput.addEventListener('keydown', (e) => {
    if (els.dropdown.classList.contains('open')) {
      if (e.key === 'ArrowDown')      { e.preventDefault(); dropdownIndex = Math.min(dropdownItems.length - 1, dropdownIndex + 1); updateDropdownActive(); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); dropdownIndex = Math.max(0, dropdownIndex - 1); updateDropdownActive(); }
      else if (e.key === 'Enter')     { e.preventDefault(); if (dropdownIndex >= 0 && dropdownItems[dropdownIndex]) submitGuess(dropdownItems[dropdownIndex]); }
      else if (e.key === 'Escape')    { e.preventDefault(); e.stopPropagation(); closeDropdown(); }
    }
  });
  document.addEventListener('click', (e) => {
    if (!els.dropdown.contains(e.target) && e.target !== els.searchInput) closeDropdown();
  });
  window.addEventListener('scroll', () => {
    if (els.dropdown.classList.contains('open')) positionDropdown();
  }, true);
  window.addEventListener('resize', () => {
    if (els.dropdown.classList.contains('open')) positionDropdown();
  });

  function runSearch(qRaw) {
    const q = qRaw.trim().toLowerCase();
    if (q.length < 2) { closeDropdown(); return; }
    if (csg.status !== 'playing') return;
    const tokens = q.split(/\s+/).filter(Boolean);
    if (!tokens.length) { closeDropdown(); return; }
    const limit = 12;
    const scored = [];
    for (const it of csg.allItems) {
      const n = it._lname;
      let allMatch = true;
      for (let i = 0; i < tokens.length; i++) {
        if (n.indexOf(tokens[i]) === -1) { allMatch = false; break; }
      }
      if (!allMatch) continue;
      let score;
      if (n === q)                  score = 10000;
      else if (n.startsWith(q))     score = 5000;
      else if (n.indexOf(q) !== -1) score = 2000;
      else                          score = 200;
      const words = n.split(/[\s|()\-,/]+/).filter(Boolean);
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        let added = 8;
        for (let j = 0; j < words.length; j++) {
          const w = words[j];
          if (w === t)              { added = 100; break; }
          else if (w.startsWith(t)) { added = Math.max(added, 50); }
        }
        score += added;
      }
      score -= n.length * 0.4;
      scored.push({ it, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit).map(s => s.it);
    renderDropdown(top);
  }

  function positionDropdown() {
    const r = els.searchInput.getBoundingClientRect();
    const dd = els.dropdown;
    dd.style.left  = r.left  + 'px';
    dd.style.width = r.width + 'px';
    const gapBelow = window.innerHeight - r.bottom - 12;
    const gapAbove = r.top - 12;
    if (gapBelow < 220 && gapAbove > gapBelow) {
      dd.style.top = '';
      dd.style.bottom = (window.innerHeight - r.top + 6) + 'px';
      dd.style.maxHeight = Math.min(540, gapAbove) + 'px';
    } else {
      dd.style.bottom = '';
      dd.style.top = (r.bottom + 6) + 'px';
      dd.style.maxHeight = Math.min(540, gapBelow) + 'px';
    }
  }

  function renderDropdown(items) {
    dropdownItems = items;
    dropdownIndex = -1;
    if (!items.length) {
      els.dropdown.innerHTML = '<div class="csg-dropdown-empty">// NO MATCHES //</div>';
      els.dropdown.classList.add('open');
      positionDropdown();
      return;
    }
    els.dropdown.innerHTML = items.map((it, i) => {
      const rarityColor = it.rarity && it.rarity.color ? it.rarity.color : 'transparent';
      return `
        <div class="csg-dropdown-item" data-i="${i}">
          <div class="csg-di-rarity" style="background:${rarityColor};"></div>
          <img src="${escapeAttr(it.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onload="csgOnImgLoad()" onerror="csgOnImgError(this)" />
          <div class="csg-di-info">
            <div class="csg-di-name">${escapeHtml(it.name)}</div>
            <div class="csg-di-cat">${escapeHtml(CATEGORY_LABEL[it.category] || 'Item')}</div>
          </div>
        </div>`;
    }).join('');
    els.dropdown.classList.add('open');
    positionDropdown();
    els.dropdown.querySelectorAll('.csg-dropdown-item').forEach(el => {
      el.addEventListener('click', () => {
        const i = parseInt(el.dataset.i, 10);
        submitGuess(dropdownItems[i]);
      });
    });
  }

  function updateDropdownActive() {
    els.dropdown.querySelectorAll('.csg-dropdown-item').forEach((el, i) => {
      el.classList.toggle('active', i === dropdownIndex);
      if (i === dropdownIndex) el.scrollIntoView({ block: 'nearest' });
    });
  }
  function closeDropdown() {
    els.dropdown.classList.remove('open');
    els.dropdown.innerHTML = '';
    dropdownItems = [];
    dropdownIndex = -1;
  }

  function submitGuess(item) {
    if (csg.status !== 'playing' || !item) return;
    els.searchInput.value = '';
    closeDropdown();
    const result = evaluateGuess(item, csg.targetItem);
    csg.guesses.push({ item, ...result });
    csg.attempts += 1;
    csg.hintsRevealed = Math.min(csg.attempts, 6);
    applyStage();
    renderAttemptDots();
    renderHistory(true);
    renderHints();
    if (result.color === 'green') {
      csg.status = 'won';
      csg.endTime = Date.now();
      onWin();
    } else if (csg.attempts >= csg.maxAttempts) {
      csg.status = 'lost';
      csg.endTime = Date.now();
      onLose();
    }
  }

  function evaluateGuess(guess, target) {
    if (guess.id === target.id || guess.name === target.name) {
      return { color:'green', message:'TARGET CONFIRMED', code:'G' };
    }
    if (guess.category === 'skin' && target.category === 'skin') {
      const sameWeapon  = !!(guess.weapon && target.weapon && guess.weapon.name === target.weapon.name);
      const samePattern = !!(guess.pattern && target.pattern && guess.pattern.name === target.pattern.name);
      if (sameWeapon  && !samePattern) return { color:'orange', message:'Right weapon, wrong finish', code:'O' };
      if (!sameWeapon && samePattern)  return { color:'yellow', message:'Right finish, wrong weapon', code:'Y' };
      if (sameRarity(guess, target))   return { color:'red',    message:'Wrong skin · same rarity',   code:'R' };
      return { color:'red', message:'Wrong weapon · wrong finish', code:'R' };
    }
    if (guess.category === target.category) {
      const sr = sameRarity(guess, target) ? ' · same rarity' : '';
      return { color:'orange', message:'Right category (' + (CATEGORY_LABEL[target.category] || '—') + ')' + sr, code:'O' };
    }
    return { color:'red', message:'Wrong category', code:'R' };
  }

  function sameRarity(a, b) {
    return !!(a.rarity && b.rarity && a.rarity.name && b.rarity.name && a.rarity.name === b.rarity.name);
  }

  function renderAttemptDots() {
    let html = '';
    for (let i = 0; i < csg.maxAttempts; i++) {
      const g = csg.guesses[i];
      let cls = 'csg-attempt-dot';
      if (g) cls += ' ' + g.color;
      else if (i === csg.attempts && csg.status === 'playing') cls += ' active';
      else if (i < csg.attempts) cls += ' used';
      html += `<div class="${cls}"></div>`;
    }
    els.attemptDots.innerHTML = html;
    els.attemptCount.textContent = csg.attempts;
  }

  function renderHistory(animateLast) {
    if (!csg.guesses.length) {
      els.historyList.innerHTML = '<div class="csg-history-empty">// No guesses logged yet //</div>';
      els.historyMeta.textContent = '0 ENTRIES';
      return;
    }
    els.historyMeta.textContent = csg.guesses.length + ' ENTRIES';
    els.historyList.innerHTML = csg.guesses.map((g, i) => {
      const isLast = animateLast && i === csg.guesses.length - 1;
      const shake  = isLast && g.color !== 'green' ? ' shake' : '';
      return `
        <div class="csg-guess-card ${g.color}${shake}">
          <span class="csg-gc-num">#${String(i + 1).padStart(2, '0')}</span>
          <img src="${escapeAttr(g.item.image)}" alt="" referrerpolicy="no-referrer" onload="csgOnImgLoad()" onerror="csgOnImgError(this)" />
          <div class="csg-gc-info">
            <div class="csg-gc-name">${escapeHtml(g.item.name)}</div>
            <div class="csg-gc-msg">${escapeHtml(g.message)}</div>
          </div>
        </div>`;
    }).join('');
  }

  function onWin() {
    els.statusText.textContent = 'CONFIRMED';
    els.searchInput.disabled = true;
    stats.played += 1;
    stats.won += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    stats.distribution[csg.attempts - 1] = (stats.distribution[csg.attempts - 1] || 0) + 1;
    saveStats(stats);
    gameConfetti('csg-confetti', 90);
    showResultModal(true);
  }
  function onLose() {
    els.statusText.textContent = 'FAILED';
    els.searchInput.disabled = true;
    stats.played += 1;
    stats.currentStreak = 0;
    saveStats(stats);
    showResultModal(false);
  }

  function showResultModal(won) {
    const item = csg.targetItem;
    els.resultTitle.textContent = won ? '// TARGET NEUTRALIZED' : '// MISSION FAILED';
    els.resultImage.src = item.image;
    els.resultImageBox.classList.toggle('win', won);
    els.resultImageBox.classList.toggle('lose', !won);
    els.resultName.textContent = item.name;
    const catLabel = CATEGORY_LABEL[item.category] || 'Item';
    const rarity = item.rarity && item.rarity.name ? item.rarity.name : '';
    els.resultCat.textContent = rarity ? (catLabel + ' · ' + rarity) : catLabel;
    const desc = item.description ? item.description.replace(/<[^>]+>/g, '') : '';
    els.resultDesc.textContent = desc;
    els.resultDesc.style.display = desc ? 'block' : 'none';
    els.resultAttempts.textContent = won ? `${csg.attempts} / 6` : `X / 6`;
    const seconds = Math.round((csg.endTime - csg.startTime) / 1000);
    const mm = Math.floor(seconds / 60);
    const ss = seconds % 60;
    els.resultTime.textContent = `${mm}:${String(ss).padStart(2, '0')}`;
    els.emojiRow.textContent = buildEmojiGrid();
    openCsgModal('csg-resultModal');
  }

  function buildEmojiGrid() {
    const codeMap = { G:'🟩', O:'🟧', Y:'🟨', R:'🟥' };
    let row = '';
    for (let i = 0; i < csg.maxAttempts; i++) {
      const g = csg.guesses[i];
      row += g ? (codeMap[g.code] || '⬛') : '⬛';
    }
    return row;
  }

  function showStatsModal() {
    const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
    els.statRow.innerHTML = `
      <div class="csg-stat-cell"><div class="csg-v">${stats.played}</div><div class="csg-k">Played</div></div>
      <div class="csg-stat-cell"><div class="csg-v">${winRate}%</div><div class="csg-k">Win Rate</div></div>
      <div class="csg-stat-cell"><div class="csg-v">${stats.currentStreak}</div><div class="csg-k">Streak</div></div>
      <div class="csg-stat-cell"><div class="csg-v">${stats.bestStreak}</div><div class="csg-k">Best</div></div>
    `;
    const max = Math.max(1, ...stats.distribution);
    els.distList.innerHTML = stats.distribution.map((n, i) => {
      const pct = (n / max) * 100;
      const w = Math.max(8, pct);
      const zeroCls = n === 0 ? ' zero' : '';
      return `
        <div class="csg-dist-row">
          <span class="csg-lbl">${i + 1}</span>
          <div class="csg-bar">
            <div class="csg-fill${zeroCls}" style="width:${w}%;">${n}</div>
          </div>
        </div>`;
    }).join('');
    openCsgModal('csg-statsModal');
  }

  function openCsgModal(id)  { document.getElementById(id).classList.add('open'); }
  function closeCsgModal(id) { document.getElementById(id).classList.remove('open'); }
  function closeAllCsgModals() {
    document.querySelectorAll('.csg-modal-overlay.open').forEach(o => o.classList.remove('open'));
  }
  document.querySelectorAll('[data-csg-close]').forEach(btn => {
    btn.addEventListener('click', () => closeCsgModal(btn.dataset.csgClose));
  });
  document.querySelectorAll('.csg-modal-overlay').forEach(o => {
    o.addEventListener('click', (e) => { if (e.target === o) o.classList.remove('open'); });
  });

  els.howBtn.addEventListener('click', () => openCsgModal('csg-howModal'));
  els.statsBtn.addEventListener('click', showStatsModal);
  els.newBtn.addEventListener('click', () => {
    if (csg.status === 'playing' && csg.attempts > 0) {
      if (!confirm('Abort current round and start new one?')) return;
      stats.played += 1;
      stats.currentStreak = 0;
      saveStats(stats);
    }
    closeCsgModal('csg-resultModal');
    if (csg.allItems.length) startNewRound();
  });
  els.exitBtn.addEventListener('click', () => disableGame());
  els.playAgainBtn.addEventListener('click', () => {
    closeCsgModal('csg-resultModal');
    startNewRound();
  });
  els.shareBtn.addEventListener('click', async () => {
    const item = csg.targetItem;
    const won = csg.status === 'won';
    const txt =
      `CS_GUESS #${String(csg.roundNumber).padStart(3, '0')}\n` +
      `${won ? csg.attempts : 'X'}/6\n` +
      `${buildEmojiGrid()}\n` +
      (won ? `✓ ${item.name}` : `✗ was: ${item.name}`);
    try {
      await navigator.clipboard.writeText(txt);
      els.shareBtn.textContent = '✓ COPIED';
      setTimeout(() => { els.shareBtn.textContent = '📋 COPY'; }, 1600);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); els.shareBtn.textContent = '✓ COPIED'; } catch (_) {}
      ta.remove();
      setTimeout(() => { els.shareBtn.textContent = '📋 COPY'; }, 1600);
    }
  });
  els.resetStatsBtn.addEventListener('click', () => {
    if (!confirm('Reset all statistics? This cannot be undone.')) return;
    stats = { played: 0, won: 0, currentStreak: 0, bestStreak: 0, distribution: [0,0,0,0,0,0] };
    saveStats(stats);
    showStatsModal();
  });

  /* Escape handler — close inner modals first; otherwise the global
     game-stage handler will close the briefing entirely. */
  window.addEventListener('keydown', (e) => {
    if (activeGame !== 'csguess') return;
    if (e.key !== 'Escape') return;
    const openOverlay = document.querySelector('.csg-modal-overlay.open');
    if (openOverlay) {
      e.preventDefault();
      e.stopPropagation();
      closeAllCsgModals();
      return;
    }
    if (els.dropdown.classList.contains('open')) {
      e.preventDefault();
      e.stopPropagation();
      closeDropdown();
    }
  }, true);

  let dataLoadStarted = false;
  GAME_OPEN.csguess = function () {
    closeAllCsgModals();
    if (!dataLoadStarted) {
      dataLoadStarted = true;
      loadData();
    } else if (csg.status !== 'loading') {
      // resume — focus the input so the user can keep typing
      setTimeout(() => { try { els.searchInput.focus(); } catch (_) {} }, 80);
    }
  };
  GAME_CLOSE.csguess = function () {
    closeAllCsgModals();
    closeDropdown();
  };
};

/* ════════════════════════════════════════════════════════════
   SYNTH_LAB — fullscreen showcase synth (Web Audio)
   ════════════════════════════════════════════════════════════ */
GAME_INIT.synthlab = function () {
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const midiToName = (m) => NOTE_NAMES[((m%12)+12)%12] + Math.floor(m/12 - 1);
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Computer-key → relative semitone offset (added to state.octave * 12)
  const KEY_MAP = {
    'z':0,'s':1,'x':2,'d':3,'c':4,'v':5,'g':6,'b':7,'h':8,'n':9,'j':10,'m':11,
    ',':12,'l':13,'.':14,';':15,'/':16,
    'q':12,'2':13,'w':14,'3':15,'e':16,'r':17,'5':18,'t':19,'6':20,'y':21,'7':22,'u':23,
    'i':24,'9':25,'o':26,'0':27,'p':28,
  };

  const root = document.getElementById('game-synthlab');
  const stage = root.querySelector('#sl-stage');
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => root.querySelectorAll(s);

  const state = {
    octave: 4,
    voiceMode: 'poly',          // poly | mono | legato
    glide: 0,                   // s
    pitchBend: 0,               // semitones (-2..2)
    modWheel: 0,                // 0..1
    sustain: false,
    bpm: 120,
    masterVol: 0.5,
    osc: [
      { wave:'sawtooth', oct:0,  detune:-7, mix:0.5, on:true },
      { wave:'square',   oct:0,  detune:7,  mix:0.4, on:true },
      { wave:'triangle', oct:-1, detune:0,  mix:0.3, on:false },
    ],
    filter: { type:'lowpass', cutoff:1800, Q:6, envAmt:2400, kbdTrack:0.3 },
    ampEnv: { a:0.01,  d:0.2,  s:0.6, r:0.5 },
    fEnv:   { a:0.005, d:0.3,  s:0.3, r:0.4 },
    lfo: [
      { wave:'sine', rate:5,   depth:0, dest:'pitch'  },
      { wave:'sine', rate:0.6, depth:0, dest:'filter' },
    ],
    fx: {
      drive: 0,
      chorus: 0,
      delayTime: 0.32, delayFb: 0.35, delayMix: 0.18,
      reverbMix: 0.15, reverbSize: 2.2,
      width: 0.6,
    },
    arp:  { on:false, pattern:'up', octaves:1, gate:0.6 },
    seq:  { on:false, len:16, swing:0, steps: [] },
    drum: { on:false, vol:0.7, kick: Array(16).fill(0), snare: Array(16).fill(0), hat: Array(16).fill(0) },
  };
  for (let i = 0; i < 16; i++) state.seq.steps.push({ note: 60, on: false, vel: 0.8 });

  /* ── Audio graph ────────────────────────────────────────── */
  let ac=null, master=null, fxIn=null,
      driveNode=null, chorusRef=null,
      delayNode=null, delayFbNode=null, delayWet=null,
      reverbNode=null, reverbWet=null,
      scopeAnalyser=null, specAnalyser=null,
      recDest=null, recorder=null, recChunks=[];

  function makeDriveCurve(amount) {
    const k = amount * 100, n = 1024, c = new Float32Array(n);
    for (let i=0;i<n;i++) { const x = (i/n)*2-1; c[i] = (1+k)*x / (1 + k*Math.abs(x)); }
    return c;
  }
  function makeIR(ctx, seconds, decay) {
    const sr = ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * seconds));
    const buf = ctx.createBuffer(2, len, sr);
    for (let c=0;c<2;c++) {
      const ch = buf.getChannelData(c);
      for (let i=0;i<len;i++) ch[i] = (Math.random()*2-1) * Math.pow(1 - i/len, decay);
    }
    return buf;
  }
  function makeNoiseBuf(ctx) {
    const len = Math.floor(ctx.sampleRate * 1.0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i=0;i<len;i++) ch[i] = Math.random()*2-1;
    return buf;
  }
  function makeChorus(ctx) {
    const input = ctx.createGain(), output = ctx.createGain();
    const dryGain = ctx.createGain(); dryGain.gain.value = 1;
    input.connect(dryGain); dryGain.connect(output);
    const lfo1 = ctx.createOscillator(); lfo1.frequency.value = 0.7;
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 1.1;
    const dep1 = ctx.createGain(); dep1.gain.value = 0.0025;
    const dep2 = ctx.createGain(); dep2.gain.value = 0.0025;
    const d1 = ctx.createDelay(0.05); d1.delayTime.value = 0.012;
    const d2 = ctx.createDelay(0.05); d2.delayTime.value = 0.018;
    const w1 = ctx.createGain(); w1.gain.value = 0;
    const w2 = ctx.createGain(); w2.gain.value = 0;
    lfo1.connect(dep1); dep1.connect(d1.delayTime);
    lfo2.connect(dep2); dep2.connect(d2.delayTime);
    input.connect(d1); d1.connect(w1); w1.connect(output);
    input.connect(d2); d2.connect(w2); w2.connect(output);
    lfo1.start(); lfo2.start();
    return { input, output, set(amt){
      const a = Math.max(0, Math.min(1, amt));
      w1.gain.value = a*0.5; w2.gain.value = a*0.5;
      dryGain.gain.value = 1 - a*0.3;
    }};
  }

  function ensureAudio() {
    if (ac) return ac;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ac = new Ctx();
    fxIn = ac.createGain();

    driveNode = ac.createWaveShaper();
    driveNode.curve = makeDriveCurve(state.fx.drive);
    driveNode.oversample = '4x';
    fxIn.connect(driveNode);

    chorusRef = makeChorus(ac);
    chorusRef.set(state.fx.chorus);
    driveNode.connect(chorusRef.input);

    delayNode = ac.createDelay(2.0);
    delayNode.delayTime.value = state.fx.delayTime;
    delayFbNode = ac.createGain(); delayFbNode.gain.value = state.fx.delayFb;
    delayWet = ac.createGain(); delayWet.gain.value = state.fx.delayMix;
    chorusRef.output.connect(delayNode);
    delayNode.connect(delayFbNode); delayFbNode.connect(delayNode);

    reverbNode = ac.createConvolver();
    reverbNode.buffer = makeIR(ac, state.fx.reverbSize, 2.5);
    reverbWet = ac.createGain(); reverbWet.gain.value = state.fx.reverbMix;
    chorusRef.output.connect(reverbNode);

    master = ac.createGain(); master.gain.value = state.masterVol;
    chorusRef.output.connect(master);
    delayNode.connect(delayWet); delayWet.connect(master);
    reverbNode.connect(reverbWet); reverbWet.connect(master);

    scopeAnalyser = ac.createAnalyser(); scopeAnalyser.fftSize = 2048;
    specAnalyser  = ac.createAnalyser(); specAnalyser.fftSize  = 2048;
    master.connect(scopeAnalyser);
    master.connect(specAnalyser);
    master.connect(ac.destination);
    recDest = ac.createMediaStreamDestination();
    master.connect(recDest);

    drawScope();
    return ac;
  }

  /* ── Voices ─────────────────────────────────────────────── */
  let voiceId = 0;
  const voices = new Map();   // midi → voice
  let monoVoice = null;

  function noteOn(midi, vel = 0.8) {
    const ctx = ensureAudio(); if (!ctx) return;
    if (state.voiceMode !== 'poly' && monoVoice) {
      const t = ctx.currentTime;
      voices.delete(monoVoice.midi);
      monoVoice.midi = midi;
      monoVoice.oscs.forEach((o, i) => {
        if (!o) return;
        const f = midiToFreq(midi + state.osc[i].oct * 12);
        o.frequency.cancelScheduledValues(t);
        if (state.glide > 0) o.frequency.exponentialRampToValueAtTime(Math.max(0.01, f), t + state.glide);
        else o.frequency.setValueAtTime(f, t);
      });
      voices.set(midi, monoVoice);
      if (state.voiceMode === 'mono') retriggerVoice(monoVoice, vel);
      highlightKey(midi, true);
      return;
    }
    if (voices.has(midi)) {
      const v = voices.get(midi);
      v.held = true; retriggerVoice(v, vel); return;
    }
    const v = createVoice(midi, vel);
    if (state.voiceMode !== 'poly') monoVoice = v;
    voices.set(midi, v);
    highlightKey(midi, true);
    updateVoiceCount();
  }

  function noteOff(midi) {
    if (!ac) return;
    const v = voices.get(midi); if (!v) return;
    v.held = false;
    if (state.sustain) { v.sustained = true; return; }
    if (state.voiceMode !== 'poly') {
      if (monoVoice === v) { releaseVoice(v); monoVoice = null; }
    } else {
      releaseVoice(v);
    }
    highlightKey(midi, false);
  }

  function createVoice(midi, vel) {
    const ctx = ac, t = ctx.currentTime;
    const oscs = [], oscGains = [], noiseSrcs = [];
    const out = ctx.createGain(); out.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = state.filter.type;
    filter.Q.value = state.filter.Q;
    const baseCutoff = state.filter.cutoff * Math.pow(2, (midi - 60) / 12 * state.filter.kbdTrack);
    filter.frequency.value = baseCutoff;

    state.osc.forEach((o) => {
      if (!o.on) { oscs.push(null); oscGains.push(null); noiseSrcs.push(null); return; }
      const g = ctx.createGain(); g.gain.value = o.mix * vel;
      if (o.wave === 'noise') {
        const src = ctx.createBufferSource();
        src.buffer = makeNoiseBuf(ctx); src.loop = true;
        src.connect(g); g.connect(filter); src.start();
        oscs.push(null); oscGains.push(g); noiseSrcs.push(src); return;
      }
      const osc = ctx.createOscillator();
      osc.type = o.wave;
      osc.frequency.value = midiToFreq(midi + o.oct * 12);
      osc.detune.value = o.detune + state.pitchBend * 100;
      osc.connect(g); g.connect(filter);
      osc.start();
      oscs.push(osc); oscGains.push(g); noiseSrcs.push(null);
    });
    filter.connect(out);

    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * state.fx.width;
    out.connect(pan); pan.connect(fxIn);

    // amp env
    const a = state.ampEnv.a, d = state.ampEnv.d, s = state.ampEnv.s;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(vel, t + a);
    out.gain.linearRampToValueAtTime(s * vel, t + a + d);

    // filter env
    const fa = state.fEnv.a, fd = state.fEnv.d, fs = state.fEnv.s;
    const peak = baseCutoff + state.filter.envAmt;
    const sustainF = baseCutoff + state.filter.envAmt * fs;
    filter.frequency.cancelScheduledValues(t);
    filter.frequency.setValueAtTime(baseCutoff, t);
    filter.frequency.linearRampToValueAtTime(Math.min(20000, peak), t + fa);
    filter.frequency.linearRampToValueAtTime(Math.min(20000, sustainF), t + fa + fd);

    // LFOs
    const lfoConns = [];
    state.lfo.forEach((L) => {
      if (L.depth <= 0) return;
      const lfo = ctx.createOscillator();
      lfo.type = L.wave; lfo.frequency.value = L.rate;
      const dep = ctx.createGain();
      const wm = 1 + state.modWheel * 0.5;
      lfo.connect(dep); lfo.start();
      switch (L.dest) {
        case 'pitch':
          dep.gain.value = L.depth * 100 * wm;
          oscs.forEach(o => { if (o) dep.connect(o.detune); });
          break;
        case 'filter':
          dep.gain.value = L.depth * 4000 * wm;
          dep.connect(filter.frequency);
          break;
        case 'amp':
          dep.gain.value = L.depth * 0.5 * wm;
          dep.connect(out.gain);
          break;
        case 'pan':
          dep.gain.value = L.depth * 1.0 * wm;
          dep.connect(pan.pan);
          break;
      }
      lfoConns.push({ lfo, dep });
    });

    return {
      id: ++voiceId, midi, oscs, oscGains, noiseSrcs, filter, out, pan, lfoConns,
      held: true, sustained: false, vel,
    };
  }

  function retriggerVoice(v, vel) {
    const t = ac.currentTime;
    const a = state.ampEnv.a, d = state.ampEnv.d, s = state.ampEnv.s;
    v.out.gain.cancelScheduledValues(t);
    v.out.gain.setValueAtTime(v.out.gain.value, t);
    v.out.gain.linearRampToValueAtTime(vel, t + a);
    v.out.gain.linearRampToValueAtTime(s * vel, t + a + d);
  }
  function releaseVoice(v) {
    const t = ac.currentTime, r = state.ampEnv.r;
    v.out.gain.cancelScheduledValues(t);
    v.out.gain.setValueAtTime(v.out.gain.value, t);
    v.out.gain.linearRampToValueAtTime(0.0001, t + r);
    setTimeout(() => {
      try {
        v.oscs.forEach(o => o && o.stop());
        v.noiseSrcs.forEach(n => n && n.stop());
        v.lfoConns.forEach(L => L.lfo.stop());
        v.out.disconnect(); v.filter.disconnect(); v.pan.disconnect();
      } catch (_) {}
      voices.forEach((vv, k) => { if (vv === v) voices.delete(k); });
      updateVoiceCount();
    }, (r + 0.05) * 1000);
  }
  function panic() {
    voices.forEach((v) => releaseVoice(v));
    monoVoice = null;
    setTimeout(() => { voices.clear(); updateVoiceCount(); }, 60);
    $$('.sl-key.active').forEach(k => k.classList.remove('active'));
  }
  function updateVoiceCount() {
    const el = $('#sl-voices'); if (el) el.textContent = voices.size;
  }
  function highlightKey(midi, on) {
    const k = root.querySelector('[data-midi="' + midi + '"]');
    if (k) k.classList.toggle('active', on);
  }

  /* ── Visualisers ────────────────────────────────────────── */
  let scopeRAF = null;
  function drawScope() {
    const cv1 = $('#sl-scope'), cx1 = cv1.getContext('2d');
    const cv2 = $('#sl-spec'),  cx2 = cv2.getContext('2d');
    const tdata = new Uint8Array(scopeAnalyser.fftSize);
    const fdata = new Uint8Array(specAnalyser.frequencyBinCount);
    function frame() {
      if (!root.classList.contains('on')) { scopeRAF = null; return; }
      // resize canvases to display size for sharpness
      [cv1, cv2].forEach(cv => {
        const r = cv.getBoundingClientRect();
        const w = Math.max(2, Math.floor(r.width)), h = Math.max(2, Math.floor(r.height));
        if (cv.width !== w)  cv.width = w;
        if (cv.height !== h) cv.height = h;
      });
      scopeAnalyser.getByteTimeDomainData(tdata);
      specAnalyser.getByteFrequencyData(fdata);
      const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#ffae5c';
      cx1.fillStyle = '#050608'; cx1.fillRect(0,0,cv1.width,cv1.height);
      cx1.strokeStyle = 'rgba(255,255,255,0.05)'; cx1.beginPath();
      cx1.moveTo(0, cv1.height/2); cx1.lineTo(cv1.width, cv1.height/2); cx1.stroke();
      cx1.strokeStyle = accent; cx1.lineWidth = 2; cx1.beginPath();
      const sl = cv1.width / tdata.length;
      for (let i=0;i<tdata.length;i++) {
        const y = (tdata[i]/128 - 1) * 0.5 * cv1.height + cv1.height/2;
        if (i===0) cx1.moveTo(0, y); else cx1.lineTo(i*sl, y);
      }
      cx1.stroke();
      cx2.fillStyle = '#050608'; cx2.fillRect(0,0,cv2.width,cv2.height);
      const bins = 96, bw = cv2.width / bins;
      for (let i=0;i<bins;i++) {
        const v = fdata[i] / 255;
        const h = v * cv2.height;
        cx2.fillStyle = `hsl(${30 + i*1.5}, 80%, ${30 + v*40}%)`;
        cx2.fillRect(i*bw, cv2.height - h, Math.max(1, bw - 1), h);
      }
      let sum = 0;
      for (let i=0;i<tdata.length;i++) { const v = tdata[i]/128 - 1; sum += v*v; }
      const rms = Math.sqrt(sum / tdata.length);
      const pct = Math.min(100, rms * 240);
      const mL = $('#sl-meterL > span'), mR = $('#sl-meterR > span');
      if (mL) mL.style.height = pct + '%';
      if (mR) mR.style.height = pct + '%';
      scopeRAF = requestAnimationFrame(frame);
    }
    frame();
  }

  /* ── Clock: arp / seq / drum ────────────────────────────── */
  let seqTimer = null;
  let seqStep = 0;
  function clockOnAny() { return state.arp.on || state.seq.on || state.drum.on; }
  function startClock() {
    stopClock();
    seqStep = 0;
    const tick = () => {
      const stepDur = 60000 / state.bpm / 4;
      if (state.arp.on && voices.size > 0) {
        const held = [...voices.keys()].sort((a,b)=>a-b);
        let order = [];
        for (let o=0;o<state.arp.octaves;o++) held.forEach(n => order.push(n + o*12));
        if (state.arp.pattern === 'down')   order.reverse();
        else if (state.arp.pattern === 'updown' && order.length > 1) {
          order = order.concat(order.slice(1, -1).reverse());
        } else if (state.arp.pattern === 'random') {
          order = [order[Math.floor(Math.random() * order.length)]];
        }
        const n = order[seqStep % order.length];
        playTransientNote(n, stepDur * state.arp.gate / 1000);
      }
      if (state.seq.on) {
        const st = state.seq.steps[seqStep % state.seq.len];
        if (st.on) playTransientNote(st.note, stepDur * 0.6 / 1000, st.vel);
      }
      if (state.drum.on) {
        const i = seqStep % 16;
        if (state.drum.kick[i])  playKick();
        if (state.drum.snare[i]) playSnare();
        if (state.drum.hat[i])   playHat();
      }
      $$('.sl-step').forEach(el => {
        const idx = +el.dataset.i;
        el.classList.toggle('cur', idx === (seqStep % 16));
      });
      seqStep++;
      const swingMs = (seqStep % 2) ? state.seq.swing * stepDur * 0.4 : 0;
      seqTimer = setTimeout(tick, stepDur + swingMs);
    };
    tick();
  }
  function stopClock() {
    if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
    $$('.sl-step.cur').forEach(el => el.classList.remove('cur'));
  }
  function playTransientNote(midi, durSec, vel = 0.7) {
    noteOn(midi, vel);
    setTimeout(() => noteOff(midi), Math.max(40, durSec * 1000));
  }
  function playKick() {
    const ctx = ensureAudio(); if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(state.drum.vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g); g.connect(fxIn);
    o.start(t); o.stop(t + 0.4);
  }
  function playSnare() {
    const ctx = ensureAudio(); if (!ctx) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = makeNoiseBuf(ctx);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2000; f.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(state.drum.vol * 0.7, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    n.connect(f); f.connect(g); g.connect(fxIn);
    n.start(t); n.stop(t + 0.25);
  }
  function playHat() {
    const ctx = ensureAudio(); if (!ctx) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = makeNoiseBuf(ctx);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(state.drum.vol * 0.4, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    n.connect(f); f.connect(g); g.connect(fxIn);
    n.start(t); n.stop(t + 0.1);
  }

  /* ── Live updates from controls ─────────────────────────── */
  function applyDrive()  { if (driveNode) driveNode.curve = makeDriveCurve(state.fx.drive); }
  function applyChorus() { if (chorusRef) chorusRef.set(state.fx.chorus); }
  function applyDelay()  {
    if (!ac) return;
    delayNode.delayTime.setTargetAtTime(state.fx.delayTime, ac.currentTime, 0.02);
    delayFbNode.gain.setTargetAtTime(state.fx.delayFb, ac.currentTime, 0.02);
    delayWet.gain.setTargetAtTime(state.fx.delayMix, ac.currentTime, 0.02);
  }
  function applyReverb() { if (ac) reverbWet.gain.setTargetAtTime(state.fx.reverbMix, ac.currentTime, 0.02); }
  function rebuildIR()   { if (ac) reverbNode.buffer = makeIR(ac, state.fx.reverbSize, 2.5); }
  function applyMaster() { if (ac) master.gain.setTargetAtTime(state.masterVol, ac.currentTime, 0.02); }
  function applyFilterLive() {
    if (!ac) return;
    voices.forEach(v => {
      v.filter.type = state.filter.type;
      v.filter.Q.setTargetAtTime(state.filter.Q, ac.currentTime, 0.02);
    });
  }
  function applyPitchBend() {
    if (!ac) return;
    voices.forEach(v => {
      v.oscs.forEach((o, i) => {
        if (!o) return;
        o.detune.setTargetAtTime(state.osc[i].detune + state.pitchBend * 100, ac.currentTime, 0.005);
      });
    });
  }

  /* ── Recording ──────────────────────────────────────────── */
  function toggleRec() {
    const ctx = ensureAudio(); if (!ctx) return;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      $('#sl-rec').classList.remove('sl-rec-on');
      $('#sl-rec').textContent = '⏺ rec';
      return;
    }
    try {
      recChunks = [];
      recorder = new MediaRecorder(recDest.stream);
      recorder.ondataavailable = (e) => recChunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(recChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'synthlab-' + Date.now() + '.webm';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      };
      recorder.start();
      $('#sl-rec').classList.add('sl-rec-on');
      $('#sl-rec').textContent = '■ stop';
    } catch (e) { alert('Recording unsupported: ' + e.message); }
  }

  /* ── MIDI ───────────────────────────────────────────────── */
  function initMIDI() {
    const lab = $('#sl-midi-status');
    if (!navigator.requestMIDIAccess) { lab.textContent = 'unsupported'; return; }
    navigator.requestMIDIAccess().then((midi) => {
      const inputs = [...midi.inputs.values()];
      if (!inputs.length) { lab.textContent = 'no devices'; return; }
      lab.textContent = inputs.length + ' device' + (inputs.length > 1 ? 's' : '');
      inputs.forEach(input => input.onmidimessage = onMidiMsg);
      midi.onstatechange = () => {
        const ins = [...midi.inputs.values()];
        lab.textContent = ins.length ? (ins.length + ' device' + (ins.length > 1 ? 's' : '')) : 'no devices';
        ins.forEach(input => input.onmidimessage = onMidiMsg);
      };
    }).catch(() => lab.textContent = 'denied');
  }
  function onMidiMsg(e) {
    const [status, d1, d2] = e.data, cmd = status & 0xf0;
    if (cmd === 0x90 && d2 > 0) noteOn(d1, d2 / 127);
    else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) noteOff(d1);
    else if (cmd === 0xe0) {
      const v = (d1 + (d2 << 7)) - 8192;
      state.pitchBend = (v / 8192) * 2;
      const f = $('#sl-pitch-fill'); if (f) f.style.height = ((state.pitchBend / 4 + 0.5) * 100) + '%';
      applyPitchBend();
    } else if (cmd === 0xb0 && d1 === 1) {
      state.modWheel = d2 / 127;
      const f = $('#sl-mod-fill'); if (f) f.style.height = (state.modWheel * 100) + '%';
    } else if (cmd === 0xb0 && d1 === 64) {
      const on = d2 >= 64;
      state.sustain = on;
      if (!on) {
        voices.forEach((v, m) => { if (v.sustained && !v.held) { releaseVoice(v); highlightKey(m, false); } });
      }
    }
  }

  /* ── Presets ────────────────────────────────────────────── */
  const PRESETS_KEY = 'sl_presets_v1';
  const BUILTIN = [
    { name: 'Init',      data: {
      osc:[{wave:'sawtooth',oct:0,detune:-7,mix:0.5,on:true},{wave:'square',oct:0,detune:7,mix:0.4,on:true},{wave:'triangle',oct:-1,detune:0,mix:0.3,on:false}],
      filter:{type:'lowpass',cutoff:1800,Q:6,envAmt:2400,kbdTrack:0.3},
      ampEnv:{a:0.01,d:0.2,s:0.6,r:0.5}, fEnv:{a:0.005,d:0.3,s:0.3,r:0.4},
      lfo:[{wave:'sine',rate:5,depth:0,dest:'pitch'},{wave:'sine',rate:0.6,depth:0,dest:'filter'}],
      fx:{drive:0,chorus:0,delayTime:0.32,delayFb:0.35,delayMix:0.18,reverbMix:0.15,reverbSize:2.2,width:0.6},
    }},
    { name: 'Fat Bass',  data: {
      osc:[{wave:'sawtooth',oct:-1,detune:-9,mix:0.6,on:true},{wave:'sawtooth',oct:-1,detune:9,mix:0.6,on:true},{wave:'square',oct:-2,detune:0,mix:0.5,on:true}],
      filter:{type:'lowpass',cutoff:800,Q:8,envAmt:1500,kbdTrack:0.4},
      ampEnv:{a:0.005,d:0.4,s:0.3,r:0.2}, fEnv:{a:0.005,d:0.25,s:0,r:0.2},
      fx:{drive:0.15,chorus:0,delayTime:0.32,delayFb:0.2,delayMix:0.05,reverbMix:0.1,reverbSize:1.5,width:0.3},
    }},
    { name: 'Lush Pad',  data: {
      osc:[{wave:'sawtooth',oct:0,detune:-12,mix:0.45,on:true},{wave:'sawtooth',oct:0,detune:12,mix:0.45,on:true},{wave:'triangle',oct:1,detune:0,mix:0.25,on:true}],
      filter:{type:'lowpass',cutoff:1400,Q:2,envAmt:600,kbdTrack:0.2},
      ampEnv:{a:0.6,d:0.8,s:0.85,r:1.4}, fEnv:{a:0.5,d:1.2,s:0.5,r:1.2},
      lfo:[{wave:'sine',rate:0.4,depth:0.05,dest:'filter'},{wave:'sine',rate:5,depth:0.02,dest:'pitch'}],
      fx:{drive:0,chorus:0.7,delayTime:0.4,delayFb:0.4,delayMix:0.25,reverbMix:0.45,reverbSize:3.5,width:0.95},
    }},
    { name: 'Pluck',     data: {
      osc:[{wave:'sawtooth',oct:0,detune:0,mix:0.7,on:true},{wave:'square',oct:1,detune:7,mix:0.3,on:true},{wave:'sine',oct:0,detune:0,mix:0,on:false}],
      filter:{type:'lowpass',cutoff:2200,Q:5,envAmt:3000,kbdTrack:0.3},
      ampEnv:{a:0.001,d:0.18,s:0.0,r:0.18}, fEnv:{a:0.001,d:0.18,s:0.0,r:0.18},
      fx:{drive:0,chorus:0.2,delayTime:0.28,delayFb:0.4,delayMix:0.2,reverbMix:0.25,reverbSize:2.5,width:0.7},
    }},
    { name: 'Saw Lead',  data: {
      osc:[{wave:'sawtooth',oct:0,detune:-5,mix:0.5,on:true},{wave:'sawtooth',oct:0,detune:5,mix:0.5,on:true},{wave:'square',oct:-1,detune:0,mix:0.3,on:true}],
      filter:{type:'lowpass',cutoff:3500,Q:4,envAmt:2200,kbdTrack:0.5},
      ampEnv:{a:0.01,d:0.3,s:0.7,r:0.3}, fEnv:{a:0.005,d:0.3,s:0.4,r:0.4},
      fx:{drive:0.2,chorus:0.3,delayTime:0.25,delayFb:0.45,delayMix:0.22,reverbMix:0.2,reverbSize:2.0,width:0.5},
    }},
    { name: 'Acid 303',  data: {
      osc:[{wave:'sawtooth',oct:0,detune:0,mix:0.9,on:true},{wave:'square',oct:0,detune:0,mix:0,on:false},{wave:'sine',oct:0,detune:0,mix:0,on:false}],
      filter:{type:'lowpass',cutoff:600,Q:18,envAmt:3500,kbdTrack:0.3},
      ampEnv:{a:0.001,d:0.6,s:0.0,r:0.1}, fEnv:{a:0.001,d:0.35,s:0.0,r:0.15},
      fx:{drive:0.4,chorus:0,delayTime:0.18,delayFb:0.5,delayMix:0.18,reverbMix:0.1,reverbSize:1.5,width:0.2},
    }},
    { name: 'Bell',      data: {
      osc:[{wave:'sine',oct:0,detune:0,mix:0.6,on:true},{wave:'sine',oct:1,detune:7,mix:0.4,on:true},{wave:'sine',oct:2,detune:12,mix:0.2,on:true}],
      filter:{type:'highpass',cutoff:300,Q:1,envAmt:0,kbdTrack:0},
      ampEnv:{a:0.001,d:1.2,s:0.0,r:1.0}, fEnv:{a:0.001,d:0.5,s:0,r:0.5},
      fx:{drive:0,chorus:0,delayTime:0.25,delayFb:0.45,delayMix:0.3,reverbMix:0.5,reverbSize:3,width:0.7},
    }},
    { name: 'Noise FX',  data: {
      osc:[{wave:'noise',oct:0,detune:0,mix:0.5,on:true},{wave:'sine',oct:0,detune:0,mix:0,on:false},{wave:'sine',oct:0,detune:0,mix:0,on:false}],
      filter:{type:'bandpass',cutoff:1500,Q:8,envAmt:4000,kbdTrack:0.5},
      ampEnv:{a:0.05,d:0.3,s:0.2,r:0.4}, fEnv:{a:0.001,d:0.5,s:0.2,r:0.4},
      lfo:[{wave:'triangle',rate:3,depth:0.4,dest:'filter'},{wave:'sine',rate:0.6,depth:0,dest:'pitch'}],
      fx:{drive:0.1,chorus:0.4,delayTime:0.32,delayFb:0.4,delayMix:0.25,reverbMix:0.4,reverbSize:3,width:0.9},
    }},
  ];
  function loadUserPresets() { try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); } catch(_) { return []; } }
  function saveUserPresets(a) { try { localStorage.setItem(PRESETS_KEY, JSON.stringify(a)); } catch(_) {} }
  function applyPreset(p) {
    if (!p || !p.data) return;
    const d = p.data;
    if (d.osc)    state.osc    = d.osc.map(o => ({ ...o }));
    if (d.filter) Object.assign(state.filter, d.filter);
    if (d.ampEnv) Object.assign(state.ampEnv, d.ampEnv);
    if (d.fEnv)   Object.assign(state.fEnv, d.fEnv);
    if (d.lfo)    state.lfo    = d.lfo.map(l => ({ ...l }));
    if (d.fx)     Object.assign(state.fx, d.fx);
    refreshUI();
    applyDrive(); applyChorus(); applyDelay(); applyReverb(); rebuildIR(); applyFilterLive();
  }
  function rebuildPresetList() {
    const sel = $('#sl-preset-list'); if (!sel) return;
    sel.innerHTML = '';
    const all = [...BUILTIN, ...loadUserPresets().map(p => ({ ...p, user: true }))];
    all.forEach((p, i) => {
      const o = document.createElement('option');
      o.value = i; o.textContent = (p.user ? '★ ' : '') + p.name;
      sel.appendChild(o);
    });
  }
  function getPresetByIndex(i) {
    const all = [...BUILTIN, ...loadUserPresets()];
    return all[i];
  }

  /* ── State ↔ UI binding ─────────────────────────────────── */
  function getPath(o, p) { return p.split('.').reduce((a,k) => a == null ? a : a[/^\d+$/.test(k) ? +k : k], o); }
  function setPath(o, p, v) {
    const parts = p.split('.'); const last = parts.pop();
    const t = parts.reduce((a,k) => a[/^\d+$/.test(k) ? +k : k], o);
    t[/^\d+$/.test(last) ? +last : last] = v;
  }
  function fmtVal(p, v) {
    if (typeof v === 'number') {
      if (p.endsWith('cutoff') || p.endsWith('envAmt') || p.endsWith('bpm')) return v.toFixed(0);
      if (p.endsWith('rate')) return v.toFixed(2);
      return v.toFixed(2);
    }
    return String(v);
  }
  function refreshUI() {
    $$('[data-bind]').forEach(el => {
      const p = el.dataset.bind, v = getPath(state, p);
      if (v == null) return;
      const scale = +el.dataset.scale || 1;
      if (el.tagName === 'INPUT' && el.type === 'range') el.value = v * scale;
      else if (el.tagName === 'SELECT') el.value = String(v);
      const lab = el.parentElement.querySelector('.sl-val');
      if (lab) lab.textContent = fmtVal(p, v);
    });
    state.osc.forEach((o, i) => {
      const t = root.querySelector('[data-osc-on="' + (i+1) + '"]'); if (t) t.classList.toggle('on', o.on);
      root.querySelectorAll('[data-osc-wave="' + (i+1) + '"] .sl-wb').forEach(b => {
        b.classList.toggle('on', b.dataset.w === o.wave);
      });
    });
    // step buttons (sequencer + drum)
    state.seq.steps.forEach((st, i) => {
      const b = root.querySelector('.sl-seq-step[data-i="' + i + '"]');
      if (b) b.classList.toggle('on', !!st.on);
    });
    ['kick','snare','hat'].forEach(k => state.drum[k].forEach((on, i) => {
      const b = root.querySelector('.sl-drum-step[data-d="' + k + '"][data-i="' + i + '"]');
      if (b) b.classList.toggle('on', !!on);
    }));
    $('#sl-mode-label') && ($('#sl-mode-label').textContent = state.voiceMode);
  }

  /* ── Build the UI inside #sl-stage ──────────────────────── */
  function knob(label, bind, min, max, step, scale) {
    return '<label class="sl-knob"><span class="sl-k"><span>' + label + '</span><span class="sl-val">--</span></span>' +
      '<input type="range" class="sl-r" data-bind="' + bind + '" data-scale="' + scale + '" min="' + min + '" max="' + max + '" step="' + step + '"/></label>';
  }
  function oscCard(i) {
    return '<div class="sl-card span-3" id="sl-osc-' + (i+1) + '">' +
      '<div class="sl-card-h"><span>OSC ' + (i+1) + '</span>' +
        '<span class="sl-toggle" data-osc-on="' + (i+1) + '" title="enable"></span>' +
      '</div>' +
      '<div class="sl-waves" data-osc-wave="' + (i+1) + '">' +
        ['sine','triangle','square','sawtooth','noise'].map(w =>
          '<button class="sl-wb" data-w="' + w + '">' + w.slice(0,3) + '</button>').join('') +
      '</div>' +
      '<div class="sl-row">' +
        knob('OCT',    'osc.' + i + '.oct',    -2, 2, 1, 1) +
        knob('DETUNE', 'osc.' + i + '.detune', -50, 50, 1, 1) +
        knob('MIX',    'osc.' + i + '.mix',    0, 100, 1, 100) +
      '</div>' +
    '</div>';
  }
  function envCard(title, bind) {
    return '<div class="sl-card span-3">' +
      '<div class="sl-card-h"><span>' + title + '</span><span class="sl-led"></span></div>' +
      '<div class="sl-row">' +
        knob('A', bind + '.a', 0, 200, 1, 100) +
        knob('D', bind + '.d', 0, 300, 1, 100) +
        knob('S', bind + '.s', 0, 100, 1, 100) +
        knob('R', bind + '.r', 0, 300, 1, 100) +
      '</div>' +
    '</div>';
  }
  function lfoCard(i) {
    return '<div class="sl-card span-3">' +
      '<div class="sl-card-h"><span>LFO ' + (i+1) + '</span><span class="sl-led"></span></div>' +
      '<div class="sl-row">' +
        '<label class="sl-knob"><span class="sl-k"><span>WAVE</span></span>' +
          '<select class="sl-sel" data-bind="lfo.' + i + '.wave">' +
            ['sine','triangle','square','sawtooth'].map(w => '<option value="' + w + '">' + w + '</option>').join('') +
          '</select></label>' +
        '<label class="sl-knob"><span class="sl-k"><span>DEST</span></span>' +
          '<select class="sl-sel" data-bind="lfo.' + i + '.dest">' +
            ['pitch','filter','amp','pan'].map(d => '<option value="' + d + '">' + d + '</option>').join('') +
          '</select></label>' +
      '</div>' +
      '<div class="sl-row">' +
        knob('RATE',  'lfo.' + i + '.rate',  1, 2000, 1, 100) +
        knob('DEPTH', 'lfo.' + i + '.depth', 0, 100, 1, 100) +
      '</div>' +
    '</div>';
  }

  const filterCard =
    '<div class="sl-card span-3">' +
      '<div class="sl-card-h"><span>FILTER</span><span class="sl-led"></span></div>' +
      '<div class="sl-row">' +
        '<label class="sl-knob"><span class="sl-k"><span>TYPE</span></span>' +
          '<select class="sl-sel" data-bind="filter.type">' +
            ['lowpass','highpass','bandpass','notch'].map(t =>
              '<option value="' + t + '">' + t + '</option>').join('') +
          '</select></label>' +
        knob('CUT', 'filter.cutoff', 80, 9000, 1, 1) +
        knob('Q',   'filter.Q',      0, 30, 1, 1) +
      '</div>' +
      '<div class="sl-row">' +
        knob('ENV',  'filter.envAmt',   -5000, 5000, 1, 1) +
        knob('TRACK','filter.kbdTrack', 0, 100, 1, 100) +
      '</div>' +
    '</div>';

  const fxCard =
    '<div class="sl-card span-6">' +
      '<div class="sl-card-h"><span>FX RACK</span><span class="sl-led"></span></div>' +
      '<div class="sl-row">' +
        knob('DRIVE',   'fx.drive',     0, 100, 1, 100) +
        knob('CHORUS',  'fx.chorus',    0, 100, 1, 100) +
        knob('WIDTH',   'fx.width',     0, 100, 1, 100) +
        knob('MASTER',  'masterVol',    0, 100, 1, 100) +
      '</div>' +
      '<div class="sl-row">' +
        knob('DLY TIME','fx.delayTime', 1, 1500, 1, 1000) +
        knob('DLY FB',  'fx.delayFb',   0, 90, 1, 100) +
        knob('DLY MIX', 'fx.delayMix',  0, 100, 1, 100) +
        knob('REV MIX', 'fx.reverbMix', 0, 100, 1, 100) +
        knob('REV SIZE','fx.reverbSize',1, 60, 1, 10) +
      '</div>' +
    '</div>';

  const voiceCard =
    '<div class="sl-card span-3">' +
      '<div class="sl-card-h"><span>VOICE</span><span class="sl-led"></span></div>' +
      '<div class="sl-row">' +
        '<label class="sl-knob"><span class="sl-k"><span>MODE</span></span>' +
          '<select class="sl-sel" id="sl-voice-mode">' +
            ['poly','mono','legato'].map(m => '<option value="' + m + '">' + m + '</option>').join('') +
          '</select></label>' +
        knob('GLIDE', 'glide', 0, 1000, 1, 1000) +
        knob('BPM',   'bpm',   40, 240, 1, 1) +
      '</div>' +
    '</div>';

  const arpCard =
    '<div class="sl-card span-3" id="sl-arp-card">' +
      '<div class="sl-card-h"><span>ARP</span>' +
        '<span class="sl-toggle" id="sl-arp-on" title="enable"></span></div>' +
      '<div class="sl-row">' +
        '<label class="sl-knob"><span class="sl-k"><span>PATTERN</span></span>' +
          '<select class="sl-sel" data-bind="arp.pattern">' +
            ['up','down','updown','random'].map(p =>
              '<option value="' + p + '">' + p + '</option>').join('') +
          '</select></label>' +
        knob('OCT',  'arp.octaves', 1, 4, 1, 1) +
        knob('GATE', 'arp.gate', 5, 100, 1, 100) +
      '</div>' +
    '</div>';

  const seqCard =
    '<div class="sl-card span-9" id="sl-seq-card">' +
      '<div class="sl-card-h"><span>SEQUENCER</span>' +
        '<span class="sl-toggle" id="sl-seq-on" title="enable"></span></div>' +
      '<div class="sl-step-row" id="sl-seq-steps"></div>' +
      '<div class="sl-row">' +
        knob('SWING',  'seq.swing', 0, 100, 1, 100) +
        knob('LENGTH', 'seq.len',   1, 16, 1, 1) +
      '</div>' +
    '</div>';

  const drumCard =
    '<div class="sl-card span-9" id="sl-drum-card">' +
      '<div class="sl-card-h"><span>DRUM MACHINE</span>' +
        '<span class="sl-toggle" id="sl-drum-on" title="enable"></span></div>' +
      '<div class="sl-drum-row"><span class="sl-drum-lab">KICK</span>' +
        '<div class="sl-step-row" id="sl-drum-kick"></div></div>' +
      '<div class="sl-drum-row"><span class="sl-drum-lab">SNARE</span>' +
        '<div class="sl-step-row" id="sl-drum-snare"></div></div>' +
      '<div class="sl-drum-row"><span class="sl-drum-lab">HAT</span>' +
        '<div class="sl-step-row" id="sl-drum-hat"></div></div>' +
      '<div class="sl-row">' +
        knob('VOL', 'drum.vol', 0, 100, 1, 100) +
        '<button class="sl-btn" id="sl-drum-clear">CLEAR</button>' +
        '<button class="sl-btn" id="sl-drum-fill">FILL DEMO</button>' +
      '</div>' +
    '</div>';

  const presetCard =
    '<div class="sl-card span-3">' +
      '<div class="sl-card-h"><span>PRESETS</span><span class="sl-led"></span></div>' +
      '<select class="sl-sel" id="sl-preset-list" size="7"></select>' +
      '<div class="sl-preset-row">' +
        '<button class="sl-btn" id="sl-preset-load">LOAD</button>' +
        '<button class="sl-btn" id="sl-preset-save">SAVE</button>' +
        '<button class="sl-btn" id="sl-preset-del">DEL</button>' +
      '</div>' +
      '<button class="sl-btn" id="sl-midi-init">CONNECT MIDI</button>' +
    '</div>';

  const keyboardRow =
    '<div class="sl-kb-row">' +
      '<div class="sl-kb-side">' +
        '<div class="sl-wheels">' +
          '<div class="sl-wheel" id="sl-pitch"><div class="sl-wheel-fill" id="sl-pitch-fill"></div><div class="sl-wheel-lab">PITCH</div></div>' +
          '<div class="sl-wheel" id="sl-mod"><div class="sl-wheel-fill" id="sl-mod-fill"></div><div class="sl-wheel-lab">MOD</div></div>' +
        '</div>' +
        '<div class="sl-octrow">' +
          '<button class="sl-btn" id="sl-oct-down">-</button>' +
          '<span>OCT <b id="sl-oct">4</b></span>' +
          '<button class="sl-btn" id="sl-oct-up">+</button>' +
        '</div>' +
      '</div>' +
      '<div class="sl-keys" id="sl-keys"></div>' +
    '</div>';

  stage.innerHTML =
    '<div class="sl-shell">' +
      '<div class="sl-viz-row">' +
        '<canvas class="sl-scope" id="sl-scope"></canvas>' +
        '<canvas class="sl-spec" id="sl-spec"></canvas>' +
        '<div class="sl-meter">' +
          '<div class="sl-meter-bar" id="sl-meterL"><span></span></div>' +
          '<div class="sl-meter-bar" id="sl-meterR"><span></span></div>' +
        '</div>' +
      '</div>' +
      '<div class="sl-workbench">' +
        '<aside class="sl-rack">' +
          presetCard + voiceCard + arpCard +
        '</aside>' +
        '<main class="sl-main">' +
          '<div class="sl-section-tag"><span>SOUND ENGINE</span></div>' +
          '<div class="sl-grid sl-sound">' +
            oscCard(0) + oscCard(1) + oscCard(2) +
            filterCard +
            envCard('AMP ENV', 'ampEnv') +
            envCard('FILTER ENV', 'fEnv') +
            lfoCard(0) + lfoCard(1) +
            fxCard +
          '</div>' +
          '<div class="sl-section-tag"><span>PATTERN BAY</span></div>' +
          '<div class="sl-grid sl-patterns">' +
            seqCard + drumCard +
          '</div>' +
        '</main>' +
      '</div>' +
      '<div class="sl-performance">' + keyboardRow + '</div>' +
    '</div>';

  /* ── Build keyboard ─────────────────────────────────────── */
  function buildKeyboard() {
    const host = $('#sl-keys'); host.innerHTML = '';
    const startMidi = state.octave * 12;
    const numWhite = 21;
    const whiteIdx = [0,2,4,5,7,9,11];
    const blackIdx = [1,3,null,6,8,10,null];
    for (let i = 0; i < numWhite; i++) {
      const oct = Math.floor(i / 7), step = whiteIdx[i % 7];
      const m = startMidi + oct * 12 + step;
      const k = document.createElement('div');
      k.className = 'sl-key';
      k.dataset.midi = m;
      k.style.left = (i / numWhite * 100) + '%';
      k.style.width = (100 / numWhite) + '%';
      const ck = Object.keys(KEY_MAP).find(kk => KEY_MAP[kk] + state.octave * 12 === m);
      k.innerHTML = '<div class="lab">' + (ck ? ck.toUpperCase() : '') + '<br>' + midiToName(m) + '</div>';
      bindKey(k, m);
      host.appendChild(k);
    }
    for (let i = 0; i < numWhite - 1; i++) {
      const blk = blackIdx[i % 7]; if (blk === null) continue;
      const oct = Math.floor(i / 7);
      const m = startMidi + oct * 12 + blk;
      const k = document.createElement('div');
      k.className = 'sl-key bk';
      k.dataset.midi = m;
      const leftPct = ((i + 1) / numWhite) * 100;
      k.style.left  = 'calc(' + leftPct + '% - ' + (100 / numWhite / 2) + '%)';
      k.style.width = (100 / numWhite * 0.6) + '%';
      bindKey(k, m);
      host.appendChild(k);
    }
  }
  function bindKey(k, m) {
    let down = false;
    k.addEventListener('mousedown', (e) => { e.preventDefault(); down = true; noteOn(m); });
    k.addEventListener('mouseup',   () => { if (down) { down = false; noteOff(m); } });
    k.addEventListener('mouseleave',() => { if (down) { down = false; noteOff(m); } });
    k.addEventListener('touchstart',(e) => { e.preventDefault(); down = true; noteOn(m); }, { passive: false });
    k.addEventListener('touchend',  () => { if (down) { down = false; noteOff(m); } });
  }

  /* ── Build step grids ───────────────────────────────────── */
  function buildSeqSteps() {
    const host = $('#sl-seq-steps'); host.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const b = document.createElement('button');
      b.className = 'sl-step sl-seq-step';
      b.dataset.i = i;
      b.title = 'step ' + (i+1) + ' · ' + midiToName(state.seq.steps[i].note);
      b.addEventListener('click', () => {
        state.seq.steps[i].on = !state.seq.steps[i].on;
        b.classList.toggle('on', state.seq.steps[i].on);
      });
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const cur = state.seq.steps[i].note;
        const next = prompt('MIDI note (0-127), e.g. 60 = C4', cur);
        if (next == null) return;
        const n = Math.max(0, Math.min(127, parseInt(next, 10)));
        if (Number.isFinite(n)) {
          state.seq.steps[i].note = n;
          b.title = 'step ' + (i+1) + ' · ' + midiToName(n);
        }
      });
      host.appendChild(b);
    }
  }
  function buildDrumSteps() {
    ['kick','snare','hat'].forEach(k => {
      const host = $('#sl-drum-' + k); host.innerHTML = '';
      for (let i = 0; i < 16; i++) {
        const b = document.createElement('button');
        b.className = 'sl-step sl-drum-step';
        b.dataset.i = i; b.dataset.d = k;
        b.addEventListener('click', () => {
          state.drum[k][i] = state.drum[k][i] ? 0 : 1;
          b.classList.toggle('on', !!state.drum[k][i]);
        });
        host.appendChild(b);
      }
    });
  }

  /* ── Wire controls ──────────────────────────────────────── */
  function bindControls() {
    $$('[data-bind]').forEach(el => {
      const path = el.dataset.bind, scale = +el.dataset.scale || 1;
      const handler = () => {
        let v = el.value;
        if (el.tagName === 'INPUT' && el.type === 'range') v = +v / scale;
        else if (el.tagName === 'SELECT') v = isNaN(+v) || /[a-z]/i.test(v) ? v : +v;
        setPath(state, path, v);
        const lab = el.parentElement.querySelector('.sl-val');
        if (lab) lab.textContent = fmtVal(path, v);
        if (path === 'fx.drive')        applyDrive();
        else if (path === 'fx.chorus')  applyChorus();
        else if (path.startsWith('fx.delay')) applyDelay();
        else if (path === 'fx.reverbMix')  applyReverb();
        else if (path === 'fx.reverbSize') rebuildIR();
        else if (path === 'masterVol')     applyMaster();
        else if (path.startsWith('filter.')) applyFilterLive();
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    });
    $$('[data-osc-on]').forEach(t => {
      t.addEventListener('click', () => {
        const i = +t.dataset.oscOn - 1;
        state.osc[i].on = !state.osc[i].on;
        t.classList.toggle('on', state.osc[i].on);
      });
    });
    $$('[data-osc-wave]').forEach(group => {
      const i = +group.dataset.oscWave - 1;
      group.querySelectorAll('.sl-wb').forEach(b => {
        b.addEventListener('click', () => {
          state.osc[i].wave = b.dataset.w;
          group.querySelectorAll('.sl-wb').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
        });
      });
    });
    $('#sl-voice-mode').addEventListener('change', (e) => {
      state.voiceMode = e.target.value;
      $('#sl-mode-label').textContent = state.voiceMode;
      panic();
    });
    $('#sl-arp-on').addEventListener('click',  () => { state.arp.on  = !state.arp.on;  $('#sl-arp-on').classList.toggle('on', state.arp.on);   $('#sl-arp-card').classList.toggle('on', state.arp.on);   clockOnAny() ? startClock() : stopClock(); });
    $('#sl-seq-on').addEventListener('click',  () => { state.seq.on  = !state.seq.on;  $('#sl-seq-on').classList.toggle('on', state.seq.on);   $('#sl-seq-card').classList.toggle('on', state.seq.on);   clockOnAny() ? startClock() : stopClock(); });
    $('#sl-drum-on').addEventListener('click', () => { state.drum.on = !state.drum.on; $('#sl-drum-on').classList.toggle('on', state.drum.on); $('#sl-drum-card').classList.toggle('on', state.drum.on); clockOnAny() ? startClock() : stopClock(); });
    $('#sl-drum-clear').addEventListener('click', () => {
      ['kick','snare','hat'].forEach(k => { for (let i=0;i<16;i++) state.drum[k][i]=0; });
      $$('.sl-drum-step').forEach(b => b.classList.remove('on'));
    });
    $('#sl-drum-fill').addEventListener('click', () => {
      const kicks = [0,4,8,12], snares = [4,12], hats = [0,2,4,6,8,10,12,14];
      ['kick','snare','hat'].forEach(k => { for (let i=0;i<16;i++) state.drum[k][i]=0; });
      kicks.forEach(i => state.drum.kick[i] = 1);
      snares.forEach(i => state.drum.snare[i] = 1);
      hats.forEach(i => state.drum.hat[i] = 1);
      refreshUI();
    });
    $('#sl-preset-load').addEventListener('click', () => applyPreset(getPresetByIndex(+$('#sl-preset-list').value || 0)));
    $('#sl-preset-list').addEventListener('dblclick', () => applyPreset(getPresetByIndex(+$('#sl-preset-list').value || 0)));
    $('#sl-preset-save').addEventListener('click', () => {
      const name = prompt('Preset name?'); if (!name) return;
      const arr = loadUserPresets();
      arr.push({ name, data: {
        osc: state.osc.map(o => ({...o})), filter: { ...state.filter },
        ampEnv: { ...state.ampEnv }, fEnv: { ...state.fEnv },
        lfo: state.lfo.map(l => ({...l})), fx: { ...state.fx },
      }});
      saveUserPresets(arr);
      rebuildPresetList();
    });
    $('#sl-preset-del').addEventListener('click', () => {
      const i = +$('#sl-preset-list').value;
      if (i < BUILTIN.length) { alert('Built-in presets cannot be deleted.'); return; }
      const arr = loadUserPresets();
      arr.splice(i - BUILTIN.length, 1);
      saveUserPresets(arr); rebuildPresetList();
    });
    $('#sl-oct-up').addEventListener('click',   () => { state.octave = Math.min(7, state.octave+1); $('#sl-oct').textContent = state.octave; buildKeyboard(); });
    $('#sl-oct-down').addEventListener('click', () => { state.octave = Math.max(0, state.octave-1); $('#sl-oct').textContent = state.octave; buildKeyboard(); });
    $('#sl-panic').addEventListener('click', panic);
    $('#sl-rec').addEventListener('click', toggleRec);
    $('#sl-help').addEventListener('click', () => $('#sl-help-modal').classList.add('on'));
    $$('[data-sl-close]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.slClose).classList.remove('on')));
    $('#sl-exit').addEventListener('click', disableGame);
    $('#sl-midi-init').addEventListener('click', initMIDI);

    bindWheel($('#sl-pitch'), $('#sl-pitch-fill'), 'pitch');
    bindWheel($('#sl-mod'),   $('#sl-mod-fill'),   'mod');
  }
  function bindWheel(el, fill, type) {
    let dragging = false;
    function setPct(pct) {
      pct = Math.max(0, Math.min(1, pct));
      fill.style.height = (pct * 100) + '%';
      if (type === 'pitch') { state.pitchBend = (pct - 0.5) * 4; applyPitchBend(); }
      else                  { state.modWheel = pct; }
    }
    function move(e) {
      const r = el.getBoundingClientRect();
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      setPct(1 - (cy - r.top) / r.height);
    }
    el.addEventListener('mousedown',  (e) => { dragging = true; move(e); e.preventDefault(); });
    el.addEventListener('touchstart', (e) => { dragging = true; move(e); e.preventDefault(); }, { passive: false });
    addEventListener('mousemove',  (e) => { if (dragging) move(e); });
    addEventListener('touchmove',  (e) => { if (dragging) move(e); });
    addEventListener('mouseup',    () => { if (!dragging) return; dragging = false; if (type === 'pitch') setPct(0.5); });
    addEventListener('touchend',   () => { if (!dragging) return; dragging = false; if (type === 'pitch') setPct(0.5); });
    // initial
    if (type === 'pitch') setPct(0.5); else setPct(0);
  }

  /* ── Computer keyboard ──────────────────────────────────── */
  const heldKeys = new Set();
  function onKD(e) {
    if (activeGame !== 'synthlab') return;
    if (e.target.matches('input, textarea, select')) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); state.sustain = true; return; }
    if (k === 'arrowleft')  { e.preventDefault(); state.octave = Math.max(0, state.octave-1); $('#sl-oct').textContent = state.octave; buildKeyboard(); return; }
    if (k === 'arrowright') { e.preventDefault(); state.octave = Math.min(7, state.octave+1); $('#sl-oct').textContent = state.octave; buildKeyboard(); return; }
    if (k === 'arrowup')    { e.preventDefault(); state.modWheel = Math.min(1, state.modWheel + 0.1); $('#sl-mod-fill').style.height = (state.modWheel*100)+'%'; return; }
    if (k === 'arrowdown')  { e.preventDefault(); state.modWheel = Math.max(0, state.modWheel - 0.1); $('#sl-mod-fill').style.height = (state.modWheel*100)+'%'; return; }
    if (KEY_MAP[k] === undefined) return;
    if (heldKeys.has(k)) return;
    heldKeys.add(k);
    e.preventDefault();
    noteOn(KEY_MAP[k] + state.octave * 12);
  }
  function onKU(e) {
    if (activeGame !== 'synthlab') return;
    const k = e.key.toLowerCase();
    if (k === ' ') {
      state.sustain = false;
      voices.forEach((v, m) => { if (v.sustained && !v.held) { releaseVoice(v); highlightKey(m, false); } });
      return;
    }
    if (KEY_MAP[k] === undefined) return;
    heldKeys.delete(k);
    noteOff(KEY_MAP[k] + state.octave * 12);
  }
  addEventListener('keydown', onKD);
  addEventListener('keyup',   onKU);

  // initial build
  buildKeyboard();
  buildSeqSteps();
  buildDrumSteps();
  rebuildPresetList();
  bindControls();
  refreshUI();

  // Initialize audio context on synth lab load
  function initSynthAudio() {
    try {
      ensureAudio();
    } catch (e) {
      console.error('Failed to initialize audio context:', e);
      // Create a simple fallback to prevent crashes
      if (!ac) {
        ac = { state: 'suspended' };
      }
    }
  }

  initSynthAudio();

  GAME_OPEN.synthlab = function () {
    ensureAudio();
    if (ac && ac.state === 'suspended') ac.resume();
    // restart viz loop if needed
    if (!scopeRAF && scopeAnalyser) drawScope();
  };
  GAME_CLOSE.synthlab = function () {
    panic(); stopClock();
    if (recorder && recorder.state === 'recording') {
      try { recorder.stop(); } catch (_) {}
      $('#sl-rec').classList.remove('sl-rec-on');
      $('#sl-rec').textContent = '⏺ rec';
    }
  };
};

/* console signature */
console.log(
  '%c mecke.dev %c\n the entire page is customizable. try `customize`, `theme matrix`, `font pixel` in the on-page terminal.\n contact@mecke.dev',
  'background: #ffae5c; color: #000; font-weight: bold; padding: 4px 10px;',
  'color: #8a8478;'
);
