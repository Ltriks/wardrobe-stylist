# Wardrobe Stylist

A web application to organize your wardrobe and create outfits.

## MVP Phase 1: Clothing Management & Basic Outfit Creation

### Features
- View and manage clothing items
- Create basic outfits by mixing and matching clothes
- Simple, clean interface

### Tech Stack
- Next.js 14 (App Router)
- TypeScript
- React 18

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
wardrobe-stylist/
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── public/             # Static assets (add later)
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
├── next.config.mjs     # Next.js config
└── README.md           # This file
```

## Next Steps (MVP Phase 1)

1. Add clothing management pages
2. Implement outfit creation editor
3. Add database for storing clothes and outfits
4. Add image upload functionality

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint