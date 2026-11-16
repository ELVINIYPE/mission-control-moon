/* =========================================================
   MOON COLONY BUILDER — GAME LOGIC (no drawing in this file)
   Resources, the 12 steps, shipping routes, power, life support,
   random events and emergencies. The view (cb-view.js) only reads
   this state and calls these functions, so a 3D view could replace it later.
   Numbers are simplified game values; science facts are approximate.
   ========================================================= */

const CB_START_BUDGET = 12000;          // $ millions
const LUNAR_DAY = 29.5;                 // Earth days in one Moon day–night cycle
const RATE = { o2: 0.84, water: 3.5, food: 1.8 };   // kg per astronaut per day (NASA planning figures, approx.)
const CREW_TICKET = 500;                // $M per astronaut (Express ride)
const RESCUE_COST = 600;                // $M express emergency shipment

const ROUTES = {
  express:  { id: "express", ico: "⚡", name: "Express", days: 3, perT: 300, crew: true,
              ex: "Apollo, Artemis", how: "One big burn at perigee, straight to the Moon. Needs a big rocket." },
  standard: { id: "standard", ico: "🔁", name: "Standard", days: 40, perT: 150,
              ex: "Chandrayaan-3 (~40 days, 2023), Firefly Blue Ghost (~45 days, 2025)", how: "Several perigee burns stretch the orbit bigger and bigger (Oberth effect), then a final push." },
  economy:  { id: "economy", ico: "🐢", name: "Economy", days: 120, perT: 100, windows: true,
              ex: "CAPSTONE (~4.5 months, 2022), ispace Hakuto-R", how: "A long loop that uses the Sun's gravity to save fuel when arriving at the Moon." },
};
const isWindow = (day) => [3, 4, 17, 18].includes(Math.floor(day) % 30);   // Economy launch windows

const ITEMS = {
  scout:      { ico: "🤖", name: "Scout rover", t: 0.5, cost: 200, step: 2 },
  padbot:     { ico: "🚜", name: "Pad-building robot", t: 2, cost: 150, step: 3 },
  solar:      { ico: "☀️", name: "Solar tower (6 kW)", t: 1.5, cost: 100, step: 4, qty: true },
  battery:    { ico: "🔋", name: "Battery pack (120 kWh)", t: 1, cost: 60, step: 4, qty: true },
  cleanbot:   { ico: "🧹", name: "Panel-cleaning robot", t: 0.3, cost: 60, step: 4 },
  antenna:    { ico: "📡", name: "Tall antenna", t: 1, cost: 80, step: 5 },
  relay:      { ico: "🛰️", name: "Relay satellite (never blocked)", t: 0.5, cost: 250, step: 5 },
  hab:        { ico: "🏠", name: "Habitat module", t: 10, cost: 800, step: 6, building: true },
  medkit:     { ico: "🩺", name: "Medical kit", t: 0.1, cost: 20, step: 7 },
  patch:      { ico: "🧯", name: "Patch kit + stored oxygen", t: 0.3, cost: 40, step: 7 },
  supplies:   { ico: "📦", name: "Supply pack (30 crew-days)", t: 0.2, cost: 50, step: 7, qty: true },
  icerover:   { ico: "⛏️", name: "Ice-mining rover (heated, lights)", t: 2, cost: 300, step: 8, qty: true },
  cable:      { ico: "🔌", name: "Long power cable from the ridge", t: 1, cost: 100, step: 8 },
  waterplant: { ico: "💧", name: "Water plant (melt, clean, split)", t: 3, cost: 300, step: 9, building: true },
  greenhouse: { ico: "🌱", name: "Greenhouse with LED lights", t: 4, cost: 250, step: 10, building: true },
  printer:    { ico: "🧱", name: "Regolith 3D printer", t: 2, cost: 300, step: 11 },
  fuel:       { ico: "⛽", name: "Fuel station (tanks + liquefier)", t: 4, cost: 400, step: 12, building: true },
};

