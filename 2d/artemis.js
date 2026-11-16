/* =========================================================
   ARTEMIS III (NASA plan as of 2026, target ~2027): lander docking test in LOW EARTH ORBIT
   1. Blue Origin launches the Blue Moon test lander on New Glenn (checked out ~2 weeks)
   2. SLS launches 4 astronauts in Orion
   3. Orion (the active "chaser") docks to the SIDE of Blue Moon, next to its crew cabin
   4. Up to TWO astronauts enter Blue Moon (orange Orion suits), ~2 days of tests
   5. They return to Orion, then Orion undocks
   6. SpaceX launches the Starship test lander; Orion docks NOSE-TO-NOSE
   7. Starship controls the docked stack (~1 day). Crew stays in Orion (no life support in the test vehicle)
   8. Orion undocks and splashes down off San Diego (~2 weeks after launch)
   ========================================================= */
let art = null;
const AW = 900, AH = 420;
const DOCK_SAFE = 0.15;          // m/s: max safe contact speed (real dockings are ~0.03–0.1 m/s)
const DOCK_ACC = 0.05;           // m/s² of thruster push
const TIME_X = 6;                // docking runs 6× faster than real time

function screenArtemis() {
  sfx.click(); hush();
  art = {
    step: "intro", t: 0, last: performance.now(), lives: 3, day: 1, label: "", labelT: 0,
    stars: Array.from({ length: 120 }, () => [Math.random() * AW, Math.random() * 300, Math.random()]),
    objs: {}, inBM: [], docks: [], cloud: 0, scale: 1, order: [],
  };
  $("hud").classList.add("hidden");
  $("app").innerHTML = `<div id="flightView" class="fview">
    <div class="ftop"><h2 id="aTitle">🛰️ Artemis III: lander docking test</h2><div id="aLives" class="lives"></div></div>
    <div class="fstage" id="aStage"><canvas id="aSky"></canvas></div>
    <div class="fbottom"><div class="ctrl" id="aCtrl"></div><p class="tip" id="aTip"></p></div></div>`;
  document.body.classList.add("flying");
  try { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch?.(() => {}); } catch (e) {}
  aFit(); aLives(); requestAnimationFrame(aTick);
  aButtons([["▶ Start the mission", "aStart()"]]);
  $("aTip").innerHTML = "NASA's plan for Artemis III (about 2027): <b>no Moon landing yet</b>. Instead, practise docking with BOTH Moon landers close to home, in Earth orbit.";
  say("thrust", "Before landing on the Moon again, we test the new landers in Earth orbit. Safer, and close to home! 🌍", 0);
}
function aFit() {
  const st = $("aStage"), cv = $("aSky"); if (!st || !cv || !art) return;
  const s = Math.min((st.clientWidth - 12) / AW, (st.clientHeight - 8) / AH), dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(AW * s * dpr); cv.height = Math.round(AH * s * dpr);
  cv.style.width = Math.round(AW * s) + "px"; cv.style.height = Math.round(AH * s) + "px"; art.scale = s * dpr;
}
window.addEventListener("resize", aFit);
function aLives() { if ($("aLives")) $("aLives").innerHTML = attemptsHTML(art.lives, 3); }
function aButtons(list) {
  $("aCtrl").innerHTML = list.map(([t, fn, cls]) => `<button class="btn ${cls || "go"}" ${fn.startsWith("hold:") ? `data-hold="${fn.slice(5)}"` : `onclick="${fn}"`}>${t}</button>`).join("");
  // hold-to-fire buttons (thrusters)
  $("aCtrl").querySelectorAll("[data-hold]").forEach((b) => {
    const k = b.dataset.hold, on = (e) => { e.preventDefault(); art.hold = k; sfx.burnStart(); }, off = () => { if (art.hold === k) { art.hold = null; sfx.burnStop(); } };
    b.addEventListener("mousedown", on); b.addEventListener("touchstart", on);
    b.addEventListener("mouseup", off); b.addEventListener("mouseleave", off); b.addEventListener("touchend", off);
  });
}
function aLabel(t, n = 140) { art.label = t; art.labelT = n; }
function aStep(s) { art.step = s; art.t = 0; }
document.addEventListener("keydown", (e) => {
  if (!art || !art.dock) return;
  if (e.code === "ArrowRight") { art.hold = "fwd"; e.preventDefault(); }
  if (e.code === "ArrowLeft") { art.hold = "back"; e.preventDefault(); }
});
document.addEventListener("keyup", (e) => { if (art && (e.code === "ArrowRight" || e.code === "ArrowLeft")) art.hold = null; });

