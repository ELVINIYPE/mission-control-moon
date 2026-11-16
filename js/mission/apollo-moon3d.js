// mission/apollo-moon3d.js — PART C in 3D: landing method → powered descent (you fly it) → touchdown → overshoes → hatch (high five)
// → climb down one by one → "one small step" → moonwalk (walk, jump, flag, radio call, tool drawer, footprints) → liftoff → back to the 2D trip home.
// Real numbers (NASA Apollo 11 Mission Report): Moon gravity 1.62 m/s²; touchdown at about 0.5 m/s; Eagle landed with about 25 s of fuel left;
// "picking up some dust" about 30 m up; radio round trip Earth–Moon about 2.6 s; flag with a top rod (no air, no wind);
// a suited astronaut + backpack weighed about 165 kg on Earth (about 27 kg "Moon weight").
const MC = {};
const G_MOON = 1.62;

function MOON3D() { flSteps(8); FL.ph = "moon3d"; MC.anim = null; flHud(false); if (MS.S) MS.S.key = "old";
  Object.assign(MC, { step: "choose", alt: 60, vy: -6, fuel: 1, hold: false, keys: {}, sel: 0, prints: [], acts: {}, t: 0, tw: [], carry: null, salute: null, inRover: false, done: {}, rocks: 0, busy: false, near: -1, build: 0 });
  msScene("moon3d", (S) => { const s = S.scene; s.background = new THREE.Color(0x000000); const sf = starfield(s, 3000); sf.scale.setScalar(6);
    s.add(new THREE.AmbientLight(0x8899aa, 0.18)); const sun = MQ.sun(s, V3(-80, 18, 50), 30, 4096); sun.intensity = 1.7;          // low morning Sun, long shadows (like Apollo 11)
    const fill = new THREE.DirectionalLight(0x6f8fbf, 0.12); fill.position.set(40, 10, -30); s.add(fill);
    // ground: flat landing area, rolling hills and craters further out
    const gg = new THREE.PlaneGeometry(400, 400, 160, 160); gg.rotateX(-Math.PI / 2); const pos = gg.attributes.position;
    const craters = [...Array(26)].map(() => [(Math.random() - 0.5) * 360, (Math.random() - 0.5) * 360, 3 + Math.random() * 14]);
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z); let y = 0;
      if (d > 16) { const k = Math.min(1, (d - 16) / 25); y = (Math.sin(x * 0.07) * Math.cos(z * 0.05) * 1.6 + Math.sin(x * 0.21 + z * 0.13) * 0.35) * k;
        craters.forEach(([cx, cz, r]) => { const q = Math.hypot(x - cx, z - cz) / r; if (q < 1) y -= (1 - q * q) * r * 0.18 * k; else if (q < 1.3) y += (1.3 - q) * r * 0.12 * k; }); }
      pos.setY(i, y); }
    gg.computeVertexNormals(); const tx = moonTexture(); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(30, 30);
    const ground = new THREE.Mesh(gg, MQ.mat(0x9a968f, { map: tx, roughness: 1 })); ground.receiveShadow = true; s.add(ground);
    const earth = K.earth(9, V3(110, 60, -240), s);
    const lm = buildLM(); s.add(lm.g); lm.g.position.y = MC.alt; mcDoors(lm);
    // a limp parachute (it can't open: no air)
    const chute = new THREE.Group(); const can = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 10, 0, Math.PI * 2, 0, 1.0), MQ.mat(0xe8590c, { side: THREE.DoubleSide })); can.scale.set(0.5, 1.4, 0.5); can.position.y = 9; chute.add(can);
    [-1, 1].forEach((k) => K.line(chute, [V3(0.8 * k, 5, 0), V3(0.3 * k, 8.2, 0)], 0xdddddd, 0.8)); chute.visible = false; lm.g.add(chute);
    // dust (the engine blasts the soil sideways, flat and fast: no air to make clouds)
    const ND = 1400, dp = new Float32Array(ND * 3), dv = new Float32Array(ND * 3), dl = new Float32Array(ND); const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xb9b3a8, size: 0.12, transparent: true, opacity: 0.85, depthWrite: false })); dust.frustumCulled = false; s.add(dust);
    const boom = []; for (let i = 0; i < 26; i++) { const b = glowSprite(i % 3 ? "rgba(255,140,40,1)" : "rgba(120,110,100,.9)", 3); b.visible = false; s.add(b); boom.push({ b, v: V3() }); }
    // the two moonwalkers
    const suit = GAME.mis.suit === "artemis" ? 0xe8742a : undefined, list = apCrewList(), who = (AP.crew && AP.crew.length ? AP.crew : [0, 1, 2]);
    const crew = [0, 1].map((k) => { const c = list[who[k]] || list[k]; const a = makeAstronaut({ faceTex: faceTexFrom(c.face), depthTex: genericDepthTex(), stripe: c.stripe, cdr: k === 0, name: "", suit });
      a.scale.setScalar(0.24); a.traverse((o) => { if (o.isMesh) o.castShadow = true; }); a.visible = false; s.add(a); a.userData.name = crewName(c); a.userData.where = "in"; return a; });
    // flag (with the top rod), footprint texture, radio rings
    const flag = new THREE.Group(); flag.visible = false; s.add(flag); MQ.strut(flag, V3(0, 0, 0), V3(0, 2.4, 0), 0.025, MQ.mat(0xdddddd, { metalness: 0.6 })); const bar = new THREE.Group(); bar.position.y = 2.38; flag.add(bar); MQ.strut(bar, V3(0, 0, 0), V3(1.2, 0, 0), 0.015, MQ.mat(0xdddddd)); flag.scale.setScalar(0.7);
    const ft = canvasTex(300, 180, (x, w, h) => { for (let i = 0; i < 13; i++) { x.fillStyle = i % 2 ? "#fff" : "#b22234"; x.fillRect(0, (i * h) / 13, w, h / 13 + 1); } x.fillStyle = "#3c3b6e"; x.fillRect(0, 0, w * 0.42, h * 7 / 13);
      x.fillStyle = "#fff"; const cw = w * 0.42, ch = h * 7 / 13; for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++) { x.beginPath(); x.arc(((r % 2 ? 2 : 1) + 2 * c) * cw / 12, (r + 1) * ch / 10, 3.2, 0, 7); x.fill(); } });   // 50 stars
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75, 12, 6), MQ.mat(0xffffff, { map: ft, side: THREE.DoubleSide, roughness: 0.9 })); cloth.geometry.translate(0.6, 0, 0); cloth.position.set(0, 2.0, 0); cloth.castShadow = true; flag.add(cloth); flag.userData = { bar, cloth };
    const cp = cloth.geometry.attributes.position; for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 6) * 0.03);                // the famous wrinkles (it was folded in a tube)
    const printTex = canvasTex(64, 128, (x, w, h) => { x.fillStyle = "rgba(40,38,35,.85)"; x.beginPath(); x.ellipse(32, 64, 24, 58, 0, 0, 7); x.fill(); x.strokeStyle = "rgba(150,145,138,.9)"; x.lineWidth = 4; for (let y = 16; y < 116; y += 11) { x.beginPath(); x.moveTo(12, y); x.lineTo(52, y); x.stroke(); } });
    const rings = [0, 1, 2, 3].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 32), K.basic(0x7dffb5, { transparent: true })); r.visible = false; s.add(r); return r; });
    const veh = [mcRover()]; veh.forEach((v) => { v.visible = false; s.add(v); }); const rocks = mcRocks(s), kit = mcKit(s);
    const trackTex = canvasTex(64, 128, (x, w, h) => { x.fillStyle = "rgba(45,42,38,.75)"; x.fillRect(4, 0, 18, h); x.fillRect(42, 0, 18, h); x.strokeStyle = "rgba(150,145,138,.8)"; x.lineWidth = 3; for (let y = 4; y < h; y += 10) { x.beginPath(); x.moveTo(4, y); x.lineTo(22, y + 5); x.moveTo(42, y); x.lineTo(60, y + 5); x.stroke(); } });
    S.st = { lm, chute, dust, dp, dv, dl, boom, crew, flag, printTex, rings, earth, ground, veh, trackTex, rocks, kit };
    S.orbit = { target: V3(0, MC.alt - 4, 0), dist: 34, yaw: 0.65, pitch: 0.12, auto: 0 };
    S.update = (dt, t) => mcTick(dt, t);
  });
  mcChoose();
  if (!MC.keyOn) { MC.keyOn = true; addEventListener("keydown", (e) => { if (FL.ph !== "moon3d") return; MC.keys[e.key] = true; if (e.key === " " && MC.step === "descent") { MC.hold = true; e.preventDefault(); } });
    addEventListener("keyup", (e) => { MC.keys[e.key] = false; if (e.key === " ") MC.hold = false; }); }
}
const mcLM = () => MS.S.st.lm;
function mcChoose() { MC.step = "choose"; MC.alt = 60; MC.vy = -6; MC.fuel = 1; const st = MS.S.st; st.lm.g.position.y = 60; st.lm.g.rotation.set(0, 0, 0); st.lm.g.visible = true; st.chute.visible = false; st.boom.forEach((b) => (b.b.visible = false));
  MS.S.orbit.goal = { target: V3(0, 59, 0), dist: 30, yaw: 0.65, pitch: 0.16 }; flHud(true, "6.0", "m/s ↓", "final approach · no air on the Moon");
  apHint("The Moon has no air: parachutes can't work. Only the landing engine, firing downward, can slow you down.");
  apPanel(`<h3>🕷️ Landing: how do we slow down?</h3><p class="lead">The Lunar Module is on its final approach, falling toward the surface. The Moon has <b>no air</b>. Choose:</p>
    <div class="lcRow"><button class="pick" onclick="mcPick('engine')"><b>🔥 Landing engine</b><small>Fire it downward to brake</small></button><button class="pick" onclick="mcPick('both')"><b>🔥🪂 Engine + parachute</b><small>Belt and braces?</small></button><button class="pick" onclick="mcPick('chute')"><b>🪂 Parachute only</b><small>Like the Command Module on Earth</small></button></div>`); }
