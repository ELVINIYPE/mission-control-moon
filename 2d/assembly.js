/* =========================================================
   ROCKET ASSEMBLY: stack the stages, fuel them, add the escape tower.
   Stage data is simplified from the real rockets (sizes are drawn to look right,
   not exactly to scale). "burn" = seconds the stage fires in the game.
   ========================================================= */

const STACKS = {
  f9: {
    stages: [
      { name: "Stage 1", spoken: "Stage one", info: "9 Merlin engines", ftype: "liquid", fuel: "kerosene + liquid oxygen", h: 150, w: 24, color: "#e8ecf5", engines: 3, burn: 6 },
      { name: "Stage 2", spoken: "Stage two", info: "1 Merlin Vacuum engine. Fires again for TLI", ftype: "liquid", fuel: "kerosene + liquid oxygen", h: 46, w: 24, color: "#e8ecf5", engines: 1, burn: 6 },
    ],
  },
  fh: {
    boosters: { name: "Side boosters", spoken: "Side booster", info: "Two extra Falcon 9 first stages", ftype: "liquid", fuel: "kerosene + liquid oxygen", h: 150, w: 22, color: "#e8ecf5", burn: 3.5 },
    stages: [
      { name: "Center core", spoken: "Center core", info: "9 Merlin engines", ftype: "liquid", fuel: "kerosene + liquid oxygen", h: 150, w: 24, color: "#e8ecf5", engines: 3, burn: 6 },
      { name: "Stage 2", spoken: "Stage two", info: "1 Merlin Vacuum engine. Fires again for TLI", ftype: "liquid", fuel: "kerosene + liquid oxygen", h: 46, w: 24, color: "#e8ecf5", engines: 1, burn: 6 },
    ],
  },
  sls: {
    boosters: { name: "Solid boosters", spoken: "Booster", info: "Biggest solid rocket boosters ever flown", ftype: "solid", fuel: "solid fuel", solid: true, h: 165, w: 16, color: "#f4f4f4", burn: 3.5 },
    stages: [
      { name: "Core stage", spoken: "Core stage", info: "4 RS-25 engines (from the Space Shuttle)", ftype: "cryo", fuel: "liquid hydrogen + liquid oxygen (−253 °C!)", h: 180, w: 34, color: "#ff9a3d", engines: 4, burn: 8 },
      { name: "ICPS", spoken: "Upper stage", info: "1 RL10 engine. Fires again for TLI", ftype: "cryo", fuel: "liquid hydrogen + liquid oxygen", h: 34, w: 24, color: "#e8ecf5", engines: 1, burn: 4 },
    ],
  },
  sat5: {
    stages: [
      { name: "S-IC", spoken: "S one C", info: "1st stage · 5 F-1 engines", ftype: "liquid", fuel: "kerosene (RP-1) + liquid oxygen", h: 120, w: 40, color: "#ffffff", band: true, engines: 5, burn: 5 },
      { name: "S-II", spoken: "S two", info: "2nd stage · 5 J-2 engines", ftype: "cryo", fuel: "liquid hydrogen + liquid oxygen (−253 °C!)", h: 72, w: 40, color: "#ffffff", engines: 5, burn: 5 },
      { name: "S-IVB", spoken: "S four B", info: "3rd stage · 1 J-2 engine. Fires twice: into orbit, then TLI", ftype: "cryo", fuel: "liquid hydrogen + liquid oxygen", h: 50, w: 28, color: "#ffffff", engines: 1, burn: 3.5 },
    ],
  },
  megax: {
    stages: [
      { name: "Stage 1", spoken: "Stage one", info: "Made-up giant: 12 engines", ftype: "cryo", fuel: "liquid methane + liquid oxygen (−162 °C)", h: 130, w: 54, color: "#b07cff", engines: 5, burn: 5 },
      { name: "Stage 2", spoken: "Stage two", info: "6 engines", ftype: "cryo", fuel: "liquid methane + liquid oxygen (−162 °C)", h: 80, w: 54, color: "#b07cff", engines: 3, burn: 5 },
      { name: "Stage 3", spoken: "Stage three", info: "1 engine. Fires again for TLI", ftype: "cryo", fuel: "liquid methane + liquid oxygen (−162 °C)", h: 50, w: 36, color: "#c9a8ff", engines: 1, burn: 3.5 },
    ],
  },
};

