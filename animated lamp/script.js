/* ═══════════════════════════════════════════════
   LAMP CONTROLLER — STRICT PHYSICAL RULES ENGINE
   ═══════════════════════════════════════════════ */

const { gsap, gsap: { registerPlugin, set, to, timeline }, MorphSVGPlugin, Draggable } = window;
registerPlugin(MorphSVGPlugin);

const AUDIO = { CLICK: new Audio('https://assets.codepen.io/605876/click.mp3') };
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const root = document.documentElement;

// ── SINGLE STATE OBJECT ──
const STATE = {
  isPowered: false,
  currentMode: 'static',  // static|flow|breathe|beat|strobe|wave|candle|glitch
  colorSequence: ['#ff69b4', '#818cf8'],
  activeColor: { r: 255, g: 180, b: 220, hue: 320 },
  fxSettings: { brightness: 100, contrast: 100, spread: 40, intensity: 35 }
};

// ── DOM REFS ──
const ON_RADIO = $('#on'), OFF_RADIO = $('#off');
const HIT = $('.lamp__hit');
const DUMMY_CORD = $('.cord--dummy');
const CORDS = gsap.utils.toArray('.cords path');
const ENDX = DUMMY_CORD.getAttribute('x2');
const ENDY = DUMMY_CORD.getAttribute('y2');
const PROXY = document.createElement('div');
let startX, startY;
const CORD_DURATION = 0.1;
const RESET = () => set(PROXY, { x: ENDX, y: ENDY });
RESET();

gsap.set(['.cords', HIT], { x: -10 });
gsap.set('.lamp__eye', { rotate: 180, transformOrigin: '50% 50%', yPercent: 50 });

// ═══════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════

function applyColorToCSS(r, g, b, hue) {
  root.style.setProperty('--glow-r', r);
  root.style.setProperty('--glow-g', g);
  root.style.setProperty('--glow-b', b);
  root.style.setProperty('--shade-hue', hue);
  $('#colorPreview').style.background = `rgb(${r},${g},${b})`;
}

function applyFXToCSS() {
  const fx = STATE.fxSettings;
  root.style.setProperty('--brightness', (fx.brightness / 100).toFixed(2));
  root.style.setProperty('--contrast', (fx.contrast / 100).toFixed(2));
  root.style.setProperty('--glow-spread', fx.spread);
  root.style.setProperty('--glow-intensity', (fx.intensity / 100).toFixed(2));
  $('#brightVal').textContent = fx.brightness + '%';
  $('#contrastVal').textContent = fx.contrast + '%';
  $('#spreadVal').textContent = fx.spread;
  $('#intensityVal').textContent = fx.intensity + '%';
}

function syncRGBSliders(r, g, b) {
  $('#sliderR').value = r; $('#rVal').textContent = r;
  $('#sliderG').value = g; $('#gVal').textContent = g;
  $('#sliderB').value = b; $('#bVal').textContent = b;
}

function hexToRGB(hex) {
  hex = hex.replace('#', '');
  return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) };
}

function rgbToHue(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g-b)/d + (g<b?6:0)) * 60;
    else if (max === g) h = ((b-r)/d + 2) * 60;
    else h = ((r-g)/d + 4) * 60;
  }
  return Math.round(h);
}

// ── UI STATE MANAGEMENT ──
function updateUIState() {
  const colorSec = $('#colorSection');
  const fxSec = $('#fxSection');
  const lockBadge = $('#lockBadge');
  const statusText = $('#statusText');

  if (STATE.isPowered) {
    // ON: Lock color section, unlock FX
    colorSec.className = 'panel-section section-locked';
    fxSec.className = 'panel-section fx-on';
    lockBadge.className = 'lock-badge locked';
    lockBadge.textContent = '🔒 LOCKED';
    statusText.textContent = 'ON';
    document.body.classList.add('lamp-on');
  } else {
    // OFF: Unlock color section, lock FX
    colorSec.className = 'panel-section section-unlocked';
    fxSec.className = 'panel-section fx-off';
    lockBadge.className = 'lock-badge unlocked';
    lockBadge.textContent = '🔓 EDIT';
    statusText.textContent = 'OFF';
    document.body.classList.remove('lamp-on');
  }
}

// ═══════════════════════════════════════════════
// POWER TOGGLE — THE ONE-WAY SWITCH (cord only)
// ═══════════════════════════════════════════════
let effectTimeline = null;

function powerToggle() {
  STATE.isPowered = !STATE.isPowered;

  set(root, { '--on': STATE.isPowered ? 1 : 0 });
  set(root, { '--shade-hue': STATE.activeColor.hue });
  set('.lamp__eye', { rotate: STATE.isPowered ? 0 : 180 });

  applyColorToCSS(STATE.activeColor.r, STATE.activeColor.g, STATE.activeColor.b, STATE.activeColor.hue);

  if (STATE.isPowered) {
    ON_RADIO.setAttribute('checked', true);
    OFF_RADIO.removeAttribute('checked');
    startEffect();
  } else {
    ON_RADIO.removeAttribute('checked');
    OFF_RADIO.setAttribute('checked', true);
    stopEffect();
  }

  set([DUMMY_CORD, HIT], { display: 'none' });
  set(CORDS[0], { display: 'block' });
  AUDIO.CLICK.play();
  updateUIState();
}

// ── CORD TIMELINE ──
const CORD_TL = timeline({
  paused: true,
  onStart: () => powerToggle(),
  onComplete: () => {
    set([DUMMY_CORD, HIT], { display: 'block' });
    set(CORDS[0], { display: 'none' });
    RESET();
  }
});
for (let i = 1; i < CORDS.length; i++) {
  CORD_TL.add(to(CORDS[0], { morphSVG: CORDS[i], duration: CORD_DURATION, repeat: 1, yoyo: true }));
}

// ── DRAGGABLE ──
Draggable.create(PROXY, {
  trigger: HIT, type: 'x,y',
  onPress: e => { startX = e.x; startY = e.y; },
  onDrag: function() { set(DUMMY_CORD, { attr: { x2: this.x, y2: Math.max(400, this.y) } }); },
  onRelease: function(e) {
    const d = Math.sqrt((e.x-startX)**2 + (e.y-startY)**2);
    to(DUMMY_CORD, { attr: { x2: ENDX, y2: ENDY }, duration: CORD_DURATION,
      onComplete: () => { if (d > 50) CORD_TL.restart(); else RESET(); }
    });
  }
});

gsap.set('.lamp', { display: 'block' });

// Spacebar
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.repeat) { e.preventDefault(); CORD_TL.restart(); }
});

// ═══════════════════════════════════════════════
// EFFECT ENGINE — 7 ANIMATION PATTERNS + STATIC
// ═══════════════════════════════════════════════

function stopEffect() {
  if (effectTimeline) { effectTimeline.kill(); effectTimeline = null; }
  if (window._candleRAF) { cancelAnimationFrame(window._candleRAF); window._candleRAF = null; }
  if (window._glitchInterval) { clearInterval(window._glitchInterval); window._glitchInterval = null; }
}

function getStopColors() {
  return STATE.colorSequence.map(hex => hexToRGB(hex));
}

function lerpColor(a, b, t) {
  return { r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) };
}

