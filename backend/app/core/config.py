from pydantic_settings import BaseSettings
from pydantic import PostgresDsn
import os
from dotenv import load_dotenv
from secrets import token_urlsafe

load_dotenv(override=True)  

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL",)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY:str = os.getenv("SUPABASE_ANON_KEY")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY")
    
    # JWT Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # bKash Payment Gateway Settings
    BKASH_APP_KEY: str = os.getenv("BKASH_APP_KEY", "")
    BKASH_APP_SECRET: str = os.getenv("BKASH_APP_SECRET", "")
    BKASH_USERNAME: str = os.getenv("BKASH_USERNAME", "")
    BKASH_PASSWORD: str = os.getenv("BKASH_PASSWORD", "")
    BKASH_SANDBOX_URL: str = os.getenv("BKASH_SANDBOX_URL", "https://tokenized.sandbox.bka.sh/v1.2.0-beta")
    BKASH_PRODUCTION_URL: str = os.getenv("BKASH_PRODUCTION_URL", "https://tokenized.pay.bka.sh/v1.2.0-beta")
    BKASH_MODE: str = os.getenv("BKASH_MODE", "sandbox")  # 'sandbox' or 'production'
    BKASH_CALLBACK_URL: str = os.getenv("BKASH_CALLBACK_URL", "http://localhost:5173/payment/callback")
    
    # SSLCommerz Payment Gateway Settings
    SSLCOMMERZ_STORE_ID: str = os.getenv("SSLCOMMERZ_STORE_ID", "")
    SSLCOMMERZ_STORE_PASSWORD: str = os.getenv("SSLCOMMERZ_STORE_PASSWORD", "")
    SSLCOMMERZ_MODE: str = os.getenv("SSLCOMMERZ_MODE", "sandbox")  # 'sandbox' or 'production'
    SSLCOMMERZ_CALLBACK_URL: str = os.getenv("SSLCOMMERZ_CALLBACK_URL", "http://localhost:5173")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")

settings = Settings()