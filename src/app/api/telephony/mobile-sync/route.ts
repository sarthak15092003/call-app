import { NextRequest, NextResponse } from 'next/server';

/**
 * Mobile Call Tracker API Endpoint
 * 
 * Used by the Android Companion App (SmartCall Agent APK) to upload real call logs
 * captured by Android TelephonyManager and CallLog content provider.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      agentId, 
      agentName, 
      customerNumber, 
      duration, 
      callType, 
      timestamp, 
      notes, 
      deviceInfo 
    } = body;

    if (!customerNumber) {
      return NextResponse.json(
        { error: 'customerNumber is required' },
        { status: 400 }
      );
    }

    // Determine status from duration & callType
    const durationSec = parseInt(duration || 0, 10);
    const isConnected = durationSec > 0;
    
    let callStatus = 'failed';
    if (isConnected) {
      callStatus = 'connected';
    } else if (callType === 'MISSED') {
      callStatus = 'no_answer';
    } else if (callType === 'REJECTED' || callType === 'BUSY') {
      callStatus = 'busy';
    } else {
      callStatus = 'failed';
    }

    const callRecord = {
      id: `call_mob_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      customerNumber,
      agentId: agentId || 'usr_agent_1',
      agentName: agentName || 'Mobile Agent',
      status: callStatus,
      duration: durationSec,
      connectedDuration: durationSec,
      callType: callType || 'OUTGOING',
      timestamp: timestamp || new Date().toISOString(),
      deviceInfo: deviceInfo || 'Android Device',
      provider: 'mobile_sim',
      syncedAt: new Date().toISOString()
    };

    console.log('[Mobile Sync API] Ingested real call event from device:', callRecord);

    return NextResponse.json({
      success: true,
      message: 'Mobile call log recorded successfully',
      data: callRecord,
      actionRequired: isConnected ? 'DISPOSITION_REQUIRED' : 'LOG_RECORDED'
    });
  } catch (error: any) {
    console.error('[Mobile Sync API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing call sync' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/telephony/mobile-sync',
    supportedMethods: ['POST'],
    instructions: 'Send POST with { customerNumber, duration, callType, timestamp, agentId } to sync real Android call logs.'
  });
}

