// mission/apollo-a.js — Apollo 11+ (part A: design). State, launch pad (real metres, shadows), crew, steps 1–6.
// Saturn V facts (NASA, rounded): S-IC 42 m, about 130 t empty + about 650 t RP-1 + about 1,500 t liquid oxygen, 5 F-1 engines;
// S-II 24.9 m, about 36 t empty + about 70 t liquid hydrogen + about 370 t LOX, 5 J-2 engines; S-IVB 17.9 m, about 13 t empty
// + about 20 t LH2 + about 90 t LOX, 1 J-2 engine (fires twice). Apollo 11: CM about 5.6 t, SM about 23.2 t (with fuel),
// LM about 15.1 t (descent about 10.3 t, ascent about 4.8 t). Total about 2,900 t, 110.6 m tall.

const AP = { i: 0, stack: [], fuel: {}, crew: [], extras: {} };
const AP_STEPS = ["Mission", "Path", "Landing site", "Rocket", "Stack", "Fuel", "Crew", "Command module", "Lunar module", "Safety", "Launch day", "Spacesuits", "Board"];
const PARTS = {
  sic: { name: "S-IC", full: "S-IC · 1st stage", ico: "🛢️", sub: "5 F-1 engines · 42 m", t: 130, cost: 500, lbl: "S-IC · Stage 1" },
  sii: { name: "S-II", full: "S-II · 2nd stage", ico: "🛢️", sub: "5 J-2 engines · 25 m", t: 36, cost: 400, lbl: "S-II · Stage 2" },
  sivb: { name: "S-IVB", full: "S-IVB · 3rd stage", ico: "🛢️", sub: "1 J-2 engine, fires twice · the Instrument Unit (the rocket's brain) sits on top", t: 13, cost: 300, lbl: "S-IVB · Stage 3 + Instrument Unit" },
  lmd: { name: "LM descent stage", full: "Lunar Module descent stage", ico: "🦵", sub: "Landing engine, legs, Moon gear · stays on the Moon", t: 10.3, cost: 180, lbl: "LM descent stage" },
  lma: { name: "LM ascent stage", full: "Lunar Module ascent stage", ico: "🕷️", sub: "Cabin for 2 · flies back up from the Moon", t: 4.8, cost: 120, lbl: "LM ascent stage" },
  sm: { name: "Service Module", full: "Service Module", ico: "⚙️", sub: "Big engine, oxygen, power for the trip", t: 23.2, cost: 200, lbl: "Service Module" },
  cm: { name: "Command Module", full: "Command Module", ico: "🔺", sub: "Crew cabin · the only part that comes home", t: 5.6, cost: 150, lbl: "Command Module" },
};
const STACK_ORDER = ["sic", "sii", "sivb", "lmd", "lma", "sm", "cm"];
const STACK_CARDS = ["sm", "sivb", "lma", "sic", "cm", "lmd", "sii"];
const TANKS = { sic: [{ k: "rp1", y0: 3.6, y1: 17.5, r: 4.75, t: 650 }, { k: "lox", y0: 20, y1: 40.6, r: 4.75, t: 1500 }],
  sii: [{ k: "lox", y0: 6, y1: 11, r: 4.75, t: 370 }, { k: "lh2", y0: 11.6, y1: 24.4, r: 4.75, t: 70 }],
  sivb: [{ k: "lox", y0: 5.6, y1: 9.6, r: 3.05, t: 90 }, { k: "lh2", y0: 10.1, y1: 17.6, r: 3.05, t: 20 }] };
const FUELNAME = { rp1: "RP-1 kerosene", lh2: "liquid hydrogen", lox: "liquid oxygen (LOX)" };
const FUELCOL = { rp1: 0xd9a54a, lh2: 0xdff3ff, lox: 0x7fc8ff };

function apSay(mood, text, ms) { sh(mood, text, ms); }
function apHint(t) { GAME.mis.hint = t; }
const AP_SIDE = ["moonorb", "xfer3d", "moon3d", "rdv3d", "tec3d", "reentry3d"];
function apPanel(html) { document.body.classList.toggle("flSide", typeof FL !== "undefined" && AP_SIDE.includes(FL.ph)); MS.ui.innerHTML = `<div class="msPanel"><button class="pTog" onclick="apPanelToggle(this)">▾ Hide</button>${html}</div>`; }
function apSteps() { K.set("msSteps", AP_STEPS.map((n, i) => `<span class="${i < AP.i ? "done" : i === AP.i ? "on" : ""}">${i < AP.i ? "✓ " : ""}${n}</span>`).join("")); }
function apGo(i) { AP.i = i; apSteps(); msModalClose(); SND.click(); AP_RUN[i](); }
const AP_RUN = [];
const apCam = (target, dist, yaw, pitch) => { if (!MS.S || !MS.S.orbit) return; MS.S.orbit.goal = { target, dist }; if (yaw !== undefined) MS.S.orbit.goal.yaw = yaw; if (pitch !== undefined) MS.S.orbit.goal.pitch = pitch; };

