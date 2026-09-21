// Процедурный звук через Web Audio API. Без аудиофайлов.
// AudioContext создаётся только после первого касания/клика (требование браузеров).

import { CONFIG } from '../data/config.js';
import { Storage } from './storage.js';

let ctx = null;
let masterGain = null;
let musicNodes = [];

function ensureContext() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = Storage.get().muted ? 0 : CONFIG.audio.masterVolume;
  masterGain.connect(ctx.destination);
  return ctx;
}

export const Sound = {
  /** Вызывать по первому пользовательскому жесту (тап/клик/клавиша). */
  unlock() {
    ensureContext();
    if (ctx.state === 'suspended') ctx.resume();
  },

  isMuted() {
    return Storage.get().muted;
  },

  toggleMute() {
    const muted = !Storage.get().muted;
    Storage.set({ muted });
    if (masterGain) masterGain.gain.value = muted ? 0 : CONFIG.audio.masterVolume;
    return muted;
  },

  /** Короткий 8-битный писк: клик, шаг, успех, ошибка и т.д. */
  beep({ freq = 440, duration = 0.08, type = 'square', volume = 0.25, slideTo = null } = {}) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  },

  click() {
    this.beep({ freq: 520, duration: 0.05, type: 'square', volume: 0.2 });
  },
  step() {
    this.beep({ freq: 220, duration: 0.03, type: 'square', volume: 0.08 });
  },
  correct() {
    this.beep({ freq: 660, duration: 0.12, type: 'square', volume: 0.25, slideTo: 990 });
  },
  wrong() {
    this.beep({ freq: 200, duration: 0.18, type: 'sawtooth', volume: 0.2, slideTo: 100 });
  },
  points() {
    this.beep({ freq: 880, duration: 0.1, type: 'triangle', volume: 0.2, slideTo: 1200 });
  },
  doorOpen() {
    this.beep({ freq: 300, duration: 0.15, type: 'sine', volume: 0.2, slideTo: 500 });
  },
  bell() {
    this.beep({ freq: 880, duration: 0.2, type: 'sine', volume: 0.22, slideTo: 1320 });
  },

  /** Простая зацикленная мелодия локации: массив нот (Гц) и общий темп. */
  playLoop(notes, tempoMs = 260) {
    this.stopLoop();
    if (!ctx) return;
    let i = 0;
    const id = setInterval(() => {
      const note = notes[i % notes.length];
      if (note > 0) this.beep({ freq: note, duration: tempoMs / 1000 * 0.8, type: 'triangle', volume: 0.06 });
      i++;
    }, tempoMs);
    musicNodes.push(id);
  },
  stopLoop() {
    musicNodes.forEach((id) => clearInterval(id));
    musicNodes = [];
  },
};
