/** Events emitted on `game.events` for the React host page. */
export const GameEvent = {
  /** The player chose "Quit to menu" / "Back to menu". */
  QUIT_TO_MENU: "quit-to-menu",
  /** A level was created. Payload: LevelStartedEvent. */
  LEVEL_STARTED: "level-started",
} as const;

/** Game registry key holding the LevelStartData for the first level. */
export const START_DATA_KEY = "startData";

export interface LevelStartedEvent {
  seed: number;
  level: number;
  testLevel: boolean;
}
