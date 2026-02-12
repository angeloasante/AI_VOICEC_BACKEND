import type { CallSession, VisaContext } from '../types.js';
/**
 * Create a new call session
 */
export declare function createSession(callSid: string, streamSid: string, callerPhone?: string): CallSession;
/**
 * Get an existing session by stream SID
 */
export declare function getSession(streamSid: string): CallSession | undefined;
/**
 * Add a message to conversation history
 */
export declare function addMessage(streamSid: string, role: 'user' | 'assistant', content: string): void;
/**
 * Update the current transcript being built (partial results)
 */
export declare function updateCurrentTranscript(streamSid: string, transcript: string): void;
/**
 * Get conversation history formatted for AI context
 */
export declare function getConversationContext(streamSid: string): string;
/**
 * Set processing state (prevents concurrent responses)
 */
export declare function setProcessing(streamSid: string, isProcessing: boolean): void;
/**
 * Check if session is currently processing a response
 */
export declare function isProcessing(streamSid: string): boolean;
/**
 * End and clean up a session
 */
export declare function endSession(streamSid: string): void;
/**
 * Get session stats
 */
export declare function getSessionStats(): {
    active: number;
    sessions: string[];
};
/**
 * Update visa context for a session (accumulates info across messages)
 */
export declare function updateVisaContext(streamSid: string, updates: Partial<VisaContext>): void;
/**
 * Get visa context for a session
 */
export declare function getVisaContext(streamSid: string): VisaContext | undefined;
/**
 * Check if we have enough info to call the Visa API
 */
export declare function hasCompleteVisaInfo(streamSid: string): boolean;
/**
 * Mark that we've called the Visa API for this combo
 */
export declare function markVisaApiCalled(streamSid: string): void;
/**
 * Mark that the call should end after the current response
 */
export declare function markCallForEnding(streamSid: string): void;
/**
 * Check if the call should end
 */
export declare function shouldEndCall(streamSid: string): boolean;
/**
 * Get callSid from streamSid
 */
export declare function getCallSid(streamSid: string): string | undefined;
/**
 * Get caller phone number from session
 */
export declare function getCallerPhone(streamSid: string): string | undefined;
/**
 * Set SMS consent for the session
 */
export declare function setSMSConsent(streamSid: string, consent: boolean): void;
/**
 * Check if user has consented to SMS
 */
export declare function hasSMSConsent(streamSid: string): boolean;
/**
 * Mark that SMS has been sent for this call
 */
export declare function markSMSSent(streamSid: string): void;
/**
 * Check if SMS has already been sent this call
 */
export declare function hasSMSBeenSent(streamSid: string): boolean;
/**
 * Check if we can send SMS (has consent, hasn't been sent, and has phone number)
 */
export declare function canSendSMS(streamSid: string): boolean;
//# sourceMappingURL=call-session.d.ts.map