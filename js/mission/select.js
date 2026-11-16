// mission/select.js — "Play the mission": choose a mission (3D background shows each route) + the Budget page.

const MISSIONS = [
  { id: "budget", ico: "💰", name: "Budget & loans", sub: "See your money, loans and the rules", tag: "START HERE" },
  { id: "flyby", ico: "🌙", name: "Fly around the Moon", stars: 1, sub: "Like Apollo 8 and Artemis II · Science ×1", soon: true },
  { id: "land", ico: "👣", name: "Land & return", stars: 2, sub: "A quick landing and home · Science ×2", soon: true },
  { id: "apollo", ico: "🦅", name: "Apollo 11+", stars: 3, sub: "Land, drive a rover, plant the flag, science and rocks · Science ×4", star: true, tag: "PLAY" },
  { id: "art3", ico: "🔗", name: "Artemis III test", sub: "NASA's 2027 plan: dock with the new Moon landers in Earth orbit", soon: true },
  { id: "art4", ico: "🏗️", name: "Artemis IV+ & Moon colony", stars: 3, sub: "Gas station in Earth orbit, South Pole base", star: true, tag: "NEXT", soon: true },
  { id: "iss", ico: "🛰️", name: "Go to the ISS", stars: 1, sub: "Rendezvous and dock with the space station", soon: true },
  { id: "mars", ico: "🔴", name: "Go to Mars", sub: "🔒 Unlocks when you have built the Moon colony", locked: true },
];

