'use client';

import { Tag } from '@/types';
import Link from 'next/link';

interface TagChipProps {
  tag: Tag | string;
  clickable?: boolean;
}

export default function TagChip({ tag, clickable = true }: TagChipProps) {
  const tagName = typeof tag === 'string' ? tag : tag.name;

  const chip = (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 ${
        clickable ? 'hover:bg-blue-200 cursor-pointer' : ''
      }`}
    >
      {tagName}
    </span>
  );

  if (clickable) {
    return <Link href={`/search?tag=${encodeURIComponent(tagName)}`}>{chip}</Link>;
  }

  return chip;
}