// ---------- 1) launch-order quiz ----------
const A_VEH = { bm: "🔵 Blue Moon lander (on New Glenn)", or: "🟠 Orion + 4 astronauts (on SLS)", ss: "⚪ Starship lander (SpaceX)" };
function aStart() {
  sfx.go(); art.order = [];
  aQuiz();
}
function aQuiz() {
  const n = art.order.length;
  $("aTip").innerHTML = n === 0 ? "Quiz: <b>who launches FIRST?</b>" : "Good! <b>Who launches SECOND?</b>";
  aButtons(Object.entries(A_VEH).filter(([k]) => !art.order.includes(k)).map(([k, t]) => [t, `aPick('${k}')`, "ghost"]));
}
function aPick(k) {
  const want = ["bm", "or"][art.order.length];
  if (k !== want) {
    sfx.nope();
    const why = art.order.length === 0
      ? (k === "or" ? "Not Orion! The crew launches only after the lander is already waiting in orbit, so astronauts don't wait in space." : "Not yet! Starship flies later, for the second docking test.")
      : "Starship comes later: first the crew must finish the Blue Moon tests.";
    return say("crater", why + " 🤔", 7000);
  }
  art.order.push(k); sfx.add();
  if (art.order.length < 2) return aQuiz();
  say("thrust", "Right! Blue Moon first, then us in Orion. Starship comes later. Let's go! 🚀", 5000);
  aButtons([]); $("aTip").innerHTML = "";
  aStep("launchBM");
}

