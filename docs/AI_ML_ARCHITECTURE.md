# FinPilot AI - AI & Machine Learning Architecture

The AI/ML ecosystem is handled by an independent Python (FastAPI) microservice to leverage the rich Python data science ecosystem (Scikit-Learn, PyTorch, Transformers) while maintaining high performance.

## 1. Generative AI (LLM Integration)
**Provider:** Google Gemini API
**Framework:** LangChain

### Features:
*   **Natural Language Financial Assistant:** Users can ask, "Can I afford a $500 PS5 this month?" The LLM queries the RAG system to check current budgets, recent expenses, and projected cash flow before answering.
*   **Transaction Explanation:** Gemini summarizes anomalous spending behavior in human-readable terms.
*   **Report Generation:** Generates automated weekly/monthly financial summaries with actionable advice.

### RAG (Retrieval-Augmented Generation) Pipeline:
1. User data (transactions, goals) is vectorized using `Sentence-Transformers` (`all-MiniLM-L6-v2`).
2. Embeddings are stored in a Vector Database (Pinecone).
3. User query -> Embed Query -> Retrieve top K relevant user transactions/rules -> Pass context to Gemini API -> Return intelligent response.

## 2. Predictive Machine Learning
We use structured ML models for tabular financial data.

### 2.1. Expense Category Prediction
*   **Algorithm:** LightGBM / XGBoost
*   **Features:** Merchant name (TF-IDF vector), amount, time of day, day of week.
*   **Use Case:** Auto-categorizes manually entered or bank-synced transactions in real-time.

### 2.2. Fraud & Anomaly Detection
*   **Algorithm:** Isolation Forest
*   **Use Case:** Evaluates new transactions. If an expense deviates significantly from historical patterns (e.g., $2000 at a jewelry store when typical spend is $50 max), it flags it for user review.

### 2.3. Cash Flow & Expense Forecasting
*   **Algorithm:** Meta Prophet
*   **Use Case:** Time-series forecasting to predict net worth and account balances 30/60/90 days in the future, accounting for seasonality (e.g., higher spending on weekends, rent on the 1st).

### 2.4. Subscription Detection
*   **Algorithm:** Clustering (DBSCAN) + Rule-based heuristics
*   **Use Case:** Groups similar transactions occurring at regular intervals (monthly/yearly) with similar amounts to automatically identify hidden subscriptions (e.g., Netflix, Gym).

## 3. OCR (Optical Character Recognition) Pipeline
**Engine:** Google Cloud Vision API (Preferred for accuracy) or Tesseract (Fallback).

### Pipeline:
1. Image uploaded from React Native / Web.
2. Node.js backend saves image to Cloudinary and sends URL to Python Microservice.
3. Python service runs image preprocessing (OpenCV - deskew, binarize).
4. Google Vision extracts raw text.
5. RegEx and Gemini API extract structured entities (Merchant, Date, Total Amount, Tax/GST, Line Items).
6. Returns structured JSON to Node.js backend to save as a Transaction.

## 4. Model Training & MLOps
*   **Cold Start:** Pre-trained on synthetic/anonymized dataset for category prediction.
*   **Online Learning:** Models are periodically retrained (batch process) via Airflow or Cron jobs as users edit miscategorized transactions, improving personalization over time.
*   **Monitoring:** EvidentlyAI or Prometheus custom metrics to track data drift and model accuracy.
