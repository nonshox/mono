"use client";

import { AudioLines, Sprout, Wind } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BreathTab } from "@/components/features/pause/breath-tab";
import { SoundTab } from "@/components/features/pause/sound-tab";
import { GroundTab } from "@/components/features/pause/ground-tab";

type Tab = "breath" | "sound" | "ground";

export function PauseExperience() {
  const [tab, setTab] = useState<Tab>("breath");

  return (
    <main className="min-h-full w-full bg-background px-3 pb-24 pt-5 sm:px-6 sm:pt-8">
      <h1 className="sr-only">Pause</h1>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 md:max-w-3xl">
        <header className="px-1">
          <h2 className="type-title text-foreground">Pause</h2>
          <p className="mt-1 text-xs text-foreground">
            Breathe. Listen. Land. All of it runs on this device.
          </p>
        </header>

        <div
          aria-label="Pause sections"
          className="flex gap-1 rounded-2xl border-2 border-border/70 bg-popover p-1"
          role="tablist"
        >
          <Button
            aria-controls="pause-panel-breath"
            aria-selected={tab === "breath"}
            className="h-11 flex-1 gap-2 rounded-xl text-xs font-bold"
            id="pause-tab-breath"
            onClick={() => setTab("breath")}
            role="tab"
            type="button"
            variant={tab === "breath" ? "default" : "ghost"}
          >
            <Wind aria-hidden="true" className="size-4" strokeWidth={1.8} />
            Breath
          </Button>
          <Button
            aria-controls="pause-panel-sound"
            aria-selected={tab === "sound"}
            className="h-11 flex-1 gap-2 rounded-xl text-xs font-bold"
            id="pause-tab-sound"
            onClick={() => setTab("sound")}
            role="tab"
            type="button"
            variant={tab === "sound" ? "default" : "ghost"}
          >
            <AudioLines aria-hidden="true" className="size-4" strokeWidth={1.8} />
            Sound
          </Button>
          <Button
            aria-controls="pause-panel-ground"
            aria-selected={tab === "ground"}
            className="h-11 flex-1 gap-2 rounded-xl text-xs font-bold"
            id="pause-tab-ground"
            onClick={() => setTab("ground")}
            role="tab"
            type="button"
            variant={tab === "ground" ? "default" : "ghost"}
          >
            <Sprout aria-hidden="true" className="size-4" strokeWidth={1.8} />
            Ground
          </Button>
        </div>

        <div
          aria-labelledby="pause-tab-breath"
          hidden={tab !== "breath"}
          id="pause-panel-breath"
          role="tabpanel"
        >
          <BreathTab />
        </div>
        <div
          aria-labelledby="pause-tab-sound"
          hidden={tab !== "sound"}
          id="pause-panel-sound"
          role="tabpanel"
        >
          <SoundTab />
        </div>
        <div
          aria-labelledby="pause-tab-ground"
          hidden={tab !== "ground"}
          id="pause-panel-ground"
          role="tabpanel"
        >
          <GroundTab />
        </div>
      </div>
    </main>
  );
}
