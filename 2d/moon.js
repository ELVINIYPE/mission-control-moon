/* =========================================================
   MOON: lunar orbit, crew transfer CM↔LM, landing, inside the LM, moonwalk,
   TV camera, radio call to Earth, cargo bay, steerable rover + rocks,
   liftoff (flag + dust), docking, crew transfer back, jettison
   ========================================================= */

// ---------- Spacecraft seen from the side (in lunar orbit) ----------
// Turned around so the service-module engine faces FORWARD (that's how you brake).
function drawCraftTop(ctx, x, y, ang, burning, withLM, labels) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(1.5, 1.5);
  if (burning) {
    const L = 22 + Math.random() * 12;
    ctx.fillStyle = "#ffb547"; ctx.beginPath(); ctx.moveTo(15, -3.5); ctx.lineTo(15, 3.5); ctx.lineTo(15 + L, 0); ctx.fill();
    ctx.fillStyle = "#fff9"; ctx.beginPath(); ctx.moveTo(15, -1.5); ctx.lineTo(15, 1.5); ctx.lineTo(15 + L * .6, 0); ctx.fill();
  }
  ctx.fillStyle = "#555"; ctx.beginPath(); ctx.moveTo(9, -2.5); ctx.lineTo(9, 2.5); ctx.lineTo(15, 4); ctx.lineTo(15, -4); ctx.fill();
  ctx.fillStyle = "#b8bfcc"; ctx.fillRect(-4, -5, 13, 10);
  ctx.fillStyle = "#e9edf5"; ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(-4, 5); ctx.lineTo(-12, 1.5); ctx.lineTo(-12, -1.5); ctx.fill();
  if (withLM) {
    ctx.fillStyle = "#b9bec9"; ctx.fillRect(-21, -4, 9, 8);
    ctx.fillStyle = "#d9a62e"; ctx.fillRect(-29, -5, 8, 10);
    ctx.strokeStyle = "#ccc"; ctx.beginPath(); ctx.moveTo(-29, -5); ctx.lineTo(-33, -8); ctx.moveTo(-29, 5); ctx.lineTo(-33, 8); ctx.stroke();
  }
  ctx.restore();
  if (labels) { ctx.font = "11px system-ui"; ctx.fillStyle = "#cfd8ee"; ctx.textAlign = "left"; ctx.fillText(withLM ? "🔺⚙️🕷️ CSM + LM" : "🔺⚙️ CSM", x + 16, y - 14); }
}

// generic bottom-bar buttons
function surfaceButtons(list) {
  const c = $("tliCtrl");
  c.innerHTML = list.map(([txt, fn, cls]) => `<button class="btn ${cls || "go"}" ${fn.startsWith("hold:") ? `data-hold="${fn.slice(5)}"` : `onclick="${fn}"`}>${txt}</button>`).join("");
  c.classList.toggle("hidden", list.length === 0);
  c.querySelectorAll("[data-hold]").forEach((b) => {
    const k = b.dataset.hold, on = (e) => { e.preventDefault(); flight.keys[k] = true; }, off = () => { flight.keys[k] = false; };
    b.addEventListener("mousedown", on); b.addEventListener("touchstart", on);
    b.addEventListener("mouseup", off); b.addEventListener("mouseleave", off); b.addEventListener("touchend", off);
  });
}
function closeModal() { $("modal").classList.add("hidden"); }

// ---------- Landing: Apollo moves crew into the LM first; own design lands whole ----------
function startLanding() {
  const f = flight, c = f.cap; if (!c || !c.orbiting) return;
  $("tliCtrl").classList.add("hidden");
  const ld = state.launchDay;
  if (ld && ld.sun === "nogo" && !f.nightTold) {            // Launch Day check 2 ignored: it's night at the site
    f.nightTold = true; sfx.alarm();
    $("modalBox").innerHTML = `<div class="ico">🌑</div><h2>It's NIGHT at the landing site!</h2>
      <p class="sub">The Sun is below the horizon (${Math.round(ld.sunElev)}°). It's pitch black and about −170 °C. The pilots can't see craters or boulders, so landing would be far too dangerous.</p>
      <p class="sub">That's why the <b>sunlight check</b> on Launch Day matters: Apollo always arrived in the early-morning light.</p>
      <div class="choices"><button class="btn go" onclick="closeModal();flight.fails='night';startReturn()">🏠 Abort the landing and head home</button></div>`;
    $("modal").classList.remove("hidden"); return;
  }
  if (isApollo()) return startXfer("toLM");
  f.lmCrew = [...state.crew];
  c.orbiting = false; c.lmSep = { t: 0, x: c.x, y: c.y, whole: true };
  sfx.burnStart(); setTimeout(() => sfx.burnStop(), 900); label("🦿 Our lander leaves orbit to land", 150);
}
function drawLMSeparating(ctx, c, dt) {
  const s = c.lmSep; s.t += dt;
  const k = Math.min(1, s.t / 3);
  const lx = MOON.x + s.x * (1 - 0.55 * k), ly = MOON.y + s.y * (1 - 0.55 * k);
  ctx.save(); ctx.translate(lx, ly); ctx.scale(0.5, 0.5);
  if (s.whole) { ctx.fillStyle = "#c9ced8"; ctx.fillRect(-14, -24, 28, 12); ctx.fillStyle = "#eef0f4"; ctx.beginPath(); ctx.moveTo(-10, -24); ctx.lineTo(10, -24); ctx.lineTo(6, -40); ctx.lineTo(-6, -40); ctx.fill();
    ctx.strokeStyle = "#ccc"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(-22, 0); ctx.moveTo(12, -12); ctx.lineTo(22, 0); ctx.stroke(); ctx.lineWidth = 1; }
  else drawLander(ctx, 0, 0, 1, true);
  if (s.t > 0.8) { ctx.fillStyle = "#ffb547"; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(0, 16 + Math.random() * 8); ctx.fill(); }
  ctx.restore();
  ctx.font = "11px system-ui"; ctx.fillStyle = "#ffd27a"; ctx.textAlign = "left"; ctx.fillText(s.whole ? "🦿 lander" : "🕷️ LM", lx + 12, ly);
  if (s.t > 3.2 && !s.done) { s.done = true; setPhase("surface"); title("🦶 Landing on the Moon…"); initSurface(); }
}
function initSurface() {
  const rocks = Array.from({ length: 9 }, (_, i) => ({ x: 80 + Math.random() * 740, y: 40 + Math.random() * 340, got: false,
    kind: ["basalt", "anorthosite", "breccia", "orange soil"][i % 4] }));
  flight.sf = { step: "descent", prints: [], dust: [], ax: LM_X, ay: 0, hatch: 0, flag: false, rover: null, exps: [], items: [],
    bay: 0, rocks, rocksGot: 0, crew: crewInit() };
  flight.keys = {};
}

// ---------- Crew transfer through the docking tunnel (Apollo) ----------
const XSLOT = { CM: [[520, 196], [536, 210], [548, 190]], LM: [[392, 200], [424, 200]] };
function startXfer(dir) {
  const f = flight;
  f.xfer = { dir, moving: null, jett: null };
  if (dir === "toLM") f.inLM = [];
  setPhase("xfer"); title(dir === "toLM" ? "🔁 Float into the lunar module" : "🔁 Float back into the command module");
  say(dir === "toLM" ? "thrust" : "crater", dir === "toLM"
    ? "Open the tunnel and float into the lunar module. At least 2 of us go down. One stays to fly the command module! 🔁"
    : "We're docked! Float back through the tunnel into the command module. Then we let the ascent stage go. 🔁", 0);
  xferButtons();
}
function xferButtons() {
  const f = flight, x = f.xfer, B = [];
  if (x.moving || x.jett) return surfaceButtons([]);
  const nm = (id) => byId(CREW, id).name;
  if (x.dir === "toLM") {
    state.crew.filter((id) => !f.inLM.includes(id)).forEach((id) => B.push([`➡️ ${nm(id)} to the LM`, `xferMove('${id}')`, "ghost"]));
    f.inLM.forEach((id) => B.push([`⬅️ ${nm(id)} back`, `xferMove('${id}')`, "ghost"]));
    B.push(["🕷️ Close hatches & undock", "xferDone()"]);
  } else {
    f.inLM.forEach((id) => B.push([`⬅️ ${nm(id)} into the CM`, `xferMove('${id}')`, "ghost"]));
    B.push(["👋 Jettison the ascent stage", "xferDone()"]);
  }
  surfaceButtons(B);
}
function xferMove(id) {
  const f = flight, inLM = f.inLM.includes(id);
  if (!inLM && f.inLM.length >= 2) { sfx.nope(); return say("crater", "The lunar module only has room for 2 astronauts! 🕷️", 5000); }
  f.xfer.moving = { id, t: 0, to: inLM ? "CM" : "LM" }; sfx.whoosh(); xferButtons();
}
function xferDone() {
  const f = flight, x = f.xfer, c = f.cap;
  if (x.dir === "toLM") {
    if (f.inLM.length < 2) { sfx.nope(); return say("thrust", "We need at least 2 astronauts to land. One alone is too risky! 👨‍🚀👩‍🚀", 6000); }
    if (f.inLM.length === state.crew.length && state.crew.length >= 3) { sfx.nope(); return say("thrust", "Someone must stay in the command module to fly it and pick us up later! 🔺", 6000); }
    f.lmCrew = [...f.inLM];
    sfx.sep(); sfx.say("We have separation. The Eagle has wings.", { interrupt: true });
    if (state.crew.length === 2) say("rocket", "With only 2 crew, the command module orbits empty. Apollo always kept one pilot aboard! 🔺", 6000);
    setPhase("capture"); c.orbiting = false; c.lmSep = { t: 0, x: c.x, y: c.y };
    label("🕷️ Lunar module undocks! The command module stays in orbit", 150); title("🕷️ Going down to the Moon");
  } else {
    if (f.inLM.length) { sfx.alarm(); return say("crater", `STOP! ${f.inLM.map((id) => byId(CREW, id).name).join(" and ")} still in the ascent stage! Move them to the CM first! 🚨`, 7000); }
    x.jett = { t: 0 }; sfx.sep(); label("👋 Ascent stage jettisoned: left in lunar orbit", 150);
    say("rocket", "Bye, ascent stage! Leaving it behind saves fuel for the trip home. 👋", 5000);
  }
}
function phXfer(ctx, dt) {
  const f = flight, x = f.xfer;
  drawSpace(ctx);
  ctx.fillStyle = "#9da3b0"; ctx.beginPath(); ctx.arc(450, 1180, 860, 0, 7); ctx.fill();
  const lmOff = x.jett ? { dx: -x.jett.t * 60, dy: x.jett.t * 25 } : { dx: 0, dy: 0 };
  // service module + engine
  ctx.fillStyle = "#b8bfcc"; ctx.fillRect(560, 160, 140, 80); ctx.fillStyle = "#8d93a0"; ctx.fillRect(560, 160, 140, 6); ctx.fillRect(560, 234, 140, 6);
  ctx.fillStyle = "#555"; ctx.beginPath(); ctx.moveTo(700, 185); ctx.lineTo(740, 168); ctx.lineTo(740, 232); ctx.lineTo(700, 215); ctx.fill();
  // command module (cutaway)
  ctx.fillStyle = "#e9edf5"; ctx.beginPath(); ctx.moveTo(560, 160); ctx.lineTo(560, 240); ctx.lineTo(480, 212); ctx.lineTo(480, 188); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#2a3247"; ctx.beginPath(); ctx.moveTo(552, 172); ctx.lineTo(552, 228); ctx.lineTo(492, 208); ctx.lineTo(492, 192); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5a3a2a"; ctx.fillRect(556, 160, 5, 80);
  // tunnel + LM (moves away when jettisoned)
  ctx.save(); ctx.translate(lmOff.dx, lmOff.dy);
  ctx.fillStyle = "#9aa0aa"; ctx.fillRect(456, 190, 26, 20); ctx.fillStyle = "#2a3247"; ctx.fillRect(460, 194, 22, 12);
  ctx.fillStyle = "#b9bec9"; ctx.beginPath(); ctx.moveTo(456, 150); ctx.lineTo(456, 250); ctx.lineTo(380, 262); ctx.lineTo(362, 236); ctx.lineTo(362, 164); ctx.lineTo(380, 138); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#2a3247"; ctx.fillRect(372, 165, 76, 70);
  if (x.dir === "toLM") {
    ctx.fillStyle = "#d9a62e"; ctx.beginPath(); ctx.moveTo(362, 140); ctx.lineTo(362, 260); ctx.lineTo(282, 270); ctx.lineTo(282, 130); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#c9ccd3"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(290, 136); ctx.lineTo(250, 112); ctx.moveTo(290, 264); ctx.lineTo(250, 288); ctx.stroke(); ctx.lineWidth = 1;
  }
  ctx.restore();
  ctx.font = "13px system-ui"; ctx.fillStyle = "#cfd8ee"; ctx.textAlign = "center";
  ctx.fillText("⚙️ Service module", 630, 152); ctx.fillText("🔺 Command module", 520, 262);
  ctx.fillText("🔁 tunnel", 469 + lmOff.dx, 182 + lmOff.dy); ctx.fillText("🕷️ LM ascent stage", 410 + lmOff.dx, 128 + lmOff.dy);
  if (x.dir === "toLM") ctx.fillText("🦿 LM descent stage", 322, 290);
  // astronauts in their cabins (floating, slowly bobbing)
  const slotOf = (id) => {
    const inLM = f.inLM.includes(id);
    const list = inLM ? f.inLM : state.crew.filter((q) => !f.inLM.includes(q));
    const arr = inLM ? XSLOT.LM : XSLOT.CM, p = arr[list.indexOf(id) % arr.length];
    return inLM ? [p[0] + lmOff.dx, p[1] + lmOff.dy] : p;
  };
  // everyone is drawn INSIDE the spacecraft only (clipped to the cabins + tunnel), like a cutaway drawing
  ctx.save(); ctx.beginPath();
  ctx.moveTo(552, 172); ctx.lineTo(552, 228); ctx.lineTo(492, 208); ctx.lineTo(492, 192); ctx.closePath();     // CM cabin
  ctx.rect(446 + lmOff.dx, 193 + lmOff.dy, 48, 14);                                                             // tunnel
  ctx.rect(372 + lmOff.dx, 165 + lmOff.dy, 76, 70);                                                             // LM cabin
  ctx.clip();
  const crewShown = x.dir === "toLM" ? state.crew : [...state.crew];
  crewShown.forEach((id, i) => {
    if (x.moving && x.moving.id === id) return;
    const [px, py] = slotOf(id);
    drawAstronaut(ctx, px, py + 12, { s: 0.42, rot: -Math.PI / 2 + Math.sin(f.pt * 1.5 + i) * 0.15 });
  });
  // the moving astronaut glides through the tunnel
  if (x.moving) {
    const mv = x.moving; mv.t += dt / 2;
    const from = slotOf(mv.id);
    const toLM = mv.to === "LM", tgt = toLM ? XSLOT.LM[f.inLM.length] : XSLOT.CM[(state.crew.length - f.inLM.length) % 3];
    const k = Math.min(1, mv.t), mid = [469, 200];
    const p = k < 0.5 ? [from[0] + (mid[0] - from[0]) * k * 2, from[1] + (mid[1] - from[1]) * k * 2] : [mid[0] + (tgt[0] - mid[0]) * (k - .5) * 2, mid[1] + (tgt[1] - mid[1]) * (k - .5) * 2];
    drawAstronaut(ctx, p[0] + (toLM ? 12 : -12), p[1] - 2, { s: 0.36, rot: toLM ? -Math.PI / 2 : Math.PI / 2 });
    if (mv.t >= 1) {
      if (toLM) f.inLM.push(mv.id); else f.inLM = f.inLM.filter((q) => q !== mv.id);
      x.moving = null; sfx.clunk(); xferButtons();
    }
  }
  ctx.restore();
  ctx.strokeStyle = "#8d93a0"; ctx.lineWidth = 2; ctx.strokeRect(446 + lmOff.dx, 193 + lmOff.dy, 46, 14); ctx.lineWidth = 1;   // tunnel walls
  if (x.moving) { ctx.font = "12px system-ui"; ctx.fillStyle = "#ffd27a"; ctx.textAlign = "center"; ctx.fillText("floating through the tunnel (inside, not outside!)", 469, 300); }
  ctx.font = "bold 15px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
  ctx.fillText(`In the LM: ${f.inLM.length} (max 2)   ·   In the CM: ${state.crew.length - f.inLM.length}`, 16, 28);
  if (x.jett) { x.jett.t += dt; if (x.jett.t > 3) { x.jett = null; startReturn(); } }
}

