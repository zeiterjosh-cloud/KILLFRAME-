/* ──────────────────────────────────────────────────────────
   KILLFRAME — enemies.js
   Enemy class and EnemyManager wave controller.
   Depends on: THREE, Level, AudioManager (globals)
   Exposes globals: Enemy, EnemyManager
   ────────────────────────────────────────────────────────── */

/* ════════════════════════════════════════════════════════════
   Enemy
   ════════════════════════════════════════════════════════════ */
function Enemy(scene, position, cfg) {
  this.scene    = scene;
  this.maxHp    = cfg.hp      || 80;
  this.hp       = this.maxHp;
  this.speed    = cfg.speed   || 3;
  this.dmg      = cfg.dmg     || 12;
  this.atkRate  = cfg.atkRate || 2.5;
  this.atkTimer = Math.random() * this.atkRate;
  this.alive    = true;
  this.active   = true;   // false once death anim finishes
  this.dying    = false;
  this.dyingT   = 0;
  var DEATH_DUR = 0.45;
  this._deathDur = DEATH_DUR;

  /* ── mesh group ── */
  this.mesh = new THREE.Group();
  this.mesh.position.copy(position);
  this.mesh.position.y = 0;
  this.mesh.userData.enemy = this;

  // Body
  var bodyGeo = new THREE.BoxGeometry(1, 1.8, 0.9);
  var bodyMat = new THREE.MeshLambertMaterial({ color: cfg.color || 0xcc2200 });
  var bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 0.9;
  bodyMesh.castShadow = true;
  bodyMesh.userData.enemy = this;
  this.mesh.add(bodyMesh);
  this._bodyMesh = bodyMesh;
  this._bodyMat  = bodyMat;

  // Head
  var headGeo = new THREE.BoxGeometry(0.7, 0.65, 0.7);
  var headMat = new THREE.MeshLambertMaterial({ color: cfg.color || 0xcc2200 });
  var headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.y = 1.95;
  headMesh.castShadow = true;
  headMesh.userData.enemy = this;
  this.mesh.add(headMesh);
  this._headMesh = headMesh;

  // Eyes
  var eyeGeo = new THREE.BoxGeometry(0.15, 0.1, 0.05);
  var eyeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
  [-0.18, 0.18].forEach(function (ex) {
    var eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(ex, 2.05, 0.36);
    eye.userData.enemy = this;
    this.mesh.add(eye);
  }, this);

  // Glow
  var glow = new THREE.PointLight(cfg.color || 0xff2200, 0.6, 4);
  glow.position.set(0, 1.2, 0);
  this.mesh.add(glow);
  this._glow = glow;

  /* ── health-bar canvas texture ── */
  this._hbCanvas = document.createElement('canvas');
  this._hbCanvas.width  = 128;
  this._hbCanvas.height = 20;
  this._hbTex = new THREE.CanvasTexture(this._hbCanvas);

  var hbMat  = new THREE.MeshBasicMaterial({
    map: this._hbTex, transparent: true, depthTest: false,
  });
  this._hbMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.22), hbMat);
  this._hbMesh.position.y = 2.6;
  this._hbMesh.renderOrder = 999;
  this.mesh.add(this._hbMesh);
  this._drawHBar();

  scene.add(this.mesh);
}

