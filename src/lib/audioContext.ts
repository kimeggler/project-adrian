/**
 * One AudioContext for the whole app (browser only).
 *
 * Browsers keep audio blocked until the user interacts with the page. The
 * landing page calls `unlockAudio()` from the "Start game" click (AU-2), and
 * the game hands this same context to Phaser, so sound works right away.
 * Phaser only suspends (not closes) a context it was given, so it can be
 * reused when the game is created again.
 */

let context: AudioContext | undefined;

export function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return undefined;
    context = new Ctor();
  }
  return context;
}

/** Call from a user gesture (click, key press, tap). Safe to call repeatedly. */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state !== "running") void ctx.resume().catch(() => {});
  // Playing a silent buffer completes the unlock on older Safari versions.
  const source = ctx.createBufferSource();
  source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  source.connect(ctx.destination);
  source.start(0);
}