// ---------- Surface scene ----------
const GROUND = 345, LM_X = 330;
function moonGround(ctx) {
  ctx.fillStyle = "#03050d"; ctx.fillRect(0, 0, W, H);
  flight.stars.forEach(([x, y, b]) => { if (y < GROUND - 20) { ctx.fillStyle = `rgba(255,255,255,${0.2 + b * 0.5})`; ctx.fillRect(x, y, 1.4, 1.4); } });
  const ld = state.launchDay;
  if (ld && ld.sunElev !== undefined && ld.sunElev > 0) {          // the Sun at the height you chose on Launch Day
    const sy = Math.max(30, GROUND - 10 - ld.sunElev * 6);
    const sg = ctx.createRadialGradient(860, sy, 2, 860, sy, 40); sg.addColorStop(0, "#fffbe6"); sg.addColorStop(0.3, "#ffd27a88"); sg.addColorStop(1, "#ffd27a00");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(860, sy, 40, 0, 7); ctx.fill();
    ctx.font = "11px system-ui"; ctx.fillStyle = "#ffd27a"; ctx.textAlign = "center"; ctx.fillText(`☀️ Sun ${Math.round(ld.sunElev)}° high`, 860, sy + 34);
  }
  ctx.fillStyle = "#2f7de1"; ctx.beginPath(); ctx.arc(130, 70, 22, 0, 7); ctx.fill();
  ctx.fillStyle = "#03050d"; ctx.beginPath(); ctx.arc(140, 64, 22, 0, 7); ctx.fill();
  ctx.fillStyle = "#3ecf8e"; ctx.beginPath(); ctx.arc(116, 74, 6, 0, 7); ctx.fill();
  const g = ctx.createLinearGradient(0, GROUND, 0, H); g.addColorStop(0, "#a3a8b3"); g.addColorStop(1, "#6f7480");
  ctx.fillStyle = g; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = "#8c919c";
  [[90, 372, 40], [620, 395, 55], [820, 362, 26], [480, 404, 20]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.ellipse(x, y, r, r / 4.5, 0, 0, 7); ctx.fill(); });
  ctx.fillStyle = "#7d828d"; for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = GROUND + 6 + ((i * 53) % 70); ctx.fillRect(x, y, 2 + (i % 3), 2); }
}

