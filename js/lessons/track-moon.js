// Track 3 — To the Moon: lessons 10–15.
// Facts: Apollo 11 TLI speed ≈ 10.8 km/s at ≈ 334 km; the trip took ≈ 3 days; the Moon moves ≈ 13° per day (NASA).
// Gravity "hill top" (Earth's and Moon's pull equal) ≈ 346,000 km from Earth (computed with μE = 398,600, μM = 4,903).
// Apollo low lunar orbit ≈ 110 km, ≈ 2 h; NRHO: very stretched, ≈ 6.5 days per lap, Earth always in view, little fuel to stay (NASA/ESA).
// Moon gravity 1.62 m/s²; Apollo LM touchdown limit ≈ 3 m/s (10 ft/s) (NASA).
// Jupiter orbits the Sun at ≈ 13.1 km/s; Voyager 2 and Europa Clipper used gravity assists (NASA).
// Mars Hohmann transfer ≈ 259 days; Mars must be ≈ 44° ahead; windows every ≈ 26 months (NASA/ESA, computed).

function kepler(M, e) { let E = M; for (let i = 0; i < 12; i++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }
// position on a half-ellipse transfer from r1 to r2 (τ: 0 → 1), starting at angle th0
function transferPos(r1, r2, th0, tau) { const a = (r1 + r2) / 2, e = (r2 - r1) / (r2 + r1), E = kepler(Math.PI * tau, e);
  const r = a * (1 - e * Math.cos(E)), nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)); return V3(Math.cos(th0 + nu) * r, 0, -Math.sin(th0 + nu) * r); }
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const DEG = Math.PI / 180;

// ===================== Lesson 10 — Aim for the Moon (TLI) =====================
(() => {
  const RL = 2.2, RM = 22, LEAD = 39.6;                         // parking orbit, Moon distance (drawn), degrees the Moon moves in 3 days
  function drawPlan(L) { const st = L.st, pts = []; for (let i = 0; i <= 60; i++) pts.push(transferPos(RL, RM, st.burn, i / 60));
    st.path.geometry.setFromPoints(pts); st.path.computeLineDistances(); st.ship.position.copy(transferPos(RL, RM, st.burn, 0)); }
  regModule({
    no: 10, track: "moon", ico: "🎯", title: "Aim for the Moon (TLI)", badge: "Lunar Navigator", badgeIco: "🎯",
    useIn: "the TLI burn in Apollo 11 and Artemis",
    goal: "Choose <b>where</b> to fire the engine on your parking orbit, so that after the 3-day trip you <b>meet the Moon</b>. Remember: the Moon keeps moving!",
    sources: "NASA (Apollo 11 TLI about 10.8 km/s, 3-day trip; the Moon moves about 13° per day). Orbit shape from Kepler's laws.",
    fact: "Apollo 11's TLI burn lasted about <b>6 minutes</b> and reached about <b>10.8 km/s</b> · the trip took about <b>3 days</b> · in that time the Moon moves about <b>40°</b> along its orbit.",
    see: [
      { text: "First you circle Earth in a <b>parking orbit</b>. Then one big engine burn, the <b>Trans-Lunar Injection (TLI)</b>, stretches your orbit all the way out to the Moon.", go(L) { L.st.demo = { t: 0, lead: true }; } },
      { text: "The trip takes about <b>3 days</b>. But the Moon doesn't wait! It moves about <b>13° every day</b>, so about <b>40°</b> during your trip.", go(L) { L.st.demo = { t: 0, lead: false }; } },
      { text: "So you must aim at where the Moon <b>WILL BE</b>, not where it is now. Like throwing a ball to a friend who is running!", go(L) { L.st.demo = { t: 0, lead: true }; } },
    ],
    build(L) {
      K.space(L, 3000, 1.2); K.earth(1.4, V3(0, 0, 0), L.scene); K.ring(RL, 0x7fd4ff, 0.6, L.scene); K.ring(RM, 0x888888, 0.35, L.scene);
      const moon = K.moon(0.9, null, L.scene), ghost = K.moon(0.9, null, L.scene); ghost.material = K.basic(0xffffff, { transparent: true, opacity: 0.18 });
      const path = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xffd27a, dashSize: 0.4, gapSize: 0.25 })); L.scene.add(path);
      const ship = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), K.basic(0xffd27a)); ship.add(glowSprite("rgba(255,210,122,0.9)", 0.9)); L.scene.add(ship);
      const tr = K.trail(L.scene, 0xffd27a, 800);
      L.st = { moon, ghost, path, ship, tr, m0: 60 * DEG, burn: 0 }; this.reset(L);
      L.label("🌙 Moon now", () => moon.position.clone().add(V3(0, 1.4, 0))); L.label("👻 where the Moon will be in 3 days", () => (L.st.showGhost ? ghost.position.clone().add(V3(0, 1.4, 0)) : null), "blue");
      L.label("🚀 TLI burn here", () => (L.st.fly ? null : ship.position.clone().add(V3(0, 0.9, 0))), "gold");
      L.orbit = { target: V3(0, 0, -2), dist: 44, yaw: 0, pitch: 1.35, auto: 0 };
    },
    reset(L) { const st = L.st; st.fly = null; st.demo = null; st.tr.clear(); st.burn = 200 * DEG; st.showGhost = false; st.moon.position.set(Math.cos(st.m0) * RM, 0, -Math.sin(st.m0) * RM); drawPlan(L); },
    tryUI() { return `<div class="lcRow" style="align-items:center">${K.slider("m10", "🎯 Burn point on the parking orbit", 0, 359, 1, 200, "m10Set")}
      <div class="chips" style="flex:1 1 220px"><span class="chipS" id="m10i"></span></div><button class="btn go" onclick="m10Go()">🔥 TLI BURN</button></div>`; },
    tryStart(L) { m10Set(200); },
    update(L, dt) {
      const st = L.st, ghostA = st.m0 + LEAD * DEG; st.ghost.position.set(Math.cos(ghostA) * RM, 0, -Math.sin(ghostA) * RM); st.ghost.visible = st.showGhost = !!(L.step === "see" && st.demo && st.demo.lead);
      if (L.step === "see" && st.demo) { st.demo.t += dt; if (st.demo.t > 7.5 || !st.fly) { st.demo.t = 0; st.burn = st.demo.lead ? ghostA - Math.PI : st.m0 - Math.PI; drawPlan(L); st.fly = { t: 0 }; st.tr.clear(); } }
      if (!st.fly) return; const F = st.fly; F.t += dt; const tau = Math.min(1, F.t / 6);
      st.ship.position.copy(transferPos(RL, RM, st.burn, tau)); st.tr.push(st.ship.position);
      const ma = st.m0 + LEAD * DEG * tau; st.moon.position.set(Math.cos(ma) * RM, 0, -Math.sin(ma) * RM);
      if (tau >= 1 && L.step === "try" && !F.done) { F.done = true; const miss = angDiff(st.burn + Math.PI, ma) / DEG;
        if (Math.abs(miss) < 6) L.finish(true, { title: "Bullseye! You reached the Moon", why: [
          "You fired the engine on the <b>opposite side</b> of Earth from where the Moon <b>would be</b> 3 days later.",
          "In those 3 days the Moon moved about <b>40°</b>. So you aimed <b>ahead</b> of it, like passing a ball to a running friend.",
          "Apollo 11 did this in July 1969: a <b>6-minute</b> burn to about <b>10.8 km/s</b>, then a 3-day coast."] });
        else L.finish(false, { title: `Missed by ${Math.abs(miss).toFixed(0)}°`, why: [
          Math.abs(Math.abs(miss) - LEAD) < 8 ? "You aimed at where the Moon <b>is now</b>. But it moved about <b>40°</b> during your 3-day trip!" : "Your path ended far from the Moon.",
          "Your path always ends on the <b>opposite side</b> of Earth from your burn point.", "💡 Aim for where the Moon <b>will be</b> after 3 days: about 40° further along its orbit."] }); }
    },
  });
  window.m10Set = (v) => { const L = ACAD.L; if (L.st.fly) return; L.st.burn = v * DEG; drawPlan(L); K.set("m10V", `${v}°`); K.set("m10i", "The dashed line shows your 3-day path"); };
  window.m10Go = () => { const L = ACAD.L; if (L.st.fly) return; SND.tone(90, 1, "sawtooth", 0.06); L.st.fly = { t: 0 }; L.st.tr.clear(); };
})();

