// mission/apollo-flight.js — Apollo 11+ PART B: Go/No-Go poll → countdown → liftoff → staging → parking orbit → TLI → docking (TD&E)
// → coast (barbecue roll, Kepler's 2nd law) → LOI behind the Moon → Moon orbit (max 20 orbits).
// Real numbers (NASA, Apollo 11 Mission Report & Saturn V AS-506 Flight Evaluation Report):
//  ignition sequence starts T−8.9 s · tower cleared ≈ T+12 s, then roll & pitch program · S-IC cutoff T+2:42 at ≈ 67 km, ≈ 2.4 km/s
//  escape tower jettisoned T+3:17 · S-II cutoff T+9:09 at ≈ 184 km · S-IVB cutoff T+11:40 → parking orbit ≈ 190 km at ≈ 7.8 km/s, one lap ≈ 88 min
//  TLI at T+2:44 h: S-IVB burns 5 min 47 s up to ≈ 10.8 km/s · docking speed below ≈ 0.3 m/s · PTC "barbecue roll" ≈ 3 turns per hour
//  LOI: Service Module engine burns 5 min 57 s behind the Moon, slowing by ≈ 889 m/s, into a ≈ 114 × 313 km orbit · each Moon orbit ≈ 2 h.
// Physics: vis-viva v² = μ(2/r − 1/a), Kepler's equation for positions. μ Earth = 398,600 km³/s², μ Moon = 4,905 km³/s².

