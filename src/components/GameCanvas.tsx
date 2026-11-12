"use client";

import { useEffect, useRef } from "react";
import type * as Phaser from "phaser";

/**
 * Mounts the Phaser game and destroys it on unmount.
 * Always load this through GameLoader (client-only, no SSR).
 */
export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let game: Phaser.Game | undefined;
    let observer: ResizeObserver | undefined;
    let onWindowResize: (() => void) | undefined;
    let cancelled = false;

    // Import Phaser only in the browser; it touches `window` on load.
    import("@/game/main").then(({ createGame, fitIntegerZoom }) => {
      if (cancelled) return;
      game = createGame(container);
      const g = game;
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
  }, []);

  return (
    <div
      ref={containerRef}
      className="game-container flex h-full w-full items-center justify-center overflow-hidden"
    />
  );
}
