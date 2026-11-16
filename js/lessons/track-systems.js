// Track 4 — Spacecraft systems: lessons 18–20 (16 Power and 17 Comms have their own files).
// Facts: NASA's Deep Space Network has 3 sites about 120° apart (Goldstone USA, Madrid Spain, Canberra Australia), so a spacecraft is always in view of one.
// Spacecraft use multi-layer insulation (MLI), radiators and heaters; Apollo used a slow "barbecue roll" (Passive Thermal Control) (NASA).
// Apollo 13 (1970): CO₂ built up in the lunar module; the crew built an adapter from plastic bags, cardboard, duct tape, suit hoses and a sock (NASA).
// A person uses about 0.84 kg of oxygen per day (NASA).

// ===================== Lesson 18 — Data budget =====================
(() => {
  const CAP = 3.0;                                                 // GB in one 20-minute pass at 20 Mbit/s
  const ITEMS = [
    { id: "health", ico: "❤️", name: "Health check", gb: 0.01, pts: 0, must: true }, { id: "video", ico: "🎬", name: "Landing video", gb: 2.5, pts: 40 },
    { id: "photos", ico: "📷", name: "100 photos", gb: 1.2, pts: 35 }, { id: "ice", ico: "🧊", name: "Ice detector readings", gb: 0.3, pts: 40 },
    { id: "map", ico: "🗺️", name: "3D map of the crater", gb: 1.4, pts: 30 }, { id: "wx", ico: "🌡️", name: "Temperature log", gb: 0.1, pts: 10 },
  ];
  function ui(L) { const st = L.st, used = st.order.reduce((a, id) => a + ITEMS.find((i) => i.id === id).gb, 0);
    return `<h4>Click files in the order you want to send them (1 = first). The pass ends after <b>${CAP} GB</b>.</h4><div class="lcRow">${ITEMS.map((i) => { const n = st.order.indexOf(i.id);
      return `<button class="pick ${n >= 0 ? "on" : ""}" onclick="d18Pick('${i.id}')"><span class="pi">${n >= 0 ? `<b style="color:var(--gold)">${n + 1}</b>` : i.ico}</span><b>${i.name}</b><small>${i.gb >= 1 ? i.gb + " GB" : i.gb * 1000 + " MB"} · ${i.must ? "tells Earth the spacecraft is OK" : i.pts + " science pts"}</small></button>`; }).join("")}</div>
      <div class="lcRow" style="margin-top:8px;align-items:center">${K.meter("d18m", "📦 Planned")}<button class="btn go" onclick="d18Send()">📡 START EARTH PASS</button></div>`; }
  regModule({
    no: 18, track: "systems", ico: "💾", title: "Data budget", badge: "Data Manager", badgeIco: "💾",
    useIn: "Take Pictures, the Moon Colony and Mission XXX",
    goal: `Your orbiter has one <b>20-minute</b> radio pass to Earth: room for <b>${CAP} GB</b>. Send the health check plus <b>90+ science points</b>. Order matters!`,
    sources: "NASA (Deep Space Network: Goldstone, Madrid, Canberra). File sizes and data rate are game examples.",
    fact: "20 minutes × 20 Mbit/s = 24,000 Mbit = <b>3 GB</b> (8 bits = 1 byte) · NASA's <b>Deep Space Network</b> has giant dishes in California, Spain and Australia, about 120° apart, so one can always see your spacecraft.",
    see: [
      { text: "Spacecraft collect <b>more data than they can send</b>. A camera fills memory fast, but the radio link to Earth is slow and only open for part of the time.", go(L) { L.st.demo = 1; } },
      { text: "NASA listens with giant dishes in <b>California, Spain and Australia</b>: the <b>Deep Space Network</b>. As Earth turns, one of them can always see your spacecraft.", go(L) { L.st.demo = 1; } },
      { text: "So engineers make a <b>data budget</b>: what goes first, what waits, and what never gets sent. The most important file is always the <b>health check</b>!", go(L) { L.st.demo = 1; } },
    ],
    build(L) {
      K.space(L, 3000, 1.2); const moon = K.moon(3, V3(4, -4, 0), L.scene); const earth = K.earth(4, V3(-16, 2, -6), L.scene);
      const dishes = [0, 120, 240].map((d, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, 1.2), K.mat(0xffffff, { side: THREE.DoubleSide })); const a = d * DEG;
        m.position.set(Math.cos(a) * 4, 0, Math.sin(a) * 4); m.quaternion.setFromUnitVectors(V3(0, 1, 0), m.position.clone().normalize()); earth.userData.e.add(m); return m; });
      const sat = new THREE.Group(); sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), K.mat(0xd9a520, { metalness: 0.6 }))); [-1, 1].forEach((k) => { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.45), K.mat(0x1f3c88)); p.position.x = k * 0.85; sat.add(p); }); sat.position.set(1, 0, 0); L.scene.add(sat);
      const pk = []; for (let i = 0; i < 14; i++) { const s = glowSprite("rgba(127,212,255,0.9)", 0.45); s.visible = false; L.scene.add(s); pk.push(s); }
      L.st = { earth, sat, pk, dishes, order: [] }; L.label("🛰️ Orbiter", () => sat.position.clone().add(V3(0, 0.9, 0)), "gold"); L.label("📡 Deep Space Network dishes on Earth", earth.position.clone().add(V3(0, 5, 0)), "blue");
      L.orbit = { target: V3(-6, 0, -2), dist: 26, yaw: 0.2, pitch: 0.3, auto: 0 };
    },
    reset(L) { L.st.order = []; L.st.send = null; L.st.demo = 0; },
    tryUI(L) { return `<div id="d18u">${ui(L)}</div>`; },
    tryStart(L) { d18Draw(L); },
    update(L, dt, t) {
      const st = L.st; st.earth.userData.e.rotation.y += dt * 0.25; st.sat.position.set(1 + Math.sin(t * 0.3) * 0.5, Math.sin(t * 0.5) * 0.3, 0);
      const flowing = (L.step === "see" && st.demo) || (st.send && !st.send.done);
      const E = st.earth.position.clone(), S = st.sat.position;
      st.pk.forEach((p, i) => { p.visible = flowing; if (flowing) p.position.lerpVectors(S, E, ((t * 0.6 + i / st.pk.length) % 1)); });
      if (!st.send || st.send.done) return; const s = st.send; s.t += dt; const sent = Math.min(CAP, s.t / 8 * CAP);
      K.setMeter("d18m", sent / CAP, `${sent.toFixed(2)} of ${CAP} GB sent`, "#7fd4ff");
      if (s.t >= 8) { s.done = true; d18Result(L); }
    },
  });
  function d18Draw(L) { const used = L.st.order.reduce((a, id) => a + ITEMS.find((i) => i.id === id).gb, 0); K.setMeter("d18m", used / 4.5, `${used.toFixed(2)} GB planned (room for ${CAP} GB)`, used > CAP ? "#e05050" : "#2fbf71"); }
  window.d18Pick = (id) => { const L = ACAD.L, o = L.st.order; if (L.st.send) return; SND.click(); const i = o.indexOf(id); i >= 0 ? o.splice(i, 1) : o.push(id); K.set("d18u", ui(L)); d18Draw(L); };
  window.d18Send = () => { const L = ACAD.L; if (L.st.send || !L.st.order.length) return; SND.beep(); L.st.send = { t: 0 }; };
  function d18Result(L) {
    let used = 0; const got = [], lost = []; L.st.order.forEach((id) => { const it = ITEMS.find((i) => i.id === id); if (used + it.gb <= CAP + 1e-9) { used += it.gb; got.push(it); } else lost.push(it); });
    const pts = got.reduce((a, i) => a + i.pts, 0), health = got.some((i) => i.must);
    if (health && pts >= 90) return L.finish(true, { title: `${pts} science points sent, and the spacecraft is healthy!`, why: [
      "You sent the tiny <b>health check</b> early: Mission Control always needs to know the spacecraft is OK before anything else.",
      `You fit <b>${used.toFixed(2)} GB</b> into a <b>${CAP} GB</b> pass by choosing files with lots of science per gigabyte (like the ice readings: 40 points in just 0.3 GB!).`,
      "Real missions do this every day. Big files like videos often wait for a later pass."] });
    L.finish(false, { title: !health ? "No health check: is the spacecraft OK?" : `Only ${pts} science points got home`, why: [
      !health ? "Without the tiny <b>health check</b> file, Mission Control can't tell if the spacecraft is working. Always send it first!" : "Some big files used up your pass and left no room for others.",
      lost.length ? `These didn't fit before the pass ended: <b>${lost.map((i) => i.name).join(", ")}</b>.` : `You only planned ${used.toFixed(2)} GB, with room to spare.`,
      "💡 Put the most important, smallest files <b>first</b>. Look for the best <b>science per gigabyte</b>."] });
  }
})();

