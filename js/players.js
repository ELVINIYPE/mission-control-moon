// players.js — PART 2: how many players → each player makes an astronaut (photo or cartoon) + name
// → pick computer crewmates (Hall of Heroes) → 3D Mission Control room with 4 seats → READY.
// Everything is on one computer for now; the room code (online play) comes later with Firebase.

const ROLES = {
  cdr: { name: "Commander", ico: "🧑‍✈️", tag: "CDR", duty: "launch, staging and landing" },
  eng: { name: "Engineer", ico: "🔧", tag: "ENG", duty: "rocket, fuel and fixing problems" },
  nav: { name: "Navigator", ico: "🧭", tag: "NAV", duty: "orbits, aiming and Moon rocks" },
  com: { name: "Comms", ico: "📡", tag: "COM", duty: "budget, Go/No-Go and calling Earth" },
};
// who does which job, for 1–4 real players (computer crewmates only give advice)
const ROLE_SPLIT = { 1: [["cdr", "eng", "nav", "com"]], 2: [["cdr", "nav"], ["eng", "com"]], 3: [["cdr", "com"], ["eng"], ["nav", "com"]], 4: [["cdr"], ["eng"], ["nav"], ["com"]] };

// original crewmates (our own faces), each inspired by a real space hero
const CREWMATES = [
  { id: "nova", name: "Captain Nova Reyes", short: "NOVA", spec: "Flight & landing expert", advises: "flying", stripe: 0xc0392b,
    face: { skin: SKINS[1], eyes: "#3a6ea8", smile: "calm", brows: "#5a3a20" },
    hero: { name: "Neil Armstrong", line: "First person to walk on the Moon", facts: ["Commander of Apollo 11, July 20, 1969", "\"That's one small step for man, one giant leap for mankind.\"", "Flew the lander by hand to a safe spot, with only about 25 seconds of fuel to spare"] } },
  { id: "sunny", name: "Dr. Sunny Scott", short: "SUNNY", spec: "Navigator & scientist", advises: "orbits and science", stripe: 0x2f6fd6,
    face: { skin: SKINS[3], eyes: "#3b2414", smile: "big", brows: "#2a1c14" },
    hero: { name: "Sunita Williams", line: "NASA astronaut and record-breaking spacewalker", facts: ["Has spent more than 600 days in space in total", "9 spacewalks: the most spacewalking time of any woman (over 62 hours)", "Flew on the first crewed Boeing Starliner test flight in 2024"] } },
  { id: "jack", name: "Jack \"Rocket\" Steel", short: "JACK", spec: "Tough engineer: fixes anything", advises: "engines and repairs", stripe: 0x2fbf71,
    face: { skin: SKINS[0], eyes: "#555", smile: "calm", brows: "#2a1c14", beard: "#3a2a20" },
    hero: { name: "Rakesh Sharma", line: "First Indian citizen in space", facts: ["Flew on Soyuz T-11 to the Salyut 7 space station in April 1984", "Spent almost 8 days in orbit", "Asked how India looked from space, he said \"Saare Jahan Se Achha\" (better than the whole world)"] } },
];
GAME.crew = [];          // the 4 seats, filled in this part: { kind: "human"|"ai", name, tag, face (dataURL), stripe, roles, mate }

// ---------- one overlay for all of Part 2 ----------
const P2 = document.createElement("div"); P2.id = "p2"; P2.hidden = true; document.body.appendChild(P2);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function p2(html) { P2.hidden = false; P2.className = ""; P2.innerHTML = html; }
function rolesText(roles) { return roles.map((r) => `${ROLES[r].ico} ${ROLES[r].name}`).join(" + "); }

