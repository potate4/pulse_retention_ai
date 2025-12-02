from fastapi import APIRouter
from app.api.v1.endpoints import audios, auth, emails, analytics
# Temporarily disabled churn endpoint due to missing pandas dependency
# from app.api.v1.endpoints import churn

api_router_v1 = APIRouter()

# api_router_v1.include_router(audios.router, prefix="/audios", tags=["audios"])
api_router_v1.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router_v1.include_router(emails.router, prefix="/emails", tags=["emails"])
api_router_v1.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
# api_router_v1.include_router(churn.router, prefix="/churn", tags=["churn-prediction"])
