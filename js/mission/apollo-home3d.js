// mission/apollo-home3d.js — PART C in 3D (orbit + trip home):
//  XFER3D: in Moon orbit, 2 astronauts float from the Command Module into the Lunar Module (1 stays), legs unfold, undock, the LM turns its engine to the Moon.
//  RDV3D:  after the moonwalk the ascent stage docks with the Command Module; rock boxes and astronauts float across; the player jettisons the ascent stage.
//  TEI:    in Moon orbit (apollo-moonorb3d.js): hold to burn; too little = still in Moon orbit; enough = trans-Earth.
//  TEC3D:  wide view Moon → Earth; Earth's gravity pulls harder as we get closer, so we speed up (about 1.6 → 11 km/s).
// Facts (NASA Apollo 11 Mission Report): 21.5 kg of Moon rocks and soil came home in 2 rock boxes; the ascent stage was left in lunar orbit;
// TEI: Service Module engine, about 2 min 30 s, about 1.0 km/s, behind the Moon; the trip home took about 60 hours; re-entry at about 11 km/s.
const HX = {};
function hsScene(key, extra) { if (MS.S) MS.S.key = "old";
  msScene(key, (S) => { const s = S.scene; s.background = new THREE.Color(0x000000); const sf = starfield(s, 3000); sf.scale.setScalar(5);
    s.add(new THREE.AmbientLight(0x8899bb, 0.4)); s.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.35)); const sun = MQ.sun(s, V3(60, 40, 50), 30, 2048); sun.intensity = 1.5;
    const mn = K.moon(380, V3(0, -430, -140), s); if (mn) mn.rotation.x = Math.PI / 2; S.st = {}; extra(S); }); }
function hsSee(obj, op) { obj.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = op; o.material.depthWrite = false; } }); }
function hsAstro(k, sc) { const list = apCrewList(), who = AP.crew && AP.crew.length ? AP.crew : [0, 1, 2], c = list[who[k]] || list[k];
  const a = makeAstronaut({ faceTex: faceTexFrom(c.face), depthTex: genericDepthTex(), stripe: c.stripe, cdr: k === 0, name: "", suit: 0xe8742a });
  a.scale.setScalar(sc); a.userData.name = crewName(c); return a; }
// CSM standing up, with the LM (or ascent stage) docked upside-down on the CM's nose
// stack-frame point -> world point (the stack lies on its side: LM on the left, CSM on the right)
const hsW = (v) => v.clone().applyAxisAngle(V3(0, 0, 1), Math.PI / 2);
const hsQ = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
function hsStack(S, ascentOnly) { const root = new THREE.Group(); S.scene.add(root); const s = root, C = buildCSM(); s.add(C.g); C.shield.visible = false; const lm = buildLM({ folded: !ascentOnly }); s.add(lm.g); if (ascentOnly) lm.descent.visible = false;
  // brighter, less mirror-like metal so the CM and SM show up well against black space
  [C.g, lm.g].forEach((g) => g.traverse((o) => { if (o.isMesh && o.material && o.material.metalness > 0.3) { o.material = o.material.clone(); o.material.metalness = 0.3; o.material.roughness = Math.max(0.45, o.material.roughness); } }));
  lm.ascentMats.length = 0; lm.ascent.traverse((o) => { if (o.isMesh && o.material) lm.ascentMats.push(o.material); });
  // docking tunnel: CM nose → LM top hatch (about 80 cm wide), with the docking ring
  const cmTop = C.cm.position.y + SAT_H.cm, tl = 0.75, tm = MQ.mat(0xd4d8dd, { metalness: 0.3, roughness: 0.5 });
  const tun = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, tl, 32), tm); tun.position.y = cmTop + tl / 2; C.g.add(tun);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 10, 36), MQ.mat(0x8f969e, { metalness: 0.3 })); ring.rotation.x = Math.PI / 2; ring.position.y = cmTop + tl; C.g.add(ring);
  const apex = cmTop + tl; lm.g.rotation.x = Math.PI; const dockY = apex + 4.98; lm.g.position.y = dockY;
  hsSee(C.cm, 0.6); hsSee(tun, 0.7); lm.ascentMats.forEach((m) => { m.transparent = true; m.opacity = 0.4; m.depthWrite = false; m.needsUpdate = true; });
  root.rotation.z = Math.PI / 2; root.updateMatrixWorld(true);
  msLabel("⚙️ Service Module (engine + fuel)", hsW(V3(2.9, 1.2, 0)), ""); S.st.tunnel = tun;
  return { root, C, lm, apex, dockY, cmY: SAT_Y.cm - SAT_Y.sm + 1.4, lmY: dockY - 3.6 }; }
