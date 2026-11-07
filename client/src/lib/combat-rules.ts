// ============================================================
// Combat rules the UI needs to mirror from the server (game-logic.ts)
// Kept free of imports so it can be unit-tested on its own.
// ============================================================

/**
 * A player can be attacked directly when the attacker has Bypass or when no
 * enemy card can be targeted. Stealthed cards can't be targeted, so they
 * don't block a direct attack (same rule as the `attack` reducer).
 */
export function canAttackPlayerDirectly(
    attackerKeywords: readonly string[],
    enemyField: readonly { stealthTurns: number }[],
): boolean {
    if (attackerKeywords.includes('bypass')) return true;
    return enemyField.every(card => card.stealthTurns > 0);
}
