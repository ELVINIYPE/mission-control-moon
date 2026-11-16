// academy.js — PART 4: the Training Academy.
// A hub with 26 short 3D lessons in 6 tracks. Every lesson has 3 steps:
//   1 SEE  (one big idea, shown in 3D, read out by Instructor Sunny)
//   2 TRY  (one challenge)
//   3 WHY  (what happened and why, with real NASA numbers)
// Passing a lesson gives a badge. Badges raise your rank and float around your astronaut.
// Each lesson lives in its own file and calls regModule({...}).

const ACAD = { built: false, running: false, L: null, hub: null, wrap: null, ui: null, renderer: null, track: "all", last: 0 };
const MODULES = {};
function regModule(m) { MODULES[m.no] = m; }

const TRACKS = [
  { id: "rockets", ico: "🚀", name: "Rockets", color: "#ff9a3d" },
  { id: "orbits", ico: "🌍", name: "Orbits", color: "#4aa8ff" },
  { id: "moon", ico: "🌙", name: "To the Moon", color: "#c9d2e3" },
  { id: "systems", ico: "🛰️", name: "Spacecraft systems", color: "#2fbf71" },
  { id: "humans", ico: "👩‍🚀", name: "Humans in space", color: "#ff6b9a" },
  { id: "design", ico: "🧠", name: "Mission design", color: "#b18cff" },
];
// the full plan: lessons that are not built yet show as "coming soon"
const ROADMAP = [
  [1, "rockets", "🔥", "Why rockets fly"], [2, "rockets", "🧱", "Rocket stages"], [3, "rockets", "⚖️", "The mass spiral"], [4, "rockets", "↗️", "The gravity turn"], [5, "rockets", "🛟", "Launch abort"],
  [6, "orbits", "💣", "Newton's cannon"], [7, "orbits", "🔭", "Low vs high orbit"], [8, "orbits", "🔗", "Rendezvous & docking"], [9, "orbits", "⛽", "Orbital gas station"],
  [10, "moon", "🎯", "Aim for the Moon (TLI)"], [11, "moon", "⛰️", "The gravity hill"], [12, "moon", "🌀", "Moon orbits"], [13, "moon", "🦅", "Landing on the Moon"], [14, "moon", "🪐", "Gravity slingshot"], [15, "moon", "🔴", "Launch windows to Mars"],
  [16, "systems", "☀️", "Power: Sun & batteries"], [17, "systems", "📡", "Talking to Earth"], [18, "systems", "💾", "Data budget"], [19, "systems", "🌡️", "Hot and cold"], [20, "systems", "🫁", "Life support"],
  [21, "humans", "🧑‍🚀", "Build a spacesuit"], [22, "humans", "☢️", "Radiation shield"], [23, "humans", "☄️", "Coming home (re-entry)"], [24, "humans", "🧊", "Living on the Moon"],
  [25, "design", "🏛️", "Apollo vs Artemis"], [26, "design", "🤝", "Teamwork"],
];
const RANKS = [{ n: 0, name: "Cadet", ico: "🎒" }, { n: 4, name: "ASCAN (astronaut candidate)", ico: "🥉" }, { n: 12, name: "Astronaut", ico: "🥈" }, { n: 26, name: "Commander", ico: "🥇" }];
const rankOf = (n) => RANKS.filter((r) => n >= r.n).pop();
const nextRank = (n) => RANKS.find((r) => r.n > n);

// badges are remembered in this browser (if the browser allows it)
GAME.badges = (() => { try { return JSON.parse(localStorage.getItem("mcm-badges") || "[]"); } catch (e) { return []; } })();
GAME.unlocks = (() => { try { return JSON.parse(localStorage.getItem("mcm-unlocks") || "{}"); } catch (e) { return {}; } })();
function saveBadges() { try { localStorage.setItem("mcm-badges", JSON.stringify(GAME.badges)); localStorage.setItem("mcm-unlocks", JSON.stringify(GAME.unlocks)); } catch (e) {} }

