/* =========================================================
   MOON COLONY BUILDER — VIEW (screens, map drawing, panels)
   Reads the state S from cb-logic.js and calls its functions.
   ========================================================= */
const MW = 640, MH = 420;
let cbv = null;      // view-only state (animations, modes)

function screenColonyBuilder() {
  sfx.warm && sfx.warm(); sfx.click(); hush();
  cbNew();
  cbv = { last: performance.now(), acc: 0, scale: 1, landers: [], seen: new Set(), placePad: false, t: 0, orbitT: 0, toasts: [] };
  $("hud").classList.add("hidden");
  $("app").innerHTML = `<div id="flightView" class="fview cbv">
    <div class="cbtop"><div id="cbTop" class="cbchips"></div><div class="cbspeed" id="cbSpeed"></div></div>
    <div class="cbmain">
      <div class="fstage" id="cbStage"><canvas id="cbMap"></canvas><div id="cbToasts" class="cbtoasts"></div></div>
      <div class="cbside" id="cbSide"></div>
    </div>
    <button id="cbEmerg" class="emerg" onclick="openEmergency()">🚨 EMERGENCY</button>
  </div>`;
  document.body.classList.add("flying");
  try { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch?.(() => {}); } catch (e) {}
  cbFit(); $("cbMap").addEventListener("click", cbMapClick);
  cbRenderTop(); cbRenderSide();
  requestAnimationFrame(cbTick);
  say("thrust", "Let's build a Moon base at the south pole, step by step. Everything from Earth is slow and expensive, so make the base look after itself as fast as possible! 🏗️", 0);
}
function cbFit() {
  const st = $("cbStage"), cv = $("cbMap"); if (!st || !cv || !cbv) return;
  const s = Math.min((st.clientWidth - 8) / MW, (st.clientHeight - 8) / MH), dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(MW * s * dpr); cv.height = Math.round(MH * s * dpr);
  cv.style.width = Math.round(MW * s) + "px"; cv.style.height = Math.round(MH * s) + "px"; cbv.scale = s * dpr;
}
window.addEventListener("resize", cbFit);

// ---------------- top resource bar ----------------
function chip(ico, label, val, cls = "") { return `<div class="cbchip ${cls}"><span>${ico} ${label}</span><b>${val}</b></div>`; }
function cbRenderTop() {
  if (!S || !$("cbTop")) return;
  const p = powerNow(), cap = cnt("battery") * 120, dl = (k) => S.crew ? Math.floor(daysLeft(k)) + " d" : "—";
  const warn = (k) => S.crew && daysLeft(k) < 7 ? "bad" : "";
  $("cbTop").innerHTML =
    chip("💰", "Budget", money(S.budget), S.budget < 1500 ? "bad" : "") +
    chip("⚡", "Power", `${p.net >= 0 ? "+" : ""}${p.net.toFixed(1)} kW${cap ? ` · 🔋${Math.round(S.batt / cap * 100)}%` : ""}`, p.net < 0 ? "warn" : "") +
    chip("🫁", "Oxygen", dl("o2"), warn("o2")) + chip("💧", "Water", dl("water"), warn("water")) + chip("🍲", "Food", dl("food"), warn("food")) +
    chip("📡", "Comms", commsOn() ? "ON" : "OFF", commsOn() ? "" : "warn") +
    chip("👩‍🚀", "Crew", S.crew ? `${S.crew} · ${Math.max(0, S.health)}%` : "none", S.health < 60 ? "bad" : "") +
    chip(isDark() ? "🌑" : "☀️", "Day", Math.floor(S.day));
  const sp = [["⏸", 0], ["1×", 1], ["5×", 5], ["20×", 20]].map(([t, v]) => `<button class="${(S.paused ? 0 : S.speed) === v ? "on" : ""}" onclick="cbSpeed(${v})">${t}</button>`).join("");
  if ($("cbSpeed").innerHTML !== sp) $("cbSpeed").innerHTML = sp;
  $("cbEmerg").classList.toggle("blink", !!S.emergency);
}
function cbSpeed(v) { sfx.click(); if (v === 0) S.paused = true; else { S.paused = false; S.speed = v; } cbRenderTop(); }

