// mission/apollo-moonorb3d.js — PART C starts here, in 3D: arrive at the Moon → LOI braking (hold) → elliptical Moon orbit (Kepler's 2nd law:
// faster near, slower far) → radio tasks like Academy lesson 17 (the Moon blocks the radio on the far side): send 3 messages to Earth,
// including a far-side photo → GO for landing → undock → landing (apollo-moon3d.js).
// Facts: LOI slowed Apollo 11 by about 0.89 km/s behind the Moon; first orbit about 114 × 313 km (NASA). The Moon always shows Earth the same face
// (tidal locking); Luna 3 took the first far-side photo in 1959; Apollo 8's crew were the first people to see it (1968). Radio: 1.28 s each way.
// Drawing: the Moon-orbit heights and the Earth distance are not to scale (the screen says so).
const MO = {};
const MO_R = 4, MO_MU = 55.3, MO_RP = 5.0, MO_VP0 = 5.36, MO_EP = V3(-62, 0, 0), MO_KMS = 0.4526, MO_DVK = 0.533;
const MO_E = MO_EP.clone().normalize();

function moState(nu, dv) { const vp = Math.max(0.5, MO_VP0 - dv), h = MO_RP * vp, e = MO_RP * vp * vp / MO_MU - 1, p = h * h / MO_MU, r = p / (1 + e * Math.cos(nu));
  const vr = MO_MU / h * e * Math.sin(nu), vt = MO_MU / h * (1 + e * Math.cos(nu)); return { x: r * Math.cos(nu), z: r * Math.sin(nu), vx: vr * Math.cos(nu) - vt * Math.sin(nu), vz: vr * Math.sin(nu) + vt * Math.cos(nu) }; }
function moEl(s) { const r = Math.hypot(s.x, s.z), v2 = s.vx * s.vx + s.vz * s.vz, h = s.x * s.vz - s.z * s.vx, rv = s.x * s.vx + s.z * s.vz;
  const ex = ((v2 - MO_MU / r) * s.x - rv * s.vx) / MO_MU, ez = ((v2 - MO_MU / r) * s.z - rv * s.vz) / MO_MU, e = Math.hypot(ex, ez), p = h * h / MO_MU;
  return { r, v: Math.sqrt(v2), e, a: 1 / (2 / r - v2 / MO_MU), rp: p / (1 + e), ra: e < 1 ? p / (1 - e) : Infinity, w: Math.atan2(ez, ex) }; }
function moStep(s, dt) { let left = dt; while (left > 0) { const h = Math.min(left, 0.01); let r = Math.hypot(s.x, s.z), a = -MO_MU / (r * r * r);
  s.vx += a * s.x * h / 2; s.vz += a * s.z * h / 2; s.x += s.vx * h; s.z += s.vz * h; r = Math.hypot(s.x, s.z); a = -MO_MU / (r * r * r); s.vx += a * s.x * h / 2; s.vz += a * s.z * h / 2; left -= h; } }
const moBlocked = (p) => p.dot(MO_E) < 0 && p.clone().sub(MO_E.clone().multiplyScalar(p.dot(MO_E))).length() < MO_R;

// free-return figure 8: Earth loop + Moon loop. Close pass on the NEAR side, then round the far side and home.
const MO_VI2 = 6.6; // speed far away (squared), so speed at 5 units = 5.36
function moPath() { const P = [[-84, 0], [-78, 12], [-62, 20], [-46, 15], [-30, 10], [-15.5, 6.5], [-9.3, 1.3]].map(([x, z]) => V3(x, 0, z));
  for (let a = -130; a <= 130; a += 10) P.push(V3(5 * Math.cos(a * Math.PI / 180), 0, 5 * Math.sin(a * Math.PI / 180)));
  [[-9.3, -1.3], [-15.5, -6.5], [-30, -10], [-46, -15], [-62, -20], [-78, -12], [-84, 0]].forEach(([x, z]) => P.push(V3(x, 0, z)));
  const cv = new THREE.CatmullRomCurve3(P), pts = cv.getSpacedPoints(1600), L = cv.getLength();
  const st = L / 1600, i0 = Math.floor(0.17 * 1600), R = (i) => Math.hypot(pts[i].x, pts[i].z);
  let iZ0 = i0; while (R(iZ0) > 12.5) iZ0++; let iC = iZ0; while (R(iC) > 5.05) iC++; let iZ1 = iC; while (Math.atan2(pts[iZ1].z, pts[iZ1].x) * 180 / Math.PI < -92) iZ1++;
  return { pts, L, step: st, u: L * 0.17, iZ0, iC, iZ1, uZ0: iZ0 * st, uC: iC * st, uZ1: iZ1 * st }; }
