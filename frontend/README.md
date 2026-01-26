# @reason-bridge/frontend

Frontend application for Unite Discord - Rational Discussion Platform.

## Tech Stack

- **React 18** - UI framework
- **TypeScript 5.7** - Type safety
- **Vite 6** - Build tool and dev server
- **ESLint** - Code linting

## Development

```bash
# Install dependencies (from root)
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type checking
pnpm typecheck

# Lint
pnpm lint
```

## Structure

```
frontend/
├── src/
│   ├── components/     # React components
│   ├── assets/         # Static assets
│   ├── App.tsx         # Root component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── public/             # Public static files
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
└── tsconfig.json       # TypeScript configuration
```

## Configuration

- **Port**: 3000 (configurable in vite.config.ts)
- **Path alias**: `@` points to `/src`

## Next Steps

- Configure TanStack Query for data fetching
- Set up Zustand for state management
- Add Tailwind CSS for styling
- Implement design system components
- Configure React Router for navigation
