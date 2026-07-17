import React from 'react';

export const ProductSkeleton: React.FC = () => (
  <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
    <div className="aspect-square animate-pulse bg-stone-100" />
    <div className="flex flex-1 flex-col gap-3 p-3">
      <div className="h-3 w-3/4 animate-pulse rounded bg-stone-100" />
      <div className="h-2.5 w-1/2 animate-pulse rounded bg-stone-100" />
      <div className="mt-auto h-10 w-full animate-pulse rounded-xl bg-stone-100" />
    </div>
  </div>
);

export const ProductSkeletonGrid: React.FC<{ count?: number; className?: string }> = ({
  count = 4,
  className = 'grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6',
}) => (
  <div className={className}>
    {Array.from({ length: count }, (_, i) => (
      <ProductSkeleton key={i} />
    ))}
  </div>
);