// ---------- the launch pad: real metres, soft shadows ----------
function apPad() {
  return msScene("pad", (S) => {
    const s = S.scene; S.camera.near = 0.3; S.camera.far = 6000; S.camera.updateProjectionMatrix();
    buildSkyGround(s); MQ.sun(s, V3(140, 260, 170), 75);
    const LC = buildLaunchComplex(s); const rocket = new THREE.Group(); rocket.position.y = DECK; s.add(rocket);
    const vapor = []; for (let i = 0; i < 46; i++) { const d = glowSprite("rgba(235,245,255,0.75)", 6); d.visible = false; s.add(d); vapor.push(d); }
    S.st = { rocket, LC, vapor, crew: [], partLbl: [], drops: [], fills: [] };
    S.orbit = { target: V3(0, 62, 0), dist: 210, yaw: 0.62, pitch: 0.1, auto: 0 };
    S.update = (dt, t) => { apRocketTick(dt, t); if (S.st.tick) S.st.tick(dt, t); apCrewAnim(dt, t); };
    apRocketDraw(); apCrewPlace();
  });
}
// build the rocket from AP.stack (bottom to top) + the escape tower
function apRocketDraw() {
  const S = MS.S; if (!S || S.key !== "pad") return; const R = S.st.rocket;
  while (R.children.length) R.remove(R.children[0]); S.st.partLbl.forEach(msUnlabel); S.st.partLbl = []; R.userData.parts = {};
  const has = (k) => AP.stack.includes(k);
  ["sic", "sii", "sivb", "sm", "cm"].forEach((k) => { if (!has(k)) return; const p = SAT[k](); p.position.y = SAT_Y[k]; R.add(p); R.userData.parts[k] = p; });
  if (has("lmd") || has("lma")) { const lm = buildLM({ folded: true }); lm.g.position.y = SAT_Y.lmd - 0.9; lm.descent.visible = has("lmd"); lm.ascent.visible = has("lma"); R.add(lm.g); R.userData.parts.lm = lm.g; R.userData.lm = lm;
    if (has("lma")) { const sla = SAT.sla(); sla.position.y = SAT_Y.sla; R.add(sla); R.userData.parts.sla = sla; } }
  if (AP.extras.les && has("cm")) { const l = SAT.les(); l.position.y = SAT_Y.les; R.add(l); R.userData.parts.les = l; }
  // tanks that are already full
  Object.keys(TANKS).forEach((k) => TANKS[k].forEach((tk) => { if (AP.fuel[k + "_" + tk.k] && has(k)) apLiquid(k, tk, 1); }));
  // name tags BESIDE the rocket (always on the camera's right side, so they never cover it)
  const near = () => MS.S.orbit.dist < 70, far = () => MS.S.orbit.dist >= 300 || S.st.noTags;
  const tag = (txt, y, r, show) => S.st.partLbl.push(msLabel(`<b>${txt}</b>`, () => (far() || !show() ? null : apSide(DECK + y, r)), "stage"));
  [["sic", 5.5], ["sii", 5.5], ["sivb", 3.6]].forEach(([k, r]) => has(k) && tag(PARTS[k].lbl, SAT_Y[k] + SAT_H[k] / 2, r, () => true));
  const sc = ["lmd", "lma", "sm", "cm"].filter(has);
  if (sc.length) tag("Spacecraft: " + sc.map((k) => ({ lmd: "LM descent", lma: "LM ascent", sm: "SM", cm: "CM" }[k])).join(" + ") + (R.userData.parts.les ? " + escape tower" : ""), SAT_Y.lmd + 6, 3.6, () => !near());
  if (has("lmd")) tag("LM descent stage (inside the adapter)", SAT_Y.lmd + 1.0, 3.6, near); if (has("lma")) tag("LM ascent stage (inside the adapter)", SAT_Y.lmd + 4.2, 3.6, near);
  if (has("sm")) tag("Service Module", SAT_Y.sm + 1.9, 3.6, near); if (has("cm")) tag("Command Module", SAT_Y.cm + 1.8, 2.6, near);
  if (R.userData.parts.les) tag("Launch escape tower", SAT_Y.les + 5, 1.2, near);
  if (AP.i === 5) apTanksShow();
}
// a point just to the right of the rocket, as seen by the camera
function apSide(y, r) { const c = MS.S.camera, right = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0); return V3(0, y, 0).addScaledVector(right, r + 0.8); }
function apLiquid(k, tk, frac) {
  const R = MS.S.st.rocket; const geo = new THREE.CylinderGeometry(tk.r, tk.r, 1, 48); geo.translate(0, 0.5, 0);
  const m = new THREE.Mesh(geo, MQ.mat(FUELCOL[tk.k], { emissive: FUELCOL[tk.k], emissiveIntensity: 0.3, transparent: true, opacity: 0.85, roughness: 0.2 }));
  m.position.y = SAT_Y[k] + tk.y0; m.scale.y = Math.max(0.01, (tk.y1 - tk.y0) * frac); m.visible = frac < 1 || AP.i === 5; R.add(m); return m;
}
function apHull(k, see) { const p = MS.S.st.rocket.userData.parts[k]; if (!p) return; p.traverse((o) => { if (o.isMesh && o.material && o.material.map) { o.material.transparent = see; o.material.opacity = see ? 0.18 : 1; o.material.depthWrite = !see; o.material.needsUpdate = true; } }); }
function apRocketTick(dt, t) {
  const S = MS.S; S.st.drops = S.st.drops.filter((d) => { d.k = Math.min(1, d.k + dt / 1.6); const e = 1 - Math.pow(1 - d.k, 3); d.obj.position.y = d.y + 40 * (1 - e); return d.k < 1; });
  S.st.fills.forEach((f) => { f.t += dt; const k = Math.min(1, f.t / (f.T || FILL_T)), h = (f.tk.y1 - f.tk.y0) * k; f.m.scale.y = Math.max(0.01, h);
    if (f.lbl) f.lbl.el.innerHTML = `⛽ ${FUELNAME[f.tk.k].replace(/^./, (c) => c.toUpperCase())}: <b>${Math.round(k * 100)}%</b>${f.tk.k === "rp1" ? " · normal temperature" : f.tk.k === "lox" ? " · −183 °C 🥶" : " · −253 °C 🥶"}`;
    (f.bub || []).forEach((b, i) => { const p = (t * 0.7 + i / f.bub.length) % 1; b.visible = h > 0.6; b.position.set(Math.cos(i * 2.3) * f.tk.r * 0.6, DECK + SAT_Y[f.id] + f.tk.y0 + p * h, Math.sin(i * 2.3) * f.tk.r * 0.6); });
    if (f.glass && f.tk.k !== "rp1") f.glass.material.color.setHSL(0.55, 0.4, 0.55 + k * 0.35);
    if (k >= 1 && !f.fin) { f.fin = true; (f.bub || []).forEach((b) => S.scene.remove(b)); if (f.lbl) msUnlabel(f.lbl); f.done(); } });
  S.st.fills = S.st.fills.filter((f) => !f.fin);
  const srcs = S.st.cryo ? [S.st.cryo] : AP.i === 5 ? (S.st.boil || []) : [], strong = !!S.st.cryo;
  S.st.vapor.forEach((d, i) => { const c = srcs[i % Math.max(1, srcs.length)]; d.visible = !!c && (strong || i % 3 === 0); if (!d.visible) return;
    const p = (t * (strong ? 0.35 : 0.2) + i / 46) % 1, a = i * 2.4 + t * 0.3, y = DECK + c.y + (i * 0.37 % 1) * c.h - p * (strong ? 6 : 3);   // cold vapor is heavy: it sinks
    d.position.set(Math.cos(a) * (c.r + 0.8 + p * (strong ? 7 : 3)), y, Math.sin(a) * (c.r + 0.8 + p * (strong ? 7 : 3))); d.material.opacity = (1 - p) * (strong ? 0.8 : 0.35); d.scale.setScalar(strong ? 6 + p * 8 : 4 + p * 4); });
}
// ---------- the crew, standing on the concrete deck ----------
function apCrewList() {
  const c = GAME.crew && GAME.crew.length ? GAME.crew : CREWMATES.concat([CREWMATES[0]]).slice(0, 4).map((m, i) => ({ kind: "ai", name: m.name, short: m.short + (i === 3 ? " 2" : ""), face: cartoonFace(m.face), stripe: m.stripe, roles: [["cdr", "eng", "nav", "com"][i]] }));
  return c.slice(0, 4);
}
const crewName = (c) => (c.kind === "human" ? c.name || "Player" : c.short || c.name);
const CREW_SPOT = (i) => V3(12 + i * 1.6, DECK + 0.08 + 3.75 * 0.29, 14);
function apCrewPlace() {
  const S = MS.S; if (!S || !S.st) return; (S.st.crew || []).forEach((a) => S.scene.remove(a));
  const list = apCrewList(), suit = GAME.mis.suit === "artemis" ? 0xe8742a : undefined;
  S.st.crew = list.map((c, i) => { const a = makeAstronaut({ faceTex: faceTexFrom(c.face), depthTex: genericDepthTex(), stripe: c.stripe, cdr: (c.roles || []).includes("cdr"), name: crewName(c).toUpperCase().slice(0, 10), suit });
    a.scale.setScalar(0.29); a.position.copy(CREW_SPOT(i)); a.rotation.y = -0.7; a.userData.base = a.position.y; a.userData.i = i; a.traverse((o) => { if (o.isMesh) o.castShadow = true; }); S.scene.add(a);
    if (AP.crew.length === 3 && !AP.crew.includes(i)) a.userData.helmet.forEach((h) => (h.visible = false));
    return a; });
}
function apChat(i, text) {
  const S = MS.S; if (!S || !S.st || !S.st.crew || !S.st.crew[i]) return; const a = S.st.crew[i];
  if (a.userData.bub) msUnlabel(a.userData.bub);
  a.userData.bub = msLabel(`<b>${crewName(apCrewList()[i])}:</b> ${text}`, () => a.position.clone().add(V3(0, 1.4, 0)), "chat"); a.userData.talk = 2.8;
  if (typeof crewSpeak === "function" && GAME.soundOn) crewSpeak(i, text.replace(/<[^>]+>/g, ""));
  setTimeout(() => { if (a.userData.bub) { msUnlabel(a.userData.bub); a.userData.bub = null; } }, 3800);
}
function apCrewAnim(dt, t) {
  const S = MS.S; (S.st.crew || []).forEach((a, i) => { if (a.userData.walk) return; const u = a.userData; u.talk = Math.max(0, (u.talk || 0) - dt);
    a.position.y = u.base + (u.talk ? Math.abs(Math.sin(t * 9)) * 0.03 : 0);
    u.arms[1].rotation.z = u.talk ? 0.6 + Math.sin(t * 5) * 0.3 : 0.2; u.arms[0].rotation.z = -0.2; u.head.rotation.x = u.talk ? Math.sin(t * 10) * 0.08 : 0; });
}

