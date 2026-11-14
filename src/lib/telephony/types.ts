import { CallStatus } from '@/types';

export interface InitiateCallParams {
  leadId: string;
  customerNumber: string;
  customerName: string;
  agentId: string;
  agentNumber: string;
  agentName: string;
  customCallerId?: string;
  recordCall?: boolean;
}

export interface InitiateCallResponse {
  success: boolean;
  providerCallId: string;
  status: CallStatus;
  provider: 'exotel' | 'myoperator' | 'demo';
  message?: string;
  details?: Record<string, any>;
}

export interface TelephonyWebhookPayload {
  provider: 'exotel' | 'myoperator';
  providerCallId: string;
  eventType: 'call.initiated' | 'call.ringing' | 'call.connected' | 'call.no_answer' | 'call.busy' | 'call.failed' | 'call.cancelled' | 'call.completed';
  timestamp: string;
  duration?: number; // total call duration
  conversationDuration?: number; // connected duration
  ringingDuration?: number;
  recordingUrl?: string;
  fromNumber: string;
  toNumber: string;
  hangupCause?: string;
  rawPayload: Record<string, any>;
}

export interface TelephonyProviderAdapter {
  initiateCall(params: InitiateCallParams): Promise<InitiateCallResponse>;
  verifyWebhookSignature(headers: Headers | Record<string, string | string[] | undefined>, rawBody: string, secret: string): boolean;
  parseWebhook(body: any, headers?: any): TelephonyWebhookPayload;
}

