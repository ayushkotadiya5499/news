import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class NewsClient:
    """Client for fetching news from external APIs."""
    
    def __init__(self):
        self.api_key = settings.NEWS_API_KEY
        self.base_url = settings.NEWS_API_BASE_URL
        
    async def fetch_top_headlines(
        self,
        country: str = "us",
        category: Optional[str] = None,
        page_size: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Fetch top headlines from NewsAPI.
        
        Args:
            country: Country code (e.g., 'us', 'gb')
            category: News category (business, entertainment, general, health, science, sports, technology)
            page_size: Number of articles to fetch
            
        Returns:
            List of article dictionaries
        """
        params = {
            "apiKey": self.api_key,
            "country": country,
            "pageSize": page_size
        }
        
        if category:
            params["category"] = category
            
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/top-headlines",
                    params=params
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") == "ok":
                    return self._transform_articles(data.get("articles", []), category)
                else:
                    logger.error(f"NewsAPI error: {data.get('message', 'Unknown error')}")
                    return []
                    
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching news: {e}")
            return []
        except Exception as e:
            logger.error(f"Error fetching news: {e}")
            return []
    
    async def fetch_everything(
        self,
        query: str,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        page_size: int = 20,
        sort_by: str = "publishedAt"
    ) -> List[Dict[str, Any]]:
        """
        Search for news articles matching a query.
        
        Args:
            query: Search query
            from_date: Start date for articles
            to_date: End date for articles
            page_size: Number of articles to fetch
            sort_by: Sort order (relevancy, popularity, publishedAt)
            
        Returns:
            List of article dictionaries
        """
        params = {
            "apiKey": self.api_key,
            "q": query,
            "pageSize": page_size,
            "sortBy": sort_by,
            "language": "en"
        }
        
        if from_date:
            params["from"] = from_date.strftime("%Y-%m-%d")
        if to_date:
            params["to"] = to_date.strftime("%Y-%m-%d")
            
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/everything",
                    params=params
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") == "ok":
                    return self._transform_articles(data.get("articles", []))
                else:
                    logger.error(f"NewsAPI error: {data.get('message', 'Unknown error')}")
                    return []
                    
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error searching news: {e}")
            return []
        except Exception as e:
            logger.error(f"Error searching news: {e}")
            return []
    
    def _transform_articles(
        self,
        articles: List[Dict[str, Any]],
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Transform NewsAPI articles to our format."""
        transformed = []
        
        for article in articles:
            if not article.get("url") or not article.get("title"):
                continue
                
            # Parse published date
            published_at = None
            if article.get("publishedAt"):
                try:
                    published_at = datetime.fromisoformat(
                        article["publishedAt"].replace("Z", "+00:00")
                    )
                except (ValueError, TypeError):
                    pass
            
            transformed.append({
                "title": article.get("title", "").strip(),
                "content": article.get("content") or article.get("description") or "",
                "source": article.get("source", {}).get("name", "Unknown"),
                "category": category or "general",
                "url": article.get("url"),
                "image_url": article.get("urlToImage"),
                "author": article.get("author"),
                "published_at": published_at
            })
            
        return transformed


# Singleton instance
news_client = NewsClient()
