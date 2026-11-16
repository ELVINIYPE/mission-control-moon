/* =========================================================
   MISSION CONTROL: MOON  —  version 2 (2D game)
   Lesson: the MASS SPIRAL + pick the RIGHT rocket, not the biggest.
   Change game numbers in section 1.
   ========================================================= */

// ---------- 1. GAME DATA ----------
const BUDGET = 5000;            // $ millions
const G0 = 9.81;
const OPS_COST = 200;           // mission control, training ($M)
const KG_PER_PERSON = 100;      // astronaut + suit
const SUPPLIES_PER_DAY = 5;     // food, water, air (kg per person per day)

const CREW = [
  { id: "thrust", name: "Jon Thrust",  role: "Commander",       color: "#4da3ff", hat: "cap" },
  { id: "rocket", name: "John Rocket", role: "Scientist",       color: "#ff8a3d", hat: "goggles" },
  { id: "crater", name: "Jane Crater", role: "Engineer",        color: "#3ecf8e", hat: "wrench" },
  { id: "fuel",   name: "Jim Fuel",    role: "Money & Comms",   color: "#b07cff", hat: "headset" },
];

const GOALS = [
  { id: "flyby", ico: "🌙", name: "Fly around",  stars: 1, dv: 100,  days: 7,  mult: 1, done: "🌙 Swung around the Moon!" },
  { id: "orbit", ico: "🛰️", name: "Orbit",       stars: 2, dv: 1900, days: 10, mult: 2, done: "🛰️ In orbit around the Moon!" },
  { id: "land",  ico: "🦶", name: "Land & return",stars: 3, dv: 5700, days: 12, mult: 4, done: "🦶 Footprints on the Moon!" },
];

const CAPSULES = [
  { id: "small", ico: "🥚", name: "Small capsule", seats: 2, mass: 4000, cost: 300, info: "2 seats" },
  { id: "big",   ico: "🛸", name: "Big capsule",   seats: 4, mass: 8500, cost: 700, info: "4 seats" },
];
const ENGINES = [
  { id: "storable", ico: "🔥", name: "Simple engine",   isp: 320, tank: 0.10, cost: 100, info: "Cheap, thirsty" },
  { id: "hydrogen", ico: "💧", name: "Hydrogen engine", isp: 450, tank: 0.15, cost: 250, info: "Efficient, big tanks" },
];
const PARTS = [
  { id: "shield", ico: "🛡️", name: "Heat shield", mass: 600,  cost: 50,  info: "Survive coming home" },
  { id: "lander", ico: "🦿", name: "Landing legs + engine", mass: 2000, cost: 400, info: "Needed to land", onlyFor: "land" },
];
const isApollo = () => state.goal === "land" && state.lander === "apollo";
// Apollo-style spacecraft for landing missions: 4 modules, each with its own engine.
// Dropping empty modules on the way (staging!) is why Saturn V could do it.
const MODULES = [
  { id: "cm",  ico: "🔺", name: "Command module", mass: 5200, cost: 300, info: "3 seats · the only part that comes home" },
  { id: "sm",  ico: "🛢️", name: "Service module", mass: 6100, cost: 250, info: "Big engine + fuel · brakes at the Moon, fires home" },
  { id: "lma", ico: "🕷️", name: "LM ascent stage", mass: 2200, cost: 350, info: "2 crew · lifts off from the Moon" },
  { id: "lmd", ico: "🦿", name: "LM descent stage", mass: 2000, cost: 350, info: "Lands · carries rover & experiments" },
];
const APOLLO_ISP = 311;       // seconds (Apollo SPS and LM engines, approx.)
const SCIENCE = [
  { id: "camera", ico: "📷", name: "Camera",       mass: 60,  cost: 20,  points: 10 },
  { id: "spectro",ico: "🔬", name: "Spectrometer", mass: 40,  cost: 30,  points: 15, needs: ["orbit", "land"] },
  { id: "seismo", ico: "📈", name: "Quake sensor", mass: 100, cost: 40,  points: 20, needs: ["land"] },
  { id: "rocks",  ico: "🪨", name: "Rock box",     mass: 150, cost: 25,  points: 25, needs: ["land"] },
  { id: "rover",  ico: "🚙", name: "Lunar rover",  mass: 210, cost: 150, points: 35, needs: ["land"] },
];
// tli = kg the rocket can push toward the Moon (approximate public numbers)
const ROCKETS = [
  { id: "f9",    name: "Falcon 9",     tli: 5500,   cost: 70,   color: "#dfe6f5" },
  { id: "fh",    name: "Falcon Heavy", tli: 16000,  cost: 150,  color: "#dfe6f5" },
  { id: "sls",   name: "SLS",          tli: 27000,  cost: 2200, color: "#ff9a3d" },
  { id: "sat5",  name: "Saturn V",     tli: 48600,  cost: 1500, color: "#ffffff" },
  { id: "megax", name: "Mega-X 🧪",    tli: 100000, cost: 4000, color: "#b07cff" },
];

// ---------- 2. STATE ----------
const state = {
  goal: null, crew: ["thrust", "rocket"], capsule: "small", engine: "storable",
  parts: ["shield"], science: ["camera"], margin: 0, rocket: null, path: null, les: false,
  modules: [], water: false, lander: null,
};

// ---------- 3. HELPERS ----------
// "ATTEMPTS ●●●○○": a mission-control style counter (instead of hearts)
const attemptsHTML = (left, max) => `<span class="att"><small>ATTEMPTS</small>${Array.from({ length: max }, (_, i) => `<i class="${i < left ? "on" : ""}"></i>`).join("")}</span>`;
const $ = (id) => document.getElementById(id);
const byId = (list, id) => list.find((x) => x.id === id);
const goal = () => byId(GOALS, state.goal);
const tons = (kg) => !isFinite(kg) ? "∞" : kg >= 1000 ? (kg / 1000).toFixed(1) + " t" : Math.round(kg) + " kg";
const money = (m) => m >= 1000 || m <= -1000 ? "$" + (m / 1000).toFixed(1) + "B" : "$" + Math.round(m) + "M";

