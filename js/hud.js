/* ──────────────────────────────────────────────────────────
   KILLFRAME — hud.js
   Manages all DOM-based HUD elements.
   Depends on: nothing (pure DOM)
   Exposes global: HUD
   ────────────────────────────────────────────────────────── */

var HUD = (function () {
  'use strict';

  var el = {};
  var hitMarkerTimer = 0;

  /* ── init ─────────────────────────────────────────────── */
  function init() {
    el = {
      hud:           document.getElementById('hud'),
      waveNum:       document.getElementById('wave-num'),
      scoreNum:      document.getElementById('score-num'),
      healthBar:     document.getElementById('health-bar'),
      healthNum:     document.getElementById('health-num'),
      ammoCurrent:   document.getElementById('ammo-current'),
      ammoReserve:   document.getElementById('ammo-reserve'),
      reload:        document.getElementById('reload-indicator'),
      waveBanner:    document.getElementById('wave-banner'),
      hitMarker:     document.getElementById('hit-marker'),
      killFeed:      document.getElementById('kill-feed'),
      damageOverlay: document.getElementById('damage-overlay'),
    };
  }

  function show() { el.hud.classList.remove('hidden'); }
  function hide() { el.hud.classList.add('hidden'); }

  /* ── per-frame update ─────────────────────────────────── */
  function update(dt, hp, maxHp, ammo, ammoRes, reloading, wave, score) {
    // Health
    var pct = Math.max(0, hp / maxHp) * 100;
    el.healthBar.style.width = pct + '%';
    if (hp > maxHp * 0.5)       el.healthBar.style.background = '#00cc44';
    else if (hp > maxHp * 0.25) el.healthBar.style.background = '#ffaa00';
    else                        el.healthBar.style.background = '#ff2200';
    el.healthNum.textContent = Math.ceil(hp);

    // Ammo
    el.ammoCurrent.textContent = ammo;
    el.ammoReserve.textContent = ammoRes;

    // Wave / Score
    el.waveNum.textContent  = wave;
    el.scoreNum.textContent = score;

    // Reload
    if (reloading) el.reload.classList.remove('hidden');
    else           el.reload.classList.add('hidden');

    // Hit-marker cooldown
    if (hitMarkerTimer > 0) {
      hitMarkerTimer -= dt;
      if (hitMarkerTimer <= 0) el.hitMarker.classList.remove('active');
    }
  }

  /* ── event triggers ──────────────────────────────────── */
  function showHitMarker() {
    hitMarkerTimer = 0.15;
    el.hitMarker.classList.add('active');
  }

  function showDamageFlash() {
    var o = el.damageOverlay;
    o.classList.remove('active');
    // force reflow so the remove/add transition fires
    void o.offsetWidth;
    o.classList.add('active');
    setTimeout(function () { o.classList.remove('active'); }, 350);
  }

  function showWaveBanner(text, duration) {
    duration = duration || 2500;
    el.waveBanner.textContent = text;
    el.waveBanner.classList.remove('hidden');
    // next tick so transition fires
    requestAnimationFrame(function () {
      el.waveBanner.classList.add('active');
    });
    setTimeout(function () {
      el.waveBanner.classList.remove('active');
      setTimeout(function () { el.waveBanner.classList.add('hidden'); }, 500);
    }, duration);
  }

  function addKillFeedEntry(text) {
    var div = document.createElement('div');
    div.className = 'kill-feed-entry';
    div.textContent = text;
    el.killFeed.insertBefore(div, el.killFeed.firstChild);
    setTimeout(function () {
      div.classList.add('fade-out');
      setTimeout(function () {
        if (div.parentNode) div.parentNode.removeChild(div);
      }, 500);
    }, 3000);
    // keep at most 5 entries
    var entries = el.killFeed.querySelectorAll('.kill-feed-entry');
    if (entries.length > 5) el.killFeed.removeChild(entries[entries.length - 1]);
  }

  return {
    init:               init,
    show:               show,
    hide:               hide,
    update:             update,
    showHitMarker:      showHitMarker,
    showDamageFlash:    showDamageFlash,
    showWaveBanner:     showWaveBanner,
    addKillFeedEntry:   addKillFeedEntry,
  };
}());
