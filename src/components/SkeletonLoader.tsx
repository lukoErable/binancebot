'use client';

/**
 * Skeleton Loader Components
 * Provides loading states for various UI elements
 */

export function PriceSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-32 bg-gray-700 rounded"></div>
    </div>
  );
}

export function OHLCSkeleton() {
  return (
    <div className="flex items-center gap-6 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="h-4 w-3 bg-gray-700 rounded"></div>
          <div className="h-4 w-20 bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  );
}

export function IndicatorSkeleton() {
  return (
    <div className="flex items-center gap-4 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="h-4 w-16 bg-gray-700 rounded"></div>
          <div className="h-4 w-20 bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  );
}

export function TradingInfoSkeleton() {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col animate-pulse">
            <div className="h-3 w-24 bg-gray-700 rounded mb-2"></div>
            <div className="h-6 w-32 bg-gray-700 rounded mb-1"></div>
            <div className="h-3 w-20 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CriteriaSkeleton() {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 bg-gray-700 rounded"></div>
          <div className="h-4 w-32 bg-gray-700 rounded"></div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-gray-700"></div>
            ))}
          </div>
          <div className="h-4 w-1 bg-gray-700"></div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-gray-700"></div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-20 bg-gray-700 rounded"></div>
            <div className="h-4 w-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-gray-900 h-[28rem] animate-pulse">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-5 w-24 bg-gray-700 rounded"></div>
          <div className="flex items-center gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-6 w-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-4 w-32 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
      <div className="h-96 flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <div className="h-8 w-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
          <div className="h-4 w-32 bg-gray-700 rounded mx-auto"></div>
        </div>
      </div>
    </div>
  );
}

export function StrategyCardSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border-2 border-gray-700 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-32 bg-gray-700 rounded"></div>
        <div className="h-6 w-12 bg-gray-700 rounded"></div>
      </div>
      <div className="mb-3">
        <div className="h-5 w-24 bg-gray-700 rounded"></div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3 w-20 bg-gray-700 rounded"></div>
            <div className="h-4 w-24 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StrategyPanelSkeleton() {
  return (
    <div className="bg-gray-800 border-b border-gray-700">
      <div className="px-4 py-3 flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 bg-gray-700 rounded"></div>
          <div className="h-5 w-48 bg-gray-700 rounded"></div>
          <div className="h-4 w-16 bg-gray-700 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 bg-gray-700 rounded"></div>
          <div className="h-4 w-32 bg-gray-700 rounded"></div>
          <div className="h-4 w-24 bg-gray-700 rounded"></div>
        </div>
      </div>
      <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <StrategyCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function SignalSkeleton() {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-6 w-16 bg-gray-700 rounded"></div>
          <div className="h-5 w-24 bg-gray-700 rounded"></div>
          <div className="h-4 w-32 bg-gray-700 rounded"></div>
        </div>
        <div className="h-4 w-48 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

export function SignalHistorySkeleton() {
  return (
    <div className="bg-gray-800 px-4 py-4">
      <div className="h-5 w-32 bg-gray-700 rounded mb-4 animate-pulse"></div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between bg-gray-900 p-3 rounded animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-5 w-16 bg-gray-700 rounded"></div>
              <div className="h-4 w-24 bg-gray-700 rounded"></div>
            </div>
            <div className="h-4 w-48 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FullPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Skeleton */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-6 w-32 bg-gray-700 rounded"></div>
            <div className="h-5 w-24 bg-gray-700 rounded"></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-24 bg-gray-700 rounded"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-700"></div>
              <div className="h-4 w-24 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeframe Buttons Skeleton */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-center gap-2 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 w-12 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>

      {/* OHLC Skeleton */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center gap-8 animate-pulse">
          <div className="h-8 w-32 bg-gray-700 rounded"></div>
          <OHLCSkeleton />
          <IndicatorSkeleton />
        </div>
      </div>

      {/* Trading Info Skeleton */}
      <TradingInfoSkeleton />

      {/* Criteria Skeleton */}
      <CriteriaSkeleton />

      {/* Strategy Panel Skeleton */}
      <StrategyPanelSkeleton />

      {/* Chart Skeleton */}
      <ChartSkeleton />

      {/* Signal Skeleton */}
      <SignalSkeleton />

      {/* Signal History Skeleton */}
      <SignalHistorySkeleton />
    </div>
  );
}