// Realistic astronaut portrait: helmet with clear visor, "Snoopy cap" comms headset,
// suit neck ring, mission patch and a coloured name-tape stripe (one colour per crew member)
const LOOKS = {
  thrust: { skin: "#f0c8a4", shade: "#d9a888", brow: "#5a3a22", lips: "#b5715e" },
  rocket: { skin: "#8d5a35", shade: "#734526", brow: "#1f140c", lips: "#5e3322" },
  crater: { skin: "#e3b085", shade: "#c89268", brow: "#4a2a16", lips: "#c0635a", hair: "#3a2414", lashes: true },
  fuel:   { skin: "#c68b5c", shade: "#a8724a", brow: "#2a1a10", lips: "#8a4c3a", mustache: true },
};
function avatar(c) {
  const L = LOOKS[c.id] || LOOKS.thrust, id = "av" + c.id;
  return `<svg viewBox="0 0 100 100">
    <defs>
      <radialGradient id="${id}g" cx="40%" cy="30%" r="70%"><stop offset="0" stop-color="#ffffff" stop-opacity=".45"/><stop offset=".5" stop-color="#bcd6ff" stop-opacity=".12"/><stop offset="1" stop-color="#7aa0d8" stop-opacity=".25"/></radialGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9ced8"/></linearGradient>
      <clipPath id="${id}c"><circle cx="50" cy="44" r="31"/></clipPath>
    </defs>
    <!-- suit shoulders -->
    <path d="M6 100 C8 80 22 72 50 72 C78 72 92 80 94 100 Z" fill="url(#${id}s)"/>
    <path d="M14 88 L86 88 L88 94 L12 94 Z" fill="${c.color}" opacity=".9"/>
    <circle cx="76" cy="83" r="6" fill="#1b2a5a" stroke="#d9a62e" stroke-width="1.5"/><path d="M73 84 L76 79 L79 84 Z" fill="#fff"/>
    <rect x="18" y="79" width="12" height="7" fill="#b22234"/><rect x="18" y="79" width="5" height="4" fill="#3c3b6e"/>
    <!-- neck ring -->
    <ellipse cx="50" cy="73" rx="26" ry="6" fill="#7d8aa3" stroke="#4a5670" stroke-width="2"/>
    <!-- face inside the helmet -->
    <g clip-path="url(#${id}c)">
      <rect x="10" y="10" width="80" height="70" fill="#1c2438"/>
      <ellipse cx="50" cy="50" rx="15" ry="19" fill="${L.skin}"/>
      <ellipse cx="50" cy="62" rx="11" ry="7" fill="${L.shade}" opacity=".35"/>
      <ellipse cx="35" cy="50" rx="3" ry="5" fill="${L.shade}"/><ellipse cx="65" cy="50" rx="3" ry="5" fill="${L.shade}"/>
      ${L.hair ? `<path d="M36 40 C38 30 62 30 64 40 C60 36 40 36 36 40 Z" fill="${L.hair}"/>` : ""}
      <!-- Snoopy cap: white top, dark ear pieces, microphone -->
      <path d="M33 44 C32 24 68 24 67 44 C62 36 38 36 33 44 Z" fill="#f2efe6"/>
      <path d="M33 44 C32 34 36 30 40 29 L40 40 Z" fill="#6b4a32"/><path d="M67 44 C68 34 64 30 60 29 L60 40 Z" fill="#6b4a32"/>
      <rect x="30" y="44" width="7" height="12" rx="3" fill="#222"/><rect x="63" y="44" width="7" height="12" rx="3" fill="#222"/>
      <path d="M33 56 Q36 66 45 66" stroke="#222" stroke-width="1.8" fill="none"/><circle cx="46" cy="66" r="2" fill="#222"/>
      <!-- eyes, brows, nose, mouth -->
      <path d="M40 46 Q44 44 47 46" stroke="${L.brow}" stroke-width="1.8" fill="none"/><path d="M53 46 Q56 44 60 46" stroke="${L.brow}" stroke-width="1.8" fill="none"/>
      <ellipse cx="44" cy="50" rx="2.6" ry="1.8" fill="#fff"/><ellipse cx="56" cy="50" rx="2.6" ry="1.8" fill="#fff"/>
      <circle cx="44.3" cy="50" r="1.3" fill="#2a1a10"/><circle cx="56.3" cy="50" r="1.3" fill="#2a1a10"/>
      ${L.lashes ? `<path d="M41 48.5 L40 47.5 M47 48.5 L48 47.5 M53 48.5 L52 47.5 M59 48.5 L60 47.5" stroke="#2a1a10" stroke-width="1"/>` : ""}
      <path d="M50 51 Q48 57 51 58" stroke="${L.shade}" stroke-width="1.6" fill="none"/>
      ${L.mustache ? `<path d="M44 61 Q50 58 56 61 Q50 60.5 44 61 Z" fill="${L.brow}"/>` : ""}
      <path d="M45 63 Q50 66 55 63" stroke="${L.lips}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </g>
    <!-- helmet bubble: shell rim + glass reflection -->
    <circle cx="50" cy="44" r="31" fill="url(#${id}g)"/>
    <circle cx="50" cy="44" r="32" fill="none" stroke="#e8ecf3" stroke-width="3.5"/>
    <path d="M28 30 Q36 18 50 16" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>
    <circle cx="70" cy="58" r="2" fill="#fff" opacity=".5"/>
  </svg>`;
}

// A crew member says something (bottom speech bubble)
let bubbleTimer;
function say(who, text, ms = 5000) {
  sfx.beep();
  $("bubbleFace").innerHTML = avatar(byId(CREW, who));
  $("bubbleText").innerHTML = `<b>${byId(CREW, who).name}:</b> ${text}`;
  $("bubble").classList.remove("hidden");
  $("bubble").style.animation = "none"; $("bubble").offsetHeight; $("bubble").style.animation = "";
  clearTimeout(bubbleTimer);
  if (ms) bubbleTimer = setTimeout(() => $("bubble").classList.add("hidden"), ms);
}
function hush() { $("bubble").classList.add("hidden"); }

// Floating "+1.2 t fuel" text
function popText(text, color, x, y) {
  const el = document.createElement("div");
  el.className = "pop"; el.textContent = text; el.style.color = color;
  el.style.left = x + "px"; el.style.top = y + "px";
  document.body.appendChild(el); setTimeout(() => el.remove(), 1400);
}

// ---------- 4. PHYSICS: the mass spiral (rocket equation) ----------
function payloadMass() {
  let m = byId(CAPSULES, state.capsule).mass;
  m += state.crew.length * (KG_PER_PERSON + SUPPLIES_PER_DAY * goal().days);
  state.parts.forEach((p) => (m += byId(PARTS, p).mass));
  state.science.forEach((s) => (m += byId(SCIENCE, s).mass));
  return m;
}
// Landing missions: Apollo staging. Each module only carries what it must.
function apolloMass() {
  const has = (id) => state.modules.includes(id);
  const k = (dv) => (Math.exp(dv / (APOLLO_ISP * G0)) - 1) * (1 + state.margin / 100);
  const sci = state.science.reduce((s, id) => s + byId(SCIENCE, id).mass, 0);
  const rocks = state.science.includes("rocks") ? 150 : 0;
  const ascDry = has("lma") ? 2200 + 2 * KG_PER_PERSON + rocks : 0;
  const ascFuel = ascDry * k(1900);                        // Moon surface → lunar orbit
  const desDry = has("lmd") ? 2000 : 0;
  const desLoad = ascDry + ascFuel + (sci - rocks);
  const desFuel = has("lmd") ? (desDry + desLoad) * k(2050) : 0;   // lunar orbit → surface
  const lm = desDry + desLoad + desFuel;
  const csmDry = (has("cm") ? 5200 : 0) + (state.parts.includes("shield") ? 600 : 0) + (has("sm") ? 6100 : 0)
    + state.crew.length * (KG_PER_PERSON + SUPPLIES_PER_DAY * 12);
  const tei = csmDry * k(1000);                            // Moon → Earth (CSM alone)
  const loi = (csmDry + tei + lm) * k(900);                // brake into lunar orbit, LM attached
  const fuel = ascFuel + desFuel + tei + loi;
  const total = csmDry + tei + loi + lm;
  return { payload: total - fuel, fuel, tanks: 0, total, impossible: false, apollo: true,
    parts: { cm: has("cm") ? 5200 + (state.parts.includes("shield") ? 600 : 0) : 0, smDry: has("sm") ? 6100 : 0, smFuel: tei + loi,
             asc: ascDry, ascFuel, des: desDry, desFuel } };
}
function computeMass() {
  if (isApollo()) return apolloMass();
  const payload = payloadMass();
  const eng = byId(ENGINES, state.engine);
  const ratio = Math.exp(goal().dv / (eng.isp * G0));      // Tsiolkovsky
  const k = (ratio - 1) * (1 + state.margin / 100);        // fuel per kg of dry mass
  const loop = k * eng.tank;                               // tanks feed back into fuel
  if (loop >= 1) return { payload, fuel: Infinity, tanks: Infinity, total: Infinity, impossible: true };
  const fuel = (payload * k) / (1 - loop);
  const tanks = fuel * eng.tank;
  return { payload, fuel, tanks, total: payload + fuel + tanks, impossible: false };
}
function computeCost(rocketId = state.rocket) {
  let c = OPS_COST + (isApollo()
    ? state.modules.reduce((s, id) => s + byId(MODULES, id).cost, 0)
    : byId(CAPSULES, state.capsule).cost + byId(ENGINES, state.engine).cost);
  if (state.water) c += 20;          // water deluge system
  state.parts.forEach((p) => (c += byId(PARTS, p).cost));
  state.science.forEach((s) => (c += byId(SCIENCE, s).cost));
  if (!state.crew.includes("fuel")) c -= 100;   // Jim runs Mission Control from Earth
  if (rocketId) c += byId(ROCKETS, rocketId).cost;
  if (state.les) c += 50;           // launch escape tower
  return c;
}
function rocketFit(r, m) {
  if (m.impossible || m.total > r.tli) return "heavy";
  if (computeCost(r.id) > BUDGET) return "broke";
  if (m.total / r.tli < 0.4) return "waste";
  return "good";
}

// ---------- 5. HUD ----------
function updateHUD() {
  const left = BUDGET - computeCost();
  $("hudMoney").textContent = money(left);
  const pct = Math.max(0, left / BUDGET) * 100;
  $("hudMoneyBar").style.width = pct + "%";
  $("hudMoneyBar").style.background = pct < 15 ? "var(--bad)" : pct < 40 ? "var(--warn)" : "var(--good)";
  const m = computeMass();
  $("hudMass").textContent = tons(m.total);
  $("hudMass").style.color = m.impossible ? "var(--bad)" : "";
  $("hudGoal").textContent = goal() ? goal().ico + " " + goal().name : "";
}

// ---------- 6. SCREENS ----------

// TITLE
function screenTitle() {
  $("hud").classList.add("hidden");
  $("app").innerHTML = `
    <h1 class="title">🚀 Mission Control: Moon</h1>
    <p class="sub">$5 billion. 4 astronauts. 1 Moon. Can you bring them home?</p>
    <p class="sub" style="font-size:12px;opacity:.6">version 16</p>
    <div class="crew-row">${CREW.map((c, i) => `<div class="face bounce" style="animation-delay:${i * .2}s">${avatar(c)}
      <div class="nm">${c.name}</div><div class="rl">${c.role}</div></div>`).join("")}</div>
    <div class="actions"><button class="btn big go" onclick="sfx.warm();screenMission()">▶ PLAY</button>
      <button class="btn big" style="background:#8a5cd6;box-shadow:0 6px 0 #5e3aa0" onclick="screenColonyBuilder()">🏗️ Moon Colony Builder</button></div>`;
  say("thrust", "Hi! I'm the commander. Help us plan a trip to the Moon!", 0);
}

// PICK A MISSION
function screenMission() {
  $("hud").classList.add("hidden");
  $("app").innerHTML = `<h2>Where are we going?</h2>
    <div class="tiles">${GOALS.map((g) => `<div class="mtile" onclick="chooseGoal('${g.id}')">
      <div class="ico">${g.ico}</div><div class="nm">${g.name}</div>
      <div class="stars">${"★".repeat(g.stars)}${"☆".repeat(3 - g.stars)}</div>
      <div class="sub">Science ×${g.mult}</div></div>`).join("")}
      <div class="mtile" onclick="screenArtemis()" style="border-color:#ff9a3d55">
        <div class="ico">🛰️</div><div class="nm">Artemis III test</div>
        <div class="stars" style="font-size:15px">NASA's 2027 plan</div>
        <div class="sub">Dock with Blue Moon & Starship in Earth orbit</div></div>
      <div class="mtile" onclick="screenColonyBuilder()" style="border-color:#8a5cd655">
        <div class="ico">🏗️</div><div class="nm">Moon Colony Builder</div>
        <div class="stars" style="font-size:15px">12 steps to a fuel station</div>
        <div class="sub">Ship, build, survive emergencies: Gateway to Mars</div></div></div>`;
  say("rocket", "Harder missions = more science points. But more fuel too!", 0);
}
function chooseGoal(id) {
  sfx.go();
  state.goal = id;
  if (id === "land") state.lander = null;
  state.science = state.science.filter((s) => !byId(SCIENCE, s).needs || byId(SCIENCE, s).needs.includes(id));
  screenBuild();
}