// ---------- drawing ----------
function aSpace(ctx) {
  ctx.fillStyle = "#03050d"; ctx.fillRect(0, 0, AW, AH);
  art.stars.forEach(([x, y, b]) => { ctx.fillStyle = `rgba(255,255,255,${0.25 + b * 0.6})`; ctx.fillRect(x, y, 1.5, 1.5); });
  // Earth below, with drifting clouds (we're moving 7.7 km/s!)
  ctx.fillStyle = "#7fb6ff40"; ctx.beginPath(); ctx.arc(AW / 2, 1240, 940, 0, 7); ctx.fill();
  ctx.fillStyle = "#1f5fbf"; ctx.beginPath(); ctx.arc(AW / 2, 1240, 925, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(AW / 2, 1240, 925, 0, 7); ctx.clip();
  ctx.fillStyle = "#ffffffaa";
  for (let i = 0; i < 9; i++) { const x = ((i * 170 - art.cloud) % 1100 + 1100) % 1100 - 100; ctx.beginPath(); ctx.ellipse(x, 345 + (i % 3) * 18, 50, 9, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#3e9d5c"; for (let i = 0; i < 4; i++) { const x = ((i * 300 + 80 - art.cloud * 0.8) % 1200 + 1200) % 1200 - 150; ctx.beginPath(); ctx.ellipse(x, 380, 90, 16, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
// Orion: crew capsule (cone) + European service module with 4 solar-array wings. Nose points along +x
function drawOrion(ctx, x, y, s = 1, burning, nose = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * nose, s);
  ctx.fillStyle = "#2b4a8a"; ctx.fillRect(-58, -40, 10, 32); ctx.fillRect(-58, 8, 10, 32);     // solar wings
  ctx.fillStyle = "#3b5fae"; ctx.fillRect(-58, -40, 10, 3); ctx.fillRect(-58, 37, 10, 3);
  ctx.strokeStyle = "#999"; ctx.beginPath(); ctx.moveTo(-53, -8); ctx.lineTo(-53, 8); ctx.stroke();
  ctx.fillStyle = "#d8dce3"; ctx.fillRect(-48, -11, 26, 22);                                    // service module
  ctx.fillStyle = "#555"; ctx.beginPath(); ctx.moveTo(-48, -5); ctx.lineTo(-56, -8); ctx.lineTo(-56, 8); ctx.lineTo(-48, 5); ctx.fill();
  ctx.fillStyle = "#b9bec9"; ctx.beginPath(); ctx.moveTo(-22, -15); ctx.lineTo(-22, 15); ctx.lineTo(4, 6); ctx.lineTo(4, -6); ctx.fill();   // crew module
  ctx.fillStyle = "#666"; ctx.fillRect(4, -4, 4, 8);                                             // docking port
  ctx.fillStyle = "#223"; ctx.fillRect(-14, -8, 4, 4);
  if (burning) { ctx.fillStyle = "#cfe8ff"; ctx.beginPath(); ctx.moveTo(-22, -12); ctx.lineTo(-30 - Math.random() * 6, -16); ctx.lineTo(-22, -10); ctx.fill(); }
  ctx.restore();
}
// Blue Moon test lander: tall, slim, crew cabin near the top with a SIDE docking port
function drawBlueMoon(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "#e9ecf2"; ctx.fillRect(-14, -70, 28, 120);                 // body
  ctx.fillStyle = "#2b4a8a"; ctx.fillRect(14, -40, 26, 60); ctx.fillRect(-40, -40, 26, 60);   // body-mounted solar panels
  ctx.fillStyle = "#cfd5df"; ctx.beginPath(); ctx.moveTo(-14, -70); ctx.lineTo(0, -88); ctx.lineTo(14, -70); ctx.fill();
  ctx.fillStyle = "#1f2a44"; ctx.fillRect(-6, -64, 12, 8);                      // cabin window
  ctx.fillStyle = "#8a90a0"; ctx.fillRect(-20, -58, 6, 10);                     // side docking port (left)
  ctx.strokeStyle = "#c9ccd3"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 40); ctx.lineTo(-30, 62); ctx.moveTo(14, 40); ctx.lineTo(30, 62); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = "#1d6fd8"; ctx.font = "bold 9px system-ui"; ctx.textAlign = "center"; ctx.fillText("BLUE", 0, 0); ctx.fillText("MOON", 0, 11);
  // astronauts inside (orange suits)
  art.inBM.forEach((id, i) => drawAstronaut(ctx, -5 + i * 10, -53, { s: 0.16, suit: "#ff7a1a" }));
  ctx.restore();
}
// Starship lander test vehicle lying sideways, nose (docking port) pointing LEFT
function drawStarship(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "#cfd3da"; ctx.fillRect(0, -18, 300, 36);
  ctx.fillStyle = "#e9ecf2"; ctx.fillRect(0, -18, 70, 36);
  ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(-34, 0, 0, 18); ctx.fill();
  ctx.fillStyle = "#8a90a0"; ctx.fillRect(-26, -4, 8, 8);                       // nose docking port
  ctx.fillStyle = "#9aa0aa"; for (let i = 1; i < 9; i++) ctx.fillRect(i * 34, -18, 1, 36);
  ctx.fillStyle = "#555"; ctx.fillRect(300, -10, 10, 20);
  ctx.fillStyle = "#333"; ctx.font = "bold 10px system-ui"; ctx.textAlign = "center"; ctx.fillText("STARSHIP (test vehicle, no crew cabin)", 160, 4);
  ctx.restore();
}
function aRocketUp(ctx, t, color, h, w, name) {   // simple launch from below the horizon
  const y = 430 - t * 120, x = 160 + t * 40;
  if (y < -60) return true;
  ctx.fillStyle = "#ffb547"; ctx.beginPath(); ctx.moveTo(x - w / 3, y); ctx.lineTo(x + w / 3, y); ctx.lineTo(x, y + 30 + Math.random() * 20); ctx.fill();
  ctx.fillStyle = color; ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x, y - h - 14); ctx.lineTo(x + w / 2, y - h); ctx.fill();
  ctx.font = "12px system-ui"; ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(name, x + 14, y - h / 2);
  return false;
}
function aPanel(ctx, title, value, sub, col) {
  const x = AW - 214, y = 14;
  ctx.fillStyle = "#151c33ee"; roundRect(ctx, x, y, 196, 58, 12); ctx.fill();
  ctx.font = "12px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#9aa5cc"; ctx.fillText(title, x + 98, y + 16);
  ctx.font = "bold 18px ui-monospace, monospace"; ctx.fillStyle = "#fff"; ctx.fillText(value, x + 98, y + 36);
  ctx.font = "12px system-ui"; ctx.fillStyle = col || "#9aa5cc"; ctx.fillText(sub || "", x + 98, y + 52);
}
function aClock(ctx) { ctx.font = "15px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.fillText(`MISSION DAY ${Math.floor(art.day)} · LOW EARTH ORBIT ~430 km`, 16, 26); }

// ---------- main loop ----------
function aTick(now) {
  if (!art || !$("aSky")) return;
  const a = art, ctx = $("aSky").getContext("2d");
  const dt = Math.min(0.05, (now - a.last) / 1000); a.last = now; a.t += dt; a.cloud += dt * 40;
  ctx.setTransform(a.scale, 0, 0, a.scale, 0, 0);
  aSpace(ctx);
  const S = a.step;
  if (S === "intro") { drawOrion(ctx, 300, 160, 2.2); drawBlueMoon(ctx, 600, 170, 1.2); }
  if (S === "launchBM") {
    if (!a.said) { a.said = 1; sfx.roarStart(0.4); sfx.say("New Glenn, liftoff!", { interrupt: true }); aLabel("🚀 Blue Origin New Glenn launches the Blue Moon test lander"); }
    if (aRocketUp(ctx, a.t, "#e9ecf2", 70, 16, "New Glenn")) { sfx.roarStop(); a.said = 0; aStep("checkBM"); }
  }
  if (S === "checkBM") {
    a.day = Math.min(14, 1 + a.t * 4);
    drawBlueMoon(ctx, 560, 170, 1.1);
    aLabel(`🔧 Blue Origin checks out Blue Moon in orbit… (day ${Math.floor(a.day)})`, 5);
    if (a.t > 3.5) { aStep("launchOR"); a.day = 14; }
  }
  if (S === "launchOR") {
    drawBlueMoon(ctx, 560, 170, 1.1);
    if (!a.said) { a.said = 1; sfx.roarStart(0.5); sfx.say("Liftoff of SLS and Orion!", { interrupt: true }); aLabel("🚀 SLS launches Orion with 4 astronauts"); }
    if (aRocketUp(ctx, a.t, "#ff9a3d", 90, 20, "SLS + Orion (4 crew)")) {
      sfx.roarStop(); a.said = 0; a.day = 1;
      say("thrust", "Orion is the ACTIVE chaser. Blue Moon just holds still. Let's fly in to its side port! 🎯", 7000);
      aDockStart("bm");
    }
  }
  if (S === "dock") aDocking(ctx, dt);
  if (S === "docked_bm") { aDockedBM(ctx, dt); }
  if (S === "transfer") aTransfer(ctx, dt);
  if (S === "undockBM") {
    const k = Math.min(1, a.t / 2.5);
    drawOrion(ctx, 470 - k * 150, 182, 2.2); drawBlueMoon(ctx, 560 + k * 120, 170 + k * 30, 1.1);
    if (a.t > 2.6) { aStep("launchSS"); }
  }
  if (S === "launchSS") {
    drawOrion(ctx, 320, 182, 2.2);
    if (!a.said) { a.said = 1; sfx.roarStart(0.6); sfx.say("Starship, liftoff!", { interrupt: true }); aLabel("🚀 SpaceX launches the Starship test lander"); }
    if (aRocketUp(ctx, a.t, "#cfd3da", 110, 22, "Starship")) {
      sfx.roarStop(); a.said = 0;
      say("crater", "Now dock NOSE-TO-NOSE with Starship. It's huge: about 50 m long! 🚀", 6000);
      aDockStart("ss");
    }
  }
  if (S === "docked_ss") aDockedSS(ctx);
  if (S === "home") aHome(ctx, dt);
  if (S !== "home" && S !== "intro") aClock(ctx);
  if (a.labelT > 0) { a.labelT--; ctx.font = "bold 22px system-ui"; ctx.textAlign = "center"; ctx.fillStyle = "#000a"; ctx.fillText(a.label, AW / 2 + 2, 62); ctx.fillStyle = "#fff"; ctx.fillText(a.label, AW / 2, 60); }
  if (art === a) requestAnimationFrame(aTick);
}

// ---------- docking mini-game ----------
function aDockStart(target) {
  art.dock = { target, d: target === "bm" ? 32 : 36, v: 0, tries: (art.dock && art.dock.target === target) ? art.dock.tries + 1 : 1 };
  aStep("dock");
  aButtons([["◀ Brake (slow down)", "hold:back", "ghost"], ["▶ Thrust forward", "hold:fwd"]]);
  $("aTip").innerHTML = `Hold <b>▶ Thrust</b> to move closer and <b>◀ Brake</b> to slow down (or use the ← → keys). Touch the port <b>slower than ${DOCK_SAFE} m/s</b>!`;
}
function aDocking(ctx, dt) {
  const a = art, D = a.dock, g = dt * TIME_X;
  if (a.hold === "fwd") D.v += DOCK_ACC * g;
  if (a.hold === "back") D.v -= DOCK_ACC * g;
  D.d -= D.v * g;
  const px = 9;                                     // pixels per meter
  const portX = D.target === "bm" ? 560 - 20 * 1.1 : 420;   // target docking port position
  const ox = portX - D.d * px - 8 * 2.2, oy = D.target === "bm" ? 170 - 53 * 1.1 : 182;
  if (D.target === "bm") drawBlueMoon(ctx, 560, 170, 1.1); else drawStarship(ctx, 446, 182, 1);
  drawOrion(ctx, ox, oy, 2.2, a.hold === "fwd");
  if (a.hold === "back") { ctx.fillStyle = "#cfe8ff"; ctx.beginPath(); ctx.moveTo(ox + 10, oy - 6); ctx.lineTo(ox + 26 + Math.random() * 6, oy - 10); ctx.lineTo(ox + 10, oy - 2); ctx.fill(); }
  // guide line
  ctx.strokeStyle = "#ffffff33"; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(ox + 20, oy); ctx.lineTo(portX, oy); ctx.stroke(); ctx.setLineDash([]);
  const fast = D.v > DOCK_SAFE;
  aPanel(ctx, "CLOSING SPEED", `${D.v.toFixed(2)} m/s`, D.v <= 0 ? "● holding / backing off" : fast ? "⚠️ TOO FAST: brake!" : "✅ safe to dock", D.v <= 0 ? "#9aa5cc" : fast ? "#ff5c6c" : "#3ecf8e");
  ctx.font = "14px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
  ctx.fillText(`DISTANCE ${Math.max(0, D.d).toFixed(1)} m   ⏩ ×${TIME_X}`, 16, 48);
  ctx.fillStyle = "#9aa5cc"; ctx.fillText(D.target === "bm" ? "Target: Blue Moon side port (next to the crew cabin)" : "Target: Starship nose port (nose-to-nose)", 16, 68);
  if (D.d > 60) { D.d = 60; D.v = 0; }
  if (D.d <= 0) {
    a.hold = null; sfx.burnStop();
    if (D.v > DOCK_SAFE) {                       // bump!
      a.lives--; aLives(); sfx.boom(); aLabel(`💥 Bump! Contact at ${D.v.toFixed(2)} m/s: too fast`);
      a.docks.push({ target: D.target, v: D.v, ok: false });
      if (a.lives <= 0) { aStep("over"); aButtons([]); return setTimeout(() => aReport(false), 1500); }
      say("crater", "Too fast! Real dockings touch at a slow walk… slower than a snail! Brake earlier. 🐌", 6000);
      D.d = 14; D.v = -0.3;                          // bounce back
      return;
    }
    a.docks.push({ target: D.target, v: D.v, ok: true });
    sfx.clunk(); aButtons([]); $("aTip").innerHTML = "";
    sfx.say("Contact. Capture. Hard dock.", { interrupt: true });
    if (D.target === "bm") { aLabel(`🔗 Docked with Blue Moon at ${D.v.toFixed(2)} m/s!`); aStep("docked_bm"); aDockedBMButtons(); }
    else { aLabel(`🔗 Docked nose-to-nose with Starship at ${D.v.toFixed(2)} m/s!`); aStep("docked_ss"); aDockedSSButtons(); }
    a.dock = null;
  }
}

// ---------- Blue Moon: crew transfer (up to 2) ----------
function aDockedBM(ctx, dt = 0) {
  drawBlueMoon(ctx, 560, 170, 1.1); drawOrion(ctx, 560 - 20 * 1.1 - 8 * 2.2, 170 - 53 * 1.1, 2.2);
  if (art.moving) aMoveAnim(ctx, dt);
  aPanel(ctx, "IN BLUE MOON", `${art.inBM.length} of 2 max`, art.inBM.length ? "orange suits on" : "everyone in Orion", art.inBM.length ? "#ff9a3d" : "#9aa5cc");
  aCrewLegend(ctx);
}
function aCrewLegend(ctx) {
  ctx.font = "13px system-ui"; ctx.textAlign = "left";
  CREW.forEach((c, i) => {
    const inside = art.inBM.includes(c.id);
    ctx.fillStyle = inside ? "#ff9a3d" : "#cfd8ee";
    ctx.fillText(`${inside ? "🟠 in Blue Moon" : "🔵 in Orion"} · ${c.name}`, 16, AH - 80 + i * 18);
  });
}
function aDockedBMButtons() {
  const B = CREW.filter((c) => !art.inBM.includes(c.id)).map((c) => [`➡️ Send ${c.name}`, `aSend('${c.id}')`, "ghost"]);
  if (art.inBM.length && !art.testsDone) B.push(["⏩ Do the tests (2 days)", "aTests()"]);
  if (art.testsDone && art.inBM.length) B.push(["⬅️ Everyone back to Orion", "aReturnCrew()"]);
  B.push(["🔓 Undock from Blue Moon", "aUndockBM()", "ghost"]);
  aButtons(B);
  $("aTip").innerHTML = !art.testsDone ? "Choose who floats into Blue Moon to test it. <b>How many can go?</b>" : "";
}
function aSend(id) {
  if (art.moving) return;
  if (art.inBM.length >= 2) { sfx.nope(); return say("thrust", "Only UP TO TWO astronauts go into Blue Moon. The others stay in Orion! ✌️", 6000); }
  art.moving = { id, t: 0, to: "BM" }; aButtons([]); sfx.whoosh();
  say("crater", `${byId(CREW, id).name} floats through the docking tunnel in an orange Orion survival suit. 🟠`, 5000);
}
// An astronaut floats through the docking tunnel (big close-up + small figure in the main view)
function aMoveAnim(ctx, dt) {
  const mv = art.moving; mv.t += dt / 2.4;
  const k = Math.min(1, mv.t), toBM = mv.to === "BM", q = toBM ? k : 1 - k;
  // small figure in the main scene, between Orion's nose and Blue Moon's cabin
  const sx = 470 + q * 90, sy = 113 - q * 6;
  drawAstronaut(ctx, sx, sy + 6, { s: 0.18, suit: "#ff7a1a", rot: toBM ? Math.PI / 2 : -Math.PI / 2 });
  // close-up inset: Orion cabin → tunnel → Blue Moon cabin
  const x0 = 16, y0 = 92, w = 330, h = 140;
  ctx.fillStyle = "#0b1020f2"; roundRect(ctx, x0, y0, w, h, 14); ctx.fill(); ctx.strokeStyle = "#ff9a3d"; ctx.stroke();
  ctx.fillStyle = "#3c4456"; ctx.fillRect(x0 + 12, y0 + 30, 100, 90); ctx.fillStyle = "#3a4a66"; ctx.fillRect(x0 + 218, y0 + 30, 100, 90);
  ctx.fillStyle = "#6b7285"; ctx.fillRect(x0 + 112, y0 + 60, 106, 30); ctx.fillStyle = "#2a3040"; ctx.fillRect(x0 + 112, y0 + 66, 106, 18);
  ctx.font = "11px system-ui"; ctx.fillStyle = "#cfd8ee"; ctx.textAlign = "center";
  ctx.fillText("🟠 Orion cabin", x0 + 62, y0 + 132); ctx.fillText("docking tunnel", x0 + 165, y0 + 56); ctx.fillText("🔵 Blue Moon cabin", x0 + 268, y0 + 132);
  ctx.font = "bold 12px system-ui"; ctx.fillStyle = "#ff9a3d"; ctx.textAlign = "left"; ctx.fillText("🔍 Inside: floating between spacecraft", x0 + 10, y0 + 18);
  const fx = x0 + 40 + q * 250, fy = y0 + 76 + Math.sin(art.t * 3) * 3;
  drawAstronaut(ctx, fx + (toBM ? -30 : 30), fy, { s: 0.75, suit: "#ff7a1a", rot: toBM ? Math.PI / 2 : -Math.PI / 2 });
  if (mv.t >= 1) {
    if (toBM) art.inBM.push(mv.id); else art.inBM = art.inBM.filter((x) => x !== mv.id);
    art.moving = null; sfx.clunk();
    if (art.moveQ && art.moveQ.length) { art.moving = { id: art.moveQ.shift(), t: 0, to: "OR" }; sfx.whoosh(); return; }
    if (!toBM && !art.inBM.length) { aLabel("⬅️ Crew back in Orion. Hatch closed."); say("thrust", "Everyone's back in Orion. NOW it's safe to undock! 🔒", 5000); }
    aDockedBMButtons();
  }
}
function aTests() {
  art.testsDone = true; sfx.go(); aStep("transfer"); aButtons([]);
  say("rocket", "Testing the cabin: is it livable? Do our suits plug in? Air, power, comms… ✅", 7000);
}
function aTransfer(ctx, dt) {
  art.day = 3 + Math.min(2, art.t);
  aDockedBM(ctx, 0);
  const items = ["🏠 Living space check", "🔌 Suit hookups", "💨 Air & pressure", "📡 Comms with Earth"];
  ctx.font = "14px system-ui"; ctx.textAlign = "left";
  items.forEach((it, i) => { ctx.fillStyle = art.t > i * 0.6 + 0.4 ? "#3ecf8e" : "#55607f"; ctx.fillText((art.t > i * 0.6 + 0.4 ? "✅ " : "⬜ ") + it, 16, 100 + i * 20); });
  if (art.t > 3) { aStep("docked_bm"); aLabel("✅ Blue Moon tests complete (about 2 days)"); aDockedBMButtons(); }
}
function aReturnCrew() {
  if (art.moving || !art.inBM.length) return;
  const q = [...art.inBM]; art.moving = { id: q.shift(), t: 0, to: "OR" }; art.moveQ = q; aButtons([]); sfx.whoosh();
}
function aUndockBM() {
  if (art.inBM.length) {
    sfx.alarm(); art.warned = (art.warned || 0) + 1;
    return say("crater", `STOP! ${art.inBM.length === 1 ? "An astronaut is" : "Two astronauts are"} still inside Blue Moon! Bring them back to Orion first! 🚨`, 7000);
  }
  if (!art.testsDone) { sfx.nope(); return say("thrust", "Not yet! We came here to test Blue Moon. Send up to two crew in first. 🧪", 6000); }
  sfx.sep(); aButtons([]); aLabel("🔓 Orion undocks from Blue Moon"); aStep("undockBM");
}

// ---------- Starship: Starship controls the stack, crew stays in Orion ----------
function aDockedSS(ctx) {
  art.day = 6 + Math.min(1, art.t / 3);
  drawStarship(ctx, 446, 182, 1); drawOrion(ctx, 420 - 8 * 2.2, 182, 2.2);
  aPanel(ctx, "🎮 WHO STEERS THE STACK?", art.ssControl ? "STARSHIP" : "ORION", art.ssControl ? "Starship holds the attitude" : "", art.ssControl ? "#3ecf8e" : "#9aa5cc");
  aCrewLegend(ctx);
}
function aDockedSSButtons() {
  const B = [];
  if (!art.ssControl) B.push(["🎮 Hand control to Starship", "aHandover()"]);
  B.push(["➡️ Send crew into Starship?", "aSendSS()", "ghost"]);
  if (art.ssControl) B.push(["🔓 Undock & head home", "aUndockSS()"]);
  aButtons(B);
}
function aHandover() { art.ssControl = true; sfx.chime(); aLabel("🎮 Starship now controls the docked stack (~1 day test)"); say("rocket", "Big test: can Starship steer itself AND Orion together? ✅", 6000); aDockedSSButtons(); }
function aSendSS() { sfx.nope(); art.triedSS = true; say("crater", "No! This Starship test vehicle has no crew cabin and no life support. The crew stays in Orion! 🚫", 7000); }
function aUndockSS() { sfx.sep(); aButtons([]); aLabel("🔓 Undocked from Starship. Deorbit burn!"); sfx.say("Deorbit burn. Heading home.", { interrupt: true }); aStep("home"); }

// ---------- home: re-entry + splashdown off San Diego ----------
function aHome(ctx, dt) {
  const t = art.t; art.day = Math.min(14, 7 + t * 2);
  const k = Math.min(1, t / 4), x = 200 + k * 420, y = 120 + k * 230;
  if (t < 0.8) drawOrion(ctx, x, y, 1.6, true);
  else {
    if (!art.smGone) { art.smGone = true; sfx.sep(); aLabel("Service module released. Only the crew capsule comes home"); }
    if (k < 0.9 && k > 0.35) { ctx.fillStyle = `rgba(255,${130 + Math.random() * 60},40,.8)`; ctx.beginPath(); ctx.arc(x, y, 14 + Math.random() * 5, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#b9bec9"; ctx.beginPath(); ctx.moveTo(x - 12, y + 8); ctx.lineTo(x + 12, y + 8); ctx.lineTo(x + 5, y - 10); ctx.lineTo(x - 5, y - 10); ctx.fill();
    if (k >= 0.9) { ctx.font = "26px system-ui"; ctx.textAlign = "center"; ctx.fillText("🪂", x - 16, y - 18); ctx.fillText("🪂", x, y - 26); ctx.fillText("🪂", x + 16, y - 18); }
  }
  aPanel(ctx, "SPEED", `${(k < 0.35 ? 7.7 : k < 0.9 ? 7.7 - (k - 0.35) * 13.6 : 0.01).toFixed(2)} km/s`, k < 0.35 ? "● coasting" : "▼ slowing down", k < 0.35 ? "#9aa5cc" : "#ff8a3d");
  if (t > 4.2 && !art.splash) { art.splash = true; sfx.win(); aLabel("🌊 Splashdown in the Pacific off San Diego! (~2 weeks after launch)"); setTimeout(() => aReport(true), 2600); }
}

// ---------- report ----------
function aReport(ok) {
  document.body.classList.remove("flying");
  try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
  const a = art; art = null; sfx.burnStop(); sfx.roarStop();
  const good = a.docks.filter((d) => d.ok).length, bumps = a.docks.filter((d) => !d.ok).length;
  const stars = ok ? 1 + (bumps === 0 ? 1 : 0) + (!a.warned && !a.triedSS ? 1 : 0) : 0;
  const why = [
    ["good", "🌍", "Testing the landers in Earth orbit first is safer: if something goes wrong, home is just hours away, not days."],
    ["good", "🔵⚪", "NASA is testing TWO landers from two companies, so the Moon program has a backup."],
    ["", "🎯", "Orion is the active 'chaser'; the lander holds still. " + a.docks.map((d) => `${d.target === "bm" ? "Blue Moon" : "Starship"}: ${d.v.toFixed(2)} m/s ${d.ok ? "✅" : "💥"}`).join(" · ")],
    [a.warned ? "warn" : "good", "✌️", a.warned ? "You tried to undock with crew still inside Blue Moon! The crew must return to Orion first." : "Up to two astronauts tested Blue Moon, and everyone was back in Orion before undocking."],
    [a.triedSS ? "warn" : "good", "🚫", "Nobody enters the Starship test vehicle: it has no crew cabin or life support. Starship's job was to steer the docked stack."],
    ["", "📅", "This is NASA's plan as of 2026, targeted for about 2027. Plans can change!"],
  ];
  $("app").innerHTML = `
    <div class="result ${ok ? "good" : "bad"}">${ok ? "ARTEMIS III TEST COMPLETE!" : "MISSION OVER"}</div>
    <div class="bigstars">${[0, 1, 2].map((i) => (i < stars ? "★" : `<span class="dim">★</span>`)).join("")}</div>
    <div class="score">${good} docking${good === 1 ? "" : "s"} · ${bumps} bump${bumps === 1 ? "" : "s"} · ${attemptsHTML(Math.max(0, a.lives), 3)}</div>
    <div class="why">${why.map(([k, ico, t]) => `<div class="whycard ${k}"><span class="ico">${ico}</span><span>${t}</span></div>`).join("")}</div>
    <div class="actions"><button class="btn" onclick="screenArtemis()">🔁 Fly it again</button>
      <button class="btn ghost" onclick="screenMission()">🗺️ Other missions</button></div>`;
  say("thrust", ok ? "Both landers tested. Next stop: the Moon! 🌙" : "Docking is hard! Brake early and touch gently. Try again! 💪", 0);
}