// ---------- one renderer for the whole Academy ----------
function acadInit() {
  if (ACAD.built) return;
  const wrap = document.createElement("div"); wrap.id = "acad"; wrap.hidden = true;
  const cv = document.createElement("canvas"); wrap.appendChild(cv);
  const ui = document.createElement("div"); ui.id = "acadUI"; wrap.appendChild(ui);
  document.body.appendChild(wrap);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  Object.assign(ACAD, { wrap, ui, renderer, built: true });
  // drag to look around (lessons that allow it)
  let drag = null;
  cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; });
  addEventListener("pointerup", () => (drag = null));
  addEventListener("pointermove", (e) => {
    if (!drag || !ACAD.L || !ACAD.L.orbit) return; const o = ACAD.L.orbit;
    o.yaw -= (e.clientX - drag.x) * 0.006; o.pitch = Math.max(-0.2, Math.min(1.3, o.pitch + (e.clientY - drag.y) * 0.004)); o.dragged = performance.now();
    drag = { x: e.clientX, y: e.clientY };
  });
}
function acadResize(cam) {
  const r = ACAD.renderer, w = innerWidth, h = innerHeight, c = r.domElement;
  if (c.width !== Math.round(w * r.getPixelRatio()) || c.height !== Math.round(h * r.getPixelRatio())) r.setSize(w, h);
  if (cam && cam.aspect !== w / h) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
}
function acadLights(scene, sun = 1.1) {
  scene.add(new THREE.AmbientLight(0x8899bb, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, sun); key.position.set(5, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0x66aaff, 0.45); rim.position.set(-6, 3, -5); scene.add(rim);
  return key;
}
function disposeScene(scene) {
  scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { if (x.map) x.map.dispose(); x.dispose(); }); });
}
function acadSpeak(text) { if (typeof crewSpeak === "function") crewSpeak(1, String(text).replace(/<[^>]+>/g, "")); }
function acadHush() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }

// ---------- the hub: your astronaut + badges floating around them ----------
function medalTex(ico, gold = true) {
  return canvasTex(160, 160, (x, w, h) => {
    const g = x.createRadialGradient(64, 60, 10, 80, 80, 78); g.addColorStop(0, gold ? "#fff4c2" : "#dfe8f5"); g.addColorStop(0.55, gold ? "#f0b93a" : "#9fb0c8"); g.addColorStop(1, gold ? "#8a5a0a" : "#4b5a72");
    x.fillStyle = g; x.beginPath(); x.arc(80, 80, 76, 0, 7); x.fill();
    x.strokeStyle = "rgba(255,255,255,.7)"; x.lineWidth = 4; x.beginPath(); x.arc(80, 80, 64, 0, 7); x.stroke();
    x.font = "64px serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(ico, 80, 86);
  });
}
function buildHub() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x02030a); starfield(scene, 4000); acadLights(scene, 1.0);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 2000); camera.position.set(0, 0.2, 9); camera.lookAt(0, 0, 0);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4.2, 64, 48), new THREE.MeshStandardMaterial({ map: moonTexture(), roughness: 1 }));
  moon.position.set(7.5, -3.2, -9); scene.add(moon);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 32), new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.7 }));
  earth.position.set(-1.5, 3.6, -14); scene.add(earth); const eg = glowSprite("rgba(90,170,255,0.5)", 3.2); eg.position.copy(earth.position); scene.add(eg);
  // a glowing training ring under the astronaut
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.025, 8, 96), new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.6 }));
  ring.rotation.x = Math.PI / 2; scene.add(ring);
  const astro = hubAstronaut(); scene.add(astro);
  ACAD.hub = { scene, camera, moon, earth, ring, astro, medals: [] };
  hubMedals();
}
function hubAstronaut() {
  const c = (GAME.crew || [])[0];
  const a = c ? makeAstronaut({ faceTex: faceTexFrom(c.face), depthTex: genericDepthTex(), stripe: c.stripe, cdr: true, name: `${c.tag || "CDR"} ${(c.kind === "human" ? c.name : c.short || "").toUpperCase().slice(0, 9)}` })
              : makeAstronaut({ face: true, name: "CDR ELVIN" });
  a.scale.setScalar(0.3); return a;
}
function hubMedals() {
  const H = ACAD.hub; H.medals.forEach((m) => H.scene.remove(m)); H.medals = [];
  GAME.badges.forEach((no) => { const m = MODULES[no]; if (!m) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: medalTex(m.badgeIco || m.ico), transparent: true })); s.scale.set(0.55, 0.55, 1); H.scene.add(s); H.medals.push(s); });
}
function hubUpdate(dt, t) {
  const H = ACAD.hub, wide = innerWidth > 900;
  const ax = wide ? 3.0 : 0, ay = wide ? 0.0 : 1.6;
  H.astro.position.set(ax, ay + Math.sin(t * 1.1) * 0.12, 0); H.astro.rotation.y = -0.35 + Math.sin(t * 0.4) * 0.3;
  const arms = H.astro.userData.arms; arms[1].rotation.z = 2.2 + Math.sin(t * 4) * 0.25; arms[0].rotation.z = -0.3;
  H.ring.position.set(ax, ay - 1.25, 0); H.ring.rotation.z = t * 0.3;
  H.moon.rotation.y = t * 0.03; H.earth.rotation.y = t * 0.2;
  H.medals.forEach((m, i) => { const a = t * 0.6 + (i / H.medals.length) * Math.PI * 2;
    m.position.set(ax + Math.cos(a) * 1.55, ay + 0.2 + Math.sin(a * 2) * 0.25, Math.sin(a) * 1.55); });
  acadResize(H.camera); H.camera.fov = wide ? 42 : 60; H.camera.updateProjectionMatrix();
}
function renderHub() {
  const n = GAME.badges.length, total = ROADMAP.length, r = rankOf(n), nx = nextRank(n);
  const built = Object.keys(MODULES).length;
  const tabs = [{ id: "all", ico: "✨", name: "All" }].concat(TRACKS).map((t) => `<button class="acTab ${ACAD.track === t.id ? "on" : ""}" onclick="SND.click();ACAD.track='${t.id}';renderHub()">${t.ico} ${t.name}</button>`).join("");
  const cards = ROADMAP.filter((m) => ACAD.track === "all" || m[1] === ACAD.track).sort((a, b) => !!MODULES[b[0]] - !!MODULES[a[0]]).map(([no, tr, ico, title]) => {
    const T = TRACKS.find((x) => x.id === tr), M = MODULES[no], got = GAME.badges.includes(no);
    const state = got ? "done" : M ? "open" : "soon";
    return `<button class="mcard ${state}" style="--c:${T.color}" ${M ? `onclick="startModule(${no})"` : "disabled"}>
      <span class="mno">${no}</span><span class="mico">${M ? M.ico : ico}</span>
      <b>${M ? M.title : title}</b><small>${T.ico} ${T.name}</small>
      <span class="mstate">${got ? "🎖️ Badge earned · play again" : M ? "▶ Play · about 2 min" : "🔒 Coming soon"}</span></button>`;
  }).join("");
  ACAD.ui.innerHTML = `<div class="acHub">
    <div class="acHead"><div class="kicker">🎓 Training Academy</div><h2>Earn your astronaut wings</h2>
      <p class="lead">Short 3D lessons, one big idea each. Real NASA numbers. Pass a lesson to win its badge.</p>
      <div class="acRank"><span class="ri">${r.ico}</span><div class="rk"><b>Rank: ${r.name}</b>
        <div class="bar"><i style="width:${(n / total) * 100}%"></i></div>
        <small>${n} of ${total} badges${nx ? ` · next rank: ${nx.ico} ${nx.name} at ${nx.n}` : " · top rank!"} · ${built} lessons ready</small></div></div>
    </div>
    <div class="acTabs">${tabs}</div>
    <div class="acGrid">${cards}</div>
    <div class="row"><button class="btn ghost" onclick="SND.click();acadExit()">← Back to the crew</button></div>
  </div>`;
}
function acadExit() { acadHush(); if (typeof ROOM !== "undefined" && ROOM.built) showScreen("choice"); else showScreen("intro"); }

