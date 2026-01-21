'use client';

import { useEffect, useState, useCallback } from 'react';
import { newsApi } from '@/lib/api';
import { Article, ArticleListResponse } from '@/types';
import { ArticleCard, Pagination, Filters } from '@/components/articles';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [categories, setCategories] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [processedOnly, setProcessedOnly] = useState(false);

  const PAGE_SIZE = 10;

  // Fetch categories and sources
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [cats, srcs] = await Promise.all([
          newsApi.getCategories(),
          newsApi.getSources(),
        ]);
        setCategories(cats);
        setSources(srcs);
      } catch (err) {
        console.error('Failed to fetch filters', err);
      }
    };
    fetchFilters();
  }, []);

  // Fetch articles
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await newsApi.getArticles({
        page: currentPage,
        page_size: PAGE_SIZE,
        category: selectedCategory || undefined,
        source: selectedSource || undefined,
        processed_only: processedOnly || undefined,
      });
      setArticles(response.items);
      setTotalPages(response.total_pages);
      setTotal(response.total);
      setError(null);
    } catch (err) {
      setError('Failed to load articles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedCategory, selectedSource, processedOnly]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedSource('');
    setProcessedOnly(false);
    setCurrentPage(1);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchArticles}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Filters
        categories={categories}
        sources={sources}
        selectedCategory={selectedCategory}
        selectedSource={selectedSource}
        processedOnly={processedOnly}
        onCategoryChange={(cat) => {
          setSelectedCategory(cat);
          setCurrentPage(1);
        }}
        onSourceChange={(src) => {
          setSelectedSource(src);
          setCurrentPage(1);
        }}
        onProcessedOnlyChange={(val) => {
          setProcessedOnly(val);
          setCurrentPage(1);
        }}
        onReset={handleResetFilters}
      />

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {loading ? 'Loading...' : `${total} articles found`}
        </p>
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse"
            >
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <svg
            className="w-12 h-12 mx-auto text-slate-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
          <p className="text-slate-500">No articles found</p>
          <p className="text-sm text-slate-400 mt-1">
            Try adjusting your filters or fetch new articles
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