const SITES = [
  { id: "A", name: "Crater rim ridge", sun: 0.9, ice: 1, slope: 5, block: 1.0, x: 300, y: 150,
    note: "Sunlight ~90% of the time, ice only 1 km away. Hills can block Earth." },
  { id: "B", name: "Flat plain", sun: 0.55, ice: 8, slope: 2, block: 1.0, x: 165, y: 335,
    note: "Flat and easy to land on… but often dark, and ice is 8 km away." },
  { id: "C", name: "Mountain peak", sun: 0.8, ice: 4, slope: 14, block: 0.5, x: 110, y: 85,
    note: "Sunny and high (Earth easier to see), but steep and 4 km from ice." },
];

const STEPS = [
  { n: 1, ico: "🔭", title: "Scout the site", todo: "Pick a site on the map. Look at sunlight %, distance to ice and slope.",
    route: "None (free orbiter data)", sci: "NASA's Lunar Reconnaissance Orbiter (LRO) has mapped the Moon since 2009. Some crater rims get sunlight ~90% of the time, while nearby crater floors never see the Sun and can be about −240 °C.",
    twist: "A flat, easy site may be far from ice or often dark." },
  { n: 2, ico: "🤖", title: "Send robots first", todo: "Order a scout rover to map the ice, or skip it to save money.",
    route: "Economy or Standard (robots can wait)", sci: "In 2009 NASA's LCROSS crashed into Cabeus crater and found water in the debris. NASA designed the VIPER rover for exactly this kind of ice search.",
    twist: "Skipping saves money, but the crater might have little ice, and then the base must move later." },
  { n: 3, ico: "🛬", title: "Build a landing pad", todo: "Order the pad-building robot, then click the map to place the pad far from other buildings.",
    route: "Standard", sci: "In 1969 Apollo 12 landed about 180 m from the older Surveyor 3 probe, and its rocket blast sandblasted Surveyor with dust.",
    twist: "No pad means every landing sprays dust over panels and equipment." },
  { n: 4, ico: "☀️", title: "Set up power", todo: "Order solar towers (at least 2) and batteries (at least 2). Watch the power graph through the Moon's day and night.",
    route: "Economy (heavy, not urgent)", sci: "At the poles the Sun skims the horizon, so panels must stand tall and turn to follow it. NASA is developing tall rotating solar towers for this.",
    twist: "During dark gaps, too few batteries means systems shut down." },
  { n: 5, ico: "📡", title: "Set up communications", todo: "Order a tall antenna, or a relay satellite that is never blocked.",
    route: "Standard", sci: "From the south pole, Earth sits low on the horizon and hills can block it. Radio takes ~1.3 seconds to cross the 384,400 km to Earth.",
    twist: "Without comms, the Emergency panel can't call Earth." },
  { n: 6, ico: "🏠", title: "First habitat", todo: "Order the habitat, then use the robot to pile Moon soil on top (radiation shield).",
    route: "Standard or Economy", sci: "The Moon has no air and no magnetic field to block radiation. A thick layer of regolith (Moon soil) works as a shield.",
    twist: "No soil cover means crew health drops during solar storms." },
  { n: 7, ico: "👩‍🚀", title: "Crew arrives", todo: "Choose 2 to 4 astronauts. They always fly Express. Order supply packs ahead of time!",
    route: "Express only", sci: "Each person needs about 0.84 kg of oxygen, ~3.5 kg of water and ~1.8 kg of food (with packaging) every day (NASA life-support planning figures).",
    twist: "Supply bars now drain every day. Late shipments become emergencies." },
  { n: 8, ico: "⛏️", title: "Mine the ice", todo: "Order heated ice-mining rovers. Power them with a long cable from the ridge, or rely on their batteries.",
    route: "Standard", sci: "LCROSS measured about 5.6% water in the soil it hit in Cabeus crater.",
    twist: "Weak batteries or a long trip to the ice means rovers can freeze in the dark crater." },
  { n: 9, ico: "💧", title: "Process the water", todo: "Order the water plant: it melts and cleans the ice, then splits some into oxygen and hydrogen.",
    route: "Economy", sci: "Splitting 1 kg of water gives about 0.89 kg of oxygen and 0.11 kg of hydrogen.",
    twist: "Water and oxygen now refill locally, so far fewer shipments from Earth." },
  { n: 10, ico: "🌱", title: "Grow food", todo: "Order a greenhouse with LED lights.",
    route: "Standard", sci: "Plants turn the crew's breathed-out carbon dioxide back into oxygen while growing food.",
    twist: "Greenhouses need lots of power, so step 4 matters again." },
  { n: 11, ico: "🧱", title: "Build with Moon dust", todo: "Order a 3D printer that makes bricks from regolith.",
    route: "Economy", sci: "Moon soil is about 40% oxygen by weight and can be heated or printed into solid blocks.",
    twist: "Every new building now costs less: less mass from Earth means cheaper everything (the mass spiral again!)." },
  { n: 12, ico: "⛽", title: "Fuel station", todo: "Order the fuel station, store oxygen and hydrogen made from ice, then refuel a lander.",
    route: "Economy for the station (Express for the final crew launch)", sci: "Escape velocity from the Moon is about 2.4 km/s, compared with about 11.2 km/s from Earth, so launching from the Moon needs far less fuel.",
    twist: "Every later shipment gets cheaper because landers can refuel on the Moon." },
];

