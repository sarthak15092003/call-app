import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1mohRe5T9ADmM1YmW_b3OqInSL88YYeroW9aU0QkLLn8/gviz/tq?tqx=out:csv&sheet=Sheet1';
const FALLBACK_CSV_URL = 'https://docs.google.com/spreadsheets/d/1mohRe5T9ADmM1YmW_b3OqInSL88YYeroW9aU0QkLLn8/gviz/tq?tqx=out:csv';
const APPS_SCRIPT_EXEC_URL = 'https://script.google.com/macros/s/AKfycbzid-mA-6PJSUWIrkJLWnsqqpm468CX6teWdRKKbXR6t_KBg7m4IzuFZq7knQJLzwIDdg/exec';

function parseCsvLine(line: string): string[] {
  const row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else {
      cell += c;
    }
  }
  row.push(cell.trim());
  return row;
}

function parseDurationSeconds(dur: any): number {
  if (typeof dur === 'number') return dur;
  const s = String(dur || '0').trim().toLowerCase();
  const minMatch = s.match(/(\d+)\s*m/);
  const secMatch = s.match(/(\d+)\s*s/);
  if (minMatch || secMatch) {
    return (minMatch ? parseInt(minMatch[1], 10) * 60 : 0) + (secMatch ? parseInt(secMatch[1], 10) : 0);
  }
  const clean = parseInt(s.replace(/\D/g, ''), 10);
  return isNaN(clean) ? 0 : clean;
}

/**
 * Endpoint to sync real carrier calls from Google Sheet (Final Log)
 * GET /api/telephony/sheet-sync
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customUrl = searchParams.get('url');

    let rows: any[] = [];

    // 1. Try Google Sheet CSV export from Final Log sheet
    try {
      const targetUrl = customUrl || GOOGLE_SHEET_CSV_URL;
      const csvRes = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
      });

      if (csvRes.ok) {
        const text = await csvRes.text();
        if (text && text.includes(',')) {
          const lines = text.trim().split('\n').map((l) => l.replace(/\r/g, '')).filter(Boolean);
          if (lines.length > 1) {
            const headers = parseCsvLine(lines[0]);
            for (let i = 1; i < lines.length; i++) {
              const cols = parseCsvLine(lines[i]);
              const rowObj: Record<string, any> = {};
              for (let j = 0; j < headers.length; j++) {
                rowObj[headers[j]] = cols[j] || '';
              }
              rows.push(rowObj);
            }
          }
        }
      }
    } catch (csvErr) {
      console.warn('[CSV fetch failed, falling back to Apps Script]', csvErr);
    }

    // 2. Fallback to default sheet CSV or Apps Script if rows is still empty
    if (rows.length === 0) {
      try {
        const fallbackRes = await fetch(FALLBACK_CSV_URL, { cache: 'no-store' });
        if (fallbackRes.ok) {
          const text = await fallbackRes.text();
          const lines = text.trim().split('\n').map((l) => l.replace(/\r/g, '')).filter(Boolean);
          if (lines.length > 1) {
            const headers = parseCsvLine(lines[0]);
            for (let i = 1; i < lines.length; i++) {
              const cols = parseCsvLine(lines[i]);
              const rowObj: Record<string, any> = {};
              for (let j = 0; j < headers.length; j++) {
                rowObj[headers[j]] = cols[j] || '';
              }
              rows.push(rowObj);
            }
          }
        }
      } catch (fbErr) {
        console.warn('[Fallback CSV failed]', fbErr);
      }
    }

    // 3. Fallback to Apps Script if CSV unavailable
    if (rows.length === 0) {
      try {
        const appScriptRes = await fetch(APPS_SCRIPT_EXEC_URL, { cache: 'no-store' });
        if (appScriptRes.ok) {
          const json = await appScriptRes.json();
          rows = json.data || [];
        }
      } catch (asErr) {
        console.warn('[Apps Script fallback failed]', asErr);
      }
    }

    const syncedCalls: any[] = [];

    for (const row of rows) {
      const rawPhone = String(row['Phone Number'] || row.phone || row.number || '').trim();
      const cleanPhone = rawPhone.replace(/\D/g, '');
      if (cleanPhone.length < 5) continue;

      const phoneNormalized = rawPhone.startsWith('+')
        ? rawPhone
        : (cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`);

      const duration = parseDurationSeconds(row['Duration'] || row['Duration (Seconds)'] || row.duration || 0);
      const callerName = String(row['Caller Name'] || row.callerName || row.name || 'Caller').trim();
      let callType = String(row['Call Type'] || row.callType || 'OUTGOING').toUpperCase().trim();
      if (callType.includes('INCOMING')) callType = 'INCOMING';
      else if (callType.includes('MISSED')) callType = 'MISSED';
      else callType = 'OUTGOING';

      const timestamp = String(row['Timestamp'] || row.timestamp || new Date().toISOString()).trim();
      const agentName = String(
        row['Agent Name'] ||
        row['agent_name'] ||
        row['Agent'] ||
        row.agentName ||
        row.agent ||
        ''
      ).trim() || 'Agent';

      const isConnected = duration > 0;
      let status: 'connected' | 'no_answer' | 'busy' | 'failed' = 'failed';
      if (isConnected) {
        status = 'connected';
      } else if (callType === 'MISSED') {
        status = 'no_answer';
      } else {
        status = 'failed';
      }

      const timestampMs = Date.parse(timestamp) || Date.now();
      const agentId = 'usr_' + agentName.toLowerCase().replace(/[^a-z0-9]/g, '_');

      const callRecord = {
        id: `call_sheet_${timestampMs}_${cleanPhone.slice(-4)}`,
        customerNumber: phoneNormalized,
        customerName: callerName && callerName !== 'Unknown' ? callerName : `Customer (${phoneNormalized})`,
        agentId,
        agentName,
        status,
        duration,
        connectedDuration: duration,
        callType,
        timestamp,
        provider: 'mobile_sim',
        syncedAt: new Date().toISOString(),
      };

      syncedCalls.push(callRecord);

      // Persist to Supabase and update leads
      if (supabase) {
        try {
          const { data: existing } = await supabase
            .from('call_attempts')
            .select('id')
            .eq('provider_call_id', callRecord.id)
            .limit(1);

          if (!existing || existing.length === 0) {
            let leadId: string | null = null;
            const cleanNumber = cleanPhone.slice(-10);

            // Match existing uploaded lead in Supabase
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
                  last_call_at: new Date(timestampMs).toISOString(),
                  last_call_status: status,
                  updated_at: new Date().toISOString(),
                }).eq('id', match.id);
              }
            }

            // Auto-create lead in Supabase if not found so CRM shows it
            if (!leadId) {
              const { data: createdLead } = await supabase.from('leads').insert({
                name: callerName && callerName !== 'Unknown' ? callerName : `Lead (${phoneNormalized})`,
                phone: phoneNormalized,
                raw_phone: cleanPhone,
                company: '',
                email: '',
                location: '',
                lead_source: 'Carrier Call',
                remarks: `Logged from phone sync (${callType})`,
                interest_status: 'Undecided',
                call_attempts_count: 1,
                total_connected_duration: duration,
                last_call_at: new Date(timestampMs).toISOString(),
                last_call_status: status,
              }).select('id').single();

              if (createdLead) {
                leadId = createdLead.id;
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
              start_time: new Date(timestampMs).toISOString(),
            });
          }
        } catch (dbErr) {
          console.warn('[Sheet Sync DB]', dbErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      source: 'Google Sheet (Final Log)',
      count: syncedCalls.length,
      calls: syncedCalls,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Sheet Sync Error]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
