from celery import Celery
from celery.schedules import crontab
import logging
from typing import List, Dict, Any
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create Celery app
celery_app = Celery(
    "ai_news_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    worker_prefetch_multiplier=1,
    worker_concurrency=2,
)

# Beat schedule - runs every 10 minutes
celery_app.conf.beat_schedule = {
    "process-new-articles-every-10-minutes": {
        "task": "app.workers.celery_worker.process_new_articles",
        "schedule": 600.0,  # 10 minutes in seconds
    },
    "fetch-news-every-10-minutes": {
        "task": "app.workers.celery_worker.fetch_and_store_news",
        "schedule": 600.0,  # 10 minutes in seconds
    },
}


def get_news_sync(category: str = None) -> List[Dict[str, Any]]:
    """Synchronously fetch news (for Celery tasks)."""
    params = {
        "apiKey": settings.NEWS_API_KEY,
        "country": "us",
        "pageSize": 20
    }
    if category:
        params["category"] = category
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(
                f"{settings.NEWS_API_BASE_URL}/top-headlines",
                params=params
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "ok":
                articles = []
                for article in data.get("articles", []):
                    if not article.get("url") or not article.get("title"):
                        continue
                    
                    from datetime import datetime
                    published_at = None
                    if article.get("publishedAt"):
                        try:
                            published_at = datetime.fromisoformat(
                                article["publishedAt"].replace("Z", "+00:00")
                            )
                        except (ValueError, TypeError):
                            pass
                    
                    articles.append({
                        "title": article.get("title", "").strip(),
                        "content": article.get("content") or article.get("description") or "",
                        "source": article.get("source", {}).get("name", "Unknown"),
                        "category": category or "general",
                        "url": article.get("url"),
                        "image_url": article.get("urlToImage"),
                        "author": article.get("author"),
                        "published_at": published_at
                    })
                return articles
            return []
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        return []


@celery_app.task(bind=True, max_retries=3)
def fetch_and_store_news(self):
    """
    Fetch news from external API and store in database.
    Runs every 10 minutes via Celery Beat.
    """
    from app.db.session import get_sync_session
    from app.db.models import Article
    from sqlalchemy import select
    
    logger.info("Starting news fetch task...")
    
    categories = ["business", "technology", "science", "health", "general"]
    total_new = 0
    total_skipped = 0
    
    db = get_sync_session()
    try:
        for category in categories:
            logger.info(f"Fetching {category} news...")
            articles = get_news_sync(category)
            
            for article_data in articles:
                # Check if article already exists
                existing = db.execute(
                    select(Article).where(Article.url == article_data["url"])
                ).scalar_one_or_none()
                
                if existing:
                    total_skipped += 1
                    continue
                
                # Create new article
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
                total_new += 1
            
            db.commit()
        
        logger.info(f"News fetch complete. New: {total_new}, Skipped: {total_skipped}")
        return {"new_articles": total_new, "skipped": total_skipped}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error in fetch task: {e}")
        raise self.retry(exc=e, countdown=60)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def process_new_articles(self):
    """
    Process unprocessed articles: generate summaries and extract keywords.
    Runs every 10 minutes via Celery Beat.
    """
    from app.db.session import get_sync_session
    from app.db.models import Article, Tag
    from app.services.summarizer import summarizer
    from sqlalchemy import select
    
    logger.info("Starting article processing task...")
    
    db = get_sync_session()
    try:
        # Get unprocessed articles
        result = db.execute(
            select(Article).where(Article.is_processed == False).limit(50)
        )
        articles = result.scalars().all()
        
        if not articles:
            logger.info("No new articles to process")
            return {"processed": 0}
        
        processed_count = 0
        
        for article in articles:
            try:
                # Generate summary and extract keywords
                summary, keywords = summarizer.process_article(
                    article.title,
                    article.content or ""
                )
                
                # Update article with summary
                article.summary = summary
                
                # Process keywords/tags
                for keyword in keywords:
                    keyword = keyword.lower().strip()
                    if not keyword or len(keyword) < 2:
                        continue
                    
                    # Get or create tag
                    tag = db.execute(
                        select(Tag).where(Tag.name == keyword)
                    ).scalar_one_or_none()
                    
                    if not tag:
                        tag = Tag(name=keyword)
                        db.add(tag)
                        db.flush()
                    
                    # Add tag to article if not already present
                    if tag not in article.tags:
                        article.tags.append(tag)
                
                article.is_processed = True
                processed_count += 1
                
            except Exception as e:
                logger.error(f"Error processing article {article.id}: {e}")
                continue
        
        db.commit()
        logger.info(f"Processed {processed_count} articles")
        return {"processed": processed_count}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error in processing task: {e}")
        raise self.retry(exc=e, countdown=60)
    finally:
        db.close()


@celery_app.task
def process_single_article(article_id: int):
    """Process a single article by ID."""
    from app.db.session import get_sync_session
    from app.db.models import Article, Tag
    from app.services.summarizer import summarizer
    from sqlalchemy import select
    
    db = get_sync_session()
    try:
        article = db.execute(
            select(Article).where(Article.id == article_id)
        ).scalar_one_or_none()
        
        if not article:
            return {"error": "Article not found"}
        
        if article.is_processed:
            return {"status": "already_processed"}
        
        summary, keywords = summarizer.process_article(
            article.title,
            article.content or ""
        )
        
        article.summary = summary
        
        for keyword in keywords:
            keyword = keyword.lower().strip()
            if not keyword or len(keyword) < 2:
                continue
            
            tag = db.execute(
                select(Tag).where(Tag.name == keyword)
            ).scalar_one_or_none()
            
            if not tag:
                tag = Tag(name=keyword)
                db.add(tag)
                db.flush()
            
            if tag not in article.tags:
                article.tags.append(tag)
        
        article.is_processed = True
        db.commit()
        
        return {"status": "processed", "article_id": article_id}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing article {article_id}: {e}")
        return {"error": str(e)}
    finally:
        db.close()
