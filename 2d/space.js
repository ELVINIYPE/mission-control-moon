// =====================================================================
// space.js: "learn it" helpers + cinematic close-ups in space
//   askBox / infoPage  : the ❓ boxes and full-page explainers
//   orbit explainer    : why orbit = falling, gravity in space, TLI vs TEI
//   TD&E cine          : Apollo turnaround, docking, extraction (after TLI)
//   SM separation cine : service module drops away before re-entry
//   barbecue roll inset: passive thermal control while coasting
// =====================================================================

// ---------- generic ❓ box (removed automatically when the phase changes) ----------
function askBox(id, question, onOpen, top) {
  if ($(id) || !$("fstage")) return;
  const d = document.createElement("div");
  d.id = id; d.className = "askbox auto"; if (top) d.style.top = top;
  d.onclick = () => { sfx.click(); onOpen(); };
  d.innerHTML = `<div class="q">❓</div><b>${question}</b><span>Tap to find out →</span>`;
  $("fstage").appendChild(d);
}
function clearAskBoxes() { document.querySelectorAll(".askbox.auto").forEach((e) => e.remove()); }
const _setPhaseBase = setPhase;
setPhase = function (p) { clearAskBoxes(); _setPhaseBase(p); };

// ---------- generic full-page explainer (game pauses behind it) ----------
function infoPage(title, cards, back = "⬅ Back to the mission") {
  if ($("explainer")) $("explainer").remove();
  const wasPaused = flight && flight.paused; if (flight) flight.paused = true;
  const e = document.createElement("div"); e.id = "explainer";
  e.innerHTML = `<div class="ex"><h1>${title}</h1>${cards.map(([h, body]) => `<div class="excard"><h3>${h}</h3>${body}</div>`).join("")}
    <div class="actions"><button class="btn go big" id="exBack">${back}</button></div></div>`;
  document.body.appendChild(e);
  $("exBack").onclick = () => { e.remove(); if (flight) flight.paused = wasPaused; sfx.click(); };
}
const bar = (label, pct, col, txt) => `<div class="jbar"><span>${label}</span><div class="track"><div style="width:${pct}%;background:${col}"></div></div><b>${txt}</b></div>`;

