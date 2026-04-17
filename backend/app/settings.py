import os


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://capstone:capstone@localhost:5432/capstone",
)
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
APP_LOGIN_EMAIL = os.getenv("APP_LOGIN_EMAIL", "dr.maya.kim@northstar-clinic.test")
APP_LOGIN_PASSWORD = os.getenv("APP_LOGIN_PASSWORD", "NorthstarDemo!2026")
