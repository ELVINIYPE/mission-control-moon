// Track 5 — Humans in space: lessons 22–24 (21 Spacesuit has its own file).
// Facts: Solar storms send fast particles that can arrive within minutes to hours; Earth's magnetic field and air protect us (NASA).
// Hydrogen-rich materials (water, food, plastic) shield better than metals; Orion crews can build a shelter from stowage bags (NASA).
// Lunar return entry ≈ 11 km/s; Apollo 11 entered at a flight-path angle of about 6.5° and peaked at about 6.5 g; Orion's heat shield faces about 2,760 °C;
// radio blackout lasted about 3 minutes for Apollo (NASA).
// Water ice exists in permanently shadowed craters near the Moon's poles (NASA LCROSS, 2009). Splitting 1 kg of water gives about 0.89 kg O₂ + 0.11 kg H₂.
// The ISS recycles about 98% of its water (NASA, 2023). One person uses about 0.84 kg of oxygen per day (NASA).

// ===================== Lesson 22 — Radiation shield =====================
(() => {
  const ITEMS = [{ id: "w1", ico: "💧", name: "Water bag", v: 5 }, { id: "w2", ico: "💧", name: "Water bag", v: 5 }, { id: "f1", ico: "🥫", name: "Food box", v: 4 }, { id: "f2", ico: "🥫", name: "Food box", v: 4 },
    { id: "c", ico: "👕", name: "Clothes bag", v: 3 }, { id: "tr", ico: "🗑️", name: "Trash bag", v: 2 }, { id: "bk", ico: "📚", name: "Books", v: 2 },
    { id: "tool", ico: "🧰", name: "Metal toolbox", v: 1 }, { id: "lap", ico: "💻", name: "Laptop", v: 1 }, { id: "cam", ico: "📷", name: "Camera", v: 1 }];
  const SLOTS = 6, NEED = 18, TIME = 30;
  function slotPos(i) { const a = i / SLOTS * Math.PI * 2; return V3(Math.cos(a) * 1.5, 0.45, Math.sin(a) * 1.5); }
  function ui(L) { const st = L.st, n = Object.keys(st.sel).filter((k) => st.sel[k]).length;
    return `<h4>Pick up to <b>${SLOTS}</b> things to pile around the crew (${n}/${SLOTS} used).</h4><div class="lcRow">${K.picks(ITEMS.map((i) => ({ ...i, sub: "" })), "h22Pick", (it) => st.sel[it.id])}</div>
      <div class="lcRow" style="margin-top:8px;align-items:center">${K.meter("h22t", "⏱️ Storm arrives in")}<button class="btn go" onclick="h22Ready()">🛡️ Shelter ready!</button></div>`; }
  function place(L) { const st = L.st; st.crates.forEach((c) => (c.visible = false)); let k = 0;
    ITEMS.forEach((it) => { if (st.sel[it.id] && k < SLOTS) { const c = st.crates[k]; c.visible = true; c.position.copy(slotPos(k)); c.material.color.set({ "💧": 0x4aa8ff, "🥫": 0xd9a520, "👕": 0x8a5cd6, "🗑️": 0x555555, "📚": 0xa0623a }[it.ico] || 0x9aa1ad); c.userData.v = it.v; k++; } }); }
  regModule({
    no: 22, track: "humans", ico: "☢️", title: "Radiation shield", badge: "Radiation Safe", badgeIco: "☢️",
    useIn: "Artemis, the Moon Colony and any trip beyond Earth's magnetic field",
    goal: `A <b>solar storm</b> is coming! In ${TIME} seconds, pile up to ${SLOTS} things around the crew to build a shelter with a shield score of <b>${NEED}+</b>.`,
    sources: "NASA (solar particle events; hydrogen-rich materials make better shields; Orion crews can build a storm shelter from stowage bags). Shield scores are game values.",
    fact: "On Earth, our <b>magnetic field and air</b> protect us · beyond them, a solar storm's particles can arrive within <b>minutes to hours</b> · <b>water and food</b> (full of hydrogen) block them better than metal.",
    see: [
      { text: "The Sun sometimes blasts out a <b>solar storm</b>: a burst of super-fast particles. On Earth our <b>magnetic field and air</b> keep us safe.", go(L) { L.st.storm = 1; } },
      { text: "Out near the Moon there's <b>no such protection</b>. The particles can pass right through the spacecraft walls and damage the crew's cells.", go(L) { L.st.storm = 1; } },
      { text: "The fix: pile up <b>heavy stuff full of hydrogen</b> (water, food) around you. Orion's crew can build a storm shelter from their stowage bags. Metal is surprisingly <b>poor</b> at this!", go(L) { L.st.storm = 1; } },
    ],
    build(L) {
      K.space(L, 3000, 1.0); const sun = K.sun(16, V3(-40, 6, 0), L.scene);
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.1, 48), K.mat(0x2a3247)); L.scene.add(floor);
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 1.4, 48, 1, true, Math.PI * 0.75, Math.PI * 1.1), K.mat(0xdddddd, { side: THREE.DoubleSide, transparent: true, opacity: 0.18, depthWrite: false })); wall.position.y = 0.7; L.scene.add(wall);
      const crew = [0, 1, 2, 3].map((i) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 12), K.mat(0xf2f2f2, { emissive: 0x000000 })); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), c.material); hd.position.y = 0.55; c.add(hd);
        c.position.set((i % 2 - 0.5) * 0.5, 0.5, (Math.floor(i / 2) - 0.5) * 0.5); L.scene.add(c); return c; });
      const crates = []; for (let i = 0; i < SLOTS; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.7), K.mat(0x4aa8ff)); c.visible = false; L.scene.add(c); crates.push(c); }
      const parts = []; for (let i = 0; i < 60; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), K.basic(0xff6040)); p.visible = false; L.scene.add(p); parts.push({ p, s: Math.random() }); }
      L.st = { crew, crates, parts, sel: {}, storm: 0 };
      L.label("👩‍🚀 Crew", V3(0, 1.4, 0), "gold"); L.label("☀️ Solar storm comes from here", V3(-8, 2.5, 0), "red");
      L.orbit = { target: V3(-2, 0.5, 0), dist: 10, yaw: 0.9, pitch: 0.55, auto: 0 };
    },
    reset(L) { Object.assign(L.st, { sel: {}, storm: 0, t: TIME, done: false, hit: false }); place(L); },
    tryUI(L) { return `<div id="h22u">${ui(L)}</div>`; },
    tryStart(L) { L.st.timer = true; },
    update(L, dt, t) {
      const st = L.st;
      if (L.step === "try" && !st.done && st.timer) { st.t -= dt; K.setMeter("h22t", st.t / TIME, `${Math.max(0, st.t).toFixed(0)} s`, st.t > 10 ? "#2fbf71" : "#e05050"); if (st.t <= 0) h22Ready(); }
      const on = st.storm || st.hit; const shield = st.crates.filter((c) => c.visible).reduce((a, c) => a + c.userData.v, 0);
      st.parts.forEach((o, i) => { o.p.visible = !!on; if (!on) return; const k = (t * 0.7 + o.s) % 1; const x = -9 + k * 9, z = (o.s - 0.5) * 3.5, y = 0.2 + (i % 5) * 0.25;
        const stop = L.step === "see" ? (L.seeI === 2 ? -1.6 : 0) : shield >= NEED ? -1.6 : shield >= 10 ? -0.8 : 0; o.p.position.set(Math.min(x, stop), y, z); o.p.visible = x < stop + 0.01 || k < 0.98; });
      const hurt = on && (L.step === "see" ? L.seeI < 2 : shield < NEED);
      st.crew.forEach((c) => c.material.emissive.setRGB(hurt && Math.sin(t * 8) > 0 ? 0.6 : 0, 0, 0));
    },
  });
  window.h22Pick = (id) => { const L = ACAD.L, st = L.st; if (st.done) return; const n = Object.keys(st.sel).filter((k) => st.sel[k]).length;
    if (!st.sel[id] && n >= SLOTS) return L.toast(`Only room for ${SLOTS} things!`, true); SND.click(); st.sel[id] = !st.sel[id]; place(L); K.set("h22u", ui(L)); };
  window.h22Ready = () => { const L = ACAD.L, st = L.st; if (st.done) return; st.done = true; st.hit = true; st.timer = false;
    const shield = st.crates.filter((c) => c.visible).reduce((a, c) => a + c.userData.v, 0), metal = ITEMS.some((i) => st.sel[i.id] && ["tool", "lap", "cam"].includes(i.id));
    setTimeout(() => {
      if (shield >= NEED) L.finish(true, { title: `Shield score ${shield}: crew protected!`, why: ["You piled <b>water and food</b> around the crew. They're full of <b>hydrogen</b>, which is great at stopping fast particles.",
        "Real Orion crews can turn their storage bags into a storm shelter in the middle of the capsule, then wait it out.", metal ? "Metal and electronics are heavy but <b>poor</b> shields: fast particles smash into metal and create even more radiation!" : "You avoided metal, which can actually make extra radiation when particles hit it."] });
      else L.finish(false, { title: `Shield score only ${shield}`, why: ["Too many particles got through to the crew.", metal ? "Metal and electronics look tough, but they're <b>poor</b> shields: particles smash into metal and create even more radiation." : "Light things like books and trash don't stop much.", "💡 The best shields are full of <b>hydrogen</b>: think water and food."] });
    }, 2500); };
})();