function hsFloat(a, from, to, T, done, rx) { HX.floats.push({ a, from, to, t: 0, T, done, rx: rx || 0 }); a.visible = true; }
function hsTick(dt, t) { const S = MS.S; HX.floats = HX.floats.filter((f) => { f.t += dt; const k = Math.min(1, f.t / f.T), e = K.ease(k);
    const mid = V3(0, HX.apex, 0); f.a.position.copy(k < 0.5 ? f.from.clone().lerp(mid, e * 2) : mid.clone().lerp(f.to, (e - 0.5) * 2)); f.a.rotation.set(f.rx * Math.max(0, Math.min(1, (k - 0.5) * 2.2)), f.a.rotation.y, Math.sin(t * 1.5) * 0.12);   // float head-first, then flip to stand on the LM floor   // upright: float head-first up the tunnel
    if (k >= 1) { f.a.rotation.set(f.rx, 0, 0); f.done && f.done(); return false; } return true; });
  HX.tick && HX.tick(dt, t); }

// =====================================================================  crew transfer into the LM, then undock
function XFER3D() { flSteps(8); FL.ph = "xfer3d"; flHud(false); Object.assign(HX, { inLM: [], floats: [], tick: null });
  hsScene("xfer3d", (S) => { const st = hsStack(S, false); Object.assign(S.st, st); HX.apex = st.apex;
    const crew = [0, 1, 2].map((k) => { const a = hsAstro(k, 0.15); a.rotation.x = 0; a.position.set(-0.8 + k * 0.8, st.cmY, 0); st.root.add(a); a.userData.spot = a.position.clone(); return a; }); S.st.crew = crew;
    msLabel("🔺 Command Module", hsW(V3(3.2, st.cmY, 0)), "gold"); msLabel("🕷️ Lunar Module (docked)", hsW(V3(3.6, st.dockY - 3.4, 0)), "blue"); msLabel("🔁 tunnel", hsW(V3(1.4, st.apex, 0)), "");
    S.orbit = { target: hsW(V3(0, st.apex - 1, 0)), dist: 24, yaw: 0.25, pitch: 0.2, auto: 0 }; S.update = (dt, t) => hsTick(dt, t); });
  apHint("Move 2 astronauts into the Lunar Module. One must stay in the Command Module to fly it and pick you up later.");
  hxXferUI(); flChat("capcom", "Apollo, you are GO for undocking.");
}
function hxXferUI() { const crew = MS.S.st.crew;
  apPanel(`<h3>🔁 Float into the Lunar Module (${HX.inLM.length}/2)</h3><p class="lead">The tunnel between the two spacecraft is only about <b>80 cm</b> wide. In zero gravity you just float through! Pick the <b>2</b> moonwalkers.</p>
    <div class="lcRow cmp">${crew.map((a, i) => `<button class="pick ${HX.inLM.includes(i) ? "good" : ""}" ${HX.inLM.includes(i) || HX.busy ? "disabled" : ""} onclick="hxMove(${i})"><b>${HX.inLM.includes(i) ? "✅ " : "🧑‍🚀 "}${a.userData.name} → LM</b></button>`).join("")}</div>
    <div class="row">${HX.inLM.length === 2 ? `${HX.legs ? "" : `<button class="btn go pulse" onclick="hxLegs()">🦵 Unfold the landing legs</button>`}${HX.legs ? `<button class="btn go pulse" onclick="hxUndock()">🔓 Close the hatches and undock</button>` : ""}` : ""}</div>`); }