// ===================== Lesson 19 — Hot and cold =====================
(() => {
  const OPTS = [{ id: "mli", ico: "🟡", name: "Gold insulation blanket", sub: "Many thin shiny layers: slows heat in AND out" }, { id: "rad", ico: "⬜", name: "White radiator", sub: "Throws extra heat out into space" },
                { id: "heat", ico: "🔥", name: "Electric heaters", sub: "Warm the cold parts (uses power)" }, { id: "roll", ico: "🍖", name: "Barbecue roll", sub: "Slowly spin so no side cooks or freezes" }];
  function temps(o) { let hot = 120, cold = -100, sh = -150;
    if (o.mli) { hot -= 70; cold += 70; sh += 120; } if (o.rad) { hot -= 25; cold -= 5; sh -= 10; } if (o.heat) { cold += 30; sh += 45; }
    if (o.roll) { const a = (hot + cold) / 2; hot = cold = a; } return { hot, cold, sh }; }
  const okT = (x) => x >= 0 && x <= 40;
  function ui(L) { return `<div class="lcRow">${K.picks(OPTS, "t19Pick", (it) => L.st.o[it.id])}</div><div class="lcRow" style="margin-top:8px;align-items:center"><div class="chips" style="flex:2 1 300px"><span class="chipS" id="t19a">☀️ Sunny side: ?</span><span class="chipS" id="t19b">🌑 Dark side: ?</span><span class="chipS" id="t19c">🌘 In shadow: ?</span></div><button class="btn go" onclick="t19Go()">🧪 TEST A FULL ORBIT</button></div>`; }
  regModule({
    no: 19, track: "systems", ico: "🌡️", title: "Hot and cold", badge: "Thermal Engineer", badgeIco: "🌡️",
    useIn: "every spacecraft design, and surviving the Moon night in the Moon Colony",
    goal: "Keep the electronics between <b>0 °C and 40 °C</b> on the sunny side, the dark side AND in shadow. Pick your thermal tools, then test.",
    sources: "NASA (multi-layer insulation, radiators, heaters; Apollo Passive Thermal Control 'barbecue roll'). Temperatures are simplified game values.",
    fact: "In sunlight a surface can pass <b>+120 °C</b>; in shadow it can fall below <b>−150 °C</b> · most electronics like about <b>0–40 °C</b> · Apollo rolled about <b>3 times an hour</b> on the way to the Moon.",
    see: [
      { text: "In space there's no air to spread heat around. The side facing the Sun <b>bakes</b>, while the other side <b>freezes</b>, at the same time!", go(L) { L.st.o = {}; t19Show(L); } },
      { text: "Engineers wrap spacecraft in shiny <b>gold or silver blankets</b> made of many thin layers. They work like a thermos flask.", go(L) { L.st.o = { mli: 1 }; t19Show(L); } },
      { text: "<b>Radiators</b> throw extra heat away, <b>heaters</b> warm cold parts, and Apollo did a slow <b>barbecue roll</b> so no side stayed in the Sun too long.", go(L) { L.st.o = { mli: 1, heat: 1, roll: 1 }; t19Show(L); } },
    ],
    build(L) {
      K.space(L, 3000, 0.25); const sun = K.sun(14, V3(-30, 4, 0), L.scene);
      const foil = canvasTex(256, 256, (x, w, h) => { x.fillStyle = "#c99a2e"; x.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${Math.random() > 0.5 ? "255,230,150" : "120,80,10"},${Math.random() * 0.35})`; x.beginPath(); x.moveTo(Math.random() * w, Math.random() * h); x.lineTo(Math.random() * w, Math.random() * h); x.lineTo(Math.random() * w, Math.random() * h); x.fill(); } });
      const craft = new THREE.Group(); L.scene.add(craft);
      const body = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), [0, 1, 2, 3, 4, 5].map(() => K.mat(0x999999, { metalness: 0.4 }))); craft.add(body);
      const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.08, 2.08, 2.08), K.mat(0xffffff, { map: foil, metalness: 0.8, roughness: 0.35 })); craft.add(blanket);
      const rad = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.8, 3), K.mat(0xf6f6f6)); rad.position.set(1.4, 0, 0); craft.add(rad);
      const heat = glowSprite("rgba(255,80,40,0.8)", 3); craft.add(heat);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 8, 0, Math.PI * 2, 0, 1.1), K.mat(0xffffff, { side: THREE.DoubleSide })); dish.position.y = 1.4; craft.add(dish);
      const moon = K.moon(5, V3(-14, 0, 30), L.scene);
      L.st = { craft, body, blanket, rad, heat, moon, sun, o: {} }; t19Show(L);
      L.label("☀️ Sun", sun.position.clone().add(V3(0, 4, 0)), "gold");
      L.orbit = { target: V3(-3, 0, 0), dist: 13, yaw: 0.5, pitch: 0.25, auto: 0 };
    },
    reset(L) { L.st.o = {}; L.st.run = null; t19Show(L); },
    tryUI(L) { return `<div id="t19u">${ui(L)}</div>`; },
    tryStart(L) { t19Show(L); },
    update(L, dt, t) {
      const st = L.st, o = st.o; let phase = "sun";
      if (st.run) { st.run.t += dt; phase = st.run.t < 4 ? "sun" : st.run.t < 8 ? "shadow" : "done"; if (phase === "done" && !st.run.done) { st.run.done = true; t19Result(L); } }
      st.moon.position.z = phase === "shadow" ? 0 : 30; st.moon.position.x = phase === "shadow" ? -14 : -14;
      st.craft.rotation.y = o.roll ? t * 0.8 : 0.4;
      const T = temps(o), mats = st.body.material;
      const col = (x) => new THREE.Color().setHSL(x > 40 ? 0 : x < 0 ? 0.6 : 0.33, 0.8, 0.45);
      st.blanket.visible = !!o.mli; st.rad.visible = !!o.rad; st.heat.visible = !!o.heat; st.heat.material.opacity = 0.4 + Math.sin(t * 4) * 0.2;
      mats.forEach((m, i) => { const v = phase === "shadow" ? T.sh : (i === 1 ? T.hot : T.cold); m.emissive = col(v); m.emissiveIntensity = 0.5; });
    },
  });
  function t19Show(L) { const T = temps(L.st.o);
    const c = (id, lbl, v) => { K.set(id, `${lbl}: ${Math.round(v)} °C ${okT(v) ? "✅" : v > 40 ? "🔥" : "🧊"}`); const e = document.getElementById(id); if (e) e.className = "chipS " + (okT(v) ? "ok" : "bad"); };
    c("t19a", "☀️ Sunny side", T.hot); c("t19b", "🌑 Dark side", T.cold); c("t19c", "🌘 In shadow", T.sh); }
  window.t19Pick = (id) => { const L = ACAD.L; if (L.st.run) return; SND.click(); L.st.o[id] = !L.st.o[id]; K.set("t19u", ui(L)); t19Show(L); };
  window.t19Go = () => { const L = ACAD.L; if (L.st.run) return; L.st.run = { t: 0 }; SND.click(); L.toast("☀️ Flying in sunlight… then into the Moon's shadow"); };
  function t19Result(L) { const o = L.st.o, T = temps(o); L.st.run = null;
    if (okT(T.hot) && okT(T.cold) && okT(T.sh)) return L.finish(true, { title: "Comfortable all the way round!", why: [
      "🟡 The <b>blanket</b> stopped the Sun cooking one side and stopped heat leaking away in the shadow.", o.heat ? "🔥 <b>Heaters</b> kept the cold parts warm (that's why spacecraft need extra power)." : "",
      o.roll ? "🍖 The <b>barbecue roll</b> shared the Sun's heat evenly, exactly like Apollo on the way to the Moon." : "", "Thermal engineers balance heat coming in and heat going out. Too much either way breaks the electronics."].filter(Boolean) });
    const bad = []; if (T.hot > 40) bad.push(`The sunny side reached <b>${Math.round(T.hot)} °C</b>: the electronics overheated.`); if (T.cold < 0) bad.push(`The dark side dropped to <b>${Math.round(T.cold)} °C</b>: batteries and fuel lines froze.`);
    if (T.sh < 0) bad.push(`In the shadow it fell to <b>${Math.round(T.sh)} °C</b>. Without sunlight, heat leaks away fast.`); if (T.sh > 40) bad.push(`In the shadow it stayed at <b>${Math.round(T.sh)} °C</b>, too hot.`);
    L.finish(false, { title: "The electronics didn't survive", why: bad.concat(["💡 You need to slow heat flow, share the Sun's heat around, and warm the cold parts."]) }); }
})();

// ===================== Lesson 20 — Life support =====================
(() => {
  const PARTS = [{ id: "bag", ico: "🛍️", name: "Plastic bags", ok: 1 }, { id: "card", ico: "📄", name: "Cardboard flight-plan cover", ok: 1 }, { id: "tape", ico: "🩹", name: "Duct tape", ok: 1 },
    { id: "hose", ico: "🌀", name: "Spacesuit hose", ok: 1 }, { id: "sock", ico: "🧦", name: "A sock", ok: 1 }, { id: "torch", ico: "🔦", name: "Flashlight", ok: 0 },
    { id: "food", ico: "🍫", name: "Food packet", ok: 0 }, { id: "cam", ico: "📸", name: "Camera", ok: 0 }, { id: "pen", ico: "🖊️", name: "Pen", ok: 0 }];
  function ui(L) { return `<h4>Build an adapter so the <b>square</b> filter fits the <b>round</b> hole. Pick the right parts (there are 5), then test it.</h4>
    <div class="lcRow">${K.picks(PARTS.map((p) => ({ ...p, sub: "" })), "l20Pick", (it) => L.st.sel[it.id])}</div>
    <div class="lcRow" style="margin-top:8px;align-items:center">${K.meter("l20m", "😮‍💨 CO₂ in the cabin")}<button class="btn go" onclick="l20Test()">🔧 Fit the adapter</button></div>`; }
  regModule({
    no: 20, track: "systems", ico: "🫁", title: "Life support", badge: "Life Support Hero", badgeIco: "🫁",
    useIn: "every crewed flight: Apollo 11, Artemis and the Moon Colony",
    goal: "It's <b>Apollo 13</b>. The crew is hiding in the lander and CO₂ is rising. Build the famous adapter <b>before CO₂ gets dangerous</b>!",
    sources: "NASA (Apollo 13 lithium hydroxide adapter: bags, cardboard, duct tape, suit hoses and a sock; oxygen use about 0.84 kg per person per day).",
    fact: "Each person breathes in about <b>0.84 kg of oxygen</b> a day and breathes out about <b>1 kg of CO₂</b> · CO₂ is soaked up by <b>lithium hydroxide</b> filters · Apollo 13's command module filters were <b>square</b>, the lander's were <b>round</b>.",
    see: [
      { text: "Every breath uses <b>oxygen</b> and makes <b>carbon dioxide (CO₂)</b>. In a tiny cabin, CO₂ builds up fast and makes people sick, then unconscious.", go(L) { L.st.demo = 1; } },
      { text: "Spacecraft clean the air with <b>filters</b> that soak up CO₂. In 1970, an explosion crippled <b>Apollo 13</b>, and 3 astronauts had to live in the small lunar lander.", go(L) { L.st.demo = 1; } },
      { text: "The lander's filters couldn't keep up, and the spare filters from the command module were <b>square</b>, but the hole was <b>round</b>! Engineers on Earth had to invent a fix from things on board.", go(L) { L.st.demo = 1; } },
    ],
    build(L) {
      K.space(L, 3000, 1.2); K.earth(6, V3(-45, -12, -50), L.scene);
      const lm = K.lander(1.2); lm.position.set(0, -1.2, 0); L.scene.add(lm);
      const cm = K.capsule(1.6); cm.rotation.x = Math.PI; cm.position.set(0, 2.6, 0); L.scene.add(cm);
      const sm = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.6, 24), K.mat(0xcfd3da, { metalness: 0.5 })); sm.position.set(0, 4.9, 0); L.scene.add(sm);
      const hole = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.06), K.mat(0x222222)); hole.position.set(0, 4.9, 0.81); L.scene.add(hole);
      const fog = glowSprite("rgba(255,200,60,0.5)", 4); fog.position.set(0, 0.2, 0.9); L.scene.add(fog);
      const filt = new THREE.Group(); const sq = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), K.mat(0x6a7a8a)); filt.add(sq); const rnd = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 24), K.mat(0x444444)); rnd.position.y = -0.7; filt.add(rnd);
      const adapter = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 4, 1, true), K.mat(0xdddddd, { transparent: true, opacity: 0.8, side: THREE.DoubleSide })); adapter.position.y = -0.35; adapter.visible = false; filt.add(adapter);
      filt.position.set(3, 0, 1); L.scene.add(filt);
      L.st = { fog, filt, adapter, sel: {} }; L.label("⬛ Square filter", () => filt.position.clone().add(V3(0, 0.9, 0)), "gold"); L.label("⚪ Round hole in the lander", V3(1.4, -0.4, 1), "blue");
      L.orbit = { target: V3(1, 1.6, 0), dist: 15, yaw: 0.5, pitch: 0.15, auto: 0 };
    },
    reset(L) { Object.assign(L.st, { sel: {}, co2: 0.35, done: false, fixed: false, demo: 0 }); L.st.adapter.visible = false; },
    tryUI(L) { return `<div id="l20u">${ui(L)}</div>`; },
    tryStart(L) { l20Meter(L); },
    update(L, dt, t) {
      const st = L.st; st.filt.rotation.y = t * 0.5; st.fog.material.opacity = Math.min(0.9, (st.co2 || 0.3) * 0.9);
      if (L.step !== "try" || st.done) return;
      st.co2 += dt * (st.fixed ? -0.03 : 0.012); l20Meter(L);
      if (st.co2 >= 1) { st.done = true; L.finish(false, { title: "CO₂ reached a dangerous level", why: ["The crew started getting headaches and confused. CO₂ builds up quickly in a small space.", "💡 Think like the Apollo 13 engineers: something to <b>seal</b>, something <b>stiff</b> for shape, something to <b>stick</b> it all, a <b>tube</b> for air, and something to <b>plug a gap</b>."] }); }
      if (st.fixed && st.co2 <= 0.25) { st.done = true; L.finish(true, { title: "The air is clean again. Crew saved!", why: [
        "Your adapter used <b>plastic bags, cardboard, duct tape, a spacesuit hose and a sock</b>: exactly what the real Apollo 13 crew built in April 1970.",
        "Engineers on Earth invented it with only the items they knew were on board, then read the steps to the crew by radio.",
        "Lesson for every mission: plan for <b>CO₂ removal</b> as carefully as oxygen. Today the ISS removes CO₂ with machines that can run for years."] }); }
    },
  });
  function l20Meter(L) { const c = L.st.co2; K.setMeter("l20m", c, c < 0.5 ? "OK" : c < 0.8 ? "⚠️ Rising: headaches soon" : "🚨 DANGER", c < 0.5 ? "#2fbf71" : c < 0.8 ? "#f0b93a" : "#e05050"); }
  window.l20Pick = (id) => { const L = ACAD.L; if (L.st.fixed) return; SND.click(); L.st.sel[id] = !L.st.sel[id]; K.set("l20u", ui(L)); l20Meter(L); };
  window.l20Test = () => { const L = ACAD.L, st = L.st; if (st.fixed || st.done) return;
    const wrong = PARTS.filter((p) => st.sel[p.id] && !p.ok), missing = PARTS.filter((p) => !st.sel[p.id] && p.ok);
    if (!wrong.length && !missing.length) { st.fixed = true; st.adapter.visible = true; SND.beep(); L.toast("✅ It fits! Air is flowing through the filter."); return; }
    st.co2 += 0.08; SND.tone(200, 0.3, "sawtooth", 0.05);
    L.toast(wrong.length ? `❌ The ${wrong[0].name.toLowerCase()} doesn't help seal the air. Wasted time!` : `❌ Air is leaking: you're missing ${missing.length} part${missing.length > 1 ? "s" : ""}.`, true); };
})();
