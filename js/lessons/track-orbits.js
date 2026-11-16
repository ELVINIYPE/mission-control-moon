// Track 2 — Orbits: lessons 6–9.
// Facts: μ(Earth) = 398,600 km³/s²; Earth radius 6,371 km; circular speed at 200 km ≈ 7.8 km/s; escape speed ≈ 11.2 km/s (NASA).
// ISS ≈ 400 km, ≈ 92 min per lap; GPS ≈ 20,200 km (≈ 12 h); geostationary = 35,786 km (23 h 56 min) (NASA/ESA).
// Starship HLS refuels in Earth orbit from tanker Starships; Artemis III (2027) will test this kind of docking in low Earth orbit (NASA).

const MU = 398600, RKM = 6371;

// ===================== Lesson 6 — Newton's cannon =====================
(() => {
  const S = 1 / 1000, R = RKM * S, H0 = 200;                    // 1 unit = 1,000 km
  const COLORS = [0xffd27a, 0x7fd4ff, 0xff6b9a, 0x7dffb5, 0xb18cff];
  function fire(L, v) {
    const st = L.st, tr = K.trail(L.scene, COLORS[st.shots.length % 5], 6000);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), K.basic(COLORS[st.shots.length % 5])); ball.add(glowSprite("rgba(255,255,255,0.6)", 0.6)); L.scene.add(ball);
    const s = { v, x: 0, y: RKM + H0, vx: v, vy: 0, ang: 0, last: Math.PI / 2, tr, ball, t: 0, state: "fly" }; st.shots.push(s);
    if (st.shots.length > 5) { const o = st.shots.shift(); L.scene.remove(o.tr.line); L.scene.remove(o.ball); }
    SND.tone(120, 0.3, "sawtooth", 0.08); return s;
  }
  function step(s, dt) {
    for (let i = 0; i < 40 && s.state === "fly"; i++) { const d = dt / 40, r = Math.hypot(s.x, s.y), a = -MU / (r * r * r);
      s.vx += a * s.x * d; s.vy += a * s.y * d; s.x += s.vx * d; s.y += s.vy * d; s.t += d;
      const th = Math.atan2(s.y, s.x); let dth = s.last - th; if (dth < -Math.PI) dth += Math.PI * 2; s.ang += dth; s.last = th;
      if (Math.hypot(s.x, s.y) < RKM) s.state = "crash";
      else if (s.ang >= Math.PI * 2) s.state = "orbit";
      else if (Math.hypot(s.x, s.y) > RKM * 14) s.state = "escape"; }
    s.ball.position.set(s.x * S, s.y * S, 0); s.tr.push(s.ball.position);
  }
  regModule({
    no: 6, track: "orbits", ico: "💣", title: "Newton's cannon", badge: "Orbit Thinker", badgeIco: "💣",
    useIn: "every orbit in the game: the ISS, Apollo 11 parking orbit and Artemis",
    goal: "Fire the cannon from a super-tall mountain (200 km). Find the speed that puts the cannonball into <b>orbit</b> around the Earth!",
    sources: "Isaac Newton's thought experiment (1687); NASA (orbital speed about 7.8 km/s, escape speed about 11.2 km/s). Real gravity maths, no air.",
    fact: "Circle orbit at 200 km: <b>7.8 km/s</b> · faster makes a bigger <b>oval</b> · at <b>11.2 km/s</b> you escape Earth for good.",
    see: [
      { text: "Isaac Newton imagined a cannon on a <b>giant mountain</b>. Fire slowly and the ball curves down and lands.", go(L) { L.st.demo = [3]; } },
      { text: "Fire faster and it lands farther away. The Earth is round, so the ground <b>curves away</b> under the ball.", go(L) { L.st.demo = [3, 5.5, 7]; } },
      { text: "Fire fast enough and the ground curves away <b>as fast as the ball falls</b>. It never lands! It keeps falling <b>around</b> the Earth. That's an <b>orbit</b>.", go(L) { L.st.demo = [7.8]; } },
    ],
    build(L) {
      K.space(L, 3000, 1.2); const e = K.earth(R, V3(0, 0, 0), L.scene);
      const mt = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.25, 16), K.mat(0x8a7a6a)); mt.position.set(0, R + 0.08, 0); L.scene.add(mt);
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.4, 12), K.mat(0x333333, { metalness: 0.7 })); can.rotation.z = -Math.PI / 2; can.position.set(0.1, R + 0.22, 0); L.scene.add(can);
      L.st = { e, shots: [], v: 6 }; L.label("⛰️ 200 km mountain + cannon", V3(0, R + 0.9, 0), "gold");
      L.orbit = { target: V3(0, 0, 0), dist: 34, yaw: 0, pitch: 0.05, auto: 0 };
    },
    reset(L) { L.st.shots.forEach((s) => { L.scene.remove(s.tr.line); L.scene.remove(s.ball); }); L.st.shots = []; L.st.demo = null; L.st.res = null; },
    tryUI(L) { return `<div class="lcRow" style="align-items:center">${K.slider("o6v", "💨 Cannon speed", 4, 12, 0.1, L.st.v, "o6Set")}
      <div class="chips" style="flex:1 1 200px"><span class="chipS" id="o6r">Fire to see what happens</span></div><button class="btn go" onclick="o6Fire()">💥 FIRE</button></div>`; },
    tryStart(L) { o6Set(L.st.v); },
    update(L, dt) {
      const st = L.st; st.e.userData.c.rotation.y += dt * 0.02;
      if (L.step === "see" && st.demo) { st.dT = (st.dT || 9) + dt; if (st.dT > 8) { st.dT = 0; const keep = st.demo; this.reset(L); st.demo = keep; (L.seeI === 0 ? [3] : L.seeI === 1 ? [3, 5.5, 7] : [7.8]).forEach((v) => fire(L, v)); } }
      st.shots.forEach((s) => { if (s.state === "fly") step(s, dt * 900); else if (!s.reported && L.step === "try") { s.reported = true; o6Result(L, s); } });
    },
  });
  window.o6Set = (v) => { ACAD.L.st.v = +v; K.set("o6vV", `${(+v).toFixed(1)} km/s (${K.fmt(v * 3600)} km/h)`); };
  window.o6Fire = () => { const L = ACAD.L; fire(L, L.st.v); K.set("o6r", "💨 Flying…"); };
  function o6Result(L, s) {
    const msg = { crash: "🌍 It landed. Too slow!", orbit: s.v < 8.3 ? "🛰️ ORBIT! A nearly round circle" : "🛰️ ORBIT! A big oval", escape: "🚀 It escaped Earth forever!" }[s.state];
    K.set("o6r", msg); const el = document.getElementById("o6r"); if (el) el.className = "chipS " + (s.state === "orbit" ? "ok" : "bad");
    if (s.state === "orbit") setTimeout(() => L.finish(true, { title: `Orbit at ${s.v.toFixed(1)} km/s!`, why: [
      "An orbit is <b>falling</b> all the time, but moving sideways so fast that you keep <b>missing</b> the ground.",
      "At this height, about <b>7.8 km/s</b> (28,000 km/h) gives a round orbit. Faster gives a bigger <b>oval</b>.",
      "At about <b>11.2 km/s</b> the ball never comes back: that's <b>escape speed</b>. Try it!",
      "Astronauts on the ISS float because they are falling around Earth together with their station, not because there's no gravity."] }), 1200);
    else if (s.state === "escape") setTimeout(() => L.finish(false, { title: "Too fast: it escaped!", why: ["Above about <b>11.2 km/s</b>, Earth's gravity can't pull the ball back. Great for going to Mars, but it's not an orbit!", "💡 Find a speed between landing and escaping."] }), 1200);
  }
})();

