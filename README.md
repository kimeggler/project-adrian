# Little Knight

A browser jump-and-run: a small knight runs through randomly generated levels. Built with
[Next.js](https://nextjs.org) (landing page) and [Phaser](https://phaser.io) (the game).
Requirements and the phase plan are in [REQUIREMENTS_1.md](REQUIREMENTS_1.md).

## Quick start (Node.js already installed)

```bash
npm ci
npm run dev
```

Then open <http://localhost:3000>.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm test` | Unit tests (Vitest, about a minute) |
| `npm run lint` | ESLint |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run sfx` | Regenerate the sound effects in `public/audio/` |

Useful URLs while developing: `/play?seed=4821&level=3` plays one level exactly,
`/play?testlevel` loads the handmade physics test level. `F1` in the game toggles the
debug overlay.

## Setup on Windows (no Node.js, no VS Code, no WSL)

Everything below runs natively on Windows 10 (version 1809 or later) or Windows 11, in the
normal **Command Prompt**. No WSL and no editor are needed to run the game. Any text editor
works for editing (Notepad++, Sublime Text, WebStorm, …).

### 1. Install Node.js and Git

Open **Command Prompt** (Start menu → type `cmd` → Enter) and run:

```bat
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Git.Git -e
```

Accept the prompts. If `winget` is not available, use the installers instead:

- Node.js: <https://nodejs.org> → **LTS** → Windows Installer (`.msi`). Keep the defaults.
  On the "Tools for Native Modules" page leave the checkbox **unticked**; this project
  doesn't need it.
- Git: <https://git-scm.com/download/win>. The defaults are fine.

Node.js **24 or newer** is required (Next.js 16). The current LTS is fine.

**Close the Command Prompt and open a new one**, so it picks up the new programs, then check:

```bat
node --version
npm --version
git --version
```

Each should print a version number. If you get "is not recognized as an internal or
external command", sign out of Windows and back in (or restart) and try again.

### 2. Get the code

Pick a folder for your projects, for example `C:\dev`. **Avoid OneDrive-synced folders**
(like `Documents` or `Desktop` when OneDrive backup is on): syncing thousands of
`node_modules` files makes the install slow and can lock files.

```bat
mkdir C:\dev
cd C:\dev
git clone https://github.com/kimeggler/project-adrian.git
cd project-adrian
```

If the repository is private, Git opens a browser window to sign in to GitHub the first time.
That is Git Credential Manager, which comes with Git for Windows.

Without Git you can also download the code from GitHub (**Code → Download ZIP**), extract it
to `C:\dev\project-adrian` and continue from there.

### 3. Install the dependencies

In the project folder:

```bat
npm ci
```

This installs exactly the versions in `package-lock.json`, including the Windows builds of
the native tools (the Next.js compiler, Tailwind CSS and Lightning CSS). It takes a minute or
two. Warnings about deprecated packages are fine; errors are not (see Troubleshooting).

> **Never copy `node_modules` from a Mac or Linux machine** (also not via USB stick, network
> share or a zip that contains it). Those folders contain platform-specific binaries and
> won't work on Windows. Always install with `npm ci` on the machine itself.

### 4. Start the development server

```bat
npm run dev
```

Wait for `✓ Ready`, then open <http://localhost:3000> in your browser. The page reloads
automatically when you change a file. Stop the server with `Ctrl + C` (answer `Y` if asked).

If Windows Defender Firewall asks whether Node.js may communicate on networks, you can click
**Cancel**: <http://localhost:3000> works either way. Only allow it (private networks) if you
want to open the game from another device on your network, such as a phone.

Next time you only need:

```bat
cd C:\dev\project-adrian
npm run dev
```

After pulling new changes (`git pull`), run `npm ci` again if `package-lock.json` changed.

### Troubleshooting

**`npm` in PowerShell: "running scripts is disabled on this system"**
PowerShell blocks npm's script wrapper by default. Use Command Prompt (`cmd`) as described
above, or call `npm.cmd run dev` in PowerShell, or allow local scripts once for your user:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**"Failed to load SWC binary", "Cannot find module '@next/swc-win32-…'", or errors about
`lightningcss` / `@tailwindcss/oxide`**
The native packages are missing or damaged, usually because `node_modules` was copied from
another computer or an install was interrupted. Delete it and the build cache, then reinstall:

```bat
rmdir /s /q node_modules
rmdir /s /q .next
npm ci
```

If it still fails, an antivirus program may have quarantined the `.node` file. Check its
quarantine, add an exclusion for `C:\dev`, and run `npm ci` again.

**The page loads but has no styling**
Start the server with plain `npm run dev`. Don't add `--webpack`: Tailwind CSS is set up
only for Turbopack (the default) in `next.config.ts`.

**"Port 3000 is in use"**
Next.js picks the next free port and prints it (for example <http://localhost:3001>). Or
close the other program using port 3000.

**`npm ci` fails with network or certificate errors**
On company networks a proxy may be required. Ask IT for the proxy address and set it with
`npm config set proxy http://proxy:port` and `npm config set https-proxy http://proxy:port`.

**No sound in the game**
Browsers only allow sound after a click. Start the game with the **Start game** button on
the landing page, and check the volume and mute settings on the landing page.

## Project layout

- `src/app/`: Next.js routes (`/` landing page, `/play` game)
- `src/components/`: landing page sections and the client-only game loader
- `src/game/`: the Phaser game (scenes, entities, level generator, pixel art)
- `scripts/generate-sfx.mjs`: sound effect generator
- `ASSETS_CREDITS.md`: sources and licenses of all art and sounds
