//index.ts

import React from 'react';
// --- FIX: Import the main computer game screen ---
import LudoComputerGameScreen from "./computer/LudoComputerGameScreen"
import LudoOnline from "./online/LudoOnline"
import LudoBattleGroundUI from "./BattleGround/LudoBattleGroundUI"
import { useToast } from "../../hooks/useToast"

type LudoIndexProps = {
  mode: "computer" | "online" | "battle";
};

export default function LudoIndex({ mode }: LudoIndexProps) {
  const { toast } = useToast();
  // Note: The 'game' state is no longer needed for the computer mode,
  // as ComputerGameScreen manages its own state.
  // You might still need it for other modes.
  const [game, setGame] = React.useState<any>(null);

  React.useEffect(() => {
    if (mode === "battle") {
      toast({ title: "Welcome!", description: "Battle mode started", type: "info" });
    }
  }, [mode]);

  // --- FIX: Render the full game screen component ---
  if (mode === "computer") return <LudoComputerGameScreen />;

  if (mode === "online") return <LudoOnline />;
  return <LudoBattleGroundUI toast={toast} />;
}