import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const APPS_SCRIPT_EXEC_URL = 'https://script.google.com/macros/s/AKfycbydty91hkWznt4kQiJA7_m2TKU5UbLEWpKLGrlSCAc7rIvAOcVYhzVI8BZwhr0pd3Rq/exec';
const RAW_APPS_SCRIPT_EXEC_URL = 'https://script.google.com/macros/s/AKfycbwkV3ZgXda-H1q0tNDKH6iUKmErjnlps1jHIDsEfpDIyNW6CjfjGBH7hTpjigC3wG3oMg/exec';

/**
 * POST /api/telephony/update-disposition
 * Updates the disposition / call tag in Google Sheet and Supabase
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, sheetRow, disposition, callId } = body;

    if (!disposition) {
      return NextResponse.json({ error: 'disposition is required' }, { status: 400 });
    }

    // 1. Send update to Google Apps Script in parallel with 4.5s timeout
    let sheetSuccess = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    try {
      const updatePayload = JSON.stringify({
        action: 'UPDATE_DISPOSITION',
        phone: phone || '',
        row: sheetRow,
        disposition: disposition,
        callId: callId || '',
      });

      const results = await Promise.allSettled([
        fetch(APPS_SCRIPT_EXEC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          redirect: 'follow',
          signal: controller.signal,
          body: updatePayload,
        }),
        fetch(RAW_APPS_SCRIPT_EXEC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          redirect: 'follow',
          signal: controller.signal,
          body: updatePayload,
        }),
      ]);

      sheetSuccess = results.some((r) => r.status === 'fulfilled' && r.value.ok);
    } catch (sheetErr) {
      console.warn('[Apps Script update-disposition failed]', sheetErr);
    } finally {
      clearTimeout(timeoutId);
    }

    return NextResponse.json({
      success: true,
      sheetSuccess,
      phone,
      sheetRow,
      disposition,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Update Disposition Error]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
