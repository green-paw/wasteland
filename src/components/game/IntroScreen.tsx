"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skull, Map, Home, Users, Moon } from "lucide-react";

export function IntroScreen() {
  const startGame = useGameStore((s) => s.startGame);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-700 to-stone-900 border border-amber-900/50 mb-4 shadow-2xl shadow-amber-900/30">
            <Skull className="w-10 h-10 text-amber-300" />
          </div>
          <h1 className="text-5xl font-black text-amber-100 tracking-tight mb-2">
            WASTELAND
          </h1>
          <p className="text-stone-400 text-sm uppercase tracking-[0.3em]">
            Post-Apocalyptic Survival
          </p>
        </div>

        <Card className="bg-stone-900/70 border-stone-800 p-6 mb-4">
          <p className="text-stone-300 text-sm leading-relaxed mb-4">
            The world ended years ago. You are alone in an abandoned shelter
            with meager supplies. Around you, the wasteland stretches out —
            ruined cities, silent suburbs, overrun military bases. Somewhere
            out there, others survive. Find them. Build a home. Stay alive.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FeatureCard
              icon={<Home className="w-5 h-5 text-amber-400" />}
              title="Build Your Base"
              desc="Upgrade shelters, farms, wells, infirmaries, and defenses. Keep survivors fed, healed, and safe from bandit raids."
            />
            <FeatureCard
              icon={<Map className="w-5 h-5 text-emerald-400" />}
              title="Explore the Wastes"
              desc="Dispatch teams to scout locations across a randomly generated 3D world map. Fight zombies, raiders, mutants, and wild dogs."
            />
            <FeatureCard
              icon={<Users className="w-5 h-5 text-sky-400" />}
              title="Manage Survivors"
              desc="Recruit new survivors from the wasteland. Form teams, balance skills, and keep morale high."
            />
          </div>
        </Card>

        <Card className="bg-stone-900/70 border-stone-800 p-4 mb-6">
          <div className="flex items-start gap-2.5">
            <Moon className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-300 leading-relaxed">
              <span className="font-semibold text-amber-200">Day-based gameplay:</span>{" "}
              Each turn you plan — assign teams, upgrade buildings, rest
              survivors — then press <span className="font-mono text-amber-300">End Day</span> to let
              the night unfold. Missions resolve, resources tick, and random
              events can change everything.
            </div>
          </div>
        </Card>

        <Button
          onClick={startGame}
          size="lg"
          className="w-full bg-amber-700 hover:bg-amber-600 text-amber-50 text-lg h-14 shadow-xl shadow-amber-900/40 border border-amber-600/50"
        >
          <Skull className="w-5 h-5 mr-2" />
          Begin Survival
        </Button>

        <p className="text-center text-[10px] text-stone-600 mt-4">
          Tip: Each day costs food and water per survivor. Build farms and
          wells early.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-stone-950/50 border border-stone-800 rounded p-3">
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <div className="text-sm font-semibold text-stone-100">{title}</div>
      </div>
      <p className="text-[11px] text-stone-400 leading-snug">{desc}</p>
    </div>
  );
}
