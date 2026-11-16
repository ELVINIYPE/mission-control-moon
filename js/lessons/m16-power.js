// Lesson 16 — Power: Sun and batteries. Keep a Moon base alive for one full Moon day (29.5 Earth days).
// Facts: a lunar day–night cycle is 29.5 Earth days (NASA), so the night lasts about 354 hours.
// NASA Fission Surface Power: goal of a 40 kW reactor under 6 tonnes (NASA, 2022 design contracts).
// Some ridges near the South Pole are sunlit most of the time (NASA LRO). Game estimates: batteries
// ≈ 150 kWh per tonne, solar panels ≈ 0.03 t per kW.

(() => {
  const NEED = 5, HOURS = 708, LIMIT = 8;                 // base needs 5 kW; one Moon day ≈ 708 h; lander carries 8 t of power gear
  const sunAt = (site, h) => site === "eq" ? (h < 354 ? Math.sin(Math.PI * h / 354) : 0) : (h >= 400 && h < 496 ? 0 : 0.9);
  const massOf = (c) => (c.nuke ? 6 : 0) + c.solar * 0.03 + c.batt / 150;
  function simulate(c) {
    let E = c.batt, emptyAt = null; const trace = [];
    for (let h = 0; h < HOURS; h++) {
      const gen = (c.nuke ? 40 : 0) + c.solar * sunAt(c.site, h);
      E = Math.min(c.batt, E + (gen - NEED)); if (E < 0 && emptyAt === null) emptyAt = h; E = Math.max(0, E); trace.push(E);
    }
    return { trace, emptyAt, mass: massOf(c) };
  }
  const day = (h) => (h / 24).toFixed(1);

  function build(L) {
    const s = L.scene; s.background = new THREE.Color(0x000004); starfield(s, 3500);
    s.add(new THREE.AmbientLight(0x6677aa, 0.25));
    const sunLight = new THREE.DirectionalLight(0xfff2dd, 1.15); s.add(sunLight); s.add(sunLight.target);
    const sun = glowSprite("rgba(255,235,190,1)", 9); s.add(sun);
    // ground with gentle bumps
    const gg = new THREE.PlaneGeometry(160, 160, 120, 120); gg.rotateX(-Math.PI / 2);
    const pos = gg.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z);
      pos.setY(i, d < 9 ? 0 : Math.sin(x * 0.15) * Math.cos(z * 0.12) * 1.4 + Math.sin(x * 0.05 + z * 0.07) * 2.2 * Math.min(1, (d - 9) / 20)); }
    gg.computeVertexNormals();
    const tex = moonTexture(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(10, 10);
    s.add(new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: tex, color: 0xb8b8bc, roughness: 1 })));
    const earth = new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 24), new THREE.MeshBasicMaterial({ map: earthTexture() })); earth.position.set(-30, 26, -70); s.add(earth);
    // the base: a habitat with windows
    const base = new THREE.Group(); s.add(base);
    const white = new THREE.MeshStandardMaterial({ color: 0xc9cbd0, roughness: 0.75 });
    const hab = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 4.4, 32), white); hab.rotation.z = Math.PI / 2; hab.position.y = 1.6; base.add(hab);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), white); dome.position.set(2.2, 1.6, 0); dome.rotation.z = -Math.PI / 2; base.add(dome);
    [-1, 1].forEach((sx) => [-1.2, 1.2].forEach((z) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 8), white); leg.position.set(sx * 1.5, 0.4, z * 0.8); base.add(leg); }));
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
    const wins = []; for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), winMat); w.position.set(-1.4 + i * 0.9, 1.9, 1.51); base.add(w); wins.push(w); }
    const lamp = new THREE.PointLight(0xffc070, 0.6, 7); lamp.position.set(0, 2, 3); base.add(lamp);
    // groups that change with the player's choices
    const panels = new THREE.Group(); panels.position.set(-7, 0, -1); s.add(panels);
    const batts = new THREE.Group(); batts.position.set(3.8, 0, 3.2); s.add(batts);
    const reactor = new THREE.Group(); reactor.position.set(12, 0, -8); s.add(reactor);
    const rm = new THREE.MeshStandardMaterial({ color: 0x8a8f99, metalness: 0.5, roughness: 0.4 });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 2.6, 24), rm); core.position.y = 1.3; reactor.add(core);
    for (let i = 0; i < 6; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x3a3f4a })); const a = i / 6 * Math.PI * 2; fin.position.set(Math.cos(a) * 1.4, 2.2, Math.sin(a) * 1.4); fin.rotation.y = -a; reactor.add(fin); }
    const rglow = glowSprite("rgba(120,220,255,0.6)", 3); rglow.position.y = 2.8; reactor.add(rglow);
    L.st = { sun, sunLight, earth, base, wins, winMat, lamp, panels, batts, reactor, rglow, c: { site: "eq", nuke: false, solar: 10, batt: 500 }, run: null };
    L.st.lblBase = L.label("🏠 Moon base · needs 5 kW", V3(0, 4.2, 0), "gold");
    L.st.lblSun = L.label("☀️ Sun", () => (L.st.sunUp ? sun.position : null), "gold");
    L.st.lblR = L.label("⚛️ Nuclear power plant", () => (L.st.c.nuke ? V3(12, 5, -8) : null), "blue");
    L.orbit = { target: V3(0, 1.5, 0), dist: 22, yaw: 0.5, pitch: 0.32, auto: 0.04 };
    rebuildGear(L); setSun(L, 120);
  }
  function rebuildGear(L) {
    const st = L.st, c = st.c;
    st.panels.clear(); const nP = Math.ceil(c.solar / 2);
    const cellTex = canvasTex(256, 160, (x, w, h) => { x.fillStyle = "#14285a"; x.fillRect(0, 0, w, h); x.strokeStyle = "#5a7ac8"; x.lineWidth = 2; for (let i = 0; i <= w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } for (let i = 0; i <= h; i += 32) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } });
    for (let i = 0; i < nP; i++) { const g = new THREE.Group(); g.position.set((i % 5) * -2.4, 0, Math.floor(i / 5) * 3.2);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x999999 })); mast.position.y = 1.1; g.add(mast);
      const p = new THREE.Mesh(new THREE.BoxGeometry(2, 0.05, 1.4), [0, 0, new THREE.MeshStandardMaterial({ map: cellTex, metalness: 0.4, roughness: 0.3 }), 0, 0, 0].map((m) => m || new THREE.MeshStandardMaterial({ color: 0x777777 })));
      p.position.y = 2.2; g.add(p); g.userData.p = p; st.panels.add(g); }
    st.batts.clear(); const nB = Math.ceil(c.batt / 150);
    for (let i = 0; i < nB; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0x2f3a52, roughness: 0.5 }));
      b.position.set((i % 6) * 0.95, 0.4 + Math.floor(i / 12) * 0.85, Math.floor((i % 12) / 6) * 0.95); const strip = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.1, 0.82), new THREE.MeshBasicMaterial({ color: 0x2fbf71 })); strip.position.y = 0.3; b.add(strip); st.batts.add(b); }
    st.reactor.visible = c.nuke;
  }
  function setSun(L, h) {
    const st = L.st, site = st.c.site; let el, az;
    if (site === "eq") { const k = h / 354; el = k < 1 ? Math.sin(Math.PI * k) * 1.25 : -0.4; az = k < 1 ? -Math.PI / 2 + Math.PI * k : Math.PI / 2; }
    else { el = (h >= 400 && h < 496) ? -0.15 : 0.06; az = h / HOURS * Math.PI * 2 * 1.0; }
    st.sun.position.set(Math.sin(az) * Math.cos(el) * 90, Math.sin(el) * 90 + (site === "eq" ? 0 : 3), Math.cos(az) * Math.cos(el) * 90 - 20);
    st.sunUp = el > -0.02; st.sun.visible = st.sunUp; st.sunLight.intensity = st.sunUp ? 1.15 : 0; st.sunLight.position.copy(st.sun.position);
    st.panels.children.forEach((g) => { g.rotation.y = az; const p = g.userData.p; p.rotation.x = Math.PI / 2 - Math.max(0.05, el); });
  }

  function ui(L) {
    const c = L.st.c, m = massOf(c), over = m > LIMIT;
    const btn = (k, v, ico, title, sub) => `<button class="pick ${c[k] === v ? "on" : ""}" onclick="pwrSet('${k}',${JSON.stringify(v).replace(/"/g, "'")})"><span class="pi">${ico}</span><b>${title}</b><small>${sub}</small></button>`;
    return `<div class="lcRow">
      ${btn("site", "eq", "🌕", "Equator", "Like Apollo. 2 weeks of sun, then 2 weeks of night.")}
      ${btn("site", "pole", "🧊", "South Pole ridge", "Where Artemis is going. The Sun stays low and circles round.")}
      ${btn("nuke", false, "☀️", "Solar + batteries", "Free sunlight. Batteries for the dark.")}
      ${btn("nuke", true, "⚛️", "Add a nuclear plant", "40 kW day and night. Weighs 6 t.")}
    </div>
    <div class="lcRow" style="margin-top:8px">
      <div style="flex:1 1 220px"><div class="kv"><span>☀️ Solar panels (power, kW)</span><b>${c.solar} kW</b></div><input class="slider" type="range" min="0" max="20" step="1" value="${c.solar}" oninput="pwrSet('solar',+this.value)"></div>
      <div style="flex:1 1 220px"><div class="kv"><span>🔋 Batteries (stored energy, kWh)</span><b>${c.batt} kWh</b></div><input class="slider" type="range" min="0" max="2000" step="50" value="${c.batt}" oninput="pwrSet('batt',+this.value)"></div>
      <div style="flex:1 1 220px"><div class="kv"><span>🏋️ Weight on the lander</span><b style="color:${over ? "#ff8a8a" : "#7dffb5"}">${m.toFixed(1)} t of ${LIMIT} t</b></div>
        <div class="meter"><i style="width:${Math.min(100, m / (LIMIT * 1.5) * 100)}%;background:${over ? "#e05050" : "#2fbf71"}"></i><span class="lim" style="left:${100 / 1.5}%"></span></div></div>
      <button class="btn go" style="align-self:center" onclick="pwrRun()">▶ Run one Moon day</button>
    </div>`;
  }
  window.pwrSet = (k, v) => { const L = ACAD.L; if (!L || L.st.run) return; L.st.c[k] = v; if (k !== "solar" && k !== "batt") SND.click(); rebuildGear(L); setSun(L, 120); L.ctl(ui(L)); };
  window.pwrRun = () => {
    const L = ACAD.L, st = L.st, c = st.c, r = simulate(c); SND.click();
    if (r.mass > LIMIT) {
      const need = c.site === "eq" ? 1770 : 480;
      return L.finish(false, { title: "Too heavy! The lander can't carry it", why: [
        `Your power gear weighs <b>${r.mass.toFixed(1)} t</b>, but the lander can only carry <b>${LIMIT} t</b>.`,
        c.site === "eq" ? "At the equator the night lasts about <b>354 hours</b>. 5 kW × 354 h = <b>1,770 kWh</b> of batteries. That's about <b>12 tonnes</b>!" : `Batteries are heavy: about 1 tonne for every 150 kWh. Here you need about <b>${need} kWh</b> for the dark spell.`,
        "💡 Try a place with shorter nights, or a power source that works in the dark."] });
    }
    st.run = { t: 0, r }; L.ctl(`<div class="lcRow" style="align-items:center">
      <div style="flex:2 1 260px"><div class="kv"><span id="pwDay">Day 0 of 29.5</span><b id="pwSun">☀️ Daytime</b></div><div class="meter"><i id="pwBar" style="width:100%;background:#2fbf71"></i></div><div class="kv"><span>🔋 Battery</span><b id="pwPct">100%</b></div></div>
      <div class="chips" style="flex:1 1 200px"><span class="chipS ok" id="pwBase">🏠 Base: power ON</span></div></div>`);
  };
  function update(L, dt, t) {
    const st = L.st;
    st.rglow.material.opacity = 0.5 + Math.sin(t * 3) * 0.2;
    if (!st.run) { if (L.step === "see" && st.seeAnim) { const h = (t * 30) % HOURS; setSun(L, h); lights(L, st.sunUp || st.c.nuke); } return; }
    const R = st.run; R.t += dt; const h = Math.min(HOURS - 1, Math.floor(R.t / 18 * HOURS)); setSun(L, h);
    const E = R.r.trace[h], pct = st.c.batt ? E / st.c.batt : 0, dead = R.r.emptyAt !== null && h >= R.r.emptyAt;
    lights(L, !dead);
    const $ = (id) => document.getElementById(id);
    if ($("pwDay")) { $("pwDay").textContent = `Day ${day(h)} of 29.5`; $("pwSun").textContent = st.sunUp ? "☀️ Daytime" : "🌑 Night"; $("pwBar").style.width = pct * 100 + "%"; $("pwBar").style.background = pct > 0.3 ? "#2fbf71" : pct > 0.1 ? "#f0b93a" : "#e05050"; $("pwPct").textContent = Math.round(pct * 100) + "%";
      $("pwBase").className = "chipS " + (dead ? "bad" : "ok"); $("pwBase").textContent = dead ? "🏠 Base: POWER OUT" : "🏠 Base: power ON"; }
    if (dead && !R.done) { R.done = true; setTimeout(() => endRun(L, false, R.r.emptyAt), 1200); }
    if (h >= HOURS - 1 && !R.done) { R.done = true; setTimeout(() => endRun(L, true, h), 500); }
  }
  function lights(L, on) { const st = L.st; st.winMat.color.set(on ? 0xffd27a : 0x111318); st.lamp.intensity = on ? 0.6 : 0; }
  function endRun(L, ok, h) {
    const st = L.st, c = st.c; st.run = null;
    if (ok) {
      L.finish(true, { title: c.nuke ? "Power day and night!" : "Your base survived the Moon night!", why: c.nuke ? [
        "A <b>nuclear power plant</b> doesn't need sunlight, so it works through the 2-week night.",
        "NASA is designing one for the Moon: goal <b>40 kW</b> (enough for about 30 homes), under <b>6 tonnes</b>.",
        "The catch: it's heavy and expensive, and it must be put far from the crew. Engineers always trade one thing for another!"] : [
        "Near the <b>South Pole</b>, some ridges get sunlight most of the time. The Sun just circles low around the sky.",
        "So the dark spells there last <b>days, not 2 weeks</b>, and a much smaller battery is enough.",
        "That's one big reason <b>Artemis is going to the South Pole</b> (the other is water ice in the dark craters!)."] });
    } else {
      const night = sunAt(c.site, h) === 0;
      L.finish(false, { title: `Power out on day ${day(h)}!`, why: [
        night ? `The batteries ran empty during the <b>night</b>. The base needs 5 kW <b>every hour</b>, even when it's dark.` : "The batteries ran empty in <b>daylight</b>: the panels made less than the base needed (5 kW).",
        "<b>Power</b> (kW) is how fast you use energy. <b>Energy</b> (kWh) is how much you have stored. 5 kW for 10 hours = 50 kWh.",
        c.site === "eq" ? "At the equator the night is about <b>354 hours</b> long: 5 kW × 354 h = <b>1,770 kWh</b>. That's a lot of batteries…" : "Your solar panels must run the base <b>and</b> refill the batteries before the dark spell.",
        "💡 Change where you land, how many panels or batteries you bring, or the type of power."] });
    }
  }

  regModule({
    no: 16, track: "systems", ico: "☀️", title: "Power: Sun & batteries", badge: "Power Systems", badgeIco: "🔋",
    useIn: "the Moon Colony, Artemis IV at the South Pole and every spacecraft design",
    goal: "Keep the Moon base powered (5 kW) for <b>one whole Moon day</b>. Your lander can carry only <b>8 tonnes</b> of power gear.",
    sources: "NASA (lunar day = 29.5 Earth days; Fission Surface Power project, 40 kW goal); NASA LRO (South Pole lighting). Battery and panel weights are game estimates.",
    fact: "One Moon day = <b>29.5 Earth days</b> · night at the equator ≈ <b>354 hours</b> · NASA fission power goal <b>40 kW, under 6 t</b> · batteries ≈ <b>150 kWh per tonne</b> (game estimate).",
    see: [
      { text: "One day on the Moon lasts about <b>29.5 Earth days</b>: about <b>2 weeks of sunshine</b>, then about <b>2 weeks of dark, freezing night</b>.", go(L) { L.st.seeAnim = true; L.st.c.site = "eq"; L.st.c.nuke = false; rebuildGear(L); } },
      { text: "Solar panels make power only in <b>sunlight</b>. Batteries <b>store</b> it for the night. Our base needs <b>5 kW</b> all the time, about what 4 homes use.", go(L) { L.st.seeAnim = true; } },
      { text: "<b>Power</b> (kW) = how fast you use energy. <b>Energy</b> (kWh) = how much you have stored. A 2-week night needs a <b>LOT</b> of stored energy… and batteries are heavy!", go(L) { L.st.seeAnim = false; setSun(L, 500); lights(L, true); } },
    ],
    build,
    reset(L) { L.st.run = null; L.st.seeAnim = false; Object.assign(L.st.c, { site: "eq", nuke: false, solar: 10, batt: 500 }); rebuildGear(L); setSun(L, 120); lights(L, true); },
    tryUI: ui, tryStart() {},
    update,
  });
})();
