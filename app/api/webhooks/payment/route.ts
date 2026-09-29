import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-signature-sha256');

  if (!signatureHeader) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  const secret = process.env.WEBHOOK_SIGNING_SECRET || 'whsec_test_secret_key_998877';
  const isValid = verifyWebhookSignature({
    payload: rawBody,
    signatureHeader,
    secret,
  });

  if (!isValid) {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 403 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === 'payment.captured') {
    const { orderId, merchantId, feeCents } = event.data;

    try {
      await withTransaction(async (client) => {
        // 1. Lock the order row. Prevents duplicate webhook deliveries from double-crediting
        const orderRes = await client.query(
          `SELECT id, amount_cents, status FROM orders WHERE id = $1 FOR UPDATE`,
          [orderId]
        );

        if (orderRes.rows.length === 0) {
          throw new Error(`Order ${orderId} not found`);
        }

        const order = orderRes.rows[0];
        if (order.status === 'settled') {
          return; // Already settled, exit cleanly
        }

        // 2. Lock the merchant row. Prevents concurrent balance updates from overwriting balances
        const merchantRes = await client.query(
          `SELECT id, balance_cents FROM merchants WHERE id = $1 FOR UPDATE`,
          [merchantId]
        );

        if (merchantRes.rows.length === 0) {
          throw new Error(`Merchant ${merchantId} not found`);
        }

        const netCents = BigInt(order.amount_cents) - BigInt(feeCents);

        // 3. Atomically update merchant balance
        await client.query(
          `UPDATE merchants SET balance_cents = balance_cents + $1 WHERE id = $2`,
          [netCents.toString(), merchantId]
        );

        // 4. Record the double-entry transaction record in the ledger
        await client.query(
          `INSERT INTO settlement_transactions (order_id, merchant_id, amount_cents, fee_cents, net_cents)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, merchantId, order.amount_cents, feeCents, netCents.toString()]
        );

        // 5. Update order state to 'settled'
        await client.query(
          `UPDATE orders SET status = 'settled', updated_at = NOW() WHERE id = $1`,
          [order.id]
        );
      });

      return NextResponse.json({ status: 'success', message: 'Settlement completed' });
    } catch (err: any) {
      console.error('Settlement transaction error:', err);
      return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}