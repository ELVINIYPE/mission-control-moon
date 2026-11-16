// mission/apollo-moonwalk.js — PART C moonwalk, step by step:
// 1 look inside the descent stage → 2 walk over and open a bay → 3 take out the US flag and plant it → 4 pull the folded rover out of Quad 1
// → 5 build it step by step → 6 both astronauts ride the Moon buggy → 7–9 collect rocks (200 points) and the special rock (5,000), call Earth
// → 10 get in / out of the rover → 11 set up the laser mirror → 12 set up the science experiments → lift off.
// Real facts: Apollo 15's "Genesis Rock" (1971) is more than 4 billion years old; Apollo 11's laser mirror has 100 corner reflectors and is still
// used today: it shows the Moon moves about 3.8 cm farther from Earth every year; Apollo 11's seismometer was solar powered and even felt the
// astronauts' footsteps; the Solar Wind experiment was a sheet of aluminium foil that caught particles from the Sun and came back to Earth.

const MC_QA = { q1: Math.PI / 4, q2: 3 * Math.PI / 4, q3: -3 * Math.PI / 4, q4: -Math.PI / 4 };
const mcOut = (a, r) => V3(Math.sin(a) * r, 0, Math.cos(a) * r);
const mcTw = (T, fn, done) => MC.tw.push({ t: 0, T, fn, done });
const mcLater = (s, fn) => mcTw(s, () => {}, fn);

// four fold-down bay doors on the descent stage (the old MESA panel is replaced by the Quad 4 door)
function mcDoors(lm) { const apo = 2.1 * Math.cos(Math.PI / 8); lm.mesa.visible = false; lm.doors = {};
  Object.entries(MC_QA).forEach(([k, a]) => { const H = new THREE.Group(); H.position.copy(mcOut(a, apo + 0.02)).setY(1.48); H.rotation.y = a; lm.descent.add(H);
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.8), new THREE.MeshBasicMaterial({ color: 0x0b0c0e })); hole.position.set(0, 0.42, 0.01); hole.visible = false; H.add(hole);
    const P = new THREE.Group(); P.position.z = 0.03; H.add(P);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.84, 0.04), MQ.mat(0xe0b04a, { metalness: 0.3, roughness: 0.45 })); door.position.y = 0.42; door.castShadow = true; P.add(door);
    lm.doors[k] = { H, P, hole, open: false }; }); }
function mcOpenDoor(k, done) { const d = mcLM().doors[k]; if (d.open) return done && done(); d.open = true; d.hole.visible = true; SND.tone(160, 0.25, "triangle", 0.1);
  mcTw(1.2, (q) => (d.P.rotation.x = K.ease(q) * 1.45), done); }
const mcBayPos = (k) => mcOut(MC_QA[k], 1.9).setY(1.9);

// the Moon buggy: folds in half (front + back halves fold up), wheels tuck in, seats and mast lie flat
function mcRover() { const g = new THREE.Group(), al = MQ.mat(0xb9bec6, { metalness: 0.3, roughness: 0.5 }), gold = MQ.mat(0xc9a64a, { metalness: 0.3 }), dark = MQ.mat(0x3a3d42), wheels = [], fenders = [];
  MQ.mesh(g, new THREE.BoxGeometry(1.4, 0.12, 1.0), al, 0.55);
  const half = (s) => { const p = new THREE.Group(); p.position.set(0, 0.55, 0.5 * s); g.add(p);
    const pl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.95), al); pl.position.z = 0.475 * s; pl.castShadow = true; p.add(pl);
    [-0.85, 0.85].forEach((x) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.23, 20), MQ.mat(0x8f939a, { metalness: 0.4 })); w.rotation.z = Math.PI / 2; w.position.set(x, -0.15, 0.6 * s); w.castShadow = true; p.add(w); wheels.push(w);
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.26, 16, 1, true, 0, Math.PI), gold); f.rotation.z = Math.PI / 2; f.position.set(x, -0.13, 0.6 * s); p.add(f); fenders.push(f); });
    return p; };
  const front = half(1), rear = half(-1);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.45), MQ.mat(0x9aa0a8, { wireframe: true })); basket.position.set(0, 0.2, -0.75); rear.add(basket);
  const seats = new THREE.Group(); seats.position.y = 0.61; g.add(seats);
  [-0.35, 0.35].forEach((x) => { MQ.mesh(seats, new THREE.BoxGeometry(0.5, 0.08, 0.5), dark, 0.05).position.set(x, 0.05, 0.05); MQ.mesh(seats, new THREE.BoxGeometry(0.5, 0.5, 0.06), dark, 0.3).position.set(x, 0.3, -0.2); });
  const mast = new THREE.Group(); mast.position.set(0, 0.61, 0.45); g.add(mast); MQ.strut(mast, V3(0, 0, 0), V3(0, 1.0, 0), 0.02, al);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 10, 0, Math.PI * 2, 0, 1.0), MQ.mat(0xe8e8e8, { side: THREE.DoubleSide })); dish.position.y = 1.05; dish.rotation.x = -0.5; mast.add(dish);
  MQ.mesh(mast, new THREE.BoxGeometry(0.18, 0.14, 0.22), dark, 0.6).position.set(0.25, 0.6, 0);
  const water = new THREE.Group(); water.position.set(0.45, 0.5, 0.2); g.add(water); MQ.mesh(water, new THREE.BoxGeometry(0.22, 0.16, 0.22), MQ.mat(0x2f6fd6), 0); MQ.strut(water, V3(0, 0, 0), V3(0, -0.45, 0), 0.025, MQ.mat(0x777777));
  const tag = canvasTex(256, 64, (x, w, h) => { x.fillStyle = "#e8eaed"; x.fillRect(0, 0, w, h); x.fillStyle = "#c0392b"; x.font = "bold 34px system-ui"; x.textAlign = "center"; x.fillText("MOON BUGGY", w / 2, 44); });
  [-1, 1].forEach((s) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: tag })); l.position.set(0.71 * s, 0.55, 0); l.rotation.y = s * Math.PI / 2; g.add(l); });
  g.userData = { name: "🚙 Moon buggy", wheels, fenders, front, rear, seats, mast, water, basket, speed: 3.2, track: 0.9 };
  mcRoverSet(g, 1, 1, 1, 1); return g; }