function startEffect() {
  stopEffect();
  const colors = getStopColors();
  if (colors.length === 0) return;

  const mode = STATE.currentMode;

  // Static: just apply the first color
  if (mode === 'static') {
    const c = colors[0];
    applyColorToCSS(c.r, c.g, c.b, rgbToHue(c.r, c.g, c.b));
    return;
  }

  // ── FLOW: smooth linear transition through color list ──
  if (mode === 'flow') {
    const dur = 2; // seconds per color
    const tl = gsap.timeline({ repeat: -1 });
    for (let i = 0; i < colors.length; i++) {
      const next = colors[(i + 1) % colors.length];
      const proxy = { r: colors[i].r, g: colors[i].g, b: colors[i].b };
      tl.to(proxy, {
        r: next.r, g: next.g, b: next.b, duration: dur, ease: 'none',
        onUpdate: () => applyColorToCSS(Math.round(proxy.r), Math.round(proxy.g), Math.round(proxy.b), rgbToHue(proxy.r, proxy.g, proxy.b))
      });
    }
    effectTimeline = tl;
    return;
  }

  // ── BREATHE: fade in/out with pulse ──
  if (mode === 'breathe') {
    let idx = 0;
    const tl = gsap.timeline({ repeat: -1 });
    const breatheOne = () => {
      const c = colors[idx % colors.length];
      idx++;
      return [
        // fade in
        gsap.to({}, { duration: 1.2, ease: 'sine.inOut',
          onUpdate: function() {
            const p = this.progress();
            const br = 50 + p * (STATE.fxSettings.brightness - 50);
            root.style.setProperty('--brightness', (br / 100).toFixed(2));
            applyColorToCSS(c.r, c.g, c.b, rgbToHue(c.r, c.g, c.b));
          }
        }),
        // hold
        gsap.to({}, { duration: 0.3 }),
        // fade out
        gsap.to({}, { duration: 1.2, ease: 'sine.inOut',
          onUpdate: function() {
            const p = 1 - this.progress();
            const br = 50 + p * (STATE.fxSettings.brightness - 50);
            root.style.setProperty('--brightness', (br / 100).toFixed(2));
          }
        }),
        gsap.to({}, { duration: 0.3 })
      ];
    };
    for (let i = 0; i < colors.length * 2; i++) {
      breatheOne().forEach(tw => tl.add(tw));
    }
    effectTimeline = tl;
    return;
  }

  // ── BEAT: sharp rhythmic jump ──
  if (mode === 'beat') {
    let idx = 0;
    const tl = gsap.timeline({ repeat: -1 });
    for (let i = 0; i < colors.length * 4; i++) {
      const c = colors[i % colors.length];
      tl.call(() => applyColorToCSS(c.r, c.g, c.b, rgbToHue(c.r, c.g, c.b)))
        .to('.lamp-glow-wrap', { scale: 1.04, duration: 0.08, ease: 'power4.out', transformOrigin: '50% 80%' })
        .to('.lamp-glow-wrap', { scale: 1, duration: 0.25, ease: 'elastic.out(1, 0.4)' })
        .to({}, { duration: 0.35 });
    }
    effectTimeline = tl;
    return;
  }

  // ── STROBE: safe high-freq flash ──
  if (mode === 'strobe') {
    let idx = 0;
    const tl = gsap.timeline({ repeat: -1 });
    for (let i = 0; i < colors.length * 6; i++) {
      const c = colors[i % colors.length];
      tl.call(() => { applyColorToCSS(c.r, c.g, c.b, rgbToHue(c.r, c.g, c.b)); root.style.setProperty('--on', '1'); })
        .to({}, { duration: 0.08 })
        .call(() => root.style.setProperty('--on', '0.15'))
        .to({}, { duration: 0.08 });
    }
    effectTimeline = tl;
    return;
  }

  // ── WAVE: top-to-bottom gradient shift ──
  if (mode === 'wave') {
    const proxy = { t: 0 };
    const tl = gsap.timeline({ repeat: -1 });
    tl.to(proxy, {
      t: 1, duration: 3, ease: 'sine.inOut',
      onUpdate: () => {
        const i = Math.floor(proxy.t * (colors.length - 1));
        const frac = (proxy.t * (colors.length - 1)) - i;
        const a = colors[Math.min(i, colors.length - 1)];
        const b = colors[Math.min(i + 1, colors.length - 1)];
        const c = lerpColor(a, b, frac);
        applyColorToCSS(c.r, c.g, c.b, rgbToHue(c.r, c.g, c.b));
        // Shift glow spread to create wave
        root.style.setProperty('--glow-spread', Math.round(20 + Math.sin(proxy.t * Math.PI * 2) * 30));
      }
    }).to(proxy, { t: 0, duration: 3, ease: 'sine.inOut',
      onUpdate: () => {
        const i = Math.floor(proxy.t * (colors.length - 1));
        const frac = (proxy.t * (colors.length - 1)) - i;
        const a = colors[Math.min(i, colors.length - 1)];
        const b = colors[Math.min(i + 1, colors.length - 1)];
        const c = lerpColor(a, b, frac);
        applyColorToCSS(c.r, c.g, c.b, rgbToHue(c.r, c.g, c.b));
        root.style.setProperty('--glow-spread', Math.round(20 + Math.sin(proxy.t * Math.PI * 2) * 30));
      }
    });
    effectTimeline = tl;
    return;
  }

  // ── CANDLE FLICKER: random micro-adjustments ──
  if (mode === 'candle') {
    const baseC = colors[0];
    applyColorToCSS(baseC.r, baseC.g, baseC.b, rgbToHue(baseC.r, baseC.g, baseC.b));
    function flicker() {
      const dr = Math.round((Math.random() - 0.5) * 30);
      const dg = Math.round((Math.random() - 0.5) * 20);
      const db = Math.round((Math.random() - 0.5) * 10);
      const br = STATE.fxSettings.brightness + (Math.random() - 0.5) * 30;
      const r = Math.max(0, Math.min(255, baseC.r + dr));
      const g = Math.max(0, Math.min(255, baseC.g + dg));
      const b = Math.max(0, Math.min(255, baseC.b + db));
      root.style.setProperty('--glow-r', r);
      root.style.setProperty('--glow-g', g);
      root.style.setProperty('--glow-b', b);
      root.style.setProperty('--brightness', (Math.max(50, Math.min(200, br)) / 100).toFixed(2));
      root.style.setProperty('--glow-intensity', ((STATE.fxSettings.intensity + (Math.random() - 0.5) * 20) / 100).toFixed(2));
      window._candleRAF = requestAnimationFrame(() => {
        setTimeout(flicker, 50 + Math.random() * 120);
      });
    }
    flicker();
    return;
  }

  // ── GLITCH: digital flicker ──
  if (mode === 'glitch') {
    const baseC = colors[0];
    applyColorToCSS(baseC.r, baseC.g, baseC.b, rgbToHue(baseC.r, baseC.g, baseC.b));
    window._glitchInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        // Glitch burst
        const gc = colors[Math.floor(Math.random() * colors.length)];
        applyColorToCSS(gc.r, gc.g, gc.b, rgbToHue(gc.r, gc.g, gc.b));
        root.style.setProperty('--brightness', (0.5 + Math.random() * 1.5).toFixed(2));
        gsap.to('.lamp-glow-wrap', { x: (Math.random()-0.5)*6, duration: 0.05 });
        setTimeout(() => {
          applyColorToCSS(baseC.r, baseC.g, baseC.b, rgbToHue(baseC.r, baseC.g, baseC.b));
          root.style.setProperty('--brightness', (STATE.fxSettings.brightness / 100).toFixed(2));
          gsap.to('.lamp-glow-wrap', { x: 0, duration: 0.1 });
        }, 40 + Math.random() * 80);
      }
    }, 150);
    return;
  }
}

