from fastapi import APIRouter
from pydantic import BaseModel
import random

router = APIRouter()

class PredictRequest(BaseModel):
    merchant: str
    amount: float

@router.post("/predict-category")
def predict_category(request: PredictRequest):
    # This is a simplified prediction model for demonstration.
    # In a real environment, we'd load a pickled Scikit-Learn/LightGBM model here.
    
    categories = ["Food & Dining", "Transportation", "Shopping", "Entertainment", "Utilities"]
    
    # Simple heuristic + random to simulate ML
    merchant_lower = request.merchant.lower()
    predicted_category = "Miscellaneous"
    
    if any(x in merchant_lower for x in ["restaurant", "cafe", "coffee", "uber eats", "doordash", "mcdonalds"]):
        predicted_category = "Food & Dining"
    elif any(x in merchant_lower for x in ["uber", "lyft", "transit", "gas", "shell", "chevron"]):
        predicted_category = "Transportation"
    elif any(x in merchant_lower for x in ["amazon", "walmart", "target", "nike", "apple"]):
        predicted_category = "Shopping"
    elif any(x in merchant_lower for x in ["netflix", "spotify", "hulu", "cinema", "amc"]):
        predicted_category = "Entertainment"
    elif any(x in merchant_lower for x in ["pg&e", "water", "electric", "internet", "comcast"]):
        predicted_category = "Utilities"
    else:
        predicted_category = random.choice(categories)
        
    confidence = round(random.uniform(0.70, 0.99), 2)

    return {
        "category": predicted_category,
        "confidence": confidence
    }
