// =====================================================================
// launchday.js: LAUNCH DAY Go / No-Go panel (like real Mission Control)
//   Pick a day (real calendar from today) + a time, and a landing site.
//   Controllers check: 1 launch window · 2 sunlight at the landing site · 3 weather
//   (4th check, the Moon aim, happens later at the TLI burn, where real aiming is done)
//   LAUNCH works even on NO GO: the player learns from what goes wrong.
// =====================================================================

// Moon phase from a known new moon (Jan 6 2000, 18:14 UTC) and the 29.53-day cycle
function moonPhaseAngle(date) {
  const ref = Date.UTC(2000, 0, 6, 18, 14), P = 29.530589;
  const days = (date - ref) / 86400000;
  return ((((days % P) + P) % P) / P) * 360;              // 0 = new, 90 = first quarter, 180 = full
}
const PHASE_EMOJI = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
const phaseEmoji = (a) => PHASE_EMOJI[Math.round(a / 45) % 8];

// landing sites (selenographic longitude, + = east). The south pole ridge skips the math.
const SITES_LD = [
  { id: "a11", name: "Apollo 11 · Sea of Tranquility", lon: 23.47 },
  { id: "a12", name: "Apollo 12 · Ocean of Storms", lon: -23.42 },
  { id: "a15", name: "Apollo 15 · Hadley Rille", lon: 3.63 },
  { id: "pole", name: "South pole ridge (Artemis)", lon: null },
];
const WIN_LEN = 120;                                       // each daily window: 2 hours
const windowStart = (d) => (8 * 60 + d * 50) % 1440;       // opens ~50 min later every day
const fmtT = (m) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String(Math.round(((m % 60) + 60) % 60)).padStart(2, "0")}`;
function seeded(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

let LD = null;
function ldDate(d) { return new Date(LD.today.getTime() + d * 86400000); }
function ldLaunchTime() { return new Date(ldDate(LD.day).getTime() + LD.time * 60000); }

// ---- the three checks ----
function checkWindow() {
  const s = windowStart(LD.day), t = LD.time;
  let off = 0;                                             // minutes outside the window (wraps past midnight)
  const inWin = (t - s + 1440) % 1440 < WIN_LEN;
  if (!inWin) off = Math.min((s - t + 1440) % 1440, (t - (s + WIN_LEN) + 1440) % 1440);
  const st = inWin ? "go" : off <= 30 ? "caution" : "nogo";
  return { st, off, s,
    msg: st === "go" ? `Inside today's window (${fmtT(s)}–${fmtT(s + WIN_LEN)}). The rocket points straight at the Moon's path.`
      : st === "caution" ? `${Math.round(off)} min outside the window. We'll have to steer a little: about 10% extra fuel.`
      : `Way outside the window (${fmtT(s)}–${fmtT(s + WIN_LEN)}). The rocket would have to turn sideways in space: a LOT of fuel!` };
}
function sunAt(date, site) {
  if (site.lon === null) return null;
  const subSolarLon = 180 - moonPhaseAngle(date);           // where the Sun is straight overhead
  const diff = Math.abs((((site.lon - subSolarLon + 540) % 360) + 360) % 360 - 180);
  return 90 - diff;                                          // Sun height above the horizon (degrees)
}
function checkSun() {
  if (state.goal !== "land") return { st: "skip", msg: "We're not landing on this mission, so the Sun angle doesn't matter." };
  const site = byId(SITES_LD, LD.site);
  if (site.lon === null) return { st: "go", elev: 4, msg: "At the pole the Sun skims the horizon all month. Our ridge gets sunlight about 80% of the time." };
  const arrive = new Date(ldLaunchTime().getTime() + 3 * 86400000);
  const e = sunAt(arrive, site);
  const st = e < 0 ? "nogo" : e >= 5 && e <= 20 ? "go" : "caution";
  const msg = e < 0 ? `On landing day it's NIGHT there (Sun ${Math.round(e)}°). Pitch black and −170 °C!`
    : e < 5 ? `Sun only ${e.toFixed(0)}° high: the whole site is hidden in long dark shadows.`
    : e <= 20 ? `Sun ${e.toFixed(0)}° high: early morning. Long shadows show every rock and crater. Perfect! (Apollo 11: about 11°)`
    : e <= 45 ? `Sun ${e.toFixed(0)}° high: short shadows hide the boulders. Harder to land safely.`
    : `Sun ${e.toFixed(0)}° high: midday glare, everything looks flat, and it's very hot (+120 °C).`;
  return { st, elev: e, msg };
}
function weatherOf(d) {
  const dt = ldDate(d), n = dt.getFullYear() * 400 + dt.getMonth() * 31 + dt.getDate();
  const chance = Math.round(40 + seeded(n) * 58);            // same day → same forecast, every time
  return { chance, ico: chance >= 80 ? "☀️" : chance >= 60 ? "⛅" : "⛈️" };
}
function checkWeather() {
  const w = weatherOf(LD.day);
  const st = w.chance >= 80 ? "go" : w.chance >= 60 ? "caution" : "nogo";
  return { st, chance: w.chance, msg: st === "go" ? `${w.chance}% chance of good weather. Clear skies!`
    : st === "caution" ? `${w.chance}% chance of GO. Clouds around: we might have to scrub.`
    : `Only ${w.chance}% chance. Thunderstorms! Lightning + rockets = bad idea.` };
}

