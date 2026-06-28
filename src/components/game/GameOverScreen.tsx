"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skull, RotateCcw } from "lucide-react";

export function GameOverScreen() {
  const gameOverReason = useGameStore((s) => s.gameOverReason);
  const day = useGameStore((s) => s.day);
  const resetGame = useGameStore((s) => s.resetGame);
  const startGame = useGameStore((s) => s.startGame);

  const handleRestart = () => {
    resetGame();
    startGame();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-stone-900 border-red-900/50 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-950/50 border border-red-800/50 mb-4">
          <Skull className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-3xl font-black text-red-300 mb-2">GAME OVER</h2>
        <p className="text-stone-400 text-sm mb-1">
          You survived {day - 1} day{day - 1 !== 1 ? "s" : ""}.
        </p>
        <p className="text-stone-300 text-sm mb-6 italic">
          {gameOverReason || "The wasteland has claimed another."}
        </p>
        <Button
          onClick={handleRestart}
          className="w-full bg-amber-700 hover:bg-amber-600 text-amber-50"
          size="lg"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Start New Game
        </Button>
      </Card>
    </div>
  );
}
