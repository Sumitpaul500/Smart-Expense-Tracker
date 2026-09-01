# 🛡️ FinPilot AI — Enterprise AI Finance Controller

<div align="center">

<br />

# 🚀 **FinPilot AI — Enterprise AI Finance Controller**
### *Automated 3-Way Reconciliation, Real-Time Exception Explanation, Instant Receipt OCR & Conversational Financial Intelligence*

<br />

[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.0-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Groq](https://img.shields.io/badge/Groq_AI-Compound_Mini-F05032?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

<br />

> **"FinPilot AI is an enterprise-grade AI Finance Controller that ingests real database transactions, automatically performs 3-way reconciliation across bank debits, invoices, and ledger records, detects financial anomalies, provides instant plain-English exception explanations, and maintains a verifiable audit trail."**

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
- [📄 Environment Variables Summary](#-environment-variables-summary)

---

## ✨ Key Features

### 🛡️ Automated 3-Way AI Reconciliation Engine
- **3-Way Cross-Matching Pipeline**: Automatically reconciles financial records across three channels:
  ```text
  Bank/SMS Transaction  +  Receipt/Invoice  +  Ledger Record  ➔  AI RECONCILIATION  ➔  MATCHED / MISMATCH / SUSPICIOUS
  ```
- **Real-Time Exception Explanation & Audit Trail**:
  - **MATCHED** ✅: Verified merchant, exact amount, and date alignment across all sources (auto-approved).
  - **MISMATCH** ⚠️: Pinpoints exact variance (e.g. Bank ₹5,999 vs Invoice ₹5,499 ➔ Mismatch ₹500, Confidence 96%) with recommended resolutions.
  - **SUSPICIOUS** 🚨: Flags unverified merchants, missing invoices, or anomalous debits for manual audit review.
- **Enterprise Controller Dashboard**: KPI metrics for Monitored Volume, Reconciled Items, Active Mismatches, Suspicious Items, Unresolved Count, and Overall Reconciliation Rate (%).
- **Standardized DTO Contract**: Express backend and Python ML service communicate via camelCase DTOs with status management (`PATCH /api/v1/reconciliation/:txCode/status`).

### 🧾 Instant Receipt OCR Scanner (<1.5s Execution)
- **Local PDF Text Extraction (`pypdf`)**: Extracted in **10 milliseconds** locally without waiting for cloud API timeouts.
- **OCR.space Engine 2 Fallback**: Fast fallback for image uploads (JPEG / PNG / WebP).
- **Groq `groq/compound-mini` Structuring**: Converts raw text into JSON (merchant, date, base fare, taxes, fees, grand total, line items).
- **Deterministic Regex Fallback**: If LLM services are rate-limited, fallback pattern parsing extracts merchant, totals, and dates reliably.

### 📱 Smart Bank SMS & Text Bulk Importer
- Ingests SMS notifications (HDFC, SBI, ICICI, Axis, PhonePe, Google Pay, Paytm, UPI).
- Pattern engine extracts transaction type, amount, currency, merchant name, and date.
- Editable preview table before **one-click bulk database insertion**.

### 🤖 FinPilot AI Financial Advisor (Ultra-Clear AI Chat)
- Embedded chat advisor powered by Groq's high-speed `groq/compound-mini` model.
- **Plain-English Guidelines**: Delivers concise 1-sentence takeaways, short bold bullet points, and 2-3 practical action items.
- **Real-Data Injection**: Answers are contextualized using your live database ledger (income, expenses, savings, health score).

### 📊 Interactive Analytics & 3D Spending Scene
- **3D Spending Visualisation** (Threlte + Three.js interactive category canvas).
- **Monthly Trend Charts**, Category Doughnut charts, and Financial Health Score widgets.
- Responsive, theme-aware light/dark design.

---

## 🏗️ Architecture

This is a **monorepo** containing three independent microservices:

```text
User Browser (SvelteKit UI :5173)
     │
     ▼
Express Backend API (:5000) ──────────► Groq Cloud AI (groq/compound-mini)
     ├────────► MongoDB Database (Ledger & Reconciliation Logs)
     └────────► FastAPI ML Service (:8000)
                     ├────────► pypdf (10ms Local PDF Text Extraction)
                     ├────────► OCR.space API (Image OCR Engine)
                     └────────► Groq Cloud AI (Receipt JSON Structuring)
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **SvelteKit 5** + Svelte Runes | Reactive UI framework |
| **TypeScript** | Type safety across components |
| **TailwindCSS** | Utility-first responsive styling |
| **Chart.js** | Financial trend charts |
| **Threlte** + Three.js | 3D spending interactive visualization |
| **Lucide Svelte** | Modern iconography |
| **Vite** | Fast dev server |

### Backend API
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **TypeScript** | Strict controller & route typing |
| **MongoDB** + Mongoose | Persistence layer |
| **JWT Authentication** | Secure token-based auth |
| **Groq SDK** | Fast AI conversational engine |

### ML / AI Microservice
| Technology | Purpose |
|---|---|
| **Python 3.11+** | ML microservice runtime |
| **FastAPI** + Uvicorn | High-performance async ASGI server |
| **PyPDF** | Instant 10ms local PDF text parsing |
| **Groq (`groq/compound-mini`)** | Structuring & match reasoning |
| **OCR.space API** | Image OCR text extraction |

---

## 📁 Project Structure

```text
apps/
├── frontend/
│   └── src/
│       ├── routes/
│       │   ├── (app)/
│       │   │   ├── +page.svelte          # Dashboard
│       │   │   ├── reconciliation/       # AI Finance Controller Page
│       │   │   ├── transactions/         # Transactions & SMS Importer
│       │   │   ├── analytics/            # Financial charts
│       │   │   ├── receipts/             # Receipt OCR Scanner
│       │   │   └── settings/             # Preferences
│       │   └── (auth)/
│       │       ├── login/
│       │       └── register/
│       └── lib/
│           ├── api.ts                    # Central API client
│           └── components/               # UI widgets & 3D scene
│
├── backend/
│   └── src/
│       ├── index.ts                      # Server entry
│       ├── models/                       # User, Transaction, ReconciliationLog
│       ├── controllers/                  # Transaction, Reconciliation, AI Controllers
│       └── routes/                       # Express API endpoints
│
└── ml-service/
    └── app/
        ├── main.py                       # FastAPI application
        ├── api/
        │   ├── ocr_router.py             # PyPDF + Groq OCR pipeline
        │   └── reconcile_router.py       # 3-Way match analysis router
        └── services/
            └── llm_service.py            # Groq model wrapper
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** & **npm**
- **Python 3.11+**
- **MongoDB** running locally (`mongodb://localhost:27017`)
- **Groq API Key** (Get free key from [console.groq.com](https://console.groq.com))

### 1. Backend Setup
```bash
cd apps/backend
npm install
# Create .env file with:
PORT=5000
MONGO_URI=mongodb://localhost:27017/finpilot
JWT_SECRET=supersecretjwtkey_for_development_only
GROQ_API_KEY=gsk_...

npm run dev
```

### 2. ML Service Setup
```bash
cd apps/ml-service
python -m venv venv
.\venv\Scripts\activate  # On Windows
pip install -r requirements.txt
pip install pypdf

# Create .env with GROQ_API_KEY
python main.py
```

### 3. Frontend Setup
```bash
cd apps/frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔌 API Reference

### Reconciliation Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/reconciliation/stats` | Fetches reconciliation summary statistics & KPI rates |
| `GET` | `/api/v1/reconciliation/items` | Fetches reconciliation logs with filter by status |
| `POST` | `/api/v1/reconciliation/run` | Triggers a 3-way batch reconciliation run on real transactions |
| `PATCH` | `/api/v1/reconciliation/:txCode/status` | Updates resolution status (`RESOLVED`, `APPROVED`, `MISMATCH`) |

### Receipt OCR & AI Chat
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/ocr/parse-receipt` | Ingests PDF/Image, runs PyPDF/OCR, returns structured JSON |
| `POST` | `/api/v1/ai/chat` | Conversational financial query endpoint powered by Groq |

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
