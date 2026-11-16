// Track 1 — Rockets: lessons 1–5.
// Facts: Saturn V had 5 F-1 engines, about 7.5 million lbf (33,400 kN) of thrust, and weighed about 2,900 t at liftoff (NASA).
// Getting to low Earth orbit needs about 9.4 km/s in total (7.8 km/s orbit speed + gravity and air losses).
// Apollo 11 sent about 44 t toward the Moon (CSM ≈ 28.8 t + LM ≈ 15.1 t, NASA). Orion's abort motor: about 400,000 lbf (NASA).

// a launch pad scene with a sky that darkens as you climb
K.padScene = (L) => {
  const s = L.scene;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: canvasTex(16, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#02030a"); g.addColorStop(0.35, "#0b1d4a"); g.addColorStop(0.5, "#3d7bd6"); g.addColorStop(0.53, "#a9cdf5"); g.addColorStop(1, "#a9cdf5"); x.fillStyle = g; x.fillRect(0, 0, w, h); }) }));
  s.add(sky); starfield(s, 1500); acadLights(s, 1.2);
  const gr = new THREE.Mesh(new THREE.CircleGeometry(300, 64), K.mat(0x4d6a3a, { roughness: 1 })); gr.rotation.x = -Math.PI / 2; s.add(gr);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 6), K.mat(0x8a8a8a)); pad.position.y = 0.2; s.add(pad);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 0.6), K.mat(0xb03a2e)); tower.position.set(-2, 4.7, 0); s.add(tower);
  return { sky, pad, tower };
};
K.arrow = (dir, color, len, scene) => { const a = new THREE.ArrowHelper(dir.clone().normalize(), V3(0, 0, 0), len, color, len * 0.25, len * 0.15); scene.add(a); return a; };

// ===================== Lesson 1 — Why rockets fly =====================
(() => {
  const F1 = 6770, WEIGHT = 2900 * 9.81;                        // kN per F-1 engine, rocket weight in kN
  regModule({
    no: 1, track: "rockets", ico: "🔥", title: "Why rockets fly", badge: "Rocket Science 101", badgeIco: "🔥",
    useIn: "every launch: Apollo 11, Artemis and Mission XXX",
    goal: "Choose how many F-1 engines the Saturn V needs to <b>lift off</b>. Engines cost money, so don't add extras you can't use!",
    sources: "NASA (Saturn V: 5 F-1 engines, about 7.5 million lbf thrust, about 2,900 t at liftoff).",
    fact: "One F-1 engine: about <b>6,770 kN</b> (1.5 million lbf) · 5 engines: about <b>33,400 kN</b> · Saturn V weight at liftoff: about <b>28,450 kN</b> (2,900 t).",
    see: [
      { text: "A rocket pushes hot gas <b>down</b>, and the gas pushes the rocket <b>up</b>. That's <b>Newton's third law</b>: every push has an equal push back.", go(L) { L.st.demo = 1; } },
      { text: "Like letting go of a balloon: air rushes out the back and the balloon zooms the other way. Rockets carry their own gas, so this works even in <b>empty space</b>.", go(L) { L.st.demo = 1; } },
      { text: "To lift off, the push (<b>thrust</b>) must be bigger than the rocket's <b>weight</b>. The Saturn V weighed about <b>2,900 tonnes</b>, as much as 400 elephants!", go(L) { L.st.demo = 0; } },
    ],
    build(L) {
      K.padScene(L); const r = K.rocket({ stages: 3, w: 0.55, heights: [3.6, 2.2, 1.3] }); r.g.position.y = 0.4 + 0.3; L.scene.add(r.g);
      const up = K.arrow(V3(0, 1, 0), 0x7fd4ff, 3, L.scene), dn = K.arrow(V3(0, -1, 0), 0xffa040, 2.6, L.scene);
      L.st = { r, up, dn, n: 3, run: null, demo: 1 };
      L.label("⬆️ Rocket pushed UP", () => (up.visible ? r.g.position.clone().add(V3(1.6, r.h + 1.5, 0)) : null), "blue");
      L.label("⬇️ Gas pushed DOWN", () => (dn.visible ? V3(1.8, -0.2, 0) : null), "gold");
      L.orbit = { target: V3(0, 4, 0), dist: 16, yaw: 0.6, pitch: 0.15, auto: 0 };
    },
    reset(L) { const st = L.st; st.run = null; st.demo = 0; st.r.g.position.set(0, 0.7, 0); st.n = 3; },
    tryUI(L) { return `<div class="lcRow" style="align-items:center">${K.slider("r1n", "🔥 F-1 engines", 1, 5, 1, L.st.n, "r1Set")}
      ${K.meter("r1T", "Thrust (push up)")}${K.meter("r1W", "Weight (pull down)")}<button class="btn go" onclick="r1Go()">🚀 LAUNCH</button></div>`; },
    tryStart(L) { r1Set(L.st.n); },
    update(L, dt, t) {
      const st = L.st, r = st.r, fl = r.stages[0].userData.flame;
      const showArrows = L.step === "see" ? st.demo : !!st.run;
      st.up.visible = st.dn.visible = !!showArrows;
      st.up.position.copy(r.g.position).add(V3(0, r.h + 0.3, 0)); st.dn.position.set(0, 0.2, 0);
      fl.visible = (L.step === "see" && st.demo) || !!st.run; fl.scale.setScalar(1 + Math.sin(t * 30) * 0.08);
      if (L.step === "see" && !st.demo) { st.r.g.position.y = 0.7; }
      if (st.run) { const R = st.run; R.t += dt;
        if (R.lift) { R.v += R.a * dt * 6; r.g.position.y += R.v * dt; L.orbit.target.y = Math.min(r.g.position.y + 4, 60); }
        else { r.g.position.x = Math.sin(t * 60) * 0.03; }
        if (R.t > 4 && !R.done) { R.done = true; const n = st.n;
          if (R.lift && n === 5) L.finish(true, { title: "LIFTOFF!", why: [`5 F-1 engines push about <b>33,400 kN</b>. The rocket weighs about <b>28,450 kN</b>. Push is bigger than weight, so up it goes!`,
              "That's what NASA really built: <b>5 F-1 engines</b>, the most powerful single-nozzle rocket engines ever flown.",
              "The push is only about <b>1.2 times</b> the weight, so the Saturn V starts slowly. It gets faster as it burns fuel and gets lighter."] });
          else L.finish(false, { title: "The rocket didn't leave the pad", why: [`${n} engine${n > 1 ? "s" : ""} push about <b>${K.fmt(n * F1)} kN</b>, but the rocket's weight is about <b>${K.fmt(WEIGHT)} kN</b>.`,
              "If the push is smaller than the weight, the rocket just sits there burning fuel.", "💡 Thrust must be <b>bigger</b> than weight. How many engines does that take?"] }); } }
    },
  });
  window.r1Set = (v) => { const L = ACAD.L; L.st.n = +v; const T = L.st.n * F1, max = 6 * F1;
    K.set("r1nV", `${v} engine${v > 1 ? "s" : ""}`); K.setMeter("r1T", T / max, `${K.fmt(T)} kN`, T > WEIGHT ? "#2fbf71" : "#f0b93a"); K.setMeter("r1W", WEIGHT / max, `${K.fmt(WEIGHT)} kN`, "#e05050"); };
  window.r1Go = () => { const L = ACAD.L; if (L.st.run) return; SND.tone(80, 1.5, "sawtooth", 0.06); const T = L.st.n * F1; L.st.run = { t: 0, v: 0, lift: T > WEIGHT, a: (T - WEIGHT) / 2900 / 9.81 }; };
})();