// Lunar module, front 3/4 view: 4 legs (ladder on the front leg, TV camera on the left leg)
function drawLMFront(ctx, x, yb, part = "both", hatch = 0, cargo = true) {
  const s = 1.5, sf = flight.sf || {};
  ctx.save(); ctx.translate(x, yb); ctx.scale(s, s);
  if (part !== "ascent") {
    ctx.strokeStyle = "#8f939b"; ctx.lineWidth = 2.5;                       // rear leg (behind)
    ctx.beginPath(); ctx.moveTo(14, -40); ctx.lineTo(24, -8); ctx.stroke();
    ctx.fillStyle = "#8f939b"; ctx.beginPath(); ctx.ellipse(24, -7, 7, 2.4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#c9ccd3"; ctx.lineWidth = 3;                         // left + right legs
    ctx.beginPath(); ctx.moveTo(-34, -40); ctx.lineTo(-56, -2); ctx.moveTo(34, -40); ctx.lineTo(56, -2); ctx.stroke();
    ctx.lineWidth = 1; ctx.fillStyle = "#c9ccd3";
    [[-56, 0], [56, 0], [-12, 0]].forEach(([fx, fy]) => { ctx.beginPath(); ctx.ellipse(fx, fy, 9, 3, 0, 0, 7); ctx.fill(); });
    // TV camera on the left leg (red light when recording)
    ctx.fillStyle = "#3a3d44"; ctx.fillRect(-49, -24, 9, 7); ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(-38.5, -20.5, 2.4, 0, 7); ctx.fill();
    if (sf.rec && Math.floor(flight.pt * 2) % 2 === 0) { ctx.fillStyle = "#ff3b3b"; ctx.beginPath(); ctx.arc(-47, -26, 1.6, 0, 7); ctx.fill(); }
    // descent stage (gold foil) + cargo bays
    const own = !isApollo();
    if (own) {   // one-piece lander: a big round fuel tank (silver, blue band) instead of Apollo's gold descent stage
      ctx.fillStyle = "#c9ced8"; ctx.beginPath(); ctx.ellipse(0, -50, 40, 16, 0, 0, 7); ctx.fill();
      ctx.fillRect(-40, -64, 80, 14); ctx.beginPath(); ctx.ellipse(0, -64, 40, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#2f6fd6"; ctx.fillRect(-40, -58, 80, 4);
      ctx.fillStyle = "#555"; ctx.beginPath(); ctx.moveTo(-8, -36); ctx.lineTo(8, -36); ctx.lineTo(12, -28); ctx.lineTo(-12, -28); ctx.fill();   // one engine
      ctx.fillStyle = "#9aa0aa"; ctx.fillRect(-30, -58, 18, 16);
    } else {
    ctx.fillStyle = "#d9a62e"; ctx.beginPath(); ctx.moveTo(-40, -36); ctx.lineTo(-34, -64); ctx.lineTo(34, -64); ctx.lineTo(40, -36); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#b8871c"; ctx.fillRect(-30, -58, 18, 16);
    }
    ctx.fillStyle = "#3a2f1a"; ctx.fillRect(12, -58, 18, 16);                          // cargo bay
    if (cargo && state.science.includes("rover") && !sf.rover) { ctx.fillStyle = "#c9ccd3"; ctx.fillRect(14, -57, 9, 14); ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(18, -50, 3, 0, 7); ctx.fill(); }
    if (cargo && !sf.expsDone && state.science.some((id) => ["seismo", "spectro", "camera"].includes(id))) { ctx.fillStyle = "#e6e8ee"; ctx.fillRect(24, -50, 5, 6); ctx.fillStyle = "#d9a62e"; ctx.fillRect(24, -55, 5, 4); }
    const b = sf.bay || 0;                                                            // bay door slides down
    ctx.fillStyle = "#c9962a"; ctx.fillRect(12, -58 + 16 * b, 18, 16 * (1 - b)); if (b > 0) ctx.fillRect(12, -42, 18, 3 * b);
    // front leg with ladder
    // FRONT LEG (slanted strut down to its footpad) with the LADDER mounted along it
    ctx.strokeStyle = "#c9ccd3"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(4, -38); ctx.lineTo(-10, -2); ctx.stroke();
    ctx.strokeStyle = "#e3e5ea"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -66); ctx.lineTo(-17, -9); ctx.moveTo(3, -66); ctx.lineTo(-8, -9); ctx.stroke();
    ctx.lineWidth = 1.6; for (let i = 0; i < 9; i++) { const k = i / 8, y = -63 + k * 52, xs = -6.6 - k * 10.4; ctx.beginPath(); ctx.moveTo(xs, y); ctx.lineTo(xs + 9, y); ctx.stroke(); }
    ctx.lineWidth = 1;
    ctx.fillStyle = "#9da3ad"; ctx.fillRect(-11, -68, 22, 3);                    // porch
  }
  if (part !== "descent" && !isApollo()) {   // one-piece lander: white crew capsule on top
    ctx.fillStyle = "#eef0f4"; ctx.beginPath(); ctx.moveTo(-30, -66); ctx.lineTo(30, -66); ctx.lineTo(18, -116); ctx.lineTo(-18, -116); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#223"; ctx.beginPath(); ctx.arc(-12, -100, 4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(12, -100, 4, 0, 7); ctx.fill();
    ctx.fillStyle = "#2f6fd6"; ctx.fillRect(-26, -72, 52, 3);
  } else if (part !== "descent") {
    ctx.fillStyle = "#b9bec9"; ctx.beginPath();
    ctx.moveTo(-30, -66); ctx.lineTo(30, -66); ctx.lineTo(34, -92); ctx.lineTo(18, -112); ctx.lineTo(-20, -112); ctx.lineTo(-34, -92); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#223"; ctx.beginPath(); ctx.moveTo(-18, -104); ctx.lineTo(-6, -104); ctx.lineTo(-10, -94); ctx.lineTo(-20, -96); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18, -104); ctx.lineTo(6, -104); ctx.lineTo(10, -94); ctx.lineTo(20, -96); ctx.fill();
    ctx.fillStyle = "#8d93a0"; ctx.fillRect(-8, -86, 16, 18);
    if (hatch > 0) { ctx.fillStyle = "#111"; ctx.fillRect(-8, -86, 16, 18); ctx.fillStyle = "#8d93a0"; ctx.fillRect(-8 - 14 * hatch, -86, 14 * hatch, 18); }
    ctx.strokeStyle = "#ddd"; ctx.beginPath(); ctx.moveTo(24, -110); ctx.lineTo(32, -126); ctx.stroke();
    ctx.fillStyle = "#eee"; ctx.beginPath(); ctx.arc(34, -128, 6, Math.PI * 0.8, Math.PI * 2.1); ctx.fill();
  }
  ctx.restore();
}
const DISH = () => [LM_X + 51, GROUND - 192];
// where an astronaut stands on the ladder, at height ay (screen px above the ground)
function ladderX(ay) { const h = Math.max(0, Math.min(1, (ay / 1.5 - 9) / 57)); return LM_X + 1.5 * (-12.5 + 10.5 * h); }

// Realistic Apollo A7L moon suit (side view, facing right):
// PLSS backpack + OPS box on top, chest control box (RCU) with red & blue hoses,
// bent knees/elbows, gloves, gold sun visor, US flag patch, red commander stripes, blue-soled overshoes
function drawAstronaut(ctx, x, y, o = {}) {
  const s = o.s || 1.25, ph = o.walk || 0, sw = Math.sin(ph), cw = Math.cos(ph);
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(o.flip ? -s : s, s);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const suit = o.suit || "#f1f2f5", shade = o.suit ? "#c95f14" : "#cfd3db";
  const leg = (hx, phase, back) => {                       // hip → knee → foot, knee bends forward
    const a = Math.sin(phase) * 0.45;
    let kx = hx + 3 + Math.sin(a) * 9, ky = -12 + Math.abs(a) * 2;
    let fx = kx - 1 + Math.sin(a * 1.4) * 6, fy = -2 + (Math.sin(phase) > 0 ? -Math.sin(phase) * 2 : 0);
    if (o.seated) { kx = hx + 11; ky = -24; fx = hx + 14; fy = -11; }
    ctx.strokeStyle = back ? shade : suit; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(hx, -24); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.strokeStyle = back ? "#bfc4cc" : "#dfe2e8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(kx, ky, 3, 0, 7); ctx.stroke();   // knee joint
    if (o.cdr) { ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(kx - 3, ky - 3); ctx.lineTo(kx - 2, ky + 3); ctx.stroke(); }
    // boot: overshoe (white with blue sole) or plain inner boot
    ctx.fillStyle = o.covers ? "#f6f6f6" : "#9aa0aa";
    ctx.beginPath(); ctx.moveTo(fx - 4, fy - 4); ctx.lineTo(fx + 6, fy - 3); ctx.lineTo(fx + 7, fy + 1); ctx.lineTo(fx - 4, fy + 1); ctx.fill();
    if (o.covers) { ctx.fillStyle = "#2f6fd6"; ctx.fillRect(fx - 4, fy + 0.5, 11, 1.8); }
  };
  leg(-1, ph + Math.PI, true);                              // far leg (shaded)
  // far arm
  ctx.strokeStyle = shade; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-2, -43); ctx.lineTo(-4 - sw * 3, -33); ctx.lineTo(-1 - sw * 4, -25); ctx.stroke();
  // PLSS backpack + OPS (oxygen purge system) on top
  ctx.fillStyle = "#e6e8ee"; ctx.fillRect(-17, -54, 10, 27); ctx.strokeStyle = "#b9bec8"; ctx.lineWidth = 1; ctx.strokeRect(-17, -54, 10, 27);
  ctx.fillStyle = "#d5d9e0"; ctx.fillRect(-16, -60, 8, 6);
  ctx.fillStyle = "#9aa0aa"; ctx.fillRect(-15, -49, 6, 1.5); ctx.fillRect(-15, -45, 6, 1.5);
  // torso
  ctx.fillStyle = suit; ctx.beginPath(); ctx.moveTo(-8, -52); ctx.lineTo(6, -52); ctx.lineTo(8, -26); ctx.lineTo(-7, -24); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = shade; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-7, -36); ctx.lineTo(7, -37); ctx.stroke();   // waist ring
  // chest control box (RCU) + hoses
  ctx.fillStyle = "#b9bec8"; ctx.fillRect(6, -47, 6, 8); ctx.fillStyle = "#555"; ctx.fillRect(7.5, -45.5, 1.5, 1.5); ctx.fillRect(10, -45.5, 1.5, 1.5);
  ctx.lineWidth = 1.6; ctx.strokeStyle = "#c0392b"; ctx.beginPath(); ctx.moveTo(-6, -40); ctx.quadraticCurveTo(0, -36, 5, -38); ctx.stroke();
  ctx.strokeStyle = "#2f6fd6"; ctx.beginPath(); ctx.moveTo(-6, -37); ctx.quadraticCurveTo(0, -33, 5, -35); ctx.stroke();
  leg(1, ph, false);                                        // near leg
  // near arm: shoulder → elbow → glove
  const ex = 6 + cw * 2, ey = -38, gx = 9 + sw * 4, gy = -29;
  ctx.strokeStyle = suit; ctx.lineWidth = 5.5; ctx.beginPath(); ctx.moveTo(1, -48); ctx.lineTo(ex, ey); ctx.lineTo(gx, gy); ctx.stroke();
  if (o.cdr) { ctx.strokeStyle = "#c0392b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - 2, ey - 3); ctx.lineTo(ex + 2, ey - 2); ctx.stroke(); }
  ctx.fillStyle = "#6f7c96"; ctx.beginPath(); ctx.arc(gx, gy, 2.6, 0, 7); ctx.fill();          // glove
  // US flag patch on the shoulder
  ctx.fillStyle = "#b22234"; ctx.fillRect(-3, -50, 5, 3.4); ctx.fillStyle = "#fff"; ctx.fillRect(-3, -48.9, 5, 0.7); ctx.fillStyle = "#3c3b6e"; ctx.fillRect(-3, -50, 2, 1.8);
  // helmet: white shell (EVVA) + gold sun visor + reflection
  ctx.fillStyle = "#f6f7f9"; ctx.beginPath(); ctx.arc(1, -60, 8.5, 0, 7); ctx.fill();
  ctx.strokeStyle = "#cfd3db"; ctx.lineWidth = 1; ctx.stroke();
  const vg = ctx.createLinearGradient(2, -68, 9, -52); vg.addColorStop(0, "#f7d774"); vg.addColorStop(.5, "#c8901e"); vg.addColorStop(1, "#7a5310");
  ctx.fillStyle = vg; ctx.beginPath(); ctx.ellipse(4.5, -60, 5.2, 6.8, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
  ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(5, -62, 3.5, -1.2, -0.2); ctx.stroke();
  ctx.fillStyle = "#7d8aa3"; ctx.fillRect(-6, -53, 13, 2);                                     // neck ring
  ctx.lineCap = "butt"; ctx.lineJoin = "miter"; ctx.lineWidth = 1;
  ctx.restore();
}


// US flag on a pole with a top rod. wave = how much it flaps (from the engine blast), tilt = knocked over
function drawUSFlag(ctx, x, yb, wave = 0, tilt = 0) {
  ctx.save(); ctx.translate(x, yb); ctx.rotate(tilt);
  ctx.fillStyle = "#ddd"; ctx.fillRect(0, -70, 2, 70); ctx.fillRect(0, -70, 44, 2);
  const fw = 42, fh = 26, t = flight.pt;
  for (let i = 0; i < fw; i += 2) {
    const off = Math.sin(i * 0.3 - t * 14) * wave * (i / fw);
    for (let s = 0; s < 13; s++) { ctx.fillStyle = s % 2 ? "#ffffff" : "#b22234"; ctx.fillRect(2 + i, -68 + off + (s * fh) / 13, 2.2, fh / 13 + 0.5); }
    if (i < fw * 0.42) { ctx.fillStyle = "#3c3b6e"; ctx.fillRect(2 + i, -68 + off, 2.2, fh * 0.54); if (i % 4 === 0) { ctx.fillStyle = "#fff"; for (let r = 0; r < 4; r++) ctx.fillRect(3 + i, -66 + off + r * 3.2, 1, 1); } }
  }
  ctx.restore();
}

// Lunar Roving Vehicle (side view)
function drawRover(ctx, x, yb, o = {}) {
  ctx.save(); ctx.translate(x, yb);
  if (o.rot) { ctx.translate(-30, 0); ctx.rotate(o.rot); ctx.translate(30, 0); }
  const wheel = (wx) => {
    ctx.fillStyle = "#3a3d44"; ctx.beginPath(); ctx.arc(wx, -10, 10, 0, 7); ctx.fill();
    ctx.strokeStyle = "#8d929c"; ctx.lineWidth = 1; for (let a = 0; a < 6; a++) { const q = a + (o.spin || 0); ctx.beginPath(); ctx.moveTo(wx, -10); ctx.lineTo(wx + Math.cos(q) * 9, -10 + Math.sin(q) * 9); ctx.stroke(); }
    ctx.strokeStyle = "#b9bdc6"; ctx.beginPath(); ctx.arc(wx, -10, 10, 0, 7); ctx.stroke();
    ctx.fillStyle = "#c9a227"; ctx.beginPath(); ctx.arc(wx, -10, 13, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(wx + 12, -12); ctx.fill();
  };
  const wk = o.wheels === undefined ? 1 : o.wheels, sk = o.seats === undefined ? 1 : o.seats;
  ctx.fillStyle = "#b9bdc6"; ctx.fillRect(-32, -22, 64, 4);
  [-24, 24].forEach((wx) => {
    if (wk >= 1) return wheel(wx);
    ctx.save(); ctx.translate(wx, -20); ctx.rotate((1 - wk) * (wx < 0 ? -1.4 : 1.4)); ctx.scale(Math.max(0.35, wk), Math.max(0.35, wk)); ctx.translate(-wx, 20); wheel(wx); ctx.restore();
  });
  if (sk > 0) {
    ctx.save(); ctx.translate(0, -22); ctx.scale(1, sk); ctx.translate(0, 22);
    ctx.fillStyle = "#6b7280"; ctx.fillRect(-14, -30, 10, 8); ctx.fillRect(0, -30, 10, 8);
    ctx.strokeStyle = "#ddd"; ctx.beginPath(); ctx.moveTo(26, -22); ctx.lineTo(26, -50); ctx.stroke();
    ctx.fillStyle = "#e8e8e8"; ctx.beginPath(); ctx.moveTo(14, -50); ctx.lineTo(38, -50); ctx.lineTo(26, -58); ctx.fill();
    ctx.fillStyle = "#555"; ctx.fillRect(28, -32, 7, 5);
    ctx.restore();
  }
  ctx.restore();
}

// Dust: on the Moon it flies in clean arcs and falls fast (no air = no clouds)
function kickDust(x, n, power = 1) {
  const sf = flight.sf;
  for (let i = 0; i < n; i++) sf.dust.push({ x, h: 1, vx: (Math.random() - .5) * 120 * power, vh: (40 + Math.random() * 80) * power, life: 3 });
}
function updDust(ctx, dt) {
  const sf = flight.sf, gm = 60;
  sf.dust.forEach((d) => { d.x += d.vx * dt; d.vh -= gm * dt; d.h += d.vh * dt; d.life -= dt; });
  sf.dust = sf.dust.filter((d) => d.h > 0 && d.life > 0);
  ctx.fillStyle = "#c9ccd3"; sf.dust.forEach((d) => ctx.fillRect(d.x, GROUND - d.h, 2, 2));
}
// 👣 close-up of the very first boot print (like Buzz Aldrin's famous photo AS11-40-5878)
function footprintZoom(ctx, dt) {
  const sf = flight.sf; sf.printZoom += dt;
  const a = Math.min(1, sf.printZoom * 2, (7 - sf.printZoom) * 2), cx = 720, cy = 175, R = 82;
  ctx.save(); ctx.globalAlpha = Math.max(0, a);
  ctx.strokeStyle = "#ffd27a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(LM_X + 8, GROUND + 4); ctx.lineTo(cx - R * 0.8, cy + R * 0.6); ctx.stroke();
  ctx.fillStyle = "#a3a8b3"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, 7); ctx.clip();
  for (let i = 0; i < 70; i++) { ctx.fillStyle = i % 2 ? "#959aa5" : "#b3b7c0"; ctx.fillRect(cx - R + (i * 37) % (2 * R), cy - R + (i * 53) % (2 * R), 3, 3); }
  ctx.translate(cx, cy); ctx.rotate(-0.35);
  ctx.fillStyle = "#6f7480"; roundRect(ctx, -26, -58, 52, 116, 22); ctx.fill();              // the print
  ctx.fillStyle = "#5c616c"; for (let y = -50; y < 52; y += 8) ctx.fillRect(-22, y, 44, 3.5);   // sole ridges
  ctx.fillStyle = "#8a8f9a"; ctx.fillRect(-26, -4, 52, 4);
  ctx.restore();
  ctx.font = "bold 13px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#ffd27a";
  ctx.fillText("👣 The first footprint!", cx, cy + R + 18);
  ctx.font = "12px system-ui"; ctx.fillStyle = "#fff";
  ctx.fillText("No wind or rain on the Moon to wipe it away.", cx, cy + R + 35);
  ctx.fillText("It can last for millions of years!", cx, cy + R + 50);
  ctx.restore();
}
function drawPrints(ctx) { ctx.fillStyle = "#7e838e"; flight.sf.prints.forEach(([x]) => { for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 2, GROUND + 3, 1, 4); }); }

