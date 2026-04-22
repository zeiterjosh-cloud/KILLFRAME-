using System;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace KillFrame.Core
{
    /// <summary>
    /// Singleton that owns global game state: wave progression, score, and pause.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Wave Settings")]
        [SerializeField] private int baseEnemiesPerWave = 3;
        [SerializeField] private int enemiesAddedPerWave = 2;

        [Header("Score")]
        [SerializeField] private int scorePerKill = 100;
        [SerializeField] private int waveClearBonus = 300;

        public int CurrentWave { get; private set; } = 1;
        public int Score { get; private set; }
        public int EnemiesRemainingInWave { get; private set; }
        public bool IsPaused { get; private set; }
        public bool IsGameOver { get; private set; }

        public event Action<int> OnWaveStarted;
        public event Action<int> OnScoreChanged;
        public event Action OnGameOver;
        public event Action<bool> OnPauseToggled;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            StartWave(CurrentWave);
        }

        private void Update()
        {
            if (Input.GetKeyDown(KeyCode.Escape) && !IsGameOver)
                TogglePause();
        }

        public void StartWave(int wave)
        {
            CurrentWave = wave;
            EnemiesRemainingInWave = baseEnemiesPerWave + (wave - 1) * enemiesAddedPerWave;
            IsGameOver = false;

            OnWaveStarted?.Invoke(CurrentWave);
            EventManager.Publish(new WaveStartedEvent
            {
                Wave = CurrentWave,
                EnemyCount = EnemiesRemainingInWave
            });
        }

        public void RegisterEnemyKill()
        {
            AddScore(scorePerKill * CurrentWave);

            EnemiesRemainingInWave = Mathf.Max(0, EnemiesRemainingInWave - 1);
            if (EnemiesRemainingInWave == 0)
                CompleteWave();
        }

        private void CompleteWave()
        {
            AddScore(waveClearBonus * CurrentWave);
            EventManager.Publish(new WaveClearedEvent { Wave = CurrentWave });
            StartWave(CurrentWave + 1);
        }

        public void TriggerGameOver()
        {
            if (IsGameOver) return;

            IsGameOver = true;
            IsPaused = false;
            Time.timeScale = 0f;
            OnGameOver?.Invoke();
        }

        public void TogglePause()
        {
            IsPaused = !IsPaused;
            Time.timeScale = IsPaused ? 0f : 1f;
            OnPauseToggled?.Invoke(IsPaused);
        }

        public void RestartGame()
        {
            Time.timeScale = 1f;
            SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
        }

        private void AddScore(int amount)
        {
            Score += amount;
            OnScoreChanged?.Invoke(Score);
        }
    }
}