// ---------- a lesson ----------
function startModule(no) {
  const m = MODULES[no]; if (!m) return; SND.init(); SND.click(); acadHush();
  if (ACAD.L) endModule();
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x02030a);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 3000);
  const L = ACAD.L = { m, scene, camera, t: 0, step: "see", seeI: 0, labels: [], st: {}, orbit: null };
  L.label = (html, pos, cls = "") => { const el = document.createElement("div"); el.className = "acLbl " + cls; el.innerHTML = html; document.getElementById("acLabels").appendChild(el); const o = { el, pos }; L.labels.push(o); return o; };
  L.unlabel = (o) => { if (!o) return; o.el.remove(); L.labels = L.labels.filter((x) => x !== o); };
  L.caption = (html, speak = true) => { const c = document.getElementById("acCapTxt"); if (c) c.innerHTML = html; if (speak) acadSpeak(html); };
  L.ctl = (html) => { const c = document.getElementById("acCtl"); c.innerHTML = html; c.hidden = !html; };
  L.toast = (html, bad) => { const t = document.getElementById("acToast"); t.innerHTML = html; t.className = "show" + (bad ? " bad" : ""); clearTimeout(L.toastT); L.toastT = setTimeout(() => (t.className = ""), 2600); };
  L.finish = (ok, o) => finishModule(ok, o);
  ACAD.ui.innerHTML = `<div class="acLesson">
    <div class="acBar"><button class="btn ghost sm" onclick="SND.click();backToHub()">← Academy</button>
      <div class="acTitle"><span>${m.ico}</span> <small>Lesson ${m.no}</small> ${m.title}</div>
      <div class="acSteps"><span data-s="see">1 · SEE</span><span data-s="try">2 · TRY</span><span data-s="why">3 · WHY</span></div></div>
    <div id="acLabels"></div>
    <div class="acCap" id="acCap"><div class="who">🎓 Instructor Sunny</div><div class="txt" id="acCapTxt"></div><div class="acCapBtns" id="acCapBtns"></div></div>
    <div class="acCtl" id="acCtl" hidden></div>
    <div id="acToast"></div>
    <div class="acResult" id="acResult" hidden></div>
  </div>`;
  m.build(L);
  showSee(0);
}
function setStep(s) { ACAD.L.step = s; document.querySelectorAll(".acSteps span").forEach((e) => e.classList.toggle("on", e.dataset.s === s)); }
function showSee(i) {
  const L = ACAD.L, m = L.m, s = m.see[i]; setStep("see"); L.seeI = i; L.ctl("");
  document.getElementById("acCap").classList.remove("goal");
  L.caption(s.text); if (s.go) s.go(L);
  const last = i === m.see.length - 1;
  document.getElementById("acCapBtns").innerHTML =
    (i > 0 ? `<button class="btn ghost sm" onclick="SND.click();showSee(${i - 1})">◀ Back</button>` : "") +
    `<span class="dots">${m.see.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</span>` +
    `<button class="btn go sm" onclick="SND.click();${last ? "startTry()" : `showSee(${i + 1})`}">${last ? "Start the challenge ▶" : "Next ▶"}</button>`;
}
function startTry() {
  const L = ACAD.L, m = L.m; setStep("try"); acadHush();
  document.getElementById("acResult").hidden = true;
  document.getElementById("acCap").classList.add("goal");
  L.caption(`<b>🎯 Your challenge:</b> ${m.goal}`, true);
  document.getElementById("acCapBtns").innerHTML = `<button class="btn ghost sm" onclick="SND.click();showSee(0)">↺ Watch the lesson again</button>`;
  if (m.reset) m.reset(L);
  L.ctl(m.tryUI(L)); m.tryStart(L);
}
function finishModule(ok, o) {
  const L = ACAD.L; if (!L || L.step === "why") return; setStep("why");
  ok ? SND.beep() : SND.tone(220, 0.4, "sawtooth", 0.06);
  const r = document.getElementById("acResult"); r.hidden = false; r.className = "acResult " + (ok ? "ok" : "bad");
  r.innerHTML = `<div class="card"><div class="rh">${ok ? "✅ Challenge passed!" : "❌ Not this time"}</div><h3>${o.title}</h3>
    <ul>${o.why.map((w) => `<li>${w}</li>`).join("")}</ul>
    ${o.fact || L.m.fact ? `<div class="fact"><div class="fh">📊 Real numbers</div>${o.fact || L.m.fact}</div>` : ""}
    <div class="src">Sources: ${L.m.sources}</div>
    <div class="row">${ok ? `<button class="btn go" onclick="awardBadge()">🎖️ Collect your badge</button>`
      : `<button class="btn go" onclick="SND.click();startTry()">↻ Try again</button><button class="btn ghost" onclick="SND.click();backToHub()">← Academy</button>`}</div></div>`;
  acadSpeak((ok ? "Challenge passed! " : "Not this time. ") + o.title);
}
function awardBadge() {
  const L = ACAD.L, m = L.m, isNew = !GAME.badges.includes(m.no);
  if (isNew) GAME.badges.push(m.no); if (m.unlock) GAME.unlocks[m.unlock.key] = true; saveBadges();
  const n = GAME.badges.length, r = rankOf(n), rankUp = isNew && RANKS.some((x) => x.n === n && n > 0);
  const nextNo = ROADMAP.map((x) => x[0]).find((no) => MODULES[no] && !GAME.badges.includes(no));
  SND.beep(); setTimeout(() => SND.tone(1568, 0.3, "sine", 0.1), 260);
  const res = document.getElementById("acResult");
  res.className = "acResult award"; res.hidden = false;
  res.innerHTML = `<div class="card medal"><div class="confetti">${Array.from({ length: 28 }, (_, k) => `<i style="left:${(k * 3.6 + Math.random() * 3).toFixed(1)}%;animation-delay:${((k % 7) * 0.3).toFixed(1)}s"></i>`).join("")}</div>
    <div class="bigMedal"><span>${m.badgeIco || m.ico}</span></div>
    <div class="rh">${isNew ? "New badge!" : "Badge already earned, well flown!"}</div><h3>${m.badge}</h3>
    <p class="use">🧭 You'll use this in: <b>${m.useIn}</b></p>
    ${m.unlock ? `<p class="unlock">🔓 Unlocked: <b>${m.unlock.text}</b></p>` : ""}
    ${rankUp ? `<p class="rankup">${r.ico} Rank up! You are now: <b>${r.name}</b></p>` : `<p class="use">${r.ico} Rank: ${r.name} · ${n} of ${ROADMAP.length} badges</p>`}
    <div class="row">${nextNo ? `<button class="btn go" onclick="startModule(${nextNo})">Next lesson ▶</button>` : ""}<button class="btn ghost" onclick="SND.click();backToHub()">🏠 Academy</button></div></div>`;
  acadSpeak(`New badge: ${m.badge}!`);
}
function endModule() {
  const L = ACAD.L; if (!L) return; if (L.m.stop) L.m.stop(L); clearTimeout(L.toastT);
  disposeScene(L.scene); ACAD.L = null;
}
function backToHub() { acadHush(); endModule(); hubMedals(); renderHub(); }