// ---------- ORBIT explainer ----------
function openOrbitExplainer() {
  const cannon = `<svg viewBox="0 0 300 220" width="100%" style="max-width:420px;display:block;margin:auto">
    <circle cx="150" cy="150" r="70" fill="#2f7de1"/><circle cx="130" cy="135" r="14" fill="#3ecf8e"/><circle cx="170" cy="168" r="10" fill="#3ecf8e"/>
    <rect x="144" y="62" width="12" height="20" fill="#bbb"/><rect x="150" y="60" width="18" height="7" fill="#555"/>
    <path d="M168 63 Q200 70 205 110" stroke="#ff8a3d" stroke-width="2.5" fill="none" stroke-dasharray="5 4"/>
    <path d="M168 63 Q250 80 214 175" stroke="#ffd27a" stroke-width="2.5" fill="none" stroke-dasharray="5 4"/>
    <circle cx="150" cy="150" r="90" stroke="#3ecf8e" stroke-width="3" fill="none"/>
    <text x="210" y="105" fill="#ff8a3d" font-size="11">slow: lands</text>
    <text x="222" y="180" fill="#ffd27a" font-size="11">faster: lands farther</text>
    <text x="150" y="22" fill="#3ecf8e" font-size="12" text-anchor="middle">7.8 km/s: the ground curves away</text>
    <text x="150" y="38" fill="#3ecf8e" font-size="12" text-anchor="middle">as fast as you fall = ORBIT!</text></svg>`;
  infoPage("🌍 Why doesn't a spacecraft fall down?", [
    ["The big surprise: it IS falling! 🍎", `<p>Everything in orbit (the ISS, satellites, Apollo in its parking orbit) is <b>falling toward Earth all the time</b>. That's called <b>free fall</b>.</p>
      <p>It never hits the ground because it's also moving <b>sideways</b> super fast. While it falls, Earth's round surface curves away underneath it. So it keeps falling <i>around</i> Earth forever.</p>`],
    ["Newton's cannon (Isaac Newton's idea from 1687) 💣", `${cannon}<p>Fire a cannonball from a giant mountain. Faster shots land farther away. Fire it at <b>7.8 km/s</b> (28,000 km/h) and it never lands: it's in orbit!</p>`],
    ["Is there gravity in space? YES! 🧲", `${bar("Gravity on the ground", 100, "#4da3ff", "100%")}${bar("At 185 km (Apollo parking orbit)", 94, "#ffb547", "94%")}${bar("At 400 km (Space Station)", 89, "#ffb547", "89%")}${bar("At the Moon's distance", 0.03 * 100, "#3ecf8e", "0.03%")}
      <p>In low orbit, gravity is almost as strong as on the ground! Astronauts float because they and their spacecraft are <b>falling together</b>, like riding a falling elevator. Gravity never "turns off": it gets weaker the farther you go, but it reaches all the way to the Moon and beyond. It's what keeps the Moon going around Earth!</p>`],
    ["TLI: climbing UP the gravity hill ⛰️", `<p>The <b>Trans-Lunar Injection</b> burn speeds Apollo up from 7.8 to about <b>10.8 km/s</b>. Then the engine turns off and the ship <b>coasts</b>.</p>
      <p>Going to the Moon is like rolling a ball up a giant hill: Earth's gravity pulls back the whole way. Apollo 11 slowed from 10.8 km/s to only about <b>0.9 km/s</b> before the Moon's gravity took over and pulled it in.</p>`],
    ["TEI: rolling DOWN the hill 🛝", `<p>To come home, the <b>Trans-Earth Injection</b> burn only has to push the ship out of the Moon's small dip. After that, Earth's gravity does the work, speeding the capsule up all the way to about <b>11 km/s</b> when it hits the air. That's why the heat shield is so important!</p>`],
    ["Sources 📚", `<p class="cap">NASA: "What Is an Orbit?" (nasa.gov); Newton, Principia (1687); Apollo 11 Mission Report (NASA SP-238); gravity values from g = 9.81 × (R / (R + h))².</p>`],
  ]);
}

// ---------- RADIO explainer (Moon to Earth) ----------
function openRadioExplainer() {
  infoPage("📡 How does a radio call from the Moon reach Earth?", [
    ["Your car radio vs. the Moon 🚗", `<p>Your local FM station only reaches about <b>50 to 100 km</b>. Its signal spreads out in every direction and gets blocked by hills and the curve of the Earth.</p>
      <p>The Moon is <b>384,400 km</b> away, about 4,000 times farther! So how do we hear the astronauts?</p>`],
    ["1. A focused beam 🔦", `<p>The Apollo lunar module and the rover had <b>dish antennas</b>. A dish works like a flashlight instead of a bare light bulb: it squeezes the signal into a narrow beam pointed straight at Earth. That's why the astronauts had to <b>aim the dish</b> at Earth.</p>`],
    ["2. Giant ears on Earth 👂", `<p>Huge dishes caught the faint signal: NASA's <b>64 m dishes</b> at Goldstone (USA), Honeysuckle Creek (Australia) and the <b>Parkes</b> radio telescope (Australia), which beamed Apollo 11's moonwalk TV to the world. Today the <b>Deep Space Network</b> does this job.</p>
      <p>There are stations around the world, so one can always "see" the Moon while Earth spins.</p>`],
    ["3. Nothing in the way 🌌", `<p>Space is empty, so there are no hills or buildings to block the signal. The Moon is always in a straight <b>line of sight</b> when it's above the station's horizon.</p>`],
    ["4. A 1.3-second delay ⏱️", `<p>Radio travels at the speed of light, 300,000 km every second. From the Moon that takes about <b>1.3 seconds</b>, so a question and answer take about 2.6 s. That's why Moon conversations had little pauses!</p>`],
    ["Sources 📚", `<p class="cap">NASA: Apollo 11 Mission Report (SP-238); CSIRO Parkes Observatory history; NASA Deep Space Network (nasa.gov/communicating-with-missions).</p>`],
  ], "⬅ Back to the Moon");
}