// speed shown while arriving: about 2.3 km/s far out, 2.6 km/s close to the Moon (gravity speeds us up)
const moKmsA = (r) => 2.6 - 0.3 * Math.max(0, Math.min(1, (r - 5) / 15));
const moWinNow = (x, z) => { const r = Math.hypot(x, z), f = Math.atan2(z, x) * 180 / Math.PI; return r < 7.5 && f < -92 && f > -158; };
function MOONORB() { flSteps(7); FL.ph = "moonorb"; if (MS.S) MS.S.key = "old";
  Object.assign(MO, { ph: "arrive", s: { x: -46, z: 15, vx: 1, vz: 0 }, path: moPath(), u: undefined, capt: 0, lastV: 0, dv: 0, dvd: 0, seenWin: false, freeShown: false, wasBurn: false, hold: false, judged: false, sweep: 0, sent: 0, tasks: { status: 0, photo: 0, sendphoto: 0, go: 0 }, fails: {}, pulses: [], t: 0 });
  msScene("moonorb", (S) => { const s = S.scene; const sf = starfield(s, 3500); sf.scale.setScalar(4);
    s.add(new THREE.AmbientLight(0x8899bb, 0.25)); const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(30, 20, 60); s.add(sun);
    const moon = K.moon(MO_R, V3(), s); const earth = K.earth(MO_R * 3.67, MO_EP, s);
    // the radio shadow behind the Moon (red), like Academy lesson 17
    const shadow = new THREE.Mesh(new THREE.CylinderGeometry(MO_R, MO_R, 46, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false }));
    shadow.position.copy(MO_E.clone().multiplyScalar(-23)); shadow.quaternion.setFromUnitVectors(V3(0, 1, 0), MO_E.clone().negate()); s.add(shadow);
    msLabel("📡❌ Radio shadow: Earth can't hear you here", MO_E.clone().multiplyScalar(-14).add(V3(0, MO_R + 1.5, 0)), "red");
    msLabel("🌍 Earth (really 384,400 km away: not to scale)", MO_EP.clone().add(V3(0, MO_R * 3.67 + 2, 0)), "blue");
    msLabel("🌗 Near side: always faces Earth", MO_E.clone().multiplyScalar(MO_R + 1).add(V3(0, 2.5, 0)), "green"); msLabel("🌑 Far side", MO_E.clone().multiplyScalar(-MO_R - 1).add(V3(0, 2.5, 0)), "gold");
    // our spacecraft: CSM + LM docked nose to nose (small)
    const ship = new THREE.Group(); s.add(ship); const csm = buildCSM(); csm.g.scale.setScalar(0.06); ship.add(csm.g); const lm = buildLM({ folded: true }); lm.g.scale.setScalar(0.06); lm.g.rotation.x = Math.PI; lm.g.position.y = 0.75; ship.add(lm.g);
    const glow = glowSprite("rgba(255,230,140,0.9)", 1.4); ship.add(glow); const flame = glowSprite("rgba(255,150,60,1)", 1.6); flame.visible = false; s.add(flame);
    const trail = []; const tg = new THREE.BufferGeometry(), tp = new Float32Array(900 * 3), tc = new Float32Array(900 * 3); tg.setAttribute("position", new THREE.BufferAttribute(tp, 3)); tg.setAttribute("color", new THREE.BufferAttribute(tc, 3)); tg.setDrawRange(0, 0);
    const tline = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })); tline.frustumCulled = false; s.add(tline);
    const link = K.line(s, [V3(), MO_EP], 0x7dffb5, 0.5);
    const p8 = K.line(s, MO.path.pts, 0xffd27a, 0.6, true); p8.material.dashSize = 1.6; p8.material.gapSize = 1.1;
    const PP = MO.path, bz = PP.pts.slice(PP.iZ0, PP.iZ1 + 1).map((p) => p.clone().setY(0.15));
    const brake = K.line(s, bz, 0x2fff8a, 1); brake.material.linewidth = 3; const bzl = msLabel("🔥 START BRAKING HERE<br>(near side)", PP.pts[PP.iZ0].clone().add(V3(0, 1.5, 0)), "green");
    const p8l = msLabel("🔁 Free-return path: a figure 8.<br>No braking = the Moon throws you back to Earth", V3(-34, 2, 15), "gold");
    const spdLbl = msLabel("", () => ship.position.clone().add(V3(0, 1.4, 0)), "big");
    S.st = { p8, brake, bzl, p8l, moon, earth, ship, flame, tp, tc, tg, link, spdLbl, n: 0 };
    S.orbit = { target: V3(-36, 0, 0), dist: 100, yaw: 0, pitch: 1.4, auto: 0 };
    S.update = (dt, t) => moTick(dt, t);
  });
  flChat("capcom", "Apollo, you are GO for LOI. We'll see you on the other side.");
  apHint("When the spacecraft reaches the green line, HOLD the brake (or SPACE) until your speed is under 1.8 km/s.");
  apPanel(`<h3>🌙 Arriving at the Moon: brake into orbit (LOI)</h3><p class="lead">You're on a <b>free-return</b> path (figure 8). At the <b>green line</b>, fire the engine <b>backwards</b>. Get your speed <b>under 1.8 km/s</b> and the Moon's gravity catches you. Too fast and you swing back to Earth. Under 1.2 km/s = crash!</p>
    <div class="lcRow" style="align-items:center">${K.meter("moDv", "🚀 Your speed")}<button class="btn go holdBtn off" id="moBurn" onpointerdown="try{this.setPointerCapture(event.pointerId)}catch(e){};moBurn(1);event.preventDefault()" oncontextmenu="return false">🔥 HOLD to brake</button></div>
    <p style="font-size:12px;color:#9fb0c8;margin:4px 0 0">🟢 Green = 1.2 to 1.8 km/s: caught by the Moon. (Apollo 11 slowed from about 2.5 to 1.6 km/s.)</p>`); moMeter(); }
