'use client';

import { SourceStats } from '@/types';

interface TopSourcesListProps {
  data: SourceStats[];
}

export default function TopSourcesList({ data }: TopSourcesListProps) {
  const maxCount = Math.max(...data.map((s) => s.article_count), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Sources</h3>
      <div className="space-y-3">
        {data.slice(0, 10).map((source, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700 truncate">
                  {source.source}
                </span>
                <span className="text-sm text-slate-500 ml-2">
                  {source.article_count}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{
                    width: `${(source.article_count / maxCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            No sources found
          </p>
        )}
      </div>
    </div>
  );
}
