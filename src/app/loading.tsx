export default function Loading() {
  return (
    <div className="w-full max-w-md mx-auto px-4 pt-3 pb-24 flex flex-col gap-4 antialiased">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-surface-container-high shimmer-solid" />
          <div className="flex flex-col gap-1.5">
            <div className="w-20 h-4 rounded-md bg-surface-container-high shimmer-solid" />
            <div className="w-12 h-3 rounded-md bg-surface-container shimmer-solid" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-surface-container shimmer-solid" />
          <div className="w-8 h-8 rounded-full bg-surface-container shimmer-solid" />
        </div>
      </div>

      {/* Subheader Title Skeleton */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="w-44 h-6 rounded-lg bg-surface-container-high shimmer-solid" />
        <div className="w-64 h-3.5 rounded-md bg-surface-container shimmer-solid" />
      </div>

      {/* Hero Banner / Card Skeleton */}
      <div className="w-full h-48 rounded-2xl bg-surface-container border border-border-hairline shimmer-solid" />

      {/* Metrics or Sub-Cards Skeleton */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface-container-low border border-border-hairline/50">
        <div className="h-10 rounded-lg bg-surface-container shimmer-solid" />
        <div className="h-10 rounded-lg bg-surface-container shimmer-solid" />
        <div className="h-10 rounded-lg bg-surface-container shimmer-solid" />
      </div>

      {/* Section List Items Skeleton */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="w-32 h-4 rounded bg-surface-container-high shimmer-solid" />
        <div className="w-full h-24 rounded-2xl bg-card-surface border border-border-hairline p-4 flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-surface-container shimmer-solid shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="w-3/4 h-4 rounded bg-surface-container-high shimmer-solid" />
            <div className="w-1/2 h-3 rounded bg-surface-container shimmer-solid" />
          </div>
        </div>
        <div className="w-full h-24 rounded-2xl bg-card-surface border border-border-hairline p-4 flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-surface-container shimmer-solid shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="w-3/4 h-4 rounded bg-surface-container-high shimmer-solid" />
            <div className="w-1/2 h-3 rounded bg-surface-container shimmer-solid" />
          </div>
        </div>
      </div>
    </div>
  );
}