function mcRoverSet(g, kc, kw, ks, km) { const u = g.userData; if (kc !== null) { u.front.rotation.x = -Math.PI / 2 * kc; u.rear.rotation.x = Math.PI / 2 * kc; }
  if (kw !== null) [...u.wheels, ...u.fenders].forEach((w) => w.scale.setScalar(1 - 0.7 * kw));
  if (ks !== null) u.seats.scale.y = Math.max(0.05, 1 - ks);
  if (km !== null) { u.mast.scale.setScalar(Math.max(0.01, 1 - km)); u.water.scale.setScalar(Math.max(0.01, 1 - km)); } }

// rocks scattered around (one special, sparkly white rock like Apollo 15's "Genesis Rock")
function mcRocks(s) { const out = [], spec = 4;
  for (let i = 0; i < 9; i++) { const a = -2.2 + i * 0.62 + (Math.random() - 0.5) * 0.25, r = 8 + (i % 3) * 2.2, sp = i === spec;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(sp ? 0.28 : 0.16 + Math.random() * 0.1, 0), MQ.mat(sp ? 0xf4f1e8 : 0x6f6a63, { roughness: 1, emissive: sp ? 0x333322 : 0x000000 }));
    m.scale.set(1, 0.7, 1.2); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); m.position.set(Math.sin(a) * r, 0.12, Math.cos(a) * r); m.castShadow = true; s.add(m);
    if (sp) { const gl = glowSprite("rgba(255,250,210,0.9)", 1.4); m.add(gl); m.userData.glow = gl; }
    m.userData.special = sp; out.push(m); } return out; }

// PROMISE: our small robot rover (6 wheels like Perseverance on Mars, a camera mast and a water scanner), stowed in Quad 3
function mcPromise() { const g = new THREE.Group(), body = MQ.mat(0xe8eaed, { metalness: 0.3 }), dark = MQ.mat(0x2b2f36), wheels = [];
  MQ.mesh(g, new THREE.BoxGeometry(0.5, 0.2, 0.7), body, 0.28);
  [-0.26, 0, 0.26].forEach((z) => [-0.31, 0.31].forEach((x) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 14), dark); w.rotation.z = Math.PI / 2; w.position.set(x, 0.1, z); g.add(w); wheels.push(w); }));
  MQ.mesh(g, new THREE.BoxGeometry(0.62, 0.025, 0.8), MQ.mat(0x1f3f8f, { metalness: 0.5, roughness: 0.3 }), 0.4);
  MQ.strut(g, V3(0.15, 0.4, 0.28), V3(0.15, 0.78, 0.28), 0.02, body); MQ.mesh(g, new THREE.BoxGeometry(0.16, 0.09, 0.1), dark, 0.8).position.set(0.15, 0.8, 0.3);
  const tag = canvasTex(256, 64, (x, w, h) => { x.fillStyle = "#e8eaed"; x.fillRect(0, 0, w, h); x.fillStyle = "#c0392b"; x.font = "bold 44px system-ui"; x.textAlign = "center"; x.fillText("PROMISE", w / 2, 48); });
  [-1, 1].forEach((s) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), new THREE.MeshBasicMaterial({ map: tag })); l.position.set(0.252 * s, 0.28, 0); l.rotation.y = s * Math.PI / 2; g.add(l); });
  const scan = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.3, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); scan.position.set(0, 0.15, 0.55); g.add(scan);
  g.userData = { wheels, scan }; return g; }
