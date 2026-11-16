// mission/apollo-reentry3d.js — the last part in 3D: CM/SM separation (the player does it) → only the Command Module enters the air
// → heat shield glowing in a ball of hot plasma → 2 drogue chutes → 3 main chutes → splashdown in the ocean.
// Real Apollo 11 numbers (NASA mission report): CM/SM separation about 15 min before entry; entry interface 122 km up at about 11 km/s
// (40,000 km/h); heat shield up to about 2,760 °C; radio blackout about 3 min; drogues at about 7.3 km, mains at about 3 km;
// splashdown about 35 km/h (9.7 m/s) in the Pacific on 24 July 1969, 8 days 3 h 18 min after launch, near the USS Hornet.
const RE = {};
function REENTRY3D() { flSteps(10); FL.ph = "reentry3d"; flHud(false); flRumble(false); if (MS.S) MS.S.key = "old"; const tt = document.getElementById("tecTitle"); if (tt) tt.style.display = "none";
  Object.assign(RE, { ph: "sep", t: 0, alt: 0, v: 10.8, heat: 0, sepT: 0 });
  msScene("reentry3d", (S) => { const s = S.scene; s.background = new THREE.Color(0x000000); const stars = starfield(s, 3000);
    s.add(new THREE.AmbientLight(0x8899bb, 0.35)); const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(60, 40, 50); s.add(sun);
    // space part: a huge Earth below us with a thin blue atmosphere
    const earth = K.earth(300, V3(0, -345, 0), s); earth.children[2].visible = false;
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(306, 64, 48), new THREE.MeshBasicMaterial({ color: 0x5fa8ff, transparent: true, opacity: 0.28, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })); earth.add(atmo);
    // the spacecraft: Service Module + Command Module (nose up, heat shield down = facing the way we fall)
    const C = buildCSM(); s.add(C.g); C.g.position.y = -3.9; C.g.traverse((o) => { if (o.isMesh && o.material && o.material.metalness > 0.3) { o.material = o.material.clone(); o.material.metalness = 0.3; o.material.roughness = Math.max(0.45, o.material.roughness); } });
    const shieldMat = C.shield.material = C.shield.material.clone();
    // plasma: a glowing cap in front of the heat shield, a long fiery tail behind, sparks of melting shield, orange light
    const add = (geo, col) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); s.add(m); return m; };
    const fire = new THREE.Group(); s.add(fire);   // everything glowing moves with the capsule's tilt
    const rim = add(new THREE.TorusGeometry(1.95, 0.16, 12, 48), 0xffa040); rim.rotation.x = Math.PI / 2; fire.add(rim);
    const capA = glowSprite("rgba(255,250,220,1)", 5); capA.scale.set(6, 2.2, 1); fire.add(capA); const capB = glowSprite("rgba(255,110,40,1)", 8); capB.scale.set(9, 4, 1); fire.add(capB);
    const wake = [...Array(14)].map((_, i) => { const w = glowSprite(i % 3 ? "rgba(255,110,40,1)" : "rgba(255,190,110,1)", 4); fire.add(w); return w; });
    const glow = glowSprite("rgba(255,150,60,1)", 9); glow.material.opacity = 0; fire.add(glow); const light = new THREE.PointLight(0xff7a30, 0, 30); s.add(light);
    const NS = 500, sp = new Float32Array(NS * 3), sv = new Float32Array(NS * 3), sl = new Float32Array(NS); const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffb060, size: 0.35, map: glowSprite("#fff", 1).material.map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sparks.frustumCulled = false; fire.add(sparks);
    // RCS puffs for the SM moving away
    const puffs = [...Array(6)].map(() => { const p = glowSprite("rgba(255,255,255,0.9)", 1.2); p.visible = false; s.add(p); return p; });
    // ocean part (shown after the fiery part): waves, blue sky, a recovery ship far away
    const og = new THREE.PlaneGeometry(1600, 1600, 120, 120); og.rotateX(-Math.PI / 2);
    const ocean = new THREE.Mesh(og, MQ.mat(0x1d5f8f, { metalness: 0.2, roughness: 0.35 })); ocean.visible = false; ocean.receiveShadow = true; s.add(ocean);
    const ship = new THREE.Group(); ship.visible = false; s.add(ship); MQ.mesh(ship, new THREE.BoxGeometry(60, 6, 10), MQ.mat(0x7c858f), 3); MQ.mesh(ship, new THREE.BoxGeometry(8, 10, 6), MQ.mat(0x8d969f), 11).position.x = 12; ship.position.set(-180, 0, -320);
    const splash = [...Array(40)].map(() => { const p = glowSprite("rgba(255,255,255,0.95)", 1.4); p.visible = false; s.add(p); return { p, v: V3() }; });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.4, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; s.add(ring);
    // parachutes: 2 small drogues, then 3 big mains (2 orange + 1 white, like Apollo)
    const drogue = new THREE.Group(); drogue.visible = false; [-1, 1].forEach((k) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.9, 16, 1, true), MQ.mat(0xe8590c, { side: THREE.DoubleSide })); c.position.set(k * 1.4, 9, 0); c.rotation.x = Math.PI; drogue.add(c); K.line(drogue, [V3(0, 3.5, 0), V3(k * 1.4, 8.6, 0)], 0xdddddd, 0.7); });
    const mains = apChutes(); mains.visible = false;
    S.st = { stars, earth, C, shieldMat, fire, rim, capA, capB, wake, glow, light, sparks, sp, sv, sl, puffs, ocean, og, ship, splash, ring, drogue, mains, cm: null };
    S.orbit = { target: V3(0, 0, 0), dist: 22, yaw: 0.7, pitch: 0.15, auto: 0 }; S.update = (dt, t) => reTick(dt, t); });
  flChat("capcom", "Apollo, Houston. You are GO for CM/SM separation.");
  apHint("Only the Command Module has a heat shield. Separate the Service Module before hitting the air!");
  apPanel(`<h3>🔓 15 minutes to the air: separate the Service Module</h3><p class="lead">We are falling home at <b>about 11 km/s</b>. The <b>Service Module</b> (engine, fuel, oxygen tanks) has <b>no heat shield</b>: it would burn up. Only the <b>Command Module</b> with the 3 astronauts comes home.</p>
    <div class="row" style="justify-content:flex-start"><button class="btn go pulse" onclick="reSep()">🔓 Separate the Service Module</button></div>`);
  flHud(true, "10.8", "km/s", "15 min to entry · 3,000 km up"); }

