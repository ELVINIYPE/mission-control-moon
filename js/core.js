// core.js — shared pieces for Mission Control: Moon 3D (three.js r128)
// Each game part lives in its own file and registers a screen: SCREENS.intro, SCREENS.players, ...

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const S3 = { pickable: [] };                 // used by astronaut3d.js
const SCREENS = {};
const GAME = { players: [], soundOn: true }; // shared game state (filled by later parts)
// 🎬 Demo mode (for the judges): same game, but no waiting, fast transitions and shortcuts. The normal game is unchanged.
function DEMO() { return !!GAME.demo; }

function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; }
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

function moonTexture() {
  return canvasTex(1024, 512, (x, w, h) => {
    const r = rng(7); x.fillStyle = "#a3a3a6"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(70,70,78,${0.25 + r() * 0.3})`; x.beginPath(); x.ellipse(r() * w, 110 + r() * 290, 30 + r() * 90, 25 + r() * 60, 0, 0, 7); x.fill(); }
    for (let i = 0; i < 700; i++) { const cx = r() * w, cy = r() * h, rad = 1 + r() ** 3 * 22;
      x.fillStyle = "rgba(55,55,60,.45)"; x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
      x.strokeStyle = "rgba(235,235,235,.35)"; x.beginPath(); x.arc(cx - rad * .15, cy - rad * .15, rad, 0, 7); x.stroke(); }
  });
}
function earthTexture() {
  return canvasTex(1024, 512, (x, w, h) => {
    const r = rng(3); const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#1b4f9c"); g.addColorStop(0.5, "#1f62c0"); g.addColorStop(1, "#1b4f9c");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    [[180, 170, 90, 70], [250, 330, 60, 90], [520, 160, 70, 50], [560, 290, 70, 110], [700, 170, 150, 80], [840, 360, 60, 40]].forEach(([cx, cy, rx, ry]) => {
      for (let i = 0; i < 16; i++) { x.fillStyle = i % 3 ? "#3f8f4a" : "#a08d58"; x.beginPath(); x.ellipse(cx + (r() - .5) * rx, cy + (r() - .5) * ry, rx * (0.3 + r() * 0.4), ry * (0.3 + r() * 0.4), r() * 3, 0, 7); x.fill(); } });
    x.fillStyle = "#f2f5f8"; x.fillRect(0, 0, w, 24); x.fillRect(0, h - 28, w, 28);
  });
}
function cloudTexture() {
  return canvasTex(1024, 512, (x, w, h) => { const r = rng(11); x.clearRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.45})`; x.beginPath(); x.ellipse(r() * w, r() * h, 20 + r() * 70, 5 + r() * 14, r(), 0, 7); x.fill(); } });
}
// stars + a soft Milky Way band
function starfield(scene, n = 5000) {
  const g = new THREE.BufferGeometry(), p = [], c = [];
  for (let i = 0; i < n; i++) {
    let v = V3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize();
    if (i < n * 0.4) { v.y *= 0.18; v.normalize(); }                              // band
    v.multiplyScalar(400 + Math.random() * 300); p.push(v.x, v.y, v.z);
    const t = Math.random(); c.push(0.8 + t * 0.2, 0.85 + t * 0.15, 1);
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  const s = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95 }));
  s.rotation.z = 0.5; scene.add(s); return s;
}
function glowSprite(color, size) {
  const tex = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1); return s;
}

// ---------- tiny sound kit (Web Audio; starts after the first click) ----------
const SND = {
  ctx: null,
  init() { if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} },
  tone(f, d = 0.15, type = "sine", v = 0.12) { if (!GAME.soundOn || !this.ctx) return; const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + d); o.connect(g).connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + d); },
  click() { this.tone(660, 0.08, "square", 0.05); },
  beep() { this.tone(1046, 0.12, "sine", 0.1); setTimeout(() => this.tone(1318, 0.15, "sine", 0.1), 120); },
  hum: null,
  startHum() { if (!this.ctx || this.hum || !GAME.soundOn) return; const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.value = 55; o2.frequency.value = 82.4; o.type = o2.type = "sine"; g.gain.value = 0.035; o.connect(g); o2.connect(g); g.connect(this.ctx.destination); o.start(); o2.start(); this.hum = { o, o2, g }; },
  stopHum() { if (this.hum) { this.hum.o.stop(); this.hum.o2.stop(); this.hum = null; } },
  // pumping-fuel sound: a rushing, gurgling flow + bubble blips (cryogenic = hissier, with venting). Returns stop().
  fill(sec = 4, cryo = false) { if (!GAME.soundOn || !this.ctx) return () => {}; const c = this.ctx, t0 = c.currentTime;
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 3; bp.frequency.value = cryo ? 1800 : 500;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = cryo ? 9 : 6; lg.gain.value = cryo ? 600 : 250; lfo.connect(lg).connect(bp.frequency);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.3); g.gain.setValueAtTime(0.09, t0 + sec - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + sec);
    src.connect(bp).connect(g).connect(c.destination); src.start(); lfo.start(); src.stop(t0 + sec + 0.1); lfo.stop(t0 + sec + 0.1);
    let alive = true; const blip = () => { if (!alive) return; const o = c.createOscillator(), bg = c.createGain(), n = c.currentTime, f0 = 180 + Math.random() * 260;
      o.frequency.setValueAtTime(f0, n); o.frequency.exponentialRampToValueAtTime(f0 * 2.6, n + 0.07); bg.gain.setValueAtTime(0.05, n); bg.gain.exponentialRampToValueAtTime(0.001, n + 0.09);
      o.connect(bg).connect(c.destination); o.start(); o.stop(n + 0.1); setTimeout(blip, 60 + Math.random() * 160); };
    blip(); const tm = setTimeout(() => (alive = false), sec * 1000); return () => { alive = false; clearTimeout(tm); }; },
  say(text) { if (!GAME.soundOn || !("speechSynthesis" in window)) return; const u = new SpeechSynthesisUtterance(text); u.rate = 1; u.pitch = 1; speechSynthesis.cancel(); speechSynthesis.speak(u); },
};

// ---------- screens ----------
function showScreen(name, arg) {
  Object.values(SCREENS).forEach((s) => s.hide && s.hide());
  SCREENS[name].show(arg);
}
