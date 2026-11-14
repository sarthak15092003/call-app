import { NextRequest, NextResponse } from 'next/server';
import { InterestStatus } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { transcript, customerName, company, duration } = await req.json();

    if (!transcript) {
      return NextResponse.json({
        ai_summary: `Call of ${duration || 30}s with ${customerName || 'customer'} at ${company || 'company'}. Conversation completed.`,
        ai_suggested_interest: 'Follow-up Required' as InterestStatus,
        ai_confidence: 0.75,
        ai_objections: ['No transcript audio provided for in-depth NLP analysis'],
        ai_action_items: ['Agent manual verification required'],
      });
    }

    const lower = transcript.toLowerCase();

    // Sentiment and Interest Detection Rules
    let suggestedInterest: InterestStatus = 'Interested';
    let confidence = 0.85;
    const objections: string[] = [];
    const actionItems: string[] = [];

    if (lower.includes('never call') || lower.includes('stop calling') || lower.includes('dnc') || lower.includes('remove my number')) {
      suggestedInterest = 'Do Not Contact';
      confidence = 0.99;
      objections.push('Customer explicitly invoked Do Not Contact request');
      actionItems.push('Add customer to national/internal DNC suppression list');
    } else if (lower.includes('wrong number') || lower.includes('not the person') || lower.includes('incorrect number')) {
      suggestedInterest = 'Wrong Number';
      confidence = 0.95;
      actionItems.push('Verify contact details in CRM directory');
    } else if (lower.includes('approved') || lower.includes('sign') || lower.includes('contract') || lower.includes('onboarding') || lower.includes('buy')) {
      suggestedInterest = 'Converted';
      confidence = 0.96;
      actionItems.push('Send digital contract & MSA', 'Trigger onboarding credentials');
    } else if (lower.includes('not interested') || lower.includes('existing vendor') || lower.includes('no budget') || lower.includes('don\'t need')) {
      suggestedInterest = 'Not Interested';
      confidence = 0.91;
      if (lower.includes('vendor')) objections.push('Locked into existing vendor contract');
      if (lower.includes('budget')) objections.push('Current fiscal quarter budget exhausted');
      actionItems.push('Archive lead or mark for re-engagement in 6 months');
    } else if (lower.includes('call back') || lower.includes('call me at') || lower.includes('busy right now') || lower.includes('driving')) {
      suggestedInterest = 'Callback Requested';
      confidence = 0.92;
      actionItems.push('Schedule callback per customer requested time window');
    } else if (lower.includes('send proposal') || lower.includes('demo') || lower.includes('pricing') || lower.includes('features')) {
      suggestedInterest = 'Interested';
      confidence = 0.9;
      if (lower.includes('pricing')) objections.push('Price sensitivity / requesting volume discount');
      actionItems.push('Email tailored proposal PDF', 'Confirm team availability for demonstration');
    }

    const summary = `Call with ${customerName} (${company || 'Prospect'}). Discussion focused on telephony dialer capabilities. Customer tone was ${suggestedInterest === 'Interested' || suggestedInterest === 'Converted' ? 'positive and receptive' : 'reserved'}. Recommended outcome: ${suggestedInterest}.`;

    return NextResponse.json({
      success: true,
      ai_summary: summary,
      ai_suggested_interest: suggestedInterest,
      ai_confidence: confidence,
      ai_objections: objections.length > 0 ? objections : ['None identified'],
      ai_action_items: actionItems.length > 0 ? actionItems : ['Follow up per standard sales cadence'],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'AI analysis failed' }, { status: 500 });
  }
}