// ======================= STEP 1 — Mission =======================
AP_RUN[0] = () => {
  hudShow(true, { name: "🦅 Apollo 11+" }); apHint("Read the mission goals, then press Accept. Every goal you finish later earns points!");
  msScene("brief", (S) => {
    K.space(S, 3500, 1.2); const moon = K.moon(3.2, V3(0, 0.6, 0), S.scene); K.earth(1.1, V3(-9, 3.5, -8), S.scene);
    const icons = ["🛬", "🚙", "🔦", "📷", "🪨", "🤖", "🔬", "🇺🇸"].map((e, i) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: medalTex(e, i % 2 === 0), transparent: true })); sp.scale.set(0.8, 0.8, 1); S.scene.add(sp); return sp; });
    S.orbit = { target: V3(0, 0.6, 0), dist: 13, yaw: 0, pitch: 0.08, auto: 0, locked: true };
    S.update = (dt, t) => { moon.rotation.y += dt * 0.05; icons.forEach((s, i) => { const a = t * 0.35 + (i / icons.length) * Math.PI * 2; s.position.set(Math.cos(a) * 4.6, Math.sin(a * 1.5) * 0.6 + 0.9, Math.sin(a) * 4.6); }); };
  });
  apPanel(`<h3>🦅 Mission: Apollo 11+</h3><p class="lead">Do what Apollo 11 did… and more:</p>
    <div class="objList">
      <div>🛬 <b>Land and come home</b></div><div>🚙 <b>Drive a rover</b></div><div>🔦 <b>Place a laser mirror</b></div><div>📷 <b>Photograph the far side</b></div>
      <div>🪨 <b>Find special rocks</b></div><div>🤖 <b>Leave a water-hunting rover</b></div><div>🔬 <b>Science experiments</b></div><div>🇺🇸 <b>Plant the flag</b></div></div>
    <div class="row"><button class="btn ghost" onclick="SND.click();showScreen('design')">← Missions</button><button class="btn go" onclick="apGo(1)">✅ Accept the mission</button></div>`);
  msInfoClear(); msInfo("laser", "🔦 Is the laser mirror real?", `<p>Yes! Apollo 11, 14 and 15 left mirror panels on the Moon. Observatories on Earth still fire lasers at them and time the echo. That's how we know the Moon drifts about <b>3.8 cm further from Earth every year</b>.</p>`);
  setTimeout(() => apSay("happy", "Hi, I'm <b>StarHunter</b>! Click me if you're stuck. Each hint costs 50 points."), 600);
};