// ===================== Lesson 7 — Low vs high orbit =====================
(() => {
  const S = 1 / 1000, R = RKM * S, SID = 23.934, GEO = 35786;
  const per = (alt) => 2 * Math.PI * Math.sqrt(((RKM + alt) ** 3) / MU) / 3600;   // hours
  const spd = (alt) => Math.sqrt(MU / (RKM + alt));
  function setAlt(L, alt) { const st = L.st; st.alt = alt; const r = (RKM + alt) * S; st.ring.scale.setScalar(r / 10); K.set("o7aV", `${K.fmt(alt)} km`);
    const P = per(alt); K.set("o7info", `🕒 One lap: <b>${P < 2 ? K.fmt(P * 60) + " min" : P.toFixed(1) + " h"}</b> · 💨 Speed: <b>${spd(alt).toFixed(2)} km/s</b>`); }
  regModule({
    no: 7, track: "orbits", ico: "🔭", title: "Low vs high orbit", badge: "Orbit Designer", badgeIco: "🔭",
    useIn: "Take Pictures (low orbit) and Mission XXX (communications)",
    goal: "Place a <b>TV satellite</b> so it stays <b>above the same spot</b> on Earth, so the dish never has to move. Then press <b>Lock orbit</b>.",
    sources: "NASA/ESA (ISS altitude and period; GPS orbit; geostationary orbit 35,786 km). Kepler's third law.",
    fact: "ISS: about <b>400 km</b>, <b>92 min</b>, <b>7.7 km/s</b> · GPS: about <b>20,200 km</b>, <b>12 h</b> · Geostationary: <b>35,786 km</b>, <b>23 h 56 min</b>, 3.1 km/s.",
    see: [
      { text: "<b>Low</b> orbits are <b>fast</b>. The ISS flies about 400 km up at 7.7 km/s and goes round Earth every <b>92 minutes</b>: 16 sunrises a day!", go(L) { setAlt(L, 400); } },
      { text: "<b>Higher</b> orbits are <b>slower</b> and take longer. GPS satellites fly about 20,200 km up and take about <b>12 hours</b> per lap.", go(L) { setAlt(L, 20200); } },
      { text: "Low orbit: sharp close-up photos. High orbit: see half the Earth at once. Each job needs its <b>own</b> orbit!", go(L) { setAlt(L, 1500); } },
    ],
    build(L) {
      K.space(L, 3000, 1.2); const e = K.earth(R, V3(0, 0, 0), L.scene);
      const ring = K.ring(10, 0x7fd4ff, 0.5, L.scene); ring.material = K.basic(0x7fd4ff, { transparent: true, opacity: 0.5 });
      const sat = new THREE.Group(); sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), K.mat(0xd9a520, { metalness: 0.6 })));
      [-1, 1].forEach((k) => { const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.5), K.mat(0x1f3c88)); p.position.x = k * 0.95; sat.add(p); }); sat.add(glowSprite("rgba(255,210,122,0.8)", 1.2)); L.scene.add(sat);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), K.basic(0xff6b9a)); dish.position.set(R, 0, 0); e.add(dish);
      const link = K.line(L.scene, [V3(0, 0, 0), V3(1, 0, 0)], 0x2fbf71, 0.8);
      L.st = { e, ring, sat, dish, link, alt: 2000, th: 0, spin: 0 }; setAlt(L, 2000);
      L.label("📡 Your TV dish", () => dish.getWorldPosition(new THREE.Vector3()).add(V3(0, 0.9, 0)), "red");
      L.label("🛰️ Satellite", () => sat.position.clone().add(V3(0, 1.4, 0)), "gold");
      L.orbit = { target: V3(0, 0, 0), dist: 78, yaw: 0.2, pitch: 0.9, auto: 0 };
    },
    reset(L) { setAlt(L, 2000); L.st.th = 0; L.st.spin = 0; },
    tryUI(L) { return `<div class="lcRow" style="align-items:center">${K.slider("o7a", "⬆️ Height above Earth", 200, 40000, 10, L.st.alt, "o7Set")}
      <div style="flex:1 1 260px"><div id="o7info"></div><div class="kv"><span>Earth turns once in</span><b>23 h 56 min</b></div></div><button class="btn go" onclick="o7Lock()">🔒 Lock orbit</button></div>`; },
    tryStart(L) { setAlt(L, L.st.alt); },
    update(L, dt) {
      const st = L.st, k = dt * 1.6;                                  // 1 second ≈ 1.6 hours
      st.spin += (2 * Math.PI / SID) * k; st.e.rotation.y = st.spin; st.e.userData.c.rotation.y += dt * 0.01;
      st.th += (2 * Math.PI / per(st.alt)) * k; const r = (RKM + st.alt) * S;
      st.sat.position.set(Math.cos(st.th) * r, 0, -Math.sin(st.th) * r); st.sat.lookAt(0, 0, 0);
      const dp = st.dish.getWorldPosition(new THREE.Vector3()), p = st.link.geometry.attributes.position;
      p.setXYZ(0, dp.x, dp.y, dp.z); p.setXYZ(1, st.sat.position.x, st.sat.position.y, st.sat.position.z); p.needsUpdate = true;
      const vis = dp.clone().normalize().dot(st.sat.position.clone().sub(dp).normalize()) > 0.05; st.link.material.color.set(vis ? 0x2fbf71 : 0xe05050);
    },
  });
  window.o7Set = (v) => setAlt(ACAD.L, +v);
  window.o7Lock = () => { const L = ACAD.L, a = L.st.alt, P = per(a);
    if (Math.abs(a - GEO) <= 500) return L.finish(true, { title: `Geostationary at ${K.fmt(a)} km!`, why: [
      `At this height one lap takes <b>${P.toFixed(1)} hours</b>, the same time the Earth takes to turn once. So the satellite hangs <b>above the same spot</b>.`,
      "That's why TV and weather satellites sit about <b>35,786 km</b> up, above the equator. Your dish never has to move.",
      "Low orbits like the ISS (400 km) are fast and close: great for photos. Every orbit is a trade-off."] });
    L.finish(false, { title: `One lap takes ${P < 2 ? K.fmt(P * 60) + " minutes" : P.toFixed(1) + " hours"}`, why: [
      P < SID ? "The satellite goes round <b>faster</b> than the Earth turns, so it races ahead and disappears over the horizon." : "The satellite goes round <b>slower</b> than the Earth turns, so the dish slowly loses it.",
      "💡 You need a lap time of <b>23 h 56 min</b>, exactly one Earth turn. Higher = slower."] });
  };
})();