// ===== A. how many players? =====
SCREENS.players = {
  show() {
    SCREENS.intro.backdrop();
    const card = (n, title, text) => `<button class="pcard" onclick="pickCount(${n})"><div class="pnum">${n}</div><div class="pfaces">${"🧑‍🚀".repeat(n)}${"🤖".repeat(4 - n)}</div><b>${title}</b><p>${text}</p></button>`;
    p2(`<div class="panel wide"><div class="kicker">Step 1 of 4 · Your crew</div><h2>How many people are playing?</h2>
      <p class="lead">A Moon mission needs 4 jobs. Real players take the jobs, and friendly computer crewmates (🤖) fill the empty seats and give advice.</p>
      <div class="pcards">
        ${card(1, "Just me", "You make every decision. Your 3 crewmates give advice.")}
        ${card(2, "2 players", "Each of you does 2 jobs. Pick 2 crewmates to help.")}
        ${card(3, "3 players", "Each of you does 1 job, and you share Comms. Pick 1 crewmate.")}
        ${card(4, "4 players", "A full crew! Everyone has their own job.")}
      </div>
      <p class="note">🖥️ For now, everyone plays on this computer. 🌐 Playing online with a room code is coming soon.</p>
      <div class="row"><button class="btn ghost" onclick="SND.click();showScreen('intro')">← Back</button></div></div>`);
  },
  hide() { P2.hidden = true; },
};
function pickCount(n) { SND.click(); GAME.nPlayers = n; GAME.humans = []; showScreen("avatar", 0); }

