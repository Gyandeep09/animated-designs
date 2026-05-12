const {
  gsap,
  gsap: { registerPlugin, set, to, timeline },
  MorphSVGPlugin,
  Draggable
} = window;
registerPlugin(MorphSVGPlugin);

const AUDIO = {
  CLICK: new Audio('https://assets.codepen.io/605876/click.mp3')
};

const ON = document.querySelector('#on');
const OFF = document.querySelector('#off');

let startX, startY;
const PROXY = document.createElement('div');

const CORDS = gsap.utils.toArray('.cords path');
const CORD_DURATION = 0.1;
const HIT = document.querySelector('.lamp__hit');
const DUMMY_CORD = document.querySelector('.cord--dummy');
const ENDX = DUMMY_CORD.getAttribute('x2');
const ENDY = DUMMY_CORD.getAttribute('y2');
const RESET = () => set(PROXY, { x: ENDX, y: ENDY });
RESET();

const STATE = { ON: false };

gsap.set(['.cords', HIT], { x: -10 });
gsap.set('.lamp__eye', { rotate: 180, transformOrigin: '50% 50%', yPercent: 50 });

// ═══════════════════════════════════════════════
// COLOR & SETTINGS STATE
// ═══════════════════════════════════════════════
const root = document.documentElement;
let currentR = 255, currentG = 180, currentB = 220, currentHue = 320;

const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const sliderR = $('#sliderR');
const sliderG = $('#sliderG');
const sliderB = $('#sliderB');
const sliderBright = $('#sliderBright');
const sliderContrast = $('#sliderContrast');
const sliderSpread = $('#sliderSpread');
const sliderIntensity = $('#sliderIntensity');
const colorPreview = $('#colorPreview');
const statusText = $('#statusText');
const customColor = $('#customColor');

// ── Apply color to CSS vars ──
function applyColor(r, g, b, hue) {
  currentR = r; currentG = g; currentB = b; currentHue = hue;
  root.style.setProperty('--glow-r', r);
  root.style.setProperty('--glow-g', g);
  root.style.setProperty('--glow-b', b);
  root.style.setProperty('--shade-hue', hue);
  colorPreview.style.background = `rgb(${r},${g},${b})`;

  // Sync RGB sliders
  sliderR.value = r; $('#rVal').textContent = r;
  sliderG.value = g; $('#gVal').textContent = g;
  sliderB.value = b; $('#bVal').textContent = b;

  // Sync custom color input
  customColor.value = '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
}

// ── Apply FX to CSS vars ──
function applyFX() {
  const bright = sliderBright.value;
  const contrast = sliderContrast.value;
  const spread = sliderSpread.value;
  const intensity = sliderIntensity.value;

  root.style.setProperty('--brightness', (bright / 100).toFixed(2));
  root.style.setProperty('--contrast', (contrast / 100).toFixed(2));
  root.style.setProperty('--glow-spread', spread);
  root.style.setProperty('--glow-intensity', (intensity / 100).toFixed(2));

  $('#brightVal').textContent = bright + '%';
  $('#contrastVal').textContent = contrast + '%';
  $('#spreadVal').textContent = spread;
  $('#intensityVal').textContent = intensity + '%';
}

// ── RGB → Hue helper ──
function rgbToHue(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return Math.round(h);
}

// ═══════════════════════════════════════════════
// RULE: COLOR CHANGE WHILE ON → AUTO OFF → APPLY → AUTO ON
// ═══════════════════════════════════════════════
let colorChangeTimer = null;

function changeColorSafe(r, g, b, hue) {
  if (STATE.ON) {
    // Turn off first
    clearTimeout(colorChangeTimer);
    doToggle(); // OFF

    // Wait for transition to complete, apply, then turn back on
    colorChangeTimer = setTimeout(() => {
      applyColor(r, g, b, hue);
      setTimeout(() => {
        doToggle(); // ON again
      }, 300);
    }, 600);
  } else {
    // Just apply directly when off
    applyColor(r, g, b, hue);
  }
}

// Same rule for FX changes
function changeFXSafe() {
  if (STATE.ON) {
    clearTimeout(colorChangeTimer);
    doToggle(); // OFF
    colorChangeTimer = setTimeout(() => {
      applyFX();
      setTimeout(() => doToggle(), 300); // ON
    }, 600);
  } else {
    applyFX();
  }
}

