import { InitiateCallParams, InitiateCallResponse, TelephonyProviderAdapter, TelephonyWebhookPayload } from './types';
import { CallStatus } from '@/types';
import crypto from 'crypto';

/**
 * Exotel Telephony Provider Adapter
 */
export class ExotelAdapter implements TelephonyProviderAdapter {
  private accountSid: string;
  private apiKey: string;
  private apiToken: string;
  private callerId: string;
  private subdomain: string;

  constructor(config: { accountSid: string; apiKey: string; apiToken: string; callerId: string; subdomain?: string }) {
    this.accountSid = config.accountSid;
    this.apiKey = config.apiKey;
    this.apiToken = config.apiToken;
    this.callerId = config.callerId;
    this.subdomain = config.subdomain || 'api.exotel.com';
  }

  async initiateCall(params: InitiateCallParams): Promise<InitiateCallResponse> {
    const url = `https://${this.subdomain}/v1/Accounts/${this.accountSid}/Calls/connect.json`;
    const authHeader = 'Basic ' + Buffer.from(`${this.apiKey}:${this.apiToken}`).toString('base64');

    const form = new URLSearchParams();
    form.append('From', params.agentNumber);
    form.append('To', params.customerNumber);
    form.append('CallerId', params.customCallerId || this.callerId);
    form.append('CallType', 'trans');
    form.append('Record', params.recordCall ? 'true' : 'false');
    form.append('CustomField', JSON.stringify({ leadId: params.leadId, agentId: params.agentId }));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          providerCallId: '',
          status: 'failed',
          provider: 'exotel',
          message: data.RestException?.Message || 'Exotel call initiation failed',
          details: data,
        };
      }

      const call = data.Call || {};
      return {
        success: true,
        providerCallId: call.Sid || `EXO-${Date.now()}`,
        status: 'initiated',
        provider: 'exotel',
        message: 'Call initiated through Exotel. Ringing agent first.',
        details: call,
      };
    } catch (err: any) {
      return {
        success: false,
        providerCallId: '',
        status: 'failed',
        provider: 'exotel',
        message: err.message || 'Network error connecting to Exotel API',
      };
    }
  }

  verifyWebhookSignature(headers: any, rawBody: string, secret: string): boolean {
    if (!secret) return true;
    const signature = headers['x-exotel-signature'] || headers['x-signature'];
    if (!signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return signature === expected;
  }

  parseWebhook(body: any, headers?: any): TelephonyWebhookPayload {
    const rawStatus = (body.Status || body.CallStatus || '').toLowerCase();
    let eventType: TelephonyWebhookPayload['eventType'] = 'call.initiated';

    if (rawStatus === 'ringing') eventType = 'call.ringing';
    else if (rawStatus === 'in-progress' || rawStatus === 'answered') eventType = 'call.connected';
    else if (rawStatus === 'completed') eventType = 'call.completed';
    else if (rawStatus === 'busy') eventType = 'call.busy';
    else if (rawStatus === 'no-answer') eventType = 'call.no_answer';
    else if (rawStatus === 'failed') eventType = 'call.failed';
    else if (rawStatus === 'canceled' || rawStatus === 'cancelled') eventType = 'call.cancelled';

    const conversationDuration = Number(body.ConversationDuration || body.conversation_duration || 0);
    const totalDuration = Number(body.Duration || body.duration || 0);
    const ringingDuration = Math.max(0, totalDuration - conversationDuration);

    return {
      provider: 'exotel',
      providerCallId: body.CallSid || body.Sid || body.call_id || '',
      eventType,
      timestamp: body.DateCreated || new Date().toISOString(),
      duration: totalDuration,
      conversationDuration,
      ringingDuration,
      recordingUrl: body.RecordingUrl || undefined,
      fromNumber: body.From || '',
      toNumber: body.To || '',
      hangupCause: body.HangupCause,
      rawPayload: body,
    };
  }
}

/**
 * MyOperator Telephony Provider Adapter
 */
export class MyOperatorAdapter implements TelephonyProviderAdapter {
  private token: string;
  private companyId: string;
  private callerId: string;