// ---------- ROVER TIRE explainer ----------
function openTireExplainer() {
  infoPage("🛞 Why didn't the rover use air-filled tires?", [
    ["No puncture shop on the Moon! 🔧", `<p>On Earth, a flat tire means a trip to the repair shop. On the Moon, the nearest shop is <b>384,400 km</b> away. A flat could leave astronauts stranded far from their lander, so the rover needed tires that <b>can't go flat</b>.</p>`],
    ["Why air tires would fail in a vacuum 🎈", `<p>A car tire works because the air inside pushes out harder than the air outside. On Earth, the air around us presses on everything at about <b>101 kPa</b> (1 atmosphere). That's <b>atmospheric pressure</b>.</p>
      <p>The Moon has <b>no air at all</b>, so there's nothing pushing back from the outside. A tire's air would push even harder, and a tiny hole would empty it in seconds. Plus, temperatures swing from about <b>+120 °C to −170 °C</b>, which would make the rubber crack.</p>`],
    ["The clever fix: woven metal tires 🕸️", `<p>The Apollo rover's wheels used a mesh of <b>zinc-coated piano wire</b> woven like a basket, with <b>titanium strips</b> in a chevron (V) pattern for grip. No air inside, so nothing to puncture!</p>`],
    ["Why atmospheric pressure matters for people too 🧑‍🚀", `<p>Our bodies also need pressure around them. That's why astronauts wear <b>pressurized spacesuits</b>: the suit is like a personal mini-atmosphere. Without it, the liquids in their bodies would start to boil, even at body temperature!</p>`],
    ["Sources 📚", `<p class="cap">NASA: Lunar Roving Vehicle (nssdc.gsfc.nasa.gov); Apollo 15 Press Kit; NASA Glenn: "The Spring Tire" (2009).</p>`],
  ], "⬅ Back to the Moon");
}

// ---------- cinematic close-up panels ----------
function cinePanel(ctx, caption, step, of) {
  const x0 = 170, y0 = 112, w = 560, h = 250;
  ctx.fillStyle = "#050813f2"; roundRect(ctx, x0, y0, w, h, 16); ctx.fill(); ctx.strokeStyle = "#ffd27a"; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
  ctx.font = "bold 13px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#ffd27a"; ctx.fillText("🔭 CLOSE-UP", x0 + 14, y0 + 22);
  if (of) { ctx.textAlign = "right"; ctx.fillStyle = "#9aa5cc"; ctx.fillText(`step ${step} of ${of}`, x0 + w - 14, y0 + 22); }
  ctx.font = "15px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.fillText(caption, x0 + w / 2, y0 + h - 16);
  return { cx: x0 + w / 2, cy: y0 + h / 2 - 6 };
}
const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const seg = (t, a, b) => ease((t - a) / (b - a));

