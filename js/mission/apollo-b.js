// mission/apollo-b.js — Apollo 11+ (part A continued): steps 7–13 and the screen.
// Facts: Apollo CM: heat shield (about 2,760 °C on re-entry), 3 main parachutes, splashdown about 35 km/h (NASA).
// LM: no seats, the 2 astronauts stood; descent stage = 4 propellant tanks in a cross + 4 corner bays (quads): Quad 1 rover (Apollo 15–17),
// Quad 2 science (ALSEP), Quad 4 tool drawer (MESA) with the TV camera (NASA). Apollo 11's launch window lasted about 4.5 hours (NASA).
// Landing lighting: Sun about 5–14° above the horizon (Apollo 11: about 11°). AxEMU: rear entry, helmet lights + HD camera, 8+ hour moonwalks (Axiom/NASA).
// Shuttle pad sound suppression: about 300,000 gallons of water in 41 s (NASA); Starship's 2023 first launch with no deluge wrecked its pad.

// ======================= STEP 7 — Crew =======================
AP_RUN[6] = () => {
  apHint("Apollo style = 3 seats in the Command Module. Pick 3 astronauts and enter how much each weighs. The 4th becomes CAPCOM: the voice of Mission Control.");
  apPad(); MS.S.st.tick = null; AP.pick = AP.crew.length ? AP.crew.slice() : []; AP.wt = AP.wt || [75, 75, 75, 75];
  apCam(CREW_SPOT(1.5).add(V3(0, 0.2, 0)), 7, 0.25, 0.08); apCrewUI();
  setTimeout(() => { apChat(3, "Only three seats? Ouch."); setTimeout(() => apChat(1, "Every kilogram counts, team!"), 2500); }, 600);
};
function apCrewUI() { const list = apCrewList();
  apPanel(`<h3>👩‍🚀 Choose your crew (3 of 4)</h3><p class="lead">Apollo-style Command Module = <b>3 seats</b>. Enter each astronaut's weight for the weight matrix.</p>
    <div class="lcRow">${list.map((c, i) => `<div class="pick ${AP.pick.includes(i) ? "on" : ""}" style="cursor:pointer" onclick="apCrewPick(${i})"><b>${AP.pick.includes(i) ? "✅" : "⬜"} ${crewName(c)}</b>
      <small>${(c.roles || []).map((r) => ROLES[r] ? ROLES[r].ico + " " + ROLES[r].name : "").join(" ")} · <input class="wIn" type="number" min="40" max="130" value="${AP.wt[i]}" onclick="event.stopPropagation()" oninput="AP.wt[${i}]=Math.max(40,Math.min(130,+this.value||75))"> kg</small></div>`).join("")}</div>
    <div class="row"><button class="btn ghost" onclick="apGo(5)">← Fuel</button><button class="btn go" ${AP.pick.length === 3 ? "" : "disabled"} onclick="apCrewDone()">✅ This is our crew</button></div>`); }
function apCrewPick(i) { SND.click(); const k = AP.pick.indexOf(i); if (k >= 0) AP.pick.splice(k, 1); else { if (AP.pick.length >= 3) return msToast("Only 3 seats!", true); AP.pick.push(i); } apCrewUI(); }
function apCrewDone() {
  AP.crew = AP.pick.slice().sort(); const out = [0, 1, 2, 3].find((i) => !AP.crew.includes(i)), kg = AP.crew.reduce((a, i) => a + AP.wt[i], 0);
  msWeight("crew", "Crew (3 astronauts)", kg / 1000); apCrewPlace();
  apChat(out, "Good luck, crew! I'll be <b>CAPCOM</b>, your voice from Mission Control."); apSay("happy", `Crew chosen: ${kg} kg of astronauts. <b>${crewName(apCrewList()[out])}</b> takes off their helmet and stays on Earth.`);
  setTimeout(() => apGo(7), 3200);
}

// 3 main parachutes (2 orange + 1 white), lines meeting at the capsule's nose
function apChutes() { const g = new THREE.Group();
  [-1, 0, 1].forEach((k) => { const c = new THREE.Mesh(new THREE.SphereGeometry(3.4, 32, 14, 0, Math.PI * 2, 0, 1.25), MQ.mat(k ? 0xe8590c : 0xffffff, { side: THREE.DoubleSide, roughness: 0.8 })); c.position.set(k * 5.6, 15, k ? -1 : 1); c.castShadow = true; g.add(c);
    for (let j = 0; j < 6; j++) { const a = j / 6 * Math.PI * 2; K.line(g, [V3(0, 3.5, 0), V3(k * 5.6 + Math.cos(a) * 3.2, 13.3, (k ? -1 : 1) + Math.sin(a) * 3.2)], 0xdddddd, 0.7); } });
  return g; }

// ======================= STEP 8 — Command Module =======================
const CM_OPTS = [{ id: "shield", ico: "🛡️", name: "Heat shield", ok: 1 }, { id: "chutes", ico: "🪂", name: "Parachutes", ok: 1 }, { id: "retro", ico: "🔥", name: "Retro rockets for landing", ok: 0 },
  { id: "toilet", ico: "🚽", name: "Toilet / waste system", ok: 1 }, { id: "o2", ico: "🫁", name: "Oxygen supply", ok: 1 }, { id: "co2", ico: "🧪", name: "CO₂ filters", ok: 1 }];
AP_RUN[7] = () => {
  apHint("The Command Module comes home through Earth's AIR: it needs a heat shield and parachutes. Air does the braking, so no landing rockets. And 3 people live inside for 8 days!");
  AP.cm = {}; AP.cmMiss = 0;
  msScene("cm", (S) => { const s = S.scene; K.space(S, 3000, 0.3); MQ.sun(s, V3(30, 40, 30), 20, 2048); s.add(new THREE.HemisphereLight(0xbfd4ff, 0x203040, 0.35));
    const e = K.earth(60, V3(-40, -80, -90), s);
    const C = buildCSM(); s.add(C.g); C.shield.visible = false; C.g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const chutes = apChutes(); chutes.visible = false; C.cm.add(chutes);
    const plasma = glowSprite("rgba(255,110,30,1)", 14); plasma.visible = false; s.add(plasma);
    const wrapG = []; for (let i = 0; i < 8; i++) { const p = glowSprite("rgba(255,80,30,0.9)", 4); p.visible = false; s.add(p); wrapG.push(p); }
    const sparks = []; for (let i = 0; i < 50; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), K.basic(0xffd27a)); p.visible = false; s.add(p); sparks.push({ p, v: V3(), t: 0 }); }
    const retros = [0, 1, 2, 3].map((k) => { const n = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 12), MQ.mat(0xe05050)); const a = k * Math.PI / 2; n.position.set(Math.cos(a) * 1.3, 3.6, Math.sin(a) * 1.3); n.rotation.x = Math.PI; n.visible = false; C.g.add(n); return n; });
    S.st = { C, chutes, plasma, wrapG, sparks, retros };
    S.st.lbl = msLabel("", () => (S.st.demo ? V3(0, 7.4, 0) : null), "big"); msLabel("🔺 Command Module: crew cabin, the only part that comes home", () => (S.st.demo ? null : V3(0, 8.6, 0)), "gold"); msLabel("⚙️ Service Module: engine, oxygen, power", () => (S.st.demo || AP.cm.chutes ? null : V3(2.6, 1.5, 1)), "blue"); msLabel("🪂 The Service Module was dropped before re-entry; only the capsule hangs under the 3 chutes", () => (AP.cm.chutes && !S.st.demo ? V3(0, 1.2, 0) : null), "");
    S.orbit = { target: V3(0, 4.5, 0), dist: 16, yaw: 0.5, pitch: 0.15, auto: 0.12 };
    S.update = (dt, t) => apCmTick(dt, t);
  });
  apCmUI();
};
function apCmTick(dt, t) {
  const st = MS.S.st, C = st.C, D = st.demo; st.retros.forEach((r) => (r.visible = !!AP.cm.retroShow)); st.chutes.visible = !!AP.cm.chutes && !D;
  C.shield.visible = !!AP.cm.shield && (!D || D.t > 2.2);
  if (!D) { C.sm.visible = !AP.cm.chutes; C.g.rotation.set(0, 0, 0); C.cm.userData.shell.emissive.setRGB(0, 0, 0); st.plasma.visible = false; st.wrapG.forEach((p) => (p.visible = false)); st.sparks.forEach((s) => (s.p.visible = false)); return; }
  D.t += dt; C.sm.visible = false; C.g.rotation.z = 0.35; const base = V3(0.6, 3.6, 0);
  if (D.t < 2.2) { st.lbl.el.innerHTML = "❌ No heat shield: the capsule melts!"; st.lbl.el.className = "acLbl big red";
    C.cm.userData.shell.emissive.setRGB(0.9 * (0.6 + Math.sin(t * 30) * 0.4), 0.2, 0); st.plasma.visible = false;
    st.wrapG.forEach((p, i) => { p.visible = true; const a = i / 8 * Math.PI * 2 + t * 3; p.position.set(Math.cos(a) * 2.2, 5 + Math.sin(a * 2) * 1.6, Math.sin(a) * 2.2); }); }
  else { st.lbl.el.innerHTML = "✅ With the shield: about 2,760 °C outside, about 21 °C for the crew"; st.lbl.el.className = "acLbl big green";
    C.cm.userData.shell.emissive.setRGB(0, 0, 0); st.wrapG.forEach((p) => (p.visible = false)); st.plasma.visible = true; st.plasma.position.set(-0.4, 1.8, 0); st.plasma.material.opacity = 0.75 + Math.sin(t * 25) * 0.2;
    if (D.t < 2.6) C.shield.position.y = -0.1 - (2.6 - D.t) * 6; else C.shield.position.y = -0.1;
    st.sparks.forEach((s) => { s.t -= dt; if (s.t <= 0) { s.t = 0.6 + Math.random() * 0.6; s.p.position.set(-0.3 + (Math.random() - 0.5) * 3, 2.6, (Math.random() - 0.5) * 3); s.v.set(-2 - Math.random() * 4, -4 - Math.random() * 4, (Math.random() - 0.5) * 4); } s.p.visible = true; s.p.position.addScaledVector(s.v, dt); }); }
  if (D.t > 6) { st.demo = null; MS.S.orbit.goal = { target: V3(0, 4.5, 0), dist: 16 }; }
}
function apCmUI() { apPanel(`<h3>🔺 Equip the Command Module</h3><p class="lead">It carries 3 astronauts there and back, and splashes into the ocean. What does it need?</p>
  <div class="lcRow">${CM_OPTS.map((o) => `<button class="pick ${AP.cm[o.id] ? "good" : ""}" onclick="apCm('${o.id}')"><span class="pi">${o.ico}</span><b>${AP.cm[o.id] ? "✅ " : ""}${o.name}</b></button>`).join("")}</div>
  <div class="row"><button class="btn ghost" onclick="apGo(6)">← Crew</button><button class="btn go" onclick="apCmDone()">✅ Done</button></div>`); }
