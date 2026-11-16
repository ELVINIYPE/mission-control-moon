// Track 6 — Mission design: lessons 25–26.
// Facts: Apollo used one Saturn V (about 110 m tall) to send the CSM (≈ 28.8 t) and LM (≈ 15.1 t) to the Moon, landing near the equator (NASA).
// Artemis: SLS (≈ 98 m) sends Orion toward the Moon (SLS Block 1 can send about 27 t); a separately launched lander (Starship HLS / Blue Moon) is refuelled
// in Earth orbit; Artemis targets the South Pole; Artemis III (2027) tests docking in Earth orbit, Artemis IV is the planned landing (NASA).
// Apollo 11: 1202/1201 computer alarms during landing, "GO" call by guidance officer Steve Bales; Apollo 12 was struck by lightning at launch (NASA).

// ===================== Lesson 25 — Apollo vs Artemis =====================
(() => {
  const CARGO = [{ id: "hab", ico: "🏠", name: "Habitat (15 t)", t: 15 }, { id: "drill", ico: "⛏️", name: "Ice drill (2 t)", t: 2 }, { id: "rover", ico: "🚙", name: "Crew rover (1 t)", t: 1 }];
  function ui(L) { const st = L.st;
    return `<h4>Mission: land 4 crew + a habitat, drill and rover at the <b>South Pole</b>. Choose how to get there.</h4>
      <div class="lcRow">${K.picks([{ id: "apollo", ico: "🚀", name: "Apollo style", sub: "ONE Saturn V carries crew ship + lander + cargo" }, { id: "artemis", ico: "🛰️", name: "Artemis style", sub: "SLS launches the crew; the lander launches separately" }], "a25Arch", (it) => st.arch === it.id)}
        ${st.arch === "artemis" ? K.picks([{ id: "fuel", ico: "⛽", name: st.fuel ? "Refuel in Earth orbit: ON" : "Refuel in Earth orbit: OFF", sub: "Tankers fill the lander's tanks first" }], "a25Fuel", () => st.fuel) : ""}</div>
      <div class="lcRow" style="margin-top:8px;align-items:center">${K.meter("a25m", "🏋️ Load vs what can reach the Moon")}<button class="btn go" onclick="a25Go()">🚀 FLY THE MISSION</button></div>`; }
  function load(st) { const cargo = CARGO.reduce((a, c) => a + c.t, 0);
    if (st.arch === "apollo") return { need: 28.8 + 15.1 + cargo, cap: 44, txt: "Saturn V" };
    return { need: cargo, cap: st.fuel ? 100 : 5, txt: st.fuel ? "refuelled lander" : "lander without refuelling" }; }
  function draw(L) { const st = L.st, l = load(st); K.setMeter("a25m", l.need / 70, `${l.need.toFixed(1)} t to land · ${l.txt} can carry about ${l.cap} t`, l.need <= l.cap ? "#2fbf71" : "#e05050");
    st.apollo.visible = st.arch !== "artemis"; st.artemis.visible = st.arch !== "apollo"; }
  regModule({
    no: 25, track: "design", ico: "🏛️", title: "Apollo vs Artemis", badge: "Lunar Architect", badgeIco: "🏛️",
    useIn: "choosing your mission plan in Apollo 11, Artemis IV+ and the Moon Colony",
    goal: "Pick a mission plan that can carry a <b>Moon base</b> (18 t of cargo) to the South Pole. Then fly it.",
    sources: "NASA (Saturn V, Apollo CSM and LM masses; SLS Block 1 about 27 t to the Moon; Starship HLS refuelling; Artemis III 2027 Earth-orbit test, Artemis IV landing). Lander cargo capacities are rounded game values.",
    fact: "Saturn V: about <b>110 m</b> tall, about <b>44 t</b> sent to the Moon in one launch · SLS: about <b>98 m</b>, about <b>27 t</b> to the Moon · new landers launch separately and <b>refuel in Earth orbit</b>.",
    see: [
      { text: "<b>Apollo (1969–1972):</b> one giant Saturn V carried <b>everything</b> in one launch. Goal: <b>flags and footprints</b>, a few days near the Moon's equator.", go(L) { L.st.arch = "apollo"; draw(L); } },
      { text: "<b>Artemis (today):</b> the goal is to <b>stay</b>. The SLS rocket launches the crew in <b>Orion</b>, and a big lander launches <b>separately</b>, fills up at an orbital gas station, and meets them.", go(L) { L.st.arch = "artemis"; L.st.fuel = 1; draw(L); } },
      { text: "Artemis targets the <b>South Pole</b> for its ice, uses new <b>AxEMU suits</b> for walking into dark craters, and NASA plans the next landing on <b>Artemis IV</b>.", go(L) { L.st.arch = "both"; draw(L); } },
    ],
    build(L) {
      K.padScene(L); const ap = K.rocket({ stages: 3, w: 0.6, heights: [4.2, 2.6, 1.6] }); ap.g.position.set(-4, 0.4, 0); L.scene.add(ap.g);
      const art = new THREE.Group(); const sls = K.rocket({ stages: 2, w: 0.55, heights: [5, 1.8] }); sls.stages[0].children[0].material = K.mat(0xd8752a); art.add(sls.g);
      [-1, 1].forEach((k) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.8, 16), K.mat(0xf2f2f2)); b.position.set(k * 0.8, 2.4, 0); art.add(b); });
      const ship = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 6, 32), K.mat(0xdfe3ea, { metalness: 0.8, roughness: 0.3 })); ship.position.set(4.5, 3.4, 0); art.add(ship);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), K.mat(0xdfe3ea, { metalness: 0.8 })); nose.scale.y = 1.6; nose.position.set(4.5, 6.4, 0); art.add(nose);
      art.position.set(3, 0.4, 0); L.scene.add(art);
      L.st = { apollo: ap.g, artemis: art, arch: "both", fuel: 0 };
      L.label("🚀 Apollo: Saturn V", () => (ap.g.visible ? V3(-4, 10.6, 0) : null), "gold"); L.label("🛰️ Artemis: SLS + Orion", () => (art.visible ? V3(3, 9.6, 0) : null), "blue");
      L.label("🌙 Artemis lander (launches separately)", () => (art.visible ? V3(7.5, 8.6, 0) : null), "blue");
      L.orbit = { target: V3(1, 4.5, 0), dist: 22, yaw: 0.3, pitch: 0.1, auto: 0 };
    },
    reset(L) { L.st.arch = "apollo"; L.st.fuel = 0; draw(L); },
    tryUI(L) { return `<div id="a25u">${ui(L)}</div>`; },
    tryStart(L) { draw(L); },
    update() {},
  });
  window.a25Arch = (id) => { const L = ACAD.L; SND.click(); L.st.arch = id; K.set("a25u", ui(L)); draw(L); };
  window.a25Fuel = () => { const L = ACAD.L; SND.click(); L.st.fuel = !L.st.fuel; K.set("a25u", ui(L)); draw(L); };
  window.a25Go = () => { const L = ACAD.L, st = L.st, l = load(st);
    if (l.need <= l.cap) return L.finish(true, { title: "Split launch + refuelling = Moon base!", why: [
      "The Moon base cargo is <b>18 t</b>. One Saturn V could send about 44 t to the Moon, and most of that was the crew ship and lander themselves.",
      "Artemis <b>splits</b> the job: SLS and Orion carry the crew, while a separate, refuelled lander carries the heavy cargo.",
      "Refuelling in Earth orbit means the lander doesn't have to launch with full tanks: the gas station idea from Lesson 9!",
      "Apollo's goal was to <b>get there</b>. Artemis's goal is to <b>stay</b>: South Pole, ice, longer missions, and practice for Mars."] });
    L.finish(false, { title: st.arch === "apollo" ? "Too heavy for one Saturn V!" : "The lander can't get there without fuel", why: st.arch === "apollo" ? [
      `Crew ship (28.8 t) + lander (15.1 t) + base cargo (18 t) = <b>${l.need.toFixed(1)} t</b>. The Saturn V could send only about <b>44 t</b> to the Moon.`, "Apollo was built for short visits, not for building a base.", "💡 What if the crew and the cargo flew on <b>different</b> rockets?"] : [
      "A huge lander launched from Earth arrives in orbit with <b>almost empty tanks</b>. Without refuelling it can't carry 18 t to the Moon.", "💡 Turn on <b>refuelling in Earth orbit</b>."] }); };
})();

