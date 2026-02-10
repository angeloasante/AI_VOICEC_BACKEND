import type { CallSession, ConversationMessage, VisaContext } from '../types.js';

// In-memory store for active call sessions
const activeSessions = new Map<string, CallSession>();

/**
 * Create a new call session
 */
export function createSession(callSid: string, streamSid: string): CallSession {
  const session: CallSession = {
    callSid,
    streamSid,
    startTime: new Date(),
    conversationHistory: [],
    isProcessing: false,
    currentTranscript: '',
    visaContext: {},  // Initialize empty visa context
  };
  
  activeSessions.set(streamSid, session);
  console.log(`📞 Session created for call ${callSid} (stream: ${streamSid})`);
  
  return session;
}

/**
 * Get an existing session by stream SID
 */
export function getSession(streamSid: string): CallSession | undefined {
  return activeSessions.get(streamSid);
}

/**
 * Add a message to conversation history
 */
export function addMessage(streamSid: string, role: 'user' | 'assistant', content: string): void {
  const session = activeSessions.get(streamSid);
  if (!session) {
    console.warn(`⚠️ No session found for stream ${streamSid}`);
    return;
  }
  
  const message: ConversationMessage = {
    role,
    content,
    timestamp: new Date(),
  };
  
  session.conversationHistory.push(message);
  console.log(`💬 [${role.toUpperCase()}]: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
}

/**
 * Update the current transcript being built (partial results)
 */
export function updateCurrentTranscript(streamSid: string, transcript: string): void {
  const session = activeSessions.get(streamSid);
  if (session) {
    session.currentTranscript = transcript;
  }
}

/**
 * Get conversation history formatted for AI context
 */
export function getConversationContext(streamSid: string): string {
  const session = activeSessions.get(streamSid);
  if (!session || session.conversationHistory.length === 0) {
    return '';
  }
  
  return session.conversationHistory
    .map(msg => `${msg.role === 'user' ? 'Customer' : 'You'}: ${msg.content}`)
    .join('\n');
}

/**
 * Set processing state (prevents concurrent responses)
 */
export function setProcessing(streamSid: string, isProcessing: boolean): void {
  const session = activeSessions.get(streamSid);
  if (session) {
    session.isProcessing = isProcessing;
  }
}

/**
 * Check if session is currently processing a response
 */
export function isProcessing(streamSid: string): boolean {
  const session = activeSessions.get(streamSid);
  return session?.isProcessing ?? false;
}

/**
 * End and clean up a session
 */
export function endSession(streamSid: string): void {
  const session = activeSessions.get(streamSid);
  if (session) {
    const duration = Math.round((Date.now() - session.startTime.getTime()) / 1000);
    console.log(`📴 Session ended for call ${session.callSid} (duration: ${duration}s, messages: ${session.conversationHistory.length})`);
    activeSessions.delete(streamSid);
  }
}

/**
 * Get session stats
 */
export function getSessionStats(): { active: number; sessions: string[] } {
  return {
    active: activeSessions.size,
    sessions: Array.from(activeSessions.keys()),
  };
}

/**
 * Update visa context for a session (accumulates info across messages)
 */
export function updateVisaContext(streamSid: string, updates: Partial<VisaContext>): void {
  const session = activeSessions.get(streamSid);
  if (!session) return;
  
  if (!session.visaContext) {
    session.visaContext = {};
  }
  
  // Only update if we have new info (don't overwrite with undefined)
  if (updates.passport) session.visaContext.passport = updates.passport;
  if (updates.destination) session.visaContext.destination = updates.destination;
  if (updates.residence) session.visaContext.residence = updates.residence;
  if (updates.apiCalled !== undefined) session.visaContext.apiCalled = updates.apiCalled;
  
  console.log(`🛂 Visa context updated:`, session.visaContext);
}

/**
 * Get visa context for a session
 */
export function getVisaContext(streamSid: string): VisaContext | undefined {
  const session = activeSessions.get(streamSid);
  return session?.visaContext;
}

/**
 * Check if we have enough info to call the Visa API
 */
export function hasCompleteVisaInfo(streamSid: string): boolean {
  const ctx = getVisaContext(streamSid);
  return !!(ctx?.passport && ctx?.destination && !ctx?.apiCalled);
}

/**
 * Mark that we've called the Visa API for this combo
 */
export function markVisaApiCalled(streamSid: string): void {
  updateVisaContext(streamSid, { apiCalled: true });
}