// ===================== Lesson 2 — Rocket stages =====================
(() => {
  const VE = 3.43, NEED = 9.4, SPLITS = { 1: [1], 2: [0.75, 0.25], 3: [0.62, 0.28, 0.1] };
  function dv(n) { const P = 880, s = 0.1, pay = 20, props = SPLITS[n].map((f) => P * f), str = props.map((p) => p * s); let v = 0, steps = [];
    for (let i = 0; i < n; i++) { const m0 = pay + props.slice(i).reduce((a, b) => a + b, 0) + str.slice(i).reduce((a, b) => a + b, 0); v += VE * Math.log(m0 / (m0 - props[i])); steps.push(v); } return steps; }
  function rebuild(L, n) { const st = L.st; if (st.r) L.scene.remove(st.r.g);
    const H = { 1: [5.6], 2: [4.0, 1.6], 3: [3.3, 1.7, 0.7] }[n]; st.r = K.rocket({ stages: n, w: 0.55, heights: H }); st.r.g.position.y = 0.7; L.scene.add(st.r.g); st.n = n; }
  regModule({
    no: 2, track: "rockets", ico: "🧱", title: "Rocket stages", badge: "Staging Expert", badgeIco: "🧱",
    useIn: "building your rocket in Apollo 11 and Artemis",
    goal: "All 3 rockets carry the <b>same fuel</b> (880 t). Pick how many stages so the rocket reaches <b>9.4 km/s</b>: fast enough for orbit.",
    sources: "NASA (Saturn V staging); rocket equation (Tsiolkovsky). Rocket masses are a game example.",
    fact: "Orbit speed: <b>7.8 km/s</b>, plus about 1.5 km/s lost to gravity and air = about <b>9.4 km/s</b> · Saturn V: <b>3 stages</b> · each empty tank you drop makes the rest of the rocket lighter.",
    see: [
      { text: "When a fuel tank is empty, it's just <b>dead weight</b>. Carrying it all the way to space wastes fuel.", go(L) { rebuild(L, 3); } },
      { text: "So rockets are built in <b>stages</b>, stacked on top of each other. When a stage runs out of fuel, it <b>drops off</b> and the next one fires.", go(L) { L.st.demo = { t: 0 }; } },
      { text: "Every tonne you drop means the engines push less weight, so the rocket <b>speeds up more</b> with the fuel that's left. The Saturn V had <b>3 stages</b>.", go(L) { L.st.demo = null; rebuild(L, 3); } },
    ],
    build(L) { K.padScene(L); L.st = { run: null }; rebuild(L, 3); L.orbit = { target: V3(0, 4, 0), dist: 16, yaw: 0.6, pitch: 0.15, auto: 0 }; },
    reset(L) { if (L.st.run) L.st.run.drop.forEach((s) => L.scene.remove(s)); L.st.run = null; L.st.demo = null; L.orbit.target.set(0, 4, 0); rebuild(L, 1); },
    tryUI(L) { return `<div class="lcRow" id="r2p">${r2Picks(L)}</div><div class="lcRow" style="margin-top:8px;align-items:center">${K.meter("r2M", "Speed reached")}<button class="btn go" onclick="r2Go()">🚀 LAUNCH</button></div>`; },
    tryStart(L) { K.setMeter("r2M", 0, `0 of ${NEED} km/s needed`); },
    update(L, dt, t) {
      const st = L.st;
      if (st.demo) { st.demo.t += dt; const k = st.demo.t % 6; st.r.stages.forEach((s, i) => { s.userData.flame.visible = k > i * 2 && k < i * 2 + 2; });
        if (k < 0.05) rebuild(L, 3); }
      if (!st.run) return; const R = st.run, steps = R.steps, n = steps.length; R.t += dt;
      const per = 2.2, i = Math.min(n - 1, Math.floor(R.t / per)), f = Math.min(1, (R.t - i * per) / per);
      const v = (i ? steps[i - 1] : 0) + (steps[i] - (i ? steps[i - 1] : 0)) * f;
      st.r.g.position.y += v * dt * 2.2; L.orbit.target.y = st.r.g.position.y + 3;
      st.r.stages.forEach((s, k) => { s.userData.flame.visible = k === i && R.t < n * per; if (k < i && !s.userData.gone) { s.userData.gone = true; R.drop.push(s); st.r.g.remove(s); s.position.copy(st.r.g.position).add(V3(0, s.position.y, 0)); L.scene.add(s); SND.tone(300, 0.15, "square", 0.05); } });
      R.drop.forEach((s) => { s.position.y -= 6 * dt; s.rotation.z += dt; s.position.x += dt; });
      K.setMeter("r2M", v / 11.5, `${v.toFixed(1)} of ${NEED} km/s`, v >= NEED ? "#2fbf71" : "#f0b93a");
      if (R.t > n * per + 0.8 && !R.done) { R.done = true; const top = steps[n - 1];
        if (top >= NEED) L.finish(true, { title: `${n} stages: ${top.toFixed(1)} km/s. Orbit!`, why: [
          "Same fuel, but dropping empty tanks makes the rest of the rocket <b>lighter</b>, so each kilogram of fuel speeds it up more.",
          `With 1 stage this rocket only reaches about <b>${dv(1)[0].toFixed(1)} km/s</b>. With 2 stages: <b>${dv(2)[1].toFixed(1)}</b>. With 3: <b>${dv(3)[2].toFixed(1)}</b>.`,
          "More stages help, but each one adds engines, cost and things that can break. Engineers pick the best balance. The Saturn V used <b>3</b>."] });
        else L.finish(false, { title: `Only ${top.toFixed(1)} km/s: not fast enough`, why: [
          "One big stage has to carry its <b>whole empty tank</b> all the way up. That dead weight eats your speed.",
          `You need about <b>${NEED} km/s</b> to reach orbit. Below that, the rocket falls back to Earth.`, "💡 What if the empty part could <b>drop off</b> on the way?"] }); }
    },
  });
  function r2Picks(L) { return K.picks([1, 2, 3].map((n) => ({ id: n, ico: ["1️⃣", "2️⃣", "3️⃣"][n - 1], name: `${n} stage${n > 1 ? "s" : ""}`, sub: n === 1 ? "One giant tank" : n === 2 ? "Drop the big tank halfway" : "Like the Saturn V" })), "r2Pick", (it) => it.id === L.st.n); }
  window.r2Pick = (n) => { const L = ACAD.L; if (L.st.run) return; SND.click(); rebuild(L, +n); K.set("r2p", r2Picks(L)); };
  window.r2Go = () => { const L = ACAD.L; if (L.st.run) return; SND.tone(80, 1.5, "sawtooth", 0.06); L.st.run = { t: 0, steps: dv(L.st.n), drop: [] }; };
})();