// BUILD THE SPACECRAFT
function partTile(item, on, onclick, sub, locked) {
  return `<div class="part ${on ? "on" : ""} ${locked ? "lock" : ""}" onclick="${locked ? "" : onclick}" title="${item.info || ""}">
    ${on ? '<span class="tick">✅</span>' : ""}<div class="ico">${item.ico}</div>
    <div class="nm">${item.name}</div><div class="kg">${sub}</div></div>`;
}
function screenBuild() {
  $("hud").classList.remove("hidden");
  $("app").innerHTML = `<h2>Build your spacecraft</h2>
    <div class="build">
      <div class="ship-box"><div id="ship"></div>
        <div class="legend"><span><i style="background:#cfd8ee"></i>Stuff</span><span><i style="background:var(--fuel)"></i>Fuel</span><span><i style="background:#7b6bd6"></i>Tanks</span></div>
        <div class="ship-total" id="shipTotal"></div></div>
      <div id="partsArea"></div>
    </div>
    <div class="actions"><button class="btn ghost" onclick="screenMission()">← Mission</button>
      <button class="btn" onclick="toRockets()">Pick a rocket →</button></div>`;
  drawBuild();
  lastMass = computeMass();
  say("crater", state.goal === "land" && !state.lander ? "First choose: the Apollo way, or an Artemis-style one-piece lander? 🤔" : isApollo() ? "The Apollo way: 4 modules, each with its own job! 👀" : "Every part adds weight. Watch the fuel tank grow! 👀", 6000);
}
function drawBuild() {
  const g = state.goal;
  $("partsArea").innerHTML = `
    <div class="group"><h3>Who flies?</h3><div class="crew-row" style="justify-content:flex-start;margin:0;gap:10px">
      ${CREW.map((c) => `<div class="face ${state.crew.includes(c.id) ? "" : "off"}" onclick="toggleCrew('${c.id}', event)" style="width:90px">
        ${avatar(c).replace("<svg", '<svg style="width:64px;height:64px"')}<div class="nm" style="font-size:12px">${c.name}</div></div>`).join("")}
    </div></div>
    ${g === "land" ? `<div class="group"><h3>Choose your lander design</h3><div class="parts">
      ${partTile({ ico: "🇺🇸", name: "The Apollo way", info: "" }, state.lander === "apollo", "chooseLander('apollo',event)", "2-stage lander: descent stage STAYS on the Moon")}
      ${partTile({ ico: "🚀", name: "Artemis-style", info: "" }, state.lander === "custom", "chooseLander('custom',event)", "1 piece, like Starship: the WHOLE lander lifts off")}</div></div>` : ""}
    ${isApollo() ? `<div class="group"><h3>Apollo spacecraft: add all 4 modules</h3><div class="parts">${MODULES.map((md) =>
      partTile(md, state.modules.includes(md.id), `toggleModule('${md.id}',event)`, `${tons(md.mass)} empty · ${md.info}`)).join("")}</div></div>`
    : g === "land" && !state.lander ? "" : `<div class="group"><h3>Capsule</h3><div class="parts">${CAPSULES.map((c) =>
      partTile(c, state.capsule === c.id, `setOne('capsule','${c.id}',event)`, `${tons(c.mass)} · ${c.info}`)).join("")}</div></div>
    <div class="group"><h3>Engine</h3><div class="parts">${ENGINES.map((e) =>
      partTile(e, state.engine === e.id, `setOne('engine','${e.id}',event)`, e.info)).join("")}</div></div>`}
    <div class="group"><h3>Must-haves</h3><div class="parts">${PARTS.map((p) =>
      partTile(p, state.parts.includes(p.id), `toggleList('parts','${p.id}',event)`, `${tons(p.mass)}`, p.onlyFor && (p.onlyFor !== g || isApollo()))).join("")}</div></div>
    <div class="group"><h3>Science</h3><div class="parts">${SCIENCE.map((s) =>
      partTile(s, state.science.includes(s.id), `toggleList('science','${s.id}',event)`, `${tons(s.mass)} · ⭐${s.points}`, s.needs && !s.needs.includes(g))).join("")}</div></div>
    <div class="group"><h3>Spare fuel</h3><div class="spare">
      <button onclick="changeMargin(-5,event)">−</button><b>${state.margin}%</b><button onclick="changeMargin(5,event)">+</button>
      <span class="kg" style="color:var(--muted)">just in case…</span></div></div>`;
  drawShip();
  updateHUD();
}

// The spacecraft picture: fuel tank height grows with fuel
function drawShip() {
  const m = computeMass();
  if (m.apollo) return drawApolloShip(m);
  const cap = byId(CAPSULES, state.capsule);
  const W = 200, capW = cap.id === "big" ? 120 : 84;
  const tankH = m.impossible ? 250 : Math.min(250, 14 + Math.sqrt(m.fuel) * 0.8);
  const tankRatio = m.impossible ? 0.15 : m.tanks / (m.fuel + m.tanks);
  let y = 20;
  let svg = `<svg viewBox="0 0 ${W} 420">`;
  // science icons floating next to the capsule
  state.science.forEach((s, i) => (svg += `<text x="${i % 2 ? 170 : 8}" y="${40 + Math.floor(i / 2) * 26}" font-size="20">${byId(SCIENCE, s).ico}</text>`));
  // capsule (cone)
  svg += `<path d="M${100 - capW / 2} ${y + 70} L${100 - 16} ${y} L${100 + 16} ${y} L${100 + capW / 2} ${y + 70} Z" fill="#cfd8ee"/>`;
  // crew windows
  state.crew.forEach((id, i) => {
    const n = state.crew.length, cx = 100 + (i - (n - 1) / 2) * 20;
    svg += `<circle cx="${cx}" cy="${y + 45}" r="7" fill="${byId(CREW, id).color}" stroke="#334" stroke-width="2"/>`;
  });
  y += 70;
  if (state.parts.includes("shield")) { svg += `<rect x="${100 - capW / 2 - 4}" y="${y}" width="${capW + 8}" height="9" rx="4" fill="#5a3a2a"/>`; y += 9; }
  // tanks shell + fuel inside
  const tw = 70;
  svg += `<rect x="${100 - tw / 2}" y="${y}" width="${tw}" height="${tankH}" rx="10" fill="#7b6bd6"/>`;
  const inner = tankH * (1 - tankRatio);
  svg += `<rect x="${100 - tw / 2 + 6}" y="${y + tankH - inner + 3}" width="${tw - 12}" height="${Math.max(0, inner - 6)}" rx="6" fill="${m.impossible ? "var(--bad)" : "var(--fuel)"}">
    ${m.impossible ? '<animate attributeName="opacity" values="1;.3;1" dur=".6s" repeatCount="indefinite"/>' : ""}</rect>`;
  if (m.impossible) svg += `<text x="100" y="${y + tankH / 2 + 10}" text-anchor="middle" font-size="34" fill="#fff">∞</text>`;
  y += tankH;
  // engine nozzle
  svg += `<path d="M85 ${y} L115 ${y} L124 ${y + 22} L76 ${y + 22} Z" fill="#555"/>`;
  // landing legs
  if (state.parts.includes("lander")) svg += `<path d="M${100 - tw / 2} ${y - 20} L${100 - tw / 2 - 26} ${y + 30} M${100 + tw / 2} ${y - 20} L${100 + tw / 2 + 26} ${y + 30}" stroke="#ccc" stroke-width="5"/>`;
  svg += `</svg>`;
  $("ship").innerHTML = svg;
  $("shipTotal").innerHTML = m.impossible
    ? `<b style="color:var(--bad)">Too heavy, can't be built!</b>`
    : `Stuff ${tons(m.payload)} + Fuel ${tons(m.fuel)} + Tanks ${tons(m.tanks)} = <b>${tons(m.total)}</b>`;
}

