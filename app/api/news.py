from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Article, Tag
from app.services.news_client import news_client
from app.workers.celery_worker import process_single_article

router = APIRouter(prefix="/api/news", tags=["News"])


# Pydantic Schemas
class TagResponse(BaseModel):
    """Schema for tag response."""
    id: int
    name: str

    class Config:
        from_attributes = True


class ArticleResponse(BaseModel):
    """Schema for article response."""
    id: int
    title: str
    content: Optional[str]
    summary: Optional[str]
    source: str
    category: Optional[str]
    url: str
    image_url: Optional[str]
    author: Optional[str]
    published_at: Optional[datetime]
    is_processed: bool
    created_at: datetime
    tags: List[TagResponse] = []

    class Config:
        from_attributes = True


class ArticleListResponse(BaseModel):
    """Schema for paginated article list."""
    items: List[ArticleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class FetchNewsRequest(BaseModel):
    """Schema for fetching news request."""
    category: Optional[str] = Field(None, description="News category")
    query: Optional[str] = Field(None, description="Search query")


class FetchNewsResponse(BaseModel):
    """Schema for fetch news response."""
    message: str
    articles_added: int


@router.get("/", response_model=ArticleListResponse)
def get_articles(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    category: Optional[str] = Query(None, description="Filter by category"),
    source: Optional[str] = Query(None, description="Filter by source"),
    processed_only: bool = Query(False, description="Only show processed articles"),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of articles.
    
    - **page**: Page number (starts at 1)
    - **page_size**: Number of items per page (max 100)
    - **category**: Filter by news category
    - **source**: Filter by news source
    - **processed_only**: Only return articles that have been processed
    """
    # Build query
    query = select(Article)
    
    if category:
        query = query.where(Article.category == category)
    
    if source:
        query = query.where(Article.source == source)
    
    if processed_only:
        query = query.where(Article.is_processed == True)
    
    # Get total count
    total_query = select(Article.id)
    if category:
        total_query = total_query.where(Article.category == category)
    if source:
        total_query = total_query.where(Article.source == source)
    if processed_only:
        total_query = total_query.where(Article.is_processed == True)
    
    total = len(db.execute(total_query).all())
    
    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Article.created_at.desc())
    
    articles = db.execute(query).scalars().all()
    
    return ArticleListResponse(
        items=articles,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/categories", response_model=List[str])
def get_categories(
    db: Session = Depends(get_db)
):
    """Get list of all available categories."""
    result = db.execute(
        select(Article.category).distinct().where(Article.category.isnot(None))
    )
    categories = [row[0] for row in result.all() if row[0]]
    return sorted(categories)


@router.get("/sources", response_model=List[str])
def get_sources(
    db: Session = Depends(get_db)
):
    """Get list of all news sources."""
    result = db.execute(
        select(Article.source).distinct()
    )
    sources = [row[0] for row in result.all() if row[0]]
    return sorted(sources)


@router.get("/{article_id}", response_model=ArticleResponse)
def get_article(
    article_id: int,
    db: Session = Depends(get_db)
):
    """Get a single article by ID."""
    article = db.execute(
        select(Article).where(Article.id == article_id)
    ).scalar_one_or_none()
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
    
    return article


@router.post("/fetch", response_model=FetchNewsResponse)
async def fetch_news(
    request: FetchNewsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Manually fetch news from external API.
    
    - **category**: Optional category (business, technology, science, health, sports, entertainment, general)
    - **query**: Optional search query
    """
    articles_data = []
    
    if request.query:
        articles_data = await news_client.fetch_everything(query=request.query)
    else:
        articles_data = await news_client.fetch_top_headlines(category=request.category)
    
    articles_added = 0
    
    for article_data in articles_data:
        # Check if article exists
        existing = db.execute(
            select(Article).where(Article.url == article_data["url"])
        ).scalar_one_or_none()
        
        if existing:
            continue
        
        # Create article
        article = Article(
            title=article_data["title"],
            content=article_data["content"],
            source=article_data["source"],
            category=article_data["category"],
            url=article_data["url"],
            image_url=article_data.get("image_url"),
            author=article_data.get("author"),
            published_at=article_data.get("published_at"),
            is_processed=False
        )
        db.add(article)
        db.flush()
        
        # Queue for processing
        background_tasks.add_task(process_single_article.delay, article.id)
        articles_added += 1
    
    db.commit()
    
    return FetchNewsResponse(
        message=f"Successfully fetched news",
        articles_added=articles_added
    )


@router.post("/{article_id}/process", response_model=ArticleResponse)
def process_article(
    article_id: int,
    db: Session = Depends(get_db)
):
    """
    Manually process a single article (generate summary and extract keywords).
    """
    article = db.execute(
        select(Article).where(Article.id == article_id)
    ).scalar_one_or_none()
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
    
    # Process article synchronously
    from app.services.summarizer import summarizer
    
    summary = summarizer.summarize(article.content)
    keywords = summarizer.extract_keywords(article.content)
    
    article.summary = summary
    article.is_processed = True
    
    # Add tags
    for keyword in keywords[:10]:  # Limit to top 10 keywords
        tag = db.execute(
            select(Tag).where(Tag.name == keyword)
        ).scalar_one_or_none()
        
        if not tag:
            tag = Tag(name=keyword)
            db.add(tag)
        
        if tag not in article.tags:
            article.tags.append(tag)
    
    db.commit()
    db.refresh(article)
    
    return article
