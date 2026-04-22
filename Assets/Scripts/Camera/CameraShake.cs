using System.Collections;
using UnityEngine;

namespace KillFrame.Camera
{
    /// <summary>
    /// Procedural camera shake using Perlin noise.
    /// Call <see cref="Shake"/> from weapon fire, explosions, or damage events.
    /// </summary>
    public class CameraShake : MonoBehaviour
    {
        public static CameraShake Instance { get; private set; }

        [Header("Defaults")]
        [SerializeField] private float defaultDuration = 0.2f;
        [SerializeField] private float defaultMagnitude = 0.15f;

        private Vector3 _originalLocalPosition;
        private Coroutine _shakeCoroutine;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(this);
                return;
            }

            Instance = this;
            _originalLocalPosition = transform.localPosition;
        }

        /// <summary>Trigger a shake with the default duration and magnitude.</summary>
        public void Shake() => Shake(defaultDuration, defaultMagnitude);

        /// <summary>Trigger a shake with custom parameters.</summary>
        public void Shake(float duration, float magnitude)
        {
            if (_shakeCoroutine != null)
                StopCoroutine(_shakeCoroutine);

            _shakeCoroutine = StartCoroutine(ShakeRoutine(duration, magnitude));
        }

        private IEnumerator ShakeRoutine(float duration, float magnitude)
        {
            float elapsed = 0f;
            float seed = Random.value * 100f;

            while (elapsed < duration)
            {
                float t = elapsed / duration;
                float damping = 1f - t; // linear fade-out

                float offsetX = (Mathf.PerlinNoise(seed + elapsed * 20f, 0f) * 2f - 1f) * magnitude * damping;
                float offsetY = (Mathf.PerlinNoise(0f, seed + elapsed * 20f) * 2f - 1f) * magnitude * damping;

                transform.localPosition = _originalLocalPosition + new Vector3(offsetX, offsetY, 0f);

                elapsed += Time.deltaTime;
                yield return null;
            }

            transform.localPosition = _originalLocalPosition;
            _shakeCoroutine = null;
        }
    }
}
