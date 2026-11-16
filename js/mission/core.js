// mission/core.js — shared pieces for every mission: one 3D renderer, the HUD (points, 5 lifelines,
// gold budget cylinder, weight matrix, speed), StarHunter the helper astronaut, info pop-ups and messages.

const MS = { built: false, running: false, S: null, labels: [], last: 0 };
const MONEY_PER_1000_PTS = 1;                        // 1,000 points = $1 million (game rule)
function misNew(name) {
  GAME.mis = { name, points: 0, lives: 5, budget: 2000, loanMax: 1000, spent: 0, loan: (GAME.mis && GAME.mis.loan) || 0, rate: 0.15, test: 0, weights: [], log: [], hint: "" };
  return GAME.mis;
}
GAME.mis = null;

// ---------- renderer + loop ----------
function msInit() {
  if (MS.built) return;
  const wrap = document.createElement("div"); wrap.id = "mis"; wrap.hidden = true;
  const cv = document.createElement("canvas"); wrap.appendChild(cv);
  wrap.insertAdjacentHTML("beforeend", `<div id="msLabels"></div><div id="msUI"></div>
    <div id="msHUD" hidden>
      <div class="msTop"><div class="msName" id="msName"></div><div class="msSteps" id="msSteps"></div>
        <div class="msStats"><span class="msPts">⭐ <b id="msPts">0</b></span><span class="msLives" id="msLives" title="Lifelines"></span></div></div>
      <div class="msSpeed" id="msSpeed" hidden><small>SPEED</small><b id="msSpeedV">0</b><small id="msSpeedU">km/h</small><small id="msAlt"></small></div>
      <div class="msRight" id="msRight">
        <div class="msTube" id="msTube"><small>💰 BUDGET</small><div class="tube"><i id="msGold"></i><span id="msTubeTxt"></span></div><small id="msLoanTxt"></small>
          <button class="msTest" onclick="msTestMoney()" title="For testing: adds money so you can try everything">🧪 +$1B test money</button></div>
        <div class="msWeights" id="msWeights" hidden><small>⚖️ WEIGHT MATRIX</small><div id="msWRows"></div><div class="tot"><span>Total</span><b id="msWTot">0 t</b></div></div>
        <div class="msInfos" id="msInfos"></div>
      </div>
      <div class="msSH" id="msSH" onclick="msHelp()" title="Ask StarHunter for help (costs 50 points)"></div>
      <div class="msSay" id="msSay"></div>
    </div>
    <div id="msToast"></div><div class="msModal" id="msModal" hidden><div class="card" id="msModalCard"></div></div>`);
  document.body.appendChild(wrap);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); MQ.quality(renderer);
  Object.assign(MS, { wrap, renderer, built: true, ui: document.getElementById("msUI") });
  let drag = null;
  cv.addEventListener("pointerdown", (e) => (drag = { x: e.clientX, y: e.clientY }));
  addEventListener("pointerup", () => (drag = null));
  addEventListener("pointermove", (e) => { if (!drag || !MS.S || !MS.S.orbit || MS.S.orbit.locked) return; const o = MS.S.orbit;
    o.yaw -= (e.clientX - drag.x) * 0.005; o.pitch = Math.max(-0.3, Math.min(1.4, o.pitch + (e.clientY - drag.y) * 0.004)); o.dragged = performance.now(); drag = { x: e.clientX, y: e.clientY }; });
  shDraw("idle");
}
// start a new 3D scene. setup(S) fills S.scene / S.camera / S.orbit; S.update(dt, t) runs every frame.
function msScene(key, setup) {
  if (MS.S && MS.S.key === key) return MS.S;
  if (MS.S) { disposeScene(MS.S.scene); }
  MS.labels.forEach((l) => l.el.remove()); MS.labels = [];
  const S = { key, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 5000), t: 0 };
  S.scene.background = new THREE.Color(0x02030a); MS.S = S; setup(S); return S;
}
function msLabel(html, pos, cls = "") { const el = document.createElement("div"); el.className = "acLbl " + cls; el.innerHTML = html; document.getElementById("msLabels").appendChild(el); const o = { el, pos }; MS.labels.push(o); return o; }
function msUnlabel(o) { if (!o) return; o.el.remove(); MS.labels = MS.labels.filter((x) => x !== o); }
const _mp = new THREE.Vector3();
function msLoop() {
  if (!MS.running) return; requestAnimationFrame(msLoop);
  const now = performance.now(), dt = Math.min(0.05, (now - MS.last) / 1000) * (MS.speed || 1); MS.last = now; const S = MS.S; if (!S) return;
  const r = MS.renderer, w = innerWidth, h = innerHeight; if (r.domElement.width !== Math.round(w * r.getPixelRatio()) || r.domElement.height !== Math.round(h * r.getPixelRatio())) r.setSize(w, h);
  if (S.camera.aspect !== w / h) { S.camera.aspect = w / h; S.camera.updateProjectionMatrix(); }
  S.t += dt;
  if (S.orbit) { const o = S.orbit; if (o.auto && (!o.dragged || now - o.dragged > 4000)) o.yaw += o.auto * dt;
    if (o.goal) { ["dist", "yaw", "pitch"].forEach((k) => { if (o.goal[k] !== undefined) o[k] += (o.goal[k] - o[k]) * Math.min(1, dt * 2.5); }); if (o.goal.target) o.target.lerp(o.goal.target, Math.min(1, dt * 2.5)); }
    S.camera.position.set(o.target.x + Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist, o.target.y + Math.sin(o.pitch) * o.dist, o.target.z + Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist); S.camera.lookAt(o.target); }
  if (S.update) S.update(dt, S.t);
  MS.labels.forEach((o) => { const p = typeof o.pos === "function" ? o.pos() : o.pos; if (!p) { o.el.style.display = "none"; return; }
    _mp.copy(p).project(S.camera); const vis = _mp.z < 1 && Math.abs(_mp.x) < 1.1 && Math.abs(_mp.y) < 1.1; o.el.style.display = vis ? "" : "none";
    o.el.style.left = ((_mp.x + 1) / 2) * w + "px"; o.el.style.top = ((1 - _mp.y) / 2) * h + "px"; });
  // keep the 3D subject visible: shift the picture up above the bottom panel and left of the right column
  const pan = document.querySelector("#msUI .msPanel"), hud = !document.getElementById("msHUD").hidden;
  const offY = pan && !pan.classList.contains("mini") ? Math.min(h * 0.32, pan.offsetHeight * 0.5) : 0, offX = hud && w > 900 ? 95 : 0;
  if (S.camera.view === null || !S.camera.view || S.camera.view.offsetY !== offY || S.camera.view.offsetX !== offX || S.camera.view.fullWidth !== w) S.camera.setViewOffset(w, h, offX, offY, w, h);
  if (S.render) S.render(r, offX, offY); else { r.setScissorTest(false); r.setViewport(0, 0, w, h); r.render(S.scene, S.camera); }
}
function msShow() { msInit(); ["intro", "choice", "academy"].forEach((k) => SCREENS[k] && SCREENS[k].hide && SCREENS[k].hide()); MS.wrap.hidden = false; if (!MS.running) { MS.running = true; MS.last = performance.now(); msLoop(); } }
function msHide() { MS.running = false; if (MS.wrap) MS.wrap.hidden = true; if ("speechSynthesis" in window) speechSynthesis.cancel(); }

