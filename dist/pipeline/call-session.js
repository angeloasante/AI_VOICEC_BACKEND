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
exports.markCallForEnding = markCallForEnding;
exports.shouldEndCall = shouldEndCall;
exports.getCallSid = getCallSid;
exports.getCallerPhone = getCallerPhone;
exports.setSMSConsent = setSMSConsent;
exports.hasSMSConsent = hasSMSConsent;
exports.markSMSSent = markSMSSent;
exports.hasSMSBeenSent = hasSMSBeenSent;
exports.canSendSMS = canSendSMS;
// In-memory store for active call sessions
const activeSessions = new Map();
// Store callSid -> streamSid mapping for ending calls
const callSidToStreamSid = new Map();
/**
 * Create a new call session
 */
function createSession(callSid, streamSid, callerPhone) {
    const session = {
        callSid,
        streamSid,
        callerPhone,
        startTime: new Date(),
        conversationHistory: [],
        isProcessing: false,
        currentTranscript: '',
        visaContext: {},
        shouldEndCall: false, // Flag to signal call should end
        smsConsent: false, // Default: no consent until detected
        smsSent: false, // Track if we've sent SMS this call
    };
    activeSessions.set(streamSid, session);
    callSidToStreamSid.set(callSid, streamSid);
    console.log(`📞 Session created for call ${callSid} (stream: ${streamSid})${callerPhone ? ` from ${callerPhone.substring(0, 6)}****` : ''}`);
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
/**
 * Mark that the call should end after the current response
 */
function markCallForEnding(streamSid) {
    const session = activeSessions.get(streamSid);
    if (session) {
        session.shouldEndCall = true;
        console.log(`📴 Call marked for ending: ${session.callSid}`);
    }
}
/**
 * Check if the call should end
 */
function shouldEndCall(streamSid) {
    const session = activeSessions.get(streamSid);
    return session?.shouldEndCall ?? false;
}
/**
 * Get callSid from streamSid
 */
function getCallSid(streamSid) {
    const session = activeSessions.get(streamSid);
    return session?.callSid;
}
/**
 * Get caller phone number from session
 */
function getCallerPhone(streamSid) {
    const session = activeSessions.get(streamSid);
    return session?.callerPhone;
}
/**
 * Set SMS consent for the session
 */
function setSMSConsent(streamSid, consent) {
    const session = activeSessions.get(streamSid);
    if (session) {
        session.smsConsent = consent;
        console.log(`📱 SMS consent ${consent ? 'granted' : 'revoked'} for call ${session.callSid}`);
    }
}
/**
 * Check if user has consented to SMS
 */
function hasSMSConsent(streamSid) {
    const session = activeSessions.get(streamSid);
    return session?.smsConsent ?? false;
}
/**
 * Mark that SMS has been sent for this call
 */
function markSMSSent(streamSid) {
    const session = activeSessions.get(streamSid);
    if (session) {
        session.smsSent = true;
        console.log(`📱 SMS marked as sent for call ${session.callSid}`);
    }
}
/**
 * Check if SMS has already been sent this call
 */
function hasSMSBeenSent(streamSid) {
    const session = activeSessions.get(streamSid);
    return session?.smsSent ?? false;
}
/**
 * Check if we can send SMS (has consent, hasn't been sent, and has phone number)
 */
function canSendSMS(streamSid) {
    const session = activeSessions.get(streamSid);
    if (!session)
        return false;
    return !!(session.callerPhone &&
        session.smsConsent &&
        !session.smsSent);
}
//# sourceMappingURL=call-session.js.map