// ======================= STEP 2 — Free return or direct =======================
AP_RUN[1] = () => {
  apHint("Free return is the safe choice: if the engine fails, the Moon's gravity swings you home. Apollo 8, 10 and 11 used it.");
  const mk = (free) => { const s = new THREE.Scene(); s.background = new THREE.Color(0x02030a); starfield(s, 1500); acadLights(s, 1.1);
    K.earth(1.2, V3(-6, 0, 0), s); const m = K.moon(0.45, V3(6, 0, 0), s);
    const P = free ? [V3(-4.8, 0.7, 0), V3(-1, 1.3, 0), V3(3, -0.3, 0), V3(5.6, -0.95, 0), V3(7.05, 0, 0), V3(5.8, 0.95, 0), V3(3, 0.35, 0), V3(-1, -1.3, 0), V3(-4.8, -0.7, 0)]
                   : [V3(-4.8, 0.7, 0), V3(-1, 1.7, 0), V3(3.6, 1.0, 0), V3(5.35, 0.55, 0)];
    const pts = new THREE.CatmullRomCurve3(P).getPoints(160); K.line(s, pts, 0xffd27a, 0.95); let lost = [], orbit;
    if (!free) { lost = new THREE.CatmullRomCurve3([V3(5.35, 0.55, 0), V3(6.6, 0.2, 0), V3(8.2, -1, 0), V3(10.5, -3, 0)]).getPoints(60); K.line(s, lost, 0xe05050, 0.9, true);
      orbit = K.ring(0.85, 0x2fbf71, 0.8, s); orbit.position.copy(m.position); orbit.rotation.x = Math.PI / 2 - 0.3; }
    const ship = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), K.basic(0xffffff)); ship.add(glowSprite("rgba(255,210,122,1)", 0.9)); s.add(ship);
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 2000); cam.position.set(0.8, 0, 31); cam.lookAt(0.8, -0.6, 0);
    return { s, cam, pts, lost, orbit, ship, m }; };
  msScene("paths", (S) => {
    const A = mk(true), B = mk(false); S.st = { A, B }; S.orbit = null;
    S.update = (dt, t) => { const k = (t * 0.12) % 1; A.ship.position.copy(A.pts[Math.floor(k * (A.pts.length - 1))]);
      const cyc = Math.floor(t * 0.12) % 2, kb = (t * 0.12) % 1;
      if (kb < 0.55) B.ship.position.copy(B.pts[Math.floor((kb / 0.55) * (B.pts.length - 1))]);
      else if (cyc) { const a = (kb - 0.55) * 14, th = Math.PI / 2 - 0.3; B.ship.position.copy(B.m.position).add(V3(Math.cos(a) * 0.85, Math.sin(a) * 0.85 * Math.cos(th), Math.sin(a) * 0.85 * Math.sin(th))); }
      else B.ship.position.copy(B.lost[Math.min(B.lost.length - 1, Math.floor(((kb - 0.55) / 0.45) * (B.lost.length - 1)))]);
      B.orbit.visible = !!cyc && kb > 0.55; K.set("pathB", kb > 0.55 ? (cyc ? "🔥 Engine works → captured in Moon orbit" : "❌ Engine fails → no way home!") : "On the way…");
      K.set("pathA", kb > 0.5 ? "🔄 The Moon's gravity swings us back to Earth" : "On the way…"); };
    S.render = (r, ox, oy) => { const w = innerWidth, h = innerHeight; r.setScissorTest(true);
      [[A, 0], [B, w / 2]].forEach(([V, x]) => { V.cam.aspect = (w / 2) / h; V.cam.setViewOffset(w / 2, h, 0, oy, w / 2, h); r.setViewport(x, 0, w / 2, h); r.setScissor(x, 0, w / 2, h); r.render(V.s, V.cam); });
      r.setScissorTest(false); };
  });
  MS.ui.innerHTML = `<div class="splitLbl" style="left:0">🛟 Free return<br><small id="pathA" style="font-size:15px;color:#7dffb5"></small></div><div class="splitLbl" style="left:50%">⚡ Direct<br><small id="pathB" style="font-size:15px;color:#ffb3b3"></small></div>
    <div class="msPanel"><button class="pTog" onclick="apPanelToggle(this)">▾ Hide</button><h3>How do we fly to the Moon?</h3><div class="lcRow">
      <button class="pick" onclick="apPath('free')"><span class="pi">🛟</span><b>Free return</b><small>If anything goes wrong, the Moon swings us home. ✅ Safe</small></button>
      <button class="pick" onclick="apPath('direct')"><span class="pi">⚡</span><b>Direct</b><small>Reaches more places… but no way back if the engine fails. ⚠️ Risky</small></button></div>
      <div class="row"><button class="btn ghost" onclick="apGo(0)">← Back</button></div></div>`;
  msInfo("fig8", "🔄 What is a free return?", `<p>A free-return path is shaped like a <b>figure eight</b>. It loops around the <b>far side</b> of the Moon in the same flat plane as the Moon's orbit around Earth.</p><p>If the engine fails and you can't brake into Moon orbit, the Moon's gravity bends your path about <b>180°</b> and sends you back to Earth <b>without using fuel</b>.</p><p>Apollo 8, 10 and 11 left Earth on a free return. Apollo 13 used one to get home after its explosion!</p>`);
};
function apPath(p) { AP.path = p; SND.click();
  apSay(p === "free" ? "happy" : "think", p === "free" ? "Safe choice! Apollo 8, 10 and 11 all used a <b>free return</b>." : "Bold! A <b>direct</b> path reaches more sites, but if the braking engine fails, there's no free ride home.");
  setTimeout(() => apGo(2), 1400); }