Enemy.prototype._drawHBar = function () {
  var c   = this._hbCanvas;
  var ctx = c.getContext('2d');
  var w   = c.width, h = c.height;
  var r   = Math.max(0, this.hp / this.maxHp);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#222';
  ctx.fillRect(2, 4, w - 4, h - 8);
  var hue = r * 110; // green → red
  ctx.fillStyle = 'hsl(' + hue + ',100%,45%)';
  ctx.fillRect(2, 4, (w - 4) * r, h - 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(2, 4, w - 4, h - 8);

  this._hbTex.needsUpdate = true;
};

Enemy.prototype.takeDamage = function (amount) {
  if (!this.alive) return;
  this.hp -= amount;
  this._drawHBar();

  // flash emissive
  this._bodyMat.emissive = new THREE.Color(0xff0000);
  this._bodyMat.emissiveIntensity = 1;
  var self = this;
  setTimeout(function () {
    if (self._bodyMat) { self._bodyMat.emissiveIntensity = 0; }
  }, 80);

  if (this.hp <= 0) this._die();
};

Enemy.prototype._die = function () {
  this.alive  = false;
  this.dying  = true;
  this.dyingT = this._deathDur;
  this._bodyMat.color.setHex(0x440000);
  this._bodyMat.emissive = new THREE.Color(0xff4400);
  this._bodyMat.emissiveIntensity = 0.8;
  this._glow.color.setHex(0xff4400);
  AudioManager.playEnemyDeath();
};

/* Returns a projectile object, or null if not shooting this frame */
Enemy.prototype.update = function (dt, playerPos, camPos) {
  if (!this.active) return null;

  // Billboard health bar toward camera
  if (camPos) {
    var wpx = this.mesh.position.x + this._hbMesh.position.x;
    var wpz = this.mesh.position.z + this._hbMesh.position.z;
    this._hbMesh.lookAt(camPos.x, camPos.y, camPos.z);
  }

  /* ── death animation ── */
  if (this.dying) {
    this.dyingT -= dt;
    var prog = 1 - this.dyingT / this._deathDur;
    this.mesh.scale.y = Math.max(0, 1 - prog);
    this.mesh.position.y = -(prog * 0.8);
    if (this.dyingT <= 0) {
      this.scene.remove(this.mesh);
      this.active = false;
    }
    return null;
  }

  if (!this.alive) return null;

  /* ── face player ── */
  var tx = playerPos.x, tz = playerPos.z;
  this.mesh.lookAt(new THREE.Vector3(tx, this.mesh.position.y, tz));

  /* ── move toward player ── */
  var toPlayer = new THREE.Vector3(tx - this.mesh.position.x, 0, tz - this.mesh.position.z);
  var dist = toPlayer.length();
  var MIN_DIST = 3.5;
  if (dist > MIN_DIST) {
    var step = this.speed * dt;
    if (step > dist - MIN_DIST) step = dist - MIN_DIST;
    toPlayer.normalize();
    this.mesh.position.x += toPlayer.x * step;
    this.mesh.position.z += toPlayer.z * step;
  }

  /* ── clamp inside arena ── */
  var bound = Level.ARENA_SIZE / 2 - 1;
  if (this.mesh.position.x >  bound) this.mesh.position.x =  bound;
  if (this.mesh.position.x < -bound) this.mesh.position.x = -bound;
  if (this.mesh.position.z >  bound) this.mesh.position.z =  bound;
  if (this.mesh.position.z < -bound) this.mesh.position.z = -bound;

  /* ── attack ── */
  this.atkTimer -= dt;
  if (this.atkTimer <= 0 && dist < 28) {
    this.atkTimer = this.atkRate + (Math.random() - 0.5) * 0.8;
    return this._shoot(playerPos);
  }

  return null;
};

Enemy.prototype._shoot = function (playerPos) {
  var origin = this.mesh.position.clone();
  origin.y += 1.1;

  var dir = new THREE.Vector3().subVectors(playerPos, origin).normalize();
  // accuracy spread
  dir.x += (Math.random() - 0.5) * 0.18;
  dir.y += (Math.random() - 0.5) * 0.08;
  dir.z += (Math.random() - 0.5) * 0.18;
  dir.normalize();

  AudioManager.playEnemyShoot();

  var geo = new THREE.SphereGeometry(0.12, 6, 6);
  var mat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
  var mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(origin);

  var light = new THREE.PointLight(0xff8800, 1.2, 4);
  mesh.add(light);
  this.scene.add(mesh);

  return {
    mesh:     mesh,
    velocity: dir.multiplyScalar(16),
    life:     3.0,
    damage:   this.dmg,
  };
};

Enemy.prototype.dispose = function () {
  this.scene.remove(this.mesh);
  this._hbTex.dispose();
};

/* ════════════════════════════════════════════════════════════
   EnemyManager
   ════════════════════════════════════════════════════════════ */
var EnemyManager = (function () {
  'use strict';

  var _scene      = null;
  var _enemies    = [];
  var _projectiles = [];
  var _onKill     = null;  // callback(killCount)

  function init(scene, onKill) {
    _scene   = scene;
    _onKill  = onKill;
    _enemies = [];
    _projectiles = [];
  }

  /* Wave configs: 3 enemy types cycling */
  var TYPES = [
    { color: 0xcc2200, speed: 3.0, hp: 70,  dmg: 12, atkRate: 2.5 }, // standard
    { color: 0x882200, speed: 1.8, hp: 150, dmg: 18, atkRate: 2.0 }, // heavy
    { color: 0xff4400, speed: 4.5, hp: 45,  dmg: 8,  atkRate: 3.2 }, // scout
  ];

  function spawnWave(waveNum) {
    var count = 3 + (waveNum - 1) * 2;
    var positions = Level.getSpawnPositions(count);

    for (var i = 0; i < count; i++) {
      var base = TYPES[i % TYPES.length];
      var scale = 1 + (waveNum - 1) * 0.15;
      var cfg = {
        color:   base.color,
        speed:   base.speed   * (1 + (waveNum - 1) * 0.12),
        hp:      Math.round(base.hp  * scale),
        dmg:     Math.round(base.dmg * (1 + (waveNum - 1) * 0.1)),
        atkRate: Math.max(0.9, base.atkRate - (waveNum - 1) * 0.08),
      };
      _enemies.push(new Enemy(_scene, positions[i], cfg));
    }
  }

  /* Returns true when all enemies for the current wave are gone */
  function update(dt, playerPos, camPos, onPlayerHit) {
    var killed = 0;

    /* ── update enemies ── */
    for (var i = _enemies.length - 1; i >= 0; i--) {
      var e = _enemies[i];
      var proj = e.update(dt, playerPos, camPos);
      if (proj) _projectiles.push(proj);

      if (!e.active) {
        if (!e.alive) killed++;
        _enemies.splice(i, 1);
      }
    }

    if (killed > 0 && _onKill) _onKill(killed);

    /* ── update projectiles ── */
    for (var j = _projectiles.length - 1; j >= 0; j--) {
      var p = _projectiles[j];
      p.life -= dt;

      p.mesh.position.addScaledVector(p.velocity, dt);

      /* hit player */
      if (p.mesh.position.distanceTo(playerPos) < 0.75) {
        onPlayerHit(p.damage);
        _scene.remove(p.mesh);
        _projectiles.splice(j, 1);
        continue;
      }

      /* hit floor or expired */
      if (p.mesh.position.y < 0.1 || p.life <= 0) {
        _scene.remove(p.mesh);
        _projectiles.splice(j, 1);
      }
    }

    /* wave cleared when list is empty AND enemies are all inactive */
    return _enemies.length === 0;
  }

  function getList()  { return _enemies; }

  function clear() {
    _enemies.forEach(function (e) { e.dispose(); });
    _enemies = [];
    _projectiles.forEach(function (p) { _scene.remove(p.mesh); });
    _projectiles = [];
  }

  return {
    init:      init,
    spawnWave: spawnWave,
    update:    update,
    getList:   getList,
    clear:     clear,
  };
}());
