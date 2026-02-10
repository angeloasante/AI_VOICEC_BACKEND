"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.getSession = getSession;
exports.addMessage = addMessage;
exports.updateCurrentTranscript = updateCurrentTranscript;
exports.getConversationContext = getConversationContext;
exports.setProcessing = setProcessing;
exports.isProcessing = isProcessing;
exports.endSession = endSession;
exports.getSessionStats = getSessionStats;
exports.updateVisaContext = updateVisaContext;
exports.getVisaContext = getVisaContext;
exports.hasCompleteVisaInfo = hasCompleteVisaInfo;
exports.markVisaApiCalled = markVisaApiCalled;
// In-memory store for active call sessions
const activeSessions = new Map();
/**
 * Create a new call session
 */
function createSession(callSid, streamSid) {
    const session = {
        callSid,
        streamSid,
        startTime: new Date(),
        conversationHistory: [],
        isProcessing: false,
        currentTranscript: '',
        visaContext: {}, // Initialize empty visa context
    };
    activeSessions.set(streamSid, session);
    console.log(`📞 Session created for call ${callSid} (stream: ${streamSid})`);
    return session;
}
/**
 * Get an existing session by stream SID
 */
function getSession(streamSid) {
    return activeSessions.get(streamSid);
}
/**
 * Add a message to conversation history
 */
function addMessage(streamSid, role, content) {
    const session = activeSessions.get(streamSid);
    if (!session) {
        console.warn(`⚠️ No session found for stream ${streamSid}`);
        return;
    }
    const message = {
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
function updateCurrentTranscript(streamSid, transcript) {
    const session = activeSessions.get(streamSid);
    if (session) {
        session.currentTranscript = transcript;
    }
}
/**
 * Get conversation history formatted for AI context
 */
function getConversationContext(streamSid) {
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
function setProcessing(streamSid, isProcessing) {
    const session = activeSessions.get(streamSid);
    if (session) {
        session.isProcessing = isProcessing;
    }
}
/**
 * Check if session is currently processing a response
 */
function isProcessing(streamSid) {
    const session = activeSessions.get(streamSid);
    return session?.isProcessing ?? false;
}
/**
 * End and clean up a session
 */
function endSession(streamSid) {
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
function getSessionStats() {
    return {
        active: activeSessions.size,
        sessions: Array.from(activeSessions.keys()),
    };
}
/**
 * Update visa context for a session (accumulates info across messages)
 */
function updateVisaContext(streamSid, updates) {
    const session = activeSessions.get(streamSid);
    if (!session)
        return;
    if (!session.visaContext) {
        session.visaContext = {};
    }
    // Only update if we have new info (don't overwrite with undefined)
    if (updates.passport)
        session.visaContext.passport = updates.passport;
    if (updates.destination)
        session.visaContext.destination = updates.destination;
    if (updates.residence)
        session.visaContext.residence = updates.residence;
    if (updates.apiCalled !== undefined)
        session.visaContext.apiCalled = updates.apiCalled;
    console.log(`🛂 Visa context updated:`, session.visaContext);
}
/**
 * Get visa context for a session
 */
function getVisaContext(streamSid) {
    const session = activeSessions.get(streamSid);
    return session?.visaContext;
}
/**
 * Check if we have enough info to call the Visa API
 */
function hasCompleteVisaInfo(streamSid) {
    const ctx = getVisaContext(streamSid);
    return !!(ctx?.passport && ctx?.destination && !ctx?.apiCalled);
}
/**
 * Mark that we've called the Visa API for this combo
 */
function markVisaApiCalled(streamSid) {
    updateVisaContext(streamSid, { apiCalled: true });
}
//# sourceMappingURL=call-session.js.map