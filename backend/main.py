from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.config import settings
from backend.routers import (
    stations,
    aqi,
    predict,
    attribution,
    enforcement,
    advisory,
    chat,
    data,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    print("VayuDrishti API Starting Up...")
    from backend.models.database import db_helper, seed_database
    from backend.services.scheduler import start_scheduler
    db_helper.connect()
    await seed_database()
    start_scheduler()
    yield
    # Shutdown tasks
    print("VayuDrishti API Shutting Down...")
    db_helper.disconnect()

app = FastAPI(
    title="VayuDrishti (वायुदृष्टि) API",
    description="AI-powered Urban Air Quality Intelligence Platform for India's Smart Cities",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers with v1 prefix
api_prefix = "/api/v1"
app.include_router(stations.router, prefix=api_prefix)
app.include_router(aqi.router, prefix=api_prefix)
app.include_router(predict.router, prefix=api_prefix)
app.include_router(attribution.router, prefix=api_prefix)
app.include_router(enforcement.router, prefix=api_prefix)
app.include_router(advisory.router, prefix=api_prefix)
app.include_router(chat.router, prefix=api_prefix)
app.include_router(data.router, prefix=api_prefix)

@app.get("/")
async def root():
    return {
        "app": "VayuDrishti (वायुदृष्टि) API",
        "version": "1.0.0",
        "status": "healthy",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    import os
    app_import = "backend.main:app" if os.path.isdir("backend") else "main:app"
    uvicorn.run(app_import, host=settings.HOST, port=settings.PORT, reload=settings.ENVIRONMENT == "development")
