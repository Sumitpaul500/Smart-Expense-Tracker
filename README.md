# 🛡️ FinPilot AI — Track 4: AI Finance Controller

<div align="center">

<br />

# 🚀 **FinPilot AI — Track 4: AI Finance Controller**
### *Intelligent AI Finance Controller with 3-Way Reconciliation, Exception Explanation & Audit Trail*

<br />

[![Track 4](https://img.shields.io/badge/Track_4-AI_Finance_Controller-8B5CF6?style=for-the-badge&logo=shield&logoColor=white)](#)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.0-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

<br />

> **"FinPilot AI is an intelligent Finance Controller that automatically ingests financial data, reconciles transactions across multiple sources, detects anomalies and mismatches, explains exceptions, and maintains an auditable trail of financial decisions."**

</div>

---

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [🔌 API Reference](#-api-reference)
- [📊 Database Schema](#-database-schema)
- [🧠 AI & ML Pipeline](#-ai--ml-pipeline)
- [🎨 UI Highlights](#-ui-highlights)
- [🔐 Security](#-security)
- [📄 Environment Variables](#-environment-variables-summary)
- [🗺️ Roadmap](#️-roadmap)
- [📜 License](#-license)

---

## ✨ Key Features

### 🛡️ AI Reconciliation Engine *(Track 4 Centerpiece)*
- **3-Way Data Cross-Matching**: Automatically reconciles data across three distinct channels:
  ```text
  Bank/SMS transaction  +  Receipt/Invoice  +  Ledger record  ➔  AI RECONCILIATION  ➔  MATCHED / MISMATCH / SUSPICIOUS
  ```
- **Automatic Exception Explanation**:
  - **MATCHED** ✅: Merchant, amount, and date matched across all channels; auto-approved.
  - **MISMATCH** ⚠️: Identifies precise variance (e.g. Bank ₹5,999 vs Receipt ₹5,499 ➔ Mismatch detected, Diff ₹500, Confidence 96%) with actionable recommendations.
  - **SUSPICIOUS** 🚨: Flags unverified merchants, missing supporting invoices, or high-risk debits for security compliance audit.
- **AI Finance Controller Dashboard**: Real-time KPI cards for Total Monitored Transactions, Reconciled Count, Mismatches, Suspicious Items, Unresolved Count, and Reconciliation Rate (%).
- **Auditable Decision Trail**: Clickable audit record for every financial decision detailing Transaction ID, Source, Receipt Reference, AI Decision, Confidence score, and Controller status.

### 🧾 Receipt OCR Scanner
- Upload any receipt image (JPEG / PNG / WebP)
- **OCR.space Engine 2** extracts raw text from receipts with high accuracy (tables, numbers, taxes)
- **Groq LLM (Llama 3.3-70b)** structures the extracted text into clean JSON: merchant, date, grand total, tax breakdown, and line items
- Auto-fills the transaction form — zero manual typing needed

### 📱 Smart Bank SMS & Text Bulk Importer *(Unique Feature)*
- Paste any bank notification text (HDFC, SBI, ICICI, Axis, PhonePe, Google Pay, Paytm, UPI alerts)
- Regex + pattern-matching engine auto-extracts:
  - **Transaction type** (income / expense / transfer)
  - **Amount & currency** (₹, $, €, £)
  - **Merchant / beneficiary name** (Swiggy, Zomato, Amazon, Salary, ATM, etc.)
  - **Date** (handles all common Indian date formats)
- Live editable preview table before import
- **One-click bulk insert** — adds all transactions to MongoDB in a single database call
- Eliminates the #1 reason users abandon finance apps — manual data entry friction

### 🤖 FinPilot AI Financial Advisor *(Unique Feature)*
- Interactive AI chat widget embedded in the Dashboard
- Powered by **Groq Cloud (Llama 3.3-70b / Llama 3.1-8b)** with automatic model fallback
- **Context-aware prompting**: injects your live financial data (total income, total expenses, net savings, financial health score, top category) into every prompt
- Quick-action prompt pills:
  - 📊 Analyze spending habits
  - 💰 How to save more this month
  - 🚨 Detect abnormal / unusual expenses
  - 🎯 3 actionable financial rules
- **Offline fallback mode**: when no API key is configured, still provides smart rule-based responses using your actual transaction data

### 📊 Interactive Analytics Dashboard
- **3D-gradient bar charts** (monthly income vs. expenses — 6 months trend)
- **Donut chart** with category breakdown, custom legend, and center total widget
- **Weekly comparison bar chart** (income vs. expenses this week)
- All charts are **theme-aware** — automatically adapt to light / dark mode using a `MutationObserver`
- Filters: date range, category, and currency

### 💳 Full Transaction Management
- Create, edit, delete transactions (income / expense / transfer)
- Supports multi-currency (INR, USD, EUR, GBP, and more)
- Filter by type, search by merchant, paginated list
- Tags, recurring flag, and AI anomaly score per transaction
- **Bulk import** via the Smart SMS Importer

### 🎯 Financial Health Score
- Computed score out of 100 based on savings ratio and income vs. expense balance
- Visual progress bar with labels: Excellent / Good / Fair / Needs Work

### 🌙 Dark / Light Mode
- Fully themed UI with smooth transitions
- System-aware — defaults to OS preference
- All charts, cards, and widgets adapt in real time

### ⚙️ Settings & Preferences
- Currency selector: INR ₹, USD $, EUR €, GBP £ — applied globally across all views
- Theme toggle (Dark / Light)
- Profile management

---

## 🏗️ Architecture

This is a **monorepo** containing three independent services:

```
User Browser
     │
     ▼
Frontend (SvelteKit :5173)
     │
     ▼
Express Backend (:5000) ──────────► Groq Cloud (AI Financial Chat)
     ├────────► MongoDB (Mongoose ODM)
     └────────► FastAPI ML Service (:8000)
                     ├────────► OCR.space API (Raw text extraction)
                     └────────► Groq Cloud (LLM receipt structuring)

```

### Data Flow

```
User Browser (SvelteKit)
       │
       └──► REST API (Express :5000)
                 │
                 ├──► MongoDB (Users, Transactions, Analytics)
                 │
                 ├──► Groq Cloud (Direct AI Chat Assistant)
                 │
                 └──► ML Microservice (FastAPI :8000) [OCR Proxy]
                           │
                           ├──► OCR.space API  (Receipt image text extraction)
                           └──► Groq Cloud     (JSON structuring & validation)

```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **SvelteKit 5** + Svelte Runes | Reactive UI framework (latest rune-based reactivity) |
| **TypeScript** | Type safety across all components |
| **TailwindCSS** | Utility-first styling |
| **Chart.js** | 2D / 3D-style interactive charts |
| **Threlte** + Three.js | 3D spending visualisation scene |
| **GSAP** | Entrance animations |
| **Lucide Svelte** | Icon system |
| **Vite** | Blazing-fast dev server + HMR |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **TypeScript** | Type-safe controllers, routes, models |
| **MongoDB** + Mongoose | NoSQL data persistence |
| **JWT** (jsonwebtoken) | Stateless authentication |
| **Helmet** + CORS | Security hardening |
| **Morgan** | HTTP request logging |
| **Nodemon** | Dev hot-reload |
| **Groq SDK** | AI chat integration |

### ML / AI Microservice
| Technology | Purpose |
|---|---|
| **Python 3.11+** | Runtime |
| **FastAPI** | High-performance async API framework |
| **Uvicorn** | ASGI server |
| **Groq (Llama 3.3-70b / 3.1-8b)** | Receipt structuring & AI chat |
| **OCR.space API** (Engine 2) | Accurate receipt text extraction |
| **python-dotenv** | Environment configuration |

### Infrastructure
| Technology | Purpose |
|---|---|
| **MongoDB 6.0** | Primary database (via Docker) |
| **Redis 7.0** | Caching layer (via Docker) |
| **Docker Compose** | Local infrastructure orchestration |

---

## 📁 Project Structure

```
apps/
├── frontend/
│   └── src/
│       ├── routes/
│       │   ├── (app)/
│       │   │   ├── +page.svelte          # Dashboard
│       │   │   ├── transactions/         # Transaction list + SMS importer
│       │   │   ├── analytics/            # Full analytics with charts
│       │   │   ├── receipts/             # Receipt OCR scanner
│       │   │   └── settings/             # Preferences & theme
│       │   └── (auth)/
│       │       ├── login/
│       │       └── register/
│       └── lib/
│           ├── api.ts                    # Centralized API client
│           ├── stores/
│           │   ├── auth.svelte.ts        # Auth state (Svelte runes)
│           │   └── ui.svelte.ts          # UI state (theme, currency)
│           ├── components/
│           │   ├── charts/
│           │   │   ├── MonthlyChart.svelte
│           │   │   ├── WeeklyChart.svelte
│           │   │   └── DoughnutChart.svelte
│           │   ├── shared/
│           │   │   ├── SmartSmsImporter.svelte   # Bank SMS parser UI
│           │   │   └── AiAdvisorWidget.svelte    # AI chat assistant
│           │   └── layout/
│           │       └── Sidebar.svelte
│           └── utils/
│               └── smsParser.ts          # SMS/text parsing engine
│
├── backend/
│   └── src/
│       ├── index.ts                      # Express app entry
│       ├── models/
│       │   ├── User.ts
│       │   ├── Transaction.ts
│       │   ├── Category.ts
│       │   └── Budget.ts
│       ├── controllers/
│       │   ├── transactionController.ts  # CRUD + bulk import + analytics
│       │   ├── authController.ts
│       │   └── aiController.ts           # Groq AI chat + offline fallback
│       ├── routes/
│       │   ├── transactionRoutes.ts
│       │   ├── authRoutes.ts
│       │   ├── aiRoutes.ts
│       │   └── ocrRoutes.ts
│       └── middlewares/
│           └── authMiddleware.ts         # JWT protection
│
└── ml-service/
    ├── main.py                           # FastAPI app entry
    └── app/api/
        ├── ocr_router.py                 # Receipt OCR + Groq structuring
        ├── ml_router.py                  # ML analysis endpoints
        └── router.py                     # AI routing
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **Python** ≥ 3.11
- **MongoDB** (local install or [Docker](https://docker.com))
- **Groq API Key** — free at [console.groq.com](https://console.groq.com) (needed for AI features & live OCR)

---

### 1. Clone the Repository

```bash
git clone https://github.com/Sumitpaul500/Smart-Expense-Tracker.git
cd Smart-Expense-Tracker
```

---

### 2. Start MongoDB (via Docker)

```bash
docker-compose up -d
```

This starts MongoDB on port `27017` and Redis on port `6379`.

---

### 3. Backend Setup

```bash
cd apps/backend
npm install
```

Create `.env` in `apps/backend/`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/finpilot
JWT_SECRET=your_super_secret_jwt_key_here
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the backend:

```bash
npm run dev
```

Backend runs at: **http://localhost:5000**

---

### 4. ML Service Setup

```bash
cd apps/ml-service
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `.env` in `apps/ml-service/`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Start the ML service:

```bash
python main.py
```

ML service runs at: **http://localhost:8000**

---

### 5. Frontend Setup

```bash
cd apps/frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

### Quick Start (Windows — All Services at Once)

From the project root, run:

```powershell
.\start-all.ps1
```

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/login` | Login & receive JWT |
| `GET`  | `/api/v1/auth/me` | Get authenticated user profile |

### Transactions *(All protected — requires `Authorization: Bearer <token>`)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/v1/transactions` | List transactions (paginated) |
| `POST` | `/api/v1/transactions` | Create single transaction |
| `POST` | `/api/v1/transactions/bulk` | **Bulk import** (array of transactions) |
| `GET`  | `/api/v1/transactions/analytics` | Full analytics with charts data |
| `PUT`  | `/api/v1/transactions/:id` | Update transaction |
| `DELETE` | `/api/v1/transactions/:id` | Delete transaction |

**Analytics Query Parameters:**
```
?currency=INR
?categoryId=<mongo_id>
?startDate=2026-01-01
?endDate=2026-07-31
```

### AI Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/ai/chat` | Send message to FinPilot AI |

**Request body:**
```json
{
  "message": "How can I save more this month?",
  "context": "Total Income: ₹80,000, Total Expenses: ₹65,000, Health Score: 72/100"
}
```

### OCR (ML Service — Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/ocr/parse-receipt` | Upload receipt image → structured JSON |

**Form data:** `file` (JPEG / PNG / WebP)

**Response:**
```json
{
  "merchant": "Air India Express Limited",
  "date": "2026-01-31",
  "total_amount": 9344.00,
  "tax": 974.00,
  "currency": "INR",
  "line_items": [
    { "description": "Air Ticket charges", "amount": 8370.00 },
    { "description": "Airport Taxes-Pass Through", "amount": 974.00 }
  ],
  "raw_text": "..."
}
```

### Health Checks

| Method | Endpoint | Service |
|--------|----------|---------|
| `GET`  | `/api/v1/health` | Backend (Express) |
| `GET`  | `/` | ML Service (FastAPI) |

---

## 📊 Database Schema

### Transaction

```typescript
{
  userId: ObjectId,                     // Reference to User
  type: 'income' | 'expense' | 'transfer',
  amount: Number,
  currency: String,                     // 'INR', 'USD', 'EUR', etc.
  date: Date,
  categoryId?: ObjectId,               // Reference to Category
  merchant: String,
  location?: { lat, lng, address },
  receiptId?: ObjectId,
  tags: String[],
  isRecurring: Boolean,
  aiInsights: {
    anomalyScore: Number,              // 0–1 anomaly likelihood
    autoCategorized: Boolean
  },
  status: 'cleared' | 'pending'
}
```

### User

```typescript
{
  email: String,           // unique, indexed
  passwordHash: String,
  firstName: String,
  lastName: String,
  financialHealthScore: Number,        // 0–100
  preferences: {
    currency: String,                  // default 'USD'
    theme: 'dark' | 'light',
    language: String
  },
  role: 'user' | 'admin'
}
```

---

## 🧠 AI & ML Pipeline

### Receipt OCR Pipeline

```
User uploads image
       │
       ▼
OCR.space API (Engine 2)       — Free public OCR, optimised for receipts
       │ raw text
       ▼
Groq Llama 3.3-70b             — Structures raw text into clean JSON
       │ (fallback: Llama 3.1-8b-instant on rate limit)
       ▼
Parsed receipt JSON returned to frontend
       │
       ▼
User reviews → 1-click to create transaction
```

### AI Financial Advisor Pipeline

```
User sends a chat message (+ optional financial context)
       │
       ▼
Express /api/v1/ai/chat
       │
       ├─► Groq Llama 3.3-70b (primary)
       │         └─► fallback: Llama 3.1-8b-instant
       │
       └─► Offline fallback (no API key)
               └─► Rule-based responses with live transaction stats
```

### Smart SMS Parser Pipeline

```
User pastes bank SMS text (any Indian bank)
       │
       ▼
smsParser.ts (client-side, zero latency)
       │
       ├── Type detection (debit/credit/transfer keywords)
       ├── Amount extraction (₹ / Rs. / INR patterns)
       ├── Merchant extraction (named entity matching)
       └── Date parsing (DD-MMM-YY, DD/MM/YYYY, etc.)
       │
       ▼
Live editable preview table
       │
       ▼
POST /api/v1/transactions/bulk → MongoDB insertMany()
```

---

## 🎨 UI Highlights

- **Glassmorphic cards** with backdrop blur and border gradients
- **3D-style charts** using Canvas gradient fills for depth effect
- **GSAP entrance animations** on KPI stat cards
- **Three.js 3D scene** — interactive 3D spending visualization by category
- **Responsive layout** — works on mobile, tablet, and desktop
- **Smooth theme transitions** — dark/light mode with zero flash
- **Premium typography** — Outfit font from Google Fonts

---

## 🔐 Security

- **JWT-based authentication** — tokens expire and are validated server-side
- **Helmet.js** — sets secure HTTP headers (XSS, CSRF, clickjacking protection)
- **CORS** — restricted to known frontend origins only
- **Password hashing** — bcrypt with salt rounds
- **Input validation** — all API inputs validated before DB write
- All financial data is **user-scoped** — queries always filter by `userId`

---

## 📄 Environment Variables Summary

### Backend (`apps/backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | Server port (default: 5000) |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT signing |
| `GROQ_API_KEY` | ⚡ | Groq Cloud API key (AI chat) |
| `GEMINI_API_KEY` | ⚡ | Google Gemini key (optional alt. AI) |

### ML Service (`apps/ml-service/.env`)

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ⚡ | Groq Cloud API key (OCR + structuring) |

> ⚡ = Optional but required for AI/OCR features. App runs in demo/offline mode without them.

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native / Capacitor)
- [ ] Bank Account Aggregator integration (Setu AA API)
- [ ] Budget goals & smart over-budget alerts
- [ ] Recurring transaction auto-detection
- [ ] Export reports to PDF / Excel
- [ ] Multi-user household accounts
- [ ] WhatsApp / Telegram bot integration

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

## 👨‍💻 Author

**Sumit Paul**
- GitHub: [@Sumitpaul500](https://github.com/Sumitpaul500)

---

<div align="center">

Made with ❤️ using SvelteKit, Node.js, FastAPI, and Groq AI

⭐ **Star this repo if you found it useful!**

</div>