// ===================== Lesson 23 — Coming home (re-entry) =====================
(() => {
  const SAFE = [5.3, 7.3];
  regModule({
    no: 23, track: "humans", ico: "☄️", title: "Coming home (re-entry)", badge: "Re-entry Ace", badgeIco: "☄️",
    useIn: "the trip home in Apollo 11, Artemis and Mission XXX",
    goal: "Pick the <b>entry angle</b> for your capsule coming home from the Moon at 11 km/s. Too shallow: you skip off into space. Too steep: you burn up.",
    sources: "NASA (lunar return about 11 km/s; Apollo 11 entry angle about 6.5° and about 6.5 g; Orion heat shield about 2,760 °C; Apollo blackout about 3 minutes). Corridor simplified for the game.",
    fact: "Coming home from the Moon: about <b>11 km/s</b> (40,000 km/h) · heat shield: about <b>2,760 °C</b> · Apollo 11 entered at about <b>6.5°</b> · radio <b>blackout</b> about 3 minutes (shortened here).",
    see: [
      { text: "Coming home from the Moon, the capsule hits the air at about <b>11 km/s</b>. Squeezed air in front of it gets as hot as the Sun's surface!", go(L) { L.st.demo = 6.5; } },
      { text: "The <b>heat shield</b> slowly burns away on purpose, carrying the heat with it. The glowing gas also blocks radio: a scary <b>blackout</b>.", go(L) { L.st.demo = 6.5; } },
      { text: "The angle must be just right, like skipping a stone. Too shallow and you <b>bounce off</b> the air. Too steep and you slow down so hard the crew is crushed.", go(L) { L.st.demo = 3.5; } },
    ],
    build(L) {
      K.space(L, 3000, 1.2); const RE = 60; K.earth(RE, V3(0, -RE, 0), L.scene).rotation.z = Math.PI / 2;
      const atm = new THREE.Mesh(new THREE.SphereGeometry(RE + 2, 96, 48), new THREE.MeshBasicMaterial({ color: 0x6fb3ff, transparent: true, opacity: 0.13, side: THREE.BackSide, depthWrite: false })); atm.position.y = -RE; L.scene.add(atm);
      const cap = K.capsule(1.1); const g = new THREE.Group(); g.add(cap); cap.rotation.z = Math.PI / 2; L.scene.add(g);
      const plasma = glowSprite("rgba(255,120,40,0.95)", 3); plasma.visible = false; g.add(plasma);
      const chutes = [-1, 0, 1].map((k) => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, 1.3), K.mat(k ? 0xe8590c : 0xffffff, { side: THREE.DoubleSide })); c.position.set(k * 0.8, 1.6, 0); c.visible = false; g.add(c); return c; });
      const tr = K.trail(L.scene, 0xffa040, 2000);
      L.st = { g, cap, plasma, chutes, tr, RE, ang: 6.5 }; this.reset(L);
      L.label("🌫️ Top of the air", V3(-8, 2.4, 0), "blue"); L.st.bo = L.label("📵 BLACKOUT: no radio!", () => (L.st.black ? g.position.clone().add(V3(0, 1.6, 0)) : null), "red big");
      L.orbit = { target: V3(-12, 5, 0), dist: 20, yaw: 0, pitch: 0.12, auto: 0 };
    },
    reset(L) { const st = L.st; Object.assign(st, { run: null, demo: null, black: false }); st.tr.clear(); st.g.position.set(-20, 8, 0); st.plasma.visible = false; if (L.orbit) L.orbit.target.set(-12, 5, 0); st.chutes.forEach((c) => (c.visible = false)); },
    tryUI(L) { return `<div class="lcRow" style="align-items:center">${K.slider("h23", "📐 Entry angle (steepness)", 2, 12, 0.1, L.st.ang, "h23Set")}<div class="chips" style="flex:1 1 220px"><span class="chipS" id="h23g">Peak force: ?</span></div><button class="btn go" onclick="h23Go()">☄️ ENTER THE ATMOSPHERE</button></div>`; },
    tryStart(L) { h23Set(L.st.ang); },
    update(L, dt) {
      const st = L.st;
      if (L.step === "see" && st.demo) { if (!st.run || st.run.t > 8) { const d = st.demo; this.reset(L); st.demo = d; st.run = { t: 0, a: d }; } }
      const R = st.run; if (!R) return; R.t += dt; const a = R.a, skip = a < SAFE[0], steep = a > SAFE[1];
      // a simple drawn path: down at the chosen angle, then either skip back up, or curve down and slow
      const s = Math.min(R.t, 6), dir = V3(Math.cos(a * DEG * 3), -Math.sin(a * DEG * 3), 0);
      let p = V3(-20, 8, 0).add(dir.clone().multiplyScalar(s * 4.2));
      if (skip && R.t > 2.2) p = V3(-20, 8, 0).add(dir.clone().multiplyScalar(2.2 * 4.2)).add(V3(1, 0.35, 0).multiplyScalar((R.t - 2.2) * 5));
      if (!skip) { const k = Math.min(1, Math.max(0, (R.t - 2) / 4)); p.y = Math.max(p.y - k * k * (steep ? 1 : 3), 0.3); }
      st.g.position.copy(p); st.tr.push(p); L.orbit.target.copy(p).add(V3(2, 1, 0));
      const inAir = p.y < 2.4 && !(skip && R.t > 2.6); st.plasma.visible = inAir && R.t < 5.5; st.plasma.scale.setScalar(steep ? 5 : 3); st.black = st.plasma.visible;
      st.chutes.forEach((c) => (c.visible = !skip && !steep && R.t > 5.8));
      if (R.t > 7 && !R.done && L.step === "try") { R.done = true; const g = (1 + a * 0.85).toFixed(1);
        if (skip) L.finish(false, { title: "Skipped off the atmosphere!", why: [`At ${a.toFixed(1)}°, the capsule just grazed the air and <b>bounced back into space</b>, like a stone skipping on water.`, "With little fuel and air left, the crew could be lost in space.", "💡 Come in a bit <b>steeper</b>."] });
        else if (steep) L.finish(false, { title: `Too steep! About ${g} g`, why: [`At ${a.toFixed(1)}°, the capsule slammed into thick air. The force reached about <b>${g} times</b> body weight, and the heat shield overheated.`, "💡 Come in a bit <b>shallower</b>: Apollo used about 6.5°."] });
        else L.finish(true, { title: `Splashdown! Peak about ${g} g`, why: [`At ${a.toFixed(1)}°, you hit the narrow safe <b>corridor</b>. Apollo 11 entered at about <b>6.5°</b> and felt about <b>6.5 g</b>.`,
          "The heat shield faced about <b>2,760 °C</b> and burned away slowly on purpose, carrying the heat with it.", "During the glow, radio was <b>blacked out</b> for about 3 minutes. Then the parachutes opened and the crew splashed down."] }); }
    },
  });
  window.h23Set = (v) => { ACAD.L.st.ang = +v; K.set("h23V", `${(+v).toFixed(1)}°`); K.set("h23g", `Peak force: about ${(1 + v * 0.85).toFixed(1)} g`); };
  window.h23Go = () => { const L = ACAD.L, a = L.st.ang; L.m.reset(L); L.st.ang = a; L.st.run = { t: 0, a }; SND.tone(120, 1.5, "sawtooth", 0.05); };
})();

