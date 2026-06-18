import React from 'react';

function Skeleton({ className }) {
  return (
    <div
      className={`bg-dark-800 animate-pulse rounded-xl ${className || ''}`}
      style={{ animationDelay: `${Math.random() * 0.5}s` }}
    />
  );
}

export function PostCardSkeleton() {
  return (
    <div className="bg-dark-900 border border-dark-700/50 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="w-full aspect-square" />
      <div className="p-4 space-y-2">
        <div className="flex gap-3">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="w-6 h-6 rounded" />
        </div>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-6">
        <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReelsSkeleton() {
  return (
    <div className="h-screen bg-dark-900 flex items-center justify-center">
      <div className="w-full max-w-[450px] h-full relative">
        <Skeleton className="w-full h-full rounded-none md:rounded-[2.5rem]" />
        <div className="absolute right-4 bottom-32 space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-8 h-8 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ExploreSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1 p-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}

export default Skeleton;
