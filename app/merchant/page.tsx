import { pool } from '@/lib/db';
import { MetricsClient, MerchantMetrics } from './metrics-client';

async function getInitialMetrics(merchantId: string): Promise<MerchantMetrics> {
  const result = await pool.query(
    `SELECT 
       COALESCE(SUM(amount_cents), 0) AS gross_cents,
       COALESCE(SUM(fee_cents), 0) AS total_fees,
       COALESCE(SUM(net_cents), 0) AS net_cents,
       COUNT(id) AS total_orders
     FROM settlement_transactions
     WHERE merchant_id = $1`,
    [merchantId]
  );

  const balanceRes = await pool.query(
    `SELECT balance_cents FROM merchants WHERE id = $1`,
    [merchantId]
  );

  return {
    grossCents: Number(result.rows[0].gross_cents),
    feeCents: Number(result.rows[0].total_fees),
    netCents: Number(result.rows[0].net_cents),
    orderCount: Number(result.rows[0].total_orders),
    settledBalanceCents: Number(balanceRes.rows[0]?.balance_cents || 0),
  };
}

export default async function MerchantPage() {
  const merchantId = '00000000-0000-0000-0000-000000000001';
  const initialData = await getInitialMetrics(merchantId);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-slate-200 pb-5 flex justify-between items-end">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-600">
              Acme Store Portal
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Merchant Analytics & Settlements
            </h1>
          </div>
          <div className="text-xs font-mono bg-slate-200 text-slate-700 px-2 py-1 rounded">
            ID: {merchantId.slice(0, 8)}...
          </div>
        </header>

        <MetricsClient merchantId={merchantId} initialData={initialData} />
      </div>
    </main>
  );
}