// ---------------- state ----------------
let S = null;
function cbNew() {
  S = {
    day: 0, speed: 1, paused: false, budget: CB_START_BUDGET, step: 1,
    site: null, iceRich: Math.random() < 0.65, iceKnown: false, scoutSkipped: false,
    have: {}, ships: [], pad: null, covered: false, covering: 0,
    crew: 0, crewNames: [], health: 100, injuries: 0,
    o2: 0, water: 0, food: 0, ice: 0, h2o2: 0,
    batt: 0, shed: [], dusty: false, sunBonus: 0, sunBonusLeft: 0,
    commsBlocked: 0, emergency: null, events: [], log: [],
    rescues: 0, sentHome: 0, done: false, lost: null, spent: 0, cableRisk: false,
    powerHist: [], pending: [],
  };
}
const has = (k) => (S.have[k] || 0) > 0;
const cnt = (k) => S.have[k] || 0;
function cbLog(t, why) { S.log.unshift({ day: Math.floor(S.day), t, why }); S.log = S.log.slice(0, 40); S.pending.push({ t, why }); }

// ---------------- light & power ----------------
function isDark(day = S.day) {
  if (!S.site) return false;
  const sun = Math.min(0.98, S.site.sun + (S.sunBonusLeft > 0 ? 0.1 : 0));
  return ((day % LUNAR_DAY) / LUNAR_DAY) > sun;
}
function commsOn() {
  if (has("relay")) return true;
  return has("antenna") && S.commsBlocked <= 0;
}
const LOADS = [   // [item, kW, priority to keep (higher = keep longer)]
  ["printer", 2, 1], ["fuel", 3, 2], ["greenhouse", 4, 3], ["waterplant", 3, 4],
  ["icerover", 2, 5], ["antenna", 0.5, 6], ["hab", 2, 9],
];
function powerNow() {
  const gen = isDark() ? 0 : cnt("solar") * 6 * (S.dusty && !has("cleanbot") ? 0.7 : 1);
  let load = 0;
  LOADS.forEach(([k, kw]) => { if (has(k) && !S.shed.includes(k)) load += kw * (k === "icerover" ? cnt(k) : 1); });
  if (has("hab")) load += S.crew * 0.5;
  return { gen, load, net: gen - load };
}
function cbPowerDay() {
  S.shed = [];
  const cap = cnt("battery") * 120;
  let p = powerNow(), energy = p.net * 24;
  if (energy >= 0) { S.batt = Math.min(cap, S.batt + energy); }
  else {
    const use = Math.min(S.batt, -energy); S.batt -= use; energy += use;
    // switch things off, least important first
    const order = LOADS.filter(([k]) => has(k)).sort((a, b) => a[2] - b[2]);
    for (const [k, kw] of order) { if (energy >= 0) break; S.shed.push(k); energy += kw * 24 * (k === "icerover" ? cnt(k) : 1); }
  }
  S.powerHist.push({ gen: p.gen, load: p.load, dark: isDark() }); if (S.powerHist.length > 60) S.powerHist.shift();
  if (S.shed.includes("hab") && S.crew > 0 && !S.emergency) cbEmergency("dark");
}

