'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { adminApi, newsApi } from '@/lib/api';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/articles': 'Articles',
  '/search': 'Search',
};

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'business', label: 'Business' },
  { value: 'technology', label: 'Technology' },
  { value: 'science', label: 'Science' },
  { value: 'health', label: 'Health' },
  { value: 'sports', label: 'Sports' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'general', label: 'General' },
];

export default function Header() {
  const pathname = usePathname();
  const [isFetching, setIsFetching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFetchModal, setShowFetchModal] = useState(false);
  const [fetchCategory, setFetchCategory] = useState('');
  const [fetchQuery, setFetchQuery] = useState('');

  const getTitle = () => {
    if (pathname.startsWith('/articles/')) return 'Article Details';
    return pageTitles[pathname] || 'AI News Intelligence';
  };

  const handleFetchNews = async () => {
    setIsFetching(true);
    try {
      const result = await newsApi.fetchNews({
        category: fetchCategory || undefined,
        query: fetchQuery || undefined,
      });
      toast.success(`Fetched ${result.articles_added} new articles!`);
      setShowFetchModal(false);
      setFetchCategory('');
      setFetchQuery('');
    } catch (error) {
      toast.error('Failed to fetch news');
      console.error(error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleProcessArticles = async () => {
    setIsProcessing(true);
    try {
      await adminApi.triggerProcessing();
      toast.success('Article processing triggered!');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to trigger processing';
      if (errorMessage.includes('Redis') || errorMessage.includes('Celery')) {
        toast.error('Redis is not running. Please start Redis server first.', { duration: 5000 });
      } else {
        toast.error(errorMessage);
      }
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">{getTitle()}</h2>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFetchModal(true)}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isFetching ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            Fetch News
          </button>
          
          <button
            onClick={handleProcessArticles}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
            Process Articles
          </button>
        </div>
      </header>

      {/* Fetch News Modal */}
      {showFetchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800">Fetch News</h3>
              <button
                onClick={() => setShowFetchModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Query
                </label>
                <input
                  type="text"
                  value={fetchQuery}
                  onChange={(e) => setFetchQuery(e.target.value)}
                  placeholder="e.g., artificial intelligence, climate change..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Leave empty to fetch top headlines
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category
                </label>
                <select
                  value={fetchCategory}
                  onChange={(e) => setFetchCategory(e.target.value)}
                  disabled={!!fetchQuery}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {fetchQuery && (
                  <p className="mt-1 text-xs text-amber-600">
                    Category is ignored when using search query
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> If you provide a search query, it will search all news. 
                  If no query is provided, it will fetch top headlines for the selected category.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowFetchModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFetchNews}
                  disabled={isFetching}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isFetching ? 'Fetching...' : 'Fetch News'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