// pieces, drawn pointing along +x (front = +x)
function cSIVB(ctx) {
  ctx.fillStyle = "#eef0f4"; ctx.fillRect(-150, -26, 120, 52);
  ctx.fillStyle = "#222"; ctx.fillRect(-150, -26, 14, 52); ctx.fillRect(-60, -26, 6, 52);
  ctx.fillStyle = "#6b6f78"; ctx.beginPath(); ctx.moveTo(-150, -12); ctx.lineTo(-172, -20); ctx.lineTo(-172, 20); ctx.lineTo(-150, 12); ctx.fill();   // J-2 engine
  ctx.font = "bold 11px system-ui"; ctx.fillStyle = "#334"; ctx.textAlign = "center"; ctx.fillText("S-IVB", -96, 4);
}
function cSLAPanels(ctx, open) {              // 4 panels hinge at the S-IVB end; we see the top and bottom ones
  [-1, 1].forEach((sd) => {
    ctx.save(); ctx.translate(-30, sd * 26); ctx.rotate(sd * open * 0.75);
    ctx.fillStyle = "#d9dce3"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(46, -sd * 6); ctx.lineTo(46, -sd * 1); ctx.lineTo(0, sd * 6); ctx.fill();
    ctx.restore();
  });
}
function cLM(ctx) {                           // LM folded inside the adapter, docking port pointing +x
  ctx.fillStyle = "#c9a227"; ctx.fillRect(-26, -20, 26, 40);       // descent stage (gold foil)
  ctx.fillStyle = "#b8bcc6"; ctx.fillRect(0, -15, 22, 30);         // ascent stage
  ctx.fillStyle = "#555"; ctx.fillRect(22, -6, 6, 12);             // docking tunnel
  ctx.strokeStyle = "#8a6d12"; ctx.beginPath(); ctx.moveTo(-26, -20); ctx.lineTo(-34, -27); ctx.moveTo(-26, 20); ctx.lineTo(-34, 27); ctx.stroke();   // folded legs
}
function cCSM(ctx, rcs) {                     // SM engine at -x, CM nose at +x
  ctx.fillStyle = "#7a7f88"; ctx.beginPath(); ctx.moveTo(-50, -6); ctx.lineTo(-64, -14); ctx.lineTo(-64, 14); ctx.lineTo(-50, 6); ctx.fill();   // SPS engine bell
  ctx.fillStyle = "#c9ccd3"; ctx.fillRect(-50, -18, 50, 36);       // service module
  ctx.fillStyle = "#9aa0aa"; ctx.fillRect(-36, -18, 3, 36); ctx.fillRect(-18, -18, 3, 36);
  ctx.fillStyle = "#eceef2"; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(30, -5); ctx.lineTo(30, 5); ctx.lineTo(0, 18); ctx.fill();   // command module
  ctx.fillStyle = "#555"; ctx.fillRect(30, -3, 5, 6);              // docking probe
  if (rcs) { ctx.fillStyle = "#fff"; [[-25, -21, 0, -1], [-25, 21, 0, 1]].forEach(([x, y, dx, dy]) => { ctx.globalAlpha = 0.5 + Math.random() * 0.5; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.lineTo(x + dx * 10, y + dy * 12); ctx.fill(); }); ctx.globalAlpha = 1; }
}
function cSM(ctx) { ctx.save(); ctx.translate(0, 0); ctx.fillStyle = "#7a7f88"; ctx.beginPath(); ctx.moveTo(-50, -6); ctx.lineTo(-64, -14); ctx.lineTo(-64, 14); ctx.lineTo(-50, 6); ctx.fill(); ctx.fillStyle = "#c9ccd3"; ctx.fillRect(-50, -18, 50, 36); ctx.fillStyle = "#9aa0aa"; ctx.fillRect(-36, -18, 3, 36); ctx.fillRect(-18, -18, 3, 36); ctx.restore(); }
function cCM(ctx, shieldGlow) {
  ctx.fillStyle = "#eceef2"; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(30, -5); ctx.lineTo(30, 5); ctx.lineTo(0, 18); ctx.fill();
  ctx.fillStyle = "#6b3f22"; ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(-7, 0, 0, 18); ctx.fill();
  if (shieldGlow) { ctx.strokeStyle = "#ffb547"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-1, -18); ctx.quadraticCurveTo(-8, 0, -1, 18); ctx.stroke(); ctx.lineWidth = 1; }
}