// ===================== Lesson 24 — Living on the Moon =====================
(() => {
  const PER = 100, KEEP = 60, BREATH = 101, FUELO = 171.4, FUELH = 28.6;   // kg water per rover trip; drink/wash top-up; O₂ for 4 people × 30 days; hopper fuel
  function calc(c) { const water = c.trips * PER, split = water * c.split / 100; const o2 = split * 0.889, h2 = split * 0.111; const keep = water - split;
    const o2Fuel = Math.max(0, o2 - BREATH); return { water, keep, o2, h2, breathOK: o2 >= BREATH, drinkOK: keep >= KEEP, fuel: Math.min(o2Fuel / FUELO, h2 / FUELH) * (FUELO + FUELH) }; }
  function hud(L) { const r = calc(L.st.c);
    K.setMeter("l24a", r.keep / 150, `${K.fmt(r.keep)} of ${KEEP} kg`, r.drinkOK ? "#2fbf71" : "#e05050");
    K.setMeter("l24b", Math.min(r.o2, BREATH) / BREATH, `${K.fmt(Math.min(r.o2, BREATH))} of ${BREATH} kg`, r.breathOK ? "#2fbf71" : "#e05050");
    K.setMeter("l24c", r.fuel / 200, `${K.fmt(r.fuel)} of 200 kg`, r.fuel >= 199.5 ? "#2fbf71" : "#f0b93a"); }
  regModule({
    no: 24, track: "humans", ico: "🧊", title: "Living on the Moon", badge: "Ice Miner", badgeIco: "🧊",
    useIn: "the Moon Colony and Artemis at the South Pole",
    goal: "4 astronauts, 30 days. Mine ice and split water so the crew has <b>60 kg of water</b>, <b>101 kg of oxygen</b> to breathe, and <b>200 kg of rocket fuel</b> for the trip home.",
    sources: "NASA (water ice in permanently shadowed craters, LCROSS 2009; about 0.84 kg O₂ per person per day; ISS recycles about 98% of its water). Electrolysis chemistry. Rover trip size is a game value.",
    fact: "1 kg of water → <b>0.89 kg oxygen + 0.11 kg hydrogen</b> · 4 people × 30 days × 0.84 kg = about <b>101 kg of oxygen</b> · hydrogen + oxygen is the same fuel the Space Shuttle and SLS core stage burn.",
    see: [
      { text: "Bringing everything from Earth is <b>hugely expensive</b>: remember the mass spiral! So Moon explorers want to <b>live off the land</b>.", go(L) { L.st.demo = 1; } },
      { text: "Deep craters near the Moon's poles never see sunlight. They're colder than −200 °C, and NASA found <b>water ice</b> hiding in them.", go(L) { L.st.demo = 1; } },
      { text: "Melt the ice for <b>drinking water</b>. Zap water with electricity and it splits into <b>oxygen</b> (to breathe) and <b>hydrogen</b>. Oxygen + hydrogen = <b>rocket fuel</b>!", go(L) { L.st.demo = 1; } },
    ],
    build(L) {
      K.space(L, 2500, 0.9); K.ground(L, 200, 0x9a9aa0);
      const crater = new THREE.Mesh(new THREE.CylinderGeometry(7, 5, 2, 48, 1, true), K.mat(0x3a3a40, { side: THREE.DoubleSide })); crater.position.set(-12, -0.9, -6); L.scene.add(crater);
      const dark = new THREE.Mesh(new THREE.CircleGeometry(5, 48), K.mat(0x14161c)); dark.rotation.x = -Math.PI / 2; dark.position.set(-12, -1.8, -6); L.scene.add(dark);
      for (let i = 0; i < 18; i++) { const ice = new THREE.Mesh(new THREE.OctahedronGeometry(0.25 + Math.random() * 0.2), K.mat(0xbfe8ff, { emissive: 0x2a6a9a, transparent: true, opacity: 0.85 })); const a = Math.random() * 6.28, r = Math.random() * 4; ice.position.set(-12 + Math.cos(a) * r, -1.6, -6 + Math.sin(a) * r); L.scene.add(ice); }
      const hab = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4, 32), K.mat(0xd8dade)); hab.rotation.z = Math.PI / 2; hab.position.set(4, 1.7, 0); L.scene.add(hab);
      const plant = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 2), K.mat(0x8a8f99, { metalness: 0.4 })); plant.position.set(0, 0.8, 3); L.scene.add(plant);
      const tanks = [0x7fd4ff, 0xffffff, 0xff9a3d].map((c, i) => { const t = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), K.mat(c, { metalness: 0.5 })); t.position.set(-1.6 + i * 1.3, 0.55, 5.3); L.scene.add(t); return t; });
      const rover = new THREE.Group(); const rb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1), K.mat(0xe8e8e8)); rb.position.y = 0.6; rover.add(rb);
      [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16), K.mat(0x333333)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.3, z); rover.add(w); });
      L.scene.add(rover);
      L.st = { rover, c: { trips: 2, split: 50 } };
      L.label("🧊 Ice in a dark crater", V3(-12, 1.2, -6), "blue"); L.label("⚡ Ice melter + water splitter", V3(0, 2.4, 3), "gold"); L.label("💧 / 🫁 / 🚀 tanks", V3(-0.3, 1.7, 5.3), "green"); L.label("🏠 Base", V3(4, 4, 0));
      L.orbit = { target: V3(-3, 0.5, 0), dist: 24, yaw: 0.5, pitch: 0.35, auto: 0 };
    },
    reset(L) { L.st.c = { trips: 2, split: 50 }; L.st.demo = 0; },
    tryUI(L) { return `<div class="lcRow" style="align-items:center">${K.slider("l24t", "🚙 Rover trips to the crater (100 kg of water each)", 1, 6, 1, L.st.c.trips, "l24Trips")}${K.slider("l24s", "⚡ Water to split into oxygen + hydrogen", 0, 100, 1, L.st.c.split, "l24Split")}</div>
      <div class="lcRow" style="margin-top:8px;align-items:center">${K.meter("l24a", "💧 Water to drink & wash")}${K.meter("l24b", "🫁 Oxygen to breathe")}${K.meter("l24c", "🚀 Rocket fuel home")}<button class="btn go" onclick="l24Go()">✅ Run the base for 30 days</button></div>`; },
    tryStart(L) { l24Trips(L.st.c.trips); l24Split(L.st.c.split); },
    update(L, dt, t) { const k = (Math.sin(t * 0.4) + 1) / 2; L.st.rover.position.set(-12 + k * 12, 0, -6 + k * 9); L.st.rover.rotation.y = Math.cos(t * 0.4) > 0 ? -0.6 : 2.5; },
  });
  window.l24Trips = (v) => { const L = ACAD.L; L.st.c.trips = +v; K.set("l24tV", `${v} trips = ${v * PER} kg water`); hud(L); };
  window.l24Split = (v) => { const L = ACAD.L; L.st.c.split = +v; K.set("l24sV", `${v}%`); hud(L); };
  window.l24Go = () => { const L = ACAD.L, c = L.st.c, r = calc(c);
    if (r.drinkOK && r.breathOK && r.fuel >= 199.5) return L.finish(true, { title: "The base lives off the land!", why: [
      `${c.trips} rover trips gave <b>${c.trips * PER} kg</b> of water. You kept <b>${K.fmt(r.keep)} kg</b> to drink and split the rest.`,
      `Splitting made <b>${K.fmt(r.o2)} kg of oxygen</b> and <b>${K.fmt(r.h2)} kg of hydrogen</b>: enough to breathe AND to fuel the hopper home.`,
      "Only 60 kg of drinking water is needed because the base recycles almost all of it, like the ISS (about <b>98%</b>).",
      "This is why NASA is heading for the <b>South Pole</b>: water ice = water, air and fuel, without hauling it from Earth."] });
    const why = []; if (!r.drinkOK) why.push(`Only <b>${K.fmt(r.keep)} kg</b> of drinking water left: the crew needs ${KEEP} kg.`); if (!r.breathOK) why.push(`Only <b>${K.fmt(r.o2)} kg</b> of oxygen: 4 people need about ${BREATH} kg for 30 days.`);
    if (r.fuel < 199.5) why.push(`Only <b>${K.fmt(r.fuel)} kg</b> of rocket fuel: the hopper home needs 200 kg.`);
    L.finish(false, { title: "The base ran short", why: why.concat(["💡 Every kilogram you split can't be drunk. More trips give more water, but take time and power. Find the balance!"]) }); };
})();