// Apollo cutaway: where the crew sit, where the cargo goes, how full each tank is
function drawApolloShip(m) {
  const P = m.parts, has = (id) => state.modules.includes(id);
  const bar = (x, y, h, fuel, max) => `<rect x="${x}" y="${y}" width="10" height="${h}" rx="3" fill="#0006"/>
    <rect x="${x}" y="${y + h - h * Math.min(1, fuel / max)}" width="10" height="${h * Math.min(1, fuel / max)}" rx="3" fill="var(--fuel)"/>`;
  let s = `<svg viewBox="0 0 240 430" style="height:430px">`;
  const ghost = (id, el) => has(id) ? el : `<g opacity=".18">${el}</g>`;
  // CM with 3 couches
  s += ghost("cm", `<path d="M80 92 L160 92 L132 28 L108 28 Z" fill="#e9edf5"/><rect x="78" y="90" width="84" height="6" fill="#5a3a2a"/>
    ${state.crew.slice(0, 3).map((id, i) => `<circle cx="${102 + i * 18}" cy="72" r="7" fill="${byId(CREW, id).color}" stroke="#334" stroke-width="2"/>`).join("")}`);
  s += `<text x="168" y="62" font-size="11" fill="#cfd8ee">🔺 Command module</text><text x="168" y="76" font-size="10" fill="#8f9ac4">crew sit here (3 seats)</text>`;
  // SM
  s += ghost("sm", `<rect x="82" y="98" width="76" height="70" fill="#b8bfcc"/><path d="M108 168 L132 168 L140 186 L100 186 Z" fill="#555"/>`);
  if (has("sm")) s += bar(64, 104, 60, P.smFuel, 22000);
  s += `<text x="168" y="130" font-size="11" fill="#cfd8ee">🛢️ Service module</text><text x="168" y="144" font-size="10" fill="#8f9ac4">big engine + fuel</text>`;
  // adapter outline
  s += `<path d="M70 196 L170 196 L190 330 L50 330 Z" fill="none" stroke="#ffffff33" stroke-dasharray="4 4"/>`;
  s += `<text x="120" y="210" font-size="9" fill="#8f9ac4" text-anchor="middle">inside the adapter during launch</text>`;
  // LM ascent
  s += ghost("lma", `<path d="M96 262 L144 262 L150 240 L134 222 L104 222 L92 240 Z" fill="#b9bec9"/><rect x="108" y="236" width="10" height="8" fill="#223"/>
    <circle cx="112" cy="252" r="5" fill="${byId(CREW, state.crew[0]).color}"/>${state.crew[1] ? `<circle cx="128" cy="252" r="5" fill="${byId(CREW, state.crew[1]).color}"/>` : ""}`);
  if (has("lma")) s += bar(64, 224, 36, P.ascFuel, 2600);
  s += `<text x="168" y="240" font-size="11" fill="#cfd8ee">🕷️ LM ascent</text><text x="168" y="254" font-size="10" fill="#8f9ac4">2 stand here to land</text>`;
  // LM descent with cargo bays
  const cargo = state.science.map((id) => byId(SCIENCE, id).ico).join(" ");
  s += ghost("lmd", `<rect x="88" y="264" width="64" height="34" fill="#d9a62e"/><path d="M90 296 L66 324 M150 296 L174 324" stroke="#ccc" stroke-width="4"/>
    <text x="120" y="286" font-size="13" text-anchor="middle">${cargo}</text>`);
  if (has("lmd")) s += bar(64, 264, 34, P.desFuel, 9000);
  s += `<text x="168" y="282" font-size="11" fill="#cfd8ee">🦿 LM descent</text><text x="168" y="296" font-size="10" fill="#8f9ac4">cargo bays: rover,</text><text x="168" y="308" font-size="10" fill="#8f9ac4">experiments</text>`;
  s += `<text x="120" y="356" font-size="11" fill="#8f9ac4" text-anchor="middle">Orange bars = fuel in each module</text>`;
  s += `<text x="120" y="378" font-size="11" fill="#8f9ac4" text-anchor="middle">Empty stages are left behind: staging!</text>`;
  s += `</svg>`;
  $("ship").innerHTML = s;
  $("shipTotal").innerHTML = `Modules ${tons(m.payload)} + Fuel ${tons(m.fuel)} = <b>${tons(m.total)}</b>`;
}

// After any change: show how much the FUEL changed (the spiral lesson!)
function afterChange(ev, addedKg) {
  const before = lastMass;
  drawBuild();
  const now = computeMass();
  lastMass = now;
  if (!ev) return;
  const x = ev.clientX, y = ev.clientY;
  if (now.impossible) {
    say("crater", "😱 The fuel needed grows forever! Remove stuff or try the hydrogen engine.", 7000);
    return;
  }
  if (before && !before.impossible && addedKg) {
    const dFuel = (now.fuel + now.tanks) - (before.fuel + before.tanks);
    popText(`${addedKg > 0 ? "+" : "−"}${tons(Math.abs(addedKg))} stuff`, "#cfd8ee", x - 40, y - 20);
    setTimeout(() => popText(`${dFuel > 0 ? "+" : "−"}${tons(Math.abs(dFuel))} fuel & tanks`, "#ff8a3d", x - 40, y + 10), 250);
    if (addedKg > 0 && dFuel > 400) say("crater", `You added ${tons(addedKg)}… so we need ${tons(dFuel)} MORE fuel and tanks! 🌀`, 5000);
  }
}
let lastMass = null;

function chooseLander(kind, ev) {
  state.lander = kind; sfx.add();
  if (kind === "apollo") {
    state.crew = state.crew.slice(0, 3); state.parts = state.parts.filter((p) => p !== "lander");
    say("thrust", "The Apollo way: a 3-seat command module, a service module, and a 2-stage lunar module. Empty parts get left behind! 🇺🇸", 7000);
  } else {
    if (!state.parts.includes("lander")) state.parts.push("lander");
    say("crater", "Artemis-style is ONE piece: the whole lander (legs, tank and all) lifts off from the Moon, like NASA's new Starship and Blue Moon landers. Apollo instead left its descent stage behind. 🚀", 9000);
  }
  afterChange(ev, 0);
}
function toggleModule(id, ev) {
  const on = state.modules.includes(id), md = byId(MODULES, id);
  state.modules = on ? state.modules.filter((x) => x !== id) : [...state.modules, id];
  on ? sfx.remove() : sfx.add();
  afterChange(ev, on ? -md.mass : md.mass);
  const tips = { cm: "Command module: 3 seats. It's the only part that comes back to Earth! 🔺",
    sm: "Service module: the big engine that brakes us at the Moon and fires us home. 🛢️",
    lma: "Ascent stage: 2 astronauts ride it back up from the Moon. 🕷️",
    lmd: "Descent stage: lands, and stores the rover and experiments in side bays. 🦿" };
  if (!on) say(id === "lmd" || id === "lma" ? "crater" : "thrust", tips[id], 6000);
}
function toggleCrew(id, ev) {
  if (id === "thrust") return sfx.nope(), say("thrust", "I'm the commander, I have to fly! 🫡");
  const on = state.crew.includes(id);
  const seats = isApollo() ? 3 : byId(CAPSULES, state.capsule).seats;
  if (!on && state.crew.length >= seats) return say("thrust", isApollo() ? "The Apollo command module has only 3 seats! 🔺" : "No seats left! Pick the big capsule. 🛸");
  state.crew = on ? state.crew.filter((x) => x !== id) : [...state.crew, id];
  on ? sfx.remove() : sfx.add();
  const kg = KG_PER_PERSON + SUPPLIES_PER_DAY * goal().days;
  afterChange(ev, on ? -kg : kg);
  if (id === "fuel" && !on) say("fuel", "If I stay on Earth, I run Mission Control and save $100M! 💰");
  if (id === "crater" && !on) say("crater", "I can fix things if they break in space. 🔧");
  if (id === "rocket" && on) say("rocket", "Without me, science gets only half points! 🔬");
}
function setOne(key, id, ev) {
  const list = key === "capsule" ? CAPSULES : ENGINES;
  const old = byId(list, state[key]);
  if (key === "capsule" && byId(CAPSULES, id).seats < state.crew.length) return say("thrust", "Too many crew for the small capsule! Remove someone first.");
  state[key] = id;
  sfx.add();
  afterChange(ev, key === "capsule" ? byId(CAPSULES, id).mass - old.mass : 0);
  if (key === "engine") say("crater", id === "hydrogen" ? "Hydrogen needs less fuel, but bigger, heavier tanks. 💧" : "Simple engine: cheap, but drinks lots of fuel. 🔥");
}
function toggleList(key, id, ev) {
  const list = key === "parts" ? PARTS : SCIENCE;
  const on = state[key].includes(id);
  state[key] = on ? state[key].filter((x) => x !== id) : [...state[key], id];
  on ? sfx.remove() : sfx.add();
  afterChange(ev, on ? -byId(list, id).mass : byId(list, id).mass);
  if (id === "shield" && on) say("thrust", "Without a heat shield we burn up coming home! 🔥");
}
function changeMargin(d, ev) {
  state.margin = Math.max(0, Math.min(20, state.margin + d));
  d > 0 ? sfx.add() : sfx.remove();
  afterChange(ev, 0);
  if (d > 0) say("crater", "Spare fuel = safer… but heavier. ⛽");
}

