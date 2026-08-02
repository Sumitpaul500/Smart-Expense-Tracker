# FinPilot AI - API Documentation

## Base URL: `/api/v1`

## 1. Authentication (`/auth`)
*   `POST /auth/register` - Create a new user account.
*   `POST /auth/login` - Authenticate and receive JWT.
*   `POST /auth/google` - Authenticate via Google OAuth.
*   `POST /auth/refresh` - Refresh JWT using HttpOnly cookie refresh token.
*   `POST /auth/logout` - Invalidate tokens.
*   `POST /auth/verify-otp` - 2FA / Email verification.

## 2. Users (`/users`)
*   `GET /users/me` - Get current user profile and preferences.
*   `PUT /users/me` - Update profile details.
*   `PUT /users/preferences` - Update app preferences (currency, theme).
*   `GET /users/health-score` - Retrieve AI-calculated financial health score.

## 3. Transactions (`/transactions`)
*   `GET /transactions` - List transactions (supports pagination, filtering by date, category, tags).
*   `POST /transactions` - Add a new transaction.
*   `GET /transactions/:id` - Get specific transaction details.
*   `PUT /transactions/:id` - Update a transaction.
*   `DELETE /transactions/:id` - Delete a transaction.
*   `POST /transactions/bulk` - Import CSV transactions.

## 4. Budgets & Goals (`/finance`)
*   `GET /finance/budgets` - List all user budgets and current progress.
*   `POST /finance/budgets` - Create a new budget limit.
*   `GET /finance/goals` - List saving goals.
*   `POST /finance/goals` - Create a new goal.

## 5. Analytics & Reports (`/analytics`)
*   `GET /analytics/summary` - Aggregate data for dashboard (total income, expense, net worth).
*   `GET /analytics/cash-flow` - Time-series data for cash flow graphs.
*   `GET /analytics/category-heatmap` - Data formatted for Recharts/D3 heatmaps.

## 6. AI Assistant (`/ai`)
*   `POST /ai/chat` 
    *   *Body*: `{ message: "How much did I spend on food this month?" }`
    *   *Response*: Context-aware response via Gemini + RAG.
*   `GET /ai/insights` - Generate personalized daily/weekly financial insights.
*   `GET /ai/budget-planner` - Receive AI-generated budget recommendations based on past spending.

## 7. Machine Learning (`/ml`) - *Proxied to Python Service*
*   `POST /ml/predict-category` 
    *   *Body*: `{ description: "Uber trip to airport", amount: 45.00 }`
    *   *Response*: Predicted category ID with confidence score.
*   `GET /ml/forecast`
    *   *Response*: Next month's predicted expenses using Prophet/XGBoost.
*   `POST /ml/detect-fraud` - Evaluates an incoming transaction against Isolation Forest anomalies.

## 8. OCR & Receipts (`/ocr`)
*   `POST /ocr/upload` (multipart/form-data)
    *   Uploads receipt image, uploads to Cloudinary, triggers Vision API, returns extracted structured data.
*   `GET /ocr/:receiptId` - Polling endpoint for OCR status if processed asynchronously.

## WebSockets (Socket.IO)
*   `Event: subscribe` - Join user-specific room.
*   `Event: ocr_complete` - Real-time notification when receipt parsing is done.
*   `Event: budget_alert` - Triggered when a transaction pushes a category over the budget threshold.
*   `Event: fraud_alert` - Triggered if ML detects a highly anomalous transaction.