// ---------- the two moonwalkers ----------
// Each astronaut is separate: inside the LM, on the ladder, or outside. YOU choose who goes.
function crewInit() {
  const ids = (flight.lmCrew && flight.lmCrew.length ? flight.lmCrew : state.crew).slice(0, 2);
  return ids.map((id, i) => ({ id, name: byId(CREW, id).name, first: byId(CREW, id).name.split(" ")[0], where: "in", ay: 112, x: LM_X, tx: LM_X, walkPh: 0, cdr: i === 0 }));
}
const outCrew = () => flight.sf.crew.filter((c) => c.where === "out");
const actor = () => outCrew()[0];
const crewBy = (id) => flight.sf.crew.find((c) => c.id === id);
function spotFor(c) {                    // where each astronaut stands near the lander
  const i = flight.sf.crew.indexOf(c);
  return i === 0 ? LM_X + 70 : LM_X + 175;
}

// ---------- what can the player do next? ----------
function nextSurfaceChoices() {
  const sf = flight.sf, B = [];
  const hasExp = state.science.some((id) => ["seismo", "spectro", "camera"].includes(id));
  const hasRover = state.science.includes("rover");
  if (sf.step === "landed") B.push(["🔍 Go inside: put on overshoes", "zoomShoes('on')"]);
  else if (sf.step === "covers") B.push(["🚪 Open the hatch", "doHatch()"]);
  else if (sf.step === "out") {
    const busy = sf.crew.some((c) => c.where === "ladder" || c.walking) || sf.task;
    if (busy) return surfaceButtons([]);
    const outs = outCrew();
    sf.crew.filter((c) => c.where === "in").forEach((c) => B.push([`🪜 ${c.first} climbs DOWN`, `crewLadder('${c.id}', -1)`, outs.length ? "ghost" : ""]));
    if (outs.length) {
      B.push(["🗺️ Explore: walk & drive", "startExplore()"]);
      B.push(["🦘 Jump!", "doJump()", "ghost"]);
      if (!sf.flag) B.push(["🇺🇸 Plant the flag", "doFlag()", "ghost"]);
      if (!sf.radioDone) B.push(["📡 Call Earth", "doRadio()", "ghost"]);
      if (!sf.reflector) B.push(["🔦 Set up the laser reflector", "doReflector()", "ghost"]);
      if ((hasRover || hasExp) && sf.bay < 1) B.push(["📦 Open the descent-stage bay", "doBay()", "ghost"]);
      if (sf.bay >= 1 && hasRover) {
        const r = sf.rover;
        if (!r) B.push(["🪢 Rover: pull the straps to lower it", "roverStep('lower')", "ghost"]);
        else if (r.stage === "lowered") B.push(["🛞 Rover: unfold the wheels", "roverStep('wheels')", "ghost"]);
        else if (r.stage === "wheels") B.push(["💺 Rover: set up seats & antenna", "roverStep('seats')", "ghost"]);
      }
      if (sf.bay >= 1 && hasExp && !sf.expsDone) B.push(["🧪 Set up experiments", "doExperiments()", "ghost"]);
      outs.forEach((c) => B.push([`🪜 ${c.first} climbs back IN`, `crewLadder('${c.id}', 1)`, "ghost"]));
    }
  }
  surfaceButtons(B);
}

