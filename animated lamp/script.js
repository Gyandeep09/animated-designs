/* ═══════════════════════════════════════════════
   LAMP CONTROLLER v4 — STRICT RULES, CLEAN
   ═══════════════════════════════════════════════ */

const { gsap, gsap: { registerPlugin, set, to, timeline }, MorphSVGPlugin, Draggable } = window;
registerPlugin(MorphSVGPlugin);

const AUDIO = { CLICK: new Audio('https://assets.codepen.io/605876/click.mp3') };
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const root = document.documentElement;

// ═══ SINGLE STATE OBJECT ═══
const STATE = {
  isPowered: false,
  currentMode: 'static',
  colorSequence: ['#ffc88c', '#818cf8'],
  activeColor: { r: 255, g: 200, b: 140, hue: 30 },
  brightness: 100
};

// ═══ CORD SETUP ═══
const HIT = $('.lamp__hit');
const DUMMY_CORD = $('.cord--dummy');
const CORDS = gsap.utils.toArray('.cords path');
const ENDX = DUMMY_CORD.getAttribute('x2');
const ENDY = DUMMY_CORD.getAttribute('y2');
const PROXY = document.createElement('div');
let startX, startY;
const CORD_DUR = 0.1;
const RESET = () => set(PROXY, { x: ENDX, y: ENDY });
RESET();

gsap.set(['.cords', HIT], { x: -10 });
gsap.set('.lamp__eye', { rotate: 180, transformOrigin: '50% 50%', yPercent: 50 });

// ═══ HELPERS ═══
function hexToRGB(hex) {
  hex = hex.replace('#', '');
  return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) };
}
function rgbToHue(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
  if (mx === mn) return 0;
  const d = mx - mn;
  let h;
  if (mx === r) h = ((g-b)/d + (g<b?6:0)) * 60;
  else if (mx === g) h = ((b-r)/d + 2) * 60;
  else h = ((r-g)/d + 4) * 60;
  return Math.round(h);
}
function lerpC(a, b, t) {
  return { r: Math.round(a.r+(b.r-a.r)*t), g: Math.round(a.g+(b.g-a.g)*t), b: Math.round(a.b+(b.b-a.b)*t) };
}

// ═══ APPLY TO CSS (no side effects) ═══
function applyColor(r, g, b, hue) {
  root.style.setProperty('--glow-r', r);
  root.style.setProperty('--glow-g', g);
  root.style.setProperty('--glow-b', b);
  root.style.setProperty('--shade-hue', hue);
  $('#colorPreview').style.background = `rgb(${r},${g},${b})`;
}

function applyBrightness() {
  root.style.setProperty('--brightness', (STATE.brightness / 100).toFixed(2));
  $('#brightVal').textContent = STATE.brightness + '%';
}

// ═══ UI STATE (lock/unlock panels) ═══
function updateUI() {
  const cs = $('#colorSection');
  const fx = $('#fxSection');
  const badge = $('#lockBadge');

  if (STATE.isPowered) {
    cs.className = 'panel-section section-locked';
    fx.className = 'panel-section fx-on';
    badge.className = 'lock-badge locked';
    badge.textContent = '🔒 LOCKED';
    $('#statusText').textContent = 'ON';
    document.body.classList.add('lamp-on');
  } else {
    cs.className = 'panel-section section-unlocked';
    fx.className = 'panel-section fx-off';
    badge.className = 'lock-badge unlocked';
    badge.textContent = '🔓 EDIT';
    $('#statusText').textContent = 'OFF';
    document.body.classList.remove('lamp-on');
  }
}

// ═══ EFFECT ENGINE ═══
let effectTL = null;
let candleRAF = null;
let glitchIV = null;

function stopEffect() {
  if (effectTL) { effectTL.kill(); effectTL = null; }
  if (candleRAF) { cancelAnimationFrame(candleRAF); candleRAF = null; }
  if (glitchIV) { clearInterval(glitchIV); glitchIV = null; }
  // Reset any scale/position tweaks from effects
  gsap.set('.lamp-glow-wrap', { x: 0, scale: 1 });
  applyBrightness();
}

