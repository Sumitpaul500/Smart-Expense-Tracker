# FinPilot AI - Project Architecture

## 1. Overview
FinPilot AI is an enterprise-grade, AI-powered financial management platform. It leverages a modern microservices-oriented architecture to deliver high-performance 3D visual experiences alongside sophisticated machine learning and generative AI capabilities.

The architecture is divided into three primary tiers:
1. **Frontend Presentation Layer**: A highly interactive, 3D-accelerated SPA built with **Svelte 5 / SvelteKit**, **Threlte** (native Svelte Three.js wrapper), and **Tailwind CSS v4**.
2. **Backend API Layer**: A robust Node.js/Express service handling business logic, authentication, and database operations.
3. **AI/ML Intelligence Layer**: A specialized Python (FastAPI) microservice dedicated to running ML models (XGBoost, Isolation Forest), LLM interactions (Gemini API), and OCR processing.

## 2. Core Technologies

### 2.1. Frontend
*   **Framework**: **Svelte 5 + SvelteKit** (file-based SSR/SPA routing, `ssr = false` for auth-gated SPA behaviour)
*   **Build Tool**: Vite 6 (via `@sveltejs/vite-plugin-svelte`)
*   **State Management**: **Svelte 5 `$state` runes** (reactive module-level state in `.svelte.ts` files — replaces Zustand), **@tanstack/svelte-query** (server/async state)
*   **Styling**: **Tailwind CSS v4** (via `@tailwindcss/vite` — no PostCSS or tailwind.config.js needed), design tokens defined with `@theme` directive
*   **3D & Animations**: **Threlte** (`@threlte/core`, `@threlte/extras`) — native Svelte wrapper around Three.js. **GSAP** for page-level entrance animations. Svelte's built-in `transition:` and `animate:` directives replace Framer Motion.
*   **Data Visualisation**: LayerChart (Svelte-native, planned), Three.js via Threlte for 3D charts
*   **Forms & Validation**: Svelte 5 `bind:value` + Zod, Superforms (planned)
*   **Routing**: SvelteKit file-based routing with route groups `(auth)` and `(app)` for layout isolation

### 2.2. Backend (Core Business Logic)
*   **Runtime & Framework**: Node.js, Express.js
*   **Language**: TypeScript
*   **Database**: MongoDB (Mongoose ORM)
*   **Caching & Queue**: Redis
*   **Authentication**: JWT, Passport.js, Google OAuth
*   **Real-time Communication**: Socket.IO
*   **File Storage**: Cloudinary (Receipts & User Avatars), Multer

### 2.3. AI/ML Microservice (Intelligence Logic)
*   **Framework**: Python 3.11+, FastAPI
*   **Machine Learning**: Scikit-Learn, XGBoost, LightGBM, Prophet (Time-series forecasting)
*   **Deep Learning / NLP**: PyTorch, Sentence Transformers
*   **Generative AI**: Google Gemini API, LangChain
*   **Vector Database**: Pinecone / Milvus (for RAG context)
*   **OCR**: Google Vision API / Tesseract

### 2.4. DevOps & Deployment
*   **Containerisation**: Docker, Docker Compose
*   **CI/CD**: GitHub Actions
*   **Hosting**: Vercel (Frontend via `@sveltejs/adapter-auto`), Render/Railway (Backend & ML services)
*   **Reverse Proxy**: Nginx

## 3. Communication Patterns

*   **Client to Backend**: REST APIs (HTTP/2) for standard CRUD operations. WebSockets (Socket.IO) for real-time notifications (e.g., ML processing complete, fraud alerts).
*   **Backend to ML Service**: Internal REST API calls or gRPC for low-latency synchronous requests. Redis Pub/Sub or RabbitMQ for asynchronous workloads (e.g., bulk receipt processing, model retraining).
*   **Backend to Database**: Mongoose over MongoDB native driver.

## 4. Architectural Principles
*   **Separation of Concerns**: Strict boundary between presentation, business logic, and heavy computational AI logic.
*   **Stateless Services**: All Node.js and FastAPI instances are stateless (session state in Redis), enabling horizontal scaling.
*   **Event-Driven processing**: Heavy tasks like OCR and monthly forecasting are pushed to background workers.
*   **Security by Design**: Token-based auth, RBAC, input sanitisation at every entry point, and rate limiting.
*   **Native 3D Integration**: Threlte allows Three.js scenes to be composed as `.svelte` components alongside regular UI, enabling true reactive 3D (no React adapter needed).
