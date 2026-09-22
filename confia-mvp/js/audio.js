/**
 * audio.js — porta fiel de sounds.ts. Sons sintéticos via Web Audio API,
 * sem nenhum asset ou biblioteca externa (o original não usa Tone.js).
 */
(function (global) {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function setSoundEnabled(v) {
    enabled = v;
    try { localStorage.setItem("confia:sound", v ? "1" : "0"); } catch (e) {}
  }
  function isSoundEnabled() {
    try {
      const v = localStorage.getItem("confia:sound");
      if (v !== null) enabled = v === "1";
    } catch (e) {}
    return enabled;
  }

  function tone({ freq, duration = 0.18, type = "sine", gain = 0.12, delay = 0, slideTo }) {
    const c = getCtx();
    if (!c || !enabled) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  const sfx = {
    confiar() {
      tone({ freq: 523.25, duration: 0.12, type: "triangle", gain: 0.11 });
      tone({ freq: 659.25, duration: 0.12, type: "triangle", gain: 0.10, delay: 0.06 });
      tone({ freq: 783.99, duration: 0.18, type: "triangle", gain: 0.10, delay: 0.12 });
    },
    verificar() {
      tone({ freq: 880, duration: 0.09, type: "square", gain: 0.06 });
      tone({ freq: 880, duration: 0.09, type: "square", gain: 0.06, delay: 0.11 });
    },
    ignorar() {
      tone({ freq: 260, duration: 0.22, type: "sine", gain: 0.09, slideTo: 160 });
    },
    correct() {
      tone({ freq: 659.25, duration: 0.10, type: "triangle", gain: 0.10 });
      tone({ freq: 987.77, duration: 0.20, type: "triangle", gain: 0.10, delay: 0.08 });
    },
    wrong() {
      tone({ freq: 233.08, duration: 0.22, type: "sawtooth", gain: 0.09, slideTo: 155 });
    },
    win() {
      tone({ freq: 523.25, duration: 0.5, type: "triangle", gain: 0.10 });
      tone({ freq: 659.25, duration: 0.5, type: "triangle", gain: 0.10, delay: 0.05 });
      tone({ freq: 783.99, duration: 0.6, type: "triangle", gain: 0.10, delay: 0.10 });
      tone({ freq: 1046.5, duration: 0.7, type: "triangle", gain: 0.09, delay: 0.15 });
    },
    collapse() {
      tone({ freq: 220, duration: 0.8, type: "sawtooth", gain: 0.12, slideTo: 55 });
    },
    endNeutral() {
      tone({ freq: 392, duration: 0.35, type: "sine", gain: 0.09 });
      tone({ freq: 466.16, duration: 0.45, type: "sine", gain: 0.08, delay: 0.15 });
    },
  };

  function playActionSfx(action) { sfx[action] && sfx[action](); }

  function playOutcomeSfx(klass, action) {
    if (action === "ignorar") return;
    const good = (klass === "true" && action === "confiar") || (klass === "false" && action === "verificar");
    const bad = (klass === "false" && action === "confiar") || (klass === "true" && action === "verificar");
    if (good) setTimeout(() => sfx.correct(), 220);
    else if (bad) setTimeout(() => sfx.wrong(), 220);
  }

  function playEndingSfx(ending) {
    if (ending === "saudavel") sfx.win();
    else if (ending === "colapso") sfx.collapse();
    else sfx.endNeutral();
  }

  global.CONFIA_AUDIO = { setSoundEnabled, isSoundEnabled, playActionSfx, playOutcomeSfx, playEndingSfx, sfx };
})(window);