function getColors() { return STATE.colorSequence.map(hexToRGB); }

function startEffect() {
  stopEffect();
  const colors = getColors();
  if (!colors.length) return;
  const c = STATE.activeColor;
  applyColor(c.r, c.g, c.b, c.hue);
  const mode = STATE.currentMode;

  if (mode === 'static') return; // Just the color, nothing animated

  if (mode === 'flow') {
    const tl = gsap.timeline({ repeat: -1 });
    for (let i = 0; i < colors.length; i++) {
      const next = colors[(i+1) % colors.length];
      const p = { r: colors[i].r, g: colors[i].g, b: colors[i].b };
      tl.to(p, { r: next.r, g: next.g, b: next.b, duration: 2.5, ease: 'none',
        onUpdate: () => applyColor(~~p.r, ~~p.g, ~~p.b, rgbToHue(p.r, p.g, p.b))
      });
    }
    effectTL = tl;
    return;
  }

  if (mode === 'breathe') {
    const tl = gsap.timeline({ repeat: -1 });
    colors.forEach(col => {
      tl.call(() => applyColor(col.r, col.g, col.b, rgbToHue(col.r, col.g, col.b)))
        .fromTo(root, { '--brightness': '0.3' }, { '--brightness': (STATE.brightness/100).toFixed(2), duration: 1.4, ease: 'sine.inOut' })
        .to(root, { '--brightness': '0.3', duration: 1.4, ease: 'sine.inOut' })
        .to({}, { duration: 0.2 });
    });
    effectTL = tl;
    return;
  }

  if (mode === 'beat') {
    const tl = gsap.timeline({ repeat: -1 });
    for (let i = 0; i < colors.length * 3; i++) {
      const col = colors[i % colors.length];
      tl.call(() => applyColor(col.r, col.g, col.b, rgbToHue(col.r, col.g, col.b)))
        .to('.lamp-glow-wrap', { scale: 1.04, duration: 0.06, ease: 'power4.out', transformOrigin: '50% 80%' })
        .to('.lamp-glow-wrap', { scale: 1, duration: 0.3, ease: 'elastic.out(1,.4)' })
        .to({}, { duration: 0.4 });
    }
    effectTL = tl;
    return;
  }

  if (mode === 'strobe') {
    const tl = gsap.timeline({ repeat: -1 });
    for (let i = 0; i < colors.length * 4; i++) {
      const col = colors[i % colors.length];
      tl.call(() => { applyColor(col.r, col.g, col.b, rgbToHue(col.r, col.g, col.b)); root.style.setProperty('--on', '1'); })
        .to({}, { duration: 0.1 })
        .call(() => root.style.setProperty('--on', '0.1'))
        .to({}, { duration: 0.1 });
    }
    effectTL = tl;
    return;
  }

  if (mode === 'wave') {
    const p = { t: 0 };
    const update = () => {
      const idx = Math.floor(p.t * (colors.length - 1));
      const frac = (p.t * (colors.length - 1)) - idx;
      const a = colors[Math.min(idx, colors.length - 1)];
      const b = colors[Math.min(idx + 1, colors.length - 1)];
      const mixed = lerpC(a, b, frac);
      applyColor(mixed.r, mixed.g, mixed.b, rgbToHue(mixed.r, mixed.g, mixed.b));
    };
    effectTL = gsap.timeline({ repeat: -1, yoyo: true })
      .to(p, { t: 1, duration: 4, ease: 'sine.inOut', onUpdate: update });
    return;
  }

  if (mode === 'candle') {
    const base = colors[0];
    applyColor(base.r, base.g, base.b, rgbToHue(base.r, base.g, base.b));
    function flick() {
      const r = Math.max(0, Math.min(255, base.r + ~~((Math.random()-.5)*25)));
      const g = Math.max(0, Math.min(255, base.g + ~~((Math.random()-.5)*18)));
      const b = Math.max(0, Math.min(255, base.b + ~~((Math.random()-.5)*10)));
      const br = (STATE.brightness + (Math.random()-.5)*25) / 100;
      root.style.setProperty('--glow-r', r);
      root.style.setProperty('--glow-g', g);
      root.style.setProperty('--glow-b', b);
      root.style.setProperty('--brightness', Math.max(0.3, Math.min(2, br)).toFixed(2));
      candleRAF = requestAnimationFrame(() => setTimeout(flick, 50 + Math.random() * 100));
    }
    flick();
    return;
  }

  if (mode === 'glitch') {
    const base = colors[0];
    applyColor(base.r, base.g, base.b, rgbToHue(base.r, base.g, base.b));
    glitchIV = setInterval(() => {
      if (Math.random() < 0.3) {
        const gc = colors[~~(Math.random() * colors.length)];
        applyColor(gc.r, gc.g, gc.b, rgbToHue(gc.r, gc.g, gc.b));
        root.style.setProperty('--brightness', (0.4 + Math.random() * 1.4).toFixed(2));
        gsap.to('.lamp-glow-wrap', { x: (Math.random()-.5)*5, duration: 0.04 });
        setTimeout(() => {
          applyColor(base.r, base.g, base.b, rgbToHue(base.r, base.g, base.b));
          applyBrightness();
          gsap.to('.lamp-glow-wrap', { x: 0, duration: 0.08 });
        }, 30 + Math.random() * 60);
      }
    }, 140);
    return;
  }
}