function moKms() { const s = MO.s, r = Math.hypot(s.x, s.z); return MO.capt || moKmsA(r) - MO.dvd; }
function moMeter() { const v = MO.s ? moKms() : 2.3, ok = v >= 1.2 && v < 1.8; K.setMeter("moDv", v / 3, v.toFixed(2) + " km/s" + (ok ? " ✅" : ""), ok ? "#2fbf71" : v < 1.2 ? "#e05050" : "#ffd27a"); }
function moBurn(on) { if (MO.ph !== "arrive" || MO.judged || MO.capt) return; if (!on && !MO.hold) return; MO.hold = !!on; SND.click && on && SND.click();
  if (!on && MO.win) { const v = moKms(); if (v < 1.8) moCatch(v); else if (MO.dvd > 0.05) apSay("sad", `Still ${v.toFixed(2)} km/s: too fast! HOLD again until it's under 1.8.`, 2500); } }
function moCatch(v) { MO.capt = v; MO.hold = false; flRumble(false); SND.beep && SND.beep(); flChat(0, "Engine off! Speed " + v.toFixed(2) + " km/s.");
  flBanner("✅ Under 1.8 km/s: the Moon's gravity catches us!", 3500); if (MO.u >= MO.path.uC) moOrbitNow(); }
function moOrbitNow() { if (MO.judged) return; MO.judged = true; const s = MO.s, f = Math.atan2(s.z, s.x), v = MO.capt, r = Math.hypot(s.x, s.z);
  const e = 0.05 + 0.55 * Math.max(0, Math.min(1, (v - 1.2) / 0.6)), vt = Math.sqrt(MO_MU / r * (1 + e));
  Object.assign(s, { vx: -Math.sin(f) * vt, vz: Math.cos(f) * vt }); MO.dv = (v >= 1.4 ? 0.89 : 0.6) / MO_DVK; moJudge(); }
function moCrash() { MO.judged = true; MO.hold = false; flRumble(false); const s = MO.s, f = Math.atan2(s.z, s.x), vt = 1.2;
  Object.assign(s, { vx: -Math.sin(f) * vt, vz: Math.cos(f) * vt }); MO.dv = 3; moJudge(); }
