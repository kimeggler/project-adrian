"use client";

import { useId } from "react";
import { updateSettings, type Settings } from "@/game/systems/Save";
import { useSave } from "./useSave";

/**
 * Settings on the landing page (LP-3). Same saved settings as the in-game
 * settings screen (pause menu → Settings).
 */
export default function SettingsPanel() {
  const { settings } = useSave();
  const id = useId();

  const volume = (key: "sfxVolume" | "musicVolume", label: string) => (
    <div className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3">
      <label htmlFor={`${id}-${key}`}>{label}</label>
      <input
        id={`${id}-${key}`}
        type="range"
        min={0}
        max={100}
        step={10}
        value={Math.round(settings[key] * 100)}
        onChange={(e) => updateSettings({ [key]: Number(e.target.value) / 100 })}
        className="pixel-range"
      />
      <output htmlFor={`${id}-${key}`} className="text-right">
        {Math.round(settings[key] * 100)}%
      </output>
    </div>
  );

  const toggle = (label: string, checked: boolean, patch: (on: boolean) => Partial<Settings>) => (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => updateSettings(patch(e.target.checked))}
        className="pixel-switch"
      />
    </label>
  );

  return (
    <section aria-labelledby={`${id}-title`} className="pixel-panel w-full max-w-md">
      <h2 id={`${id}-title`} className="mb-4 text-center text-xs text-[#fbf236]">
        Settings
      </h2>
      <div className="flex flex-col gap-4 text-[10px]">
        {volume("sfxVolume", "Effects")}
        {volume("musicVolume", "Music")}
        {toggle("Sound", !settings.muted, (on) => ({ muted: !on }))}
        {toggle("Screen shake", settings.screenShake, (on) => ({ screenShake: on }))}
      </div>
    </section>
  );
}
