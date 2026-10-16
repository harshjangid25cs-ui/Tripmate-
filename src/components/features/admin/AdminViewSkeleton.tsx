"use client";

import React from "react";

export function AdminViewSkeleton() {
  return (
    <div className="w-full flex flex-col gap-6 animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-hairline">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 bg-surface-container-high rounded-lg" />
          <div className="h-4 w-72 bg-surface-container rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 bg-surface-container-high rounded-xl" />
          <div className="h-10 w-36 bg-surface-container-high rounded-xl" />
        </div>
      </div>

      {/* Stats / Controls Bar Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-card-surface border border-border-hairline flex flex-col gap-2"
          >
            <div className="h-3.5 w-24 bg-surface-container rounded" />
            <div className="h-6 w-16 bg-surface-container-high rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Content / Table / Cards Skeleton */}
      <div className="rounded-2xl bg-card-surface border border-border-hairline p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
          <div className="h-5 w-32 bg-surface-container rounded" />
          <div className="h-8 w-44 bg-surface-container rounded-lg" />
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="h-14 rounded-xl bg-surface-container-low border border-border-hairline/60 flex items-center justify-between px-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-3.5 w-36 bg-surface-container rounded" />
                  <div className="h-2.5 w-24 bg-surface-container rounded" />
                </div>
              </div>
              <div className="h-6 w-20 bg-surface-container rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminViewSkeleton;
