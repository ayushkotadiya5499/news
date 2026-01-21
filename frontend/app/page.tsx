'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  StatCard,
  ArticlesChart,
  CategoriesChart,
  TopTagsList,
  TopSourcesList,
} from '@/components/dashboard';
import { AnalyticsResponse } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { isAdmin, user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Redirect non-admin users to articles
  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/articles');
    }
  }, [user, isAdmin, router]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAnalytics();
      setAnalytics(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <svg
            className="w-8 h-8 animate-spin text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-lg text-slate-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const { dashboard, top_tags, categories, articles_per_day, top_sources } =
    analytics;

  return (
    <div className="space-y-6">
      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-sm text-slate-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
          <button
            onClick={fetchAnalytics}
            className="ml-2 text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Articles"
          value={dashboard.total_articles}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="Processed"
          value={dashboard.processed_articles}
          subtitle={`${dashboard.unprocessed_articles} pending`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Today's Articles"
          value={dashboard.articles_today}
          subtitle={`${dashboard.articles_this_week} this week`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          color="yellow"
        />
        <StatCard
          title="Total Tags"
          value={dashboard.total_tags}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArticlesChart data={articles_per_day} />
        <CategoriesChart data={categories} />
      </div>

      {/* Tags and Sources Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopTagsList data={top_tags} />
        <TopSourcesList data={top_sources} />
      </div>
    </div>
  );
}