// ═══ POWER TOGGLE (CORD ONLY) ═══
function powerToggle() {
  STATE.isPowered = !STATE.isPowered;
  set(root, { '--on': STATE.isPowered ? 1 : 0 });
  set(root, { '--shade-hue': STATE.activeColor.hue });
  set('.lamp__eye', { rotate: STATE.isPowered ? 0 : 180 });

  if (STATE.isPowered) {
    $('#on').setAttribute('checked', true);
    $('#off').removeAttribute('checked');
    applyColor(STATE.activeColor.r, STATE.activeColor.g, STATE.activeColor.b, STATE.activeColor.hue);
    applyBrightness();
    startEffect(); // Effect ONLY starts here
  } else {
    $('#on').removeAttribute('checked');
    $('#off').setAttribute('checked', true);
    stopEffect(); // Effect ONLY stops here
  }

  set([DUMMY_CORD, HIT], { display: 'none' });
  set(CORDS[0], { display: 'block' });
  AUDIO.CLICK.play();
  updateUI();
}

// ═══ CORD PHYSICS ═══
const CORD_TL = timeline({
  paused: true,
  onStart: () => powerToggle(),
  onComplete: () => { set([DUMMY_CORD, HIT], { display: 'block' }); set(CORDS[0], { display: 'none' }); RESET(); }
});
for (let i = 1; i < CORDS.length; i++) {
  CORD_TL.add(to(CORDS[0], { morphSVG: CORDS[i], duration: CORD_DUR, repeat: 1, yoyo: true }));
}

Draggable.create(PROXY, {
  trigger: HIT, type: 'x,y',
  onPress: e => { startX = e.x; startY = e.y; },
  onDrag: function() { set(DUMMY_CORD, { attr: { x2: this.x, y2: Math.max(400, this.y) } }); },
  onRelease: function(e) {
    const d = Math.sqrt((e.x-startX)**2 + (e.y-startY)**2);
    to(DUMMY_CORD, { attr: { x2: ENDX, y2: ENDY }, duration: CORD_DUR,
      onComplete: () => { if (d > 50) CORD_TL.restart(); else RESET(); }
    });
  }
});

gsap.set('.lamp', { display: 'block' });

// Spacebar
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.repeat) { e.preventDefault(); CORD_TL.restart(); }
});

// ═══ COLOR SECTION EVENTS (OFF only, NO effects triggered) ═══

