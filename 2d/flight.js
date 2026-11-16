// ---------- 7. FLIGHT ----------
// GO/NO-GO poll → countdown → staged launch → parking orbit → TLI → Moon → home
// One animation loop. flight.phase decides what is drawn each frame.
const W = 900, H = 420;
const MOON = { x: 520, y: 230, R: 34 };          // Moon in the orbit mini-game view
const GM = 60000;                                // Moon's gravity strength (game units)
const THRUST = 6;                                // how hard the BRAKE pushes
const PAD_Y = 370;                               // launch pad height on screen
let flight = null;

function screenFlight() {
  hush();
  const m = computeMass(), r = byId(ROCKETS, state.rocket);
  const { parts, boosters } = stackParts(state.rocket);
  parts.forEach((p) => (p.fill = 1)); if (boosters) boosters.fill = 1;
  flight = {
    m, r, phase: "poll", pt: 0, fails: null, saved: null, attempts: 0,
    tooHeavy: m.total > r.tli,
    willLeak: state.goal !== "flyby" && Math.random() < 0.5, leakDone: false,
    willAbort: false,                            // (random launch failures removed)
    stack: parts, boosters, debris: [], sepCount: 0,
    stars: Array.from({ length: 140 }, () => [Math.random() * W, Math.random() * H, Math.random()]),
    smoke: [], label: "", labelT: 0, last: performance.now(), shakeT: 0,
    wy: 0, v: 0, lt: 0, st: 0,
    mt: Math.random() * 60, lives: 5, tliTries: 0, scale: 1,
  };
  $("app").innerHTML = `<div id="flightView" class="fview">
    <div class="ftop"><h2 id="flightTitle">Launch Control</h2><div id="lives" class="lives"></div></div>
    <div class="fstage" id="fstage"><canvas id="sky"></canvas><div id="poll" class="poll"></div></div>
    <div class="fbottom">
      <div class="ctrl hidden" id="ctrl">
        <div class="fuelbox">⛽ Brake fuel<div class="meter"><div id="fuelBar" style="width:100%"></div></div></div>
        <button class="btn" id="brakeBtn">🔥 HOLD TO BRAKE</button>
      </div>
      <div class="ctrl hidden" id="tliCtrl"></div>
      <p class="tip" id="tip"></p>
      <div class="ctrl"><button class="btn ghost" id="skipBtn" onclick="skipPoll()">⏩ Skip countdown</button></div>
    </div></div>`;
  // From the countdown on, the game goes FULL SCREEN
  document.body.classList.add("flying");
  try { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch?.(() => {}); } catch (e) {}
  fitCanvas(); showLives();
  const b = $("brakeBtn");
  const on = (e) => { e.preventDefault(); setBrake(true); }, off = () => setBrake(false);
  b.addEventListener("mousedown", on); b.addEventListener("touchstart", on);
  b.addEventListener("mouseup", off); b.addEventListener("mouseleave", off); b.addEventListener("touchend", off);
  requestAnimationFrame(tick);
  runPoll();
}
document.addEventListener("keydown", (e) => {
  if (e.code !== "Space" || !flight) return;
  if (flight.phase === "capture") { e.preventDefault(); setBrake(true); }
  if (flight.phase === "parking") { e.preventDefault(); tryTLI(); }
});
document.addEventListener("keyup", (e) => { if (e.code === "Space") setBrake(false); });

