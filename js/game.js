/* ──────────────────────────────────────────────────────────
   KILLFRAME — game.js
   Main game orchestration: scene setup, state machine,
   game loop, input wiring.
   Depends on: THREE, AudioManager, Level, HUD, Player,
               EnemyManager (all globals)
   ────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ════════════════════════════════════════════════════════
     State
     ════════════════════════════════════════════════════════ */
  var STATE = { MENU: 'MENU', PLAYING: 'PLAYING', WAVE_CLEAR: 'WAVE_CLEAR', GAME_OVER: 'GAME_OVER', PAUSED: 'PAUSED' };
  var state = STATE.MENU;

  var wave  = 1;
  var score = 0;
  var waveTransTimer = 0;   // delay between wave-clear and next wave
  var WAVE_TRANS_DELAY = 3; // seconds

  /* ════════════════════════════════════════════════════════
     Three.js core
     ════════════════════════════════════════════════════════ */
  var scene, camera, renderer, raycaster, clock;

  function _initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03030a);
    scene.fog = new THREE.FogExp2(0x03030a, 0.028);

    camera = new THREE.PerspectiveCamera(75, _aspect(), 0.05, 120);

    var canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    raycaster = new THREE.Raycaster();
    clock     = new THREE.Clock();
  }

  function _aspect() { return window.innerWidth / window.innerHeight; }

  function _setupLighting() {
    // dim ambient — atmosphere is mostly from point lights
    scene.add(new THREE.AmbientLight(0x08080f, 1));

    // single soft shadow-casting directional
    var dir = new THREE.DirectionalLight(0x334455, 0.6);
    dir.position.set(8, 20, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far  = 100;
    dir.shadow.camera.left = dir.shadow.camera.bottom = -30;
    dir.shadow.camera.right = dir.shadow.camera.top   =  30;
    scene.add(dir);
  }

  /* ════════════════════════════════════════════════════════
     DOM
     ════════════════════════════════════════════════════════ */
  var dom = {};

  function _bindDOM() {
    dom.menu      = document.getElementById('menu-overlay');
    dom.gameover  = document.getElementById('gameover-overlay');
    dom.pause     = document.getElementById('pause-overlay');
    dom.finalWave = document.getElementById('final-wave');
    dom.finalScore = document.getElementById('final-score');

    document.getElementById('start-btn')  .addEventListener('click', _startGame);
    document.getElementById('restart-btn').addEventListener('click', _startGame);
    document.getElementById('resume-btn') .addEventListener('click', _resumeGame);
    document.getElementById('quit-btn')   .addEventListener('click', _quitToMenu);

    // Click canvas → request pointer lock when playing
    document.getElementById('game-canvas').addEventListener('click', function () {
      if (state === STATE.PLAYING) {
        Player.requestLock();
        AudioManager.resume();
      }
    });

    window.addEventListener('resize', _onResize);
    document.addEventListener('keydown', _onKeyDown);
  }

  /* ════════════════════════════════════════════════════════
     Game state transitions
     ════════════════════════════════════════════════════════ */
  function _startGame() {
    wave  = 1;
    score = 0;

    // Re-build scene (clears old enemies / geometry)
    _rebuildScene();

    Player.reset();
    HUD.show();

    dom.menu.classList.add('hidden');
    dom.gameover.classList.add('hidden');
    dom.pause.classList.add('hidden');

    state = STATE.PLAYING;
    _spawnWave();

    Player.requestLock();
    AudioManager.resume();
  }

  function _rebuildScene() {
    // Dispose scene children except camera parent
    // Simplest approach: dispose and recreate scene
    while (scene.children.length > 0) scene.remove(scene.children[0]);
    _setupLighting();
    Level.build(scene);
    EnemyManager.init(scene, _onKill);
    // Re-init player body into scene
    Player.init(scene, camera);
  }

  function _spawnWave() {
    EnemyManager.spawnWave(wave);
    HUD.showWaveBanner('WAVE ' + wave);
    AudioManager.playWaveStart();
  }

  function _onKill(killCount) {
    var pts = killCount * 100 * wave;
    score  += pts;
    HUD.addKillFeedEntry('+' + pts + '  KILL');
  }

  function _nextWave() {
    var bonus = wave * 300;
    score += bonus;
    HUD.showWaveBanner('WAVE ' + wave + ' CLEAR!  +' + bonus, 2800);
    AudioManager.playWaveClear();
    // Heal player slightly between waves
    Player.heal(20);
    state = STATE.WAVE_CLEAR;
    waveTransTimer = WAVE_TRANS_DELAY;
  }

  function _gameOver() {
    state = STATE.GAME_OVER;
    Player.releaseLock();
    HUD.hide();
    dom.finalWave.textContent  = wave;
    dom.finalScore.textContent = score;
    dom.gameover.classList.remove('hidden');
  }

  function _pauseGame() {
    state = STATE.PAUSED;
    Player.releaseLock();
    dom.pause.classList.remove('hidden');
  }

  function _resumeGame() {
    state = STATE.PLAYING;
    dom.pause.classList.add('hidden');
    Player.requestLock();
  }

  function _quitToMenu() {
    state = STATE.MENU;
    HUD.hide();
    Player.releaseLock();
    EnemyManager.clear();
    dom.pause.classList.add('hidden');
    dom.gameover.classList.add('hidden');
    dom.menu.classList.remove('hidden');
  }

  /* ════════════════════════════════════════════════════════
     Input
     ════════════════════════════════════════════════════════ */
  function _onKeyDown(e) {
    if (e.code === 'Escape') {
      if (state === STATE.PLAYING) _pauseGame();
      else if (state === STATE.PAUSED) _resumeGame();
    }
  }

  function _onResize() {
    camera.aspect = _aspect();
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /* ════════════════════════════════════════════════════════
     Main loop
     ════════════════════════════════════════════════════════ */
  function _animate() {
    requestAnimationFrame(_animate);

    var dt = Math.min(clock.getDelta(), 0.05); // cap at 50 ms

    if (state === STATE.PLAYING) {
      _tick(dt);
    } else if (state === STATE.WAVE_CLEAR) {
      // Keep player moving, update HUD, wait for timer
      Player.update(dt);
      HUD.update(
        dt,
        Player.getHP(), Player.getMaxHP(),
        Player.getAmmo(), Player.getReserve(),
        Player.isReloading(),
        wave, score
      );

      waveTransTimer -= dt;
      if (waveTransTimer <= 0) {
        wave++;
        state = STATE.PLAYING;
        _spawnWave();
      }
    }

    renderer.render(scene, camera);
  }

  function _tick(dt) {
    // Player update
    Player.update(dt);

    // Shoot when LMB held and pointer locked
    if (Player.isMouseDown() && Player.isLocked()) {
      Player.shoot(raycaster, EnemyManager.getList(), scene);
    }

    // Enemy update
    var playerPos = Player.getPosition();
    var allDead = EnemyManager.update(
      dt,
      playerPos,
      camera.getWorldPosition(new THREE.Vector3()),
      function (dmg) { Player.takeDamage(dmg); }
    );

    // Wave clear?
    if (allDead) {
      _nextWave();
    }

    // Player died?
    if (!Player.isAlive()) {
      _gameOver();
      return;
    }

    // HUD
    HUD.update(
      dt,
      Player.getHP(), Player.getMaxHP(),
      Player.getAmmo(), Player.getReserve(),
      Player.isReloading(),
      wave, score
    );
  }

  /* ════════════════════════════════════════════════════════
     Bootstrap
     ════════════════════════════════════════════════════════ */
  function _boot() {
    _initThree();
    _setupLighting();
    Level.build(scene);
    HUD.init();
    AudioManager.init();
    Player.init(scene, camera);
    EnemyManager.init(scene, _onKill);
    _bindDOM();
    _animate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

}());
