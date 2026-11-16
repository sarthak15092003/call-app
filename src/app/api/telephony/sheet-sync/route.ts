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
    const rawRows: any[] = json.data || [];

    // ── Merge duplicate pairs (START row + END row) into one call ─────────────
    // Pattern: two consecutive rows with same phone within 10 min, both duration=0
    // The START row has "Unknown" name; END row has real name + agent
    const mergedRows: any[] = [];
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const phone1 = String(row['Phone Number'] || row.phone || '').replace(/\D/g, '').slice(-10);
      const dur1   = Number(row['Duration (Seconds)'] || row.duration || 0);
      const type1  = String(row['Call Type'] || '').toUpperCase();

      // If this row has duration=0 or is IN_PROGRESS, try to find its END pair
      if ((dur1 === 0 || type1 === 'IN_PROGRESS') && i + 1 < rawRows.length) {
        const next   = rawRows[i + 1];
        const phone2 = String(next['Phone Number'] || next.phone || '').replace(/\D/g, '').slice(-10);
        const dur2   = Number(next['Duration (Seconds)'] || next.duration || 0);

        if (phone1 && phone1 === phone2) {
          // Parse timestamps to calculate real duration
          const t1 = new Date(row['Timestamp']  || row.timestamp  || 0).getTime();
          const t2 = new Date(next['Timestamp'] || next.timestamp || 0).getTime();
          const diffSec = t1 && t2 && t2 > t1 ? Math.round((t2 - t1) / 1000) : Math.max(dur1, dur2);

          // Prefer END row's caller name (it has the real contact name)
          const bestName = (String(next['Caller Name'] || next.callerName || '') !== 'Unknown' &&
                            String(next['Caller Name'] || next.callerName || '') !== '')
                           ? (next['Caller Name'] || next.callerName)
                           : (row['Caller Name']  || row.callerName);

          mergedRows.push({
            'Timestamp':        row['Timestamp'] || row.timestamp,   // use START time
            'Caller Name':      bestName,
            'Phone Number':     row['Phone Number'] || row.phone,
            'Duration (Seconds)': diffSec,                           // calculated ✅
            'Call Type':        'OUTGOING',
            'Agent Name':       next['Agent Name'] || next.agentName || row['Agent Name'] || row.agentName,
          });
          i++; // skip the END row (already consumed)
          continue;
        }
      }

      mergedRows.push(row); // non-duplicate row, pass through as-is
    }

    const rows = mergedRows;
    const syncedCalls: any[] = [];

    for (const row of rows) {
      const rawPhone = String(row['Phone Number'] || row.phone || row.number || '').trim();
      if (!rawPhone) continue;

      const phoneNormalized = rawPhone.startsWith('+') ? rawPhone : (rawPhone.length === 10 ? `+91${rawPhone}` : `+${rawPhone}`);
      const rawDur = String(row['Duration (Seconds)'] || row.duration || '0');
      // Handle "1m 23s", "45s", plain number
      let duration = 0;
      const minMatch = rawDur.match(/(\d+)m/);
      const secMatch = rawDur.match(/(\d+)s/);
      if (minMatch || secMatch) {
        duration = (minMatch ? parseInt(minMatch[1]) * 60 : 0) + (secMatch ? parseInt(secMatch[1]) : 0);
      } else {
        duration = parseInt(rawDur, 10) || 0;
      }
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
