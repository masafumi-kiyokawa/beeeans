from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import brew_logs, pour_steps, recipes

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Beans")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recipes.router, prefix="/api/recipes", tags=["recipes"])
app.include_router(pour_steps.router, prefix="/api/recipes", tags=["pour-steps"])
app.include_router(brew_logs.router, prefix="/api/brew-logs", tags=["brew-logs"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
