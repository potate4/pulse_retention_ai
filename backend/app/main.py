from fastapi import FastAPI
from app.api.v1.api import api_router_v1
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://shrobon-audio.web.app",
    "https://audio.shrobon.com",
]

# Add CORS middleware FIRST (before routes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers AFTER middleware
app.include_router(api_router_v1, prefix="/api/v1")
# Dummy Endpoint
@app.get("/")
async def get_welcome_message():
   return "Pulse - Customer Identity Intelligence and Retention Platform API"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)