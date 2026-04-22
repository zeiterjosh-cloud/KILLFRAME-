using KillFrame.Player;
using UnityEngine;

namespace KillFrame.Combat
{
    /// <summary>
    /// Physics-driven projectile fired by enemies.
    /// On collision with the player it deals damage; on any other surface it destroys itself.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public class Projectile : MonoBehaviour
    {
        [SerializeField] private float speed = 15f;
        [SerializeField] private float damage = 10f;
        [SerializeField] private float lifetime = 5f;

        [SerializeField] private GameObject impactVfxPrefab;

        private void Start()
        {
            GetComponent<Rigidbody>().linearVelocity = transform.forward * speed;
            Destroy(gameObject, lifetime);
        }

        private void OnCollisionEnter(Collision collision)
        {
            SpawnImpactVfx(collision.contacts[0].point);

            var health = collision.collider.GetComponentInParent<PlayerHealth>();
            health?.TakeDamage(damage);

            Destroy(gameObject);
        }

        private void SpawnImpactVfx(Vector3 position)
        {
            if (impactVfxPrefab != null)
                Destroy(Instantiate(impactVfxPrefab, position, Quaternion.identity), 2f);
        }
    }
}
