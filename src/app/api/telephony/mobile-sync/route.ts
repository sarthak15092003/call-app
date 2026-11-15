import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// In-memory fallback event queue for immediate real-time sync across devices
interface SyncedCallRecord {
  id: string;
  customerNumber: string;
  customerName?: string;
  agentId: string;
  agentName: string;
  status: 'connected' | 'no_answer' | 'busy' | 'failed';
  duration: number;
  connectedDuration: number;
  callType: string;
  timestamp: string;
  deviceInfo: string;
  provider: 'mobile_sim';
  syncedAt: string;
}

const getGlobalQueue = (): SyncedCallRecord[] => {
  if (!(globalThis as any)._smartcall_mobile_queue) {
    (globalThis as any)._smartcall_mobile_queue = [];
  }
  return (globalThis as any)._smartcall_mobile_queue;
};

/**
 * Mobile Call Tracker API Endpoint
 * 
 * Ingests real carrier SIM calls from the SmartCall Agent Android APK.
 * Broadcasts the live call event to all connected CRM web dashboards.
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

    const durationSec = parseInt(duration || 0, 10);
    const isConnected = durationSec > 0;
    
    let callStatus: 'connected' | 'no_answer' | 'busy' | 'failed' = 'failed';
    if (isConnected) {
      callStatus = 'connected';
    } else if (callType === 'MISSED') {
      callStatus = 'no_answer';
    } else if (callType === 'REJECTED' || callType === 'BUSY') {
      callStatus = 'busy';
    } else {
      callStatus = 'failed';
    }

    const callRecord: SyncedCallRecord = {
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

    console.log('[Mobile Sync API] Ingested real carrier call event:', callRecord);

    // Save to server-side buffer
    const queue = getGlobalQueue();
    queue.unshift(callRecord);
    if (queue.length > 200) queue.pop();

    // If Supabase PostgreSQL is connected, persist permanently
    if (supabase) {
      try {
        await supabase.from('call_attempts').insert({
          customer_number: callRecord.customerNumber,
          lead_phone: callRecord.customerNumber,
          agent_id: callRecord.agentId,
          agent_name: callRecord.agentName,
          status: callRecord.status,
          duration: callRecord.duration,
          connected_duration: callRecord.connectedDuration,
          provider: 'mobile_sim',
          provider_call_id: callRecord.id,
          start_time: callRecord.timestamp,
        });
      } catch (dbErr) {
        console.warn('[Mobile Sync] Supabase write skipped or pending config:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mobile call log recorded and dispatched to CRM dashboard',
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

/**
 * GET Endpoint: Polled by web dashboard to stream incoming mobile calls
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since');
  const queue = getGlobalQueue();

  let dbEvents: any[] = [];
  if (supabase) {
    try {
      let query = supabase
        .from('call_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (since) {
        query = query.gt('created_at', since);
      }

      const { data } = await query;
      if (data && Array.isArray(data)) {
        dbEvents = data.map((d) => ({
          id: d.id,
          customerNumber: d.customer_number || d.lead_phone,
          agentId: d.agent_id || 'usr_agent_1',
          agentName: d.agent_name || 'Mobile Agent',
          status: d.status,
          duration: d.duration || d.connected_duration || 0,
          connectedDuration: d.connected_duration || 0,
          callType: 'OUTGOING',
          timestamp: d.start_time || d.created_at,
          syncedAt: d.created_at,
          provider: 'mobile_sim',
        }));
      }
    } catch (err) {
      console.warn('[Mobile Sync GET] Supabase query fallback:', err);
    }
  }

  // Combine DB events with in-memory queue
  const merged = [...dbEvents];
  for (const q of queue) {
    if (!merged.some((m) => m.customerNumber === q.customerNumber)) {
      merged.push(q);
    }
  }

  return NextResponse.json({
    status: 'online',
    count: merged.length,
    events: merged.slice(0, 50),
    timestamp: new Date().toISOString(),
  });
}