// ===================== Lesson 11 — The gravity hill =====================
(() => {
  const ME = 398600, MM = 4903, D = 384400, R0 = 6705, RMOON = 1737;
  const phi = (x) => -ME / x - MM / (D - x), XN = D / (1 + Math.sqrt(MM / ME));
  const vmin = Math.sqrt(2 * (phi(XN) - phi(R0)));
  const X = (x) => (x / D) * 30 - 15, Y = (x) => -Math.log(-phi(x) / -phi(XN)) * 3.2;     // drawing scale
  regModule({
    no: 11, track: "moon", ico: "⛰️", title: "The gravity hill", badge: "Gravity Climber", badgeIco: "⛰️",
    useIn: "the coast to the Moon in Apollo 11 and Artemis",
    goal: `Pick your TLI speed. Too slow and you roll back to Earth. Too fast wastes fuel. Get over the hill with <b>less than 1.5 km/s</b> to spare at the top.`,
    sources: "NASA (Apollo 11 TLI about 10.8 km/s; Earth and Moon gravity). Hill height computed from Earth's and Moon's gravity (the Moon is held still here).",
    fact: `Earth's and Moon's pull are equal about <b>346,000 km</b> from Earth (90% of the way) · you need at least about <b>${vmin.toFixed(2)} km/s</b> to get there · Apollo 11 slowed to about <b>1 km/s</b> at the top.`,
    see: [
      { text: "Leaving Earth is like rolling a ball <b>up a giant hill</b>. Earth's gravity pulls you back, so you slow down the whole way up.", go(L) { L.st.demo = 10.84; } },
      { text: "Near the Moon, the hill tips over: the <b>Moon's</b> gravity is now stronger, and you speed up again. The top is about <b>90%</b> of the way there.", go(L) { L.st.demo = 10.84; } },
      { text: "Not fast enough at the start? You roll back to Earth! Apollo 11 started at about <b>10.8 km/s</b> and slowed to about <b>1 km/s</b> at the top.", go(L) { L.st.demo = 10.72; } },
    ],
    build(L) {
      K.space(L, 2500, 1.1); const pts = []; for (let i = 0; i <= 400; i++) { const x = R0 + (D - RMOON - 200 - R0) * (i / 400) ** 1.6; pts.push(V3(X(x), Y(x), 0)); }
      const curve = new THREE.CatmullRomCurve3(pts); L.scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.12, 8), K.mat(0x7fd4ff, { emissive: 0x0a3050 })));
      const e = K.earth(1.6, V3(X(R0) - 1.4, Y(R0) - 0.5, 0), L.scene), m = K.moon(0.6, V3(X(D) + 0.4, Y(D - RMOON - 200) - 0.3, 0), L.scene);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), K.basic(0xffd27a)); ball.add(glowSprite("rgba(255,210,122,0.9)", 1.6)); L.scene.add(ball);
      L.st = { ball, e }; this.reset(L);
      L.label("⛰️ Top of the hill (Earth's and Moon's pull are equal)", V3(X(XN), Y(XN) + 1.2, 0), "gold"); L.label("🌍 Earth", e.position.clone().add(V3(0, 2.3, 0)), "blue"); L.label("🌙 Moon", m.position.clone().add(V3(0, 1.1, 0)));
      L.st.spd = L.label("", () => ball.position.clone().add(V3(0, 1.1, 0)), "gold big");
      L.orbit = { target: V3(0, -6, 0), dist: 30, yaw: 0, pitch: 0.05, auto: 0 };
    },
    reset(L) { Object.assign(L.st, { x: R0, v: 0, dir: 1, run: false, done: false, maxX: R0, demo: null, v0: 10.84 }); L.st.ball.position.set(X(R0), Y(R0), 0); if (L.st.spd) L.st.spd.el.innerHTML = ""; },
    tryUI() { return `<div class="lcRow" style="align-items:center">${K.slider("m11", "🔥 Speed after TLI", 10.6, 11.2, 0.01, 10.84, "m11Set")}<button class="btn go" onclick="m11Go()">🚀 GO</button></div>`; },
    tryStart(L) { m11Set(10.84); },
    update(L, dt) {
      const st = L.st;
      if (L.step === "see" && st.demo) { st.dT = (st.dT || 99) + dt; if (st.dT > 11) { st.dT = 0; const d = st.demo; this.reset(L); st.demo = d; st.v = d; st.v0 = d; st.run = true; } }
      if (!st.run) return;
      const n = Math.ceil(dt * 30000 / 20); for (let i = 0; i < n; i++) {                       // energy is conserved: speed comes straight from the height on the hill
        const e = st.v0 ** 2 + 2 * (phi(R0) - phi(st.x)); if (e <= 0.0004) st.dir = -1;
        st.v = (st.dir || 1) * Math.sqrt(Math.max(e, 0.0004)); st.x += st.v * 20; if (st.x >= D - RMOON - 200 || st.x <= R0) break; }   // 1 s ≈ 8 hours
      st.maxX = Math.max(st.maxX, st.x); const x = Math.max(R0, Math.min(D - RMOON - 200, st.x)); st.ball.position.set(X(x), Y(x), 0);
      st.spd.el.innerHTML = `${Math.abs(st.v).toFixed(2)} km/s`;
      if (L.step !== "try" || st.done) { if (st.x >= D - RMOON - 200 || st.x <= R0) st.run = false; return; }
      if (st.x <= R0 && st.v < 0) { st.done = true; st.run = false; L.finish(false, { title: "Rolled back to Earth!", why: [`At ${st.v0.toFixed(2)} km/s, Earth's gravity stopped you before the top of the hill.`, `You need at least about <b>${vmin.toFixed(2)} km/s</b> to reach the top, about 346,000 km from Earth.`, "💡 A little more speed!"] }); }
      if (st.x >= D - RMOON - 200) { st.done = true; st.run = false; const top = Math.sqrt(st.v0 ** 2 - vmin ** 2);
        if (top <= 1.5) L.finish(true, { title: `Over the hill at ${top.toFixed(2)} km/s!`, why: [
          "On the way out, Earth's gravity <b>slowed you down</b> the whole time, from over 10 km/s to almost nothing at the top.",
          "After the top, the <b>Moon's gravity</b> pulled you in and you sped up again.",
          `You used just enough speed. Apollo 11 left at about <b>10.8 km/s</b> and was down to about <b>1 km/s</b> at the top.`] });
        else L.finish(false, { title: "You made it… but wasted fuel", why: [`You crossed the top at <b>${top.toFixed(2)} km/s</b>. All that extra speed cost fuel to get, and you'll need even more fuel to <b>brake</b> at the Moon.`, "💡 Engineers use <b>just enough</b> speed. Try a bit slower."] }); }
    },
  });
  window.m11Set = (v) => { ACAD.L.st.v0 = +v; K.set("m11V", `${(+v).toFixed(2)} km/s`); };
  window.m11Go = () => { const L = ACAD.L, st = L.st; if (st.run) return; const v0 = st.v0; L.m.reset(L); st.v0 = v0; st.v = v0; st.run = true; SND.tone(90, 0.8, "sawtooth", 0.06); };
})();

