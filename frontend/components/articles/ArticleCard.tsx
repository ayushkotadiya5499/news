'use client';

import Link from 'next/link';
import { Article, Tag } from '@/types';
import { formatDate, truncateText } from '@/lib/utils';
import TagChip from './TagChip';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        {/* Image */}
        {article.image_url && (
          <div className="w-48 h-40 flex-shrink-0">
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

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Link href={`/articles/${article.id}`}>
                <h3 className="text-lg font-semibold text-slate-800 hover:text-blue-600 line-clamp-2">
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
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                  {truncateText(article.summary, 150)}
                </p>
              )}
            </div>

            {/* Status Badge */}
            <div
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                article.is_processed
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {article.is_processed ? 'Processed' : 'Pending'}
            </div>
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {article.tags.slice(0, 5).map((tag: Tag) => (
                <TagChip key={tag.id} tag={tag} />
              ))}
              {article.tags.length > 5 && (
                <span className="text-xs text-slate-500 self-center">
                  +{article.tags.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