function apCm(id) { SND.click(); const st = MS.S.st;
  if (id === "retro") { AP.cmMiss++; msPoints(-50, "retro rockets not needed"); AP.cm.retroShow = true; setTimeout(() => (AP.cm.retroShow = false), 3000);
    return apSay("angry", "No! Earth has an <b>atmosphere</b>: air and parachutes slow the Command Module down. We don't need retro rockets to come home. They'd add <b>weight</b>, and more weight needs a bigger rocket and more fuel. Even <b>1 extra gram</b> matters!", 10000); }
  AP.cm[id] = !AP.cm[id]; apCmUI(); if (!AP.cm[id]) return;
  if (id === "shield") { st.demo = { t: 0 }; MS.S.orbit.goal = { target: V3(0.5, 4.5, 0), dist: 15, yaw: 1.2, pitch: 0.05 }; }
  if (id === "chutes") st.demo = null, MS.S.orbit.goal = { target: V3(0, 13, 0), dist: 44, pitch: 0.12 };
  apSay("happy", { shield: "How are you entering Earth's atmosphere at about <b>11 km/s</b>? With a <b>heat shield</b>! Watch: without it the capsule burns; with it, the shield slowly burns away and carries the heat off.",
    chutes: "How are you landing softly in the ocean? <b>3 big parachutes</b> slow the capsule to about 35 km/h for splashdown.",
    toilet: "8 days in a tiny cabin… yes, you need a toilet! (Apollo used special bags. Not glamorous!)", o2: "Oxygen to breathe, stored in tanks in the Service Module.", co2: "Filters soak up the CO₂ you breathe out. Remember Apollo 13!" }[id], 8000); }
function apCmDone() { const miss = CM_OPTS.filter((o) => o.ok && !AP.cm[o.id]);
  if (miss.length) { AP.cmMiss++; return apSay("sad", `Something's missing: <b>${miss.map((o) => o.name).join(", ")}</b>. Think about the trip home and 8 days of living inside!`); }
  msPoints(Math.max(0, 300 - 50 * AP.cmMiss), "Command Module ready"); setTimeout(() => apGo(8), 1200); }

// ======================= STEP 9 — Lunar Module =======================
const LM_OPTS = { descent: [["shield", "🛡️ Heat shield", 0], ["chute", "🪂 Parachute", 0], ["engine", "🔥 Landing engine", 1], ["legs", "🦵 Landing legs", 1]],
                  ascent: [["shield", "🛡️ Heat shield", 0], ["chute", "🪂 Parachute", 0], ["engine", "🚀 Ascent engine", 1], ["cabin", "🪟 Crew cabin + windows", 1]] };
const CARGO_SPOTS = [["sivb", "🛢️ S-IVB rocket stage"], ["cm", "🔺 Command Module"], ["sm", "⚙️ Service Module"], ["asc", "🕷️ LM ascent stage"], ["desc", "🦵 LM descent stage"]];
AP_RUN[8] = () => {
  apHint("The Moon has NO air: no heat shields or parachutes on the Lunar Module. Descent stage = landing engine + legs + cargo. Ascent stage = crew cabin + engine to fly back up.");
  AP.lm = { descent: {}, ascent: {} }; AP.lmMiss = 0; AP.lmPhase = "descent"; AP.cargoTry = 0;
  msScene("lm", (S) => { const s = S.scene; s.background = new THREE.Color(0x04060b); starfield(s, 2500);
    s.add(new THREE.AmbientLight(0x8899aa, 0.35)); const sun = MQ.sun(s, V3(-12, 7, 8), 10, 4096); const fill = new THREE.DirectionalLight(0x6f8fbf, 0.25); fill.position.set(8, 4, -6); s.add(fill);
    const gg = new THREE.PlaneGeometry(200, 200, 120, 120); gg.rotateX(-Math.PI / 2); const pos = gg.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z); if (d > 7) pos.setY(i, (Math.sin(x * 0.3) * Math.cos(z * 0.25) + Math.random() * 0.3) * 0.25 * Math.min(1, (d - 7) / 10)); }
    gg.computeVertexNormals(); const tx = moonTexture(); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(14, 14);
    const ground = new THREE.Mesh(gg, MQ.mat(0x9a968f, { map: tx, roughness: 1 })); ground.receiveShadow = true; s.add(ground);
    K.earth(8, V3(-60, 45, -150), s);
    const lm = buildLM(); s.add(lm.g);
    const crew2 = [-0.5, 0.5].map((x) => { const a = makeAstronaut({ visorDown: true, name: "", cdr: false, suit: 0xe8742a }); a.scale.setScalar(0.27); a.position.set(x, 2.75 + 3.75 * 0.27, 0.2); a.visible = false; lm.ascent.add(a); return a; });
    S.st = { lm, crew2, lbls: [] };
    S.st.lbls.push(msLabel("🕷️ Ascent stage", V3(0, 5.6, 0), "blue"), msLabel("🦵 Descent stage", V3(2.9, 1.9, 0), "gold"));
    S.orbit = { target: V3(0, 2.4, 0), dist: 15, yaw: 0.7, pitch: 0.28, auto: 0.1 };
  });
  apLmUI();
};
function apLmUI() { const ph = AP.lmPhase, opts = LM_OPTS[ph];
  apPanel(`<h3>${ph === "descent" ? "🦵 LM descent stage" : "🕷️ LM ascent stage"}: what does it need?</h3>
    <p class="lead">${ph === "descent" ? "The bottom half lands and stays on the Moon forever." : "The top half carries the 2 moonwalkers back up to the Command Module."} The Moon has <b>no air</b>.</p>
    <div class="lcRow">${opts.map(([k, n]) => `<button class="pick ${AP.lm[ph][k] ? "good" : ""}" onclick="apLm('${k}')"><b>${AP.lm[ph][k] ? "✅ " : ""}${n}</b></button>`).join("")}</div>
    <div class="row"><button class="btn ghost" onclick="apGo(7)">← Command Module</button><button class="btn go" onclick="apLmDone()">✅ Done</button></div>`); }
function apLm(k) { SND.click(); const ph = AP.lmPhase, o = LM_OPTS[ph].find((x) => x[0] === k);
  if (!o[2]) { AP.lmMiss++; msPoints(-50, "not needed on the Moon");
    return apSay("angry", k === "chute" ? "A parachute on the <b>Moon</b>? Parachutes only work in <b>air</b>, and the Moon has no atmosphere!" : "No air on the Moon means no heating from air. A heat shield is just <b>extra weight</b>, and every gram costs fuel!", 8000); }
  AP.lm[ph][k] = !AP.lm[ph][k]; apLmUI(); const lm = MS.S.st.lm;
  if (AP.lm[ph][k] && k === "engine") { const f = ph === "descent" ? lm.dflame : lm.flame; f.visible = true; setTimeout(() => (f.visible = false), 1500); }
  if (AP.lm[ph][k]) apSay("happy", { engine: ph === "descent" ? "Yes! With no air, the only way to slow down is to fire an engine downward. It can be throttled like a car's gas pedal." : "Yes! This engine lifts you off the Moon. It had no backup, so it had to work the first time.", legs: "Yes! 4 legs with crushable honeycomb inside to soak up the bump, and wide footpads.", cabin: "Yes! The 2 astronauts stand here. There were no seats in the LM!" }[k]); }
function apLmDone() { const ph = AP.lmPhase, miss = LM_OPTS[ph].filter((o) => o[2] && !AP.lm[ph][o[0]]);
  if (miss.length) return apSay("sad", `Missing: <b>${miss.map((o) => o[1]).join(", ")}</b>.`);
  if (ph === "descent") { AP.lmPhase = "ascent"; MS.S.orbit.goal = { target: V3(0, 3.8, 0), dist: 12 }; return apLmUI(); }
  msPoints(Math.max(0, 400 - 50 * AP.lmMiss), "Lunar Module ready"); apCargoUI(); }
