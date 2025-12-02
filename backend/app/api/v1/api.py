from fastapi import APIRouter
from app.api.v1.endpoints import audios, auth, churn, churn_v2, segmentation, behavior

api_router_v1 = APIRouter()

# api_router_v1.include_router(audios.router, prefix="/audios", tags=["audios"])
api_router_v1.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router_v1.include_router(churn.router, prefix="/churn", tags=["churn-prediction-v1"])
api_router_v1.include_router(churn_v2.router, prefix="/churn/v2", tags=["churn-prediction-v2"])
api_router_v1.include_router(segmentation.router, prefix="/segmentation", tags=["customer-segmentation"])
api_router_v1.include_router(behavior.router, prefix="/behavior", tags=["behavior-analysis"])
