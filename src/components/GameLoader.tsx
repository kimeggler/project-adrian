"use client";

import dynamic from "next/dynamic";

// `ssr: false` is only allowed in Client Components, so it lives here.
const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

export default function GameLoader() {
  return <GameCanvas />;
}
