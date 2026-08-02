# FinPilot AI - Deployment Strategy

FinPilot AI utilizes a modern cloud-native deployment strategy leveraging containers and serverless edge delivery.

## 1. Infrastructure Overview

### 1.1 Frontend (Vercel)
*   The React 19 / Vite application is deployed to Vercel.
*   **Why**: Vercel provides global Edge Network distribution, automatic CI/CD from GitHub, and excellent support for modern React features. It ensures maximum performance for heavy 3D assets via intelligent caching.

### 1.2 Backend APIs (Render or AWS ECS/Railway)
*   **Node.js Core API**: Deployed as a Docker container.
*   **Python FastAPI Service**: Deployed as a separate Docker container.
*   **Why**: Containerization ensures parity between local development and production environments. Platforms like Render provide easy auto-scaling based on CPU/Memory thresholds.

### 1.3 Managed Services
*   **Database**: MongoDB Atlas (Managed DBaaS).
*   **Cache/Queue**: Upstash or Render managed Redis.
*   **Blob Storage**: Cloudinary (optimized image delivery).

## 2. CI/CD Pipeline (GitHub Actions)

We implement a strict CI/CD workflow:

1.  **Pull Request**:
    *   Runs ESLint and Prettier.
    *   Runs TypeScript type checking (`tsc --noEmit`).
    *   Executes Unit Tests (Jest/PyTest).
    *   Fails the PR if any check fails.
2.  **Merge to `main`**:
    *   Triggers Vercel production build for the frontend.
    *   Builds Docker images for Node.js and Python services.
    *   Pushes images to Docker Hub or AWS ECR.
    *   Triggers webhook to Render/AWS to roll out new containers with zero-downtime deployment.

## 3. Docker Strategy
Each service contains a highly optimized, multi-stage `Dockerfile`.

*   **Node.js**: Uses Alpine Linux, prunes dev dependencies, runs as a non-root user.
*   **Python**: Uses `python:3.11-slim`, installs wheel dependencies in a builder stage to keep the final image size minimal (crucial for ML libraries like Scikit and PyTorch).

## 4. Environment Management
Strict separation of environments:
*   `Development`: Local Docker compose.
*   `Staging`: Replica of production used for QA.
*   `Production`: Live application.
Secrets are injected securely at runtime via cloud provider vault managers; they are never committed to the repository.