function moFree() { MO.judged = true; MO.hold = false; flRumble(false); MO.ph = "free8"; MO.lastV = moKms(); flChat(0, "Houston, we're still too fast!"); setTimeout(() => flChat("capcom", "Roger. The Moon will swing you round and send you home."), 1800);
  flBanner("🔁 Still too fast: the Moon's gravity swings you round the <b>far side</b> and back to Earth (the figure 8)", 7000); }
function moFreeModal() { const v = MO.lastV || 2.5; if (!flLife("LOI burn too short")) return;
  msModal(`<h2>🔁 Free return: heading home!</h2><p>Your speed was <b>${v.toFixed(2)} km/s</b>. It needed to be <b>under 1.8 km/s</b>, so the Moon couldn't hold on to you.</p><p>On a <b>free-return</b> path the Moon's gravity swings you round its far side and throws you back to Earth, in a figure 8. That's how <b>Apollo 13</b> got home safely. But no landing!</p><div class="row"><button class="btn go" onclick="msModalClose();MOONORB()">🔁 Try LOI again</button></div>`); }
function moTick(dt, t) { const S = MS.S, st = S.st, s = MO.s; MO.t += dt; st.moon.rotation.y += dt * 0.01;
  const a0 = Math.atan2(s.z, s.x);
  if (MO.ph === "arrive" || MO.ph === "free8") { const P = MO.path, r0 = Math.hypot(s.x, s.z), kms = MO.ph === "arrive" ? moKms() : moKmsA(r0), vb = kms / MO_KMS;
    const inZone = MO.u >= P.uZ0 && MO.u <= P.uZ1;
    MO.u = (MO.u === undefined ? P.u : MO.u) + dt * (inZone ? 0.55 : r0 > 12 ? 5 : r0 > 7.5 || MO.ph === "free8" ? 1.1 : 0.35) * (MO.hold && inZone ? 0.6 : 1) * Math.max(1.5, vb);
    const k = Math.min(P.pts.length - 2, Math.floor(MO.u / P.step)), q = MO.u / P.step - k, a = P.pts[k], b = P.pts[k + 1], tg = b.clone().sub(a).normalize();
    s.x = a.x + (b.x - a.x) * q; s.z = a.z + (b.z - a.z) * q; s.vx = tg.x * vb; s.vz = tg.z * vb;
    if (MO.ph === "arrive" && !MO.judged) { const win = inZone && !MO.capt, bt = document.getElementById("moBurn"); MO.win = win; if (win) MO.seenWin = true;
      if (MO.hold && win) { MO.dvd += dt * 0.3; if (moKms() < 1.2) moCrash(); }
      moMeter();
      const burning = MO.hold && win; if (burning !== MO.wasBurn) { MO.wasBurn = burning; flRumble(burning, 0.08); }
      if (bt) { bt.classList.toggle("off", !win); bt.classList.toggle("pulse", win && !MO.hold); bt.innerHTML = MO.capt ? "✅ Caught by the Moon!" : win ? (MO.hold ? "🔥 BRAKING… let go under 1.8" : "🔥 HOLD NOW to brake!") : MO.hold ? "⏳ wait for the green line…" : "🔥 HOLD to brake (at the green line)"; }
      if (MO.capt && MO.u >= P.uC) moOrbitNow();
      else if (!MO.capt && MO.u > P.uZ1 && !MO.judged) { const v = moKms(); if (v < 1.8) { moCatch(v); } else moFree(); } }
    else if (MO.u > P.L * 0.8 && !MO.freeShown) { MO.freeShown = true; moFreeModal(); }
    if (MO.u >= P.L - 0.5) MO.u = P.L - 0.5; }
  else if (MO.ph === "orbit" || MO.ph === "undock") moStep(s, dt * 2.6);   // faster laps: judges only have 5 minutes
  else if (MO.ph === "tei" || MO.ph === "teigo") { moStep(s, dt * (MO.ph === "teigo" ? 3 : 2)); if (MO.hold) { const v = Math.hypot(s.vx, s.vz), k = (v + 0.5 * dt) / v; s.vx *= k; s.vz *= k; MO.tdv += 0.5 * dt;
      const d = MO.tdv * 0.8; K.setMeter("moDv", d / 1.4, d.toFixed(2) + " km/s", d > 0.9 && d < 1.2 ? "#2fbf71" : d > 1.2 ? "#e05050" : "#ffd27a"); } }
  else if (MO.ph === "missed") moStep(s, dt * 2);
  const a1 = Math.atan2(s.z, s.x); let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; MO.sweep += Math.abs(d);
  // ship, flame, trail coloured by speed (red = fast, blue = slow)
  const p = V3(s.x, 0, s.z), v = V3(s.vx, 0, s.vz), sp = v.length(); st.ship.position.copy(p); st.ship.quaternion.setFromUnitVectors(V3(0, 1, 0), v.clone().normalize());
  st.flame.visible = MO.hold && (MO.ph !== "arrive" || MO.win); if (MO.hold) st.flame.position.copy(p).addScaledVector(v.clone().normalize(), MO.ph === "arrive" ? 0.9 : -0.9);
  st.n = Math.min(900, st.n + 1); st.tp.copyWithin(3, 0, (900 - 1) * 3); st.tc.copyWithin(3, 0, (900 - 1) * 3); st.tp.set([p.x, p.y, p.z], 0);
  const k = Math.max(0, Math.min(1, (sp - 2.2) / 1.6)); st.tc.set([0.35 + 0.65 * k, 0.55 - 0.25 * k, 1 - 0.75 * k], 0); st.tg.setDrawRange(0, st.n); st.tg.attributes.position.needsUpdate = true; st.tg.attributes.color.needsUpdate = true;
  // radio link: green when Earth can hear us, red behind the Moon
  const blocked = moBlocked(p); st.link.geometry.setFromPoints([p, MO_EP]); st.link.material.color.set(blocked ? 0xff4040 : 0x7dffb5); st.link.material.opacity = blocked ? 0.2 : 0.55;
  if (blocked !== MO.wasB) { MO.wasB = blocked; if (MO.ph !== "arrive" || MO.t > 1) blocked ? (flChat(0, "Loss of signal. The Moon is blocking the radio."), SND.tone(300, 0.4, "sine", 0.05)) : (MO.ph !== "arrive" && flChat("capcom", "Apollo, Houston. We have you again!")); }
  // speed readout + Kepler's 2nd law words next to the ship
  const r = p.length(), kms = sp * MO_KMS;
  flHud(true, kms.toFixed(2), "km/s", `${blocked ? "📡❌ no radio (far side)" : "📡 radio OK"}`);
  if (MO.ph === "orbit" || MO.ph === "tei") { const el = moEl(s), f = (r - el.rp) / Math.max(0.01, el.ra - el.rp);
    st.spdLbl.el.innerHTML = f < 0.3 ? "⚡ CLOSE to the Moon: FAST!" : f > 0.7 ? "🐢 FAR from the Moon: SLOW" : ""; st.spdLbl.el.className = "acLbl big " + (f < 0.3 ? "red" : f > 0.7 ? "blue" : ""); st.spdLbl.el.style.display = f < 0.3 || f > 0.7 ? "" : "none";
    const n = Math.floor(MO.sweep / (2 * Math.PI)); if (n > (MO.orbits || 0)) { MO.orbits = n; if (n === 1 && !MO.tasksOn) moTasksUI(); } }
  else st.spdLbl.el.style.display = "none";
  // radio pulses
  MO.pulses = MO.pulses.filter((q) => { q.t += dt; const L = q.from.distanceTo(q.to), k = Math.min(1, q.t / q.T); q.m.position.copy(q.from).lerp(q.to, k); q.m.lookAt(q.to); q.m.scale.setScalar(1 + k * 3);
    if (k >= 1) { MS.S.scene.remove(q.m); q.done && q.done(); return false; } return true; });
  if (MO.ph === "undock") { MO.ut += dt; st.ship.children[1].position.y = 0.75 + MO.ut * 0.5; if (MO.ut > 3.2 && !MO.gone) { MO.gone = true; flFadeTo(() => MOON3D()); } }
  if (MO.ph === "teigo") { S.orbit.goal = { target: p.clone().multiplyScalar(0.5), dist: 30 + r * 1.2 }; return; }
  if (MO.ph === "arrive" && !MO.judged && MO.u > MO.path.uZ0 - 6) { S.orbit.goal = { target: p.clone().multiplyScalar(0.6), dist: 15 + r * 0.4, pitch: 0.75 }; }
  else S.orbit.goal = (MO.ph === "arrive" || MO.ph === "free8") && r > 13 ? { target: V3(-36, 0, 0), dist: 100, pitch: 1.4 } : { target: V3(-1.5, 0, 0), dist: 27, pitch: 0.95 };
  const st8 = st.p8 && (MO.ph === "arrive" || MO.ph === "free8"); if (st.p8) { st.p8.visible = st8; st.brake.visible = MO.ph === "arrive"; st.bzl.el.style.visibility = MO.ph === "arrive" && !MO.judged ? "visible" : "hidden"; st.p8l.el.style.visibility = st8 ? "visible" : "hidden"; }
}
function moJudge() { MO.judged = true; MO.hold = false; flRumble(false); const el = moEl(MO.s), dv = MO.dv * MO_DVK;
  if (el.e >= 1 || el.ra > 40) { MO.ph = "missed"; setTimeout(() => { const free = AP.path !== "direct"; if (!flLife("LOI burn too short")) return;
      msModal(`<h2>${free ? "🔁 Free return: heading home!" : "🌌 Lost in space!"}</h2><p>You only slowed by <b>${dv.toFixed(2)} km/s</b>, so the Moon couldn't hold on to you.</p><p>${free ? "You chose a <b>free-return</b> path, so the Moon's gravity swings you back to Earth, like Apollo 13. But no landing!" : "With no free return, you drift away. That's why Apollo 11 used free return!"}</p><div class="row"><button class="btn go" onclick="msModalClose();MOONORB()">🔁 Try LOI again</button></div>`); }, 3000); return; }
  if (el.rp < MO_R + 0.25) { MO.ph = "missed"; setTimeout(() => { if (flLife("LOI burn too long")) msModal(`<h2>💥 Too much braking!</h2><p>You slowed by ${dv.toFixed(2)} km/s. Your orbit now dips <b>into the Moon</b>. The Moon has mountains over 5 km tall!</p><div class="row"><button class="btn go" onclick="msModalClose();MOONORB()">🔁 Try LOI again</button></div>`); }, 2000); return; }
  MO.ph = "orbit"; MO.sweep = 0; MO.orbits = 0;
  if (dv > 0.84 && dv < 0.95) msPoints(1000, "perfect LOI: in Moon orbit"); else msPoints(300, "in Moon orbit (odd shape)");
  flChat("capcom", "Apollo, Houston. How was the burn?"); setTimeout(() => flChat(0, "Perfect! We're in orbit around the Moon!"), 1800);
  flBanner("🌙 Close to the Moon we go <b>FASTER</b> ⚡ · Far from the Moon we go <b>SLOWER</b> 🐢<br><small>This is <b>Kepler's 2nd law</b>. Tap the 📐 box on the right to learn more.</small>", 12000);
  const box = document.getElementById("msInfos"); if (box && !document.getElementById("kepBox")) { const b = document.createElement("button"); b.id = "kepBox"; b.className = "msInfo kepBox"; b.innerHTML = "📐 Kepler's 2nd law: tap to learn ▸"; b.onclick = () => { SND.click(); flKeplerPop(); }; box.prepend(b); }
  apPanel(`<h3>🛰️ In Moon orbit: watch the speed!</h3><p class="lead">Your path is an <b>ellipse</b> (an oval). Watch the speed (top left) and the trail colour: <b style="color:#ff8a8a">red = fast</b> near the Moon, <b style="color:#8ab8ff">blue = slow</b> far away. <b>Kepler's 2nd law!</b> (Orbit drawn stretched so you can see it.)</p>`); }
