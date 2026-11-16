// mission/models.js — high-quality 3D models in real metres, with shadows.
// Saturn V heights follow the real rocket (110.6 m). Lunar Module based on the earlier LM explorer.
// Sources: NASA SP-4204 "Moonport"; NASA/Marshall Saturn V data; NASA Apollo 11 press kit.

const MQ = {
  mat: (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.2 }, o)),
  mesh(group, geo, material, y = 0, shadow = true) { const m = new THREE.Mesh(geo, material); m.position.y = y; m.castShadow = shadow; m.receiveShadow = true; group.add(m); return m; },
  strut(group, a, b, r, material) { const d = new THREE.Vector3().subVectors(b, a); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), material);
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.clone().normalize()); m.castShadow = true; group.add(m); return m; },
  // white hull with the black "roll pattern" and optional letters running down the side
  paint(bands, letters) {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 2048; const g = c.getContext("2d");
    g.fillStyle = "#f1f2f3"; g.fillRect(0, 0, 1024, 2048); g.fillStyle = "#17191c";
    bands.forEach(([v0, v1, type]) => { const y = (1 - v1) * 2048, h = (v1 - v0) * 2048; if (type === "solid") g.fillRect(0, y, 1024, h); else { g.fillRect(0, y, 256, h); g.fillRect(512, y, 256, h); } });
    if (letters) { g.font = `bold ${letters.size || 120}px sans-serif`; g.textAlign = "center"; g.fillStyle = letters.color || "#17191c"; let y = (1 - letters.v) * 2048; for (const ch of letters.text) { g.fillText(ch, letters.x || 896, y); y += (letters.size || 120) * 1.12; } }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.1 });
  },
  engine: () => MQ.mat(0x2b2d31, { metalness: 0.65, roughness: 0.4, side: THREE.DoubleSide }),
  // sharp, soft shadows from one sun
  sun(scene, pos, box = 80, size = 4096) {
    const s = new THREE.DirectionalLight(0xffffff, 1.2); s.position.copy(pos); s.castShadow = true; s.shadow.mapSize.set(size, size); s.shadow.bias = -0.0004;
    Object.assign(s.shadow.camera, { left: -box, right: box, top: box * 1.6, bottom: -box * 0.3, near: 1, far: pos.length() * 3 }); scene.add(s); scene.add(s.target); return s;
  },
  quality(renderer) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); },
};

