import { NextRequest, NextResponse } from 'next/server';
import { ExotelAdapter, MyOperatorAdapter } from '@/lib/telephony/adapters';

// In-memory idempotency cache for duplicate webhook event deduplication
const processedEvents = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const provider = searchParams.get('provider') || 'exotel';
    const secret = process.env.TELEPHONY_WEBHOOK_SECRET || 'smartcall_wh_secret_2026';

    const rawBody = await req.text();
    let parsedBody: any = {};

    try {
      // Check if body is JSON or form-urlencoded
      if (rawBody.startsWith('{') || rawBody.startsWith('[')) {
        parsedBody = JSON.parse(rawBody);
      } else {
        const params = new URLSearchParams(rawBody);
        parsedBody = Object.fromEntries(params.entries());
      }
    } catch {
      parsedBody = {};
    }

    // Extract headers
    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key.toLowerCase()] = value;
    });

    let adapter;
    if (provider === 'exotel') {
      adapter = new ExotelAdapter({ accountSid: '', apiKey: '', apiToken: '', callerId: '' });
    } else {
      adapter = new MyOperatorAdapter({ token: '', companyId: '', callerId: '' });
    }

    // Verify signature
    const isValidSignature = adapter.verifyWebhookSignature(headersObj, rawBody, secret);
    if (!isValidSignature && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Invalid webhook signature or unauthorized' }, { status: 401 });
    }

    const payload = adapter.parseWebhook(parsedBody);

    // Idempotency check: providerCallId + eventType + duration
    const eventKey = `${payload.provider}:${payload.providerCallId}:${payload.eventType}:${payload.duration}`;
    if (processedEvents.has(eventKey)) {
      return NextResponse.json({ status: 'duplicate_ignored', eventKey });
    }
    processedEvents.add(eventKey);
    // Keep set bounded
    if (processedEvents.size > 5000) {
      processedEvents.clear();
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      event: {
        provider: payload.provider,
        providerCallId: payload.providerCallId,
        eventType: payload.eventType,
        duration: payload.duration,
        conversationDuration: payload.conversationDuration,
        ringingDuration: payload.ringingDuration,
        timestamp: payload.timestamp,
      },
    });
  } catch (err: any) {
    console.error('Telephony webhook processing error:', err);
    return NextResponse.json({ error: err.message || 'Webhook failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Exotel or providers doing URL verification or status health-checks
  return NextResponse.json({
    status: 'online',
    system: 'SmartCall CRM Telephony Webhook Receiver',
    supported_providers: ['exotel', 'myoperator', 'demo'],
    timestamp: new Date().toISOString(),
  });
}
