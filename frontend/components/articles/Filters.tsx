'use client';

interface FiltersProps {
  categories: string[];
  sources: string[];
  selectedCategory: string;
  selectedSource: string;
  processedOnly: boolean;
  onCategoryChange: (category: string) => void;
  onSourceChange: (source: string) => void;
  onProcessedOnlyChange: (value: boolean) => void;
  onReset: () => void;
}

export default function Filters({
  categories,
  sources,
  selectedCategory,
  selectedSource,
  processedOnly,
  onCategoryChange,
  onSourceChange,
  onProcessedOnlyChange,
  onReset,
}: FiltersProps) {
  const hasFilters = selectedCategory || selectedSource || processedOnly;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat || 'Uncategorized'}
              </option>
            ))}
          </select>
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Source:</label>
          <select
            value={selectedSource}
            onChange={(e) => onSourceChange(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        {/* Processed Only Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={processedOnly}
            onChange={(e) => onProcessedOnlyChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-600">Processed only</span>
        </label>

        {/* Reset Button */}
        {hasFilters && (
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}
