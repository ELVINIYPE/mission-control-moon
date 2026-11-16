// choice.js — PART 3: "Play the mission" or "Training Academy".
// The crew stands in front of the open doors (launch pad at sunrise) and chats while players choose.
// Two floating 3D hologram panels; hover = a crewmate reacts; click = a crewmate speaks out loud.

const CH = { running: false, panels: [], hover: null, chosen: null, speaking: null, chatI: 0 };

// ---------- voices: each crew member gets a different voice / pitch ----------
let VOICES = [];
// clear, natural voices only (Mac also has joke voices like "Bubbles" or "Zarvox": skip those)
const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|princess|deranged|hysterical|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i;
const GOOD = ["Samantha", "Daniel", "Karen", "Rishi", "Moira", "Tessa", "Alex", "Veena", "Google US English", "Google UK English Male", "Google UK English Female", "Microsoft Aria", "Microsoft Guy", "Microsoft Jenny"];
function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  const all = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang) && !NOVELTY.test(v.name));
  const good = GOOD.map((n) => all.find((v) => v.name.startsWith(n))).filter(Boolean);
  VOICES = good.length ? good.concat(all.filter((v) => !good.includes(v))) : all;
}
if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
let speakId = 0;
function crewSpeak(i, text, onEnd) {
  const id = ++speakId; let done = false;
  CH.speaking = i;
  const end = () => { if (done || id !== speakId) return; done = true; CH.speaking = null; onEnd && onEnd(); };   // runs ONCE, and only for the latest line
  SND.tone(1400, 0.05, "sine", 0.05);                                   // radio "beep" before talking
  if (!GAME.soundOn || !("speechSynthesis" in window)) { setTimeout(end, 1200 + text.length * 60); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'’-]/gu, ""));
  if (VOICES.length) u.voice = VOICES[i % VOICES.length];               // a different clear voice for each crew member
  u.pitch = [1.0, 1.08, 0.92, 1.0][i % 4]; u.rate = 0.95;               // small pitch changes only, so everyone stays easy to understand
  u.onend = end; u.onerror = end;
  setTimeout(end, 2500 + text.length * 110);                             // safety if onend never fires
  setTimeout(() => { if (id === speakId) speechSynthesis.speak(u); }, 120);   // short gap after cancel() so the voice doesn't get cut off
}

// ---------- the two hologram panels ----------
function panelTexture(o) {
  return canvasTex(640, 460, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, o.c1); g.addColorStop(1, "rgba(5,10,25,0.92)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = o.edge; x.lineWidth = 8; x.strokeRect(6, 6, w - 12, h - 12);
    for (let y = 0; y < h; y += 6) { x.fillStyle = "rgba(255,255,255,0.03)"; x.fillRect(0, y, w, 2); }   // hologram scan lines
    x.font = "110px serif"; x.textAlign = "center"; x.fillText(o.ico, w / 2, 135);
    x.fillStyle = "#fff"; x.font = "bold 58px sans-serif"; x.fillText(o.title, w / 2, 220);
    x.fillStyle = o.edge; x.font = "bold 28px sans-serif"; x.fillText(o.sub, w / 2, 262);
    x.fillStyle = "#dbe6f6"; x.font = "26px sans-serif"; x.textAlign = "left";
    o.lines.forEach((l, k) => x.fillText("•  " + l, 60, 318 + k * 40));
  });
}
const PANELS = [
  { id: "mission", ico: "🚀", title: "Play the mission", sub: "1 · Fly to the Moon now", c1: "rgba(120,50,10,0.85)", edge: "#ffb547",
    lines: ["Design, launch, land, come home", "Learn tips right when you need them", "Every choice changes what happens next"], x: -3.05, ry: 0.3 },
  { id: "academy", ico: "🎓", title: "Training Academy", sub: "2 · Practise first, earn badges", c1: "rgba(20,60,130,0.85)", edge: "#7fd4ff",
    lines: ["Orbits, staging, TLI, docking, landing", "Short games, one idea at a time", "Badges show on your spacesuit"], x: 3.05, ry: -0.3 },
];
function buildPanels() {
  PANELS.forEach((p) => {
    const g = new THREE.Group(); g.position.set(p.x, 2.45, 1.0); g.rotation.y = p.ry;
    const mat = new THREE.MeshBasicMaterial({ map: panelTexture(p), transparent: true, opacity: 0.93, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 1.69), mat); plane.userData.panel = p.id; g.add(plane);
    const glow = glowSprite(p.edge === "#ffb547" ? "rgba(255,170,70,0.55)" : "rgba(110,200,255,0.55)", 5.2); glow.position.z = -0.05; g.add(glow);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.3, 24, 1, true), new THREE.MeshBasicMaterial({ color: p.edge === "#ffb547" ? 0xffb547 : 0x7fd4ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
    beam.position.y = -1.55; g.add(beam);                                // light beam from the floor projector
    const proj = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.15, 24), new THREE.MeshStandardMaterial({ color: 0x2a3247, emissive: p.edge === "#ffb547" ? 0x3a2008 : 0x08203a }));
    proj.position.y = -2.25; g.add(proj);
    ROOM.scene.add(g); CH.panels.push({ g, plane, glow, p });
  });
}

