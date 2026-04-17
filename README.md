# Wardrobe Stylist

Wardrobe Stylist is a Next.js app for clothing catalog management, outfit composition, outfit board generation, and try-on preview.

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

## Quick Start

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

If no API key is configured, try-on generation will fail until you set one. If `rembg` is missing, board generation falls back to Sharp-based trimming.

## Database

Prisma schema is in `prisma/schema.prisma` and uses SQLite by default:

- DB file: `prisma/dev.db`
- Provider: `sqlite`

Useful commands:

```bash
npx prisma generate
npx prisma db push
```

## Production Run

```bash
npm install
npx prisma generate
npm run build
npm run start
```

Default URL: `http://localhost:3000`

## Windows Deployment

### Prerequisites

- Install Node.js 20+
- Install Python 3.9, 3.10, or 3.11
- Enable `Add python.exe to PATH`
- Use the same Wi-Fi if you want LAN access from phones

### One-time setup

```powershell
powershell -ExecutionPolicy Bypass -File .\\scripts\\setup-windows.ps1
```

This script checks Node/Python, creates `.venv-rembg`, installs `rembg`, installs npm dependencies, prepares Prisma, and runs a production build.

### Start the app

```powershell
powershell -ExecutionPolicy Bypass -File .\\scripts\\start-windows.ps1
```

Custom port:

```powershell
powershell -ExecutionPolicy Bypass -File .\\scripts\\start-windows.ps1 -Port 3001
```

### Optional auto-start with `nssm`

After manual startup is verified, you can register it as a Windows service:

```powershell
powershell -ExecutionPolicy Bypass -File .\\scripts\\register-windows-service.ps1
```

## Testing

Manual QA checklist:

- [docs/MANUAL_TEST_CASES.md](docs/MANUAL_TEST_CASES.md)

Playwright E2E:

```bash
npm run test:e2e
```

## Documentation

Additional project notes live in `docs/`:

- [PHOTO_GUIDE.md](docs/PHOTO_GUIDE.md)
- [IMAGE_GUIDE.md](docs/IMAGE_GUIDE.md)
- [AI_VISION_MVP_PLAN.md](docs/AI_VISION_MVP_PLAN.md)
- [AI_CLASSIFICATION_PLAN.md](docs/AI_CLASSIFICATION_PLAN.md)
- [BATCH_UPLOAD_PLAN.md](docs/BATCH_UPLOAD_PLAN.md)
- [USER.md](docs/USER.md)
