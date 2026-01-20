from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, and_, func

from app.db.session import get_db
from app.db.models import Article, Tag, article_tags

router = APIRouter(prefix="/api/search", tags=["Search"])


# Pydantic Schemas
class TagResponse(BaseModel):
    """Schema for tag response."""
    id: int
    name: str

    class Config:
        from_attributes = True


class ArticleSearchResponse(BaseModel):
    """Schema for article in search results."""
    id: int
    title: str
    summary: Optional[str]
    source: str
    category: Optional[str]
    url: str
    image_url: Optional[str]
    author: Optional[str]
    published_at: Optional[datetime]
    tags: List[TagResponse] = []

    class Config:
        from_attributes = True


class SearchResultsResponse(BaseModel):
    """Schema for search results."""
    items: List[ArticleSearchResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    query: Optional[str]


@router.get("/", response_model=SearchResultsResponse)
def search_articles(
    q: Optional[str] = Query(None, description="Search query for title, content, or tags"),
    category: Optional[str] = Query(None, description="Filter by category"),
    source: Optional[str] = Query(None, description="Filter by source"),
    tag: Optional[str] = Query(None, description="Filter by tag name"),
    from_date: Optional[date] = Query(None, description="Filter articles from this date"),
    to_date: Optional[date] = Query(None, description="Filter articles until this date"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    Search articles with multiple filters.
    
    - **q**: Search keyword in title, content, summary, or tags
    - **category**: Filter by news category
    - **source**: Filter by news source
    - **tag**: Filter by specific tag
    - **from_date**: Articles published on or after this date
    - **to_date**: Articles published on or before this date
    - **page**: Page number for pagination
    - **page_size**: Number of results per page
    """
    # Base query - only processed articles for search
    query = select(Article).where(Article.is_processed == True)
    
    # Text search
    if q:
        search_term = f"%{q.lower()}%"
        
        # Search in title, content, summary
        text_conditions = or_(
            Article.title.ilike(search_term),
            Article.content.ilike(search_term),
            Article.summary.ilike(search_term)
        )
        
        # Search in tags - get article IDs that have matching tags
        tag_subquery = (
            select(article_tags.c.article_id)
            .join(Tag, Tag.id == article_tags.c.tag_id)
            .where(Tag.name.ilike(search_term))
        )
        
        query = query.where(
            or_(
                text_conditions,
                Article.id.in_(tag_subquery)
            )
        )
    
    # Category filter
    if category:
        query = query.where(Article.category == category)
    
    # Source filter
    if source:
        query = query.where(Article.source.ilike(f"%{source}%"))
    
    # Tag filter
    if tag:
        tag_subquery = (
            select(article_tags.c.article_id)
            .join(Tag, Tag.id == article_tags.c.tag_id)
            .where(Tag.name == tag.lower())
        )
        query = query.where(Article.id.in_(tag_subquery))
    
    # Date filters
    if from_date:
        from_datetime = datetime.combine(from_date, datetime.min.time())
        query = query.where(Article.published_at >= from_datetime)
    
    if to_date:
        to_datetime = datetime.combine(to_date, datetime.max.time())
        query = query.where(Article.published_at <= to_datetime)
    
    # Count total results (simplified)
    count_query = query.with_only_columns(func.count(Article.id))
    total = db.execute(count_query).scalar() or 0
    
    # Order by relevance (published date) and apply pagination
    query = query.order_by(Article.published_at.desc().nullslast())
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    articles = db.execute(query).scalars().all()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    return SearchResultsResponse(
        items=articles,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        query=q
    )


@router.get("/tags", response_model=List[TagResponse])
def get_all_tags(
    db: Session = Depends(get_db),
):
    """Get all available tags."""
    tags = db.execute(
        select(Tag).order_by(Tag.name)
    ).scalars().all()
    return tags


@router.get("/tags/popular", response_model=List[dict])
def get_popular_tags(
    limit: int = Query(20, ge=1, le=100, description="Number of tags to return"),
    db: Session = Depends(get_db),
):
    """Get most popular tags with article counts."""
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
        {"id": row[0], "name": row[1], "article_count": row[2]}
        for row in result.all()
    ]


@router.get("/suggestions")
def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Partial search query"),
    limit: int = Query(10, ge=1, le=20, description="Number of suggestions"),
    db: Session = Depends(get_db),
):
    """
    Get search suggestions based on partial query.
    Returns matching tags and article titles.
    """
    search_term = f"%{q.lower()}%"
    
    # Get matching tags
    tags = db.execute(
        select(Tag.name)
        .where(Tag.name.ilike(search_term))
        .limit(limit // 2)
    ).scalars().all()
    
    # Get matching article titles
    titles = db.execute(
        select(Article.title)
        .where(
            and_(
                Article.title.ilike(search_term),
                Article.is_processed == True
            )
        )
        .limit(limit // 2)
    ).scalars().all()
    
    return {
        "tags": list(tags),
        "titles": list(titles)
    }
