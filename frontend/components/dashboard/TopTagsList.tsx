'use client';

import { TagStats } from '@/types';

interface TopTagsListProps {
  data: TagStats[];
}

export default function TopTagsList({ data }: TopTagsListProps) {
  const maxCount = Math.max(...data.map((t) => t.article_count), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Tags</h3>
      <div className="space-y-3">
        {data.slice(0, 10).map((tag) => (
          <div key={tag.id} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">
                  {tag.name}
                </span>
                <span className="text-sm text-slate-500">
                  {tag.article_count}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{
                    width: `${(tag.article_count / maxCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            No tags found
          </p>
        )}
      </div>
    </div>
  );
}