// ---------------- side panel: current step + shipments ----------------
function cbRenderSide() {
  if (!S || !$("cbSide")) return;
  const st = STEPS[Math.min(11, S.step - 1)];
  const A = [];
  const order = (k, label) => A.push(`<button class="btn go" onclick="openShipping('${k}')">${label || "📦 Order " + ITEMS[k].ico + " " + ITEMS[k].name}</button>`);
  if (S.step === 1) A.push(`<p class="sub">👆 Tap one of the three sites (A, B, C) on the map.</p>`);
  if (S.step === 2) { order("scout"); A.push(`<button class="btn ghost" onclick="cbSkipScout()">⏭ Skip the scout (save money)</button>`); }
  if (S.step === 3) { if (!has("padbot")) order("padbot"); else A.push(`<button class="btn go" onclick="cbStartPad()">🛬 Place the landing pad on the map</button>`); }
  if (S.step === 4) { order("solar", "📦 Order ☀️ solar towers"); order("battery", "📦 Order 🔋 batteries"); }
  if (S.step === 5) { order("antenna"); order("relay"); }
  if (S.step === 6) order("hab");
  if (has("hab") && !S.covered && !S.covering && S.step >= 6) A.push(`<button class="btn" onclick="cbCover()">🛡️ Pile Moon soil on the habitat (10 days)</button>`);
  if (S.step === 7) { A.push(`<button class="btn go" onclick="openCrew()">👩‍🚀 Choose & send the crew (Express)</button>`); }
  if (S.step >= 7) A.push(`<button class="btn ghost" onclick="openShipping('supplies')">📦 Order supplies / kits</button>`);
  if (S.step === 8) { order("icerover"); if (!has("cable")) order("cable"); }
  if (S.step === 9) order("waterplant");
  if (S.step === 10) order("greenhouse");
  if (S.step === 11) order("printer");
  if (S.step === 12) {
    if (!has("fuel")) order("fuel");
    else A.push(`<div class="fuelbar"><span>⛽ Moon-made fuel: ${Math.floor(S.h2o2)} / 100</span><div><i style="width:${Math.min(100, S.h2o2)}%"></i></div></div>
      <button class="btn go" ${S.h2o2 >= 100 ? "" : "disabled"} onclick="cbDoRefuel()">⛽ Refuel a lander with Moon fuel!</button>`);
  }
  if (S.step >= 2) A.push(`<button class="btn ghost" onclick="openShipping()">🚚 Open the shipping screen</button>`);
  const ships = S.ships.filter((x) => !x.landed);
  if (!$("cbStepBox")) $("cbSide").innerHTML = `<div id="cbStepBox"></div><div id="cbShipBox"></div>`;
  const stepHTML = `
    <div class="steps">${STEPS.map((s) => `<span class="${s.n < S.step ? "done" : s.n === S.step ? "now" : ""}" title="${s.title}">${s.n < S.step ? "✓" : s.n}</span>`).join("")}</div>
    <div class="stepcard">
      <div class="stepn">STEP ${S.step} OF 12</div><h3>${st.ico} ${st.title}</h3>
      <p>${st.todo}</p>
      <p class="route">🚚 Best route: <b>${st.route}</b></p>
      <details><summary>🔬 Real science</summary><p>${st.sci}</p></details>
      <details><summary>⚠️ The twist</summary><p>${st.twist}</p></details>
      <div class="acts">${A.join("")}</div>
    </div>`;
  const shipHTML = `
    <div class="shiplist"><h4>🚀 On the way (${ships.length})</h4>
      ${ships.length ? ships.map((x) => {
        const name = x.k === "crew" ? `👩‍🚀 ${x.qty} astronauts` : `${ITEMS[x.k].ico} ${ITEMS[x.k].name}${x.qty > 1 ? " ×" + x.qty : ""}`;
        const st2 = S.day < x.depart ? `🗓️ launches day ${x.depart}` : x.waiting ? "🌑 waiting in orbit for daylight" : `${ROUTES[x.route].ico} lands in ${Math.max(0, Math.ceil(x.arrive - S.day))} d${x.delay ? " (delayed)" : ""}`;
        return `<div class="ship"><span>${name}</span><small>${st2}</small></div>`; }).join("") : `<p class="sub">Nothing in flight.</p>`}
    </div>`;
  if (cbv.stepHTML !== stepHTML) { cbv.stepHTML = stepHTML; $("cbStepBox").innerHTML = stepHTML; }
  if (cbv.shipHTML !== shipHTML) { cbv.shipHTML = shipHTML; $("cbShipBox").innerHTML = shipHTML; }
}

