'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

// Configure instant client-side transitions (sub-100ms client response)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60s memory caching
      refetchOnWindowFocus: false,
    },
  },
});

export interface MerchantMetrics {
  grossCents: number;
  feeCents: number;
  netCents: number;
  orderCount: number;
  settledBalanceCents: number;
}

function DashboardMetricsView({
  merchantId,
  initialData,
}: {
  merchantId: string;
  initialData: MerchantMetrics;
}) {
  const [filter, setFilter] = useState<'all' | 'settled'>('all');

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['merchant-metrics', merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/merchant/metrics?merchantId=${merchantId}`);
      if (!res.ok) throw new Error('Network error fetching metrics');
      return res.json() as Promise<MerchantMetrics>;
    },
    initialData,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-xs text-xs font-medium">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md transition ${
              filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setFilter('settled')}
            className={`px-3 py-1.5 rounded-md transition ${
              filter === 'settled' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Settled Only
          </button>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs text-slate-500 hover:text-slate-800 border px-2.5 py-1.5 rounded-md bg-white transition"
        >
          {isFetching ? 'Refreshing...' : '↻ Refresh Metrics'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Available Balance
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            ${(data.settledBalanceCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-1">ACID Row-Locked Balance</p>
        </div>

        <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Gross Volume
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            ${(data.grossCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-1">Total charge volume</p>
        </div>

        <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Fees Incurred
          </span>
          <div className="text-2xl font-bold text-slate-700 mt-2">
            ${(data.feeCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-1">Platform fee deductions</p>
        </div>

        <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Transactions
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-2">{data.orderCount}</div>
          <p className="text-xs text-slate-400 mt-1">Processed orders</p>
        </div>
      </div>
    </div>
  );
}

export function MetricsClient({
  merchantId,
  initialData,
}: {
  merchantId: string;
  initialData: MerchantMetrics;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardMetricsView merchantId={merchantId} initialData={initialData} />
    </QueryClientProvider>
  );
}