# Wardrobe Stylist

Wardrobe Stylist is a Next.js app for clothing catalog management, outfit composition, outfit board generation, and try-on preview.

Long-form Markdown for this repo lives in **`docs/`**. The root [`README.md`](../README.md) and [`AGENTS.md`](../AGENTS.md) are short stubs so GitHub and tooling still find entry points.

### Documentation in this folder

- [AGENTS.md](./AGENTS.md) — product focus and agent rules
- [PHOTO_GUIDE.md](./PHOTO_GUIDE.md) — clothing photo capture guidelines
- [IMAGE_GUIDE.md](./IMAGE_GUIDE.md) — image pipeline notes
- [AI_VISION_MVP_PLAN.md](./AI_VISION_MVP_PLAN.md), [AI_CLASSIFICATION_PLAN.md](./AI_CLASSIFICATION_PLAN.md), [BATCH_UPLOAD_PLAN.md](./BATCH_UPLOAD_PLAN.md) — planning notes
- [USER.md](./USER.md), [MEMORY.md](./MEMORY.md) — working notes
- [skills/](./skills/) — optional Cursor skill prompts

### Clearing `public/uploads` and the database

Deleting images under `public/uploads/` does not automatically change SQLite. Stored fields such as `imageUrl`, `boardImageUrl`, or `tryOnImageUrl` will still reference old paths and will 404 until you either re-upload, edit rows, or reset the database.

For a clean slate in local development you can remove `prisma/dev.db` and run `npx prisma db push` (or `npx prisma migrate reset` if you use migrations).

**One-shot reset (uploads + SQLite):** from the repo root, stop `npm run dev`, then run:

```bash
npm run reset:local -- --yes
```

Equivalent: `RESET_LOCAL_DATA=1 npm run reset:local` (no `--` needed before the env on Unix).

If an API key ever appeared in git history, rotate it with your provider and keep secrets only in `.env.local` (never commit).

## Current Stage

This project is in the "data and workflow first" stage:
- Clothing item management
- Outfit composition and persistence
- Outfit board generation
- Try-on generation API integration

## Tech Stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- Prisma + SQLite
- Tailwind CSS

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+ (recommended)
- npm 10+

### Install and run

```bash
npm install
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional environment variables

Create `.env.local` if you want AI image generation enabled:

```env
DASHSCOPE_API_KEY=your_api_key
DASHSCOPE_IMAGE_MODEL=qwen-image-2.0-pro
DASHSCOPE_IMAGE_BASE_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
```

Board generation uses Python `rembg` when available. By default it looks for a project-local venv (`.venv-rembg/bin/python3` on macOS/Linux, `.venv-rembg/Scripts/python.exe` on Windows). Override if needed:

```env
REMBG_PYTHON=/absolute/path/to/python
```

If no API key is configured, try-on generation will fail until you set one. If `rembg` is missing, board generation falls back to Sharp-based trimming (see `lib/board-service.ts`).

## Database

Prisma schema is in `prisma/schema.prisma` and uses SQLite by default:

- DB file: `prisma/dev.db`
- Provider: `sqlite`

Useful commands:

```bash
npx prisma generate
npx prisma db push
```

## Production Run (Single Machine)

```bash
npm install
npx prisma generate
npm run build
npm run start
```

Default URL: `http://localhost:3000`

## Windows Deployment With `rembg`

This is the recommended path if you want a Windows machine to be usable quickly while still keeping Python `rembg` enabled.

### Prerequisites

- Install Node.js 20+ from [nodejs.org](https://nodejs.org/)
- Install Python 3.9, 3.10, or 3.11 from [python.org](https://www.python.org/downloads/windows/)
- During Python install, enable `Add python.exe to PATH`
- Ensure the Windows laptop and phones are on the same Wi-Fi
- Open an inbound firewall port if you want LAN access, for example `3000`

### One-time setup

Open PowerShell in the repo root and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
```

What this script does:

- Checks `node`, `npm`, and Python
- Creates `.venv-rembg`
- Installs `rembg` into the project-local virtual environment
- Runs `npm install`
- Runs `npx prisma generate`
- Runs `npx prisma db push`
- Runs `npm run build`

### Start the app

After setup completes, start the production server with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-windows.ps1
```

Optional custom port:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-windows.ps1 -Port 3001
```

The start script sets:

- `NODE_ENV=production`
- `HOSTNAME=0.0.0.0`
- `PORT=3000` by default
- `REMBG_PYTHON=.\.venv-rembg\Scripts\python.exe`

### Access from phone

- Run `ipconfig` on the Windows laptop
- Find the IPv4 address, for example `192.168.1.23`
- Open `http://192.168.1.23:3000` on the phone browser

### AI try-on environment variables

Create `.env.local` if you want try-on generation enabled:

```env
DASHSCOPE_API_KEY=your_api_key
DASHSCOPE_IMAGE_MODEL=qwen-image-2.0-pro
DASHSCOPE_IMAGE_BASE_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
```

Without an API key, clothing upload, outfit composition, and board generation still work, but try-on generation will fail.

### Common troubleshooting

- `python` not found:
  reinstall Python and enable `Add python.exe to PATH`
- `rembg` install fails:
  use Python 3.9-3.11 instead of 3.12+
- PowerShell blocks scripts:
  run with `-ExecutionPolicy Bypass` as shown above
- Another app is using port `3000`:
  start with `-Port 3001`

### Optional auto-start with `nssm`

If this machine should restart the app automatically after reboot, install `nssm` and register the app as a Windows service after manual startup has been verified once.

Recommended flow:

1. Download `nssm` from [nssm.cc](https://nssm.cc/download) and make sure `nssm.exe` is on `PATH`, or note its full file path
2. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register-windows-service.ps1
```

Optional custom values:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register-windows-service.ps1 -ServiceName WardrobeStylist -Port 3001
```

If `nssm.exe` is not on `PATH`, pass it explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register-windows-service.ps1 -NssmPath "C:\tools\nssm\nssm.exe"
```

What this script does:

- Registers `WardrobeStylist` as a Windows service
- Uses `powershell.exe` to run `scripts\start-windows.ps1`
- Sets the working directory to the repo root
- Enables automatic start on boot
- Configures restart on unexpected exit
- Starts the service immediately

Useful service commands:

```powershell
nssm start WardrobeStylist
nssm stop WardrobeStylist
nssm remove WardrobeStylist confirm
```

## Packaging / Release Workflow

Recommended release model: source package + Windows setup/start scripts.

### Build a release zip

On your build machine:

```bash
npm install
npx prisma generate
npm run build
```

Create a release folder and include:
- `app/`
- `lib/`
- `public/`
- `prisma/schema.prisma` (exclude local `dev.db`)
- `package.json`
- `pnpm-lock.yaml` (if you keep it) / lockfile in use
- `next.config.js`
- `tsconfig.json`

Then zip it, for example: `wardrobe-stylist-release.zip`.

### Install on target Windows machine

1. Unzip to `C:\wardrobe-stylist`
2. Add `.env.local` if try-on generation is needed
3. Run `powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1`
4. Run `powershell -ExecutionPolicy Bypass -File .\scripts\start-windows.ps1`
5. (Optional) Run `powershell -ExecutionPolicy Bypass -File .\scripts\register-windows-service.ps1`

## NPM Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