// ═══════════════════════════════════════════════
// COLOR SECTION EVENTS (only work when OFF)
// ═══════════════════════════════════════════════

// Quick swatches
$$('.swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    if (STATE.isPowered) return; // LOCKED
    $$('.swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const r = +btn.dataset.r, g = +btn.dataset.g, b = +btn.dataset.b, hue = +btn.dataset.hue;
    STATE.activeColor = { r, g, b, hue };
    applyColorToCSS(r, g, b, hue);
    syncRGBSliders(r, g, b);
  });
});

// RGB sliders
['sliderR','sliderG','sliderB'].forEach(id => {
  $(('#' + id)).addEventListener('input', () => {
    if (STATE.isPowered) return;
    const r = +$('#sliderR').value, g = +$('#sliderG').value, b = +$('#sliderB').value;
    $('#rVal').textContent = r; $('#gVal').textContent = g; $('#bVal').textContent = b;
    const hue = rgbToHue(r, g, b);
    STATE.activeColor = { r, g, b, hue };
    applyColorToCSS(r, g, b, hue);
    $$('.swatch').forEach(s => s.classList.remove('active'));
  });
});

// Mode pills
$$('.mode-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    if (STATE.isPowered) return;
    $$('.mode-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    STATE.currentMode = btn.dataset.mode;
  });
});

