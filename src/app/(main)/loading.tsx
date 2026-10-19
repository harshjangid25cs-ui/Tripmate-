export default function MainLoading() {
  return (
    <div className="w-full max-w-md mx-auto px-4 pt-3 pb-24 flex flex-col gap-4 antialiased">
      {/* Top Header Skeleton */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-container/20 shimmer-solid" />
          <div className="flex flex-col gap-1.5">
            <div className="w-20 h-4 rounded-md bg-surface-container-high shimmer-solid" />
            <div className="w-12 h-3 rounded-md bg-surface-container shimmer-solid" />
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-surface-container shimmer-solid" />
      </div>

      {/* Search Bar Skeleton */}
      <div className="w-full h-12 rounded-2xl bg-card-surface border border-border-hairline shadow-sm px-3.5 flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-surface-container shimmer-solid shrink-0" />
        <div className="w-48 h-4 rounded-md bg-surface-container-low shimmer-solid" />
      </div>

      {/* Category Filter Chips Row Skeleton */}
      <div className="flex items-center gap-2 overflow-x-hidden py-1 -mx-4 px-4">
        <div className="w-24 h-8 rounded-full bg-surface-container-high shimmer-solid shrink-0" />
        <div className="w-28 h-8 rounded-full bg-card-surface border border-border-hairline shimmer-solid shrink-0" />
        <div className="w-24 h-8 rounded-full bg-card-surface border border-border-hairline shimmer-solid shrink-0" />
        <div className="w-32 h-8 rounded-full bg-card-surface border border-border-hairline shimmer-solid shrink-0" />
      </div>

      {/* Section Header Skeleton */}
      <div className="flex flex-col gap-1 pt-1">
        <div className="w-52 h-5 rounded-md bg-surface-container-high shimmer-solid" />
        <div className="w-64 h-3.5 rounded-md bg-surface-container shimmer-solid" />
      </div>

      {/* Primary 4:3 Aspect-Ratio Cards Skeleton */}
      <div className="flex flex-col gap-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="w-full bg-card-surface border border-border-hairline rounded-2xl overflow-hidden shadow-sm flex flex-col"
          >
            {/* 4:3 Image Container */}
            <div className="w-full aspect-[4/3] bg-surface-container shimmer-solid relative">
              <div className="absolute bottom-3 left-3 right-3 h-12 rounded-xl bg-surface-dark/40" />
            </div>

            {/* Card Footer Shelf */}
            <div className="p-4 flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1.5">
                <div className="w-20 h-3 rounded bg-surface-container shimmer-solid" />
                <div className="w-28 h-5 rounded bg-surface-container-high shimmer-solid" />
              </div>
              <div className="w-28 h-10 rounded-xl bg-surface-container shimmer-solid shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