// ===== B. make your astronaut (photo or cartoon) + name =====
const AV = { renderer: null, scene: null, camera: null, astro: null, running: false, stream: null };
function avatarPreviewInit(canvas) {
  AV.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); AV.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  AV.scene = new THREE.Scene();
  AV.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100); AV.camera.position.set(0, 0.25, 4.6); AV.camera.lookAt(0, 0.05, 0);
  AV.scene.add(new THREE.AmbientLight(0x8899bb, 0.6));
  const s = new THREE.DirectionalLight(0xffffff, 1.1); s.position.set(3, 4, 5); AV.scene.add(s);
  const r = new THREE.DirectionalLight(0x66aaff, 0.5); r.position.set(-4, 2, -3); AV.scene.add(r);
}
function avatarPreviewLoop() {
  if (!AV.running) return;
  const c = AV.renderer.domElement, w = c.clientWidth, h = c.clientHeight;
  if (c.width !== Math.round(w * AV.renderer.getPixelRatio())) { AV.renderer.setSize(w, h, false); AV.camera.aspect = w / h; AV.camera.updateProjectionMatrix(); }
  const t = performance.now() / 1000;
  if (AV.astro) { AV.astro.rotation.y = Math.sin(t * 0.6) * 0.55 + (AV.spin || 0); AV.astro.position.y = Math.sin(t * 1.2) * 0.05;
    const a = AV.astro.userData.arms; a[1].rotation.z = 2.2 + Math.sin(t * 5) * 0.25; a[0].rotation.z = -0.3; }
  AV.renderer.render(AV.scene, AV.camera); requestAnimationFrame(avatarPreviewLoop);
}
function buildPreview(h) {
  if (AV.astro) AV.scene.remove(AV.astro);
  AV.astro = makeAstronaut({ faceTex: faceTexFrom(h.face), depthTex: genericDepthTex(), name: `${ROLES[h.roles[0]].tag} ${(h.name || "?").toUpperCase().slice(0, 9)}`, stripe: h.stripe, cdr: h.roles.includes("cdr") });
  AV.astro.scale.setScalar(0.42); AV.astro.position.y = 0; AV.scene.add(AV.astro);
}
const STRIPES = [0xe8590c, 0x2f6fd6, 0x2fbf71, 0x8a5cd6];
SCREENS.avatar = {
  show(i) {
    SCREENS.intro.backdrop();
    const n = GAME.nPlayers, roles = ROLE_SPLIT[n][i];
    const h = GAME.humans[i] || (GAME.humans[i] = { kind: "human", name: "", roles, mode: "cartoon", look: { skin: SKINS[2], glasses: false, smile: "smile", eyes: "#4a2e1a" }, stripe: STRIPES[i] });
    h.roles = roles; if (!h.face) h.face = cartoonFace(h.look);
    const sw = SKINS.map((c, k) => `<button class="sw ${h.look.skin === c ? "on" : ""}" style="background:${c}" onclick="avLook('skin','${c}')" aria-label="skin tone ${k + 1}"></button>`).join("");
    const st = STRIPES.map((c) => `<button class="sw ${h.stripe === c ? "on" : ""}" style="background:#${c.toString(16).padStart(6, "0")}" onclick="avStripe(${c})" aria-label="suit colour"></button>`).join("");
    p2(`<div class="panel av">
      <div class="avLeft">
        <div class="kicker">Step 2 of 4 · Player ${i + 1} of ${n}</div>
        <h2>Make your astronaut</h2>
        <p class="lead">Your jobs: <b>${rolesText(roles)}</b><br><small>${roles.map((r) => ROLES[r].duty).join(" · ")}</small></p>
        <label class="lbl2">Your name<input id="avName" maxlength="14" placeholder="Type your name" value="${esc(h.name)}"></label>
        <div class="row">
          <button class="btn ${h.mode === "photo" ? "" : "ghost"}" onclick="avCamera()">📸 Take a photo</button>
          <button class="btn ${h.mode === "cartoon" ? "" : "ghost"}" onclick="avCartoon()">🎨 Cartoon face</button>
        </div>
        <p class="note">🔒 Your photo stays only in this game on this computer, and is deleted when the game ends.</p>
        <div id="avOpts" ${h.mode === "photo" ? "hidden" : ""}>
          <div class="opt"><span>Skin</span>${sw}</div>
          <div class="opt"><span>Smile</span>${["smile", "big", "calm"].map((s) => `<button class="chipb ${h.look.smile === s ? "on" : ""}" onclick="avLook('smile','${s}')">${{ smile: "🙂", big: "😁", calm: "😐" }[s]}</button>`).join("")}
            <span>Glasses</span><button class="chipb ${h.look.glasses ? "on" : ""}" onclick="avLook('glasses',${!h.look.glasses})">👓</button></div>
        </div>
        <div class="opt"><span>Suit colour</span>${st}</div>
        <div class="row end"><button class="btn ghost" onclick="avBack()">← Back</button><button class="btn go" onclick="avNext()">Next ▶</button></div>
      </div>
      <div class="avRight" id="avWrap"><div class="spinHint">🔄 drag to turn</div></div>
    </div>
    <div class="modal" id="camModal" hidden><div class="card cam">
      <h2>📸 Put your face in the oval</h2>
      <div class="camBox"><video id="camVideo" autoplay playsinline muted></video><div class="oval"></div></div>
      <p class="note" id="camMsg">Look at the camera and smile! Good light helps.</p>
      <div class="row"><button class="btn ghost" onclick="avCamClose()">Cancel</button><button class="btn go" id="snapBtn" onclick="avSnap()">📸 Snap!</button></div>
    </div></div>`);
    AV.i = i;
    if (!AV.renderer) { AV.canvas = document.createElement("canvas"); AV.canvas.id = "avCanvas"; avatarPreviewInit(AV.canvas); }
    document.getElementById("avWrap").prepend(AV.canvas); buildPreview(h);
    if (!AV.running) { AV.running = true; avatarPreviewLoop(); }
    const cv = document.getElementById("avCanvas"); let dx = null;
    cv.onpointerdown = (e) => (dx = e.clientX); addEventListener("pointerup", () => (dx = null));
    cv.onpointermove = (e) => { if (dx !== null) { AV.spin = (AV.spin || 0) + (e.clientX - dx) * 0.01; dx = e.clientX; } };
    const nm = document.getElementById("avName"); nm.oninput = () => { h.name = nm.value.trim(); buildPreview(h); }; setTimeout(() => nm.focus(), 100);
  },
  hide() { AV.running = false; avCamClose(); P2.hidden = true; },
};
const curH = () => GAME.humans[AV.i];
function avLook(k, v) { const h = curH(); h.look[k] = v; h.mode = "cartoon"; h.face = cartoonFace(h.look); SND.click(); showScreen("avatar", AV.i); }
function avStripe(c) { curH().stripe = c; SND.click(); showScreen("avatar", AV.i); }
function avCartoon() { const h = curH(); h.mode = "cartoon"; h.face = cartoonFace(h.look); SND.click(); showScreen("avatar", AV.i); }
async function avCamera() {
  SND.click(); const m = document.getElementById("camModal"); m.hidden = false;
  try {
    AV.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    document.getElementById("camVideo").srcObject = AV.stream;
  } catch (e) {
    document.getElementById("camMsg").textContent = "😕 The camera didn't open (no camera, or permission was blocked). No problem: use a cartoon face instead!";
    document.getElementById("snapBtn").hidden = true;
  }
}
function avSnap() {
  const v = document.getElementById("camVideo"); if (!v || !v.videoWidth) return;
  const h = curH(); h.face = photoFace(v); h.mode = "photo"; SND.beep(); avCamClose(); showScreen("avatar", AV.i);
}
function avCamClose() { if (AV.stream) { AV.stream.getTracks().forEach((t) => t.stop()); AV.stream = null; } const m = document.getElementById("camModal"); if (m) m.hidden = true; }
function avBack() { SND.click(); if (AV.i > 0) showScreen("avatar", AV.i - 1); else showScreen("players"); }
function avNext() {
  const h = curH(), nm = document.getElementById("avName"); h.name = nm.value.trim();
  if (!h.name) { nm.classList.add("shake"); nm.placeholder = "Please type a name first 🙂"; setTimeout(() => nm.classList.remove("shake"), 500); return SND.tone(200, 0.2, "square", 0.08); }
  SND.beep();
  if (AV.i + 1 < GAME.nPlayers) showScreen("avatar", AV.i + 1);
  else if (GAME.nPlayers < 4) showScreen("crewpick");
  else { GAME.mates = []; showScreen("crewroom"); }
}