// ---------------------------------------------------------------- talking to Earth: 3 messages, one is a far-side photo
function moTasksUI() { MO.tasksOn = true; const T = MO.tasks, done = (k) => T[k] ? "good" : "";
  apPanel(`<h3>📡 Talk to Earth: ${MO.sent}/3 messages sent</h3><p class="lead">Mission Control needs <b>3 messages</b> before you can land. Remember: on the <b>far side</b> the Moon blocks the radio!</p>
    <div class="lcRow cmp"><button class="pick ${done("status")}" ${T.status ? "disabled" : ""} onclick="moSend('status')"><b>${T.status ? "✅ " : ""}📡 1. Send a status report</b></button>
      <button class="pick ${done("photo")}" ${T.photo ? "disabled" : ""} onclick="moPhoto()"><b>${T.photo ? "✅ " : ""}📸 Take a far-side photo</b></button>
      <button class="pick ${done("sendphoto")}" ${!T.photo || T.sendphoto ? "disabled" : ""} onclick="moSend('sendphoto')"><b>${T.sendphoto ? "✅ " : ""}📡 2. Send the far-side photo</b></button>
      <button class="pick ${done("go")}" ${T.go ? "disabled" : ""} onclick="moSend('go')"><b>${T.go ? "✅ " : ""}📡 3. Ask: GO for landing?</b></button></div>
    ${MO.sent >= 3 ? `<div class="row"><button class="btn go pulse" onclick="moUndock()">🦅 GO for landing: into the Lunar Module ▶</button></div>` : ""}`); }
