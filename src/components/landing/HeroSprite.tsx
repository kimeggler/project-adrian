"use client";

import { heroFrames } from "@/game/art/sprites";
import { getCharacter } from "@/game/characters";
import PixelSprite from "./PixelSprite";
import { useSave } from "./useSave";

/** The big running hero at the top of the page: whoever is selected. */
export default function HeroSprite() {
  const c = getCharacter(useSave().character);
  return <PixelSprite frames={heroFrames(c.look).run} scale={6} fps={10} label={`The ${c.name.toLowerCase()}, running`} />;
}