function mcPick(k) { SND.click(); const st = MS.S.st; st.chute.visible = k !== "engine"; MC.mode = k;
  if (k === "chute") { MC.step = "chute"; MC.vy = -6; SND.tone(1000, 0.2, "square", 0.06); apPanel(`<h3>🪂 Parachute deployed…</h3><p class="lead">Watch what happens with no air.</p>`); return; }
  if (k === "engine") msPoints(1000, "landing engine: the only way with no air"); else { msPoints(500, "engine works; the parachute is dead weight"); apSay("sad", "The parachute just hangs there: no air to fill it. The engine does all the work, and the chute is useless extra weight!", 8000); }
  mcDescentUI(); }
function mcDescentUI() { MC.step = "descent"; MC.alt = 60; MC.vy = -6; MC.fuel = 1; mcLM().g.position.y = 60; mcLM().g.rotation.set(0, 0, 0);
  apHint("Hold the button (or SPACE) to slow down. Let go to fall. Touch down slower than 1.5 m/s!");
  apPanel(`<h3>🔥 You are flying the Eagle!</h3><p class="lead">Hold to fire the engine and slow down. Touch down <b>slower than 1.5 m/s</b>. Watch your fuel: Apollo 11 landed with only about <b>25 seconds</b> left!</p>
    <div class="lcRow" style="align-items:center">${K.meter("mcFuel", "⛽ Fuel")}<button class="btn go pulse holdBtn" id="mcBurn" onpointerdown="MC.hold=true;event.preventDefault()">🔥 HOLD to slow down</button></div>`);
  flSpeak("Eagle, you are go for landing."); }