// laser mirror, seismometer and solar-wind foil, hidden inside the bays until taken out
function mcKit(s) { const gold = MQ.mat(0xd8b24a, { metalness: 0.3 }), al = MQ.mat(0xc9ced3, { metalness: 0.3, roughness: 0.4 });
  const laser = new THREE.Group(); MQ.strut(laser, V3(-0.2, 0, -0.15), V3(-0.2, 0.3, -0.15), 0.02, al); MQ.strut(laser, V3(0.2, 0, -0.15), V3(0.2, 0.3, -0.15), 0.02, al);
  const lt = canvasTex(128, 128, (x, w, h) => { x.fillStyle = "#8a929c"; x.fillRect(0, 0, w, h); x.fillStyle = "#1c2430"; for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) { x.beginPath(); x.arc(7 + i * 12.6, 7 + j * 12.6, 5, 0, 7); x.fill(); } });
  const lp = new THREE.Group(); lp.position.y = 0.32; laser.add(lp); const panel = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.04), [al, al, al, al, new THREE.MeshStandardMaterial({ map: lt, metalness: 0.5, roughness: 0.2 }), al]); lp.add(panel); laser.userData.panel = lp;
  const seis = new THREE.Group(); MQ.mesh(seis, new THREE.BoxGeometry(0.3, 0.26, 0.3), gold, 0.13); MQ.mesh(seis, new THREE.CylinderGeometry(0.05, 0.05, 0.18, 12), al, 0.35);
  const wings = [-1, 1].map((sd) => { const p = new THREE.Group(); p.position.set(0.15 * sd, 0.2, 0); seis.add(p); const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.36), MQ.mat(0x1f3f8f, { metalness: 0.5, roughness: 0.3 })); w.position.x = 0.25 * sd; p.add(w); p.rotation.z = -sd * Math.PI / 2; return p; }); seis.userData.wings = wings;
  const foil = new THREE.Group(); MQ.strut(foil, V3(0, 0, 0), V3(0, 1.3, 0), 0.015, al); const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.9), MQ.mat(0xf2f4f7, { metalness: 0.6, roughness: 0.15, side: THREE.DoubleSide })); sheet.position.y = 0.8; foil.add(sheet); foil.userData.sheet = sheet;
  const promise = mcPromise();
  [laser, seis, foil, promise].forEach((o) => { o.visible = false; o.traverse((m) => { if (m.isMesh) m.castShadow = true; }); s.add(o); }); return { laser, seis, foil, promise }; }

// walking with waypoints round the lander, so no one walks through it
function mcWalk(i, to, done) { const a = MS.S.st.crew[i], u = a.userData, c = V3(0, 0, 0.5), ang = (p) => Math.atan2(p.x - c.x, p.z - c.z);
  const a0 = ang(a.position), a1 = ang(to); let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  const near = Math.hypot(a.position.x - c.x, a.position.z - c.z) < 7 || Math.hypot(to.x - c.x, to.z - c.z) < 7, pts = [];
  if (near) { const n = Math.floor(Math.abs(d) / (Math.PI / 4)); for (let k = 1; k <= n; k++) { const q = a0 + (d * k) / (n + 1); pts.push(V3(c.x + Math.sin(q) * 4.9, 0, c.z + Math.cos(q) * 4.9)); } }
  pts.push(to.clone()); const next = () => { const p = pts.shift(); if (!p) { u.onArrive = null; return done && done(); } u.goal = p; u.onArrive = next; }; next(); }
const mcFace = (a, p) => (a.rotation.y = Math.atan2(p.x - a.position.x, p.z - a.position.z));
const mcActor = () => (MC.sel < 2 ? MC.sel : 0);
function mcCam(target, dist, yaw, pitch, hold) { MC.lockT = MC.t + (hold || 4); const g = { target, dist }; if (yaw !== undefined) g.yaw = yaw; if (pitch !== undefined) g.pitch = pitch; MS.S.orbit.goal = g; }
function mcBusy(on) { MC.busy = on; mcSurfaceUI(); }
function mcDone(k, pts, why) { MC.done[k] = 1; if (pts) msPoints(pts, why); mcBusy(false); }
// fetch something from a bay: walk over, open the door, take it out into the hands
function mcFetch(k, obj, off, after) { const i = mcActor(), a = MS.S.st.crew[i]; MC.sel = i; mcEnsureOut();
  mcWalk(i, mcOut(MC_QA[k], 3.8), () => { mcFace(a, mcBayPos(k)); mcCam(mcBayPos(k).setY(1.2), 8, MC_QA[k] + 0.7, 0.35, 4);
    mcOpenDoor(k, () => { obj.visible = true; const from = mcBayPos(k); mcTw(1.0, (q) => obj.position.copy(from).lerp(a.position.clone().add(off.clone().applyAxisAngle(V3(0, 1, 0), a.rotation.y)), K.ease(q)),
      () => { MC.carry = { o: obj, a, off }; after && after(a); }); }); }); }

