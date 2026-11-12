"use client";

import { useSave } from "./useSave";

/** Best score and highest level reached, from the local save (LP-4). */
export default function Records() {
  const { bestScore, highestLevel } = useSave();
  if (bestScore === 0 && highestLevel === 0) return null;

  return (
    <dl className="flex gap-6 text-center text-[10px] [text-shadow:2px_2px_0_#222034]">
      <div>
        <dt className="mb-2 text-[#cbdbfc]">Best score</dt>
        <dd className="text-[#fbf236]">{String(bestScore).padStart(6, "0")}</dd>
      </div>
      <div>
        <dt className="mb-2 text-[#cbdbfc]">Highest level</dt>
        <dd className="text-[#fbf236]">{highestLevel}</dd>
      </div>
    </dl>
  );
}
