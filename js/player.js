/* ──────────────────────────────────────────────────────────
   KILLFRAME — player.js
   First-person camera controller with physics, shooting,
   health, and ammo management.
   Depends on: THREE, Level, AudioManager, HUD (globals)
   Exposes global: Player
   ────────────────────────────────────────────────────────── */

var Player = (function () {
  'use strict';

  /* ── constants ─────────────────────────────────────────── */
  var WALK_SPEED    = 7;
  var SPRINT_SPEED  = 12;
  var JUMP_FORCE    = 9;
  var GRAVITY       = -22;
  var EYE_HEIGHT    = 1.7;
  var RADIUS        = 0.45;

  var MAX_HP        = 100;
  var MAX_AMMO      = 30;
  var START_RESERVE = 90;
  var DAMAGE        = 25;
  var FIRE_RATE     = 0.1;   // seconds between shots
  var RELOAD_TIME   = 2.0;

  /* ── state ─────────────────────────────────────────────── */
  var body, camera;          // THREE objects
  var yaw = 0, pitch = 0;
  var velY = 0, grounded = true;

  var hp       = MAX_HP;
  var ammo     = MAX_AMMO;
  var reserve  = START_RESERVE;
  var alive    = true;

  var reloading    = false;
  var reloadTimer  = 0;
  var fireCooldown = 0;
  var muzzleLight  = null;
  var muzzleTimer  = 0;

  var shakeTimer = 0, shakeAmt = 0;

  /* Active hit-particles tracked so they can be cleaned up on reset */
  var _particleTimeouts = [];

  /* ── input ─────────────────────────────────────────────── */
  var keys       = {};
  var mouseLeft  = false;
  var locked     = false;

  /* ── public init ─────────────────────────────────────────*/
  function init(scene, cam) {
    camera = cam;

    body = new THREE.Object3D();
    body.position.set(0, EYE_HEIGHT, 0);
    body.add(camera);
    scene.add(body);

    camera.position.set(0, 0, 0);
    camera.rotation.order = 'YXZ';

    // muzzle-flash point light (attached to camera)
    muzzleLight = new THREE.PointLight(0xff8800, 0, 6);
    muzzleLight.position.set(0, -0.25, -0.8);
    camera.add(muzzleLight);

    _setupInput();
    return body;
  }

  function _setupInput() {
    document.addEventListener('keydown', function (e) {
      keys[e.code] = true;
      if (e.code === 'KeyR') _tryReload();
    });
    document.addEventListener('keyup', function (e) {
      keys[e.code] = false;
    });

    document.addEventListener('mousedown', function (e) {
      if (e.button === 0) mouseLeft = true;
    });
    document.addEventListener('mouseup', function (e) {
      if (e.button === 0) mouseLeft = false;
    });

    document.addEventListener('mousemove', function (e) {
      if (!locked) return;
      var sens = 0.0022;
      yaw   -= e.movementX * sens;
      pitch -= e.movementY * sens;
      var MAX_PITCH = Math.PI / 2 - 0.01;
      if (pitch >  MAX_PITCH) pitch =  MAX_PITCH;
      if (pitch < -MAX_PITCH) pitch = -MAX_PITCH;
    });

    document.addEventListener('pointerlockchange', function () {
      locked = !!document.pointerLockElement;
    });
  }

  /* ── pointer lock ────────────────────────────────────────*/
  function requestLock() { document.body.requestPointerLock(); }
  function releaseLock() { if (document.pointerLockElement) document.exitPointerLock(); }

  /* ── reload ──────────────────────────────────────────────*/
  function _tryReload() {
    if (reloading || reserve <= 0 || ammo >= MAX_AMMO) return;
    reloading   = true;
    reloadTimer = RELOAD_TIME;
    AudioManager.playReload();
  }

  /* ── shoot ───────────────────────────────────────────────*/
  function shoot(raycaster, enemyList, scene) {
    if (!alive || reloading)  return false;
    if (fireCooldown > 0)     return false;
    if (ammo <= 0) {
      AudioManager.playEmpty();
      _tryReload();
      return false;
    }

    ammo--;
    fireCooldown = FIRE_RATE;
    muzzleLight.intensity = 4;
    muzzleTimer  = 0.055;
    shakeTimer   = 0.09;
    shakeAmt     = 0.025;

    AudioManager.playGunshot();

    // Hitscan from screen-center
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);

    // Collect all enemy meshes (recursive so child eyes are hit too)
    var targets = [];
    enemyList.forEach(function (e) { if (e.mesh) targets.push(e.mesh); });
    var hits = raycaster.intersectObjects(targets, true);

    if (hits.length > 0) {
      var hit = hits[0];
      // Walk up to find the enemy-tagged object
      var obj = hit.object;
      while (obj && !obj.userData.enemy) obj = obj.parent;
      if (obj && obj.userData.enemy) {
        obj.userData.enemy.takeDamage(DAMAGE, scene);
        HUD.showHitMarker();
        _spawnHitFX(hit.point, scene);
        return true;
      }
    }
    return false;
  }

  function _spawnHitFX(point, scene) {
    var count = 6;
    var lifeMs = 350;
    for (var i = 0; i < count; i++) {
      (function () {
        var geo = new THREE.SphereGeometry(0.045, 4, 4);
        var mat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
        var p   = new THREE.Mesh(geo, mat);
        p.position.copy(point);
        scene.add(p);
        var tid = setTimeout(function () {
          scene.remove(p);
          geo.dispose();
          mat.dispose();
          var idx = _particleTimeouts.indexOf(tid);
          if (idx !== -1) _particleTimeouts.splice(idx, 1);
        }, lifeMs);
        _particleTimeouts.push(tid);
      }());
    }
  }

  /* ── damage / death ──────────────────────────────────────*/
  function takeDamage(amount) {
    if (!alive) return;
    hp = Math.max(0, hp - amount);
    HUD.showDamageFlash();
    AudioManager.playPlayerHurt();
    if (hp <= 0) { alive = false; }
  }

  function heal(amount) { hp = Math.min(MAX_HP, hp + amount); }

  /* ── per-frame update ────────────────────────────────────*/
  function update(dt) {
    if (!alive) return;

    /* timers */
    if (fireCooldown > 0) fireCooldown -= dt;
    if (muzzleTimer  > 0) { muzzleTimer -= dt; if (muzzleTimer <= 0) muzzleLight.intensity = 0; }
    if (shakeTimer   > 0) shakeTimer -= dt;

    /* reload */
    if (reloading) {
      reloadTimer -= dt;
      if (reloadTimer <= 0) {
        var need  = MAX_AMMO - ammo;
        var take  = Math.min(need, reserve);
        ammo    += take;
        reserve -= take;
        reloading = false;
      }
    }

    /* camera rotation */
    body.rotation.y    = yaw;
    camera.rotation.x  = pitch;

    /* screen shake */
    if (shakeTimer > 0) {
      var s = shakeAmt;
      camera.position.x = (Math.random() - 0.5) * s;
      camera.position.y = (Math.random() - 0.5) * s;
    } else {
      camera.position.x = 0;
      camera.position.y = 0;
    }

    /* movement direction */
    var dir = new THREE.Vector3();
    var sprint = keys['ShiftLeft'] || keys['ShiftRight'];
    var speed  = sprint ? SPRINT_SPEED : WALK_SPEED;

    if (keys['KeyW']    || keys['ArrowUp'])    dir.z -= 1;
    if (keys['KeyS']    || keys['ArrowDown'])  dir.z += 1;
    if (keys['KeyA']    || keys['ArrowLeft'])  dir.x -= 1;
    if (keys['KeyD']    || keys['ArrowRight']) dir.x += 1;

    if (dir.lengthSq() > 0) {
      dir.normalize().applyEuler(new THREE.Euler(0, yaw, 0));
    }

    /* jump */
    if ((keys['Space'] || keys['KeyJ']) && grounded) {
      velY    = JUMP_FORCE;
      grounded = false;
    }

    /* gravity */
    velY += GRAVITY * dt;

    /* integrate */
    var colliders = Level.getColliders();
    var half = Level.ARENA_SIZE / 2 - RADIUS - 0.1;
    var nx = body.position.x + dir.x * speed * dt;
    var ny = body.position.y + velY * dt;
    var nz = body.position.z + dir.z * speed * dt;

    /* floor */
    if (ny - EYE_HEIGHT < 0) {
      ny      = EYE_HEIGHT;
      velY    = 0;
      grounded = true;
    }

    /* arena bounds */
    if (nx >  half) nx =  half;
    if (nx < -half) nx = -half;
    if (nz >  half) nz =  half;
    if (nz < -half) nz = -half;

    /* obstacle AABB push-out (XZ only) */
    var foot = ny - EYE_HEIGHT + 0.1;
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      if (foot >= c.max.y) continue;
      if (nx + RADIUS > c.min.x && nx - RADIUS < c.max.x &&
          nz + RADIUS > c.min.z && nz - RADIUS < c.max.z) {

        var overX = Math.min(c.max.x - (nx - RADIUS), (nx + RADIUS) - c.min.x);
        var overZ = Math.min(c.max.z - (nz - RADIUS), (nz + RADIUS) - c.min.z);
        if (overX < overZ) {
          nx += (nx < (c.min.x + c.max.x) / 2) ? -overX : overX;
        } else {
          nz += (nz < (c.min.z + c.max.z) / 2) ? -overZ : overZ;
        }
      }
    }

    body.position.set(nx, ny, nz);
  }

  /* ── reset (on new game) ─────────────────────────────────*/
  function reset() {
    hp          = MAX_HP;
    ammo        = MAX_AMMO;
    reserve     = START_RESERVE;
    alive       = true;
    reloading   = false;
    reloadTimer = 0;
    fireCooldown = 0;
    velY        = 0;
    grounded    = true;
    yaw         = 0;
    pitch       = 0;
    body.position.set(0, EYE_HEIGHT, 0);
    body.rotation.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    camera.position.set(0, 0, 0);
    muzzleLight.intensity = 0;
    shakeTimer = 0;
    for (var k in keys) keys[k] = false;
    mouseLeft = false;
    // Cancel any pending hit-particle disposal timeouts
    for (var i = 0; i < _particleTimeouts.length; i++) clearTimeout(_particleTimeouts[i]);
    _particleTimeouts = [];
  }

  /* ── getters ─────────────────────────────────────────────*/
  function getPosition()   { return body.position; }
  function isAlive()       { return alive; }
  function isMouseDown()   { return mouseLeft; }
  function isLocked()      { return locked; }
  function isReloading()   { return reloading; }
  function getHP()         { return hp; }
  function getMaxHP()      { return MAX_HP; }
  function getAmmo()       { return ammo; }
  function getReserve()    { return reserve; }

  return {
    init:          init,
    update:        update,
    shoot:         shoot,
    takeDamage:    takeDamage,
    heal:          heal,
    reset:         reset,
    requestLock:   requestLock,
    releaseLock:   releaseLock,
    getPosition:   getPosition,
    isAlive:       isAlive,
    isMouseDown:   isMouseDown,
    isLocked:      isLocked,
    isReloading:   isReloading,
    getHP:         getHP,
    getMaxHP:      getMaxHP,
    getAmmo:       getAmmo,
    getReserve:    getReserve,
  };
}());
