# FinPilot AI - Folder Structure

The project uses a monorepo approach (managed via npm workspaces) to share types, configurations, and design systems across the frontend, backend, and AI services.

```text
finpilot-ai/
├── apps/
│   ├── frontend/                    # Svelte 5 + SvelteKit Web Application
│   │   ├── static/                  # Static assets (favicon, icons) — equiv. to Vite's public/
│   │   ├── src/
│   │   │   ├── app.html             # SvelteKit HTML shell (replaces index.html)
│   │   │   ├── app.css              # Global styles: Tailwind v4 @import + @theme design tokens
│   │   │   ├── app.d.ts             # TypeScript global declarations for App namespace
│   │   │   │
│   │   │   ├── routes/              # SvelteKit file-based routing
│   │   │   │   ├── +layout.ts       # Root layout config — sets ssr=false (SPA mode)
│   │   │   │   ├── +layout.svelte   # Root layout — wraps app in QueryClientProvider
│   │   │   │   │
│   │   │   │   ├── (auth)/          # Route group: auth pages (no sidebar)
│   │   │   │   │   └── login/
│   │   │   │   │       └── +page.svelte
│   │   │   │   │
│   │   │   │   └── (app)/           # Route group: protected pages (with sidebar)
│   │   │   │       ├── +layout.svelte      # DashboardLayout — auth guard + Sidebar + ChatWidget
│   │   │   │       ├── +page.svelte        # /  — Dashboard with Threlte 3D cash flow
│   │   │   │       ├── transactions/
│   │   │   │       │   └── +page.svelte    # /transactions
│   │   │   │       └── analytics/
│   │   │   │           └── +page.svelte    # /analytics
│   │   │   │
│   │   │   └── lib/                 # SvelteKit $lib alias root
│   │   │       ├── utils.ts         # cn(), formatCurrency(), formatDate()
│   │   │       ├── api.ts           # Typed fetch wrapper with ApiError class
│   │   │       │
│   │   │       ├── stores/          # Svelte 5 rune-based global state (.svelte.ts files)
│   │   │       │   ├── auth.svelte.ts   # authState — user, token, isAuthenticated
│   │   │       │   └── ui.svelte.ts     # uiState — chat open, sidebar collapse
│   │   │       │
│   │   │       └── components/
│   │   │           ├── layout/
│   │   │           │   └── Sidebar.svelte       # Collapsible sidebar with active route
│   │   │           ├── shared/
│   │   │           │   └── ChatWidget.svelte    # Floating AI chat panel
│   │   │           └── 3d/                      # Threlte (Three.js) components
│   │   │               ├── CashFlowScene.svelte # Animated bar chart — replaces R3F placeholder
│   │   │               └── FloatingCard.svelte  # Decorative floating credit card mesh
│   │   │
│   │   ├── svelte.config.js         # SvelteKit config (adapter-auto, path aliases)
│   │   ├── vite.config.ts           # Vite + SvelteKit + Tailwind v4 plugins
│   │   ├── tsconfig.json            # Extends .svelte-kit/tsconfig.json
│   │   └── package.json             # Svelte 5, Threlte, Tanstack Query, GSAP, etc.
│   │
│   ├── backend/                     # Node.js + Express API (unchanged)
│   │   ├── src/
│   │   │   ├── config/              # Environment, DB connection, Passport config
│   │   │   ├── controllers/         # Route logic handlers
│   │   │   ├── middlewares/         # Auth, Error handling, Rate limiting
│   │   │   ├── models/              # Mongoose schemas
│   │   │   ├── routes/              # Express router definitions
│   │   │   ├── services/            # Business logic (separated from controllers)
│   │   │   ├── sockets/             # Socket.IO event handlers
│   │   │   ├── utils/               # Helper functions, logger (Winston)
│   │   │   └── index.ts             # Server entry point
│   │   ├── tests/                   # Jest / Supertest API tests
│   │   └── Dockerfile
│   │
│   └── ml-service/                  # Python FastAPI Microservice (unchanged)
│       ├── app/
│       │   ├── api/                 # FastAPI endpoints
│       │   ├── core/                # Config, security
│       │   ├── models/              # Pydantic schemas
│       │   ├── ml/                  # Saved model weights (.pkl), inference logic
│       │   ├── services/            # Gemini LangChain integration, OCR logic
│       │   └── main.py              # FastAPI entry point
│       ├── requirements.txt
│       └── Dockerfile
│
├── packages/                        # Shared monorepo packages
│   ├── shared-types/                # TypeScript interfaces shared between frontend & backend
│   ├── eslint-config/               # Shared linting rules
│   └── tsconfig/                    # Shared base TS configs
│
├── docs/                            # Project documentation
├── docker-compose.yml               # Local development orchestration
├── README.md
└── package.json                     # npm workspaces root
```

## Key Architectural Decisions

### SvelteKit Route Groups
`(auth)` and `(app)` are **route groups** — parenthesised folders that SvelteKit ignores in the URL path. They provide separate `+layout.svelte` files so auth pages get a clean, centered layout while app pages get the full sidebar+topbar shell.

### Svelte 5 Rune Stores (`.svelte.ts`)
Files with the `.svelte.ts` extension can use Svelte 5 runes (`$state`, `$derived`) at module scope. This replaces Zustand: `authState` and `uiState` are plain reactive objects exported from modules — no subscription boilerplate.

### Threlte 3D Components
Threlte wraps Three.js in Svelte components. `<Canvas>` creates the WebGL context; inside it, `<T.Mesh>`, `<T.PointLight>` etc. map to Three.js objects. Props (position, rotation, scale) are reactive — Svelte's reactivity drives Three.js updates directly.

### Tailwind CSS v4 (`@theme`)
No `tailwind.config.js` needed. All design tokens are declared in `app.css` with `@theme { --color-primary: #7c3aed; }`. Tailwind v4 auto-generates `bg-primary`, `text-primary`, etc. from these variables.
