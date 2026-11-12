/** Controls help on the landing page (LP-1). Keep in sync with KEY_BINDINGS in src/game/systems/Input.ts. */
const CONTROLS: { action: string; keys: string[] }[] = [
  { action: "Move", keys: ["←", "→", "A", "D"] },
  { action: "Jump", keys: ["Space", "W", "↑"] },
  { action: "Pause", keys: ["Esc", "P"] },
];

export default function Controls() {
  return (
    <section aria-labelledby="controls-title" className="pixel-panel w-full max-w-md">
      <h2 id="controls-title" className="mb-4 text-center text-xs text-[#fbf236]">
        Controls
      </h2>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-[10px]">
        {CONTROLS.map(({ action, keys }) => (
          <div key={action} className="contents">
            <dt className="text-right">{action}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {keys.map((k) => (
                <kbd key={k} className="pixel-key">
                  {k}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-center text-[8px] leading-relaxed text-[#cbdbfc]">
        Gamepad: D-pad or stick to move, A to jump, Start to pause. On phones and tablets,
        on-screen buttons appear.
      </p>
      <p className="mt-3 text-center text-[8px] leading-relaxed text-[#cbdbfc]">
        Hold jump to jump higher. Collect coins, dodge spikes, reach the flag!
      </p>
    </section>
  );
}
