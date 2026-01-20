from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
import redis

from app.core.config import settings
from app.db.session import init_db
from app.api.auth import router as auth_router
from app.api.news import router as news_router
from app.api.search import router as search_router
from app.api.admin import router as admin_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting AI News Intelligence Backend...")
    init_db()
    logger.info("Database initialized")
    
    # Create default admin user if not exists
    from app.db.session import get_sync_session
    from app.db.models import User
    from sqlalchemy import select
    
    db = get_sync_session()
    try:
        admin = db.execute(
            select(User).where(User.username == "admin")
        ).scalar_one_or_none()
        
        if not admin:
            admin_user = User(
                username="admin",
                full_name="System Administrator"
            )
            db.add(admin_user)
            db.commit()
            logger.info("Default admin user created (username: admin)")
    except Exception as e:
        logger.error(f"Error creating admin user: {e}")
    finally:
        db.close()
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI News Intelligence Backend...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="""
    AI News Intelligence Backend API
    
    A comprehensive news aggregation and intelligence platform that:
    - Fetches news from external APIs
    - Automatically summarizes articles using NLP
    - Extracts keywords and tags
    - Provides powerful search capabilities
    - Offers analytics and insights
    
    ## Features
    
    * **User Management**: Simple username-based user tracking
    * **News Ingestion**: Automatic and manual news fetching
    * **AI Processing**: Article summarization and keyword extraction
    * **Search**: Full-text search with filters
    * **Analytics**: Dashboard with statistics
    
    ## Note
    
    Authentication has been removed. Users are tracked by username only.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )


# Include routers
app.include_router(auth_router)
app.include_router(news_router)
app.include_router(search_router)
app.include_router(admin_router)


# Health check endpoints
@app.get("/", tags=["Health"])
def root():
    """Root endpoint - API information."""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint."""
    health_status = {
        "status": "healthy",
        "services": {
            "api": "up",
            "database": "unknown",
            "redis": "unknown"
        }
    }
    
    # Check database
    try:
        from app.db.session import get_sync_session
        db = get_sync_session()
        db.execute("SELECT 1")
        db.close()
        health_status["services"]["database"] = "up"
    except Exception as e:
        health_status["services"]["database"] = f"down: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Redis
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        health_status["services"]["redis"] = "up"
    except Exception as e:
        health_status["services"]["redis"] = f"down: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status


@app.get("/health/live", tags=["Health"])
def liveness_probe():
    """Kubernetes liveness probe."""
    return {"status": "alive"}


@app.get("/health/ready", tags=["Health"])
def readiness_probe():
    """Kubernetes readiness probe."""
    try:
        from app.db.session import get_sync_session
        db = get_sync_session()
        db.execute("SELECT 1")
        db.close()
        
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        
        return {"status": "ready"}
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not ready"}
        )