// ---- TD&E: Transposition, Docking and Extraction (Apollo) ----
const TDE_STEPS = [
  [0, 2.2, "1️⃣ The SLA panels open. The lunar module is hiding inside!"],
  [2.2, 4, "2️⃣ The command/service module (CSM) separates and moves forward"],
  [4, 6.8, "3️⃣ It flips around 180° to face the lunar module"],
  [6.8, 9, "4️⃣ It slowly backs in and DOCKS: nose to nose. Clunk!"],
  [9, 11.4, "5️⃣ It pulls the lunar module out of the S-IVB (extraction)"],
  [11.4, 14, "6️⃣ The empty S-IVB is sent away so it can't hit us. Bye!"],
];
function startTDE() {
  const f = flight; f.cine = { kind: "tde", t: 0, dur: 14 };
  say("thrust", "Now the trickiest part of the trip: turn around and pick up the lunar module! 🕷️", 6000);
  cineSkipBtn(true);
}
function drawTDE(ctx, t) {
  const st = TDE_STEPS.findIndex(([a, b]) => t < b), step = st < 0 ? 5 : st;
  const { cx, cy } = cinePanel(ctx, TDE_STEPS[step][2], step + 1, 6);
  ctx.save(); ctx.translate(cx - 20, cy); ctx.scale(0.95, 0.95);
  // S-IVB (drifts away + vents at the end)
  const sOut = seg(t, 11.6, 14);
  ctx.save(); ctx.translate(-sOut * 150, sOut * 30); ctx.globalAlpha = 1 - sOut * 0.6;
  cSIVB(ctx); cSLAPanels(ctx, seg(t, 0.3, 1.8));
  if (t > 11.6) { ctx.fillStyle = "#cfe8ff88"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-176 - i * 12 - Math.random() * 6, (Math.random() - 0.5) * 16, 4 + i * 2, 0, 7); ctx.fill(); } }
  ctx.restore();
  // LM: sits in the adapter, then is pulled out with the CSM
  const ext = seg(t, 9.2, 11.4) * 120;
  ctx.save(); ctx.translate(-20 + ext, 0); cLM(ctx); ctx.restore();
  // CSM: forward, flip, dock, extract
  const fwd = seg(t, 2.2, 4) * 90, flip = seg(t, 4, 6.8) * Math.PI, back = seg(t, 6.8, 9) * 110;   // backs in until the probe sits inside the LM's docking tunnel
  let x = 60 + fwd - back + ext;
  ctx.save(); ctx.translate(x, 0); ctx.rotate(flip);
  const rcsOn = (t > 2.2 && t < 2.8) || (t > 4 && t < 4.5) || (t > 6.3 && t < 6.8) || (t > 6.8 && t < 7.3) || (t > 9.2 && t < 9.7);
  cCSM(ctx, rcsOn); ctx.restore();
  ctx.restore();
  if (t >= 9 && !flight.cine.clunk) { flight.cine.clunk = true; sfx.clunk(); sfx.say("Hard dock.", { rate: 1.1 }); }
  if (t >= 11.4 && !flight.cine.gone) { flight.cine.gone = true; sfx.sep(); }
  ctx.font = "11px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#9aa5cc";
  ctx.fillText("Apollo 11 did this about 3 hours after launch, 6,000 km from Earth", 186, 152);
}

// ---- service module separation before re-entry ----
const SMSEP_STEPS = [
  [0, 1.6, "1️⃣ 15 minutes before hitting the air: still joined together"],
  [1.6, 4.2, "2️⃣ SEPARATION! The service module fires its thrusters to move away"],
  [4.2, 6.6, "3️⃣ The capsule turns its HEAT SHIELD forward. Only it comes home!"],
];
function startSMSep() {
  const f = flight; f.cine = { kind: "smsep", t: 0, dur: 6.6 };
  say("crater", "The service module has no heat shield. It will burn up in the air, so we leave it behind! 👋", 6500);
  cineSkipBtn(true);
}
function drawSMSep(ctx, t) {
  const st = SMSEP_STEPS.findIndex(([a, b]) => t < b), step = st < 0 ? 2 : st;
  const { cx, cy } = cinePanel(ctx, SMSEP_STEPS[step][2], step + 1, 3);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1.6, 1.6);
  const s = seg(t, 1.7, 4.2), turn = seg(t, 4.2, 6.2) * Math.PI;
  // SM moves away down/back, firing its thrusters
  ctx.save(); ctx.translate(-s * 70, s * 28); ctx.rotate(s * 0.25); cSM(ctx);
  if (t > 1.7 && t < 3.6) { ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.5 + Math.random() * 0.5; ctx.beginPath(); ctx.moveTo(-27, -18); ctx.lineTo(-21, -18); ctx.lineTo(-24, -30); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
  if (t > 1.6 && t < 1.9) { ctx.fillStyle = "#ffd27a"; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill(); }
  ctx.save(); ctx.translate(s * 10, 0); ctx.rotate(turn); cCM(ctx, turn > 3); ctx.restore();
  ctx.restore();
  if (t >= 1.6 && !flight.cine.sep) { flight.cine.sep = true; sfx.sep(); sfx.say("C M, S M separation.", { rate: 1.1 }); }
  if (t > 4.4) { ctx.font = "12px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#ffb547"; ctx.fillText("🛡️ heat shield", cx - 30 * 1.6 * Math.min(1, (t - 4.2) / 2), cy + 52); }
}