// Swatches — just set color, nothing else
$$('.swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    if (STATE.isPowered) return;
    $$('.swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const r = +btn.dataset.r, g = +btn.dataset.g, b = +btn.dataset.b;
    STATE.activeColor = { r, g, b, hue: +btn.dataset.hue };
    applyColor(r, g, b, STATE.activeColor.hue);
  });
});

// Mode pills — just set mode, nothing else
$$('.mode-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    if (STATE.isPowered) return;
    $$('.mode-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    STATE.currentMode = btn.dataset.mode;
  });
});

// Color stops
function rebuildStops() {
  STATE.colorSequence = [];
  $$('#stopsRow .color-stop').forEach(inp => STATE.colorSequence.push(inp.value));
  if (STATE.colorSequence.length > 0) {
    const c = hexToRGB(STATE.colorSequence[0]);
    STATE.activeColor = { ...c, hue: rgbToHue(c.r, c.g, c.b) };
    applyColor(c.r, c.g, c.b, STATE.activeColor.hue);
  }
}
function bindStops() {
  $$('#stopsRow .color-stop').forEach(inp => {
    inp.onchange = () => { if (!STATE.isPowered) rebuildStops(); };
  });
  $$('#stopsRow .remove-stop').forEach(btn => {
    btn.onclick = () => {
      if (STATE.isPowered || $$('#stopsRow .stop-wrap').length <= 2) return;
      btn.closest('.stop-wrap').remove();
      rebuildStops();
    };
  });
}
bindStops();

$('#addStopBtn').addEventListener('click', () => {
  if (STATE.isPowered || $$('#stopsRow .stop-wrap').length >= 6) return;
  const wrap = document.createElement('div');
  wrap.className = 'stop-wrap';
  const hex = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');
  wrap.innerHTML = `<input type="color" class="color-stop" value="${hex}"><button class="remove-stop" title="Remove">×</button>`;
  $('#stopsRow').insertBefore(wrap, $('#addStopBtn'));
  bindStops();
  rebuildStops();
});

// Presets — just set colors + mode, no effects
const PRESETS = {
  cyberpunk: { colors: ['#ff00ff','#00ffff','#ff0066','#6600ff'], mode: 'flow' },
  sunset: { colors: ['#ff6b35','#f7c548','#d62828','#ff9e00'], mode: 'breathe' },
  forest: { colors: ['#2d6a4f','#40916c','#95d5b2','#52b788'], mode: 'wave' },
  ocean: { colors: ['#0077b6','#00b4d8','#90e0ef','#023e8a'], mode: 'flow' },
  lavadream: { colors: ['#ff006e','#8338ec','#fb5607','#ffbe0b'], mode: 'beat' }
};

$$('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (STATE.isPowered) return;
    const p = PRESETS[btn.dataset.preset];
    if (!p) return;
    STATE.currentMode = p.mode;
    $$('.mode-pill').forEach(m => m.classList.remove('active'));
    $(`.mode-pill[data-mode="${p.mode}"]`).classList.add('active');
    // Rebuild stops
    $$('#stopsRow .stop-wrap').forEach(w => w.remove());
    p.colors.forEach(hex => {
      const wrap = document.createElement('div');
      wrap.className = 'stop-wrap';
      wrap.innerHTML = `<input type="color" class="color-stop" value="${hex}"><button class="remove-stop" title="Remove">×</button>`;
      $('#stopsRow').insertBefore(wrap, $('#addStopBtn'));
    });
    bindStops();
    rebuildStops();
  });
});

// ═══ BRIGHTNESS (ON only, real-time) ═══
$('#sliderBright').addEventListener('input', () => {
  if (!STATE.isPowered) return;
  STATE.brightness = +$('#sliderBright').value;
  applyBrightness();
});

// ═══ INIT ═══
applyColor(STATE.activeColor.r, STATE.activeColor.g, STATE.activeColor.b, STATE.activeColor.hue);
applyBrightness();
updateUI();