// ---------------------------------------------------------------- the steps
const MC_STEPS = [
  ["look", "👀 Open up the descent stage: what's inside?"],
  ["q4", "🚪 Walk over and open the tool bay (Quad 4)"],
  ["flag", "🇺🇸 Take out the American flag and plant it"],
  ["q1", "📦 Open Quad 1: pull out the folded rover"],
  ["build", "🔧 Build the rover, step by step"],
  ["ride", "🧑‍🚀🧑‍🚀 Both astronauts get into the Moon buggy"],
  ["rocks", "🪨 Drive around, collect rocks, find the ✨ special rock"],
  ["promise", "🤖 Take out the PROMISE rover: let it hunt for water"],
  ["laser", "🔦 Take out the laser mirror and set it up"],
  ["science", "🔬 Take out the science experiments"]];
const MC_BUILD = [["🔩 Unfold the chassis", "chassis"], ["🛞 Snap out the 4 wheels", "wheels"], ["💺 Unfold the 2 seats", "seats"], ["📡 Raise the antenna, camera + 💧 water sensor", "mast"]];
const mcCur = () => MC_STEPS.findIndex(([k]) => !MC.done[k]);
function mcSurfaceUI() { MC.step = "surface"; const st = MS.S.st, cur = mcCur(), rv = st.veh[0];
  const hold = (d, l) => `<button class="pick" style="flex:0 0 46px;text-align:center" onmousedown="MC.mv='${d}'" onmouseup="MC.mv=null" onmouseleave="MC.mv=null" ontouchstart="MC.mv='${d}'" ontouchend="MC.mv=null"><b>${l}</b></button>`;
  const list = MC_STEPS.map(([k, l], n) => { const done = MC.done[k], now = n === cur;
    let label = l; if (k === "build" && now) label = `${l}: <b>${MC.build}/4</b>`; if (k === "rocks" && (now || done)) label = `${l} (${MC.rocks} rocks)`;
    return `<div style="margin:2px 0;font-size:13px;${now ? "color:#ffd27a;font-weight:700" : done ? "color:#7dffb5" : "color:#7f8aa3"}">${done ? "✅" : now ? "👉" : "⬜"} ${n + 1}. ${label}</div>`; }).join("");
  let act = "";
  if (cur >= 0 && !MC.busy) { const k = MC_STEPS[cur][0];
    if (k === "build") act = `<button class="btn go pulse" onclick="mcBuild()">${MC_BUILD[MC.build][0]}</button>`;
    else if (k === "rocks") act = MC.near >= 0 ? "" : `<p class="lead" style="margin:4px 0">${MC.inRover ? "Drive with the arrow keys or the pad" : "Walk with the arrow keys or the pad"} to a rock. Look for the one that sparkles!</p>`;
    else act = `<button class="btn go pulse" onclick="mcDo('${k}')">${MC_STEPS[cur][1]}</button>`; }
  else if (cur < 0 && !MC.busy) act = `<p class="lead" style="margin:4px 0">🎉 All jobs done! Explore a bit more, then go home.</p>`;
  else act = `<p class="lead" style="margin:4px 0">⏳ Working…</p>`;
  if (MC.near >= 0 && !MC.busy) act = `<button class="btn go pulse" onclick="mcCollect()">${st.rocks[MC.near].userData.special ? "✨ Collect the SPECIAL rock (+5,000)" : "🪨 Collect this rock (+200)"}</button>` + act;
  const roverOK = MC.done.build && !MC.busy;
  apPanel(`<h3>🌕 Moonwalk checklist</h3>${list}<div class="row" style="justify-content:flex-start">${act}</div>
    <div class="lcRow" style="align-items:center;margin-top:6px">${hold("l", "⬅")}${hold("u", "⬆")}${hold("d", "⬇")}${hold("r", "➡")}
      ${!MC.inRover && !MC.busy ? `<button class="pick" onclick="mcSel()"><b>🔄 Switch to ${st.crew[1 - mcActor()].userData.name}</b></button><button class="pick" onclick="mcJump()"><b>🦘 Jump</b></button>` : ""}
      ${roverOK && MC.done.ride ? (MC.inRover ? `<button class="pick" onclick="mcGetOut()"><b>🚶 Get out of the rover</b></button>` : `<button class="pick" onclick="mcGetIn()"><b>🚙 Get into the rover</b></button>`) : ""}
      ${!MC.busy ? `<button class="pick" onclick="mcPrintZoom()"><b>👣 Footprint</b></button>` : ""}</div>
    <div class="row"><button class="btn ghost" onclick="mcLeave()">🚀 Back inside and lift off ▶</button></div>`); }
