// intro.js — PART 1: the opening screen. Space, Earth, Moon, a spacecraft flying the
// figure-8 "free-return" path, and Commander Elvin floating in front, explaining the game simply.

SCREENS.intro = (() => {
  const view = document.getElementById("stage");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  view.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x02030a);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  const CAM0 = V3(0, 1.2, 16);
  camera.position.copy(CAM0);

  // light: the Sun is off to the right
  scene.add(new THREE.AmbientLight(0x56607a, 0.45));
  const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.5); sunLight.position.set(30, 6, 12); scene.add(sunLight);
  const rim = new THREE.DirectionalLight(0x6fa8ff, 0.35); rim.position.set(-10, 4, -8); scene.add(rim);
  const sunGlow = glowSprite("rgba(255,230,170,1)", 40); sunGlow.position.set(70, 14, -60); scene.add(sunGlow);
  const stars = starfield(scene);

  // Earth with clouds and a blue glow
  const earth = new THREE.Group(); earth.position.set(4.2, -5.6, -6); scene.add(earth);
  const earthBall = new THREE.Mesh(new THREE.SphereGeometry(4, 64, 32), new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.75 }));
  earthBall.rotation.z = 0.41; earth.add(earthBall);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(4.06, 64, 32), new THREE.MeshStandardMaterial({ map: cloudTexture(), transparent: true, depthWrite: false }));
  earth.add(clouds);
  const atm = glowSprite("rgba(90,160,255,0.55)", 11.5); earth.add(atm);
  // the Moon
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 24), new THREE.MeshStandardMaterial({ map: moonTexture(), roughness: 1 }));
  moon.position.set(12.5, 4.2, -14); scene.add(moon);

  // figure-8 free-return path: Earth → around the back of the Moon → home
  const E = earth.position, Mo = moon.position;
  const path = new THREE.CatmullRomCurve3([
    E.clone().add(V3(4.8, 0.6, 0.5)), E.clone().add(V3(6, 2.2, -1.5)), V3(1, 2.8, -7.5), Mo.clone().add(V3(-1.8, 0.6, 1.2)),
    Mo.clone().add(V3(0.2, 1.9, -1.7)), Mo.clone().add(V3(2.0, 0.2, -0.3)), Mo.clone().add(V3(0.6, -1.6, 1.4)), V3(2, -0.6, -4),
    E.clone().add(V3(5.5, -2.4, 2)), E.clone().add(V3(3.6, -1.2, 3.6)), E.clone().add(V3(4.8, 0.6, 0.5))], true, "catmullrom", 0.4);
  const pathLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.getPoints(400)),
    new THREE.LineDashedMaterial({ color: 0x7fd4ff, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.55 }));
  pathLine.computeLineDistances(); scene.add(pathLine);
  // the little spacecraft (command + service module) with a glowing trail
  const ship = new THREE.Group(); scene.add(ship);
  { const m = (geo, c, y) => { const x = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.35 })); x.position.y = y; ship.add(x); return x; };
    m(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 16), 0xc9ced3, 0); m(new THREE.CylinderGeometry(0.03, 0.12, 0.2, 16), 0xf0f1f2, 0.25); m(new THREE.CylinderGeometry(0.03, 0.08, 0.14, 12), 0x2b2d31, -0.22);
    ship.add(Object.assign(glowSprite("rgba(255,210,120,1)", 0.9), {})); }
  const TRAIL = 60, trailPts = Array.from({ length: TRAIL }, () => path.getPointAt(0).clone());
  const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPts);
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.8 })); scene.add(trail);

  // Commander Elvin floating in front, waving
  const elvin = makeAstronaut({ face: true });
  elvin.scale.setScalar(0.4); elvin.position.set(7.4, -0.6, 4.2); elvin.rotation.y = -0.35; scene.add(elvin);

  // occasional shooting star
  const shoot = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(-3, 1, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
  scene.add(shoot); let shootT = 5;

  // ---------- HTML labels that follow the 3D objects ----------
  const labels = [
    { el: document.getElementById("lblEarth"), obj: earth, off: V3(-1.5, 4.6, 0) },
    { el: document.getElementById("lblMoon"), obj: moon, off: V3(0, 1.7, 0) },
    { el: document.getElementById("lblShip"), obj: ship, off: V3(0, 0.55, 0) },
  ];
  const tmp = V3(0, 0, 0);
  function placeLabels() {
    const w = view.clientWidth, h = view.clientHeight;
    labels.forEach((L) => { L.obj.getWorldPosition(tmp); tmp.add(L.off).project(camera);
      if (tmp.z > 1) { L.el.style.display = "none"; return; } L.el.style.display = ""; L.el.style.left = ((tmp.x + 1) / 2 * w) + "px"; L.el.style.top = ((1 - tmp.y) / 2 * h) + "px"; });
    // distance line between Earth and Moon labels
    const a = V3(0, 0, 0), b = V3(0, 0, 0); earth.getWorldPosition(a); moon.getWorldPosition(b);
    const mid = a.clone().lerp(b, 0.5).add(V3(0, -1.6, 0)).project(camera);
    const d = document.getElementById("lblDist"); d.style.left = ((mid.x + 1) / 2 * w) + "px"; d.style.top = ((1 - mid.y) / 2 * h) + "px";
  }

  // ---------- Elvin's speech bubble: explains the game in simple words ----------
  const LINES = [
    "Hi, I'm Commander Elvin! 👋",
    "Your job: plan a REAL trip to the Moon…",
    "…pick the rocket, launch it, land, and bring the crew home!",
    "See the dotted line? That's our path: a figure 8 around the Moon.",
    "Play alone, or with up to 4 friends. Each person has a job!",
    "Ready? Press START MISSION! 🚀",
  ];
  const bubble = document.getElementById("bubble"); let li = 0, bubbleTimer = null;
  function talk() { bubble.textContent = LINES[li++ % LINES.length]; bubble.classList.add("show"); setTimeout(() => bubble.classList.remove("show"), 3300); }

  // ---------- did-you-know facts (bottom) ----------
  const FACTS = [
    "🌙 The Moon is about 384,400 km away. You could fit 30 Earths in that gap!",
    "🚀 Apollo 11 took about 3 days to reach the Moon in July 1969.",
    "⚖️ On the Moon you weigh only 1/6 as much as on Earth.",
    "🔇 There's no air in space, so there's no sound. Rockets are silent out there!",
    "🌍 To stay in orbit around Earth, a spacecraft must fly at 7.8 km every SECOND.",
    "👣 Footprints on the Moon can last millions of years: no wind or rain to erase them.",
  ];
  let fi = 0; const factEl = document.getElementById("fact");
  function nextFact() { factEl.classList.remove("show"); setTimeout(() => { factEl.textContent = FACTS[fi++ % FACTS.length]; factEl.classList.add("show"); }, 400); }

  // ---------- loop ----------
  let running = false, mouseX = 0, mouseY = 0, u = 0, leaving = null;
  addEventListener("pointermove", (e) => { mouseX = e.clientX / innerWidth - 0.5; mouseY = e.clientY / innerHeight - 0.5; });
  function resize() { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.fov = w < 700 ? 60 : 45; camera.updateProjectionMatrix(); }
  addEventListener("resize", resize);
  const clock = new THREE.Clock();
  function loop() {
    if (!running) return;
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
    earthBall.rotation.y += dt * 0.06; clouds.rotation.y += dt * 0.075; moon.rotation.y += dt * 0.02; stars.rotation.y += dt * 0.004;
    // spacecraft: slower near the Moon (it's "climbing uphill" away from Earth)
    const p = path.getPointAt(u), dE = p.distanceTo(E);
    u = (u + dt * (0.018 + 0.03 / (1 + dE * 0.25))) % 1;
    ship.position.copy(p); const ahead = path.getPointAt((u + 0.003) % 1); ship.lookAt(ahead); ship.rotateX(Math.PI / 2);
    trailPts.pop(); trailPts.unshift(p.clone()); trailGeo.setFromPoints(trailPts);
    // Elvin floats (zero-g) and waves
    elvin.position.y = -0.6 + Math.sin(t * 1.1) * 0.15; elvin.rotation.z = Math.sin(t * 0.6) * 0.05; elvin.rotation.y = -0.35 + Math.sin(t * 0.4) * 0.12;
    const arms = elvin.userData.arms; arms[1].rotation.z = 2.3 + Math.sin(t * 5) * 0.25; arms[1].userData.elbow.rotation.z = 0.4 + Math.sin(t * 5) * 0.3;
    arms[0].rotation.z = -0.3; elvin.userData.head.rotation.y = Math.sin(t * 0.8) * 0.15;
    elvin.userData.lights.forEach((l, i) => (l.visible = Math.sin(t * 3 + i * 2) > -0.3));
    // shooting star
    shootT -= dt; if (shootT < 0) { shootT = 6 + Math.random() * 6; shoot.position.set(-10 + Math.random() * 20, 6 + Math.random() * 3, -30); shoot.material.opacity = 1; }
    shoot.material.opacity = Math.max(0, shoot.material.opacity - dt * 1.5); shoot.position.x -= dt * 25 * shoot.material.opacity;
    // gentle camera drift + mouse parallax, or the "launch" zoom when START is pressed
    if (leaving) { const k = Math.min(1, (performance.now() - leaving.t0) / 1600); const e = k * k;
      camera.position.lerpVectors(leaving.from, E.clone().add(V3(3, 1, 6)), e); camera.lookAt(E); if (k >= 1) { const cb = leaving.cb; leaving = null; cb(); } }
    else { camera.position.x += ((CAM0.x + mouseX * 2.2 + Math.sin(t * 0.07) * 0.6) - camera.position.x) * 0.03;
      camera.position.y += ((CAM0.y - mouseY * 1.4) - camera.position.y) * 0.03; camera.lookAt(view.clientWidth < 700 ? 6 : 2.5, view.clientWidth < 700 ? -3.5 : 0, -4); }
    renderer.render(scene, camera); placeLabels();
    requestAnimationFrame(loop);
  }

  // ---------- buttons ----------
  const ui = document.getElementById("introUI");
  document.getElementById("btnStart").onclick = () => {
    SND.init(); SND.beep(); SND.say("Mission Control, we are go for the Moon!");
    ui.classList.add("leaving");
    leaving = { t0: performance.now(), from: camera.position.clone(), cb: () => (SCREENS.players ? showScreen("players") : comingNext()) };
  };
  document.getElementById("btnDemo").onclick = () => { SND.init(); SND.beep(); GAME.demo = true; ui.classList.add("leaving"); showScreen("players"); };
  document.getElementById("btnHow").onclick = () => { SND.init(); SND.click(); document.getElementById("howModal").hidden = false; };
  document.getElementById("howClose").onclick = () => { SND.click(); document.getElementById("howModal").hidden = true; };
  document.getElementById("btnSound").onclick = (e) => { GAME.soundOn = !GAME.soundOn; e.currentTarget.textContent = GAME.soundOn ? "🔊" : "🔇"; SND.init(); if (GAME.soundOn) SND.startHum(); else SND.stopHum(); };
  addEventListener("pointerdown", () => { SND.init(); SND.startHum(); }, { once: true });
  function comingNext() {   // until part 2 (choosing players) is added
    const t = document.getElementById("toast"); t.textContent = "✅ Part 1 done! Next part: choose 1–4 players (coming next).";
    t.classList.add("show"); setTimeout(() => { t.classList.remove("show"); ui.classList.remove("leaving"); camera.position.copy(CAM0); }, 3200);
  }

  return {
    show() { renderer.domElement.style.display = ""; document.getElementById("intro").hidden = false; ui.classList.remove("leaving"); if (!running) { running = true; resize(); clock.start(); loop(); } else resize();
      talk(); bubbleTimer = setInterval(talk, 4200); nextFact(); this.factTimer = setInterval(nextFact, 6500); },
    hide() { running = false; document.getElementById("intro").hidden = true; renderer.domElement.style.display = "none"; clearInterval(bubbleTimer); clearInterval(this.factTimer); },
    // keep the space scene moving behind other screens (no title, no labels)
    backdrop() { renderer.domElement.style.display = ""; leaving = null; if (!running) { running = true; resize(); loop(); } },
  };
})();