// ---------------- shipping ----------------
function itemCost(k, qty = 1) {
  const it = ITEMS[k]; let c = it.cost * qty;
  if (has("printer") && it.building) c *= 0.6;            // step 11: bricks from Moon dust
  return c;
}
function itemMass(k, qty = 1) {
  const it = ITEMS[k]; let t = it.t * qty;
  if (k === "supplies") t = qty * Math.max(2, S.crew || 3) * 30 * (RATE.o2 + RATE.water + RATE.food) / 1000;
  if (has("printer") && it.building) t *= 0.5;
  return t;
}
function shipCost(k, qty, route) {
  const fuelDiscount = S.done ? 0.6 : 1;
  return Math.round(itemCost(k, qty) + itemMass(k, qty) * ROUTES[route].perT * fuelDiscount);
}
function nextWindow(day) { let d = Math.ceil(day); while (!isWindow(d)) d++; return d; }
function cbOrder(k, qty, route) {
  const R = ROUTES[route], cost = shipCost(k, qty, route);
  if (cost > S.budget) return { ok: false, msg: "Not enough money!" };
  let depart = Math.ceil(S.day);
  if (R.windows) depart = nextWindow(S.day);
  let delay = 0;
  if (S.step >= 2 && Math.random() < 0.2) delay = 7 * (1 + Math.floor(Math.random() * 6));   // 1–6 weeks
  S.budget -= cost; S.spent += cost;
  const ship = { id: Math.random().toString(36).slice(2, 7), k, qty, route, depart, arrive: depart + R.days + delay, delay, landed: false, waiting: false };
  S.ships.push(ship);
  if (delay) cbLog(`⏳ ${ITEMS[k].name}: launch delayed ${delay / 7} week${delay > 7 ? "s" : ""}`, "Rockets wait for good weather and fix problems before flying. Ordering early keeps you on time.");
  return { ok: true, ship };
}
function cbSendCrew(names) {
  const cost = names.length * CREW_TICKET;
  if (cost > S.budget) return false;
  S.budget -= cost; S.spent += cost;
  S.ships.push({ id: "crew", k: "crew", qty: names.length, names, route: "express", depart: Math.ceil(S.day), arrive: Math.ceil(S.day) + 3, delay: 0, landed: false });
  return true;
}
function cbShipsDay() {
  S.ships.forEach((s) => {
    if (s.landed || S.day < s.arrive) return;
    if (isDark() && s.k !== "relay") { if (!s.waiting) { s.waiting = true; cbLog(`🌑 ${s.k === "crew" ? "Crew" : ITEMS[s.k].name} waits in lunar orbit for daylight`, "Landers need light to see the ground, so cargo waits in orbit until the landing site is sunny."); } return; }
    s.landed = true;
    if (s.k === "crew") {
      S.crew += s.qty; S.crewNames.push(...s.names);
      S.o2 += s.qty * 14 * RATE.o2; S.water += s.qty * 14 * RATE.water; S.food += s.qty * 14 * RATE.food;
      cbLog(`👩‍🚀 ${s.qty} astronauts landed with 14 days of supplies!`);
      return;
    }
    if (s.k === "supplies") { const cd = s.qty * 30 * Math.max(2, S.crew || 3); S.o2 += cd * RATE.o2; S.water += cd * RATE.water; S.food += cd * RATE.food; }
    else S.have[s.k] = cnt(s.k) + s.qty;
    cbLog(`📦 Landed: ${ITEMS[s.k].ico} ${ITEMS[s.k].name}${s.qty > 1 ? " ×" + s.qty : ""}`);
    if (s.k === "scout") { S.iceKnown = true; cbLog(S.iceRich ? "🧊 Scout rover: the crater is RICH in ice!" : "⚠️ Scout rover: this crater has little ice. Good thing we checked: we'll mine the next crater over.", "Rovers drive into dark craters and measure the ice before people bet a whole base on it."); if (!S.iceRich) { S.iceRich = true; } }
    if (s.k === "cable") S.cableRisk = false;
    if (s.k === "icerover" && !S.iceKnown && !S.iceRich) {     // step 2 twist: we never scouted
      S.iceRich = true; S.iceKnown = true; S.budget -= 1500; S.spent += 1500;
      cbLog("😱 Surprise: this crater has very little ice! Mining had to move to the next crater (−$1,500M).", "Without a scout rover, nobody checked the ice first. NASA sends robots like VIPER first for exactly this reason.");
    }
    // landing without a pad sprays dust
    if (s.k !== "relay" && !S.pad && S.step >= 4 && has("solar") && Math.random() < 0.3 && !S.emergency) cbEmergency("dust");
  });
}

