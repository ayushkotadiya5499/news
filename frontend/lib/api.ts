import {
  Article,
  ArticleListResponse,
  SearchResultsResponse,
  DashboardStats,
  TagStats,
  CategoryStats,
  SourceStats,
  DailyArticleStats,
  AnalyticsResponse,
  FetchNewsRequest,
  FetchNewsResponse,
  Tag,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || `Request failed: ${response.statusText}`);
  }

  return response.json();
}

// News API
export const newsApi = {
  // Get paginated articles
  getArticles: async (params?: {
    page?: number;
    page_size?: number;
    category?: string;
    source?: string;
    processed_only?: boolean;
  }): Promise<ArticleListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.category) searchParams.set('category', params.category);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.processed_only) searchParams.set('processed_only', 'true');
    
    const query = searchParams.toString();
    return fetchApi<ArticleListResponse>(`/api/news/${query ? `?${query}` : ''}`);
  },

  // Get single article
  getArticle: async (id: number): Promise<Article> => {
    return fetchApi<Article>(`/api/news/${id}`);
  },

  // Fetch news from external API
  fetchNews: async (request: FetchNewsRequest): Promise<FetchNewsResponse> => {
    return fetchApi<FetchNewsResponse>('/api/news/fetch', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // Process single article
  processArticle: async (id: number): Promise<Article> => {
    return fetchApi<Article>(`/api/news/${id}/process`, {
      method: 'POST',
    });
  },

  // Get all categories
  getCategories: async (): Promise<string[]> => {
    return fetchApi<string[]>('/api/news/categories');
  },

  // Get all sources
  getSources: async (): Promise<string[]> => {
    return fetchApi<string[]>('/api/news/sources');
  },
};

// Search API
export const searchApi = {
  // Search articles
  search: async (params?: {
    q?: string;
    category?: string;
    source?: string;
    tag?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<SearchResultsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.tag) searchParams.set('tag', params.tag);
    if (params?.from_date) searchParams.set('from_date', params.from_date);
    if (params?.to_date) searchParams.set('to_date', params.to_date);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    
    const query = searchParams.toString();
    return fetchApi<SearchResultsResponse>(`/api/search/${query ? `?${query}` : ''}`);
  },

  // Get all tags
  getTags: async (): Promise<Tag[]> => {
    return fetchApi<Tag[]>('/api/search/tags');
  },

  // Get popular tags
  getPopularTags: async (limit?: number): Promise<Array<{ id: number; name: string; article_count: number }>> => {
    const query = limit ? `?limit=${limit}` : '';
    return fetchApi(`/api/search/tags/popular${query}`);
  },

  // Get search suggestions
  getSuggestions: async (q: string, limit?: number): Promise<{ tags: string[]; titles: string[] }> => {
    const searchParams = new URLSearchParams({ q });
    if (limit) searchParams.set('limit', limit.toString());
    return fetchApi(`/api/search/suggestions?${searchParams.toString()}`);
  },
};

// Admin API
export const adminApi = {
  // Get dashboard stats
  getStats: async (): Promise<DashboardStats> => {
    return fetchApi<DashboardStats>('/api/admin/stats');
  },

  // Get top tags
  getTopTags: async (limit?: number): Promise<TagStats[]> => {
    const query = limit ? `?limit=${limit}` : '';
    return fetchApi<TagStats[]>(`/api/admin/tags/top${query}`);
  },

  // Get category stats
  getCategories: async (): Promise<CategoryStats[]> => {
    return fetchApi<CategoryStats[]>('/api/admin/categories');
  },

  // Get source stats
  getSources: async (limit?: number): Promise<SourceStats[]> => {
    const query = limit ? `?limit=${limit}` : '';
    return fetchApi<SourceStats[]>(`/api/admin/sources${query}`);
  },

  // Get articles per day
  getArticlesPerDay: async (days?: number): Promise<DailyArticleStats[]> => {
    const query = days ? `?days=${days}` : '';
    return fetchApi<DailyArticleStats[]>(`/api/admin/articles-per-day${query}`);
  },

  // Get full analytics
  getAnalytics: async (): Promise<AnalyticsResponse> => {
    return fetchApi<AnalyticsResponse>('/api/admin/analytics');
  },

  // Trigger article processing
  triggerProcessing: async (): Promise<{ message: string }> => {
    return fetchApi('/api/admin/trigger-processing', { method: 'POST' });
  },

  // Trigger news fetch
  triggerFetch: async (): Promise<{ message: string }> => {
    return fetchApi('/api/admin/trigger-fetch', { method: 'POST' });
  },
};

// Health API
export const healthApi = {
  check: async (): Promise<{ status: string; database: string; redis: string }> => {
    return fetchApi('/health');
  },
};