const FL = {};
const FL_STEPS = ["Go/No-Go", "Countdown", "Ascent", "Orbit", "TLI", "Docking", "Coast", "Moon orbit", "Landing", "Moonwalk", "Home"];
const MU_E = 398600, MU_M = 4904.9, R_E = 6371, R_M = 1737.4;
function flSteps(i) { FL.si = i; K.set("msSteps", FL_STEPS.map((n, k) => `<span class="${k < i ? "done" : k === i ? "on" : ""}">${k < i ? "✓ " : ""}${n}</span>`).join("")); }
function flHud(on, v, u, alt) { const e = document.getElementById("msSpeed"); if (!e) return; e.hidden = !on; if (!on) return; K.set("msSpeedV", v); K.set("msSpeedU", u); K.set("msAlt", alt); }
const flClock = (t) => { const s = Math.max(0, Math.floor(t)); return `T+${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const lerpT = (T, t) => { if (t <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const [a, va] = T[i - 1], [b, vb] = T[i]; return va + (vb - va) * (t - a) / (b - a); } return T[T.length - 1][1]; };
function flCrewName(k) { const l = apCrewList(), c = l[(AP.crew && AP.crew.length ? AP.crew : [0, 1, 2])[k] || 0]; return c ? crewName(c) : "Crew"; }
function flChat(k, text) { const box = document.getElementById("flChat") || (() => { const d = document.createElement("div"); d.id = "flChat"; document.getElementById("msLabels").appendChild(d); return d; })();
  const m = document.createElement("div"); m.className = "flMsg"; m.innerHTML = `<b>${k === "capcom" ? "📡 CAPCOM" : "👩‍🚀 " + flCrewName(k)}:</b> ${text}`; box.appendChild(m); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => m.remove(), 7000); SND.tone(880, 0.06, "sine", 0.05); }
function flBanner(html, ms = 4000) { let b = document.getElementById("flBanner"); if (!b) { b = document.createElement("div"); b.id = "flBanner"; document.getElementById("msLabels").appendChild(b); }
  b.innerHTML = html; b.className = html ? "in" : ""; clearTimeout(FL.bt); if (html) FL.bt = setTimeout(() => (b.className = ""), ms); }
function flLife(why, retry) { const left = msLife(why); if (left > 0) return true;
  msModal(`<h2>💔 Out of lifelines</h2><p>Mission Control has scrubbed the flight. Every mistake taught you something. Try again!</p><div class="row"><button class="btn go" onclick="msModalClose();GAME.mis.lives=5;hudLives();(${retry ? "FL.retry&&FL.retry()" : "AP_FLIGHT()"})">🔁 Retry with 5 lifelines</button><button class="btn ghost" onclick="msModalClose();showScreen('design')">🏠 Missions</button></div>`);
  return false; }
// low engine rumble (noise through a low-pass filter)
function flRumble(on, vol = 0.12) { SND.init && SND.init(); const c = SND.ctx; if (!c || !GAME.soundOn) return; if (c.state === "suspended") c.resume();
  if (FL.rum) { try { FL.rum.src.stop(); FL.rum.src2.stop(); } catch (e) {} FL.rum = null; } if (!on) return;
  const mk = (sec, smooth) => { const buf = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = smooth ? (last + 0.02 * w) / 1.02 : w * (Math.random() < 0.02 ? 1 : 0.35); d[i] = smooth ? last * 3.5 : last; } const s = c.createBufferSource(); s.buffer = buf; s.loop = true; return s; };
  const src = mk(2, true), src2 = mk(1, false), lp = c.createBiquadFilter(), bp = c.createBiquadFilter(), g = c.createGain(), g2 = c.createGain();
  lp.type = "lowpass"; lp.frequency.value = 180; bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.7; g2.gain.value = 0.35;
  src.connect(lp).connect(g); src2.connect(bp).connect(g2).connect(g); g.gain.value = vol; g.connect(c.destination); src.start(); src2.start(); FL.rum = { src, src2, g, v: vol }; }

// ===================================================================== entry
function AP_FLIGHT() {
  Object.assign(FL, { t: 0, alt: 0, spd: 0, dr: 0, ph: "poll", turned: false, sepIC: false, ignII: false, lesOff: !AP.extras.les, sepII: false, ignIVB: false, cut: false, coast: 0, tries: {}, orbits: 0 });
  if (!AP.stack || AP.stack.length < 7) AP.stack = ["sic", "sii", "sivb", "lmd", "lma", "sm", "cm"];
  msInfoClear(); msInfo("stg", "🧱 Why drop stages?", `<p>An empty tank is dead weight. Dropping it means the next engines push a much lighter rocket.</p>`);
  flLaunchScene(); flPoll();
}

// ===================================================================== 1) the launch scene (pad → space)
function flLaunchScene() {
  if (MS.S) MS.S.key = "old";
  msScene("launch", (S) => { const s = S.scene; s.background = null;
    const world = new THREE.Group(); s.add(world); buildSkyGround(world);
    const sky = world.children[0]; s.add(sky); sky.material.fog = false; sky.material.transparent = true;
    const LC = buildLaunchComplex(world); MQ.sun(s, V3(160, 300, 200), 150);
    s.fog = new THREE.Fog(0xd8e9f7, 600, 4800);
    // the rocket (same parts the player stacked)
    const R = new THREE.Group(); R.position.y = DECK; s.add(R); const P = {};
    ["sic", "sii", "sivb", "sm", "cm"].forEach((k) => { const p = SAT[k](); p.position.y = SAT_Y[k]; R.add(p); P[k] = p; });
    const lm = buildLM({ folded: true }); lm.g.position.y = SAT_Y.lmd - 0.9; R.add(lm.g); P.lm = lm.g; const sla = SAT.sla(); sla.position.y = SAT_Y.sla; R.add(sla); P.sla = sla;
    if (AP.extras.les) { const l = SAT.les(); l.position.y = SAT_Y.les; R.add(l); P.les = l; }
    R.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const fl = { sic: K.flame(5.5, 34), sii: K.flame(3.6, 16), sivb: K.flame(1.8, 9) }; fl.sic.position.y = -1.5; fl.sii.position.y = SAT_Y.sii - 0.8; fl.sivb.position.y = SAT_Y.sivb - 0.6;
    Object.values(fl).forEach((f) => { f.visible = false; R.add(f); });
    // smoke + water at the pad (they stay on the ground)
    const smoke = []; for (let i = 0; i < 40; i++) { const d = glowSprite(i % 4 ? "rgba(235,235,235,0.75)" : "rgba(255,190,120,0.7)", 20); d.visible = false; world.add(d); smoke.push({ d, a: Math.random() * 6.28, k: Math.random() }); }
    const water = []; for (let i = 0; i < 30; i++) { const d = glowSprite("rgba(200,230,255,0.8)", 6); d.visible = false; world.add(d); water.push({ d, a: (i / 30) * 6.28 }); }
    // water deluge: thousands of droplets blasted out of the pad (Points), plus white steam
    const NW = 1600, wp = new Float32Array(NW * 3), wv = new Float32Array(NW * 3), wl = new Float32Array(NW); const wg = new THREE.BufferGeometry(); wg.setAttribute("position", new THREE.BufferAttribute(wp, 3));
    const spray = new THREE.Points(wg, new THREE.PointsMaterial({ color: 0xd8f0ff, size: 1.5, transparent: true, opacity: 0.9, depthWrite: false })); spray.frustumCulled = false; spray.visible = false; world.add(spray);
    const steam = []; for (let i = 0; i < 26; i++) { const d = glowSprite("rgba(255,255,255,0.9)", 24); d.visible = false; world.add(d); steam.push({ d, a: Math.random() * 6.28, k: Math.random() }); }
    // background layers: stars + the real-size Earth (km), drawn behind the rocket
    const stars = new THREE.Scene(); starfield(stars, 3000); const starCam = new THREE.PerspectiveCamera(45, 1, 1, 5000);
    const bg = new THREE.Scene(); const E = K.earth(R_E, V3(0, 0, 0), bg); E.children[2].visible = false; E.userData.c.material.opacity = 0.55;
    const atm = new THREE.Mesh(new THREE.SphereGeometry(R_E + 90, 96, 64), new THREE.MeshBasicMaterial({ color: 0x5aa6ff, transparent: true, opacity: 0.35, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })); bg.add(atm);
    bg.add(new THREE.AmbientLight(0x8899aa, 0.5)); const bs = new THREE.DirectionalLight(0xffffff, 1.3); bs.position.set(3000, 9000, 4000); bg.add(bs);
    const bgCam = new THREE.PerspectiveCamera(45, 1, 0.05, 60000);
    S.st = { world, sky, LC, R, P, fl, lm, smoke, water, stars, starCam, bg, bgCam, drops: [], E, spray, wp, wv, wl, steam };
    S.orbit = { target: V3(0, DECK + 55, 0), dist: 240, yaw: 0.95, pitch: 0.06, auto: 0 };
    S.update = (dt, t) => flLaunchTick(dt, t);
    S.render = (r, ox, oy) => { const c = S.camera, w = innerWidth, h = innerHeight, a = FL.dr / R_E;
      [starCam, bgCam].forEach((k) => { k.aspect = c.aspect; k.setViewOffset(w, h, ox, oy, w, h); k.updateProjectionMatrix(); });
      starCam.quaternion.copy(c.quaternion); const q = new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), -a); bgCam.quaternion.copy(q).multiply(c.quaternion);
      const hgt = R_E + Math.max(0.03, FL.alt + (c.position.y - DECK) / 1000); bgCam.position.set(Math.sin(a) * hgt, Math.cos(a) * hgt, 0);
      r.autoClear = false; r.setClearColor(0x000000, 1); r.clear(); r.render(stars, starCam); r.clearDepth(); r.render(bg, bgCam); r.clearDepth(); r.render(S.scene, c); r.autoClear = true; };
  });
}
// a stage drops away: it keeps its place in the world and falls behind the rocket, tumbling
function flDrop(k) { const S = MS.S, p = S.st.P[k]; if (!p) return; S.scene.attach(p); const dir = V3(0, -1, 0).applyQuaternion(S.st.R.quaternion);
  S.st.drops.push({ p, dir: dir.clone(), v: dir.multiplyScalar(6), spin: V3(Math.random() - 0.5, 0, Math.random() - 0.5), t: 0 }); delete S.st.P[k]; SND.tone(120, 0.4, "square", 0.08); }

// ===================================================================== 2) Go / No-Go poll
// same poll, same voices as the 2D game: "Booster?" … "Go!"
const POLL = [["Booster", "Booster"], ["RETRO", "Retro"], ["FIDO", "Fido"], ["GUIDO", "Guidance"], ["EECOM", "E com"], ["Surgeon", "Surgeon"], ["CAPCOM", "Cap com"]];
function flPoll() { flSteps(0); flHud(false); FL.ph = "poll"; apCam(V3(0, DECK + 55, 0), 240, 0.95, 0.06);
  apHint("Click 'Start the poll'. Every team must say GO before the countdown can start.");
  apPanel(`<h3>🎧 Flight Director: Go / No-Go poll</h3><p class="lead">You are the <b>Flight Director</b>. Before launch, every team in Mission Control checks its systems and must answer <b>GO</b>.</p>
    <div class="row"><button class="btn go pulse" id="flPollBtn" onclick="flPollRun()">📋 Start the poll</button></div>`);
  apSay("happy", "Launch day! You're the Flight Director. Ask every team: GO or NO-GO?"); }
function flPollBox() { let b = document.getElementById("flPollBox"); if (!b) { b = document.createElement("div"); b.id = "flPollBox"; b.className = "poll"; document.getElementById("msLabels").appendChild(b); } return b; }
function flPollCard(h) { if (!h) { const b = document.getElementById("flPollBox"); if (b) b.innerHTML = ""; } }
async function flPollRun() { SND.click(); const btn = document.getElementById("flPollBtn"); if (btn) { btn.disabled = true; btn.classList.remove("pulse"); }
  const box = flPollBox(); box.innerHTML = `<div class="poll-title">🎧 Flight Director: GO / NO-GO for launch?</div>`;
  await flSpeak("All controllers, go, no go for launch.", 0.8);
  for (const [who, spoken] of POLL) { if (FL.ph !== "poll") return;
    box.insertAdjacentHTML("beforeend", `<div class="poll-row"><span>${who}?</span><b class="go-tag">GO!</b></div>`);
    SND.tone(1200, 0.08, "sine", 0.12); await flSpeak(spoken + "?", 0.8, 1.2); if (FL.ph !== "poll") return; await flSpeak("Go!", 1.3, 1.2); }
  box.insertAdjacentHTML("beforeend", `<div class="poll-title" style="color:#3ecf8e">✅ We are GO for launch!</div>`);
  msPoints(100, "all teams GO"); await flSpeak("We are go for launch.", 0.8);
  apPanel(`<h3>✅ Everyone is GO!</h3><p class="lead">All ${POLL.length} teams said <b>GO</b>. Launch Control at Kennedy takes over the final countdown.</p><div class="row"><button class="btn go pulse" onclick="flCount()">⏱️ Start the countdown</button></div>`); }

// ===================================================================== 3) countdown + liftoff
function flCount() { SND.click(); flPollCard(""); flSteps(1); FL.ph = "count"; FL.cd = 10.5; FL.lastSaid = 11;
  apPanel(`<h3>⏱️ Final countdown</h3><p class="lead">At <b>T−8.9 s</b> the 5 F-1 engines start. Big hold-down arms keep the rocket on the pad until all engines reach full power.</p><div class="row"><b id="flCd" style="font-size:42px;color:var(--gold);margin:auto">T−10</b></div>`);
  apCam(V3(0, DECK + 30, 0), 170, 1.05, 0.03); }
function flLaunchTick(dt, t) {
  const S = MS.S, st = S.st, R = st.R;
  st.sky.position.copy(S.camera.position);
  // countdown
  if (FL.ph === "count") { FL.cd -= dt; const n = Math.ceil(FL.cd);
    if (n < FL.lastSaid && n >= 0) { FL.lastSaid = n; K.set("flCd", n > 0 ? "T−" + n : "LIFTOFF!"); SND.say(n > 0 ? String(n) : "Liftoff!"); SND.tone(n ? 520 : 880, 0.12, "sine", 0.08); }
    if (FL.cd < 8.9 && !st.ign) { st.ign = true; st.fl.sic.visible = true; flRumble(true, 0.25); flChat("capcom", "Ignition sequence start."); }
    if (st.ign) { st.fl.sic.scale.setScalar(Math.min(1, (8.9 - FL.cd) / 3) * (1 + Math.sin(t * 40) * 0.05)); flSmoke(st, dt, t, 1); }
    if (FL.cd < 9.5 && AP.extras.water !== false) { if (!st.wTold) { st.wTold = true; flBanner("💧 Water deluge ON: tonnes of water soak up the heat and the roar", 4500); } flWater(st, dt, true); }
    if (FL.cd <= 0) { FL.ph = "ascent"; FL.t = 0; flRumble(true, 0.6); flBoom(); FL.shake = 2.5; flAscentUI(); flChat(0, "Liftoff! We have liftoff!"); Object.values(st.LC.arms).forEach((a) => (a.userData.swing = 1)); } return; }
  if (FL.shake > 0) { FL.shake -= dt; const k = Math.min(1, FL.shake) * 1.6; S.camera.position.x += (Math.random() - 0.5) * k; S.camera.position.y += (Math.random() - 0.5) * k; }
  if (FL.ph === "poll") return;
  if (FL.ph === "orbit") { FL.dr += 7.8 * dt * 30; st.sky.visible = false; flHud(true, "7.79", "km/s", `28,000 km/h · 191 km up · falling around Earth`); }
  // ---------------- ascent ----------------
  if (FL.ph === "ascent") {
    const burning = !FL.cut && ((FL.t < 162) || (FL.ignII && FL.t < 549) || (FL.ignIVB));
    const holdIC = FL.t >= 162 && !FL.ignII, holdII = FL.t >= 549 && !FL.ignIVB;
    if (holdIC || holdII) { FL.coast += dt; Object.values(st.fl).forEach((f) => (f.visible = false)); if (FL.coast > 6 && !FL.abort) flAbort(holdIC ? "S-IC" : "S-II"); }
    else if (burning) { const rate = (FL.t < 12 ? 1 : !FL.turned ? 2 : FL.t < 162 ? 20 : FL.t < 549 ? 40 : FL.t < 680 ? 20 : 3) * (DEMO() && FL.t >= 12 ? 2.5 : 1); FL.t += dt * rate; if (FL.t >= 162 && !FL.ignII) FL.t = 162; if (FL.t >= 549 && !FL.ignIVB) FL.t = 549;
      st.fl.sic.visible = FL.t < 162 && !FL.sepIC; st.fl.sii.visible = FL.ignII && FL.t < 549; st.fl.sivb.visible = FL.ignIVB && !FL.cut; }
    FL.alt = lerpT([[0, 0], [12, 0.15], [66, 6.4], [83, 12], [135, 44], [150, 62.8], [162, 67.6], [197, 92], [300, 140], [549, 186], [699, 191], [760, 193]], FL.t) * (FL.turned || FL.t < 30 ? 1 : 1 + (FL.t - 30) / 120);
    FL.spd = lerpT([[0, 0.41], [12, 0.42], [66, 0.71], [83, 0.88], [135, 2.30], [162, 2.76], [197, 2.85], [300, 3.9], [549, 6.99], [699, 7.79], [760, 8.3]], FL.t) * (FL.turned || FL.t < 30 ? 1 : 0.85);
    FL.dr = FL.turned ? lerpT([[0, 0], [66, 6], [162, 90], [549, 1500], [699, 2150], [760, 2500]], FL.t) : 0;
    const pitch = FL.turned ? lerpT([[0, 0], [12, 0], [66, 30], [162, 62], [300, 75], [549, 85], [699, 90]], FL.t) : 0;
    R.rotation.z += (-pitch * DEG - R.rotation.z) * Math.min(1, dt * 2);
    // keep the rocket near the camera; move the world (pad, ground) away instead
    const am = FL.alt * 1000; R.position.y = DECK + Math.min(am, 140); st.world.position.y = -Math.max(0, am - 140); st.world.position.x = -FL.dr * 1000;
    st.sky.material.opacity = Math.max(0, 1 - Math.max(0, FL.alt - 15) / 65); st.sky.visible = st.sky.material.opacity > 0.01;
    if (am > 4000) { S.scene.fog.near = 1e7; S.scene.fog.far = 2e7; } else { S.scene.fog.near = 600 + am * 0.3; S.scene.fog.far = S.scene.fog.near + 4200; }
    Object.values(st.fl).forEach((f) => { const k = 1 + Math.min(4, FL.alt / 25); f.scale.set(k, 1 + Math.min(2, FL.alt / 50), k); });     // plumes spread in thin air
    Object.values(st.LC.arms).forEach((a) => { if (a.userData.swing && a.rotation.y < 1.2) a.rotation.y += dt * 0.8; });
    if (FL.t < 25) flSmoke(st, dt, t, 1); else st.smoke.forEach((s) => (s.d.visible = false));
    if (st.spray) flWater(st, dt, FL.t < 14);
    // the gravity turn: must start after the tower is cleared
    if (FL.t > 40 && !FL.turned && !FL.turnLost) { FL.turnLost = true; FL.turned = true; if (flLife("no gravity turn")) apSay("angry", "Going straight up never makes an orbit! To stay up you must go <b>sideways</b> at about <b>7.8 km/s</b>. I turned it for you, but we wasted fuel.", 9000); }
    if (FL.t >= 162 && !FL.sepIC && !st.icMsg) { st.icMsg = true; flChat("capcom", "S-IC engines cut off. Fuel empty!"); apSay("happy", "The 1st stage is <b>empty</b> after 2 min 42 s, at about <b>67 km</b> up. Drop it, then light the 2nd stage. Quick!"); }
    if (FL.t >= 549 && !FL.sepII && !st.iiMsg) { st.iiMsg = true; flChat("capcom", "S-II cutoff."); apSay("happy", "The 2nd stage is empty. <b>Separate</b> it and <b>ignite</b> the S-IVB!"); }
    if (FL.t >= 300 && !FL.lesOff) { FL.lesOff = true; flDrop("les"); msPoints(-300, "escape tower kept too long"); apSay("sad", "The escape tower is only needed low in the air. Its 4 tonnes were wasting fuel, and its cover blocked the windows. I dropped it.", 8000); }
    if (FL.ignIVB && !FL.cut && FL.spd >= 7.74 && !st.parkSaid) { st.parkSaid = true; SND.beep(); setTimeout(() => SND.beep(), 250);
      flBanner("🛰️ We reached parking-orbit speed: 7.8 km/s!<br><b>Now cut the engine!</b>", 6000); flSpeak("We have reached parking orbit. Now, let's cut the engine!", 1.05, 1.15); }
    if (FL.ignIVB && !FL.cut && FL.t >= 760) { FL.cut = true; flCutoff(true); }
    flAscentUI(true);
    const tgt = R.localToWorld(V3(0, FL.sepII ? SAT_Y.sivb + 16 : FL.sepIC ? SAT_Y.sii + 30 : 55, 0));
    S.orbit.goal = { target: tgt, dist: FL.sepII ? 75 : FL.sepIC ? 130 : FL.t < 12 ? 210 : 230 };
    flHud(true, FL.spd.toFixed(2), "km/s", `${K.fmt(Math.round(FL.spd * 3600 / 10) * 10)} km/h · ${FL.alt.toFixed(1)} km up · ${flClock(FL.t)}${FL.t < 30 ? "<br>(Earth's spin already gives 0.41 km/s)" : ""}`);
    if (FL.rum) FL.rum.g.gain.value = FL.rum.v * Math.max(0.05, 1 - FL.alt / 70);            // the roar fades: thin air carries less sound
  }
  st.drops = st.drops.filter((d) => { d.t += dt; if (d.dir) d.v.addScaledVector(d.dir, 9 * dt); d.v.y -= 4 * dt; d.p.position.addScaledVector(d.v, dt); d.p.rotation.x += d.spin.x * dt; d.p.rotation.z += d.spin.z * dt; if (d.t > 9) { S.scene.remove(d.p); return false; } return true; });
}
function flWater(st, dt, on) { const { spray, wp, wv, wl } = st; spray.visible = true; let alive = 0;
  for (let i = 0; i < wl.length; i++) { if (wl[i] <= 0) { if (!on || Math.random() > 0.35) continue; const a = Math.random() * 6.283, r = 4 + Math.random() * 9, sp = 10 + Math.random() * 26;
      wp[i * 3] = Math.cos(a) * r; wp[i * 3 + 1] = DECK + 0.3; wp[i * 3 + 2] = Math.sin(a) * r; wv[i * 3] = Math.cos(a) * sp; wv[i * 3 + 1] = 6 + Math.random() * 22; wv[i * 3 + 2] = Math.sin(a) * sp; wl[i] = 1.5 + Math.random() * 2; }
    wl[i] -= dt; wv[i * 3 + 1] -= 9.8 * dt; wp[i * 3] += wv[i * 3] * dt; wp[i * 3 + 1] += wv[i * 3 + 1] * dt; wp[i * 3 + 2] += wv[i * 3 + 2] * dt;
    const onDeck = Math.abs(wp[i * 3]) < 24.5 && Math.abs(wp[i * 3 + 2]) < 20.5; if (wp[i * 3 + 1] < (onDeck ? DECK : 0.1)) wl[i] = 0; if (wl[i] > 0) alive++; }
  spray.geometry.attributes.position.needsUpdate = true; spray.geometry.setDrawRange(0, wl.length); spray.visible = alive > 0 || on;
  st.steam.forEach((s, i) => { s.d.visible = on || s.k < 1; s.k += dt * 0.22; if (s.k > 1) { if (!on) { s.d.visible = false; return; } s.k = 0; } const r = 10 + s.k * 55;
    s.d.position.set(Math.cos(s.a) * r, DECK + 1 + s.k * 18, Math.sin(s.a) * r); s.d.scale.setScalar(18 + s.k * 46); s.d.material.opacity = (1 - s.k) * 0.85; }); }
function flSmoke(st, dt, t, k) { st.smoke.forEach((s, i) => { s.d.visible = true; s.k += dt * 0.25; if (s.k > 1) s.k = 0; const r = 8 + s.k * 70; s.d.position.set(Math.cos(s.a) * r, DECK + 2 + s.k * 14, Math.sin(s.a) * r); s.d.scale.setScalar(14 + s.k * 40); s.d.material.opacity = (1 - s.k) * 0.8; });
  st.water.forEach((w, i) => { w.d.visible = !!AP.extras.water; if (!w.d.visible) return; const p = (t * 0.8 + i / 30) % 1; w.d.position.set(Math.cos(w.a) * (10 + p * 10), DECK + 1 + Math.sin(p * Math.PI) * 6, Math.sin(w.a) * (10 + p * 10)); }); }

// the flight buttons — the right one blinks when it's time
const FL_BTNS = [["turn", "↪️ Gravity turn"], ["sepIC", "✂️ Drop S-IC"], ["ignII", "🔥 Light S-II"], ["les", "🗼 Drop escape tower"], ["sepII", "✂️ Drop S-II"], ["ignIVB", "🔥 Light S-IVB"], ["cut", "⛔ Engine cutoff"]];
function flNow(id) { const t = FL.t;
  return { turn: !FL.turned && t >= 12, sepIC: !FL.sepIC && t >= 162, ignII: FL.sepIC && !FL.ignII, les: !FL.lesOff && FL.ignII && t >= 175,
    sepII: !FL.sepII && t >= 549, ignIVB: FL.sepII && !FL.ignIVB, cut: FL.ignIVB && !FL.cut && FL.spd >= 7.6 }[id]; }
function flDone(id) { return { turn: FL.turned, sepIC: FL.sepIC, ignII: FL.ignII, les: FL.lesOff, sepII: FL.sepII, ignIVB: FL.ignIVB, cut: FL.cut }[id]; }
function flAscentUI(tick) { if (FL.ph !== "ascent") return; flSteps(2); const sig = FL_BTNS.map(([id]) => (flDone(id) ? "d" : flNow(id) ? "n" : "w")).join("");
  if (tick && sig === FL.sig) return; FL.sig = sig;
  const stage = FL.cut ? "Parking orbit" : FL.ignIVB ? "S-IVB burning" : FL.sepII ? "S-IVB: light it!" : FL.ignII ? "S-II burning" : FL.sepIC ? "S-II: light it!" : FL.t >= 162 ? "S-IC empty" : "S-IC burning";
  apPanel(`<h3>🚀 Ascent: ${stage}</h3><p class="lead">Press each button when it <b>blinks</b>. Too late and the rocket falls; wrong button and StarHunter gets cross.</p>
    <div class="lcRow cmp">${FL_BTNS.map(([id, n]) => (id === "les" && !AP.extras.les) ? "" : `<button class="pick ${flDone(id) ? "good" : flNow(id) ? "on pulseB" : ""}" ${flDone(id) ? "disabled" : ""} onclick="flBtn('${id}')"><b>${flDone(id) ? "✅ " : ""}${n}</b></button>`).join("")}</div>`); }
function flBtn(id) { SND.click(); const S = MS.S, st = S.st;
  if (!flNow(id)) { msPoints(-100, "wrong button");
    const why = { turn: "Wait until we clear the tower (about T+12 s). Turning early could hit it!", sepIC: "The S-IC still has fuel. Drop it only when it's empty!", ignII: "First drop the empty S-IC, then light the S-II.",
      les: FL.ignII ? "Wait until the S-II burns steadily, about 30 seconds after it lights." : "Keep the escape tower while you're low in the air!", sepII: "The S-II is still burning.", ignIVB: "First drop the S-II.", cut: "Not yet! Watch the speed: orbit needs about 7.8 km/s." }[id];
    return apSay("sad", why, 6000); }
  if (id === "turn") { FL.turned = true; msPoints(300, "gravity turn"); flChat(0, "Roll and pitch program. Heading sideways!"); apSay("happy", "Tilting over slowly lets gravity bend our path. We need speed <b>sideways</b> to orbit."); }
  if (id === "sepIC") { FL.sepIC = true; flDrop("sic"); FL.stagedAt = FL.coast; flBanner("✂️ S-IC separation: <b>67.6 km up</b>, 2 min 42 s after liftoff, 9,920 km/h<br><small>Already above 99.99% of the air. The S-IC falls into the Atlantic Ocean.</small>", 7000); }
  if (id === "ignII") { FL.ignII = true; FL.coast = 0; st.fl.sii.visible = true; if (!FL.tries.ic) msPoints(1000, "perfect staging: S-IC → S-II"); FL.tries.ic = 1; flChat(1, "S-II ignition. 5 J-2 engines burning hydrogen!"); }
  if (id === "les") { FL.lesOff = true; flDrop("les"); msPoints(200, "tower jettisoned"); flChat(2, "Tower jettison. We can see out the windows now!"); }
  if (id === "sepII") { FL.sepII = true; flDrop("sii"); if (!FL.lesOff) { FL.lesOff = true; flDrop("les"); } }
  if (id === "ignIVB") { FL.ignIVB = true; FL.coast = 0; st.fl.sivb.visible = true; if (!FL.tries.ii) msPoints(1000, "perfect staging: S-II → S-IVB"); FL.tries.ii = 1; flChat(0, "S-IVB ignition. Last push to orbit!"); }
  if (id === "cut") { FL.cut = true; flCutoff(false); }
  flAscentUI(); }
// missed staging: the rocket loses speed and falls → emergency eject
function flAbort(stage) { FL.abort = true; SND.tone(1000, 0.2, "square", 0.08); setTimeout(() => SND.tone(1000, 0.2, "square", 0.08), 300); flRumble(false);
  msModal(`<h2 style="color:#ff6b6b">🚨 ABORT! The rocket is falling!</h2><p>The ${stage} ran out of fuel and the next stage never lit. With no engine pushing, gravity pulls the rocket back down.</p>
    <div class="row"><button class="btn go pulse" onclick="flEject()">${FL.lesOff ? "🔥 Abort with the Service Module engine" : "🗼 EJECT: fire the escape tower"}</button></div>`); }
function flEject() { msModalClose(); SND.tone(80, 1.2, "sawtooth", 0.12); const ok = flLife("missed the staging");
  apSay("sad", "Saved! The crew splashed down safely. Staging must happen <b>within seconds</b>: drop the empty stage, then light the next one. Let's rewind and try again.", 9000);
  FL.retry = () => { FL.abort = false; FL.coast = 0; flRumble(true, 0.4); flAscentUI(); };
  if (ok) setTimeout(FL.retry, 1200); }
function flCutoff(auto) { flRumble(false); MS.S.st.fl.sivb.visible = false; const v = FL.spd, d = Math.abs(v - 7.8);
  if (auto) { if (flLife("engine never cut off")) apSay("angry", "You didn't stop the engine! We went too fast and burned fuel we need for the Moon. Cut off at about <b>7.8 km/s</b>.", 9000); }
  else if (d <= 0.06) msPoints(1000, "perfect orbit insertion: 7.8 km/s");
  else if (d <= 0.2) { msPoints(-300, v < 7.8 ? "a bit too slow" : "a bit too fast"); apSay("sad", v < 7.8 ? "A bit slow: our orbit dips low into the air. We fixed it with a little extra burn." : "A bit fast: the orbit is egg-shaped. We'll have to correct it.", 7000); }
  else { if (flLife(v < 7.8 ? "too slow for orbit" : "much too fast")) apSay("angry", v < 7.8 ? `Only ${v.toFixed(2)} km/s! Below about 7.8 km/s you fall back into the atmosphere.` : `${v.toFixed(2)} km/s is far too fast. You wasted fuel needed for the Moon.`, 9000); }
  FL.ph = "orbit"; flHud(true, "7.80", "km/s", `190 km up · ${flClock(699)}`); flSteps(3); flBanner(""); flSpeak("Engine cutoff. We are in orbit.");
  flChat("capcom", "Apollo, you are in orbit. Shutdown confirmed."); flChat(1, "Look at the Earth! It's beautiful.");
  apPanel(`<h3>🌍 In orbit: 190 km up, 7.8 km/s</h3><p class="lead">You're <b>falling around the Earth</b>: so fast that the ground curves away below you. One lap takes about <b>88 minutes</b>. The S-IVB still has fuel for the big push to the Moon.</p>
    <div class="row"><button class="btn go pulse" onclick="fl2DOpen()">🛰️ Watch our orbit from above (2D) ▶</button></div>`);
  apCam(MS.S.st.R.localToWorld(V3(0, SAT_Y.sivb + 16, 0)), 60, 1.6, 0.25); clearTimeout(FL.to2d); FL.to2d = setTimeout(() => { if (FL.ph === "orbit") fl2DOpen(); }, DEMO() ? 1000 : 2500); }

// ---- shared orbit numbers ----
const U = 1000, NOMV = 10.81, RB = R_E + 334;                         // TLI ends about 334 km up
function keplerE(M, e) { let E = M; for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }

// ===================================================================== 5) Transposition, docking & extraction (TD&E), then S-IVB eject + barbecue roll
function flTDE() { flSteps(5); if (MS.S) MS.S.key = "old"; FL.ph = "tde"; FL.td = 0; flHud(false);
  msScene("tde", (S) => { const s = S.scene; const sf = starfield(s, 3000); sf.scale.setScalar(5);
    s.add(new THREE.AmbientLight(0x8899bb, 0.35)); const sun = MQ.sun(s, V3(60, 40, 50), 30, 2048); sun.intensity = 1.5;
    K.earth(1600, V3(-400, -2100, -1400), s);
    const g = new THREE.Group(); s.add(g);
    const ivb = SAT.sivb(); g.add(ivb); const top = SAT_H.sivb;                                         // S-IVB with the Instrument Unit
    const lm = buildLM({ folded: true }); lm.g.position.y = top - 0.6; g.add(lm.g);
    const panels = [0, 1, 2, 3].map((k) => { const m = (k + 0.5) * Math.PI / 2, hy = new THREE.Group(); hy.position.set(Math.cos(m) * 3.3, top, Math.sin(m) * 3.3); hy.rotation.set(0, -m, 0); hy.updateMatrix();
      const geo = new THREE.CylinderGeometry(1.95, 3.3, 8.5, 24, 1, true, Math.PI / 2 - m - Math.PI / 4 + Math.PI, Math.PI / 2); geo.translate(0, top + 4.25, 0);
      const pm = new THREE.Mesh(geo, MQ.mat(0xd8dde2, { metalness: 0.45, roughness: 0.4, side: THREE.DoubleSide })); pm.castShadow = true; pm.applyMatrix4(hy.matrix.clone().invert()); hy.add(pm); g.add(hy); return hy; });
    const csm = new THREE.Group(); csm.position.y = top + 8.5; g.add(csm); const sm = SAT.sm(); csm.add(sm); const cm = SAT.cm(); cm.position.y = SAT_H.sm; csm.add(cm);
    // docking hardware: a probe on the CM's nose, a funnel (drogue) on top of the LM
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.8, 12), MQ.mat(0x8a8f96, { metalness: 0.7 })); probe.position.y = SAT_H.cm + 0.35; cm.add(probe);
    g.updateMatrixWorld(true); const lmBox = new THREE.Box3().setFromObject(lm.g), lmTop = lmBox.max.y;
    const drogue = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.45, 20, 1, true), MQ.mat(0xc9a64a, { metalness: 0.6, side: THREE.DoubleSide })); drogue.rotation.x = Math.PI; drogue.position.y = lmTop - lm.g.position.y + 0.2; lm.g.add(drogue);
    const csmBox = new THREE.Box3().setFromObject(csm), cmLen = csmBox.max.y - csm.position.y;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const vent = []; for (let i = 0; i < 20; i++) { const d = glowSprite("rgba(230,240,255,0.7)", 3); d.visible = false; s.add(d); vent.push(d); }
    S.st = { g, ivb, lm, panels, csm, sm, cm, vent, top, step: 0, lmTop: lmTop + 0.4, cmLen, sepY: top + 26.5 };
    S.st.dockY = S.st.lmTop + cmLen - 0.05;
    S.orbit = { target: V3(0, top + 6, 0), dist: 58, yaw: 1.0, pitch: 0.12, auto: 0 };
    S.update = (dt, t) => flTDETick(dt, t);
  });
  flChat("capcom", "Apollo, you're on your way. Time to get the lander out!");
  apHint("Separate the Command + Service Module, turn it around, dock slowly (0.1 m/s) with the Lunar Module, pull it out, then send the S-IVB away.");
  flTDEUI(); }
const TDE = [["sep", "✂️ Separate the CSM"], ["turn", "🔄 Turn around 180°"], ["dock", "🤝 Dock with the LM"], ["pull", "🧲 Pull the LM out"], ["eject", "👋 Send the S-IVB away"]];
function flTDEUI() { const s = MS.S.st.step;
  apPanel(`<h3>🤝 Transposition, docking and extraction</h3><p class="lead">${["The Lunar Module is folded inside the adapter. First, the Command + Service Module (CSM) must break free.", "Now turn the CSM around so its nose faces the LM.",
      "Fly in to dock. How fast?", "Docked! Now pull the LM out of the adapter.", "Send the empty S-IVB away so it can't hit you.", ""][s]}</p>
    ${s === 2 ? `<div class="lcRow"><button class="pick" onclick="flDock(3)"><b>🏎️ 3 m/s</b><small>Fast, saves time</small></button><button class="pick" onclick="flDock(0.5)"><b>🚲 0.5 m/s</b><small>Jogging speed</small></button><button class="pick" onclick="flDock(0.1)"><b>🐢 0.1 m/s</b><small>Slower than walking</small></button></div>`
      : `<div class="lcRow cmp">${TDE.map(([id, n], i) => `<button class="pick ${i < s ? "good" : i === s ? "on pulseB" : ""}" ${i !== s ? "disabled" : ""} onclick="flTDEGo('${id}')"><b>${i < s ? "✅ " : ""}${n}</b></button>`).join("")}</div>`}`); }
function flTDEGo(id) { SND.click(); const st = MS.S.st; st.anim = { id, t: 0 }; if (id === "sep") SND.tone(300, 0.3, "square", 0.06); }
function flDock(v) { SND.click(); FL.tries.dock = (FL.tries.dock || 0) + 1; MS.S.st.anim = { id: "dock", t: 0, v }; }
function flTDETick(dt, t) { const S = MS.S, st = S.st, A = st.anim;
  if (st.bbq) { st.g.rotation.y += dt * 0.6; }
  if (!A) return; A.t += dt; const k = Math.min(1, A.t / 3), e = K.ease ? K.ease(k) : k;
  if (A.id === "sep") { st.csm.position.y = st.top + 8.5 + e * 18; st.panels.forEach((p, i) => { const m = (i + 0.5) * Math.PI / 2; p.rotation.set(0, -m, -Math.min(0.8, A.t * 0.6)); if (A.t > 1.6) { const q = A.t - 1.6; p.position.set(Math.cos(m) * (3.3 + q * 6), st.top - q * 2, Math.sin(m) * (3.3 + q * 6)); } });
    S.orbit.goal = { target: V3(0, st.top + 14, 0), dist: 55 };
    if (A.t > 3.5) { st.panels.forEach((p) => (p.visible = false)); st.step = 1; st.anim = null; flChat(0, "CSM separation. The adapter panels are gone!"); flTDEUI(); } }
  if (A.id === "turn") { const c = st.cmLen / 2, th = e * Math.PI, Yc = st.sepY + c; st.csm.rotation.x = th; st.csm.position.set(0, Yc - c * Math.cos(th), -c * Math.sin(th));      // spins about its middle
    S.orbit.goal = { target: V3(0, Yc, 0), dist: 34, yaw: 1.35 };
    if (k >= 1) { st.step = 2; st.anim = null; flChat(1, "Turned around. I can see the LM!"); flTDEUI(); } }
  if (A.id === "dock") { const start = st.sepY + st.cmLen, gap = start - st.dockY, v = A.v, T = v > 1 ? 1.6 : v > 0.2 ? 3.2 : 5.5, kk = Math.min(1, A.t / T), sp = gap * (v > 0.2 ? kk : 1 - Math.pow(1 - kk, 2.2));
    if (!A.hit) st.csm.position.set(0, start - sp, 0); S.orbit.goal = { target: V3(0, st.lmTop + 1.5, 0), dist: 24, yaw: 1.25, pitch: 0.1 };
    if (!A.lbl) { A.lbl = msLabel("", V3(2.6, st.lmTop + 2.2, 0), "big"); }
    A.lbl.el.innerHTML = A.hit ? (v > 0.2 ? "💥 Too fast!" : "🔒 Capture!") : `↓ closing at ${v} m/s · gap ${Math.max(0, (gap - sp)).toFixed(1)} m`;
    if (sp >= gap && !A.hit) { A.hit = true; SND.tone(v > 1 ? 120 : 400, 0.3, "square", 0.08);
      if (v > 1) { A.bounce = 1; if (flLife("crashed while docking")) apSay("angry", "CRUNCH! 3 m/s is far too fast: you dented the docking hatch. Real Apollo crews docked at about <b>0.1 m/s</b>, slower than a slow walk.", 9000); }
      else if (v > 0.2) { A.bounce = 1; msPoints(-100, "bounced off"); apSay("sad", "Boing! Too fast: the latches couldn't grab and you bounced off. Go slower than about 0.3 m/s.", 7000); }
      else { if (FL.tries.dock === 1) msPoints(500, "soft docking"); flChat(2, "Capture! 12 latches locked. We're docked."); SND.beep(); st.step = 3; st.anim = null; flTDEUI(); } }
    if (A.bounce) { st.csm.position.y += dt * (v > 1 ? 5 : 2.5); if (A.t > T + 2.4) { st.csm.position.y = start; st.anim = null; msUnlabel(A.lbl); flTDEUI(); } }
    if (A.hit && !A.bounce && A.lbl && !A.gone) { A.gone = true; setTimeout(() => msUnlabel(A.lbl), 1800); } }
  if (A.id === "pull") { if (!A.att) { A.att = true; st.csm.attach(st.lm.g); } st.csm.position.y = st.dockY + e * 22; S.orbit.goal = { target: V3(0, st.top + 18, 0), dist: 60 };
    if (k >= 1) { st.step = 4; st.anim = null; flChat(0, "LM extracted. We have our lander!"); flTDEUI(); } }
  if (A.id === "eject") { st.ivb.position.y = -A.t * A.t * 3; st.vent.forEach((d, i) => { d.visible = A.t < 4; const p = (A.t * 0.8 + i / 20) % 1; d.position.set(Math.cos(i) * p * 10, st.ivb.position.y + 10 - p * 6, Math.sin(i) * p * 10); d.scale.setScalar(2 + p * 6); });
    if (A.t > 4.5 && !A.done) { A.done = true; st.ivb.visible = false; st.step = 5; msPoints(1000, "TD&E complete");
      flChat(1, "We did it! 🎉"); setTimeout(() => flChat(2, "High five, team!"), 1500); setTimeout(() => flChat("capcom", "Beautiful work, Apollo. Mission Control is cheering!"), 3000); SND.beep(); setTimeout(() => SND.beep(), 300);
      apSay("happy", "The S-IVB vented its leftover fuel and flew past the Moon into orbit around the Sun. On later Apollo missions it was crashed into the Moon on purpose, for science!", 9000);
      apPanel(`<h3>🎉 Docked and on the way!</h3><p class="lead">The Command Module, Service Module and Lunar Module now fly together to the Moon: a 3-day trip.</p><div class="row"><button class="btn go" onclick="flBBQ()">🍗 Next: the barbecue roll ▶</button></div>`); } }
}
function flBBQ() { SND.click(); const st = MS.S.st; st.bbq = true; st.g.rotation.order = "ZYX"; st.g.rotation.z = Math.PI / 2; MS.S.orbit.goal = { target: V3(0, 0, 0), dist: 55, pitch: 0.15 }; st.g.position.set(st.dockY + 6, 0, 0);
  st.hot = msLabel("☀️ Sun side: up to +120 °C", V3(14, 10, 0), "gold"); st.cold = msLabel("🌑 Shade side: down to −150 °C", V3(-14, -10, 0), "blue");
  msModal(`<h2>🍗 The "barbecue roll"</h2><p>In space, the side facing the Sun gets <b>very hot</b> and the shaded side gets <b>very cold</b>. So the spacecraft slowly <b>rotated</b>, about <b>3 turns every hour</b>, like a chicken on a barbecue spit. Then no side cooked or froze.</p><p>NASA called it <b>Passive Thermal Control (PTC)</b>.</p><div class="row"><button class="btn go" onclick="msModalClose();fl2DResume()">▶ Coast to the Moon</button></div>`); }

// ===================================================================== 6) Kepler's 2nd law pop-up (used while coasting and in Moon orbit)
function flKeplerPop() {
  msModal(`<h2>📐 Kepler's 2nd law</h2><p>An orbiting object sweeps out <b>equal areas in equal times</b>. Close in, it races; far out, it crawls. That's why you're slowing down now!</p>
    <canvas id="kepC" width="560" height="270" style="width:100%;background:#050914;border-radius:12px"></canvas>
    <div class="row" style="flex-wrap:wrap"><button class="btn ghost sm" onclick="kepSet(0)">☀️ Earth around the Sun</button><button class="btn ghost sm" onclick="kepSet(1)">🌍 Moon around Earth</button><button class="btn ghost sm" onclick="kepSet(2)">🌙 Spacecraft around the Moon</button></div>
    <p id="kepTxt" style="font-size:13px;color:#9fb0c8"></p><div class="row"><button class="btn go" onclick="kepStop();msModalClose()">▶ Keep coasting</button></div>`); kepSet(0); }
const KEP = [["☀️", "🌍", 0.55, "#ffd27a", "Real Earth orbit is almost a circle (e = 0.017). Here it is stretched so you can see the effect: Earth is fastest in early January."],
  ["🌍", "🌙", 0.5, "#7fd4ff", "The Moon's orbit is slightly oval (e = 0.055): from about 363,000 km to 405,000 km. Stretched here to show the idea."],
  ["🌙", "🚀", 0.6, "#7dffb5", "After LOI, Apollo 11 first flew an oval Moon orbit (about 114 × 313 km). It went fastest over the low point. Stretched here to show the idea."]];
function kepStop() { cancelAnimationFrame(FL.kepRaf); }
function kepSet(i) { kepStop(); const c = document.getElementById("kepC"); if (!c) return; const x = c.getContext("2d"), [F, B, e, col, txt] = KEP[i], a = 200, b = a * Math.sqrt(1 - e * e), cx = 280, cy = 135, fx = cx + a * e;   // the Sun sits at the focus next to the fast (closest) end
  K.set("kepTxt", txt); const sw = []; let tm = 0, last = performance.now(), lastMark = 0;
  const draw = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; tm += dt; const M = tm * 0.9, E = keplerE(M % (Math.PI * 2), e), px = cx + a * Math.cos(E), py = cy + b * Math.sin(E) * 0.95;
    if (tm - lastMark > 0.7) { lastMark = tm; sw.push([]); if (sw.length > 4) sw.shift(); } sw[sw.length - 1] && sw[sw.length - 1].push([px, py]);
    x.clearRect(0, 0, 560, 270); x.strokeStyle = "rgba(127,212,255,.35)"; x.beginPath(); x.ellipse(cx, cy, a, b * 0.95, 0, 0, Math.PI * 2); x.stroke();
    sw.forEach((s, k) => { if (s.length < 2) return; x.fillStyle = k % 2 ? "rgba(255,210,122,.35)" : "rgba(125,255,181,.35)"; x.beginPath(); x.moveTo(fx, cy); s.forEach(([u, v]) => x.lineTo(u, v)); x.closePath(); x.fill(); });
    x.font = "34px serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(F, fx, cy); x.font = "22px serif"; x.fillText(B, px, py);
    x.fillStyle = "#cfe0ff"; x.font = "13px sans-serif"; x.fillText("Each coloured slice = the same amount of time = the same area", 280, 258); FL.kepRaf = requestAnimationFrame(draw); };
  FL.kepRaf = requestAnimationFrame(draw); }


// ===================================================================== 7) the 2D orbit game (from the parking orbit on), in a frame
function flSpeak(text, pitch = 1, rate = 1.05) { return new Promise((res) => { let done = false; const fin = () => { if (!done) { done = true; res(); } };
  setTimeout(fin, 900 + text.length * 70);
  if (!GAME.soundOn || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
  try { const u = new SpeechSynthesisUtterance(text); u.pitch = pitch; u.rate = rate; u.lang = "en-US"; const v = flVoice(); if (v) u.voice = v; u.onend = fin; u.onerror = fin; speechSynthesis.speak(u); } catch (e) { fin(); } }); }
function flVoice() { if (FL.voice !== undefined && FL.voice) return FL.voice; try { const vs = speechSynthesis.getVoices();
  FL.voice = vs.find((v) => /en-US/i.test(v.lang) && /Samantha|Alex|Google US|Daniel|Karen/i.test(v.name)) || vs.find((v) => /^en/i.test(v.lang)) || null; } catch (e) { FL.voice = null; } return FL.voice; }
function flFadeTo(fn) { let f = document.getElementById("flFade"); if (!f) { f = document.createElement("div"); f.id = "flFade"; MS.wrap.appendChild(f); }
  f.classList.add("on"); setTimeout(() => { fn(); setTimeout(() => f.classList.remove("on"), 120); }, 480); }
function fl2DFrame() { let fr = document.getElementById("fl2dFrame"); if (!fr) { fr = document.createElement("iframe"); fr.id = "fl2dFrame"; fr.setAttribute("allow", "autoplay; fullscreen"); MS.wrap.insertBefore(fr, document.getElementById("msLabels")); } return fr; }
function fl2DShow(on) { const fr = fl2DFrame(); fr.style.display = on ? "block" : "none"; MS.wrap.classList.toggle("mode2d", on); if (on) { MS.ui.innerHTML = ""; flHud(false); if (MS.S) MS.S.key = "old"; msScene("blank2d", (S) => { S.orbit = { target: V3(), dist: 10, yaw: 0, pitch: 0, auto: 0 }; }); } }
function fl2DOpen() { SND.click(); flRumble(false); flPollCard(""); flFadeTo(() => { const fr = fl2DFrame(); fr.src = `2d/flight2d.html?path=${AP.path || "free"}&lives=${GAME.mis.lives}&t=${Date.now()}`; fl2DShow(true); flSteps(3); FL.ph = "2d"; }); }
function fl2DResume() { SND.click(); flFadeTo(() => { fl2DShow(true); flSteps(6); FL.ph = "2d"; const fr = fl2DFrame(); fr.contentWindow && fr.contentWindow.postMessage({ resume: true }, "*"); }); }
window.addEventListener("message", (e) => { const m = e.data; if (!m || !m.fl2d) return;
  if (m.points) msPoints(m.points, m.why || "");
  if (m.life) msLife(m.life);
  if (m.step) flSteps(m.step);
  if (m.landing) flPartC();
  if (m.moon3d) flFadeTo(() => { fl2DShow(false); MOON3D(); });
  if (m.moonorb) flFadeTo(() => { fl2DShow(false); MOONORB(); });
  if (m.cheer) flCheer(m.cheer);
  if (m.done !== undefined) setTimeout(() => flBanner(m.done ? `🏆 Mission complete! <b>${K.fmt(GAME.mis.points)} points</b>` : `📋 Mission over: <b>${K.fmt(GAME.mis.points)} points</b>`, 9000), 2500); });
// Mission Control erupts: crowd cheer + whistles + banner
function flCheer(name, msg) { flBanner(msg || `🎉 Mission Control is cheering!<br><b>${name}</b> just walked on the Moon! +100,000 points`, 6000);
  const c = SND.ctx; if (!c || !GAME.soundOn) return; const t0 = c.currentTime, buf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / c.sampleRate * 7 + Math.sin(i / 3000)));
  const n = c.createBufferSource(); n.buffer = buf; const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1100; bp.Q.value = 0.6; const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4); n.connect(bp).connect(g).connect(c.destination); n.start(t0);
  for (let k = 0; k < 4; k++) { const o = c.createOscillator(), og = c.createGain(), ts = t0 + 0.3 + k * 0.7; o.frequency.setValueAtTime(1800, ts); o.frequency.exponentialRampToValueAtTime(2900, ts + 0.35);
    og.gain.setValueAtTime(0.05, ts); og.gain.exponentialRampToValueAtTime(0.0001, ts + 0.4); o.connect(og).connect(c.destination); o.start(ts); o.stop(ts + 0.45); } }
function flPartC() { SND.click(); if (typeof AP_LANDING === "function") return AP_LANDING();
  msModal(`<h2>🦅 Part C: the landing</h2><p>Moving into the Lunar Module, undocking and landing on the Moon come next.</p><div class="row"><button class="btn go" onclick="msModalClose()">OK</button></div>`); }

// the liftoff "BOOM": a deep thump + a huge crackling blast of noise (5 F-1 engines at full power)
function flBoom() { SND.init && SND.init(); const c = SND.ctx; if (!c || !GAME.soundOn) return; if (c.state === "suspended") c.resume(); const t0 = c.currentTime;
  const buf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.05 ? 1 : 0.5);
  const n = c.createBufferSource(); n.buffer = buf; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(2500, t0); lp.frequency.exponentialRampToValueAtTime(140, t0 + 3.5);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(1.0, t0 + 0.06); g.gain.exponentialRampToValueAtTime(0.25, t0 + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4);
  const comp = c.createDynamicsCompressor(); n.connect(lp).connect(g).connect(comp).connect(c.destination); n.start(t0); n.stop(t0 + 4);
  [38, 55, 76].forEach((fq, i) => { const o = c.createOscillator(), og = c.createGain(); o.type = i ? "sawtooth" : "sine"; o.frequency.setValueAtTime(fq * 1.6, t0); o.frequency.exponentialRampToValueAtTime(fq, t0 + 0.8);
    og.gain.setValueAtTime(i ? 0.18 : 0.7, t0); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 3); o.connect(og).connect(comp); o.start(t0); o.stop(t0 + 3.1); }); }

// ---------- 🧪 test shortcuts (front page): skip the design phase ----------
function flTest(where) { SND.init && SND.init(); showScreen("apollo");
  Object.assign(AP, { path: "free", site: "a11", rocket: "sv", stack: ["sic", "sii", "sivb", "lmd", "lma", "sm", "cm"], crew: [0, 1, 2], extras: { les: true, water: true },
    fuel: { sic_rp1: 1, sic_lox: 1, sii_lh2: 1, sii_lox: 1, sivb_lh2: 1, sivb_lox: 1 } }); GAME.mis.suit = "artemis";
  AP_FLIGHT(); if (where === "tli") { FL.ph = "orbit"; fl2DOpen(); } if (where === "moon") { FL.ph = "x"; MOONORB(); } if (where === "surface") { FL.ph = "x"; mcTestSurface(); } if (where === "home") { FL.ph = "x"; REENTRY3D(); } }
// (the front-page test shortcuts were removed: use the 🎬 Demo button)