// ---------------- life support ----------------
function cbLifeDay() {
  // local production
  const iceOn = has("icerover") && !S.shed.includes("icerover") && !S.roverStuck;
  if (iceOn) S.ice += cnt("icerover") * (S.iceRich ? 30 : 8) * (S.richBonus ? 1.6 : 1);
  if (has("waterplant") && !S.shed.includes("waterplant")) {
    const melt = Math.min(S.ice, 40); S.ice -= melt; S.water += melt * 0.9;
    const split = Math.min(S.water * 0.3, 8); S.water -= split; S.o2 += split * 0.89; S.h2o2 += split * 0.11 * 9;   // store propellant
    if (has("fuel") && !S.shed.includes("fuel")) S.h2o2 += 4;
  }
  if (has("greenhouse") && !S.shed.includes("greenhouse") && S.water > 3) { S.food += 2.5; S.o2 += 0.6; S.water -= 1; }
  if (S.crew > 0) {
    S.o2 -= S.crew * RATE.o2 * (S.leak ? 3 : 1); S.water -= S.crew * RATE.water; S.food -= S.crew * RATE.food;
    if (S.o2 <= 0 || S.water <= 0 || S.food <= 0) {
      const what = S.o2 <= 0 ? "oxygen" : S.water <= 0 ? "water" : "food";
      S.lost = `The crew ran out of ${what}, so they were sent home early on an Express ship.`;
    }
  }
  S.o2 = Math.max(0, S.o2); S.water = Math.max(0, S.water); S.food = Math.max(0, S.food);
}
const daysLeft = (k) => S.crew ? (S[k] / (S.crew * RATE[k] * (k === "o2" && S.leak ? 3 : 1))) : Infinity;

// ---------------- random events ----------------
function roll(perMonth) { return Math.random() < perMonth / 30; }
function cbEventsDay() {
  if (S.sunBonusLeft > 0) S.sunBonusLeft--;
  if (S.commsBlocked > 0) { S.commsBlocked--; if (!S.commsBlocked) cbLog("📡 Earth is back in view: comms restored."); }
  if (S.emergency) return;
  if (S.step >= 5 && has("antenna") && !has("relay") && roll(0.15 * S.site.block)) return cbEmergency("comms");
  if (S.step >= 6 && S.crew && roll(0.10)) return cbEmergency("storm");
  if (S.step >= 7 && S.crew && roll(0.10)) return cbEmergency("leak");
  if (S.step >= 7 && S.crew && roll(0.05)) return cbEmergency("medical");
  if (S.step >= 8 && has("icerover") && roll(S.cableRisk || !has("cable") ? 0.3 : 0.15) && !S.roverStuck) return cbEmergency("stuck");
  // good surprises
  if (S.step >= 8 && has("icerover") && !S.richBonus && roll(0.1)) { S.richBonus = true; cbLog("🎉 Rich ice pocket found! Water fills faster.", "Ice isn't spread evenly: some spots in dark craters hold much more."); }
  if (S.step >= 4 && S.sunBonusLeft <= 0 && roll(0.1)) { S.sunBonusLeft = 30; cbLog("☀️ Extra-sunny month: bonus power!", "The Moon's tilt and orbit change how the Sun skims the pole, so some months are sunnier."); }
  if (S.step >= 7 && S.crew && roll(0.1)) { S.budget += 400; cbLog("🔬 Science discovery! Earth sends a $400M bonus.", "Big discoveries make the public and governments excited to fund more Moon work."); }
}