// ================= Saturn V parts (y = 0 is the bottom of each part) =================
const SAT = {
  sic() { const g = new THREE.Group(), m = MQ.mat;
    MQ.mesh(g, new THREE.CylinderGeometry(5.05, 5.05, 39, 64), MQ.paint([[0, 0.2, "q"], [0.6, 0.67, "q"], [0.93, 1, "q"]], { text: "USA", v: 0.55 }), 3 + 19.5);
    MQ.mesh(g, new THREE.CylinderGeometry(5.07, 5.07, 0.3, 64), m(0x17191c), 3);
    const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(4.4, 0); fs.lineTo(4.4, 3.5); fs.lineTo(0, 9); fs.lineTo(0, 0);
    const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.35, bevelEnabled: false }); fg.translate(0, 0, -0.175);
    [45, 135, 225, 315].forEach((d) => { const p = new THREE.Group(); p.rotation.y = d * DEG; g.add(p);
      MQ.mesh(p, fg, m(0x17191c), 1.5).position.x = 5.0; MQ.mesh(p, new THREE.CylinderGeometry(0.6, 1.75, 8, 32), m(0xf1f2f3), 7).position.x = 4.7;
      MQ.mesh(p, new THREE.CylinderGeometry(0.75, 1.85, 5.8, 32, 1, true), MQ.engine(), 2.9).position.x = 3.9; });
    MQ.mesh(g, new THREE.CylinderGeometry(0.75, 1.85, 5.8, 32, 1, true), MQ.engine(), 2.9);
    return g; },
  sii() { const g = new THREE.Group();
    MQ.mesh(g, new THREE.CylinderGeometry(5.05, 5.05, 5.5, 64, 1, true), Object.assign(MQ.paint([[0, 1, "q"]]), { side: THREE.DoubleSide }), 2.75);
    MQ.mesh(g, new THREE.CylinderGeometry(5.05, 5.05, 19.4, 64), MQ.paint([[0.94, 1, "solid"]], { text: "UNITED STATES", v: 0.86, size: 92 }), 5.5 + 9.7);
    [[0, 0], [45, 2.6], [135, 2.6], [225, 2.6], [315, 2.6]].forEach(([d, r]) => { const b = MQ.mesh(g, new THREE.CylinderGeometry(0.35, 1.0, 3.4, 32, 1, true), MQ.engine(), 3.8); b.position.x = Math.cos(d * DEG) * r; b.position.z = Math.sin(d * DEG) * r; });
    return g; },
  sivb() { const g = new THREE.Group();
    MQ.mesh(g, new THREE.CylinderGeometry(3.3, 5.05, 5, 64, 1, true), Object.assign(MQ.paint([]), { side: THREE.DoubleSide }), 2.5);
    MQ.mesh(g, new THREE.CylinderGeometry(0.35, 1.0, 3.4, 32, 1, true), MQ.engine(), 3.2);
    MQ.mesh(g, new THREE.CylinderGeometry(3.3, 3.3, 12.9, 64), MQ.paint([[0, 0.28, "q"]]), 5 + 6.45);
    [1, -1].forEach((s) => (MQ.mesh(g, new THREE.BoxGeometry(1.0, 2.2, 1.4), MQ.mat(0x17191c), 6.5).position.x = 3.6 * s));
    MQ.mesh(g, new THREE.CylinderGeometry(3.32, 3.32, 0.9, 64), MQ.mat(0xcfd3d7, { metalness: 0.45 }), 17.9 + 0.45);   // Instrument Unit (the rocket's brain)
    return g; },
  sla() { const m = MQ.mat(0xd8dde2, { metalness: 0.45, roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.22, depthWrite: false });
    const g = new THREE.Group(); MQ.mesh(g, new THREE.CylinderGeometry(1.95, 3.3, 8.5, 64, 1, true), m, 4.25, false); g.userData.mat = m; return g; },
  sm() { const g = new THREE.Group();
    MQ.mesh(g, new THREE.CylinderGeometry(1.95, 1.95, 3.9, 64), MQ.mat(0xc9ced3, { metalness: 0.75, roughness: 0.3 }), 1.95);
    MQ.mesh(g, new THREE.CylinderGeometry(0.35, 1.25, 2.8, 32, 1, true), MQ.engine(), -1.4);
    [0, 90, 180, 270].forEach((d) => { const q = MQ.mesh(g, new THREE.BoxGeometry(0.4, 0.6, 0.4), MQ.mat(0xe9ecef), 2.6); q.position.x = Math.sin((d + 45) * DEG) * 2.05; q.position.z = Math.cos((d + 45) * DEG) * 2.05; });
    const dish = new THREE.Group(); dish.position.set(-1.9, 0.6, 1.2); g.add(dish); [0, 1, 2, 3].forEach((k) => MQ.mesh(dish, new THREE.CylinderGeometry(0.3, 0.05, 0.2, 16), MQ.mat(0xe9ecef), 0).position.set(k % 2 * 0.62 - 0.3, Math.floor(k / 2) * 0.62 - 0.3, 0));
    return g; },
  cm() { const g = new THREE.Group(), shell = MQ.mat(0xe8eaed, { metalness: 0.75, roughness: 0.28 });
    const body = MQ.mesh(g, new THREE.CylinderGeometry(0.42, 1.95, 3.5, 64), shell, 1.75); g.userData.shell = shell;
    const hatch = MQ.mesh(g, new THREE.BoxGeometry(0.75, 0.8, 0.06), MQ.mat(0xb8bec6, { metalness: 0.6 }), 1.6); hatch.position.x = -1.3; hatch.rotation.y = Math.PI / 2; hatch.rotation.z = -0.5;   // side hatch faces the tower
    [-1, 1].forEach((s) => { const w = MQ.mesh(g, new THREE.BoxGeometry(0.26, 0.26, 0.05), MQ.mat(0x1a2230, { metalness: 0.9, roughness: 0.1 }), 2.1); w.position.set(-0.95, 2.1, s * 0.75); w.rotation.y = Math.PI / 2 - s * 0.5; w.rotation.z = -0.5; });
    g.userData.hatch = hatch; return g; },
  les() { const g = new THREE.Group(), grey = MQ.mat(0xb9bec4, { metalness: 0.45 });
    // the tower's legs sit right on the Command Module's tip, so the whole thing is one piece
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => MQ.strut(g, V3(x * 0.33, -0.25, z * 0.33), V3(x * 0.26, 3.2, z * 0.26), 0.06, grey));
    [1.1, 2.2].forEach((y) => (MQ.mesh(g, new THREE.TorusGeometry(0.36, 0.04, 6, 24), grey, y).rotation.x = Math.PI / 2));
    MQ.mesh(g, new THREE.CylinderGeometry(0.33, 0.33, 4.4, 32), MQ.mat(0xf1f2f3), 3.2 + 2.2);
    MQ.mesh(g, new THREE.CylinderGeometry(0.34, 0.34, 0.5, 32), MQ.mat(0x17191c), 3.6);
    MQ.mesh(g, new THREE.CylinderGeometry(0.06, 0.33, 1.4, 32), MQ.mat(0x17191c), 7.6 + 0.7);
    [0, 1, 2, 3].forEach((k) => { const n = MQ.mesh(g, new THREE.ConeGeometry(0.12, 0.35, 12), MQ.mat(0x333333), 3.4); n.position.x = Math.cos(k * Math.PI / 2) * 0.34; n.position.z = Math.sin(k * Math.PI / 2) * 0.34; });
    return g; },
};
// where each part sits on the stack (metres above the launch deck)
const SAT_Y = { sic: 0, sii: 42, sivb: 66.9, sla: 85.7, lmd: 86.0, lma: 86.0, sm: 94.2, cm: 98.1, les: 101.6 };
const SAT_H = { sic: 42, sii: 24.9, sivb: 18.8, sla: 8.5, lmd: 4, lma: 4, sm: 3.9, cm: 3.5, les: 9 };