// ======================= STEP 3 — Landing site =======================
const SITES = [
  { id: "a11", name: "Apollo 11 · Sea of Tranquility", lat: 0.67, lon: 23.47, fact: "Smooth, flat lava plain: the safest place for the first landing." },
  { id: "a12", name: "Apollo 12 · Ocean of Storms", lat: -3.01, lon: -23.42, fact: "Pinpoint landing next to the old Surveyor 3 robot." },
  { id: "a14", name: "Apollo 14 · Fra Mauro", lat: -3.65, lon: -17.47, fact: "Hills of very old rock from a giant impact." },
  { id: "a15", name: "Apollo 15 · Hadley–Apennine", lat: 26.13, lon: 3.63, fact: "Mountains and a long canyon. First Moon rover!" },
  { id: "a16", name: "Apollo 16 · Descartes Highlands", lat: -8.97, lon: 15.5, fact: "The only landing in the bright central highlands." },
  { id: "a17", name: "Apollo 17 · Taurus–Littrow", lat: 20.19, lon: 30.77, fact: "A deep valley; orange volcanic soil was found." },
  { id: "art", name: "Artemis IV · Lunar South Pole", lat: -89.5, lon: 0, fact: "Dark craters hold water ice. The Sun stays low." },
];
AP_RUN[2] = () => {
  apHint(AP.path === "free" ? "With a free-return path, only the Apollo 11 site (Sea of Tranquility) works." : "Any site works. For water hunting, the South Pole is best. For the easiest landing, the Sea of Tranquility.");
  msScene("sites", (S) => { K.space(S, 3500, 1.2); const R = 3.2; K.moon(R, V3(0, 0, 0), S.scene);
    S.st = { marks: SITES.map((s) => { const la = s.lat * DEG, lo = s.lon * DEG, p = V3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)).multiplyScalar(R * 1.01);
      const sp = glowSprite(s.id === "art" ? "rgba(127,212,255,1)" : "rgba(255,210,122,1)", 0.45); sp.position.copy(p); S.scene.add(sp);
      return { s, sp, l: msLabel(s.name.split(" · ")[1], p.clone().add(V3(0, 0.25, 0)), s.id === "art" ? "blue" : "gold") }; }) };
    S.orbit = { target: V3(0, 0, 0), dist: 10, yaw: 0.15, pitch: -0.1, auto: 0 };
    S.update = (dt, t) => S.st.marks.forEach((m) => m.sp.scale.setScalar(m.s.id === AP.site ? 0.8 + Math.sin(t * 6) * 0.15 : 0.45)); });
  apPanel(`<h3>Where on the Moon will we land?</h3><p class="lead">The side that always faces Earth. Pick one site.${AP.path === "free" ? " (You chose <b>free return</b>.)" : ""}</p>
    <div class="lcRow">${SITES.map((s) => `<button class="pick ${AP.site === s.id ? "on" : ""}" onclick="apSite('${s.id}')"><b>${s.name}</b><small>${s.fact}</small></button>`).join("")}</div>
    <div class="row"><button class="btn ghost" onclick="apGo(1)">← Path</button></div>`);
};
function apSite(id) { const s = SITES.find((x) => x.id === id); SND.click();
  if (AP.path === "free" && id !== "a11") return msModal(`<h2>🛟 Free return only fits Apollo 11's site</h2><p>Only <b>Apollo 11</b> flew a full free-return path to its landing site. Apollo 12 to 17 used <b>other paths</b> so they could reach sites further from the Moon's equator.</p>
    <div class="row"><button class="btn go" onclick="msModalClose();apSite('a11')">🦅 Land at the Sea of Tranquility</button><button class="btn ghost" onclick="msModalClose();AP.path='direct';apSite('${id}')">⚡ Switch to Direct</button></div>`);
  AP.site = id; apSay("happy", `Great pick: <b>${s.name}</b>. ${s.fact}`); MS.S.orbit.goal = { yaw: s.lon * DEG * 0.8, pitch: s.lat * DEG * 0.6, dist: 8.5 };
  setTimeout(() => apGo(3), 1800); }

// ======================= STEP 4 — Rocket shop =======================
const ROCKETS = [
  { id: "sv", name: "Saturn V", h: 110.6, moon: "about 45 t", ok: true, note: "Apollo's rocket (1967–1973)" },
  { id: "sls", name: "SLS Block 1", h: 98, r: 4.2, col: 0xd8752a, boost: true, moon: "about 27 t", note: "NASA's Artemis rocket" },
  { id: "ng", name: "New Glenn", h: 98, r: 3.5, col: 0xe8e8ea, moon: "—", note: "Blue Origin · about 45 t to low orbit" },
  { id: "fh", name: "Falcon Heavy", h: 70, r: 1.83, col: 0xf2f2f2, triple: true, moon: "—", note: "SpaceX · about 64 t to low orbit" },
  { id: "f9", name: "Falcon 9", h: 70, r: 1.83, col: 0xf2f2f2, moon: "—", note: "SpaceX · about 23 t to low orbit" },
];
AP_RUN[3] = () => {
  apHint("Only one rocket ever sent a whole crew ship AND lander (about 44 t) to the Moon in one launch: the Saturn V.");
  msScene("shop", (S) => { buildSkyGround(S.scene); MQ.sun(S.scene, V3(140, 260, 170), 140);
    const conc = new THREE.Mesh(new THREE.BoxGeometry(260, 0.4, 60), MQ.mat(0x8f9399, { roughness: 0.95 })); conc.position.y = 0.2; conc.receiveShadow = true; S.scene.add(conc);
    ROCKETS.forEach((R, i) => { const x = -100 + i * 50, g = new THREE.Group(); g.position.set(x, 0.4, 0); S.scene.add(g);
      if (R.id === "sv") { let y = 0; ["sic", "sii", "sivb"].forEach((k) => { const p = SAT[k](); p.position.y = SAT_Y[k]; g.add(p); });
        const sla = SAT.sla(); sla.userData.mat.opacity = 1; sla.userData.mat.transparent = false; sla.userData.mat.depthWrite = true; sla.position.y = SAT_Y.sla; g.add(sla);
        const sm = SAT.sm(); sm.position.y = SAT_Y.sm; g.add(sm); const cm = SAT.cm(); cm.position.y = SAT_Y.cm; g.add(cm); const les = SAT.les(); les.position.y = SAT_Y.les; g.add(les); }
      else { const body = MQ.mesh(g, new THREE.CylinderGeometry(R.r, R.r, R.h * 0.88, 48), MQ.mat(R.col, { roughness: 0.5 }), R.h * 0.44); body.receiveShadow = true;
        MQ.mesh(g, new THREE.ConeGeometry(R.r, R.h * 0.12, 48), MQ.mat(0xdddddd), R.h * 0.94);
        if (R.boost) [-1, 1].forEach((k) => (MQ.mesh(g, new THREE.CylinderGeometry(1.85, 1.85, 54, 32), MQ.mat(0xf4f4f2), 27).position.x = k * 6.2));
        if (R.triple) [-1, 1].forEach((k) => (MQ.mesh(g, new THREE.CylinderGeometry(1.83, 1.83, 42, 32), MQ.mat(0xf2f2f2), 21).position.x = k * 3.8));
        if (R.id === "ng") MQ.mesh(g, new THREE.CylinderGeometry(R.r * 1.01, R.r * 1.01, 3, 48), MQ.mat(0x2a3a8a), R.h * 0.7); }
      msLabel(`<b>${R.name}</b><br>${R.h} m · Moon: ${R.moon}`, V3(x, R.h + 10, 0), R.ok ? "gold" : ""); });
    S.orbit = { target: V3(0, 50, 0), dist: 300, yaw: 0, pitch: 0.08, auto: 0 }; });
  apPanel(`<h3>🏪 The rocket shop</h3><p class="lead">Apollo 11+ must send the crew ship <b>and</b> the lander to the Moon: about <b>44 tonnes</b>.</p>
    <div class="lcRow"><button class="pick" onclick="apRocket('sv')"><span class="pi">🚀</span><b>Apollo style: Saturn V</b><small>110.6 m · about 2,900 t · 3 stages · 3 seats</small></button>
      <button class="pick" onclick="apShopOwn()"><span class="pi">🛠️</span><b>Build your own</b><small>SLS, boosters, Falcon 9, Falcon Heavy, New Glenn</small></button></div>
    <div class="row"><button class="btn ghost" onclick="apGo(2)">← Landing site</button></div>`);
};
function apShopOwn() { SND.click(); apPanel(`<h3>🛠️ Build your own</h3><p class="lead">Can it send <b>44 t</b> to the Moon in one launch?</p>
  <div class="lcRow">${ROCKETS.map((R) => `<button class="pick" onclick="apRocket('${R.id}')"><b>${R.name}</b><small>${R.note} · ${R.h} m · Moon: ${R.moon}</small></button>`).join("")}</div>
  <div class="row"><button class="btn ghost" onclick="AP_RUN[3]()">← Back</button></div>`); }