// ═══════════════════════════════════════════════
// LAMP TOGGLE (internal — no rule check)
// ═══════════════════════════════════════════════
function doToggle() {
  STATE.ON = !STATE.ON;
  set(root, { '--on': STATE.ON ? 1 : 0 });
  set(root, { '--shade-hue': currentHue });
  set('.lamp__eye', { rotate: STATE.ON ? 0 : 180 });

  if (STATE.ON) {
    document.body.classList.add('lamp-on');
    statusText.textContent = 'ON';
  } else {
    document.body.classList.remove('lamp-on');
    statusText.textContent = 'OFF';
  }

  set([DUMMY_CORD, HIT], { display: 'none' });
  set(CORDS[0], { display: 'block' });
  AUDIO.CLICK.play();

  if (STATE.ON) {
    ON.setAttribute('checked', true);
    OFF.removeAttribute('checked');
  } else {
    ON.removeAttribute('checked');
    OFF.setAttribute('checked', true);
  }
}

// ── CORD TIMELINE ──
const CORD_TL = timeline({
  paused: true,
  onStart: () => doToggle(),
  onComplete: () => {
    set([DUMMY_CORD, HIT], { display: 'block' });
    set(CORDS[0], { display: 'none' });
    RESET();
  }
});

for (let i = 1; i < CORDS.length; i++) {
  CORD_TL.add(
    to(CORDS[0], {
      morphSVG: CORDS[i],
      duration: CORD_DURATION,
      repeat: 1,
      yoyo: true
    })
  );
}

// ── DRAGGABLE CORD ──
Draggable.create(PROXY, {
  trigger: HIT,
  type: 'x,y',
  onPress: e => { startX = e.x; startY = e.y; },
  onDrag: function() {
    set(DUMMY_CORD, { attr: { x2: this.x, y2: Math.max(400, this.y) } });
  },
  onRelease: function(e) {
    const dx = Math.abs(e.x - startX);
    const dy = Math.abs(e.y - startY);
    const dist = Math.sqrt(dx*dx + dy*dy);
    to(DUMMY_CORD, {
      attr: { x2: ENDX, y2: ENDY },
      duration: CORD_DURATION,
      onComplete: () => {
        if (dist > 50) CORD_TL.restart();
        else RESET();
      }
    });
  }
});

gsap.set('.lamp', { display: 'block' });

// ═══════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════

// Spacebar toggle
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    CORD_TL.restart();
  }
});

// Swatch clicks
$$('.swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const r = +btn.dataset.r, g = +btn.dataset.g, b = +btn.dataset.b;
    const hue = +btn.dataset.hue;
    changeColorSafe(r, g, b, hue);
  });
});

// Custom color picker
customColor.addEventListener('input', e => {
  const hex = e.target.value;
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  $$('.swatch').forEach(s => s.classList.remove('active'));
  changeColorSafe(r, g, b, rgbToHue(r, g, b));
});

// RGB sliders — debounced so they don't spam toggle
let rgbTimer = null;
function onRGBChange() {
  const r = +sliderR.value, g = +sliderG.value, b = +sliderB.value;
  $('#rVal').textContent = r;
  $('#gVal').textContent = g;
  $('#bVal').textContent = b;
  colorPreview.style.background = `rgb(${r},${g},${b})`;
  customColor.value = '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
  $$('.swatch').forEach(s => s.classList.remove('active'));

  clearTimeout(rgbTimer);
  rgbTimer = setTimeout(() => {
    changeColorSafe(r, g, b, rgbToHue(r, g, b));
  }, 400); // 400ms debounce — waits for user to finish sliding
}
sliderR.addEventListener('input', onRGBChange);
sliderG.addEventListener('input', onRGBChange);
sliderB.addEventListener('input', onRGBChange);

// FX sliders — debounced
let fxTimer = null;
function onFXChange() {
  // Update labels immediately for responsiveness
  $('#brightVal').textContent = sliderBright.value + '%';
  $('#contrastVal').textContent = sliderContrast.value + '%';
  $('#spreadVal').textContent = sliderSpread.value;
  $('#intensityVal').textContent = sliderIntensity.value + '%';

  clearTimeout(fxTimer);
  fxTimer = setTimeout(() => {
    changeFXSafe();
  }, 400);
}
sliderBright.addEventListener('input', onFXChange);
sliderContrast.addEventListener('input', onFXChange);
sliderSpread.addEventListener('input', onFXChange);
sliderIntensity.addEventListener('input', onFXChange);

// Initialize
applyFX();