namespace KillFrame.Combat
{
    /// <summary>
    /// Implemented by any entity that can receive damage (enemies, destructibles, etc.).
    /// </summary>
    public interface IDamageable
    {
        /// <summary>Apply <paramref name="amount"/> points of damage to this entity.</summary>
        void TakeDamage(float amount);
    }
}
