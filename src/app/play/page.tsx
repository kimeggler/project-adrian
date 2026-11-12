import type { Metadata } from "next";
import GameLoader from "@/components/GameLoader";

export const metadata: Metadata = {
  title: "Play – Little Knight",
};

export default function PlayPage() {
  return (
    <main className="h-dvh w-full bg-black">
      <GameLoader />
    </main>
  );
}