// ---------- HUD ----------
function hudShow(on, o = {}) { const h = document.getElementById("msHUD"); h.hidden = !on; if (!on) return;
  document.getElementById("msName").innerHTML = o.name || ""; document.getElementById("msTube").hidden = o.budget === false; hudAll(); }
function hudAll() { const m = GAME.mis; if (!m) return; K.set("msPts", K.fmt(m.points)); hudLives(); hudBudget(); hudWeights(); }
function hudLives() { const n = GAME.mis.lives, col = n >= 4 ? "#2fbf71" : n === 3 ? "#f0b93a" : "#e05050";
  K.set("msLives", `<span class="bars">${[1, 2, 3, 4, 5].map((i) => `<i style="height:${4 + i * 3.2}px;background:${i <= n ? col : "#2a3350"}"></i>`).join("")}</span><small>${n} ${n === 1 ? "life" : "lives"}</small>`); }
function hudBudget() { const m = GAME.mis, total = m.budget + m.loan + m.test, left = total - m.spent, frac = Math.max(0, left / total);
  const g = document.getElementById("msGold"); if (g) g.style.height = frac * 100 + "%";
  K.set("msTubeTxt", `$${K.fmt(left)}M`); K.set("msLoanTxt", m.loan ? `incl. loan $${K.fmt(m.loan)}M @ ${m.rate * 100}%` : `of $${K.fmt(total)}M (0% interest)`);
  const t = document.getElementById("msTube"); if (t) t.classList.toggle("low", frac < 0.15); }
function hudWeights() { const m = GAME.mis, box = document.getElementById("msWeights"); if (!box) return; box.hidden = !m.weights.length;
  K.set("msWRows", m.weights.map((w) => `<div class="${w.fresh ? "fresh" : ""}"><span>${w.label}</span><b>${w.t >= 1 ? K.fmt(w.t, w.t < 100 ? 1 : 0) + " t" : K.fmt(w.t * 1000) + " kg"}</b></div>`).join(""));
  K.set("msWTot", `${K.fmt(m.weights.reduce((a, w) => a + w.t, 0), 1)} t`); m.weights.forEach((w) => (w.fresh = false)); }
function msWeight(key, label, t) { const m = GAME.mis, w = m.weights.find((x) => x.key === key); if (w) { w.t = t; w.label = label; w.fresh = true; } else m.weights.push({ key, label, t, fresh: true }); hudWeights(); }
function msWeightDel(key) { const m = GAME.mis; m.weights = m.weights.filter((w) => w.key !== key); hudWeights(); }
function msPoints(n, why) { const m = GAME.mis; m.points += n; m.log.push({ n, why }); K.set("msPts", K.fmt(m.points));
  const el = document.querySelector(".msPts"); if (el) { el.classList.remove("pop", "neg"); void el.offsetWidth; el.classList.add(n >= 0 ? "pop" : "neg"); }
  msToast(`${n >= 0 ? "⭐ +" : "➖ "}${K.fmt(Math.abs(n))} points${why ? ": " + why : ""}`, n < 0); if (n > 0) SND.beep(); }
function msLife(why) { const m = GAME.mis; m.lives = Math.max(0, m.lives - 1); hudLives(); SND.tone(150, 0.6, "sawtooth", 0.07); msToast(`💔 Lifeline lost: ${why}`, true); return m.lives; }
// spend money; if the budget runs out, offer a loan from the US Government
function msSpend(cost, what, done) { const m = GAME.mis, total = m.budget + m.loan + m.test, left = total - m.spent;
  if (cost <= left) { m.spent += cost; hudBudget(); msToast(`💸 $${K.fmt(cost)}M: ${what}`); done && done(true); return true; }
  const max = m.loanMax - m.loan, need = cost - left;
  if (need > max) { msModal(`<h2>💸 Out of money</h2><p>${what} costs <b>$${K.fmt(cost)}M</b>, but you only have <b>$${K.fmt(left)}M</b>, and the US Government won't lend you any more.</p><div class="row"><button class="btn go" onclick="msModalClose()">OK</button><button class="btn ghost" onclick="msModalClose();msTestMoney()">🧪 Test money</button></div>`); done && done(false); return false; }
  msModal(`<h2>🏛️ Loan from the US Government?</h2><p>${what} costs <b>$${K.fmt(cost)}M</b>. You have <b>$${K.fmt(left)}M</b> left.</p>
    <p>Borrow <b>$${K.fmt(need)}M</b> at <b>${m.rate * 100}% interest</b>? You'll pay back <b>$${K.fmt(need * (1 + m.rate))}M</b> from your mission rewards.</p>
    <div class="row"><button class="btn go" id="msLoanYes">🏛️ Take the loan</button><button class="btn ghost" onclick="msModalClose()">No</button><button class="btn ghost" onclick="msModalClose();msTestMoney()">🧪 Test money</button></div>`);
  document.getElementById("msLoanYes").onclick = () => { m.loan += need; msModalClose(); msSpend(cost, what, done); };
  return false; }
function msToast(html, bad) { const t = document.getElementById("msToast"); t.innerHTML = html; t.className = "show" + (bad ? " bad" : ""); clearTimeout(MS.tt); MS.tt = setTimeout(() => (t.className = ""), 2600); }
function msModal(html) { document.getElementById("msModalCard").innerHTML = html; document.getElementById("msModal").hidden = false; }
function msModalClose() { document.getElementById("msModal").hidden = true; }
// info pop-ups on the right ("why?" and myth-busters)
function msInfo(id, title, html) { const box = document.getElementById("msInfos"); if (!box || document.getElementById("inf_" + id)) return;
  const b = document.createElement("button"); b.id = "inf_" + id; b.className = "msInfo"; b.innerHTML = title; b.onclick = () => { SND.click(); msModal(`<h2>${title.replace(/\s*▸\s*$/, "")}</h2>${typeof html === "function" ? html() : html}<div class="row"><button class="btn go" onclick="msModalClose()">Got it 👍</button></div>`); };
  box.prepend(b); }
function msInfoClear() { K.set("msInfos", ""); }

// ---------- StarHunter: the helper astronaut ----------
function shSVG(mood) {
  const face = { happy: "#2fbf71", sad: "#e05050", angry: "#c0392b", idle: "#3a6ea8", think: "#f0b93a" }[mood] || "#3a6ea8";
  const mouth = mood === "happy" ? "M30 47 Q40 57 50 47" : mood === "sad" ? "M31 53 Q40 45 49 53" : mood === "angry" ? "M30 53 Q40 47 50 53" : "M32 50 L48 50";
  const brows = mood === "angry" ? `<path d="M27 33 L37 37 M53 33 L43 37" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` : mood === "sad" ? `<path d="M27 36 L37 33 M53 36 L43 33" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` : "";
  return `<svg viewBox="0 0 120 150" width="120" height="150">
    <rect x="66" y="64" width="50" height="34" rx="6" fill="#ffd27a" stroke="#8a5a0a" stroke-width="2" transform="rotate(-8 90 80)"/>
    <text x="90" y="80" font-size="11" font-weight="700" text-anchor="middle" fill="#3a2600" transform="rotate(-8 90 80)">Any help</text>
    <text x="90" y="93" font-size="11" font-weight="700" text-anchor="middle" fill="#3a2600" transform="rotate(-8 90 80)">needed? 🙋</text>
    <rect x="18" y="72" width="48" height="52" rx="16" fill="#f2f2f2" stroke="#9aa1ad" stroke-width="2"/>
    <rect x="30" y="86" width="24" height="12" rx="3" fill="#2a2f3a"/><circle cx="36" cy="92" r="2" fill="#ff3344"/><circle cx="42" cy="92" r="2" fill="#33ff66"/><circle cx="48" cy="92" r="2" fill="#3399ff"/>
    <path d="M60 84 L76 74" stroke="#f2f2f2" stroke-width="10" stroke-linecap="round"/>
    <rect x="22" y="122" width="14" height="22" rx="5" fill="#f2f2f2" stroke="#9aa1ad"/><rect x="48" y="122" width="14" height="22" rx="5" fill="#f2f2f2" stroke="#9aa1ad"/>
    <circle cx="40" cy="42" r="32" fill="#f7f7f7" stroke="#9aa1ad" stroke-width="2"/>
    <circle cx="40" cy="44" r="24" fill="${face}"/><circle cx="33" cy="36" r="6" fill="rgba(255,255,255,.35)"/>
    ${brows}<circle cx="32" cy="40" r="3.4" fill="#fff"/><circle cx="48" cy="40" r="3.4" fill="#fff"/>
    <path d="${mouth}" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <text x="40" y="146" font-size="10" font-weight="700" text-anchor="middle" fill="#ffd27a">StarHunter</text></svg>`;
}
function shDraw(mood) { const e = document.getElementById("msSH"); if (e) { e.innerHTML = shSVG(mood); e.className = "msSH " + mood; } }
// StarHunter reacts and speaks. mood: happy | sad | angry | think | idle
function sh(mood, text, ms = 6500) {
  shDraw(mood); const b = document.getElementById("msSay"); if (!b) return;
  if (text) { b.innerHTML = `<b>StarHunter:</b> ${text}`; b.className = "msSay show " + mood; clearTimeout(MS.st); MS.st = setTimeout(() => { b.className = "msSay"; shDraw("idle"); }, ms);
    if (typeof crewSpeak === "function") crewSpeak(2, text.replace(/<[^>]+>/g, "")); }
}
function msHelp() { const m = GAME.mis; if (!m) return; SND.click();
  if (!m.hint) return sh("think", "You're doing fine! Nothing to help with right now.");
  m.points -= 50; K.set("msPts", K.fmt(m.points)); msToast("🙋 StarHunter's help: −50 points", true);
  sh("think", m.hint, 9000); }

// testing helper: always available, adds $1 billion
function msTestMoney() { const m = GAME.mis; if (!m) return; m.test += 1000; hudBudget(); msToast("🧪 +$1,000M test money added"); }
// every step panel gets a hide/show button so the 3D view is never blocked
function apPanelToggle(btn) { const p = btn.closest(".msPanel"); p.classList.toggle("mini"); btn.textContent = p.classList.contains("mini") ? "▴ Show" : "▾ Hide"; }
