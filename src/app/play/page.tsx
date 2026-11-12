import type { Metadata } from "next";
import GameLoader from "@/components/GameLoader";

export const metadata: Metadata = {
  title: "Play – Little Knight",
};

export default function PlayPage() {
  return (
    <main className="play-page h-dvh w-full bg-black">
      <GameLoader />
      <p className="rotate-hint" aria-hidden>
        Turn your phone sideways for a bigger view
      </p>
    </main>
  );
}
