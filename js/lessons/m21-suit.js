// Lesson 21 — Build a spacesuit. A cut-away 3D suit: add the layers from the skin outward, then test it.
// Facts: NASA "Spacewalk Spacesuit Basics" (≈300 ft / 91 m of cooling tubes, up to 16 layers, −250 °F to +250 °F,
// what the backpack holds) and NASA EMU reports (4.3 psi pure oxygen).

(() => {
  const LAYERS = {
    lcvg: { name: "Cooling suit (LCVG)", ico: "💧", short: "Stretchy underwear woven with about 91 m of thin water tubes.", th: 0.05, col: 0x5aa9e6 },
    bladder: { name: "Air bladder", ico: "🎈", short: "An airtight balloon layer that holds the oxygen in.", th: 0.05, col: 0xe8a33d },
    restraint: { name: "Restraint layer", ico: "🧵", short: "Strong woven cloth that keeps the balloon in a human shape.", th: 0.05, col: 0xd9d4c4 },
    tmg: { name: "Outer shield (TMG)", ico: "🛡️", short: "Many thin shiny layers plus a tough Kevlar outer skin.", th: 0.11, col: 0xf4f4f2 },
    plss: { name: "Backpack (PLSS)", ico: "🎒", short: "Oxygen, CO₂ cleaner, cooling-water pump, battery and radio." },
  };
  const CARD_ORDER = ["tmg", "bladder", "plss", "lcvg", "restraint"];   // shuffled on purpose
  const CUT = 0.55;                                                      // the open "slice" faces the camera
  const T0 = CUT + Math.PI / 4, TL = Math.PI * 1.5;

  const texFor = (id) => {
    if (id === "lcvg") return canvasTex(512, 256, (x, w, h) => { x.fillStyle = "#cfe6f7"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "rgba(60,110,170,.35)"; x.lineWidth = 1; for (let i = 0; i < w; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 40, h); x.stroke(); }   // mesh
      x.strokeStyle = "#1f5fa8"; x.lineWidth = 5; for (let r = 0; r < 6; r++) { x.beginPath(); for (let i = 0; i <= w; i += 8) x.lineTo(i, 22 + r * 42 + Math.sin(i / 30 + r) * 12); x.stroke(); } });
    if (id === "bladder") return canvasTex(256, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#b8741e"); g.addColorStop(0.5, "#f2bd62"); g.addColorStop(1, "#b8741e"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    if (id === "restraint") return canvasTex(256, 256, (x, w, h) => { x.fillStyle = "#e6e1d2"; x.fillRect(0, 0, w, h); x.strokeStyle = "rgba(120,110,90,.35)"; x.lineWidth = 2;
      for (let i = 0; i < w; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } });
    return canvasTex(512, 256, (x, w, h) => { x.fillStyle = "#f6f6f3"; x.fillRect(0, 0, w, h); x.strokeStyle = "rgba(0,0,0,.08)"; x.lineWidth = 2;
      for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let i = 0; i < h; i += 32) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } });
  };
  // the cut edge of the outer shield shows its many shiny layers
  const tmgCutTex = () => canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < 14; i++) { x.fillStyle = i === 13 ? "#f6f6f3" : i % 2 ? "#cfd6df" : "#8e99a8"; x.fillRect(i * w / 14, 0, w / 14 + 1, h); } });

  // a thick tube with a slice cut out, so you can see inside (like a cake)
  function shell(r0, r1, h, matOut, matIn, matCut) {
    const g = new THREE.Group(), seg = 72;
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(r1, r1, h, seg, 1, true, T0, TL), matOut));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, h, seg, 1, true, T0, TL), matIn));
    [h / 2, -h / 2].forEach((y) => { const pos = [], idx = [];
      for (let i = 0; i <= seg; i++) { const a = T0 + (TL * i) / seg; pos.push(r0 * Math.sin(a), y, r0 * Math.cos(a), r1 * Math.sin(a), y, r1 * Math.cos(a)); if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); g.add(new THREE.Mesh(geo, matCut)); });
    [T0, T0 + TL].forEach((a) => { const s = Math.sin(a), c = Math.cos(a);
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute([r0 * s, -h / 2, r0 * c, r1 * s, -h / 2, r1 * c, r1 * s, h / 2, r1 * c, r0 * s, h / 2, r0 * c], 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals(); g.add(new THREE.Mesh(geo, matCut)); });
    return g;
  }

  function addLayer(L, id) {
    const st = L.st, i = st.placed.length; st.placed.push(id);
    const r0 = st.radius, d = LAYERS[id], r1 = r0 + d.th; st.radius = r1 + 0.02;
    const h = 2.7 - i * 0.28;
    const side = { side: THREE.DoubleSide, roughness: id === "bladder" ? 0.35 : 0.85 };
    const outMat = new THREE.MeshStandardMaterial({ map: texFor(id), ...side });
    const inMat = new THREE.MeshStandardMaterial({ color: d.col, ...side });
    const cutMat = new THREE.MeshStandardMaterial(id === "tmg" ? { map: tmgCutTex(), ...side, metalness: 0.4 } : { color: d.col, ...side });
    if (id === "lcvg") { outMat.emissive = new THREE.Color(0x0a3a7a); outMat.emissiveIntensity = 0; }
    const g = shell(r0, r1, h, outMat, inMat, cutMat); g.userData = { id, outMat, r0, r1, h, k: 0 }; st.suit.add(g); st.layers.push(g);
    const a = T0, ly = 1.05 - i * 0.55;                                   // labels sit on the cut edge, one under another
    g.userData.lbl = L.label(`${d.ico} ${d.name.split(" (")[0]}`, () => g.localToWorld(V3(r1 * Math.sin(a), ly, r1 * Math.cos(a))), "gold side");
    SND.tone(520 + i * 120, 0.12, "triangle", 0.08);
  }
  function addPack(L) {
    const st = L.st; st.plss = true;
    const g = new THREE.Group(), grey = new THREE.MeshStandardMaterial({ color: 0x9aa1ad, roughness: 0.5, metalness: 0.3 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.5), grey); g.add(box);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 0.55), new THREE.MeshStandardMaterial({ color: 0xe8e8e8 })); top.position.y = 0.85; g.add(top);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), grey); ant.position.set(0.4, 1.3, 0); g.add(ant);
    const back = CUT + Math.PI; g.position.set(Math.sin(back) * 1.25, 0.2, Math.cos(back) * 1.25); g.rotation.y = back;
    st.suit.add(g); st.pack = g;
    st.packLbl = L.label("🎒 Backpack (PLSS)", () => g.localToWorld(V3(0, -0.4, 0.3)), "gold");
    SND.tone(880, 0.12, "triangle", 0.08);
  }
  function clearSuit(L) {
    const st = L.st; st.layers.forEach((g) => { st.suit.remove(g); L.unlabel(g.userData.lbl); }); if (st.pack) { st.suit.remove(st.pack); L.unlabel(st.packLbl); }
    Object.assign(st, { placed: [], layers: [], radius: 0.5, plss: false, pack: null, packLbl: null, fx: null, testing: false });
    st.skin.material.color.set(0xd7a27d); st.skin.material.emissive.set(0x000000);
  }
  function cards(L) {
    const st = L.st, used = (id) => (id === "plss" ? st.plss : st.placed.includes(id));
    return `<h4>Click the parts in order, from your <b>skin</b> outward. (Tip: the backpack can go on any time.)</h4>
      <div class="lcRow">${CARD_ORDER.map((id) => { const d = LAYERS[id];
        return `<button class="pick ${used(id) ? "used" : ""}" ${used(id) || st.testing ? "disabled" : ""} onclick="suitPick('${id}')"><span class="pi">${d.ico}</span><b>${d.name}</b><small>${d.short}</small></button>`; }).join("")}</div>
      <div class="lcRow" style="margin-top:10px;justify-content:flex-end">
        <button class="btn ghost sm" ${st.testing || !(st.placed.length || st.plss) ? "disabled" : ""} onclick="suitUndo()">↶ Start over</button>
        <button class="btn go sm" ${st.testing || !st.placed.length ? "disabled" : ""} onclick="suitTest()">🧪 Test the suit</button></div>`;
  }
  window.suitPick = (id) => { const L = ACAD.L; if (!L || L.st.testing) return; id === "plss" ? addPack(L) : addLayer(L, id); L.ctl(cards(L)); };
  window.suitUndo = () => { const L = ACAD.L; SND.click(); clearSuit(L); L.ctl(cards(L)); };

  // the 5 tests: each one shows a 3D effect, then ✅ or ❌
  window.suitTest = () => {
    const L = ACAD.L, st = L.st, P = st.placed, at = (id) => P.indexOf(id);
    st.testing = true; SND.click();
    const tests = [
      { id: "air", ico: "🎈", name: "Air test", ok: at("bladder") >= 0,
        bad: "<b>Air test failed:</b> no airtight layer, so the oxygen leaks straight out into space. You need the <b>air bladder</b>." },
      { id: "shape", ico: "🧵", name: "Shape test", ok: at("bladder") >= 0 && at("restraint") > at("bladder"),
        bad: at("restraint") < 0 ? "<b>Shape test failed:</b> the air bladder puffed up like a balloon. The <b>restraint layer</b> must go around it to hold your shape."
          : "<b>Shape test failed:</b> the restraint layer must be <b>outside</b> the air bladder, to hold it in like a net." },
      { id: "heat", ico: "🔥", name: "Heat test", ok: at("lcvg") === 0 && st.plss,
        bad: at("lcvg") < 0 ? "<b>Heat test failed:</b> you overheated! Space has no air to carry body heat away, so the suit traps it like a thermos flask. You need the <b>cooling suit</b>."
          : at("lcvg") > 0 ? "<b>Heat test failed:</b> the cooling tubes must touch your <b>skin</b> to carry your body heat away. Put them first."
          : "<b>Heat test failed:</b> the cooling tubes are empty. The <b>backpack</b> pumps cold water through them." },
      { id: "rocks", ico: "☄️", name: "Space-rock test", ok: P[P.length - 1] === "tmg",
        bad: "<b>Space-rock test failed:</b> tiny space rocks (micrometeoroids) and sharp Moon dust cut through. The tough <b>outer shield</b> must be on the outside." },
      { id: "breathe", ico: "🫁", name: "Breathing test", ok: st.plss,
        bad: "<b>Breathing test failed:</b> no fresh oxygen and nothing to remove the CO₂ you breathe out. You need the <b>backpack (PLSS)</b>." },
    ];
    st.tests = tests; st.ti = -1;
    L.ctl(`<h4>Testing your suit in a vacuum chamber…</h4><div class="tests">${tests.map((t) => `<div id="tst_${t.id}">${t.ico} ${t.name}</div>`).join("")}</div>`);
    const next = () => {
      if (!ACAD.L || ACAD.L !== L) return;
      if (st.ti >= 0) { const t = tests[st.ti], el = document.getElementById("tst_" + t.id); if (el) { el.className = t.ok ? "ok" : "bad"; el.textContent = `${t.ok ? "✅" : "❌"} ${t.name}`; } t.ok ? SND.tone(990, 0.1) : SND.tone(200, 0.25, "sawtooth", 0.05); }
      st.ti++;
      if (st.ti >= tests.length) {
        st.fx = null; const failed = tests.filter((t) => !t.ok);
        setTimeout(() => {
          if (!failed.length) L.finish(true, { title: "Your suit is a tiny spaceship!",
            why: ["💧 <b>Cooling suit</b> touches your skin: cold water in about 91 m of tubes carries your body heat away.",
              "🎈 <b>Air bladder</b> holds pure oxygen at about 4.3 psi. That's less than a third of normal air pressure (14.7 psi), so your fingers can still bend.",
              "🧵 <b>Restraint layer</b> stops the balloon from puffing up and keeps a human shape.",
              "🛡️ <b>Outer shield</b>: many thin shiny layers block heat and cold, and the tough Kevlar skin stops space rocks and Moon dust.",
              "🎒 <b>Backpack (PLSS)</b>: oxygen, a CO₂ cleaner, the water pump, a battery and a radio."] });
          else L.finish(false, { title: `${failed.length} of 5 tests failed`, why: failed.map((t) => t.bad).concat(["💡 Build it from the skin outward: what must touch your body first?"]) });
        }, 700);
        return;
      }
      st.fx = { id: tests[st.ti].id, ok: tests[st.ti].ok, t: 0 };
      const el = document.getElementById("tst_" + tests[st.ti].id); if (el) el.className = "run";
      st.testTimer = setTimeout(next, 2300);
    };
    next();
  };

  window.SUIT_CUT = { LAYERS, shell, texFor, tmgCutTex, T0, CUT };   // reused by the Apollo 11+ mission (how the suit is made)
  regModule({
    no: 21, track: "humans", ico: "🧑‍🚀", title: "Build a spacesuit", badge: "EVA Suit Systems", badgeIco: "🧑‍🚀",
    useIn: "every Moon walk: Apollo 11, Artemis and the Moon Colony",
    unlock: { key: "axemu", text: "the Artemis AxEMU moon suit for your astronaut (rear-entry, dust-sealed joints)" },
    goal: "Build a suit that passes all <b>5 tests</b>: air, shape, heat, space rocks and breathing.",
    sources: "NASA, Spacewalk Spacesuit Basics; NASA EMU technical reports (ntrs.nasa.gov).",
    fact: "Up to <b>16 layers</b> · about <b>91 m (300 ft)</b> of cooling tubes · <b>4.3 psi</b> of pure oxygen · outside temperature <b>−157 °C to +121 °C</b> (−250 °F to +250 °F).",
    see: [
      { text: "On the Moon there is <b>no air</b>. In sunlight it gets to <b>+121 °C</b>, hotter than boiling water. In shadow it drops to <b>−157 °C</b>.",
        go(L) { L.st.mode = "hotcold"; } },
      { text: "So a spacesuit is really a <b>tiny spaceship shaped like you</b>. It keeps you breathing, at the right pressure and temperature.",
        go(L) { L.st.mode = "spin"; } },
      { text: "It's built in <b>layers, like an onion</b>. Each layer has <b>one job</b>. Your job: build the suit from your <b>skin outward</b>, then test it!",
        go(L) { L.st.mode = "spin"; } },
    ],
    build(L) {
      const s = L.scene; starfield(s, 3000); acadLights(s, 1.0);
      L.st = { suit: new THREE.Group(), layers: [], placed: [], radius: 0.5, plss: false, mode: "spin" };
      s.add(L.st.suit);
      const skin = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 3.1, 48), new THREE.MeshStandardMaterial({ color: 0xd7a27d, roughness: 0.7 }));
      L.st.suit.add(skin); L.st.skin = skin; L.label("🧍 Your skin", () => skin.localToWorld(V3(0, 1.7, 0)), "blue");
      // hot (sun) and cold (shadow) sides for the first slide
      const sun = glowSprite("rgba(255,200,90,0.95)", 3); sun.position.set(6, 2, -2); s.add(sun); L.st.sun = sun;
      const sunL = new THREE.PointLight(0xffb060, 0, 20); sunL.position.copy(sun.position); s.add(sunL); L.st.sunL = sunL;
      L.st.hot = L.label("☀️ +121 °C", () => (L.st.mode === "hotcold" ? V3(3.2, 1.6, 0) : null), "gold big");
      L.st.cold = L.label("🌑 −157 °C", () => (L.st.mode === "hotcold" ? V3(-3.2, 1.6, 0) : null), "blue big");
      // little space rocks for the test
      const rocks = []; for (let i = 0; i < 14; i++) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd0a0 })); r.visible = false; s.add(r); rocks.push(r); }
      L.st.rocks = rocks;
      const spark = glowSprite("rgba(255,240,180,0.9)", 0.8); spark.visible = false; s.add(spark); L.st.spark = spark;
      const air = glowSprite("rgba(120,200,255,0.6)", 2.4); air.visible = false; s.add(air); L.st.air = air;
      L.orbit = { target: V3(0, 0.1, 0), dist: 6.2, yaw: CUT, pitch: 0.32, auto: 0 };
    },
    reset(L) { clearTimeout(L.st.testTimer); clearSuit(L); L.st.mode = "build"; L.orbit.yaw = CUT; },
    tryUI(L) { return cards(L); },
    tryStart() {},
    stop(L) { clearTimeout(L.st.testTimer); },
    update(L, dt, t) {
      const st = L.st, o = L.orbit;
      if (st.mode === "spin" || st.mode === "hotcold") o.yaw = CUT + Math.sin(t * 0.5) * 0.6;
      st.sun.visible = st.mode === "hotcold" || (st.fx && st.fx.id === "heat"); st.sunL.intensity = st.sun.visible ? 2 : 0;
      // new layers slide in from big to fitted
      st.layers.forEach((g) => { const u = g.userData; u.k = Math.min(1, u.k + dt * 2.5); const e = 1 + (1 - u.k) * (1 - u.k) * 0.8;
        g.scale.set(e, 1, e); g.position.y = (1 - u.k) * 0.8; });
      // test effects
      const fx = st.fx; st.rocks.forEach((r) => (r.visible = false)); st.spark.visible = false; st.air.visible = false;
      st.layers.forEach((g) => { if (g.userData.id === "lcvg") g.userData.outMat.emissiveIntensity = 0; if (g.userData.id === "bladder" && !(fx && fx.id === "shape")) { g.scale.x = g.scale.z = Math.max(g.scale.x, 1); } });
      if (!fx) { st.skin.material.emissive.setRGB(0, 0, 0); return; }
      fx.t += dt; const k = Math.min(1, fx.t / 1.6);
      if (fx.id === "air") { st.air.visible = true; st.air.material.opacity = fx.ok ? 0.5 + Math.sin(t * 8) * 0.2 : 1 - k; st.air.scale.setScalar(fx.ok ? 2.4 : 2.4 + k * 6); }
      if (fx.id === "shape") { const b = st.layers.find((g) => g.userData.id === "bladder"); if (b && !fx.ok) { const sc = 1 + k * 0.45; b.scale.set(sc, 1 + k * 0.1, sc); } }
      if (fx.id === "heat") { const c = st.layers.find((g) => g.userData.id === "lcvg");
        if (fx.ok && c) c.userData.outMat.emissiveIntensity = 0.6 + Math.sin(t * 6) * 0.4;
        st.skin.material.emissive.setRGB(fx.ok ? 0 : k * 0.7, 0, 0); }
      if (fx.id === "rocks") { const outer = st.layers.length ? st.layers[st.layers.length - 1].userData.r1 : 0.46;
        st.rocks.forEach((r, i) => { const p = ((fx.t * 1.4 + i / st.rocks.length) % 1), y = -1 + (i % 7) * 0.33, a = CUT + 0.4;
          const stop = fx.ok ? outer : 0.3, dist = 5 - p * 5; if (dist < stop) return;
          r.visible = true; r.position.set(Math.sin(a) * dist, y, Math.cos(a) * dist); });
        st.spark.visible = Math.sin(t * 20) > 0; const a = CUT + 0.4, sr = fx.ok ? outer : 0.46; st.spark.position.set(Math.sin(a) * sr, 0.2, Math.cos(a) * sr);
        if (!fx.ok) st.skin.material.emissive.setRGB(Math.sin(t * 12) > 0 ? 0.6 : 0, 0, 0); }
      if (fx.id === "breathe") { st.air.visible = true; st.air.material.opacity = fx.ok ? 0.4 : 0.15; st.air.scale.setScalar(fx.ok ? 1.6 + Math.sin(t * 3) * 0.3 : 1.2);
        if (!fx.ok) st.skin.material.emissive.setRGB(0, 0, Math.sin(t * 6) > 0 ? 0.4 : 0); }
    },
  });
})();