function hxMove(i) { if (HX.inLM.length >= 2) { SND.tone(180, 0.18, "square", 0.08); return apSay("angry", "Only 2 fit in the Lunar Module, and someone must stay to fly the Command Module and pick you up later!", 7000); }
  SND.click(); HX.busy = true; const st = MS.S.st, a = st.crew[i], slot = V3(HX.inLM.length ? 0.5 : -0.5, st.lmY, 0.1);
  hsFloat(a, a.position.clone(), slot, 3.2, () => { HX.inLM.push(i); HX.busy = false; a.rotation.set(Math.PI, 0, 0); SND.beep(); if (HX.inLM.length === 2) { const stay = [0, 1, 2].find((k) => !HX.inLM.includes(k)); flChat(stay, "I'll keep the Command Module warm. Good luck, you two!"); } hxXferUI(); }, Math.PI);
  hxXferUI(); }
function hxLegs() { SND.click(); const lm = MS.S.st.lm; lm.legSet(false); lm.g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); HX.legs = true; SND.tone(140, 0.25, "triangle", 0.1);
  flBanner("🦵 The 4 landing legs swing out and lock", 3000); hxXferUI(); }
function hxUndock() { SND.click(); MS.ui.innerHTML = ""; const st = MS.S.st, lm = st.lm, crew = HX.inLM.map((i) => st.crew[i]); crew.forEach((a) => lm.g.attach(a)); let T = 0;
  flSpeak("The Eagle has wings."); flBanner("🔓 Undocked! The Lunar Module turns so its engine faces the Moon", 4000);
  const q0 = hsQ(Math.PI, 0, 0), q1 = hsQ(0, 0, -Math.PI / 2);
  HX.tick = (dt) => { T += dt; const k = Math.min(1, T / 2.5); lm.g.position.y = st.dockY + K.ease(k) * 14 + Math.max(0, T - 2.5) * 0.5;
    if (T > 2.5) lm.g.quaternion.slerpQuaternions(q0, q1, K.ease(Math.min(1, (T - 2.5) / 3)));
    MS.S.orbit.goal = { target: hsW(V3(0, lm.g.position.y - 2, 0)), dist: 24 };
    if (T > 6.5 && !HX.out) { HX.out = true; flFadeTo(() => MOON3D()); } }; HX.out = false; }

