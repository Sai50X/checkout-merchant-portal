import { CheckoutForm } from './checkout-form';

export default function CheckoutPage() {
  const seedMerchantId = '00000000-0000-0000-0000-000000000001';

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Checkout Demo</h1>
          <p className="text-xs text-slate-500">Live dynamic fee engine & optimistic states</p>
        </div>
        <CheckoutForm subtotalCents={4200} merchantId={seedMerchantId} />
      </div>
    </main>
  );
}