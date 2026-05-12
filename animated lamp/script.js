const {
  gsap,
  gsap: { registerPlugin, set, to, timeline },
  MorphSVGPlugin,
  Draggable } =
window;
registerPlugin(MorphSVGPlugin);

const AUDIO = {
  CLICK: new Audio('https://assets.codepen.io/605876/click.mp3') };

const ON = document.querySelector('#on');
const OFF = document.querySelector('#off');

// Used to calculate distance of "tug"
let startX;
let startY;

const PROXY = document.createElement('div');

const CORDS = gsap.utils.toArray('.cords path');
const CORD_DURATION = 0.1;
const HIT = document.querySelector('.lamp__hit');
const DUMMY_CORD = document.querySelector('.cord--dummy');
const ENDX = DUMMY_CORD.getAttribute('x2');
const ENDY = DUMMY_CORD.getAttribute('y2');
const RESET = () => {
  set(PROXY, {
    x: ENDX,
    y: ENDY });
};
RESET();

const STATE = {
  ON: false };

gsap.set(['.cords', HIT], {
  x: -10 });

gsap.set('.lamp__eye', {
  rotate: 180,
  transformOrigin: '50% 50%',
  yPercent: 50 });

// ── COLOR SYSTEM ──────────────────────────────────────────────────────
let currentHue = 320;
let currentRGB = [255, 180, 220];

function setGlowColor(hue, rgb) {
  currentHue = hue;
  currentRGB = rgb;
  const root = document.documentElement;
  root.style.setProperty('--shade-hue', hue);
  root.style.setProperty('--glow-r', rgb[0]);
  root.style.setProperty('--glow-g', rgb[1]);
  root.style.setProperty('--glow-b', rgb[2]);
}

// Swatch click handlers
document.querySelectorAll('.swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const hue = parseInt(btn.dataset.color);
    const rgb = btn.dataset.rgb.split(',').map(Number);
    setGlowColor(hue, rgb);
  });
});

// Custom color picker
document.getElementById('customColor').addEventListener('input', (e) => {
  const hex = e.target.value;
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  // Approximate hue from RGB
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  setGlowColor(Math.round(h), [r, g, b]);
});

// ── LAMP TOGGLE ───────────────────────────────────────────────────────
function toggleLamp() {
  STATE.ON = !STATE.ON;
  set(document.documentElement, { '--on': STATE.ON ? 1 : 0 });

  // Apply current color hue
  set(document.documentElement, { '--shade-hue': currentHue });

  set('.lamp__eye', {
    rotate: STATE.ON ? 0 : 180 });

  // Body class for neon glow + room ambient
  if (STATE.ON) {
    document.body.classList.add('lamp-on');
  } else {
    document.body.classList.remove('lamp-on');
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

const CORD_TL = timeline({
  paused: true,
  onStart: () => {
    toggleLamp();
  },
  onComplete: () => {
    set([DUMMY_CORD, HIT], { display: 'block' });
    set(CORDS[0], { display: 'none' });
    RESET();
  } });

for (let i = 1; i < CORDS.length; i++) {
  CORD_TL.add(
  to(CORDS[0], {
    morphSVG: CORDS[i],
    duration: CORD_DURATION,
    repeat: 1,
    yoyo: true }));
}

Draggable.create(PROXY, {
  trigger: HIT,
  type: 'x,y',
  onPress: e => {
    startX = e.x;
    startY = e.y;
  },
  onDrag: function () {
    set(DUMMY_CORD, {
      attr: {
        x2: this.x,
        y2: Math.max(400, this.y) } });
  },
  onRelease: function (e) {
    const DISTX = Math.abs(e.x - startX);
    const DISTY = Math.abs(e.y - startY);
    const TRAVELLED = Math.sqrt(DISTX * DISTX + DISTY * DISTY);
    to(DUMMY_CORD, {
      attr: { x2: ENDX, y2: ENDY },
      duration: CORD_DURATION,
      onComplete: () => {
        if (TRAVELLED > 50) {
          CORD_TL.restart();
        } else {
          RESET();
        }
      } });
  } });

gsap.set('.lamp', { display: 'block' });

// ── SPACEBAR TOGGLE ──────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    CORD_TL.restart();
  }
});