// ---------------------------------------------------------------- the frame-by-frame update
function mcTick(dt, t) { const S = MS.S, st = S.st, lm = st.lm; MC.t += dt; if (MC.anim) MC.anim(Math.min(dt, 0.1));
  if (MC.tw.length) { const cur = MC.tw; MC.tw = []; const keep = cur.filter((w) => { w.t += Math.min(dt, 0.1 * (MS.speed || 1)); const k = Math.min(1, w.t / w.T); w.fn(k); if (k >= 1) { w.done && w.done(); return false; } return true; }); MC.tw = keep.concat(MC.tw); }   // tweens started inside a "done" are kept
  // dust
  const { dp, dv, dl } = st; let alive = 0;
  for (let i = 0; i < dl.length; i++) { if (dl[i] > 0) { dl[i] -= dt; dv[i * 3 + 1] -= G_MOON * dt; dp[i * 3] += dv[i * 3] * dt; dp[i * 3 + 1] += dv[i * 3 + 1] * dt; dp[i * 3 + 2] += dv[i * 3 + 2] * dt; if (dp[i * 3 + 1] < 0) dl[i] = 0; alive++; } else dp[i * 3 + 1] = -50; }
  st.dust.geometry.attributes.position.needsUpdate = true;
  st.boom.forEach((b) => { if (!b.b.visible) return; b.b.position.addScaledVector(b.v, dt); b.v.multiplyScalar(0.96); b.b.scale.multiplyScalar(1 + dt * 1.2); b.b.material.opacity = Math.max(0, b.b.material.opacity - dt * 0.4); });
  if (MC.step === "choose") { lm.g.position.y = 60 + Math.sin(t * 1.5) * 0.4; return; }
  if (MC.step === "chute") { MC.vy -= G_MOON * dt * 6; MC.alt += MC.vy * dt; lm.g.position.y = Math.max(0, MC.alt); st.chute.children[0].rotation.z = Math.sin(t * 12) * 0.5; st.chute.children[0].scale.x = 0.4 + Math.sin(t * 9) * 0.15;
    S.orbit.goal = { target: V3(0, Math.max(3, MC.alt), 0), dist: 34 };
    if (MC.alt <= 0) mcCrash("Parachutes don't work on the Moon!", "A parachute needs <b>air</b> to push against. The Moon has none, so it flapped like a rag and the lander hit the ground at full speed. On the Moon, only a <b>rocket engine firing downward</b> can slow you down. (On Earth, the Command Module DOES use parachutes.)", "crashed: no parachutes on the Moon");
    return; }
  if (MC.step === "descent") { const burn = MC.hold && MC.fuel > 0; lm.dflame.visible = burn; if (burn) { MC.vy += 3.4 * dt; MC.fuel = Math.max(0, MC.fuel - dt / 22); }
    MC.vy -= G_MOON * dt; MC.alt += MC.vy * dt; lm.g.position.y = Math.max(0, MC.alt); lm.dflame.scale.setScalar(burn ? 1 + Math.sin(t * 40) * 0.1 : 1);
    K.setMeter("mcFuel", MC.fuel, Math.round(MC.fuel * 100) + "%", MC.fuel < 0.25 ? "#e05050" : "#2fbf71");
    flHud(true, Math.abs(MC.vy).toFixed(1), "m/s " + (MC.vy < 0 ? "↓" : "↑"), `${Math.max(0, MC.alt).toFixed(1)} m up · fuel ${Math.round(MC.fuel * 100)}%`);
    if (burn && MC.alt < 25) mcDust(0, 0, 14, 18, 6);
    if (MC.alt < 30 && !MC.dustSaid) { MC.dustSaid = true; flChat(1, "Picking up some dust…"); }
    if (MC.fuel < 0.3 && !MC.fuelSaid) { MC.fuelSaid = true; flChat("capcom", "60 seconds!"); SND.tone(800, 0.15, "square", 0.05); }
    S.orbit.goal = { target: V3(0, Math.max(2, MC.alt * 0.85), 0), dist: 22 + Math.min(14, MC.alt * 0.25), yaw: 0.65, pitch: 0.12 };
    if (MC.alt <= 0) { const v = -MC.vy; lm.dflame.visible = false; MC.hold = false;
      if (v >= 3) return mcCrash("Too hard: the legs collapsed!", `You hit the ground at <b>${v.toFixed(1)} m/s</b>. The landing legs can only soak up about 3 m/s. Apollo 11 touched down at about <b>0.5 m/s</b>, slower than a slow walk. Brake earlier and land gently!`, "hard landing");
      MC.step = "landed"; lm.g.position.y = 0; mcDust(0, 0, 18, 10, 120);
      if (v < 1.5) msPoints(1000, `soft touchdown: ${v.toFixed(1)} m/s`); else msPoints(300, `touchdown at ${v.toFixed(1)} m/s (a bit firm)`);
      flSpeak("Contact light."); setTimeout(() => flSpeak("Houston, Tranquility Base here. The Eagle has landed."), 1400); setTimeout(() => { flCheer("The Eagle"); flBanner("🦶 Touchdown! “The Eagle has landed.”", 5000); }, 3800);
      flHud(true, "0.0", "m/s", "on the Moon · Sea of Tranquility"); setTimeout(mcLandedUI, 4200); } return; }
  if (MC.step === "liftoff") { MC.lt += dt; const k = Math.max(0, MC.lt - 0.6); lm.ascent.position.y = 1.3 * k * k; lm.flame.visible = MC.lt > 0.6;
    if (MC.lt > 0.6 && MC.lt < 2.6) mcDust(0, 0, 10, 14, 8);
    if (st.flag.visible && MC.lt > 0.8) st.flag.rotation.z = Math.min(1.45, st.flag.rotation.z + dt * (MC.lt < 2.5 ? 1.3 : 0));       // the blast knocks the flag over (Apollo 11)
    S.orbit.goal = { target: V3(0, 3 + lm.ascent.position.y * 0.6, 0), dist: 26 + lm.ascent.position.y * 0.5 };
    if (MC.lt > 7 && !MC.gone) { MC.gone = true; mcBackTo2D(); } return; }
  // moonwalkers: climbing, walking, jumping
  st.crew.forEach((a, i) => { const u = a.userData;
    if (u.where === "down" || u.where === "up") { u.k = Math.min(1, (u.k || 0) + dt / 4); const k = u.where === "down" ? u.k : 1 - u.k;
      const P = mcLadder(k); a.position.copy(P); a.rotation.y = Math.PI; poseAstronaut(a, t * 6, 0.6, t); u.arms && u.arms.forEach((ar) => ar.rotation.set(-2.4, 0, 0));
      if (u.k >= 1) { if (u.where === "down") { u.where = "out"; a.position.set(i ? 1 : -0.4, 0.9, 5.2); mcFirstStep(a, i); } else { u.where = "in"; a.visible = false; mcAfterClimb(); } } }
    if (u.where === "out") { const sel = MC.sel === i && MC.step === "surface"; let mx = 0, mz = 0;
      if (sel) { const kk = MC.keys; if (kk.ArrowUp || kk.w || MC.mv === "u") mz -= 1; if (kk.ArrowDown || kk.s || MC.mv === "d") mz += 1; if (kk.ArrowLeft || kk.a || MC.mv === "l") mx -= 1; if (kk.ArrowRight || kk.d || MC.mv === "r") mx += 1; }
      if (u.goal) { const d = V3(u.goal.x - a.position.x, 0, u.goal.z - a.position.z); if (d.length() < Math.max(0.15, dt * 2.4)) { a.position.x = u.goal.x; a.position.z = u.goal.z; u.goal = null; u.onArrive && u.onArrive(); } else { d.normalize(); mx = d.x; mz = d.z; } }
      if (mx || mz) { const dir = V3(mx, 0, mz).normalize(), cam = S.camera; if (!u.goal) { const yaw = Math.atan2(cam.position.x - S.orbit.target.x, cam.position.z - S.orbit.target.z); dir.applyAxisAngle(V3(0, 1, 0), yaw); }
        a.position.addScaledVector(dir, dt * (u.goal ? 2.2 : 1.3)); const r = Math.hypot(a.position.x, a.position.z); if (r > 15) a.position.multiplyScalar(15 / r);
        if (Math.hypot(a.position.x, a.position.z - 0.5) < 3.2) { const n = V3(a.position.x, 0, a.position.z - 0.5).normalize(); a.position.x = n.x * 3.2; a.position.z = 0.5 + n.z * 3.2; }
        a.rotation.y = Math.atan2(dir.x, dir.z); u.ph = (u.ph || 0) + dt * 5; u.hop = Math.abs(Math.sin(u.ph)) * 0.22; poseAstronaut(a, u.ph * 1.5, 0.5, t);          // the "bunny hop" Moon gait
        u.dist = (u.dist || 0) + dt * 1.3; if (u.dist > 0.6) { u.dist = 0; mcPrint(a.position.x, a.position.z, a.rotation.y); mcDust(a.position.x, a.position.z, 0.6, 1.2, 4); } }
      else { u.hop = Math.max(0, (u.hop || 0) - dt); poseAstronaut(a, 0, 0, t); }
      if (u.jv !== undefined) { u.jy += u.jv * dt; u.jv -= G_MOON * dt; if (u.jy <= 0) { u.jy = 0; u.jv = undefined; mcDust(a.position.x, a.position.z, 0.8, 1.5, 20); mcPrint(a.position.x, a.position.z, a.rotation.y); } }
      a.position.y = 3.75 * 0.24 + (u.hop || 0) + (u.jy || 0);
      if (sel && !MC.radio && !MC.inRover && MC.t > (MC.lockT || 0)) S.orbit.goal = { target: V3(a.position.x, 1.2, a.position.z), dist: MC.camD || 9 }; } });
  // rovers: unloading from the descent stage, then driving (leaves tyre tracks; the LRV throws "rooster tails" of dust)
  st.veh.forEach((v, j) => { const u = v.userData;
    if (u.unload !== undefined) { u.unload = Math.min(1, u.unload + dt / 3); const k = K.ease(u.unload); v.position.lerpVectors(u.p0, u.p1, k); v.rotation.x = u.r0 * (1 - k);
      u.wheels.forEach((w) => w.scale.setScalar(0.35 + 0.65 * k)); if (u.unload >= 1) { u.unload = undefined; u.out = true; mcDust(v.position.x, v.position.z, 1, 2, 30); SND.tone(140, 0.25, "triangle", 0.1); } }
    if (!u.out) return; const sel = MC.sel === 2 + j && MC.step === "surface" && MC.inRover && !MC.busy; let mx = 0, mz = 0;
    if (sel) { const kk = MC.keys; if (kk.ArrowUp || kk.w || MC.mv === "u") mz -= 1; if (kk.ArrowDown || kk.s || MC.mv === "d") mz += 1; if (kk.ArrowLeft || kk.a || MC.mv === "l") mx -= 1; if (kk.ArrowRight || kk.d || MC.mv === "r") mx += 1; }
    if (mx || mz) { const dir = V3(mx, 0, mz).normalize(), cam = S.camera; dir.applyAxisAngle(V3(0, 1, 0), Math.atan2(cam.position.x - S.orbit.target.x, cam.position.z - S.orbit.target.z));
      v.position.addScaledVector(dir, dt * u.speed); const r = Math.hypot(v.position.x, v.position.z); if (r > 15) v.position.multiplyScalar(15 / r);
      if (Math.hypot(v.position.x, v.position.z - 0.5) < 4) { const n = V3(v.position.x, 0, v.position.z - 0.5).normalize(); v.position.x = n.x * 4; v.position.z = 0.5 + n.z * 4; }
      const want = Math.atan2(dir.x, dir.z); let dA = want - v.rotation.y; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI; v.rotation.y += dA * Math.min(1, dt * 4);
      u.wheels.forEach((w) => (w.rotation.x += dt * u.speed * 3)); u.d = (u.d || 0) + dt * u.speed;
      if (u.d > 0.4) { u.d = 0; const m = new THREE.Mesh(new THREE.PlaneGeometry(u.track * 1.6, 0.45), new THREE.MeshBasicMaterial({ map: st.trackTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
        m.rotation.set(-Math.PI / 2, 0, v.rotation.y); m.position.set(v.position.x, 0.014, v.position.z); MS.S.scene.add(m); MC.prints.push(m); if (MC.prints.length > 300) MS.S.scene.remove(MC.prints.shift());
        if (j === 0) mcDust(v.position.x - Math.sin(v.rotation.y) * 1.2, v.position.z - Math.cos(v.rotation.y) * 1.2, 0.5, 2.5, 8); } }
    if (MC.inRover && !MC.radio && MC.t > (MC.lockT || 0)) S.orbit.goal = { target: V3(v.position.x, 1, v.position.z), dist: 11 }; });
  mcNearTick();
  // something carried in the astronaut's hands; the salute after the flag
  if (MC.carry) { const C = MC.carry, a = C.a; C.o.position.copy(a.position).add(C.off.clone().applyAxisAngle(V3(0, 1, 0), a.rotation.y)); C.o.rotation.y = a.rotation.y + (C.ry || 0); a.userData.arms.forEach((ar) => ar.rotation.set(-1.0, 0, 0)); }
  if (MC.salute && MC.t < MC.salute.until) MC.salute.a.userData.arms[1].rotation.set(-2.6, 0, -0.5);
  // the rover's seats carry the astronauts with it
  st.crew.forEach((a) => { if (a.userData.where === "rover") { a.userData.legs.forEach((h) => (h.rotation.x = -1.45)); } });
  // radio rings travel to Earth and back
  if (MC.radio) { const R = MC.radio; R.t += dt; const ant = R.from || V3(-1.1, 4.95, 0.95), E = st.earth.position;
    st.rings.forEach((r, i) => { const k = (R.t - i * 0.18) / 1.3; r.visible = k > 0 && k < 2; if (!r.visible) return; const p = k <= 1 ? ant.clone().lerp(E, k) : E.clone().lerp(ant, k - 1); r.position.copy(p); r.lookAt(E); r.scale.setScalar(1 + (k <= 1 ? k : 2 - k) * 6); });
    if (R.t > 1.3 && !R.e) { R.e = 1; flChat("capcom", R.reply || "Roger, Tranquility, we copy you on the ground."); }
    if (R.t > 2.6 && !R.b) { R.b = 1; MC.radio = null; st.rings.forEach((r) => (r.visible = false)); if (R.done) R.done(); else mcMyth("📡 Myth check: \"The answers came too slowly, so it was faked!\"", "❌ <b>False.</b> Radio travels at the speed of light, about 300,000 km per second. The Moon is about 384,000 km away, so a question and its answer take about <b>2.6 seconds</b> for the round trip. That pause, heard in every Apollo recording, is proof they really were that far away!"); } }
}
function mcLadder(k) { // porch → down the ladder → footpad
  const pts = [V3(0, 3.0 + 0.9, 1.6), V3(0, 2.72 + 0.9, 2.25), V3(0, 0.55 + 0.9, 4.05), V3(0, 0.25 + 0.9, 4.35)], seg = Math.min(2.999, k * 3), i = Math.floor(seg), f = seg - i;
  return pts[i].clone().lerp(pts[i + 1], f); }
function mcDust(x, z, r0, sp, n) { const st = MS.S.st, { dp, dv, dl } = st; let made = 0;
  for (let i = 0; i < dl.length && made < n; i++) if (dl[i] <= 0) { const a = Math.random() * 6.283, r = Math.random() * r0 * 0.3, s = sp * (0.5 + Math.random());
    dp[i * 3] = x + Math.cos(a) * r; dp[i * 3 + 1] = 0.05; dp[i * 3 + 2] = z + Math.sin(a) * r; dv[i * 3] = Math.cos(a) * s; dv[i * 3 + 1] = 0.3 + Math.random() * 1.2; dv[i * 3 + 2] = Math.sin(a) * s; dl[i] = 2 + Math.random() * 2; made++; } }
function mcPrint(x, z, rot) { const st = MS.S.st; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.32), new THREE.MeshBasicMaterial({ map: st.printTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x + (Math.random() - 0.5) * 0.15, 0.015, z); MS.S.scene.add(m); MC.prints.push(m); if (MC.prints.length > 300) MS.S.scene.remove(MC.prints.shift()); }
function mcCrash(title, text, why) { const st = MS.S.st, lm = st.lm; MC.step = "crash"; lm.g.position.y = 0; lm.g.rotation.z = 0.5; lm.dflame.visible = false; st.chute.visible = false; flBoom();
  st.boom.forEach((b) => { b.b.visible = true; b.b.position.set(0, 1.5, 0); b.b.scale.setScalar(3); b.b.material.opacity = 1; b.v.set((Math.random() - 0.5) * 10, Math.random() * 6, (Math.random() - 0.5) * 10); });
  mcDust(0, 0, 20, 12, 200); setTimeout(() => { if (!flLife(why)) return; msModal(`<h2>💥 ${title}</h2><p>${text}</p><div class="row"><button class="btn go" onclick="msModalClose();mcChoose()">🔁 Try the landing again</button></div>`); }, 1600); }
// ---------------------------------------------------------------- on the Moon
function mcLandedUI() { if (DEMO()) MS.speed = 2.2; MC.step = "landed"; MS.S.orbit.goal = { target: V3(0, 2.5, 1), dist: 16, yaw: 0.5, pitch: 0.18 };
  apPanel(`<h3>🌙 On the Moon! Sea of Tranquility</h3><p class="lead">Before going outside, the moonwalkers pull <b>lunar overshoes</b> over their boots.</p><div class="row"><button class="btn go pulse" onclick="mcCovers()">🥾 Put on the overshoes</button></div>`); }
// find each astronaut's overshoe + blue sole meshes
function mcShoes(a) { const out = []; a.userData.legs.forEach((hip) => hip.children.forEach((o) => { const p = o.geometry && o.geometry.parameters; if (p && (p.width === 0.62 || p.width === 0.64)) out.push(o); })); return out; }
function mcCutaway(on) { const lm = mcLM(); lm.ascentMats.forEach((m) => { if (m.userData.op0 === undefined) m.userData.op0 = { op: m.opacity, tr: m.transparent, dw: m.depthWrite };
  if (on) { m.transparent = true; m.opacity = 0.18; m.depthWrite = false; } else { m.transparent = m.userData.op0.tr; m.opacity = m.userData.op0.op; m.depthWrite = m.userData.op0.dw; } m.needsUpdate = true; }); }
function mcCovers() { SND.click(); MC.step = "covers"; MS.ui.innerHTML = ""; const st = MS.S.st, lm = mcLM(); mcCutaway(true);
  lm.g.updateMatrixWorld(true); const cab = lm.ascent.localToWorld(V3(0, 2.75, 0.1)); // cabin floor
  const lbl = msLabel("👀 Inside the Lunar Module cabin: putting on the overshoes", cab.clone().add(V3(0, 2.3, 0)), "gold");
  MS.S.orbit.goal = { target: cab.clone().add(V3(0, 0.6, 0)), dist: 6.5, yaw: 0.35, pitch: 0.12 };
  st.crew.forEach((a, i) => { a.visible = true; a.position.set(cab.x + (i ? 0.6 : -0.6), cab.y + 0.92, cab.z); a.rotation.set(0, 0, 0); mcShoes(a).forEach((m) => m.scale.setScalar(0.001)); });
  flChat(0, "Overshoes on. Left foot first…"); let t = 0;
  MC.anim = (dt) => { t += dt; st.crew.forEach((a, i) => { const legs = a.userData.legs, ph = t * 0.9 - i * 0.25; // left foot, then right foot
      legs.forEach((hip, s) => { const k = Math.max(0, Math.min(1, ph - s * 1.2)), lift = k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; hip.rotation.x = -0.9 * lift;
        hip.children.forEach((o) => { const p = o.geometry && o.geometry.parameters; if (p && (p.width === 0.62 || p.width === 0.64)) o.scale.setScalar(Math.max(0.001, k)); }); });
      a.userData.arms && a.userData.arms.forEach((ar) => ar.rotation.set(-0.9 * Math.max(0, Math.sin(Math.min(1, ph / 2.4) * Math.PI)), 0, 0)); });
    if (t > 3.4) { MC.anim = null; st.crew.forEach((a) => { a.userData.legs.forEach((h) => (h.rotation.x = 0)); a.userData.arms.forEach((ar) => ar.rotation.set(0, 0, 0)); });
      SND.beep && SND.beep(); msPoints(500, "lunar overshoes on"); setTimeout(() => { lbl.el.remove(); mcCoversInfo(); }, 600); } }; }
function mcCoversInfo() {
  msModal(`<h2>🥾 Lunar overshoes</h2><p>Each moonwalker pulls a tough <b>overshoe</b> over the inner pressure boot: a white upper with a <b>ribbed blue silicone sole</b>. It protects the boot from sharp rocks and from the ground's heat and cold.</p><p>The famous bootprint was made by the <b>overshoe</b>. Before liftoff the overshoes were thrown out to save weight!</p><div class="row"><button class="btn go" onclick="msModalClose();mcHatchUI()">✅ On! Now open the hatch</button></div>`); }
function mcHatchUI() { apPanel(`<h3>🚪 Open the hatch</h3><p class="lead">The hatch is small: crawling out with the big backpack is a tight squeeze!</p><div class="row"><button class="btn go pulse" onclick="mcHatch()">🚪 Open the hatch</button></div>`); }
function mcHatch() { SND.click(); const st = MS.S.st, lm = mcLM(); mcCutaway(false); st.crew.forEach((a) => (a.visible = false));
  if (!lm.hatchPivot) { const h = lm.hatch, piv = new THREE.Group(); piv.position.copy(h.position).add(V3(-0.4, 0, 0.03)); h.parent.add(piv); h.parent.remove(h); h.position.set(0.4, 0, -0.03); h.rotation.set(0, 0, 0); piv.add(h); lm.hatchPivot = piv;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), new THREE.MeshBasicMaterial({ color: 0x07090d })); door.position.copy(piv.position).add(V3(0.4, 0, -0.035)); piv.parent.add(door); lm.doorGlow = door; }
  lm.g.updateMatrixWorld(true); const hw = lm.ascent.localToWorld(lm.hatchPivot.position.clone().add(V3(0.4, 0, 0)));
  MS.S.orbit.goal = { target: hw, dist: 4.2, yaw: 0.45, pitch: 0.05 }; const lbl = msLabel("🚪 The hatch swings open", hw.clone().add(V3(0, 0.9, 0)), "gold");
  let k = 0, w = 0;
  MC.anim = (dt) => { w += dt; if (w < 0.6) return; k = Math.min(1, k + dt * 0.67); lm.hatchPivot.rotation.y = -K.ease(k) * 1.9; if (k >= 1) { MC.anim = null; setTimeout(() => lbl.el.remove(), 1800); } };
  SND.tone(140, 0.25, "triangle", 0.1); setTimeout(() => SND.tone(90, 0.4, "sawtooth", 0.05), 600); setTimeout(() => { flBanner("🙌 High five! We're going OUT!", 3000); SND.tone(1200, 0.06, "square", 0.12); setTimeout(() => SND.tone(1200, 0.06, "square", 0.12), 90); flChat(0, "Hatch open. Ready?"); flChat(1, "High five! 🙌"); }, 2500);
  MC.step = "hatch"; setTimeout(() => { MS.S.orbit.goal = { target: V3(0, 2.2, 3.2), dist: 11, yaw: 0.75, pitch: 0.12 }; mcClimbUI(); }, 3600); }
function mcClimbUI() { const st = MS.S.st, next = st.crew.findIndex((a) => a.userData.where === "in");
  if (next < 0) return mcSurfaceUI();
  apPanel(`<h3>🪜 Climb down the ladder</h3><p class="lead">One at a time! The TV camera on the lander's leg is filming, and about <b>600 million people</b> are watching live.</p><div class="row"><button class="btn go pulse" onclick="mcClimb(${next})">🪜 ${st.crew[next].userData.name} climbs down</button></div>`); }
function mcClimb(i) { SND.click(); const a = MS.S.st.crew[i]; a.visible = true; a.userData.where = "down"; a.userData.k = 0; MS.ui.innerHTML = ""; MS.S.orbit.goal = { target: V3(0, 1.8, 4), dist: 7.5, yaw: 0.9, pitch: 0.1 };
  if (i === 0) flBanner("📺 LIVE on TV around the world", 4000); }
function mcFirstStep(a, i) { mcPrint(a.position.x, a.position.z + 0.2, 0); mcDust(a.position.x, a.position.z, 0.5, 1, 30);
  if (i === 0) { flSpeak("That's one small step for man, one giant leap for mankind.", 1, 0.9); flSteps(9); MS.S.orbit.goal = { target: V3(a.position.x, 0.3, a.position.z + 0.2), dist: 3, yaw: 0.9, pitch: 0.9 }; }
  setTimeout(() => { msPoints(100000, `${a.userData.name}: a small step on the Moon!`); flCheer(a.userData.name); }, i === 0 ? 4200 : 600);
  setTimeout(() => (i === 0 ? mcClimbUI() : mcSurfaceUI()), i === 0 ? 6500 : 2000); }
function mcJump() { const a = MS.S.st.crew[MC.sel], u = a.userData; if (u.jv !== undefined) return; u.jy = 0; u.jv = 1.3; SND.tone(500, 0.12, "triangle", 0.08);
  if (!MC.acts.jump) { MC.acts.jump = 1; setTimeout(() => mcMyth("🦘 Why only a small hop?", "Moon gravity is <b>1/6</b> of Earth's, so why not jump 6 times higher?<br><br><b>1. Heavy suit:</b> astronaut + suit + backpack ≈ <b>165 kg</b>. On the Moon that only <i>weighs</i> like 27 kg, but your legs still have to speed up the whole 165 kg to jump.<br><b>2. Stiff suit:</b> it is blown up like a balloon, so bending your knees is hard work.<br><b>3. Centre of mass moves:</b> your balance point is normally near your belly button. The big backpack moves it <b>up and backwards</b>, so you tip over easily! Astronauts leaned <b>forward</b> to stay balanced and hopped like kangaroos. Lean back too far and you fall over (some did!).<br><br>So hops are about <b>half a metre</b>, and they float down slowly: that's the real Moon!"), 1600); } }
function mcRadio() { SND.click(); MC.acts.radio = 1; MC.radio = { t: 0 }; flChat(0, "Houston, Tranquility Base. The flag is up!"); MS.S.orbit.goal = { target: V3(40, 25, -90), dist: 160, yaw: 0.2, pitch: 0.15 }; MC.camD = 9; mcSurfaceUI(); }
function mcMesa() { SND.click(); MC.acts.mesa = 1; const m = mcLM().mesa; let k = 0; const iv = setInterval(() => { k = Math.min(1, k + 0.05); m.rotation.x = -k * 1.2; if (k >= 1) clearInterval(iv); }, 30);
  MC.lockT = MC.t + 4; flBanner("🧰 MESA tool drawer: the TV camera, tools and rock boxes fold down from the descent stage", 5000); MS.S.orbit.goal = { target: V3(-1.5, 1.6, 1.5), dist: 7, yaw: -0.6, pitch: 0.1 }; mcSurfaceUI(); }
function mcPrintZoom() { SND.click(); MC.acts.print = 1; MC.lockT = MC.t + 5; const p = MC.prints[MC.prints.length - 1] || { position: V3(0, 0, 5.2) }; MS.S.orbit.goal = { target: p.position.clone(), dist: 1.6, pitch: 1.2 };
  mcSurfaceUI(); setTimeout(() => mcMyth("👣 Footprints that last millions of years", "The Moon has <b>no wind and no rain</b> to wipe the prints away, so they can last for millions of years. The edges stay sharp because Moon dust grains are jagged, never rounded by wind or water, so they lock together like tiny puzzle pieces."), 1800); }
// facts go into a button on the right side: the game keeps flowing, the explanation opens only when tapped
function mcMyth(title, html) { const box = document.getElementById("msInfos"); if (!box) return; const id = "m" + [...title].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
  msInfo(id, "💡 " + title + " ▸", `<p>${html}</p>`); const b = document.getElementById("inf_" + id); if (b) { b.classList.add("pulse"); setTimeout(() => b.classList.remove("pulse"), 6000); }
  const all = box.querySelectorAll("[id^='inf_m']"); for (let i = 4; i < all.length; i++) all[i].remove(); SND.tone(880, 0.08, "sine", 0.05); }
// ---------------------------------------------------------------- back inside → liftoff → back to the 2D trip home
function mcLeave() { SND.click(); const st = MS.S.st; if (MC.inRover) mcGetOut(true); MC.carry = null; MC.step = "back"; MS.ui.innerHTML = ""; let n = 0;
  st.crew.forEach((a, i) => { const u = a.userData; u.goal = V3(0, 0, 4.9 + i * 0.6); u.onArrive = () => setTimeout(() => { u.where = "up"; u.k = 0; }, i * 4200); });
  MS.S.orbit.goal = { target: V3(0, 2, 3), dist: 12, yaw: 0.8, pitch: 0.15 }; }
function mcAfterClimb() { const st = MS.S.st; if (st.crew.some((a) => a.userData.where !== "in")) return; const lm = mcLM(); if (lm.hatchPivot) lm.hatchPivot.rotation.y = 0; else { lm.hatch.rotation.y = 0; lm.hatch.position.x = 0; }
  apPanel(`<h3>🚀 Liftoff from the Moon</h3><p class="lead">The <b>ascent stage</b> fires and flies back up. The <b>descent stage</b> stays behind as its launch pad, and it's still there today!</p><div class="row"><button class="btn go pulse" onclick="mcLiftoff()">🔥 Fire the ascent engine</button></div>`); }
function mcLiftoff() { if (DEMO()) MS.speed = 1; SND.click(); MC.step = "liftoff"; MC.lt = 0; flSteps(10); flRumble(true, 0.25); flSpeak("Liftoff from the Moon."); MS.ui.innerHTML = "";
  setTimeout(() => apSay("happy", "The blast knocked the flag over, just like on Apollo 11! The descent stage stays on the Moon forever.", 8000), 2500); }
function mcBackTo2D() { flRumble(false); flFadeTo(() => RDV3D()); }

addEventListener("pointerup", () => { MC.hold = false; }); addEventListener("pointercancel", () => { MC.hold = false; });