function reSep() { if (RE.ph !== "sep") return; SND.click(); const st = MS.S.st, C = st.C; MS.ui.innerHTML = ""; flBoom(); flSpeak("C M S M separation.");
  MS.S.scene.attach(C.cm); st.cm = C.cm; RE.ph = "sepgo"; RE.sepT = 0; flBanner("💥 Separation! The Service Module fires its thrusters to move away. It will burn up in the air.", 5000);
  const f = glowSprite("rgba(255,240,200,1)", 6); f.position.set(0, 0, 0); MS.S.scene.add(f); mcTwRe(0.6, (q) => (f.material.opacity = 1 - q), () => MS.S.scene.remove(f)); }
const reTw = []; function mcTwRe(T, fn, done) { reTw.push({ t: 0, T, fn, done }); }

function reTick(dt, t) { const S = MS.S, st = S.st; RE.t += dt;
  if (reTw.length) { const cur = reTw.splice(0); const keep = cur.filter((w) => { w.t += dt; const k = Math.min(1, w.t / w.T); w.fn(k); if (k >= 1) { w.done && w.done(); return false; } return true; }); reTw.push(...keep); }
  const cm = st.cm || st.C.cm, P = cm.getWorldPosition(V3());
  st.earth.userData.c.rotation.y += dt * 0.004;
  if (RE.ph === "sep") { st.C.g.rotation.y += dt * 0.05; }
  if (RE.ph === "sepgo") { RE.sepT += dt; const g = st.C.g; g.position.x += dt * (1 + RE.sepT); g.position.y -= dt * 0.3; g.position.z -= dt * (0.6 + RE.sepT * 0.6); g.rotation.z += dt * 0.25;
    st.puffs.forEach((p, i) => { p.visible = RE.sepT < 3 && Math.sin(t * 25 + i) > 0.2; p.position.copy(g.position).add(V3((i % 2 ? 1 : -1) * 2.1, 1.5 + (i % 3) * 0.6, (i % 3 - 1) * 1.2)); });
    S.orbit.goal = { target: P.clone().lerp(g.position, 0.3), dist: 20 + RE.sepT * 3, yaw: 0.7, pitch: 0.15 };
    if (RE.sepT > 4.5) { RE.ph = "entry"; RE.t = 0; g.visible = false; st.puffs.forEach((p) => (p.visible = false)); flChat("capcom", "Apollo, Houston. Entry interface: 122 km. Heat shield forward. See you on the other side.");
      flBanner("🌍 Entry interface: <b>122 km</b> up at <b>11 km/s</b>. The heat shield leads the way!", 5000); setTimeout(() => apSay("happy", "The air in front of the capsule is squeezed so hard it glows like a fireball. The heat shield reaches about <b>2,760 °C</b>: half as hot as the surface of the Sun! It slowly burns and chars away, carrying the heat with it.", 8000), 2500); } }
  if (RE.ph === "entry") { const T = 16, k = Math.min(1, RE.t / T); // 0..1 through the fiery part
    RE.alt = 122 - 107 * k; RE.v = 10.9 * (1 - Math.pow(Math.min(1, Math.max(0, (k - 0.15) / 0.7)), 1.5)) + 0.25; const h = Math.max(0, Math.sin(Math.min(1, Math.max(0, (k - 0.05) / 0.85)) * Math.PI)); RE.heat = h;
    st.earth.position.y = -310 - RE.alt * 0.29; st.earth.position.z = 0; S.scene.background.setRGB(0.02 + 0.2 * k * k, 0.04 + 0.32 * k * k, 0.08 + 0.55 * k * k); st.stars.material.opacity = 0.95 * (1 - k);
    // the capsule flies tilted (like Apollo, so it can steer) and shakes in the plasma
    const tilt = 0.32 + Math.sin(t * 3) * 0.03; cm.position.set((Math.random() - 0.5) * 0.08 * h, (Math.random() - 0.5) * 0.08 * h, (Math.random() - 0.5) * 0.08 * h); cm.rotation.z = tilt; st.fire.rotation.z = tilt; st.fire.position.copy(cm.position);
    const fl = 0.85 + Math.random() * 0.3; st.rim.material.opacity = 0.9 * h * fl; st.capA.position.y = -0.35; st.capA.material.opacity = h * fl; st.capB.position.y = -0.5; st.capB.material.opacity = 0.8 * h * fl;
    st.wake.forEach((w, i) => { const q = (i + ((t * 6) % 1)) / st.wake.length; w.position.set(Math.sin(t * 7 + i) * 0.25 * q, 1 + q * 16, Math.cos(t * 5 + i) * 0.25 * q); const sc = (5.2 - 3 * q) * (0.9 + Math.random() * 0.2); w.scale.set(sc, sc * 1.6, 1); w.material.opacity = h * (1 - q) * 0.75; });
    st.glow.position.set(0, -0.6, 0); st.glow.material.opacity = h; st.glow.scale.setScalar(7 + 5 * h * fl); st.light.intensity = 6 * h; st.light.position.set(0, -1.5, 1.5);
    st.shieldMat.emissive = st.shieldMat.emissive || new THREE.Color(); st.shieldMat.emissive.setRGB(1.0 * h, 0.35 * h, 0.05 * h); st.shieldMat.color.setRGB(0.42 - 0.22 * k, 0.27 - 0.17 * k, 0.15 - 0.1 * k);   // glows, then is charred black
    // sparks: melting bits of the heat shield streaming away behind
    const { sp, sv, sl } = st; let made = 0; for (let i = 0; i < sl.length; i++) { if (sl[i] > 0) { sl[i] -= dt; sp[i * 3] += sv[i * 3] * dt; sp[i * 3 + 1] += sv[i * 3 + 1] * dt; sp[i * 3 + 2] += sv[i * 3 + 2] * dt; if (sl[i] <= 0) sp[i * 3 + 1] = -999; }
      else if (made < 14 * h) { const a = Math.random() * 6.283, r = 1.6 + Math.random() * 0.4; sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = -0.2; sp[i * 3 + 2] = Math.sin(a) * r; sv[i * 3] = Math.cos(a) * 1.5; sv[i * 3 + 1] = 9 + Math.random() * 8; sv[i * 3 + 2] = Math.sin(a) * 1.5; sl[i] = 0.6 + Math.random() * 0.8; made++; } }
    st.sparks.geometry.attributes.position.needsUpdate = true; st.sparks.material.opacity = Math.min(1, h * 1.5);
    S.orbit.goal = { target: V3(0, 2.5, 0), dist: 20 - 3 * h, yaw: 0.9 + k * 0.5, pitch: 0.12 };
    if (h > 0.15 && !RE.lrum) { RE.lrum = 1; flRumble(true, 0.22); flChat(0, "It's getting bright out there… and bumpy!"); }
    if (k > 0.22 && !RE.los) { RE.los = 1; flChat("capcom", "…Apollo, Houston… (radio blackout)"); flBanner("📡❌ Radio blackout! The hot plasma around us blocks the radio, about 3 minutes", 5000); }
    if (k > 0.5 && !RE.g) { RE.g = 1; flChat(1, "Feels like 6 times our weight pushing us into the seats!"); }
    if (k > 0.82 && !RE.aos) { RE.aos = 1; flChat("capcom", "Apollo, Houston, standing by."); flChat(0, "Houston, Apollo. We read you loud and clear!"); }
    flHud(true, RE.v.toFixed(2), "km/s", `${Math.round(RE.alt)} km up · shield ${Math.round(300 + 2460 * h)} °C`);
    if (k >= 1) { RE.ph = "fade"; flRumble(false); st.fire.visible = false; cm.rotation.z = 0; cm.traverse((o) => { if (o.isMesh && o.material && o.material !== st.shieldMat && o.material.color) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color(0x8a6a48), 0.35); } });   // scorched by the heat st.glow.material.opacity = 0; st.light.intensity = 0; st.shieldMat.emissive.setRGB(0, 0, 0);
      msPoints(3000, "heat shield survived re-entry"); flFadeTo(reOcean); } }
  if (RE.ph === "fall" || RE.ph === "drogue" || RE.ph === "main") { reFall(dt, t); }
  if (RE.ph === "splash" || RE.ph === "float") reFloat(dt, t);
  if (st.ocean.visible) { const p = st.og.attributes.position; for (let i = 0; i < p.count; i += 1) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.sin(x * 0.08 + t * 1.2) * 0.35 + Math.cos(z * 0.06 + t * 0.9) * 0.3); } p.needsUpdate = true; if ((RE.wn = (RE.wn || 0) + 1) % 20 === 0) st.og.computeVertexNormals(); } }