function toRockets() {
  if (state.goal === "land") {
    if (!state.lander) return sfx.nope(), say("thrust", "Choose a lander design first: the Apollo way, or Artemis-style! 🤔");
    if (state.crew.length < 2) return sfx.nope(), say("thrust", "Landing on the Moon needs at least 2 astronauts: one alone is too risky! 👨‍🚀👩‍🚀");
    if (isApollo() && state.modules.length < 4) return sfx.nope(), say("thrust", "We need all 4 modules: command, service, and both lander stages! 🔺🛢️🕷️🦿");
    if (!isApollo() && !state.parts.includes("lander")) return sfx.nope(), say("thrust", "Our lander needs landing legs and an engine! 🦿");
  }
  if (computeMass().impossible) return say("crater", "This spacecraft is impossible to fuel. Make it lighter first!");
  screenRockets();
}

// PICK A ROCKET — same spacecraft on every rocket
function rocketSVG(r, fit) {
  const h = Math.round(70 + Math.sqrt(r.tli / 1000) * 22);
  const w = r.id === "fh" || r.id === "sls" ? 46 : r.id === "megax" ? 54 : 26;
  const flame = fit === "heavy" ? "#ff5c6c" : "#ffb547";
  let body = `<rect x="${50 - 13}" y="20" width="26" height="${h - 20}" rx="6" fill="${r.color}"/>`;
  if (w > 30) body += `<rect x="${50 - 25}" y="${h * 0.4}" width="11" height="${h * 0.6}" rx="4" fill="${r.color}" opacity=".85"/><rect x="${50 + 14}" y="${h * 0.4}" width="11" height="${h * 0.6}" rx="4" fill="${r.color}" opacity=".85"/>`;
  return `<svg width="100" height="${h + 30}" viewBox="0 0 100 ${h + 30}">
    <path d="M37 22 L50 0 L63 22 Z" fill="#9aa8c8"/>${body}
    <path d="M42 ${h} L58 ${h} L50 ${h + 24} Z" fill="${flame}"/></svg>`;
}
function screenRockets() {
  const m = computeMass();
  $("app").innerHTML = `<h2>Pick a rocket for your ${tons(m.total)} spacecraft</h2>
    <div class="rockets">${ROCKETS.map((r) => {
      const fit = rocketFit(r, m);
      const icon = { heavy: "😰", broke: "💸", waste: "🤑", good: "👌" }[fit];
      const used = Math.round((m.total / r.tli) * 100);
      return `<div class="rk ${state.rocket === r.id ? "sel" : ""}" id="rk_${r.id}" onclick="chooseRocket('${r.id}')">
        <div class="verdict">${state.rocket === r.id ? icon : ""}</div>
        ${rocketSVG(r, fit)}<div class="nm">${r.name}</div>
        <div class="price">${money(r.cost)}</div>
        <div class="cap">lifts ${tons(r.tli)} · you ${used}%</div></div>`;
    }).join("")}</div>
    <div class="actions"><button class="btn ghost" onclick="screenBuild()">← Rebuild</button>
      <button class="btn go big" id="launchBtn" onclick="screenAssemble()" ${state.rocket ? "" : "disabled"}>Next: build the rocket →</button></div>`;
  updateHUD();
  if (!state.rocket) say("fuel", "Same spacecraft, 5 rockets. Too small fails… too big wastes money! 💰", 0);
}
function chooseRocket(id) {
  state.rocket = id;
  const r = byId(ROCKETS, id), m = computeMass(), fit = rocketFit(r, m);
  screenRockets();
  fit === "good" ? sfx.add() : sfx.nope();
  if (fit === "heavy") { $("rk_" + id).classList.add("shake"); say("crater", `😰 ${r.name} can only lift ${tons(r.tli)}. We weigh ${tons(m.total)}!`, 0); }
  if (fit === "broke") say("fuel", `💸 That puts us over budget!`, 0);
  if (fit === "waste") say("fuel", `🤑 We only use ${Math.round((m.total / r.tli) * 100)}% of it. Like hiring a truck to deliver one pizza!`, 0);
  if (fit === "good") say("thrust", `👌 Perfect fit! We use ${Math.round((m.total / r.tli) * 100)}% of its power.`, 0);
}

