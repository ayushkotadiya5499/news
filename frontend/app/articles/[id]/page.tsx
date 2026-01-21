'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { newsApi } from '@/lib/api';
import { Article } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { TagChip } from '@/components/articles';

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const articleId = Number(params.id);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const data = await newsApi.getArticle(articleId);
        setArticle(data);
        setError(null);
      } catch (err) {
        setError('Failed to load article');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  const handleProcess = async () => {
    if (!article) return;

    setProcessing(true);
    try {
      const processed = await newsApi.processArticle(article.id);
      setArticle(processed);
      toast.success('Article processed successfully!');
    } catch (err) {
      toast.error('Failed to process article');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-3/4 mb-4" />
          <div className="h-4 bg-slate-200 rounded w-1/2 mb-8" />
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded" />
            <div className="h-4 bg-slate-200 rounded" />
            <div className="h-4 bg-slate-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error || 'Article not found'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Articles
      </button>

      <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Hero Image */}
        {article.image_url && (
          <div className="w-full h-64 md:h-80">
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                {article.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="font-medium text-slate-700">{article.source}</span>
                {article.author && (
                  <>
                    <span>•</span>
                    <span>By {article.author}</span>
                  </>
                )}
                {article.category && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded-full capitalize">
                      {article.category}
                    </span>
                  </>
                )}
                <span>•</span>
                <span>{formatDateTime(article.published_at)}</span>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex flex-col items-end gap-2">
              <div
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  article.is_processed
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {article.is_processed ? 'Processed' : 'Not Processed'}
              </div>

              {!article.is_processed && (
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Process Article
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Summary */}
          {article.summary && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h2 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Summary
              </h2>
              <p className="text-sm text-blue-900">{article.summary}</p>
            </div>
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <TagChip key={tag.id} tag={tag} />
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          {article.content && (
            <div className="prose prose-slate max-w-none">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Content</h2>
              <div className="text-slate-600 whitespace-pre-wrap">{article.content}</div>
            </div>
          )}

          {/* Original Link */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Read original article
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </article>
    </div>
  );
}
