export default function FlowLoading() {
  return (
    <div className="w-full max-w-md mx-auto px-4 pt-3 pb-24 flex flex-col gap-4 antialiased">
      {/* Top Header with Back Arrow and Step indicator */}
      <div className="flex items-center justify-between py-1">
        <div className="w-9 h-9 rounded-full bg-surface-container animate-pulse" />
        <div className="w-24 h-4 rounded-md bg-surface-container-high animate-pulse" />
        <div className="w-9 h-9 rounded-full bg-surface-container animate-pulse" />
      </div>

      {/* Progress Bars Strip */}
      <div className="w-full grid grid-cols-4 gap-1.5 py-1">
        <div className="h-1.5 rounded-full bg-primary-container animate-pulse" />
        <div className="h-1.5 rounded-full bg-surface-container animate-pulse" />
        <div className="h-1.5 rounded-full bg-surface-container animate-pulse" />
        <div className="h-1.5 rounded-full bg-surface-container animate-pulse" />
      </div>

      {/* Step Title & Subtitle */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="w-48 h-6 rounded-lg bg-surface-container-high animate-pulse" />
        <div className="w-64 h-3.5 rounded-md bg-surface-container animate-pulse" />
      </div>

      {/* Main Selection Area Skeleton */}
      <div className="w-full h-64 rounded-2xl bg-card-surface border border-border-hairline p-4 flex flex-col gap-3 animate-pulse">
        <div className="w-full h-36 rounded-xl bg-surface-container" />
        <div className="w-3/4 h-5 rounded bg-surface-container-high" />
        <div className="w-1/2 h-4 rounded bg-surface-container" />
      </div>

      {/* Secondary Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-28 rounded-2xl bg-card-surface border border-border-hairline p-3 animate-pulse flex flex-col justify-between">
          <div className="w-12 h-3 rounded bg-surface-container" />
          <div className="w-20 h-4 rounded bg-surface-container-high" />
        </div>
        <div className="h-28 rounded-2xl bg-card-surface border border-border-hairline p-3 animate-pulse flex flex-col justify-between">
          <div className="w-12 h-3 rounded bg-surface-container" />
          <div className="w-20 h-4 rounded bg-surface-container-high" />
        </div>
      </div>

      {/* Sticky Bottom Bar Placeholder */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface/90 border-t border-border-hairline backdrop-blur-md flex justify-center z-40">
        <div className="w-full max-w-md flex items-center justify-between">
          <div className="w-24 h-6 rounded bg-surface-container-high animate-pulse" />
          <div className="w-32 h-11 rounded-xl bg-surface-container animate-pulse" />
        </div>
      </div>
    </div>
  );
}