function apCargoUI() { MS.S.orbit.goal = { target: V3(0, 2.4, 0), dist: 15 };
  apPanel(`<h3>📦 Pack your Moon gear</h3><p class="lead">🚙 Rover · 🔬 Science · 🔦 Laser mirror · 🤖 Mini water-hunting rover · 🧰 Tools · 🇺🇸 Flag. <b>Where do they go?</b></p>
    <div class="lcRow">${CARGO_SPOTS.map(([k, n]) => `<button class="pick" onclick="apCargo('${k}')"><b>${n}</b></button>`).join("")}</div>`); }
function apCargo(k) { SND.click(); AP.cargoTry++;
  if (k !== "desc") { const why = { sivb: "The S-IVB is thrown away long before the Moon!", cm: "The Command Module never lands. It stays in Moon orbit.", sm: "The Service Module stays in orbit with the Command Module.", asc: "The ascent stage must be as light as possible to fly back up." }[k];
    return apSay("sad", `${why} Which part lands and <b>stays</b> on the Moon?`); }
  msSpend(95, "rover + science + laser + mini rover", (ok) => { if (!ok) return;
    if (AP.cargoTry === 1) msPoints(500, "packed in the descent stage!"); apSay("happy", "Perfect! The <b>descent stage</b> lands and stays on the Moon, so the gear rides there.");
    msWeight("cargo", "Rover, science, laser, mini rover, tools", 0.21 + 0.25 + 0.03 + 0.05 + 0.05);
    const st = MS.S.st; st.lm.seeInside(true); st.lbls.forEach(msUnlabel); st.lbls = [];
    st.lm.labels.forEach((L) => st.lbls.push(msLabel(L.name, () => L.obj.getWorldPosition(new THREE.Vector3()).add(V3(0, L.quad ? 0.9 : 0.75, 0)), L.quad ? "gold" : "blue")));
    st.lbls.push(msLabel("🔥 Landing engine (center)", V3(0, 0.3, 0), "")); st.lbls.push(msLabel("🇺🇸 Flag strapped to the ladder", V3(0, 1.0, 4.3), "gold"));
    MS.S.orbit.auto = 0; MS.S.orbit.goal = { target: V3(0, 1.9, 0), dist: 12, yaw: 0.45, pitch: 1.05 };
    apPanel(`<h3>🔍 Inside the descent stage</h3><p class="lead">A <b>cross</b> of 4 tanks (2 fuel + 2 oxidizer) around the landing engine, and <b>4 corner bays</b> (quads) for gear: rover, science, laser mirror and tools.</p>
      <div class="row"><button class="btn go" onclick="apAscShow()">🕷️ Show the ascent stage</button></div>`); }); }
function apAscShow() { SND.click(); const st = MS.S.st; st.lm.seeInside(false); st.lbls.forEach(msUnlabel); st.lbls = [];
  st.lm.ascentMats.forEach((m) => { m.transparent = true; m.opacity = 0.25; m.depthWrite = false; m.needsUpdate = true; }); st.crew2.forEach((a) => (a.visible = true));
  st.lbls.push(msLabel("🧍🧍 2 astronauts STAND here: no seats!", V3(0, 6, 0.5), "gold")); MS.S.orbit.goal = { target: V3(0, 3.8, 0.2), dist: 8, yaw: 0.2, pitch: 0.2 };
  apPanel(`<h3>🕷️ The ascent stage</h3><p class="lead">The 2 astronauts ride here, standing at the windows. After the moonwalk its engine fires: it's the <b>only part that flies back up</b>. The descent stage stays behind as its launch pad.</p>
    <div class="row"><button class="btn go" onclick="apGo(9)">Next: safety ▶</button></div>`); }

// ======================= STEP 10 — Safety =======================
AP_RUN[9] = () => {
  if (DEMO()) { AP.extras.les = true; AP.extras.water = true; return apGo(10); }   // 🎬 demo: escape tower + water deluge included automatically
  apHint("Always take the escape tower: it pulls the crew away if the rocket fails. And always flood the pad with water: it soaks up the heat and the ear-splitting sound.");
  apPad(); apRocketDraw(); MS.S.st.tick = null; apCam(V3(0, 70, 0), 170); apSafeUI();
};
function apSafeUI() { apPanel(`<h3>🛟 Safety options</h3><div class="lcRow">
    <button class="pick ${AP.extras.les ? "good" : ""}" onclick="apSafe('les')"><span class="pi">🗼</span><b>${AP.extras.les ? "✅ " : ""}Escape tower</b><small>Pulls the capsule to safety if the launch goes wrong.</small><span class="price">$50M</span></button>
    <button class="pick ${AP.extras.water ? "good" : ""}" onclick="apSafe('water')"><span class="pi">💧</span><b>${AP.extras.water ? "✅ " : ""}Water deluge</b><small>Floods the pad at liftoff to soak up heat and sound.</small><span class="price">$20M</span></button></div>
    <div class="row"><button class="btn ghost" onclick="apGo(8)">← Lunar Module</button><button class="btn go" onclick="apSafeDone()">✅ Done</button></div>`); }
function apSafe(k) { SND.click(); if (AP.extras[k]) { AP.extras[k] = false; if (k === "les") apRocketDraw(); return apSafeUI(); }
  msSpend(k === "les" ? 50 : 20, k === "les" ? "escape tower" : "water deluge", (ok) => { if (!ok) return; AP.extras[k] = true;
    if (k === "les") { apSay("happy", "Smart! Watch what the escape tower does if the rocket fails…"); return apLesDemo(); }
    else apSay("happy", "Good call! Water protects the rocket and the pad."); apSafeUI(); }); }
function apSafeDone() {
  if (!AP.extras.water) return apPadDemo();
  if (!AP.extras.les && !AP.lesWarned) { AP.lesWarned = true; apSay("angry", "No escape tower? What happens if the rocket bursts at takeoff? <b>You die.</b>", 8000);
    return msModal(`<h2>😠 No escape tower?</h2><p>If the rocket explodes during launch, nothing can pull the crew to safety. In 2018 a Soyuz rocket failed and its abort system saved both astronauts.</p><div class="row"><button class="btn go" onclick="msModalClose();apSafe('les')">🗼 Add the escape tower</button><button class="btn ghost" onclick="msModalClose();apSafeDone()">Fly without it (risky)</button></div>`); }
  if (AP.extras.les && !AP.lesWarned) msPoints(200, "escape tower = crew safety"); if (!AP.deluDemo) msPoints(100, "water deluge");
  apGo(10);
}
function apPadDemo() { AP.deluDemo = true; const S = MS.S; apCam(V3(0, 20, 0), 120, 0.9, 0.1); apPanel(`<h3>💥 Engine test with no water…</h3>`);
  const rock = []; for (let i = 0; i < 60; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), MQ.mat(0x777777)); r.castShadow = true; r.position.set((Math.random() - 0.5) * 8, DECK, (Math.random() - 0.5) * 8); r.userData.v = V3((Math.random() - 0.5) * 60, Math.random() * 45 + 10, (Math.random() - 0.5) * 60); S.scene.add(r); rock.push(r); }
  const fl = K.flame(7, 40); fl.position.set(0, DECK, 0); S.scene.add(fl); const smoke = []; for (let i = 0; i < 24; i++) { const d = glowSprite("rgba(200,200,200,0.7)", 30); d.position.set(0, DECK, 0); S.scene.add(d); smoke.push(d); }
  SND.tone(60, 3, "sawtooth", 0.08); let T = 0;
  S.st.tick = (dt, t) => { T += dt; S.st.rocket.position.x = Math.sin(t * 60) * 0.25 * Math.min(1, T); S.st.LC.deck.material.color.setHSL(0.02, 0.5, Math.max(0.12, 0.47 - T * 0.1));
    smoke.forEach((d, i) => { const a = i / 24 * Math.PI * 2; d.position.set(Math.cos(a) * T * 18, DECK + 2, Math.sin(a) * T * 18); });
    rock.forEach((r) => { if (T < 0.6) return; r.userData.v.y -= 9.8 * dt; r.position.addScaledVector(r.userData.v, dt); if (r.position.y < 0.5) { r.position.y = 0.5; r.userData.v.multiplyScalar(0.3); } r.rotation.x += dt * 5; });
    if (T > 3.2 && !S.st.demoDone) { S.st.demoDone = true; S.st.rocket.position.x = 0; S.scene.remove(fl); smoke.forEach((d) => S.scene.remove(d));
      msModal(`<h2>💥 The launch pad was wrecked!</h2><p>Rocket flames are over 3,000 °C, and incredibly <b>loud</b>. The sound waves bounce off the pad and shake the rocket hard enough to damage it, while the blast tears the concrete apart.</p>
        <p>That's why pads flood with water: it soaks up the <b>heat and the sound</b>. The Space Shuttle pad released about <b>300,000 gallons of water in 41 seconds</b>.</p>
        <p>Real example: in <b>2023</b>, SpaceX's first Starship launch had no water system. The blast dug a crater under the pad and threw concrete chunks far away.</p>
        <div class="row"><button class="btn go" id="addW">💧 Add the water deluge</button></div>`);
      document.getElementById("addW").onclick = () => { msModalClose(); rock.forEach((r) => S.scene.remove(r)); S.st.LC.deck.material.color.set(0x767a80); S.st.tick = null; S.st.demoDone = false; apCam(V3(0, 70, 0), 170); apSafe("water"); }; } };
  apSay("angry", "Watch what happens to the pad without water…", 4000); }