// ===================== Lesson 12 — Moon orbits =====================
(() => {
  const R = 2, E = V3(-30, 0, 0);
  const TASKS = [{ id: "base", ico: "🏗️", name: "A station where crews stay for years", sub: "Must talk to Earth all the time and use little fuel" },
                 { id: "quick", ico: "⏱️", name: "A quick Apollo-style landing", sub: "Get down to the surface and back fast" }];
  const ORBS = { llo: "🔵 Low orbit (110 km)", nrho: "🟣 NRHO (stretched halo)" };
  function nrhoPos(t) { const e = 0.7, a = 9, Ea = kepler((t % 1) * Math.PI * 2, e), b = a * Math.sqrt(1 - e * e) * Math.sin(Ea); return V3(0.3 * b, a * (Math.cos(Ea) - e), b); }   // close over the north pole, far over the south
  function segBlocked(a, b) { const d = b.clone().sub(a), len = d.length(); d.normalize(); const c = a.clone().negate(), tc = c.dot(d); if (tc < 0 || tc > len) return false; return c.lengthSq() - tc * tc < R * R; }
  regModule({
    no: 12, track: "moon", ico: "🌀", title: "Moon orbits", badge: "Lunar Orbit Planner", badgeIco: "🌀",
    useIn: "Apollo 11 (low orbit), Artemis (NRHO) and the Moon Colony",
    goal: "Two missions, two orbits. Give each mission the <b>best orbit</b>, then press <b>Check</b>.",
    sources: "NASA (Apollo low lunar orbit about 110 km, about 2 h; NRHO: about 6.5 days per lap, continuous view of Earth, less fuel to maintain, access to the South Pole); ESA (Gateway orbit).",
    fact: "Low orbit: about <b>110 km</b> up, <b>2 hours</b> per lap, loses Earth behind the Moon · NRHO: swings from a few thousand km to about <b>70,000 km</b>, <b>6.5 days</b> per lap, <b>always sees Earth</b>.",
    see: [
      { text: "<b>Low lunar orbit</b> (blue): just 110 km up, like Apollo. Quick to land from, but you lose Earth behind the Moon every lap, and the Moon's lumpy gravity makes you use fuel to stay up.", go(L) { L.st.show = "llo"; } },
      { text: "<b>NRHO</b> (purple): a long, stretched loop over the Moon's poles. It takes <b>6.5 days</b> per lap, <b>always sees Earth</b>, and needs very little fuel to keep.", go(L) { L.st.show = "nrho"; } },
      { text: "The catch: from NRHO the trip down to the surface is <b>much longer</b>. Every orbit is a trade-off!", go(L) { L.st.show = "both"; } },
    ],
    build(L) {
      K.space(L, 3000, 1.2); K.moon(R, V3(0, 0, 0), L.scene); K.earth(4, E, L.scene);
      const llo = K.ring(R * 1.15, 0x4aa8ff, 0.8, L.scene);
      const pts = []; for (let i = 0; i <= 200; i++) pts.push(nrhoPos(i / 200)); const nr = K.line(L.scene, pts, 0xb18cff, 0.9);
      const mk = (c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), K.basic(c)); m.add(glowSprite("rgba(255,255,255,0.6)", 0.8)); L.scene.add(m); return m; };
      const s1 = mk(0x4aa8ff), s2 = mk(0xb18cff), l1 = K.line(L.scene, [V3(), E], 0x2fbf71), l2 = K.line(L.scene, [V3(), E], 0x2fbf71);
      L.st = { llo, nr, s1, s2, l1, l2, show: "both", pick: {} };
      L.label("🔵 Low orbit", () => (llo.visible ? V3(R * 1.15, 0.6, 0) : null), "blue"); L.label("🟣 NRHO", () => (nr.visible ? nrhoPos(0.5).add(V3(0, 0.8, 0)) : null), "gold");
      L.label("🌍 to Earth", E.clone().add(V3(0, 5, 0)), "blue");
      L.orbit = { target: V3(-6, -4, 0), dist: 40, yaw: 0.8, pitch: 0.25, auto: 0 };
    },
    reset(L) { L.st.pick = {}; L.st.show = "both"; },
    tryUI(L) { return `<div id="m12p">${m12UI(L)}</div>`; },
    tryStart() {},
    update(L, dt, t) {
      const st = L.st; st.llo.visible = st.s1.visible = st.l1.visible = st.show !== "nrho"; st.nr.visible = st.s2.visible = st.l2.visible = st.show !== "llo";
      const a = t * 1.2; st.s1.position.set(Math.cos(a) * R * 1.15, 0, -Math.sin(a) * R * 1.15); st.s2.position.copy(nrhoPos(t / 14));
      [[st.s1, st.l1], [st.s2, st.l2]].forEach(([s, l]) => { const p = l.geometry.attributes.position; p.setXYZ(0, s.position.x, s.position.y, s.position.z); p.needsUpdate = true; l.material.color.set(segBlocked(s.position, E) ? 0xe05050 : 0x2fbf71); });
    },
  });
  function m12UI(L) { return TASKS.map((t) => `<div class="lcRow" style="align-items:center;margin-bottom:6px"><div style="flex:1 1 260px"><b>${t.ico} ${t.name}</b><br><small style="color:var(--muted)">${t.sub}</small></div>
      ${Object.entries(ORBS).map(([k, n]) => `<button class="pick ${L.st.pick[t.id] === k ? "on" : ""}" style="flex:0 1 220px" onclick="m12Pick('${t.id}','${k}')"><b>${n}</b></button>`).join("")}</div>`).join("") +
      `<div class="lcRow" style="justify-content:flex-end"><button class="btn go" onclick="m12Check()">✅ Check</button></div>`; }
  window.m12Pick = (t, k) => { const L = ACAD.L; SND.click(); L.st.pick[t] = k; L.st.show = k; K.set("m12p", m12UI(L)); };
  window.m12Check = () => { const L = ACAD.L, p = L.st.pick;
    if (!p.base || !p.quick) return L.toast("Pick an orbit for both missions first", true);
    const ok = p.base === "nrho" && p.quick === "llo";
    if (ok) return L.finish(true, { title: "Perfect orbit planning!", why: [
      "🏗️ A long-term station wants <b>NRHO</b>: it always sees Earth (no radio blackouts) and needs very little fuel to stay in place. NASA chose it for the planned Gateway station.",
      "⏱️ A quick landing wants <b>low orbit</b>: you're only 110 km above the surface, so landing and returning is fast. Apollo used it.",
      "There's no \"best\" orbit, only the best orbit <b>for the job</b>."] });
    L.finish(false, { title: "Not the best match", why: [
      p.base !== "nrho" ? "🏗️ The long-term station loses Earth behind the Moon every 2 hours in low orbit, and the Moon's lumpy gravity costs fuel every month." : "🏗️ The station choice was right!",
      p.quick !== "llo" ? "⏱️ From NRHO the trip down to the surface is long. For a quick landing, start close: low orbit." : "⏱️ The quick landing choice was right!"] });
  };
})();