// ---------- the crew chatting while players choose ----------
function chatLines() {
  const c = GAME.crew, n = (i) => (c[i].kind === "human" ? c[i].name : c[i].short);
  return [
    { who: 0, text: `Team, what first: fly to the Moon, or train?` },
    { who: 1, text: `Training earns badges, ${n(0)}! And we learn how orbits really work.` },
    { who: 2, text: `The rocket is fuelled on the pad. I say we fly!` },
    { who: 3, text: `Either way, Mission Control is GO. ${n(0)}, your call!` },
    { who: 1, text: `Did you know? To stay in orbit we must fly 7.8 km every second!` },
    { who: 2, text: `${n(3)}, check the weather. We want clear skies for launch.` },
    { who: 3, text: `Clear skies! Just pick a button up there.` },
  ];
}
function chatNext() {
  if (!CH.running || CH.chosen) return;
  const lines = chatLines(), L = lines[CH.chatI % lines.length]; CH.chatI++;
  bubbleSay(L.who, L.text);
  // one line at a time, with a calm pause; after the whole chat, wait longer before starting again
  crewSpeak(L.who, L.text, () => { clearTimeout(CH.chatTimer); CH.chatTimer = setTimeout(chatNext, CH.chatI % lines.length === 0 ? 15000 : 2200); });
}
function bubbleSay(i, text) {
  const b = document.getElementById("chBubble"); if (!b) return;
  b.innerHTML = `<span class="who">${esc(GAME.crew[i].kind === "human" ? GAME.crew[i].name : GAME.crew[i].short)}</span> <span class="wave">🔊</span><br>${esc(text)}`;
  b.classList.add("show"); CH.bubbleWho = i;
}

// ---------- choosing ----------
function choosePath(id) {
  if (CH.chosen) return;
  CH.chosen = id; GAME.path = id; clearTimeout(CH.chatTimer); SND.beep();
  if (DEMO()) { if ("speechSynthesis" in window) speechSynthesis.cancel(); SND.say(id === "mission" ? "We are ready for the mission!" : "Let's train!"); return showScreen(id === "mission" ? "design" : "academy"); }
  document.querySelectorAll(".chBtn").forEach((b) => (b.disabled = true));
  const who = id === "mission" ? 0 : Math.min(1, GAME.crew.length - 1);
  const text = id === "mission" ? "We are ready for the mission!" : "Let's train first and earn badges!";
  CH.panels.forEach((P) => (P.dim = P.p.id !== id));
  bubbleSay(who, text);
  crewSpeak(who, text, () => {
    GAME.crew.forEach((c, i) => { if (i !== who) ROOM.astros[i].userData.gesture = { kind: id === "mission" ? "thumbs" : "nod", t: 0 }; });
    setTimeout(() => {
      CH.fly = { t0: performance.now(), id };
      const t = document.getElementById("toast");
      t.textContent = id === "mission" ? "🚀 Mission chosen! Pick where to go." : "🎓 Training Academy chosen! Next part: the first lessons and badges.";
      t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 4500);
      setTimeout(() => { if (SCREENS[id === "mission" ? "design" : "academy"]) showScreen(id === "mission" ? "design" : "academy"); else resetChoice(); }, 4200);
    }, 1400);
  });
}
function resetChoice() { clearTimeout(CH.chatTimer); CH.chosen = null; CH.fly = null; CH.panels.forEach((P) => (P.dim = false)); document.querySelectorAll(".chBtn").forEach((b) => (b.disabled = false)); CH.chatTimer = setTimeout(chatNext, 1500); }

