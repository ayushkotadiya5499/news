from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_

from app.db.session import get_db
from app.db.models import Article, Tag, User, article_tags

router = APIRouter(prefix="/api/admin", tags=["Admin Analytics"])


# Pydantic Schemas
class DashboardStats(BaseModel):
    """Schema for dashboard statistics."""
    total_articles: int
    processed_articles: int
    unprocessed_articles: int
    total_tags: int
    total_users: int
    articles_today: int
    articles_this_week: int


class TagStats(BaseModel):
    """Schema for tag statistics."""
    id: int
    name: str
    article_count: int


class CategoryStats(BaseModel):
    """Schema for category statistics."""
    category: str
    article_count: int


class DailyArticleStats(BaseModel):
    """Schema for daily article statistics."""
    date: str
    count: int


class SourceStats(BaseModel):
    """Schema for source statistics."""
    source: str
    article_count: int


class AnalyticsResponse(BaseModel):
    """Schema for complete analytics response."""
    dashboard: DashboardStats
    top_tags: List[TagStats]
    categories: List[CategoryStats]
    articles_per_day: List[DailyArticleStats]
    top_sources: List[SourceStats]


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
):
    """
    Get dashboard statistics.
    Admin only.
    """
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    # Total articles
    total_articles = db.execute(
        select(func.count(Article.id))
    ).scalar() or 0
    
    # Processed articles
    processed_articles = db.execute(
        select(func.count(Article.id)).where(Article.is_processed == True)
    ).scalar() or 0
    
    # Total tags
    total_tags = db.execute(
        select(func.count(Tag.id))
    ).scalar() or 0
    
    # Total users
    total_users = db.execute(
        select(func.count(User.id))
    ).scalar() or 0
    
    # Articles today
    articles_today = db.execute(
        select(func.count(Article.id)).where(Article.created_at >= today_start)
    ).scalar() or 0
    
    # Articles this week
    articles_this_week = db.execute(
        select(func.count(Article.id)).where(Article.created_at >= week_start)
    ).scalar() or 0
    
    return DashboardStats(
        total_articles=total_articles,
        processed_articles=processed_articles,
        unprocessed_articles=total_articles - processed_articles,
        total_tags=total_tags,
        total_users=total_users,
        articles_today=articles_today,
        articles_this_week=articles_this_week
    )


@router.get("/tags/top", response_model=List[TagStats])
def get_top_tags(
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """
    Get most common tags.
    Admin only.
    """
    result = db.execute(
        select(
            Tag.id,
            Tag.name,
            func.count(article_tags.c.article_id).label("article_count")
        )
        .join(article_tags, Tag.id == article_tags.c.tag_id)
        .group_by(Tag.id, Tag.name)
        .order_by(func.count(article_tags.c.article_id).desc())
        .limit(limit)
    )
    
    return [
        TagStats(id=row[0], name=row[1], article_count=row[2])
        for row in result.all()
    ]


@router.get("/categories", response_model=List[CategoryStats])
def get_category_stats(
    db: Session = Depends(get_db),
):
    """
    Get article counts per category.
    Admin only.
    """
    result = db.execute(
        select(
            Article.category,
            func.count(Article.id).label("article_count")
        )
        .where(Article.category.isnot(None))
        .group_by(Article.category)
        .order_by(func.count(Article.id).desc())
    )
    
    return [
        CategoryStats(category=row[0] or "uncategorized", article_count=row[1])
        for row in result.all()
    ]


@router.get("/articles-per-day", response_model=List[DailyArticleStats])
def get_articles_per_day(
    days: int = 30,
    db: Session = Depends(get_db),
):
    """
    Get article counts per day for the last N days.
    Admin only.
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = db.execute(
        select(
            func.date(Article.created_at).label("date"),
            func.count(Article.id).label("count")
        )
        .where(Article.created_at >= start_date)
        .group_by(func.date(Article.created_at))
        .order_by(func.date(Article.created_at))
    )
    
    return [
        DailyArticleStats(date=str(row[0]), count=row[1])
        for row in result.all()
    ]


@router.get("/sources", response_model=List[SourceStats])
def get_source_stats(
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """
    Get top news sources by article count.
    Admin only.
    """
    result = db.execute(
        select(
            Article.source,
            func.count(Article.id).label("article_count")
        )
        .group_by(Article.source)
        .order_by(func.count(Article.id).desc())
        .limit(limit)
    )
    
    return [
        SourceStats(source=row[0], article_count=row[1])
        for row in result.all()
    ]


@router.get("/analytics", response_model=AnalyticsResponse)
def get_full_analytics(
    db: Session = Depends(get_db),
):
    """
    Get complete analytics data.
    Admin only.
    """
    dashboard = get_dashboard_stats(db)
    top_tags = get_top_tags(20, db)
    categories = get_category_stats(db)
    articles_per_day = get_articles_per_day(30, db)
    top_sources = get_source_stats(20, db)
    
    return AnalyticsResponse(
        dashboard=dashboard,
        top_tags=top_tags,
        categories=categories,
        articles_per_day=articles_per_day,
        top_sources=top_sources
    )


@router.get("/users", response_model=List[dict])
def get_users_list(
    db: Session = Depends(get_db),
):
    """
    Get list of all users.
    Admin only.
    """
    users = db.execute(
        select(User).order_by(User.created_at.desc())
    ).scalars().all()
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "created_at": user.created_at.isoformat()
        }
        for user in users
    ]


@router.post("/trigger-processing")
def trigger_article_processing(
):
    """
    Manually trigger article processing task.
    Admin only.
    """
    try:
        from app.workers.celery_worker import process_new_articles
        
        task = process_new_articles.delay()
        
        return {
            "message": "Processing task triggered",
            "task_id": task.id
        }
    except (ConnectionError, RuntimeError) as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis/Celery is not available. Please start Redis server: sudo systemctl start redis or redis-server"
        )


@router.post("/trigger-fetch")
def trigger_news_fetch(
):
    """
    Manually trigger news fetch task.
    Admin only.
    """
    try:
        from app.workers.celery_worker import fetch_and_store_news
        
        task = fetch_and_store_news.delay()
        
        return {
            "message": "Fetch task triggered",
            "task_id": task.id
        }
    except (ConnectionError, RuntimeError) as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Redis/Celery is not available. Please start Redis server: sudo systemctl start redis or redis-server"
        )