// ---------------- map ----------------
const CRATER = { x: 470, y: 290, rx: 165, ry: 100 };
function sitePos() { return S.site ? [S.site.x, S.site.y] : [0, 0]; }
function cbDrawMap(ctx, dt) {
  const dark = isDark(), [sx, sy] = sitePos();
  // ground + sunny ridge + dark crater
  ctx.fillStyle = "#8d929c"; ctx.fillRect(0, 0, MW, MH);
  for (let i = 0; i < 140; i++) { ctx.fillStyle = i % 3 ? "#858a94" : "#9aa0aa"; ctx.fillRect((i * 131) % MW, (i * 67) % MH, 3, 3); }
  ctx.fillStyle = "#c9ccd2"; ctx.beginPath(); ctx.moveTo(20, 40); ctx.lineTo(360, 30); ctx.lineTo(380, 190); ctx.lineTo(20, 200); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#6f7480"; ctx.beginPath(); ctx.moveTo(30, 230); ctx.lineTo(120, 210); ctx.lineTo(90, 260); ctx.closePath(); ctx.fill();   // hills
  ctx.fillStyle = "#23283a"; ctx.beginPath(); ctx.ellipse(CRATER.x, CRATER.y, CRATER.rx, CRATER.ry, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#596075"; ctx.lineWidth = 4; ctx.stroke(); ctx.lineWidth = 1;
  if (S.iceKnown || S.step >= 8) { ctx.fillStyle = "#bfe3ff"; for (let i = 0; i < 40; i++) { const a = i * 2.39, r = (i % 9) * 17; ctx.fillRect(CRATER.x + Math.cos(a) * r * 1.5, CRATER.y + Math.sin(a) * r * 0.85, 3, 3); } }
  else { ctx.font = "bold 28px system-ui"; ctx.fillStyle = "#596075"; ctx.textAlign = "center"; ctx.fillText("?", CRATER.x, CRATER.y + 10); }
  ctx.font = "bold 11px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#ffe9a8"; ctx.fillText("☀️ SUNNY RIDGE", 28, 58);
  ctx.fillStyle = "#bfe3ff"; ctx.fillText("🧊 DARK CRATER (−240 °C, ice)", CRATER.x - 90, CRATER.y - CRATER.ry - 8);
  // the Sun skims the horizon, moving around through the Moon's 29.5-day cycle
  const ph = (S.day % LUNAR_DAY) / LUNAR_DAY, sunX = 20 + ph * (MW - 40);
  ctx.fillStyle = dark ? "#55556655" : "#fff4c2"; ctx.beginPath(); ctx.arc(sunX, 6, 12, 0, 7); ctx.fill();
  // sites to choose from (step 1)
  if (!S.site) SITES.forEach((st) => {
    ctx.fillStyle = "#ffd27a"; ctx.beginPath(); ctx.arc(st.x, st.y, 16 + Math.sin(cbv.t * 4) * 2, 0, 7); ctx.fill();
    ctx.fillStyle = "#1b1f27"; ctx.font = "bold 16px system-ui"; ctx.textAlign = "center"; ctx.fillText(st.id, st.x, st.y + 6);
    ctx.fillStyle = "#0b1020dd"; roundRect(ctx, st.x + 20, st.y - 30, 142, 56, 8); ctx.fill();
    ctx.font = "11px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
    ctx.fillText(st.name, st.x + 28, st.y - 14); ctx.fillText(`☀️ ${Math.round(st.sun * 100)}%  🧊 ${st.ice} km`, st.x + 28, st.y + 2); ctx.fillText(`⛰️ slope ${st.slope}°`, st.x + 28, st.y + 17);
  });
  if (!S.site) return;
  // base buildings around the chosen site
  const P = cbPositions();
  if (S.pad) { ctx.fillStyle = "#5c616b"; ctx.beginPath(); ctx.arc(S.pad.x, S.pad.y, 26, 0, 7); ctx.fill(); ctx.strokeStyle = "#ffd27a"; ctx.stroke(); ctx.fillStyle = "#ffd27a"; ctx.font = "bold 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("H", S.pad.x, S.pad.y + 4); }
  if (has("cable")) { ctx.strokeStyle = "#ffb547"; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(CRATER.x - 60, CRATER.y - 20); ctx.stroke(); ctx.setLineDash([]); }
  for (let i = 0; i < cnt("solar"); i++) { const [x, y] = P.solar(i); ctx.fillStyle = "#555"; ctx.fillRect(x - 1, y - 2, 2, 14); ctx.fillStyle = S.dusty && !has("cleanbot") ? "#6b6250" : "#2b4a8a"; ctx.fillRect(x - 9, y - 22, 18, 20); }
  for (let i = 0; i < cnt("battery"); i++) { const [x, y] = P.batt(i); ctx.fillStyle = "#e6e8ee"; ctx.fillRect(x - 6, y - 4, 12, 8); ctx.fillStyle = "#3ecf8e"; ctx.fillRect(x - 5, y - 3, 10 * Math.min(1, S.batt / Math.max(1, cnt("battery") * 120)), 6); }
  const icon = (k, x, y, size = 16) => { if (!has(k)) return; ctx.font = `${size}px system-ui`; ctx.textAlign = "center"; ctx.fillText(ITEMS[k].ico, x, y + size / 3); };
  if (has("antenna")) { const [x, y] = P.antenna; ctx.strokeStyle = "#ddd"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 36); ctx.stroke(); ctx.lineWidth = 1;
    if (commsOn()) { ctx.strokeStyle = "#7fd3ff"; for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.arc(x, y - 36, 6 + ((cbv.t * 20 + r * 8) % 24), -2.4, -0.7); ctx.stroke(); } } }
  if (has("relay")) { const rx = 600 - ((cbv.t * 30) % 560); ctx.font = "18px system-ui"; ctx.fillText("🛰️", rx, 30); }
  if (has("hab")) { const [x, y] = P.hab; ctx.fillStyle = S.covered ? "#8a7a62" : "#e6e8ee"; ctx.beginPath(); ctx.arc(x, y, S.covered ? 24 : 20, Math.PI, 0); ctx.fill(); ctx.fillRect(x - (S.covered ? 24 : 20), y, S.covered ? 48 : 40, 6);
    if (S.covering) { ctx.fillStyle = "#8a7a62"; ctx.beginPath(); ctx.arc(x, y, 20 + (10 - S.covering) * 0.4, Math.PI, Math.PI + (10 - S.covering) / 10 * Math.PI); ctx.fill(); }
    if (dark && !S.shed.includes("hab")) { ctx.fillStyle = "#ffd27a"; ctx.fillRect(x - 3, y - 8, 6, 5); } }
  icon("waterplant", ...P.water, 18); icon("greenhouse", ...P.green, 18); icon("printer", ...P.printer, 16); icon("fuel", ...P.fuel, 18);
  if (has("greenhouse") && !S.shed.includes("greenhouse")) { ctx.fillStyle = "#3ecf8e33"; ctx.beginPath(); ctx.arc(...P.green, 18, 0, 7); ctx.fill(); }
  icon("padbot", ...P.padbot, 16); icon("cleanbot", ...P.clean, 14);
  if (has("scout")) { const a = cbv.t * 0.5; ctx.font = "14px system-ui"; ctx.fillText("🤖", CRATER.x + Math.cos(a) * 90, CRATER.y + Math.sin(a) * 50); }
  for (let i = 0; i < cnt("icerover"); i++) {      // ice rovers drive between the crater and the base
    const k = (Math.sin(cbv.t * 0.6 + i * 2) + 1) / 2, x = sx + (CRATER.x - 40 - sx) * k, y = sy + (CRATER.y - sy) * k;
    ctx.font = "15px system-ui"; ctx.fillText(S.roverStuck && i === 0 ? "🧊" : "⛏️", x, y);
    if (!has("cable") && k > 0.7) { ctx.fillStyle = "#ff5c6c"; ctx.fillRect(x - 6, y + 6, 12 * (1 - k) * 3, 2); }
  }
  for (let i = 0; i < S.crew; i++) { const [x, y] = P.hab; drawAstronaut(ctx, x - 26 + i * 16, y + 30, { s: 0.32, covers: true }); }
  // night shade
  if (dark) { ctx.fillStyle = "#03050d99"; ctx.fillRect(0, 0, MW, MH); ctx.fillStyle = "#fff"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "left"; ctx.fillText("🌑 The ridge is in shadow (dark gap)", 12, MH - 12); }
  // landers arriving (dust!)
  cbv.landers = cbv.landers.filter((L) => (L.t += dt) < 2.4);
  cbv.landers.forEach((L) => {
    const k = Math.min(1, L.t / 1.4), y = -30 + (L.y + 30) * k;
    if (k < 1) { ctx.fillStyle = "#ffb547"; ctx.beginPath(); ctx.arc(L.x, y + 14, 6 + Math.random() * 3, 0, 7); ctx.fill(); }
    if (k > 0.6) { const R = S.pad ? 30 : 110; for (let i = 0; i < 14; i++) { const a = Math.random() * 7, r = Math.random() * R; ctx.fillStyle = "#c9b896aa"; ctx.fillRect(L.x + Math.cos(a) * r, L.y + Math.sin(a) * r * 0.6, 3, 3); } }
    ctx.fillStyle = "#e9ecf2"; ctx.beginPath(); ctx.arc(L.x, y, 10, 0, 7); ctx.fill(); ctx.font = "12px system-ui"; ctx.textAlign = "center"; ctx.fillText(L.ico, L.x, y + 4);
  });
  // power graph (step 4+)
  if (S.step >= 4 && S.powerHist.length > 1) {
    const gx = MW - 190, gy = MH - 78, gw = 178, gh = 66;
    ctx.fillStyle = "#0b1020dd"; roundRect(ctx, gx, gy, gw, gh, 8); ctx.fill();
    const mx = Math.max(6, ...S.powerHist.map((p) => Math.max(p.gen, p.load)));
    S.powerHist.forEach((p, i) => { if (p.dark) { ctx.fillStyle = "#ffffff12"; ctx.fillRect(gx + 4 + i * (gw - 8) / 60, gy + 14, (gw - 8) / 60 + 1, gh - 18); } });
    [["gen", "#ffd27a"], ["load", "#ff8a3d"]].forEach(([k, c]) => { ctx.strokeStyle = c; ctx.beginPath(); S.powerHist.forEach((p, i) => { const x = gx + 4 + i * (gw - 8) / 60, y = gy + gh - 4 - (p[k] / mx) * (gh - 20); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); });
    ctx.font = "10px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#ffd27a"; ctx.fillText("☀️ made", gx + 6, gy + 11); ctx.fillStyle = "#ff8a3d"; ctx.fillText("⚡ used", gx + 56, gy + 11); ctx.fillStyle = "#9aa5cc"; ctx.fillText("(60 days)", gx + 110, gy + 11);
  }
  if (cbv.placePad) { ctx.fillStyle = "#ffd27a"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "center"; ctx.fillText("👆 Click where the landing pad should go (far from buildings!)", MW / 2, 24); }
}
function cbPositions() {
  const [sx, sy] = sitePos();
  return {
    solar: (i) => [Math.min(350, Math.max(40, sx - 60 + i * 26)), Math.min(185, Math.max(70, sy - 50 + (i % 2) * 18))],
    batt: (i) => [sx + 30 + (i % 4) * 14, sy - 6 + Math.floor(i / 4) * 12],
    antenna: [sx - 34, sy - 10], hab: [sx + 4, sy + 34], water: [sx + 60, sy + 46], green: [sx - 40, sy + 48],
    printer: [sx + 66, sy + 10], fuel: [sx + 96, sy + 40], padbot: [sx - 70, sy + 30], clean: [sx - 12, sy - 34],
  };
}
function cbMapClick(ev) {
  if (!S) return;
  const r = $("cbMap").getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * MW, y = (ev.clientY - r.top) / r.height * MH;
  if (!S.site) {
    const st = SITES.find((s) => Math.hypot(s.x - x, s.y - y) < 40 || (x > s.x + 20 && x < s.x + 162 && y > s.y - 30 && y < s.y + 26));
    if (st) cbConfirmSite(st);
    return;
  }
  if (cbv.placePad) {
    if (Math.hypot(x - CRATER.x, y - CRATER.y) < 130) { sfx.nope(); return say("crater", "Not in the dark crater! The pad needs flat, solid ground. 🛬", 5000); }
    const P = cbPositions(), near = [P.hab, P.antenna, sitePos(), ...[0, 1, 2].map(P.solar)].some(([bx, by]) => Math.hypot(bx - x, by - y) < 90);
    S.pad = { x, y }; cbv.placePad = false; sfx.add();
    if (near) say("crater", "That's close to the base! Apollo 12 landed ~180 m from Surveyor 3 and still sandblasted it. Let's hope our pad works… 😬", 8000);
    else say("thrust", "Good spot: far enough away that landing blasts won't hit the base. 🛬", 5000);
    cbAfterChange();
  }
}
function cbConfirmSite(st) {
  sfx.click();
  $("modalBox").innerHTML = `<div class="ico">📍</div><h2>Site ${st.id}: ${st.name}</h2>
    <p class="sub">☀️ Sunlight ${Math.round(st.sun * 100)}% · 🧊 Ice ${st.ice} km away · ⛰️ Slope ${st.slope}°</p>
    <p class="sub">${st.note}</p>
    <div class="choices"><button class="btn go" onclick="cbPickSite('${st.id}')">✅ Build here</button><button class="btn ghost" onclick="closeModal()">Look again</button></div>`;
  $("modal").classList.remove("hidden");
}
function cbPickSite(id) {
  closeModal(); S.site = SITES.find((s) => s.id === id); sfx.win();
  if (S.site.ice > 3) S.cableRisk = true;
  cbLog(`📍 Base site chosen: ${S.site.name}`);
  cbAfterChange();
}
function cbSkipScout() { S.scoutSkipped = true; sfx.click(); say("crater", "Skipping saves money… but nobody has checked how much ice is really in that crater. Fingers crossed! 🤞", 7000); cbAfterChange(); }
function cbStartPad() { cbv.placePad = true; sfx.click(); }
function cbCover() {
  if (!has("padbot")) { sfx.nope(); return say("crater", "We need the pad-building robot to pile soil! 🚜", 5000); }
  S.covering = 10; sfx.add(); say("crater", "The robot is piling Moon soil on the roof. It's a radiation shield! 🛡️", 6000); cbRenderSide();
}
function cbDoRefuel() {
  if (!cbRefuel()) return;
  sfx.win(); cbAfterChange();
}

// ---------------- shipping screen ----------------
function openShipping(focus) {
  S.paused = true; cbRenderTop();
  const items = Object.entries(ITEMS).filter(([k, it]) => it.step <= Math.max(S.step, 2) || k === focus);
  cbv.ship = { k: focus && ITEMS[focus] ? focus : items[0][0], qty: 1, route: null };
  cbv.ship.route = cbv.ship.k === "supplies" || cbv.ship.k === "medkit" || cbv.ship.k === "patch" ? "standard" : "economy";
  drawShipping();
}
function drawShipping() {
  const sh = cbv.ship, it = ITEMS[sh.k];
  const items = Object.entries(ITEMS).filter(([k, i]) => i.step <= Math.max(S.step, 2));
  const routeCard = (R) => {
    const cost = shipCost(sh.k, sh.qty, R.id), win = R.windows ? nextWindow(S.day) : Math.ceil(S.day);
    return `<div class="rcard ${sh.route === R.id ? "sel" : ""}" onclick="cbv.ship.route='${R.id}';drawShipping()">
      <div class="rt">${R.ico} ${R.name}</div>
      <div>🕐 ${R.days === 120 ? "~4 months" : R.days === 40 ? "~40 days" : "3 days"}</div>
      <div>💰 <b>${money(cost)}</b></div>
      <div class="sm">${R.crew ? "Crew, cargo, emergencies" : "Cargo & robots only"}</div>
      ${R.windows ? `<div class="sm" style="color:${isWindow(S.day) ? "#3ecf8e" : "#ffb547"}">${isWindow(S.day) ? "🟢 Launch window open today!" : `🗓️ Next window: day ${win}`}</div>` : ""}
      <div class="sm">e.g. ${R.ex}</div></div>`;
  };
  const cal = Array.from({ length: 30 }, (_, i) => { const d = Math.floor(S.day) + i; return `<span class="${isWindow(d) ? "win" : ""} ${i === 0 ? "today" : ""}" title="Day ${d}">${d % 30}</span>`; }).join("");
  $("modalBox").innerHTML = `<h2>🚚 Shipping from Earth</h2>
    <div class="shipgrid">
      <div><label class="sm">What to send</label>
        <select onchange="cbv.ship.k=this.value;cbv.ship.qty=1;drawShipping()">${items.map(([k, i]) => `<option value="${k}" ${k === sh.k ? "selected" : ""}>${i.ico} ${i.name}</option>`).join("")}</select>
        ${it.qty ? `<div class="qty"><button onclick="cbv.ship.qty=Math.max(1,cbv.ship.qty-1);drawShipping()">−</button><b>${sh.qty}</b><button onclick="cbv.ship.qty=Math.min(8,cbv.ship.qty+1);drawShipping()">+</button></div>` : ""}
        <p class="sm">📦 ${itemMass(sh.k, sh.qty).toFixed(1)} t · part cost ${money(itemCost(sh.k, sh.qty))}${has("printer") && it.building ? " (−40%: Moon bricks!)" : ""}</p>
        <canvas id="orbitCv" width="300" height="170"></canvas>
        <p class="sm" id="orbitHow">${ROUTES[sh.route].how}</p></div>
      <div class="rcards">${Object.values(ROUTES).map(routeCard).join("")}
        <div class="cal"><div class="sm">🗓️ Next 30 days (green = Economy launch window)</div>${cal}</div></div>
    </div>
    <div class="choices" style="grid-template-columns:1fr 1fr"><button class="btn go" onclick="cbConfirmOrder()">🚀 Ship it (${money(shipCost(sh.k, sh.qty, sh.route))})</button>
      <button class="btn ghost" onclick="closeShipping()">Close</button></div>`;
  $("modalBox").classList.add("wide"); $("modal").classList.remove("hidden");
  cbv.orbitT = 0; requestAnimationFrame(orbitAnim);
}
function closeShipping() { closeModal(); $("modalBox").classList.remove("wide"); S.paused = false; cbRenderTop(); }
function cbConfirmOrder() {
  const sh = cbv.ship;
  const r = cbOrder(sh.k, sh.qty, sh.route);
  if (!r.ok) { sfx.nope(); return say("fuel", r.msg + " 💸", 4000); }
  sfx.go(); closeShipping();
  const R = ROUTES[sh.route];
  if (sh.route === "express" && !["medkit", "patch", "supplies"].includes(sh.k)) say("fuel", "Express is fast but costs 3× more than Economy. Save it for people and emergencies! 💸", 6000);
  else if (R.windows && !isWindow(S.day)) say("crater", `Economy only launches in a window. Yours leaves on day ${r.ship.depart}. 🗓️`, 6000);
  cbAfterChange();
}
// the route's path, animated: Express = one burn; Standard = growing ellipses (Oberth); Economy = long loop
function orbitAnim() {
  const cv = $("orbitCv"); if (!cv || !cbv || !cbv.ship) return;
  const c = cv.getContext("2d"), r = cbv.ship.route; cbv.orbitT += 0.012;
  c.fillStyle = "#03050d"; c.fillRect(0, 0, 300, 170);
  const E = [70, 85], M = [250, 85];
  c.fillStyle = "#2f7de1"; c.beginPath(); c.arc(...E, 10, 0, 7); c.fill(); c.fillStyle = "#cfd3dc"; c.beginPath(); c.arc(...M, 6, 0, 7); c.fill();
  c.font = "10px system-ui"; c.fillStyle = "#9aa5cc"; c.fillText("Earth", 56, 108); c.fillText("Moon", 238, 103);
  const t = cbv.orbitT % 1, pts = [];
  if (r === "express") { for (let k = 0; k <= 1; k += 0.02) pts.push([E[0] + 14 + (M[0] - E[0] - 14) * k, E[1] - Math.sin(k * Math.PI) * 45]); }
  else if (r === "standard") {
    [30, 55, 85, 125].forEach((a, j) => { for (let q = 0; q <= 1.001; q += 0.02) { const ang = Math.PI + q * 2 * Math.PI; pts.push([E[0] + 14 + a + Math.cos(ang) * a, E[1] + Math.sin(ang) * a * 0.45]); } });
    for (let k = 0; k <= 1; k += 0.05) pts.push([E[0] + 14 + 250 * 0 + (M[0] - E[0] - 14) * k, E[1]]);
  } else { for (let q = 0; q <= 1; q += 0.01) { const ang = q * 2 * Math.PI; pts.push([E[0] + 14 + 150 + Math.cos(ang + Math.PI) * 150 * (1 - q * 0.45), E[1] + Math.sin(ang + Math.PI) * 70]); } c.fillStyle = "#fff4c2"; c.beginPath(); c.arc(8, 20, 7, 0, 7); c.fill(); c.fillStyle = "#9aa5cc"; c.fillText("← Sun's pull", 16, 24); }
  c.strokeStyle = r === "express" ? "#ff5c6c" : r === "standard" ? "#ffd27a" : "#3ecf8e"; c.globalAlpha = 0.4; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.globalAlpha = 1;
  const p = pts[Math.floor(t * (pts.length - 1))]; c.fillStyle = "#fff"; c.beginPath(); c.arc(p[0], p[1], 3, 0, 7); c.fill();
  if (r === "standard") { c.fillStyle = "#ffd27a"; c.fillText("🔥 burn at perigee → orbit grows", 92, 160); }
  if (r === "express") { c.fillStyle = "#ff5c6c"; c.fillText("🔥 one big burn → 3 days", 100, 160); }
  if (r === "economy") { c.fillStyle = "#3ecf8e"; c.fillText("long loop saves fuel → ~4 months", 92, 160); }
  if (!$("modal").classList.contains("hidden")) requestAnimationFrame(orbitAnim);
}

// ---------------- crew ----------------
function openCrew() {
  S.paused = true; cbv.crewSel = cbv.crewSel || ["thrust", "rocket"];
  const C = cbv.crewSel;
  $("modalBox").innerHTML = `<div class="ico">👩‍🚀</div><h2>Choose 2 to 4 astronauts</h2>
    <p class="sub">⚡ <b>Crew always rides Express.</b> Astronauts can't spend months crossing Earth's radiation belts, and they need food and air every day, so they take the fast road.</p>
    <div class="crew-row" style="margin:12px 0">${CREW.map((c) => `<div class="face ${C.includes(c.id) ? "" : "off"}" onclick="cbToggleCrew('${c.id}')" style="width:96px">${avatar(c)}<div class="nm" style="font-size:12px">${c.name}</div></div>`).join("")}</div>
    <p class="sub">${C.length} astronauts × $${CREW_TICKET}M = <b>${money(C.length * CREW_TICKET)}</b> · they bring 14 days of supplies</p>
    <div class="choices"><button class="btn go" ${C.length >= 2 ? "" : "disabled"} onclick="cbLaunchCrew()">🚀 Launch the crew (Express, 3 days)</button><button class="btn ghost" onclick="closeModal();S.paused=false">Not yet</button></div>`;
  $("modal").classList.remove("hidden");
}
function cbToggleCrew(id) { const C = cbv.crewSel; const i = C.indexOf(id); if (i >= 0) C.splice(i, 1); else if (C.length < 4) C.push(id); sfx.click(); openCrew(); }
function cbLaunchCrew() {
  if (!has("hab")) { sfx.nope(); return say("thrust", "No habitat yet! The crew needs somewhere to live. 🏠", 5000); }
  if (!commsOn()) { sfx.nope(); return say("thrust", "No comms! We can't send people without a way to talk to Earth. 📡", 5000); }
  if (!cbSendCrew(cbv.crewSel.map((id) => byId(CREW, id).name))) { sfx.nope(); return say("fuel", "Not enough money for the tickets! 💸", 5000); }
  closeModal(); S.paused = false; sfx.go(); say("rocket", "Crew launched on Express! Now oxygen, water and food will drain every day: order supplies early! 📦", 7000); cbAfterChange();
}

// ---------------- emergencies ----------------
function openEmergency() {
  if (!S || !S.emergency) { sfx.click(); return say("thrust", "No emergency right now. The red button flashes when something goes wrong. 🚨", 4000); }
  S.paused = true; cbRenderTop();
  const e = S.emergency, ops = cbOptions();
  const left = S.crew ? `🫁 ${Math.floor(daysLeft("o2"))} d of oxygen · 💧 ${Math.floor(daysLeft("water"))} d of water · ` : "";
  $("modalBox").innerHTML = `<div class="ico">${e.ico}</div><h2>${e.title}</h2>
    <p class="sub">${e.why}</p>
    <p class="countdown">⏳ ${e.rescue ? `Rescue arrives in ${e.rescue} day${e.rescue > 1 ? "s" : ""}` : `${e.left} day${e.left === 1 ? "" : "s"} to fix this`} <span>${left}🔋 ${Math.round(S.batt)} kWh</span></p>
    <p class="sm">Help from Earth is at least <b>3 days</b> away, so the base must survive on its own first.</p>
    <div class="choices">${ops.map((o) => `<button class="btn ${o.ok ? "" : "ghost"}" ${o.ok && !e.rescue ? "" : "disabled"} onclick="cbDoRespond('${o.id}')" style="text-align:left">${o.ico} <b>${o.name}</b><br><span style="font-size:12px;font-weight:400">${o.note}${!o.ok && (o.id === "call" || o.id === "express") && !commsOn() ? " · 📵 comms down" : ""}</span></button>`).join("")}</div>
    <div class="choices"><button class="btn ghost" onclick="closeModal();S.paused=false;cbRenderTop()">Close (time keeps running)</button></div>`;
  $("modal").classList.remove("hidden");
}
function cbDoRespond(id) {
  const msg = cbRespond(id); sfx.click();
  $("modalBox").innerHTML = `<div class="ico">📻</div><h2>${id === "call" ? "Houston answers…" : "Done"}</h2><p class="sub">${msg}</p>
    <div class="choices"><button class="btn go" onclick="closeModal();${S.emergency ? "openEmergency()" : "S.paused=false"};cbAfterChange()">OK</button></div>`;
  if (id === "call") { sfx.quindar && sfx.quindar(); }
}

// ---------------- toasts ("why this happens") ----------------
function cbToast(t, why) {
  const box = $("cbToasts"); if (!box) return;
  const d = document.createElement("div"); d.className = "cbtoast";
  d.innerHTML = `<div>${t}</div>${why ? `<details><summary>Why this happens</summary>${why}</details>` : ""}`;
  box.prepend(d); while (box.children.length > 3) box.lastChild.remove();
  setTimeout(() => d.remove(), why ? 14000 : 7000);
}

// ---------------- loop ----------------
function cbAfterChange() { const r = cbAdvance(); if (r === "next") cbStepUp(); if (r === "win") return cbWin(); cbRenderTop(); cbRenderSide(); }
function cbStepUp() {
  sfx.win(); const st = STEPS[S.step - 2];
  cbToast(`✅ Step ${S.step - 1} done: ${st.title}! Next: ${STEPS[S.step - 1].ico} ${STEPS[S.step - 1].title}`);
}
function cbTick(now) {
  if (!cbv || !$("cbMap")) return;
  const dt = Math.min(0.05, (now - cbv.last) / 1000); cbv.last = now; cbv.t += dt;
  if (S.site && !S.paused && !S.lost && !S.done && $("modal").classList.contains("hidden")) {
    cbv.acc += dt * S.speed / 1.2;
    while (cbv.acc >= 1) {
      cbv.acc -= 1;
      const hadEm = !!S.emergency, before = new Set(S.ships.filter((x) => x.landed).map((x) => x.id));
      const r = cbDay();
      S.ships.filter((x) => x.landed && !before.has(x.id)).forEach((x) => {
        const [sx, sy] = sitePos(); const L = S.pad ? [S.pad.x, S.pad.y] : [sx + 60 + Math.random() * 40, sy - 10 + Math.random() * 30];
        cbv.landers.push({ x: L[0], y: L[1], t: 0, ico: x.k === "crew" ? "👩‍🚀" : ITEMS[x.k].ico }); sfx.clunk();
      });
      if (r === "next") cbStepUp();
      if (r === "win") return cbWin();
      if (S.lost) return cbLose();
      if (!hadEm && S.emergency) { sfx.alarm(); S.paused = true; cbEmergencyPopup(); break; }
      if (S.speed >= 20 && cbv.acc > 3) cbv.acc = 3;
    }
    cbRenderTop(); cbRenderSide();
  }
  while (S.pending.length) { const p = S.pending.shift(); cbToast(p.t, p.why); }
  const ctx = $("cbMap").getContext("2d"); ctx.setTransform(cbv.scale, 0, 0, cbv.scale, 0, 0);
  cbDrawMap(ctx, dt);
  requestAnimationFrame(cbTick);
}
function cbEmergencyPopup() {
  const e = S.emergency; cbRenderTop();
  $("modalBox").innerHTML = `<div class="ico">🚨</div><h2>${e.ico} ${e.title}</h2><p class="sub">${e.why}</p>
    <div class="choices"><button class="btn" style="background:var(--bad);box-shadow:0 6px 0 #b03040" onclick="openEmergency()">🚨 Open the Emergency panel</button></div>`;
  $("modal").classList.remove("hidden");
}

// ---------------- endings ----------------
function cbExit() { document.body.classList.remove("flying"); try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {} }
function cbWin() {
  cbExit(); const sc = cbScore(); sfx.win(); cbv = null;
  $("app").innerHTML = `
    <div class="result good">🚀 GATEWAY TO MARS!</div>
    <svg viewBox="0 0 200 120" width="220" style="display:block;margin:6px auto"><circle cx="40" cy="70" r="26" fill="#cfd3dc"/><circle cx="160" cy="50" r="34" fill="#c1440e"/><circle cx="150" cy="40" r="8" fill="#a33a0c"/><circle cx="172" cy="62" r="6" fill="#a33a0c"/><path d="M62 64 Q100 20 128 46" stroke="#ffd27a" stroke-width="2" stroke-dasharray="4 4" fill="none"/><text x="96" y="30" font-size="14">🚀</text></svg>
    <div class="bigstars">${[0, 1, 2].map((i) => (i < sc.stars ? "★" : `<span class="dim">★</span>`)).join("")}</div>
    <div class="score">${sc.days} days · spent ${money(sc.spent)} · ${money(sc.budget)} left · ${sc.rescues} express rescue${sc.rescues === 1 ? "" : "s"} · ${sc.injuries} injur${sc.injuries === 1 ? "y" : "ies"}</div>
    <div class="why">
      <div class="whycard good"><span class="ico">⛽</span><span>The base makes its own rocket fuel from Moon ice! Launching from the Moon needs only ~2.4 km/s instead of ~11.2 km/s from Earth.</span></div>
      <div class="whycard good"><span class="ico">🔓</span><span>Unlocked: refuelling in orbit. Every future shipment is cheaper, because landers fill up on the Moon.</span></div>
      <div class="whycard"><span class="ico">⭐</span><span>Stars: 1 for finishing · 1 for keeping $3B+ left · 1 for no injuries, no crew sent home, and at most 1 express rescue.</span></div>
      <div class="whycard"><span class="ico">🔴</span><span>Next stop: Mars. A Moon base that makes its own air, water, food, bricks and fuel is practice for living even farther from home.</span></div>
    </div>
    <div class="actions"><button class="btn go" onclick="screenColonyBuilder()">🔁 Build another base</button><button class="btn ghost" onclick="screenTitle()">🏠 Main menu</button></div>`;
  say("thrust", "We did it: a Moon base that fuels rockets. Mars, here we come! 🔴", 0);
}
function cbLose() {
  cbExit(); const sc = cbScore(), why = S.lost; sfx.fail(); cbv = null;
  $("app").innerHTML = `
    <div class="result bad">BASE PAUSED</div>
    <p class="sub" style="max-width:600px;margin:10px auto">${why} Everyone is safe.</p>
    <div class="score">Reached step ${S.step} of 12 · day ${sc.days} · spent ${money(sc.spent)}</div>
    <div class="why">
      <div class="whycard warn"><span class="ico">💡</span><span>Use slow, cheap routes (Economy/Standard) for robots and cargo, and order early. Save Express for people and emergencies.</span></div>
      <div class="whycard warn"><span class="ico">💡</span><span>Make the base self-sufficient fast: ice → water → oxygen, greenhouse → food. Every kg made on the Moon is a kg you don't ship.</span></div>
    </div>
    <div class="actions"><button class="btn go" onclick="screenColonyBuilder()">🔁 Try again</button><button class="btn ghost" onclick="screenTitle()">🏠 Main menu</button></div>`;
}