// ---------------- emergencies ----------------
const EMERGENCIES = {
  storm:   { ico: "☢️", title: "Solar storm!", why: "The Sun just threw out a burst of radiation, with very little warning.", deadline: 2, fix: "Hide the crew in the soil-covered habitat." },
  leak:    { ico: "💨", title: "Oxygen leak!", why: "A tiny meteorite or a worn seal made a hole. Oxygen is escaping 3× faster.", deadline: 4, fix: "Use the patch kit and stored oxygen." },
  dark:    { ico: "🌑", title: "Long dark gap: power failing!", why: "The ridge fell into shadow and the batteries ran out. The habitat is losing power.", deadline: 3, fix: "More batteries (or spare ones) carry the base through the dark." },
  dust:    { ico: "🌪️", title: "Dusty solar panels!", why: "A landing without a pad sprayed Moon dust onto the panels: −30% power.", deadline: 10, fix: "A cleaning robot (or a landing pad from the start)." },
  stuck:   { ico: "🧊", title: "Rover stuck in the dark crater!", why: "An ice rover got stuck at −240 °C and its battery is draining.", deadline: 4, fix: "A long power cable from the ridge keeps rovers warm." },
  medical: { ico: "🩹", title: "Medical problem!", why: "A crew member got hurt while working.", deadline: 3, fix: "A medical kit on the base." },
  comms:   { ico: "📵", title: "Comms blackout!", why: "From the south pole Earth sits low, and the hills now block it.", deadline: 7, fix: "A relay satellite is never blocked." },
};
function cbEmergency(type) {
  const E = EMERGENCIES[type];
  S.emergency = { type, ...E, left: E.deadline, rescue: 0, handled: false };
  if (type === "leak") S.leak = true;
  if (type === "dust") S.dusty = true;
  if (type === "stuck") S.roverStuck = true;
  if (type === "comms") S.commsBlocked = 7;
  if (type === "medical") S.injuries++;
}
// which responses are possible right now
function cbOptions() {
  const e = S.emergency; if (!e) return [];
  const t = e.type, comms = commsOn();
  const local = { storm: S.covered, leak: has("patch"), dark: cnt("battery") >= 4, dust: has("cleanbot"), stuck: has("cable"), medical: has("medkit"), comms: false }[t];
  return [
    { id: "call", ico: "📞", name: "Call Earth for advice", note: "Free · radio takes ~1.3 s each way", ok: comms && t !== "comms" },
    { id: "local", ico: "🧰", name: "Use local reserves", note: { storm: "Needs the soil-covered habitat", leak: "Needs a patch kit", dark: "Needs 4+ batteries", dust: "Needs a cleaning robot", stuck: "Needs the long power cable", medical: "Needs a medical kit", comms: "No local fix" }[t], ok: local },
    { id: "shelter", ico: "🏠", name: "Shelter the crew", note: S.covered ? "Habitat is soil-covered" : "Habitat has NO soil cover", ok: has("hab") && S.crew > 0 && (t === "storm" || t === "dark") },
    { id: "express", ico: "⚡", name: `Express rescue shipment ($${RESCUE_COST}M)`, note: "Arrives in 3 days", ok: comms && S.budget >= RESCUE_COST && t !== "comms" },
    { id: "home", ico: "🏠", name: "Send crew home", note: "3-day trip · big score penalty", ok: S.crew > 0 },
  ];
}
function cbRespond(id) {
  const e = S.emergency, t = e.type; let msg = "";
  if (id === "call") {
    e.called = true;
    msg = `Houston: "${e.fix}"`;
    if (t === "leak") { e.left += 2; msg += " They talk you through a temporary patch (+2 days)."; }
    if (t === "medical") { e.left += 2; msg += " A doctor on Earth guides the treatment (+2 days)."; }
    if (t === "stuck") { e.left += 1; msg += " They suggest switching off heaters to save battery (+1 day)."; }
    return msg;
  }
  if (id === "local" || (id === "shelter" && t === "storm" && S.covered)) {
    cbResolve(true); return "✅ Fixed with what we built on the Moon. That's why self-sufficiency matters!";
  }
  if (id === "shelter") {
    if (t === "storm") { S.health -= 15; S.injuries++; cbResolve(true); return "The crew sheltered, but with no soil cover they still got a radiation dose (health −15)."; }
    if (t === "dark") { e.left += 2; return "Crew huddles in the habitat with everything else switched off (+2 days)."; }
  }
  if (id === "express") { S.budget -= RESCUE_COST; S.spent += RESCUE_COST; S.rescues++; e.rescue = 3; return "⚡ Express rescue launched: it will arrive in 3 days. Hold on!"; }
  if (id === "home") { cbCrewHome("The crew flew home safely on an Express ship."); return "The crew is heading home. Send a new crew when the base is ready."; }
  return msg;
}
function cbResolve(good) {
  const t = S.emergency.type;
  if (t === "leak") S.leak = false;
  if (t === "dust") S.dusty = false;
  if (t === "stuck") S.roverStuck = false;
  if (t === "comms") S.commsBlocked = 0;
  if (t === "dark" && good) S.batt = Math.max(S.batt, 120);
  S.emergency = null;
}
function cbCrewHome(why) { S.sentHome++; S.crew = 0; S.crewNames = []; S.leak = false; cbLog("🏠 " + why); if (S.emergency) S.emergency = null; }
function cbEmergencyDay() {
  const e = S.emergency; if (!e) return;
  if (e.rescue > 0) { e.rescue--; if (!e.rescue) { cbLog("⚡ Express rescue arrived!"); if (e.type === "dark") S.have.battery = cnt("battery") + 2; if (e.type === "leak") S.have.patch = 1; if (e.type === "medical") S.have.medkit = 1; if (e.type === "dust") S.have.cleanbot = 1; if (e.type === "stuck") S.have.cable = 1; cbResolve(true); } return; }
  e.left--;
  if (e.left > 0) return;
  // deadline passed without a fix
  const t = e.type;
  if (t === "storm") { S.health -= S.covered ? 0 : 35; if (!S.covered) S.injuries++; cbLog("☢️ The storm passed." + (S.covered ? " The soil cover protected the crew." : " Crew health dropped."), "Moon soil on the roof blocks radiation, like a thick blanket."); }
  if (t === "leak") { cbCrewHome("Oxygen ran too low: the crew was sent home early."); }
  if (t === "dark") { if (S.crew) cbCrewHome("The habitat got too cold without power: the crew was sent home."); }
  if (t === "stuck") { S.have.icerover = Math.max(0, cnt("icerover") - 1); cbLog("🧊 The rover froze and was lost. Order a new one.", "At −240 °C, a rover with an empty battery can't keep its parts warm."); }
  if (t === "medical") { S.crew = Math.max(0, S.crew - 1); S.crewNames.pop(); cbLog("🩹 The injured astronaut flew home on Express."); }
  if (t === "comms") cbLog("📡 Earth rose above the hills again.");
  if (t === "dust") cbLog("🌪️ The panels stay dusty: power −30% until cleaned.");
  cbResolve(false);
  if (S.health < 30 && S.crew) cbCrewHome("Too much radiation: the crew was sent home to recover.");
}

