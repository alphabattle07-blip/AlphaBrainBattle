# TODO: Implement WHOT Card Behavior for Number 20

## Pending Tasks
- [ ] Update src/games/whot/mode/core/types.ts: Add calledSuit?: CardSuit; to the Card interface.
- [ ] Update src/games/whot/mode/core/game.ts: Modify callSuit to set calledSuit on the top pile card instead of in GameState.
- [ ] Update src/games/whot/mode/core/rules.ts: Change references to calledSuit in GameState to check the top pile card's calledSuit.
- [ ] Update src/games/whot/mode/core/ui/WhotCardFace.tsx: If suit === 'whot' and calledSuit exists, render the shape instead of "WHOT".
- [ ] Create src/games/whot/mode/core/ui/WhotShapeSelector.tsx: A modal component displaying 5 shapes (circle, triangle, cross, square, star) for selection.
- [ ] Update src/games/whot/mode/computer/WhotComputerGameScreen.tsx: Add showShapeSelector state, render WhotShapeSelector when pendingAction is "call_suit" and currentPlayer is 0, handle selection by calling callSuit.
- [ ] Update src/games/whot/mode/computer/whotComputerLogic.ts: Add logic for AI to choose a suit when pendingAction is "call_suit".
- [ ] Update handleComputerTurn in WhotComputerGameScreen.tsx: If pendingAction is "call_suit", randomly select a suit and call callSuit.

## Followup Steps
- [ ] Test the WHOT card behavior: Play WHOT, select shape, verify display on card.
- [ ] Test computer suit selection.
- [ ] Ensure no regressions in game logic.
