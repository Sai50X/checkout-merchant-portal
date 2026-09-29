import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { merchantId, amountCents, idempotencyKey } = await req.json();

    if (!merchantId || !amountCents || !idempotencyKey) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Insert order or return existing order if the idempotency key matches
    const result = await pool.query(
      `INSERT INTO orders (merchant_id, amount_cents, idempotency_key, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (idempotency_key) DO UPDATE 
       SET updated_at = NOW()
       RETURNING id, merchant_id, amount_cents, status, idempotency_key`,
      [merchantId, amountCents, idempotencyKey]
    );

    return NextResponse.json({ order: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}