function mcSel() { SND.click(); MC.sel = 1 - mcActor(); mcSurfaceUI(); }
function mcDo(k) { if (MC.busy) return; SND.click(); mcBusy(true); ({ look: mcLook, q4: mcQ4, flag: mcFlag, q1: mcQ1, ride: mcRide, promise: mcPromiseGo, laser: mcLaser, science: mcScience })[k](); }

// 1) look inside: the descent stage turns see-through, the 4 bays are labelled
function mcLook() { const lm = mcLM(); lm.seeInside(true); mcCam(V3(0, 1.8, 0), 12, 0.6, 0.45, 7);
  const L = [["q1", "🚙 Quad 1: the folded Moon buggy"], ["q2", "🔬 Quad 2: science experiments"], ["q3", "🔦 Quad 3: laser mirror + 🤖 PROMISE rover"], ["q4", "🧰 Quad 4: tools + 🇺🇸 flag"]].map(([k, t]) => msLabel(t, mcOut(MC_QA[k], 2.6).setY(2.4), "gold"));
  flBanner("📦 The descent stage is a big storage box: 4 bays (quads) around the landing engine and fuel tanks", 6000);
  mcLater(6.5, () => { lm.seeInside(false); lm.mesa.visible = false; L.forEach((l) => l.el.remove()); mcDone("look", 300, "looked inside the descent stage"); }); }
// 2) walk to Quad 4 and open it
function mcQ4() { const i = mcActor(), a = MS.S.st.crew[i]; MC.sel = i; mcEnsureOut();
  mcWalk(i, mcOut(MC_QA.q4, 3.8), () => { mcFace(a, mcBayPos("q4")); mcCam(mcBayPos("q4").setY(1.2), 8, MC_QA.q4 + 0.7, 0.35, 4); a.userData.arms.forEach((ar) => ar.rotation.set(-2.2, 0, 0));
    flChat(i, "Opening the tool bay!"); mcOpenDoor("q4", () => mcDone("q4", 300, "tool bay open")); }); }
// 3) take the US flag out of Quad 4, carry it, plant it, unfurl it, salute
function mcFlag() { const st = MS.S.st, f = st.flag, i = mcActor(), a = st.crew[i]; MC.sel = i; f.userData.bar.scale.x = f.userData.cloth.scale.x = 0.06; f.rotation.set(0, 0, 0);
  const take = () => { f.visible = true; f.position.copy(mcBayPos("q4")); const off = V3(0.28, -0.65, 0.25);
    mcTw(1.0, (q) => f.position.copy(mcBayPos("q4")).lerp(a.position.clone().add(off.clone().applyAxisAngle(V3(0, 1, 0), a.rotation.y)), K.ease(q)), () => {
      MC.carry = { o: f, a, off, ry: -Math.PI / 2 }; flChat(i, "I've got the flag!"); const spot = V3(-2.6, 0, 7.0);
      mcWalk(i, spot.clone().add(V3(-0.35, 0, -0.25)), () => { MC.carry = null; mcFace(a, V3(-2.6, 0, 20)); f.position.set(spot.x, 0.25, spot.z); f.rotation.y = 0; mcCam(V3(spot.x, 1.0, spot.z), 6, 0.15, 0.15, 7);
        SND.tone(160, 0.3, "triangle", 0.1); mcTw(1.4, (q) => { f.position.y = 0.25 - 0.45 * q; f.rotation.z = Math.sin(q * 25) * 0.05 * (1 - q); }, () => {   // twist the pole into the ground
          mcTw(1.6, (q) => (f.userData.bar.scale.x = f.userData.cloth.scale.x = 0.06 + 0.94 * K.ease(q)), () => {                                      // swing out the top rod and the flag
            mcWalk(i, V3(-1.3, 0, 7.4), () => { mcFace(a, f.position); MC.salute = { a, until: MC.t + 4 }; flCheer("", "🇺🇸 The American flag is up on the Moon! Mission Control is cheering!"); flChat(i, "It's up! What a view.");
              mcLater(2.5, () => { mcDone("flag", 50000, "American flag planted");
                mcMyth("🇺🇸 Myth check: \"The flag waves, so it was filmed on Earth!\"", "❌ <b>False.</b> The flag has a <b>rod along the top</b> to hold it out, because there's no wind on the Moon. It only moved while the astronauts twisted the pole into the ground. With no air, nothing slows the wobble down... and once they let go, it hung perfectly still."); }); }); }); }); }); }); };
  if (a.position.distanceTo(mcOut(MC_QA.q4, 3.8)) > 0.8) mcWalk(i, mcOut(MC_QA.q4, 3.8), () => { mcFace(a, mcBayPos("q4")); take(); }); else { mcFace(a, mcBayPos("q4")); take(); } }