// ---------- inside the LM: overshoes on / off ----------
function zoomShoes(kind) { const sf = flight.sf; sf.zoom = { kind, t: 0 }; surfaceButtons([]); sfx.click(); }
function drawInsideLM(ctx, dt) {
  const sf = flight.sf, z = sf.zoom; z.t += dt;
  const on = z.kind === "on", T = z.t;
  // cabin: walls, floor, triangular windows, control panel
  ctx.fillStyle = "#4b5650"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#3a433e"; ctx.fillRect(0, 330, W, 90);
  [[120, 60], [330, 60]].forEach(([wx, wy]) => {
    ctx.fillStyle = "#03050d"; ctx.beginPath(); ctx.moveTo(wx - 55, wy); ctx.lineTo(wx + 55, wy); ctx.lineTo(wx, wy + 70); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = "#a3a8b3"; ctx.fillRect(wx - 55, wy + 42, 110, 30); ctx.restore();
    ctx.strokeStyle = "#2a2f2c"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(wx - 55, wy); ctx.lineTo(wx + 55, wy); ctx.lineTo(wx, wy + 70); ctx.closePath(); ctx.stroke(); ctx.lineWidth = 1;
  });
  ctx.fillStyle = "#2e3430"; ctx.fillRect(196, 40, 70, 150);
  for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) { ctx.fillStyle = (r + c + Math.floor(flight.pt * 2)) % 5 === 0 ? "#ffd27a" : "#9aa0aa"; ctx.fillRect(206 + c * 20, 52 + r * 19, 8, 5); }
  // two astronauts standing (no seats in the LM!), held by straps
  const crew = flight.lmCrew || state.crew.slice(0, 2);
  [[120, 340], [330, 340]].forEach(([px, py], i) => {
    ctx.strokeStyle = "#9b8a5a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 40, 200); ctx.lineTo(px - 8, 245); ctx.moveTo(px + 40, 200); ctx.lineTo(px + 8, 245); ctx.stroke(); ctx.lineWidth = 1;
    const done = on ? T > 4.6 : T < 0.4;
    drawAstronaut(ctx, px, py, { s: 2.1, covers: done, cdr: i === 0 });
    ctx.font = "12px system-ui"; ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(byId(CREW, crew[i] || "thrust").name, px, py + 18);
  });
  ctx.font = "12px system-ui"; ctx.fillStyle = "#e6e8ee"; ctx.textAlign = "center";
  ctx.fillText("No seats in the LM: they stood, held by straps", 225, 395);

  // 🔍 BIG CLOSE-UP of one boot (right side)
  const X = 470, Y = 30, BW = 410, BH = 360;
  ctx.fillStyle = "#1b211e"; roundRect(ctx, X, Y, BW, BH, 16); ctx.fill(); ctx.strokeStyle = "#ffd27a"; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
  ctx.font = "bold 15px system-ui"; ctx.fillStyle = "#ffd27a"; ctx.textAlign = "left";
  ctx.fillText(on ? "🔍 Close-up: putting on the lunar overshoe" : "🔍 Close-up: taking the overshoe off", X + 14, Y + 24);
  // stages: on = 1 step in (0.6–1.8), 2 pull up (1.8–3.0), 3 strap (3.0–4.2); off = reverse
  const s1 = Math.max(0, Math.min(1, (T - 0.6) / 1.2)), s2 = Math.max(0, Math.min(1, (T - 1.8) / 1.2)), s3 = Math.max(0, Math.min(1, (T - 3.0) / 1.2));
  const shoeIn = on ? s1 : 1 - s3, shoeUp = on ? s2 : 1 - s2, strap = on ? s3 : 1 - s1;
  const fx = X + 200, fy = Y + 290;                     // foot position in the close-up
  // lower leg + inner pressure boot (grey, plain sole)
  ctx.fillStyle = "#f1f2f5"; ctx.fillRect(fx - 34, Y + 60, 62, 170);
  ctx.strokeStyle = "#cfd3db"; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(fx - 34, Y + 90 + k * 22); ctx.lineTo(fx + 28, Y + 92 + k * 22); ctx.stroke(); }
  ctx.fillStyle = "#9aa0aa"; ctx.beginPath(); ctx.moveTo(fx - 36, Y + 220); ctx.lineTo(fx + 30, Y + 220); ctx.lineTo(fx + 34, fy - 30); ctx.lineTo(fx + 110, fy - 18); ctx.lineTo(fx + 112, fy); ctx.lineTo(fx - 38, fy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#6b7078"; ctx.fillRect(fx - 38, fy - 4, 150, 6);
  // the overshoe: white Beta-cloth upper, blue ribbed silicone sole, strap + buckle
  const ox = fx + (1 - shoeIn) * -170, oy = fy + 14 - shoeUp * 14 + (1 - shoeIn) * 20;
  const hUp = 40 + shoeUp * 70;                          // how far up the leg the overshoe reaches
  ctx.globalAlpha = 0.97;
  ctx.fillStyle = "#f7f7f5"; ctx.beginPath();
  ctx.moveTo(ox - 44, oy - hUp - 4); ctx.lineTo(ox + 38, oy - hUp - 4); ctx.lineTo(ox + 40, oy - 34); ctx.lineTo(ox + 118, oy - 22); ctx.lineTo(ox + 122, oy); ctx.lineTo(ox - 46, oy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#d8d8d2"; ctx.beginPath(); ctx.moveTo(ox - 40, oy - hUp + 10); ctx.lineTo(ox + 36, oy - hUp + 10); ctx.stroke();
  ctx.fillStyle = "#e9e9e4"; ctx.fillRect(ox + 4, oy - hUp - 4, 26, hUp - 30);          // tongue
  ctx.fillStyle = "#2f6fd6"; ctx.fillRect(ox - 46, oy, 168, 10);                           // blue sole
  for (let k = 0; k < 15; k++) { ctx.fillStyle = "#2457ad"; ctx.fillRect(ox - 42 + k * 11, oy + 10, 6, 6); }   // ribs (the famous footprint)
  // strap across the ankle
  if (strap > 0) {
    ctx.fillStyle = "#c9c9c2"; ctx.fillRect(ox - 46, oy - 52, 90 * strap, 10);
    ctx.fillStyle = "#8a8f99"; ctx.fillRect(ox - 46 + 90 * strap - 8, oy - 54, 10, 14);   // buckle
  }
  ctx.globalAlpha = 1;
  if (on && s3 >= 1 && !z.clicked) { z.clicked = true; sfx.clunk(); }
  if (!on && s3 > 0 && !z.clicked) { z.clicked = true; sfx.click(); }
  // step labels
  const steps = on ? ["1. Step into the overshoe", "2. Pull it up over the boot", "3. Tighten the strap ✔"]
    : ["1. Open the strap", "2. Pull it down", "3. Slip the boot out, toss it overboard"];
  const act = on ? (T < 1.8 ? 0 : T < 3.0 ? 1 : 2) : (T < 1.8 ? 0 : T < 3.0 ? 1 : 2);
  steps.forEach((st, i) => { ctx.font = (i === act ? "bold " : "") + "14px system-ui"; ctx.fillStyle = i < act || (i === act && T > (on ? 4.2 : 4.2)) ? "#3ecf8e" : i === act ? "#fff" : "#7d8a83"; ctx.fillText(st, X + 14, Y + 52 + i * 20); });
  ctx.font = "12px system-ui"; ctx.fillStyle = "#cfd8ee";
  ctx.fillText("Grey = inner pressure boot · White + blue ribbed sole = lunar overshoe", X + 14, Y + BH - 12);
  if (!on && T > 4.2) { ctx.fillStyle = "#ffd27a"; ctx.font = "bold 13px system-ui"; ctx.fillText("👋 Overshoes + backpacks thrown out to save weight", X + 14, Y + BH - 32); }
  if (T > 5.4) {
    sf.zoom = null;
    if (on) { sf.covers = true; sf.step = "covers"; showOvershoeCard(); }
    else { sf.items.push({ ico: "🥾", x: LM_X - 40 }, { ico: "🎒", x: LM_X - 64 }); sf.step = "ready"; liftoffQuiz(); }
  }
}
function showOvershoeCard() {
  $("modalBox").innerHTML = `<h2>🥾 Lunar overshoes</h2>
    <svg viewBox="0 0 360 150" width="100%">
      <text x="80" y="16" text-anchor="middle" fill="#cfd8ee" font-size="12">Inner pressure boot</text>
      <path d="M40 40 L95 40 L100 95 L135 105 L135 120 L35 120 Z" fill="#9aa0aa"/><rect x="35" y="120" width="100" height="6" fill="#666"/>
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${45 + i * 13}" cy="137" r="3" fill="#666"/>`).join("")}
      <text x="80" y="150" text-anchor="middle" fill="#8f9ac4" font-size="10">plain sole</text>
      <text x="270" y="16" text-anchor="middle" fill="#cfd8ee" font-size="12">Lunar overshoe (worn on top)</text>
      <path d="M220 34 L285 34 L292 92 L330 102 L330 120 L215 120 Z" fill="#f4f4f4"/><rect x="215" y="120" width="115" height="8" fill="#2f6fd6"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `<rect x="${220 + i * 10}" y="132" width="4" height="12" fill="#2f6fd6"/>`).join("")}
      <text x="272" y="150" text-anchor="middle" fill="#8f9ac4" font-size="10">ribbed blue sole = the famous footprint</text>
    </svg>
    <p class="sub" style="text-align:left">The famous bootprint was made by the <b>overshoe</b>, not the inner boot. That's why Armstrong's boots in museums have a different sole! Overshoes protected the suit from sharp lunar dust and heat.</p>
    <div class="choices"><button class="btn go" onclick="closeModal();nextSurfaceChoices();sfx.add();">👍 Got it</button></div>`;
  $("modal").classList.remove("hidden");
}

// ---------- liftoff quiz: what leaves the Moon? ----------
function liftoffQuiz() {
  $("modalBox").innerHTML = `<div class="ico">🚀</div><h2>How do we leave the Moon?</h2>
    <p class="sub">${isApollo() ? "Our lander: Apollo lunar module (2 stages)" : "Our lander: Artemis-style, one piece (like Starship)"}</p>
    <div class="choices">
      <button class="btn" onclick="answerLiftoff('ascent')">🕷️ Only the ascent stage: leave the descent stage on the Moon</button>
      <button class="btn" onclick="answerLiftoff('whole')">🚀 The ENTIRE lander lifts off</button></div>`;
  $("modal").classList.remove("hidden");
}
function answerLiftoff(choice) {
  const real = isApollo() ? "ascent" : "whole", ok = choice === real;
  flight.liftQuiz = ok; ok ? sfx.win() : sfx.nope();
  $("modalBox").innerHTML = `<div class="ico">${ok ? "✅" : "❌"}</div><h2>${ok ? "Correct! +50 points" : "Not for this lander!"}</h2>
    <p class="sub" style="text-align:left">${isApollo()
      ? "Apollo's lunar module had 2 stages. Only the <b>ascent stage</b> (with the 2 astronauts) lifted off. The <b>descent stage</b> stayed behind as the launch pad. All six are still on the Moon today! Robot missions like Luna and Chang'e did the same."
      : "NASA's new Artemis landers (SpaceX Starship and Blue Origin Blue Moon) are <b>one piece</b>. The <b>whole lander</b> lifts off and flies back to lunar orbit, so it can be refuelled and used again."}</p>
    <p class="sub">Now watch what the real mission does 👀</p>
    <div class="choices"><button class="btn go" onclick="closeModal();flight.sf.step='liftoff';flight.sf.lt=0;">🚀 Lift off!</button></div>`;
}

// ---------- surface actions ----------
function doHatch() {
  const sf = flight.sf; sf.hatchOpening = true; sf.step = "opening"; surfaceButtons([]); sfx.clunk();
  say("thrust", "Hatch open! It's a tight squeeze with the backpack. Who goes out first? You choose! 🚪", 6000);
}
function crewLadder(id, dir) {
  const sf = flight.sf, c = crewBy(id);
  if (dir < 0) { c.where = "ladder"; c.dir = -1; c.ay = 112; c.x = LM_X; }
  else { c.tx = LM_X; c.walking = true; c.then = "up"; }
  if (dir < 0 && !sf.rec) { sf.rec = true; sf.camZoom = 0; say("rocket", "The TV camera on the lander's leg is switched on. The whole world is watching LIVE! 📺", 5000); }
  sfx.click(); surfaceButtons([]);
}
function doJump() {
  const sf = flight.sf, a = actor(); if (!a || sf.jumpV !== undefined) return;
  sf.jumpV = 30; sf.jumpH = 0; sf.jumper = a.id; sfx.whoosh();
  say("crater", "Only a small hop! Moon gravity is 1/6 of Earth's… so why not 6× higher? Tap the ❓ box to find out! 🦘", 7000);
  showJumpAsk();
}
// ❓ question box on the right side → opens the explainer page
function showJumpAsk() {
  if ($("askJump") || !$("fstage")) return;
  const d = document.createElement("div");
  d.id = "askJump"; d.className = "askbox"; d.onclick = openJumpExplainer;
  d.innerHTML = `<div class="q">❓</div><b>Why can't we jump 6× higher on the Moon?</b><span>Tap to find out →</span>`;
  $("fstage").appendChild(d);
}
function openJumpExplainer() {
  sfx.click();
  const bar = (label, m, col) => `<div class="jbar"><span>${label}</span><div class="track"><div style="width:${m / 3 * 100}%;background:${col}"></div></div><b>${m.toFixed(1)} m</b></div>`;
  const fig = (pack) => `<svg viewBox="0 0 120 170" width="120" height="170">
      ${pack ? `<rect x="22" y="34" width="26" height="50" rx="4" fill="#d5d9e0" stroke="#9aa0aa"/>` : ""}
      <circle cx="${pack ? 62 : 60}" cy="24" r="14" fill="${pack ? "#f4f4f4" : "#f0c8a4"}" stroke="#9aa0aa"/>
      <rect x="${pack ? 48 : 46}" y="40" width="28" height="56" rx="8" fill="${pack ? "#f1f2f5" : "#4da3ff"}" stroke="#9aa0aa"/>
      <path d="M52 96 L48 150 M70 96 L76 150" stroke="${pack ? "#f1f2f5" : "#1b2a5a"}" stroke-width="10" stroke-linecap="round"/>
      <circle cx="${pack ? 50 : 60}" cy="${pack ? 72 : 88}" r="7" fill="#ff5c6c"/><text x="${pack ? 50 : 60}" y="${pack ? 76 : 92}" font-size="9" text-anchor="middle" fill="#fff">●</text>
      <path d="M10 160 L110 160" stroke="#888"/></svg>`;
  const e = document.createElement("div"); e.id = "explainer";
  e.innerHTML = `<div class="ex">
    <h1>🦘 Why can't astronauts jump 6× higher on the Moon?</h1>
    <div class="excard"><h3>The idea everyone has</h3>
      <p>The Moon's gravity is about <b>1/6</b> of Earth's. If you push off just as hard, you should fly <b>6× higher</b>. A 0.5 m jump on Earth would become a <b>3 m</b> jump on the Moon!</p></div>
    <div class="excard"><h3>1. The suit and backpack are HEAVY 🎒</h3>
      <p>The Apollo spacesuit plus its life-support backpack (the PLSS) weighed about <b>90 kg</b> on Earth. Astronaut + suit ≈ <b>165 kg</b>, more than double the body alone.</p>
      <p>On the Moon all that only <i>weighs</i> like 27 kg, but your legs still have to <b>speed up the whole 165 kg</b> to jump. Mass (inertia) doesn't change with gravity, so the same leg push gives a much slower take-off.</p></div>
    <div class="excard"><h3>2. The suit is a stiff balloon 🎈</h3>
      <p>The suit is pumped full of oxygen (about 0.26 atmosphere) to keep you alive. Bending your knees and hips means squashing that balloon, so you <b>can't crouch down</b> to spring up. No deep crouch, no big jump.</p></div>
    <div class="excard"><h3>3. Your balance point (center of mass) moves ⚖️</h3>
      <div class="exrow"><div>${fig(false)}<p class="cap">Normal: center of mass near the hips</p></div><div>${fig(true)}<p class="cap">With backpack: higher and further BACK</p></div></div>
      <p>The backpack sits high on your back, so your center of mass (🔴) moves <b>up and backward</b>. To avoid tipping over, astronauts had to <b>lean forward</b>. Jump straight up and you'd topple backward!</p>
      <p><b>Try it on Earth:</b> put a heavy backpack high on your shoulders and jump. You jump lower and wobble. The same thing happens on the Moon.</p></div>
    <div class="excard"><h3>The real result 📏</h3>
      ${bar("Jump on Earth", 0.5, "#4da3ff")}${bar("Moon, if nothing else changed (6×)", 3.0, "#ffb547")}${bar("Moon, in a real spacesuit", 0.4, "#3ecf8e")}
      <p>Real Moon jumps were usually <b>less than half a meter</b>. That's why astronauts used a <b>"bunny hop"</b>: little two-footed hops were the easiest way to move in the stiff suit!</p></div>
    <div class="actions"><button class="btn go big" onclick="document.getElementById('explainer').remove()">⬅ Back to the Moon</button></div>
  </div>`;
  document.body.appendChild(e);
}
function doFlag() { flight.sf.flag = true; sfx.clunk(); kickDust(LM_X + 130, 5); nextSurfaceChoices(); say("thrust", "The flag has a rod along the top. With no air, there's no wind to hold it out! 🇺🇸", 6000); }
function doBay() { const sf = flight.sf; sf.bayOpening = true; sf.task = true; surfaceButtons([]); sfx.clunk(); say("crater", "Opening the cargo bay in the descent stage. Everything we need is packed in here! 📦", 5000); }
// Rover: lowered by hand from the bay, then unfolded and set up (like the real Apollo 15-17 rovers)
function roverStep(kind) {
  const sf = flight.sf;
  if (kind === "lower" && outCrew().length < 2) { sfx.nope(); return say("crater", "It takes TWO! On Apollo, one astronaut pulled a strap on each side to lower the rover. Bring the other astronaut out first! 👨‍🚀👩‍🚀", 8000); }
  sf.task = true; surfaceButtons([]); sfx.clunk();
  if (kind === "lower") {
    sf.rover = { x: LM_X + 100, rot: -1.4, wheels: 0, seats: false, stage: "lowering" };
    outCrew().forEach((c, i) => { c.tx = i ? LM_X + 160 : LM_X + 52; c.walking = true; });
    say("thrust", "The rover rides folded up on the side of the descent stage. We pull the straps and it swings down slowly. 🪢", 7000);
  } else if (kind === "wheels") { sf.rover.stage = "unfolding"; say("rocket", "Click! The wheels flip out and lock. Each wheel has its own little electric motor. 🛞", 6000); }
  else { sf.rover.stage = "seating"; say("crater", "Seats up, antenna up, TV camera on. Our moon buggy is ready! 🚙", 6000); }
}
function doExperiments() {
  const sf = flight.sf; sf.expsDone = true; sfx.add();
  state.science.forEach((id, i) => { if (["seismo", "spectro", "camera"].includes(id)) sf.exps.push({ id, x: LM_X - 150 - i * 34 }); });
  nextSurfaceChoices(); say("rocket", "Experiments set up! They kept sending data to Earth for years. 🧪", 6000);
}
// Laser Ranging RetroReflector (Apollo 11, 14, 15): mirrors that bounce a laser straight back to Earth
function doReflector() {
  const sf = flight.sf; sf.reflector = { x: LM_X - 110, t: 0 }; sf.task = true; flight.reflector = true; surfaceButtons([]); sfx.add();
  say("thrust", "This panel has 100 special mirrors. Shine a laser at it from Earth and the light bounces straight back! 🔦", 7000);
}
function drawReflector(ctx, dt) {
  const sf = flight.sf, r = sf.reflector; if (!r) return;
  // the panel on its stand, tilted toward Earth
  ctx.save(); ctx.translate(r.x, GROUND + 2);
  ctx.strokeStyle = "#c9ccd3"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-4, -10); ctx.moveTo(10, 0); ctx.lineTo(4, -10); ctx.stroke(); ctx.lineWidth = 1;
  ctx.rotate(-0.5); ctx.fillStyle = "#8d929c"; ctx.fillRect(-16, -26, 32, 18);
  ctx.fillStyle = "#1c2a4a"; for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(-12 + i * 6, -22 + j * 5.5, 2.2, 0, 7); ctx.fill(); }
  ctx.restore();
  if (r.t === undefined || r.t > 99) return;
  r.t += dt;
  const [ex, ey] = [130, 70], [rx, ry] = [r.x, GROUND - 18], T = 2.5;          // shown at real speed: 2.5 s round trip
  const beam = (a, b, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineWidth = 1; };
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  ctx.font = "13px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#ff6b6b";
  if (r.t > 1.2) {
    const k = r.t - 1.2;
    if (k < T / 2) { beam([ex, ey], lerp([ex, ey], [rx, ry], k / (T / 2)), "#ff3b3b"); ctx.fillText(`🔴 Laser from an observatory on Earth… ${k.toFixed(1)} s`, 170, 120); }
    else if (k < T) { beam(lerp([rx, ry], [ex, ey], (k - T / 2) / (T / 2)), [rx, ry], "#ff3b3b"); ctx.fillText(`↩️ …bounces straight back to Earth… ${k.toFixed(1)} s`, 170, 120); }
    else if (k < T + 5) {
      ctx.fillStyle = "#fff"; ctx.fillText("⏱️ Round trip: about 2.5 seconds  →  distance = speed of light × time ÷ 2", 170, 120);
      ctx.fillText("📏 Accurate to a few millimetres! It shows the Moon drifts away 3.8 cm every year.", 170, 140);
      if (!r.told) { r.told = true; sfx.chime(); }
    } else { r.t = 100; sf.task = false; nextSurfaceChoices(); say("rocket", "Scientists still bounce lasers off the Apollo reflectors today, over 55 years later! 🔦", 7000); }
  }
}
// Radio call to Earth: the signal takes ~1.3 s each way (speed of light)
function doRadio() {
  const sf = flight.sf; if (sf.radio) return;
  sf.radio = { t: 0 }; sf.radioDone = true; sf.task = true; surfaceButtons([]);
  sfx.quindar && sfx.quindar();
  sfx.say("Houston, Tranquility Base. We are on the surface and everything looks great.", { interrupt: true });
}
function drawRadio(ctx, dt) {
  const sf = flight.sf, r = sf.radio; if (!r) return;
  r.t += dt;
  const [ax, ay] = DISH(), [ex, ey] = [130, 70];
  const dot = (k, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2; for (let j = 0; j < 3; j++) { const q = Math.max(0, Math.min(1, k - j * 0.05)); const px = ax + (ex - ax) * q, py = ay + (ey - ay) * q; ctx.beginPath(); ctx.arc(px, py, 6 + j * 3, -2.4, -0.7); ctx.stroke(); } ctx.lineWidth = 1; };
  ctx.font = "13px system-ui"; ctx.textAlign = "left";
  const up = 2.6, wait = 1.0;                                   // 1.3 s light time, slowed ×2 to see it
  if (r.t < up) { dot(r.t / up, "#7fd3ff"); ctx.fillStyle = "#7fd3ff"; ctx.fillText("📡 Moon → Earth: 1.3 seconds at the speed of light", 170, 120); }
  else if (r.t < up + wait) { ctx.fillStyle = "#cfd8ee"; ctx.fillText("🌍 Houston hears us and answers…", 170, 120); if (!r.heard) { r.heard = true; } }
  else if (r.t < up * 2 + wait) { dot(1 - (r.t - up - wait) / up, "#ffd27a"); ctx.fillStyle = "#ffd27a"; ctx.fillText("📻 Earth → Moon: another 1.3 seconds", 170, 120);
    if (!r.reply) { r.reply = true; sfx.quindar && sfx.quindar(); sfx.say("Roger, Tranquility. We copy you on the ground. You've got a bunch of guys about to turn blue.", { pitch: 1.15, interrupt: true }); } }
  else if (!r.done) { r.done = true; sf.radio = null; sf.task = false; nextSurfaceChoices(); say("rocket", "Every radio chat had a 2.6-second round-trip delay. That's how far away the Moon is! 📡", 7000);
    askBox("askRadio", "My radio can't even reach the next town. How does Moon radio reach Earth?", openRadioExplainer, "14%"); }
}
// ---------- EXPLORE (top-down map): walk each astronaut anywhere, drive the rover ----------
// Arrow keys / buttons move whoever is selected. Astronauts walk in all directions.
// The rover needs a driver (1 or 2 can ride). To pick up a rock you must be ON FOOT.
const LMP = [450, 210];
function startExplore() {
  const sf = flight.sf, outs = outCrew();
  const ex = sf.ex || (sf.ex = { prints: [], tracks: [], dust: [], rover: sf.rover && sf.rover.stage === "ready" ? { x: 540, y: 250, ang: -Math.PI / 2, v: 0, riders: [] } : null, units: {} });
  if (!ex.rover && sf.rover && sf.rover.stage === "ready") ex.rover = { x: 540, y: 250, ang: -Math.PI / 2, v: 0, riders: [] };
  sf.crew.forEach((c, i) => { if (!ex.units[c.id]) ex.units[c.id] = { x: LMP[0] + 30 + i * 22, y: LMP[1] + 34, ang: 0, walk: 0, inRover: false }; });
  ex.sel = outs[0].id; ex.btnKey = "";
  sf.exploring = true; flight.keys = {}; clearAskBoxes(); $("askJump") && $("askJump").remove();
  title("🗺️ Exploring: seen from above");
  say("rocket", "Pick who to move, then use the arrow keys or buttons. Walk anywhere! Find rocks 🪨 and bring everyone back to the lander when done.", 8000);
  if (ex.rover && !ex.toldTire) { ex.toldTire = true; askBox("askTire", "What if a rover tire gets a puncture?", openTireExplainer, "45%"); }
  exploreButtons(true);
}
function exSel(id) { const ex = flight.sf.ex; ex.sel = id; flight.keys = {}; sfx.click(); exploreButtons(true); }
function exNear(ex) {                                    // what can the selected unit do here?
  const sf = flight.sf, r = ex.rover;
  if (ex.sel === "rover") return { rock: sf.rocks.findIndex((k) => !k.got && Math.hypot(k.x - r.x, k.y - r.y) < 34), rover: false };
  const u = ex.units[ex.sel];
  return { rock: sf.rocks.findIndex((k) => !k.got && Math.hypot(k.x - u.x, k.y - u.y) < 22), rover: r && r.riders.length < 2 && Math.hypot(r.x - u.x, r.y - u.y) < 34 };
}
function exploreButtons(force) {
  const sf = flight.sf, ex = sf.ex, n = exNear(ex), r = ex.rover;
  const key = [ex.sel, n.rock >= 0, n.rover, r && r.riders.join()].join("|");
  if (!force && key === ex.btnKey) return; ex.btnKey = key;
  const B = [];
  outCrew().forEach((c) => { const u = ex.units[c.id]; if (!u.inRover) B.push([`${ex.sel === c.id ? "▶ " : ""}🧑‍🚀 ${c.first}`, `exSel('${c.id}')`, ex.sel === c.id ? "" : "ghost"]); });
  if (r) B.push([`${ex.sel === "rover" ? "▶ " : ""}🚙 Rover (${r.riders.length} aboard)`, "exSel('rover')", ex.sel === "rover" ? "" : "ghost"]);
  B.push(["⬅️", "hold:left", "ghost"], ["⬆️", "hold:up", "ghost"], ["⬇️", "hold:down", "ghost"], ["➡️", "hold:right", "ghost"]);
  if (ex.sel !== "rover" && n.rock >= 0) B.push(["🪨 Pick up this rock", "exPick()"]);
  if (ex.sel !== "rover" && n.rover) B.push(["🚙 Get in the rover", "exBoard()"]);
  if (ex.sel === "rover") r.riders.forEach((id) => B.push([`🚶 ${crewBy(id).first} steps out`, `exLeave('${id}')`, "ghost"]));
  B.push(["🏁 Back to the lander", "endExplore()", "ghost"]);
  surfaceButtons(B);
}
function exPick() {
  const sf = flight.sf, ex = sf.ex, n = exNear(ex); if (n.rock < 0) return;
  if (!state.science.includes("rocks")) { sfx.nope(); return say("crater", "No rock box packed, so we can't bring samples home! Add one in the build screen next time. 🪨", 6000); }
  const k = sf.rocks[n.rock]; k.got = true; sf.rocksGot++; flight.rocks = sf.rocksGot; sfx.add();
  say("rocket", `${crewBy(ex.sel).first} grabbed a ${k.kind} sample with the long tongs! ${sf.rocksGot} rock${sf.rocksGot > 1 ? "s" : ""} in the box. 🪨`, 5000);
  exploreButtons(true);
}
function exBoard() {
  const ex = flight.sf.ex, u = ex.units[ex.sel]; u.inRover = true; ex.rover.riders.push(ex.sel); sfx.clunk();
  ex.sel = "rover"; flight.keys = {};
  if (ex.rover.riders.length === 1) say("thrust", "Seatbelt on! In low gravity the rover bounces a lot. Top speed: about 13 km/h. 🚙", 6000);
  exploreButtons(true);
}
function exLeave(id) {
  const ex = flight.sf.ex, r = ex.rover, u = ex.units[id];
  r.riders = r.riders.filter((q) => q !== id); u.inRover = false;
  const side = r.riders.length ? -1 : 1;
  u.x = r.x + Math.cos(r.ang + Math.PI / 2 * side) * 26; u.y = r.y + Math.sin(r.ang + Math.PI / 2 * side) * 26;
  ex.sel = id; r.v = 0; sfx.click(); exploreButtons(true);
}
function endExplore() {
  const sf = flight.sf, ex = sf.ex;
  const far = outCrew().filter((c) => { const u = ex.units[c.id]; return u.inRover || Math.hypot(u.x - LMP[0], u.y - LMP[1]) > 90; });
  if (far.length) { sfx.nope(); return say("thrust", `${far.map((c) => c.first).join(" and ")} must WALK back next to the lander first (step out of the rover)! ⬅️`, 6000); }
  sf.exploring = false; flight.keys = {}; title("🌙 On the Moon!");
  if (sf.rover) sf.rover.x = LM_X + 260;
  nextSurfaceChoices();
}
document.addEventListener("keydown", (e) => {
  if (!flight || !flight.sf || !flight.sf.exploring) return;
  const k = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", KeyA: "left", KeyD: "right", KeyW: "up", KeyS: "down" }[e.code];
  if (k) { flight.keys[k] = true; e.preventDefault(); }
});
document.addEventListener("keyup", (e) => {
  if (!flight || !flight.keys) return;
  const k = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", KeyA: "left", KeyD: "right", KeyW: "up", KeyS: "down" }[e.code];
  if (k) flight.keys[k] = false;
});
// Apollo boot print seen from above (ridged overshoe sole)
function bootPrint(ctx, x, y, ang, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.fillStyle = "#7d828d"; roundRect(ctx, -5, -2.4, 10, 4.8, 2); ctx.fill();
  ctx.fillStyle = "#6a6f7a"; for (let i = -4; i <= 3; i += 1.6) ctx.fillRect(i, -2.2, 0.7, 4.4);
  ctx.restore();
}
function drawExplore(ctx, dt) {
  const sf = flight.sf, ex = sf.ex, K = flight.keys || {}, r = ex.rover;
  // --- movement ---
  if (ex.sel === "rover" && r) {
    if (!r.riders.length) { if (K.up || K.down) { if (!ex.noDriver) { ex.noDriver = true; sfx.nope(); say("crater", "Nobody's driving! An astronaut has to get in first. 🚙", 5000); } } }
    else {
      const acc = K.up ? 40 : K.down ? -30 : -Math.sign(r.v) * 25;
      r.v = Math.max(-25, Math.min(60, r.v + acc * dt)); if (!K.up && !K.down && Math.abs(r.v) < 2) r.v = 0;
      if (K.left) r.ang -= 1.9 * dt * Math.sign(r.v || 1);
      if (K.right) r.ang += 1.9 * dt * Math.sign(r.v || 1);
      r.x = Math.max(20, Math.min(W - 20, r.x + Math.cos(r.ang) * r.v * dt));
      r.y = Math.max(20, Math.min(H - 20, r.y + Math.sin(r.ang) * r.v * dt));
      if (Math.abs(r.v) > 3) {
        ex.tracks.push([r.x, r.y, r.ang]); if (ex.tracks.length > 1200) ex.tracks.shift();
        for (let i = 0; i < 2; i++) ex.dust.push({ x: r.x - Math.cos(r.ang) * 14, y: r.y - Math.sin(r.ang) * 14, vx: -Math.cos(r.ang + (Math.random() - .5)) * 40, vy: -Math.sin(r.ang + (Math.random() - .5)) * 40, life: 0.8 });
      }
    }
  } else if (ex.units[ex.sel]) {
    const u = ex.units[ex.sel], vx = (K.right ? 1 : 0) - (K.left ? 1 : 0), vy = (K.down ? 1 : 0) - (K.up ? 1 : 0);
    if (vx || vy) {
      const L = Math.hypot(vx, vy), sp = 26;                        // bunny-hop pace
      u.ang = Math.atan2(vy, vx); u.x = Math.max(12, Math.min(W - 12, u.x + vx / L * sp * dt)); u.y = Math.max(12, Math.min(H - 12, u.y + vy / L * sp * dt));
      u.walk += dt * 8; u.dist = (u.dist || 0) + sp * dt;
      if (u.dist > 7) { u.dist = 0; u.foot = -(u.foot || 1); ex.prints.push([u.x + Math.cos(u.ang + Math.PI / 2) * 2.5 * u.foot, u.y + Math.sin(u.ang + Math.PI / 2) * 2.5 * u.foot, u.ang]); if (ex.prints.length > 1500) ex.prints.shift(); }
    }
  }
  exploreButtons(false);
  // --- map ---
  ctx.fillStyle = "#9da2ad"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) { ctx.fillStyle = i % 2 ? "#8f949f" : "#a9aeb8"; ctx.fillRect((i * 137) % W, (i * 71) % H, 3, 3); }
  [[150, 110, 40], [720, 320, 60], [640, 90, 28], [230, 330, 34]].forEach(([x, y, rr]) => {
    ctx.fillStyle = "#858a95"; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); ctx.strokeStyle = "#b5b9c2"; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 1;
  });
  ctx.fillStyle = "#7b808b"; ex.tracks.forEach(([x, y, a]) => { const ox = Math.cos(a + Math.PI / 2) * 7, oy = Math.sin(a + Math.PI / 2) * 7; ctx.fillRect(x + ox, y + oy, 2, 2); ctx.fillRect(x - ox, y - oy, 2, 2); });
  ex.prints.forEach(([x, y, a]) => bootPrint(ctx, x, y, a, 0.8));
  // lander from above
  ctx.save(); ctx.translate(LMP[0], LMP[1]);
  ctx.strokeStyle = "#c9ccd3"; ctx.lineWidth = 3; [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(a * 26, b * 26); ctx.stroke(); ctx.beginPath(); ctx.arc(a * 26, b * 26, 4, 0, 7); ctx.fillStyle = "#c9ccd3"; ctx.fill(); });
  ctx.lineWidth = 1; ctx.fillStyle = isApollo() ? "#d9a62e" : "#c9ced8"; ctx.fillRect(-16, -16, 32, 32); ctx.fillStyle = "#b9bec9"; ctx.fillRect(-10, -10, 20, 20);
  ctx.restore();
  ctx.font = "12px system-ui"; ctx.fillStyle = "#1b1f27"; ctx.textAlign = "center"; ctx.fillText("Lunar module", LMP[0], LMP[1] - 34);
  if (sf.flag) { ctx.fillStyle = "#b22234"; ctx.fillRect(LMP[0] + 40, LMP[1] - 6, 10, 6); ctx.fillStyle = "#ddd"; ctx.fillRect(LMP[0] + 39, LMP[1] - 6, 1.5, 10); }
  if (sf.reflector) { ctx.fillStyle = "#1c2a4a"; ctx.fillRect(LMP[0] - 52, LMP[1] - 4, 10, 7); }
  // rocks
  sf.rocks.forEach((k, i) => {
    if (k.got) return;
    ctx.fillStyle = "#5d616b"; ctx.beginPath(); ctx.ellipse(k.x, k.y, 7, 5, 0.4, 0, 7); ctx.fill();
    if (Math.floor(flight.pt * 3 + i) % 3 === 0) { ctx.fillStyle = "#fff"; ctx.fillRect(k.x + 3, k.y - 4, 2, 2); }
  });
  const n = exNear(ex);
  if (n.rock >= 0) {
    const k = sf.rocks[n.rock]; ctx.strokeStyle = "#ffd27a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(k.x, k.y, 14, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = "#1b1f27"; ctx.textAlign = "center"; ctx.fillText(ex.sel === "rover" ? `${k.kind}: step out to pick it up!` : k.kind, k.x, k.y - 18);
  }
  ex.dust.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }); ex.dust = ex.dust.filter((p) => p.life > 0);
  ctx.fillStyle = "#d4d7de"; ex.dust.forEach((p) => ctx.fillRect(p.x, p.y, 2, 2));
  // rover
  if (r) {
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.ang);
    ctx.fillStyle = "#2f3238"; [[-12, -11], [12, -11], [-12, 11], [12, 11]].forEach(([wx, wy]) => ctx.fillRect(wx - 5, wy - 3, 10, 6));
    ctx.fillStyle = "#c9a227"; [[-12, -11], [12, -11], [-12, 11], [12, 11]].forEach(([wx, wy]) => ctx.fillRect(wx - 6, wy + (wy < 0 ? -5 : 3), 12, 2));
    ctx.fillStyle = "#b9bdc6"; ctx.fillRect(-18, -8, 36, 16);
    [-4, 4].forEach((sy, i) => { ctx.fillStyle = r.riders[i] ? "#f4f4f4" : "#6b7280"; ctx.beginPath(); ctx.arc(-2, sy, 4.5, 0, 7); ctx.fill(); if (r.riders[i]) { ctx.fillStyle = "#d9a62e"; ctx.beginPath(); ctx.arc(0, sy, 2.2, 0, 7); ctx.fill(); } });
    ctx.fillStyle = "#e8e8e8"; ctx.beginPath(); ctx.arc(14, 0, 5, 0, 7); ctx.fill();
    ctx.restore();
    if (ex.sel === "rover") { ctx.strokeStyle = "#ffd27a"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(r.x, r.y, 26, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }
  // astronauts on foot (from above: backpack, helmet with gold visor)
  outCrew().forEach((c, i) => {
    const u = ex.units[c.id]; if (u.inRover) return;
    ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.ang);
    const st = Math.sin(u.walk) * 3;
    ctx.fillStyle = "#e6e8ee"; ctx.fillRect(-1 + st, -5, 4, 3); ctx.fillRect(-1 - st, 2, 4, 3);       // boots
    ctx.fillStyle = "#d5d9e0"; ctx.fillRect(-9, -5, 5, 10);                                              // backpack
    ctx.fillStyle = "#f6f7f9"; ctx.beginPath(); ctx.ellipse(0, 0, 5, 7, 0, 0, 7); ctx.fill();             // shoulders
    ctx.fillStyle = "#f6f7f9"; ctx.beginPath(); ctx.arc(1, 0, 4, 0, 7); ctx.fill();
    ctx.fillStyle = "#c8901e"; ctx.beginPath(); ctx.arc(2, 0, 3, -1.2, 1.2); ctx.fill();
    if (c.cdr) { ctx.fillStyle = "#c0392b"; ctx.fillRect(-3, -7, 3, 1.5); }
    ctx.restore();
    ctx.font = "bold 11px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = ex.sel === c.id ? "#7a4d00" : "#1b1f27"; ctx.fillText(c.first, u.x, u.y + 18);
    if (ex.sel === c.id) { ctx.strokeStyle = "#ffd27a"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(u.x, u.y, 14, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  });
  // readouts
  ctx.font = "bold 15px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#1b1f27";
  if (ex.sel === "rover" && r) {
    const dist = Math.hypot(r.x - LMP[0], r.y - LMP[1]) * 5;            // map: 1 px ≈ 5 m
    speedPanel(ctx, Math.abs(r.v) / 60 * 13 / 3600, dt);
    ctx.fillText(`🚙 ${(Math.abs(r.v) / 60 * 13).toFixed(1)} km/h   📍 ${(dist / 1000).toFixed(1)} km from the lander   🪨 ${sf.rocksGot} rocks`, 16, 26);
    if (dist > 1600) { ctx.fillStyle = "#b22234"; ctx.fillText("⚠️ Far out! Apollo crews never drove farther than they could WALK back if the rover broke.", 16, 48); }
  } else {
    const u = ex.units[ex.sel], dist = Math.hypot(u.x - LMP[0], u.y - LMP[1]) * 5;
    ctx.fillText(`🧑‍🚀 ${crewBy(ex.sel).first} on foot · 📍 ${dist.toFixed(0)} m from the lander · 🪨 ${sf.rocksGot} rocks · 👣 footprints stay for millions of years`, 16, 26);
  }
}

// ---------- the surface phase ----------
function phSurface(ctx, dt) {
  const f = flight, sf = f.sf, t = f.pt;
  if (sf.zoom) return drawInsideLM(ctx, dt);
  if (sf.exploring) return drawExplore(ctx, dt);
  moonGround(ctx); drawPrints(ctx);
  sf.exps.forEach((e) => { ctx.font = "22px system-ui"; ctx.textAlign = "center"; ctx.fillText(byId(SCIENCE, e.id).ico, e.x, GROUND + 4); });
  sf.items.forEach((e) => { ctx.font = "18px system-ui"; ctx.textAlign = "center"; ctx.fillText(e.ico, e.x, GROUND + 6); });
  const flagX = LM_X + 130;
  if (sf.flag) {
    const blast = sf.step === "liftoff" && sf.lt > 0.8 ? Math.max(0, 1 - (sf.lt - 0.8) / 2.5) : 0;
    sf.flagTilt = Math.min(0.5, (sf.flagTilt || 0) + blast * dt * 0.4);
    drawUSFlag(ctx, flagX, GROUND + 2, blast * 6, sf.flagTilt);
  }
  // 1) descent
  if (sf.step === "descent") {
    const y = Math.min(GROUND, 30 + t * 85);
    if (y < GROUND) { flame(ctx, LM_X, y - 34, 14); if (y > GROUND - 120) kickDust(LM_X + (Math.random() - .5) * 40, 4, 2.5); }
    drawLMFront(ctx, LM_X, y, "both", 0);
    speedPanel(ctx, Math.max(0, (GROUND - y) / (GROUND - 30)) * 0.15, dt);
    if (y >= GROUND) {
      sf.step = "landed"; sfx.win(); label("🦶 Touchdown! “The Eagle has landed.”", 160);
      const ld = state.launchDay;
      if (ld && ld.sun === "caution") setTimeout(() => say("thrust", ld.sunElev > 20 ? "Phew! With the Sun so high, the shadows were tiny and we nearly hit a boulder we couldn't see! ☀️" : "Phew! It was so dark in the long shadows we could hardly see the ground! 🌒", 7000), 2500);
      sfx.say("Houston, Tranquility Base here. The Eagle has landed.", { interrupt: true });
      title("🌙 On the Moon!"); setTimeout(nextSurfaceChoices, 1500);
    }
  } else if (sf.step !== "liftoff") {
    if (sf.hatchOpening) { sf.hatch = Math.min(1, sf.hatch + dt); if (sf.hatch >= 1) { sf.hatchOpening = false; sf.step = "out"; nextSurfaceChoices(); } }
    if (sf.bayOpening) { sf.bay = Math.min(1, sf.bay + dt * 0.8); if (sf.bay >= 1) { sf.bayOpening = false; sf.task = false; label("📦 Bay open: rover and experiments inside!", 110); nextSurfaceChoices(); } }
    drawLMFront(ctx, LM_X, GROUND, "both", sf.hatch);
  }
  // rover: lowered from the bay BY HAND, wheels unfold, then seats + antenna go up
  if (sf.rover && sf.step !== "liftoff") {
    const r = sf.rover;
    if (r.stage === "lowering") { r.rot = Math.min(0, r.rot + dt * 0.55); if (r.rot >= 0) { r.stage = "lowered"; sf.task = false; sfx.clunk(); label("🪢 Rover lowered to the ground (still folded)", 100); nextSurfaceChoices(); } }
    if (r.stage === "unfolding") { r.wheels = Math.min(1, r.wheels + dt * 0.6); if (r.wheels >= 1) { r.stage = "wheels"; sf.task = false; sfx.clunk(); nextSurfaceChoices(); } }
    if (r.stage === "seating") { r.seatK = Math.min(1, (r.seatK || 0) + dt * 0.6); if (r.seatK >= 1) { r.stage = "ready"; r.ready = true; sf.task = false; sfx.chime(); label("🚙 Rover ready! Tap Explore to drive it", 120);
      askBox("askTire", "What if a rover tire gets a puncture?", openTireExplainer, "62%"); nextSurfaceChoices(); } }
    drawRover(ctx, r.x, GROUND + 2, { rot: r.rot, wheels: r.wheels, seats: r.seatK || 0 });
    if (r.stage !== "ready") { ctx.strokeStyle = "#ffd27a"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(r.x - 30, GROUND - 30); ctx.lineTo(LM_X + 50, GROUND - 80); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = "12px system-ui"; ctx.fillStyle = "#ffd27a"; ctx.textAlign = "center"; ctx.fillText({ lowering: "🪢 lowering on straps…", lowered: "folded rover", unfolding: "🛞 wheels unfolding…", wheels: "wheels locked", seating: "💺 seats + antenna…" }[r.stage] || "", r.x, GROUND - 58); }
  }
  drawReflector(ctx, dt);
  // the two moonwalkers: each one is moved separately
  if (sf.step !== "liftoff") sf.crew.forEach((c) => {
    if (c.where === "ladder") {
      c.ay = Math.max(0, Math.min(112, c.ay + c.dir * dt * 32));
      if (c.dir < 0 && c.ay <= 0) {
        c.where = "out"; c.x = LM_X + 4; c.tx = spotFor(c); c.walking = true; sf.prints.push([LM_X + 6]); kickDust(LM_X, 10);
        if (!sf.stepped) {
          sf.stepped = true; sf.tvT = 0; sf.printZoom = 0;
          sfx.say("That's one small step for man, one giant leap for mankind.", { rate: 0.95, interrupt: true });
          label(`👣 ${c.first}: first step on the Moon!`, 150);
        } else label(`👣 ${c.first} is on the Moon too!`, 110);
      }
      if (c.dir > 0 && c.ay >= 112) {
        c.where = "in"; sfx.clunk();
        if (sf.crew.every((q) => q.where === "in")) { sf.step = "inside"; sf.rec = false; clearAskBoxes(); $("askJump") && $("askJump").remove(); zoomShoes("off"); }
        else { nextSurfaceChoices(); say("thrust", `${c.first} is back inside. Don't forget your crewmate! 🪜`, 4000); }
      }
    }
    if (c.walking) {
      const d = c.tx - c.x;
      if (Math.abs(d) < 1.5) { c.walking = false; c.x = c.tx; c.flip = false; if (c.then === "up") { c.then = null; c.where = "ladder"; c.dir = 1; c.ay = 0; } else nextSurfaceChoices(); }
      else { c.x += Math.sign(d) * Math.min(Math.abs(d), dt * 40); c.walkPh += dt * 8; c.flip = d < 0; if (Math.random() < 0.18) { sf.prints.push([c.x]); kickDust(c.x, 2); } }
    }
  });
  if (sf.jumpV !== undefined) {
    const j = crewBy(sf.jumper) || actor();
    sf.jumpV -= 60 * dt; sf.jumpH += sf.jumpV * dt;
    if (sf.jumpH <= 0) { sf.jumpH = 0; sf.jumpV = undefined; if (j) { kickDust(j.x, 8); sf.prints.push([j.x]); } }
  }
  if (sf.step !== "liftoff") sf.crew.forEach((c) => {
    if (c.where === "in") return;
    const onL = c.where === "ladder", jh = sf.jumper === c.id ? (sf.jumpH || 0) : 0, x = onL ? ladderX(c.ay) : c.x;
    drawAstronaut(ctx, x, GROUND - (onL ? c.ay : 0) - jh, { cdr: c.cdr, covers: sf.covers, walk: c.walking ? c.walkPh : 0, flip: !onL && c.flip });
    ctx.font = "bold 11px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#ffd27a"; ctx.fillText(c.first, x, GROUND + 20);
    if (jh > 0) { ctx.font = "12px system-ui"; ctx.fillStyle = "#fff"; ctx.fillText(`hop ≈ ${(jh / 25).toFixed(1)} m`, x, GROUND - 98 - jh); }
  });
  // 3) liftoff
  if (sf.step === "liftoff") {
    sf.lt += dt;
    const whole = !isApollo();
    if (!whole) drawLMFront(ctx, LM_X, GROUND, "descent", 0, false);
    const ya = GROUND - Math.max(0, sf.lt - 0.8) ** 2 * 40;
    if (sf.lt > 0.8) {
      flame(ctx, LM_X, ya - (whole ? 34 : 98), 12);
      if (sf.lt < 2.2) for (let i = 0; i < 6; i++) sf.dust.push({ x: LM_X + (Math.random() - .5) * 30, h: 1, vx: (Math.random() < .5 ? -1 : 1) * (100 + Math.random() * 220), vh: 20 + Math.random() * 70, life: 3 });
      if (!sf.fired) { sf.fired = true; sfx.sep(); sfx.burnStart();
        label(whole ? "🚀 Our one-piece lander lifts off: ALL of it!" : "🚀 Ascent stage lifts off! The descent stage stays behind", 150);
        if (whole) setTimeout(() => say("crater", "Our own design carries its legs, big tank and empty fuel all the way back up. Apollo left the descent stage on the Moon to save fuel. That's staging! 🧩", 9000), 1200);
        sfx.say("Lift off from the Moon.", { interrupt: true });
        if (sf.flag) setTimeout(() => say("rocket", "Look! The engine blast whips the flag and sprays lunar soil. On Apollo 11 it knocked the flag over! 🇺🇸", 6000), 900); }
    }
    drawLMFront(ctx, LM_X, ya, whole ? "both" : "ascent", 0, false);
    if (!whole && sf.lt > 1.6 && !sf.toldPad) { sf.toldPad = true; }
    speedPanel(ctx, Math.max(0, sf.lt - 0.8) * 0.4, dt);
    if (sf.lt > 4.5) { sfx.burnStop(); if (whole) startReturn(); else { setPhase("rdv"); title("🔗 Meeting the command module in orbit"); } }
  }
  updDust(ctx, dt);
  if (sf.radio) drawRadio(ctx, dt);
  if (sf.printZoom !== undefined && sf.printZoom < 7) footprintZoom(ctx, dt);
  if (sf.step === "out" && !sf.stepped) {      // point out the ladder on the leg
    ctx.font = "bold 13px system-ui"; ctx.fillStyle = "#ffd27a"; ctx.textAlign = "left";
    ctx.fillText("🪜 the ladder is on the FRONT LEG", LM_X + 40, GROUND - 40);
    ctx.strokeStyle = "#ffd27a"; ctx.beginPath(); ctx.moveTo(LM_X + 38, GROUND - 44); ctx.lineTo(LM_X - 8, GROUND - 40); ctx.stroke();
  }
  // 🔍 zoom in on the TV camera when it starts recording
  if (sf.camZoom !== undefined && sf.camZoom < 5) {
    sf.camZoom += dt;
    const camX = LM_X - 66.7, camY = GROUND - 30.7, cx = LM_X - 210, cy = GROUND - 175, R = 66;
    const a = Math.min(1, sf.camZoom * 2);
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = "#ffd27a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(camX, camY); ctx.lineTo(cx + R * 0.7, cy + R * 0.7); ctx.stroke();
    ctx.fillStyle = "#0b1020"; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, 7); ctx.clip();
    ctx.fillStyle = "#d9a62e"; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);                    // gold foil behind
    ctx.fillStyle = "#c9ccd3"; ctx.fillRect(cx - R, cy + 14, 2 * R, 10);                      // leg strut
    ctx.fillStyle = "#2b2e35"; ctx.fillRect(cx - 34, cy - 22, 52, 36);                        // camera body
    ctx.fillStyle = "#4a4e57"; ctx.fillRect(cx - 34, cy - 22, 52, 6);
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(cx + 30, cy - 4, 14, 0, 7); ctx.fill();   // lens
    ctx.fillStyle = "#3b5fae"; ctx.beginPath(); ctx.arc(cx + 30, cy - 4, 8, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffffff88"; ctx.beginPath(); ctx.arc(cx + 27, cy - 7, 3, 0, 7); ctx.fill();
    if (Math.floor(flight.pt * 3) % 2 === 0) { ctx.fillStyle = "#ff3b3b"; ctx.beginPath(); ctx.arc(cx - 26, cy - 12, 4, 0, 7); ctx.fill(); }
    ctx.font = "bold 10px system-ui"; ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText("REC", cx - 20, cy - 9);
    ctx.restore();
    ctx.font = "bold 13px system-ui"; ctx.fillStyle = "#ffd27a"; ctx.textAlign = "center";
    ctx.fillText("📹 TV camera on the lander: recording!", cx, cy + R + 18);
    ctx.restore();
  }
  // 📺 live TV from the camera on the lander's leg (black & white, like 1969)
  if (sf.rec && sf.tvT !== undefined && sf.tvT < 9) {
    sf.tvT += dt;
    const sx = (LM_X - 150) * f.scale, sy = (GROUND - 210) * f.scale, sw = 300 * f.scale, sh = 230 * f.scale;
    const dx = 16, dy = 60, dw = 220, dh = 168;
    ctx.save(); ctx.fillStyle = "#000"; ctx.fillRect(dx - 4, dy - 4, dw + 8, dh + 30);
    try { ctx.filter = "grayscale(1) contrast(1.4) brightness(1.1) blur(0.6px)"; } catch (e) {}
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage($("sky"), sx, sy, sw, sh, dx * f.scale, dy * f.scale, dw * f.scale, dh * f.scale);
    ctx.restore(); ctx.setTransform(f.scale, 0, 0, f.scale, 0, 0);
    ctx.fillStyle = "#0004"; for (let yy = dy; yy < dy + dh; yy += 3) ctx.fillRect(dx, yy, dw, 1);
    ctx.font = "bold 12px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#ff3b3b"; ctx.fillText("● LIVE", dx + 6, dy + 16);
    ctx.fillStyle = "#fff"; ctx.font = "11px system-ui"; ctx.fillText("📺 TV camera on the lander's leg → Earth", dx, dy + dh + 18);
  }
}