// ===================== Lesson 3 — The mass spiral =====================
(() => {
  const RATIO = 66, LIFT = 660, BASE = 6, GOAL = 90;
  const ITEMS = [
    { id: "rover", ico: "🚙", name: "Small rover", t: 1.0, pts: 30 }, { id: "drill", ico: "⛏️", name: "Ice drill", t: 0.6, pts: 25 },
    { id: "cam", ico: "📷", name: "HD camera", t: 0.1, pts: 15 }, { id: "seis", ico: "📈", name: "Moonquake sensor", t: 0.1, pts: 15 },
    { id: "ice", ico: "🧊", name: "Ice detector", t: 0.2, pts: 20 }, { id: "batt", ico: "🔋", name: "Extra batteries", t: 0.8, pts: 10 },
    { id: "sret", ico: "🚀", name: "Sample-return rocket", t: 3.5, pts: 50 }, { id: "armor", ico: "🛡️", name: "Heavy armour", t: 1.5, pts: 5 },
  ];
  const tot = (L) => ITEMS.filter((i) => L.st.sel[i.id]).reduce((a, i) => ({ t: a.t + i.t, pts: a.pts + i.pts }), { t: BASE, pts: 0 });
  function draw(L) {
    const st = L.st, T = tot(L), launch = T.t * RATIO, k = Math.cbrt(launch / LIFT);
    st.r.g.scale.set(k, k, k); st.over.visible = launch > LIFT;
    st.boxes.forEach((b) => (b.visible = !!st.sel[b.userData.id]));
    K.setMeter("r3M", launch / 1100, `${K.fmt(launch)} t (rocket can lift ${LIFT} t)`, launch > LIFT ? "#e05050" : "#2fbf71");
    K.setMeter("r3S", T.pts / 150, `${T.pts} points (need ${GOAL})`, T.pts >= GOAL ? "#2fbf71" : "#f0b93a");
    K.set("r3P", K.picks(ITEMS.map((i) => ({ ...i, sub: `${i.t} t on the Moon → <b>+${K.fmt(i.t * RATIO)} t</b> at launch · ${i.pts} pts` })), "r3Pick", (it) => st.sel[it.id]));
  }
  regModule({
    no: 3, track: "rockets", ico: "⚖️", title: "The mass spiral", badge: "Mass Budget Master", badgeIco: "⚖️",
    useIn: "designing every spacecraft: Apollo 11, Artemis, Moon Colony and Mission XXX",
    goal: `Pack your robot lander for <b>${GOAL}+ science points</b>, but the whole rocket must weigh no more than <b>${LIFT} t</b>. Every tonne on the Moon costs <b>${RATIO} t</b> at launch!`,
    sources: "NASA (Saturn V about 2,900 t at liftoff; Apollo 11 CSM + LM about 44 t sent to the Moon). Lander items are game examples.",
    fact: "Apollo 11: about <b>2,900 t</b> at launch to send about <b>44 t</b> to the Moon. That's about <b>66 kg of rocket for every 1 kg</b> sent!",
    see: [
      { text: "Here's the big secret of spaceflight: to carry <b>1 more kilogram</b> to the Moon, you need extra fuel…", go(L) { L.st.sel = { cam: 1 }; draw(L); } },
      { text: "…and that extra fuel is heavy too, so it needs <b>its own</b> extra fuel. And that fuel needs fuel! It spirals up. That's the <b>mass spiral</b>.", go(L) { L.st.sel = { cam: 1, rover: 1, drill: 1 }; draw(L); } },
      { text: "For Apollo, about <b>66 kg</b> of rocket at launch carried just <b>1 kg</b> to the Moon. So engineers fight for every gram!", go(L) { L.st.sel = { cam: 1, rover: 1, drill: 1, sret: 1, armor: 1 }; draw(L); } },
    ],
    build(L) {
      K.padScene(L); const r = K.rocket({ stages: 3, w: 0.55, heights: [3.6, 2.2, 1.3] }); r.g.position.y = 0.4; L.scene.add(r.g);
      const boxes = ITEMS.map((it, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.28), K.mat([0xd9a520, 0x2f6fd6, 0x2fbf71, 0xe8590c][i % 4])); b.position.set((i % 2 ? 0.2 : -0.2), 7.3 + Math.floor(i / 2) * 0.24, 0.35); b.userData.id = it.id; r.g.add(b); return b; });
      const over = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.08, 8, 48), K.basic(0xe05050)); over.position.y = 0.5; over.rotation.x = Math.PI / 2; L.scene.add(over);
      L.st = { r, boxes, over, sel: {} }; L.orbit = { target: V3(0, 5, 0), dist: 19, yaw: 0.6, pitch: 0.18, auto: 0.05 };
      L.label("📦 Your lander's science gear", () => r.g.localToWorld(V3(1.4, 7.6, 0)), "gold");
    },
    reset(L) { L.st.sel = {}; draw(L); },
    tryUI() { return `<div class="lcRow" id="r3P"></div><div class="lcRow" style="margin-top:8px;align-items:center">${K.meter("r3M", "🚀 Rocket weight at launch")}${K.meter("r3S", "🔬 Science")}<button class="btn go" onclick="r3Go()">🚀 LAUNCH</button></div>`; },
    tryStart(L) { draw(L); },
    update() {},
  });
  window.r3Pick = (id) => { const L = ACAD.L; SND.click(); L.st.sel[id] = !L.st.sel[id]; draw(L); };
  window.r3Go = () => { const L = ACAD.L, T = tot(L), launch = T.t * RATIO;
    if (launch > LIFT) return L.finish(false, { title: "Too heavy to launch!", why: [`Your lander weighs <b>${T.t.toFixed(1)} t</b>, so the rocket must weigh <b>${K.fmt(launch)} t</b>. It can only lift <b>${LIFT} t</b>.`,
      "Every tonne you land on the Moon needs about <b>66 t</b> of rocket at launch.", "💡 Which items give lots of science for very little weight?"] });
    if (T.pts < GOAL) return L.finish(false, { title: `Only ${T.pts} science points`, why: ["The rocket can fly, but the mission doesn't learn enough to be worth it.", `You still have <b>${(LIFT / RATIO - T.t).toFixed(1)} t</b> of space. Use it wisely!`] });
    L.finish(true, { title: `${T.pts} points for ${K.fmt(launch)} t. Great trade-off!`, why: [
      "You picked <b>light, clever</b> instruments. A camera or a moonquake sensor weighs almost nothing but gives lots of science.",
      "Heavy items like armour cost huge amounts of rocket for little gain. Engineers call this the <b>mass budget</b>.",
      "Real example: Apollo 11 launched about <b>2,900 t</b> to send about <b>44 t</b> toward the Moon."] });
  };
})();

