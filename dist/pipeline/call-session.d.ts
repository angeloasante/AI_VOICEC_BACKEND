import type { CallSession, VisaContext } from '../types.js';
/**
 * Create a new call session
 */
export declare function createSession(callSid: string, streamSid: string): CallSession;
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
//# sourceMappingURL=call-session.d.ts.map