// ---------- 6b. CHOOSE THE PATH TO THE MOON ----------
// Free return = a figure-8 path: if anything goes wrong, the Moon's gravity swings you home (Apollo 13!)
// Direct = arrives slower so braking is cheaper (more brake fuel), but if you miss there's no way back.
function pathSVG(free) {
  const back = free
    ? `<path d="M150 40 C 200 10, 215 75, 160 70 C 110 66, 70 110, 40 95" fill="none" stroke="#3ecf8e" stroke-width="3" stroke-dasharray="6 5"/>`
    : `<path d="M150 40 C 190 30, 200 20, 210 10" fill="none" stroke="#ff5c6c" stroke-width="3" stroke-dasharray="3 6"/><text x="196" y="30" font-size="16">❓</text>`;
  return `<svg viewBox="0 0 230 120" width="100%" height="120">
    <circle cx="35" cy="90" r="22" fill="#2f7de1"/><circle cx="170" cy="45" r="13" fill="#cfd3dc"/>
    <path d="M45 75 C 80 20, 120 20, 155 38" fill="none" stroke="#ffb547" stroke-width="3"/>${back}</svg>`;
}
function screenPath() {
  if (state.goal === "flyby") { state.path = "free"; return screenLaunchDay(); }
  sfx.click();
  $("app").innerHTML = `<h2>How do we fly to the Moon?</h2>
    <div class="tiles" style="max-width:760px;margin:auto">
      <div class="mtile" onclick="choosePath('free')">${pathSVG(true)}
        <div class="nm">🛟 Free return</div>
        <div class="sub">If anything goes wrong, the Moon swings us home.</div>
        <div class="stars" style="font-size:15px">✅ Safe &nbsp; ⛽ Less brake fuel</div></div>
      <div class="mtile" onclick="choosePath('direct')">${pathSVG(false)}
        <div class="nm">⚡ Direct</div>
        <div class="sub">Easier to brake into orbit… but no way back if we miss.</div>
        <div class="stars" style="font-size:15px">⛽ More brake fuel &nbsp; ⚠️ Risky</div></div>
    </div>
    <div class="actions"><button class="btn ghost" onclick="screenAssemble()">← Rocket</button></div>`;
  say("thrust", "Apollo 13 got home safely thanks to a free-return path. Safe or efficient? 🤔", 0);
}
function choosePath(p) { state.path = p; sfx.go(); screenLaunchDay(); }

// ---------- 7. FLIGHT: see flight.js ----------

