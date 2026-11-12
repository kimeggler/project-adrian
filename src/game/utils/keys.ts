import type * as Phaser from "phaser";

/**
 * Listen for presses of one key, e.g. `onKeyPress(kb, "ENTER", fn)`.
 *
 * Phaser 4 dispatches keyboard events immediately but only clears its event
 * queue once per frame. When two keys arrive in the same frame, the queue is
 * processed again and the first key's "keydown-X" event fires a second time.
 * In a menu that means one press of ↓ can move two rows. This wrapper runs
 * `fn` at most once per browser event.
 *
 * Pass a shared `seen` set to several listeners (even in different scenes) so
 * that one key press is handled by only one of them — e.g. the Esc that
 * resumes the game must not also pause it again.
 */
export function onKeyPress(
  keyboard: Phaser.Input.Keyboard.KeyboardPlugin | null | undefined,
  keyName: string,
  fn: () => void,
  seen: WeakSet<KeyboardEvent> = new WeakSet(),
): void {
  if (!keyboard) return;
  keyboard.on(`keydown-${keyName}`, (event: KeyboardEvent) => {
    if (seen.has(event)) return;
    seen.add(event);
    fn();
  });
}

/** Shared by the pause (GameScene) and resume (PauseScene) key handlers. */
export const pauseToggleEvents = new WeakSet<KeyboardEvent>();