// ---------- screen ----------
const P3 = document.createElement("div"); P3.id = "p3"; P3.hidden = true; document.body.appendChild(P3);
SCREENS.choice = {
  show() {
    if (!ROOM.built) return showScreen("players");
    SCREENS.intro.hide(); ROOM.wrap.hidden = false; roomResize();
    // open doors, hide the consoles, line the crew up in front of the launch pad
    ROOM.doors[0].position.x = -4.5; ROOM.doors[1].position.x = 4.5; ROOM.consoles.forEach((c) => (c.g.visible = false));
    ROOM.astros.forEach((a, i) => { a.position.set([-1.65, -0.55, 0.55, 1.65][i], a.userData.base, -1.2 + Math.abs(i - 1.5) * 0.3); a.rotation.y = -(i - 1.5) * 0.12; });
    if (!CH.panels.length) buildPanels();
    CH.panels.forEach((P) => (P.g.visible = true));
    P3.hidden = false;
    P3.innerHTML = `<div class="chTop"><div class="kicker">Mission briefing</div><h2>What should the crew do first?</h2>
        <p class="lead">Click a glowing screen, or a button below. Listen to your crew!</p></div>
      <div class="chBubble" id="chBubble"></div>
      <div class="chBtns"><button class="btn start chBtn" onclick="choosePath('mission')">🚀 1 · Play the mission</button>
        <button class="btn chBtn academy" onclick="choosePath('academy')">🎓 2 · Training Academy</button></div>
      <div class="roomBack"><button class="btn ghost" onclick="SND.click();speechSynthesis && speechSynthesis.cancel();SCREENS.choice.leave()">← Crew room</button></div>`;
    CH.running = true; CH.chosen = null; CH.fly = null; CH.chatI = 0; CH.t0 = performance.now();
    choiceLoop(); clearTimeout(CH.chatTimer); CH.chatTimer = setTimeout(chatNext, DEMO() ? 60000 : 1200);
  },
  hide() { CH.running = false; clearTimeout(CH.chatTimer); if ("speechSynthesis" in window) speechSynthesis.cancel(); P3.hidden = true;
    CH.panels.forEach((P) => (P.g.visible = false)); if (ROOM.consoles) ROOM.consoles.forEach((c) => (c.g.visible = true)); if (ROOM.wrap) ROOM.wrap.hidden = true; },
  leave() { showScreen("crewroom"); },
};
// mouse: hover + click on the 3D panels
const _ray = new THREE.Raycaster(), _m = new THREE.Vector2();
function panelAt(e) {
  _m.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); _ray.setFromCamera(_m, ROOM.camera);
  const hit = _ray.intersectObjects(CH.panels.map((P) => P.plane))[0]; return hit ? hit.object.userData.panel : null;
}
addEventListener("pointermove", (e) => {
  if (!CH.running || CH.chosen) return;
  const id = panelAt(e); document.body.style.cursor = id ? "pointer" : "";
  if (id && id !== CH.hover) {
    const who = id === "mission" ? 2 % GAME.crew.length : 1 % GAME.crew.length;
    bubbleSay(who, id === "mission" ? "Yes! Let's fly! 🚀" : "Badges! I love badges! 🎖️");
    ROOM.astros[who].userData.gesture = { kind: id === "mission" ? "thumbs" : "nod", t: 0 };
  }
  CH.hover = id;
});
addEventListener("click", (e) => { if (!CH.running || CH.chosen || e.target.closest("button")) return; const id = panelAt(e); if (id) choosePath(id); });