// ===== C. pick the computer crewmates (with Hall of Heroes cards) =====
SCREENS.crewpick = {
  show() {
    SCREENS.intro.backdrop();
    const k = 4 - GAME.nPlayers;
    if (!GAME.mates || GAME.mates.length > k) GAME.mates = k === 3 ? CREWMATES.map((c) => c.id) : [];
    const cards = CREWMATES.map((c) => { const on = GAME.mates.includes(c.id);
      return `<div class="mcard ${on ? "on" : ""}" onclick="toggleMate('${c.id}')">
        <img src="${cartoonFace(c.face)}" alt=""><div class="check">${on ? "✅" : "⬜"}</div>
        <b>${esc(c.name)}</b><span class="spec">${c.spec}</span>
        <div class="hero"><div class="ht">🏛️ Hall of Heroes · inspired by</div><b>${c.hero.name}</b><i>${c.hero.line}</i><ul>${c.hero.facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div></div>`; }).join("");
    p2(`<div class="panel wide"><div class="kicker">Step 3 of 4 · Computer crewmates</div>
      <h2>${k === 3 ? "Meet your 3 crewmates!" : `Pick ${k} crewmate${k > 1 ? "s" : ""} to join you`}</h2>
      <p class="lead">${k === 3 ? "They'll sit with you in Mission Control and give advice before every big choice." : "Click a card to choose. They give advice, but the real players make the decisions."} Each one is inspired by a real space hero.</p>
      <div class="mcards">${cards}</div>
      <div class="row end"><button class="btn ghost" onclick="SND.click();showScreen('avatar', GAME.nPlayers - 1)">← Back</button>
        <button class="btn go" id="mateGo" ${GAME.mates.length === k ? "" : "disabled"} onclick="SND.beep();showScreen('crewroom')">${GAME.mates.length}/${k} chosen · Go to Mission Control ▶</button></div></div>`);
  },
  hide() { P2.hidden = true; },
};
function toggleMate(id) {
  const k = 4 - GAME.nPlayers; if (k === 3) return;
  const i = GAME.mates.indexOf(id);
  if (i >= 0) GAME.mates.splice(i, 1); else { if (GAME.mates.length >= k) GAME.mates.shift(); GAME.mates.push(id); }
  SND.click(); SCREENS.crewpick.show();
}