SCREENS.design = {
  show() {
    msShow(); hudShow(false); if (!GAME.mis) misNew("menu");
    msScene("menu", (S) => {
      const s = S.scene; K.space({ scene: s }, 4000, 1.1);
      const earth = K.earth(3.4, V3(-15, -6.5, -12), s), moon = K.moon(1.2, V3(15, 5.5, -14), s);
      const route = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xffd27a, dashSize: 0.5, gapSize: 0.3 })); s.add(route);
      const ship = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), K.basic(0xffd27a)); ship.add(glowSprite("rgba(255,210,122,0.9)", 1)); s.add(ship);
      S.st = { earth, moon, route, ship, pts: [] };
      S.orbit = { target: V3(0, 0, -6), dist: 22, yaw: 0, pitch: 0.12, auto: 0, locked: true };
      S.update = (dt, t) => { earth.userData.e.rotation.y += dt * 0.08; moon.rotation.y += dt * 0.02; S.orbit.yaw = Math.sin(t * 0.08) * 0.15;
        const P = S.st.pts; if (P.length > 1) { const k = (t * 0.12) % 1, i = Math.floor(k * (P.length - 1)); ship.position.lerpVectors(P[i], P[i + 1], k * (P.length - 1) - i); ship.visible = true; } else ship.visible = false; };
      menuRoute("apollo");
    });
    MS.ui.innerHTML = `<div class="mHead"><div class="kicker">🚀 Play the mission</div><h2>Where are we going?</h2><p>Pick a mission. Your budget, lifelines and points follow you everywhere.</p></div>
      <div class="mGrid">${MISSIONS.map((m) => `<button class="mCard ${m.star ? "star" : ""} ${m.soon ? "soon" : ""} ${m.locked ? "locked" : ""}" onmouseenter="menuRoute('${m.id}')" onclick="menuPick('${m.id}')">
        ${m.tag || m.soon || m.locked ? `<span class="tag">${m.locked ? "LOCKED" : m.tag || "SOON"}</span>` : ""}<span class="ico">${m.ico}</span><b>${m.name}</b>
        ${m.stars ? `<span class="stars">${"★".repeat(m.stars)}${"☆".repeat(3 - m.stars)}</span>` : ""}<small>${m.sub}</small></button>`).join("")}</div>
      <div class="mFoot"><button class="btn ghost" onclick="SND.click();menuBack()">← Back to the crew</button><button class="btn ghost" onclick="SND.click();showScreen('academy')">🎓 Training Academy</button></div>`;
  },
  hide() { msHide(); },
};
function menuBack() { if (typeof ROOM !== "undefined" && ROOM.built) showScreen("choice"); else showScreen("intro"); }
// draw each mission's path in the 3D background
function menuRoute(id) {
  const S = MS.S; if (!S || S.key !== "menu") return; const E = S.st.earth.position, M = S.st.moon.position; let pts = [];
  const curve = (arr) => new THREE.CatmullRomCurve3(arr).getPoints(120);
  if (id === "flyby" || id === "apollo" || id === "land" || id === "budget") pts = curve([E.clone().add(V3(3.3, 0.5, 0)), V3(-1, 3, -7), M.clone().add(V3(-1.6, 1.2, 0)), M.clone().add(V3(0.8, 1.6, 0)), M.clone().add(V3(1.6, 0, 0)), M.clone().add(V3(0.2, -1.6, 0)), V3(1, -1.5, -7), E.clone().add(V3(3.2, -0.8, 0))]);
  if (id === "art3" || id === "iss") { pts = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2; pts.push(E.clone().add(V3(Math.cos(a) * 4.2, Math.sin(a) * 1.2, Math.sin(a) * 4.2))); } }
  if (id === "art4") pts = curve([E.clone().add(V3(3.5, 0, 0)), E.clone().add(V3(0, 3.6, 2)), E.clone().add(V3(-3.5, 0, 0)), E.clone().add(V3(0, -2, 3)), V3(0, 2, -7), M.clone().add(V3(0, 3, 0)), M.clone().add(V3(0, -3.5, 0))]);
  if (id === "mars") pts = curve([E.clone().add(V3(3.3, 0, 0)), V3(4, 6, -12), V3(20, 8, -30)]);
  S.st.pts = pts; S.st.route.geometry.dispose(); S.st.route.geometry = new THREE.BufferGeometry().setFromPoints(pts.length ? pts : [V3(), V3()]); S.st.route.computeLineDistances();
}
function menuPick(id) {
  SND.click(); const m = MISSIONS.find((x) => x.id === id);
  if (id === "budget") return budgetPage();
  if (m.locked) return msModal(`<h2>🔒 Mars is locked</h2><p>A trip to Mars takes around <b>6 to 9 months</b> each way, and the crew must live far from home for over 2 years. First prove you can <b>live on the Moon</b>: build the <b>Moon colony</b> in Artemis IV+ and future plans.</p><div class="row"><button class="btn go" onclick="msModalClose()">OK</button></div>`);
  if (m.soon) return msModal(`<h2>${m.ico} ${m.name}</h2><p>This mission is being built next. Start with <b>🦅 Apollo 11+</b>, the full mission!</p><div class="row"><button class="btn go" onclick="msModalClose();menuPick('apollo')">🦅 Play Apollo 11+</button><button class="btn ghost" onclick="msModalClose()">Close</button></div>`);
  if (id === "apollo") showScreen("apollo");
}
// ---------- the Budget page ----------
function budgetPage() {
  const m = GAME.mis || misNew("menu"), max = m.loanMax;
  msModal(`<h2>💰 Budget, loans and rules</h2>
    <div class="lcRow" style="align-items:center"><div style="flex:1 1 220px"><div class="kv"><span>Mission budget (given to you, 0% interest)</span><b>$${K.fmt(m.budget)} million</b></div>
      <div class="kv"><span>Extra loan from the US Government (up to $1,000M)</span><b id="bgL">$${K.fmt(m.loan)}M</b></div><input class="slider" type="range" min="0" max="${max}" step="50" value="${m.loan}" oninput="budgetLoan(+this.value)">
      <div class="kv"><span>You'll pay back (15% interest)</span><b id="bgP">$${K.fmt(m.loan * 1.15)}M</b></div></div>
      <div class="tube" style="flex:0 0 58px"><i id="bgGold" style="height:${((m.budget + m.loan) / (m.budget + max)) * 100}%"></i></div></div>
    <ul>
      <li>💸 Everything costs money: the rocket, the spacecraft, the rover, safety systems. Watch the <b>gold cylinder</b>.</li>
      <li>🏛️ Need more? Borrow up to <b>$1 billion</b> extra from the US Government at <b>15% interest</b>.</li>
      <li>⭐ Good decisions earn <b>points</b>. At the end, <b>1,000 points = $1 million</b>. Your rewards pay back the loan first; the rest goes to the US Government.</li>
      <li>📶 You have <b>5 lifelines</b>. Big mistakes in flight cost a lifeline. Lose all 5 and the mission is over.</li>
      <li>🙋 <b>StarHunter</b> will help when you click him, but each hint costs <b>50 points</b>.</li>
      <li>🚀 Every kilogram counts: heavier spacecraft need bigger rockets and more fuel.</li>
      <li>🧪 Testing? The <b>+$1B test money</b> button is always there.</li></ul>
    <div class="row"><button class="btn go" onclick="msModalClose()">Got it 👍</button></div>`);
}
function budgetLoan(v) { const m = GAME.mis; m.loan = v; K.set("bgL", `$${K.fmt(v)}M`); K.set("bgP", `$${K.fmt(v * 1.15)}M`); const g = document.getElementById("bgGold"); if (g) g.style.height = ((m.budget + v) / (m.budget + m.loanMax)) * 100 + "%"; }
