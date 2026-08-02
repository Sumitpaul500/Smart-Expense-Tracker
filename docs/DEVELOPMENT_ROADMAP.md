# FinPilot AI - Development Roadmap

This project will follow a strict, professional Agile delivery model divided into 5 distinct phases.

## Phase 1: Architecture & Foundation (Weeks 1-2)
*   [x] Document full architecture, database, API, and system design.
*   [ ] Initialize Monorepo (Turborepo).
*   [ ] Setup shared packages (TypeScript types, ESLint).
*   [ ] Initialize Frontend (React 19, Vite, Tailwind, Shadcn).
*   [ ] Initialize Backend (Node.js, Express, MongoDB).
*   [ ] Setup basic CI/CD pipeline (GitHub Actions for linting/tests).

## Phase 2: Core Platform & Security (Weeks 3-4)
*   [ ] **Backend**: Implement authentication (JWT, Google OAuth).
*   [ ] **Backend**: Build CRUD APIs for Users, Transactions, Categories, Budgets.
*   [ ] **Frontend**: Build Auth flows (Login, Register, OTP).
*   [ ] **Frontend**: Build Core Dashboard Shell (Sidebar, Header, Layout).
*   [ ] **Frontend**: Implement standard 2D data tables and forms for expense tracking.

## Phase 3: AI & Machine Learning Microservice (Weeks 5-7)
*   [ ] **ML Service**: Setup Python FastAPI structure.
*   [ ] **ML Service**: Train and deploy Expense Category Prediction model (LightGBM).
*   [ ] **ML Service**: Implement Google Vision API for Receipt OCR parsing.
*   [ ] **ML Service**: Integrate Gemini API with LangChain for the Financial Assistant.
*   [ ] **Backend**: Create communication bridges between Node.js and FastAPI.
*   [ ] **Frontend**: Implement Receipt Upload UI and Smart Search.
*   [ ] **Frontend**: Build AI Chat Assistant UI (floating widget).

## Phase 4: 3D Visualization & Advanced UI (Weeks 8-9)
*   [ ] **Frontend**: Integrate React Three Fiber.
*   [ ] **Frontend**: Build 3D floating credit cards for the wallet view.
*   [ ] **Frontend**: Implement 3D pie charts and interactive globes for location tracking.
*   [ ] **Frontend**: Add GSAP & Framer Motion micro-animations across all pages.
*   [ ] **Frontend**: Refine Dark Luxury Theme with glassmorphism and neon effects.

## Phase 5: Polish, Admin Panel, & Deployment (Weeks 10-11)
*   [ ] **Frontend**: Build Admin Dashboard (System health, user stats).
*   [ ] **Backend**: Complete Socket.IO real-time notification system.
*   [ ] **Testing**: Write Unit (Jest) and Integration (Cypress) tests.
*   [ ] **DevOps**: Finalize Dockerfiles and `docker-compose`.
*   [ ] **DevOps**: Production deployment to Vercel (Frontend) and Render/AWS (Backends).
*   [ ] **Documentation**: Finalize README and Swagger API Docs.
