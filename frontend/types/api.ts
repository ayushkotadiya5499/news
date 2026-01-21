// API Types based on OpenAPI schema

// Tag types
export interface Tag {
  id: number;
  name: string;
}

export interface TagStats {
  id: number;
  name: string;
  article_count: number;
}

// Article types
export interface Article {
  id: number;
  title: string;
  content: string | null;
  summary: string | null;
  source: string;
  category: string | null;
  url: string;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  is_processed: boolean;
  created_at: string;
  tags: Tag[];
}

export interface ArticleSearchResult {
  id: number;
  title: string;
  summary: string | null;
  source: string;
  category: string | null;
  url: string;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  tags: Tag[];
}

// Paginated responses
export interface ArticleListResponse {
  items: Article[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SearchResultsResponse {
  items: ArticleSearchResult[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  query: string | null;
}

// Dashboard / Admin types
export interface DashboardStats {
  total_articles: number;
  processed_articles: number;
  unprocessed_articles: number;
  total_tags: number;
  total_users: number;
  articles_today: number;
  articles_this_week: number;
}

export interface CategoryStats {
  category: string;
  article_count: number;
}

export interface SourceStats {
  source: string;
  article_count: number;
}

export interface DailyArticleStats {
  date: string;
  count: number;
}

export interface AnalyticsResponse {
  dashboard: DashboardStats;
  top_tags: TagStats[];
  categories: CategoryStats[];
  articles_per_day: DailyArticleStats[];
  top_sources: SourceStats[];
}

// Request types
export interface FetchNewsRequest {
  category?: string | null;
  query?: string | null;
}

export interface FetchNewsResponse {
  message: string;
  articles_added: number;
}

// User types
export interface User {
  id: number;
  username: string;
  full_name: string | null;
}

// Search suggestions
export interface SearchSuggestion {
  tags: string[];
  titles: string[];
}