function moPhoto() { SND.click(); const p = MS.S.st.ship.position;
  if (!moBlocked(p) && p.dot(MO_E) > -1) return apSay("sad", "You're over the <b>near side</b>: people on Earth see this side every night! Wait until you swing round to the <b>far side</b>.", 7000);
  const f = document.createElement("div"); f.className = "moFlash"; MS.wrap.appendChild(f); setTimeout(() => f.remove(), 500); SND.tone(1800, 0.05, "square", 0.1);
  const img = moonTexture().image, c = document.createElement("canvas"); c.width = 300; c.height = 200; const x = c.getContext("2d"); x.drawImage(img, 600, 120, 360, 240, 0, 0, 300, 200); x.fillStyle = "rgba(0,0,0,.15)"; x.fillRect(0, 0, 300, 200);
  MO.tasks.photo = 1; msPoints(500, "far-side photo");
  msModal(`<h2>📸 The far side of the Moon!</h2><img src="${c.toDataURL()}" style="width:100%;border-radius:10px;border:6px solid #fff;box-shadow:0 6px 20px #0008"><p>No one on Earth can ever see this side: the Moon always shows us the <b>same face</b>. The far side has many more craters and almost no dark "seas". The Soviet probe <b>Luna 3</b> took the first photo in 1959, and Apollo 8's crew were the first people to see it with their own eyes (1968).</p><p>Now <b>send it to Earth</b>, but only when the radio can reach!</p><div class="row"><button class="btn go" onclick="msModalClose();moTasksUI()">👍 OK</button></div>`); }