// The parts list for a rocket, bottom → top (boosters are attached to stage 0)
function stackParts(rocketId) {
  const S = STACKS[rocketId];
  const parts = S.stages.map((st, i) => ({ kind: "stage", idx: i, ...st }));
  if (isApollo()) {        // Apollo: lander inside the adapter, then service + command module
    parts.push({ kind: "lmd", name: "LM descent stage", info: "Lands on the Moon · carries the rover & experiments", h: 24, w: 26 });
    parts.push({ kind: "lma", name: "LM ascent stage", info: "Brings 2 astronauts back up from the Moon", h: 18, w: 26 });
    parts.push({ kind: "sm", name: "Service module", info: "Big engine + fuel", h: 22, w: 26 });
    parts.push({ kind: "cm", name: "Command module", info: "3 astronauts sit here", h: 20, w: 26 });
  } else parts.push({ kind: "craft", name: "Our spacecraft", h: 72, w: 26 });
  return { parts, boosters: S.boosters ? { kind: "booster", ...S.boosters } : null };
}

// ---------- DRAWING (shared by assembly and launch) ----------
function drawStage(ctx, p, cx, yb, showFuel) {
  const x = cx - p.w / 2, top = yb - p.h;
  // engines (little nozzles)
  ctx.fillStyle = "#444";
  for (let i = 0; i < (p.engines || 1); i++) {
    const ex = cx + (i - ((p.engines || 1) - 1) / 2) * Math.min(8, p.w / (p.engines || 1));
    ctx.beginPath(); ctx.moveTo(ex - 3, yb); ctx.lineTo(ex + 3, yb); ctx.lineTo(ex + 4.5, yb + 7); ctx.lineTo(ex - 4.5, yb + 7); ctx.fill();
  }
  ctx.fillStyle = p.color; ctx.fillRect(x, top, p.w, p.h);
  if (p.band) { ctx.fillStyle = "#111"; ctx.fillRect(x, top + p.h * 0.15, p.w, 6); ctx.fillRect(x, top + p.h * 0.8, p.w / 2, 10); ctx.fillRect(cx, top + p.h * 0.55, p.w / 2, 10); }
  // fuel window (shows how full the tank is)
  if (showFuel) {
    const fh = (p.h - 12) * (p.fill || 0);
    ctx.fillStyle = "#0008"; ctx.fillRect(cx - 4, top + 6, 8, p.h - 12);
    ctx.fillStyle = (p.fuel || "").includes("hydrogen") ? "#5ab4ff" : "#ff9a3d";
    ctx.fillRect(cx - 4, top + 6 + (p.h - 12 - fh), 8, fh);
  }
  ctx.strokeStyle = "#0004"; ctx.strokeRect(x, top, p.w, p.h);
  return top;
}
function drawBooster(ctx, b, cx, yb) {
  const x = cx - b.w / 2, top = yb - b.h;
  ctx.fillStyle = "#444"; ctx.beginPath(); ctx.moveTo(cx - 4, yb); ctx.lineTo(cx + 4, yb); ctx.lineTo(cx + 6, yb + 8); ctx.lineTo(cx - 6, yb + 8); ctx.fill();
  ctx.fillStyle = b.color; ctx.fillRect(x, top + 10, b.w, b.h - 10);
  ctx.beginPath(); ctx.moveTo(x, top + 10); ctx.lineTo(cx, top - 6); ctx.lineTo(x + b.w, top + 10); ctx.fill();
  ctx.strokeStyle = "#0004"; ctx.strokeRect(x, top + 10, b.w, b.h - 10);
}
// Spacecraft: adapter (holds the lander) + service module + capsule (+ escape tower)
function drawCraft(ctx, cx, yb, belowW, opts = {}) {
  const land = state.goal === "land";
  // adapter (cone from the stage below up to the spacecraft)
  ctx.fillStyle = "#d9dde6";
  ctx.beginPath(); ctx.moveTo(cx - belowW / 2, yb); ctx.lineTo(cx + belowW / 2, yb); ctx.lineTo(cx + 13, yb - 30); ctx.lineTo(cx - 13, yb - 30); ctx.fill();
  if (land) { ctx.globalAlpha = .75; drawLander(ctx, cx, yb - 4, 0.45, true); ctx.globalAlpha = 1; }
  let y = yb - 30;
  if (!opts.noSM) { ctx.fillStyle = "#b8bfcc"; ctx.fillRect(cx - 13, y - 22, 26, 22); ctx.fillStyle = "#555"; ctx.fillRect(cx - 13, y - 14, 26, 3); y -= 22; }
  drawCapsule(ctx, cx, y, opts.les);
  return y - 20;
}
function drawCapsule(ctx, cx, yb, les) {
  ctx.fillStyle = "#e9edf5"; ctx.beginPath(); ctx.moveTo(cx - 13, yb); ctx.lineTo(cx + 13, yb); ctx.lineTo(cx + 4, yb - 20); ctx.lineTo(cx - 4, yb - 20); ctx.fill();
  ctx.fillStyle = "#5a3a2a"; ctx.fillRect(cx - 13, yb - 2, 26, 3); // heat shield line
  if (les) drawLES(ctx, cx, yb - 20);
}
function drawLES(ctx, cx, yb, flame) {
  ctx.strokeStyle = "#c33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 4, yb); ctx.lineTo(cx, yb - 18); ctx.lineTo(cx + 4, yb); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = "#d33"; ctx.fillRect(cx - 3, yb - 32, 6, 14);
  ctx.beginPath(); ctx.moveTo(cx - 3, yb - 32); ctx.lineTo(cx, yb - 40); ctx.lineTo(cx + 3, yb - 32); ctx.fill();
  if (flame) { ctx.fillStyle = "#ffb547"; [-1, 1].forEach((d) => { ctx.beginPath(); ctx.moveTo(cx + d * 3, yb - 20); ctx.lineTo(cx + d * 14, yb - 4 + Math.random() * 6); ctx.lineTo(cx + d * 3, yb - 16); ctx.fill(); }); }
}
// Lunar lander: gold descent stage with legs + grey ascent stage on top
function drawLander(ctx, cx, yb, s = 1, both = true, part = "both") {
  ctx.save(); ctx.translate(cx, yb); ctx.scale(s, s);
  if (part !== "ascent") {
    ctx.strokeStyle = "#ccc"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(-26, 0); ctx.moveTo(14, -14); ctx.lineTo(26, 0); ctx.stroke();
    ctx.fillStyle = "#d9a62e"; ctx.fillRect(-16, -26, 32, 16);           // descent stage (gold foil)
    ctx.fillStyle = "#444"; ctx.fillRect(-4, -10, 8, 6);
  }
  if (part !== "descent") {
    ctx.fillStyle = "#b9bec9"; ctx.beginPath();                            // ascent stage
    ctx.moveTo(-12, -26); ctx.lineTo(12, -26); ctx.lineTo(14, -38); ctx.lineTo(4, -46); ctx.lineTo(-10, -44); ctx.lineTo(-14, -36); ctx.fill();
    ctx.fillStyle = "#223"; ctx.fillRect(-6, -40, 6, 5);
  }
  ctx.restore();
}