  constructor(config: { token: string; companyId: string; callerId: string }) {
    this.token = config.token;
    this.companyId = config.companyId;
    this.callerId = config.callerId;
  }

  async initiateCall(params: InitiateCallParams): Promise<InitiateCallResponse> {
    const url = 'https://developer.myoperator.co/outbound-call';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: this.companyId,
          agent_number: params.agentNumber,
          customer_number: params.customerNumber,
          caller_id: params.customCallerId || this.callerId,
          user_data: { leadId: params.leadId, agentId: params.agentId },
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        return {
          success: false,
          providerCallId: '',
          status: 'failed',
          provider: 'myoperator',
          message: data.message || 'MyOperator call initiation failed',
          details: data,
        };
      }

      return {
        success: true,
        providerCallId: data.data?.call_id || `MYOP-${Date.now()}`,
        status: 'initiated',
        provider: 'myoperator',
        message: 'Call initiated via MyOperator.',
        details: data,
      };
    } catch (err: any) {
      return {
        success: false,
        providerCallId: '',
        status: 'failed',
        provider: 'myoperator',
        message: err.message || 'Failed connecting to MyOperator API',
      };
    }
  }

  verifyWebhookSignature(headers: any, rawBody: string, secret: string): boolean {
    if (!secret) return true;
    const token = headers['x-myoperator-token'] || headers['authorization'];
    return token === secret;
  }

  parseWebhook(body: any, headers?: any): TelephonyWebhookPayload {
    const state = (body.event || body.state || body.call_status || '').toLowerCase();
    let eventType: TelephonyWebhookPayload['eventType'] = 'call.initiated';

    if (state.includes('ring')) eventType = 'call.ringing';
    else if (state.includes('connect') || state.includes('answer')) eventType = 'call.connected';
    else if (state.includes('busy')) eventType = 'call.busy';
    else if (state.includes('no-answer') || state.includes('missed')) eventType = 'call.no_answer';
    else if (state.includes('fail')) eventType = 'call.failed';
    else if (state.includes('complete') || state.includes('end')) eventType = 'call.completed';

    const conversationDuration = Number(body.talk_duration || body.connected_duration || 0);
    const ringingDuration = Number(body.ring_duration || 0);

    return {
      provider: 'myoperator',
      providerCallId: body.call_id || body.uuid || '',
      eventType,
      timestamp: body.time || new Date().toISOString(),
      duration: conversationDuration + ringingDuration,
      conversationDuration,
      ringingDuration,
      recordingUrl: body.recording_url || undefined,
      fromNumber: body.agent_number || body.caller || '',
      toNumber: body.customer_number || body.callee || '',
      hangupCause: body.hangup_cause,
      rawPayload: body,
    };
  }
}

/**
 * Demo Mode Telephony Adapter
 * Provides high-fidelity, clearly marked simulated calls for testing without live telecom credentials
 */
export class DemoTelephonyAdapter implements TelephonyProviderAdapter {
  async initiateCall(params: InitiateCallParams): Promise<InitiateCallResponse> {
    const providerCallId = `DEMO-CALL-${Date.now()}-${Math.floor(Math.random() * 8999 + 1000)}`;
    return {
      success: true,
      providerCallId,
      status: 'initiated',
      provider: 'demo',
      message: 'Demo Call initiated (Simulated Telephony Sandbox).',
      details: {
        simulation: true,
        leadId: params.leadId,
        customerNumber: params.customerNumber,
        agentNumber: params.agentNumber,
      },
    };
  }

  verifyWebhookSignature(): boolean {
    return true;
  }

  parseWebhook(body: any, headers?: any): TelephonyWebhookPayload {
    return {
      provider: 'exotel',
      providerCallId: body.providerCallId || `DEMO-WEBHOOK-${Date.now()}`,
      eventType: body.eventType || 'call.completed',
      timestamp: new Date().toISOString(),
      duration: body.duration || 45,
      conversationDuration: body.conversationDuration || 35,
      ringingDuration: body.ringingDuration || 10,
      recordingUrl: body.recordingUrl,
      fromNumber: body.fromNumber || '+919900011111',
      toNumber: body.toNumber || '+919876543210',
      rawPayload: body,
    };
  }
}