// ---- the abort demo: the rocket fails, the escape tower pulls the capsule away, parachutes bring the crew down ----
function apLesDemo() {
  msScene("abort", (S) => { const s = S.scene; buildSkyGround(s); MQ.sun(s, V3(160, 300, 200), 150);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(49, DECK, 41), MQ.mat(0x767a80, { roughness: 0.95 })); pad.position.y = DECK / 2; pad.receiveShadow = true; pad.castShadow = true; s.add(pad);
    const rk = new THREE.Group(); rk.position.y = DECK; s.add(rk); const parts = {};
    ["sic", "sii", "sivb", "sla", "sm"].forEach((k) => { const p = SAT[k](); p.position.y = SAT_Y[k]; rk.add(p); parts[k] = p; });
    if (parts.sla.userData.mat) { parts.sla.userData.mat.opacity = 1; parts.sla.userData.mat.transparent = false; parts.sla.userData.mat.depthWrite = true; }
    const cap = new THREE.Group(); s.add(cap); const cm = SAT.cm(); cap.add(cm); const les = SAT.les(); les.position.y = SAT_Y.les - SAT_Y.cm; cap.add(les);
    const chutes = apChutes(); chutes.visible = false; chutes.scale.setScalar(0.9); chutes.position.y = 1; cap.add(chutes);
    const flame = K.flame(5, 26); flame.position.y = 0; rk.add(flame);
    const lesFl = []; for (let i = 0; i < 4; i++) { const f = glowSprite("rgba(255,170,60,1)", 3.5); f.visible = false; s.add(f); lesFl.push(f); }
    const boom = []; for (let i = 0; i < 40; i++) { const b = glowSprite(i % 3 ? "rgba(255,130,30,1)" : "rgba(90,90,90,0.9)", 6); b.visible = false; s.add(b); boom.push({ b, v: V3((Math.random() - 0.5) * 30, (Math.random() - 0.3) * 30, (Math.random() - 0.5) * 30) }); }
    const lbl = msLabel("", () => cap.position.clone().add(V3(0, -9, 0)), "big");
    const flash = new THREE.PointLight(0xff8a30, 0, 400); s.add(flash);
    S.st = { rk, parts, cap, les, chutes, flame, lesFl, boom, lbl, flash, T: 0, ph: 0, v: V3(), lv: V3() };
    S.orbit = { target: V3(0, 60, 0), dist: 190, yaw: 0.7, pitch: 0.08, auto: 0 };
    S.update = (dt, t) => apLesTick(dt, t);
  });
  apPanel(`<h3>🗼 What if the rocket fails?</h3><p class="lead">Watch the <b>launch escape system</b>: a small, very powerful rocket on top of the Command Module.</p>`);
  SND.tone(90, 2.5, "sawtooth", 0.05);
}
function apLesTick(dt, t) {
  const st = MS.S.st, o = MS.S.orbit; st.T += dt; const T = st.T, L = st.lbl.el;
  if (T < 3) { const y = 4 * T * T; st.rk.position.y = DECK + y; st.cap.position.set(0, DECK + y + SAT_Y.cm, 0); st.flame.visible = true; st.flame.scale.setScalar(1 + Math.sin(t * 40) * 0.08);
    L.innerHTML = "🚀 Liftoff…"; L.className = "acLbl big"; o.goal = { target: V3(0, DECK + y + 55, 0), dist: 190 }; }
  else if (st.ph === 0) { st.ph = 1; SND.tone(70, 1.5, "sawtooth", 0.12); SND.tone(1200, 0.4, "square", 0.05); st.flame.visible = false;
    const c = V3(0, st.rk.position.y + SAT_Y.sii + 12, 0); st.boom.forEach((p) => { p.b.visible = true; p.b.position.copy(c); }); st.flash.position.copy(c); st.flash.intensity = 6; st.c = c;
    Object.values(st.parts).forEach((p, i) => (p.userData.spin = V3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2)));
    L.innerHTML = "💥 The rocket fails!"; L.className = "acLbl big red"; st.v.set(2, 8, 0); }
  if (st.ph >= 1) { const k = T - 3;
    st.boom.forEach((p) => { p.b.position.addScaledVector(p.v, dt); p.v.multiplyScalar(0.97); p.b.scale.setScalar(10 + k * 16); p.b.material.opacity = Math.max(0, 1 - k / 7); }); st.flash.intensity = Math.max(0, 6 - k * 3);
    Object.entries(st.parts).forEach(([key, p], i) => { p.position.x += (i - 2) * dt * 5; p.position.y -= k * dt * 9; p.rotation.x += p.userData.spin.x * dt * 0.4; p.rotation.z += p.userData.spin.z * dt * 0.4; });
    if (k < 3.2) { st.v.y += 18 * dt; st.v.x += 6 * dt; st.cap.rotation.z = -Math.min(0.5, k * 0.25);                       // the tower's motor fires
      st.lesFl.forEach((f, i) => { f.visible = true; const a = i / 4 * Math.PI * 2; f.position.copy(st.cap.localToWorld(V3(Math.cos(a) * 1.4, SAT_Y.les - SAT_Y.cm + 1.2, Math.sin(a) * 1.4))).add(V3(Math.cos(a) * 1.5, -1.2, Math.sin(a) * 1.5)); f.scale.setScalar(3.5 + Math.sin(t * 50 + i) * 0.8); });
      if (k > 0.2) { L.innerHTML = "🗼 Escape tower fires: it yanks the capsule away!"; L.className = "acLbl big gold"; } }
    else { st.lesFl.forEach((f) => (f.visible = false)); st.v.y -= 9.8 * dt; st.v.x *= 0.99; }
    if (k > 3.2 && st.ph === 1) { st.ph = 2; st.lv.set(18, 25, 0); L.innerHTML = "✂️ Tower thrown away"; SND.tone(500, 0.2, "square", 0.06); }
    if (st.ph >= 2) { const lp = st.les.getWorldPosition(new THREE.Vector3()); if (st.les.parent === st.cap) { st.cap.remove(st.les); MS.S.scene.add(st.les); st.les.position.copy(lp); }
      st.les.position.addScaledVector(st.lv, dt); st.lv.y -= 9.8 * dt; st.les.rotation.z -= dt * 2; }
    if (k > 4.6 && st.ph === 2) { st.ph = 3; st.chutes.visible = true; L.innerHTML = "🪂 Parachutes open: the crew is safe!"; L.className = "acLbl big green"; SND.beep(); }
    if (st.ph === 3) { st.v.set(0, -6, 0); st.cap.rotation.z *= 0.95; st.chutes.scale.setScalar(Math.min(0.9, 0.2 + (k - 4.6) * 0.8)); }
    st.cap.position.addScaledVector(st.v, dt); if (st.cap.position.y < DECK + 2) st.cap.position.y = DECK + 2;
    o.goal = null; const want = st.ph === 3 ? st.cap.position.clone().add(V3(0, 6, 0)) : st.cap.position.clone().lerp(st.c, 0.5);
    o.target.lerp(want, Math.min(1, dt * 6)); o.dist += ((st.ph === 3 ? 60 : 250) - o.dist) * Math.min(1, dt * 1.5);
    if (k > 8 && !st.end) { st.end = true;
      msModal(`<h2>🗼 The escape tower saved the crew</h2><p>Its solid rocket motor pushed with about <b>650,000 newtons</b> (147,000 pounds of force), more than a whole Redstone rocket, and pulled the Command Module clear of the explosion in seconds. Then the tower was thrown away and the parachutes opened.</p>
        <p>Apollo never had to use it. But escape systems have saved real crews: in <b>1983</b> a Soyuz caught fire on the pad and its tower pulled 2 cosmonauts away seconds before the rocket exploded, and in <b>2018</b> the Soyuz MS-10 crew landed safely after their booster failed.</p>
        <div class="row"><button class="btn go" onclick="msModalClose();apLesBack()">✅ Keep the escape tower</button></div>`); } }
}
function apLesBack() { AP_RUN[9](); setTimeout(() => apCam(V3(0, DECK + SAT_Y.les + 2, 0), 30), 300); }