// ===================== Lesson 26 — Teamwork =====================
(() => {
  const ROUNDS = [
    { title: "🦅 Landing on the Moon (based on Apollo 11)", ans: "go", data: {
      cdr: "⛽ Fuel: about 60 seconds left. Tight, but enough.", eng: "🚨 Alarm 1202: the computer is overloaded, but it is still steering. Not dangerous.",
      nav: "🪨 Boulders ahead. The pilot is flying to a smoother spot.", com: "📡 Signal: strong and clear." },
      why: "This is what really happened on Apollo 11! A young guidance officer, Steve Bales, knew the <b>1202 alarm</b> was safe and called <b>GO</b>. Eagle landed." },
    { title: "🚀 Launch day", ans: "nogo", data: { cdr: "👍 Crew strapped in and ready.", eng: "🔥 Engines: all normal.", nav: "🧭 Rocket aimed and on time.", com: "⛈️ Weather: thunderstorm 10 km away, lightning likely." },
      why: "Rockets can trigger lightning as they climb. <b>Apollo 12</b> was struck twice during launch in 1969! Today's weather rules say <b>NO-GO</b> with lightning nearby." },
    { title: "☄️ Coming home", ans: "go", data: { cdr: "🛡️ Heat shield: checked, no damage.", eng: "🪂 Parachutes: armed and ready.", nav: "📐 Entry angle 6.5°: inside the safe corridor.", com: "🚢 Recovery ship: in position." },
      why: "Every station reports GO. When everything checks out, the Flight Director says GO for re-entry." },
  ];
  const ROLE_IDS = ["cdr", "eng", "nav", "com"];
  function ui(L) { const st = L.st, R = ROUNDS[st.r], seen = ROLE_IDS.every((r) => st.seen[r]);
    return `<h4>Round ${st.r + 1} of 3 · <b>${R.title}</b>. Ask each station for its report (in a team game, each player reads their own!).</h4>
      <div class="lcRow">${ROLE_IDS.map((r) => `<button class="pick ${st.seen[r] ? "on" : ""}" onclick="t26Ask('${r}')"><span class="pi">${ROLES[r].ico}</span><b>${ROLES[r].name}</b><small>${st.seen[r] ? R.data[r] : "Click to hear the report"}</small></button>`).join("")}</div>
      <div class="lcRow" style="margin-top:8px;justify-content:flex-end"><button class="btn go" ${seen ? "" : "disabled"} onclick="t26Vote('go')">✅ GO</button><button class="btn" style="background:#c0392b" ${seen ? "" : "disabled"} onclick="t26Vote('nogo')">⛔ NO-GO</button></div>`; }
  regModule({
    no: 26, track: "design", ico: "🤝", title: "Teamwork", badge: "Mission Control Team", badgeIco: "🤝",
    useIn: "every multiplayer mission: each player owns one station",
    goal: "You're the <b>Flight Director</b>. In each round, hear all 4 stations, then call <b>GO</b> or <b>NO-GO</b>. Get all 3 right!",
    sources: "NASA (Apollo 11 1202/1201 alarms and Steve Bales's GO call; Apollo 12 lightning strikes, 1969; Go/No-Go polls in Mission Control).",
    fact: "Apollo 11 landed after <b>5 computer alarms</b> (1202 and 1201) · Apollo 12 was hit by <b>lightning twice</b> during launch and still flew to the Moon · every big step needs a <b>Go/No-Go poll</b>.",
    see: [
      { text: "No one flies to the Moon alone. In <b>Mission Control</b>, each expert watches just one part of the mission: fuel, engines, navigation, radio…", go(L) { L.st.talk = 1; } },
      { text: "No single person sees everything. Before every big step, the Flight Director asks each station: <b>\"GO or NO-GO?\"</b> This is a <b>Go/No-Go poll</b>.", go(L) { L.st.talk = 2; } },
      { text: "If <b>anyone</b> finds a real danger, the answer is NO-GO. But a scary-sounding alarm isn't always dangerous: you need the <b>expert</b> to explain it.", go(L) { L.st.talk = 3; } },
    ],
    build(L) {
      const s = L.scene; s.background = new THREE.Color(0x05070f); acadLights(s, 0.9);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), K.mat(0x0c1222)); floor.rotation.x = -Math.PI / 2; s.add(floor);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), K.basic(0xffffff, { map: canvasTex(1024, 384, (x, w, h) => { x.fillStyle = "#081428"; x.fillRect(0, 0, w, h); x.strokeStyle = "#2a5a8a"; x.lineWidth = 3;
        x.beginPath(); for (let i = 0; i <= w; i += 4) x.lineTo(i, h * 0.55 - Math.sin(i / 90) * 70 - Math.sin(i / 37) * 15); x.stroke(); x.fillStyle = "#7fd4ff"; x.font = "bold 40px sans-serif"; x.fillText("MISSION CONTROL · FLIGHT", 30, 60);
        x.beginPath(); x.arc(w * 0.82, h * 0.5, 80, 0, 7); x.fillStyle = "#1b4f9c"; x.fill(); }) })); wall.position.set(0, 3.5, -4); s.add(wall);
      const crew = GAME.crew && GAME.crew.length ? GAME.crew : null;
      L.st = { astros: [], consoles: [], r: 0, seen: {}, talk: 0, score: 0 };
      ROLE_IDS.forEach((r, i) => { const x = -4.5 + i * 3; const desk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.9), K.mat(0x2a3247)); desk.position.set(x, 0.275, 0); s.add(desk);
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.6), K.basic(0x0d3a2a)); scr.position.set(x, 0.3, 0.46); scr.scale.y = 0.6; s.add(scr); L.st.consoles.push(scr);
        const c = crew && crew[i]; const a = c ? makeAstronaut({ faceTex: faceTexFrom(c.face), depthTex: genericDepthTex(), stripe: c.stripe, cdr: r === "cdr", name: `${ROLES[r].tag} ${(c.kind === "human" ? c.name : c.short || "").toUpperCase().slice(0, 9)}` }) : makeAstronaut({ visorDown: true, name: ROLES[r].tag, cdr: r === "cdr" });
        a.scale.setScalar(0.27); a.position.set(x, 3.75 * 0.27, -1.1); s.add(a); L.st.astros.push(a);
        L.label(`${ROLES[r].ico} ${ROLES[r].name}`, V3(x, 2.6, -1.1), "blue"); });
      L.orbit = { target: V3(0, 1.5, -0.5), dist: 11, yaw: 0, pitch: 0.08, auto: 0 };
    },
    reset(L) { Object.assign(L.st, { r: 0, seen: {}, score: 0, talk: 0, last: null }); },
    tryUI(L) { return `<div id="t26u">${ui(L)}</div>`; },
    tryStart() {},
    update(L, dt, t) { const st = L.st; st.astros.forEach((a, i) => { const talking = (L.step === "see" && Math.floor(t * 0.8) % 4 === i) || st.last === ROLE_IDS[i];
      a.userData.head.rotation.x = talking ? Math.sin(t * 10) * 0.08 : 0; a.userData.arms[1].rotation.z = talking ? 0.5 + Math.sin(t * 4) * 0.3 : 0.2;
      st.consoles[i].material.color.setHex(talking ? 0x1f7a52 : 0x0d3a2a); }); },
  });
  window.t26Ask = (r) => { const L = ACAD.L, st = L.st; SND.click(); st.seen[r] = true; st.last = r; acadSpeak(ROUNDS[st.r].data[r]); K.set("t26u", ui(L)); };
  window.t26Vote = (v) => { const L = ACAD.L, st = L.st, R = ROUNDS[st.r];
    if (v !== R.ans) return L.finish(false, { title: `Round ${st.r + 1}: the right call was ${R.ans === "go" ? "GO" : "NO-GO"}`, why: [R.why, R.ans === "go" ? "Every station said it was safe. Calling NO-GO would have ended the mission for nothing." : "One station reported a <b>real danger</b>. One NO-GO is enough to stop.", "💡 Listen to <b>every</b> station, then ask: is anything truly dangerous?"] });
    SND.beep(); L.toast(`✅ Correct: ${v === "go" ? "GO" : "NO-GO"}!`); st.score++;
    if (st.r < ROUNDS.length - 1) { st.r++; st.seen = {}; st.last = null; K.set("t26u", ui(L)); }
    else L.finish(true, { title: "3 out of 3: a great Flight Director!", why: ROUNDS.map((x) => x.why).concat(["In the real game, each player sits at one station and only sees their own screen. You'll have to <b>talk</b> to each other!"]) }); };
})();
