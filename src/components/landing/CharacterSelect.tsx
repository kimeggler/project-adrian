"use client";

import { useId } from "react";
import { heroFrames } from "@/game/art/sprites";
import { CHARACTERS } from "@/game/characters";
import { selectCharacter } from "@/game/systems/Save";
import PixelSprite from "./PixelSprite";
import { useSave } from "./useSave";

/** Frames are pure data; build them once for every hero. */
const FRAMES = Object.fromEntries(CHARACTERS.map((c) => [c.id, heroFrames(c.look)]));

/**
 * Character select (LP-5, CB-9). The pick is stored in the local save and
 * used for the next run. Locked heroes are greyed out and say how to unlock
 * them.
 */
export default function CharacterSelect() {
  const { character, unlockedCharacters } = useSave();
  const id = useId();

  return (
    <fieldset className="w-full max-w-md">
      <legend className="mb-3 w-full text-center text-[10px] text-white [text-shadow:2px_2px_0_#222034]">
        Choose your hero
      </legend>
      <div className="grid grid-cols-3 gap-3">
        {CHARACTERS.map((c) => {
          const unlocked = unlockedCharacters.includes(c.id);
          const selected = c.id === character;
          return (
            <label
              key={c.id}
              className={`hero-card ${unlocked ? "" : "hero-card-locked"}`}
              data-selected={selected || undefined}
            >
              <input
                type="radio"
                name={`${id}-hero`}
                value={c.id}
                checked={selected}
                disabled={!unlocked}
                onChange={() => selectCharacter(c.id)}
                className="sr-only"
              />
              <PixelSprite
                frames={selected ? FRAMES[c.id].run : FRAMES[c.id].idle}
                scale={4}
                fps={selected ? 10 : 3}
                label={unlocked ? c.name : `${c.name} (locked)`}
              />
              <span className="text-[10px] text-[#fbf236]">{c.name}</span>
              <span className="text-[7px] leading-relaxed text-[#cbdbfc]">
                {unlocked ? c.blurb : `Locked: reach level ${c.unlockLevel}`}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