// ===================== Lesson 13 — Landing on the Moon =====================
(() => {
  const G = 1.62, A = 4.0, FUEL = 32, H0 = 320, V0 = -14;
  let held = false;
  addEventListener("keydown", (e) => { if (e.code === "Space" && ACAD.L && ACAD.L.m.no === 13) { held = true; e.preventDefault(); } });
  addEventListener("keyup", (e) => { if (e.code === "Space") held = false; });
  function hud(L) { const st = L.st; K.set("m13h", `${Math.max(0, st.h).toFixed(0)} m`); K.set("m13v", `${(-st.v).toFixed(1)} m/s`);
    document.getElementById("m13v") && (document.getElementById("m13v").style.color = -st.v <= 3 ? "#7dffb5" : "#ff8a8a");
    K.setMeter("m13f", st.fuel / FUEL, `${st.fuel.toFixed(1)} s`, st.fuel > 8 ? "#2fbf71" : "#e05050"); }
  regModule({
    no: 13, track: "moon", ico: "🦅", title: "Landing on the Moon", badge: "Eagle Pilot", badgeIco: "🦅",
    useIn: "the landing in Apollo 11, Artemis IV and the Moon Colony",
    goal: "Land softly: touch down at <b>3 m/s or slower</b>. Hold the <b>THRUST</b> button (or Space bar) to fire the engine. Watch your fuel!",
    sources: "NASA (Moon gravity 1.62 m/s²; Apollo LM touchdown limit about 3 m/s (10 ft/s); Apollo 11 landed with very little fuel left). Lander numbers simplified for the game.",
    fact: "Moon gravity: <b>1.62 m/s²</b> (1/6 of Earth's) · safe touchdown: <b>3 m/s or less</b> · Apollo 11's Eagle landed with <b>less than a minute</b> of fuel left.",
    see: [
      { text: "The Moon has <b>no air</b>, so parachutes and wings don't work. The only way to slow down is to fire your engine <b>downward</b>.", go(L) { L.st.demo = true; } },
      { text: "Gravity on the Moon is only <b>1/6</b> of Earth's, but you still fall faster and faster. Burn too little and you crash; burn too early and you run out of fuel.", go(L) { L.st.demo = true; } },
      { text: "In 1969, Neil Armstrong flew Eagle past a field of boulders by hand and landed with <b>less than a minute of fuel</b> left. Your turn!", go(L) { L.st.demo = true; } },
    ],
    build(L) {
      K.space(L, 2500, 1.3); K.ground(L, 200); const lm = K.lander(1); L.scene.add(lm);
      const dust = []; for (let i = 0; i < 40; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), K.basic(0xcccccc, { transparent: true, opacity: 0.6 })); d.visible = false; L.scene.add(d); dust.push(d); }
      const pad = new THREE.Mesh(new THREE.RingGeometry(2.6, 3, 48), K.basic(0x2fbf71, { side: THREE.DoubleSide })); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.05; L.scene.add(pad);
      K.earth(4, V3(-40, 30, -80), L.scene);
      L.st = { lm, dust }; this.reset(L);
      L.orbit = { target: V3(0, 8, 0), dist: 26, yaw: 0.5, pitch: 0.15, auto: 0 };
    },
    reset(L) { Object.assign(L.st, { h: H0, v: V0, fuel: FUEL, run: false, done: false, demo: false }); held = false; },
    tryUI() { return `<div class="lcRow" style="align-items:center"><div class="chips" style="flex:1 1 260px"><span class="chipS">⬇️ Height: <b id="m13h"></b></span><span class="chipS">💨 Falling: <b id="m13v"></b></span></div>${K.meter("m13f", "⛽ Fuel (seconds of burning)")}
      <button class="btn go" id="m13s" onclick="m13Start()">▶ START DESCENT</button>
      <button class="btn" id="m13t" style="background:#e8590c;font-size:20px;user-select:none" onpointerdown="m13Hold(true)" onpointerup="m13Hold(false)" onpointerleave="m13Hold(false)">🔥 THRUST (hold)</button></div>`; },
    tryStart(L) { hud(L); },
    update(L, dt, t) {
      const st = L.st;
      if (L.step === "see" && st.demo) { if (!st.run) { this.reset(L); st.demo = true; st.run = true; } held = st.v < -(Math.sqrt(2 * (A - G) * Math.max(st.h, 0)) * 0.9 + 1.2); }
      if (st.run && !st.done) {
        const burn = held && st.fuel > 0; if (burn) st.fuel = Math.max(0, st.fuel - dt);
        st.v += ((burn ? A : 0) - G) * dt; st.h += st.v * dt; st.lm.userData.flame.visible = burn; st.lm.userData.flame.scale.setScalar(1 + Math.sin(t * 40) * 0.1);
        if (st.h <= 0) { st.h = 0; st.lm.userData.flame.visible = false;
          if (L.step === "see") { st.run = false; }
          else { st.done = true; const s = -st.v; st.v = 0;
            if (s <= 3) L.finish(true, { title: `The Eagle has landed! (${s.toFixed(1)} m/s)`, why: [`You touched down at <b>${s.toFixed(1)} m/s</b>, gentle enough for the landing legs.`, `You had <b>${st.fuel.toFixed(1)} seconds</b> of fuel left.`,
              "The trick: let gravity speed you up a little, then burn steadily so you arrive slowly right at the ground. Real pilots do this with every landing."] });
            else L.finish(false, { title: `Crash! ${s.toFixed(1)} m/s is too fast`, why: [`You hit the ground at <b>${s.toFixed(1)} m/s</b>. The legs can take only about <b>3 m/s</b>.`, st.fuel <= 0 ? "You ran out of fuel too early. Don't burn high up!" : "You didn't slow down enough near the ground.", "💡 Start burning when you're about 150 m up, and keep your falling speed small."] }); } }
      }
      st.lm.position.y = Math.max(0, st.h) / 10; L.orbit.target.y = st.lm.position.y + 2;
      st.dust.forEach((d, i) => { const on = st.lm.userData.flame.visible && st.h < 60; d.visible = on; if (on) { const a = i / 40 * Math.PI * 2 + t; const r = ((t * 3 + i * 0.37) % 1) * 6; d.position.set(Math.cos(a) * r, 0.15, Math.sin(a) * r); } });
      if (L.step === "try") hud(L);
    },
  });
  window.m13Start = () => { const L = ACAD.L; if (L.st.run) return; L.m.reset(L); L.st.run = true; document.getElementById("m13s").disabled = true; };
  window.m13Hold = (b) => { held = b; if (b) SND.tone(70, 0.2, "sawtooth", 0.04); };
})();

