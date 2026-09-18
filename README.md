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

### AI settings page

Open **主题与设置** from the home page (or `/settings`) to configure the try-on API key, model, and HTTPS endpoint. Saving takes effect for the next generation without restarting. A blank key preserves the current key. **恢复环境配置** removes page overrides and restores environment/default settings.

For Alibaba Token Plan, use its package key, model `qwen-image-3.0-pro`, and base URL `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`. The app selects the dedicated DashScope asynchronous image endpoint and polls for completion on the same package host. Qwen Image 2 uses the synchronous multimodal endpoint. Standard (non-Token Plan) Images-compatible base URLs are completed with `/images/generations`; full DashScope endpoints remain supported. Both reference photos are sent as Base64 data URLs, so localhost does not need to be publicly accessible. See the [Qwen Image 3 API reference](https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference) and [Token Plan multimodal guide](https://help.aliyun.com/zh/model-studio/token-plan-multimodal-gen).

Page settings are stored server-side in `data/ai-settings.json` (ignored by Git, owner-only file permissions on Unix). Stored keys are never returned by the settings API. `.env.local` remains the fallback and is not modified. Use only trusted DashScope-compatible endpoints: try-on requests send the key and reference images to the configured endpoint. The app is intended for trusted local use; it has no user authentication.

### Family wardrobes

Use **成员衣柜** at the top of the home page to switch wardrobes, **添加成员** to create an empty wardrobe, and **改名** to name a wardrobe (for example, 儿子 or 妈妈). There are no accounts or passwords. Everyone shares one SQLite database and the AI settings; clothes, outfits, personal templates, and pending uploads are organized separately for each member.

The selected member is remembered for the current browser tab, including page refreshes. Switching returns to the home page and clears unsaved forms. Background board/try-on generation keeps the member who started it. Profiles are for family organization, not privacy or access control; local images remain shared files.

`npm run dev`, `npm start`, and the Windows setup script automatically run the additive database upgrade. Existing data belongs to **默认衣柜**, which can be renamed. Before upgrading an existing database, a consistent SQLite backup is saved in `data/backups/`. To prepare manually (with the app stopped), run `npm run db:prepare`.

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

### 家庭分类管理

在「主题与设置 → 分类管理」维护全家共用的分类。预置 8 个部位、45 个分类；可新增、改名、调整所属部位和排序，也可停用或重新启用。基础部位分类保持启用，便于只确认大类时使用。星标常用分类按当前成员分别保存，选择器支持搜索并优先展示常用项。

单件衣物与批量确认支持家居、睡眠、运动、正式、日常用途多选，独立于衣物分类。衣柜和搭配筛选既可选某个细分类，也可选整个部位。自定义分类按所属部位参与搭配图布局；自动建议保持本地识别，不增加视觉 API 请求。

启动时 `npm run db:prepare` 会自动备份旧数据库，再添加分类、成员常用项和用途字段；旧衣物、搭配及生成图片继续保留。停用分类不会删除历史衣物，批量草稿需改选启用的分类才能入柜。