function apRocket(id) { const R = ROCKETS.find((x) => x.id === id); SND.click();
  if (!R.ok) { apSay("sad", `${R.name} can't send 44 t to the Moon in one launch. Artemis solves this with <b>several launches</b> and refuelling: that's the <b>Artemis IV+</b> mission!`, 8000);
    return msModal(`<h2>${R.name}: not enough for Apollo 11+</h2><p>To the Moon: <b>${R.moon === "—" ? "not designed for crewed Moon trips" : R.moon}</b>. Apollo 11+ needs about <b>44 t</b> (crew ship + lander) in one launch.</p><p>Modern missions split the job into several launches. That's the <b>Artemis IV+</b> mission!</p><div class="row"><button class="btn go" onclick="msModalClose();apRocket('sv')">🚀 Use the Saturn V</button></div>`); }
  AP.rocket = "sv"; apSay("happy", "The mighty <b>Saturn V</b>! Apollo-style means a crew of <b>3</b>. Now let's <b>stack</b> it."); setTimeout(() => apGo(4), 1300); }

// ======================= STEP 5 — Stack the Saturn V (7 parts) =======================
AP_RUN[4] = () => {
  apHint("Bottom first: S-IC, S-II, S-IVB. Then the Lunar Module (descent stage, then ascent stage) rides inside the adapter, then the Service Module, and the Command Module on top.");
  AP.stack = []; AP.stackMiss = 0; apPad(); apRocketDraw(); apCam(V3(0, 30, 0), 150, 0.62, 0.12);
  msInfo("stages", "🧱 Why stages?", `<p>When a fuel tank is empty it's just <b>dead weight</b>. Each Saturn V stage drops off when it's empty, so the engines push less weight. That's how 2,900 t of rocket sends about 45 t to the Moon.</p>`);
  apStackUI(); setTimeout(() => { apChat(1, "Let's put the S-IVB at the bottom first!"); setTimeout(() => apChat(0, "No way! The biggest stage goes at the bottom."), 2600); }, 700);
};
function apStackUI() {
  apPanel(`<h3>🧱 Build your Saturn V (${AP.stack.length}/7)</h3><p class="lead">Stack <b>bottom first</b>. Watch the weight matrix on the right.</p>
    <div class="lcRow cmp">${STACK_CARDS.map((id) => { const d = PARTS[id], done = AP.stack.includes(id);
      return `<button class="pick ${done ? "good" : ""}" title="${d.sub}" ${done ? "disabled" : ""} onclick="apStack('${id}')"><b>${d.ico} ${done ? "✅ " : ""}${d.full}</b><small>${d.t} t · <span style="color:var(--gold)">$${d.cost}M</span></small></button>`; }).join("")}</div>
    <div class="row"><button class="btn ghost" onclick="apGo(3)">← Rocket shop</button></div>`);
}
function apStack(id) {
  const want = STACK_ORDER[AP.stack.length];
  if (id !== want) { AP.stackMiss++; msPoints(-50, "wrong order");
    const why = { sic: "", sii: "The S-II is the 2nd stage: it sits on the S-IC.", sivb: "The S-IVB is the 3rd stage: it sits on the S-II.",
      lmd: "The Lunar Module rides above the 3rd stage, inside a cone-shaped adapter.", lma: "The ascent stage sits on top of the descent stage: it's the lander's top half.",
      sm: "The Service Module sits right below the Command Module, above the lander's adapter.", cm: "The Command Module rides on the very top, where the crew can escape." }[id];
    return apSay("sad", `Not yet! ${why} Next should be: <b>${PARTS[want].full}</b>.`); }
  msSpend(PARTS[id].cost, PARTS[id].full, (ok) => { if (!ok) return; AP.stack.push(id); apRocketDraw();
    const R = MS.S.st.rocket, p = id === "lmd" || id === "lma" ? R.userData.parts.lm : R.userData.parts[id];
    if (p) MS.S.st.drops.push({ obj: p, y: p.position.y, k: 0 });
    msWeight(id, PARTS[id].full + (id === "sm" ? " (with its fuel)" : id.startsWith("lm") ? " (with its fuel)" : " (empty)"), PARTS[id].t);
    SND.tone(400 + AP.stack.length * 90, 0.15, "triangle", 0.08);
    const y = (id === "lma" ? SAT_Y.lmd + 2 : SAT_Y[id] + SAT_H[id] / 2);
    apCam(V3(0, DECK + y, 0), id === "sic" || id === "sii" ? 120 : id === "sivb" ? 90 : 40);
    if (id === "lma") apSay("happy", "See the see-through cone? That's the <b>adapter</b>: the Lunar Module rides inside it, legs folded, until we're in space.");
    if (AP.stack.length === 7) { const pts = 1000 - AP.stackMiss * 50; msPoints(pts, AP.stackMiss ? `stacked (1000 − ${AP.stackMiss}×50)` : "perfect stack!");
      apSay("happy", "Stacked! <b>110.6 m</b>, taller than a 36-storey building. But the tanks are <b>empty</b>…"); apChat(2, "Now it needs fuel!"); apCam(V3(0, 62, 0), 210);
      setTimeout(() => apGo(5), 2600); }
    else { apStackUI(); if (AP.stack.length === 2) apChat(3, "Looking good! Two stages done."); } });
}

// ======================= STEP 6 — Fuel + oxidizer, for EVERY stage =======================
const FUEL_OK = { sic: "liquid", sii: "cryo", sivb: "cryo" };
AP_RUN[5] = () => {
  apHint("The 1st stage (S-IC) burns RP-1 kerosene: dense and powerful. The 2nd and 3rd stages burn super-cold liquid hydrogen: the most efficient. And EVERY stage also needs liquid oxygen!");
  AP.fuelTry = AP.fuelTry || {}; AP.oxTry = AP.oxTry || {}; apPad(); apRocketDraw();
  msInfo("ox", "🫁 Why carry oxygen?", `<p>Fire needs <b>fuel + oxygen</b>. On Earth, a campfire takes oxygen from the air. In space there is <b>no air</b>, so a rocket carries its own oxygen as a super-cold liquid (−183 °C).</p><p>The Saturn V carried <b>more liquid oxygen than fuel</b>: the S-IC had about 1,500 t of LOX and 650 t of kerosene.</p>`);
  DEMO() ? apFuelDemoUI() : apFuelUI();
};
function apFuelUI() {
  const done = (id) => AP.fuel[id + "_lox"] && AP.fuel[id + "_" + (id === "sic" ? "rp1" : "lh2")];
  apPanel(`<h3>⛽ Fuel the rocket</h3><p class="lead">Each stage needs its <b>fuel</b> and its <b>oxidizer</b>. Click a stage.</p>
    <div class="lcRow">${["sic", "sii", "sivb"].map((id) => `<button class="pick ${done(id) ? "good" : ""}" ${done(id) ? "disabled" : ""} onclick="apFuelAsk('${id}')"><span class="pi">⛽</span><b>${done(id) ? "✅ " : ""}${PARTS[id].full}</b><small>${done(id) ? "Fuel + oxidizer full" : "What goes in here?"}</small></button>`).join("")}</div>
    <div class="row"><button class="btn ghost" onclick="apGo(4)">← Stack</button></div>`);
}
function apFuelAsk(id) {
  SND.click(); apCam(V3(0, DECK + SAT_Y[id] + SAT_H[id] / 2, 0), id === "sivb" ? 60 : 95);
  if (AP.fuel[id + "_" + (id === "sic" ? "rp1" : "lh2")]) return apOxAsk(id);
  msModal(`<div style="text-align:center;font-size:54px">⛽</div><h2 style="text-align:center">What fuel goes in the ${PARTS[id].name}?</h2>
    ${[["solid", "🧱 Solid", "Rubbery fuel cast inside the tube. Huge push, but once lit it can't be stopped."], ["liquid", "🛢️ Liquid (RP-1 kerosene)", "Dense and powerful, great for first stages."], ["cryo", "🥶 Cryogenic (liquid hydrogen)", "Super-cold and very efficient, great for upper stages."]]
      .map(([k, n, d]) => `<button class="pick" style="width:100%;margin-bottom:8px" onclick="apFuelPick('${id}','${k}')"><b>${n}</b><small>${d}</small></button>`).join("")}`);
}
function apFuelPick(id, k) {
  msModalClose(); const ok = FUEL_OK[id] === k, first = !AP.fuelTry[id]; AP.fuelTry[id] = (AP.fuelTry[id] || 0) + 1;
  if (!ok) { apSay("sad", k === "solid" ? "Solid fuel can't be throttled or switched off once lit. The Saturn V's stages burned <b>liquid</b> fuels." :
      id === "sic" ? "Liquid hydrogen is super light and bulky. The 1st stage needs a <b>dense</b> fuel for a huge push near the ground: <b>RP-1 kerosene</b>." : "Upper stages burn for a long time in space, so they use the most <b>efficient</b> fuel: <b>liquid hydrogen</b>.", 8000); return; }
  if (first) msPoints(50, `right fuel for the ${PARTS[id].name}`); else apSay("happy", "That's it!");
  const fk = id === "sic" ? "rp1" : "lh2", tk = TANKS[id].find((x) => x.k === fk);
  apFill(id, tk, () => { AP.fuel[id + "_" + fk] = 1; msWeight(id + "_" + fk, `${PARTS[id].name} ${FUELNAME[fk]}`, tk.t); apOxAsk(id); });
}
// the oxidizer question is asked for EVERY stage
function apOxAsk(id) {
  msModal(`<div style="text-align:center;font-size:54px">🔥</div><h2 style="text-align:center">The ${PARTS[id].name} has its fuel. Is it ready to burn?</h2>
    <button class="pick" style="width:100%;margin-bottom:8px" onclick="apOx('${id}',1)"><b>🫁 Also fill liquid oxygen (the oxidizer)</b><small>Super-cold LOX at −183 °C</small></button>
    <button class="pick" style="width:100%;margin-bottom:8px" onclick="apOx('${id}',0)"><b>🌬️ No, that's enough</b><small>It will use oxygen from the air</small></button>`);
}
function apOx(id, yes) {
  msModalClose(); AP.oxTry[id] = (AP.oxTry[id] || 0) + 1;
  if (!yes) { apSay("angry", "To burn anything you need <b>fuel AND oxygen</b>. In space there is <b>no atmosphere and no oxygen</b>. How are you going to burn your fuel? Don't forget to carry oxygen!", 9000);
    return setTimeout(() => apOxAsk(id), 2600); }
  if (AP.oxTry[id] === 1) msPoints(50, `oxidizer for the ${PARTS[id].name}`); apSay("happy", "Yes! Fuel + oxygen = fire. In space you must bring your own oxygen.");
  const tk = TANKS[id].find((x) => x.k === "lox"); apFill(id, tk, () => { AP.fuel[id + "_lox"] = 1; msWeight(id + "_lox", `${PARTS[id].name} liquid oxygen`, tk.t); apFuelDone(); });
}
function apFuelDone() { if (!DEMO()) apFuelUI();
  if (["sic", "sii", "sivb"].every((id) => AP.fuel[id + "_lox"] && AP.fuel[id + "_" + (id === "sic" ? "rp1" : "lh2")])) {
    apCam(V3(0, 62, 0), 210); apSay("happy", "All tanks full! The rocket now weighs about <b>2,900 tonnes</b>, as heavy as 400 elephants. Most of it is fuel and oxygen!");
    apChat(0, "Wow, it's almost all fuel!"); setTimeout(() => apGo(6), DEMO() ? 1200 : 2800); } }