function setBrake(v) {
  if (!flight || flight.phase !== "capture") v = false;
  if (flight) flight.braking = v;
  $("brakeBtn") && $("brakeBtn").classList.toggle("firing", v);
  v ? sfx.burnStart() : sfx.burnStop();
}
// Scale the canvas to fill the screen (sharp on Retina displays)
function fitCanvas() {
  const st = $("fstage"), cv = $("sky"); if (!st || !cv || !flight) return;
  const s = Math.min((st.clientWidth - 12) / W, (st.clientHeight - 8) / H);
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr);
  cv.style.width = Math.round(W * s) + "px"; cv.style.height = Math.round(H * s) + "px";
  flight.scale = s * dpr;
}
window.addEventListener("resize", fitCanvas);
document.addEventListener("fullscreenchange", () => setTimeout(fitCanvas, 50));
function showLives() {
  if (!$("lives")) return;
  $("lives").innerHTML = attemptsHTML(flight.lives, 5);
}
// Lose a life (missed TLI). Retry just that part, or mission over at 0.
function loseLife(kind) {
  const f = flight; f.lives--; showLives(); sfx.fail(); f.paused = true;
  const left = f.lives;
  $("modalBox").innerHTML = `<div class="ico">💔</div><h2>Missed the Moon!</h2>
    <p class="sub">${f.cutoff === "under" ? `We cut the engine too early (${f.tliCut.toFixed(2)} km/s). Going to the Moon is like rolling a ball up a giant hill: too slow, and it rolls back before the top.`
      : f.cutoff === "over" ? `We cut the engine too late (${f.tliCut.toFixed(2)} km/s). That is faster than escape speed: we climbed right out of Earth's gravity well and flew off into space, never to come back!`
      : "We burned at the wrong moment. When we got there, the Moon had moved on."} Cut off in the <b style="color:var(--good)">green zone</b> (10 to 11 km/s): the computer locks it at 10.8 km/s. <b>${left} attempt${left === 1 ? "" : "s"} left.</b></p>
    <div class="choices">${left > 0 ? `<button class="btn go" onclick="retryTLI()">🔁 Retry the TLI burn</button>` : `<p class="sub">No attempts left…</p>`}
    ${left > 0 ? "" : `<button class="btn ghost" onclick="tliGameOver()">📋 See report</button>`}</div>`;
  $("modal").classList.remove("hidden");
}
function retryTLI() {
  const f = flight; $("modal").classList.add("hidden"); sfx.click();
  Object.assign(f, { paused: false, tliEnded: false, missTold: false, missModal: false, hit: false, parkShown: false });
  setPhase("parking"); title("🌍 Parking orbit: try the TLI again");
  say("thrust", "Back in parking orbit. Watch the ghost Moon this time! 👻", 5000);
}
function tliGameOver() { $("modal").classList.add("hidden"); flight.fails = "tli_miss"; setPhase("done"); finishFlight(false); }

function setPhase(p) { flight.phase = p; flight.pt = 0; }
function label(text, frames = 120) { flight.label = text; flight.labelT = frames; }
function title(t) { $("flightTitle") && ($("flightTitle").textContent = t); }

// ===== main loop =====
function tick(now) {
  if (!flight || !$("sky")) return;
  const f = flight, ctx = $("sky").getContext("2d");
  const dt = Math.min(0.05, (now - f.last) / 1000); f.last = now; f.pt += dt;
  const stg = $("fstage"); if (stg && f.stageSize !== stg.clientWidth + "x" + stg.clientHeight) { f.stageSize = stg.clientWidth + "x" + stg.clientHeight; fitCanvas(); }   // buttons changed height → refit
  ctx.setTransform(f.scale, 0, 0, f.scale, 0, 0);
  ctx.save();
  if (f.shakeT > 0) { f.shakeT -= dt; ctx.translate((Math.random() - .5) * 8, (Math.random() - .5) * 8); }
  drawSpace(ctx);
  ({ poll: phPad, launch: phLaunch, parking: phParking, transfer: phTransfer, capture: phCapture,
     surface: phSurface, rdv: phRendezvous, xfer: phXfer, tec: phTEC, ret: phReturn, splash: phSplash, done: () => {} })[f.phase](ctx, dt);
  ctx.restore();
  if (f.labelT > 0) {
    f.labelT--; ctx.font = "bold 28px system-ui"; ctx.textAlign = "center";
    ctx.fillStyle = "#000a"; ctx.fillText(f.label, W / 2 + 2, 52); ctx.fillStyle = "#fff"; ctx.fillText(f.label, W / 2, 50);
  }
  if (f.phase !== "done") requestAnimationFrame(tick);
}
function drawSpace(ctx, k = 1) {
  ctx.fillStyle = "#03050d"; ctx.fillRect(-10, -10, W + 20, H + 20);
  flight.stars.forEach(([x, y, b]) => { ctx.fillStyle = `rgba(255,255,255,${(0.3 + b * 0.7) * k})`; ctx.fillRect(x, y, 1.6, 1.6); });
}

// ===== PHASE 1: GO / NO-GO poll + countdown (with voices!) =====
const POLL = [["Booster", "Booster"], ["RETRO", "Retro"], ["FIDO", "Fido"], ["GUIDO", "Guidance"], ["EECOM", "E com"], ["Surgeon", "Surgeon"], ["CAPCOM", "Cap com"]];
async function runPoll() {
  const f = flight, box = $("poll");
  const alive = () => flight === f && !f.skip && $("poll");
  box.innerHTML = `<div class="poll-title">🎧 Flight Director: GO / NO-GO for launch?</div>`;
  await sfx.say("All controllers, go, no go for launch.", { pitch: 0.8 });
  for (const [who, spoken] of POLL) {
    if (!alive()) return;
    box.innerHTML += `<div class="poll-row"><span>${who}?</span><b class="go-tag">GO!</b></div>`;
    sfx.pip();
    await sfx.say(spoken + "?", { pitch: 0.8, rate: 1.2 });
    if (!alive()) return;
    await sfx.say("Go!", { pitch: 1.3, rate: 1.2 });
  }
  if (!alive()) return;
  box.innerHTML += `<div class="poll-title" style="color:var(--good)">✅ We are GO for launch!</div>`;
  await sfx.say("We are go for launch.", { pitch: 0.8 });
  if (!alive()) return;
  box.innerHTML = "";
  for (let n = 5; n >= 1; n--) {
    if (!alive()) return;
    box.innerHTML = `<div class="count">${n}</div>`;
    sfx.beep(); sfx.say(n === 3 ? "Ignition sequence start" : String(n), { rate: 1.3, interrupt: true });
    if (n === 3) f.ignite = true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!alive()) return;
  liftoff();
}
function skipPoll() { if (!flight || flight.phase !== "poll") return; flight.skip = true; if ("speechSynthesis" in window) speechSynthesis.cancel(); liftoff(); }
function liftoff() {
  const f = flight;
  $("poll").innerHTML = ""; $("skipBtn") && $("skipBtn").classList.add("hidden");
  setPhase("launch"); sfx.roarStart(0.6); sfx.say("Liftoff! We have liftoff!", { pitch: 1.1, rate: 1.1, interrupt: true });
  title(`🔥 LIFTOFF! ${f.r.name}`); label("🚀 LIFTOFF!");
}
// rocket waiting on the pad (smoke starts at "ignition")
function phPad(ctx, dt) {
  drawSky(ctx, 0); drawGround(ctx, 0);
  if (flight.ignite) { addSmoke(450, PAD_Y + 10, 2); flight.shakeT = 0.05; }
  drawSmoke(ctx, dt, 0);
  drawStack(ctx, 450, PAD_Y, flight.stack, flight.boosters, { les: state.les, showFuel: true });
}

// ===== PHASE 2: staged launch =====
function drawSky(ctx, k) {            // k = 0 (ground, blue) → 1 (space, black)
  const c = (a, b) => Math.round(a + (b - a) * k);
  ctx.fillStyle = `rgb(${c(80, 3)},${c(140, 5)},${c(220, 13)})`; ctx.fillRect(-10, -10, W + 20, H + 20);
  flight.stars.forEach(([x, y, b]) => { ctx.fillStyle = `rgba(255,255,255,${(0.3 + b * 0.7) * k})`; ctx.fillRect(x, y, 1.6, 1.6); });
}
function drawGround(ctx, cam) {
  const y = PAD_Y + 10 + cam; if (y > H + 50) return;
  ctx.fillStyle = "#2a3d22"; ctx.fillRect(0, y, W, 400);
  const wrecked = flight && flight.padWrecked && flight.lt > 0.8;
  if (wrecked) {                                    // smashed pad: crater + leaning tower
    ctx.fillStyle = "#3a2a1a"; ctx.beginPath(); ctx.ellipse(450, y + 4, 80, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#555"; ctx.fillRect(388, y - 6, 26, 8); ctx.fillRect(486, y - 4, 30, 6);
    ctx.save(); ctx.translate(535, y); ctx.rotate(0.12); ctx.fillStyle = "#884"; ctx.fillRect(-5, -322, 10, 322); ctx.restore();
  } else {
    ctx.fillStyle = "#555"; ctx.fillRect(400, y - 10, 100, 12);
    ctx.fillStyle = "#884"; ctx.fillRect(530, y - 330, 10, 322);
  }
}
// Liftoff effects: water deluge (steam + spray) or, without water, the pad gets wrecked
function padEffects(ctx, dt, cam) {
  const f = flight; f.bits = f.bits || [];
  const gy = PAD_Y + 10 + cam;
  if (f.lt < 3.5) {
    if (state.water) {
      for (let i = 0; i < 7; i++) f.bits.push({ x: 450 + (Math.random() - .5) * 120, h: 4, vx: (Math.random() - .5) * 520, vh: 120 + Math.random() * 260, s: 2 + Math.random() * 2.5, c: "#8fd0ff", g: 500 });
      for (let i = 0; i < 4; i++) f.smoke.push({ x: 450 + (Math.random() - .5) * 60, y: gy - 6, vx: (Math.random() - .5) * 520, vy: -Math.random() * 90, r: 10 + Math.random() * 14, a: .7 });
      if (!f.waterTold) { f.waterTold = true; label("💧 Water deluge: over 1 million liters!", 120); }
    } else if (f.lt < 2.4) {
      f.padWrecked = true;
      for (let i = 0; i < 4; i++) f.bits.push({ x: 450 + (Math.random() - .5) * 90, h: 2, vx: (Math.random() - .5) * 700, vh: 150 + Math.random() * 420, s: 3 + Math.random() * 5, c: Math.random() < .5 ? "#776655" : "#999", g: 600, rot: Math.random() * 6 });
      for (let i = 0; i < 2; i++) f.smoke.push({ x: 450 + (Math.random() - .5) * 60, y: gy - 6, vx: (Math.random() - .5) * 300, vy: -Math.random() * 60, r: 6 + Math.random() * 8, a: .5, dark: true });
      if (!f.padTold) { f.padTold = true; label("💥 No water! The pad is being torn apart!", 140); sfx.boom(); }
    }
  }
  f.bits.forEach((b) => { b.x += b.vx * dt; b.vh -= b.g * dt; b.h += b.vh * dt; });
  f.bits = f.bits.filter((b) => b.h > 0 && b.x > -20 && b.x < W + 20);
  f.bits.forEach((b) => { ctx.fillStyle = b.c; ctx.fillRect(b.x, gy - b.h, b.s, b.s); });
  if (f.padWrecked && f.lt < 3) { ctx.fillStyle = `rgba(255,${120 + Math.random() * 80},40,.6)`; ctx.beginPath(); ctx.arc(450, gy, 40 + Math.random() * 20, Math.PI, 0); ctx.fill(); }
}
function addSmoke(x, y, n = 3) {
  for (let i = 0; i < n; i++) flight.smoke.push({ x: x + (Math.random() - .5) * 30, y, vx: (Math.random() - .5) * 320, vy: -Math.random() * 40, r: 4 + Math.random() * 8, a: .45 });
}
function drawSmoke(ctx, dt, camShift) {
  flight.smoke.forEach((s) => { s.x += s.vx * dt; s.y += s.vy * dt + camShift; s.r += 22 * dt; s.a -= .3 * dt; });
  flight.smoke = flight.smoke.filter((s) => s.a > 0);
  flight.smoke.forEach((s) => { ctx.fillStyle = s.dark ? `rgba(90,80,70,${s.a})` : `rgba(225,228,235,${s.a})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
}
function flame(ctx, x, y, size) {
  const fl = size * (1 + Math.random() * 0.5);
  ctx.fillStyle = "#ffb547"; ctx.beginPath(); ctx.moveTo(x - size / 3, y); ctx.lineTo(x + size / 3, y); ctx.lineTo(x, y + fl); ctx.fill();
  ctx.fillStyle = "#fff8"; ctx.beginPath(); ctx.moveTo(x - size / 6, y); ctx.lineTo(x + size / 6, y); ctx.lineTo(x, y + fl * .6); ctx.fill();
}
function stackHeight(st) { return st.reduce((s, p) => s + p.h, 0); }
function separate(part, x, wy, name, spoken) {
  const f = flight;
  f.debris.push({ part, x, wy, vy: f.v * 0.5, rot: 0, vr: (Math.random() - .5) * 1.5 });
  sfx.sep(); f.shakeT = 0.25; f.sepCount++;
  label(`💥 ${name} separation!`, 90);
  if (spoken) sfx.say(`${spoken} separation`, { rate: 1.2 });
}
// ----- launch controls: STAGE (jettison empty stage) and PITCH OVER (gravity turn) -----
function launchButtons() {
  const f = flight, c = $("tliCtrl"); if (!c || f.phase !== "launch") return;
  const B = [];
  if (f.waitSep) B.push(`<button class="btn" style="background:var(--bad);box-shadow:0 6px 0 #b03040;font-size:20px" onclick="doStage()">💥 STAGE! Jettison the empty ${f.waitSep.kind === "booster" ? "boosters" : f.stack[0].name} (SPACE)</button>`);
  if (f.pitchStart === undefined && f.burnT > 0.8 && !f.subOrbital) B.push(`<button class="btn go" style="font-size:20px" onclick="doPitch()">↗ Pitch over: start the gravity turn</button>`);
  const html = B.join("");
  if (c.dataset.html !== html) { c.dataset.html = html; c.innerHTML = html; c.classList.toggle("hidden", !html); }
}
function doStage() {
  const f = flight; if (!f || !f.waitSep) return;
  if (f.stagePts === undefined) f.stagePts = f.waitSep.t < 2.5;      // first staging: points if quick
  if (f.waitSep.kind === "booster") {
    const off = f.stack[0].w / 2 + f.boosters.w / 2 + 1;
    separate({ kind: "booster", ...f.boosters }, 450 - off - 6, f.wy, f.boosters.name, f.boosters.spoken);
    f.debris.push({ part: { kind: "booster", ...f.boosters }, x: 450 + off + 6, wy: f.wy, vy: f.v * 0.5, rot: 0, vr: 0.8 });
    f.boosters = null;
  } else { const s = f.stack[0]; separate(f.stack.shift(), 450, f.wy, s.name, s.spoken); f.st = 0; f.lesTimer = 1.2; }
  f.waitSep = null; sfx.roarStart(0.4); launchButtons();
}
function doPitch() {
  const f = flight; if (!f || f.pitchStart !== undefined) return;
  f.pitchStart = f.burnT; sfx.whoosh(); launchButtons();
  label("↗ Gravity turn: tilting over to go SIDEWAYS", 120);
  say("thrust", "To reach orbit we must go sideways, really fast: 7.8 km/s! So we slowly tilt over as we climb. ↗", 7000);
}
document.addEventListener("keydown", (e) => { if (e.code === "Space" && flight && flight.phase === "launch") { e.preventDefault(); if (flight.waitSep) doStage(); else if (flight.pitchStart === undefined && flight.burnT > 0.8) doPitch(); } });

