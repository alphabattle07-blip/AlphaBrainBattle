# TODO: Fix Pick 2 and Pick 5 Logic in rules.ts (Rule1)

## Steps to Complete

1. **Update isValidMoveRule1**: Modify to allow defending by playing the same number (2 or 5) when pendingAction is "draw" and targets the current player. Remove or adjust defend state logic.

2. **Update applyCardEffectRule1**: 
   - For case 2 and 5: Remove stacking (pendingPick). Set pendingAction to "draw" with count (2 for 2, 3 for 5), targeting opponent, returnTurnTo original player.
   - Add logic for defense: If playing 2 or 5 when under "draw" pendingAction, clear pendingAction and set currentPlayer back to the original attacker.

3. **Verify pickCard and executeForcedDraw**: Ensure they handle the "draw" pendingAction correctly for rule1, similar to rule2. No changes needed if already compatible.

4. **Test the changes**: Run the game to ensure pick 2 and 5 work without freezing, and defense/draw mechanics function as described.

5. **Clean up**: Remove any unused code like pendingPick if no longer needed.

## Notes
- Rule2 is working perfectly, so reference its "draw" logic.
- After defense or draw, turn returns to original player, who can play another card or draw 1 normally.
- If opponent cannot defend, they draw the full count and turn returns.
