import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.analytics import router as analytics_router
from app.api.experiments import router as experiments_router
from app.api.routes import router
from app.database.session import get_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    get_engine().dispose()


app = FastAPI(title="ProductPulse", version="0.1.0", lifespan=lifespan)
app.include_router(router)
app.include_router(analytics_router)
app.include_router(experiments_router)


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError):
    # Do not leak connection strings or SQL parameters in API responses or logs.
    logging.getLogger(__name__).error("Database request failed: %s", type(exc).__name__)
    return JSONResponse(status_code=503, content={"detail": "Database unavailable or not migrated"})