// Apollo modules on the rocket: the lander sits inside a cone-shaped adapter (cutaway view)
function drawModulePart(ctx, p, cx, yb, belowW, opts = {}) {
  const top = yb - p.h;
  if (p.kind === "lmd" || p.kind === "lma") {
    const wBot = p.kind === "lmd" ? belowW : (belowW + 26) / 2 + 4, wTop = p.kind === "lmd" ? (belowW + 26) / 2 + 4 : 26;
    if (p.kind === "lmd") drawLander(ctx, cx, yb - 2, 0.42, true, "descent");
    else drawLander(ctx, cx, yb + 9, 0.42, true, "ascent");
    ctx.fillStyle = "#d9dde655"; ctx.strokeStyle = "#d9dde6";
    ctx.beginPath(); ctx.moveTo(cx - wBot / 2, yb); ctx.lineTo(cx - wTop / 2, top); ctx.lineTo(cx + wTop / 2, top); ctx.lineTo(cx + wBot / 2, yb); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (p.kind === "sm") {
    ctx.fillStyle = "#b8bfcc"; ctx.fillRect(cx - 13, top, 26, p.h); ctx.fillStyle = "#555"; ctx.fillRect(cx - 13, top + 8, 26, 3);
  } else if (p.kind === "cm") drawCapsule(ctx, cx, yb, opts.les);
  return top;
}

// Draw a whole stack. parts: bottom → top. Returns nothing.
function drawStack(ctx, cx, yb, parts, boosters, opts = {}) {
  let y = yb, belowW = 26;
  parts.forEach((p, i) => {
    if (p.kind === "stage") {
      if (i === 0 && boosters) { const off = p.w / 2 + boosters.w / 2 + 1; drawBooster(ctx, boosters, cx - off, y); drawBooster(ctx, boosters, cx + off, y); }
      y = drawStage(ctx, p, cx, y, opts.showFuel); belowW = p.w;
    } else if (p.kind === "craft") y = drawCraft(ctx, cx, y, belowW, { les: opts.les });
    else { y = drawModulePart(ctx, p, cx, y, belowW, opts); belowW = 26; }
  });
}

// ---------- ASSEMBLY SCREEN ----------
let asm = null;
function screenAssemble() {
  const r = byId(ROCKETS, state.rocket);
  const { parts, boosters } = stackParts(state.rocket);
  parts.forEach((p) => (p.fill = 0));
  if (boosters) boosters.fill = 0;
  asm = { r, parts, boosters, placed: 0, boostersOn: false, drop: 0, step: "stack" };
  state.oxFirst = undefined;      // the oxidizer question counts once per mission
  state.les = state.les || false;
  // shuffled tray of parts
  const icons = { stage: "🛢️", craft: "🛸", lmd: "🦿", lma: "🕷️", sm: "⚙️", cm: "🔺" };
  const tray = parts.map((p, i) => ({ id: "p" + i, label: p.name, ico: icons[p.kind], sub: p.kind === "craft" ? "capsule + service module" : p.info }));
  if (boosters) tray.push({ id: "b", label: boosters.name, sub: boosters.info });
  tray.sort(() => Math.random() - 0.5);
  asm.tray = tray;
  $("app").innerHTML = `<h2>Build your ${r.name}</h2>
    <div class="build" style="grid-template-columns: 360px 1fr">
      <div class="ship-box"><canvas id="asmCanvas" width="340" height="430" style="background:transparent"></canvas></div>
      <div>
        <div class="group"><h3 id="asmStepTitle">1 · Stack the parts (bottom first!)</h3><div class="parts" id="asmTray"></div></div>
        <div class="group"><h3>Safety options</h3><div class="parts" id="asmLes"></div></div>
        <div class="group hidden" id="asmFuelGroup"><h3>2 · Fill the tanks</h3><div class="parts" id="asmFuel"></div></div>
      </div>
    </div>
    <div class="actions"><button class="btn ghost" onclick="cancelAsm();screenRockets()">← Rockets</button>
      <button class="btn go" id="asmNext" onclick="cancelAsm();screenPath()" disabled>Next: choose path →</button></div>`;
  drawTray(); drawLesTile();
  say("crater", `Let's build the ${r.name}! Which part goes at the bottom? 🤔`, 0);
  requestAnimationFrame(asmLoop);
}
function cancelAsm() { if (asm) asm.stopped = true; }
function drawTray() {
  $("asmTray").innerHTML = asm.tray.map((t) => {
    const done = t.id === "b" ? asm.boostersOn : Number(t.id.slice(1)) < asm.placed;
    return `<div class="part ${done ? "on" : ""}" style="width:150px" onclick="${done ? "" : `placePart('${t.id}')`}">
      ${done ? '<span class="tick">✅</span>' : ""}<div class="ico">${t.id === "b" ? "🧨" : t.ico}</div>
      <div class="nm">${t.label}</div><div class="kg">${t.sub}</div></div>`;
  }).join("");
}
function drawLesTile() {
  $("asmLes").innerHTML = `<div class="part ${state.les ? "on" : ""}" style="width:200px" onclick="toggleLes()">
    ${state.les ? '<span class="tick">✅</span>' : ""}<div class="ico">🗼</div><div class="nm">Escape tower</div>
    <div class="kg">+$50M · pulls the capsule to safety if the launch goes wrong. Dropped after 3 minutes.</div></div>
    <div class="part ${state.water ? "on" : ""}" style="width:200px" onclick="toggleWater()">
    ${state.water ? '<span class="tick">✅</span>' : ""}<div class="ico">💧</div><div class="nm">Water deluge</div>
    <div class="kg">+$20M · floods the pad with water at liftoff to soak up the heat and the deafening sound.</div></div>`;
}
function toggleWater() {
  state.water = !state.water; state.water ? sfx.add() : sfx.remove(); drawLesTile(); updateHUD();
  say("crater", state.water ? "Good! Over a million liters of water protect the pad from heat and sound waves. 💧"
    : "No water? The rocket's sound and heat can smash the launch pad to pieces! 😬", 6000);
}
function toggleLes() {
  state.les = !state.les; state.les ? sfx.add() : sfx.remove(); drawLesTile(); updateHUD();
  say("thrust", state.les ? "Good choice. Every crewed rocket in history carried an escape system. 🗼" : "No escape tower? Risky! If something goes wrong at launch, we're stuck. 😬");
}
function placePart(id) {
  const P = asm.parts;
  if (id === "b") {
    if (asm.placed < 1) { sfx.nope(); return say("crater", `Boosters strap onto the side of the ${P[0].name}. Put that down first!`); }
    asm.boostersOn = true; sfx.clunk(); asm.dropB = 1;
    say("crater", "Boosters strap onto the sides for extra push at liftoff, then drop away. 🧨");
  } else {
    const i = Number(id.slice(1));
    if (i !== asm.placed) {
      sfx.nope();
      return say("crater", asm.placed === 0 ? "The BIGGEST stage goes at the bottom. It has to lift everything! 💪" : `Not yet! Next comes the ${P[asm.placed].name}.`, 5000);
    }
    if (i === P.length - 1 && asm.boosters && !asm.boostersOn) { sfx.nope(); return say("crater", "Don't forget the boosters! 🧨"); }
    asm.placed++; asm.drop = 1; sfx.clunk();
    const p = P[i];
    if (p.kind === "craft") say("thrust", "Our spacecraft goes right on top. 🛸");
    else if (p.kind === "lmd") say("crater", "The lander rides folded up INSIDE a cone-shaped adapter. Legs first! 🦿");
    else if (p.kind === "lma") say("crater", "The ascent stage sits on the descent stage. 🕷️");
    else if (p.kind === "sm") say("thrust", "Service module above the lander. Its engine points down at the lander for now! ⚙️");
    else if (p.kind === "cm") say("thrust", "Command module on top. That's where we 3 sit for launch! 🔺");
    else say("crater", `${p.name}: ${p.info}.`);
  }
  drawTray();
  if (asm.placed === P.length && (!asm.boosters || asm.boostersOn)) startFueling();
}
function startFueling() {
  asm.step = "fuel";
  $("asmStepTitle").textContent = "1 · Stacked! ✅";
  $("asmFuelGroup").classList.remove("hidden");
  drawFuelTiles();
  say("crater", "Now fuel each stage. Pick the right TYPE of fuel for each one! ⛽", 0);
}
function drawFuelTiles() {
  const stages = asm.parts.filter((p) => p.kind === "stage");
  $("asmFuel").innerHTML = stages.map((p, i) => `<div class="part ${p.fill >= 1 ? "on" : ""}" style="width:150px" onclick="${p.fill > 0 ? "" : `fillStage(${i})`}">
      ${p.fill >= 1 ? '<span class="tick">✅</span>' : ""}<div class="ico">⛽</div><div class="nm">Fuel the ${p.name}</div><div class="kg">${p.fill >= 1 ? p.fuel : "which fuel?"}</div></div>`).join("")
    + (asm.boosters ? `<div class="part ${asm.boosters.fill >= 1 ? "on" : ""}" style="width:150px" onclick="${asm.boosters.fill >= 1 ? "" : "fillBoosters()"}">${asm.boosters.fill >= 1 ? '<span class="tick">✅</span>' : ""}<div class="ico">🧨</div><div class="nm">Fuel the boosters</div><div class="kg">${asm.boosters.fill >= 1 ? asm.boosters.fuel : "solid, liquid or cryogenic?"}</div></div>` : "");
}
// Fuel quiz: which kind of fuel does this stage use?
const FUEL_TYPES = {
  solid:  { ico: "🧱", name: "Solid", desc: "Rubbery fuel cast inside the tube. Huge push, but once lit it can't be stopped." },
  liquid: { ico: "🛢️", name: "Liquid", desc: "Kerosene (a lot like jet fuel). Dense and powerful, great for first stages." },
  cryo:   { ico: "🥶", name: "Cryogenic", desc: "Super-cold liquid hydrogen (or methane). Very efficient, great for upper stages." },
};
function fillStage(i) { openFuelQuiz(asm.parts.filter((q) => q.kind === "stage")[i]); }
function fillBoosters() { openFuelQuiz(asm.boosters); }
function openFuelQuiz(p) {
  sfx.click();
  $("modalBox").innerHTML = `<div class="ico">⛽</div><h2>What fuel goes in the ${p.name}?</h2>
    <div class="choices">${Object.entries(FUEL_TYPES).map(([k, t]) => `<button class="btn ghost" style="text-align:left;font-size:16px" onclick="answerFuel('${k}')">
      ${t.ico} <b>${t.name}</b><br><span style="font-size:13px;font-weight:400">${t.desc}</span></button>`).join("")}</div>`;
  $("modal").classList.remove("hidden");
  asm.quiz = p;
}
function answerFuel(k) {
  const p = asm.quiz;
  if (k !== p.ftype) {
    sfx.nope();
    const why = { solid: "Solid fuel can't be turned off or restarted, so it's only used for boosters.",
      liquid: "Kerosene is dense and powerful, but upper stages need something more efficient.",
      cryo: "Super-cold fuel is efficient, but this stage needs something denser and simpler." }[k];
    return say("crater", `Not quite! ${why} Try again. 🤔`, 6000);
  }
  sfx.add();
  if (p.ftype === "solid") {   // solid fuel already has its oxidizer mixed in
    $("modalBox").innerHTML = `<div class="ico">🧱</div><h2>Solid fuel: oxidizer already inside!</h2>
      <p class="sub" style="text-align:left">Fire needs oxygen, and space has none. Solid boosters have their oxidizer (ammonium perchlorate) <b>mixed right into the fuel</b>. That's also why they can't be switched off once lit.</p>
      <div class="choices"><button class="btn go" onclick="closeModal();doFill(asm.quiz)">👍 Fill it</button></div>`;
    return;
  }
  askOxidizer(p);
}
// The big myth: "rockets can't burn in space, there's no oxygen!" → rockets carry their own oxidizer
function askOxidizer(p) {
  $("modalBox").innerHTML = `<div class="ico">⛽</div><h2>${FUEL_TYPES[p.ftype].ico} Fuel is loaded into the ${p.name}</h2>
    <p class="sub">Is the stage ready to fly?</p>
    <div class="choices">
      <button class="btn" onclick="answerOx(true)">🫧 Also add the OXIDIZER (liquid oxygen)</button>
      <button class="btn ghost" onclick="answerOx(false)">⏭ Next: fuel is all we need</button></div>`;
  $("modal").classList.remove("hidden");
}
function answerOx(add) {
  const first = state.oxFirst === undefined;
  if (first) state.oxFirst = add;
  if (add) {
    sfx.win();
    $("modalBox").innerHTML = `<div class="ico">✅</div><h2>Right!${first ? " +50 points" : ""}</h2>
      <p class="sub" style="text-align:left">Fire needs oxygen, but <b>space has no air</b>. So rockets carry their own oxygen, called the <b>oxidizer</b>, as super-cold liquid oxygen (LOX). On the Saturn V, about <b>two-thirds</b> of the propellant was liquid oxygen!</p>
      <div class="choices"><button class="btn go" onclick="closeModal();doFill(asm.quiz)">⛽ Fill it up</button></div>`;
  } else {
    sfx.nope();
    $("modalBox").innerHTML = `<div class="ico">🔥❌</div><h2>It wouldn't burn!</h2>
      <p class="sub" style="text-align:left">Fire needs oxygen, and <b>space has no oxygen</b>. Fuel alone just sits there. That's why every rocket carries its own oxygen: the <b>oxidizer</b> (liquid oxygen, −183 °C). It's not that you <i>can't</i> burn fuel in space: you just have to bring the oxygen with you!</p>
      <div class="choices"><button class="btn go" onclick="answerOx(true)">🫧 Add the liquid oxygen</button></div>`;
  }
}
function doFill(p) {
  if (p.kind === "booster") { p.fill = 1; sfx.fill(0.8); drawFuelTiles(); checkFuelDone(); }
  else { p.filling = true; p.fill = 0.01; sfx.fill(1.2); }
  say("crater", `✅ ${p.name}: ${p.fuel}.`, 4000);
}
function checkFuelDone() {
  const allFull = asm.parts.every((p) => p.kind !== "stage" || p.fill >= 1) && (!asm.boosters || asm.boosters.fill >= 1);
  if (allFull && !asm.ready) {
    asm.ready = true; $("asmNext").disabled = false; sfx.win();
    say("thrust", `${asm.r.name} is fuelled and ready! 🚀`, 0);
  }
}
function asmLoop() {
  if (!asm || asm.stopped || !$("asmCanvas")) return;
  const ctx = $("asmCanvas").getContext("2d");
  ctx.clearRect(0, 0, 340, 430);
  // tower + pad
  ctx.fillStyle = "#884"; ctx.fillRect(250, 30, 8, 380);
  for (let y = 40; y < 400; y += 30) { ctx.fillStyle = "#664"; ctx.fillRect(230, y, 28, 3); }
  ctx.fillStyle = "#555"; ctx.fillRect(110, 408, 120, 12);
  // fuel animation
  asm.parts.forEach((p) => { if (p.filling && p.fill < 1) { p.fill = Math.min(1, p.fill + 0.016); if (p.fill >= 1) { p.filling = false; drawFuelTiles(); checkFuelDone(); } } });
  // stack (newest part drops in from above)
  asm.drop = Math.max(0, (asm.drop || 0) - 0.06); asm.dropB = Math.max(0, (asm.dropB || 0) - 0.06);
  const placed = asm.parts.slice(0, asm.placed);
  if (placed.length) {
    ctx.save();
    // draw all but the newest part, then the newest with an offset
    const yb = 400;
    drawStack(ctx, 170, yb, placed.slice(0, -1), null, { showFuel: asm.step === "fuel", les: state.les });
    ctx.restore();
    // newest part (dropping)
    let y = yb, belowW = 26;
    placed.slice(0, -1).forEach((p) => { y -= p.h; belowW = p.w; });
    const last = placed[placed.length - 1];
    ctx.save(); ctx.translate(0, -asm.drop * 200);
    if (last.kind === "stage") drawStage(ctx, last, 170, y, asm.step === "fuel");
    else if (last.kind === "craft") drawCraft(ctx, 170, y, belowW, { les: state.les });
    else drawModulePart(ctx, last, 170, y, belowW, { les: state.les });
    ctx.restore();
    if (asm.boostersOn) { ctx.save(); ctx.translate(0, -asm.dropB * 200); const off = asm.parts[0].w / 2 + asm.boosters.w / 2 + 1; drawBooster(ctx, asm.boosters, 170 - off, 400); drawBooster(ctx, asm.boosters, 170 + off, 400); ctx.restore(); }
  } else {
    ctx.fillStyle = "#ffffff55"; ctx.font = "16px system-ui"; ctx.textAlign = "center"; ctx.fillText("Empty launch pad", 170, 390);
  }
  requestAnimationFrame(asmLoop);
}