// ocean, blue sky, falling from about 15 km: drogues at 7.3 km, mains at 3 km
function reOcean() { const S = MS.S, st = S.st, cm = st.cm; st.earth.visible = false; st.stars.visible = false; st.sparks.visible = false; S.scene.background = new THREE.Color(0x7fb2e0); S.scene.fog = new THREE.Fog(0x9cc4ea, 120, 700);
  st.ocean.visible = true; st.ship.visible = true; cm.position.set(0, 60, 0); cm.rotation.set(0, 0, 0); RE.ph = "fall"; RE.alt = 15; RE.v = 250; RE.ft = 0;
  cm.add(st.drogue); cm.add(st.mains); st.mains.scale.setScalar(0.08); flHud(true, "250", "m/s", "15 km up · falling through the clouds");
  flBanner("🌊 Through the clouds: the Pacific Ocean is below us!", 3500); }
function reFall(dt, t) { const S = MS.S, st = S.st, cm = st.cm; RE.ft += dt;
  if (RE.ph === "fall") { RE.alt -= dt * 2.2; RE.v = 250 - 60 * Math.min(1, RE.ft / 3); if (RE.alt <= 7.3) { RE.ph = "drogue"; st.drogue.visible = true; st.drogue.scale.setScalar(0.2); SND.tone(500, 0.15, "square", 0.08);
      flBanner("🪂 7.3 km: the 2 small <b>drogue</b> parachutes open to steady the capsule", 4000); flChat(0, "Drogues out!"); } }
  else if (RE.ph === "drogue") { RE.alt -= dt * 1.15; RE.v = Math.max(80, RE.v - dt * 50); st.drogue.scale.setScalar(Math.min(1, st.drogue.scale.x + dt * 2)); st.drogue.rotation.y = Math.sin(t * 2) * 0.2;
    if (RE.alt <= 3) { RE.ph = "main"; st.drogue.visible = false; st.mains.visible = true; SND.tone(300, 0.25, "triangle", 0.1); flChat(1, "Three good mains!"); flChat("capcom", "Apollo, Houston. We see your chutes on TV!");
      flBanner("🪂🪂🪂 3 km: the 3 big <b>main</b> parachutes open: down to about 35 km/h", 5000); msPoints(1000, "parachutes open"); } }
  else { RE.alt -= dt * 0.33; RE.v = Math.max(9.7, RE.v - dt * 40); const s = Math.min(1, st.mains.scale.x + dt * (st.mains.scale.x < 0.4 ? 0.5 : 0.9)); st.mains.scale.setScalar(s); st.mains.rotation.y += dt * 0.15; }
  cm.position.y = Math.max(0, RE.alt <= 3 ? RE.alt / 3 * 30 : 30 + (RE.alt - 3) / 12 * 30); cm.rotation.z = Math.sin(t * 1.4) * 0.06;
  S.orbit.goal = { target: cm.position.clone().add(V3(0, RE.ph === "main" ? 5 : 1.5, 0)), dist: RE.ph === "main" ? 34 : 18, yaw: 0.6, pitch: RE.ph === "main" ? 0.05 : 0.2 };
  flHud(true, RE.v >= 100 ? Math.round(RE.v) : RE.v.toFixed(1), "m/s", `${RE.alt.toFixed(1)} km up`);
  if (cm.position.y <= 0.05 && RE.alt <= 0.05) reSplash(); }
