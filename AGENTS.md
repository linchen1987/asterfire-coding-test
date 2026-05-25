# AGENTS.md

Coding agent instructions for this repository.

## Project Overview

This is a pnpm monorepo containing a Next.js 16 web application with Tailwind CSS v4 and Shadcn UI components.

## Repository Structure

```
.
├── apps/
│   └── web/            # Next.js application
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── public/
│       └── ...
├── packages/           # Shared packages (future)
├── docs/
├── AGENTS.md
└── pnpm-workspace.yaml
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **UI Components:** Shadcn UI (new-york style) with Radix UI primitives
- **Icons:** Lucide React
- **Package Manager:** pnpm (v10.30.3)
- **React:** 19
- **Monorepo:** pnpm workspaces

## Build/Lint/Test Commands

Commands can be run from the repo root (they delegate to `apps/web`):

```bash
pnpm dev              # Development server (with Turbopack)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
```

Or directly in the `apps/web` directory:

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
```

Type checking (run in `apps/web/`):

```bash
pnpm tsc --noEmit     # Type checking (no dedicated script)
```

## Shadcn UI

- Components are in `apps/web/components/ui/`
- Use the CLI to add new components: `pnpm dlx shadcn@latest add <component>` (run in `apps/web/`)
- Configuration in `apps/web/components.json`
- Style: "new-york" variant, base color: neutral

## Adding New Components

1. For Shadcn components, use the CLI (run in `apps/web/`)
2. For custom components, create in `apps/web/components/` directory and follow existing patterns
