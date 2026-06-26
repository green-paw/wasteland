"use client";

import { useGameStore } from "@/game/store";
import { TopBar } from "@/components/game/TopBar";
import { BaseView } from "@/components/game/BaseView";
import { AreaMapView } from "@/components/game/AreaMapView";
import { SurvivorsView } from "@/components/game/SurvivorsView";
import { WorldMapHexView } from "@/components/game/WorldMapHexView";
import { IntroScreen } from "@/components/game/IntroScreen";
import { GameOverScreen } from "@/components/game/GameOverScreen";
import { GameLogPanel } from "@/components/game/GameLogPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Globe, Map, Home as HomeIcon, Users } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const started = useGameStore((s) => s.started);
  const gameOver = useGameStore((s) => s.gameOver);
  const [tab, setTab] = useState("area");

  if (!started) {
    return <IntroScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 text-stone-100">
      <TopBar />

      <main className="flex-1 p-3 sm:p-4 max-w-7xl w-full mx-auto">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="bg-stone-900 border border-stone-800 p-1 h-auto w-full grid grid-cols-4 mb-4">
            <TabsTrigger
              value="world"
              className="data-[state=active]:bg-purple-900/40 data-[state=active]:text-purple-200 text-stone-400 py-2"
            >
              <Globe className="w-4 h-4 mr-1 sm:mr-1.5" />
              <span className="text-[10px] sm:text-sm">World</span>
            </TabsTrigger>
            <TabsTrigger
              value="area"
              className="data-[state=active]:bg-emerald-900/40 data-[state=active]:text-emerald-200 text-stone-400 py-2"
            >
              <Map className="w-4 h-4 mr-1 sm:mr-1.5" />
              <span className="text-[10px] sm:text-sm">Area</span>
            </TabsTrigger>
            <TabsTrigger
              value="base"
              className="data-[state=active]:bg-amber-900/40 data-[state=active]:text-amber-200 text-stone-400 py-2"
            >
              <HomeIcon className="w-4 h-4 mr-1 sm:mr-1.5" />
              <span className="text-[10px] sm:text-sm">Base</span>
            </TabsTrigger>
            <TabsTrigger
              value="survivors"
              className="data-[state=active]:bg-sky-900/40 data-[state=active]:text-sky-200 text-stone-400 py-2"
            >
              <Users className="w-4 h-4 mr-1 sm:mr-1.5" />
              <span className="text-[10px] sm:text-sm">Survivors</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="world" className="mt-0">
            <WorldMapHexView />
          </TabsContent>

          <TabsContent value="area" className="mt-0">
            <AreaMapView />
          </TabsContent>

          <TabsContent value="base" className="mt-0 space-y-4">
            <BaseView />
            <GameLogPanel />
          </TabsContent>

          <TabsContent value="survivors" className="mt-0">
            <SurvivorsView />
          </TabsContent>
        </Tabs>
      </main>

      {gameOver && <GameOverScreen />}
    </div>
  );
}
