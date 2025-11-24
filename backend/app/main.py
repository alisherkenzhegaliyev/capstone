from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers.analyze import router as analyze_router
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

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
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(analyze_router)