const _w = new THREE.Vector3();
function choiceLoop() {
  if (!CH.running) return;
  const t = (performance.now() - CH.t0) / 1000, cam = ROOM.camera;
  // camera: a slow drift; after choosing, glide toward the chosen screen (mission = out through the doors)
  if (CH.fly) { const k = Math.min(1, (performance.now() - CH.fly.t0) / 3500), e = k * k;
    const to = CH.fly.id === "mission" ? V3(0, 2.8, -6) : V3(2.6, 2.45, 3.0), look = CH.fly.id === "mission" ? V3(0, 3, -9) : V3(3.05, 2.45, 1.0);
    cam.position.lerp(to, 0.02 + e * 0.05); cam.lookAt(look); }
  else { cam.position.set(Math.sin(t * 0.12) * 0.4, 2.4, 7.2); cam.lookAt(0, 1.8, -1.5); }
  // hologram panels float; the hovered one grows, the not-chosen one fades
  CH.panels.forEach((P, k) => {
    P.g.position.y = 2.45 + Math.sin(t * 1.4 + k) * 0.08;
    const target = P.dim ? 0.85 : CH.hover === P.p.id || CH.chosen === P.p.id ? 1.1 : 1; const s = P.g.scale.x + (target - P.g.scale.x) * 0.1; P.g.scale.setScalar(s);
    P.plane.material.opacity += ((P.dim ? 0.25 : 0.93) - P.plane.material.opacity) * 0.08;
    P.glow.material.opacity = P.dim ? 0.1 : 0.6 + Math.sin(t * 3 + k) * 0.25;
  });
  // the crew: the speaker nods and bobs while talking, everyone else looks at them
  ROOM.astros.forEach((a, i) => {
    const head = a.userData.head, arms = a.userData.arms, g = a.userData.gesture, talking = CH.speaking === i;
    a.position.y = a.userData.base + (talking ? Math.abs(Math.sin(t * 9)) * 0.03 : Math.sin(t * 1.3 + i) * 0.012);
    const sp = CH.speaking ?? CH.bubbleWho;
    const look = sp !== null && sp !== undefined && sp !== i ? Math.sign(ROOM.astros[sp].position.x - a.position.x) * 0.55 : Math.sin(t * 0.5 + i) * 0.12;
    head.rotation.y += (look - head.rotation.y) * 0.08;
    head.rotation.x = talking ? Math.sin(t * 11) * 0.07 : 0;
    arms[0].rotation.set(0, 0, -0.2); arms[1].rotation.set(0, 0, 0.2); arms[0].userData.elbow.rotation.set(0, 0, 0); arms[1].userData.elbow.rotation.set(0, 0, 0);
    if (talking) { arms[1].rotation.z = 0.5 + Math.sin(t * 4) * 0.25; arms[1].userData.elbow.rotation.z = 0.8; }   // talking with their hands
    if (g) { g.t += 0.016; const s = Math.sin(g.t * 8);
      if (g.kind === "nod") head.rotation.x = s * 0.18;
      if (g.kind === "thumbs") { arms[1].rotation.z = 2.4; arms[1].userData.elbow.rotation.z = 0.9; }
      if (g.t > 2.4) a.userData.gesture = null; }
    a.userData.lights.forEach((l, j) => (l.visible = talking ? Math.sin(t * 14 + j * 2) > 0 : Math.sin(t * 3 + j * 2 + i) > -0.3));
  });
  // speech bubble follows the speaker's helmet
  const b = document.getElementById("chBubble");
  if (b && CH.bubbleWho !== undefined) { ROOM.astros[CH.bubbleWho].getWorldPosition(_w); _w.y += 1.75; _w.project(cam);
    b.style.left = ((_w.x + 1) / 2 * innerWidth) + "px"; b.style.top = ((1 - _w.y) / 2 * innerHeight) + "px"; b.classList.toggle("talking", CH.speaking === CH.bubbleWho); }
  ROOM.renderer.render(ROOM.scene, cam); requestAnimationFrame(choiceLoop);
}