// ---------------- steps ----------------
function cbStepDone() {
  const n = S.step;
  return n === 1 ? !!S.site
    : n === 2 ? (has("scout") || S.scoutSkipped)
    : n === 3 ? !!S.pad
    : n === 4 ? cnt("solar") >= 2 && cnt("battery") >= 2
    : n === 5 ? (has("antenna") || has("relay"))
    : n === 6 ? has("hab")
    : n === 7 ? S.crew >= 2
    : n === 8 ? has("icerover")
    : n === 9 ? has("waterplant")
    : n === 10 ? has("greenhouse")
    : n === 11 ? has("printer")
    : n === 12 ? S.refueled : false;
}
function cbAdvance() {
  if (S.step <= 12 && cbStepDone()) {
    if (S.step === 12) { S.done = true; return "win"; }
    S.step++; return "next";
  }
  return null;
}
// one game day
function cbDay() {
  if (S.done || S.lost) return;
  S.day += 1;
  if (S.covering > 0) { S.covering--; if (!S.covering) { S.covered = true; cbLog("🛡️ The habitat is now covered with Moon soil: radiation shield ready!"); } }
  cbShipsDay(); cbPowerDay(); cbLifeDay(); cbEventsDay(); cbEmergencyDay();
  if (S.budget <= 0 || (S.budget < 60 && !S.ships.some((x) => !x.landed))) S.lost = "The money ran out before the fuel station was ready.";
  return cbAdvance();
}

// step 12: refuel a lander with Moon-made oxygen + hydrogen
function cbRefuel() {
  if (!has("fuel") || S.h2o2 < 100) return false;
  S.h2o2 -= 100; S.refueled = true; return true;
}
function cbScore() {
  const stars = 1 + (S.budget >= 3000 ? 1 : 0) + (S.injuries === 0 && S.rescues <= 1 && S.sentHome === 0 ? 1 : 0);
  return { stars, days: Math.floor(S.day), budget: S.budget, spent: S.spent, injuries: S.injuries, rescues: S.rescues, sentHome: S.sentHome };
}
