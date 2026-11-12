"use client";

import { useRouter } from "next/navigation";
import { unlockAudio } from "@/lib/audioContext";

/**
 * "Start game" (LP-1). The click is the user gesture browsers require before
 * playing sound, so it also unlocks the shared AudioContext (AU-2).
 */
export default function StartButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      autoFocus
      onClick={() => {
        unlockAudio();
        router.push("/play");
      }}
      className="pixel-button"
    >
      ▶ Start game
    </button>
  );
}