// 4) open Quad 1 and lower the folded rover to the ground
function mcQ1() { const st = MS.S.st, rv = st.veh[0], i = mcActor(), a = st.crew[i]; MC.sel = i; mcEnsureOut();
  mcWalk(i, mcOut(MC_QA.q1, 4.6).add(V3(1.2, 0, -0.6)), () => { mcFace(a, mcBayPos("q1")); mcCam(V3(3.2, 1.2, 3.4), 9, 1.2, 0.3, 6); flChat(i, "Pulling the straps: here comes the rover!");
    mcOpenDoor("q1", () => { rv.visible = true; const p0 = mcBayPos("q1").setY(1.4), p1 = V3(4.4, 0, 4.8); rv.position.copy(p0); rv.rotation.set(-1.2, Math.PI / 4, 0);
      mcTw(3.0, (q) => { const e = K.ease(q); rv.position.lerpVectors(p0, p1, e); rv.rotation.x = -1.2 * (1 - e); }, () => { mcDust(p1.x, p1.z, 1, 2, 30); SND.tone(140, 0.25, "triangle", 0.1);
        flBanner("📦 The rover came folded up like a suitcase. Now let's build it!", 4000); mcDone("q1", 300, "rover unloaded"); }); }); }); }
// 5) build the rover one part at a time
function mcBuild() { if (MC.busy) return; SND.click(); const rv = MS.S.st.veh[0], part = MC_BUILD[MC.build][1]; mcBusy(true); mcCam(V3(rv.position.x, 0.8, rv.position.z), 6, 1.1, 0.35, 3);
  const set = { chassis: (q) => mcRoverSet(rv, 1 - q, null, null, null), wheels: (q) => mcRoverSet(rv, null, 1 - q, null, null), seats: (q) => mcRoverSet(rv, null, null, 1 - q, null), mast: (q) => mcRoverSet(rv, null, null, null, 1 - q) }[part];
  SND.tone(300 + MC.build * 120, 0.15, "square", 0.06); mcTw(1.6, (q) => set(K.ease(q)), () => { MC.build++; SND.tone(900, 0.08, "square", 0.08);
    if (MC.build >= 4) { rv.userData.out = true; flBanner("✅ The Moon buggy is ready! Its 💧 water sensor checks the soil for ice.", 5000); mcDone("build", 1000, "rover built"); }
    else { msPoints(200, MC_BUILD[MC.build - 1][0].replace(/^\S+\s/, "")); mcBusy(false); } }); }
// 6) / 10) get in and out of the rover
function mcGetIn(first) { const st = MS.S.st, rv = st.veh[0]; let n = 0; mcBusy(true); MC.carry = null;
  st.crew.forEach((a, i) => { const side = rv.localToWorld(V3(i ? 1.2 : -1.2, 0, 0.05)).setY(0);
    mcWalk(i, side, () => { rv.attach(a); a.position.set(i ? 0.35 : -0.35, 1.22, 0.05); a.rotation.set(0, 0, 0); a.userData.where = "rover"; a.userData.hop = 0;
      if (++n === 2) { MC.inRover = true; MC.sel = 2; SND.tone(500, 0.1, "triangle", 0.08); flChat(0, "Seat belts on. Let's go exploring!"); if (first) mcDone("ride", 500, "both astronauts in the rover"); else mcBusy(false); } }); }); }
function mcGetOut(quiet) { const st = MS.S.st, rv = st.veh[0]; if (!MC.inRover) return; MC.inRover = false; MC.sel = 0;
  st.crew.forEach((a, i) => { MS.S.scene.attach(a); const p = rv.localToWorld(V3(i ? 1.3 : -1.3, 0, 0.05)); a.position.set(p.x, 0.9, p.z); a.rotation.set(0, rv.rotation.y, 0); a.userData.where = "out"; a.userData.legs.forEach((h) => (h.rotation.x = 0)); });
  if (!quiet) { SND.click(); flChat(1, "Out we hop!"); mcSurfaceUI(); } }
function mcEnsureOut() { if (MC.inRover) mcGetOut(true); }
function mcRide() { mcGetIn(true); }
// 7) 8) 9) rocks: 200 points each, the special rock 5,000 and a call to Earth
function mcNearTick() { if (MC.step !== "surface") return; const st = MS.S.st; if (!MC.done.ride) return;
  const p = MC.inRover ? st.veh[0].position : st.crew[mcActor()].position; let best = -1, bd = 2.4;
  st.rocks.forEach((r, i) => { if (r.userData.got) return; const d = Math.hypot(r.position.x - p.x, r.position.z - p.z); if (d < bd) { bd = d; best = i; } });
  st.rocks.forEach((r) => r.userData.glow && (r.userData.glow.material.opacity = 0.5 + 0.5 * Math.sin(MC.t * 5)));
  if (best !== MC.near) { MC.near = best; if (!MC.busy) mcSurfaceUI(); } }
