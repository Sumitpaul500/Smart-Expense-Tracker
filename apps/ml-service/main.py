from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router as ai_router
from app.api.ml_router import router as ml_router
from app.api.ocr_router import router as ocr_router

app = FastAPI(title="FinPilot AI - ML Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI"])
app.include_router(ml_router, prefix="/api/v1/ml", tags=["ML"])
app.include_router(ocr_router, prefix="/api/v1/ocr", tags=["OCR"])

@app.get("/")
def read_root():
    return {"status": "ML Service is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