// ===================== Lesson 4 — The gravity turn =====================
(() => {
  const RE = 63.71;                                    // 1 unit = 100 km
  function reset(L) { const st = L.st; Object.assign(st, { h: 0, x: 0, vx: 0, vy: 0, m: 1, t: 0, run: false, done: false }); st.trail.clear(); place(L); }
  function place(L) { const st = L.st, a = st.x / 6371000, r = RE + st.h * 1e-5;
    st.rk.position.set(Math.sin(a) * r, Math.cos(a) * r, 0);
    const p = (st.run ? st.pitch : 90) * Math.PI / 180;                 // the rocket points where you tilt it
    const dx = Math.sin(a) * Math.sin(p) + Math.cos(a) * Math.cos(p), dy = Math.cos(a) * Math.sin(p) - Math.sin(a) * Math.cos(p);
    st.rk.rotation.z = Math.atan2(-dx, dy); }
  regModule({
    no: 4, track: "rockets", ico: "↗️", title: "The gravity turn", badge: "Orbital Insertion", badgeIco: "🛰️",
    useIn: "the launch in Apollo 11, Artemis and the ISS mission",
    goal: "Fly the rocket into orbit: reach <b>150 km high</b> and <b>7.6+ km/s sideways</b>. Use the slider to tilt the rocket while it flies!",
    sources: "NASA (orbital speed about 7.8 km/s; ISS orbit about 400 km). Simple flight model made for this game.",
    fact: "Orbit needs about <b>7.8 km/s sideways</b> (28,000 km/h) · the ISS flies about <b>400 km</b> up · rockets go straight up first to leave the thick air, then tilt over.",
    see: [
      { text: "Surprise: getting <b>high</b> is the easy part. Space starts about 100 km up. The hard part is going <b>sideways fast</b>: about <b>7.8 km every second</b>!", go(L) { L.st.demo = 1; } },
      { text: "So rockets go <b>straight up</b> first, to get out of the thick air. Then they slowly <b>tilt over</b> until they fly sideways. This is the <b>gravity turn</b>.", go(L) { L.st.demo = 2; } },
      { text: "If you only go straight up, you fall straight back down. Fast enough <b>sideways</b>, and you keep falling <b>around</b> the Earth: that's an orbit!", go(L) { L.st.demo = 3; } },
    ],
    build(L) {
      K.space(L, 3000, 1.2); const earth = K.earth(RE, V3(0, 0, 0), L.scene); earth.rotation.z = Math.PI / 2; earth.userData.c.visible = false;   // launch from the green tropics; hide clouds up close
      const atm = new THREE.Mesh(new THREE.SphereGeometry(RE + 1, 96, 48), new THREE.MeshBasicMaterial({ color: 0x6fb3ff, transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false })); L.scene.add(atm);
      const rk = K.rocket({ stages: 2, w: 0.12, heights: [0.8, 0.4] }).g; L.scene.add(rk);
      const fl = K.flame(0.1, 0.5); fl.position.y = -0.1; rk.add(fl);
      const trail = K.trail(L.scene, 0xffd27a, 3000);
      const goal = K.ring(RE + 1.5, 0x2fbf71, 0.35, L.scene); goal.rotation.x = 0;
      L.st = { earth, rk, fl, trail, pitch: 90 }; reset(L);
      L.label("— 150 km: goal height", () => V3(Math.sin(0.25) * (RE + 1.5), Math.cos(0.25) * (RE + 1.5), 0), "green");
      L.label("air (most of it is in the first 10 km)", V3(-1.2, RE + 0.6, 0), "blue");
      L.orbit = { target: V3(0, RE + 1, 0), dist: 9, yaw: 0, pitch: 0.12, auto: 0 };
    },
    reset(L) { reset(L); L.st.demo = 0; },
    tryUI(L) { return `<div class="lcRow" style="align-items:center">${K.slider("r4p", "↗️ Tilt (90° = straight up, 0° = sideways)", 0, 90, 1, 90, "r4Pitch")}
      <div style="flex:1 1 260px"><div class="kv"><span>Height</span><b id="r4h">0 km</b></div><div class="kv"><span>Sideways speed</span><b id="r4vx">0.0 km/s</b></div><div class="kv"><span>Fuel</span><b id="r4f">100%</b></div></div>
      <button class="btn go" id="r4b" onclick="r4Go()">🚀 LAUNCH</button></div><h4 style="margin:6px 0 0">💡 Tip: lift off straight up, then tilt a little at a time. Be flat (0°) by about 2½ minutes.</h4>`; },
    tryStart(L) { r4Pitch(90); },
    update(L, dt) {
      const st = L.st; st.earth.userData.c.rotation.y += dt * 0.01;
      if (L.step === "see" && st.demo) { st.dt2 = (st.dt2 || 0) + dt; if (st.dt2 > 9 || !st.run) { reset(L); st.dt2 = 0; st.run = true; st.auto = st.demo; } }
      if (!st.run || st.done) { st.fl.visible = false; return; }
      if (st.auto) st.pitch = st.auto === 1 ? 90 : Math.max(0, 90 - 90 * st.t / 150);
      const steps = Math.ceil(dt * 12 / 0.25);
      for (let i = 0; i < steps && st.m > 0.065; i++) {
        const d = 0.25, p = st.pitch * Math.PI / 180, a = Math.min(4 * 9.81, 1.5 * 9.81 * (1 + st.t / 60));
        st.m -= st.m * a / 3400 * d; const R = 6371000, g = 9.81 * (R / (R + st.h)) ** 2 - st.vx * st.vx / (R + st.h);
        st.vx += a * Math.cos(p) * d; st.vy += (a * Math.sin(p) - g) * d; st.h += st.vy * d; st.x += st.vx * d; st.t += d;
        if (st.h < 9000 && st.pitch < 60 && st.t > 1 && !st.auto) return r4End(L, "air");
        if (st.h < 0) return r4End(L, "crash");
      }
      st.fl.visible = st.m > 0.065; place(L); st.trail.push(st.rk.position);
      L.orbit.target.copy(st.rk.position);
      K.set("r4h", `${K.fmt(st.h / 1000)} km`); K.set("r4vx", `${(st.vx / 1000).toFixed(2)} km/s`); K.set("r4f", `${Math.max(0, Math.round((st.m - 0.065) / 0.935 * 100))}%`);
      if (st.m <= 0.065 && !st.auto) r4End(L, "burnout");
      if (st.m <= 0.065 && st.auto) st.run = false;
    },
  });
  window.r4Pitch = (v) => { const L = ACAD.L; L.st.pitch = +v; K.set("r4pV", `${v}°`); };
  window.r4Go = () => { const L = ACAD.L; if (L.st.run) return; reset(L); L.st.auto = 0; L.st.run = true; L.st.pitch = +document.getElementById("r4p").value; SND.tone(80, 1.2, "sawtooth", 0.06); };
  function r4End(L, why) {
    const st = L.st; if (st.done) return; st.done = true; st.run = false; st.fl.visible = false;
    const h = st.h / 1000, vx = st.vx / 1000;
    if (why === "air") return L.finish(false, { title: "Tilted too soon!", why: ["Below about 10 km the air is <b>thick</b>. Flying sideways through it costs speed and can bend the rocket.", "💡 Go <b>straight up</b> first, then start tilting."] });
    if (why === "crash") return L.finish(false, { title: "The rocket fell back to Earth", why: ["You tilted so far that the rocket couldn't hold itself up against gravity.", "💡 Tilt <b>gradually</b>: a little more every few seconds."] });
    if (h >= 150 && vx >= 7.6) return L.finish(true, { title: `Orbit! ${K.fmt(h)} km high at ${vx.toFixed(2)} km/s`, why: [
      "You went up first, then turned sideways. That's the <b>gravity turn</b>, and every crewed rocket flies one.",
      "At about <b>7.8 km/s</b> sideways, the Earth curves away under you as fast as you fall. You keep falling <b>around</b> it forever: that's an orbit!",
      "Rockets launch <b>east</b> too, because the spinning Earth gives a free boost of up to about 0.46 km/s at the equator."] });
    L.finish(false, { title: vx < 7.6 ? `Only ${vx.toFixed(1)} km/s sideways` : `Too low: ${K.fmt(h)} km`, why: [
      vx < 7.6 ? "You spent too much fuel going <b>up</b>. Without enough sideways speed, you fall back down." : "You're fast, but too low: the air there would slow you down and pull you back.",
      "💡 Orbit needs about <b>7.8 km/s sideways</b> and a height above most of the air."] });
  }
})();

