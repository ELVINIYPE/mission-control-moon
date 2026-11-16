// 2d/bridge.js — runs the 2D flight (from the parking orbit onward) inside the 3D game.
// It sets up an Apollo-style mission, skips the 2D launch, and talks to the 3D game with postMessage:
//   → parent: {tde} when docking starts (shown in 3D), {points}, {life}, {step}, {landing}
//   ← parent: {resume} after the 3D docking + barbecue roll
(function () {
  const q = new URLSearchParams(location.search);
  Object.assign(state, { goal: "land", lander: "apollo", rocket: "sat5", path: q.get("path") || "free", les: true, water: true, crew: ["thrust", "rocket", "crater"], margin: 5, science: ["camera", "seismo", "rover", "rocks"] });
  const post = (m) => { try { parent.postMessage(Object.assign({ fl2d: true }, m), "*"); } catch (e) {} };
  // TLI: a good cutoff earns points in the 3D game
  const _cut = cutTLI; cutTLI = function () { const was = flight && flight.cutoff; _cut.apply(this, arguments); if (flight && !was && flight.cutoff === "good") post({ points: flight.moonPts || 500, why: flight.moonPts === 1000 ? "TLI with the Moon NEAR: least fuel" : flight.moonPts === 750 ? "TLI with the Moon in between" : "TLI with the Moon FAR: more fuel" }); };
  // ---------- PART C: landing method → descent → moonwalk (the 2D game's own Moon scenes) ----------
  // the Moon landing + moonwalk are played in 3D: hand over when the LM has undocked, take back after liftoff
  // arriving at the Moon: everything from LOI to lunar liftoff is played in 3D
  startCapture = function () { if (flight.handed) return; flight.handed = true; setPhase("done"); post({ moonorb: true }); };
  const _init = initSurface; initSurface = function () { _init(); flight.sf.step = "wait3d"; post({ moon3d: true }); };
  const _surf = phSurface; phSurface = function (ctx, dt) { const sf = flight.sf; if (sf && sf.step === "wait3d") { moonGround(ctx); return; } return _surf(ctx, dt); };
  // back from the 3D trip home: show the end of the trans-Earth coast (Service Module separation), then re-entry and splashdown
  window.addEventListener("message", (e) => { const m = e.data; if (!m || !m.reentry || !flight) return; flight.lives = Math.max(1, m.lives || flight.lives); showLives();
    const mm = moonAt(flight.mt); flight.tec = transferFor(mm.ang + Math.PI); flight.tec.tau = flight.tec.T * 0.16; Object.assign(flight, { teiT: 9, teiOff: true, smGone: false, fails: null, cine: null, paused: false });
    setPhase("tec"); title("🏠 Almost home"); requestAnimationFrame((t) => { flight.last = t; tick(t); }); });
  window.addEventListener("message", (e) => { const m = e.data; if (!m || !m.back || !flight) return; flight.lives = Math.max(1, m.lives || flight.lives); showLives();
    flight.sf = Object.assign(flight.sf || { prints: [], dust: [], crew: [] }, { step: "done3d", flag: true, pFlag: 1, pCov: 1, p9: 1, p8: 1 });
    flight.lmCrew = state.crew.slice(0, 2); flight.inLM = flight.lmCrew.slice(); flight.cap = flight.cap || { x: 90, y: 0, vx: 0, vy: 25, fuel: 10, fuel0: 30, trail: [], stable: 0 };
    setPhase("rdv"); title("🔗 Meeting the command module in orbit"); flight.paused = false; requestAnimationFrame((t) => { flight.last = t; tick(t); }); });
  // myth check after the flag goes up
  const _flag = doFlag; doFlag = function () { _flag(); setTimeout(() => { $("modalBox").innerHTML = `<div class="ico">🇺🇸</div><h2>Myth check: "The flag waves, so it was filmed on Earth!"</h2>
      <p class="sub" style="text-align:left">❌ <b>False.</b> The flag has a <b>rod along the top</b> to hold it out, because there's no wind on the Moon. It only moved while the astronauts were twisting the pole into the ground, and then it stopped dead: with no air, nothing slows the wobble down, but nothing keeps it moving either.</p>
      <div class="choices"><button class="btn go" onclick="closeModal()">Got it!</button></div>`; $("modal").classList.remove("hidden"); }, 2600); };
  // the whole mission is over (report screen)
  const _fin = finishFlight; finishFlight = function (ok) { post({ done: !!ok }); return _fin(ok); };
  window.addEventListener("message", (e) => { if (e.data && e.data.resume && flight) { flight.paused = false; flight.last = performance.now(); } });
  window.addEventListener("load", () => {
    screenFlight(); const f = flight; f.skip = true; try { speechSynthesis.cancel(); } catch (e) {}
    $("poll").innerHTML = ""; $("skipBtn") && $("skipBtn").classList.add("hidden");
    f.stack = f.stack.slice(2); f.lesGone = true; f.orbitStage = f.stack[0]; f.orbitStage.fill = 0.45; f.ang = -Math.PI / 2;
    f.lives = Math.max(1, +(q.get("lives") || 5)); showLives();
    setPhase("parking"); title("🌍 Parking orbit: 190 km up, 7.8 km/s"); label("🛰️ Parking orbit: engine off, falling around Earth", 140);
    // watch the 2D game and report to the 3D game
    let lives = f.lives, ph = "", orbit = false;
    setInterval(() => { const g = flight; if (!g) return;
      if (g.lives < lives) { post({ life: g.phase === "transfer" || g.phase === "parking" ? "missed the Moon (TLI)" : g.phase === "surface" ? "crashed: no parachutes on the Moon" : "Moon orbit burn" }); } lives = g.lives;
      const step = g.phase === "parking" ? 3 : g.phase === "transfer" ? (g.cine ? 5 : g.cutoff ? 6 : 4) : g.phase === "capture" && !(g.cap && g.cap.lmSep) ? 7 : 0; const key = g.phase + step;
      if (key !== ph) { ph = key; if (step) post({ step }); }
      if (g.cap && g.cap.orbiting && !orbit) { orbit = true; post({ points: 1000, why: "in orbit around the Moon" }); }
      const sf = g.sf; if (sf) {
        if (!sf.p8) { sf.p8 = 1; post({ step: 8 }); }
        if (sf.covers && !sf.pCov) { sf.pCov = 1; post({ points: 500, why: "lunar overshoes on" }); }
        if (sf.step === "out" && !sf.p9) { sf.p9 = 1; post({ step: 9 }); }
        (sf.crew || []).forEach((c) => { if (c.where === "out" && !c.pts) { c.pts = 1; post({ points: 100000, why: `${c.first}: a small step on the Moon!`, cheer: c.first }); } });
        if (sf.flag && !sf.pFlag) { sf.pFlag = 1; post({ points: 50000, why: "flag planted" }); } }
      if (["rdv", "tec", "ret", "splash"].includes(g.phase) && !g.p10) { g.p10 = 1; post({ step: 10 }); } }, 400);
  });
})();