// run whichever close-up is playing; returns true while it's busy
function runCine(ctx, dt) {
  const f = flight, c = f.cine; if (!c) return false;
  if (!f.paused) c.t += dt;
  if (c.kind === "tde") drawTDE(ctx, c.t); else drawSMSep(ctx, c.t);
  if (c.t >= c.dur) endCine();
  return true;
}
function endCine() {
  const f = flight; if (!f || !f.cine) return;
  const k = f.cine.kind; f.cine = null; cineSkipBtn(false);
  if (k === "tde") { label("✅ Docked with the lunar module! On our way.", 120); f.tdeDone = true; }
  if (k === "smsep") label("🛡️ Only the command module comes home", 120);
}
function cineSkipBtn(on) {
  const c = $("tliCtrl"); if (!c) return;
  c.dataset.html = on ? "skip" : "";
  c.innerHTML = on ? `<button class="btn ghost" onclick="endCine()">⏩ Skip close-up</button>` : "";
  c.classList.toggle("hidden", !on);
}

// ---- Barbecue roll inset (Passive Thermal Control) ----
function bbqInset(ctx, f, withLM) {
  const x0 = 16, y0 = 40, w = 250, h = 96;
  f.bbq = (f.bbq || 0) + 0.016 * 2.2;
  ctx.fillStyle = "#0b1020ee"; roundRect(ctx, x0, y0, w, h, 12); ctx.fill();
  ctx.fillStyle = "#ffd27a"; ctx.beginPath(); ctx.arc(x0 + 22, y0 + 54, 10, 0, 7); ctx.fill();   // Sun
  ctx.strokeStyle = "#ffd27a55"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x0 + 36, y0 + 44 + i * 10); ctx.lineTo(x0 + 66, y0 + 44 + i * 10); ctx.stroke(); }
  // spacecraft seen from the side; a moving shadow band shows the spin
  ctx.save(); ctx.translate(x0 + 150, y0 + 56); ctx.scale(0.9, 0.9);
  if (withLM) { ctx.save(); ctx.translate(-56, 0); ctx.rotate(Math.PI); cLM(ctx); ctx.restore(); ctx.save(); ctx.translate(30, 0); ctx.rotate(Math.PI); cCSM(ctx, false); ctx.restore(); }
  else { ctx.save(); ctx.translate(10, 0); cCSM(ctx, false); ctx.restore(); }
  const yb = Math.sin(f.bbq) * 20;                       // shadow band slides around = the ship is rolling
  ctx.beginPath(); ctx.rect(withLM ? -82 : -40, -18, withLM ? 82 + (withLM ? 22 : 0) + 20 : 80, 36); ctx.clip();
  ctx.fillStyle = "#00000080"; ctx.fillRect(-100, yb - 4, 200, 14);
  ctx.fillStyle = "#ffffff30"; ctx.fillRect(-100, -yb - 3, 200, 6);
  ctx.restore();
  ctx.save(); ctx.translate(x0 + 150, y0 + 56); ctx.strokeStyle = "#ffd27a"; ctx.beginPath(); ctx.ellipse(56, 0, 6, 22, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.fillStyle = "#ffd27a"; ctx.beginPath(); ctx.moveTo(56, 22); ctx.lineTo(50, 18); ctx.lineTo(57, 15); ctx.fill(); ctx.restore();
  ctx.font = "bold 12px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.fillText("🍖 Barbecue roll", x0 + 10, y0 + 16);
  ctx.font = "11px system-ui"; ctx.fillStyle = "#9aa5cc";
  ctx.fillText("Spinning ~3 times an hour so the Sun", x0 + 10, y0 + 30);
  ctx.fillText("doesn't cook one side and freeze the other", x0 + 10, y0 + h - 6);
}