// ===== D. the 3D Mission Control room =====
const ROOM = { built: false, running: false };
function buildRoom() {
  const wrap = document.createElement("div"); wrap.id = "room"; document.body.appendChild(wrap);
  const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true;
  wrap.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05070f); scene.fog = new THREE.Fog(0x05070f, 14, 30);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0x8fb0ff, 0x101420, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(3, 8, 6); key.castShadow = true; scene.add(key);
  // floor + back wall
  const floorTex = canvasTex(512, 512, (x, w, h) => { x.fillStyle = "#0c1222"; x.fillRect(0, 0, w, h); x.strokeStyle = "#1a2846"; x.lineWidth = 3; for (let i = 0; i <= w; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(6, 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, metalness: 0.3 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x141b2e, roughness: 0.8 });
  [-7, 7].forEach((x) => { const w = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 0.3), wallMat); w.position.set(x, 3.5, -5); scene.add(w); });
  const top = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 0.3), wallMat); top.position.set(0, 6.25, -5); scene.add(top);
  // behind the doors: the launch pad glowing at sunrise
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshBasicMaterial({ map: canvasTex(512, 340, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0b1d4a"); g.addColorStop(0.6, "#f08a3c"); g.addColorStop(1, "#ffd27a"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = "#111"; x.fillRect(w / 2 - 9, h * 0.25, 18, h * 0.65); x.beginPath(); x.moveTo(w / 2 - 9, h * 0.25); x.lineTo(w / 2, h * 0.16); x.lineTo(w / 2 + 9, h * 0.25); x.fill();
    x.fillRect(w / 2 + 30, h * 0.2, 8, h * 0.7); x.fillStyle = "#222"; x.fillRect(0, h * 0.9, w, h * 0.1); }) }));
  sky.position.set(0, 3, -8); scene.add(sky);
  // the two big doors = the mission screen (Earth + Moon)
  const screenTex = canvasTex(1024, 940, (x, w, h) => {
    x.fillStyle = "#020814"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(255,255,255,${Math.random()})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    let g = x.createRadialGradient(270, 560, 20, 270, 560, 170); g.addColorStop(0, "#5aa7ff"); g.addColorStop(1, "#1a4a9a"); x.fillStyle = g; x.beginPath(); x.arc(270, 560, 150, 0, 7); x.fill();
    x.fillStyle = "#c9ccd3"; x.beginPath(); x.arc(790, 300, 60, 0, 7); x.fill();
    x.setLineDash([12, 10]); x.strokeStyle = "#7fd4ff"; x.lineWidth = 4; x.beginPath(); x.moveTo(400, 480); x.bezierCurveTo(560, 260, 700, 200, 790, 220); x.stroke();
    x.setLineDash([]); x.textAlign = "center";
    
  });
  const doors = [-1, 1].map((s) => { const d = new THREE.Mesh(new THREE.BoxGeometry(3, 5.5, 0.2), [wallMat, wallMat, wallMat, wallMat, new THREE.MeshBasicMaterial({ map: screenTex }), wallMat]);
    d.position.set(s * 1.5, 2.75, -4.9); scene.add(d); return d; });
  // UV: each door shows its half of the screen
  doors.forEach((d, i) => { const uv = d.geometry.attributes.uv; for (let k = 16; k < 20; k++) uv.setX(k, uv.getX(k) * 0.5 + i * 0.5); uv.needsUpdate = true; });
  // consoles
  const consoles = [-3.9, -1.3, 1.3, 3.9].map((x, i) => { const g = new THREE.Group(); g.position.set(x, 0, -1.6); scene.add(g);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.8), new THREE.MeshStandardMaterial({ color: 0x2a3247, roughness: 0.6 })); desk.position.y = 0.5; desk.castShadow = true; g.add(desk);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.6), new THREE.MeshBasicMaterial({ color: 0x0d3a2a })); scr.position.set(0, 1.25, 0.1); scr.rotation.x = -0.35; g.add(scr);
    const lamp = new THREE.PointLight([0xff7a3d, 0x2f6fd6, 0x2fbf71, 0x8a5cd6][i], 0.8, 4); lamp.position.set(0, 2.2, 1); g.add(lamp);
    return { g, scr }; });
  Object.assign(ROOM, { wrap, renderer, scene, camera, doors, consoles, sky, built: true });
  addEventListener("resize", () => roomResize());
}
function roomResize() { if (!ROOM.built) return; const w = innerWidth, h = innerHeight; ROOM.renderer.setSize(w, h); ROOM.camera.aspect = w / h; ROOM.camera.fov = w < 700 ? 70 : 45; ROOM.camera.updateProjectionMatrix(); }

