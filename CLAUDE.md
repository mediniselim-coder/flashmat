# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run preview    # Preview production build locally
npm run lint       # ESLint check
npm run lint:fix   # ESLint auto-fix
npm run format     # Prettier format src/
```

No test framework is configured.

## Environment Variables

Copy `.env.example` to `.env.local` and populate:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY     # Used only in Vercel serverless functions (/api/)
VITE_GOOGLE_MAPS_API_KEY
ANTHROPIC_API_KEY             # Used only in /api/vehicle-doctor.js
```

## Architecture

**FlashMat** is a French-Canadian automotive services marketplace connecting clients with providers. The app has three distinct user surfaces:

- **Public pages** — landing, services discovery, AutoDoctor, marketplace, provider profiles
- **ClientApp** (`src/pages/ClientApp.jsx`) — full client dashboard behind `/app/client/*`
- **ProviderApp** (`src/pages/ProviderApp.jsx`) — provider dashboard behind `/app/provider/*`

Both `ClientApp.jsx` and `ProviderApp.jsx` are large (~70–80KB) single-file components that contain the bulk of the feature logic for their respective roles.

### Routing

React Router v6 in `src/main.jsx`. Role-based redirect happens after Supabase Auth resolves: `user_metadata.role` is either `"client"` or `"provider"`. `<ProtectedRoute>` wraps all `/app/*` routes and enforces auth + role.

### State & Data

- **AuthContext** (`src/hooks/useAuth.jsx`) — auth state, user profile, sign in/out. Auth is cached in `sessionStorage` under `flashmat-auth-cache` for performance.
- **ToastContext** (`src/hooks/useToast.jsx`) — global toast notifications.
- No Redux or Zustand. Data is fetched directly from Supabase in components and hooks.
- Library functions in `src/lib/` handle Supabase queries: `bookings.js`, `inbox.js`, `marketplace.js`, `providerProfiles.js`, `flashfix.js`, `googleMaps.js`, `providerReviews.js`.
- localStorage keys are namespaced as `flashmat-<feature>:<userId>` to prevent collisions and are cleaned up on logout.

### Backend

- **Supabase** — auth, PostgreSQL database, real-time subscriptions.
- **Vercel serverless functions** in `/api/` — called via `fetch()` from the frontend. These are the only place `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are used.
- **Google Maps API** — geocoding via `src/lib/googleMaps.js`.
- **Anthropic Claude API** — AI vehicle diagnostics in `/api/vehicle-doctor.js`.

### Styling

CSS Modules (`.module.css`) for component-scoped styles. Global design tokens are defined as CSS variables in `src/index.css`:
- Primary colors: `--green` (brand dark blue `#1a3a8f`), `--blue` (cyan `#3b9fd8`), `--accent` (blue `#2563eb`)
- Global button classes: `.btn`, `.btn-green`, `.btn-blue`, `.btn-accent`, `.btn-red`
- Global animations: `fadeUp`, `fadeIn`, `pulse`, `spin`, `ticker`, `slideInLeft`, `slideUp`

Note: despite the variable name `--green`, the primary brand color is a dark navy blue.

### Schema Evolution Pattern

The codebase uses `isMissingInboxRelation()` and similar utilities to gracefully handle missing Supabase tables/columns, allowing the frontend to work even when the DB schema is ahead or behind. Follow this pattern when adding new DB-dependent features.

### Key Conventions

- All UI text is French (fr-CA).
- Service IDs use kebab-case: `"mechanic-general"`, `"oil-change"`.
- Database column names use snake_case; JS variables use camelCase.
- Modals follow a consistent pattern: managed by boolean state in the parent, passed as `isOpen`/`onClose` props.
