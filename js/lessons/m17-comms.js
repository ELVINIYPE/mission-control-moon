// Lesson 17 — Talking to Earth. Radio travels at the speed of light; the Moon blocks it.
// Facts: light speed 299,792 km/s; Earth–Moon 384,400 km → about 1.28 s one way (NASA).
// Earth is about 3.7 times wider than the Moon (12,742 km vs 3,474 km, NASA).
// The Moon always shows the same face to Earth (tidal locking, NASA).
// Apollo crews lost radio contact behind the Moon on every orbit (about 45 minutes of each 2-hour orbit; NASA).
// China's Chang'e 4 (2019) landed on the far side and talked to Earth through the Queqiao relay satellite (CNSA).
// Mars is 3 to 22 light-minutes away (NASA/ESA).

(() => {
  const R = 1.6, ER = R * 3.67, ORBIT = 1.95, PERIOD = 12, DELAY = 1.28;
  const EARTH = V3(-17, -3, 3.5);
  const E = EARTH.clone().normalize(), UP = V3(0, 1, 0);
  const EARTH_FACE = EARTH.clone().add(E.clone().negate().multiplyScalar(ER));          // the point on Earth facing the Moon
  const SPEED = (EARTH.length() - ER - R) / DELAY;                                         // Moon → Earth trip takes the real 1.28 s
  const nNear = E.clone().multiplyScalar(0.8).add(V3(0, 0.6, 0)).normalize();
  const nFar = E.clone().multiplyScalar(-0.8).add(V3(0, 0.6, 0)).normalize();
  const RELAY0 = E.clone().multiplyScalar(-5.2).add(V3(0, 2.7, 0));

  function lander(gold) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), new THREE.MeshStandardMaterial({ color: gold ? 0xd9a520 : 0xcfd3da, metalness: 0.7, roughness: 0.3 })); body.position.y = 0.1; g.add(body);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 5), new THREE.MeshStandardMaterial({ color: 0x999999 }));
      leg.position.set(Math.cos(a) * 0.1, 0.05, Math.sin(a) * 0.1); leg.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(leg); }
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 5), new THREE.MeshStandardMaterial({ color: 0xffffff })); ant.position.y = 0.23; g.add(ant);
    const gl = glowSprite("rgba(255,210,122,0.8)", 0.35); gl.position.y = 0.3; g.add(gl);
    return g;
  }
  const antennaOf = (n) => n.clone().multiplyScalar(R + 0.3);

  function build(L) {
    const s = L.scene; starfield(s, 4000); s.add(new THREE.AmbientLight(0x8899bb, 0.3));
    const sunL = new THREE.DirectionalLight(0xffffff, 1.3); sunL.position.set(4, 5, 10); s.add(sunL);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), new THREE.MeshStandardMaterial({ map: moonTexture(), roughness: 1 })); s.add(moon);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(ER, 64, 48), new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.7 })); earth.position.copy(EARTH); s.add(earth);
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.015, 64, 48), new THREE.MeshStandardMaterial({ map: cloudTexture(), transparent: true, depthWrite: false })); clouds.position.copy(EARTH); s.add(clouds);
    const eg = glowSprite("rgba(90,170,255,0.45)", ER * 2.9); eg.position.copy(EARTH); s.add(eg);
    // Mission Control's big dish on Earth (like NASA's Deep Space Network)
    const dsn = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 8, 0, Math.PI * 2, 0, 1.2), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    dsn.position.copy(EARTH_FACE); dsn.quaternion.setFromUnitVectors(V3(0, 1, 0), E.clone().negate()); s.add(dsn);
    // the "radio shadow" behind the Moon
    const shadow = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 5, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false }));
    shadow.position.copy(E.clone().multiplyScalar(-2.5)); shadow.quaternion.setFromUnitVectors(UP, E.clone().negate()); s.add(shadow);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ORBIT, 0.008, 6, 160), new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.4 })); ring.rotation.x = Math.PI / 2; s.add(ring);
    // the orbiter
    const ship = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.4, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 16), white); body.rotation.z = Math.PI / 2; ship.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 16), white); nose.rotation.z = -Math.PI / 2; nose.position.x = 0.16; ship.add(nose);
    ship.add(glowSprite("rgba(255,210,122,0.8)", 0.5)); s.add(ship);
    // two landers: near side (faces Earth) and far side (never sees Earth)
    const ln = lander(true), lf = lander(false);
    [[ln, nNear], [lf, nFar]].forEach(([g, n]) => { g.position.copy(n.clone().multiplyScalar(R)); g.quaternion.setFromUnitVectors(UP, n); s.add(g); });
    // relay satellite (Queqiao-style) parked beyond the Moon
    const relay = new THREE.Group(); const rb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), new THREE.MeshStandardMaterial({ color: 0xd9a520, metalness: 0.6 })); relay.add(rb);
    const rd = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, 1.1), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })); rd.position.y = 0.15; relay.add(rd);
    [-1, 1].forEach((k) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.01, 0.16), new THREE.MeshStandardMaterial({ color: 0x1f3c88 })); p.position.x = k * 0.32; relay.add(p); });
    relay.add(glowSprite("rgba(127,212,255,0.7)", 0.6)); relay.visible = false; s.add(relay);
    const lg = new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), EARTH_FACE.clone()]);
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0x2fbf71, transparent: true, opacity: 0.7 })); s.add(line);
    L.st = { moon, earth, clouds, eg, ship, line, relay, ang: 0.3, packets: [] };
    L.label("🌍 Earth · Mission Control", () => EARTH.clone().add(V3(1.5, ER + 0.6, 0)), "blue");
    L.label("🌙 Moon", V3(0, R + 0.4, 0));
    L.label("🛰️ Orbiter", () => ship.position.clone().add(V3(0, 0.32, 0)), "gold");
    L.label("🟢 Near-side lander", () => antennaOf(nNear).add(V3(0, 0.25, 0)), "green");
    L.label("⚫ Far-side lander", () => antennaOf(nFar).add(V3(0, 0.25, 0)), "red");
    L.label("📡 Relay satellite", () => (relay.visible ? relay.position.clone().add(V3(0, 0.55, 0)) : null), "blue");
    L.label("🔴 Radio shadow", () => E.clone().multiplyScalar(-3.6).add(V3(0, -1.2, 0)), "red");
    L.st.timer = L.label("", () => (L.st.demo ? EARTH_FACE.clone().add(V3(2.5, -1.4, 0)) : null), "gold big");
    L.label("Earth is really 3.7× wider than the Moon (true here). Distance is not to scale: really about 110 Moon-widths.", V3(-5, -3.6, 2.5));
    L.orbit = { target: V3(-4.6, -0.4, 1.2), dist: 19.5, yaw: 0.3, pitch: 0.42, auto: 0 };
  }
  const shipPos = (a) => V3(Math.cos(a) * ORBIT, 0, -Math.sin(a) * ORBIT);
  const relayPos = (t) => RELAY0.clone().add(V3(Math.cos(t * 0.8) * 0.35, Math.sin(t * 0.8) * 0.25, Math.sin(t * 0.8) * 0.2));
  const _d = new THREE.Vector3(), _c = new THREE.Vector3();
  function segBlocked(a, b) {                 // does the straight line a→b pass through the Moon?
    _d.copy(b).sub(a); const len = _d.length(); _d.normalize(); _c.copy(a).negate();
    const tc = _c.dot(_d); if (tc < 0 || tc > len) return false; return _c.lengthSq() - tc * tc < R * R * 0.97;
  }
  // a radio message that hops along a list of places; "to" can move (like the orbiter)
  function send(L, hops, o = {}) {
    const st = L.st, p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: o.up ? 0x7fd4ff : 0xffe28a }));
    p.add(glowSprite(o.up ? "rgba(127,212,255,0.9)" : "rgba(255,220,120,0.9)", 0.8)); L.scene.add(p);
    const k = Object.assign({ mesh: p, hops, i: 0, t: 0, dead: false }, o); startHop(k); p.position.copy(k.from);
    st.packets.push(k); SND.tone(o.up ? 900 : 1200, 0.08, "square", 0.05); return k;
  }
  function startHop(k) { k.from = k.hops[k.i]().clone(); k.t = 0; k.dur = Math.max(0.25, k.from.distanceTo(k.hops[k.i + 1]()) / SPEED); }
  function update(L, dt, t) {
    const st = L.st;
    if (L.step !== "why") st.ang += (Math.PI * 2 / PERIOD) * dt * (st.slow ? 0.25 : 1);
    const p = shipPos(st.ang); st.ship.position.copy(p); st.ship.rotation.y = st.ang;
    st.relay.position.copy(relayPos(t)); st.relay.lookAt(EARTH);
    st.earth.rotation.y += dt * 0.15; st.clouds.rotation.y += dt * 0.18;           // the Moon does NOT spin here: it always shows Earth the same face
    const blk = segBlocked(p, EARTH_FACE);
    const pos = st.line.geometry.attributes.position; pos.setXYZ(0, p.x, p.y, p.z); pos.needsUpdate = true;
    st.line.material.color.set(blk ? 0xe05050 : 0x2fbf71); st.line.material.opacity = blk ? 0.35 : 0.75;
    if (st.blk !== blk) { st.blk = blk; const chip = document.getElementById("cmSig"); if (chip) { chip.className = "chipS " + (blk ? "bad" : "ok"); chip.textContent = blk ? "🔴 Orbiter behind the Moon: NO signal" : "🟢 Orbiter sees Earth"; } }
    st.packets.forEach((k) => {
      if (k.dead) return; k.t += dt; const to = k.hops[k.i + 1](), f = Math.min(1, k.t / k.dur);
      k.mesh.position.lerpVectors(k.from, to, f);
      if (k.demo) st.demo = k;
      if (k.mesh.position.length() < R * 0.98) { k.dead = true; return pop(L, k, false); }
      if (f >= 1) { if (k.i + 2 < k.hops.length) { k.i++; startHop(k); SND.tone(1400, 0.05); } else { k.dead = true; pop(L, k, true); } }
    });
    if (st.demo && !st.demo.dead) st.timer.el.innerHTML = `⏱️ ${Math.min(DELAY, st.demo.t).toFixed(2)} s`;
    st.eg.material.opacity = st.flash > 0 ? 0.9 : 0.45; st.flash = (st.flash || 0) - dt;
    // lesson demos
    if (L.step === "see") { st.demoT = (st.demoT || 0) + dt; const i = L.seeI;
      if (i === 0 && st.demoT > 3.2 && !blk) { st.demoT = 0; send(L, [() => st.ship.position, () => EARTH_FACE], { demo: true }); }
      if (i === 1 && st.demoT > 1.6) { st.demoT = 0; send(L, [() => st.ship.position, () => EARTH_FACE]); }
      if (i === 2 && st.demoT > 1.8) { st.demoT = 0; send(L, [() => EARTH_FACE, () => st.ship.position], { up: true }); }
      if (i === 3 && st.demoT > 1.5) { st.demoT = 0; send(L, [() => antennaOf(nNear), () => EARTH_FACE]); }
      if (i === 4 && st.demoT > 2.0) { st.demoT = 0; st.flip = !st.flip;
        st.flip ? send(L, [() => antennaOf(nFar), () => EARTH_FACE]) : send(L, [() => antennaOf(nFar), () => st.relay.position, () => EARTH_FACE]); } }
  }
  function pop(L, k, arrived) {
    const st = L.st; L.scene.remove(k.mesh);
    if (k.demo) { st.timer.el.innerHTML = `⏱️ ${DELAY.toFixed(2)} s: message received!`; setTimeout(() => { if (st.demo === k) st.demo = null; }, 1800); }
    if (arrived) { if (!k.up) st.flash = 0.25; SND.tone(1568, 0.12, "sine", 0.07); }
    else { const b = glowSprite("rgba(255,90,60,0.9)", 0.7); b.position.copy(k.mesh.position); L.scene.add(b); setTimeout(() => L.scene.remove(b), 500); SND.tone(160, 0.2, "sawtooth", 0.04); }
    if (L.step !== "try" || !k.task) return;
    const T = st.tasks;
    if (arrived) {
      if (k.task === "photo") { T.photo++; L.toast(`📷 Photo ${T.photo} received on Earth!`); }
      if (k.task === "map") { T.map = 1; L.toast("🗺️ The orbiter got the landing map from Earth!"); }
      if (k.task === "near") { T.near = 1; L.toast("🟢 Near-side lander data reached Earth!"); }
      if (k.task === "far") { T.far = 1; L.toast("⚫ Far-side data reached Earth through the relay!"); }
    } else {
      st.lost++;
      L.toast(k.task === "map" ? "💥 Earth's message hit the Moon: the orbiter is behind it!" : k.task === "far" ? "💥 The far side never sees Earth. You need a relay!" : "💥 Lost! The Moon is in the way.", true);
      if (k.task === "far") st.farFail = true;
    }
    hud(L); check(L);
  }
  function hud(L) {
    const st = L.st, T = st.tasks, $ = (id) => document.getElementById(id); if (!$("cmPhoto")) return;
    const row = (id, done, txt) => { $(id).className = "chipS " + (done ? "ok" : ""); $(id).textContent = (done ? "✅ " : "⬜ ") + txt; };
    row("cmPhoto", T.photo >= 3, `Orbiter → Earth: photos ${T.photo}/3 (${st.left} sends left)`);
    row("cmMap", T.map, `Earth → orbiter: landing map (${st.upLeft} tries left)`);
    row("cmNear", T.near, "Near-side lander → Earth");
    row("cmFar", T.far, "Far-side lander → Earth");
    $("cmBtn").disabled = st.left <= 0 || st.busy || T.photo >= 3;
    $("cmUp").disabled = st.upLeft <= 0 || st.busy || T.map;
    $("cmRelay").hidden = st.relay.visible; $("cmRelay").classList.toggle("pulse", !!st.farFail);
  }
  function check(L) {
    const st = L.st, T = st.tasks, inFlight = st.packets.some((k) => !k.dead && k.task);
    if (st.done) return;
    if (T.photo >= 3 && T.map && T.near && T.far) { st.done = true; return setTimeout(() => L.finish(true, { title: "Every message got through!", why: [
      "Radio travels at the <b>speed of light</b>: 300,000 km every second, so the 384,400 km to Earth takes about <b>1.3 seconds</b>. It works both ways: down to Earth and up to you.",
      "Radio can't go through rock. When the Moon is between you and Earth, <b>no message gets through in either direction</b>. Apollo crews lost contact for about <b>45 minutes on every orbit</b>.",
      "The Moon always shows Earth the <b>same face</b>. A <b>near-side</b> lander can talk any time. A <b>far-side</b> lander never sees Earth.",
      "🛰️ So the far side needs a <b>relay satellite</b> beyond the Moon. China's <b>Queqiao</b> relayed for <b>Chang'e 4</b>, the first landing on the far side (2019).",
      st.lost ? `You lost <b>${st.lost}</b> message${st.lost > 1 ? "s" : ""} to the Moon. That's how real teams learned to plan every call!` : "You lost no messages. Flight controller level!",
      "🔴 Mars is <b>3 to 22 light-minutes</b> away, so Mars rovers must drive themselves."] }), 900); }
    if (!inFlight && ((st.left <= 0 && T.photo < 3) || (st.upLeft <= 0 && !T.map))) { st.done = true; return setTimeout(() => L.finish(false, { title: "Some messages never arrived", why: [
      `<b>${st.lost}</b> messages hit the Moon. Radio can't pass through rock, in <b>either</b> direction.`,
      "When the orbiter is in the <b>red radio shadow</b>, the line to Earth turns red: nothing can get through, up or down.",
      "💡 Send photos when the line is <b>green</b>. For Earth's message, remember it takes 1.3 s to arrive: the orbiter must still see Earth when it gets there."] }), 900); }
  }
  regModule({
    no: 17, track: "systems", ico: "📡", title: "Talking to Earth", badge: "Deep Space Comms", badgeIco: "📡",
    useIn: "Apollo 11 behind the Moon, Take Pictures, the Moon Colony and Mission XXX",
    goal: "Complete <b>4 radio jobs</b>: send 3 photos down, get the landing map up from Earth, and get data home from <b>both</b> landers.",
    sources: "NASA (speed of light, Earth–Moon distance, Earth and Moon sizes, tidal locking, Apollo loss of signal); CNSA (Chang'e 4 and Queqiao); NASA/ESA (Mars light-time).",
    fact: "Speed of light: <b>299,792 km/s</b> · Earth–Moon: <b>384,400 km → 1.28 s</b> · Earth is <b>3.7×</b> wider than the Moon · Apollo lost signal about <b>45 min of every 2-hour orbit</b> · Mars: <b>3–22 minutes</b>.",
    see: [
      { text: "Radio travels at the <b>speed of light</b>: 300,000 km every second! The Moon is 384,400 km away, so a message takes about <b>1.3 seconds</b>. Watch the timer!", go(L) { L.st.slow = true; L.st.demoT = 2.5; L.st.relay.visible = false; } },
      { text: "But radio can't go through rock. When you fly <b>behind the Moon</b>, the Moon blocks the signal. Watch the messages hit the Moon in the red <b>radio shadow</b>.", go(L) { L.st.slow = false; L.st.demoT = 0; } },
      { text: "It works the <b>same both ways</b>. Here Mission Control sends messages <b>up</b> (blue). When you're behind the Moon, Earth can't reach you either!", go(L) { L.st.slow = false; L.st.demoT = 0; } },
      { text: "The Moon always shows Earth the <b>same face</b>. So a lander on the <b>near side</b> can see Earth all the time and talk whenever it likes.", go(L) { L.st.demoT = 0; L.st.relay.visible = false; } },
      { text: "A lander on the <b>far side</b> never sees Earth! Its message hits the Moon. The fix: a <b>relay satellite</b> beyond the Moon passes it on, like China's <b>Queqiao</b> for Chang'e 4.", go(L) { L.st.demoT = 0; L.st.relay.visible = true; } },
    ],
    build,
    reset(L) { const st = L.st; st.packets.forEach((k) => L.scene.remove(k.mesh));
      Object.assign(st, { packets: [], tasks: { photo: 0, map: 0, near: 0, far: 0 }, lost: 0, left: 5, upLeft: 3, busy: false, slow: false, demo: null, blk: undefined, done: false, farFail: false }); st.relay.visible = false; },
    tryUI() { return `<div class="lcRow" style="align-items:center">
        <div class="chips" style="flex:2 1 420px"><span class="chipS" id="cmSig">…</span><span class="chipS" id="cmPhoto"></span><span class="chipS" id="cmMap"></span><span class="chipS" id="cmNear"></span><span class="chipS" id="cmFar"></span></div></div>
      <div class="lcRow" style="margin-top:8px">
        <button class="btn go sm" id="cmBtn" onclick="cmSend('photo')">📷 Orbiter: send photo</button>
        <button class="btn sm" style="background:#1f6fd6" id="cmUp" onclick="cmSend('map')">🌍 Earth: send landing map up</button>
        <button class="btn ghost sm" onclick="cmSend('near')">🟢 Near-side lander: send</button>
        <button class="btn ghost sm" onclick="cmSend('far')">⚫ Far-side lander: send</button>
        <button class="btn sm" style="background:#8a5cd6" id="cmRelay" onclick="cmRelay()">🛰️ Launch a relay satellite</button></div>`; },
    tryStart(L) { L.st.blk = undefined; hud(L); },
    update,
  });
  window.cmSend = (task) => {
    const L = ACAD.L, st = L.st; if (L.step !== "try" || st.busy || st.done) return;
    let hops;
    if (task === "photo") { if (st.left <= 0 || st.tasks.photo >= 3) return; st.left--; hops = [() => st.ship.position, () => EARTH_FACE]; }
    if (task === "map") { if (st.upLeft <= 0 || st.tasks.map) return; st.upLeft--; hops = [() => EARTH_FACE, () => st.ship.position]; }
    if (task === "near") hops = [() => antennaOf(nNear), () => EARTH_FACE];
    if (task === "far") hops = st.relay.visible ? [() => antennaOf(nFar), () => st.relay.position, () => EARTH_FACE] : [() => antennaOf(nFar), () => EARTH_FACE];
    st.busy = true; const k = send(L, hops, { task, up: task === "map" }); hud(L);
    setTimeout(() => { st.busy = false; hud(L); }, 700);
  };
  window.cmRelay = () => { const L = ACAD.L; SND.beep(); L.st.relay.visible = true; L.toast("🛰️ Relay satellite in place beyond the Moon. It can see the far side AND Earth!"); hud(L); };
})();