// ---------- 8. REPORT CARD ----------
function screenReport() {
  // leave full screen
  document.body.classList.remove("flying");
  try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
  const f = flight, m = f.m, r = f.r, cost = computeCost() + (f.padWrecked ? 300 : 0);
  const ok = !f.fails;
  const why = [];
  const used = m.total / r.tli;

  if (f.fails === "heavy") why.push(["bad", "🏋️", `We weighed ${tons(m.total)}, but ${r.name} can only push ${tons(r.tli)} to the Moon. Heavier spacecraft = bigger rocket.`]);
  if (f.fails === "leak") why.push(["bad", "⛽", "A leak drained our fuel. Bring an engineer or some spare fuel next time."]);
  if (f.padWrecked) why.push(["bad", "💧", "No water deluge: the roar and heat wrecked the launch pad (+$300M repairs). Water soaks up the heat and the sound waves."]);
  else if (state.water) why.push(["good", "💧", "The water deluge protected the launch pad. All that white cloud was steam!"]);
  if (f.fails === "suborbital") why.push(["bad", "⬆️", "Every launch went straight up and fell back. To reach orbit, rockets tilt over (gravity turn) to build 7.8 km/s of SIDEWAYS speed."]);
  if (f.fails === "tli_miss") why.push(["bad", "🎯", "We ran out of attempts aiming the TLI burn. The Moon moves about 1 km every second! Burn when the path end meets the ghost Moon."]);
  if (f.lives <= 0 && f.fails !== "tli_miss") why.push(["bad", "💔", "Out of attempts! Every missed burn uses one. Practice makes perfect."]);
  if (f.tliTries > 1) why.push(["", "🎯", `It took ${f.tliTries} tries to aim the TLI. The trick: aim where the Moon WILL be, not where it is.`]);
  if (f.fails === "launch_abort") why.push(["warn", "🗼", "An engine caught fire at launch, and the escape tower pulled the capsule to safety! That's why crewed rockets carry one."]);
  if (f.fails === "launch_loss") why.push(["bad", "🗼", "An engine caught fire at launch and there was no escape tower to save the crew. Real crewed rockets always carry an escape system."]);
  if (f.fails === "abort") why.push(["warn", "🛟", "Smart call! The free-return path swung us home safely, but we missed the Moon. An engineer or spare fuel could have saved the mission."]);
  if (f.fails === "miss_safe") why.push(["warn", "🛟", "We missed orbit, but the free-return path swung us home, just like Apollo 13. Crew safe!"]);
  if (f.fails === "lost") why.push(["bad", "🌌", "We missed the Moon with no free-return path, so there was no way home. That's why the first Apollo missions flew free return!"]);
  if (f.fails === "shield") why.push(["bad", "🔥", "Coming home, air heats the capsule to ~2,800 °C. No heat shield = no crew."]);
  if (f.fails === "crash") why.push(["bad", "💥", "We braked too much. Slow down too far and the Moon's gravity pulls you down. Orbiting is falling while moving sideways fast enough to keep missing!"]);
  if (f.fails === "miss") why.push(["bad", "🌙💨", "We didn't brake enough. Too fast, and the Moon's gravity can only bend our path, not catch us."]);
  if (ok) why.push(state.path === "free" ? ["good", "🛟", "Free return gave us a safe way home the whole trip."]
    : state.goal !== "flyby" ? ["warn", "⚡", "The direct path gave us extra brake fuel. Efficient, but risky: one mistake and there's no way back."] : null);
  if (ok || (f.fails && !["heavy", "launch_abort", "launch_loss"].includes(f.fails))) {
    const n = STACKS[state.rocket].stages.length + (STACKS[state.rocket].boosters ? 1 : 0);
    why.push(["good", "🧩", `Staging: the ${r.name} dropped ${n} empty parts on the way up, so it didn't carry dead weight. Staging beats the mass spiral!`]);
  }
  if (ok && !state.les) why.push(["warn", "🗼", "No escape tower, and we got lucky at launch. Real crewed rockets never fly without one."]);
  if (ok && state.goal === "land") {
    why.push(f.rocks ? ["good", "🪨", `We brought home ${f.rocks} Moon rock${f.rocks > 1 ? "s" : ""}! Apollo brought back 382 kg of them.`]
      : ["warn", "🪨", state.science.includes("rocks") ? "We had a rock box but collected no samples. Drive the rover to find some!" : "No rock box packed, so no Moon samples came home."]);
    if (!isApollo()) why.push(["", "🚀", "Our Artemis-style one-piece lander carried ALL its fuel down and back up, like Starship. Apollo split it into stages to save mass; Artemis landers are reusable instead."]);
  }
  if (state.oxFirst !== undefined) why.push(state.oxFirst ? ["good", "🫧", "Oxidizer quiz: you knew rockets carry their own oxygen! (+50 pts)"] : ["warn", "🫧", "Oxidizer quiz: space has no air, so rockets must bring their own oxygen (the oxidizer)."]);
  const ld = state.launchDay;
  if (ld) {
    if (ld.allGo) why.push(["good", "📅", `Launch Day ${ld.date}: all controllers GO! A perfect launch slot. (+50 pts)`]);
    if (ld.window !== "go") why.push(["warn", "🕐", `Launch window: we launched ${ld.window === "nogo" ? "far" : "a bit"} outside it, so steering cost extra fuel.`]);
    if (ld.sun === "nogo") why.push(["bad", "🌑", "Sunlight: we arrived at night at the landing site, so we couldn't land. Pick a day when it's early morning there."]);
    else if (ld.sun === "caution") why.push(["warn", "☀️", `Sunlight: the Sun was ${Math.round(ld.sunElev)}° high. Best is 5–20° (long shadows show the rocks).`]);
    if (ld.scrubs) why.push(["warn", "⛈️", `Weather scrubbed the launch ${ld.scrubs} time${ld.scrubs > 1 ? "s" : ""}. Real missions wait for good weather too.`]);
  }
  if (f.tliCut) why.push(f.cutoff === "good" || f.hit ? ["good", "🎯", `TLI burn cut off at ${f.tliCut.toFixed(2)} km/s, right in the green zone (Apollo 11: 10.83).`] : ["warn", "🎯", `TLI cutoff at ${f.tliCut.toFixed(2)} km/s. Too slow and you can't climb to the Moon; too fast and you shoot past it.`]);
  if (f.reflector) why.push(["good", "🔦", "You set up a laser reflector. Scientists use it to measure the Moon's distance to a few millimetres! (+30 pts)"]);
  if (f.stagePts !== undefined) why.push(f.stagePts ? ["good", "💥", "Staging: you dropped the empty stage right away! (+50 pts)"] : ["warn", "💥", "Staging: an empty stage is dead weight. Drop it as soon as it burns out!"]);
  if (f.liftQuiz !== undefined) why.push(f.liftQuiz ? ["good", "🎯", "Liftoff quiz: you knew exactly what lifts off for this lander! (+50 pts)"]
    : ["warn", "🎯", isApollo() ? "Liftoff quiz: Apollo left the descent stage on the Moon. Only the ascent stage came back up." : "Liftoff quiz: an Artemis-style lander lifts off in ONE piece. Nothing stays behind, so it can be reused."]);
  if (f.saved === "jane") why.push(["good", "🔧", "Bringing an engineer saved the mission."]);
  if (f.saved === "spare") why.push(["good", "⛽", "Spare fuel saved the mission. Real missions always carry extra."]);
  if (f.saved === "luck") why.push(["warn", "🍀", "The leak left us with less brake fuel, but we got lucky. Real missions don't count on luck!"]);
  if (f.orbitShape) why.push([f.orbitShape === "round" ? "good" : "warn", "🛰️",
    f.orbitShape === "round" ? "Beautiful round orbit! Perfect braking. (+30 pts)" : f.orbitShape === "oval" ? "We got an oval orbit. A bit more braking makes it rounder." : "Very stretched orbit: we barely got captured. Brake a little longer next time."]);
  if (f.attempts > 1) why.push(["", "🔁", `It took ${f.attempts} tries to get into orbit. Real missions get only one try, so they practise in simulators like this!`]);

  let science = 0, stars = 0;
  if (ok) {
    stars = 1;
    state.science.forEach((s) => (science += byId(SCIENCE, s).points));
    if (!state.crew.includes("rocket")) science = Math.round(science / 2);
    science += (f.rocks || 0) * 10 + (f.liftQuiz === true ? 50 : 0) + (state.oxFirst === true ? 50 : 0) + (f.reflector ? 30 : 0) + (state.launchDay && state.launchDay.allGo ? 50 : 0) + (f.stagePts === true ? 50 : 0);
    science *= goal().mult;
    if (used >= 0.4 && cost <= BUDGET) stars++;
    if (science >= 40) stars++;
    if (used < 0.4) {
      const better = ROCKETS.filter((x) => x.tli >= m.total && x.cost < r.cost).sort((a, b) => a.cost - b.cost)[0];
      why.push(["warn", "🤑", `We used only ${Math.round(used * 100)}% of ${r.name}.${better ? ` ${better.name} could do it for ${money(better.cost)}.` : ""}`]);
    } else why.push(["good", "👌", `Good rocket fit: we used ${Math.round(used * 100)}% of its power.`]);
    if (cost > BUDGET) why.push(["bad", "💸", `We spent ${money(cost)}. That's over budget!`]);
    if (science < 40) why.push(["warn", "🔬", `Science: ${science} pts. Harder missions and more instruments score more.`]);
    else why.push(["good", "🔬", `Science: ${science} pts!`]);
  }
  why.push(["", "🌀", `Only ${Math.round((m.payload / m.total) * 100)}% of our spacecraft was useful stuff. The rest was fuel and tanks. That's the mass spiral!`]);
  for (let i = why.length - 1; i >= 0; i--) if (!why[i]) why.splice(i, 1);
  const score = ok ? 100 + science + Math.max(0, Math.round((BUDGET - cost) / 50)) + (used >= 0.4 ? Math.round(used * 30) : 0) + (f.orbitShape === "round" ? 30 : 0) : 0;

  $("app").innerHTML = `
    <div class="result ${ok ? "good" : "bad"}">${ok ? "MISSION SUCCESS!" : "MISSION FAILED"}</div>
    <div class="bigstars">${[0, 1, 2].map((i) => (i < stars ? "★" : `<span class="dim">★</span>`)).join("")}</div>
    <div class="score">${score} points · spent ${money(cost)} · ${attemptsHTML(Math.max(0, f.lives), 5)}</div>
    <div class="why">${why.map(([k, ico, t]) => `<div class="whycard ${k}"><span class="ico">${ico}</span><span>${t}</span></div>`).join("")}</div>
    <details><summary>🧠 How does the mass spiral work?</summary>
      <p>To speed up, a spacecraft throws fuel out of its engine. More stuff needs more fuel. But fuel needs tanks, and tanks are heavy, so you need even more fuel… Engineers call this the <b>rocket equation</b>. That's why every kilogram matters!</p></details>
    <details><summary>🛰️ How does an orbit work?</summary>
      <p>An orbit is <b>falling but missing</b>. The Moon's gravity always pulls you in. If you move sideways fast enough, you keep falling around it instead of into it. Too fast, and you escape. Too slow, and you crash. Braking at the closest point shrinks your path into a loop. Real missions like Apollo and Chandrayaan did exactly this burn!</p></details>
    <div class="actions"><button class="btn" onclick="state.rocket=null;screenBuild()">🔧 Fix my design</button>
      <button class="btn ghost" onclick="state.rocket=null;screenMission()">🗺️ New mission</button></div>`;
  updateHUD();
  say(ok ? "thrust" : "crater", ok ? (stars === 3 ? "WOW! Perfect mission! 🏆" : "We made it home! Can you get 3 stars? ⭐") : "That didn't work… but now we know why. Try again! 💪", 0);
}

// ---------- START ----------
screenTitle();

/* SOURCES (approximate): NASA Glenn "Ideal Rocket Equation"; SpaceX capabilities page
   (TLI estimated); NASA SLS reference guide (27 t TLI); NASA OIG 2022 (~$2.2B/SLS launch);
   Apollo 17 Saturn V TLI ~48.6 t; Apollo delta-v budget (LOI 0.9, landing 1.9, ascent 1.9,
   return 0.9 km/s); Isp: storable ~320 s, hydrogen/oxygen ~450 s; ~5 kg/person/day supplies (ISS). */