// =====================================================================  ascent stage docks; rocks and crew float across; jettison
function RDV3D() { flSteps(10); FL.ph = "rdv3d"; flHud(false); Object.assign(HX, { floats: [], tick: null, step: "dock", rocks: 0, inCM: 0, jett: false });
  hsScene("rdv3d", (S) => { const st = hsStack(S, true); Object.assign(S.st, st); HX.apex = st.apex; const lm = st.lm;
    const cmp = hsAstro(2, 0.15); cmp.position.set(0.8, st.cmY, 0); st.root.add(cmp);
    const crew = [0, 1].map((k) => { const a = hsAstro(k, 0.15); a.position.set(k ? 0.5 : -0.5, 3.0, 0.1); lm.g.add(a); return a; }); S.st.crew = crew;
    const boxMat = MQ.mat(0xc9ccd3, { metalness: 0.85, roughness: 0.25 }); const rocks = [0, 1].map((k) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.3, 0.3), boxMat); b.position.set(k ? 0.35 : -0.35, 3.3, 0.6); b.castShadow = true; lm.g.add(b); return b; }); S.st.rocks = rocks;
    msLabel("🔺 Command Module", hsW(V3(3.2, st.cmY, 0)), "gold"); msLabel("🕷️ Ascent stage", () => hsW(lm.g.position.clone().add(V3(3, -3.4, 0))), "blue");
    // start: the ascent stage is out to the side, upright, and flies in
    HX.dockY = st.dockY; lm.g.position.set(-26, st.dockY - 10, 9); lm.g.rotation.set(0, 0, -Math.PI / 2); lm.flame.visible = true;
    const puffs = []; for (let i = 0; i < 6; i++) { const p = glowSprite("rgba(255,255,255,0.9)", 0.6); p.visible = false; st.root.add(p); puffs.push(p); } S.st.puffs = puffs;
    S.orbit = { target: hsW(V3(-8, st.apex, 4)), dist: 34, yaw: 0.25, pitch: 0.2, auto: 0 }; S.update = (dt, t) => hsTick(dt, t); });
  flChat("capcom", "Eagle, Columbia is in sight. Bring her home!"); MS.ui.innerHTML = ""; let T = 0; const st = MS.S.st, lm = st.lm, p0 = lm.g.position.clone(), p1 = V3(0, HX.dockY, 0);
  HX.tick = (dt, t) => { if (HX.step !== "dock") return hxRdvTick(dt, t); T += dt; const k = Math.min(1, T / 8), e = K.ease(k);
    lm.g.position.lerpVectors(p0, p1, e); lm.g.quaternion.slerpQuaternions(hsQ(0, 0, -Math.PI / 2), hsQ(Math.PI, 0, 0), K.ease(Math.min(1, T / 5))); lm.flame.visible = T < 2;
    st.puffs.forEach((p, i) => { p.visible = T > 2 && T < 8 && Math.sin(t * 20 + i) > 0.3; p.position.copy(lm.g.position).add(V3((i % 3 - 1) * 1.6, -3.4, (i < 3 ? 1 : -1) * 1.2)); });
    MS.S.orbit.goal = { target: hsW(lm.g.position.clone().lerp(V3(0, HX.apex, 0), 0.6)), dist: 34 - 16 * e };
    if (k >= 1) { HX.step = "docked"; st.puffs.forEach((p) => (p.visible = false)); SND.tone(140, 0.25, "triangle", 0.12); flSpeak("Docking confirmed."); msPoints(500, "docked with the Command Module"); hxRdvUI(); } };
}
function hxRdvTick() {}
function hxRdvUI() { const st = MS.S.st;
  apPanel(`<h3>🔗 Docked! Now move everything into the Command Module</h3><p class="lead">Only the Command Module comes home, so the Moon rocks and the crew must float across through the tunnel.</p>
    <div class="lcRow cmp"><button class="pick ${HX.rocks >= 2 ? "good" : ""}" ${HX.rocks >= 2 || HX.busy ? "disabled" : ""} onclick="hxRocks()"><b>${HX.rocks >= 2 ? "✅ " : ""}🪨 Pass the 2 rock boxes</b></button>
      ${st.crew.map((a, i) => `<button class="pick ${a.userData.inCM ? "good" : ""}" ${a.userData.inCM || HX.busy ? "disabled" : ""} onclick="hxCrew(${i})"><b>${a.userData.inCM ? "✅ " : "🧑‍🚀 "}${a.userData.name} → CM</b></button>`).join("")}</div>
    <div class="row"><button class="btn ghost" onclick="hxKeep()">🤔 Keep the ascent stage</button><button class="btn go" onclick="hxJett()">👋 Jettison the ascent stage</button></div>`); }
function hxRocks() { SND.click(); HX.busy = true; const st = MS.S.st; let n = 0;
  st.rocks.forEach((b, i) => setTimeout(() => { MS.S.st.root.attach(b); hsFloat(b, b.position.clone(), V3(i ? 0.6 : -0.6, st.cmY - 0.4, 0.4), 2.6, () => { n++; HX.rocks++; SND.beep(); if (n === 2) { HX.busy = false; msPoints(500, "Moon rocks on board");
      flBanner("🪨 2 rock boxes: about <b>21.5 kg</b> of Moon rocks and soil (Apollo 11)", 4500); } hxRdvUI(); }); }, i * 900)); hxRdvUI(); }
function hxCrew(i) { SND.click(); HX.busy = true; const st = MS.S.st, a = st.crew[i]; st.root.attach(a);
  hsFloat(a, a.position.clone(), V3(i ? -0.8 : 0, st.cmY, 0), 3.2, () => { a.rotation.set(0, 0, 0); a.userData.inCM = true; HX.busy = false; SND.beep(); hxRdvUI(); }); hxRdvUI(); }
