/* =========================================================
   SOUND EFFECTS + VOICE — made with code, no sound files needed.
   Web Audio API for effects, Speech Synthesis for voice callouts.
   ========================================================= */
const sfx = (() => {
  let ctx = null;
  let muted = false;
  const loops = {};          // running looped sounds (engine roar, burns)

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = "sine", vol = 0.15, delay = 0, slideTo = null) {
    if (muted) return;
    const c = ac(), t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }

  let noiseBuf = null;
  function noiseSource() {
    const c = ac();
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s;
  }

  // Short burst of filtered noise (explosions, whooshes)
  function burst(dur, vol, cutoff, type = "lowpass") {
    if (muted) return;
    const c = ac(), t = c.currentTime;
    const src = noiseSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = type; f.frequency.value = cutoff;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(c.destination); src.start(t); src.stop(t + dur + 0.1);
  }

  // Looping noise we can fade (rocket roar)
  function loopStart(name, vol, cutoff) {
    if (muted || loops[name]) return;
    const c = ac(), t = c.currentTime;
    const src = noiseSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "lowpass"; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.4);
    src.connect(f).connect(g).connect(c.destination); src.start(t);
    loops[name] = { src, g, f };
  }
  function loopVol(name, vol) { const l = loops[name]; if (l) l.g.gain.setTargetAtTime(Math.max(0.001, vol), ac().currentTime, 0.1); }
  function loopStop(name) {
    const l = loops[name]; if (!l) return;
    const t = ac().currentTime; l.g.gain.setTargetAtTime(0.001, t, 0.08); l.src.stop(t + 0.4); delete loops[name];
  }

  // Pick one good English voice once, so the voice doesn't change mid-countdown
  let voice = null;
  function pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find((v) => /en-US/i.test(v.lang) && /Samantha|Alex|Google US|Daniel|Karen/i.test(v.name))
      || vs.find((v) => /^en/i.test(v.lang)) || null;
  }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  // Voice (speech synthesis). Returns a Promise that resolves when done.
  // interrupt: true cancels anything still queued (keeps the countdown in sync, no stutter)
  function say(text, { pitch = 1, rate = 1.05, vol = 1, interrupt = false } = {}) {
    return new Promise((resolve) => {
      const fallback = setTimeout(resolve, 400 + text.length * 75);
      if (muted || !("speechSynthesis" in window)) return;
      if (interrupt && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch; u.rate = rate; u.volume = vol; u.lang = "en-US"; if (voice) u.voice = voice;
      u.onend = () => { clearTimeout(fallback); resolve(); };
      speechSynthesis.speak(u);
    });
  }

  return {
    toggle() {
      muted = !muted;
      if (muted) { Object.keys(loops).forEach(loopStop); if ("speechSynthesis" in window) speechSynthesis.cancel(); }
      return muted;
    },
    isMuted: () => muted,
    // Start audio early (on the first click) so the first sounds don't stutter
    warm() { try { ac(); noiseSource(); pickVoice(); } catch (e) {} },
    say,
    click:  () => tone(660, 0.06, "square", 0.05),
    add:    () => { tone(520, 0.08, "sine", 0.15); tone(780, 0.1, "sine", 0.12, 0.06); },
    remove: () => tone(400, 0.12, "sine", 0.12, 0, 220),
    nope:   () => tone(180, 0.18, "square", 0.08),
    beep:   () => tone(880, 0.12, "sine", 0.15),
    pip:    () => tone(1200, 0.08, "sine", 0.12),
    go:     () => tone(1320, 0.4, "sine", 0.18),
    clunk:  () => { tone(140, 0.25, "triangle", 0.3, 0, 70); burst(0.15, 0.3, 800); },
    sep:    () => { burst(0.5, 0.7, 3000, "highpass"); tone(160, 0.35, "square", 0.15, 0, 50); tone(90, 0.5, "sine", 0.3, 0.05, 40); },
    fill(dur = 1.2) { if (muted) return; for (let i = 0; i < dur * 14; i++) tone(180 + Math.random() * 260, 0.07, "sine", 0.08, i / 14, 120 + Math.random() * 200); },
    boom:   () => { burst(1.6, 0.9, 900); tone(90, 1.0, "sawtooth", 0.2, 0, 30); },
    whoosh: () => burst(0.8, 0.25, 2000),
    roarStart: (v = 0.6) => loopStart("roar", v, 380),
    roarVol: (v) => loopVol("roar", v),
    roarStop: () => loopStop("roar"),
    burnStart() { loopStart("burn", 0.25, 1200); },
    burnStop() { loopStop("burn"); },
    alarm:  () => { for (let i = 0; i < 4; i++) { tone(880, 0.14, "square", 0.08, i * 0.3); tone(660, 0.14, "square", 0.08, i * 0.3 + 0.15); } },
    win:    () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, "triangle", 0.18, i * 0.13)),
    fail:   () => [392, 330, 262].forEach((f, i) => tone(f, 0.4, "sawtooth", 0.08, i * 0.22)),
    quindar: () => { tone(2525, 0.25, "sine", 0.1); tone(2475, 0.25, "sine", 0.1, 0.32); },   // the famous NASA radio beeps
    chime:  () => { tone(1568, 0.5, "sine", 0.1); tone(2093, 0.6, "sine", 0.08, 0.1); },
  };
})();