// ======================= STEP 11 — Launch day (2026), GO / NO-GO =======================
const NM_REF = Date.UTC(2000, 0, 6, 18, 14) / 86400000, SYN = 29.530589;
const moonAge = (dayNum) => (((dayNum - NM_REF) % SYN) + SYN) % SYN;
const DAY0 = Date.UTC(2026, 10, 20) / 86400000;                           // calendar starts 20 Nov 2026
function dayInfo(i) {
  const dn = DAY0 + i, date = new Date(dn * 86400000), site = SITES.find((s) => s.id === (AP.site || "a11"));
  // Landing ~4.1 days after launch; extra orbits around the Moon let the crew land a bit earlier or later (about 3.6 to 4.9 days).
  const age = moonAge(dn + 4.1); let elev = ((site.lon - (90 - 12.19 * age)) + 540) % 360 - 180;
  const lo = elev - 0.5 * 12.19, hi = elev + 0.8 * 12.19, pole = site.id === "art", light = pole ? 1 : hi >= 5 && lo <= 14;
  if (light && !pole) elev = Math.min(14, Math.max(5, elev));
  const h = Math.abs(Math.sin(dn * 12.9898) * 43758.5453) % 1, wxBad = h < 0.28 && !(light && h > 0.12);
  const wx = wxBad ? ["⛈️ Thunderstorms", "💨 High winds", "🌧️ Heavy rain, lightning nearby", "☁️ Thick storm clouds"][Math.floor(h * 100) % 4] : ["☀️ Clear skies", "🌤️ Mostly sunny", "⛅ A few clouds, light winds"][Math.floor(h * 100) % 3];
  const open = 6 + ((i * 0.83) % 7), close = open + 4.5;
  return { i, dn, date, age, elev, light, pole, wxBad, wx, open, close };
}
const hhmm = (h) => `${String(Math.floor(h) % 24).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
AP_RUN[10] = () => {
  apHint((() => { for (let i = 0; i < 62; i++) { const d = dayInfo(i); if (d.light && !d.wxBad) return `Try ${d.date.toUTCString().slice(0, 11)} between ${hhmm(d.open)} and ${hhmm(d.close)}. Sunlight at your site and the weather are both GO.`; } return "Look for a day with good weather and low sunlight at your landing site."; })());
  AP.dayTries = 0; AP.dayPick = null; AP.hour = 9;
  msScene("day", (S) => { K.space(S, 3000, 0.08); const moon = K.moon(2.6, V3(0, 0.2, 0), S.scene); const sun = new THREE.DirectionalLight(0xffffff, 1.7); S.scene.add(sun); S.scene.add(sun.target);
    const site = SITES.find((s) => s.id === (AP.site || "a11")), la = site.lat * DEG, lo = site.lon * DEG; const mk = glowSprite("rgba(255,210,122,1)", 0.5); mk.position.set(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)).multiplyScalar(2.65).add(V3(0, 0.2, 0)); S.scene.add(mk);
    msLabel("📍 Your landing site", mk.position.clone().add(V3(0, 0.45, 0)), "gold"); S.st = { moon, sun };
    S.orbit = { target: V3(0, 0.2, 0), dist: 8.5, yaw: 0, pitch: 0, auto: 0, locked: true };
    S.update = (dt, t) => { const d = AP.dayPick != null ? dayInfo(AP.dayPick) : dayInfo(0), a = (d.age / SYN) * Math.PI * 2;      // Sun direction from the Moon's phase at landing
      sun.position.set(-Math.sin(a) * 10, 1, -Math.cos(a) * 10 * -1); }; });
  apDayUI();
};
function apDayUI(sel) { const D = sel != null ? dayInfo(sel) : null, days = [...Array(62)].map((_, i) => dayInfo(i));
  const inWin = D && AP.hour >= D.open && AP.hour <= D.close;
  apPanel(`<h3>📅 Pick your launch day and time (Kennedy Space Center, 2026–27)</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:4px;max-height:118px;overflow-y:auto">${days.map((d) => `<button class="pick ${sel === d.i ? "on" : ""}" style="padding:3px;text-align:center;flex:none" onclick="apDay(${d.i})"><b style="font-size:12px">${d.date.toUTCString().slice(5, 11)}</b>${AP.seen && AP.seen[d.i] ? `<small>${d.light && !d.wxBad ? "🟢" : "🔴"}</small>` : ""}</button>`).join("")}</div>
    ${D ? `<div class="lcRow" style="align-items:center">
      <div class="chips" style="flex:2 1 380px"><span class="chipS ${D.wxBad ? "bad" : "ok"}">${D.wx}</span><span class="chipS ${D.light ? "ok" : "bad"}">${D.pole ? "🌗 South Pole: the Sun circles low, OK" : D.elev < 0 || D.elev > 180 ? "🌑 Landing site in darkness" : D.elev < 5 ? `🌄 Sun only ${Math.round(D.elev)}° up: shadows too long` : D.elev <= 14 ? `🌅 Sun about ${Math.round(D.elev)}° up at landing: perfect shadows` : `☀️ Sun ${Math.round(D.elev)}° up: glare hides craters`}</span>
        <span class="chipS ${inWin ? "ok" : "bad"}">🕒 Window ${hhmm(D.open)}–${hhmm(D.close)}</span></div>
      ${K.slider("apHr", "🕒 Launch time (local)", 0, 23.75, 0.25, AP.hour, "apHour")}
      <button class="btn go" onclick="apLaunchDay(${D.i})">🚀 Launch ${D.date.toUTCString().slice(5, 11)} at ${hhmm(AP.hour)}</button></div>` : `<p class="lead" style="margin-top:6px">Tap a day to check: <b>weather</b> on Earth, <b>sunlight</b> at your landing site, and today's <b>launch window</b> (when the Moon is lined up).</p>`}
    <div class="row"><button class="btn ghost" onclick="apGo(9)">← Safety</button></div>`);
  if (D) K.set("apHrV", hhmm(AP.hour)); }
function apHour(v) { AP.hour = +v || 9; apDayUI(AP.dayPick); }
function apDay(i) { SND.click(); AP.dayPick = i; AP.seen = AP.seen || {}; AP.seen[i] = 1; const D = dayInfo(i); if (!(AP.hour >= 0)) AP.hour = 9; if (AP.hour < D.open || AP.hour > D.close) AP.hour = Math.round((D.open + 0.5) * 4) / 4; apDayUI(i); D.light && !D.wxBad ? sh("happy", "Weather GO, sunlight GO! 🟢 Pick a time inside the window.") : sh("sad", "That's a <b>NO-GO</b> day. You can still launch… but should you?"); }
function apLaunchDay(i) { const D = dayInfo(i); AP.dayTries++; const inWin = AP.hour >= D.open && AP.hour <= D.close;
  if (D.light && !D.wxBad && inWin) { if (AP.dayTries === 1) msPoints(300, "perfect launch window"); AP.day = D; apSay("happy", `${D.date.toUTCString().slice(0, 16)}, ${hhmm(AP.hour)}: all GO!`); return setTimeout(() => apGo(11), 1600); }
  const why = D.wxBad ? `${D.wx}. Rockets can trigger lightning: <b>Apollo 12</b> was struck twice right after liftoff in 1969 and nearly lost its power.`
    : !D.light ? `Bad sunlight at your landing site. Apollo landed when the Sun was low (about 5–14°) so long shadows showed every rock and crater.`
    : `You launched outside the window (${hhmm(D.open)}–${hhmm(D.close)}). The Moon wasn't lined up for the TLI burn. Apollo 11's window lasted about 4.5 hours.`;
  const lives = msLife(D.wxBad ? "launched in bad weather" : !D.light ? "bad sunlight at the landing site" : "missed the launch window");
  msModal(`<h2>❌ You launched on a NO-GO</h2><p>${why}</p><p>You lost a lifeline.${lives ? " Pick a better day or time!" : ""}</p><div class="row"><button class="btn go" onclick="msModalClose()">Try again</button></div>`); }

// ======================= STEP 12 — Spacesuits =======================
const SUIT_PARTS = [
  ["helmet", "⛑️ Helmet and visor", "A gold visor slides down to block harsh sunlight, while the clear bubble lets you see."],
  ["body", "🧥 Pressurised suit body", "The suit is blown up with oxygen like a balloon, giving your body the pressure it needs (about 4.3 psi)."],
  ["joints", "🦵 Flexible joints, gloves, boots", "Bearings at the hips, knees and shoulders let you squat, kneel and grab rocks."],
  ["pack", "🎒 Life-support backpack", "Fresh oxygen flows into the helmet (blue); breathed-out CO₂ goes back to be cleaned (grey)."],
  ["cool", "💧 Cooling system", "Cold water runs through thin tubes in your underwear and carries your body heat away."],
  ["batt", "🔋 Battery and communications", "A battery powers everything, and the radio sends your voice to the lander and Earth."],
  ["waste", "🚽 Waste management", "Special absorbent underwear for the many hours spent suited."],
  ["water", "🥤 Drinking water", "A water bag inside the suit with a straw near your mouth."],
  ["thermal", "🌡️ Thermal protection", "Layers block sunlight (+120 °C) and shadow (−150 °C); inside stays about 20 °C."],
  ["dust", "🌫️ Dust resistance", "Sharp Moon dust bounces off sealed joints and slick outer layers."],
];
const COMPARE = [
  ["🦵 Mobility", "Apollo: stiff joints, so astronauts <b>bunny-hopped</b> and struggled to kneel. Artemis: bearings let you <b>squat and kneel</b> to pick up rocks."],
  ["🚪 Getting in", "Apollo: a long sealing zipper, and a crewmate had to help close it. Artemis: open the <b>hatch in the back</b>, climb in, and seal it."],
  ["🌫️ Dust", "Apollo: sticky Moon dust <b>clung</b> to fabric folds and jammed zippers and joints. Artemis: dust <b>bounces off</b> sealed bearings and slick outer layers."],
  ["🔦 Lights", "Apollo: sunny equator landings, so no lights. Artemis: <b>helmet lights and an HD camera</b> for dark South Pole craters."],
  ["🎒 Life support", "Apollo's backpack: moonwalks of about 4 hours at first, up to about 7 hours later. Artemis AxEMU: built for <b>8+ hour</b> moonwalks, with backup systems."],
];
AP_RUN[11] = () => {
  apHint("Choose the Artemis suit (option 2). Option 3 shows why it's better. Then include all 10 parts.");
  AP.suitTry = 0; AP.suitParts = {}; AP.demo = -1; AP.part = null; apSuitScene(); apSuitUI();
};
function apSuitScene() {
  msScene("suits", (S) => { const s = S.scene; K.space(S, 2500, 0.4); const sunL = MQ.sun(s, V3(-8, 10, 8), 8, 2048), hemi = new THREE.HemisphereLight(0xbfd4ff, 0x40444a, 0.4); s.add(hemi);
    const gr = K.ground(S, 80, 0x9a9aa0); gr.receiveShadow = true;
    const mk = (suit, x, name) => { const a = makeAstronaut({ visorDown: false, face: true, name, cdr: false, suit }); a.scale.setScalar(0.42); a.position.set(x, 3.75 * 0.42, 0); a.traverse((o) => { if (o.isMesh) o.castShadow = true; }); s.add(a); return a; };
    const ap = mk(undefined, -1.7, "APOLLO"), ar = mk(0xe8742a, 1.7, "ARTEMIS");
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 0.12), MQ.mat(0xd8dade)); hatch.geometry.translate(0.75, 0, 0); hatch.position.set(-0.75, -1.0, -1.45); ar.add(hatch);
    const inner = makeAstronaut({ visorDown: false, name: "", cdr: false, suit: 0x2f5f9a }); inner.userData.helmet.forEach((h) => (h.visible = false)); inner.scale.setScalar(0.85); inner.visible = false; ar.add(inner);
    const innerTag = msLabel("🧍 Astronaut (in cooling underwear) steps in from the back", () => (AP.demo === 1 && inner.visible ? inner.getWorldPosition(new THREE.Vector3()).add(V3(0, 1.9, 0)) : null), "");
    const helper = makeAstronaut({ visorDown: true, name: "", cdr: false }); helper.scale.setScalar(0.38); helper.position.set(-2.9, 3.75 * 0.38, -0.9); helper.rotation.y = 1.2; helper.visible = false; s.add(helper);
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.05), K.basic(0xffd27a)); zip.position.set(0, -1.2, -0.9); zip.visible = false; ap.add(zip);
    const lamp = new THREE.Mesh(new THREE.ConeGeometry(1.4, 6, 24, 1, true), K.basic(0xfff3c0, { transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); lamp.rotation.x = -Math.PI / 2; lamp.position.set(0, 1.2, 3.8); ar.userData.head.add(lamp);
    const spot = new THREE.SpotLight(0xfff1c8, 0, 30, 0.45, 0.5, 1); spot.position.set(0, 1.2, 0.8); ar.userData.head.add(spot); const sTgt = new THREE.Object3D(); sTgt.position.set(0, -4, 8); ar.userData.head.add(sTgt); spot.target = sTgt;
    const bulbs = [-0.55, 0.55].map((x) => { const b = glowSprite("rgba(255,245,200,1)", 0.9); b.position.set(x, 1.25, 0.95); ar.userData.head.add(b); return b; });
    const dust = []; for (let i = 0; i < 70; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), K.basic(0x6b6258)); d.visible = false; s.add(d); dust.push({ d, side: i % 2, t: Math.random() }); }
    const stuck = new THREE.Group(); ap.add(stuck);
    // effects for the 10 suit parts (on the Artemis suit)
    const fx = new THREE.Group(); ar.add(fx);
    const bubbles = []; for (let i = 0; i < 16; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), K.basic(i % 2 ? 0x8a8f99 : 0x7fd4ff)); b.visible = false; fx.add(b); bubbles.push(b); }
    const tubes = new THREE.Group(); tubes.visible = false; fx.add(tubes); for (let r = 0; r < 5; r++) { const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; pts.push(V3(Math.cos(a) * 1.2, -0.4 - r * 0.4 + Math.sin(a * 4) * 0.08, Math.sin(a) * 0.9)); }
      tubes.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.035, 6, true), K.basic(0x2f8ff0))); }
    const rings = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 6, 32), K.basic(0x7dffb5, { transparent: true })); r.visible = false; r.position.set(0.45, 0.7, -1.1); fx.add(r); return r; });
    const wbag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.15), K.basic(0x4aa8ff, { transparent: true, opacity: 0.8 })); wbag.position.set(0.25, 0.7, 0.55); wbag.visible = false; fx.add(wbag);
    const hot = new THREE.PointLight(0xff4020, 0, 6), cold = new THREE.PointLight(0x2060ff, 0, 6); hot.position.set(3, 1, 1); cold.position.set(0.4, 1, 1); s.add(hot); s.add(cold);
    S.st = { ap, ar, hatch, inner, helper, zip, lamp, spot, bulbs, sunL, hemi, dust, stuck, bubbles, tubes, rings, wbag, hot, cold };
    S.st.lampLbl = msLabel("🔦 Helmet lights + HD camera: light up dark craters", () => ((AP.demo === 3 || (AP.suitDesign && AP.part === "helmet")) ? V3(1.7, 3.55, 0) : null), "gold");
    S.st.L1 = msLabel("Apollo A7L (1969)", () => (AP.suitDesign ? null : V3(-1.7, 3.1, 0)), ""); S.st.L2 = msLabel("Artemis AxEMU (today)", V3(1.7, 3.1, 0), "gold");
    S.st.bar1 = msLabel("", () => (AP.demo === 4 ? V3(-1.7, 0.1, 1.4) : null), "big"); S.st.bar2 = msLabel("", () => (AP.demo === 4 ? V3(1.7, 0.1, 1.4) : null), "big");
    S.st.info = msLabel("", () => (AP.part && AP.suitDesign ? V3(1.7, 3.7, 0) : null), "gold");
    S.orbit = { target: V3(0, 1.4, 0), dist: 7.5, yaw: 0, pitch: 0.1, auto: 0 };
    S.update = (dt, t) => apSuitTick(dt, t);
  });
}
function apSuitTick(dt, t) {
  const st = MS.S.st, d = AP.demo, A = st.ap, B = st.ar, ua = A.userData, ub = B.userData;
  [A, B].forEach((x) => { x.position.y = 3.75 * 0.42; x.scale.setScalar(0.42); x.userData.legs.forEach((l) => l.rotation.set(0, 0, 0)); x.userData.arms[0].rotation.set(0, 0, -0.2); x.userData.arms[1].rotation.set(0, 0, 0.2); x.userData.arms.forEach((a) => a.userData.elbow.rotation.set(0, 0, 0)); x.userData.head.rotation.set(0, 0, 0); });
  st.hatch.rotation.y = 0; st.inner.visible = false; st.helper.visible = false; st.zip.visible = false; const lights = d === 3 || (AP.suitDesign && AP.part === "helmet"); st.lamp.visible = lights; st.bulbs.forEach((b) => (b.visible = lights)); st.spot.intensity = lights ? 3 : 0;
  st.sunL.intensity = lights ? 0.08 : 1.2; st.hemi.intensity = lights ? 0.05 : 0.4; st.stuck.visible = d === 2;
  // 1 mobility
  if (d === 0) { A.position.y += Math.abs(Math.sin(t * 5)) * 0.35; const k = (Math.sin(t * 2) + 1) / 2; B.position.y -= k * 0.55; ub.legs[0].rotation.x = -k * 1.4; ub.legs[1].rotation.x = -k * 0.4; ub.arms.forEach((a) => (a.rotation.x = -k * 0.9)); }
  // 2 getting in: Apollo needs a helper to pull the long zipper; Artemis: hatch opens, the person steps in from behind, hatch closes
  if (d === 1) { st.helper.visible = true; st.zip.visible = true; const zk = (t * 0.4) % 1; st.zip.scale.y = 0.2 + zk * 2.2; st.zip.position.y = -2.2 + zk * 1.1;
    st.helper.userData.arms[1].rotation.set(-1.4, 0, 0.3 + Math.sin(t * 6) * 0.2); st.helper.userData.arms[0].rotation.set(-1.4, 0, -0.3); ua.arms.forEach((a, i) => a.rotation.set(-0.3, 0, (i ? 1 : -1) * 0.9));
    const k = (t * 0.3) % 1; st.hatch.rotation.y = -(k < 0.7 ? Math.min(1, k * 4) : Math.max(0, 1 - (k - 0.7) * 4)) * 1.7; st.inner.visible = k > 0.1 && k < 0.75; st.inner.position.set(0, -0.55, -4.2 + Math.min(1, Math.max(0, (k - 0.15) / 0.45)) * 4.1); poseAstronaut(st.inner, t * 8, k < 0.6 ? 1 : 0, t); }
  // 3 dust: sticks to Apollo, bounces off Artemis
  st.dust.forEach((o, i) => { o.d.visible = d === 2 || (AP.part === "dust" && AP.suitDesign); if (!o.d.visible) return; o.t += dt * 0.6; if (o.t > 1) { o.t = 0; o.stuck = false; }
    const tgt = (AP.suitDesign ? B : o.side ? A : B).position, k = o.t, start = V3(tgt.x + Math.cos(i) * 2.2, 0.1, Math.sin(i) * 2.2);
    if (o.side && !AP.suitDesign) { o.d.position.lerpVectors(start, tgt.clone().add(V3(Math.cos(i * 3) * 0.45, -0.3 + (i % 7) * 0.2, 0.4)), Math.min(1, k * 1.4));
      if (k > 0.7 && st.stuck.children.length < 140 && Math.random() < 0.08) { const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), K.basic(0x5e554b)); dot.position.set((Math.random() - 0.5) * 2.2, -3.3 + Math.random() * 3.2, 0.7 + Math.random() * 0.3); st.stuck.add(dot); } }
    else { const p = Math.min(1, k * 2); const hit = tgt.clone().add(V3(Math.cos(i * 3) * 0.45, -0.3 + (i % 7) * 0.2, 0.45)); o.d.position.lerpVectors(start, hit, p); if (k > 0.5) o.d.position.add(V3(Math.cos(i) * (k - 0.5) * 4, (k - 0.5) * 2, 1.5 * (k - 0.5))); } });
  if (d === 3) ub.head.rotation.y = Math.sin(t * 1.2) * 0.6;
  // 5 life support: two clocks, Apollo runs out first
  if (d === 4) { const hrs = (t * 0.9) % 10; const ap = Math.max(0, 1 - hrs / 7), ar = Math.max(0, 1 - hrs / 10);
    st.bar1.el.innerHTML = `🎒 ${hrs.toFixed(1)} h · O₂ ${Math.round(ap * 100)}% ${ap <= 0 ? "❌ back inside!" : ""}`; st.bar1.el.className = "acLbl big " + (ap < 0.25 ? "red" : "");
    st.bar2.el.innerHTML = `🎒 ${hrs.toFixed(1)} h · O₂ ${Math.round(ar * 100)}% ${hrs > 8 ? "✅ still going" : ""}`; st.bar2.el.className = "acLbl big green";
    if (ap <= 0) { A.position.y -= 0.1; ua.head.rotation.x = 0.3; } }
  // the 10 suit-part demos on the Artemis suit
  const P = AP.suitDesign ? AP.part : null; st.bubbles.forEach((b) => (b.visible = false)); st.tubes.visible = false; st.rings.forEach((r) => (r.visible = false)); st.wbag.visible = false; st.hot.intensity = st.cold.intensity = 0;
  if (AP.suitDesign) { B.rotation.y = P ? -0.25 : Math.sin(t * 0.5) * 0.6; A.visible = false; }
  if (P === "helmet") { const v = ub.helmet[ub.helmet.length - 1]; v.visible = Math.sin(t * 0.8) > -0.3; ub.head.rotation.y = Math.sin(t) * 0.5; }
  if (P === "body") B.scale.setScalar(0.42 * (1 + (Math.sin(t * 3) + 1) * 0.04));
  if (P === "joints") { const k = (Math.sin(t * 2) + 1) / 2; B.position.y -= k * 0.5; ub.legs[0].rotation.x = -k * 1.3; ub.arms[1].rotation.set(-k * 2.5, 0, 0.3); ub.arms[1].userData.elbow.rotation.x = -k; }
  if (P === "pack") st.bubbles.forEach((b, i) => { b.visible = true; const k = (t * 0.5 + i / 16) % 1, up = i % 2 === 0; const a = V3(0, -0.6, -1.3), c = V3(0, 1.15, 0.2); b.position.lerpVectors(up ? a : c, up ? c : a, k); b.position.x += Math.sin(k * 6 + i) * 0.2; });
  if (P === "cool") { st.tubes.visible = true; st.tubes.children.forEach((m, i) => m.material.color.setHSL(0.58, 0.9, 0.45 + Math.sin(t * 5 - i) * 0.15)); }
  if (P === "batt") st.rings.forEach((r, i) => { r.visible = true; const k = (t * 0.7 + i / 3) % 1; r.scale.setScalar(1 + k * 6); r.material.opacity = 1 - k; r.position.y = 0.7 + k * 1.5; });
  if (P === "water") { st.wbag.visible = true; st.bubbles.slice(0, 4).forEach((b, i) => { b.visible = true; b.position.set(0.25, 0.9 + ((t * 0.6 + i / 4) % 1) * 0.5, 0.6); }); }
  if (P === "thermal") { st.hot.intensity = 2.2; st.cold.intensity = 2.2; st.hot.position.set(B.position.x + 2, 1.2, 1); st.cold.position.set(B.position.x - 2, 1.2, 1); }
}
function apSuitUI() { AP.suitDesign = false; AP.part = null; apPanel(`<h3>🧑‍🚀 Choose your spacesuits</h3><div class="lcRow">
  <button class="pick" onclick="apSuit(1)"><span class="pi">⚪</span><b>1 · Apollo spacesuit</b><small>The classic A7L from 1969</small></button>
  <button class="pick" onclick="apSuit(2)"><span class="pi">🟠</span><b>2 · Artemis spacesuit</b><small>Next generation: AxEMU</small><span class="price">$60M</span></button>
  <button class="pick" onclick="apSuit(3)"><span class="pi">⚖️</span><b>3 · Compare Apollo vs Artemis</b><small>Watch them side by side</small></button></div>
  <div class="row"><button class="btn ghost" onclick="apGo(10)">← Launch day</button></div>
  <p style="font-size:11px;color:#6c7a92;margin:4px 0 0">Colours in the game: orange = Artemis. (The real Orion launch suit is orange; the AxEMU moonwalking suit's outer layer is white.)</p>`); }
function apSuit(n) { SND.click(); AP.suitTry++;
  if (n === 1) return apSay("sad", "That suit is <b>outdated</b>! Astronauts had to bunny-hop, and the dust wore it out. Use the new technology: <b>option 2</b>.");
  if (n === 3) { AP.demo = 0; return apCompareUI(); }
    msSpend(60, "3 Artemis spacesuits", (ok) => { if (!ok) return; if (AP.suitTry <= 2) msPoints(200, "next-generation suits"); AP.demo = -1; DEMO() ? apSuitToDesign() : apSuitMake(); }); }
// ---- how a spacesuit is made: layers from the skin outward (the cut-away suit from Academy lesson 21) ----
function apSuitMake() {
  const C = window.SUIT_CUT, ORDER = ["lcvg", "bladder", "restraint", "tmg", "plss"];
  const WHY = { lcvg: "Touches your <b>skin</b>: cold water flows through about <b>91 m of thin tubes</b> and carries your body heat away.",
    bladder: "An <b>airtight balloon</b> that holds pure oxygen at about <b>4.3 psi</b> around your body.",
    restraint: "Strong woven cloth <b>around the balloon</b>, so it keeps a human shape instead of puffing up.",
    tmg: "<b>Many thin shiny layers</b> block the +121 °C sunlight and −157 °C shadow, and a tough outer skin stops space rocks and sharp Moon dust.",
    plss: "The <b>backpack</b>: oxygen tanks, a CO₂ cleaner, the cooling-water pump, a battery and the radio." };
  msScene("suitmake", (S) => { const s = S.scene; K.space(S, 2500, 0.2); s.add(new THREE.AmbientLight(0xffffff, 0.45)); const d = new THREE.DirectionalLight(0xffffff, 1.1); d.position.set(4, 6, 6); s.add(d);
    const suit = new THREE.Group(); s.add(suit); const skin = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 3.1, 48), MQ.mat(0xd7a27d, { roughness: 0.7 })); suit.add(skin);
    msLabel("🧍 Skin", () => skin.localToWorld(V3(0, 1.75, 0)), "blue");
    S.st = { suit, layers: [], r: 0.5, i: 0 }; S.orbit = { target: V3(0, 0.1, 0), dist: 6.4, yaw: C.CUT, pitch: 0.3, auto: 0 };
    S.update = (dt, t) => { const st = S.st; S.orbit.yaw = C.CUT + Math.sin(t * 0.4) * 0.35;
      st.layers.forEach((g) => { const u = g.userData; u.k = Math.min(1, u.k + dt * 2); const e = 1 + (1 - u.k) * (1 - u.k) * 0.8; g.scale.set(e, 1, e); g.position.y = (1 - u.k) * 0.8;
        if (u.id === "lcvg") u.outMat.emissiveIntensity = 0.4 + Math.sin(t * 5) * 0.3; }); }; });
  const add = () => { const st = MS.S.st, id = ORDER[st.i]; if (!id) return;
    if (id === "plss") { const g = new THREE.Group(), grey = MQ.mat(0x9aa1ad, { roughness: 0.5, metalness: 0.3 }); g.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.5), grey));
      const back = C.CUT + Math.PI; g.position.set(Math.sin(back) * (st.r + 0.3), 0.2, Math.cos(back) * (st.r + 0.3)); g.rotation.y = back; st.suit.add(g); msLabel("🎒 Backpack (PLSS)", () => g.localToWorld(V3(0, 0.95, 0)), "gold"); }
    else { const d = C.LAYERS[id], i = st.layers.length, r0 = st.r, r1 = r0 + d.th; st.r = r1 + 0.02; const h = 2.7 - i * 0.28, side = { side: THREE.DoubleSide, roughness: id === "bladder" ? 0.35 : 0.85 };
      const outMat = new THREE.MeshStandardMaterial({ map: C.texFor(id), ...side }), inMat = new THREE.MeshStandardMaterial({ color: d.col, ...side });
      const cutMat = new THREE.MeshStandardMaterial(id === "tmg" ? { map: C.tmgCutTex(), ...side, metalness: 0.4 } : { color: d.col, ...side });
      if (id === "lcvg") { outMat.emissive = new THREE.Color(0x0a3a7a); outMat.emissiveIntensity = 0; }
      const g = C.shell(r0, r1, h, outMat, inMat, cutMat); g.userData = { id, outMat, k: 0 }; st.suit.add(g); st.layers.push(g);
      const a = C.T0, ly = 1.05 - i * 0.55; msLabel(`${d.ico} ${d.name}`, () => g.localToWorld(V3(r1 * Math.sin(a), ly, r1 * Math.cos(a))), "gold side"); }
    SND.tone(520 + st.i * 120, 0.12, "triangle", 0.08); st.i++;
    const L = id === "plss" ? { ico: "🎒", name: "Backpack (PLSS)" } : C.LAYERS[id];
    apPanel(`<h3>🧵 How your Artemis suit is made (${st.i}/5)</h3><p class="lead">${L.ico} <b>${L.name}:</b> ${WHY[id]}</p>
      <div class="row">${st.i < 5 ? `<button class="btn go" onclick="AP.mkAdd()">➕ Next layer</button>` : `<span style="color:#7dffb5;font-weight:700;margin-right:auto">✅ A tiny spaceship shaped like you! A real suit has up to 16 layers.</span><button class="btn go" onclick="apSuitToDesign()">🛠️ Now add its 10 parts ▶</button>`}</div>`); };
  AP.mkAdd = () => { SND.click(); add(); };
  apPanel(`<h3>🧵 How a spacesuit is made</h3><p class="lead">A spacesuit is built in <b>layers, like an onion</b>, from your <b>skin outward</b>. Each layer has one job. (You built this in Academy lesson 21!)</p><div class="row"><button class="btn go" onclick="AP.mkAdd()">➕ Add the first layer</button></div>`);
}
function apSuitToDesign() { SND.click(); apSuitScene(); AP.suitDesign = true; MS.S.orbit.goal = { target: V3(1.7, 1.3, 0), dist: 5.2 }; apSuitDesignUI(); }
function apCompareUI() { const d = AP.demo; MS.S.st.stuck.children.slice().forEach((c) => MS.S.st.stuck.remove(c));
  MS.S.orbit.goal = d === 1 ? { target: V3(-0.5, 1.3, 0), dist: 8, yaw: 2.4, pitch: 0.15 } : { target: V3(0, 1.4, 0), dist: 7.5, yaw: 0, pitch: 0.1 };
  apPanel(`<h3>⚖️ Apollo vs Artemis: ${COMPARE[d][0]}</h3><p class="lead">${COMPARE[d][1]}</p>
    <div class="lcRow">${COMPARE.map((c, i) => `<button class="pick ${i === d ? "on" : ""}" style="flex:1 1 110px" onclick="AP.demo=${i};SND.click();apCompareUI()"><b>${i + 1} · ${c[0]}</b></button>`).join("")}</div>
    <div class="row"><button class="btn ghost" onclick="AP.demo=-1;apSuitUI()">← Back</button><button class="btn go" onclick="AP.demo=-1;apSuit(2)">🟠 Choose Artemis suits</button></div>`); }
function apSuitDesignUI() { const n = Object.keys(AP.suitParts).length, cur = SUIT_PARTS.find((p) => p[0] === AP.part);
  apPanel(`<h3>🛠️ Design your Artemis suit (${n}/10 parts)</h3><p class="lead">${cur ? `<b>${cur[1]}:</b> ${cur[2]}` : "Click each part to add it and watch what it does."}</p>
    <div class="lcRow">${SUIT_PARTS.map((p) => `<button class="pick ${AP.suitParts[p[0]] ? "good" : ""} ${AP.part === p[0] ? "on" : ""}" style="flex:1 1 150px" onclick="apSuitPart('${p[0]}')"><b>${AP.suitParts[p[0]] ? "✅ " : ""}${p[1]}</b></button>`).join("")}</div>
    <div class="row"><button class="btn go" ${n === 10 ? "" : "disabled"} onclick="apSuitDone()">✅ Suits ready</button></div>`); }
function apSuitPart(k) { SND.tone(700, 0.08); AP.suitParts[k] = true; AP.part = k; const p = SUIT_PARTS.find((x) => x[0] === k); MS.S.st.info.el.innerHTML = p[1]; apSuitDesignUI(); }
function apSuitDone() { msPoints(300, "all 10 suit parts"); GAME.mis.suit = "artemis"; msWeight("suits", "3 spacesuits (worn)", 0.3); apSay("happy", "Suits ready! Everyone's in orange now. Time to go to the pad!"); setTimeout(() => apGo(12), 1500); }

