/* ──────────────────────────────────────────────────────────
   KILLFRAME — level.js
   Builds the arena scene (floor, ceiling, walls, obstacles)
   and provides spawn positions + collider list.
   Depends on: THREE (global)
   Exposes global: Level
   ────────────────────────────────────────────────────────── */

var Level = (function () {
  'use strict';

  var ARENA = 52;        // full side length (units)
  var HALF  = ARENA / 2; // 26
  var WALL_H = 8;

  // Axis-aligned bounding boxes used for player collision.
  // Each entry: { min: Vector3, max: Vector3 }
  var _colliders = [];

  /* ── internal helpers ───────────────────────────────────── */
  function _box(scene, mat, x, y, z, w, h, d, collidable) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (collidable) {
      _colliders.push({
        min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
        max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2),
      });
    }
    return mesh;
  }

  /* ── public API ─────────────────────────────────────────── */
  function build(scene) {
    _colliders = [];

    /* ── materials ── */
    var floorMat = new THREE.MeshLambertMaterial({ color: 0x111114 });
    var ceilMat  = new THREE.MeshLambertMaterial({ color: 0x0a0a0d });
    var wallMat  = new THREE.MeshLambertMaterial({ color: 0x1a1a28 });
    var boxMat   = new THREE.MeshLambertMaterial({ color: 0x22222f });

    /* ── floor ── */
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA, ARENA), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // subtle grid on floor
    var grid = new THREE.GridHelper(ARENA, 26, 0x222233, 0x18181e);
    grid.position.y = 0.01;
    scene.add(grid);

    /* ── ceiling ── */
    var ceil = new THREE.Mesh(new THREE.PlaneGeometry(ARENA, ARENA), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = WALL_H;
    scene.add(ceil);

    /* ── outer walls (collision via arena clamp in player.js) ── */
    var wt = 1; // wall thickness
    // North / South
    _box(scene, wallMat,  0,      WALL_H/2, -HALF - wt/2,  ARENA + wt*2, WALL_H, wt,  false);
    _box(scene, wallMat,  0,      WALL_H/2,  HALF + wt/2,  ARENA + wt*2, WALL_H, wt,  false);
    // East / West
    _box(scene, wallMat,  HALF + wt/2, WALL_H/2, 0, wt, WALL_H, ARENA + wt*2, false);
    _box(scene, wallMat, -HALF - wt/2, WALL_H/2, 0, wt, WALL_H, ARENA + wt*2, false);

    /* ── interior obstacles (collidable) ── */
    //  [cx, cy, cz,  w, h,  d]
    var obs = [
      [ 9,  1.5,  9,  3, 3, 3],
      [-9,  1.5,  9,  3, 3, 3],
      [ 9,  1.5, -9,  3, 3, 3],
      [-9,  1.5, -9,  3, 3, 3],

      [ 0,  1.0, 17,  5, 2, 4],
      [ 0,  1.0,-17,  5, 2, 4],
      [17,  1.0,  0,  4, 2, 5],
      [-17, 1.0,  0,  4, 2, 5],

      [14,  2.5, -14, 2, 5, 2],
      [-14, 2.5,  14, 2, 5, 2],
      [-14, 2.5, -14, 2, 5, 2],
      [14,  2.5,  14, 2, 5, 2],

      [ 6,  0.75, 0,  2, 1.5, 6],
      [-6,  0.75, 0,  2, 1.5, 6],
    ];

    obs.forEach(function (o) {
      _box(scene, boxMat, o[0], o[1], o[2], o[3], o[4], o[5], true);
    });

    /* ── ceiling lights ── */
    var lightPositions = [
      [ 18,  7,  18, 0xff1100],
      [-18,  7,  18, 0xcc0f00],
      [ 18,  7, -18, 0xff2200],
      [-18,  7, -18, 0xaa0e00],
      [  0,  7,   0, 0x3311ff],
    ];
    lightPositions.forEach(function (lp) {
      var pl = new THREE.PointLight(lp[3], 3, 28);
      pl.position.set(lp[0], lp[1], lp[2]);
      pl.castShadow = false;
      scene.add(pl);

      // visible fixture
      var fix = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 8, 8),
        new THREE.MeshBasicMaterial({ color: lp[3] })
      );
      fix.position.set(lp[0], lp[1] + 0.5, lp[2]);
      scene.add(fix);
    });
  }

  /* Returns a copy of the obstacle colliders array */
  function getColliders() { return _colliders; }

  /* Return `count` spawn positions spread around the arena edge */
  function getSpawnPositions(count) {
    var margin = 5;
    var span   = HALF - margin;
    var positions = [];
    for (var i = 0; i < count; i++) {
      var side = i % 4;
      var t    = (Math.random() * 2 - 1) * span;
      var x, z;
      switch (side) {
        case 0: x =  span; z = t;    break;
        case 1: x = -span; z = t;    break;
        case 2: x = t;    z =  span; break;
        default: x = t;   z = -span; break;
      }
      positions.push(new THREE.Vector3(x, 0, z));
    }
    return positions;
  }

  return {
    build:             build,
    getColliders:      getColliders,
    getSpawnPositions: getSpawnPositions,
    ARENA_SIZE:        ARENA,
    WALL_HEIGHT:       WALL_H,
  };
}());