function mcCollect() { const st = MS.S.st, r = st.rocks[MC.near]; if (!r || MC.busy) return; SND.click(); mcBusy(true); r.userData.got = true; const sp = r.userData.special, rv = st.veh[0];
  const to = MC.inRover ? rv.localToWorld(V3((Math.random() - 0.5) * 0.5, 0.78, -1.3)) : st.crew[mcActor()].position.clone().setY(0.7), from = r.position.clone();
  mcCam(from.clone().setY(0.5), 4, undefined, 0.5, 2.5); flChat(MC.inRover ? 0 : mcActor(), sp ? "Look at this one! It's bright white and it sparkles!" : "Got one! Into the bag.");
  mcTw(1.0, (q) => { r.position.copy(from).lerp(to, q); r.position.y += Math.sin(q * Math.PI) * 0.8; }, () => { MC.rocks++; MC.near = -1;
    if (MC.inRover) { rv.attach(r); } else r.visible = false; if (r.userData.glow) r.userData.glow.visible = false;
    if (!sp) { msPoints(200, "Moon rock collected"); SND.tone(700, 0.08, "square", 0.06); return mcBusy(false); }
    msPoints(5000, "SPECIAL rock collected!"); SND.tone(1200, 0.1, "square", 0.1);
    MC.radio = { t: 0, reply: "Wow, Tranquility! A special rock! The whole room in Mission Control is cheering! 🎉", done: () => { flCheer("", "🎉 Houston is cheering: you found the special rock! +5,000 points");
      mcDone("rocks", 0); mcMyth("✨ The special rock", "On Apollo 15 (1971) astronauts Dave Scott and Jim Irwin spotted a bright white rock sitting on a grey boulder. It was nicknamed the <b>Genesis Rock</b>: it is <b>more than 4 billion years old</b>, a piece of the Moon's very first crust. Rocks like this tell us how the Moon was born!"); } };
    flChat(0, "Houston, Tranquility! We found a SPECIAL rock: bright white and sparkly!"); MS.S.orbit.goal = { target: V3(40, 25, -90), dist: 160, yaw: 0.2, pitch: 0.15 }; }); }
