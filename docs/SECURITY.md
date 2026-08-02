# FinPilot AI - Security Architecture

As a financial technology application, FinPilot AI adheres to strict security principles to protect sensitive user data.

## 1. Authentication & Authorization
*   **Tokens**: Uses JWT (JSON Web Tokens). Access tokens have a short lifespan (15 mins).
*   **Refresh Tokens**: Stored securely in database and returned to the client as an `HttpOnly`, `Secure`, `SameSite=Strict` cookie to prevent XSS (Cross-Site Scripting) theft.
*   **RBAC**: Role-Based Access Control via middleware to separate standard users from admin functionalities.

## 2. API Security
*   **Rate Limiting**: `express-rate-limit` backed by Redis to prevent brute-force attacks on login endpoints and DDoS on public routes.
*   **Helmet**: Uses `helmet` package to set secure HTTP headers (e.g., hiding `X-Powered-By`, enforcing HSTS).
*   **CORS**: Strict Cross-Origin Resource Sharing configuration, only allowing traffic from the verified Vercel frontend domain.
*   **CSRF Protection**: Implemented for state-changing operations relying on cookies.

## 3. Data Protection
*   **In Transit**: All data transmission is encrypted using TLS 1.3 (HTTPS only).
*   **At Rest**: Passwords are cryptographically hashed using `bcrypt` (cost factor 12) before storage. MongoDB Atlas provides transparent volume-level encryption.
*   **PII & Sanitization**: Sensitive Personally Identifiable Information (PII) is obfuscated in logging systems. Input validation is strictly enforced via `zod` to prevent NoSQL injection.

## 4. AI & ML Safety
*   **Prompt Injection**: Input sent to the Gemini API is sanitized to prevent prompt injection attacks designed to extract internal system prompts.
*   **Data Isolation**: ML models inference process isolates user data contexts. The RAG system enforces user-id matching so one user's financial queries cannot retrieve another user's vectors.

## 5. Audit & Monitoring
*   **Audit Logs**: All critical actions (password changes, large transactions, auth failures) are logged to an immutable audit trail.
*   **Error Tracking**: Sentry integrated for frontend and backend error alerting without exposing stack traces to the end-user.
