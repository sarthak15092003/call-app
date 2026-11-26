import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PRIMARY_RAW_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1UDvJDDMgqYfjilMS4O43O6zvsoQwJsDDymXhVdF5AMw/gviz/tq?tqx=out:csv&sheet=Sheet1';
const FINAL_LOG_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1mohRe5T9ADmM1YmW_b3OqInSL88YYeroW9aU0QkLLn8/gviz/tq?tqx=out:csv&sheet=Sheet1';
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

    // 1. Try Google Sheet CSV export from Primary Sheet (1UDv...)
    try {
      const targetUrl = customUrl || PRIMARY_RAW_SHEET_CSV_URL;
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
      console.warn('[CSV fetch failed from primary sheet]', csvErr);
    }

    // 2. Fallback to Final Log Sheet if primary empty
    if (rows.length === 0) {
      try {
        const fallbackRes = await fetch(FINAL_LOG_SHEET_CSV_URL, { cache: 'no-store' });
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

    // Also fetch Final Log sheet dispositions in parallel so tags persist across browsers
    const finalLogDispByRowPhone = new Map<string, string>();
    try {
      const finalRes = await fetch(FINAL_LOG_SHEET_CSV_URL, { cache: 'no-store' });
      if (finalRes.ok) {
        const text = await finalRes.text();
        const lines = text.trim().split('\n').map((l) => l.replace(/\r/g, '')).filter(Boolean);
        if (lines.length > 1) {
          const headers = parseCsvLine(lines[0]);
          for (let i = 1; i < lines.length; i++) {
            const cols = parseCsvLine(lines[i]);
            const rowObj: Record<string, any> = {};
            for (let j = 0; j < headers.length; j++) {
              rowObj[headers[j]] = cols[j] || '';
            }
            const disp = String(rowObj['Disposition'] || rowObj['disposition'] || '').trim();
            const ph = String(rowObj['Phone Number'] || '').replace(/\D/g, '').slice(-10);
            if (disp && ph) {
              finalLogDispByRowPhone.set(`${i + 1}_${ph}`, disp);
            }
          }
        }
      }
    } catch {
      // ignore fallback error
    }

    const syncedCalls: any[] = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
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

      // Check for Disposition / Status column (Column G, or key 'Disposition'/'Status')
      const disposition = String(
        row['Disposition'] ||
        row['disposition'] ||
        row['Status'] ||
        row['Tags'] ||
        row['Tag'] ||
        finalLogDispByRowPhone.get(`${rowIndex + 2}_${cleanPhone.slice(-10)}`) ||
        ''
      ).trim();

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
        disposition: disposition || undefined,
        sheetRow: rowIndex + 2, // 1-based index (Header is row 1, data starts row 2)
        provider: 'mobile_sim',
        syncedAt: new Date().toISOString(),
      };

      syncedCalls.push(callRecord);
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