const FILL_T = 4.5;
function apFill(id, tk, done, T) { const S = MS.S; apHull(id, true); const m = apLiquid(id, tk, 0); m.visible = true;
  const cryo = tk.k !== "rp1" ? { y: SAT_Y[id] + tk.y0, h: tk.y1 - tk.y0, r: tk.r } : null; S.st.cryo = cryo;
  const bub = []; for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(tk.r * 0.05, 8, 6), K.basic(0xffffff, { transparent: true, opacity: 0.8 })); b.visible = false; S.scene.add(b); bub.push(b); }
  const lbl = msLabel("", () => apSide(DECK + SAT_Y[id] + (tk.y0 + tk.y1) / 2, tk.r + 0.5), "big"), glass = (S.st.glass || {})[id + "_" + tk.k];
  const stop = SND.fill ? SND.fill(T || FILL_T, tk.k !== "rp1") : null;
  S.st.fills.push({ id, m, tk, t: 0, T, bub, lbl, glass, done: () => { S.st.cryo = null; if (cryo) (S.st.boil = S.st.boil || []).push(cryo); stop && stop(); SND.beep(); done && done(); } }); }
// see-through tanks for the fuelling step: glass walls with rims, so you can see empty vs full
function apTanksShow() { const S = MS.S, R = S.st.rocket; S.st.glass = {}; S.st.boil = [];
  Object.keys(TANKS).forEach((k) => { if (!AP.stack.includes(k)) return; apHull(k, true);
    TANKS[k].forEach((tk) => { const h = tk.y1 - tk.y0, g = new THREE.Mesh(new THREE.CylinderGeometry(tk.r + 0.05, tk.r + 0.05, h, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, metalness: 0.3, roughness: 0.3 }));
      g.position.y = SAT_Y[k] + tk.y0 + h / 2; R.add(g); S.st.glass[k + "_" + tk.k] = g;
      [tk.y0, tk.y1].forEach((y) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(tk.r + 0.05, 0.12, 8, 48), MQ.mat(0x5d6b7a)); ring.rotation.x = Math.PI / 2; ring.position.y = SAT_Y[k] + y; R.add(ring); });
      if (AP.fuel[k + "_" + tk.k] && tk.k !== "rp1") S.st.boil.push({ y: SAT_Y[k] + tk.y0, h, r: tk.r });
      S.st.partLbl.push(msLabel(`${tk.k === "rp1" ? "🛢️" : "🥶"} ${tk.k === "rp1" ? "RP-1 fuel" : tk.k === "lh2" ? "Liquid hydrogen fuel" : "Liquid oxygen"} tank`, () => (MS.S.orbit.dist < 110 && Math.abs(MS.S.orbit.target.y - (DECK + SAT_Y[k] + tk.y0 + h / 2)) < 20 ? apSideL(DECK + SAT_Y[k] + tk.y0 + h / 2, tk.r) : null), "blue lft")); }); }); }
function apSideL(y, r) { const c = MS.S.camera, right = new THREE.Vector3().setFromMatrixColumn(c.matrixWorld, 0); return V3(0, y, 0).addScaledVector(right, -(r + 1)); }

// 🎬 Demo: pick all 3 stages, fill their fuel together (3 s), then ask about oxygen ONCE and fill all oxidizer together (2 s)
function apFuelDemoUI() { AP.dsel = AP.dsel || {}; const all = ["sic", "sii", "sivb"].every((id) => AP.dsel[id]);
  apPanel(`<h3>⛽ Fuel the rocket</h3><p class="lead">Select <b>all 3 stages</b>, then fuel them together. 1st stage: <b>RP-1 kerosene</b>. 2nd + 3rd: <b>liquid hydrogen</b> (−253 °C).</p>
    <div class="lcRow">${["sic", "sii", "sivb"].map((id) => `<button class="pick ${AP.dsel[id] ? "good" : ""}" onclick="AP.dsel['${id}']=!AP.dsel['${id}'];SND.click();apFuelDemoUI()"><span class="pi">⛽</span><b>${AP.dsel[id] ? "✅ " : ""}${PARTS[id].full}</b><small>${id === "sic" ? "RP-1 kerosene" : "Liquid hydrogen"}</small></button>`).join("")}</div>
    <div class="row"><button class="btn go ${all ? "pulse" : ""}" ${all ? "" : "disabled"} onclick="apFuelDemoGo()">⛽ Fill the fuel</button></div>`); }
function apFuelDemoGo() { SND.click(); MS.ui.innerHTML = ""; apCam(V3(0, 62, 0), 210); let n = 0; msPoints(150, "right fuel for all 3 stages");
  ["sic", "sii", "sivb"].forEach((id) => { const fk = id === "sic" ? "rp1" : "lh2", tk = TANKS[id].find((x) => x.k === fk);
    apFill(id, tk, () => { AP.fuel[id + "_" + fk] = 1; msWeight(id + "_" + fk, `${PARTS[id].name} ${FUELNAME[fk]}`, tk.t); if (++n === 3) apOxDemoAsk(); }, 3); }); }
function apOxDemoAsk() { msModal(`<div style="text-align:center;font-size:54px">🔥</div><h2 style="text-align:center">All 3 stages have fuel. Ready to burn?</h2>
    <button class="pick" style="width:100%;margin-bottom:8px" onclick="apOxDemo(1)"><b>🫁 Also fill liquid oxygen (the oxidizer)</b><small>Super-cold LOX at −183 °C</small></button>
    <button class="pick" style="width:100%;margin-bottom:8px" onclick="apOxDemo(0)"><b>🌬️ No, that's enough</b><small>It will use oxygen from the air</small></button>`); }
function apOxDemo(yes) { msModalClose();
  if (!yes) { apSay("angry", "To burn anything you need <b>fuel AND oxygen</b>. In space there is <b>no atmosphere and no oxygen</b>. How are you going to burn your fuel? Don't forget to carry oxygen!", 9000); return setTimeout(apOxDemoAsk, 2200); }
  msPoints(150, "oxidizer for all 3 stages"); apSay("happy", "Yes! Fuel + oxygen = fire. In space you must bring your own oxygen."); let n = 0;
  ["sic", "sii", "sivb"].forEach((id) => { const tk = TANKS[id].find((x) => x.k === "lox"); apFill(id, tk, () => { AP.fuel[id + "_lox"] = 1; msWeight(id + "_lox", `${PARTS[id].name} liquid oxygen`, tk.t); if (++n === 3) apFuelDone(); }, 2); }); }
