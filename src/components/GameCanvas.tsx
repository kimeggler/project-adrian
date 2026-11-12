"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type * as Phaser from "phaser";
import { GameEvent, type LevelStartedEvent } from "@/game/events";
import { parseSeed, randomSeed } from "@/game/levelgen/seed";
import type { LevelStartData } from "@/game/types";

/**
 * Start data from the URL: ?seed=4821&level=3 reproduces a level exactly
 * (WO-5). Without a seed a random one is picked. ?testlevel loads the
 * handmade physics test level.
 */
function startDataFromUrl(): LevelStartData {
  const params = new URLSearchParams(window.location.search);
  const level = Number(params.get("level"));
  return {
    seed: parseSeed(params.get("seed")) ?? randomSeed(),
    level: Number.isInteger(level) && level >= 1 ? level : 1,
    testLevel: params.has("testlevel"),
  };
}

/**
 * The site's pixel font (next/font gives it a generated family name, so read
 * it from the page). Waits until it is loaded so canvas text can use it;
 * falls back to the browser's monospace after a short timeout.
 */
async function loadPixelFont(): Promise<string> {
  const family = getComputedStyle(document.body).fontFamily;
  const timeout = new Promise((resolve) => setTimeout(resolve, 1500));
  await Promise.race([document.fonts.load(`8px ${family}`).catch(() => {}), timeout]);
  return family;
}

/** Keep the URL in sync with the level being played, so it can be shared. */
function writeLevelToUrl({ seed, level, testLevel }: LevelStartedEvent): void {
  const query = `?seed=${seed}&level=${level}${testLevel ? "&testlevel" : ""}`;
  window.history.replaceState(null, "", query);
}

/**
 * Mounts the Phaser game and destroys it on unmount.
 * Always load this through GameLoader (client-only, no SSR).
 */
export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let game: Phaser.Game | undefined;
    let observer: ResizeObserver | undefined;
    let onWindowResize: (() => void) | undefined;
    let cancelled = false;

    // Import Phaser only in the browser; it touches `window` on load.
    const modules = Promise.all([
      import("@/game/main"),
      import("@/game/ui/font"),
      loadPixelFont(),
    ]);
    modules.then(([{ createGame, fitIntegerZoom }, { setUiFont }, fontFamily]) => {
      if (cancelled) return;
      setUiFont(fontFamily);
      game = createGame(container, startDataFromUrl());
      const g = game;
      g.events.once(GameEvent.QUIT_TO_MENU, () => router.push("/"));
      g.events.on(GameEvent.LEVEL_STARTED, writeLevelToUrl);
      if (process.env.NODE_ENV === "development") {
        // Handle for debugging in the browser console (dev builds only).
        (window as unknown as { __game?: Phaser.Game }).__game = g;
      }
      const refit = () => fitIntegerZoom(g, container);
      observer = new ResizeObserver(refit);
      observer.observe(container);
      // Also catches devicePixelRatio changes (browser zoom, moving windows
      // between screens), which don't always resize the container.
      onWindowResize = refit;
      window.addEventListener("resize", refit);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (onWindowResize) window.removeEventListener("resize", onWindowResize);
      game?.destroy(true);
    };
  }, [router]);

  return (
    <div
      ref={containerRef}
      className="game-container flex h-full w-full items-center justify-center overflow-hidden"
    />
  );
}
