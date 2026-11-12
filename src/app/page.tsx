import Link from "next/link";

// Placeholder landing page. The retro landing page (LP-1) is built in phase 5.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-900 p-8 text-center text-zinc-100">
      <h1 className="text-4xl font-bold tracking-tight">Little Knight</h1>
      <Link
        href="/play"
        className="rounded border-2 border-zinc-100 px-6 py-3 font-mono text-lg hover:bg-zinc-100 hover:text-zinc-900"
      >
        Start game
      </Link>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-left font-mono text-sm text-zinc-400">
        <dt>Move</dt>
        <dd>← → / A D</dd>
        <dt>Jump</dt>
        <dd>Space / W / ↑</dd>
        <dt>Debug</dt>
        <dd>F1</dd>
      </dl>
    </main>
  );
}
