// faces.js — face textures for the astronaut helmets: a photo from the camera, or a cartoon face.
// Same size as Commander Elvin's face image (768 × 1000), transparent outside the face.

const FACE_W = 768, FACE_H = 1000;
function faceCanvas() { const c = document.createElement("canvas"); c.width = FACE_W; c.height = FACE_H; return c; }
function ovalClip(x) { x.beginPath(); x.ellipse(FACE_W / 2, FACE_H * 0.5, FACE_W * 0.34, FACE_H * 0.36, 0, 0, Math.PI * 2); }

// a soft "face shape" depth map: brighter = closer (cheeks round, nose sticks out)
let _depthTex = null;
function genericDepthTex() {
  if (_depthTex) return _depthTex;
  const c = faceCanvas(), x = c.getContext("2d");
  x.fillStyle = "#000"; x.fillRect(0, 0, FACE_W, FACE_H);
  let g = x.createRadialGradient(FACE_W / 2, FACE_H * 0.5, 20, FACE_W / 2, FACE_H * 0.5, FACE_W * 0.42);
  g.addColorStop(0, "#9a9a9a"); g.addColorStop(0.7, "#5a5a5a"); g.addColorStop(1, "#000"); x.fillStyle = g; x.fillRect(0, 0, FACE_W, FACE_H);
  g = x.createRadialGradient(FACE_W / 2, FACE_H * 0.55, 5, FACE_W / 2, FACE_H * 0.55, 70); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, FACE_W, FACE_H);                                    // nose
  [-1, 1].forEach((s) => { const eg = x.createRadialGradient(FACE_W / 2 + s * 120, FACE_H * 0.44, 5, FACE_W / 2 + s * 120, FACE_H * 0.44, 70); eg.addColorStop(0, "rgba(0,0,0,0.5)"); eg.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = eg; x.fillRect(0, 0, FACE_W, FACE_H); });   // eye sockets
  _depthTex = new THREE.CanvasTexture(c); return _depthTex;
}

// photo → oval face image (mirrored like a selfie). Returns a data URL.
function photoFace(video) {
  const c = faceCanvas(), x = c.getContext("2d");
  const vw = video.videoWidth, vh = video.videoHeight;
  const ch = vh * 0.8, cw = ch * FACE_W / FACE_H, sx = (vw - cw) / 2, sy = (vh - ch) / 2;   // matches the oval guide on screen
  x.save(); ovalClip(x); x.clip();
  x.translate(FACE_W, 0); x.scale(-1, 1);
  x.filter = "brightness(1.08) contrast(1.05)";
  x.drawImage(video, sx, sy, cw, ch, -FACE_W * 0.08, -FACE_H * 0.08, FACE_W * 1.16, FACE_H * 1.16);
  x.restore();
  return c.toDataURL("image/png");
}

// cartoon face. o = { skin, eyes, glasses, smile, beard, brows }
const SKINS = ["#f6d7c3", "#eac0a0", "#d7a27d", "#b97d55", "#8d5a3b", "#5e3b28"];
function cartoonFace(o = {}) {
  const c = faceCanvas(), x = c.getContext("2d"), cx = FACE_W / 2, cy = FACE_H * 0.5, skin = o.skin || SKINS[2];
  ovalClip(x); x.fillStyle = skin; x.fill();
  const sh = x.createRadialGradient(cx, cy - 40, 60, cx, cy, FACE_W * 0.36); sh.addColorStop(0.6, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.25)");
  x.fillStyle = sh; ovalClip(x); x.fill();
  // eyebrows
  x.strokeStyle = o.brows || "#2a1c14"; x.lineWidth = 16; x.lineCap = "round";
  [-1, 1].forEach((s) => { x.beginPath(); x.moveTo(cx + s * 70, cy - 105); x.quadraticCurveTo(cx + s * 120, cy - 128, cx + s * 170, cy - 105); x.stroke(); });
  // eyes
  [-1, 1].forEach((s) => {
    x.fillStyle = "#fff"; x.beginPath(); x.ellipse(cx + s * 118, cy - 52, 46, 32, 0, 0, 7); x.fill();
    x.fillStyle = o.eyes || "#4a2e1a"; x.beginPath(); x.arc(cx + s * 114, cy - 50, 22, 0, 7); x.fill();
    x.fillStyle = "#111"; x.beginPath(); x.arc(cx + s * 114, cy - 50, 11, 0, 7); x.fill();
    x.fillStyle = "#fff"; x.beginPath(); x.arc(cx + s * 106, cy - 58, 6, 0, 7); x.fill();
  });
  // nose
  x.strokeStyle = "rgba(0,0,0,0.25)"; x.lineWidth = 8; x.beginPath(); x.moveTo(cx, cy - 20); x.quadraticCurveTo(cx - 22, cy + 55, cx + 4, cy + 60); x.stroke();
  // cheeks
  [-1, 1].forEach((s) => { x.fillStyle = "rgba(230,110,110,0.22)"; x.beginPath(); x.arc(cx + s * 150, cy + 50, 38, 0, 7); x.fill(); });
  // beard / stubble
  if (o.beard) { x.save(); ovalClip(x); x.clip(); x.fillStyle = o.beard; x.globalAlpha = 0.55; x.beginPath(); x.ellipse(cx, cy + 190, 210, 150, 0, 0, Math.PI); x.fill();
    x.beginPath(); x.ellipse(cx, cy + 110, 90, 24, 0, Math.PI, 0); x.fill(); x.restore(); }
  // mouth
  x.strokeStyle = "#7a2f2a"; x.lineWidth = 12; x.beginPath();
  if (o.smile === "big") { x.fillStyle = "#7a2f2a"; x.moveTo(cx - 80, cy + 120); x.quadraticCurveTo(cx, cy + 210, cx + 80, cy + 120); x.closePath(); x.fill(); x.fillStyle = "#fff"; x.fillRect(cx - 55, cy + 122, 110, 18); }
  else if (o.smile === "calm") { x.moveTo(cx - 60, cy + 135); x.lineTo(cx + 60, cy + 132); x.stroke(); }
  else { x.moveTo(cx - 70, cy + 120); x.quadraticCurveTo(cx, cy + 175, cx + 70, cy + 120); x.stroke(); }
  // glasses
  if (o.glasses) { x.strokeStyle = "#1b1b1f"; x.lineWidth = 10; [-1, 1].forEach((s) => { x.beginPath(); x.roundRect ? x.roundRect(cx + s * 118 - 62, cy - 92, 124, 84, 26) : x.rect(cx + s * 118 - 62, cy - 92, 124, 84); x.stroke(); });
    x.beginPath(); x.moveTo(cx - 56, cy - 55); x.lineTo(cx + 56, cy - 55); x.stroke(); }
  return c.toDataURL("image/png");
}
// data URL → texture for the helmet
function faceTexFrom(dataURL) { const t = new THREE.TextureLoader().load(dataURL); return t; }