// ===================== Lesson 8 — Rendezvous & docking =====================
(() => {
  const ALT = 400, DR = 15, R0 = RKM + ALT, W = Math.sqrt(MU / R0 ** 3);
  const vis = (dr) => 9 + dr / 6;                                    // heights are exaggerated so you can see them
  function issModel() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), K.mat(0xcccccc)));
    [-0.7, -0.35, 0.35, 0.7].forEach((x) => [-1, 1].forEach((s) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.6), K.mat(0xb07a1a, { metalness: 0.5 })); p.position.set(x, 0, s * 0.38); g.add(p); }));
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 12), K.mat(0xeeeeee)); m.rotation.x = Math.PI / 2; g.add(m); return g; }
  function hud(L) { const st = L.st; let ph = st.ph * 180 / Math.PI;
    K.set("o8ph", ph > 0 ? `${ph.toFixed(1)}° behind the ISS` : `${(-ph).toFixed(1)}° AHEAD of the ISS`);
    K.set("o8h", st.dr === 0 ? "same height as the ISS" : `${Math.abs(st.dr)} km ${st.dr > 0 ? "higher" : "lower"} than the ISS`);
    K.set("o8b", `${st.burns} burns left`); K.set("o8t", `${(st.time / 3600).toFixed(1)} h`); }
  regModule({
    no: 8, track: "orbits", ico: "🔗", title: "Rendezvous & docking", badge: "Docking Pilot", badgeIco: "🔗",
    useIn: "Go to the ISS, Apollo 11 (docking with the lander) and Artemis",
    goal: "Catch up with the ISS and <b>dock</b>: get within <b>1.5°</b> of it at the <b>same height</b>. You have <b>6 burns</b>.",
    sources: "NASA (ISS orbit about 400 km, 92 min); orbital mechanics (lower orbits go round faster). Heights drawn bigger so you can see them.",
    fact: "ISS: about <b>400 km</b> up, <b>7.7 km/s</b> · real spacecraft take from about <b>3 hours</b> to about <b>a day</b> to catch it · final docking speed: just a few <b>centimetres per second</b>.",
    see: [
      { text: "You're in the <b>same orbit</b> as the ISS, but behind it. Your instinct: speed up to catch it. <b>Wrong!</b>", go(L) { L.st.demo = 1; } },
      { text: "Speeding up lifts you into a <b>higher</b> orbit, and higher orbits are <b>slower</b>. You fall even further behind! Watch the gap grow.", go(L) { L.st.demo = 2; } },
      { text: "To catch up, you <b>slow down</b>! You drop to a lower, faster orbit and slide in under the ISS. Then speed up to rise back and meet it.", go(L) { L.st.demo = 3; } },
    ],
    build(L) {
      K.space(L, 3000, 1.2); const e = K.earth(6.371, V3(0, 0, 0), L.scene);
      const ring = K.ring(vis(0), 0x7fd4ff, 0.4, L.scene), cring = K.ring(vis(0), 0xffd27a, 0.6, L.scene);
      const iss = issModel(); L.scene.add(iss); iss.add(glowSprite("rgba(127,212,255,0.6)", 1.2));
      const me = K.capsule(0.5); me.rotation.z = -Math.PI / 2; const mg = new THREE.Group(); mg.add(me); mg.add(glowSprite("rgba(255,210,122,0.8)", 1)); L.scene.add(mg);
      const fl = K.flame(0.12, 0.6); mg.add(fl); fl.visible = false;
      L.st = { e, iss, mg, cring, fl, th: 0 }; this.reset(L);
      L.label("🛰️ ISS", () => iss.position.clone().add(V3(0, 1, 0)), "blue"); L.label("🚀 You", () => mg.position.clone().add(V3(0, 1, 0)), "gold");
      L.orbit = { target: V3(0, 0, 0), dist: 30, yaw: 0, pitch: 1.2, auto: 0 };
    },
    reset(L) { Object.assign(L.st, { ph: 25 * Math.PI / 180, dr: 0, burns: 6, time: 0, done: false, demo: 0, dT: 0 }); },
    tryUI() { return `<div class="lcRow" style="align-items:center"><div class="chips" style="flex:2 1 320px"><span class="chipS" id="o8ph"></span><span class="chipS" id="o8h"></span><span class="chipS" id="o8b"></span><span class="chipS" id="o8t"></span></div>
      <button class="btn sm" style="background:#1f6fd6" onclick="o8Burn(1)">⏩ Speed up (go higher)</button><button class="btn sm" style="background:#e8590c" onclick="o8Burn(-1)">⏪ Slow down (go lower)</button></div>`; },
    tryStart(L) { hud(L); },
    update(L, dt) {
      const st = L.st;
      if (L.step === "see") { st.dT += dt; if (st.dT > 10 || st.lastDemo !== st.demo) { st.dT = 0; st.lastDemo = st.demo; st.ph = 25 * Math.PI / 180; st.dr = st.demo === 2 ? DR : st.demo === 3 ? -DR : 0; } }
      const k = dt * 4000; st.time += k;                                   // 1 second ≈ 1.1 hours
      const wc = Math.sqrt(MU / (R0 + st.dr) ** 3); st.ph -= (wc - W) * k; st.th += W * dt * 30;
      st.iss.position.set(Math.cos(st.th) * vis(0), 0, -Math.sin(st.th) * vis(0)); st.iss.rotation.y = st.th;
      const tc = st.th - st.ph; st.mg.position.set(Math.cos(tc) * vis(st.dr), 0, -Math.sin(tc) * vis(st.dr)); st.mg.rotation.y = tc;
      st.cring.scale.setScalar(vis(st.dr) / vis(0)); st.fl.visible = st.flameT > 0; st.flameT = (st.flameT || 0) - dt;
      if (L.step !== "try" || st.done) return; hud(L);
      if (Math.abs(st.ph) < 1.5 * Math.PI / 180 && st.dr === 0) { st.done = true; SND.beep();
        return L.finish(true, { title: `Docked after ${(st.time / 3600).toFixed(1)} hours!`, why: [
          "To <b>catch up</b>, you went <b>lower</b> (slowed down). Lower orbits are shorter and faster, so you gained on the ISS.",
          "Then you <b>sped up</b> to climb back to the same height, right next to the station.",
          "Real crews do exactly this. It feels backwards, but it's how orbits work: <b>slow down to speed up!</b>"] }); }
      if (st.burns <= 0 && (st.dr !== 0 || Math.abs(st.ph) >= 1.5 * Math.PI / 180)) { st.done = true;
        return L.finish(false, { title: "Out of fuel before docking", why: ["Each burn uses fuel. Burning the wrong way sends you further from the station.", "💡 To catch something <b>ahead</b> of you: slow down (drop lower), wait, then speed up (rise back) when you're close."] }); }
    },
  });
  window.o8Burn = (d) => { const L = ACAD.L, st = L.st; if (L.step !== "try" || st.done || st.burns <= 0) return; st.burns--; st.dr += d * DR; st.flameT = 0.6; SND.tone(d > 0 ? 500 : 300, 0.3, "sawtooth", 0.05); hud(L); };
})();

