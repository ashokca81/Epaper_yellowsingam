'use client';

import { useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const DOTS = 'ellipsis';

type PageItem = number | typeof DOTS;

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

const buildPageItems = (current: number, total: number): PageItem[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: PageItem[] = [];
  const showLeftDots = current > 4;
  const showRightDots = current < total - 3;

  items.push(1);

  if (!showLeftDots) {
    items.push(2, 3, 4);
  } else {
    items.push(DOTS);
    items.push(current - 1, current, current + 1);
  }

  if (!showRightDots) {
    items.push(total - 3, total - 2, total - 1);
  } else {
    items.push(DOTS);
  }

  items.push(total);

  const deduped: PageItem[] = [];
  let lastItem: PageItem | null = null;
  for (const item of items) {
    if (item === DOTS && lastItem === DOTS) {
      continue;
    }
    if (typeof item === 'number' && typeof lastItem === 'number' && item === lastItem) {
      continue;
    }
    if (typeof item === 'number' && typeof lastItem === 'number' && item === lastItem + 1) {
      deduped.push(item);
      lastItem = item;
      continue;
    }
    deduped.push(item);
    lastItem = item;
  }

  return deduped.filter((item, index, arr) => {
    if (item !== DOTS) return true;
    return arr[index - 1] !== DOTS && arr[index + 1] !== DOTS;
  });
};

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pageItems = useMemo(
    () => buildPageItems(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    startTransition(() => {
      router.push(`/?page=${page}`);
    });
  };

  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center items-center gap-2">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1 || isPending}
          className={`h-10 w-10 rounded-lg border text-lg font-semibold transition-colors ${
            currentPage === 1 || isPending
              ? 'bg-gray-200 text-gray-400'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          aria-label="Previous page"
        >
          ‹
        </button>

        {pageItems.map((item, index) =>
          item === DOTS ? (
            <span
              key={`dots-${index}`}
              className="h-10 min-w-[40px] flex items-center justify-center rounded-lg border border-gray-200 text-lg text-gray-400"
            >
              …
            </span>
          ) : (
            <button
              key={`page-${item}`}
              type="button"
              onClick={() => goToPage(item)}
              disabled={isPending}
              className={`h-10 min-w-[40px] rounded-lg border text-lg font-semibold transition-colors ${
                item === currentPage
                  ? 'border-[#D4A800] text-white bg-[#D4A800] shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } ${isPending ? 'opacity-70 cursor-wait' : ''}`}
              aria-current={item === currentPage ? 'page' : undefined}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages || isPending}
          className={`h-10 w-10 rounded-lg border text-lg font-semibold transition-colors ${
            currentPage === totalPages || isPending
              ? 'bg-gray-200 text-gray-400'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          aria-label="Next page"
        >
          ›
        </button>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="inline-flex h-4 w-4 rounded-full border-2 border-gray-300 border-t-violet-600 animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}
