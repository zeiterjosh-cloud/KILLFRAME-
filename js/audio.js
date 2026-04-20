/* ──────────────────────────────────────────────────────────
   KILLFRAME — audio.js
   Procedural sound effects via the Web Audio API.
   Exposes global: AudioManager
   ────────────────────────────────────────────────────────── */

var AudioManager = (function () {
  'use strict';

  var ctx = null;
  var masterGain = null;

  /* ── init ─────────────────────────────────────────────── */
  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.7;
      masterGain.connect(ctx.destination);
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  /* Resume suspended context (needed after first user gesture) */
  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /* ── helpers ──────────────────────────────────────────── */
  function osc(freq, type, startTime, duration, gainAmt) {
    if (!ctx) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, startTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.05, 10), startTime + duration);
    g.gain.setValueAtTime(gainAmt, startTime);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    o.connect(g);
    g.connect(masterGain);
    o.start(startTime);
    o.stop(startTime + duration);
  }

  function noiseBuffer(durationSec) {
    if (!ctx) return null;
    var samples = Math.ceil(ctx.sampleRate * durationSec);
    var buf = ctx.createBuffer(1, samples, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < samples; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    return buf;
  }

  /* ── sound effects ────────────────────────────────────── */
  function playGunshot() {
    if (!ctx) return;
    var now = ctx.currentTime;
    // Noise burst (the crack)
    var buf = noiseBuffer(0.12);
    if (buf) {
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var g = ctx.createGain();
      g.gain.setValueAtTime(2.0, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      // High-pass to cut low rumble
      var hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 800;
      src.connect(hp);
      hp.connect(g);
      g.connect(masterGain);
      src.start(now);
    }
    // Low punch
    osc(90, 'sine', now, 0.08, 1.2);
    osc(200, 'sawtooth', now, 0.05, 0.6);
  }

  function playReload() {
    if (!ctx) return;
    var now = ctx.currentTime;
    osc(300, 'triangle', now, 0.1, 0.4);
    osc(700, 'sine', now + 0.25, 0.07, 0.3);
    osc(500, 'square', now + 0.45, 0.06, 0.35);
    osc(900, 'sine', now + 1.8, 0.08, 0.5);
    osc(600, 'triangle', now + 1.85, 0.05, 0.3);
  }

  function playEnemyDeath() {
    if (!ctx) return;
    var now = ctx.currentTime;
    osc(250, 'sawtooth', now, 0.25, 0.7);
    osc(120, 'square', now + 0.05, 0.2, 0.5);
  }

  function playEnemyShoot() {
    if (!ctx) return;
    var now = ctx.currentTime;
    osc(180, 'sawtooth', now, 0.12, 0.4);
    osc(90, 'sine', now, 0.08, 0.3);
  }

  function playPlayerHurt() {
    if (!ctx) return;
    var now = ctx.currentTime;
    osc(160, 'sine', now, 0.18, 0.8);
    osc(80, 'square', now + 0.02, 0.15, 0.4);
  }

  function playEmpty() {
    if (!ctx) return;
    var now = ctx.currentTime;
    osc(900, 'square', now, 0.04, 0.25);
    osc(700, 'square', now + 0.04, 0.03, 0.15);
  }

  function playWaveClear() {
    if (!ctx) return;
    var now = ctx.currentTime;
    [523, 659, 784, 1047].forEach(function (f, i) {
      osc(f, 'sine', now + i * 0.12, 0.22, 0.45);
    });
  }

  function playWaveStart() {
    if (!ctx) return;
    var now = ctx.currentTime;
    [220, 330, 440].forEach(function (f, i) {
      osc(f, 'sawtooth', now + i * 0.1, 0.18, 0.4);
    });
  }

  return {
    init: init,
    resume: resume,
    playGunshot: playGunshot,
    playReload: playReload,
    playEnemyDeath: playEnemyDeath,
    playEnemyShoot: playEnemyShoot,
    playPlayerHurt: playPlayerHurt,
    playEmpty: playEmpty,
    playWaveClear: playWaveClear,
    playWaveStart: playWaveStart,
  };
}());
