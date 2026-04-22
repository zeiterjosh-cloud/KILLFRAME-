using KillFrame.Camera;
using KillFrame.Core;
using UnityEngine;

namespace KillFrame.Combat
{
    /// <summary>
    /// Hitscan weapon controller: fire, reload, and ammo management.
    /// Attach to the player and assign the camera transform for raycast origin.
    /// </summary>
    public class WeaponController : MonoBehaviour
    {
        [Header("Weapon Stats")]
        [SerializeField] private float damage = 25f;
        [SerializeField] private float range = 200f;
        [SerializeField] private float fireRate = 0.1f;   // seconds between shots

        [Header("Ammo")]
        [SerializeField] private int magazineSize = 30;
        [SerializeField] private float reloadTime = 1.5f;

        [Header("References")]
        [SerializeField] private Transform cameraTransform;
        [SerializeField] private LayerMask hitMask;

        [Header("VFX")]
        [SerializeField] private ParticleSystem muzzleFlash;

        public int CurrentAmmo { get; private set; }
        public int MagazineSize => magazineSize;
        public bool IsReloading { get; private set; }

        private float _nextFireTime;
        private bool _isAlive = true;

        private void Awake()
        {
            CurrentAmmo = magazineSize;
        }

        private void OnEnable()
        {
            EventManager.Subscribe<PlayerDiedEvent>(OnPlayerDied);
        }

        private void OnDisable()
        {
            EventManager.Unsubscribe<PlayerDiedEvent>(OnPlayerDied);
        }

        private void Update()
        {
            if (!_isAlive || GameManager.Instance.IsPaused) return;

            if (Input.GetMouseButton(0))
                TryFire();

            if (Input.GetKeyDown(KeyCode.R) && !IsReloading && CurrentAmmo < magazineSize)
                StartCoroutine(ReloadRoutine());
        }

        private void TryFire()
        {
            if (IsReloading || CurrentAmmo <= 0 || Time.time < _nextFireTime) return;

            _nextFireTime = Time.time + fireRate;
            CurrentAmmo--;

            muzzleFlash?.Play();
            CameraShake.Instance?.Shake(0.05f, 0.05f);

            var ray = new Ray(cameraTransform.position, cameraTransform.forward);
            if (Physics.Raycast(ray, out RaycastHit hit, range, hitMask))
            {
                var damageable = hit.collider.GetComponentInParent<IDamageable>();
                damageable?.TakeDamage(damage);
            }

            if (CurrentAmmo <= 0)
                StartCoroutine(ReloadRoutine());
        }

        private System.Collections.IEnumerator ReloadRoutine()
        {
            IsReloading = true;
            yield return new WaitForSeconds(reloadTime);
            CurrentAmmo = magazineSize;
            IsReloading = false;
        }

        private void OnPlayerDied(PlayerDiedEvent _)
        {
            _isAlive = false;
        }
    }
}