function moSend(id) { SND.click(); const st = MS.S.st, p = st.ship.position.clone(), blocked = moBlocked(p);
  const ring = () => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 28), K.basic(blocked ? 0xff6060 : 0x7dffb5, { transparent: true })); MS.S.scene.add(m); return m; };
  const say = { status: ["Houston, Apollo. All systems are good in lunar orbit.", "Roger, Apollo. Copy all good."], sendphoto: ["Houston, sending you a picture of the far side!", "Wow! We see it, Apollo. Beautiful!"], go: ["Houston, are we GO for landing?", "Apollo, you are GO for landing!"] }[id];
  flChat(0, say[0]);
  if (blocked) { const hit = p.clone().add(MO_E.clone().multiplyScalar(-p.dot(MO_E) - Math.sqrt(Math.max(0, MO_R * MO_R - p.clone().sub(MO_E.clone().multiplyScalar(p.dot(MO_E))).lengthSq()))));
    for (let i = 0; i < 3; i++) setTimeout(() => MO.pulses.push({ m: ring(), from: p, to: hit, t: 0, T: 0.5, done: i === 2 ? () => moFail(id) : null }), i * 180); return; }
  for (let i = 0; i < 3; i++) setTimeout(() => MO.pulses.push({ m: ring(), from: p, to: MO_EP, t: 0, T: 1.28, done: i === 2 ? () => { for (let j = 0; j < 3; j++) setTimeout(() => MO.pulses.push({ m: ring(), from: MO_EP.clone(), to: MS.S.st.ship.position.clone(), t: 0, T: 1.28, done: j === 2 ? () => moOK(id, say[1]) : null }), j * 180); } : null }), i * 180);
  flBanner("📡 Signal travelling at the speed of light: 1.28 s to Earth, 1.28 s back", 3000); }