// ---- screen ----
function screenLaunchDay() {
  sfx.click();
  const t = new Date(); t.setHours(0, 0, 0, 0);
  LD = LD && LD.goal === state.goal ? LD : { today: t, day: 0, time: 12 * 60, site: "a11", scrubs: 0, goal: state.goal };
  LD.today = t;
  $("app").innerHTML = `<div class="ld">
    <h2>📅 Launch Day: GO or NO GO?</h2>
    <p class="sub">Pick a <b>day</b> and a <b>time</b>. Three flight controllers check your choice. Try to get <b style="color:var(--good)">three green lights</b>!</p>
    <div class="ldgrid">
      <div class="ldcol">
        <div class="ldcard"><h3>1️⃣ Pick a day <small>(the next 30 days, real Moon phases)</small></h3><div id="ldCal" class="ldcal"></div></div>
        <div class="ldcard"><h3>2️⃣ Pick a launch time: <b id="ldTime"></b></h3>
          <div class="ldslider"><div id="ldBand" class="ldband"></div><input id="ldRange" type="range" min="0" max="1439" step="5"></div>
          <div class="ldticks"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div></div>
        ${state.goal === "land" ? `<div class="ldcard"><h3>3️⃣ Where will we land?</h3><div id="ldSites" class="ldsites"></div><div id="ldSunPic"></div></div>` : ""}
      </div>
      <div class="ldcol">
        <div class="ldcard"><h3>🎧 Flight controllers: GO / NO GO?</h3><div id="ldChecks"></div></div>
        <div class="actions" style="margin-top:6px">
          <button class="btn ghost" onclick="ldHint()">💡 Find me a good slot</button>
          <button class="btn go big" id="ldGo" onclick="ldLaunch()">🚀 LAUNCH</button></div>
        <div class="actions"><button class="btn ghost" onclick="${state.goal === "flyby" ? "screenAssemble()" : "screenPath()"}">← Back</button></div>
      </div>
    </div></div>`;
  const r = $("ldRange"); r.value = LD.time; r.oninput = () => { LD.time = +r.value; ldRender(); };
  ldRender();
  say("thrust", "Real Moon rockets can't launch any time they like! The Moon has to be in the right place, the landing site needs morning sunshine, and the weather must be good. 🌤️", 0);
}
function ldPick(d) { LD.day = d; sfx.click(); ldRender(); }
function ldSite(id) { LD.site = id; sfx.click(); ldRender(); }
const LIGHT = { go: ["🟢", "GO"], caution: ["🟡", "CAUTION"], nogo: ["🔴", "NO GO"], skip: ["⚪", "N/A"], later: ["⏳", "LATER"] };
function ldRender() {
  // calendar: date, Moon phase, weather icon
  $("ldCal").innerHTML = Array.from({ length: 30 }, (_, d) => {
    const dt = ldDate(d), w = weatherOf(d), ph = moonPhaseAngle(new Date(dt.getTime() + 12 * 3600000));
    return `<button class="ldday ${d === LD.day ? "on" : ""}" onclick="ldPick(${d})"><small>${dt.toLocaleDateString(undefined, { month: "short" })}</small><b>${dt.getDate()}</b><span>${phaseEmoji(ph)}${w.ico}</span></button>`;
  }).join("");
  // time slider with today's window shaded green (and the yellow 30-min margin)
  const s = windowStart(LD.day), pct = (m) => (((m % 1440) + 1440) % 1440) / 1440 * 100;
  const seg = (a, b, col) => b > a ? `${col} ${pct(a)}%, ${col} ${pct(b)}%` : "";
  const band = [];
  const add = (a, len, col) => { const a1 = ((a % 1440) + 1440) % 1440, b1 = a1 + len; if (b1 <= 1440) band.push([a1, b1, col]); else { band.push([a1, 1440, col], [0, b1 - 1440, col]); } };
  add(s - 30, 30, "#ffb54788"); add(s + WIN_LEN, 30, "#ffb54788"); add(s, WIN_LEN, "#3ecf8e");
  band.sort((p, q) => p[0] - q[0]);
  let stops = [], cur = 0;
  band.forEach(([a, b, col]) => { if (a > cur) stops.push(seg(cur, a, "transparent")); stops.push(seg(a, b, col)); cur = Math.max(cur, b); });
  if (cur < 1440) stops.push(seg(cur, 1440, "transparent"));
  $("ldBand").style.background = `linear-gradient(90deg, ${stops.filter(Boolean).join(", ")})`;
  $("ldTime").textContent = `${fmtT(LD.time)} (window ${fmtT(s)}–${fmtT(s + WIN_LEN)})`;
  // landing sites + Sun picture
  const cs = checkSun();
  if ($("ldSites")) {
    $("ldSites").innerHTML = SITES_LD.map((x) => `<button class="btn ${x.id === LD.site ? "" : "ghost"}" onclick="ldSite('${x.id}')">${x.name}</button>`).join("");
    $("ldSunPic").innerHTML = sunPicture(cs.elev);
  }
  // checks
  const C = [
    ["🕐", "Launch window", "Trajectory officer", checkWindow(), "The launch pad spins with the Earth. Only for a short time each day does it point the right way toward the Moon's path. The Moon also moves along its orbit, so the window opens about 50 minutes later each day."],
    ["☀️", "Sunlight at the landing site", "Surface officer", cs, "A day on the Moon lasts about 29.5 Earth days, so the Sun climbs only ~12° per Earth day. Apollo landed in the early morning, when long shadows make rocks and craters easy to see and it isn't too hot yet."],
    ["⛈️", "Weather at the launch pad", "Weather officer", checkWeather(), "Rockets can't fly into thunderstorms or strong winds. Apollo 12 launched in rain and was hit by lightning twice! The crew was fine, but NASA's weather rules got stricter after that."],
    ["🎯", "Moon aim", "Flight dynamics", { st: "later", msg: "Checked later, at the TLI burn: we aim about 40° ahead of the Moon, because it moves while we fly." }, "The Moon moves about 13.2° along its orbit every day. The trip takes 3 days, so we aim at where the Moon WILL be, not where it is now."],
  ];
  $("ldChecks").innerHTML = C.map(([ico, nm, who, c, why], i) => `<details class="ldrow ${c.st}">
      <summary><span class="lt">${LIGHT[c.st][0]}</span><span class="nm">${ico} ${nm}<small>${who}</small></span><b class="go-${c.st}">${LIGHT[c.st][1]}</b></summary>
      <p>${c.msg}</p><p class="why">❓ <b>Why?</b> ${why}</p></details>`).join("");
  const sts = C.slice(0, 3).map((x) => x[3].st);
  const bad = sts.includes("nogo"), warn = sts.includes("caution");
  $("ldGo").textContent = bad ? "🚀 LAUNCH anyway (NO GO!)" : warn ? "🚀 LAUNCH (with cautions)" : "🚀 ALL GO: LAUNCH!";
  $("ldGo").className = `btn big ${bad ? "" : "go"}`; $("ldGo").style.background = bad ? "var(--bad)" : warn ? "var(--warn)" : "";
  LD.checks = { window: C[0][3], sun: C[1][3], wx: C[2][3] };
}
// a little side view of the landing site: Sun height and the shadow it makes
function sunPicture(e) {
  if (e === undefined) return "";
  const night = e < 0, el = Math.max(-5, Math.min(70, e)), rad = (el * Math.PI) / 180;
  const sx = 40 + Math.cos(rad) * 0 + (1 - Math.min(1, Math.max(0, el) / 70)) * 0, sy = 100 - Math.sin(Math.max(0.02, rad)) * 80;
  const shadow = night ? 0 : Math.min(160, 18 / Math.tan(Math.max(0.05, rad)));
  return `<svg viewBox="0 0 300 120" width="100%" height="110" style="border-radius:10px;background:${night ? "#03050d" : "#0b1020"}">
    ${night ? `<text x="150" y="50" fill="#9aa5cc" font-size="13" text-anchor="middle">🌑 Night on the Moon: −170 °C</text>` : `<circle cx="${sx}" cy="${sy}" r="9" fill="#ffd27a"/><line x1="${sx}" y1="${sy}" x2="110" y2="${100 - 18}" stroke="#ffd27a55" stroke-dasharray="3 3"/>`}
    <rect x="0" y="100" width="300" height="20" fill="${night ? "#2a2d35" : "#a3a8b3"}"/>
    ${night ? "" : `<polygon points="118,100 ${118 + shadow},100 118,96" fill="#00000088"/>`}
    <ellipse cx="110" cy="96" rx="10" ry="9" fill="${night ? "#3a3d44" : "#6f7480"}"/>
    <text x="290" y="16" fill="#fff" font-size="12" text-anchor="end">${night ? "" : `Sun ${Math.round(e)}° high · shadow ${shadow > 60 ? "long ✅" : shadow > 25 ? "short" : "tiny"}`}</text></svg>`;
}
function ldHint() {
  // score every day (at the middle of its window): GO = 2, CAUTION = 1, NO GO = 0; the sunlight counts double
  const sc = { go: 2, skip: 2, caution: 1, nogo: 0 }, save = [LD.day, LD.time];
  let best = null;
  for (let d = 0; d < 30; d++) {
    LD.day = d; LD.time = (windowStart(d) + 60) % 1440;
    const s = sc[checkWindow().st] + 2 * sc[checkSun().st] + sc[checkWeather().st];
    if (!best || s > best.s) best = { d, t: LD.time, s };
  }
  [LD.day, LD.time] = [best.d, best.t]; $("ldRange").value = LD.time; ldRender();
  const all = ["go", "skip"].includes(checkSun().st) && checkWeather().st === "go";
  sfx.chime();
  say("crater", all ? `${ldDate(best.d).toLocaleDateString(undefined, { day: "numeric", month: "short" })} works! See the Moon phase? A thin crescent means it's early morning at the Apollo sites when we arrive. 🌒`
    : `Best slot this month: ${ldDate(best.d).toLocaleDateString(undefined, { day: "numeric", month: "short" })}. Not perfect, so check the yellow lights. Real missions also had to accept some risks! ⚠️`, 9000);
  void save;
}
function ldLaunch() {
  const c = LD.checks; if (!c) return;
  // weather is a dice roll on the day
  if (Math.random() * 100 > c.wx.chance) {
    LD.scrubs++; sfx.fail(); sfx.say("Launch scrubbed due to weather.", { interrupt: true });
    $("modalBox").innerHTML = `<div class="ico">⛈️</div><h2>SCRUB! Weather NO GO</h2>
      <p class="sub">Storm clouds rolled in (only ${c.wx.chance}% chance of GO). The launch moves to the <b>next day</b>, and the window and sunlight change, so check them again!</p>
      <p class="sub" style="text-align:left">⚡ <b>Fun fact:</b> Apollo 12 launched in rain and was struck by lightning <b>twice</b> (36 and 52 seconds after liftoff). The crew was fine, but NASA's weather rules got much stricter after that.</p>
      <div class="choices"><button class="btn go" onclick="closeModal();ldPick(Math.min(29, LD.day + 1))">📅 OK, next day</button></div>`;
    $("modal").classList.remove("hidden"); return;
  }
  const fuelLoss = c.window.st === "caution" ? 6 : c.window.st === "nogo" ? 22 : 0;
  state.launchDay = { window: c.window.st, sun: c.sun.st, sunElev: c.sun.elev, site: LD.site, wx: c.wx.st, scrubs: LD.scrubs, fuelLoss,
    date: ldLaunchTime().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }), allGo: [c.window.st, c.sun.st, c.wx.st].every((s) => s === "go" || s === "skip") };
  LD.scrubs = 0;
  screenFlight();
}
// after reaching parking orbit: tell the player what a bad launch time did
function ldParkingNote(f) {
  const ld = state.launchDay; if (!ld || f.ldTold || f.pt < 0.8) return; f.ldTold = true;
  if (ld.window === "nogo") {
    sfx.alarm();
    $("modalBox").innerHTML = `<div class="ico">⛽</div><h2>We launched outside the window!</h2>
      <p class="sub">Our orbit isn't lined up with the Moon's path. The rocket had to turn <b>sideways</b> in space to fix it. Changing direction costs a LOT of fuel, so we'll have much less fuel to brake at the Moon.</p>
      <div class="choices"><button class="btn go" onclick="closeModal()">😬 Got it, keep going</button></div>`;
    $("modal").classList.remove("hidden");
  } else if (ld.window === "caution") label("⛽ A bit late: steering cost about 10% extra fuel", 140);
}