// ================= Mobile launcher deck + launch umbilical tower =================
const DECK = 7.6;
function buildLaunchComplex(scene) {
  const red = MQ.mat(0xb3342b, { roughness: 0.7 }), conc = MQ.mat(0x8f9399, { roughness: 0.95 });
  const deck = MQ.mesh(scene, new THREE.BoxGeometry(49, DECK, 41), MQ.mat(0x767a80, { roughness: 0.9 }), DECK / 2);
  const hole = MQ.mesh(scene, new THREE.BoxGeometry(14, 0.1, 14), MQ.mat(0x1a1a1a), DECK + 0.02); hole.receiveShadow = true;
  const apron = new THREE.Mesh(new THREE.BoxGeometry(160, 0.4, 160), conc); apron.position.y = 0.2; apron.receiveShadow = true; scene.add(apron);   // concrete pad
  const tower = new THREE.Group(); tower.position.set(-17, DECK, 0); scene.add(tower); const H = 121;
  [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([x, z]) => { const p = MQ.mesh(tower, new THREE.BoxGeometry(0.9, H, 0.9), red, H / 2); p.position.x = x; p.position.z = z; });
  for (let y = 8; y <= H; y += 8) {
    [-6, 6].forEach((z) => (MQ.mesh(tower, new THREE.BoxGeometry(12, 0.6, 0.6), red, y).position.z = z));
    [-6, 6].forEach((x) => (MQ.mesh(tower, new THREE.BoxGeometry(0.6, 0.6, 12), red, y).position.x = x));
    MQ.strut(tower, V3(-6, y - 8, 6), V3(6, y, 6), 0.22, red); MQ.strut(tower, V3(-6, y - 8, -6), V3(6, y, -6), 0.22, red);
    MQ.strut(tower, V3(6, y - 8, -6), V3(6, y, 6), 0.22, red); MQ.strut(tower, V3(-6, y - 8, -6), V3(-6, y, 6), 0.22, red);
  }
  MQ.mesh(tower, new THREE.BoxGeometry(30, 2, 2), red, H + 1).position.x = 10;                    // hammerhead crane
  const arms = {}; [[20, 5.05], [32, 5.05], [50, 5.05], [63, 5.05], [76, 3.3], [83, 3.3], [90, 2.6], [99.5, 1.95]].forEach(([y, r]) => {
    const len = 11 - r - 0.6, a = MQ.mesh(tower, new THREE.BoxGeometry(len, 1.2, 2), red, y); a.position.x = 6 + len / 2; arms[y] = a; });
  const wr = MQ.mesh(tower, new THREE.BoxGeometry(2.5, 3, 3), MQ.mat(0xe9ecef), 99.5 + 1.0); wr.position.x = 14.2;     // the White Room at the Command Module hatch
  const lift = MQ.mesh(tower, new THREE.BoxGeometry(2.6, 2.6, 2.6), MQ.mat(0xffd27a, { emissive: 0x332200 }), 1.3); lift.position.set(0, 1.3, 0);
  // gantry walkway from the crew area to the tower door, on the deck
  const walk = MQ.mesh(scene, new THREE.BoxGeometry(26, 0.15, 3), MQ.mat(0xb6b9bd, { roughness: 0.9 }), DECK + 0.08); walk.position.set(-2, DECK + 0.08, 14);
  return { tower, arms, lift, whiteRoom: wr, deck };
}
// sky, grass, ocean (Kennedy Space Center feel)
function buildSkyGround(scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 48, 24), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: canvasTex(16, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#08163d"); g.addColorStop(0.35, "#2f6ac4"); g.addColorStop(0.49, "#9ec9f2"); g.addColorStop(0.52, "#d8e9f7"); g.addColorStop(1, "#d8e9f7"); x.fillStyle = g; x.fillRect(0, 0, w, h); }) }));
  scene.add(sky);
  const gt = canvasTex(512, 512, (x, w, h) => { x.fillStyle = "#5d7f45"; x.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${40 + Math.random() * 60},${90 + Math.random() * 60},${30 + Math.random() * 30},.5)`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(40, 40);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(2400, 96), MQ.mat(0xffffff, { map: gt, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(2400, 96, -0.7, 1.4), MQ.mat(0x23609e, { roughness: 0.25, metalness: 0.3 })); sea.rotation.x = -Math.PI / 2; sea.position.set(250, 0.05, 0); scene.add(sea);
  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x40444a, 0.45)); scene.add(new THREE.AmbientLight(0x9fb0c8, 0.25));
}

// ================= Lunar Module (from the LM explorer) =================
// opt.folded = legs folded (inside the rocket). Returns { g, descent, ascent, inside, bodyMat, ascentMats, flame, legs, labels:[{name,obj}] }
function buildLM(opt = {}) {
  const g = new THREE.Group(), descent = new THREE.Group(), ascent = new THREE.Group(); g.add(descent); g.add(ascent);
  const mat = MQ.mat, foil = () => mat(0xd39a35, { metalness: 0.35, roughness: 0.42 }), metal = () => mat(0xb0b6bd, { metalness: 0.7, roughness: 0.3 }),
    hull = () => mat(0xaab3bd, { metalness: 0.5, roughness: 0.45 }), white = () => mat(0xd9dde2, { metalness: 0.3, roughness: 0.4 });
  const add = (grp, geo, m, pos) => { const x = new THREE.Mesh(geo, m); if (pos) x.position.copy(pos); x.castShadow = true; x.receiveShadow = true; grp.add(x); return x; };
  const out = (a) => V3(Math.sin(a), 0, Math.cos(a)), side = (a) => V3(Math.cos(a), 0, -Math.sin(a));
  const R = 2.1, bot = 1.1, top = 2.7, apo = R * Math.cos(Math.PI / 8);
  const bodyMat = foil(); const body = add(descent, new THREE.CylinderGeometry(R, R, top - bot, 8), bodyMat, V3(0, (top + bot) / 2, 0)); body.rotation.y = Math.PI / 8;
  const mesa = add(descent, new THREE.BoxGeometry(0.95, 0.8, 0.06), mat(0xb57a22, { metalness: 0.3, roughness: 0.5 }), out(-Math.PI / 4).multiplyScalar(apo + 0.03).add(V3(0, 1.9, 0))); mesa.rotation.y = -Math.PI / 4;
  add(descent, new THREE.CylinderGeometry(0.35, 0.8, 0.8, 32, 1, true), mat(0x3b3f46, { metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide }), V3(0, 0.75, 0));
  const legs = new THREE.Group(); descent.add(legs);
  const legSet = (folded) => { while (legs.children.length) legs.remove(legs.children[0]);
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((a) => {
      const topP = out(a).multiplyScalar(apo).add(V3(0, 2.35, 0)), foot = folded ? out(a).multiplyScalar(apo + 0.35).add(V3(0, 0.9, 0)) : out(a).multiplyScalar(4.2).add(V3(0, 0.2, 0));
      MQ.strut(legs, topP, foot, 0.09, metal()); const mid = topP.clone().lerp(foot, 0.55);
      [-1, 1].forEach((s) => MQ.strut(legs, out(a).multiplyScalar(apo * 0.98).add(side(a).multiplyScalar(0.8 * s)).add(V3(0, 1.2, 0)), mid, 0.05, metal()));
      const pad = add(legs, new THREE.CylinderGeometry(0.45, 0.5, 0.14, 24), metal(), foot.clone().add(V3(0, -0.13, 0)));
      if (!folded && a !== 0) { const p0 = out(a).multiplyScalar(4.4).add(V3(0, 0.05, 0)), p1 = out(a).multiplyScalar(4.75).add(side(a).multiplyScalar(0.25)).add(V3(0, 0.03, 0)), p2 = out(a).multiplyScalar(5.3).add(side(a).multiplyScalar(0.35)).add(V3(0, 0.03, 0));
        MQ.strut(legs, p0, p1, 0.025, white()); MQ.strut(legs, p1, p2, 0.025, white()); } });
    if (!folded) { add(legs, new THREE.BoxGeometry(1.1, 0.06, 0.7), white(), V3(0, 2.72, 2.2));
      [-0.28, 0.28].forEach((x) => MQ.strut(legs, V3(x, 2.55, 2.05), V3(x, 0.55, 4.0), 0.03, white()));
      for (let i = 0; i < 9; i++) { const k = (i + 0.5) / 9, p = V3(0, 2.55, 2.05).lerp(V3(0, 0.55, 4.0), k); MQ.strut(legs, V3(-0.28, p.y, p.z), V3(0.28, p.y, p.z), 0.022, white()); } } };
  legSet(!!opt.folded);
  // inside the descent stage: 4 propellant tanks in a cross, the engine in the middle, and 4 corner bays (quads)
  const inside = new THREE.Group(); inside.visible = false; descent.add(inside); const labels = [];
  [-1, 1].forEach((s) => { const f = add(inside, new THREE.SphereGeometry(0.6, 32, 20), mat(0x2f6a8c, { metalness: 0.5 }), V3(1.15 * s, 1.9, 0)); f.scale.y = 1.15; labels.push({ name: "⛽ Fuel tank", obj: f });
    const o = add(inside, new THREE.SphereGeometry(0.6, 32, 20), mat(0x8c8f99, { metalness: 0.5 }), V3(0, 1.9, 1.15 * s)); o.scale.y = 1.15; labels.push({ name: "🫁 Oxidizer tank", obj: o }); });
  add(inside, new THREE.CylinderGeometry(0.3, 0.3, 0.8, 20), mat(0x3b3f46), V3(0, 1.6, 0));
  const quads = {}; [["q4", "🧰 Quad 4: tools, TV camera + 🇺🇸 flag", -Math.PI / 4], ["q1", "🚙 Quad 1: folded Moon buggy", Math.PI / 4], ["q2", "🔬 Quad 2: science experiments", 3 * Math.PI / 4], ["q3", "🔦 Quad 3: laser mirror + 🤖 PROMISE rover", -3 * Math.PI / 4]]
    .forEach(([k, name, a]) => { const q = add(inside, new THREE.BoxGeometry(0.7, 1.2, 0.7), mat(0x7a5418, { metalness: 0.4, emissive: 0x221100 }), out(a).multiplyScalar(1.45).add(V3(0, 1.9, 0))); q.rotation.y = a; quads[k] = q; labels.push({ name, obj: q, quad: true }); });
  // ascent stage
  const am = []; const A = (geo, m, pos) => { const x = add(ascent, geo, m, pos); am.push(x.material); return x; };
  A(new THREE.BoxGeometry(2.7, 1.7, 2.0), hull(), V3(0, 3.6, 0.1)); A(new THREE.BoxGeometry(2.1, 1.3, 1.0), mat(0x8e979f, { metalness: 0.5, roughness: 0.5 }), V3(0, 3.9, -1.4));
  const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(0.62, 0.12); ws.lineTo(0.12, 0.62); ws.lineTo(0, 0);
  const wm = () => mat(0x1a2230, { metalness: 0.9, roughness: 0.1, side: THREE.DoubleSide }); A(new THREE.ShapeGeometry(ws), wm(), V3(-0.95, 3.75, 1.105)); A(new THREE.ShapeGeometry(ws), wm(), V3(0.95, 3.75, 1.105)).scale.x = -1;
  const hatch = A(new THREE.BoxGeometry(0.8, 0.8, 0.05), mat(0x8d96a1, { metalness: 0.4 }), V3(0, 3.2, 1.12));
  A(new THREE.CylinderGeometry(0.42, 0.42, 0.45, 24), hull(), V3(0, 4.67, 0.1)); A(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 24), white(), V3(0, 4.93, 0.1));
  const dish = (from, to, tilt) => { MQ.strut(ascent, from, to, 0.04, white()); const d = A(new THREE.CylinderGeometry(0.45, 0.08, 0.12, 24), white(), to); d.rotation.x = tilt; };
  dish(V3(-0.9, 4.45, 0.7), V3(-1.1, 4.95, 0.95), Math.PI / 3); dish(V3(1.0, 4.45, -0.6), V3(1.25, 5.0, -0.8), -Math.PI / 4);
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => { const b = V3(1.6 * sx, 4.1, 1.0 * sz); MQ.strut(ascent, V3(1.3 * sx, 4.1, 0.8 * sz), b, 0.04, hull()); A(new THREE.BoxGeometry(0.28, 0.28, 0.28), white(), b); });
  A(new THREE.CylinderGeometry(0.2, 0.42, 0.6, 24, 1, true), mat(0x2b2f36, { metalness: 0.5, side: THREE.DoubleSide }), V3(0, 2.45, 0));
  const flame = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.05, 2.2, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); flame.position.y = 1.05; flame.visible = false; ascent.add(flame);
  const dflame = K.flame(0.7, 3); dflame.position.y = 0.4; dflame.visible = false; descent.add(dflame);
  const lm = { g, descent, ascent, inside, bodyMat, ascentMats: am, flame, dflame, legSet, quads, labels, hatch, mesa };
  lm.seeInside = (on) => { inside.visible = on; mesa.visible = !on; bodyMat.transparent = on; bodyMat.opacity = on ? 0.18 : 1; bodyMat.depthWrite = !on; bodyMat.needsUpdate = true;
    am.forEach((m) => { m.transparent = on; m.opacity = on ? 0.15 : 1; m.depthWrite = !on; m.needsUpdate = true; }); };
  return lm;
}

// ================= Command + Service Module (close-up, for the equipment step) =================
function buildCSM() {
  const g = new THREE.Group(); const sm = SAT.sm(); g.add(sm); const cm = SAT.cm(); cm.position.y = 3.9; g.add(cm);
  const shield = MQ.mesh(cm, new THREE.CylinderGeometry(1.98, 1.9, 0.35, 64), MQ.mat(0x6b4426, { roughness: 0.95 }), -0.1);    // heat shield on the blunt end
  return { g, sm, cm, shield };
}
