"use client";

import { useSyncExternalStore } from "react";
import {
  defaultSave,
  getSave,
  resetSaveCache,
  SAVE_KEY,
  subscribeSave,
  type SaveData,
} from "@/game/systems/Save";

/** Rendered on the server and during hydration: no localStorage there. */
const SERVER_SAVE = defaultSave();

function subscribe(onChange: () => void): () => void {
  const unsubscribe = subscribeSave(onChange);
  // Another tab (e.g. the game in a second window) changed the save.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== SAVE_KEY) return;
    resetSaveCache();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", onStorage);
  };
}

/** The local save, kept up to date. Defaults until hydrated. */
export function useSave(): SaveData {
  return useSyncExternalStore(subscribe, getSave, () => SERVER_SAVE);
}
