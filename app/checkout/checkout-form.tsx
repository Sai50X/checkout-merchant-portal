'use client';

import React, { useState, useOptimistic, useTransition } from 'react';

interface CheckoutState {
  status: 'idle' | 'authorizing' | 'confirmed' | 'failed';
  totalCents: number;
}

export function CheckoutForm({
  subtotalCents,
  merchantId,
}: {
  subtotalCents: number;
  merchantId: string;
}) {
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [, startTransition] = useTransition();

  // Dynamic fee calculation
  const shippingCost = shippingMethod === 'express' ? 1500 : 500;
  const taxCents = Math.round((subtotalCents + shippingCost) * 0.08);
  const totalCents = subtotalCents + shippingCost + taxCents;

  const [state, setFinalState] = useState<CheckoutState>({
    status: 'idle',
    totalCents,
  });

  // Optimistic UI updates
  const [optimisticState, setOptimisticState] = useOptimistic(
    state,
    (current, update: Partial<CheckoutState>) => ({ ...current, ...update })
  );

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      // 1. Immediately reflect optimistic 'authorizing' state
      setOptimisticState({ status: 'authorizing' });

      try {
        const idempotencyKey = crypto.randomUUID();
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId,
            amountCents: totalCents,
            idempotencyKey,
          }),
        });

        if (!res.ok) throw new Error('Authorization failed');

        setFinalState({ status: 'confirmed', totalCents });
      } catch {
        setFinalState({ status: 'failed', totalCents });
      }
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-md w-full">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
        <span className="text-xs bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full">
          Instant Checkout
        </span>
      </div>

      <div className="py-4 space-y-3 text-sm text-slate-600">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-medium text-slate-800">${(subtotalCents / 100).toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span>Fulfillment</span>
          <select
            value={shippingMethod}
            onChange={(e) => setShippingMethod(e.target.value as 'standard' | 'express')}
            className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="standard">Standard (+$5.00)</option>
            <option value="express">Express 2-Day (+$15.00)</option>
          </select>
        </div>

        <div className="flex justify-between">
          <span>Tax (8%)</span>
          <span className="font-medium text-slate-800">${(taxCents / 100).toFixed(2)}</span>
        </div>

        <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-semibold text-slate-900">
          <span>Total</span>
          <span>${(totalCents / 100).toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleCheckout} className="mt-4 space-y-3">
        <button
          type="submit"
          disabled={optimisticState.status === 'authorizing'}
          className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {optimisticState.status === 'authorizing'
            ? 'Authorizing Payment...'
            : optimisticState.status === 'confirmed'
            ? '✓ Payment Complete'
            : `Pay $${(totalCents / 100).toFixed(2)}`}
        </button>

        {optimisticState.status === 'failed' && (
          <p className="text-xs text-red-600 text-center">
            Payment authorization failed. Please try again.
          </p>
        )}
      </form>
    </div>
  );
}