// ---------- main loop ----------
const _lp = new THREE.Vector3();
function acadLoop() {
  if (!ACAD.running) return; requestAnimationFrame(acadLoop);
  const now = performance.now(), dt = Math.min(0.05, (now - ACAD.last) / 1000); ACAD.last = now; const t = now / 1000;
  const L = ACAD.L;
  if (L) {
    acadResize(L.camera); L.t += dt;
    if (L.orbit) { const o = L.orbit; if (o.auto && (!o.dragged || now - o.dragged > 4000)) o.yaw += o.auto * dt;
      L.camera.position.set(o.target.x + Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist, o.target.y + Math.sin(o.pitch) * o.dist, o.target.z + Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist);
      L.camera.lookAt(o.target); }
    L.m.update && L.m.update(L, dt, L.t);
    L.labels.forEach((o) => { const p = typeof o.pos === "function" ? o.pos() : o.pos; if (!p) { o.el.style.display = "none"; return; }
      _lp.copy(p).project(L.camera); const vis = _lp.z < 1 && Math.abs(_lp.x) < 1.1 && Math.abs(_lp.y) < 1.1;
      o.el.style.display = vis ? "" : "none"; o.el.style.left = ((_lp.x + 1) / 2) * innerWidth + "px"; o.el.style.top = ((1 - _lp.y) / 2) * innerHeight + "px"; });
    ACAD.renderer.render(L.scene, L.camera);
  } else if (ACAD.hub) { hubUpdate(dt, t); ACAD.renderer.render(ACAD.hub.scene, ACAD.hub.camera); }
}

SCREENS.academy = {
  show(no) {
    acadInit(); if (SCREENS.intro) SCREENS.intro.hide();
    ACAD.wrap.hidden = false; if (!ACAD.hub) buildHub();
    else { ACAD.hub.scene.remove(ACAD.hub.astro); ACAD.hub.astro = hubAstronaut(); ACAD.hub.scene.add(ACAD.hub.astro); hubMedals(); }   // your newest astronaut
    renderHub();
    if (!ACAD.running) { ACAD.running = true; ACAD.last = performance.now(); acadLoop(); }
    if (no && MODULES[no]) startModule(no);
  },
  hide() { ACAD.running = false; acadHush(); if (ACAD.L) endModule(); if (ACAD.wrap) ACAD.wrap.hidden = true; },
};
