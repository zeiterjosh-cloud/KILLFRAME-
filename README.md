# KILLFRAME

A browser-based first-person shooter built with **Three.js**.  
No build tools required — open `index.html` with any local web server.

---

## Play

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .
```

Then open `http://localhost:8080` in Chrome / Firefox / Edge.

---

## Controls

| Key / Input | Action |
|-------------|--------|
| `W A S D` / Arrow keys | Move |
| Mouse | Aim (pointer-lock) |
| Left Mouse Button (hold) | Fire |
| `R` | Reload |
| `Shift` | Sprint |
| `Space` | Jump |
| `Esc` | Pause / Resume |

Click the canvas to capture the mouse pointer.  
Press **Esc** to release it.

---

## Gameplay

* Survive **waves** of enemies that spawn from the arena edge and pursue you.
* Three enemy archetypes:
  * 🟥 **Standard** — balanced threat
  * 🟫 **Heavy** — high HP, deals more damage
  * 🟧 **Scout** — fast, fragile
* Each wave adds 2 more enemies and they grow stronger.
* Score is earned per kill (`100 × wave`) and per wave-clear bonus (`300 × wave`).
* A small amount of health is restored between waves.

---

## Project Layout

```
index.html          Entry point + HUD markup
style.css           Atmospheric FPS styling
js/
  audio.js          Web Audio API sound effects (no assets needed)
  level.js          Three.js arena: floor, walls, obstacles, colliders
  hud.js            DOM-based HUD manager
  player.js         FPS camera, movement, shooting, health/ammo
  enemies.js        Enemy AI, health bars, projectiles, wave manager
  game.js           State machine + main render loop
Source/
  KILLFRAME/
    Target.h        Original Unreal Engine actor stub (preserved)
Assets/
  Scripts/
    Core/
      GameManager.cs    Singleton: wave progression, score, pause, game-over
      EventManager.cs   Typed event bus + built-in game event structs
    Player/
      PlayerController.cs   CharacterController FPS movement (walk/sprint/jump)
      PlayerHealth.cs       HP, damage intake, wave healing, death
    Camera/
      CameraController.cs   Mouse-look: yaw on player body, pitch on camera
      CameraShake.cs        Perlin-noise procedural shake (singleton)
    Combat/
      IDamageable.cs        Interface implemented by any damageable entity
      WeaponController.cs   Hitscan fire, ammo, reload, muzzle-flash
      Projectile.cs         Physics projectile fired by enemies
```

---

## Technical Notes

* **Rendering** — Three.js r158, shadow-mapped PCF soft shadows, exponential fog.
* **FPS Camera** — Pointer Lock API; yaw on parent Object3D, pitch on PerspectiveCamera.
* **Shooting** — Instant hitscan via `THREE.Raycaster` from screen center.
* **Collision** — Arena AABB clamp + per-obstacle push-out; enemy projectiles use distance checks.
* **Sound** — Fully procedural via Web Audio API oscillators and noise buffers (no audio files).
* **Console / Gamepad** — Keyboard layout works on most console browser inputs; Gamepad API can be wired into `player.js` input handler.