// ===================== Lesson 9 — Orbital gas station =====================
(() => {
  const NEED = 1000, EACH = 150, TANKERS = 10, BOIL = 0.01;
  function hud(L) { const st = L.st; K.setMeter("o9f", st.fuel / 1200, `${K.fmt(st.fuel)} of ${NEED} t`, st.fuel >= NEED ? "#2fbf71" : "#f0b93a");
    K.set("o9n", `🚀 Tankers left: ${st.left}`); K.set("o9d", `📅 Day ${st.day}`); }
  function starship(color = 0xdfe3ea, s = 1) { const g = new THREE.Group(), m = K.mat(color, { metalness: 0.8, roughness: 0.3 });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.5 * s, 4 * s, 32), m); g.add(b);
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m); n.scale.y = 1.6; n.position.y = 2 * s; g.add(n);
    [-1, 1].forEach((k) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9 * s, 0.6 * s), K.mat(0x333333)); f.position.set(k * 0.55 * s, -1.4 * s, 0); g.add(f); }); return g; }
  regModule({
    no: 9, track: "orbits", ico: "⛽", title: "Orbital gas station", badge: "Fuel Depot Operator", badgeIco: "⛽",
    useIn: "Artemis III (Earth-orbit docking test) and Artemis IV+ (the gas station mission)",
    goal: `Fill the Moon lander with <b>${NEED} t</b> of fuel. Hit <b>DOCK</b> when the tanker is lined up (green). Fuel slowly <b>boils away</b> each day, so be quick!`,
    sources: "NASA (Starship HLS refuels in Earth orbit; Artemis III 2027 Earth-orbit test). Tanker size and boil-off rate are game estimates.",
    fact: "Moon landers like Starship HLS need <b>many tanker flights</b> to fill up in Earth orbit · the fuel is liquid oxygen at about <b>−183 °C</b>, so sunlight slowly <b>boils</b> it away.",
    see: [
      { text: "A huge Moon lander can't launch with full tanks: it would be <b>far too heavy</b>. So it launches <b>almost empty</b>.", go(L) { L.st.demo = 0; } },
      { text: "Then <b>tanker rockets</b> fly up one by one and pump fuel across, like a <b>gas station in space</b>. This is the plan for Artemis landers.", go(L) { L.st.demo = 1; } },
      { text: "But the fuel is super cold (liquid oxygen: <b>−183 °C</b>). Sunlight slowly warms it and it <b>boils away</b>. You must fill up fast!", go(L) { L.st.demo = 1; } },
    ],
    build(L) {
      K.space(L, 3000, 1.2); const e = K.earth(40, V3(0, -46, -10), L.scene); e.rotation.z = Math.PI / 2; e.userData.c.material.opacity = 0.4;
      const lander = starship(0xe8ebf0, 1); lander.rotation.z = Math.PI / 2; lander.position.set(-2.4, 0, 0); L.scene.add(lander);
      const tank = starship(0x9aa3b0, 0.9); tank.rotation.z = -Math.PI / 2; L.scene.add(tank);
      const flow = []; for (let i = 0; i < 10; i++) { const d = glowSprite("rgba(127,212,255,0.9)", 0.4); d.visible = false; L.scene.add(d); flow.push(d); }
      L.st = { e, lander, tank, flow }; this.reset(L);
      L.label("🌙 Moon lander (your tanks)", () => lander.position.clone().add(V3(-1.5, 1.2, 0)), "gold");
      L.label("⛽ Tanker", () => tank.position.clone().add(V3(1.5, 1.1, 0)), "blue");
      L.orbit = { target: V3(0, 0, 0), dist: 13, yaw: 0.25, pitch: 0.25, auto: 0 };
    },
    reset(L) { Object.assign(L.st, { fuel: 0, left: TANKERS, day: 1, ok: 0, miss: 0, ph: 0, speed: 1.4, xfer: 0, approach: 1, done: false, demo: 0 }); },
    tryUI() { return `<div class="lcRow" style="align-items:center">${K.meter("o9f", "⛽ Lander fuel")}
      <div style="flex:1 1 240px"><div class="kv"><span>Line-up</span><b id="o9al">…</b></div><div class="meter" style="height:22px"><span class="lim" style="left:40%;width:20%;background:rgba(47,191,113,.5)"></span><i id="o9n2" style="width:6px;position:absolute;left:0;background:#ffd27a"></i></div></div>
      <div class="chips"><span class="chipS" id="o9n"></span><span class="chipS" id="o9d"></span></div><button class="btn go" onclick="o9Dock()">🔗 DOCK</button></div>`; },
    tryStart(L) { hud(L); },
    update(L, dt, t) {
      const st = L.st; st.e.rotation.y += dt * 0.01;
      st.ph += dt * st.speed; const off = Math.sin(st.ph) * 1.2;                   // sideways wobble of the tanker
      if (st.approach > 0) st.approach = Math.max(0, st.approach - dt);
      st.tank.position.set(1.5 + st.approach * 8, off * (st.xfer > 0 ? 0 : 1), 0);
      if (st.xfer > 0) { st.xfer -= dt; st.tank.position.y = 0; st.flow.forEach((d, i) => { d.visible = true; d.position.set(0.3 - ((t * 2 + i / 10) % 1) * 1.1, 0, 0); });
        if (st.xfer <= 0) { st.flow.forEach((d) => (d.visible = false)); st.approach = 1; } }
      else st.flow.forEach((d, i) => { d.visible = !!(L.step === "see" && st.demo); d.position.set(0.3 - ((t * 2 + i / 10) % 1) * 1.1, 0, 0); });
      const n = document.getElementById("o9n2"); if (n) { n.style.left = `calc(${(off / 2.4 + 0.5) * 100}% - 3px)`; K.set("o9al", Math.abs(off) < 0.24 ? "🟢 LINED UP" : "🔴 not lined up"); }
    },
  });
  window.o9Dock = () => {
    const L = ACAD.L, st = L.st; if (L.step !== "try" || st.done || st.xfer > 0 || st.approach > 0 || st.left <= 0) return;
    const off = Math.sin(st.ph) * 1.2; st.left--; st.day++; st.fuel *= 1 - BOIL;
    if (Math.abs(off) < 0.24) { st.fuel += EACH; st.ok++; st.xfer = 1.6; st.speed += 0.25; SND.beep(); L.toast(`⛽ Docked! +${EACH} t of fuel`); }
    else { st.miss++; st.approach = 1; st.day++; st.fuel *= 1 - BOIL; SND.tone(200, 0.3, "sawtooth", 0.05); L.toast("💥 Missed! The tanker had to back off. A day lost.", true); }
    hud(L);
    if (st.fuel >= NEED) { st.done = true; setTimeout(() => L.finish(true, { title: `Tanks full in ${st.day} days!`, why: [
      `You docked <b>${st.ok} tankers</b>. Launching the lander empty and filling it in orbit lets it carry far more to the Moon.`,
      `While you worked, about <b>${BOIL * 100}% per day</b> boiled away (game number). Slow refuelling wastes fuel, so real depots need great <b>insulation</b> and speed.`,
      "NASA's <b>Artemis III</b> (2027) will test docking with the new Moon landers in Earth orbit before the landing on <b>Artemis IV</b>."] }), 1700); }
    else if (st.left <= 0) { st.done = true; setTimeout(() => L.finish(false, { title: `Only ${K.fmt(st.fuel)} t: not enough to go`, why: [
      `${st.miss} docking${st.miss !== 1 ? "s" : ""} missed. Each miss wastes a whole tanker launch and lets more fuel boil away.`, "💡 Watch the yellow marker and press DOCK when it's in the green zone."] }), 1200); }
  };
})();
