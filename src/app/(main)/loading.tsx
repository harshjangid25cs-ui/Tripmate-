export default function MainLoading() {
  return (
    <div className="w-full max-w-md mx-auto px-4 pt-3 pb-24 flex flex-col gap-4 antialiased">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-container/20 animate-pulse" />
          <div className="flex flex-col gap-1.5">
            <div className="w-20 h-4 rounded-md bg-surface-container-high animate-pulse" />
            <div className="w-12 h-3 rounded-md bg-surface-container animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-surface-container animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-surface-container animate-pulse" />
        </div>
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex items-center gap-2 overflow-x-hidden py-1">
        <div className="w-24 h-8 rounded-full bg-surface-container-high animate-pulse shrink-0" />
        <div className="w-24 h-8 rounded-full bg-surface-container animate-pulse shrink-0" />
        <div className="w-24 h-8 rounded-full bg-surface-container animate-pulse shrink-0" />
        <div className="w-24 h-8 rounded-full bg-surface-container animate-pulse shrink-0" />
      </div>

      {/* Big Card Skeleton */}
      <div className="w-full h-56 rounded-2xl bg-card-surface border border-border-hairline p-4 flex flex-col gap-3 animate-pulse">
        <div className="w-full h-36 rounded-xl bg-surface-container" />
        <div className="flex items-center justify-between">
          <div className="w-1/2 h-4 rounded bg-surface-container-high" />
          <div className="w-16 h-4 rounded bg-surface-container" />
        </div>
      </div>

      {/* Two Secondary Cards */}
      <div className="flex flex-col gap-3">
        <div className="w-full h-24 rounded-2xl bg-card-surface border border-border-hairline p-4 flex items-center gap-3 animate-pulse">
          <div className="w-16 h-16 rounded-xl bg-surface-container shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="w-2/3 h-4 rounded bg-surface-container-high" />
            <div className="w-1/3 h-3 rounded bg-surface-container" />
          </div>
        </div>

        <div className="w-full h-24 rounded-2xl bg-card-surface border border-border-hairline p-4 flex items-center gap-3 animate-pulse">
          <div className="w-16 h-16 rounded-xl bg-surface-container shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="w-2/3 h-4 rounded bg-surface-container-high" />
            <div className="w-1/3 h-3 rounded bg-surface-container" />
          </div>
        </div>
      </div>
    </div>
  );
}