function hxKeep() { SND.click(); apSay("angry", "No! The empty ascent stage weighs about <b>2.5 tonnes</b>. Pushing it home would waste fuel the engine needs for the trip back, and it can't survive re-entry anyway. Let it go!", 9000); }
function hxJett() { const st = MS.S.st, left = st.crew.filter((a) => !a.userData.inCM);
  if (HX.rocks < 2 || left.length) { SND.tone(1000, 0.2, "square", 0.08); return apSay("angry", left.length ? `STOP! ${left.map((a) => a.userData.name).join(" and ")} ${left.length > 1 ? "are" : "is"} still in the ascent stage!` : "Wait! The Moon rocks are still in the ascent stage!", 7000); }
  SND.click(); MS.ui.innerHTML = ""; msPoints(300, "ascent stage jettisoned"); flSpeak("Jettison."); let T = 0; const lm = st.lm;
  flBanner("👋 Goodbye, ascent stage! Apollo 11's was left in Moon orbit. Later ones were crashed into the Moon on purpose, to test the seismometers.", 6000);
  HX.tick = (dt) => { T += dt; lm.g.position.y += dt * (1 + T); lm.g.position.x -= dt * T * 0.8; lm.g.rotation.z += dt * 0.3; MS.S.orbit.goal = { target: hsW(V3(0, HX.apex, 0)), dist: 22 };
    if (T > 4 && !HX.tei) { HX.tei = true; apPanel(`<h3>🏠 Ready to go home</h3><p class="lead">Only the Command Module and Service Module are left. The Service Module's big engine will push us out of Moon orbit: <b>Trans-Earth Injection (TEI)</b>.</p><div class="row"><button class="btn go pulse" onclick="flFadeTo(()=>MOONTEI())">🔥 Let's go home: TEI burn ▶</button></div>`); } }; }

// =====================================================================  the trans-Earth trip, wide view
function TEC3D() { flSteps(10); FL.ph = "tec3d"; if (MS.S) MS.S.key = "old"; const tt = document.getElementById("tecTitle") || (() => { const d = document.createElement("div"); d.id = "tecTitle"; document.getElementById("msLabels").appendChild(d); return d; })();
  tt.innerHTML = "🌍 TRANS-EARTH ORBIT<small>coming home: about 60 hours</small>"; tt.style.display = "";
  msScene("tec3d", (S) => { const s = S.scene; const sf = starfield(s, 3000); sf.scale.setScalar(6); s.add(new THREE.AmbientLight(0x8899bb, 0.35)); const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(40, 60, 200); s.add(sun);
    const E = V3(-90, 0, 0), M = V3(90, 0, 0), earth = K.earth(9, E, s), moon = K.moon(2.5, M, s);
    const curve = new THREE.CatmullRomCurve3([V3(87, 0, 3.5), V3(60, 0, 22), V3(10, 0, 34), V3(-50, 0, 22), V3(-80, 0, 9), V3(-88.5, 0, 9.4)]), pts = curve.getSpacedPoints(400);
    K.line(s, pts, 0x7fd4ff, 0.35, true);
    // time per step from real speeds: v = sqrt(0.8² + 2·398,600/r) km/s, with r in km (Earth–Moon = 384,400 km)
    const kmPer = 384400 / 180, rk = (p) => Math.max(6500, (p.distanceTo(E) - 9) * kmPer + 6500), spd = pts.map((p) => Math.sqrt(0.64 + 2 * 398600 / rk(p))); let T1 = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]) * kmPer / ((spd[i] + spd[i - 1]) / 2); seg.push(d); T1 += d; }
    const ship = new THREE.Group(); const C = buildCSM(); C.g.scale.setScalar(0.25); C.shield.visible = false; ship.add(C.g); ship.add(glowSprite("rgba(255,230,140,0.9)", 4)); s.add(ship);
    const arrow = new THREE.ArrowHelper(V3(-1, 0, 0), V3(), 6, 0xffd27a, 2, 1.2); s.add(arrow);
    const trail = new THREE.BufferGeometry(), tp = new Float32Array(402 * 3), tc = new Float32Array(402 * 3); trail.setAttribute("position", new THREE.BufferAttribute(tp, 3)); trail.setAttribute("color", new THREE.BufferAttribute(tc, 3)); trail.setDrawRange(0, 0); pts.forEach((p, i) => { tp.set([p.x, p.y, p.z], i * 3); const k = Math.min(1, (spd[i] - 1.5) / 9.5); tc.set([0.3 + 0.7 * k, 0.6 - 0.3 * k, 1 - 0.8 * k], i * 3); });
    s.add(new THREE.Line(trail, new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 })));
    const lbl = msLabel("", () => ship.position.clone().add(V3(0, 7, 0)), "big"), glbl = msLabel("🌍 Earth's gravity pulls us in", () => ship.position.clone().add(V3(-10, -5, 0)), "gold");
    S.st = { E, pts, spd, seg, T1, ship, arrow, trail, tp, tc, lbl, rk, i: 0, acc: 0 };
    S.orbit = { target: V3(0, 0, 14), dist: 170, yaw: 0, pitch: 1.05, auto: 0 }; S.update = (dt) => tecTick(dt); });
  apPanel(`<h3>🏠 Falling home to Earth</h3><p class="lead">No engine is firing. Going home is like <b>rolling downhill</b>: the closer we get, the harder <b>Earth's gravity pulls</b> (yellow arrow), so we go <b>faster and faster</b>, from about 1.6 km/s to about <b>11 km/s</b>!</p>`);
  flChat("capcom", "Apollo, the burn looked great. Welcome back!"); }
