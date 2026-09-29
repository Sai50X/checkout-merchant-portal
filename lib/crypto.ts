import crypto from 'node:crypto';

export function verifyWebhookSignature({
  payload,
  signatureHeader,
  secret,
}: {
  payload: string | Buffer;
  signatureHeader: string;
  secret: string;
}): boolean {
  // Expected format: "t=1711234567,v1=abcdef0123456..."
  const [timestampPart, signaturePart] = signatureHeader.split(',');
  if (!timestampPart || !signaturePart) return false;

  const timestamp = timestampPart.replace('t=', '').trim();
  const signature = signaturePart.replace('v1=', '').trim();

  // Replay-attack prevention: Reject if timestamp differs by more than 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp, 10)) > 300) {
    return false;
  }

  // Compute expected HMAC SHA-256 signature
  const signedPayload = `${timestamp}.${payload.toString()}`;
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const compBuffer = Buffer.from(computedSignature, 'hex');

  if (sigBuffer.length !== compBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, compBuffer);
}