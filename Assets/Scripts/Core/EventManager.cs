using System;
using System.Collections.Generic;
using UnityEngine;

namespace KillFrame.Core
{
    /// <summary>
    /// Lightweight typed event bus that allows decoupled communication between systems.
    /// Usage:
    ///   EventManager.Subscribe&lt;PlayerDiedEvent&gt;(OnPlayerDied);
    ///   EventManager.Publish(new PlayerDiedEvent());
    ///   EventManager.Unsubscribe&lt;PlayerDiedEvent&gt;(OnPlayerDied);
    /// </summary>
    public static class EventManager
    {
        private static readonly Dictionary<Type, List<Delegate>> _handlers =
            new Dictionary<Type, List<Delegate>>();

        public static void Subscribe<T>(Action<T> handler) where T : struct
        {
            var type = typeof(T);
            if (!_handlers.TryGetValue(type, out var list))
            {
                list = new List<Delegate>();
                _handlers[type] = list;
            }

            if (!list.Contains(handler))
                list.Add(handler);
        }

        public static void Unsubscribe<T>(Action<T> handler) where T : struct
        {
            var type = typeof(T);
            if (_handlers.TryGetValue(type, out var list))
                list.Remove(handler);
        }

        public static void Publish<T>(T evt) where T : struct
        {
            var type = typeof(T);
            if (!_handlers.TryGetValue(type, out var list)) return;

            // Iterate over a snapshot to allow safe unsubscription inside handlers.
            var snapshot = list.ToArray();
            foreach (var handler in snapshot)
            {
                try
                {
                    ((Action<T>)handler)(evt);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[EventManager] Exception in handler for {type.Name}: {ex}");
                }
            }
        }

        public static void Clear()
        {
            _handlers.Clear();
        }
    }

    // ── Built-in game events ──────────────────────────────────────────────────

    public struct PlayerDiedEvent { }

    public struct PlayerHealthChangedEvent
    {
        public float Current;
        public float Max;
    }

    public struct EnemyKilledEvent
    {
        public Vector3 Position;
    }

    public struct WaveStartedEvent
    {
        public int Wave;
        public int EnemyCount;
    }

    public struct WaveClearedEvent
    {
        public int Wave;
    }
}
