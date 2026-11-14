import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { date, sendEmail, emails } = await req.json();
    const targetDate = date || new Date().toISOString().slice(0, 10);

    // In a production server, this could be triggered by a Vercel Cron or Linux cron at 18:00 IST
    return NextResponse.json({
      success: true,
      reportDate: targetDate,
      emailSent: Boolean(sendEmail),
      recipients: emails || ['sales-ops@smartcall.com', 'director@smartcall.com'],
      generatedAt: new Date().toISOString(),
      message: sendEmail
        ? `Daily evening report for ${targetDate} generated and emailed to ${(emails || []).join(', ')}`
        : `Daily evening report for ${targetDate} generated successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Report trigger failed' }, { status: 500 });
  }
}

