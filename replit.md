# Overview

This is a data model visualization application that renders entity relationship diagrams using React Flow. The app displays a schema of entities (appears to be Dynamics 365/CRM-related data model analysis) with visual indicators for health, issues, and categories. It uses a full-stack TypeScript architecture with an Express backend and React frontend, styled with Tailwind CSS and shadcn/ui components.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (supports light/dark mode)
- **Visualization**: React Flow (`@xyflow/react`) for rendering entity relationship diagrams as interactive node graphs
- **Build Tool**: Vite
- **Source Location**: `frontend/src/` directory

The main page (`data-model.tsx`) loads a static JSON schema from `frontend/src/data/schema.json` and renders entities as custom React Flow nodes with color-coded categories (core, operations, aml, support) and health indicators.

**Important Note**: There's a mismatch between `vite.config.ts` (which references `client/` directory) and the actual source code (which lives in `frontend/`). The Vite config aliases point to `client/src` while the actual files are in `frontend/src`. The `tsconfig.json` correctly references `frontend/src`. When making changes, be aware of this discrepancy — the frontend source lives in `frontend/`.

## Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (executed via `tsx`)
- **API Pattern**: RESTful, all routes prefixed with `/api`
- **Server Entry**: `server/index.ts`
- **Routes**: `server/routes.ts` — currently minimal, placeholder for API endpoints
- **Static Serving**: In production, serves built frontend from `dist/public`
- **Dev Server**: Vite dev server with HMR proxied through Express

## Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` — shared between frontend and backend
- **Current Schema**: Single `users` table with `id` (UUID), `username`, and `password`
- **Schema Validation**: Zod schemas generated via `drizzle-zod`
- **Migration Output**: `./migrations` directory
- **Database Push**: `npm run db:push` (uses drizzle-kit)
- **Storage Layer**: `server/storage.ts` defines an `IStorage` interface. Currently uses `MemStorage` (in-memory Map), but the interface is designed to be swapped for a database-backed implementation.
- **Database URL**: Requires `DATABASE_URL` environment variable for PostgreSQL connection

## Build System
- **Frontend Build**: Vite builds to `dist/public`
- **Server Build**: esbuild bundles server code to `dist/index.cjs` (CommonJS format)
- **Build Script**: `script/build.ts` handles both frontend and server builds
- **Key Dependencies Bundled**: Express, Drizzle, pg, and other server deps are bundled to reduce cold start syscalls

## Path Aliases
- `@/*` → `frontend/src/*`
- `@shared/*` → `shared/*`
- `@assets` → `attached_assets/` (Vite only)

# External Dependencies

## Database
- **PostgreSQL** — Required, connected via `DATABASE_URL` environment variable
- **connect-pg-simple** — Session store for Express sessions (available but not yet wired up)
- **Drizzle ORM + drizzle-kit** — Database ORM and migration tooling

## UI/Frontend Libraries
- **@xyflow/react** — Interactive node-based graph/flow visualization
- **Radix UI** — Full suite of accessible UI primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui** — Component library built on Radix, using new-york style variant
- **Embla Carousel** — Carousel component
- **Recharts** — Charting library (available via chart.tsx component)
- **cmdk** — Command palette component
- **react-day-picker** — Date picker
- **react-hook-form + @hookform/resolvers** — Form handling with Zod validation
- **vaul** — Drawer component
- **react-resizable-panels** — Resizable panel layouts

## Replit-Specific
- **@replit/vite-plugin-runtime-error-modal** — Runtime error overlay in dev
- **@replit/vite-plugin-cartographer** — Dev tooling (dev only)
- **@replit/vite-plugin-dev-banner** — Dev banner (dev only)

## Other Server Dependencies (in build allowlist)
- **jsonwebtoken** — JWT auth tokens
- **passport + passport-local** — Authentication framework
- **express-session** — Session management
- **express-rate-limit** — Rate limiting
- **multer** — File upload handling
- **nodemailer** — Email sending
- **openai / @google/generative-ai** — AI service integrations
- **stripe** — Payment processing
- **xlsx** — Spreadsheet parsing
- **nanoid / uuid** — ID generation