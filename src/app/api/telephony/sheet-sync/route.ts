import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_SHEET_EXEC_URL = 'https://script.google.com/macros/s/AKfycbzid-mA-6PJSUWIrkJLWnsqqpm468CX6teWdRKKbXR6t_KBg7m4IzuFZq7knQJLzwIDdg/exec';

/**
 * Endpoint to sync real carrier calls from Google Sheet Web App
 * GET /api/telephony/sheet-sync
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const execUrl = searchParams.get('url') || DEFAULT_SHEET_EXEC_URL;

    // Fetch live call logs from Google Apps Script Web App
    const response = await fetch(execUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch from Google Sheet Web App (HTTP ${response.status})` }, { status: 502 });
    }

    const json = await response.json();
    const rows: any[] = json.data || [];

    const syncedCalls: any[] = [];

    for (const row of rows) {
      const rawPhone = String(row['Phone Number'] || row.phone || row.number || '').trim();
      if (!rawPhone) continue;

      const phoneNormalized = rawPhone.startsWith('+') ? rawPhone : (rawPhone.length === 10 ? `+91${rawPhone}` : `+${rawPhone}`);
      const duration = parseInt(row['Duration (Seconds)'] || row.duration || 0, 10);
      const callerName = row['Caller Name'] || row.callerName || row.name || 'Caller';
      const callType = (row['Call Type'] || row.callType || 'OUTGOING').toUpperCase();
      const timestamp = row['Timestamp'] || row.timestamp || new Date().toISOString();
      const agentName = row['Agent Name'] || row.agentName || 'Mobile Agent';

      const isConnected = duration > 0;
      let status: 'connected' | 'no_answer' | 'busy' | 'failed' = 'failed';
      if (isConnected) {
        status = 'connected';
      } else if (callType === 'MISSED') {
        status = 'no_answer';
      } else if (callType === 'REJECTED' || callType === 'BUSY') {
        status = 'busy';
      } else {
        status = 'failed';
      }

      const callRecord = {
        id: `call_sheet_${Date.parse(timestamp) || Date.now()}_${phoneNormalized.replace(/\D/g, '').slice(-4)}`,
        customerNumber: phoneNormalized,
        customerName: callerName,
        agentId: 'usr_agent_1',
        agentName,
        status,
        duration,
        connectedDuration: duration,
        callType,
        timestamp,
        provider: 'mobile_sim',
        syncedAt: new Date().toISOString()
      };

      syncedCalls.push(callRecord);

      // Persist to Supabase if connected
      if (supabase) {
        try {
          // Check if already inserted
          const { data: existing } = await supabase
            .from('call_attempts')
            .select('id')
            .eq('provider_call_id', callRecord.id)
            .limit(1);

          if (!existing || existing.length === 0) {
            let leadId: string | null = null;
            const cleanNumber = phoneNormalized.replace(/\D/g, '').slice(-10);

            // Match lead in Supabase
            const { data: matchedLeads } = await supabase.from('leads').select('*').limit(200);
            if (matchedLeads && matchedLeads.length > 0) {
              const match = matchedLeads.find((l: any) => {
                const lPhone = (l.phone || '').replace(/\D/g, '');
                const lRaw = (l.raw_phone || '').replace(/\D/g, '');
                return lPhone.endsWith(cleanNumber) || lRaw.endsWith(cleanNumber);
              });

              if (match) {
                leadId = match.id;
                await supabase.from('leads').update({
                  call_attempts_count: (match.call_attempts_count || 0) + 1,
                  total_connected_duration: (match.total_connected_duration || 0) + duration,
                  last_call_at: timestamp,
                  last_call_status: status,
                  updated_at: new Date().toISOString(),
                }).eq('id', match.id);
              }
            }

            // Insert call attempt
            await supabase.from('call_attempts').insert({
              lead_id: leadId,
              customer_number: phoneNormalized,
              lead_phone: phoneNormalized,
              agent_name: agentName,
              status,
              duration,
              connected_duration: duration,
              provider: 'mobile_sim',
              provider_call_id: callRecord.id,
              start_time: timestamp,
            });
          }
        } catch (dbErr) {
          console.warn('[Sheet Sync DB]', dbErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: syncedCalls.length,
      calls: syncedCalls,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[Sheet Sync Error]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
