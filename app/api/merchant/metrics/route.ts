import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantId = searchParams.get('merchantId') || '00000000-0000-0000-0000-000000000001';

  try {
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

    return NextResponse.json({
      grossCents: Number(result.rows[0].gross_cents),
      feeCents: Number(result.rows[0].total_fees),
      netCents: Number(result.rows[0].net_cents),
      orderCount: Number(result.rows[0].total_orders),
      settledBalanceCents: Number(balanceRes.rows[0]?.balance_cents || 0),
    });
  } catch (err: any) {
    console.error('Error fetching metrics:', err);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}