// ===================== Lesson 5 — Launch abort =====================
(() => {
  regModule({
    no: 5, track: "rockets", ico: "🛟", title: "Launch abort", badge: "Crew Safety", badgeIco: "🛟",
    useIn: "every crewed launch: Apollo 11, Artemis and the ISS mission",
    goal: "You're the Flight Director. Watch the alarms. Hit <b>ABORT</b> only if the rocket is really in danger, and do it <b>fast</b>!",
    sources: "NASA (Orion Launch Abort System, about 400,000 lbf abort motor; Ascent Abort-2 test, 2019); Roscosmos/NASA (Soyuz MS-10 abort, 2018, crew safe).",
    fact: "Orion's abort motor: about <b>400,000 lbf</b> of push · computers can trigger it in <b>milliseconds</b> · Soyuz MS-10 (2018): rocket failed, abort system saved both crew.",
    see: [
      { text: "On top of a crewed rocket sits a small tower: the <b>launch abort system</b>. It's a mini-rocket that can yank the capsule away in a split second.", go(L) { L.st.demo = 0; } },
      { text: "If the big rocket fails, the tower fires, pulls the crew to safety, then <b>parachutes</b> bring the capsule down gently.", go(L) { L.st.demo = 1; } },
      { text: "But not every shake is a problem! About a minute after launch, the push of the air is strongest (<b>Max-Q</b>). That's <b>normal</b>.", go(L) { L.st.demo = 0; } },
    ],
    build(L) {
      K.padScene(L); const r = K.rocket({ stages: 2, w: 0.55, heights: [4, 2] }); r.g.position.y = 0.7; L.scene.add(r.g);
      const cap = K.capsule(0.75); L.scene.add(cap); cap.visible = false;
      const chutes = [-1, 0, 1].map((k) => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 8, 0, Math.PI * 2, 0, 1.3), K.mat(k ? 0xe8590c : 0xffffff, { side: THREE.DoubleSide })); c.position.set(k * 1.1, 2.6, 0); cap.add(c); c.visible = false; return c; });
      const boom = glowSprite("rgba(255,140,40,0.95)", 8); boom.visible = false; L.scene.add(boom);
      L.st = { r, cap, chutes, boom }; L.orbit = { target: V3(0, 5, 0), dist: 17, yaw: 0.6, pitch: 0.12, auto: 0 }; this.reset(L);
    },
    reset(L) { const st = L.st; L.scene.add(st.r.g); st.r.g.visible = true; st.r.top.visible = st.r.tower.visible = true; st.r.g.position.set(0, 0.7, 0); st.cap.visible = false; st.boom.visible = false; st.chutes.forEach((c) => (c.visible = false));
      st.run = null; st.demo = 0; L.orbit.target.set(0, 5, 0);
      const real = 5 + Math.random() * 3; st.events = [{ t: real < 6.5 ? 9 : 2.5, real: false, txt: "⚠️ Rocket shaking hard: Max-Q (air push is at its strongest)" }, { t: real, real: true, txt: "🔥 ENGINE FIRE! Rocket breaking apart!" }].sort((a, b) => a.t - b.t); },
    tryUI() { return `<div class="lcRow" style="align-items:center"><div class="chips" style="flex:2 1 300px"><span class="chipS" id="r5s">🟢 Waiting for launch</span><span class="chipS" id="r5t">T+ 0 s</span></div>
      <button class="btn go" id="r5go" onclick="r5Go()">🚀 LAUNCH</button><button class="btn" style="background:#c0392b;font-size:22px" onclick="r5Abort()">🛑 ABORT</button></div>`; },
    tryStart() {},
    update(L, dt, t) {
      const st = L.st, r = st.r;
      if (L.step === "see") { st.dk = (st.dk || 0) + dt; if (st.demo && !st.run) { st.run = { t: 6, aborted: 6, demo: true }; } if (!st.demo && st.run && st.run.demo) { this.reset(L); } }
      const R = st.run; if (!R) return; R.t += dt;
      r.stages[0].userData.flame.visible = !R.aborted && !R.lost;
      if (!R.lost) { r.g.position.y = 0.7 + Math.max(0, R.t) ** 2 * 0.35; }
      if (!R.aborted && !R.lost) L.orbit.target.y = r.g.position.y + 4;
      const ev = !R.aborted && !R.lost && st.events && st.events.find((e) => !e.seen && R.t >= e.t && !R.demo);
      if (ev) { ev.seen = true; R.alarm = ev; R.alarmT = R.t; K.set("r5s", ev.txt); document.getElementById("r5s").className = "chipS " + (ev.real ? "bad" : ""); SND.tone(ev.real ? 600 : 400, 0.3, "square", 0.06); }
      if (R.alarm && R.alarm.real) r.g.position.x = Math.sin(t * 50) * 0.06;
      if (R.alarm && !R.alarm.real) r.g.position.x = Math.sin(t * 40) * 0.03;
      if (R.alarm && R.alarm.real && !R.aborted && R.t - R.alarmT > 2.5 && !R.lost) { R.lost = true; st.boom.visible = true; st.boom.position.copy(r.g.position).add(V3(0, 3, 0)); r.g.visible = false;
        setTimeout(() => L.finish(false, { title: "Too late to abort", why: ["When a rocket fails, there are only <b>seconds</b> to act. That's why real abort systems are triggered by <b>computers</b> in milliseconds.", "💡 Watch for the <b>red</b> alarm and hit ABORT right away."] }), 1200); }
      if (R.aborted) { const k = R.t - R.aborted, c = st.cap;
        if (!c.visible) { c.visible = true; c.position.copy(r.g.position).add(V3(0, r.h - 0.7, 0)); R.c0 = c.position.clone(); r.top.visible = r.tower.visible = false; }
        c.position.y = R.c0.y + Math.min(k, 2.5) * 6 - Math.max(0, k - 2.5) * 1.2; c.position.x = R.c0.x + Math.min(k, 3) * 2.5;
        st.chutes.forEach((ch) => (ch.visible = k > 2.5)); L.orbit.target.copy(c.position);
        if (!R.demo && k > 2 && !R.boomed && R.alarm && R.alarm.real) { R.boomed = true; st.boom.visible = true; st.boom.position.copy(r.g.position).add(V3(0, 3, 0)); r.g.visible = false; }
        if (R.demo && k > 7) { R.t = 6; R.aborted = 6; c.visible = false; st.chutes.forEach((ch) => (ch.visible = false)); r.top.visible = r.tower.visible = true; r.g.position.y = 0.7; }
        if (!R.demo && k > 5 && !R.done) { R.done = true;
          if (R.alarm && R.alarm.real) L.finish(true, { title: "Crew saved!", why: [`You hit ABORT <b>${(R.aborted - R.alarmT).toFixed(1)} s</b> after the fire alarm. The tower pulled the capsule away and the parachutes opened.`,
            "Orion's abort motor pushes with about <b>400,000 lbf</b>: it can pull the crew away from a failing rocket in a split second.",
            "This really happened: in <b>2018, Soyuz MS-10</b> failed 2 minutes after launch. The abort system worked and both astronauts landed safely."] });
          else L.finish(false, { title: "You aborted for nothing!", why: ["That alarm was <b>Max-Q</b>: strong shaking from the air, but completely <b>normal</b>.", "Aborting a healthy rocket ends the mission and loses a very expensive rocket.", "💡 Flight Directors must stay calm and know what's <b>normal</b> and what's <b>dangerous</b>."] }); } }
    },
  });
  window.r5Go = () => { const L = ACAD.L; if (L.st.run) return; L.st.run = { t: 0 }; SND.tone(80, 1.5, "sawtooth", 0.06); document.getElementById("r5go").disabled = true;
    const tick = setInterval(() => { if (!ACAD.L || ACAD.L !== L || !L.st.run) return clearInterval(tick); K.set("r5t", `T+ ${Math.floor(L.st.run.t)} s`);
      if (!L.st.run.aborted && !L.st.run.lost && L.st.run.t > 12 && !L.st.run.done) { L.st.run.done = true; clearInterval(tick); L.finish(false, { title: "You missed the real emergency", why: ["One alarm was a real <b>engine fire</b>. You needed to abort." ] }); } }, 200); };
  window.r5Abort = () => { const L = ACAD.L, R = L.st.run; if (!R || R.aborted || R.lost) return; R.aborted = R.t; SND.tone(200, 0.6, "sawtooth", 0.08); };
})();
