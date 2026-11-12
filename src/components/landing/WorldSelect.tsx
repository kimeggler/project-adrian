"use client";

import { useId } from "react";
import { selectWorld } from "@/game/systems/Save";
import { WORLDS } from "@/game/worlds";
import { useSave } from "./useSave";
import WorldPreview from "./WorldPreview";

/** World skin select, next to the character select. Stored in the local save. */
export default function WorldSelect() {
  const { world } = useSave();
  const id = useId();

  return (
    <fieldset className="w-full max-w-md">
      <legend className="mb-3 w-full text-center text-[10px] text-white [text-shadow:2px_2px_0_#222034]">
        Choose your world
      </legend>
      <div className="flex flex-wrap justify-center gap-3">
        {WORLDS.map((w) => (
          <label key={w.id} className="hero-card" data-selected={w.id === world || undefined}>
            <input
              type="radio"
              name={`${id}-world`}
              value={w.id}
              checked={w.id === world}
              onChange={() => selectWorld(w.id)}
              className="sr-only"
            />
            <WorldPreview world={w} />
            <span className="text-[10px] text-[#fbf236]">{w.name}</span>
            <span className="text-[7px] leading-relaxed text-[#cbdbfc]">{w.blurb}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