// ── MULTI-COLOR STOPS ──
function rebuildStopsFromDOM() {
  STATE.colorSequence = [];
  $$('#stopsRow .color-stop').forEach(inp => STATE.colorSequence.push(inp.value));
  // Use first stop as active color for static mode
  if (STATE.colorSequence.length > 0) {
    const c = hexToRGB(STATE.colorSequence[0]);
    STATE.activeColor = { ...c, hue: rgbToHue(c.r, c.g, c.b) };
    applyColorToCSS(c.r, c.g, c.b, STATE.activeColor.hue);
    syncRGBSliders(c.r, c.g, c.b);
  }
}

function addStopEvents() {
  $$('#stopsRow .color-stop').forEach(inp => {
    inp.removeEventListener('input', onStopChange);
    inp.addEventListener('input', onStopChange);
  });
  $$('#stopsRow .remove-stop').forEach(btn => {
    btn.removeEventListener('click', onRemoveStop);
    btn.addEventListener('click', onRemoveStop);
  });
}

function onStopChange() {
  if (STATE.isPowered) return;
  rebuildStopsFromDOM();
}

function onRemoveStop(e) {
  if (STATE.isPowered) return;
  const stops = $$('#stopsRow .stop-wrap');
  if (stops.length <= 2) return; // minimum 2
  e.target.closest('.stop-wrap').remove();
  rebuildStopsFromDOM();
}

$('#addStopBtn').addEventListener('click', () => {
  if (STATE.isPowered) return;
  const stops = $$('#stopsRow .stop-wrap');
  if (stops.length >= 6) return; // max 6
  const wrap = document.createElement('div');
  wrap.className = 'stop-wrap';
  const randHex = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');
  wrap.innerHTML = `<input type="color" class="color-stop" value="${randHex}"><button class="remove-stop" title="Remove">×</button>`;
  $('#stopsRow').insertBefore(wrap, $('#addStopBtn'));
  addStopEvents();
  rebuildStopsFromDOM();
});

addStopEvents();

// ── PRESETS ──
const PRESETS = {
  cyberpunk: { colors: ['#ff00ff','#00ffff','#ff0066','#6600ff'], mode: 'flow' },
  sunset:    { colors: ['#ff6b35','#f7c548','#d62828','#ff9e00'], mode: 'breathe' },
  forest:    { colors: ['#2d6a4f','#40916c','#95d5b2','#52b788'], mode: 'wave' },
  ocean:     { colors: ['#0077b6','#00b4d8','#90e0ef','#023e8a'], mode: 'flow' },
  lavadream: { colors: ['#ff006e','#8338ec','#fb5607','#ffbe0b'], mode: 'beat' }
};

$$('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (STATE.isPowered) return;
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;

    // Set mode
    STATE.currentMode = preset.mode;
    $$('.mode-pill').forEach(p => p.classList.remove('active'));
    $$(`.mode-pill[data-mode="${preset.mode}"]`).forEach(p => p.classList.add('active'));

    // Set color stops
    const stopsRow = $('#stopsRow');
    stopsRow.querySelectorAll('.stop-wrap').forEach(w => w.remove());
    preset.colors.forEach(hex => {
      const wrap = document.createElement('div');
      wrap.className = 'stop-wrap';
      wrap.innerHTML = `<input type="color" class="color-stop" value="${hex}"><button class="remove-stop" title="Remove">×</button>`;
      stopsRow.insertBefore(wrap, $('#addStopBtn'));
    });
    addStopEvents();
    rebuildStopsFromDOM();
  });
});

// ═══════════════════════════════════════════════
// FX SLIDERS (real-time, only when ON)
// ═══════════════════════════════════════════════
['sliderBright','sliderContrast','sliderSpread','sliderIntensity'].forEach(id => {
  $('#' + id).addEventListener('input', () => {
    if (!STATE.isPowered) return; // Only active when ON
    STATE.fxSettings.brightness = +$('#sliderBright').value;
    STATE.fxSettings.contrast = +$('#sliderContrast').value;
    STATE.fxSettings.spread = +$('#sliderSpread').value;
    STATE.fxSettings.intensity = +$('#sliderIntensity').value;
    applyFXToCSS(); // Instant, no flicker
  });
});

// ── INIT ──
applyColorToCSS(STATE.activeColor.r, STATE.activeColor.g, STATE.activeColor.b, STATE.activeColor.hue);
applyFXToCSS();
updateUIState();