// simple 2D ascent physics (game units) for the trajectory picture: thrust along the pitch, gravity down,
// and gravity "fades" as sideways speed approaches orbital speed (that's what an orbit is!)
const ASC = { A: 1.0, g: 0.55, vOrb: 6.2 };
function ascentStep(f, dt, burning) {
  const tr = f.traj; const p = (f.pitch || 0) * Math.PI / 180;
  if (burning) { tr.u += ASC.A * Math.sin(p) * dt; tr.w += ASC.A * Math.cos(p) * dt; }
  tr.w -= ASC.g * (1 - Math.min(1, (tr.u / ASC.vOrb) ** 2)) * dt;
  tr.x += tr.u * dt; tr.h = Math.max(-0.01, tr.h + tr.w * dt);
  if (tr.pts.length === 0 || Math.hypot(tr.x - tr.pts[tr.pts.length - 1][0], tr.h - tr.pts[tr.pts.length - 1][1]) > 0.08) tr.pts.push([tr.x, tr.h]);
}
function trajInset(ctx, f) {
  const x0 = 16, y0 = H - 150, w = 250, h = 136, tr = f.traj;
  ctx.fillStyle = "#0b1020ee"; roundRect(ctx, x0, y0, w, h, 12); ctx.fill();
  ctx.fillStyle = "#2f7de1"; ctx.beginPath(); ctx.ellipse(x0 + w / 2, y0 + h + 300, 420, 312, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  const gy = y0 + h - 14, X = (x) => x0 + 18 + x * 3.6, Y = (hh) => gy - hh * 7.5;
  ctx.strokeStyle = "#3ecf8e88"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x0 + 10, Y(12)); ctx.lineTo(x0 + w - 10, Y(12)); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = "11px system-ui"; ctx.fillStyle = "#3ecf8e"; ctx.textAlign = "right"; ctx.fillText("orbit height", x0 + w - 12, Y(12) - 4);
  ctx.strokeStyle = "#ffd27a"; ctx.lineWidth = 2; ctx.beginPath();
  tr.pts.forEach(([x, hh], i) => { const px = Math.min(x0 + w - 8, X(x)), py = Math.max(y0 + 22, Y(hh)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); ctx.lineWidth = 1;
  ctx.font = "bold 12px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.fillText("🛰️ Your path (side view)", x0 + 10, y0 + 16);
  ctx.font = "11px system-ui"; ctx.fillStyle = "#9aa5cc"; ctx.fillText(`sideways speed ${(tr.u / ASC.vOrb * 7.8).toFixed(1)} of 7.8 km/s`, x0 + 10, y0 + 32);
}
function relaunch() {
  const f = flight, { parts, boosters } = stackParts(state.rocket);
  parts.forEach((p) => (p.fill = 1)); if (boosters) boosters.fill = 1;
  Object.assign(f, { stack: parts, boosters, debris: [], sepCount: 0, wy: 0, v: 0, lt: 0, st: 0, burnT: 0, pitch: 0, pitchStart: undefined,
    waitSep: null, lesGone: false, lesTimer: undefined, subOrbital: false, fallModal: false, traj: { u: 0, w: 0, x: 0, h: 0, pts: [] }, smoke: [], bits: [] });
  $("modal").classList.add("hidden"); liftoff();
}
function phLaunch(ctx, dt) {
  const f = flight, power = f.r.tli / f.m.total;
  f.lt += dt; f.traj = f.traj || { u: 0, w: 0, x: 0, h: 0, pts: [] }; f.burnT = f.burnT || 0; f.pitch = f.pitch || 0;
  const S = STACKS[state.rocket];
  const total = (S.stages.reduce((a, s) => a + s.burn, 0));
  const burning = !f.tooHeavy && !f.exploded && !f.waitSep && !f.subOrbital;
  if (burning) f.burnT += dt;
  if (f.pitchStart !== undefined) f.pitch = Math.min(82, (f.burnT - f.pitchStart) / (total * 0.5) * 82);

  // ---- motion (main view) ----
  if (f.escape) f.escape.vy -= 40 * dt, f.escape.wy += f.escape.vy * dt;
  if (f.tooHeavy) f.v += (f.lt < 1.6 ? 22 * power : -70) * dt;
  else if (f.subOrbital) f.v -= 45 * dt;                                 // coasting up… then falling back
  else if (f.waitSep) f.v = Math.max(f.v * 0.995 - 12 * dt, 30);          // engines out: losing speed
  else if (!f.exploded) f.v += (25 + 22 * Math.min(power, 2.5)) * dt;
  f.wy = Math.max(0, f.wy + f.v * dt);
  if (!f.tooHeavy && !f.exploded) ascentStep(f, dt, burning);
  const focus = f.escape ? f.escape.wy : f.wy;
  const cam = Math.max(0, focus - 140);
  const k = Math.min(1, f.wy / 1600);

  // too heavy: falls back and explodes
  if (f.tooHeavy && f.lt > 1.6) title("😰 Too heavy! Not enough power…");
  if (f.tooHeavy && f.wy <= 0 && f.lt > 1.6 && !f.exploded) {
    f.exploded = true; sfx.roarStop(); sfx.boom(); f.shakeT = 0.8; f.fire = { wy: 40, r: 10 };
    f.fails = "heavy"; label("💥 The rocket couldn't lift us!"); setTimeout(() => { setPhase("done"); finishFlight(false); }, 1800);
  }

  // ---- staging: the PLAYER must jettison each empty stage ----
  if (!f.tooHeavy && !f.exploded && !f.subOrbital) {
    if (f.waitSep) {
      f.waitSep.t += dt;
      if (f.waitSep.t > 2.5 && !f.waitSep.told) { f.waitSep.told = true; say("crater", "The engines stopped: that stage is EMPTY. It's dead weight! Hit STAGE to drop it! 💥", 6000); }
    } else {
      if (f.boosters) {
        f.boosters.fill = Math.max(0, 1 - f.burnT / f.boosters.burn);
        if (f.burnT >= f.boosters.burn) { f.waitSep = { kind: "booster", t: 0 }; sfx.roarStop(); sfx.alarm(); label("⚠️ Boosters empty! STAGE!", 120); }
      }
      if (!f.waitSep) {
        f.st += dt;
        const s = f.stack[0], last = f.stack[1].kind !== "stage";
        if (!last) {
          s.fill = Math.max(0, 1 - f.st / s.burn);
          if (f.st >= s.burn) { f.waitSep = { kind: "stage", t: 0 }; sfx.roarStop(); sfx.alarm(); label(`⚠️ ${s.name} is empty! STAGE!`, 120); }
        } else {
          s.fill = Math.max(0.45, 1 - 0.55 * f.st / s.burn);
          if (f.st >= s.burn) {                                       // engine cutoff: did we go sideways enough?
            sfx.roarStop();
            if (f.traj.u >= ASC.vOrb * 0.7) {
              sfx.chime(); sfx.say("Engine cutoff. We are in orbit.", { pitch: 0.9 });
              f.orbitStage = s; setPhase("parking"); f.ang = -Math.PI / 2; $("tliCtrl").classList.add("hidden"); $("tliCtrl").dataset.html = "";
              label("💤 Engine cutoff. We're in orbit!", 110);
              title("🌍 Parking orbit: 185 km up, 7.8 km/s"); return;
            }
            f.subOrbital = true; f.v = Math.min(f.v, 160);
            label("😟 Engine cutoff… but we went straight UP!", 160);
            say("thrust", "Uh-oh. We have height but almost no sideways speed. Without it, gravity pulls us straight back down! ⬇️", 8000);
          }
        }
      }
    }
    if (state.les && !f.lesGone && f.lesTimer !== undefined) {
      f.lesTimer -= dt;
      if (f.lesTimer <= 0) { f.lesGone = true; f.debris.push({ part: { kind: "les" }, x: 450, wy: f.wy + stackHeight(f.stack) + 10, vy: f.v + 80, rot: 0, vr: 2 }); label("🗼 Escape tower jettisoned", 90); sfx.whoosh(); }
    }
    sfx.roarVol(Math.max(0.03, 0.6 * (1 - k)));
    if (k > 0.55 && !f.quietTold) { f.quietTold = true; say("rocket", "Hear that? The roar fades. In space there's no air to carry sound! 🔇", 5000); }
    if (f.burnT > 3.2 && f.pitchStart === undefined && !f.pitchNag) { f.pitchNag = true; say("crater", "We're going straight up… Shouldn't we start tilting over? ↗", 6000); }
  }
  // straight-up flight falls back to Earth
  if (f.subOrbital && f.traj.h <= 0 && !f.fallModal) {
    f.fallModal = true; sfx.fail(); f.lives--; showLives();
    const left = f.lives;
    $("modalBox").innerHTML = `<div class="ico">⬆️⬇️</div><h2>Straight up isn't orbit!</h2>
      <p class="sub" style="text-align:left">Throw a ball straight up and it comes straight back down. A rocket is the same! To <b>stay up</b> you must go <b>sideways</b> so fast (7.8 km/s) that you keep falling <i>around</i> Earth instead of back onto it. That's why every rocket tilts over soon after leaving the tower: the <b>gravity turn</b>.</p>
      <p class="sub" style="text-align:left">In real life, the capsule would separate and parachute down safely.</p>
      <p class="sub">💔 <b>${left} attempt${left === 1 ? "" : "s"} left.</b></p>
      <div class="choices"><button class="btn ghost" onclick="openOrbitExplainer()">❓ How does an orbit work?</button>${left > 0 ? `<button class="btn go" onclick="relaunch()">🔁 Launch again (remember to pitch over!)</button>` : `<button class="btn ghost" onclick="closeModal();flight.fails='suborbital';setPhase('done');finishFlight(false)">📋 See report</button>`}</div>`;
    $("modal").classList.remove("hidden");
  }
  launchButtons();

  // ---- draw ----
  drawSky(ctx, k); drawGround(ctx, cam);
  if (f.lt < 3) { addSmoke(450, PAD_Y + 10 + cam, 2); }
  drawSmoke(ctx, dt, 0);
  padEffects(ctx, dt, cam);
  const yb = PAD_Y - f.wy + cam;
  if (!f.exploded) {
    ctx.save(); ctx.translate(450, yb); ctx.rotate((f.pitch || 0) * Math.PI / 180 * 0.9);
    if (burning || (f.tooHeavy && f.lt < 1.6)) {
      flame(ctx, 0, 6, f.stack[0].w * 0.9);
      if (f.boosters) { const off = f.stack[0].w / 2 + f.boosters.w / 2 + 1; flame(ctx, -off, 8, 20); flame(ctx, off, 8, 20); }
    }
    drawStack(ctx, 0, 0, f.stack, f.boosters, { les: state.les && !f.lesGone, showFuel: true });
    ctx.restore();
  }
  if (f.fire) { f.fire.r += 60 * dt; ctx.fillStyle = `rgba(255,${120 + Math.random() * 80},40,${Math.max(0, 0.9 - f.fire.r / 200)})`; ctx.beginPath(); ctx.arc(450, PAD_Y - f.fire.wy + cam, f.fire.r, 0, 7); ctx.fill(); }
  f.debris.forEach((d) => {
    d.vy -= 90 * dt; d.wy += d.vy * dt; d.rot += d.vr * dt;
    const p = d.part, dy = PAD_Y - d.wy + cam;
    ctx.save(); ctx.translate(d.x, dy - (p.h || 30) / 2); ctx.rotate(d.rot);
    if (p.kind === "stage") drawStage(ctx, p, 0, p.h / 2, false);
    else if (p.kind === "booster") drawBooster(ctx, p, 0, p.h / 2);
    else drawLES(ctx, 0, 15);
    ctx.restore();
  });
  // readouts
  if (!f.tooHeavy && !f.exploded) {
    engineBadge(ctx, burning, f.waitSep ? "Stage EMPTY: jettison it!" : f.subOrbital ? "Coasting… falling back" : "");
    const vel = Math.hypot(f.traj.u, f.traj.w) / ASC.vOrb * 7.8;
    speedPanel(ctx, Math.min(7.8, vel), dt);
    trajInset(ctx, f);
    ctx.font = "15px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.fillStyle = k > 0.4 ? "#fff" : "#012";
    ctx.fillText(`ALT ${Math.max(0, f.traj.h / 12 * 185).toFixed(0).padStart(3)} km   TILT ${Math.round(f.pitch || 0)}°`, 16, 26);
  }
}

// ===== PHASE 3+4: Earth–Moon system: parking orbit → aimed TLI → coast to the Moon =====
// Real orbit physics (Kepler): the Moon moves on an ELLIPSE around Earth.
// The spacecraft's TLI burn puts it on a half-ellipse that reaches the Moon's distance
// on the OPPOSITE side of Earth. You must burn so the Moon is THERE when you arrive.
const EARTH = { x: 450, y: 212, R: 26 };
const PARK_R = 42;                                  // parking orbit radius (game px)
const MOON_A = 182, MOON_E = 0.35;                  // Moon's orbit: an ELLIPSE (stretched so you can see it; real e = 0.055)
const GME = 5.55e5;                                  // Earth's gravity (game units)
const TS = 0.6;                                      // slow-motion factor so players can react
const AIM_TOL = 0.38;                                // how close (radians) counts as a hit

function solveKepler(M, e) {                         // mean anomaly → true anomaly + radius factor
  let E = M;
  for (let i = 0; i < 10; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  return { nu, rf: 1 - e * Math.cos(E) };
}
const MOON_PERIOD = 2 * Math.PI * Math.sqrt(MOON_A ** 3 / GME) / TS / 2;      // twice as fast (still slow enough to aim)
function moonAt(t) {                                 // Moon angle + distance at game time t
  const k = solveKepler((2 * Math.PI * t) / MOON_PERIOD, MOON_E);
  return { ang: k.nu, r: MOON_A * k.rf };
}
const moonR = (ang) => (MOON_A * (1 - MOON_E ** 2)) / (1 + MOON_E * Math.cos(ang));
const PARK_W = Math.sqrt(GME / PARK_R ** 3) * TS;    // parking orbit angular speed
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const toXY = (ang, r) => [EARTH.x + Math.cos(ang) * r, EARTH.y + Math.sin(ang) * r];

// The transfer ellipse if we burn at angle th
function transferFor(th) {
  const ra = moonR(th + Math.PI), a = (PARK_R + ra) / 2, e = (ra - PARK_R) / (ra + PARK_R);
  const T = Math.PI * Math.sqrt(a ** 3 / GME) / TS;  // half an orbit = time to reach the Moon's distance
  return { th, ra, a, e, T };
}
function transferPoint(tr, tau) {                    // where the ship is tau seconds after the burn
  const k = solveKepler((Math.PI * tau) / tr.T, tr.e);
  const [x, y] = toXY(tr.th + k.nu, tr.a * k.rf);
  if (!tr.fix) return [x, y];
  const q = Math.min(1, Math.max(0, tau / tr.T)) ** 2;  // small mid-course corrections: we arrive exactly at the Moon
  return [x + tr.fix[0] * q, y + tr.fix[1] * q];
}

// how far the Moon will be when we arrive: near (perigee) = least fuel
function moonZone(r) { const near = moonR(0), far = moonR(Math.PI), fr = Math.max(0, Math.min(1, (r - near) / (far - near))), km = Math.round((363300 + fr * (405500 - 363300)) / 100) * 100;
  return fr < 0.34 ? { id: "near", name: "NEAR", pts: 1000, col: "#3ecf8e", km: km.toLocaleString() } : fr < 0.67 ? { id: "mid", name: "in between", pts: 750, col: "#ffd27a", km: km.toLocaleString() } : { id: "far", name: "FAR", pts: 500, col: "#ff8a3d", km: km.toLocaleString() }; }
function aimCheck(f) {                               // if we burned NOW, would we meet the Moon?
  const tr = transferFor(f.ang), ghost = moonAt(f.mt + tr.T);
  return { tr, ghost, diff: wrap(ghost.ang - (f.ang + Math.PI)) };
}

function drawSystem(ctx, f) {
  drawSpace(ctx);
  // Moon's elliptical orbit + labels
  ctx.strokeStyle = "#9fc3ffaa"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.beginPath();
  for (let a = 0; a <= 2 * Math.PI + 0.05; a += 0.05) { const [x, y] = toXY(a, moonR(a)); a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
  ctx.font = "12px system-ui"; ctx.fillStyle = "#8f9ac4"; ctx.textAlign = "center";
  let [px, py] = toXY(0, moonR(0)); ctx.fillText("closest: 363,000 km", px - 10, py + 26);
  [px, py] = toXY(Math.PI, moonR(Math.PI)); ctx.fillText("farthest: 405,000 km", px + 10, py + 26);
  ctx.fillText("The Moon's orbit is an ellipse (stretched here so you can see it)", EARTH.x, EARTH.y - moonR(-Math.PI / 2) - 10);
  // Earth + parking orbit
  ctx.fillStyle = "#7fb6ff33"; ctx.beginPath(); ctx.arc(EARTH.x, EARTH.y, EARTH.R + 5, 0, 7); ctx.fill();
  ctx.fillStyle = "#2f7de1"; ctx.beginPath(); ctx.arc(EARTH.x, EARTH.y, EARTH.R, 0, 7); ctx.fill();
  ctx.fillStyle = "#3ecf8e"; ctx.beginPath(); ctx.arc(EARTH.x - 8, EARTH.y - 6, 9, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(EARTH.x + 9, EARTH.y + 9, 6, 0, 7); ctx.fill();
  ctx.strokeStyle = "#ffffff40"; ctx.beginPath(); ctx.arc(EARTH.x, EARTH.y, PARK_R, 0, 7); ctx.stroke();
  // the Moon
  const m = moonAt(f.mt), [mx, my] = toXY(m.ang, m.r);
  ctx.fillStyle = "#cfd3dc"; ctx.beginPath(); ctx.arc(mx, my, 12, 0, 7); ctx.fill();
  ctx.fillStyle = "#a9aebb"; ctx.beginPath(); ctx.arc(mx - 3, my - 2, 3, 0, 7); ctx.fill();
  return [mx, my];
}
function drawShipAt(ctx, x, y, ang, burning, big) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (big) ctx.scale(1.6, 1.6);
  if (burning) { const L = 26 + Math.random() * 14; ctx.fillStyle = "#ffb547"; ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(-7, 5); ctx.lineTo(-7 - L, 0); ctx.fill();
    ctx.fillStyle = "#fff8"; ctx.beginPath(); ctx.moveTo(-7, -2.5); ctx.lineTo(-7, 2.5); ctx.lineTo(-7 - L * .55, 0); ctx.fill(); }
  ctx.fillStyle = "#fff"; ctx.fillRect(-7, -3, 11, 6); ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(9, 0); ctx.lineTo(4, 3); ctx.fill();
  ctx.restore();
}
function engineBadge(ctx, on, extra) {
  const x = W - 214, y = 14;
  ctx.fillStyle = on ? "#ff8a3d" : "#2a3358"; roundRect(ctx, x, y, 196, 44, 12); ctx.fill();
  ctx.font = "bold 20px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = on ? "#fff" : "#9aa5cc";
  ctx.fillText(on ? "🔥 ENGINE ON" : "💤 ENGINE OFF", x + 98, y + 29);
  if (extra) { ctx.font = "13px system-ui"; ctx.fillStyle = "#9aa5cc"; ctx.fillText(extra, x + 98, y + 125); }
}
// Right-side speed panel: shows if we're speeding up, slowing down, or steady
function speedPanel(ctx, v, dt) {
  const f = flight, x = W - 214, y = 64;
  const rate = f.vLast === undefined || dt === 0 ? 0 : (v - f.vLast) / dt; f.vLast = v;
  f.vRate = (f.vRate || 0) * 0.85 + rate * 0.15;
  const tr = f.vRate > 0.03 ? ["▲ speeding up", "#3ecf8e"] : f.vRate < -0.03 ? ["▼ slowing down", "#ff8a3d"] : ["● steady", "#9aa5cc"];
  ctx.fillStyle = "#151c33ee"; roundRect(ctx, x, y, 196, 46, 12); ctx.fill();
  ctx.font = "bold 18px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#fff";
  ctx.fillText(`${v.toFixed(2)} km/s`, x + 98, y + 21);
  ctx.font = "13px system-ui"; ctx.fillStyle = tr[1]; ctx.fillText(tr[0], x + 98, y + 39);
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// --- parking orbit: coasting + 3 choices (TLI / slow down / speed up) ---
const PARK_SLOW = 0.42;                              // slow motion while aiming (easier to time)
function parkButtons(show) {
  const c = $("tliCtrl"); if (!c) return;
  if (show) {
    c.innerHTML = `<button class="btn go" id="tliBtn" onclick="tryTLI()">🔥 TLI burn: go to the Moon</button>
      <button class="btn" style="background:#5a6b9a;box-shadow:0 6px 0 #3a4670" onclick="parkSim('slow')">🐢 Slow down a bit (try it)</button>
      <button class="btn" style="background:#5a6b9a;box-shadow:0 6px 0 #3a4670" onclick="parkSim('fast')">🐇 Speed up a bit (try it)</button>`;
    c.classList.remove("hidden");
  } else c.classList.add("hidden");
}
function phParking(ctx, dt) {
  const f = flight, sdt = dt * PARK_SLOW;
  f.mt += sdt;
  drawSystem(ctx, f);
  let vNow = 7.8;
  if (f.sim) vNow = runParkSim(ctx, dt);
  else {
    f.ang += PARK_W * sdt;
    const aim = aimCheck(f), good = Math.abs(aim.diff) < AIM_TOL;
    if (f.pt > 2.5) {
      // "if you burn now" path
      ctx.strokeStyle = good ? "#3ecf8e" : "#ffb547"; ctx.lineWidth = good ? 3 : 2; ctx.setLineDash([6, 5]); ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const [x, y] = transferPoint(aim.tr, (aim.tr.T * i) / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
      const [ex, ey] = toXY(f.ang + Math.PI, aim.tr.ra);
      ctx.font = "16px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = good ? "#3ecf8e" : "#ffb547"; ctx.fillText("✖", ex, ey + 6);
      const [gx, gy] = toXY(aim.ghost.ang, aim.ghost.r);
      ctx.strokeStyle = "#ffffffaa"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(gx, gy, 12, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = "12px system-ui"; ctx.fillStyle = "#fff"; ctx.fillText("Moon will be here", gx, gy - 18);
      // 📏 how far the Moon travels while we fly there
      const mNow = moonAt(f.mt); let a0 = mNow.ang, a1 = aim.ghost.ang; while (a1 < a0) a1 += 2 * Math.PI;
      ctx.strokeStyle = "#7fd3ff"; ctx.lineWidth = 3; ctx.beginPath();
      for (let a = a0, i = 0; a <= a1 + 0.001; a += (a1 - a0) / 24, i++) { const [px, py] = toXY(a, moonR(a) + 22); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.lineWidth = 1;
      const [lx, ly] = toXY((a0 + a1) / 2, moonR((a0 + a1) / 2) - 44);
      ctx.font = "bold 12px system-ui"; ctx.fillStyle = "#7fd3ff"; ctx.textAlign = "center";
      ctx.fillText("Moon moves 13.2°/day", lx, ly); ctx.fillText("× 3 days ≈ 40° (in real life)", lx, ly + 15);
      // timing cue: "get ready" → "NOW!"
      const d = Math.abs(aim.diff), closing = f.lastDiff !== undefined && d < f.lastDiff; f.lastDiff = d;
      ctx.textAlign = "center";
      if (good) { ctx.font = "bold 44px system-ui"; ctx.fillStyle = "#3ecf8e"; ctx.fillText("NOW! 🔥", W / 2, 70); if (!f.nowSaid) { f.nowSaid = true; sfx.go(); } }
      else { f.nowSaid = false; if (closing && d < 1.0) { ctx.font = "bold 26px system-ui"; ctx.fillStyle = "#ffb547"; ctx.fillText("Get ready…", W / 2, 62); } }
      if (!f.parkShown) {
        f.parkShown = true; parkButtons(true);
        $("tip").innerHTML = "Burn when the path end <b>✖</b> meets the <b>ghost Moon</b> and you see <b style='color:var(--good)'>NOW!</b> Or try the other buttons to see what happens.";
        if (f.tliTries === 0) say("thrust", "Aim where the Moon WILL be, not where it is now! 🎯", 7000);
      }
    }
    const [x, y] = toXY(f.ang, PARK_R);
    drawShipAt(ctx, x, y, f.ang + Math.PI / 2, false);
    if (f.pt > 2.5) { const z = moonZone(aim.ghost.r), bx = 16, by = 40, blink = z.id === "near" && Math.sin(f.pt * 9) > 0;
      ctx.fillStyle = blink ? "#1f8a52" : "#151c33ee"; roundRect(ctx, bx, by, 196, 74, 12); ctx.fill(); ctx.strokeStyle = z.col; ctx.lineWidth = 2; roundRect(ctx, bx, by, 196, 74, 12); ctx.stroke(); ctx.lineWidth = 1;
      ctx.textAlign = "center"; ctx.font = "12px system-ui"; ctx.fillStyle = "#cfd8ee"; ctx.fillText("If you burn now, the Moon is…", bx + 98, by + 17);
      ctx.font = "bold 18px system-ui"; ctx.fillStyle = blink ? "#fff" : z.col; ctx.fillText(`🌙 ${z.name} · ${z.km} km`, bx + 98, by + 40);
      ctx.font = "12px system-ui"; ctx.fillStyle = "#fff"; ctx.fillText(z.id === "near" ? `least fuel! +${z.pts} points` : z.id === "far" ? `more fuel · +${z.pts} points` : `+${z.pts} points`, bx + 98, by + 60); }
  }
  engineBadge(ctx, !!(f.sim && f.sim.t < 0.6), f.sim ? "🧪 SIMULATION" : "Coasting: no fuel needed!");
  speedPanel(ctx, vNow, dt);
  ctx.font = "15px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
  ctx.fillText("PARKING ORBIT · 185 km · 7.8 km/s", 16, 26);
  if (f.pt > 1 && !f.toldPark && f.tliTries === 0) { f.toldPark = true; say("crater", "Engine OFF! At 7.8 km/s we keep falling AROUND Earth. 🌍", 5000); }
  ldParkingNote(f);
  if (f.pt > 1.5 && !f.sim) askBox("askOrbit", "Engine is OFF. Why don't we fall back to Earth?", openOrbitExplainer, "40%");
}
// "What if?" simulations: slow down → fall into the atmosphere; speed up → bigger, stretched orbit
function parkSim(type) {
  const f = flight; if (!f || f.phase !== "parking" || f.sim) return;
  parkButtons(false); sfx.burnStart(); setTimeout(() => sfx.burnStop(), 500);
  const w = PARK_W * PARK_SLOW, v = w * PARK_R * (type === "slow" ? 0.86 : 1.13);
  const [x, y] = [Math.cos(f.ang) * PARK_R, Math.sin(f.ang) * PARK_R];
  f.sim = { type, x, y, vx: -Math.sin(f.ang) * v, vy: Math.cos(f.ang) * v, v0: w * PARK_R, t: 0, trail: [], sweep: 0, a0: f.ang };
  label(type === "slow" ? "🐢 Small brake burn… (simulation)" : "🐇 Small speed-up burn… (simulation)", 100);
}
function runParkSim(ctx, dt) {
  const f = flight, s = f.sim, GMs = (PARK_W * PARK_SLOW) ** 2 * PARK_R ** 3;
  s.t += dt;
  for (let i = 0; i < 20; i++) {
    const h = dt / 20, r = Math.hypot(s.x, s.y), a = -GMs / r ** 3;
    s.vx += a * s.x * h; s.vy += a * s.y * h; s.x += s.vx * h; s.y += s.vy * h;
  }
  const r = Math.hypot(s.x, s.y), ang = Math.atan2(s.y, s.x);
  s.trail.push([EARTH.x + s.x, EARTH.y + s.y]);
  ctx.strokeStyle = s.type === "slow" ? "#ff8a3d" : "#5ab4ff"; ctx.lineWidth = 2; ctx.beginPath();
  s.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.lineWidth = 1;
  const v = Math.hypot(s.vx, s.vy) / s.v0 * 7.8;
  const sx = EARTH.x + s.x, sy = EARTH.y + s.y;
  if (s.type === "slow") {
    if (r < EARTH.R + 6 && r >= EARTH.R) { ctx.fillStyle = `rgba(255,${120 + Math.random() * 80},40,.8)`; ctx.beginPath(); ctx.arc(sx, sy, 7 + Math.random() * 3, 0, 7); ctx.fill(); }
    if (r < EARTH.R + 6 && !s.told) { s.told = true; label("🔥 Gravity pulls us down into the air!", 140);
      say("crater", "Slower than 7.8 km/s, and Earth's gravity wins. We fall back into the atmosphere! 🔥", 7000); }
    if (r < EARTH.R) { s.done = s.done || s.t; }
  } else {
    s.sweep += Math.abs(wrap(ang - (s.lastAng ?? ang))); s.lastAng = ang;
    if (s.sweep > Math.PI && !s.told) { s.told = true; label("🚀 Higher orbit! Faster = bigger, stretched orbit", 140);
      say("rocket", "A little faster makes the orbit stretch higher. But we need 10.9 km/s to reach the Moon! 🌙", 7000); }
    if (s.sweep > 2 * Math.PI) s.done = s.done || s.t;
  }
  if (!s.done || s.t - s.done < 0.3) drawShipAt(ctx, sx, sy, Math.atan2(s.vy, s.vx), s.t < 0.5);
  ctx.font = "bold 16px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#ffb547"; ctx.fillText("🧪 SIMULATION: what if…?", W / 2, H - 16);
  if ((s.done && s.t - s.done > 2) || s.t > 16) {     // back to the real orbit
    f.sim = null; parkButtons(true); label("↩️ Back to our real parking orbit", 90); f.lastDiff = undefined;
  }
  return v;
}
function tryTLI() {
  const f = flight; if (!f || f.phase !== "parking" || f.pt < 2.5 || f.sim) return;
  const aim = aimCheck(f);
  f.tr = aim.tr; f.tau = 0; f.burnT = 0; f.tliTries++; f.orbitStage.fill = 0.45;
  f.aimHit = Math.abs(aim.diff) < AIM_TOL * 1.6; f.hit = f.aimHit; f.cutoff = null; f.tliV = 7.8; f.tliEnded = false;
  f.perigee = aim.ghost.r < moonR(0) * 1.04;
  parkButtons(false);
  const c = $("tliCtrl"); c.dataset.html = "cut"; c.classList.remove("hidden");
  c.innerHTML = `<button class="btn" style="background:var(--bad);box-shadow:0 6px 0 #b03040;font-size:20px" onclick="cutTLI()">✋ CUT ENGINE in the green zone! (SPACE)</button>`;
  if (f.tliTries === 1) say("thrust", "Watch the speed bar! Cut the engine anywhere in the GREEN zone (10 to 11 km/s). The computer locks it at 10.8 km/s. 🎯", 7000); f.parkShown = false; $("tip").innerHTML = "";
  sfx.burnStart(); sfx.say("T L I burn. Ignition.", { rate: 1.2, interrupt: true });
  label("🔥 TLI BURN: speed up to about 10.8 km/s!", 140);
  setPhase("transfer"); title("🌍 → 🌙 Trans-Lunar Injection burn");
}

// Close-up of the TLI burn: the last stage firing with the spacecraft on top
function burnInset(ctx, f) {
  const x = 16, y = 44, w = 300, h = 120;
  ctx.fillStyle = "#0b1020ee"; roundRect(ctx, x, y, w, h, 14); ctx.fill(); ctx.strokeStyle = "#ff8a3d"; ctx.stroke();
  ctx.save(); ctx.translate(x + 120, y + 64); ctx.rotate(Math.PI / 2); ctx.scale(1.25, 1.25);
  const st = [f.orbitStage, ...f.stack.filter((p) => p.kind !== "stage")];
  flame(ctx, 0, 6, 34); flame(ctx, 0, 6, 26);
  drawStack(ctx, 0, 0, st, null, { showFuel: true });
  ctx.restore();
  ctx.font = "bold 13px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#ffb547";
  ctx.fillText(`🔥 ${f.orbitStage.name} burning`, x + 12, y + 20);
  ctx.font = "11px system-ui"; ctx.fillStyle = "#9aa5cc";
  ctx.fillText(state.rocket === "sat5" ? "Apollo 11: a 5 min 47 s burn" : "about 6 minutes of thrust", x + 12, y + h - 10);
}

// --- coasting to the Moon (or to empty space if we missed!) ---
const TLI_BURN = 2.6;
// player cuts the TLI engine: too early = can't reach the Moon, too late = shoots past it
function cutTLI() {
  const f = flight; if (!f || f.phase !== "transfer" || f.cutoff) return;
  const v = f.tliV, kind = v < 10.0 ? "under" : v > 11.0 ? "over" : "good"; if (kind === "good") f.tliV = 10.8;
  f.cutoff = kind; f.tliCut = v;
  const c = $("tliCtrl"); c.innerHTML = ""; c.dataset.html = ""; c.classList.add("hidden");
  if (kind !== "good") {
    f.hit = false;
    const ra = kind === "under" ? f.tr.ra * 0.62 : f.tr.ra * 4, a = (PARK_R + ra) / 2;
    f.tr = { ...f.tr, ra, a, e: (ra - PARK_R) / (ra + PARK_R), T: Math.PI * Math.sqrt(a ** 3 / GME) / TS };
  }
  sfx.say(kind === "good" ? "Cutoff. Good burn." : "Cutoff.", { rate: 1.1 });
  label(kind === "good" ? `✅ Cutoff at ${v.toFixed(2)} km/s → 🔒 locked at 10.8 km/s (Apollo 11)` : kind === "under" ? `⚠️ Cutoff at ${v.toFixed(2)} km/s: too slow!` : `⚠️ Cutoff at ${v.toFixed(2)} km/s: too fast!`, 150);
  if (kind === "good") { const g = moonAt(f.mt + (f.tr.T - f.tau)), z = moonZone(g.r);
    f.moonPts = z.pts; f.perigee = z.id === "near";
    const end = transferPoint({ ...f.tr, fix: null }, f.tr.T), [mx, my] = toXY(g.ang, g.r); f.tr = { ...f.tr, fix: [mx - end[0], my - end[1]] };
    setTimeout(() => flight && label(`🌙 Moon ${z.name} (${z.km} km): ${z.id === "near" ? "shortest trip, least fuel" : z.id === "far" ? "longest trip, most fuel" : "medium trip"}: +${z.pts} points`, 170), 1800); }
}
document.addEventListener("keydown", (e) => { if (e.code === "Space" && flight && flight.phase === "transfer" && !flight.cutoff) { e.preventDefault(); cutTLI(); } });
// speed meter during the TLI burn: orbit → Moon → escape
function escapeMeter(ctx, v) {
  const x0 = 300, y0 = H - 66, w = 360, h = 14, X = (s) => x0 + (s - 7.5) / (12 - 7.5) * w;
  ctx.fillStyle = "#0b1020ee"; roundRect(ctx, x0 - 14, y0 - 30, w + 28, 70, 12); ctx.fill();
  ctx.fillStyle = "#2a3358"; roundRect(ctx, x0, y0, w, h, 7); ctx.fill();
  ctx.fillStyle = "#3ecf8e88"; ctx.fillRect(X(10.0), y0, X(11.0) - X(10.0), h);
  ctx.fillStyle = "#ff8a3d"; roundRect(ctx, x0, y0, Math.max(8, X(v) - x0), h, 7); ctx.fill();
  ctx.font = "11px system-ui"; ctx.textAlign = "center";
  [[7.8, "orbit 7.8", "#9aa5cc", 0], [10.0, "10", "#3ecf8e", -6], [10.8, "🌙 10.8", "#3ecf8e", 0], [11.0, "11: escape →", "#ff5c6c", 38]].forEach(([s, t, col, dx]) => {
    ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(X(s), y0 - 4); ctx.lineTo(X(s), y0 + h + 4); ctx.stroke();
    ctx.fillStyle = col; ctx.fillText(t, X(s) + dx, y0 + h + 16);
  });
  ctx.font = "bold 13px system-ui"; ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(`🔥 ${v.toFixed(2)} km/s`, x0, y0 - 14);
  if (v > 9.6) { ctx.textAlign = "center"; ctx.fillStyle = "#ffd27a"; ctx.fillText("🐢 slow motion: get ready!", x0 + w / 2, y0 - 14); }
}
// fun fact cards while coasting to the Moon
function coastFacts(ctx, f, r, tr) {
  if (!f.hit) return;
  const k = f.tau / tr.T, km = Math.max(0, (r - PARK_R) / (MOON_A - PARK_R)) * 384000;
  const F = [
    [0.04, "🌍 Look back!", ["Earth is shrinking in the window.", "Apollo 8's crew were the first", "people to see the WHOLE Earth (1968)."]],
    [0.22, "📡 Radio delay", [`We're ${Math.round(km / 1000)},000 km away.`, `A radio call now takes ${(km / 300000).toFixed(2)} s`, "to reach Earth (speed of light)."]],
    [0.42, "😴 Life on board", ["Apollo crews ate, slept and did", "live TV shows on the way.", "The trip took about 3 days."]],
    [0.62, "⛰️ Top of the hill", ["We keep slowing down: Earth pulls", "us back. Apollo 11 dropped to about", "0.9 km/s before the Moon took over."]],
    [0.82, "🌙 The Moon wins!", ["Now the Moon's gravity is stronger", "than Earth's here. We start", "speeding up, falling toward it!"]],
  ];
  const cur = [...F].reverse().find(([t]) => k >= t); if (!cur || k > cur[0] + 0.17) return;
  const x0 = W / 2 - 110, y0 = H - 96, w = 220, h = 84;
  ctx.fillStyle = "#151c33f0"; roundRect(ctx, x0, y0, w, h, 12); ctx.fill(); ctx.strokeStyle = "#7fd3ff"; ctx.stroke();
  ctx.font = "bold 13px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#7fd3ff"; ctx.fillText(cur[1], x0 + 10, y0 + 18);
  ctx.font = "11px system-ui"; ctx.fillStyle = "#fff"; cur[2].forEach((t, i) => ctx.fillText(t, x0 + 10, y0 + 36 + i * 15));
}
function phTransfer(ctx, dt) {
  const f = flight, tr = f.tr;
  f.burnT = f.burnT || 0;
  const burning = !f.cutoff;
  if (!f.paused && !f.cine) {
    f.mt += dt * (burning ? 0.12 : 1); f.tau += dt * (burning ? 0.12 : 1); f.burnT += dt;
    if (burning) { f.tliV += dt * (f.tliV < 9.6 ? 1.0 : 0.3); if (f.tliV >= 11.6) cutTLI(); }   // slow-motion near the target
  }
  if (burning && f.orbitStage) f.orbitStage.fill = Math.max(0.02, 0.45 - 0.43 * Math.min(1, (f.tliV - 7.8) / 3));
  if (!burning && !f.tliEnded) {
    f.tliEnded = true; sfx.burnStop(); sfx.sep(); label(`💥 ${f.orbitStage.name} separation`, 90);
    f.stack = f.stack.filter((p) => p.kind !== "stage");
    if (isApollo()) startTDE();
    title("🌍 → 🌙 Coasting to the Moon (3 days)");
  }
  drawSystem(ctx, f);
  ctx.strokeStyle = "#ffffff66"; ctx.beginPath();
  const upto = Math.min(f.tau, f.hit ? tr.T : tr.T * 1.6);
  for (let i = 0; i <= 50; i++) { const [x, y] = transferPoint(tr, (upto * i) / 50); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  if (state.path === "free" && f.hit) {
    const [ex, ey] = toXY(tr.th + Math.PI, tr.ra);
    ctx.strokeStyle = "#3ecf8e55"; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(ex, ey, 22, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = "12px system-ui"; ctx.fillStyle = "#3ecf8e"; ctx.textAlign = "center"; ctx.fillText("🛟 free-return loop", ex, ey + 36);
  }
  const [x, y] = transferPoint(tr, f.tau), [x2, y2] = transferPoint(tr, f.tau + 0.05);
  drawShipAt(ctx, x, y, Math.atan2(y2 - y, x2 - x), burning, true);
  const r = Math.hypot(x - EARTH.x, y - EARTH.y);
  const vCoast = 10.9 * Math.sqrt(Math.max(0.00002, 2 / r - 1 / tr.a) / (2 / PARK_R - 1 / tr.a));   // vis-viva
  const v = burning ? f.tliV : vCoast;
  if (burning) { burnInset(ctx, f); escapeMeter(ctx, f.tliV); }
  else if (!f.cine) coastFacts(ctx, f, r, tr);
  else { hillInset(ctx, (r - PARK_R) / (tr.ra - PARK_R), true); if (!f.cine && f.tau > 0.6) bbqInset(ctx, f, isApollo()); }
  if (!burning && !f.cine && f.tau > 1) askBox("askOrbit", "Why does the ship slow down? Is there gravity in space?", openOrbitExplainer, "40%");
  engineBadge(ctx, burning, burning ? "TLI burn" : "Coasting: gravity slows us");
  speedPanel(ctx, v, f.paused ? 0 : dt);
  ctx.font = "15px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
  if (!burning) ctx.fillText(`FROM EARTH ${Math.round(Math.max(0, (r - PARK_R) / (MOON_A - PARK_R)) * 384)},000 km`, 16, 26);
  if (f.tau > 2 && !f.toldSlow && f.tliTries === 1 && !burning) { f.toldSlow = true; say("rocket", "See? We slow down as we climb away from Earth. Gravity pulls back! 🐢", 5000); }

  if (runCine(ctx, f.paused ? 0 : dt)) return;
  if (f.hit && f.willLeak && !f.leakDone && f.tau >= tr.T * 0.55 && !f.paused) { f.paused = true; sfx.alarm(); leakEvent(); }
  if (f.phase !== "transfer") return;
  if (f.hit && f.tau >= tr.T) {
    label("🌙 Arriving at the Moon!", 90); sfx.chime();
    return startCapture(state.goal === "flyby");
  }
  if (!f.hit && f.tau >= tr.T * (f.cutoff === "under" ? 0.7 : 1) && !f.missTold) { f.missTold = true; sfx.fail();
    label(f.cutoff === "under" ? "⬇️ Too slow! We couldn't climb Earth's gravity hill to the Moon" : f.cutoff === "over" ? "🚀 Too fast! We escaped Earth's gravity well" : "❌ The Moon isn't here! We missed it!", 170); }
  if (!f.hit && f.tau >= tr.T * 1.6 && !f.missModal) { f.missModal = true; loseLife("tli"); }
}

function leakEvent() {
  const hasJane = state.crew.includes("crater"), hasSpare = state.margin >= 5;
  $("modalBox").innerHTML = `<div class="ico">⚠️</div><h2>Fuel leak!</h2><p class="sub">We're losing fuel. What do we do?</p>
    <div class="choices">
      ${hasJane ? `<button class="btn go" onclick="resolveLeak('jane')">🔧 Send Jane to fix it</button>` : ""}
      ${hasSpare ? `<button class="btn" onclick="resolveLeak('spare')">⛽ Use spare fuel (${state.margin}%)</button>` : ""}
      ${state.path === "free" ? `<button class="btn" style="background:var(--warn);box-shadow:0 6px 0 #b07a20" onclick="resolveLeak('abort')">🛟 Abort: let the Moon swing us home</button>`
        : `<p class="sub">❌ No free return: we can't turn back!</p>`}
      <button class="btn ghost" onclick="resolveLeak('hope')">🤞 Hope for the best</button></div>`;
  $("modal").classList.remove("hidden");
}
function resolveLeak(choice) {
  $("modal").classList.add("hidden");
  const f = flight; f.leakDone = true; f.paused = false; sfx.click();
  if (choice === "jane") { f.saved = "jane"; label("🔧 Jane fixed it!"); }
  else if (choice === "spare") { f.saved = "spare"; label("⛽ Spare fuel saved us!"); f.leakLoss = true; }
  else if (choice === "abort") { f.fails = "abort"; label("🛟 Swinging around the Moon and home!"); startReturn(); }
  else { f.fails = "leak"; f.leakLoss = true; f.hoped = true; label("🤞 Fingers crossed… less brake fuel now!"); }
}

// ===== PHASE 4: ORBIT MINI-GAME (real gravity!) =====
// The ship comes in fast. Brake at the right time:
//   too little → fly past the Moon,  too much → crash,  just right → ORBIT
function startCapture(flyby) {
  const f = flight;
  f.attempts++;
  // brake fuel = enough for a good orbit, plus spare fuel, minus any leak
  const base = state.path === "direct" ? 34 : 26;   // direct path = slower arrival = cheaper braking
  let fuel = base + state.margin * 0.7;
  if (f.leakLoss) fuel -= f.saved === "spare" ? state.margin * 0.7 : 12;
  if (state.launchDay) fuel -= state.launchDay.fuelLoss;
  if (f.perigee) fuel += 2;
  f.cap = { x: -430, y: -120, vx: 35, vy: 0, fuel: Math.max(0, fuel), fuel0: base + state.margin * 0.7, stable: 0, trail: [], flyby };
  if (f.fails === "leak") f.fails = null; // the leak result is decided by the burn now
  setPhase("capture");
  if (flyby) { title("🌙 Swinging around the Moon…"); }
  else {
    title("🛰️ Get into orbit! Hold BRAKE near the Moon");
    $("ctrl").classList.remove("hidden");
    $("tip").innerHTML = "Too fast → you fly past. Too slow → you crash. <b>Watch the dotted line!</b> (or hold SPACE)";
    if (f.attempts === 1) say("thrust", "We're coming in fast! Brake when we're close to the Moon. 🔥", 6000);
  }
}
function orbitInfo(c) {
  const r = Math.hypot(c.x, c.y), v2 = c.vx * c.vx + c.vy * c.vy;
  const E = v2 / 2 - GM / r, h = c.x * c.vy - c.y * c.vx;
  const e = Math.sqrt(Math.max(0, 1 + (2 * E * h * h) / (GM * GM)));
  const p = (h * h) / GM, rp = p / (1 + e), ra = E < 0 ? p / (1 - e) : Infinity;
  return { r, E, e, rp, ra };
}
function predictPath(c) {
  let { x, y, vx, vy } = c; const pts = [];
  for (let i = 0; i < 700; i++) {
    const r = Math.hypot(x, y); if (r < MOON.R) { pts.crash = true; break; } if (r > 700) break;
    const a = GM / (r * r * r); vx -= a * x * 0.06; vy -= a * y * 0.06; x += vx * 0.06; y += vy * 0.06;
    if (i % 4 === 0) pts.push([x, y]);
  }
  return pts;
}
function phCapture(ctx, dt) {
  const f = flight, c = f.cap;
  const r0 = Math.hypot(c.x, c.y);
  const speedUp = c.flyby ? 4 : c.orbiting || c.lmSep ? 2.2 : r0 < 200 ? 1.3 : 4;   // slow motion near the Moon
  const steps = Math.round(dt * speedUp / 0.01);
  for (let i = 0; i < steps; i++) {
    const r = Math.hypot(c.x, c.y);
    let ax = -GM * c.x / r ** 3, ay = -GM * c.y / r ** 3;
    if (f.braking && c.fuel > 0) {
      const v = Math.hypot(c.vx, c.vy); ax -= THRUST * c.vx / v; ay -= THRUST * c.vy / v; c.fuel -= THRUST * 0.01;
    }
    c.vx += ax * 0.01; c.vy += ay * 0.01; c.x += c.vx * 0.01; c.y += c.vy * 0.01;
  }
  if (c.fuel <= 0 && f.braking) setBrake(false);
  c.trail.push([c.x, c.y]); if (c.trail.length > 400) c.trail.shift();
  const o = orbitInfo(c);

  // --- draw ---
  ctx.strokeStyle = "#3ecf8e22"; ctx.lineWidth = 40; ctx.beginPath(); ctx.arc(MOON.x, MOON.y, 90, 0, 7); ctx.stroke(); // nice-orbit zone
  ctx.lineWidth = 1;
  ctx.fillStyle = "#cfd3dc"; ctx.beginPath(); ctx.arc(MOON.x, MOON.y, MOON.R, 0, 7); ctx.fill();
  ctx.fillStyle = "#a9aebb"; [[-10, -8, 7], [12, 6, 5], [-4, 14, 4]].forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(MOON.x + dx, MOON.y + dy, rr, 0, 7); ctx.fill(); });
  // future path (the teaching part!)
  const path = predictPath(c);
  const bound = o.E < 0 && !path.crash;
  ctx.fillStyle = path.crash ? "#ff5c6c" : bound ? "#3ecf8e" : "#ffb547";
  path.forEach(([x, y]) => ctx.fillRect(MOON.x + x, MOON.y + y, 2.5, 2.5));
  // past trail
  ctx.strokeStyle = "#ffffff44"; ctx.beginPath(); c.trail.forEach(([x, y], i) => (i ? ctx.lineTo(MOON.x + x, MOON.y + y) : ctx.moveTo(MOON.x + x, MOON.y + y))); ctx.stroke();
  // the spacecraft: turned around so the service module's engine points FORWARD to brake
  const ang = Math.atan2(c.vy, c.vx);
  const withLM = isApollo() && !c.lmSep;
  drawCraftTop(ctx, MOON.x + c.x, MOON.y + c.y, ang, f.braking && c.fuel > 0, withLM, c.orbiting || c.lmSep);
  if (c.lmSep) drawLMSeparating(ctx, c, dt);
  speedPanel(ctx, Math.hypot(c.vx, c.vy) * 0.0615, dt);
  engineBadge(ctx, f.braking && c.fuel > 0, f.braking && c.fuel > 0 ? "Service module engine" : "");
  // status text
  if (!c.flyby) {
    ctx.font = "16px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = path.crash ? "#ff5c6c" : bound ? "#3ecf8e" : "#ffb547";
    ctx.fillText(path.crash ? "⚠️ Path hits the Moon! Stop braking!" : bound ? "✅ Captured! Moon's gravity holds you" : "➡️ Too fast: you'll fly past", 16, 28);
    $("fuelBar").style.width = Math.max(0, (c.fuel / c.fuel0) * 100) + "%";
  }

  // --- results ---
  if (o.r < MOON.R) return captureFail("crash");
  if (c.flyby) {
    if (o.r > 470 && c.x > 0) { label(goal().done); startReturn(); }
    return;
  }
  if (o.E >= 0 && o.r > 480 && (c.x * c.vx + c.y * c.vy) > 0) return captureFail("miss");
  if (c.undocked) return;
  if (c.orbiting || c.lmSep) {             // circling the Moon: the player decides when to land
    const a = Math.atan2(c.y, c.x); c.lapAng += Math.abs(wrap(a - c.prevAng)); c.prevAng = a; c.orbitT += dt;
    ctx.font = "bold 16px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
    ctx.fillText(`Orbit #${Math.floor(c.lapAng / (2 * Math.PI)) + 1} around the Moon · engine off, coasting`, 16, H - 38);
    ctx.font = "13px system-ui"; ctx.fillStyle = "#cfd8ee";
    ctx.fillText("🔺 Command module (crew)   ⚙️ Service module (engine)   🕷️ Lunar module", 16, H - 16);
    if (c.orbiting && !c.landBtn) {
      c.landBtn = true;
      $("tliCtrl").innerHTML = `<button class="btn go big" onclick="startLanding()">🦶 Land on the Moon</button>`;
      $("tliCtrl").classList.remove("hidden");
      say("thrust", "We're in lunar orbit: command module, service module and lunar module, all docked. Land when you're ready! 🌙", 0);
    }
    return;
  }
  if (bound && !f.braking && o.rp > MOON.R + 6) {
    c.stable += dt;
    if (c.stable > 2.5) {
      f.orbitShape = o.e < 0.25 ? "round" : o.e < 0.6 ? "oval" : "long";
      sfx.win(); label(goal().id === "land" ? "🛰️ In orbit! Engines off, coasting…" : goal().done);
      $("ctrl").classList.add("hidden"); $("tip").innerHTML = "";
      if (state.goal === "land") { c.orbiting = true; c.lapAng = 0; c.prevAng = Math.atan2(c.y, c.x); c.orbitT = 0; title("🛰️ In lunar orbit"); }
      else startReturn();
    }
  } else c.stable = 0;
}
function captureFail(kind) {
  const f = flight; setBrake(false);
  $("ctrl").classList.add("hidden");
  if (kind === "crash") { sfx.boom(); label("💥 Crashed into the Moon!"); f.shakeT = 0.6; }
  else { sfx.fail(); label("🌙💨 Missed! Flew past the Moon"); }
  setPhase("done");
  f.lives--; showLives();
  const left = f.lives;
  setTimeout(() => {
    $("modalBox").innerHTML = `<div class="ico">${kind === "crash" ? "💥" : "🌙💨"}</div>
      <h2>${kind === "crash" ? "Braked too much!" : "Didn't brake enough!"}</h2>
      <p class="sub">${kind === "crash" ? "We slowed down so much that the Moon pulled us in."
        : state.path === "free" ? "Too fast to be caught… but our free-return path will swing us home! 🛟"
        : "Too fast to be caught… and with no free return, we're drifting into deep space. 😢"}</p>
      <p class="sub">💔 <b>${left} attempt${left === 1 ? "" : "s"} left.</b></p>
      <div class="choices">${left > 0 ? `<button class="btn go" onclick="retryCapture()">🔁 Retry the braking burn</button>` : ""}
      <button class="btn ghost" onclick="giveUp('${kind}')">${kind === "miss" && state.path === "free" ? "🛟 Let the Moon swing us home" : "📋 See report"}</button></div>`;
    $("modal").classList.remove("hidden");
  }, 1300);
}
function retryCapture() { $("modal").classList.add("hidden"); sfx.click(); startCapture(false); requestAnimationFrame((t) => { flight.last = t; tick(t); }); }
function giveUp(kind) {
  $("modal").classList.add("hidden");
  if (kind === "miss" && state.path === "free") {          // the Moon swings us home
    flight.fails = "miss_safe"; startReturn();
    return requestAnimationFrame((t) => { flight.last = t; tick(t); });
  }
  flight.fails = kind === "miss" ? "lost" : kind; finishFlight(false);
}

// ===== PHASE 6: return + heat shield check =====
// ===== Trans-Earth coast: Moon → Earth. Earth's gravity speeds us up ("rolling downhill") =====
function startReturn() {
  const f = flight;
  $("ctrl") && $("ctrl").classList.add("hidden"); $("tliCtrl") && $("tliCtrl").classList.add("hidden");
  const m = moonAt(f.mt);
  f.tec = transferFor(m.ang + Math.PI); f.tec.tau = f.tec.T; f.teiT = 0; f.smGone = false;
  setPhase("tec"); title("🏠 Trans-Earth coast: heading home");
  if (!f.fails) { label("🔥 TEI burn: Trans-Earth Injection!", 120); sfx.burnStart(); sfx.say("T E I burn. We're heading home.", { pitch: 0.9, interrupt: true }); }
}
// The "gravity hill": Earth sits at the bottom of a deep well, the Moon in a small dip
function hillInset(ctx, prog, goingOut) {
  const x0 = 16, y0 = H - 128, w = 260, h = 112;
  ctx.fillStyle = "#0b1020ee"; roundRect(ctx, x0, y0, w, h, 12); ctx.fill();
  const g = (u) => -0.12 / (u + 0.06) - 0.012 / (1.03 - u);
  let mn = Infinity, mx = -Infinity; for (let u = 0; u <= 1; u += 0.02) { mn = Math.min(mn, g(u)); mx = Math.max(mx, g(u)); }
  const Y = (u) => y0 + 30 + (1 - (g(u) - mn) / (mx - mn)) * (h - 50), X = (u) => x0 + 22 + u * (w - 44);
  ctx.strokeStyle = "#7fb6ff"; ctx.lineWidth = 2; ctx.beginPath();
  for (let u = 0; u <= 1.001; u += 0.02) u ? ctx.lineTo(X(u), Y(u)) : ctx.moveTo(X(u), Y(u)); ctx.stroke(); ctx.lineWidth = 1;
  ctx.font = "14px system-ui"; ctx.textAlign = "center"; ctx.fillText("🌍", X(0), y0 + h - 8); ctx.fillText("🌙", X(1), Y(1) + 18);
  const u = Math.max(0, Math.min(1, prog));
  ctx.fillStyle = "#ffd27a"; ctx.beginPath(); ctx.arc(X(u), Y(u) - 6, 6, 0, 7); ctx.fill();
  ctx.font = "bold 12px system-ui"; ctx.fillStyle = goingOut ? "#ff8a3d" : "#3ecf8e"; ctx.textAlign = "left";
  ctx.fillText(goingOut ? "⛰️ Climbing Earth's gravity hill: slowing down" : "⬇️ Rolling down into Earth's well: speeding up", x0 + 10, y0 + 18);
}
function phTEC(ctx, dt) {
  const f = flight, tr = f.tec;
  if (!f.cine) { f.mt += dt; f.teiT += dt; }
  const burning = !f.fails && f.teiT < 1.6;
  if (!burning && !f.teiOff) { f.teiOff = true; sfx.burnStop(); }
  if (!f.cine) tr.tau = Math.max(0, tr.tau - dt * (burning ? 0.3 : 1));
  drawSystem(ctx, f);
  ctx.strokeStyle = "#7fd3ff88"; ctx.beginPath();
  for (let i = 0; i <= 50; i++) { const q = tr.T - (tr.T - tr.tau) * i / 50; const [x, y] = transferPoint(tr, q); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  const [x, y] = transferPoint(tr, tr.tau), [x2, y2] = transferPoint(tr, Math.max(0, tr.tau - 0.05));
  drawShipAt(ctx, x, y, Math.atan2(y2 - y, x2 - x) + (burning ? Math.PI : 0), burning, true);
  const r = Math.hypot(x - EARTH.x, y - EARTH.y);
  const v = 11.0 * Math.sqrt(Math.max(0.00002, 2 / r - 1 / tr.a) / (2 / PARK_R - 1 / tr.a));
  speedPanel(ctx, v, dt);
  engineBadge(ctx, burning, burning ? "TEI burn (service module)" : "Coasting: Earth pulls us home");
  hillInset(ctx, (r - PARK_R) / (tr.ra - PARK_R), false);
  if (!burning && !f.cine && !f.smGone) bbqInset(ctx, f, false);
  ctx.font = "15px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
  ctx.fillText(`TO EARTH ${Math.round(Math.max(0, (r - PARK_R) / (MOON_A - PARK_R)) * 384)},000 km`, 16, 26);
  if (f.pt > 1.8 && !f.toldTec) { f.toldTec = true; say("rocket", "Going home is like rolling downhill: Earth's gravity speeds us up, all the way to 11 km/s! ⬇️", 7000); }
  if (tr.tau <= tr.T * 0.12 && !f.smGone) { f.smGone = true; startSMSep(); }
  if (runCine(ctx, dt)) return;
  if (tr.tau <= 0) { setPhase("ret"); title("🔥 Re-entry!"); }
}
// Command module, heat shield (blunt end) pointing along +x
function drawCM(ctx, x, y, ang, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.fillStyle = "#cfd3da"; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-22, -4); ctx.lineTo(-22, 4); ctx.lineTo(0, 14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#223"; ctx.fillRect(-12, -6, 3, 3);
  ctx.fillStyle = "#6b3f22"; ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(6, 0, 0, 14); ctx.closePath(); ctx.fill();   // heat shield
  ctx.restore();
}
function phReturn(ctx, dt) {
  const f = flight, t = f.pt, k = Math.min(1, t / 5);
  const sky = (a, b) => Math.round(a + (b - a) * Math.max(0, k * 1.3 - 0.3));
  ctx.fillStyle = `rgb(${sky(3, 40)},${sky(5, 80)},${sky(13, 150)})`; ctx.fillRect(0, 0, W, H);
  if (k < 0.6) flight.stars.forEach(([sx, sy, b]) => { ctx.fillStyle = `rgba(255,255,255,${(0.6 - k) * b})`; ctx.fillRect(sx, sy, 1.5, 1.5); });
  // Earth below (getting closer), with a glowing atmosphere band
  const ey = 980 - k * 260;
  ctx.fillStyle = "#7fb6ff55"; ctx.beginPath(); ctx.arc(450, ey, 760, 0, 7); ctx.fill();
  ctx.fillStyle = "#1f5fbf"; ctx.beginPath(); ctx.arc(450, ey, 730, 0, 7); ctx.fill();
  const shield = state.parts.includes("shield"), ang = 0.55;
  const x = 230 + k * 260, y = 70 + k * 130;
  const hot = k > 0.12 && k < 0.85;
  if (hot) {
    // plasma glows in front of the heat shield, a hot trail streams behind
    for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(255,${140 + Math.random() * 60},${60 + Math.random() * 40},${0.08 + (1 - i / 14) * 0.12})`; ctx.beginPath(); ctx.arc(x - Math.cos(ang) * i * 9, y - Math.sin(ang) * i * 9, 22 - i, 0, 7); ctx.fill(); }
    const gl = ctx.createRadialGradient(x + Math.cos(ang) * 30, y + Math.sin(ang) * 30, 4, x + Math.cos(ang) * 30, y + Math.sin(ang) * 30, 42);
    gl.addColorStop(0, shield ? "#fff6d0" : "#ffb0b0"); gl.addColorStop(0.4, shield ? "#ff9a3d" : "#ff3b3b"); gl.addColorStop(1, "rgba(255,80,40,0)");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x + Math.cos(ang) * 30, y + Math.sin(ang) * 30, 42, 0, 7); ctx.fill();
    if (!f.hot) { f.hot = true; sfx.whoosh(); sfx.roarStart(0.25); }
    f.shakeT = 0.05;
  }
  if (!hot && f.hot && !f.cool) { f.cool = true; sfx.roarStop(); }
  drawCM(ctx, x, y, ang, 2.4);
  speedPanel(ctx, k < 0.12 ? 11 : k < 0.85 ? 11 - (k - 0.12) / 0.73 * 10.7 : 0.3, dt);
  ctx.font = "15px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
  if (k > 0.12) ctx.fillText("🔥 Heat shield first! The air outside reaches about 2,760 °C", 16, 26);
  if (k > 0.3 && k < 0.8) ctx.fillText("📵 Radio blackout: the glowing plasma blocks all signals", 16, 48);
  if (!shield && k > 0.45) {
    sfx.roarStop(); sfx.boom(); f.fails = "shield"; label("🔥 No heat shield… burned up!"); f.shakeT = 0.6;
    setPhase("done"); return finishFlight(false);
  }
  if (k >= 1) { setPhase("splash"); title("🪂 Parachutes!"); sfx.say("Drogues… and three good mains!", { interrupt: true }); }
}
// ===== Splashdown in the ocean =====
function phSplash(ctx, dt) {
  const f = flight, t = f.pt;
  const g = ctx.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, "#5aa9e6"); g.addColorStop(1, "#bfe3ff");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = "#fff5c0"; ctx.beginPath(); ctx.arc(780, 70, 30, 0, 7); ctx.fill();
  ctx.fillStyle = "#ffffffcc"; [[150, 80], [420, 50], [620, 120]].forEach(([cx, cy]) => { ctx.beginPath(); ctx.ellipse(cx, cy, 60, 14, 0, 0, 7); ctx.fill(); });
  // ocean with waves
  ctx.fillStyle = "#1c5d99"; ctx.fillRect(0, 300, W, H - 300);
  ctx.strokeStyle = "#ffffff55"; for (let r = 0; r < 5; r++) { ctx.beginPath(); for (let xx = 0; xx <= W; xx += 10) { const yy = 310 + r * 22 + Math.sin(xx * 0.03 + t * 2 + r) * 3; xx ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
  const yDown = Math.min(286, 30 + t * 64), landed = yDown >= 286, cx = 450;
  const bob = landed ? Math.sin(t * 2.4) * 3 : 0;
  // three main parachutes (orange & white), lines to the capsule
  if (!landed || t < (286 - 30) / 64 + 1.2) {
    const sag = landed ? Math.min(40, (t - (286 - 30) / 64) * 40) : 0;
    [-60, 0, 60].forEach((dx, i) => {
      const px = cx + dx, py = yDown - 120 + sag + (i === 1 ? -10 : 0);
      ctx.strokeStyle = "#ddd"; ctx.beginPath(); ctx.moveTo(px - 26, py); ctx.lineTo(cx, yDown - 18); ctx.moveTo(px + 26, py); ctx.lineTo(cx, yDown - 18); ctx.stroke();
      for (let s = 0; s < 6; s++) { ctx.fillStyle = s % 2 ? "#ffffff" : "#ff7a1a"; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 28, Math.PI + s * Math.PI / 6, Math.PI + (s + 1) * Math.PI / 6); ctx.fill(); }
    });
  }
  // the capsule (heat shield down)
  ctx.save(); ctx.translate(cx, yDown + bob);
  ctx.fillStyle = "#cfd3da"; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.lineTo(8, -34); ctx.lineTo(-8, -34); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#6b3f22"; ctx.fillRect(-26, -2, 52, 6);
  if (landed) { ctx.fillStyle = "#f4f4f4"; [-16, 0, 16].forEach((dx) => { ctx.beginPath(); ctx.arc(dx, -38, 6, 0, 7); ctx.fill(); }); }   // flotation balls
  ctx.restore();
  if (landed && !f.splashed) {
    f.splashed = true; sfx.boom(); f.splashT = 0; f.drops = Array.from({ length: 60 }, () => ({ x: cx + (Math.random() - .5) * 50, y: 290, vx: (Math.random() - .5) * 220, vy: -120 - Math.random() * 200 }));
    sfx.win(); setPhase("splash"); f.pt = t;
    if (f.fails) { label("🌊 Splashdown. Crew home safe!", 160); title("🛟 The crew made it home"); }
    else { label("🌊 SPLASHDOWN! Welcome home! 🎉", 160); title("🎉 Mission complete!"); }
    say("thrust", "Splashdown in the ocean! The recovery ship is on its way. 🚢", 6000);
  }
  if (f.drops) { f.drops.forEach((d) => { d.vy += 400 * dt; d.x += d.vx * dt; d.y += d.vy * dt; }); f.drops = f.drops.filter((d) => d.y < 300); ctx.fillStyle = "#e6f6ff"; f.drops.forEach((d) => ctx.fillRect(d.x, d.y, 3, 3)); }
  ctx.font = "26px system-ui"; ctx.textAlign = "center"; if (landed) ctx.fillText("🚢", 760 - Math.min(160, (t - 4) * 30), 300);
  speedPanel(ctx, landed ? 0 : 0.008, dt);
  if (f.splashed) { f.splashT += dt; if (f.splashT > 3 && !f.endCalled) { f.endCalled = true; setPhase("done"); finishFlight(!f.fails); } }
}

function finishFlight(ok) {
  if (!ok && !flight.fails) flight.fails = "leak";
  if (ok && flight.hoped) flight.saved = "luck";
  setTimeout(screenReport, 2200);
}