// ---------- rendezvous: the ascent stage docks with the CSM ----------
function phRendezvous(ctx, dt) {
  const f = flight, t = f.pt;
  drawSpace(ctx);
  ctx.fillStyle = "#9da3b0"; ctx.beginPath(); ctx.arc(450, 1080, 760, 0, 7); ctx.fill();
  const csmX = 160 + Math.min(t, 4.5) * 70, csmY = 150;
  ctx.save(); ctx.translate(csmX, csmY); ctx.scale(1.7, 1.7); drawCraftTop(ctx, 0, 0, Math.PI, false, false, false); ctx.restore();
  ctx.font = "12px system-ui"; ctx.fillStyle = "#cfd8ee"; ctx.textAlign = "center"; ctx.fillText("🔺⚙️ command + service module", csmX, csmY - 26);
  const k = Math.min(1, t / 4), dockX = csmX - 50;
  const ax = 120 + (dockX - 120) * k, ay = 340 - (340 - csmY - 22) * Math.sin(k * Math.PI / 2);
  ctx.save(); ctx.translate(ax, ay); drawLander(ctx, 0, 0, 1, true, "ascent");
  if (t < 4) { ctx.fillStyle = "#ffb547"; ctx.beginPath(); ctx.moveTo(-4, -26); ctx.lineTo(4, -26); ctx.lineTo(0, -10 + Math.random() * 6); ctx.fill(); }
  ctx.restore();
  ctx.font = "11px system-ui"; ctx.fillStyle = "#ffd27a"; ctx.textAlign = "center"; ctx.fillText("🕷️ ascent stage", ax, ay + 16);
  speedPanel(ctx, t < 4 ? 0.2 + 1.4 * k : 1.63, dt);
  engineBadge(ctx, t < 4, t < 4 ? "Ascent engine" : "");
  if (t > 4 && !f.docked) { f.docked = true; sfx.clunk(); label("🔗 Docked with the command module!", 120); sfx.say("Docking confirmed.", { interrupt: true }); }
  if (t > 5.5) startXfer("toCM");
}
