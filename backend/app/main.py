import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_current_user, seed_default_user
from app.db import Base, SessionLocal, engine

BACKEND_DIR = Path(__file__).resolve().parent.parent
CACHE_DIR = BACKEND_DIR / ".cache"
MPL_CACHE_DIR = CACHE_DIR / "matplotlib"
FONTCONFIG_CACHE_DIR = CACHE_DIR / "fontconfig"
STATIC_DIR = BACKEND_DIR / "static"

CACHE_DIR.mkdir(parents=True, exist_ok=True)
MPL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
FONTCONFIG_CACHE_DIR.mkdir(parents=True, exist_ok=True)
STATIC_DIR.mkdir(parents=True, exist_ok=True)

# Keep model-library caches inside the repo so startup doesn't depend on
# user-home write permissions.
os.environ.setdefault("MPLCONFIGDIR", str(MPL_CACHE_DIR))
os.environ.setdefault("XDG_CACHE_HOME", str(CACHE_DIR))

# analyze router requires torch + grad-cam — only import if available
try:
    from app.routers.auth import router as auth_router
    _auth_available = True
except Exception as _e:
    import traceback
    print(f"WARNING: auth router not loaded — {_e}")
    traceback.print_exc()
    _auth_available = False

try:
    from app.routers.analyze import router as analyze_router
    _analyze_available = True
except Exception as _e:
    import traceback
    print(f"WARNING: analyze router not loaded — {_e}")
    traceback.print_exc()
    _analyze_available = False

try:
    from app.routers.chd import router as chd_router
    _chd_available = True
except Exception as _e:
    import traceback
    print(f"WARNING: chd router not loaded — {_e}")
    traceback.print_exc()
    _chd_available = False

try:
    from app.routers.readmission import router as readmission_router
    _readmission_available = True
except Exception as _e:
    import traceback
    print(f"WARNING: readmission router not loaded — {_e}")
    traceback.print_exc()
    _readmission_available = False


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_user(db)
    finally:
        db.close()
    yield


app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",   # frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Static files for annotated images
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

if _auth_available:
    app.include_router(auth_router)
if _analyze_available:
    app.include_router(analyze_router, dependencies=[Depends(get_current_user)])
if _chd_available:
    app.include_router(
        chd_router,
        prefix="/chd",
        tags=["CHD Risk"],
        dependencies=[Depends(get_current_user)],
    )
if _readmission_available:
    app.include_router(
        readmission_router,
        prefix="/readmission",
        tags=["Readmission Risk"],
        dependencies=[Depends(get_current_user)],
    )