function tecTick(dt) { const st = MS.S.st, n = st.pts.length; if (st.i >= n - 1) return;
  st.acc += dt * st.T1 / 26; while (st.i < n - 1 && st.acc >= st.seg[st.i]) { st.acc -= st.seg[st.i]; st.i++; }
  const i = st.i, p = st.pts[i], q = st.pts[Math.min(n - 1, i + 1)], v = st.spd[i]; st.ship.position.copy(p); st.ship.quaternion.setFromUnitVectors(V3(0, 1, 0), q.clone().sub(p).normalize().negate());
  const toE = st.E.clone().sub(p), rkm = st.rk(p), g = 398600 / (rkm * rkm) * 1000;                         // m/s²
  st.arrow.position.copy(p); st.arrow.setDirection(toE.normalize()); const L = 3 + Math.min(30, Math.log10(1 + g * 1000) * 7); st.arrow.setLength(L, Math.min(3, L * 0.3), Math.min(1.8, L * 0.2));
  st.trail.setDrawRange(0, i + 1); st.trail.attributes.position.needsUpdate = true; st.trail.attributes.color.needsUpdate = true;
  st.lbl.el.innerHTML = `⚡ ${v.toFixed(1)} km/s and speeding up!`; st.lbl.el.className = "acLbl big " + (v > 6 ? "red" : v > 3 ? "gold" : "blue");
  flHud(true, v.toFixed(2), "km/s", `${K.fmt(Math.round(rkm / 1000) * 1000)} km from Earth · hour ${Math.round(60 * i / (n - 1))}`);
  MS.S.orbit.goal = i > n * 0.82 ? { target: V3(-80, 0, 8), dist: 70, pitch: 0.9 } : { target: V3(0, 0, 14), dist: 170, pitch: 1.05 };
  if (i === Math.floor(n * 0.4)) flChat(1, "We're speeding up!"); if (i === Math.floor(n * 0.42)) flChat(2, "Earth's gravity is pulling us home.");
  if (i >= n - 1 && !st.end) { st.end = true; SND.beep(); msPoints(500, "home at 11 km/s");
    apPanel(`<h3>🔥 11 km/s: hitting the air!</h3><p class="lead">We fell all the way home, speeding up from about 1.6 to about <b>11 km/s</b> (about 40,000 km/h). Now the Command Module leaves the Service Module behind and turns its <b>heat shield</b> forward…</p><div class="row"><button class="btn go pulse" onclick="hxReentry()">🔥 Re-entry and splashdown ▶</button></div>`); } }
function hxReentry() { SND.click(); const tt = document.getElementById("tecTitle"); if (tt) tt.style.display = "none";
  flFadeTo(() => REENTRY3D()); }   // the last part is now 3D: separation → fiery re-entry → parachutes → splashdown