// ===================== Lesson 14 — Gravity slingshot =====================
(() => {
  const MUJ = 1.267e8, RJ = 71492, VP = 13.1, SC = 0.35 / RJ, CRASH = 3.4 * RJ, T = 60 * RJ / 10;
  function start(L, off) { const st = L.st; st.trs.forEach((tr) => tr.line.material.opacity *= 0.4);
    const tr = K.trail(L.scene, off < 0 ? 0x7dffb5 : 0xff8a8a, 4000); st.trs.push(tr); if (st.trs.length > 4) L.scene.remove(st.trs.shift().line);
    st.run = { px: 0, cx: VP * T + off * RJ, cy: -60 * RJ, vx: 0, vy: 10, t: 0, tr, off, crash: false }; }
  regModule({
    no: 14, track: "moon", ico: "🪐", title: "Gravity slingshot", badge: "Slingshot Navigator", badgeIco: "🪐",
    useIn: "Mission XXX and any trip to the outer planets",
    goal: "Aim your probe past moving Jupiter so it leaves at <b>20+ km/s</b> (you arrive at 10 km/s). Don't fly too close!",
    sources: "NASA (Jupiter's orbital speed about 13.1 km/s; Voyager 2 and Europa Clipper flybys). Real gravity maths; the danger zone around Jupiter is drawn as the planet.",
    fact: "Jupiter moves around the Sun at about <b>13 km/s</b> · Voyager 2 used Jupiter, Saturn, Uranus and Neptune · Europa Clipper flew past Mars (2025) and Earth (Dec 2026) to reach Jupiter.",
    see: [
      { text: "Planets move fast around the Sun. Jupiter travels about <b>13 km every second</b>!", go(L) { L.st.demo = -14; } },
      { text: "Fly <b>behind</b> a moving planet and its gravity drags you along with it. You leave much <b>faster</b> than you came, for <b>free</b>! (Fly in front and you slow down.)", go(L) { L.st.demo = -14; } },
      { text: "This <b>gravity slingshot</b> let Voyager 2 visit 4 giant planets. Without it, we'd need impossibly big rockets.", go(L) { L.st.demo = 14; } },
    ],
    build(L) {
      K.space(L, 3000, 1.2);
      const tex = canvasTex(512, 256, (x, w, h) => { const c = ["#d9b38c", "#b5835a", "#e8d2b0", "#a0623a", "#e2c7a0", "#c79a6b"]; for (let i = 0; i < 16; i++) { x.fillStyle = c[i % c.length]; x.fillRect(0, i * h / 16, w, h / 16 + 1); } x.fillStyle = "#b5523a"; x.beginPath(); x.ellipse(320, 170, 40, 18, 0, 0, 7); x.fill(); });
      const jup = new THREE.Mesh(new THREE.SphereGeometry(3.4 * RJ * SC, 48, 32), K.mat(0xffffff, { map: tex, roughness: 0.8 })); L.scene.add(jup);
      const probe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), K.basic(0xffffff)); probe.add(glowSprite("rgba(255,255,255,0.9)", 0.8)); L.scene.add(probe);
      L.st = { jup, probe, trs: [], off: 10, run: null }; L.label("🪐 Jupiter →", () => jup.position.clone().add(V3(0, 1.4, 0)), "gold");
      L.st.spd = L.label("", () => (L.st.run ? probe.position.clone().add(V3(0, 0.8, 0)) : null), "green big");
      L.orbit = { target: V3(20, 0, 2), dist: 36, yaw: 0, pitch: 1.35, auto: 0 };
    },
    reset(L) { L.st.trs.forEach((tr) => L.scene.remove(tr.line)); L.st.trs = []; L.st.run = null; L.st.demo = null; },
    tryUI(L) { return `<div class="lcRow" style="align-items:center">${K.slider("m14", "🎯 Aim: ← behind Jupiter · in front →", -40, 40, 1, L.st.off, "m14Set")}<button class="btn go" onclick="m14Go()">🚀 LAUNCH PROBE</button></div>`; },
    tryStart(L) { m14Set(L.st.off); },
    update(L, dt) {
      const st = L.st;
      if (L.step === "see" && st.demo != null) { st.dT = (st.dT || 99) + dt; if (st.dT > 9) { st.dT = 0; start(L, st.demo); } }
      const R = st.run; if (!R) { st.jup.position.set(0, 0, 0); return; }
      const nS = Math.ceil(dt * 107000 / 400); for (let i = 0; i < nS && !R.end; i++) { const h = 400; R.px = VP * R.t; const dx = R.cx - R.px, dy = R.cy, r = Math.hypot(dx, dy);
        if (r < CRASH) { R.end = "crash"; break; } const a = -MUJ / r ** 3; R.vx += a * dx * h; R.vy += a * dy * h; R.cx += R.vx * h; R.cy += R.vy * h; R.t += h; if (R.t > 2 * T) R.end = "done"; }
      st.jup.position.set(R.px * SC, 0, 0); st.jup.rotation.y += dt; st.probe.position.set(R.cx * SC, 0, -R.cy * SC); R.tr.push(st.probe.position);
      const v = Math.hypot(R.vx, R.vy); st.spd.el.innerHTML = `${v.toFixed(1)} km/s`;
      if (R.end && !R.reported && L.step === "try") { R.reported = true;
        if (R.end === "crash") L.finish(false, { title: "Too close to Jupiter!", why: ["Jupiter's thick atmosphere and deadly radiation belts would destroy the probe.", "💡 Pass close, but not <b>too</b> close."] });
        else if (v >= 20) L.finish(true, { title: `Slingshot! 10 → ${v.toFixed(1)} km/s`, why: [
          "You passed <b>behind</b> Jupiter as it raced along. Its gravity pulled you along with it, like catching a ride on a moving bus.",
          "The speed was <b>free</b>: no fuel used! Jupiter lost a tiny, tiny bit of speed, far too little to notice.",
          "Voyager 2 did this at Jupiter, Saturn, Uranus and Neptune. Europa Clipper uses flybys of Mars and Earth to reach Jupiter."] });
        else L.finish(false, { title: `Only ${v.toFixed(1)} km/s`, why: [R.off > 0 ? "You passed <b>in front</b> of Jupiter. Its gravity pulled you backwards, so you lost speed!" : "You passed too far away for Jupiter's gravity to help much.", "💡 Pass <b>behind</b> the moving planet, fairly close."] }); }
    },
  });
  window.m14Set = (v) => { ACAD.L.st.off = +v; K.set("m14V", v < 0 ? `${-v} Jupiter-widths behind` : v > 0 ? `${v} in front` : "straight at it!"); };
  window.m14Go = () => { const L = ACAD.L; if (L.st.run && !L.st.run.end) return; start(L, L.st.off); SND.tone(400, 0.2); };
})();

