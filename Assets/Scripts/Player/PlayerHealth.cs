using KillFrame.Core;
using UnityEngine;

namespace KillFrame.Player
{
    /// <summary>
    /// Manages player HP, damage intake, healing, and death.
    /// </summary>
    public class PlayerHealth : MonoBehaviour
    {
        [Header("Health")]
        [SerializeField] private float maxHealth = 100f;
        [SerializeField] private float waveHealAmount = 20f;

        public float CurrentHealth { get; private set; }
        public float MaxHealth => maxHealth;
        public bool IsAlive => CurrentHealth > 0f;

        private void Awake()
        {
            CurrentHealth = maxHealth;
        }

        private void OnEnable()
        {
            EventManager.Subscribe<WaveClearedEvent>(OnWaveCleared);
        }

        private void OnDisable()
        {
            EventManager.Unsubscribe<WaveClearedEvent>(OnWaveCleared);
        }

        public void TakeDamage(float amount)
        {
            if (!IsAlive) return;

            CurrentHealth = Mathf.Max(0f, CurrentHealth - amount);
            EventManager.Publish(new PlayerHealthChangedEvent
            {
                Current = CurrentHealth,
                Max = maxHealth
            });

            if (CurrentHealth <= 0f)
                Die();
        }

        public void Heal(float amount)
        {
            if (!IsAlive) return;

            CurrentHealth = Mathf.Min(maxHealth, CurrentHealth + amount);
            EventManager.Publish(new PlayerHealthChangedEvent
            {
                Current = CurrentHealth,
                Max = maxHealth
            });
        }

        private void Die()
        {
            EventManager.Publish(new PlayerDiedEvent());
            GameManager.Instance.TriggerGameOver();
        }

        private void OnWaveCleared(WaveClearedEvent _)
        {
            Heal(waveHealAmount);
        }
    }
}