function reSplash() { const st = MS.S.st, cm = st.cm; RE.ph = "splash"; RE.st = 0; flBoom(); SND.tone(120, 0.5, "sawtooth", 0.06); st.splash.forEach((s) => { s.p.visible = true; s.p.position.set(0, 0.5, 0); s.v.set((Math.random() - 0.5) * 8, 4 + Math.random() * 7, (Math.random() - 0.5) * 8); s.p.material.opacity = 1; });
  st.ring.material.opacity = 0.8; st.ring.scale.setScalar(1); flHud(true, "0", "m/s", "splashdown · Pacific Ocean"); flSpeak("Splashdown!");
  setTimeout(() => { flCheer("", "🌊 SPLASHDOWN! The crew is home safe. Mission Control is cheering!"); msPoints(10000, "splashdown: crew home safe"); }, 900);
  setTimeout(reEnd, 6500); }
function reFloat(dt, t) { const S = MS.S, st = S.st, cm = st.cm; RE.st += dt;
  st.splash.forEach((s) => { if (!s.p.visible) return; s.v.y -= 9.8 * dt; s.p.position.addScaledVector(s.v, dt); s.p.material.opacity = Math.max(0, s.p.material.opacity - dt * 0.5); if (s.p.position.y < 0) s.p.visible = false; });
  st.ring.scale.setScalar(1 + RE.st * 6); st.ring.material.opacity = Math.max(0, 0.8 - RE.st * 0.3); st.ring.position.y = 0.4;
  cm.position.y = 0.15 * Math.sin(t * 1.3) - 0.6; cm.rotation.z = Math.sin(t * 1.1) * 0.08; cm.rotation.x = Math.cos(t * 0.9) * 0.06;
  if (st.mains.visible) { const k = K.ease(Math.min(1, RE.st / 3)); st.mains.scale.set(1, 1 - 0.94 * k, 1); st.mains.position.set(-9 * k, 0, -6 * k); }   // the empty chutes sink down onto the water beside us
  S.orbit.goal = { target: V3(0, 1.5, 0), dist: 16, yaw: 0.6 + RE.st * 0.05, pitch: 0.18 }; }
function reEnd() { RE.ph = "float"; SND.click && SND.click();
  msModal(`<h2>🏆 Welcome home!</h2><p>Your crew flew to the Moon, walked on it and came back to splash down safely in the <b>Pacific Ocean</b>.</p>
    <p>🇺🇸 Apollo 11 splashed down on <b>24 July 1969</b>, after <b>8 days, 3 hours and 18 minutes</b>, and was picked up by the ship <b>USS Hornet</b>.</p>
    <p style="font-size:22px"><b>Total: ${K.fmt(GAME.mis.points)} points</b></p>
    <div class="row"><button class="btn ghost" onclick="msModalClose()">🌊 Stay and watch</button><button class="btn go" onclick="msModalClose();showScreen('intro')">🏠 Back to the start</button></div>`); }
