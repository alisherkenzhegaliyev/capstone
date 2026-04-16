from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers.chd import router as chd_router
from app.routers.readmission import router as readmission_router
from fastapi.middleware.cors import CORSMiddleware

# analyze router requires torch + grad-cam — only import if available
try:
    from app.routers.analyze import router as analyze_router
    _analyze_available = True
except Exception as _e:
    import traceback
    print(f"WARNING: analyze router not loaded — {_e}")
    traceback.print_exc()
    _analyze_available = False

app = FastAPI()
BACKEND_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BACKEND_DIR / "static"

origins = [
    "http://localhost:5173",   # frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Static files for annotated images
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

if _analyze_available:
    app.include_router(analyze_router)
app.include_router(chd_router, prefix="/chd", tags=["CHD Risk"])
app.include_router(readmission_router, prefix="/readmission", tags=["Readmission Risk"])
