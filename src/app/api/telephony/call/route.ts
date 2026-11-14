import { NextRequest, NextResponse } from 'next/server';
import { ExotelAdapter, MyOperatorAdapter, DemoTelephonyAdapter } from '@/lib/telephony/adapters';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadId,
      customerNumber,
      customerName,
      agentId,
      agentNumber,
      agentName,
      provider = 'demo',
      providerConfig = {},
    } = body;

    if (!leadId || !customerNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: leadId and customerNumber' },
        { status: 400 }
      );
    }

    let adapter;

    if (provider === 'exotel' && providerConfig.accountSid && providerConfig.apiKey) {
      adapter = new ExotelAdapter({
        accountSid: providerConfig.accountSid,
        apiKey: providerConfig.apiKey,
        apiToken: providerConfig.apiToken,
        callerId: providerConfig.callerId || '08047190000',
      });
    } else if (provider === 'myoperator' && providerConfig.token) {
      adapter = new MyOperatorAdapter({
        token: providerConfig.token,
        companyId: providerConfig.companyId,
        callerId: providerConfig.callerId || '01149200000',
      });
    } else {
      // Default to demo adapter
      adapter = new DemoTelephonyAdapter();
    }

    const response = await adapter.initiateCall({
      leadId,
      customerNumber,
      customerName,
      agentId,
      agentNumber: agentNumber || '+919811122334',
      agentName: agentName || 'Calling Agent',
      recordCall: true,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Call initiation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error initiating call' },
      { status: 500 }
    );
  }
}