// fill the 4 seats: real players first, then the chosen crewmates
function seatCrew() {
  GAME.crew = GAME.humans.slice(0, GAME.nPlayers).map((h) => ({ ...h, kind: "human" }));
  (GAME.mates || []).forEach((id) => { const c = CREWMATES.find((m) => m.id === id);
    GAME.crew.push({ kind: "ai", name: c.name, short: c.short, face: cartoonFace(c.face), stripe: c.stripe, roles: [], mate: c }); });
}
const BUBBLES = [];
SCREENS.crewroom = {
  show() {
    SCREENS.intro.hide(); P2.hidden = false; P2.className = "roomUI";
    if (!ROOM.built) buildRoom();
    ROOM.wrap.hidden = false; roomResize(); seatCrew();
    // remove old astronauts, add the crew
    (ROOM.astros || []).forEach((a) => ROOM.scene.remove(a));
    ROOM.astros = GAME.crew.map((c, i) => {
      const a = makeAstronaut({ faceTex: faceTexFrom(c.face), depthTex: genericDepthTex(), stripe: c.stripe, cdr: c.roles.includes("cdr"),
        name: c.kind === "human" ? `${ROLES[c.roles[0]].tag} ${c.name.toUpperCase().slice(0, 9)}` : c.short });
      a.scale.setScalar(0.29); a.position.set([-3.9, -1.3, 1.3, 3.9][i], 3.75 * 0.29, -0.4); a.userData.base = a.position.y; ROOM.scene.add(a);
      a.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      return a; });
    ROOM.ready = GAME.crew.map(() => false); ROOM.doorK = 0; ROOM.opening = false; ROOM.doors[0].position.x = -1.5; ROOM.doors[1].position.x = 1.5;
    P2.innerHTML = `<div class="roomTop"><div class="kicker">Step 4 of 4 · Crew check-in</div><h2>Welcome to Mission Control!</h2>
      <p class="lead">${GAME.nPlayers === 1 ? "You make every decision. Your crewmates will give advice before each big choice." : "Each player presses READY at their seat."}</p></div>
      ${GAME.crew.map((c, i) => `<div class="seat" id="seat${i}">
        <b>${esc(c.name)}</b>
        <div class="badges">${c.kind === "human" ? c.roles.map((r) => `<span class="badge">${ROLES[r].ico} ${ROLES[r].name}</span>`).join("") : `<span class="badge ai">🤖 Advisor: ${c.mate.advises}</span>`}</div>
        ${c.kind === "human" ? `<button class="btn go small" id="ready${i}" onclick="crewReady(${i})">✅ READY</button>` : `<span class="status" id="ready${i}">thinking…</span>`}
      </div>`).join("")}
      <div class="bubble3d" id="rb"></div>
      <div class="row roomBack"><button class="btn ghost" onclick="SND.click();showScreen(GAME.nPlayers < 4 ? 'crewpick' : 'avatar', GAME.nPlayers < 4 ? undefined : 3)">← Back</button></div>`;
    ROOM.running = true; ROOM.t0 = performance.now(); roomLoop();
    // computer crewmates say hello, then press READY
    const lead = GAME.crew[0].name;
    const lines = GAME.crew.map((c, i) => c.kind === "ai" ? { who: i, gesture: ["thumbs", "nod", "point"][i % 3],
      text: GAME.nPlayers === 1 && i === 1 ? `Hi ${lead}! You make every call. We'll give you our best advice!` : `${c.short} here, ${c.mate.advises} is my thing. Ready when you are!` } : null).filter(Boolean);
    if (DEMO()) { GAME.crew.forEach((c, i) => { ROOM.ready[i] = true; const s = document.getElementById("ready" + i); if (s) s.outerHTML = `<span class="status ok" id="ready${i}">✅ READY</span>`; }); setTimeout(openDoors, 500); return; }
    setTimeout(() => crewDiscuss(lines, () => {}), 900);
  },
  hide() { ROOM.running = false; if (ROOM.wrap) ROOM.wrap.hidden = true; P2.hidden = true; P2.className = ""; },
};
function crewReady(i) {
  ROOM.ready[i] = true; SND.beep(); const b = document.getElementById("ready" + i);
  if (b) { b.outerHTML = `<span class="status ok" id="ready${i}">✅ READY</span>`; }
  ROOM.astros[i].userData.gesture = { kind: "thumbs", t: 0 };
  if (ROOM.ready.every(Boolean)) setTimeout(openDoors, 700);
}
function openDoors() {
  if (ROOM.opening) return;
  ROOM.opening = true; SND.say("All stations are go!");
  if (SCREENS.choice) { setTimeout(() => showScreen("choice"), DEMO() ? 250 : 2600); return; }
  const t = document.getElementById("toast"); t.textContent = "🚪 All crew READY! The doors open…"; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 4500);
}
// crew talk: one speech bubble at a time over the speaker, with a gesture; everyone looks at the speaker
// lines: [{ who: seat index, text, gesture: "nod" | "thumbs" | "point" | "shake" }]
function crewDiscuss(lines, done) {
  let k = 0;
  (function next() {
    const rb = document.getElementById("rb");
    if (k >= lines.length || !rb) { if (rb) rb.classList.remove("show"); ROOM.speaker = null; return done && done(); }
    const L = lines[k++]; ROOM.speaker = L.who; ROOM.astros[L.who].userData.gesture = { kind: L.gesture || "nod", t: 0 };
    rb.textContent = L.text; rb.classList.add("show"); SND.tone(880, 0.06, "sine", 0.05);
    const c = GAME.crew[L.who]; if (c.kind === "ai") setTimeout(() => { ROOM.ready[L.who] = true; const s = document.getElementById("ready" + L.who); if (s) { s.textContent = "✅ READY"; s.className = "status ok"; } if (ROOM.ready.every(Boolean)) setTimeout(openDoors, 700); }, 1800);
    setTimeout(next, 3200);
  })();
}
const _v = new THREE.Vector3();
function roomLoop() {
  if (!ROOM.running) return;
  const t = (performance.now() - ROOM.t0) / 1000, cam = ROOM.camera;
  // camera: slow dolly in, then gentle sway; through the doors when they open
  const k = Math.min(1, t / 3), e = 1 - (1 - k) ** 3;
  if (ROOM.opening) { ROOM.doorK = Math.min(1, ROOM.doorK + 0.012); ROOM.doors[0].position.x = -1.5 - ROOM.doorK * 3; ROOM.doors[1].position.x = 1.5 + ROOM.doorK * 3; cam.position.lerp(V3(0, 2.6, -2.5 + (1 - ROOM.doorK) * 9), 0.02); cam.lookAt(0, 2.8, -8); }
  else { cam.position.set(0, 2.4 + (1 - e) * 1.5, 7.2 + (1 - e) * 5); cam.lookAt(0, 1.5, -1); }
  ROOM.astros.forEach((a, i) => {
    a.position.y = a.userData.base + Math.sin(t * 1.3 + i) * 0.015;
    const head = a.userData.head, arms = a.userData.arms, g = a.userData.gesture;
    // look at whoever is speaking
    const look = ROOM.speaker !== null && ROOM.speaker !== undefined && ROOM.speaker !== i ? Math.sign(ROOM.astros[ROOM.speaker].position.x - a.position.x) * 0.6 : Math.sin(t * 0.5 + i) * 0.15;
    head.rotation.y += (look - head.rotation.y) * 0.08; head.rotation.x = 0;
    arms[0].rotation.set(0, 0, -0.2); arms[1].rotation.set(0, 0, 0.2); arms[1].userData.elbow.rotation.set(0, 0, 0); arms[0].userData.elbow.rotation.set(0, 0, 0);
    if (g) { g.t += 0.016; const s = Math.sin(g.t * 8);
      if (g.kind === "nod") head.rotation.x = s * 0.18;
      if (g.kind === "shake") head.rotation.y = s * 0.35;
      if (g.kind === "thumbs") { arms[1].rotation.z = 2.4; arms[1].userData.elbow.rotation.z = 0.9; }
      if (g.kind === "point") { arms[1].rotation.x = -1.4; arms[1].rotation.z = 0.1; }
      if (g.t > 2.6) a.userData.gesture = null; }
    a.userData.lights.forEach((l, j) => (l.visible = Math.sin(t * 3 + j * 2 + i) > -0.3));
    // console screen glows green when READY
    ROOM.consoles[i].scr.material.color.setHex(ROOM.ready[i] ? 0x1d8a5a : 0x0d3a2a);
    // seat labels follow the heads
    const el = document.getElementById("seat" + i); if (el) { a.getWorldPosition(_v); _v.y += 1.15; _v.project(cam); el.style.left = ((_v.x + 1) / 2 * innerWidth) + "px"; el.style.top = ((1 - _v.y) / 2 * innerHeight) + "px"; el.style.display = _v.z > 1 || ROOM.opening ? "none" : ""; }
  });
  const rb = document.getElementById("rb");
  if (rb && ROOM.speaker !== null && ROOM.speaker !== undefined) { ROOM.astros[ROOM.speaker].getWorldPosition(_v); _v.y += 1.9; _v.project(cam); rb.style.left = ((_v.x + 1) / 2 * innerWidth) + "px"; rb.style.top = ((1 - _v.y) / 2 * innerHeight) + "px"; }
  ROOM.renderer.render(ROOM.scene, cam); requestAnimationFrame(roomLoop);
}