// ===================== Lesson 15 — Launch windows to Mars =====================
(() => {
  const RE = 10, RM = 15.24, DAYS = 259, PE = 365.25, PM = 687, SPEED = 18;     // 1 second = 18 days
  regModule({
    no: 15, track: "moon", ico: "🔴", title: "Launch windows to Mars", badge: "Interplanetary", badgeIco: "🔴",
    useIn: "planning any trip beyond the Moon, and Mission XXX",
    goal: "Time runs fast here. Press <b>LAUNCH</b> at the right moment so your ship <b>meets Mars</b> after its 259-day trip.",
    sources: "NASA/ESA (Mars launch windows every 26 months); Hohmann transfer maths (Earth 1 AU, Mars 1.52 AU).",
    fact: "Trip to Mars (Hohmann): about <b>259 days</b> · Mars must be about <b>44°</b> ahead of Earth at launch · that lines up only about every <b>26 months</b>.",
    see: [
      { text: "Earth and Mars both circle the Sun. Earth is faster: one lap is a year; Mars takes <b>687 days</b>.", go(L) { L.st.demo = 0; } },
      { text: "The cheapest path is a half-oval from Earth's orbit to Mars' orbit. It takes about <b>259 days</b>, and Mars keeps moving that whole time.", go(L) { L.st.demo = 1; } },
      { text: "So you launch when Mars is about <b>44° ahead</b> of Earth. That only happens about every <b>26 months</b>: a <b>launch window</b>.", go(L) { L.st.demo = 2; } },
    ],
    build(L) {
      K.space(L, 3000, 0.4); K.sun(10, V3(0, 0, 0), L.scene); const core = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 16), K.basic(0xffe08a)); L.scene.add(core);
      K.ring(RE, 0x4aa8ff, 0.4, L.scene); K.ring(RM, 0xff6b4a, 0.4, L.scene);
      const earth = K.earth(0.6, null, L.scene), mars = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 16), K.mat(0xc1440e, { roughness: 0.9 })); L.scene.add(mars);
      const ship = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), K.basic(0xffd27a)); ship.add(glowSprite("rgba(255,210,122,0.9)", 0.8)); L.scene.add(ship);
      const tr = K.trail(L.scene, 0xffd27a, 1000);
      L.st = { earth, mars, ship, tr }; this.reset(L);
      L.label("🌍 Earth", () => earth.position.clone().add(V3(0, 1.2, 0)), "blue"); L.label("🔴 Mars", () => mars.position.clone().add(V3(0, 1.1, 0)), "red");
      L.orbit = { target: V3(0, 0, 0), dist: 44, yaw: 0, pitch: 1.4, auto: 0 };
    },
    reset(L) { Object.assign(L.st, { day: 0, ea: 0, ma: 120 * DEG, fly: null, done: false, demo: null }); L.st.tr.clear(); },
    tryUI() { return `<div class="lcRow" style="align-items:center"><div class="chips" style="flex:2 1 300px"><span class="chipS" id="m15a"></span><span class="chipS" id="m15d"></span></div><button class="btn go" onclick="m15Go()">🚀 LAUNCH</button></div>`; },
    tryStart() {},
    update(L, dt) {
      const st = L.st, d = dt * SPEED; st.day += d;
      st.ea += (2 * Math.PI / PE) * d; st.ma += (2 * Math.PI / PM) * d;
      st.earth.position.set(Math.cos(st.ea) * RE, 0, -Math.sin(st.ea) * RE); st.mars.position.set(Math.cos(st.ma) * RM, 0, -Math.sin(st.ma) * RM);
      const lead = ((angDiff(st.ma, st.ea) / DEG) + 360) % 360;
      if (L.step === "see" && st.demo && !st.fly && Math.abs(lead - 44) < 2) st.fly = { t: 0, a0: st.ea };
      if (st.fly) { const F = st.fly; F.t += d; const tau = Math.min(1, F.t / DAYS); st.ship.position.copy(transferPos(RE, RM, F.a0, tau)); st.tr.push(st.ship.position);
        if (tau >= 1) { const miss = angDiff(F.a0 + Math.PI, st.ma) / DEG;
          if (L.step === "try" && !st.done) { st.done = true;
            if (Math.abs(miss) < 5) L.finish(true, { title: "You arrived at Mars!", why: [`You launched when Mars was about <b>${F.lead.toFixed(0)}°</b> ahead of Earth. During your <b>259-day</b> trip, Mars moved about <b>136°</b> and met you right on time.`,
              "That alignment happens only about every <b>26 months</b>. That's why Mars missions all launch in the same few weeks: <b>launch windows</b>.", "Miss the window and you wait more than 2 years for the next one!"] });
            else L.finish(false, { title: `Missed Mars by ${Math.abs(miss).toFixed(0)}°`, why: [`You launched when Mars was <b>${F.lead.toFixed(0)}°</b> ahead of Earth.`, miss > 0 ? "Mars was already past your arrival point: launch <b>earlier</b>." : "Mars hadn't arrived yet: launch <b>later</b>.", "💡 Launch when Mars is about <b>44°</b> ahead."] }); }
          if (L.step === "see") { st.fly = null; st.tr.clear(); } } }
      else st.ship.position.copy(st.earth.position);
      K.set("m15a", `🔴 Mars is ${lead.toFixed(0)}° ahead of Earth`); K.set("m15d", `📅 Day ${K.fmt(st.day)}`);
    },
  });
  window.m15Go = () => { const L = ACAD.L, st = L.st; if (st.fly) return; const lead = ((angDiff(st.ma, st.ea) / DEG) + 360) % 360; st.fly = { t: 0, a0: st.ea, lead }; SND.tone(90, 0.8, "sawtooth", 0.06); };
})();
