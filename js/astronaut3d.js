// astronaut3d.js — the Commander Elvin astronaut (from commander-elvin.html) as a reusable model.
// makeAstronaut({ face: true }) shows Elvin's 3D face inside the helmet; face: false = gold visor down.
// Model units: about 6.2 tall, so scale 0.29 → 1.8 m. Feet at y = -3.75 (model units).

function makeAstronaut(opt = {}) {
  const white = new THREE.MeshStandardMaterial({ color: opt.suit || 0xf2f2f2, roughness: .65 });   // opt.suit = suit colour
  const grey = new THREE.MeshStandardMaterial({ color: 0x8a8f99, roughness: .5, metalness: .3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: .6 });
  const S = new THREE.SphereGeometry(1, 32, 20), C = new THREE.CylinderGeometry(1, 1, 1, 24);
  const astro = new THREE.Group();
  const blob = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = astro) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; };
  if (opt.part) astro.userData.part = opt.part;

  // body, backpack (PLSS) with its radio antenna, neck ring
  const body = blob(S, white, 0, -1.25, 0, 1.15, 1.35, 0.85);
  const pack = blob(new THREE.BoxGeometry(1.5, 2.0, 0.9), grey, 0, -1.0, -0.95);
  blob(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), grey, 0.45, 0.35, -1.1);                       // backpack radio antenna
  blob(new THREE.TorusGeometry(0.78, 0.13, 16, 48), grey, 0, 0.05, 0).rotation.x = Math.PI / 2;
  const box = blob(new THREE.BoxGeometry(0.8, 0.45, 0.22), dark, 0, -1.55, 0.78);
  const lights = [0xff3344, 0x33ff66, 0x3399ff].map((c, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6), new THREE.MeshBasicMaterial({ color: c })); m.position.set(-0.22 + i * 0.22, 0, 0.12); box.add(m); return m; });
  // US flag patch on the shoulder + name tag
  const flagTex = canvasTex(160, 100, (x, w, h) => { for (let i = 0; i < 13; i++) { x.fillStyle = i % 2 ? "#fff" : "#b22234"; x.fillRect(0, i * h / 13, w, h / 13 + 1); } x.fillStyle = "#3c3b6e"; x.fillRect(0, 0, w * 0.42, h * 0.54); });
  blob(new THREE.PlaneGeometry(0.42, 0.26), new THREE.MeshBasicMaterial({ map: flagTex }), -0.62, -0.62, 0.8).rotation.y = -0.5;
  const tagTex = canvasTex(320, 90, (x, w, h) => { x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.fillStyle = "#c0182b"; x.fillRect(0, 0, w, 10); x.fillStyle = "#111"; x.font = "bold 44px Arial"; x.textAlign = "center"; x.fillText(opt.name || "CDR ELVIN", w / 2, h * 0.72); });
  blob(new THREE.PlaneGeometry(0.6, 0.17), new THREE.MeshBasicMaterial({ map: tagTex }), 0.48, -0.78, 0.9).rotation.y = 0.45;
  if (opt.stripe) [-1, 1].forEach((s) => { const b = blob(new THREE.TorusGeometry(0.33, 0.06, 8, 24), new THREE.MeshStandardMaterial({ color: opt.stripe }), s * 1.05, -1.0, 0); b.rotation.x = Math.PI / 2; });   // coloured arm bands
  if (opt.cdr !== false) [-1, 1].forEach((s) => blob(new THREE.BoxGeometry(0.06, 0.3, 0.06), new THREE.MeshStandardMaterial({ color: 0xc0392b }), s * 1.0, -0.9, 0.35));   // red commander stripes

  // legs on hip pivots (so they can walk), boots with ribbed overshoes
  const legs = [-1, 1].map((s) => {
    const hip = new THREE.Group(); hip.position.set(s * 0.45, -2.25, 0); astro.add(hip);
    blob(C, white, 0, -0.6, 0, 0.36, 1.2, 0.36, hip);
    blob(S, white, 0, -1.2, 0.02, 0.38, 0.3, 0.42, hip);
    blob(new THREE.BoxGeometry(0.62, 0.22, 0.95), new THREE.MeshStandardMaterial({ color: 0xe9e9e9, roughness: .8 }), 0, -1.38, 0.14, 1, 1, 1, hip);   // overshoe
    blob(new THREE.BoxGeometry(0.64, 0.06, 0.97), new THREE.MeshStandardMaterial({ color: 0x2f6fd6 }), 0, -1.5, 0.14, 1, 1, 1, hip);                   // blue ribbed sole
    return hip;
  });
  // arms (simple mitts for speed; the face model is the star)
  const arms = [-1, 1].map((s) => {
    const sh = new THREE.Group(); sh.position.set(s * 1.05, -0.55, 0); astro.add(sh);
    blob(S, white, 0, 0, 0, 0.42, 0.42, 0.42, sh); blob(C, white, 0, -0.35, 0, 0.3, 0.6, 0.3, sh);
    const el = new THREE.Group(); el.position.y = -0.68; sh.add(el);
    blob(S, white, 0, 0, 0, 0.29, 0.29, 0.29, el); blob(C, white, 0, -0.3, 0, 0.27, 0.55, 0.27, el);
    blob(new THREE.TorusGeometry(0.24, 0.05, 8, 24), new THREE.MeshStandardMaterial({ color: 0xb8bcc6, metalness: .8, roughness: .3 }), 0, -0.6, 0).rotation.x = Math.PI / 2;
    blob(S, new THREE.MeshStandardMaterial({ color: 0x5c6a85, roughness: .8 }), 0, -0.82, 0.02, 0.25, 0.3, 0.17, el);          // glove
    sh.userData.elbow = el; return sh;
  });

  // helmet
  const head = new THREE.Group(); head.position.y = 1.15; astro.add(head);
  const inner = blob(S, new THREE.MeshStandardMaterial({ color: 0x1a2133, side: THREE.BackSide }), 0, 0, 0, 1.12, 1.12, 1.12, head);
  const FRONT = Math.PI / 2;
  const shell = (r, t0, t1, p0, p1, mat, parent, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 24, p0, p1, t0, t1 - t0), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m; };
  if (opt.faceTex || (opt.face && typeof ELVIN_FACE !== "undefined")) {
    const person = new THREE.Group(); person.scale.setScalar(1.18); person.position.y = 0.12; head.add(person);
    const L = new THREE.TextureLoader(), faceTex = opt.faceTex || L.load(ELVIN_FACE), depthTex = opt.depthTex || L.load(ELVIN_DEPTH);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x000000, map: faceTex, emissive: 0xffffff, emissiveMap: faceTex, displacementMap: depthTex, displacementScale: 0.5, transparent: true, alphaTest: 0.35 });
    const fw = 1.85, fh = fw * 1000 / 768;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh, 128, 166), faceMat); face.position.set(0.077, 0.1, -0.25); person.add(face);
    const capWhite = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: .9, side: THREE.DoubleSide });
    const capBlack = new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: .8, side: THREE.DoubleSide });
    const CAP = [0, -0.15, -0.35, 1, 1.15, 1];
    shell(0.62, 0, 0.93, 0, Math.PI * 2, capWhite, person, ...CAP);
    shell(0.625, 0.93, 2.25, FRONT + 0.9, Math.PI * 2 - 1.8, capBlack, person, ...CAP);
    [-1, 1].forEach((s) => { const cup = blob(C, capBlack, s * 0.64, -0.38, -0.3, 0.2, 0.12, 0.2, person); cup.rotation.z = Math.PI / 2; });
    const mic = new THREE.CatmullRomCurve3([V3(-0.68, -0.42, -0.22), V3(-0.62, -0.6, 0.02), V3(-0.3, -0.66, 0.22)]);
    person.add(new THREE.Mesh(new THREE.TubeGeometry(mic, 16, 0.022, 6), capBlack));
  }
  const glass = blob(S, new THREE.MeshPhongMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.12, shininess: 120, specular: 0xffffff, depthWrite: false }), 0, 0, 0, 1.15, 1.15, 1.15, head);
  glass.renderOrder = 2;
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: .45, side: THREE.DoubleSide });
  const helmet = [glass, inner];                                                          // parts that come off when the helmet is removed
  helmet.push(shell(1.22, 0, 0.55, 0, Math.PI * 2, shellMat, head));
  helmet.push(shell(1.22, 0.55, 2.0, FRONT + 1.15, Math.PI * 2 - 2.3, shellMat, head));
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a520, metalness: 0.9, roughness: 0.2, emissive: 0x3a2600, transparent: !opt.visorDown, opacity: opt.visorDown ? 1 : 0.92, side: THREE.DoubleSide });
  if (opt.visorDown) helmet.push(shell(1.25, 0.42, 2.1, FRONT - 1.1, 2.2, gold, head));          // visor down: no face visible
  else helmet.push(shell(1.25, 0.42, 1.0, FRONT - 1.1, 2.2, gold, head));                       // visor up: you can see Elvin
  // a big invisible box so clicking anywhere on the astronaut works
  const hit = new THREE.Mesh(new THREE.BoxGeometry(3, 6.5, 2.4), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = -0.6; astro.add(hit);
  if (opt.part) { hit.userData.part = opt.part; S3.pickable.push(hit); }
  astro.userData = { legs, arms, head, lights, part: opt.part, helmet, suitMat: white };
  return astro;
}
// walking pose: phase in radians, amount 0..1 (0 = standing)
function poseAstronaut(a, phase, amount = 1, t = 0) {
  const u = a.userData, s = Math.sin(phase) * 0.45 * amount;
  u.legs[0].rotation.x = s; u.legs[1].rotation.x = -s;
  u.arms[0].rotation.x = -s * 0.7; u.arms[1].rotation.x = s * 0.7;
  u.arms[0].rotation.z = -0.15; u.arms[1].rotation.z = 0.15;
  u.lights.forEach((l, i) => (l.visible = Math.sin(t * 3 + i * 2) > -0.3));
}