// 8) PROMISE: carry it out of Quad 3, it drives off, scans the soil, finds water ice and radios Earth
function mcPromiseGo() { const st = MS.S.st, R = st.kit.promise;
  mcFetch("q3", R, V3(0, -0.85, 0.45), (a) => { flChat(mcActor(), "PROMISE is out. Let's put it down over there."); const spot = V3(-5.0, 0, 5.0);
    mcWalk(mcActor(), spot.clone().add(V3(0.7, 0, -0.4)), () => { MC.carry = null; R.position.copy(spot); R.rotation.y = -2.2; mcFace(a, spot);
      const path = new THREE.CatmullRomCurve3([spot, V3(-7, 0, 6.5), V3(-9.5, 0, 5.5), V3(-10.5, 0, 3), V3(-11, 0, 0.5)]), ice = V3(-11, 0, -0.3);
      flBanner("🤖 PROMISE drives off on its own to hunt for water", 4000); SND.tone(400, 0.15, "square", 0.05); MC.lockT = MC.t + 30;
      mcTw(7, (q) => { const p = path.getPointAt(q), p2 = path.getPointAt(Math.min(1, q + 0.01)); R.position.copy(p); R.rotation.y = Math.atan2(p2.x - p.x, p2.z - p.z); R.userData.wheels.forEach((w) => (w.rotation.x += 0.25));
        MS.S.orbit.goal = { target: p.clone().setY(0.4), dist: 6, yaw: -0.9, pitch: 0.45 }; if (Math.random() < 0.3) mcPrint(p.x, p.z, R.rotation.y); }, () => {
        flChat("capcom", "PROMISE is scanning the soil…"); const sc = R.userData.scan;
        mcTw(3, (q) => (sc.material.opacity = 0.25 + 0.25 * Math.sin(q * 30)), () => { sc.material.opacity = 0;
          const pool = new THREE.Mesh(new THREE.CircleGeometry(0.7, 28), new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.0, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.copy(ice).setY(0.02); MS.S.scene.add(pool);
          const sp = glowSprite("rgba(140,220,255,0.95)", 1.6); sp.position.copy(ice).setY(0.3); MS.S.scene.add(sp); SND.tone(1300, 0.12, "sine", 0.08);
          mcTw(1.2, (q) => (pool.material.opacity = 0.75 * q), () => { flBanner("💧 PROMISE found WATER ICE hidden in the soil!", 4500);
            MC.radio = { t: 0, from: R.position.clone().setY(0.8), reply: "PROMISE, Houston. We got your signal: WATER on the Moon! Fantastic! 🎉", done: () => { MC.lockT = MC.t + 1; flCheer("", "💧 Mission Control is cheering: PROMISE found water!");
              mcDone("promise", 3000, "PROMISE found water");
              mcMyth("💧 Why water on the Moon matters", "Water ice hides in the soil, mostly in <b>very cold, dark craters</b> near the Moon's poles where sunlight never reaches. In 2009 NASA's <b>LCROSS</b> mission crashed into one and saw water in the dust it threw up.<br><br>Water is like treasure for astronauts: you can <b>drink</b> it, split it into <b>oxygen</b> to breathe, and into <b>hydrogen + oxygen rocket fuel</b>. A Moon base could make its own fuel! PROMISE stays on the Moon to keep searching after we go home."); } };
            flChat(0, "PROMISE is sending its signal to Earth!"); MS.S.orbit.goal = { target: V3(40, 25, -90), dist: 160, yaw: 0.2, pitch: 0.15 }; }); }); }); }); }); }
// 11) the laser mirror (Quad 3): carry it out, set it down, tilt it at Earth, a laser from Earth bounces back
function mcLaser() { const st = MS.S.st, L = st.kit.laser; L.userData.panel.rotation.x = 0;
  mcFetch("q3", L, V3(0, -0.55, 0.4), (a) => { flChat(mcActor(), "Got the laser mirror. Taking it to a flat spot."); const spot = V3(-6.0, 0, 2.6);
    mcWalk(mcActor(), spot.clone().add(V3(0.6, 0, 0.4)), () => { MC.carry = null; mcFace(a, spot); L.position.copy(spot); L.rotation.y = Math.atan2(st.earth.position.x - spot.x, st.earth.position.z - spot.z) + Math.PI; mcCam(spot.clone().setY(0.6), 6.5, -1.9, 0.35, 6);
      mcTw(1.2, (q) => (L.userData.panel.rotation.x = -0.5 * q), () => { const E = st.earth.position, beam = K.line(MS.S.scene, [E, spot.clone().setY(0.4)], 0x40ff60, 0.9); SND.tone(1500, 0.2, "sine", 0.05);
        mcLater(1.6, () => { MS.S.scene.remove(beam); flBanner("🔦 A laser from Earth hit the mirror and bounced straight back!", 4500);
          mcDone("laser", 2000, "laser mirror set up"); mcMyth("🔦 The laser mirror", "Apollo 11 left a panel of <b>100 special mirrors</b> on the Moon. Scientists on Earth still fire lasers at it today and time the bounce. That's how we know the Moon is moving away from Earth by about <b>3.8 cm every year</b>, about as fast as your fingernails grow!"); }); }); }); }); }
// 12) science experiments (Quad 2): the solar-powered seismometer and the solar-wind foil
function mcScience() { const st = MS.S.st, S = st.kit.seis, F = st.kit.foil; S.userData.wings.forEach((w, s) => (w.rotation.z = -(s ? 1 : -1) * Math.PI / 2));
  mcFetch("q2", S, V3(0, -0.6, 0.4), (a) => { const spot = V3(-5.2, 0, -2.6); flChat(mcActor(), "Setting up the moonquake detector.");
    mcWalk(mcActor(), spot.clone().add(V3(0.6, 0, 0.6)), () => { MC.carry = null; mcFace(a, spot); S.position.copy(spot); mcCam(spot.clone().setY(0.5), 6.5, -1.2, 0.4, 8);
      mcTw(1.4, (q) => S.userData.wings.forEach((w, s) => (w.rotation.z = -(s ? 1 : -1) * Math.PI / 2 * (1 - K.ease(q)))), () => {
        F.visible = true; F.position.set(spot.x + 1.0, -1.3, spot.z + 0.6); mcTw(1.2, (q) => (F.position.y = -1.3 * (1 - K.ease(q))), () => {
          flChat("capcom", "Tranquility, Houston. We can see your footsteps on the seismometer!"); flBanner("🔬 Seismometer: its solar panels power it. It feels moonquakes and even footsteps!", 5000);
          mcLater(2, () => { mcDone("science", 2000, "science experiments set up"); mcMyth("🔬 Science on the Moon", "<b>Seismometer:</b> solar powered, it listened for <b>moonquakes</b>. On Apollo 11 it even felt the astronauts walking!<br><b>Solar-wind foil:</b> a sheet of aluminium foil that caught tiny particles blowing from the Sun. The astronauts brought it home for scientists to study.<br><b>Moon buggy:</b> stays on the Moon with its water sensor, to keep exploring after we go home."); }); }); }); }); }); }

// ---------------------------------------------------------------- test shortcut: start on the Moon with both astronauts outside
function mcTestSurface() { MOON3D(); msModalClose(); const st = MS.S.st, lm = st.lm; MC.step = "surface"; MC.alt = 0; lm.g.position.y = 0; lm.dflame.visible = false; st.chute.visible = false;
  flSteps(9); flHud(true, "0.0", "m/s", "on the Moon · Sea of Tranquility"); st.crew.forEach((a, i) => { a.visible = true; a.userData.where = "out"; a.position.set(i ? 1.2 : -0.6, 0.9, 5.4); });
  MS.S.orbit.goal = { target: V3(0, 1.5, 3), dist: 16, yaw: 0.5, pitch: 0.2 }; mcSurfaceUI(); }
