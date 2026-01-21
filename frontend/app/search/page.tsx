'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { searchApi, newsApi } from '@/lib/api';
import { ArticleSearchResult, SearchResultsResponse } from '@/types';
import { TagChip, Pagination } from '@/components/articles';
import { formatDate, truncateText } from '@/lib/utils';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [results, setResults] = useState<ArticleSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [source, setSource] = useState(searchParams.get('source') || '');
  const [tag, setTag] = useState(searchParams.get('tag') || '');
  const [fromDate, setFromDate] = useState(searchParams.get('from_date') || '');
  const [toDate, setToDate] = useState(searchParams.get('to_date') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Filter options
  const [categories, setCategories] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<Array<{ id: number; name: string; article_count: number }>>([]);

  // Suggestions
  const [suggestions, setSuggestions] = useState<{ tags: string[]; titles: string[] }>({ tags: [], titles: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);

  const PAGE_SIZE = 10;

  // Load filter options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [cats, srcs, tags] = await Promise.all([
          newsApi.getCategories(),
          newsApi.getSources(),
          searchApi.getPopularTags(20),
        ]);
        setCategories(cats);
        setSources(srcs);
        setPopularTags(tags);
      } catch (err) {
        console.error('Failed to fetch filter options', err);
      }
    };
    fetchOptions();
  }, []);

  // Search
  const performSearch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await searchApi.search({
        q: query || undefined,
        category: category || undefined,
        source: source || undefined,
        tag: tag || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setResults(response.items);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  }, [query, category, source, tag, fromDate, toDate, page]);

  // Perform search when filters change
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (source) params.set('source', source);
    if (tag) params.set('tag', tag);
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    if (page > 1) params.set('page', page.toString());

    const url = params.toString() ? `?${params.toString()}` : '/search';
    router.replace(url, { scroll: false });
  }, [query, category, source, tag, fromDate, toDate, page, router]);

  // Fetch suggestions
  const fetchSuggestions = async (q: string) => {
    if (q.length < 2) {
      setSuggestions({ tags: [], titles: [] });
      return;
    }
    try {
      const data = await searchApi.getSuggestions(q, 5);
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to fetch suggestions', err);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
    fetchSuggestions(value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    setPage(1);
  };

  const handleTagClick = (tagName: string) => {
    setTag(tagName);
    setPage(1);
  };

  const handleReset = () => {
    setQuery('');
    setCategory('');
    setSource('');
    setTag('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="relative">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search articles by title, content, or tags..."
                className="w-full px-4 py-3 pl-12 text-lg border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>

              {/* Suggestions Dropdown */}
              {showSuggestions && (suggestions.tags.length > 0 || suggestions.titles.length > 0) && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg">
                  {suggestions.tags.length > 0 && (
                    <div className="p-2 border-b border-slate-100">
                      <p className="text-xs font-medium text-slate-500 px-2 mb-1">Tags</p>
                      {suggestions.tags.map((t) => (
                        <button
                          key={t}
                          onClick={() => handleTagClick(t)}
                          className="block w-full text-left px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 rounded"
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}
                  {suggestions.titles.length > 0 && (
                    <div className="p-2">
                      <p className="text-xs font-medium text-slate-500 px-2 mb-1">Articles</p>
                      {suggestions.titles.map((title, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(title)}
                          className="block w-full text-left px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 rounded truncate"
                        >
                          {title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={performSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat || 'Uncategorized'}
              </option>
            ))}
          </select>

          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
          >
            <option value="">All Sources</option>
            {sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          {(query || category || source || tag || fromDate || toDate) && (
            <button
              onClick={handleReset}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Reset all
            </button>
          )}
        </div>

        {/* Active tag filter */}
        {tag && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-slate-600">Filtering by tag:</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              #{tag}
              <button
                onClick={() => setTag('')}
                className="ml-1 hover:text-blue-900"
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Popular Tags */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Popular Tags</h3>
        <div className="flex flex-wrap gap-2">
          {popularTags.slice(0, 15).map((t) => (
            <button
              key={t.id}
              onClick={() => handleTagClick(t.name)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                tag === t.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.name}
              <span className="ml-1 text-xs opacity-70">({t.article_count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div>
        <p className="text-sm text-slate-600 mb-4">
          {loading ? 'Searching...' : `${total} results found`}
        </p>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse"
              >
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-slate-500">No results found</p>
            <p className="text-sm text-slate-400 mt-1">
              Try different keywords or filters
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <Link href={`/articles/${article.id}`}>
                  <h3 className="text-lg font-semibold text-slate-800 hover:text-blue-600">
                    {article.title}
                  </h3>
                </Link>

                <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                  <span className="font-medium">{article.source}</span>
                  {article.category && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{article.category}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{formatDate(article.published_at)}</span>
                </div>

                {article.summary && (
                  <p className="mt-2 text-sm text-slate-600">
                    {truncateText(article.summary, 200)}
                  </p>
                )}

                {article.tags && article.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {article.tags.slice(0, 5).map((t) => (
                      <TagChip key={t.id} tag={t} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
