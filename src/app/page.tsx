import CharacterSelect from "@/components/landing/CharacterSelect";
import Controls from "@/components/landing/Controls";
import HeroSprite from "@/components/landing/HeroSprite";
import PixelSprite from "@/components/landing/PixelSprite";
import Records from "@/components/landing/Records";
import SettingsPanel from "@/components/landing/SettingsPanel";
import StartButton from "@/components/landing/StartButton";
import { COIN_FRAMES } from "@/game/art/sprites";

/**
 * Retro landing page (LP-1). Built from independent sections so more can be
 * added (LP-2): character select, records and settings are sections; the
 * daily challenge (P2) can follow as a new section here or as its own route.
 */
export default function Home() {
  return (
    <main className="landing">
      <section className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-4">
          <PixelSprite frames={COIN_FRAMES} scale={4} fps={8} label="Spinning coin" />
          <h1 className="pixel-title">
            Little
            <br />
            Knight
          </h1>
          <PixelSprite frames={COIN_FRAMES} scale={4} fps={8} label="Spinning coin" />
        </div>
        <HeroSprite />
        <p className="max-w-sm text-[10px] leading-relaxed text-white [text-shadow:2px_2px_0_#222034]">
          A tiny knight. A big, random world. Every run is new.
        </p>
        <CharacterSelect />
        <StartButton />
        <Records />
      </section>

      <Controls />
      <SettingsPanel />

      <footer className="text-center text-[8px] leading-relaxed text-[#222034]">
        All art and sounds are original. Font: Press Start 2P (SIL OFL).
      </footer>

      <div className="landing-ground" aria-hidden />
    </main>
  );
}
