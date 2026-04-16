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

If no API key is configured, generation-related endpoints will fail gracefully.

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

## Deploy To Windows For LAN Access

### 1) Prepare server laptop

- Install Node.js LTS (20/22)
- Ensure laptop and phones are in the same Wi-Fi
- Open an inbound firewall port (for example `3000`)

### 2) Start service on all interfaces

In PowerShell:

```powershell
$env:NODE_ENV="production"
$env:HOSTNAME="0.0.0.0"
$env:PORT="3000"
npm install
npx prisma generate
npm run build
npm run start
```

### 3) Access from phone

- Run `ipconfig` on the laptop
- Find the IPv4 address, e.g. `192.168.1.23`
- Open `http://192.168.1.23:3000` on phone browser

### 4) Keep app running after reboot (recommended)

Use `nssm` to register Node as a Windows service:
- Service name: `WardrobeStylist`
- Startup type: automatic
- Working directory: project folder
- App command: `npm`
- App args: `run start`

Also set service-level environment variables:
- `NODE_ENV=production`
- `HOSTNAME=0.0.0.0`
- `PORT=3000`

## Packaging / Release Workflow

Recommended release model: source package + one-click install script.

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
2. Add `.env.production` if needed
3. Run:
   - `npm install`
   - `npx prisma generate`
   - `npm run build`
   - `npm run start`
4. (Optional) Register as Windows service with `nssm`

## NPM Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint