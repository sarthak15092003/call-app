import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Sheets CSV Fetcher Endpoint
 * 
 * Fetches public / link-shared Google Sheets directly as CSV to bypass CORS
 * and feeds the data into SmartCall CRM lead importer.
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'A valid Google Sheets URL is required.' },
        { status: 400 }
      );
    }

    // Extract Spreadsheet ID
    // Standard formats:
    // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
    // https://docs.google.com/spreadsheets/d/e/2PACX-.../pubhtml
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const pubMatch = url.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);

    // Extract gid if present
    const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : null;

    let csvExportUrl = '';

    if (pubMatch) {
      // Published to web sheet
      csvExportUrl = `https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?output=csv${gid ? `&gid=${gid}` : ''}`;
    } else if (match) {
      const sheetId = match[1];
      csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
    } else {
      return NextResponse.json(
        { error: 'Invalid Google Sheets link. Please provide a link formatted as https://docs.google.com/spreadsheets/d/.../edit' },
        { status: 400 }
      );
    }

    console.log('[Google Sheet Fetcher] Fetching CSV from:', csvExportUrl);

    const response = await fetch(csvExportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SmartCall-CRM/1.0',
        'Accept': 'text/csv,text/plain,*/*'
      },
      redirect: 'follow',
      cache: 'no-store'
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 403 || response.status === 401) {
        return NextResponse.json(
          { 
            error: 'Could not access the Google Sheet. Please make sure the sheet sharing permissions are set to "Anyone with the link can view".' 
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: `Google Sheets returned HTTP ${response.status}. Please check permissions.` },
        { status: response.status }
      );
    }

    const csvText = await response.text();

    // Verify it returned CSV and not HTML login page
    if (csvText.trim().startsWith('<!DOCTYPE html>') || csvText.includes('<html') || csvText.includes('ServiceLogin')) {
      return NextResponse.json(
        { 
          error: 'The Google Sheet is private or requires Google login. In Google Sheets, click "Share" -> change from "Restricted" to "Anyone with the link" (Viewer).' 
        },
        { status: 403 }
      );
    }

    if (!csvText.trim()) {
      return NextResponse.json(
        { error: 'The Google Sheet is empty or has no rows.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      csvText,
      sourceUrl: url,
      sheetId: match ? match[1] : (pubMatch ? pubMatch[1] : 'google-sheet'),
      rowCount: csvText.split('\n').filter((l) => l.trim().length > 0).length - 1,
    });
  } catch (err: any) {
    console.error('[Google Sheet Fetch Error]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch Google Sheet data' },
      { status: 500 }
    );
  }
}

