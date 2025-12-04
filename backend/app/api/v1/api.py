from fastapi import APIRouter
from app.api.v1.endpoints import audios, auth, emails, analytics, roi, email_history
# Temporarily disabled churn endpoint due to missing pandas dependency
# from app.api.v1.endpoints import churn

from app.api.v1.endpoints import audios, auth, churn, churn_v2, segmentation, behavior, widget, payment, csv_normalize


api_router_v1 = APIRouter()

# api_router_v1.include_router(audios.router, prefix="/audios", tags=["audios"])
api_router_v1.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router_v1.include_router(emails.router, prefix="/emails", tags=["emails"])
api_router_v1.include_router(email_history.router, prefix="/email-history", tags=["email-history"])
api_router_v1.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router_v1.include_router(roi.router, prefix="/roi", tags=["roi"])
# api_router_v1.include_router(churn.router, prefix="/churn", tags=["churn-prediction"])
api_router_v1.include_router(churn.router, prefix="/churn", tags=["churn-prediction-v1"])
api_router_v1.include_router(churn_v2.router, prefix="/churn/v2", tags=["churn-prediction-v2"])
api_router_v1.include_router(segmentation.router, prefix="/segmentation", tags=["customer-segmentation"])
api_router_v1.include_router(behavior.router, prefix="/behavior", tags=["behavior-analysis"])
api_router_v1.include_router(widget.router, prefix="/widget", tags=["widget"])
api_router_v1.include_router(payment.router, prefix="/payment", tags=["payment"])
api_router_v1.include_router(csv_normalize.router, prefix="/csv", tags=["csv-normalization"])