function moOK(id, reply) { flChat("capcom", reply); SND.beep(); MO.tasks[id] = 1; MO.sent++; msPoints(300, "message received by Earth"); moTasksUI(); if (MO.sent >= 3) { flBanner("✅ <b>Apollo, you are GO for landing!</b>", 5000); flSpeak("Apollo, you are go for landing."); } }
function moFail(id) { SND.tone(200, 0.4, "sawtooth", 0.06); MO.fails[id] = (MO.fails[id] || 0) + 1; flBanner("🚫 <b>BLOCKED!</b> The Moon is between you and Earth", 3500);
  if (MO.fails[id] === 1) apSay("sad", "The signal hit the Moon! Radio travels in straight lines and can't go through rock. <b>One more chance:</b> wait until you're over the <b>near side</b> (green radio line), then send.", 9000);
  else { msPoints(-200, "message blocked again"); apSay("angry", "Blocked again! Watch the radio line: <b>green</b> = Earth can hear you, <b>red</b> = blocked.", 8000); } }
function moUndock() { SND.click(); document.getElementById("kepBox") && document.getElementById("kepBox").remove(); flFadeTo(() => XFER3D()); }
// ---------------------------------------------------------------- TEI: from Moon orbit back toward Earth
function MOONTEI() { MOONORB(); flSteps(10); FL.ph = "moonorb"; Object.assign(MO, { ph: "tei", s: moState(-1.4, 1.67), judged: false, tdv: 0, tasksOn: true, hold: false, burned: false });
  MS.S.st.ship.children[1].visible = false; flChat("capcom", "Apollo, you are GO for TEI. See you on the other side."); moTeiUI(); }
function moTeiUI() { apHint("Hold to burn. If you stop too early you stay in Moon orbit; burn again on the next pass. Apollo 11: about 1.0 km/s.");
  apPanel(`<h3>🔥 Trans-Earth Injection (TEI)</h3><p class="lead">Fire the Service Module engine <b>forwards</b> to speed up and escape the Moon's gravity. Apollo 11 did it <b>behind the Moon</b>: about 2½ minutes, about <b>1.0 km/s</b>.</p>
    <div class="lcRow" style="align-items:center">${K.meter("moDv", "Speed added")}<button class="btn go pulse holdBtn" id="moTei" onpointerdown="moTei(1);event.preventDefault()">🔥 HOLD to burn</button></div>`); K.setMeter("moDv", MO.tdv * 0.8 / 1.4, (MO.tdv * 0.8).toFixed(2) + " km/s"); }
function moTei(on) { if (MO.ph !== "tei") return; if (!on && !MO.hold) return; MO.hold = !!on; if (on) { MO.burned = true; flRumble(true, 0.1); } else { flRumble(false); if (MO.burned) moTeiJudge(); } }
function moTeiJudge() { MO.burned = false; const el = moEl(MO.s), d = MO.tdv * 0.8;
  if (el.e < 1) { flBanner("🌙 Still in Moon orbit! Not fast enough to escape the Moon's gravity", 4500); apSay("sad", `You added ${d.toFixed(2)} km/s. The orbit stretched, but the Moon still holds you. <b>Burn some more!</b>`, 7000); return; }
  MO.ph = "teigo"; msPoints(d > 0.9 && d < 1.2 ? 1000 : 500, d > 0.9 && d < 1.2 ? "perfect TEI: heading home" : "TEI: heading home"); flSpeak("Burn complete. We are on our way home.");
  flBanner("🏠 We escaped the Moon! Heading home to Earth", 4000); MS.ui.innerHTML = ""; setTimeout(() => flFadeTo(() => TEC3D()), 4000); }

// release anywhere on the screen stops the burn (a pressed button can lose the mouse when it changes)
addEventListener("pointerup", () => { if (MO.hold) { if (MO.ph === "arrive") moBurn(0); else if (MO.ph === "tei") moTei(0); } });
addEventListener("keydown", (e) => { if (e.code === "Space" && !e.repeat && MS.S && MS.S.key === "moonorb") { if (MO.ph === "arrive") { moBurn(1); e.preventDefault(); } else if (MO.ph === "tei") { moTei(1); e.preventDefault(); } } });
addEventListener("keyup", (e) => { if (e.code === "Space" && MO.hold) { if (MO.ph === "arrive") moBurn(0); else if (MO.ph === "tei") moTei(0); } });
addEventListener("blur", () => { if (MO.hold) { if (MO.ph === "arrive") moBurn(0); else if (MO.ph === "tei") moTei(0); } });
addEventListener("pointercancel", () => { if (MO.hold) { if (MO.ph === "arrive") moBurn(0); else if (MO.ph === "tei") moTei(0); } });
