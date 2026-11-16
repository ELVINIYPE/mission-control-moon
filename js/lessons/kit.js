// kit.js — shared 3D models and controls for the Training Academy lessons.
const K = {
  mat: (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6 }, o)),
  basic: (color, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color }, o)),
  space(L, stars = 3500, sun = 1.1) { starfield(L.scene, stars); return acadLights(L.scene, sun); },
  earth(r, pos, scene) {
    const g = new THREE.Group(); if (pos) g.position.copy(pos);
    const e = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), K.mat(0xffffff, { map: earthTexture(), roughness: 0.7 })); g.add(e);
    const c = new THREE.Mesh(new THREE.SphereGeometry(r * 1.012, 64, 48), new THREE.MeshStandardMaterial({ map: cloudTexture(), transparent: true, depthWrite: false })); g.add(c);
    const gl = glowSprite("rgba(90,170,255,0.45)", r * 2.9); g.add(gl);
    g.userData = { e, c }; if (scene) scene.add(g); return g;
  },
  moon(r, pos, scene) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), K.mat(0xffffff, { map: moonTexture(), roughness: 1 })); if (pos) m.position.copy(pos); if (scene) scene.add(m); return m; },
  sun(size, pos, scene) { const s = glowSprite("rgba(255,230,160,1)", size); s.position.copy(pos); scene.add(s); const l = new THREE.PointLight(0xfff0d0, 1.4, 0); l.position.copy(pos); scene.add(l); return s; },
  ring(r, color = 0x7fd4ff, op = 0.45, scene) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, Math.max(0.01, r * 0.004), 6, 200), K.basic(color, { transparent: true, opacity: op })); m.rotation.x = Math.PI / 2; if (scene) scene.add(m); return m; },
  // a simple rocket made of stages (bottom first). Returns { g, stages[], top, h }
  rocket(o = {}) {
    const g = new THREE.Group(), n = o.stages || 3, w = o.w || 0.5, stages = []; let y = 0;
    const H = o.heights || [2.2, 1.5, 0.9].slice(0, n);
    for (let i = 0; i < n; i++) {
      const s = new THREE.Group(); s.position.y = y; g.add(s);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(w * (1 - i * 0.1), w * (1 - i * 0.1), H[i], 32), K.mat(i % 2 ? 0xf2f2f2 : 0xeeeeee)); body.position.y = H[i] / 2; s.add(body);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(w * (1 - i * 0.1) * 1.01, w * (1 - i * 0.1) * 1.01, H[i] * 0.12, 32), K.mat(0x222222)); band.position.y = H[i] * 0.85; s.add(band);
      const bell = new THREE.Mesh(new THREE.ConeGeometry(w * 0.45, w * 0.6, 16, 1, true), K.mat(0x444444, { side: THREE.DoubleSide, metalness: 0.6 })); bell.position.y = -w * 0.25; s.add(bell);
      if (i === 0) for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, w * 0.7), K.mat(0x222222)); const a = k * Math.PI / 2 + Math.PI / 4; f.position.set(Math.cos(a) * w, 0.3, Math.sin(a) * w); f.rotation.y = -a; s.add(f); }
      const fl = K.flame(w * 0.8, w * 3.2); fl.position.y = -w * 0.55; fl.visible = false; s.add(fl); s.userData = { flame: fl, h: H[i] };
      stages.push(s); y += H[i];
    }
    const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.7, w * 1.3, 32), K.mat(0xdddddd, { metalness: 0.3 })); cap.position.y = y + w * 0.65; g.add(cap);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, w * 1.6, 6), K.mat(0xcc3322)); tower.position.y = y + w * 1.9; g.add(tower);
    return { g, stages, top: cap, tower, h: y + w * 2.7 };
  },
  flame(r, len) {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, len, 20, 1, true), K.basic(0xffa040, { transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); c.rotation.x = Math.PI; c.position.y = -len / 2; g.add(c);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, len * 0.6, 16, 1, true), K.basic(0xffffcc, { transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); c2.rotation.x = Math.PI; c2.position.y = -len * 0.3; g.add(c2);
    const gl = glowSprite("rgba(255,170,60,0.8)", r * 6); gl.position.y = -len * 0.3; g.add(gl);
    return g;
  },
  capsule(s = 1) {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.5 * s, 0.6 * s, 32), K.mat(0xd8dade, { metalness: 0.5, roughness: 0.35 })); cone.position.y = 0.3 * s; g.add(cone);
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.52 * s, 0.5 * s, 0.08 * s, 32), K.mat(0x5a3a22, { roughness: 0.9 })); g.add(shield);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.1 * s, 0.02), K.basic(0x223355)); win.position.set(0, 0.35 * s, 0.33 * s); win.rotation.x = -0.6; g.add(win);
    g.userData.shield = shield; return g;
  },
  lander(s = 1) {
    const g = new THREE.Group(), gold = K.mat(0xd9a520, { metalness: 0.7, roughness: 0.35 });
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.6 * s, 0.6 * s, 0.5 * s, 8), gold); d.position.y = 0.6 * s; g.add(d);
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.8 * s, 0.6 * s, 0.8 * s), K.mat(0xcfd3da, { metalness: 0.4 })); a.position.y = 1.15 * s; g.add(a);
    for (let i = 0; i < 4; i++) { const ang = i * Math.PI / 2 + Math.PI / 4, l = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.9 * s, 6), K.mat(0xaaaaaa));
      l.position.set(Math.cos(ang) * 0.7 * s, 0.35 * s, Math.sin(ang) * 0.7 * s); l.rotation.set(Math.sin(ang) * 0.45, 0, -Math.cos(ang) * 0.45); g.add(l);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.03 * s, 12), K.mat(0xaaaaaa)); pad.position.set(Math.cos(ang) * 0.9 * s, 0.0, Math.sin(ang) * 0.9 * s); g.add(pad); }
    const fl = K.flame(0.25 * s, 1.4 * s); fl.position.y = 0.3 * s; fl.visible = false; g.add(fl); g.userData.flame = fl; return g;
  },
  ground(L, size = 160, color = 0xb8b8bc) {
    const gg = new THREE.PlaneGeometry(size, size, 100, 100); gg.rotateX(-Math.PI / 2);
    const p = gg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z); p.setY(i, d < 12 ? 0 : (Math.sin(x * 0.15) * Math.cos(z * 0.12) * 1.2 + Math.sin(x * 0.05 + z * 0.07) * 2) * Math.min(1, (d - 12) / 20)); }
    gg.computeVertexNormals(); const t = moonTexture(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(size / 16, size / 16);
    const m = new THREE.Mesh(gg, K.mat(color, { map: t, roughness: 1 })); L.scene.add(m); return m;
  },
  // a growing line (orbit paths, trails)
  trail(scene, color = 0xffd27a, max = 2000, op = 0.9) {
    const pos = new Float32Array(max * 3), geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setDrawRange(0, 0);
    const line = new THREE.Line(geo, K.basic(color, { transparent: true, opacity: op })); line.frustumCulled = false; scene.add(line); let n = 0;
    return { line, push(v) { if (n >= max) { pos.copyWithin(0, 3); n--; } pos[n * 3] = v.x; pos[n * 3 + 1] = v.y; pos[n * 3 + 2] = v.z; n++; geo.setDrawRange(0, n); geo.attributes.position.needsUpdate = true; },
      clear() { n = 0; geo.setDrawRange(0, 0); }, get n() { return n; } };
  },
  line(scene, pts, color = 0xffffff, op = 0.6, dashed) {
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const m = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: op }) : K.basic(color, { transparent: true, opacity: op });
    const l = dashed ? new THREE.Line(geo, m) : new THREE.Line(geo, m); if (dashed) l.computeLineDistances(); scene.add(l); return l;
  },
  ellipse(a, e, rot = 0, n = 200) { const pts = []; for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2, r = a * (1 - e * e) / (1 + e * Math.cos(t)); pts.push(V3(Math.cos(t + rot) * r, 0, -Math.sin(t + rot) * r)); } return pts; },
  // ----- controls (HTML) -----
  slider(id, label, min, max, step, val, fn) { return `<div style="flex:1 1 230px"><div class="kv"><span>${label}</span><b id="${id}V"></b></div><input class="slider" id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" oninput="${fn}(this.value)"></div>`; },
  set(id, html) { const e = document.getElementById(id); if (e) e.innerHTML = html; },
  meter(id, label) { return `<div style="flex:1 1 220px"><div class="kv"><span>${label}</span><b id="${id}T"></b></div><div class="meter"><i id="${id}" style="width:0%"></i></div></div>`; },
  setMeter(id, frac, text, color) { const e = document.getElementById(id); if (e) { e.style.width = Math.max(0, Math.min(1, frac)) * 100 + "%"; if (color) e.style.background = color; } K.set(id + "T", text); },
  picks(items, onclick, on) { return items.map((it) => `<button class="pick ${on && on(it) ? "on" : ""}" onclick="${onclick}('${it.id}')" ${it.disabled ? "disabled" : ""}><span class="pi">${it.ico}</span><b>${it.name}</b>${it.sub ? `<small>${it.sub}</small>` : ""}</button>`).join(""); },
  fmt: (x, d = 0) => Number(x).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }),
  ease: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
};