// ======================= STEP 13 — Board the rocket =======================
AP_RUN[12] = () => {
  apHint("Just watch: the crew walks across the launch deck, rides the tower elevator up, crosses the access arm into the White Room and climbs into the Command Module.");
  apPad(); apRocketDraw(); apCrewPlace(); const S = MS.S; MS.ui.innerHTML = `<div class="msBig" id="apBig"></div>`;
  const R = S.st.rocket, cm = R.userData.parts.cm, topY = DECK + 99.5 + 0.3, walkers = AP.crew.map((i) => S.st.crew[i]); walkers.forEach((a) => (a.userData.walk = true)); S.st.crew.forEach((a, i) => { if (!AP.crew.includes(i)) a.visible = false; });
  const Y0 = DECK + 0.08 + 3.75 * 0.29, door = V3(-10.6, Y0, 3), lift = S.st.LC.lift; let T = 0;
  const path = (k) => [CREW_SPOT(AP.crew[k]), V3(-1, Y0, 14), door];
  apCam(V3(4, Y0 + 1, 10), 26, 0.5, 0.2);
  S.st.tick = (dt, t) => { T += dt;
    walkers.forEach((a, k) => { const u = a.userData, tt = T - k * 1.4; if (tt < 0) return; const P = path(k); let p;
      if (tt < 3) { p = P[0].clone().lerp(P[1], tt / 3); a.rotation.y = -Math.PI / 2; poseAstronaut(a, tt * 8, 1, t); }
      else if (tt < 6) { p = P[1].clone().lerp(P[2], (tt - 3) / 3); a.rotation.y = -Math.PI / 2 - 0.9; poseAstronaut(a, tt * 8, 1, t); }
      else if (tt < 6 + (6 - k * 1.4) + 4) { const up = Math.min(1, Math.max(0, (T - 9.6) / 5)); p = V3(-17 + (k - 1) * 0.7, Y0 + up * (topY - Y0), 0.5); a.rotation.y = Math.PI / 2; poseAstronaut(a, 0, 0, t); }
      else if (tt < 6 + (6 - k * 1.4) + 4 + 3.2) { const w = (tt - (6 + (6 - k * 1.4) + 4)) / 3.2; p = V3(-17 + (k - 1) * 0.3, topY + 0.5, 0).lerp(V3(-2.4, topY + 0.5, 0), w); a.rotation.y = Math.PI / 2; poseAstronaut(a, tt * 8, 1, t); }
      else { p = V3(-1.6, topY + 0.6, 0); a.visible = false; u.inside = true; }
      a.position.copy(p); });
    lift.position.y = 1.3 + Math.min(1, Math.max(0, (T - 9.6) / 5)) * (99.5 - 0.3);
    if (T > 9.2 && !S.st.c1) { S.st.c1 = true; apCam(V3(-14, Y0 + 10, 0), 40, 0.9, 0.05); }
    if (T > 10.5 && !S.st.c2) { S.st.c2 = true; S.orbit.goal = { target: V3(-12, topY, 0), dist: 34, yaw: 0.9, pitch: 0.1 }; }
    if (T > 15 && !S.st.c3) { S.st.c3 = true; apCam(V3(-6, topY + 1, 0), 16, 0.35, 0.15);
      S.st.LC.whiteRoom.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.25; o.material.depthWrite = false; } });
      msLabel("⬜ White Room: the last door before the spacecraft", V3(-3, topY + 3.2, 0), ""); }
    if (walkers.every((a) => a.userData.inside) && !S.st.boarded) { S.st.boarded = true; SND.beep();
      // look inside the Command Module: 3 astronauts lying on their couches
      const sh = cm.userData.shell; sh.transparent = true; sh.opacity = 0.25; sh.depthWrite = false; sh.needsUpdate = true;
      AP.crew.forEach((ci, k) => { const c = apCrewList()[ci]; const a = makeAstronaut({ faceTex: faceTexFrom(c.face), depthTex: genericDepthTex(), stripe: c.stripe, cdr: k === 0, name: "", suit: 0xe8742a });
        a.scale.setScalar(0.2); a.rotation.x = -Math.PI / 2 + 0.15; a.position.set((k - 1) * 0.9, 1.2, 0.2); cm.add(a); });
      apCam(V3(0, DECK + SAT_Y.cm + 1.4, 0), 9, 0.25, 0.3);
      K.set("apBig", "🔒 Hatch closed. 3 astronauts on board!"); apSay("happy", "Strapped in, lying on their backs on top of 2,900 tonnes of rocket. Next: the <b>countdown</b>!");
      msLabel("👩‍🚀👨‍🚀🧑‍🚀 3 crew on their couches", V3(0, DECK + SAT_Y.cm + 3.2, 0), "gold"); setTimeout(apPartAEnd, 3200); } };
};
function apPartAEnd() { const m = GAME.mis;
  apPanel(`<h3>✅ Design complete: ready for launch!</h3>
    <div class="chips"><span class="chipS ok">⭐ ${K.fmt(m.points)} points</span><span class="chipS ok">📶 ${m.lives} lifelines</span><span class="chipS">💰 $${K.fmt(m.budget + m.loan + m.test - m.spent)}M left</span><span class="chipS">⚖️ ${K.fmt(m.weights.reduce((a, w) => a + w.t, 0))} t on the pad</span></div>
    <div class="row"><button class="btn ghost" onclick="showScreen('design')">🏠 Missions</button><button class="btn go" onclick="apPartB()">🚀 Go to the countdown</button></div>`); }
function apPartB() { if (typeof AP_FLIGHT === "function") return AP_FLIGHT(); msModal(`<h2>🚀 Launch: next part</h2><p>The countdown, liftoff, staging, gravity turn, parking orbit and TLI are being built now (Part B).</p><div class="row"><button class="btn go" onclick="msModalClose()">OK</button></div>`); }

// ======================= the screen =======================
SCREENS.apollo = {
  show() { msShow(); if (typeof FL !== "undefined") FL.ph = ""; document.body.classList.remove("flSide"); const keepLoan = GAME.mis ? GAME.mis.loan : 0; misNew("Apollo 11+"); GAME.mis.loan = keepLoan;
    Object.assign(AP, { i: 0, stack: [], fuel: {}, crew: [], extras: {}, path: null, site: null, fuelTry: {}, oxTry: {}, seen: {}, lesWarned: false, deluDemo: false, pick: [], wt: [75, 75, 75, 75], cm: {}, lm: { descent: {}, ascent: {} }, lmPhase: "descent", suitParts: {} });
    msInfoClear(); hudShow(true, { name: "🦅 Apollo 11+" }); if (typeof flHud === "function") flHud(false); if (typeof flRumble === "function") flRumble(false); apGo(0); },
  hide() { msHide(); },
};
